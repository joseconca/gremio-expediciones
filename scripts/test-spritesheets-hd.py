#!/usr/bin/env python3
"""Smoke tests for frame-by-frame HD atlas assembly (synthetic test images only)."""
from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
ASSEMBLER = ROOT / "scripts" / "ensamblar-spritesheet-hd.py"
ACTIONS = (
    "idle", "walk", "hurt", "use_consumable", "dodge", "block_shield",
    "attack_sword", "attack_axe", "attack_spear", "attack_dagger",
    "attack_bow", "attack_staff", "attack_mace", "attack_book", "attack_gloves",
)
CELL_W, CELL_H = 128, 256


def create_synthetic_frames(root: Path, class_id: str, sex: str, omit_last: bool = False) -> Path:
    variant = root / class_id / sex
    for row, action in enumerate(ACTIONS[:-1] if omit_last else ACTIONS):
        action_dir = variant / "frames" / action
        action_dir.mkdir(parents=True)
        for col in range(4):
            frame = Image.new("RGBA", (CELL_W, CELL_H), (0, 0, 0, 0))
            draw = ImageDraw.Draw(frame)
            left = 10 + col * 5
            top = 12 + row % 5 + col
            right = 112 - col * 3
            bottom = 244 - row % 7 - col
            color = (
                (row * 13 + col * 23 + 31) % 255,
                (row * 29 + col * 41 + 47) % 255,
                (row * 37 + col * 17 + 59) % 255,
                255,
            )
            draw.rectangle((left, top, right, bottom), fill=color)
            draw.rectangle(
                (left + 4, top + 4, min(left + 8 + col, right - 2),
                 min(top + 16 + row, bottom - 2)),
                fill=(255 - color[0], 255 - color[1], 255 - color[2], 255),
            )
            output_path = action_dir / f"{class_id}-{sex}-{action}-{col + 1:02d}.png"
            if row == 0 and col == 0:
                # Verify that indexed PNG + tRNS input is accepted as true transparency.
                alpha = list(frame.getchannel("A").getdata())
                quantized = frame.convert("RGB").quantize(
                    colors=255, method=Image.Quantize.FASTOCTREE,
                    dither=Image.Dither.NONE,
                )
                indices = [0 if a == 0 else int(pixel) + 1
                           for pixel, a in zip(quantized.getdata(), alpha)]
                indexed = Image.new("P", (CELL_W, CELL_H))
                indexed.putdata(indices)
                palette = [0, 0, 0] + (quantized.getpalette() or [0] * 768)[:765]
                palette += [0] * (768 - len(palette))
                indexed.putpalette(palette[:768])
                indexed.save(output_path, format="PNG", optimize=True, transparency=0)
            else:
                frame.save(output_path, format="PNG")
    return variant


class HdSpriteSheetTests(unittest.TestCase):
    def test_assembler_builds_valid_complete_sheet_and_report_from_60_files(self) -> None:
        with tempfile.TemporaryDirectory(prefix="sprite-hd-ok-") as temp:
            root = Path(temp)
            variant = create_synthetic_frames(root, "test-hero", "m")
            completed = subprocess.run(
                [
                    sys.executable, str(ASSEMBLER),
                    "--root", str(root),
                    "--class-id", "test-hero",
                    "--sex", "m",
                ],
                cwd=ROOT, capture_output=True, text=True, check=False,
            )
            self.assertEqual(completed.returncode, 0, completed.stderr or completed.stdout)

            sheet_path = variant / "test-hero-m-sheet.png"
            report_path = variant / "qa-report.json"
            self.assertTrue(sheet_path.is_file())
            self.assertTrue(report_path.is_file())
            with Image.open(sheet_path) as sheet:
                self.assertEqual(sheet.size, (512, 3840))
                self.assertEqual(sheet.mode, "RGBA")
                self.assertEqual(sheet.getchannel("A").getextrema(), (0, 255))

            report = json.loads(report_path.read_text(encoding="utf-8"))
            self.assertEqual(report["status"], "passed")
            self.assertEqual(report["framesValidated"], 60)
            self.assertEqual(len(report["rows"]), 15)
            self.assertEqual(sum(len(row["frames"]) for row in report["rows"]), 60)
            self.assertFalse(report["runtimeModified"])

    def test_missing_individual_frame_fails_before_creating_sheet(self) -> None:
        with tempfile.TemporaryDirectory(prefix="sprite-hd-missing-") as temp:
            root = Path(temp)
            variant = create_synthetic_frames(root, "test-hero", "f", omit_last=True)
            completed = subprocess.run(
                [
                    sys.executable, str(ASSEMBLER),
                    "--root", str(root),
                    "--class-id", "test-hero",
                    "--sex", "f",
                ],
                cwd=ROOT, capture_output=True, text=True, check=False,
            )
            self.assertNotEqual(completed.returncode, 0)
            self.assertIn("attack_gloves", completed.stderr)
            self.assertFalse((variant / "test-hero-f-sheet.png").exists())


if __name__ == "__main__":
    unittest.main(verbosity=2)
