#!/usr/bin/env python3
"""Fast smoke-test for scripts/normalizar-tira-sprites.py."""
from __future__ import annotations

import importlib.util
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/normalizar-tira-sprites.py"
spec = importlib.util.spec_from_file_location("normalizar_tira_sprites", SCRIPT)
if spec is None or spec.loader is None:
    raise RuntimeError(f"Could not import {SCRIPT}")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def make_synthetic_source(path: Path) -> None:
    frame_w, frame_h = 128, 256
    strip = Image.new("RGBA", (frame_w * 4, frame_h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(strip)
    skin = (232, 165, 126, 255)
    tunic = (119, 73, 46, 255)
    boots = (79, 49, 36, 255)
    hair = (112, 57, 34, 255)
    for i in range(4):
        left = i * frame_w
        cx = left + 64
        # Deliberately vary the upper body and legs while keeping the same underlying scale.
        head_x = cx + (i - 1) * 3
        draw.ellipse((head_x - 14, 18 + i * 2, head_x + 14, 48 + i * 2), fill=hair)
        draw.ellipse((head_x - 11, 27 + i * 2, head_x + 11, 47 + i * 2), fill=skin)
        draw.rectangle((cx - 18, 54, cx + 18, 117 + i * 3), fill=tunic)
        draw.rectangle((cx - 27, 64 + i, cx - 15, 104), fill=skin)
        draw.rectangle((cx + 15, 62, cx + 28, 94 + i), fill=skin)
        draw.polygon([(cx - 13, 114), (cx - 2, 114), (cx - 9, 218 - i * 3), (cx - 22, 218 - i * 3)], fill=tunic)
        draw.polygon([(cx + 3, 114), (cx + 16, 114), (cx + 24, 219), (cx + 11, 219)], fill=tunic)
        draw.rectangle((cx - 25, 219 - i * 2, cx - 6, 244), fill=boots)
        draw.rectangle((cx + 8, 219, cx + 30, 244), fill=boots)
        draw.rectangle((cx - 18, 80, cx + 18, 84), fill=(203, 156, 80, 255))
    strip.save(path, optimize=True)


def main() -> None:
    with tempfile.TemporaryDirectory(prefix="sprite-normalizer-test-") as td:
        root = Path(td)
        source = root / "synthetic-source.png"
        make_synthetic_source(source)
        output = root / "idle"
        report = module.normalize(source, output, "smoke-test", 4, 32)
        with Image.open(output / "smoke-test.png") as strip:
            assert strip.size == (256, 128), strip.size
            strip = strip.convert("RGBA")
            assert strip.getchannel("A").getextrema() == (0, 255)
            cells = [
                strip.crop((i * 64, 0, (i + 1) * 64, 128))
                for i in range(4)
            ]
            bboxes = [cell.getchannel("A").getbbox() for cell in cells]
            assert all(bbox is not None for bbox in bboxes), bboxes
            assert all(bbox[3] == 124 for bbox in bboxes if bbox), bboxes
            assert len({cell.tobytes() for cell in cells}) == 4
        assert report["distinct_frame_count"] == 4
        assert report["scale_mode"] == "computed_from_this_action"

        locked_output = root / "walk"
        locked = module.normalize(
            source, locked_output, "locked-test", 4, 32, report["uniform_scale"]
        )
        assert locked["scale_mode"] == "locked"
        assert locked["uniform_scale"] == report["uniform_scale"]
    print("OK: dimensions, transparency, four distinct frames, baseline and locked scale")


if __name__ == "__main__":
    main()
