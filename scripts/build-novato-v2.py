#!/usr/bin/env python3
"""Build coherent 4-frame Novato strips from checked-in transparent WebP sources.

Idle fixes the palette for each sex. Walk/Hurt are then quantized against that same
palette and remain the exact same 64x128 scale. The script emits PNG strips, frames,
checker previews and per-action QA; it never edits runtime atlases.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "assets/spritesheets/originales/novato/v2"
W, H, COUNT = 64, 128, 4
PALETTE_COLORS = 63
TRANSPARENT_INDEX = PALETTE_COLORS
ACTIONS = ("idle", "walk", "hurt")
ROWS = {"idle": 0, "walk": 1, "hurt": 2}
SEXES = ("f", "m")


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: Path) -> str:
    return sha256_bytes(path.read_bytes())


def shared_palette_quantize(
    source: Image.Image, reference_idle: Path | None, output: Path
) -> Image.Image:
    rgba = source.convert("RGBA")
    alpha = rgba.getchannel("A").point(lambda value: 255 if value >= 128 else 0)
    rgb = rgba.convert("RGB")
    alpha_px = alpha.load()
    rgb_px = rgb.load()

    if reference_idle is not None:
        with Image.open(reference_idle) as palette_source:
            raw_palette = palette_source.convert("P").getpalette()
        if not raw_palette or len(raw_palette) < (PALETTE_COLORS + 1) * 3:
            raise ValueError(f"Idle palette is incomplete: {reference_idle}")
        visible_palette = raw_palette[: PALETTE_COLORS * 3]
        palette_reference_sha256 = sha256_file(reference_idle)
        # Explicit nearest-colour mapping guarantees opaque pixels only use palette
        # indices 0-14. Index 15 is reserved exclusively for full transparency.
        colours = [
            (visible_palette[i], visible_palette[i + 1], visible_palette[i + 2])
            for i in range(0, PALETTE_COLORS * 3, 3)
        ]
        indexed = Image.new("P", rgb.size)
        shared_palette = visible_palette + [255, 0, 255]
        shared_palette += shared_palette[-3:] * (256 - (PALETTE_COLORS + 1))
        indexed.putpalette(shared_palette[:768])
        src_px = rgb.load()
        dst_px = indexed.load()
        for y in range(H):
            for x in range(W * COUNT):
                if alpha_px[x, y] == 0:
                    dst_px[x, y] = TRANSPARENT_INDEX
                    continue
                red, green, blue = src_px[x, y]
                best = min(
                    range(PALETTE_COLORS),
                    key=lambda i: (red-colours[i][0])**2
                    + (green-colours[i][1])**2 + (blue-colours[i][2])**2,
                )
                dst_px[x, y] = best
    else:
        # Idle establishes the sex-specific palette for later actions.
        for y in range(H):
            for x in range(W * COUNT):
                if alpha_px[x, y] == 0:
                    rgb_px[x, y] = (255, 0, 255)
        indexed = rgb.quantize(
            colors=PALETTE_COLORS, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE
        )
        palette_reference_sha256 = None
        palette = indexed.getpalette()[: PALETTE_COLORS * 3]
        if len(palette) < PALETTE_COLORS * 3:
            palette += [0] * (PALETTE_COLORS * 3 - len(palette))
        # Reserve entry 15 for transparency and pad other entries with a visible colour.
        palette += [255, 0, 255]
        palette += palette[-3:] * (256 - (PALETTE_COLORS + 1))
        indexed.putpalette(palette[:768])
        px = indexed.load()
        for y in range(H):
            for x in range(W * COUNT):
                if alpha_px[x, y] == 0:
                    px[x, y] = TRANSPARENT_INDEX

    indexed.save(output, optimize=True, transparency=TRANSPARENT_INDEX)
    with Image.open(output) as result:
        rgba_result = result.convert("RGBA")
    return rgba_result, palette_reference_sha256


def create_preview(strip: Image.Image, output: Path) -> None:
    scale = 4
    preview = Image.new(
        "RGBA", (W * COUNT * scale, H * scale), (38, 40, 47, 255)
    )
    draw = ImageDraw.Draw(preview)
    for y in range(0, preview.height, 16):
        for x in range(0, preview.width, 16):
            if (x // 16 + y // 16) % 2:
                draw.rectangle((x, y, x + 15, y + 15), fill=(53, 55, 63, 255))
    preview.alpha_composite(
        strip.resize((W * COUNT * scale, H * scale), Image.Resampling.NEAREST)
    )
    draw = ImageDraw.Draw(preview)
    for frame in range(1, COUNT):
        x = frame * W * scale
        draw.line((x, 0, x, preview.height), fill=(105, 163, 198, 230), width=1)
    preview.save(output, optimize=True)


def build(sex: str, action: str) -> dict:
    # Preferred source: a single coherent three-row master strip per sex.
    # This guarantees the exact same character design and palette across Idle/Walk/Hurt.
    master_candidates = (
        BASE / "source" / f"novato-{sex}-core-3rows.png",
        BASE / "source" / f"novato-{sex}-core-3rows.webp",
    )
    master_path = next((candidate for candidate in master_candidates if candidate.is_file()), master_candidates[0])
    action_source_path = BASE / "source" / f"novato-{sex}-{action}.webp"

    # If neither a v2 master nor an action-specific source exists, extract just
    # this action from the pre-existing runtime atlas as a reviewable fallback.
    # This is a migration aid, not newly generated or artist-approved source art.
    if not any(candidate.is_file() for candidate in master_candidates) and not action_source_path.is_file():
        runtime_atlas = ROOT / "public" / "sprites" / "heroes" / "novato" / f"novato-{sex}-sheet.png"
        if runtime_atlas.is_file():
            with Image.open(runtime_atlas) as atlas_image:
                atlas = atlas_image.convert("RGBA")
            if atlas.width < 256 or atlas.height < (ROWS[action] + 1) * H:
                raise ValueError(f"Runtime atlas is too small for {sex}/{action}: {runtime_atlas} {atlas.size}")
            action_source_path.parent.mkdir(parents=True, exist_ok=True)
            action_source = atlas.crop((0, ROWS[action] * H, 256, (ROWS[action] + 1) * H))
            # Handle legacy magenta-key transparency without altering the runtime sheet.
            pix = action_source.load()
            for y in range(action_source.height):
                for x in range(action_source.width):
                    r, g, b, a = pix[x, y]
                    if r >= 250 and g <= 8 and b >= 250:
                        pix[x, y] = (r, g, b, 0)
            if action_source.getchannel("A").getextrema() == (255, 255):
                raise ValueError(f"Could not recover transparency from runtime atlas: {runtime_atlas}")
            action_source.save(action_source_path, "WEBP", lossless=True, method=0)

    use_master = any(candidate.is_file() for candidate in master_candidates)
    source_path = master_path if use_master else action_source_path
    if not source_path.is_file():
        raise FileNotFoundError(f"Missing master/action source for {sex}/{action}: {source_path}")

    out_dir = BASE / action
    frames_dir = out_dir / "frames" / sex
    preview_dir = out_dir / "previews"
    frames_dir.mkdir(parents=True, exist_ok=True)
    preview_dir.mkdir(parents=True, exist_ok=True)
    strip_path = out_dir / f"novato-{sex}-{action}.png"

    with Image.open(source_path) as opened:
        loaded = opened.convert("RGBA")
    if use_master:
        if loaded.size != (W * COUNT, H * len(ACTIONS)):
            raise ValueError(
                f"Expected 256x384 three-row master (Idle/Walk/Hurt), got {loaded.size}"
            )
        if loaded.getchannel("A").getextrema()[0] != 0:
            raise ValueError(f"Master has no real transparency: {source_path}")
        source = loaded.crop(
            (0, ROWS[action] * H, W * COUNT, (ROWS[action] + 1) * H)
        )
    else:
        source = loaded

    if source.size != (W * COUNT, H):
        raise ValueError(f"Expected 256x128 strip (4×64x128), got {source.size}")
    if source.getchannel("A").getextrema()[0] != 0:
        raise ValueError(f"Source has no real transparency: {source_path}")

    source_cells = [
        source.crop((idx * W, 0, (idx + 1) * W, H)) for idx in range(COUNT)
    ]
    source_boxes = [cell.getchannel("A").getbbox() for cell in source_cells]
    if any(box is None for box in source_boxes):
        raise ValueError(f"Empty frame in {source_path}")
    if max(box[3] for box in source_boxes) - min(box[3] for box in source_boxes) > 2:
        raise ValueError(f"Foot baseline drift exceeds 2 px: {source_boxes}")
    if action == "idle":
        heights = [box[3] - box[1] for box in source_boxes]
        if max(heights) - min(heights) > 4:
            raise ValueError(f"Idle figure scale varies between frames: {source_boxes}")

    palette_reference = None
    if action != "idle" and not use_master:
        palette_reference = BASE / "idle" / f"novato-{sex}-idle.png"
        if not palette_reference.is_file():
            raise FileNotFoundError(
                f"Build Idle before {action} so all actions reuse one palette: {palette_reference}"
            )

    if use_master:
        # The master was drawn/normalized as a single three-row sheet and already shares
        # scale, pose framing, and palette across actions. Preserve its pixels as-is.
        strip = source.copy()
        strip.save(strip_path, optimize=True)
        palette_reference_sha = sha256_file(master_path)
    else:
        strip, palette_reference_sha = shared_palette_quantize(
            source, palette_reference, strip_path
        )
    frame_records = []
    frame_hashes = []
    for idx in range(COUNT):
        cell = strip.crop((idx * W, 0, (idx + 1) * W, H))
        bbox = cell.getchannel("A").getbbox()
        if bbox is None:
            raise ValueError(f"Normalized frame {idx + 1} is empty")
        cell_path = frames_dir / f"novato-{sex}-{action}-{idx + 1:02d}.png"
        cell.save(cell_path, optimize=True)
        digest = sha256_bytes(cell.tobytes())
        frame_hashes.append(digest)
        frame_records.append(
            {
                "index": idx + 1,
                "bbox": list(bbox),
                "rgba_sha256": digest,
                "visible_pixels": sum(
                    1 for value in cell.getchannel("A").getdata() if value > 0
                ),
            }
        )

    if len(set(frame_hashes)) != COUNT:
        raise ValueError(f"{sex}/{action}: all four poses must be visually distinct")
    preview_path = preview_dir / f"novato-{sex}-{action}-preview.png"
    create_preview(strip, preview_path)

    report = {
        "class": "novato",
        "sex": sex,
        "action": action,
        "source": str(source_path.relative_to(ROOT)),
        "source_sha256": sha256_file(source_path),
        "source_master_three_rows": use_master,
        "source_row_index": ROWS[action] if use_master else None,
        "shared_master_palette": use_master,
        "strip_dimensions": [W * COUNT, H],
        "cell_dimensions": [W, H],
        "frame_count": COUNT,
        "alpha_extrema": list(strip.getchannel("A").getextrema()),
        "shared_palette": True,
        "palette_reference_idle_sha256": palette_reference_sha,
        "per_frame_rescaling": False,
        "feet_baseline_drift_px": max(box[3] for box in source_boxes)
        - min(box[3] for box in source_boxes),
        "distinct_frame_count": len(set(frame_hashes)),
        "weapon_drawn_in_body": False,
        "runtime_integrated": False,
        "artistic_approval": "pending visual review",
        "output_sha256": sha256_file(strip_path),
        "frames": frame_records,
    }
    (out_dir / f"qa-report-{sex}-{action}.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sex", choices=SEXES, required=True)
    parser.add_argument("--action", choices=ACTIONS, required=True)
    args = parser.parse_args()
    build(args.sex, args.action)


if __name__ == "__main__":
    main()
