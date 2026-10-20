#!/usr/bin/env python3
"""Extract original Swordsman Idle frames from the checked-in full character concept sheet.

This must never use assets/spritesheets/tier1/*-master.png: those legacy images are
not approved artwork and were assembled from layered armor. The committed source image
contains the bespoke Swordsman model, already fully illustrated without weapons.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs/espadachin-caminar-entrega/source/concept_walk.png"
OUT = ROOT / "assets/spritesheets/originales/espadachin/idle"
W, H, FRAME_COUNT = 64, 128, 4

# Tight character crops from the four front/right-facing Idle panels in concept_walk.png.
# Do not include the panel headings, separators, or rear/side views.
CROPS = {
    "m": [
        (132, 52, 306, 245),
        (320, 52, 490, 245),
        (512, 52, 682, 245),
        (701, 52, 876, 245),
    ],
    "f": [
        (129, 489, 293, 681),
        (318, 489, 488, 681),
        (508, 489, 676, 681),
        (697, 489, 861, 681),
    ],
}


def file_sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def sha_rgba(im: Image.Image) -> str:
    return hashlib.sha256(im.convert("RGBA").tobytes()).hexdigest()


def make_cell(source: Image.Image, crop_box: tuple[int, int, int, int]) -> Image.Image:
    crop = source.crop(crop_box).convert("RGBA")
    alpha = crop.getchannel("A").point(lambda value: value if value >= 96 else 0)
    crop.putalpha(alpha)
    bbox = alpha.point(lambda value: 255 if value >= 96 else 0).getbbox()
    if not bbox:
        raise ValueError(f"Crop contains no character pixels: {crop_box}")
    subject = crop.crop(bbox)

    # The source artwork is already the approved class-specific design. Normalize the
    # full body to the 64x128 game cell; do not draw pieces or weapons over another class.
    rgb = subject.convert("RGB").resize((60, 120), Image.Resampling.LANCZOS)
    rgb = rgb.filter(ImageFilter.UnsharpMask(radius=0.65, percent=115, threshold=3))
    rgb = rgb.quantize(
        colors=80,
        method=Image.Quantize.MEDIANCUT,
        dither=Image.Dither.NONE,
    ).convert("RGB")
    mask = subject.getchannel("A").resize((60, 120), Image.Resampling.LANCZOS)
    mask = mask.point(lambda value: 255 if value >= 128 else 0)

    cell = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    cell.paste(rgb, (2, 4))
    alpha_cell = Image.new("L", (W, H), 0)
    alpha_cell.paste(mask, (2, 4))
    cell.putalpha(alpha_cell)
    return cell


def save_indexed_strip(strip: Image.Image, path: Path) -> None:
    # Compact indexed PNG with 31 colour entries and a dedicated transparent index.
    quantized = strip.convert("RGB").quantize(
        colors=31,
        method=Image.Quantize.MEDIANCUT,
        dither=Image.Dither.NONE,
    )
    palette = quantized.getpalette()[: 31 * 3] + [255, 0, 255]
    palette += [0] * (768 - len(palette))
    quantized.putpalette(palette)
    pixels = quantized.load()
    alpha = strip.getchannel("A").load()
    for y in range(H):
        for x in range(W * FRAME_COUNT):
            if alpha[x, y] == 0:
                pixels[x, y] = 31
    quantized.save(path, optimize=True, transparency=31)


def make_preview(strip_path: Path, preview_path: Path) -> None:
    strip = Image.open(strip_path).convert("RGBA")
    preview = Image.new("RGBA", (W * FRAME_COUNT * 4, H * 4), (37, 39, 46, 255))
    draw = ImageDraw.Draw(preview)
    for y in range(0, preview.height, 16):
        for x in range(0, preview.width, 16):
            if ((x // 16) + (y // 16)) % 2:
                draw.rectangle((x, y, x + 15, y + 15), fill=(50, 52, 60, 255))
    preview.alpha_composite(strip.resize((W * FRAME_COUNT * 4, H * 4), Image.Resampling.NEAREST))
    draw = ImageDraw.Draw(preview)
    for x in (W * 4, W * 8, W * 12):
        draw.line((x, 0, x, H * 4), fill=(105, 173, 210, 240), width=1)
    preview.save(preview_path, optimize=True)


def generate(sex: str) -> None:
    if not SOURCE.is_file():
        raise FileNotFoundError(f"Checked-in concept source is missing: {SOURCE}")
    with Image.open(SOURCE) as input_image:
        source = input_image.convert("RGBA")
    if source.size != (1774, 887):
        raise ValueError(f"Unexpected concept sheet size: {source.size}")

    frames_dir = OUT / "frames" / sex
    previews_dir = OUT / "previews"
    frames_dir.mkdir(parents=True, exist_ok=True)
    previews_dir.mkdir(parents=True, exist_ok=True)

    frames: list[Image.Image] = []
    for index, crop_box in enumerate(CROPS[sex], start=1):
        cell = make_cell(source, crop_box)
        frame_path = frames_dir / f"espadachin-{sex}-idle-{index:02d}.png"
        cell.save(frame_path, optimize=True)
        frames.append(cell)

    strip = Image.new("RGBA", (W * FRAME_COUNT, H), (0, 0, 0, 0))
    for index, cell in enumerate(frames):
        strip.alpha_composite(cell, (index * W, 0))

    strip_path = OUT / f"espadachin-{sex}-idle.png"
    save_indexed_strip(strip, strip_path)
    exact_strip = Image.open(strip_path).convert("RGBA")

    frame_report = []
    for index in range(FRAME_COUNT):
        cell = exact_strip.crop((index * W, 0, (index + 1) * W, H))
        bbox = cell.getchannel("A").getbbox()
        if bbox is None:
            raise ValueError(f"Frame {index + 1} is empty")
        frame_report.append({
            "index": index + 1,
            "bbox": list(bbox),
            "rgba_sha256": sha_rgba(cell),
            "visible_pixels": sum(1 for value in cell.getchannel("A").getdata() if value > 0),
        })

    if len({frame["rgba_sha256"] for frame in frame_report}) != FRAME_COUNT:
        raise ValueError("Idle row must contain four distinct frames")
    bottoms = [frame["bbox"][3] for frame in frame_report]
    if max(bottoms) - min(bottoms) > 2:
        raise ValueError(f"Idle frame baseline drift is too large: {bottoms}")
    if exact_strip.getchannel("A").getextrema()[0] != 0:
        raise ValueError("The row must contain real alpha transparency")

    preview_path = previews_dir / f"espadachin-{sex}-idle-preview.png"
    make_preview(strip_path, preview_path)
    report = {
        "class": "espadachin",
        "sex": sex,
        "action": "idle",
        "source": str(SOURCE.relative_to(ROOT)),
        "dimensions": {"strip": [W * FRAME_COUNT, H], "cell": [W, H], "frames": FRAME_COUNT, "rows": 1},
        "disk_mode": Image.open(strip_path).mode,
        "alpha_extrema": list(exact_strip.getchannel("A").getextrema()),
        "file_size": strip_path.stat().st_size,
        "file_sha256": file_sha(strip_path),
        "all_frames_distinct": True,
        "feet_baseline_aligned": True,
        "weapons_in_body": False,
        "source_is_legacy_tier1_overlay": False,
        "frames": frame_report,
        "status": "original class-specific art source; isolated from active runtime atlas",
    }
    report_path = OUT / f"qa-report-{sex}.json"
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--sex", choices=("m", "f"), required=True)
    args = parser.parse_args()
    generate(args.sex)


if __name__ == "__main__":
    main()
