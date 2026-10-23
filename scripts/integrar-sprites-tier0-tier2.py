#!/usr/bin/env python3
"""Integra Idle/Walk/Hurt Tier 0-2 en atlas runtime sin tocar las 12 filas restantes."""
from __future__ import annotations
import argparse
import hashlib
import json
from pathlib import Path
from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public/sprites/heroes"
ORIGINALS = ROOT / "assets/spritesheets/originales"
TIER0 = ("novato",)
TIER1 = ("mago", "espadachin", "acolito", "arquero")
TIER2 = ("caballero", "duelista", "sacerdote", "monje", "cazador", "explorador", "elementalista", "brujo")
CLASSES = TIER0 + TIER1 + TIER2
SEXES = ("m", "f")
ACTIONS = ("idle", "walk", "hurt")
STAGING_CLASSES = frozenset(("elementalista", "brujo", "cazador", "explorador"))
SHEET_SIZE = (256, 1920)
STRIP_SIZE = (256, 128)
CELL_SIZE = (64, 128)
PORTRAIT_SIZE = (128, 256)


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: Path) -> str:
    return sha256_bytes(path.read_bytes())


def fail(message: str) -> None:
    raise SystemExit(f"[integrar-sprites] ERROR: {message}")


def source_path(class_id: str, sex: str, action: str) -> tuple[Path, str]:
    if class_id in STAGING_CLASSES:
        # Para estas clases es obligatorio usar staging; no retroceder al arte anterior.
        path = ORIGINALS / class_id / "v2" / "rework-staging" / sex / f"{action}-right-4f.png"
        return path, "rework-staging"
    path = ORIGINALS / class_id / "v2" / action / f"{class_id}-{sex}-{action}.png"
    return path, "canonical-v2"


def open_strip(path: Path, class_id: str, sex: str, action: str) -> Image.Image:
    if not path.is_file():
        fail(f"falta la fuente de {class_id}/{sex}/{action}: {path.relative_to(ROOT)}")
    try:
        with Image.open(path) as opened:
            image = opened.convert("RGBA")
    except Exception as exc:
        fail(f"PNG ilegible para {class_id}/{sex}/{action}: {path.relative_to(ROOT)} ({exc})")
    if image.size != STRIP_SIZE:
        fail(f"{path.relative_to(ROOT)} debe medir {STRIP_SIZE}, recibido {image.size}")
    alpha_min, alpha_max = image.getchannel("A").getextrema()
    if alpha_min != 0 or alpha_max != 255:
        fail(f"{path.relative_to(ROOT)} no tiene transparencia alfa real: extrema {(alpha_min, alpha_max)}")
    frames = [image.crop((i * CELL_SIZE[0], 0, (i + 1) * CELL_SIZE[0], CELL_SIZE[1])) for i in range(4)]
    if any(frame.getchannel("A").getbbox() is None for frame in frames):
        fail(f"{path.relative_to(ROOT)} contiene un fotograma vacío")
    if len({frame.tobytes() for frame in frames}) != 4:
        fail(f"{path.relative_to(ROOT)} no contiene cuatro fotogramas distintos")
    return image


def composite_on_reference(image: Image.Image) -> Image.Image:
    background = Image.new("RGBA", image.size, (30, 28, 34, 255))
    background.alpha_composite(image.convert("RGBA"))
    return background


def integrate_one(class_id: str, sex: str) -> dict:
    sheet_path = OUT / class_id / f"{class_id}-{sex}-sheet.png"
    if not sheet_path.is_file():
        fail(f"falta el atlas runtime existente: {sheet_path.relative_to(ROOT)}")
    try:
        with Image.open(sheet_path) as opened:
            sheet = opened.convert("RGBA")
    except Exception as exc:
        fail(f"atlas runtime ilegible {sheet_path.relative_to(ROOT)} ({exc})")
    if sheet.size != SHEET_SIZE:
        fail(f"{sheet_path.relative_to(ROOT)} debe medir {SHEET_SIZE}, recibido {sheet.size}")
    if sheet.getchannel("A").getextrema()[0] != 0:
        fail(f"{sheet_path.relative_to(ROOT)} ha perdido la transparencia")

    # Las filas 3-14 contienen acciones/ataques aún no rediseñados. Conservarlas
    # literalmente, incluidas sus transparencias, no solo de forma visual.
    tail_before = sheet.crop((0, 3 * CELL_SIZE[1], SHEET_SIZE[0], SHEET_SIZE[1])).tobytes()
    selected = []
    idle = None
    for row, action in enumerate(ACTIONS):
        source, source_kind = source_path(class_id, sex, action)
        strip = open_strip(source, class_id, sex, action)
        selected.append({
            "action": action,
            "row": row,
            "source_kind": source_kind,
            "source": str(source.relative_to(ROOT)),
            "source_sha256": sha256_file(source),
            "frame_sha256": [
                sha256_bytes(strip.crop((i * CELL_SIZE[0], 0, (i + 1) * CELL_SIZE[0], CELL_SIZE[1])).tobytes())
                for i in range(4)
            ],
        })
        # Reemplazar la fila completa, también donde la nueva pose sea transparente.
        sheet.paste(strip, (0, row * CELL_SIZE[1]))
        if action == "idle":
            idle = strip.crop((0, 0, CELL_SIZE[0], CELL_SIZE[1]))
    if idle is None:
        fail(f"no se ha obtenido Idle para {class_id}/{sex}")

    sheet_path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(sheet_path, format="PNG", optimize=True, compress_level=9)
    with Image.open(sheet_path) as saved:
        verified = saved.convert("RGBA")
    if verified.size != SHEET_SIZE:
        fail(f"el atlas de salida cambió de tamaño: {sheet_path.relative_to(ROOT)}")
    tail_after = verified.crop((0, 3 * CELL_SIZE[1], SHEET_SIZE[0], SHEET_SIZE[1])).tobytes()
    if tail_before != tail_after:
        fail(f"la integración alteró por error las filas 3-14 de {sheet_path.relative_to(ROOT)}")

    for row, entry in enumerate(selected):
        expected = open_strip(ROOT / entry["source"], class_id, sex, entry["action"])
        actual = verified.crop((0, row * CELL_SIZE[1], SHEET_SIZE[0], (row + 1) * CELL_SIZE[1]))
        if ImageChops.difference(composite_on_reference(expected), composite_on_reference(actual)).getbbox():
            fail(f"la fila runtime {row} no coincide con {entry['source']}")

    portrait_path = OUT / class_id / f"{class_id}-{sex}.png"
    portrait = idle.resize(PORTRAIT_SIZE, Image.Resampling.NEAREST)
    portrait_path.parent.mkdir(parents=True, exist_ok=True)
    portrait.save(portrait_path, format="PNG", optimize=True, compress_level=9)
    with Image.open(portrait_path) as saved_portrait:
        portrait_check = saved_portrait.convert("RGBA")
    if portrait_check.size != PORTRAIT_SIZE or portrait_check.getchannel("A").getextrema()[0] != 0:
        fail(f"el retrato generado no cumple tamaño/transparencia: {portrait_path.relative_to(ROOT)}")
    if portrait_check.getchannel("A").getbbox() is None:
        fail(f"retrato vacío: {portrait_path.relative_to(ROOT)}")

    return {
        "class": class_id,
        "tier": 0 if class_id in TIER0 else 1 if class_id in TIER1 else 2,
        "sex": sex,
        "runtime_sheet": str(sheet_path.relative_to(ROOT)),
        "runtime_sheet_sha256": sha256_file(sheet_path),
        "portrait": str(portrait_path.relative_to(ROOT)),
        "portrait_size": list(PORTRAIT_SIZE),
        "portrait_sha256": sha256_file(portrait_path),
        "portrait_source": selected[0]["source"],
        "selected_animation_rows": selected,
        "preserved_rows_3_14_rgba_sha256": sha256_bytes(tail_after),
        "other_rows_modified": False,
        "portrait_from_svg": False,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--report", default="artifacts/sprites-tier0-tier2-runtime-report.json")
    args = parser.parse_args()
    report = {
        "schemaVersion": 1,
        "purpose": "Runtime integration of Idle/Walk/Hurt for Tier 0, Tier 1 and Tier 2",
        "classes": list(CLASSES),
        "sexes": list(SEXES),
        "actions": list(ACTIONS),
        "atlas_size": list(SHEET_SIZE),
        "cell_size": list(CELL_SIZE),
        "portrait_size": list(PORTRAIT_SIZE),
        "rework_staging_priority": sorted(STAGING_CLASSES),
        "preserve_rows_3_14": True,
        "portraits_from_svg": False,
        "results": [],
    }
    for class_id in CLASSES:
        for sex in SEXES:
            result = integrate_one(class_id, sex)
            report["results"].append(result)
            sources = ",".join(row["source_kind"] for row in result["selected_animation_rows"])
            print(f"OK {class_id}/{sex}: Idle, Walk, Hurt [{sources}] + retrato {PORTRAIT_SIZE[0]}x{PORTRAIT_SIZE[1]}")

    report_path = ROOT / args.report
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    if len(report["results"]) != len(CLASSES) * len(SEXES):
        fail("no se generaron las 26 combinaciones clase/sexo")
    print(f"OK: {len(report['results'])} atlas y retratos; filas 3-14 conservadas; informe {report_path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
