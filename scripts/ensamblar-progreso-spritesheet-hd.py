#!/usr/bin/env python3
"""Build a NON-RUNTIME progress preview from fully available HD sprite rows.

The canonical runtime atlas is assembled separately only after all 60 frames
pass QA. This preview preserves the final 512x3840 grid, uses a transparent
row for every action without all four frames, and never edits runtime assets.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "assets/spritesheets/hd-128x256/novato/m"
FRAMES = BASE / "frames"
PREVIEWS = BASE / "previews"
ACTIONS = [
    "idle", "walk", "hurt", "use_consumable", "dodge", "block_shield",
    "attack_sword", "attack_axe", "attack_spear", "attack_dagger",
    "attack_bow", "attack_staff", "attack_mace", "attack_book",
    "attack_gloves",
]
CELL = (128, 256)
SHEET = (512, 3840)


def main() -> int:
    sheet = Image.new("RGBA", SHEET, (0, 0, 0, 0))
    completed: list[str] = []
    missing: list[str] = []
    checks: list[dict[str, object]] = []

    for row, action in enumerate(ACTIONS):
        paths = [
            FRAMES / action / f"novato-m-{action}-{frame:02d}.png"
            for frame in range(1, 5)
        ]
        if not all(p.is_file() for p in paths):
            missing.append(action)
            continue

        cells: list[Image.Image] = []
        ok = True
        for p in paths:
            try:
                im = Image.open(p).convert("RGBA")
                if im.size != CELL:
                    ok = False
                    checks.append({"action": action, "path": str(p.relative_to(ROOT)),
                                   "status": "invalid-dimensions", "actual": list(im.size)})
                    break
                if im.getchannel("A").getextrema()[0] != 0:
                    ok = False
                    checks.append({"action": action, "path": str(p.relative_to(ROOT)),
                                   "status": "missing-real-transparency"})
                    break
                if im.getchannel("A").getbbox() is None:
                    ok = False
                    checks.append({"action": action, "path": str(p.relative_to(ROOT)),
                                   "status": "empty-frame"})
                    break
                cells.append(im)
            except Exception as exc:  # emit a useful report instead of a broken atlas
                ok = False
                checks.append({"action": action, "path": str(p.relative_to(ROOT)),
                               "status": "read-error", "error": str(exc)})
                break

        if not ok or len(cells) != 4:
            missing.append(action)
            continue

        for col, im in enumerate(cells):
            sheet.alpha_composite(im, (col * CELL[0], row * CELL[1]))
        completed.append(action)
        checks.append({"action": action, "status": "preview-row-included",
                       "frames": [str(p.relative_to(ROOT)) for p in paths]})

    PREVIEWS.mkdir(parents=True, exist_ok=True)
    out = PREVIEWS / "novato-m-sheet-progress.png"
    sheet.save(out, format="PNG", optimize=True)
    report = {
        "schemaVersion": 1,
        "purpose": "development-progress-preview-not-runtime",
        "classId": "novato",
        "sex": "m",
        "dimensions": list(SHEET),
        "cellDimensions": list(CELL),
        "rows": len(ACTIONS),
        "framesPerAction": 4,
        "completedActions": completed,
        "completedActionCount": len(completed),
        "pendingActions": missing,
        "pendingActionCount": len(missing),
        "runtimePromotion": "prohibited-until-all-15-rows-reviewed-and-canonical-QA-passes",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "checks": checks,
        "note": "Rows without four validated individual frames remain fully transparent. This preview is not the canonical runtime sheet.",
    }
    (PREVIEWS / "novato-m-sheet-progress.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps({"sheet": str(out.relative_to(ROOT)),
                      "completedActions": completed, "pendingActions": missing},
                     ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
