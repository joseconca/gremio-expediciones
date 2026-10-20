#!/usr/bin/env python3
"""Genera la fila original Recibir daño del Espadachín masculino desde un fotograma de Caminar masculino validado."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets/spritesheets/originales/espadachin/walk/espadachin-m-walk.png"
OUT = ROOT / "assets/spritesheets/originales/espadachin/hurt"
W, H, FRAMES = 64, 128, 4

# Inverse affine transforms: the head/shoulders drop and lean back progressively;
# the boot baseline stays anchored. This reuses only the same Espadachín character,
# never the Novato body or another class, and does not draw weapons into the body.
MOTION = (
    (0.015, 2, 1),   # frame 1 — first impact / startle
    (0.040, 9, 2),   # frame 2 — backward recoil
    (0.065, 15, 2),  # frame 3 — deepest buckle
    (0.012, 3, 1),   # frame 4 — recovery
)


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def transform_frame(frame: Image.Image, motion: tuple[float, int, int]) -> Image.Image:
    lean, dip, shift_right = motion
    affine = (1.0, -lean, lean * H - shift_right, 0.0, 1.0 + dip / H, -float(dip))
    return frame.transform(
        (W, H), Image.Transform.AFFINE, affine,
        resample=Image.Resampling.NEAREST,
        fillcolor=(0, 0, 0, 0),
    )


def main() -> None:
    if not SOURCE.exists():
        raise FileNotFoundError(f"No se encuentra la tira Caminar masculina: {SOURCE}")
    with Image.open(SOURCE) as source_file:
        source = source_file.convert("RGBA")
    if source.size != (W * FRAMES, H):
        raise ValueError(f"Caminar debe medir 256×128; recibido {source.size}")
    if source.getchannel("A").getextrema()[0] != 0:
        raise ValueError("El Idle de origen no tiene transparencia real")

    frame_dir = OUT / "frames" / "m"
    preview_dir = OUT / "previews"
    frame_dir.mkdir(parents=True, exist_ok=True)
    preview_dir.mkdir(parents=True, exist_ok=True)

    frames: list[Image.Image] = []
    for index, motion in enumerate(MOTION):
        # Use one grounded walk frame for every hurt beat; the pose change comes from the hit/recovery transform, not a continuing walk cycle.\n        original = source.crop((0, 0, W, H))
        result = transform_frame(original, motion)
        result.save(frame_dir / f"espadachin-m-hurt-{index + 1:02d}.png", optimize=True)
        frames.append(result)

    strip = Image.new("RGBA", (W * FRAMES, H), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        strip.alpha_composite(frame, (index * W, 0))
    strip_path = OUT / "espadachin-m-hurt.png"
    strip.save(strip_path, optimize=True)

    frame_reports = []
    for index in range(FRAMES):
        cell = strip.crop((index * W, 0, (index + 1) * W, H))
        bbox = cell.getchannel("A").getbbox()
        if bbox is None:
            raise ValueError(f"Fotograma {index + 1} está vacío")
        frame_reports.append({
            "index": index + 1,
            "bbox": list(bbox),
            "sha256_rgba": sha256_bytes(cell.tobytes()),
        })
    if len({frame["sha256_rgba"] for frame in frame_reports}) != FRAMES:
        raise ValueError("Recibir daño debe tener cuatro fotogramas distintos")
    bottoms = [frame["bbox"][3] for frame in frame_reports]
    if max(bottoms) - min(bottoms) > 3:
        raise ValueError(f"Los pies no quedan alineados: {bottoms}")

    preview = Image.new("RGBA", (W * FRAMES * 4, H * 4), (37, 39, 46, 255))
    draw = ImageDraw.Draw(preview)
    for y in range(0, preview.height, 16):
        for x in range(0, preview.width, 16):
            if ((x // 16) + (y // 16)) % 2:
                draw.rectangle((x, y, x + 15, y + 15), fill=(50, 52, 60, 255))
    preview.alpha_composite(strip.resize((W * FRAMES * 4, H * 4), Image.Resampling.NEAREST))
    draw = ImageDraw.Draw(preview)
    for x in (W * 4, W * 8, W * 12):
        draw.line((x, 0, x, H * 4), fill=(105, 173, 210, 240), width=1)
    preview.save(preview_dir / "espadachin-m-hurt-preview.png", optimize=True)

    report = {
        "action": "hurt",
        "class": "espadachin",
        "sex": "m",
        "source": "assets/spritesheets/originales/espadachin/idle/espadachin-m-idle.png",
        "dimensions": {"strip": [256, 128], "cell": [64, 128], "frames": FRAMES, "rows": 1},
        "mode": "RGBA",
        "alpha_extrema": list(strip.getchannel("A").getextrema()),
        "strip_sha256": sha256_bytes(strip_path.read_bytes()),
        "frames": frame_reports,
        "all_frames_distinct": True,
        "feet_baseline_aligned": True,
        "weapons_in_body": False,
        "status": "source row only; not integrated into runtime atlas",
    }
    (OUT / "qa-report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    (OUT / "README.md").write_text(
        "# Espadachín Tier 1 — Recibir daño (masculino)\n\n"
        "- PNG final: espadachin-m-hurt.png (256 × 128 px).\n"
        "- Cuatro fotogramas horizontales de 64 × 128 px, PNG RGBA con transparencia real.\n"
        "- Diseño, armadura, capa y paleta proceden del primer fotograma de Caminar masculino ya versionado.\n"
        "- Cuatro poses: inicio del impacto, retroceso, contracción máxima y recuperación; pies anclados.\n"
        "- No se incorporan armas al cuerpo: seguirán componiéndose como capas equipables.\n"
        "- qa-report.json registra dimensiones, alfa, hashes y cajas por fotograma.\n"
        "- Recurso original de trabajo; no sustituye aún la fila activa del atlas del juego.\n",
        encoding="utf-8",
    )
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
