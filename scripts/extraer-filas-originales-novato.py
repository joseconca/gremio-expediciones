#!/usr/bin/env python3
"""Archive and validate the three approved Novato rows from the canonical runtime sheets.

This does not paint armour over another class or modify runtime atlases. It creates
standalone transparent source strips so Idle, Walk and Hurt are easy to review while
preserving the existing approved Novato artwork.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
ROWS = {"idle": 0, "walk": 1, "hurt": 2}
W, H = 64, 128


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def cell_hash(cell: Image.Image) -> str:
    return hashlib.sha256(cell.convert("RGBA").tobytes()).hexdigest()


def generate(sex: str, action: str) -> None:
    source_path = ROOT / f"public/sprites/heroes/novato/novato-{sex}-sheet.png"
    if not source_path.is_file():
        raise FileNotFoundError(f"Canonical Novato sheet not found: {source_path}")
    with Image.open(source_path) as input_image:
        sheet = input_image.convert("RGBA")
    if sheet.size != (W * 4, H * 15):
        raise ValueError(f"Expected canonical 256×1920 Novato sheet; got {sheet.size}")
    if sheet.getchannel("A").getextrema()[0] != 0:
        raise ValueError("Canonical sheet does not have real transparency")

    row_index = ROWS[action]
    strip = sheet.crop((0, row_index * H, W * 4, (row_index + 1) * H))
    target_dir = ROOT / "assets/spritesheets/originales/novato" / action
    frame_dir = target_dir / "frames" / sex
    preview_dir = target_dir / "previews"
    frame_dir.mkdir(parents=True, exist_ok=True)
    preview_dir.mkdir(parents=True, exist_ok=True)

    report_frames = []
    for index in range(4):
        cell = strip.crop((index * W, 0, (index + 1) * W, H))
        bbox = cell.getchannel("A").getbbox()
        if bbox is None:
            raise ValueError(f"{action} frame {index + 1} is empty")
        frame_path = frame_dir / f"novato-{sex}-{action}-{index + 1:02d}.png"
        cell.save(frame_path, optimize=True)
        report_frames.append({
            "index": index + 1,
            "bbox": list(bbox),
            "rgba_sha256": cell_hash(cell),
            "visible_pixels": sum(1 for pixel in cell.getchannel("A").getdata() if pixel > 0),
        })

    distinct_count = len({frame["rgba_sha256"] for frame in report_frames})
    minimum = 3 if action == "idle" else 4
    if distinct_count < minimum:
        raise ValueError(f"{sex} {action} has {distinct_count} distinct frames; need at least {minimum}")

    strip_path = target_dir / f"novato-{sex}-{action}.png"
    strip.save(strip_path, optimize=True)
    exact_strip = Image.open(strip_path).convert("RGBA")
    preview = Image.new("RGBA", (W * 4 * 4, H * 4), (37, 39, 46, 255))
    draw = ImageDraw.Draw(preview)
    for y in range(0, preview.height, 16):
        for x in range(0, preview.width, 16):
            if ((x // 16) + (y // 16)) % 2:
                draw.rectangle((x, y, x + 15, y + 15), fill=(50, 52, 60, 255))
    preview.alpha_composite(exact_strip.resize((W * 4 * 4, H * 4), Image.Resampling.NEAREST))
    draw = ImageDraw.Draw(preview)
    for x in (W * 4, W * 8, W * 12):
        draw.line((x, 0, x, H * 4), fill=(105, 173, 210, 240), width=1)
    preview_path = preview_dir / f"novato-{sex}-{action}-preview.png"
    preview.save(preview_path, optimize=True)

    report = {
        "class": "novato",
        "sex": sex,
        "action": action,
        "source_sheet": str(source_path.relative_to(ROOT)),
        "source_sheet_sha256": sha256(source_path),
        "source_row_index": row_index,
        "dimensions": {"strip": [W * 4, H], "cell": [W, H], "frames": 4, "rows": 1},
        "disk_mode": Image.open(strip_path).mode,
        "alpha_extrema": list(exact_strip.getchannel("A").getextrema()),
        "file_size": strip_path.stat().st_size,
        "file_sha256": sha256(strip_path),
        "distinct_frame_count": distinct_count,
        "weapons_in_body": False,
        "legacy_tier1_layered_armour_used": False,
        "status": "standalone archive of approved Novato art; runtime atlas unchanged",
        "frames": report_frames,
    }
    (target_dir / f"qa-report-{sex}.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    readme_path = target_dir / "README.md"
    readme = (
        f"# Novato — {action.title()}\n\n"
        "Este recurso es una copia independiente de la fila correspondiente de la hoja "
        "canónica de Novato; no se dibuja equipo sobre otra clase y no modifica runtime.\n\n"
        "- Tira: 256 × 128 px, cuatro celdas horizontales de 64 × 128 px.\n"
        "- Fuente: public/sprites/heroes/novato/novato-m-sheet.png y su variante femenina.\n"
        "- Fotogramas RGBA separados en frames/m y frames/f; vistas previas en previews.\n"
        "- Los informes qa-report-m.json y qa-report-f.json registran tamaño, alfa, hashes y fotogramas.\n"
        "- Las armas siguen fuera del cuerpo y se componen mediante capas equipables.\n"
    )
    if not readme_path.exists():
        readme_path.write_text(readme, encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--sex", choices=("m", "f"), required=True)
    parser.add_argument("--action", choices=tuple(ROWS), required=True)
    args = parser.parse_args()
    generate(args.sex, args.action)


if __name__ == "__main__":
    main()
