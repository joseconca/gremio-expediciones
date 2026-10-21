#!/usr/bin/env python3
"""Build game-ready PNG assets from the checked-in Novata v2 Idle source.

The source is one transparent four-frame strip. The script preserves the existing
64x128 cell geometry (it does not auto-scale frames individually), applies one
shared indexed palette to the whole strip, exports a PNG strip + isolated frames
+ review preview + hash/geometry QA. Runtime spritesheets are intentionally untouched.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets/spritesheets/originales/novato/v2/source/novato-f-idle.webp"
OUT = ROOT / "assets/spritesheets/originales/novato/v2/idle"
FRAME_W, FRAME_H, FRAME_COUNT = 64, 128, 4


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def sha256_file(path: Path) -> str:
    return sha256_bytes(path.read_bytes())


def to_shared_palette(rgba: Image.Image) -> Image.Image:
    """Use one palette across the action and reserve one index for transparency."""
    rgba = rgba.convert("RGBA")
    alpha = rgba.getchannel("A").point(lambda value: 255 if value >= 128 else 0)
    rgb = rgba.convert("RGB")
    rgb_pixels = rgb.load()
    alpha_pixels = alpha.load()
    for y in range(rgb.height):
        for x in range(rgb.width):
            if alpha_pixels[x, y] == 0:
                rgb_pixels[x, y] = (255, 0, 255)
    indexed = rgb.quantize(
        colors=15, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE
    )
    palette = indexed.getpalette()[: 15 * 3] + [0, 0, 0]
    palette += [0] * (768 - len(palette))
    indexed.putpalette(palette)
    px = indexed.load()
    for y in range(indexed.height):
        for x in range(indexed.width):
            if alpha_pixels[x, y] == 0:
                px[x, y] = 15
    indexed.save(OUT / "novato-f-idle.png", optimize=True, transparency=15)
    with Image.open(OUT / "novato-f-idle.png") as png:
        return png.convert("RGBA")


def build_preview(strip: Image.Image, path: Path) -> None:
    scale = 4
    preview = Image.new(
        "RGBA", (FRAME_W * FRAME_COUNT * scale, FRAME_H * scale), (38, 40, 47, 255)
    )
    draw = ImageDraw.Draw(preview)
    for y in range(0, preview.height, 16):
        for x in range(0, preview.width, 16):
            if (x // 16 + y // 16) % 2:
                draw.rectangle((x, y, x + 15, y + 15), fill=(53, 55, 63, 255))
    preview.alpha_composite(
        strip.resize(
            (FRAME_W * FRAME_COUNT * scale, FRAME_H * scale),
            Image.Resampling.NEAREST,
        )
    )
    draw = ImageDraw.Draw(preview)
    for idx in range(1, FRAME_COUNT):
        x = idx * FRAME_W * scale
        draw.line((x, 0, x, preview.height), fill=(105, 163, 198, 230), width=1)
    preview.save(path, optimize=True)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sex", choices=("f",), default="f")
    args = parser.parse_args()

    if not SOURCE.is_file():
        raise FileNotFoundError(f"Missing art source: {SOURCE}")
    OUT.mkdir(parents=True, exist_ok=True)
    frames_dir = OUT / "frames" / args.sex
    preview_dir = OUT / "previews"
    frames_dir.mkdir(parents=True, exist_ok=True)
    preview_dir.mkdir(parents=True, exist_ok=True)

    with Image.open(SOURCE) as source_image:
        source = source_image.convert("RGBA")
    if source.size != (FRAME_W * FRAME_COUNT, FRAME_H):
        raise ValueError(
            f"Expected {FRAME_W * FRAME_COUNT}x{FRAME_H} (four 64x128 cells), got {source.size}"
        )
    if source.getchannel("A").getextrema()[0] != 0:
        raise ValueError("Source must have real alpha transparency, not a painted checkerboard")

    source_boxes = []
    source_frames = []
    for index in range(FRAME_COUNT):
        cell = source.crop(
            (index * FRAME_W, 0, (index + 1) * FRAME_W, FRAME_H)
        )
        bbox = cell.getchannel("A").getbbox()
        if bbox is None:
            raise ValueError(f"Source frame {index + 1} is empty")
        source_boxes.append(list(bbox))
        source_frames.append(cell)

    # Do not resize by frame: scale/silhouette consistency is fixed by the source strip.
    if max(box[3] for box in source_boxes) - min(box[3] for box in source_boxes) > 2:
        raise ValueError(f"Feet baseline drift exceeds 2 px: {source_boxes}")
    if max(box[3] - box[1] for box in source_boxes) - min(
        box[3] - box[1] for box in source_boxes
    ) > 4:
        raise ValueError(f"Character height changes too much between frames: {source_boxes}")

    strip = to_shared_palette(source)
    strip_path = OUT / "novato-f-idle.png"
    frames = []
    for index in range(FRAME_COUNT):
        cell = strip.crop(
            (index * FRAME_W, 0, (index + 1) * FRAME_W, FRAME_H)
        )
        bbox = cell.getchannel("A").getbbox()
        if bbox is None:
            raise ValueError(f"Normalized frame {index + 1} is empty")
        frame_path = frames_dir / f"novato-f-idle-{index + 1:02d}.png"
        cell.save(frame_path, optimize=True)
        frames.append(
            {
                "index": index + 1,
                "bbox": list(bbox),
                "rgba_sha256": sha256_bytes(cell.tobytes()),
                "visible_pixels": sum(
                    1 for value in cell.getchannel("A").getdata() if value > 0
                ),
            }
        )

    distinct = len({frame["rgba_sha256"] for frame in frames})
    if distinct != FRAME_COUNT:
        raise ValueError(f"Idle must have four distinct poses; found {distinct}")

    preview_path = preview_dir / "novato-f-idle-preview.png"
    build_preview(strip, preview_path)

    report = {
        "class": "novato",
        "sex": args.sex,
        "action": "idle",
        "source": str(SOURCE.relative_to(ROOT)),
        "source_sha256": sha256_file(SOURCE),
        "strip_dimensions": [FRAME_W * FRAME_COUNT, FRAME_H],
        "cell_dimensions": [FRAME_W, FRAME_H],
        "frame_count": FRAME_COUNT,
        "alpha_extrema": list(strip.getchannel("A").getextrema()),
        "shared_palette": True,
        "per_frame_rescaling": False,
        "feet_baseline_drift_px": max(box[3] for box in source_boxes)
        - min(box[3] for box in source_boxes),
        "distinct_frame_count": distinct,
        "weapon_drawn_in_body": False,
        "runtime_integrated": False,
        "artistic_approval": "pending visual review",
        "output_sha256": sha256_file(strip_path),
        "frames": frames,
    }
    (OUT / "qa-report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
