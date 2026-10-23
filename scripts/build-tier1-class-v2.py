#!/usr/bin/env python3
"""Build v2 character sprite strips from one transparent 3-row master per sex.

Expected source is 128x192 (four native 32x64 frames per row) or 256x384
(four 64x128 preview-scale frames per row). Rows: Idle, Walk, Hurt.
This pipeline never edits the runtime sheets.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SOURCE_ROOT = ROOT / "assets" / "spritesheets" / "originales"
CLASSES = ("arquero", "mago", "acolito", "caballero", "duelista", "sacerdote", "monje", "cazador", "explorador", "elementalista", "brujo")
SEXES = ("f", "m")
ACTIONS = ("idle", "walk", "hurt")
ROWS = {name: index for index, name in enumerate(ACTIONS)}
W, H, COUNT = 64, 128, 4


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def file_digest(path: Path) -> str:
    return digest(path.read_bytes())


def make_preview(strip: Image.Image, destination: Path) -> None:
    scale = 4
    preview = Image.new("RGBA", (W * COUNT * scale, H * scale), (37, 39, 46, 255))
    draw = ImageDraw.Draw(preview)
    for y in range(0, preview.height, 16):
        for x in range(0, preview.width, 16):
            if (x // 16 + y // 16) % 2:
                draw.rectangle((x, y, x + 15, y + 15), fill=(50, 52, 60, 255))
    preview.alpha_composite(strip.resize((W * COUNT * scale, H * scale), Image.Resampling.NEAREST))
    draw = ImageDraw.Draw(preview)
    for frame in range(1, COUNT):
        x = frame * W * scale
        draw.line((x, 0, x, preview.height), fill=(105, 163, 198, 230), width=1)
    preview.save(destination, optimize=True)


def build(class_id: str, sex: str, action: str) -> dict:
    base = SOURCE_ROOT / class_id / "v2"
    masters = (
        base / "source" / f"{class_id}-{sex}-core-3rows.webp",
        base / "source" / f"{class_id}-{sex}-core-3rows.png",
    )
    master_path = next((path for path in masters if path.is_file()), None)
    if master_path is None:
        raise FileNotFoundError(f"Missing checked-in v2 master for {class_id}/{sex}: {masters[0]}")

    with Image.open(master_path) as opened:
        master_source = opened.convert("RGBA")
    if master_source.getchannel("A").getextrema() != (0, 255):
        raise ValueError(f"Master must have real alpha transparency: {master_path}")

    if master_source.size == (W * COUNT // 2, H * len(ACTIONS) // 2):
        native_master = master_source.copy()
        expanded_master = master_source.resize(
            (W * COUNT, H * len(ACTIONS)), Image.Resampling.NEAREST
        )
    elif master_source.size == (W * COUNT, H * len(ACTIONS)):
        expanded_master = master_source.copy()
        native_master = master_source.resize(
            (W * COUNT // 2, H * len(ACTIONS) // 2), Image.Resampling.NEAREST
        )
    else:
        raise ValueError(
            f"Expected master 128x192 or 256x384, got {master_source.size}: {master_path}"
        )

    row = ROWS[action]
    source = expanded_master.crop((0, row * H, W * COUNT, (row + 1) * H))
    native_source = native_master.crop(
        (0, row * (H // 2), W * COUNT // 2, (row + 1) * (H // 2))
    )
    out_dir = base / action
    preview_dir = out_dir / "previews"
    native_dir = out_dir / "frames-native-32x64" / sex
    preview_dir.mkdir(parents=True, exist_ok=True)
    native_dir.mkdir(parents=True, exist_ok=True)
    strip_path = out_dir / f"{class_id}-{sex}-{action}.png"
    source.save(strip_path, optimize=True)

    frame_records = []
    native_frame_records = []
    boxes = []
    hashes = []
    for index in range(COUNT):
        frame = source.crop((index * W, 0, (index + 1) * W, H))
        native_frame = native_source.crop(
            (index * (W // 2), 0, (index + 1) * (W // 2), H // 2)
        )
        bbox = frame.getchannel("A").getbbox()
        if bbox is None or native_frame.getchannel("A").getbbox() is None:
            raise ValueError(f"Empty frame in {class_id}/{sex}/{action} #{index + 1}")
        boxes.append(bbox)
        frame_hash = digest(frame.tobytes())
        hashes.append(frame_hash)
        native_path = native_dir / f"{class_id}-{sex}-{action}-{index + 1:02d}.png"
        native_frame.save(native_path, optimize=True)
        native_frame_records.append({
            "index": index + 1,
            "path": str(native_path.relative_to(ROOT)),
            "dimensions": [32, 64],
            "rgba_sha256": digest(native_frame.tobytes()),
        })
        frame_records.append({
            "index": index + 1,
            "bbox": list(bbox),
            "rgba_sha256": frame_hash,
            "visible_pixels": sum(1 for value in frame.getchannel("A").getdata() if value > 0),
        })

    distinct = len(set(hashes))
    if distinct != COUNT:
        raise ValueError(f"{class_id}/{sex}/{action}: expected 4 distinct frames, got {distinct}")
    feet_drift = max(box[3] for box in boxes) - min(box[3] for box in boxes)
    max_feet_drift = 4 if action == "walk" else 2
    if feet_drift > max_feet_drift:
        raise ValueError(f"{class_id}/{sex}/{action}: feet baseline drift {feet_drift}px > {max_feet_drift}px")

    preview_path = preview_dir / f"{class_id}-{sex}-{action}-preview.png"
    make_preview(source, preview_path)
    report = {
        "class": class_id,
        "sex": sex,
        "action": action,
        "source": str(master_path.relative_to(ROOT)),
        "source_sha256": file_digest(master_path),
        "source_master_three_rows": True,
        "source_row_index": row,
        "master_dimensions": list(master_source.size),
        "strip_dimensions": [W * COUNT, H],
        "cell_dimensions": [W, H],
        "native_frame_dimensions": [32, 64],
        "frame_count": COUNT,
        "alpha_extrema": list(source.getchannel("A").getextrema()),
        "feet_baseline_drift_px": feet_drift,
        "distinct_frame_count": distinct,
        "runtime_integrated": class_id not in {"cazador", "explorador", "elementalista", "brujo"},
        "artistic_approval": "pending visual review",
        "output_sha256": file_digest(strip_path),
        "frames": frame_records,
        "native_frames": native_frame_records,
        "preview": str(preview_path.relative_to(ROOT)),
    }
    report_path = out_dir / f"qa-report-{sex}-{action}.json"
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False))
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--class-id", choices=CLASSES, required=True)
    parser.add_argument("--sex", choices=SEXES, required=True)
    parser.add_argument("--action", choices=ACTIONS, required=True)
    args = parser.parse_args()
    build(args.class_id, args.sex, args.action)


if __name__ == "__main__":
    main()
