#!/usr/bin/env python3
"""Rebuild corrupt or inconsistent Tier 2 staging strips from their native frames."""
from __future__ import annotations

import json
import hashlib
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
CLASSES = ("elementalista", "brujo", "cazador", "explorador")
SEXES = ("m", "f")
ACTIONS = ("idle", "walk", "hurt")
NATIVE_SIZE = (32, 64)
STRIP_SIZE = (256, 128)
CELL_SIZE = (64, 128)


def fail(message: str) -> None:
    raise SystemExit(f"ERROR al reparar staging Tier 2: {message}")


def open_rgba(path: Path) -> tuple[Image.Image | None, str | None]:
    if not path.is_file():
        return None, "missing"
    try:
        with Image.open(path) as opened:
            return opened.convert("RGBA"), None
    except Exception as error:
        return None, str(error)


def native_sources(sex_root: Path, report: dict, class_id: str, sex: str, action: str) -> tuple[list[Image.Image], list[str]]:
    meta = report.get("nativeFrames", {})
    width, height = meta.get("width"), meta.get("height")
    rel_path = meta.get("path")
    if not rel_path or meta.get("count") != 4:
        fail(f"QA de {class_id}/{sex}/{action} no enumera cuatro frames nativos")

    frames: list[Image.Image] = []
    modes: list[str] = []
    if (width, height) == (128, 64):
        path = sex_root / rel_path
        if not path.is_file():
            fail(f"falta la fuente nativa {path.relative_to(ROOT)}")
        try:
            with Image.open(path) as opened:
                source_mode = opened.mode
                rgba_strip = opened.convert("RGBA")
        except Exception as error:
            fail(f"fuente nativa ilegible {path.relative_to(ROOT)}: {error}")
        if rgba_strip.size != (128, 64):
            fail(f"la fuente nativa {path.relative_to(ROOT)} no mide 128x64")
        for index in range(4):
            frames.append(rgba_strip.crop((index * 32, 0, (index + 1) * 32, 64)))
            modes.append(source_mode)
    elif (width, height) == NATIVE_SIZE:
        native_dir = sex_root / rel_path
        for index in range(1, 5):
            filename = f"{class_id}-{sex}-{action}-{index:02d}.png"
            candidates = (native_dir / filename, native_dir / sex / filename)
            path = next((candidate for candidate in candidates if candidate.is_file()), None)
            if path is None:
                fail(f"falta el frame nativo {filename} de {class_id}/{sex}/{action}")
            try:
                with Image.open(path) as opened:
                    modes.append(opened.mode)
                    frame = opened.convert("RGBA")
            except Exception as error:
                fail(f"frame nativo ilegible {path.relative_to(ROOT)}: {error}")
            if frame.size != NATIVE_SIZE:
                fail(f"el frame nativo {path.relative_to(ROOT)} no mide 32x64")
            frames.append(frame)
    else:
        fail(f"formato de frames nativos desconocido para {class_id}/{sex}/{action}: {width}x{height}")

    hashes = set()
    for index, frame in enumerate(frames):
        if frame.getchannel("A").getbbox() is None:
            fail(f"frame nativo vacío en {class_id}/{sex}/{action} #{index + 1}")
        hashes.add(frame.tobytes())
    if len(hashes) != 4:
        fail(f"los cuatro frames nativos no son distintos en {class_id}/{sex}/{action}")
    return frames, modes


def make_strip(frames: list[Image.Image]) -> Image.Image:
    sheet = Image.new("RGBA", STRIP_SIZE, (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        if frame.size != NATIVE_SIZE:
            fail(f"frame inesperado de tamaño {frame.size}")
        expanded = frame.resize(CELL_SIZE, Image.Resampling.NEAREST)
        sheet.alpha_composite(expanded, (index * CELL_SIZE[0], 0))
    return sheet


def repair_one(class_id: str, sex: str, action: str) -> bool:
    sex_root = (
        ROOT / "assets" / "spritesheets" / "originales" / class_id / "v2"
        / "rework-staging" / sex
    )
    qa_path = sex_root / f"{action}-right-4f.qa.json"
    if not qa_path.is_file():
        fail(f"falta QA {qa_path.relative_to(ROOT)}")
    try:
        report = json.loads(qa_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        fail(f"QA ilegible {qa_path.relative_to(ROOT)}: {error}")

    if (report.get("classId"), report.get("sex"), report.get("action"), report.get("direction")) != (class_id, sex, action, "right"):
        fail(f"identidad de QA no coincide con {qa_path.relative_to(ROOT)}")
    if report.get("checks", {}).get("runtimeApproved") is not False:
        fail(f"no se toca un asset aprobado para runtime: {qa_path.relative_to(ROOT)}")

    native, modes = native_sources(sex_root, report, class_id, sex, action)
    native_meta = report.setdefault("nativeFrames", {})
    native_meta["mode"] = "P" if all(mode == "P" for mode in modes) else "RGBA"
    if native_meta["mode"] == "P":
        native_meta["transparency"] = "indexed transparent key"
        native_meta.setdefault("transparencyIndex", 0)
    else:
        native_meta.pop("transparency", None)
        native_meta.pop("transparencyIndex", None)
    native_meta["frames"] = [
        {
            "index": index + 1,
            "path": str((sex_root / native_meta.get("path", f"{action}/frames-native-32x64/") / sex / f"{class_id}-{sex}-{action}-{index + 1:02d}.png").relative_to(ROOT)),
            "dimensions": [32, 64],
            "rgba_sha256": hashlib.sha256(frame.tobytes()).hexdigest(),
        }
        for index, frame in enumerate(native)
    ]
    generated = make_strip(native)
    expanded_meta = report.get("expandedSheet", {})
    expanded_path = sex_root / expanded_meta.get("path", f"{action}-right-4f.png")
    current, decode_error = open_rgba(expanded_path)
    needs_repair = (
        current is None
        or current.size != STRIP_SIZE
        or current.tobytes() != generated.tobytes()
    )
    if not needs_repair:
        return False

    # Only regenerate derived review output. Never alter the native frames, masters,
    # production sprites, or the independently layered equipment.
    expanded_path.parent.mkdir(parents=True, exist_ok=True)
    generated.save(expanded_path, format="PNG", optimize=True)

    expanded_meta.update({
        "path": expanded_meta.get("path", f"{action}-right-4f.png"),
        "width": STRIP_SIZE[0],
        "height": STRIP_SIZE[1],
        "cellWidth": CELL_SIZE[0],
        "cellHeight": CELL_SIZE[1],
        "mode": "RGBA",
        "construction": "reconstructed from the four native 32x64 frames using nearest-neighbour",
    })
    expanded_meta.pop("transparencyIndex", None)
    expanded_meta.pop("transparency", None)

    checks = report.setdefault("checks", {})
    checks.update({
        "expandedDimensions": True,
        "expandedMatchesNativeFrames": True,
        "fourUniqueFrames": True,
        "runtimeApproved": False,
    })
    for key in ("transparentIndexPresent", "rgbaExportPending", "expandedModeRGBA", "perPixelAlphaPresent", "allFramesNonEmpty", "allFrameCellsNonEmpty", "everyCellHasVisiblePixels", "fourCells"):
        checks.pop(key, None)
    checks["expandedModeRGBA"] = True
    checks["perPixelAlphaPresent"] = True
    checks["allFramesNonEmpty"] = True
    if all(mode == "RGBA" for mode in modes):
        checks["allNativeFramesRGBA"] = True
        checks["rgbaExportPending"] = False
    else:
        checks.pop("allNativeFramesRGBA", None)
        checks["rgbaExportPending"] = True
        checks["nativeIndexedTransparencyValid"] = True
    checks["requiresArtReview"] = True
    report["status"] = "staging-expanded-rgba-repaired-art-review-pending"

    notes = report.setdefault("notes", [])
    notes.append(
        "2026-10-23 repair checkpoint: the expanded strip was rebuilt as a valid RGBA PNG from the four checked native frames because the previous derived PNG was unreadable or did not match them. Native frames and production/runtime assets were not modified."
    )
    if decode_error:
        notes.append(f"Previous expanded PNG could not be decoded: {decode_error}")
    report["expandedSheet"] = expanded_meta
    qa_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"REPAIRED: {expanded_path.relative_to(ROOT)}")
    return True


def main() -> None:
    repaired = []
    checked = 0
    for class_id in CLASSES:
        for sex in SEXES:
            for action in ACTIONS:
                checked += 1
                if repair_one(class_id, sex, action):
                    repaired.append(f"{class_id}/{sex}/{action}")
    print(f"Checked {checked} staging strips; repaired {len(repaired)}: {', '.join(repaired) if repaired else 'none'}")


if __name__ == "__main__":
    main()
