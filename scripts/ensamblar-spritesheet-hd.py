#!/usr/bin/env python3
"""Assemble a complete 4x15 HD hero sprite atlas from validated action strips.

Expected input:
  assets/spritesheets/hd-128x256/<class>/<sex>/actions/<action>.png
Each action strip is PNG RGBA, 512x256 px, and contains four 128x256 frames.
This script writes only to the HD staging directory. It never edits runtime atlases.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
HD_ROOT = ROOT / "assets" / "spritesheets" / "hd-128x256"
VALIDATOR = ROOT / "scripts" / "validar-spritesheet-hd.py"

CELL_W, CELL_H = 128, 256
COLS, ROWS = 4, 15
STRIP_SIZE = (CELL_W * COLS, CELL_H)
SHEET_SIZE = (STRIP_SIZE[0], CELL_H * ROWS)
ACTIONS = (
    "idle",
    "walk",
    "hurt",
    "use_consumable",
    "dodge",
    "block_shield",
    "attack_sword",
    "attack_axe",
    "attack_spear",
    "attack_dagger",
    "attack_bow",
    "attack_staff",
    "attack_mace",
    "attack_book",
    "attack_gloves",
)


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def validate_strip(path: Path, action: str) -> Image.Image:
    if not path.is_file():
        raise ValueError(f"Falta la tira de acción {action}: {path.relative_to(ROOT)}")
    try:
        with Image.open(path) as opened:
            if opened.format != "PNG":
                raise ValueError(f"{path.relative_to(ROOT)} debe ser PNG, no {opened.format!r}")
            if opened.mode != "RGBA":
                raise ValueError(f"{path.relative_to(ROOT)} debe ser RGBA, no {opened.mode}")
            if opened.size != STRIP_SIZE:
                raise ValueError(
                    f"{path.relative_to(ROOT)}: tamaño {opened.size}; esperado {STRIP_SIZE}"
                )
            strip = opened.copy()
    except OSError as error:
        raise ValueError(f"No se pudo leer {path.relative_to(ROOT)}: {error}") from error

    alpha_min, alpha_max = strip.getchannel("A").getextrema()
    if (alpha_min, alpha_max) != (0, 255):
        raise ValueError(
            f"{path.relative_to(ROOT)} debe tener transparencia alfa real 0-255; "
            f"obtenido {(alpha_min, alpha_max)}"
        )

    hashes = []
    for column in range(COLS):
        left = column * CELL_W
        frame = strip.crop((left, 0, left + CELL_W, CELL_H))
        bbox = frame.getchannel("A").getbbox()
        if bbox is None:
            raise ValueError(f"{action}: fotograma {column + 1} vacío")
        x0, y0, x1, y1 = bbox
        if x0 <= 0 or y0 <= 0 or x1 >= CELL_W or y1 >= CELL_H:
            raise ValueError(
                f"{action}: fotograma {column + 1} toca el borde de la celda; bbox={bbox}"
            )
        hashes.append(hashlib.sha256(frame.tobytes()).hexdigest())

    if len(set(hashes)) != COLS:
        raise ValueError(f"{action}: se requieren cuatro fotogramas únicos (no clones exactos)")
    return strip


def create_review_preview(sheet: Image.Image, output_path: Path) -> None:
    """Create a visual QA preview over a checkerboard; never used by runtime."""
    bg = Image.new("RGBA", sheet.size, (36, 38, 45, 255))
    draw = ImageDraw.Draw(bg)
    tile = 32
    light = (50, 53, 62, 255)
    for y in range(0, sheet.height, tile):
        for x in range(0, sheet.width, tile):
            if (x // tile + y // tile) % 2:
                draw.rectangle((x, y, min(x + tile - 1, sheet.width - 1),
                                min(y + tile - 1, sheet.height - 1)), fill=light)
    bg.alpha_composite(sheet)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    bg.save(output_path, format="PNG", optimize=True)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--class-id", required=True, help="Identificador de clase, por ejemplo novato")
    parser.add_argument("--sex", required=True, choices=("m", "f"), help="m=masculino; f=femenino")
    parser.add_argument(
        "--root", type=Path, default=HD_ROOT,
        help="Raíz HD de staging (por defecto assets/spritesheets/hd-128x256)"
    )
    parser.add_argument("--preview", action="store_true", help="Generar además una preview con damero")
    args = parser.parse_args()

    root = args.root if args.root.is_absolute() else ROOT / args.root
    variant_dir = root / args.class_id / args.sex
    action_dir = variant_dir / "actions"
    sheet_path = variant_dir / f"{args.class_id}-{args.sex}-sheet.png"
    report_path = variant_dir / "qa-report.json"

    try:
        strips: list[tuple[str, Path, Image.Image]] = []
        for action in ACTIONS:
            source_path = action_dir / f"{action}.png"
            strip = validate_strip(source_path, action)
            strips.append((action, source_path, strip))

        sheet = Image.new("RGBA", SHEET_SIZE, (0, 0, 0, 0))
        source_report = []
        for row_index, (action, source_path, strip) in enumerate(strips):
            sheet.paste(strip, (0, row_index * CELL_H))
            source_report.append({
                "row": row_index,
                "action": action,
                "path": str(source_path.relative_to(ROOT)) if source_path.is_relative_to(ROOT) else str(source_path),
                "sha256": sha256_file(source_path),
            })

        # Save only after every input strip has passed its individual checks.
        variant_dir.mkdir(parents=True, exist_ok=True)
        sheet.save(sheet_path, format="PNG", optimize=True)

        validation = subprocess.run(
            [
                sys.executable,
                str(VALIDATOR),
                "--sheet", str(sheet_path),
                "--class-id", args.class_id,
                "--sex", args.sex,
                "--report", str(report_path),
            ],
            cwd=ROOT,
            check=False,
            capture_output=True,
            text=True,
        )
        if validation.returncode != 0:
            sheet_path.unlink(missing_ok=True)
            report_path.unlink(missing_ok=True)
            raise ValueError(
                "La hoja ensamblada no superó el validador HD. "
                f"Detalle: {(validation.stderr or validation.stdout).strip()}"
            )

        report = json.loads(report_path.read_text(encoding="utf-8"))
        report["assembler"] = "scripts/ensamblar-spritesheet-hd.py"
        report["assembledAtUtc"] = datetime.now(timezone.utc).isoformat()
        report["sourceStrips"] = source_report
        report["runtimeModified"] = False
        report["visualReviewRequired"] = True
        report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

        if args.preview:
            preview_path = variant_dir / "preview.png"
            create_review_preview(sheet, preview_path)

    except (OSError, ValueError, json.JSONDecodeError) as error:
        print(f"[ensamblar-spritesheet-hd] ERROR: {error}", file=sys.stderr)
        return 1

    print(json.dumps({
        "status": "passed",
        "classId": args.class_id,
        "sex": args.sex,
        "sheet": str(sheet_path.relative_to(ROOT)) if sheet_path.is_relative_to(ROOT) else str(sheet_path),
        "dimensions": list(SHEET_SIZE),
        "rows": len(ACTIONS),
        "frames": len(ACTIONS) * COLS,
        "report": str(report_path.relative_to(ROOT)) if report_path.is_relative_to(ROOT) else str(report_path),
        "previewGenerated": args.preview,
        "runtimeModified": False,
    }, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
