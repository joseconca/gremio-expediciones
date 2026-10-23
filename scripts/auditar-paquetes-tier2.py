#!/usr/bin/env python3
"""Audita los paquetes fuente Tier 2 y las fuentes seleccionadas para runtime."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
CLASSES = (
    "caballero",
    "duelista",
    "sacerdote",
    "monje",
    "cazador",
    "explorador",
    "elementalista",
    "brujo",
)
SEXES = ("m", "f")
ACTIONS = ("idle", "walk", "hurt")
STAGING_CLASSES = frozenset(("cazador", "explorador", "elementalista", "brujo"))
MASTER_SIZES = {(128, 192), (256, 384)}
STRIP_SIZE = (256, 128)
FRAME_SIZE = (64, 128)
NATIVE_SIZE = (32, 64)


def fail(message: str) -> None:
    raise SystemExit(f"ERROR sprites Tier 2: {message}")


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def rgba(path: Path) -> Image.Image:
    if not path.is_file():
        fail(f"falta el archivo {path.relative_to(ROOT)}")
    try:
        with Image.open(path) as opened:
            return opened.convert("RGBA")
    except Exception as error:  # Pillow reports several decode error types.
        fail(f"PNG/WebP ilegible {path.relative_to(ROOT)}: {error}")


def check_master(class_id: str, sex: str) -> None:
    base = ROOT / "assets" / "spritesheets" / "originales" / class_id / "v2" / "source"
    candidates = (
        base / f"{class_id}-{sex}-core-3rows.webp",
        base / f"{class_id}-{sex}-core-3rows.png",
    )
    source = next((candidate for candidate in candidates if candidate.is_file()), None)
    if source is None:
        fail(f"falta el máster de origen para {class_id}/{sex}")

    image = rgba(source)
    if image.size not in MASTER_SIZES:
        fail(f"{source.relative_to(ROOT)}: tamaño no admitido {image.size}")
    if image.getchannel("A").getextrema() != (0, 255):
        fail(f"{source.relative_to(ROOT)}: el máster necesita alfa real (0-255)")

    cell_width = image.width // 4
    cell_height = image.height // 3
    for row in range(3):
        frame_hashes = []
        for column in range(4):
            frame = image.crop((
                column * cell_width,
                row * cell_height,
                (column + 1) * cell_width,
                (row + 1) * cell_height,
            ))
            if frame.getchannel("A").getbbox() is None:
                fail(f"{source.relative_to(ROOT)}: celda vacía en fila {row + 1}, fotograma {column + 1}")
            frame_hashes.append(hashlib.sha256(frame.tobytes()).hexdigest())
        if len(set(frame_hashes)) != 4:
            fail(f"{source.relative_to(ROOT)}: la fila {row + 1} no contiene cuatro poses distintas")


def check_action(class_id: str, sex: str, action: str, row: int) -> int:
    base = ROOT / "assets" / "spritesheets" / "originales" / class_id / "v2" / action
    strip_path = base / f"{class_id}-{sex}-{action}.png"
    qa_path = base / f"qa-report-{sex}-{action}.json"

    if not qa_path.is_file():
        fail(f"falta QA {qa_path.relative_to(ROOT)}")
    try:
        report = json.loads(qa_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        fail(f"QA ilegible {qa_path.relative_to(ROOT)}: {error}")

    expected = {
        "class": class_id,
        "sex": sex,
        "action": action,
        "strip_dimensions": list(STRIP_SIZE),
        "cell_dimensions": list(FRAME_SIZE),
        "native_frame_dimensions": list(NATIVE_SIZE),
        "frame_count": 4,
        "distinct_frame_count": 4,
        "source_row_index": row,
        "runtime_integrated": class_id not in STAGING_CLASSES,
    }
    # Master dimensions are checked against the actual master below; all other
    # fields must agree exactly with the class/sex/action contract.
    for key, value in expected.items():
        if report.get(key) != value:
            fail(f"{qa_path.relative_to(ROOT)}: {key}={report.get(key)!r}, esperado {value!r}")

    source_path = ROOT / report.get("source", "")
    if not source_path.is_file():
        fail(f"{qa_path.relative_to(ROOT)}: falta el master referido: {report.get('source')}")
    source_image = rgba(source_path)
    if report.get("master_dimensions") != list(source_image.size):
        fail(f"{qa_path.relative_to(ROOT)}: master_dimensions no coincide con la imagen")
    if report.get("source_sha256") != sha256(source_path):
        fail(f"{qa_path.relative_to(ROOT)}: source_sha256 no coincide con el archivo")
    if source_image.size not in MASTER_SIZES:
        fail(f"{source_path.relative_to(ROOT)}: tamaño de master inesperado {source_image.size}")

    strip = rgba(strip_path)
    if strip.size != STRIP_SIZE:
        fail(f"{strip_path.relative_to(ROOT)}: tamaño {strip.size}, esperado {STRIP_SIZE}")
    if strip.getchannel("A").getextrema() != (0, 255):
        fail(f"{strip_path.relative_to(ROOT)}: falta transparencia alfa real (0-255)")
    if report.get("alpha_extrema") != [0, 255]:
        fail(f"{qa_path.relative_to(ROOT)}: alpha_extrema no registra [0, 255]")
    if report.get("output_sha256") != sha256(strip_path):
        fail(f"{qa_path.relative_to(ROOT)}: output_sha256 no coincide con la tira")

    native_frames = report.get("native_frames")
    if not isinstance(native_frames, list) or len(native_frames) != 4:
        fail(f"{qa_path.relative_to(ROOT)}: deben enumerarse cuatro frames nativos")

    frame_hashes = set()
    for index in range(4):
        frame = strip.crop((
            index * FRAME_SIZE[0],
            0,
            (index + 1) * FRAME_SIZE[0],
            FRAME_SIZE[1],
        ))
        if frame.getchannel("A").getbbox() is None:
            fail(f"{strip_path.relative_to(ROOT)}: fotograma {index + 1} vacío")
        frame_hashes.add(hashlib.sha256(frame.tobytes()).hexdigest())
    if len(frame_hashes) != 4:
        fail(f"{strip_path.relative_to(ROOT)}: fotogramas ampliados duplicados")

    if report.get("feet_baseline_drift_px", 999) > (4 if action == "walk" else 2):
        fail(f"{qa_path.relative_to(ROOT)}: deriva de pies excedida")

    for index, record in enumerate(native_frames):
        native_path = ROOT / record.get("path", "")
        native = rgba(native_path)
        if native.size != NATIVE_SIZE or record.get("dimensions") != list(NATIVE_SIZE):
            fail(f"{qa_path.relative_to(ROOT)}: frame nativo {index + 1} no mide 32x64")
        if hashlib.sha256(native.tobytes()).hexdigest() != record.get("rgba_sha256"):
            fail(f"{qa_path.relative_to(ROOT)}: hash RGBA incorrecto en frame nativo {index + 1}")
        expected_native = strip.crop((
            index * FRAME_SIZE[0],
            0,
            (index + 1) * FRAME_SIZE[0],
            FRAME_SIZE[1],
        )).resize(NATIVE_SIZE, Image.Resampling.NEAREST)
        if native.tobytes() != expected_native.tobytes():
            fail(f"{qa_path.relative_to(ROOT)}: frame nativo {index + 1} no corresponde a la tira")
    preview = ROOT / report.get("preview", "")
    if not preview.is_file():
        fail(f"{qa_path.relative_to(ROOT)}: falta preview {report.get('preview')}")

    return 1


def check_rework_staging(class_id: str, sex: str, action: str) -> int:
    """Validate the isolated AI-art rework strip against its native PNG source."""
    sex_root = (
        ROOT / "assets" / "spritesheets" / "originales" / class_id / "v2"
        / "rework-staging" / sex
    )
    qa_path = sex_root / f"{action}-right-4f.qa.json"
    if not qa_path.is_file():
        fail(f"falta QA de staging {qa_path.relative_to(ROOT)}")
    try:
        report = json.loads(qa_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        fail(f"QA de staging ilegible {qa_path.relative_to(ROOT)}: {error}")

    if (report.get("classId"), report.get("sex"), report.get("action")) != (class_id, sex, action):
        fail(f"{qa_path.relative_to(ROOT)}: classId/sex/action no coincide con la ruta")
    if report.get("direction") != "right":
        fail(f"{qa_path.relative_to(ROOT)}: la animación debe mirar a la derecha")
    checks = report.get("checks", {})
    if checks.get("runtimeApproved") is not True:
        fail(f"{qa_path.relative_to(ROOT)}: fuente staging seleccionada para runtime debe marcar runtimeApproved=true")

    expanded_meta = report.get("expandedSheet", {})
    expanded_path = sex_root / expanded_meta.get("path", f"{action}-right-4f.png")
    expanded = rgba(expanded_path)
    if expanded.size != STRIP_SIZE:
        fail(f"{expanded_path.relative_to(ROOT)}: tamaño {expanded.size}, esperado {STRIP_SIZE}")
    if expanded.getchannel("A").getextrema() != (0, 255):
        fail(f"{expanded_path.relative_to(ROOT)}: falta transparencia alfa efectiva")
    if expanded_meta.get("width") != STRIP_SIZE[0] or expanded_meta.get("height") != STRIP_SIZE[1]:
        fail(f"{qa_path.relative_to(ROOT)}: los metadatos de la tira ampliada no coinciden")

    native_meta = report.get("nativeFrames", {})
    native_width = native_meta.get("width")
    native_height = native_meta.get("height")
    native_rel = native_meta.get("path")
    if not native_rel or native_meta.get("count") != 4:
        fail(f"{qa_path.relative_to(ROOT)}: no hay referencia a cuatro frames nativos")

    native_images = []
    if (native_width, native_height) == (128, 64):
        native_path = sex_root / native_rel
        native_strip = rgba(native_path)
        if native_strip.size != (128, 64):
            fail(f"{native_path.relative_to(ROOT)}: la tira nativa debe medir 128x64")
        if native_strip.getchannel("A").getextrema() != (0, 255):
            fail(f"{native_path.relative_to(ROOT)}: falta transparencia en la tira nativa")
        native_images = [
            native_strip.crop((i * 32, 0, (i + 1) * 32, 64))
            for i in range(4)
        ]
    elif (native_width, native_height) == NATIVE_SIZE:
        native_dir = sex_root / native_rel
        for index in range(1, 5):
            filename = f"{class_id}-{sex}-{action}-{index:02d}.png"
            candidates = (native_dir / filename, native_dir / sex / filename)
            native_path = next((candidate for candidate in candidates if candidate.is_file()), None)
            if native_path is None:
                fail(f"{qa_path.relative_to(ROOT)}: falta frame nativo {filename}")
            native_images.append(rgba(native_path))
    else:
        fail(f"{qa_path.relative_to(ROOT)}: formato de fuente nativa no soportado: {native_width}x{native_height}")

    frame_hashes = set()
    for index, native in enumerate(native_images):
        if native.size != NATIVE_SIZE:
            fail(f"{qa_path.relative_to(ROOT)}: frame nativo {index + 1} no mide 32x64")
        if native.getchannel("A").getbbox() is None:
            fail(f"{qa_path.relative_to(ROOT)}: frame nativo {index + 1} está vacío")
        frame_hashes.add(hashlib.sha256(native.tobytes()).hexdigest())
        expected = native.resize(FRAME_SIZE, Image.Resampling.NEAREST)
        expanded_cell = expanded.crop((
            index * FRAME_SIZE[0], 0,
            (index + 1) * FRAME_SIZE[0], FRAME_SIZE[1],
        ))
        if expected.tobytes() != expanded_cell.tobytes():
            fail(f"{qa_path.relative_to(ROOT)}: la celda ampliada {index + 1} no coincide con su frame nativo")
    if len(frame_hashes) != 4:
        fail(f"{qa_path.relative_to(ROOT)}: los cuatro frames nativos deben ser distintos")

    for key in (
        "expandedDimensions", "nativeDimensions", "expandedMatchesNativeFrames",
        "transparentIndexPresent", "allFramesNonEmpty", "allFrameCellsNonEmpty",
        "everyCellHasVisiblePixels", "fourCells", "fourUniqueFrames",
        "expandedModeRGBA", "perPixelAlphaPresent",
    ):
        if key in checks and checks[key] is not True:
            fail(f"{qa_path.relative_to(ROOT)}: check técnico {key} no está aprobado")

    return 1


def main() -> None:
    actions_checked = 0
    for class_id in CLASSES:
        for sex in SEXES:
            check_master(class_id, sex)
            for row, action in enumerate(ACTIONS):
                actions_checked += check_action(class_id, sex, action, row)

    expected_actions = len(CLASSES) * len(SEXES) * len(ACTIONS)
    native_frames = expected_actions * 4
    if actions_checked != expected_actions:
        fail(f"se validaron {actions_checked} acciones, se esperaban {expected_actions}")

    rework_actions_checked = 0
    for class_id in ("elementalista", "brujo", "cazador", "explorador"):
        for sex in SEXES:
            for action in ACTIONS:
                rework_actions_checked += check_rework_staging(class_id, sex, action)
    if rework_actions_checked != 24:
        fail(f"se validaron {rework_actions_checked} acciones en rework-staging, se esperaban 24")

    print(
        "OK: "
        f"{actions_checked} tiras Tier 2, {native_frames} frames nativos y "
        f"{len(CLASSES) * len(SEXES)} másteres canónicos auditados; "
        f"{rework_actions_checked} tiras de rework-staging verificadas. "
        "Las 24 tiras staging seleccionadas están marcadas runtimeApproved=true."
    )


if __name__ == "__main__":
    main()
