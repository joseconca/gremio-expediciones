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
ACTIONS = ("idle", "walk", "hurt")
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
        if not raw_palette or len(raw_palette) < 48:
            raise ValueError(f"Idle palette is incomplete: {reference_idle}")
        visible_palette = raw_palette[:45]
        palette_reference_sha256 = sha256_file(reference_idle)
        # Explicit nearest-colour mapping guarantees opaque pixels only use palette
        # indices 0-14. Index 15 is reserved exclusively for full transparency.
        colours = [
            (visible_palette[i], visible_palette[i + 1], visible_palette[i + 2])
            for i in range(0, 45, 3)
        ]
        indexed = Image.new("P", rgb.size)
        shared_palette = visible_palette + [255, 0, 255]
        shared_palette += shared_palette[-3:] * (256 - 16)
        indexed.putpalette(shared_palette[:768])
        src_px = rgb.load()
        dst_px = indexed.load()
        for y in range(H):
            for x in range(W * COUNT):
                if alpha_px[x, y] == 0:
                    dst_px[x, y] = 15
                    continue
                red, green, blue = src_px[x, y]
                best = min(
                    range(15),
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
            colors=15, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE
        )
        palette_reference_sha256 = None
        palette = indexed.getpalette()[:45]
        if len(palette) < 45:
            palette += [0] * (45 - len(palette))
        # Reserve entry 15 for transparency and pad other entries with a visible colour.
        palette += [255, 0, 255]
        palette += palette[-3:] * (256 - 16)
        indexed.putpalette(palette[:768])
        px = indexed.load()
        for y in range(H):
            for x in range(W * COUNT):
                if alpha_px[x, y] == 0:
                    px[x, y] = 15

    indexed.save(output, optimize=True, transparency=15)
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
    source_path = BASE / "source" / f"novato-{sex}-{action}.webp"
    if not source_path.is_file():
        raise FileNotFoundError(f"Missing source for {sex}/{action}: {source_path}")
    out_dir = BASE / action
    frames_dir = out_dir / "frames" / sex
    preview_dir = out_dir / "previews"
    frames_dir.mkdir(parents=True, exist_ok=True)
    preview_dir.mkdir(parents=True, exist_ok=True)
    strip_path = out_dir / f"novato-{sex}-{action}.png"

    with Image.open(source_path) as opened:
        source = opened.convert("RGBA")
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
    if action != "idle":
        palette_reference = BASE / "idle" / f"novato-{sex}-idle.png"
        if not palette_reference.is_file():
            raise FileNotFoundError(
                f"Build Idle before {action} so all actions reuse one palette: {palette_reference}"
            )

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
