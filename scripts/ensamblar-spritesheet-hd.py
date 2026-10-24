#!/usr/bin/env python3
"""Assemble a complete 4x15 HD atlas from independently versioned frame PNGs.

Input contract:
  assets/spritesheets/hd-128x256/<class>/<sex>/frames/<action>/
    <class>-<sex>-<action>-01.png ... -04.png
Each individual frame is transparent RGBA, 128x256 px. Only the HD staging
directory is written; runtime atlases are never touched.
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
SHEET_SIZE = (CELL_W * COLS, CELL_H * ROWS)
ACTIONS = (
    "idle", "walk", "hurt", "use_consumable", "dodge", "block_shield",
    "attack_sword", "attack_axe", "attack_spear", "attack_dagger",
    "attack_bow", "attack_staff", "attack_mace", "attack_book", "attack_gloves",
)


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def validate_frame(path: Path, action: str, frame_number: int) -> tuple[Image.Image, dict]:
    if not path.is_file():
        raise ValueError(f"Falta el frame {frame_number:02d} de {action}: {path}")
    try:
        with Image.open(path) as opened:
            if opened.format != "PNG":
                raise ValueError(f"{path} debe ser PNG, no {opened.format!r}")
            if opened.mode != "RGBA":
                raise ValueError(f"{path} debe ser RGBA, no {opened.mode}")
            if opened.size != (CELL_W, CELL_H):
                raise ValueError(f"{path}: tamaño {opened.size}; esperado {(CELL_W, CELL_H)}")
            frame = opened.copy()
    except OSError as error:
        raise ValueError(f"No se pudo leer {path}: {error}") from error

    alpha_min, alpha_max = frame.getchannel("A").getextrema()
    if alpha_min != 0 or alpha_max != 255:
        raise ValueError(
            f"{path} debe tener alfa real 0-255; obtenido {(alpha_min, alpha_max)}"
        )
    bbox = frame.getchannel("A").getbbox()
    if bbox is None:
        raise ValueError(f"{path}: frame completamente transparente")
    x0, y0, x1, y1 = bbox
    if x0 <= 0 or y0 <= 0 or x1 >= CELL_W or y1 >= CELL_H:
        raise ValueError(f"{path}: arte pegado al borde de la celda; bbox={bbox}")

    return frame, {
        "frame": frame_number,
        "path": str(path.relative_to(ROOT)) if path.is_relative_to(ROOT) else str(path),
        "sha256": sha256_file(path),
        "alpha_bbox": list(bbox),
    }


def create_review_preview(sheet: Image.Image, output_path: Path) -> None:
    """Create checkerboard review preview. Not consumed by the game."""
    bg = Image.new("RGBA", sheet.size, (36, 38, 45, 255))
    draw = ImageDraw.Draw(bg)
    tile = 32
    for y in range(0, sheet.height, tile):
        for x in range(0, sheet.width, tile):
            if (x // tile + y // tile) % 2:
                draw.rectangle(
                    (x, y, min(x + tile - 1, sheet.width - 1),
                     min(y + tile - 1, sheet.height - 1)),
                    fill=(50, 53, 62, 255),
                )
    bg.alpha_composite(sheet)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    bg.save(output_path, format="PNG", optimize=True)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--class-id", required=True, help="Clase, por ejemplo novato")
    parser.add_argument("--sex", required=True, choices=("m", "f"), help="m=masculino; f=femenino")
    parser.add_argument("--root", type=Path, default=HD_ROOT, help="Raíz del staging HD")
    parser.add_argument("--preview", action="store_true", help="Generar preview con damero")
    args = parser.parse_args()

    root = args.root if args.root.is_absolute() else ROOT / args.root
    variant_dir = root / args.class_id / args.sex
    frames_root = variant_dir / "frames"
    sheet_path = variant_dir / f"{args.class_id}-{args.sex}-sheet.png"
    report_path = variant_dir / "qa-report.json"

    try:
        sheet = Image.new("RGBA", SHEET_SIZE, (0, 0, 0, 0))
        rows_report = []
        all_hashes = set()

        # Validate all 60 independent PNG files before writing the atlas.
        for row_index, action in enumerate(ACTIONS):
            frame_reports = []
            frame_hashes = []
            for col_index in range(COLS):
                frame_number = col_index + 1
                frame_path = (
                    frames_root / action
                    / f"{args.class_id}-{args.sex}-{action}-{frame_number:02d}.png"
                )
                frame, frame_report = validate_frame(frame_path, action, frame_number)
                if frame_report["sha256"] in all_hashes:
                    # Cross-action exact clones are a quality warning that commonly
                    # indicates a copied frame; reject accidental duplicated source.
                    raise ValueError(f"Frame duplicado detectado: {frame_path}")
                all_hashes.add(frame_report["sha256"])
                frame_hashes.append(frame_report["sha256"])
                frame_reports.append(frame_report)
                sheet.alpha_composite(frame, (col_index * CELL_W, row_index * CELL_H))

            if len(set(frame_hashes)) != COLS:
                raise ValueError(f"{action}: deben existir cuatro fotogramas únicos")
            rows_report.append({
                "row": row_index,
                "action": action,
                "frameCount": COLS,
                "distinctFrameCount": len(set(frame_hashes)),
                "frames": frame_reports,
            })

        # Write only after all source PNGs have passed validation.
        variant_dir.mkdir(parents=True, exist_ok=True)
        sheet.save(sheet_path, format="PNG", optimize=True)
        validation = subprocess.run(
            [
                sys.executable, str(VALIDATOR),
                "--sheet", str(sheet_path),
                "--class-id", args.class_id,
                "--sex", args.sex,
            ],
            cwd=ROOT, capture_output=True, text=True, check=False,
        )
        if validation.returncode != 0:
            sheet_path.unlink(missing_ok=True)
            raise ValueError(
                "La hoja no superó el validador HD: "
                f"{(validation.stderr or validation.stdout).strip()}"
            )

        report = {
            "schemaVersion": 1,
            "status": "passed",
            "assembledAtUtc": datetime.now(timezone.utc).isoformat(),
            "classId": args.class_id,
            "sex": args.sex,
            "sheetPath": str(sheet_path.relative_to(ROOT)) if sheet_path.is_relative_to(ROOT) else str(sheet_path),
            "sheetSha256": sha256_file(sheet_path),
            "sheetDimensions": list(SHEET_SIZE),
            "cellDimensions": [CELL_W, CELL_H],
            "columns": COLS,
            "rows": rows_report,
            "framesValidated": COLS * ROWS,
            "runtimeModified": False,
            "visualReviewRequired": True,
            "limitations": [
                "La validación técnica no sustituye la revisión artística humana.",
                "La identidad consistente, la anatomía y la calidad de animación requieren QA visual.",
            ],
        }
        report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        if args.preview:
            create_review_preview(sheet, variant_dir / "preview.png")

    except (OSError, ValueError, json.JSONDecodeError) as error:
        print(f"[ensamblar-spritesheet-hd] ERROR: {error}", file=sys.stderr)
        return 1

    print(json.dumps({
        "status": "passed",
        "classId": args.class_id,
        "sex": args.sex,
        "sheet": str(sheet_path),
        "dimensions": list(SHEET_SIZE),
        "framesValidated": COLS * ROWS,
        "report": str(report_path),
        "previewGenerated": args.preview,
        "runtimeModified": False,
    }, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
