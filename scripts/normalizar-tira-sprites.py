#!/usr/bin/env python3
"""Normalize a clean high-resolution sprite strip into game-ready 64x128 frames.

Input contract:
- One class + one sex + one action per source PNG.
- 4, 6 or 8 poses placed left-to-right in equal-width cells.
- Real alpha transparency; no checkerboard, UI, labels, frame borders or weapons.
- The same character design, zoom and light direction across every cell.

All cels share one uniform scale calculated from the largest visible source bbox.
They are bottom-aligned to the same baseline and centered in the same target cell.
This avoids per-frame auto-scaling that makes a crouching pose look unnaturally large.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from PIL import Image, ImageDraw

TARGET_W = 64
TARGET_H = 128
ALLOWED_FRAMES = (4, 6, 8)


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def image_sha256(path: Path) -> str:
    return sha256_bytes(path.read_bytes())


def alpha_bbox(frame: Image.Image) -> tuple[int, int, int, int]:
    bbox = frame.getchannel("A").getbbox()
    if bbox is None:
        raise ValueError("A source frame is completely transparent")
    return bbox


def quantize_strip(strip: Image.Image, alpha: Image.Image, palette_colors: int) -> Image.Image:
    """Use one palette across the action, rather than letting each frame drift in colour."""
    rgba = strip.convert("RGBA")
    rgb = rgba.convert("RGB")
    pixels = rgb.load()
    alpha_px = alpha.load()
    # A single reserved key colour occupies the invisible area while building one
    # shared palette; the source alpha mask is restored after quantization.
    for y in range(rgb.height):
        for x in range(rgb.width):
            if alpha_px[x, y] == 0:
                pixels[x, y] = (255, 0, 255)
    indexed = rgb.quantize(colors=palette_colors, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    result = indexed.convert("RGB").convert("RGBA")
    result.putalpha(alpha.point(lambda a: 255 if a >= 128 else 0))
    return result


def checker_preview(strip: Image.Image, frame_count: int, output_path: Path) -> None:
    scale = 4
    preview = Image.new(
        "RGBA", (TARGET_W * frame_count * scale, TARGET_H * scale), (39, 41, 48, 255)
    )
    draw = ImageDraw.Draw(preview)
    for y in range(0, preview.height, 16):
        for x in range(0, preview.width, 16):
            if (x // 16 + y // 16) % 2:
                draw.rectangle((x, y, x + 15, y + 15), fill=(52, 54, 62, 255))
    preview.alpha_composite(
        strip.resize((TARGET_W * frame_count * scale, TARGET_H * scale), Image.Resampling.NEAREST)
    )
    draw = ImageDraw.Draw(preview)
    for index in range(1, frame_count):
        x = index * TARGET_W * scale
        draw.line((x, 0, x, preview.height), fill=(112, 160, 196, 235), width=1)
    preview.save(output_path, optimize=True)


def normalize(
    source_path: Path,
    output_dir: Path,
    name: str,
    frame_count: int,
    palette_colors: int,
    locked_scale: float | None = None,
) -> dict:
    if frame_count not in ALLOWED_FRAMES:
        raise ValueError(f"--frames must be one of {ALLOWED_FRAMES}")
    if not source_path.is_file():
        raise FileNotFoundError(source_path)
    with Image.open(source_path) as opened:
        source = opened.convert("RGBA")

    if source.width % frame_count:
        raise ValueError(
            f"Source width {source.width} is not divisible by {frame_count}; "
            "each pose must occupy an equal-width cell"
        )
    if source.getchannel("A").getextrema()[0] != 0:
        raise ValueError(
            "Source must have real alpha transparency. Remove the background from the source "
            "art first; do not feed screenshots, checkerboards, labels or infographic panels."
        )

    source_cell_w = source.width // frame_count
    source_cell_h = source.height
    source_cells = []
    source_boxes = []
    for index in range(frame_count):
        cell = source.crop((index * source_cell_w, 0, (index + 1) * source_cell_w, source_cell_h))
        bbox = alpha_bbox(cell)
        x0, y0, x1, y1 = bbox
        if x0 <= 1 or x1 >= source_cell_w - 1:
            raise ValueError(
                f"Source frame {index + 1} touches a horizontal cell edge ({bbox}); "
                "the pose may be clipped or neighbouring frames may overlap"
            )
        source_cells.append(cell.crop(bbox))
        source_boxes.append(list(bbox))

    # One global scale for all poses in this action (never an independent scale per frame).
    max_source_w = max(frame.width for frame in source_cells)
    max_source_h = max(frame.height for frame in source_cells)
    computed_scale = min((TARGET_W - 4) / max_source_w, (TARGET_H - 8) / max_source_h)
    scale = locked_scale if locked_scale is not None else computed_scale
    if scale <= 0 or scale * max_source_w > TARGET_W - 2 or scale * max_source_h > TARGET_H - 2:
        raise ValueError(
            f"Uniform scale {scale} would clip a source frame; maximum safe scale is {computed_scale:.6f}"
        )
    final_cells: list[Image.Image] = []
    final_boxes = []
    frame_hashes = []
    source_frame_dir = output_dir / "frames"
    source_frame_dir.mkdir(parents=True, exist_ok=True)

    # Normalize cells first while keeping the original alpha edges; a shared palette comes next.
    for index, cropped in enumerate(source_cells, start=1):
        new_w = max(1, round(cropped.width * scale))
        new_h = max(1, round(cropped.height * scale))
        resized = cropped.resize((new_w, new_h), Image.Resampling.LANCZOS)
        alpha = resized.getchannel("A").point(lambda value: 255 if value >= 96 else 0)
        cell = Image.new("RGBA", (TARGET_W, TARGET_H), (0, 0, 0, 0))
        x = (TARGET_W - new_w) // 2
        y = TARGET_H - 4 - new_h
        cell.paste(resized, (x, y), alpha)
        final_cells.append(cell)
        final_boxes.append(list(cell.getchannel("A").getbbox() or (0, 0, 0, 0)))

    rgba_strip = Image.new("RGBA", (TARGET_W * frame_count, TARGET_H), (0, 0, 0, 0))
    alpha_strip = Image.new("L", rgba_strip.size, 0)
    for index, cell in enumerate(final_cells):
        x = index * TARGET_W
        rgba_strip.alpha_composite(cell, (x, 0))
        alpha_strip.paste(cell.getchannel("A"), (x, 0))

    # Apply one global palette to the whole strip to prevent colour changes between frames.
    old_count = palette_colors
    if not (16 <= old_count <= 64):
        raise ValueError("--palette-colors must be between 16 and 64")
    quantized = quantize_strip(rgba_strip, alpha_strip, palette_colors)
    strip_path = output_dir / f"{name}.png"
    quantized.save(strip_path, optimize=True)

    # Export exact final cells; preserve the same palette/alpha representation as the strip.
    with Image.open(strip_path) as final_strip_file:
        final_strip = final_strip_file.convert("RGBA")
    distinct_hashes = []
    frame_records = []
    for index in range(frame_count):
        cell = final_strip.crop((index * TARGET_W, 0, (index + 1) * TARGET_W, TARGET_H))
        bbox = alpha_bbox(cell)
        frame_path = source_frame_dir / f"{name}-{index + 1:02d}.png"
        cell.save(frame_path, optimize=True)
        rgba_hash = sha256_bytes(cell.tobytes())
        distinct_hashes.append(rgba_hash)
        frame_records.append({
            "index": index + 1,
            "source_bbox": source_boxes[index],
            "final_bbox": list(bbox),
            "rgba_sha256": rgba_hash,
            "visible_pixels": sum(1 for value in cell.getchannel("A").getdata() if value > 0),
        })

    if len(set(distinct_hashes)) < min(frame_count, 3):
        raise ValueError(
            f"Only {len(set(distinct_hashes))} unique frames survived normalization; "
            "review the source animation before committing it"
        )

    preview_path = output_dir / f"{name}-preview.png"
    checker_preview(final_strip, frame_count, preview_path)
    report = {
        "source": str(source_path),
        "source_sha256": image_sha256(source_path),
        "source_dimensions": [source.width, source.height],
        "source_cell_dimensions": [source_cell_w, source_cell_h],
        "final_strip_dimensions": [TARGET_W * frame_count, TARGET_H],
        "final_cell_dimensions": [TARGET_W, TARGET_H],
        "frame_count": frame_count,
        "uniform_scale": scale,
        "scale_mode": "locked" if locked_scale is not None else "computed_from_this_action",
        "shared_palette_colors": palette_colors,
        "alpha_extrema": list(final_strip.getchannel("A").getextrema()),
        "all_frames_aligned_to_baseline_y": TARGET_H - 4,
        "distinct_frame_count": len(set(distinct_hashes)),
        "weapon_in_body": False,
        "background_in_source": False,
        "runtime_integrated": False,
        "frames": frame_records,
        "output_sha256": image_sha256(strip_path),
    }
    report_path = output_dir / "qa-report.json"
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", required=True, type=Path, help="High-resolution transparent PNG strip")
    parser.add_argument("--out-dir", required=True, type=Path, help="Output directory")
    parser.add_argument("--name", required=True, help="Filename stem, e.g. novato-f-idle")
    parser.add_argument("--frames", type=int, choices=ALLOWED_FRAMES, default=4)
    parser.add_argument("--palette-colors", type=int, default=32)
    parser.add_argument("--scale", type=float, default=None, help="Reuse the exact scale calculated from Idle for other actions")
    args = parser.parse_args()
    args.out_dir.mkdir(parents=True, exist_ok=True)
    normalize(args.source, args.out_dir, args.name, args.frames, args.palette_colors, args.scale)


if __name__ == "__main__":
    main()
