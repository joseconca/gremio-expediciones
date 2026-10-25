#!/usr/bin/env python3
"""Valida una hoja HD completa de 4x15 fotogramas de 128x256.

Este validador es independiente del pipeline legado de sprites de 64x128 y
no modifica ni integra recursos en runtime.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image

CELL_W = 128
CELL_H = 256
COLS = 4
ROWS = 15
SHEET_SIZE = (CELL_W * COLS, CELL_H * ROWS)
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


def validate(sheet_path: Path, class_id: str, sex: str) -> dict:
    if not sheet_path.is_file():
        raise ValueError(f"No existe la hoja: {sheet_path}")

    with Image.open(sheet_path) as opened:
        if opened.format != "PNG":
            raise ValueError(f"Se esperaba PNG, recibido {opened.format!r}: {sheet_path}")
        if opened.mode != "RGBA":
            raise ValueError(
                f"La hoja debe estar guardada como RGBA, recibido {opened.mode}: {sheet_path}"
            )
        if opened.size != SHEET_SIZE:
            raise ValueError(
                f"Dimensiones incorrectas: recibido {opened.size}, esperado {SHEET_SIZE}"
            )
        image = opened.copy()

    alpha = image.getchannel("A")
    alpha_min, alpha_max = alpha.getextrema()
    if alpha_min != 0 or alpha_max != 255:
        raise ValueError(
            f"Se requiere transparencia real con alfa 0 y píxeles opacos con alfa 255; "
            f"extremos detectados: {(alpha_min, alpha_max)}"
        )

    row_reports = []
    visible_cells = 0
    for row_index, action in enumerate(ACTIONS):
        frame_hashes = []
        frame_reports = []
        for col_index in range(COLS):
            left = col_index * CELL_W
            top = row_index * CELL_H
            frame = image.crop((left, top, left + CELL_W, top + CELL_H))
            frame_alpha = frame.getchannel("A")
            bbox = frame_alpha.getbbox()
            if bbox is None:
                raise ValueError(
                    f"Celda vacía: fila {row_index} ({action}), fotograma {col_index}"
                )

            x0, y0, x1, y1 = bbox
            # Evita aceptar personajes cortados contra el borde de una celda.
            # La caja alfa usa límite derecho/inferior exclusivo.
            if x0 <= 0 or y0 <= 0 or x1 >= CELL_W or y1 >= CELL_H:
                raise ValueError(
                    f"Arte pegado al borde de la celda: {action}, fotograma {col_index}; "
                    f"bbox alfa={bbox}, celda={CELL_W}x{CELL_H}"
                )

            frame_hashes.append(hashlib.sha256(frame.tobytes()).hexdigest())
            frame_reports.append({
                "column": col_index,
                "alpha_bbox": list(bbox),
                "sha256": frame_hashes[-1],
            })
            visible_cells += 1

        if len(set(frame_hashes)) != COLS:
            raise ValueError(
                f"La fila {row_index} ({action}) no contiene cuatro fotogramas únicos"
            )
        row_reports.append({
            "row": row_index,
            "action": action,
            "frame_count": len(frame_reports),
            "distinct_frames": len(set(frame_hashes)),
            "frames": frame_reports,
        })

    return {
        "schemaVersion": 1,
        "status": "passed",
        "checkedAtUtc": datetime.now(timezone.utc).isoformat(),
        "classId": class_id,
        "sex": sex,
        "file": str(sheet_path),
        "fileSha256": sha256_file(sheet_path),
        "image": {
            "format": "PNG",
            "mode": "RGBA",
            "dimensions": list(SHEET_SIZE),
            "cellDimensions": [CELL_W, CELL_H],
            "columns": COLS,
            "rows": ROWS,
            "visibleCells": visible_cells,
            "alphaExtrema": [alpha_min, alpha_max],
        },
        "rows": row_reports,
        "limitations": [
            "La validación técnica no sustituye la revisión artística humana.",
            "La coherencia de identidad, anatomía, paleta, movimiento y preparación para capas de equipo requiere QA visual.",
        ],
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sheet", required=True, type=Path, help="PNG de 512x3840 que se validará")
    parser.add_argument("--class-id", required=True, help="ID de clase, por ejemplo novato")
    parser.add_argument("--sex", required=True, choices=("m", "f"), help="Variante: m o f")
    parser.add_argument("--report", type=Path, help="Guardar el informe JSON en esta ruta")
    args = parser.parse_args()

    try:
        report = validate(args.sheet, args.class_id, args.sex)
    except (OSError, ValueError) as error:
        print(f"[spritesheet-hd] ERROR: {error}", file=sys.stderr)
        return 1

    rendered = json.dumps(report, ensure_ascii=False, indent=2) + "\n"
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(rendered, encoding="utf-8")
    print(rendered, end="")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
