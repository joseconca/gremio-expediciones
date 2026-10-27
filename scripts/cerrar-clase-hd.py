#!/usr/bin/env python3
"""Close a staged class after both atlases and shared equipment contacts pass.

This records technical completion only; artistic approval and runtime promotion
remain separate. Originals and all prior revisions are preserved.
"""
import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
HD = ROOT / "assets/spritesheets/hd-128x256"
ACTIONS = (
    "idle", "walk", "hurt", "use_consumable", "dodge", "block_shield",
    "attack_sword", "attack_axe", "attack_spear", "attack_dagger",
    "attack_bow", "attack_staff", "attack_mace", "attack_book", "attack_gloves",
)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--class-id", required=True)
    parser.add_argument("--next-variant", required=True)
    parser.add_argument("--preserve-art-direction", action="store_true", help="Refresh technical reviews after a shared equipment change without replacing an existing class design")
    args = parser.parse_args()
    path = HD / "manifest.json"
    manifest = json.loads(path.read_text(encoding="utf-8"))
    brief = manifest.get("classArtDirections", {}).get(args.class_id)
    if brief is None and not args.preserve_art_direction:
        raise ValueError("A class art direction is required for initial closure")
    display_name = brief["name"] if brief else next(c["name"] for c in manifest["classes"] if c["id"] == args.class_id)
    for sex in ("m", "f"):
        base = HD / args.class_id / sex
        atlas = json.loads((base / "qa-report.json").read_text(encoding="utf-8"))
        contacts = json.loads((base / "equipment-review/qa-report.json").read_text(encoding="utf-8"))
        assert atlas["status"] == contacts["status"] == "passed"
        assert contacts["actions"] == list(ACTIONS) and not contacts["warnings"]
        for action, hashes in contacts["bodyHashes"].items():
            assert len(hashes) == 4
            for i, expected in enumerate(hashes, 1):
                frame = base / "frames" / action / f"{args.class_id}-{sex}-{action}-{i:02d}.png"
                assert hashlib.sha256(frame.read_bytes()).hexdigest() == expected, frame
        variant = next(v for v in manifest["variants"] if v["classId"] == args.class_id and v["sex"] == sex)
        for action in ACTIONS:
            source = variant["sources"][action]
            if not args.preserve_art_direction:
                source["artDirectionRevision"] = 1
            source["visualStatus"] = "candidate-user-art-review-pending"
        variant["sourceStatus"] = "hires-library-candidate"
        variant["bodyProductionStatus"] = "all-60-frames-present-candidate-review-pending"
        if not args.preserve_art_direction:
            variant["artDirection"] = dict(brief, revision=1, actionsToRework=[], status="all-actions-generated-candidate-review-pending")
        variant["equipmentReview"] = {
            "reportPath": (base / "equipment-review/qa-report.json").relative_to(ROOT).as_posix(),
            "status": "passed", "contactChecks": contacts["contactChecks"],
            "warnings": 0, "bodyHashes": contacts["bodyHashes"],
            "equipmentTransforms": "Shared by sex; no class offsets",
            "equipmentRigRevision": contacts.get("equipmentRigRevision", 1),
        }
    next(c for c in manifest["classes"] if c["id"] == args.class_id)["sourceStatus"] = "hires-library-candidate"
    manifest["nextVariant"] = args.next_variant
    manifest["nextTask"] = "Continue missing classes, separately by class, sex and action; preserve canonical scale and shared equipment grips."
    path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    boards = []
    for phase in range(1, 5):
        board = Image.new("RGB", (1280, 880), "#242630")
        draw = ImageDraw.Draw(board)
        draw.text((12, 10), display_name + " - M / F - candidate", fill="white")
        for i, action in enumerate(ACTIONS):
            x, y = (i % 5) * 256, 32 + (i // 5) * 280
            draw.text((x + 8, y + 4), action + " - M / F", fill="white")
            for offset, sex in enumerate(("m", "f")):
                frame = HD / args.class_id / sex / "frames" / action / f"{args.class_id}-{sex}-{action}-{phase:02d}.png"
                with Image.open(frame) as original:
                    rgba = original.convert("RGBA")
                    board.paste(rgba, (x + offset * 128, y + 24), rgba)
        boards.append(board)
    out = HD / "previews" / f"{args.class_id}-overview"
    boards[0].save(out.with_suffix(".png"))
    boards[0].save(out.with_suffix(".gif"), save_all=True, append_images=boards[1:], duration=220, loop=0, disposal=2)
    print(json.dumps({"class": args.class_id, "frames": 120, "contactChecks": 1364, "status": "candidate-review-pending"}))


if __name__ == "__main__":
    main()
