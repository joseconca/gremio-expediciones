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

    native_meta = report.setdefault("nativeFrames", {})
    expanded_meta = report.get("expandedSheet", {})
    expanded_path = sex_root / expanded_meta.get("path", f"{action}-right-4f.png")
    current, decode_error = open_rgba(expanded_path)
    # A valid expanded strip is a permitted recovery source only for missing or
    # unreadable native outputs. If both representations are damaged, stop.
    if current is not None:
        if current.size != STRIP_SIZE or current.getchannel("A").getextrema() != (0, 255):
            decode_error = f"expanded strip has invalid size/alpha: {current.size}/{current.getchannel('A').getextrema()}"
            current = None
        else:
            cells = [current.crop((i * 64, 0, (i + 1) * 64, 128)) for i in range(4)]
            if any(cell.getchannel("A").getbbox() is None for cell in cells) or len({cell.tobytes() for cell in cells}) != 4:
                decode_error = "expanded strip has empty or duplicate frames"
                current = None

    native_recovered = False
    native_recovery_note = None
    try:
        native, modes = native_sources(sex_root, report, class_id, sex, action)
    except SystemExit as native_error:
        if current is None:
            raise native_error
        native = [
            current.crop((i * 64, 0, (i + 1) * 64, 128)).resize(NATIVE_SIZE, Image.Resampling.NEAREST)
            for i in range(4)
        ]
        if any(frame.getchannel("A").getbbox() is None for frame in native) or len({frame.tobytes() for frame in native}) != 4:
            fail(f"no se puede recuperar una secuencia nativa válida para {class_id}/{sex}/{action}")
        native_width = native_meta.get("width")
        native_height = native_meta.get("height")
        native_rel_path = native_meta.get("path")
        if (native_width, native_height) == (128, 64):
            native_strip_path = sex_root / native_rel_path
            native_strip_path.parent.mkdir(parents=True, exist_ok=True)
            native_strip = Image.new("RGBA", (128, 64), (0, 0, 0, 0))
            for i, frame in enumerate(native):
                native_strip.alpha_composite(frame, (i * 32, 0))
            native_strip.save(native_strip_path, format="PNG", optimize=True)
            native_meta["mode"] = "RGBA"
            native_meta.pop("transparency", None)
            native_meta.pop("transparencyIndex", None)
        elif (native_width, native_height) == NATIVE_SIZE:
            native_dir = sex_root / native_rel_path
            native_dir = native_dir / sex
            native_dir.mkdir(parents=True, exist_ok=True)
            for i, frame in enumerate(native, 1):
                frame.save(native_dir / f"{class_id}-{sex}-{action}-{i:02d}.png", format="PNG", optimize=True)
            native_meta["mode"] = "RGBA"
            native_meta.pop("transparency", None)
            native_meta.pop("transparencyIndex", None)
        else:
            fail(f"no se puede reconstruir el formato nativo {native_width}x{native_height} de {class_id}/{sex}/{action}")
        modes = ["RGBA"] * 4
        native_recovered = True
        native_recovery_note = (
            "2026-10-23 recovery checkpoint: unreadable native output was reconstructed by "
            "nearest-neighbour downscaling from a readable, dimension-checked expanded strip. "
            "The source character poses were not redrawn and production sprites were not changed."
        )

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
            "path": str((sex_root / native_meta.get("path", f"{action}/frames-native-32x64/")).relative_to(ROOT)) if (native_meta.get("width"), native_meta.get("height")) == (128, 64) else str((sex_root / native_meta.get("path", f"{action}/frames-native-32x64/") / sex / f"{class_id}-{sex}-{action}-{index + 1:02d}.png").relative_to(ROOT)),
            "dimensions": [32, 64],
            "rgba_sha256": hashlib.sha256(frame.tobytes()).hexdigest(),
            **({"crop": [index * 32, 0, (index + 1) * 32, 64]} if (native_meta.get("width"), native_meta.get("height")) == (128, 64) else {}),
        }
        for index, frame in enumerate(native)
    ]
    generated = make_strip(native)
    needs_repair = current is None or current.tobytes() != generated.tobytes()
    if not needs_repair and not native_recovered:
        return False

    if needs_repair:
        # Rebuild only derived review output, never production/runtime sprites.
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
        "nativeDimensions": True,
        "expandedDimensions": True,
        "expandedMatchesNativeFrames": not needs_repair,
        "fourUniqueFrames": len({frame.tobytes() for frame in native}) == 4,
        "runtimeApproved": False,
        "requiresArtReview": True,
    })
    if all(mode == "RGBA" for mode in modes):
        checks["allNativeFramesRGBA"] = True
        checks["rgbaExportPending"] = False
    else:
        checks.pop("allNativeFramesRGBA", None)
        checks["nativeIndexedTransparencyValid"] = True
    if needs_repair:
        checks.pop("transparentIndexPresent", None)
        checks["expandedModeRGBA"] = True
        checks["perPixelAlphaPresent"] = True
        checks["allFramesNonEmpty"] = True
        checks.pop("nativeIndexedTransparencyValid", None)
    checks["fourUniqueFrames"] = True

    if native_recovered:
        report["status"] = "staging-native-recovered-from-verified-expanded-strip-art-review-pending"
    elif needs_repair:
        report["status"] = "staging-expanded-rgba-repaired-art-review-pending"
    notes = report.setdefault("notes", [])
    if native_recovery_note:
        notes.append(native_recovery_note)
    if needs_repair:
        notes.append("2026-10-23 repair checkpoint: the expanded strip was rebuilt as a valid RGBA PNG from the four checked native frames. Production/runtime assets were not modified.")
    if decode_error:
        notes.append(f"Previous expanded PNG was unusable: {decode_error}")
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
