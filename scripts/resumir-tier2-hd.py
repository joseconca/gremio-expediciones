"""Verify the complete Tier 2 candidate library and retain its checkpoint receipts."""
from pathlib import Path
import hashlib
import json
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
HD = ROOT / 'assets/spritesheets/hd-128x256'

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def main():
    manifest = json.loads((HD / 'manifest.json').read_text(encoding='utf-8'))
    variants = [v for v in manifest['variants'] if v['tier'] == 2]
    assert len(variants) == 16
    receipts = []
    checks = 0
    for v in variants:
        c, s = v['classId'], v['sex']
        base = HD / c / s
        assert v['audit']['validFrames'] == 60 and v['audit']['invalidFrames'] == 0
        assert len(v['audit']['technicalActions']) == 15
        assert v['equipmentCompatibility']['userApproval'] == 'pending'
        report = json.loads((base / 'equipment-review/qa-report.json').read_text(encoding='utf-8'))
        assert report['status'] == 'passed' and not report['warnings']
        assert len(report['actions']) == 15
        for action, hashes in report['bodyHashes'].items():
            for n, digest in enumerate(hashes, 1):
                assert sha(base / 'frames' / action / f'{c}-{s}-{action}-{n:02d}.png') == digest
        sheet = json.loads((base / 'qa-report.json').read_text(encoding='utf-8'))
        assert sheet['status'] == 'passed'
        assert sha(ROOT / sheet['sheetPath']) == sheet['sheetSha256']
        receipt = json.loads((ROOT / f'work/tier2-remote-{c}-{s}.json').read_text(encoding='utf-8'))
        assert receipt['status'] == 'passed' and receipt['bodyFrames'] == 60
        checks += report['contactChecks']
        receipts.append(receipt)
    galleries = {}
    for suffix in ('png', 'gif'):
        p = HD / 'previews' / f'tier2-overview.{suffix}'
        with Image.open(p) as im:
            for n in range(getattr(im, 'n_frames', 1)):
                im.seek(n)
                im.load()
        galleries[p.relative_to(ROOT).as_posix()] = sha(p)
    result = {'status': 'passed-user-review-pending', 'variants': 16, 'bodyFrames': 960,
              'actionsPerVariant': 15, 'contactChecks': checks, 'warnings': 0,
              'equipmentPolicy': 'Unchanged shared sheets per sex; no class offsets',
              'runtimePromotion': 'pending-user-review', 'galleries': galleries,
              'remoteCheckpoints': receipts}
    (HD / 'previews/tier2-verification.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({k: v for k, v in result.items() if k not in ('remoteCheckpoints', 'galleries')}))

if __name__ == '__main__':
    main()
