#!/usr/bin/env python3
"""Audit real HD files; --write updates the sole progress manifest.

Default checks that recorded progress matches disk. --strict also rejects known
invalid PNGs. Missing actions are work in progress, never approved artwork.
"""
from __future__ import annotations
import argparse
import hashlib
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
HD_ROOT = ROOT / 'assets/spritesheets/hd-128x256'
ACTIONS = ('idle','walk','hurt','use_consumable','dodge','block_shield',
           'attack_sword','attack_axe','attack_spear','attack_dagger','attack_bow',
           'attack_staff','attack_mace','attack_book','attack_gloves')


def inspect_frame(path: Path) -> dict:
    if not path.is_file():
        return {'status': 'missing'}
    raw = path.read_bytes()
    result = {'sha256': hashlib.sha256(raw).hexdigest(), 'bytes': len(raw)}
    try:
        with Image.open(path) as im:
            if im.format != 'PNG':
                raise ValueError('not-png')
            im.verify()  # CRC, including ancillary PNG chunks.
        with Image.open(path) as im:
            im.load()  # Decompress every pixel; a valid header is not enough.
            rgba = im.convert('RGBA')
        if rgba.size != (128, 256):
            raise ValueError('invalid-dimensions')
        alpha = rgba.getchannel('A')
        bbox = alpha.getbbox()
        if alpha.getextrema() != (0, 255) or bbox is None:
            raise ValueError('missing-visible-content-or-alpha')
        if bbox[0] <= 0 or bbox[1] <= 0 or bbox[2] >= 128 or bbox[3] >= 256:
            raise ValueError('clipped-at-cell-edge')
        # Ignore hidden RGB values so metadata/invisible pixels cannot fake poses.
        pixels = bytearray(rgba.tobytes())
        for n in range(0, len(pixels), 4):
            if pixels[n + 3] == 0:
                pixels[n:n + 3] = b'\0\0\0'
        result.update(status='valid', dimensions=[128,256], bbox=list(bbox),
                      pixelSha256=hashlib.sha256(pixels).hexdigest())
    except (OSError, ValueError, SyntaxError) as error:
        result.update(status='invalid', error=type(error).__name__)
    return result


def audit_variant(base: Path, class_id: str, sex: str) -> dict:
    actions = {}
    valid = invalid = 0
    complete = []
    for action in ACTIONS:
        frames = {f'{i:02d}': inspect_frame(base/'frames'/action/f'{class_id}-{sex}-{action}-{i:02d}.png') for i in range(1,5)}
        present = {k:v for k,v in frames.items() if v['status'] != 'missing'}
        good = [v for v in present.values() if v['status']=='valid']
        bad = [v for v in present.values() if v['status']=='invalid']
        valid += len(good); invalid += len(bad)
        distinct = len({v['pixelSha256'] for v in good})
        status = 'missing'
        if present:
            status = 'invalid' if bad else ('duplicate-poses' if len(good)==4 and distinct!=4 else 'partial')
        if len(good)==4 and distinct==4:
            status='technical-passed'; complete.append(action)
        actions[action] = {'status':status}
        if present: actions[action].update(frames=present, distinctFrames=distinct)
    return {'validFrames':valid,'invalidFrames':invalid,'technicalActions':complete,'actions':actions}


def reconcile(manifest: dict, root: Path) -> dict:
    for variant in manifest['variants']:
        audit = audit_variant(root/variant['classId']/variant['sex'],variant['classId'],variant['sex'])
        variant['audit'] = audit
        variant['actionsCompleted'] = []  # Only explicit visual approvals with current hashes qualify.
        for action in audit['technicalActions']:
            frames = audit['actions'][action]['frames']
            approval = variant.get('visualApprovals',{}).get(action,{})
            if approval.get('frameHashes') == [frames[f'{i:02d}']['sha256'] for i in range(1,5)]:
                variant['actionsCompleted'].append(action)
        variant['qaStatus'] = 'invalid-files' if audit['invalidFrames'] else ('visual-review-pending' if audit['validFrames'] else 'not-started')
        variant['status'] = 'complete' if len(variant['actionsCompleted'])==15 else ('in-progress' if audit['validFrames'] or audit['invalidFrames'] else 'pending')
    return manifest


def main() -> int:
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--root',type=Path,default=HD_ROOT)
    p.add_argument('--write',action='store_true')
    p.add_argument('--strict',action='store_true')
    args=p.parse_args()
    path=args.root/'manifest.json'
    before=path.read_text()
    manifest=reconcile(json.loads(before),args.root)
    after=json.dumps(manifest,ensure_ascii=False,indent=2)+'\n'
    invalid=sum(v['audit']['invalidFrames'] for v in manifest['variants'])
    valid=sum(v['audit']['validFrames'] for v in manifest['variants'])
    if args.write: path.write_text(after)
    elif before != after:
        print('Progress differs from files. Run: python scripts/auditar-sprites-hd.py --write')
        return 1
    print(json.dumps({'validFrames':valid,'invalidFrames':invalid,'visualApprovalAutomatic':False}))
    return 1 if args.strict and invalid else 0

if __name__=='__main__': raise SystemExit(main())
