#!/usr/bin/env python3
"""Recover 3-row Acolito v2 masters from the checked-in production sheets.

This is a lossless crop of the existing 64x128 frames (not a runtime edit and
not a redraw). The resulting masters remain pending visual approval.
"""
from __future__ import annotations

import hashlib
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public" / "sprites" / "heroes" / "acolito"
DEST = ROOT / "assets" / "spritesheets" / "originales" / "acolito" / "v2" / "source"
SEXES = ("f", "m")
SHEET_SIZE = (256, 1920)
MASTER_SIZE = (256, 384)
CELL_SIZE = (64, 128)
ROWS = ("idle", "walk", "hurt")


def rgba_hash(image: Image.Image) -> str:
    return hashlib.sha256(image.convert("RGBA").tobytes()).hexdigest()


def recover(sex: str) -> Path:
    source = SOURCE / f"acolito-{sex}-sheet.png"
    if not source.is_file():
        raise FileNotFoundError(f"Missing checked-in Acolito sprite sheet: {source}")

    with Image.open(source) as opened:
        sheet = opened.convert("RGBA")
    if sheet.size != SHEET_SIZE:
        raise ValueError(f"Expected {SHEET_SIZE} for {source}, got {sheet.size}")
    if sheet.getchannel("A").getextrema() != (0, 255):
        raise ValueError(f"Expected transparent RGBA production sheet: {source}")

    master = sheet.crop((0, 0, *MASTER_SIZE))
    for row, action in enumerate(ROWS):
        hashes = []
        for column in range(4):
            x = column * CELL_SIZE[0]
            y = row * CELL_SIZE[1]
            frame = master.crop((x, y, x + CELL_SIZE[0], y + CELL_SIZE[1]))
            if frame.getchannel("A").getbbox() is None:
                raise ValueError(f"Empty frame in {source}: {action} #{column + 1}")
            hashes.append(rgba_hash(frame))
        if len(set(hashes)) != 4:
            raise ValueError(f"Four distinct {action} frames required in {source}")

    DEST.mkdir(parents=True, exist_ok=True)
    destination = DEST / f"acolito-{sex}-core-3rows.webp"
    master.save(destination, "WEBP", lossless=True, method=6, exact=True)
    with Image.open(destination) as check:
        if check.size != MASTER_SIZE or check.convert("RGBA").getchannel("A").getextrema() != (0, 255):
            raise ValueError(f"Recovered master failed round-trip validation: {destination}")
        if rgba_hash(check) != rgba_hash(master):
            raise ValueError(f"Recovered master is not lossless: {destination}")
    print(f"Recovered {destination.relative_to(ROOT)} from {source.relative_to(ROOT)}")
    return destination


if __name__ == "__main__":
    for sex in SEXES:
        recover(sex)
