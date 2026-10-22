#!/usr/bin/env python3
"""Rasterize editable SVG Tier 2 master sheets into transparent PNGs."""
from __future__ import annotations

import io
from pathlib import Path
import cairosvg
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
CLASSES = ("caballero", "duelista", "sacerdote", "monje", "cazador", "explorador", "elementalista", "brujo")
SEXES = ("m", "f")
EXPECTED = (128, 192)


def main() -> None:
    made = 0
    for class_id in CLASSES:
        for sex in SEXES:
            source = ROOT / "assets" / "spritesheets" / "originales" / class_id / "v2" / "source" / f"{class_id}-{sex}-core-3rows.svg"
            if not source.is_file():
                continue
            rendered = cairosvg.svg2png(url=str(source), output_width=EXPECTED[0], output_height=EXPECTED[1])
            with Image.open(io.BytesIO(rendered)) as opened:
                master = opened.convert("RGBA")
            if master.size != EXPECTED or master.getchannel("A").getextrema() != (0, 255):
                raise ValueError(f"{source}: invalid dimensions or alpha channel")
            for row, action in enumerate(("idle", "walk", "hurt")):
                hashes = []
                for col in range(4):
                    frame = master.crop((col * 32, row * 64, (col + 1) * 32, (row + 1) * 64))
                    if frame.getchannel("A").getbbox() is None:
                        raise ValueError(f"{source}: empty {action} frame {col + 1}")
                    hashes.append(frame.tobytes())
                if len(set(hashes)) != 4:
                    raise ValueError(f"{source}: {action} must have four distinct frames")
            target = source.with_suffix(".png")
            master.save(target, optimize=True, compress_level=9)
            print(f"Rasterized {source.relative_to(ROOT)} -> {target.relative_to(ROOT)}")
            made += 1
    print(f"Rasterized {made} editable Tier 2 SVG masters.")


if __name__ == "__main__":
    main()
