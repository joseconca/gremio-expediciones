#!/usr/bin/env python3
"""Smoke tests for the isolated HD sheet assembler and validator.

Uses only synthetic geometry. It does not create or replace game art.
"""
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


def create_synthetic_strips(root: Path, class_id: str, sex: str, omit_last: bool = False) -> Path:
    action_dir = root / class_id / sex / "actions"
    action_dir.mkdir(parents=True)
    for row, action in enumerate(ACTIONS[:-1] if omit_last else ACTIONS):
        strip = Image.new("RGBA", (CELL_W * 4, CELL_H), (0, 0, 0, 0))
        draw = ImageDraw.Draw(strip)
        for col in range(4):
            x0 = col * CELL_W + 12 + col
            y0 = 12 + row % 5 + col
            x1 = (col + 1) * CELL_W - 12 - col
            y1 = CELL_H - 12 - row % 7 - col
            color = (
                (row * 13 + col * 23 + 31) % 255,
                (row * 29 + col * 41 + 47) % 255,
                (row * 37 + col * 17 + 59) % 255,
                255,
            )
            draw.rectangle((x0, y0, x1, y1), fill=color)
            # Give each synthetic frame extra unique internal geometry.
            draw.rectangle(
                (x0 + 4, y0 + 4, min(x0 + 8 + col, x1 - 2), min(y0 + 16 + row, y1 - 2)),
                fill=(255 - color[0], 255 - color[1], 255 - color[2], 255),
            )
        strip.save(action_dir / f"{action}.png", format="PNG", optimize=True)
    return action_dir.parent


class HdSpriteSheetTests(unittest.TestCase):
    def test_assembler_builds_valid_complete_sheet_and_report(self) -> None:
        with tempfile.TemporaryDirectory(prefix="sprite-hd-ok-") as temp:
            root = Path(temp)
            create_synthetic_strips(root, "test-hero", "m")
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

            variant = root / "test-hero" / "m"
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
            self.assertEqual(report["image"]["visibleCells"], 60)
            self.assertEqual(len(report["rows"]), 15)
            self.assertEqual(len(report["sourceStrips"]), 15)
            self.assertFalse(report["runtimeModified"])

    def test_missing_action_fails_before_creating_sheet(self) -> None:
        with tempfile.TemporaryDirectory(prefix="sprite-hd-missing-") as temp:
            root = Path(temp)
            variant = create_synthetic_strips(root, "test-hero", "f", omit_last=True)
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
