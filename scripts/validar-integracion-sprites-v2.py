#!/usr/bin/env python3
"""Validate that production atlases and static avatars use canonical v2 art."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
CLASSES = ("novato", "espadachin", "acolito", "arquero", "mago")
SEXES = ("m", "f")
ACTIONS = ("idle", "walk", "hurt")
CELL = (64, 128)
STRIP = (256, 128)
ATLAS = (256, 1920)


def load_rgba(path: Path) -> Image.Image:
    if not path.is_file():
        raise FileNotFoundError(f"Missing integration asset: {path}")
    with Image.open(path) as image:
        return image.convert("RGBA")


def main() -> None:
    checked = 0
    for class_id in CLASSES:
        for sex in SEXES:
            base = ROOT / "assets" / "spritesheets" / "originales" / class_id / "v2"
            runtime_dir = ROOT / "public" / "sprites" / "heroes" / class_id
            sheet = load_rgba(runtime_dir / f"{class_id}-{sex}-sheet.png")
            avatar = load_rgba(runtime_dir / f"{class_id}-{sex}.png")
            if sheet.size != ATLAS:
                raise ValueError(f"{runtime_dir}: expected atlas {ATLAS}, got {sheet.size}")
            if sheet.getchannel("A").getextrema()[0] != 0:
                raise ValueError(f"{runtime_dir}: atlas must retain transparent background")

            for row, action in enumerate(ACTIONS):
                strip_path = base / action / f"{class_id}-{sex}-{action}.png"
                strip = load_rgba(strip_path)
                if strip.size != STRIP:
                    raise ValueError(f"{strip_path}: expected strip {STRIP}, got {strip.size}")
                if strip.getchannel("A").getextrema() != (0, 255):
                    raise ValueError(f"{strip_path}: expected real alpha transparency")
                frames = [
                    strip.crop((index * CELL[0], 0, (index + 1) * CELL[0], CELL[1]))
                    for index in range(4)
                ]
                if any(frame.getchannel("A").getbbox() is None for frame in frames):
                    raise ValueError(f"{strip_path}: empty frame detected")
                if len({frame.tobytes() for frame in frames}) != 4:
                    raise ValueError(f"{strip_path}: frames must be distinct")

                final_row = sheet.crop((0, row * CELL[1], STRIP[0], (row + 1) * CELL[1]))
                if final_row.tobytes() != strip.tobytes():
                    raise ValueError(f"{runtime_dir}: production row {action} differs from canonical v2")
                if action == "idle" and avatar.tobytes() != frames[0].tobytes():
                    raise ValueError(f"{runtime_dir}: static avatar must match first v2 Idle frame")
                checked += 1

    print(f"OK: {checked} canonical v2 strips integrated into 10 production atlases and static portraits.")


if __name__ == "__main__":
    main()
