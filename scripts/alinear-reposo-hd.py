"""Measure idle support points; compensate horizontal actor drift without editing art."""
import argparse
import hashlib
import json
import math
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
HD = ROOT / 'assets/spritesheets/hd-128x256'
DATA = ROOT / 'src/lib/generated/posiciones-idle-hd.json'
REPORT = HD / 'idle-alignment-report.json'

def measure():
    manifest = json.loads((HD / 'manifest.json').read_text(encoding='utf-8'))
    positions, variants = {}, {}
    for v in manifest['variants']:
        if 'idle' not in v['audit']['technicalActions']:
            continue
        c, s = v['classId'], v['sex']
        centers, hashes = [], []
        for n in range(1, 5):
            p = HD / c / s / 'frames/idle' / f'{c}-{s}-idle-{n:02d}.png'
            with Image.open(p) as im:
                mask = im.getchannel('A').point(lambda a: 255 if a >= 128 else 0)
                bottom = mask.getbbox()[3]
                feet = mask.crop((0, bottom - 15, 128, bottom)).getbbox()
                centers.append((feet[0] + feet[2]) / 2)
            hashes.append(hashlib.sha256(p.read_bytes()).hexdigest())
        # Leave already stationary variants (including male swordsman) untouched.
        offsets = [math.floor(centers[0] - x + .5) for x in centers] if max(centers) - min(centers) > 1.5 else [0] * 4
        corrected = [x + dx for x, dx in zip(centers, offsets)]
        assert max(corrected) - min(corrected) <= 1.5
        positions.setdefault(c, {})[s] = offsets
        variants[c + '-' + s] = {'frameHashes': hashes, 'supportCentersX': centers,
                                 'offsetsX': offsets, 'correctedCentersX': corrected}
    report = {'action': 'idle', 'method': 'Horizontal midpoint of the opaque boot support band (bottom 15 pixels), relative to frame 1; integer translation of the entire composed actor.',
              'bodyAndEquipmentPixelsChanged': False, 'verticalOffset': 0,
              'variants': variants}
    return positions, report

def preview(positions):
    frames = []
    for n in range(1, 5):
        canvas = Image.new('RGBA', (640, 520), '#242630')
        draw = ImageDraw.Draw(canvas)
        for row, (c, s, label) in enumerate((('mago', 'f', 'Maga'), ('espadachin', 'm', 'Espadachin masculino'))):
            y = row * 260
            for col, title in enumerate(('Antes', 'Corregido')):
                x = col * 320
                draw.text((x + 8, y + 8), label + ' / ' + title, fill='white')
                # Render full original pixels on a roomy stage, just like the game canvas.
                dx = positions[c][s][n - 1] if col else 0
                im = Image.open(HD / c / s / 'frames/idle' / f'{c}-{s}-idle-{n:02d}.png').convert('RGBA')
                canvas.alpha_composite(im, (x + 96 + dx, y - 10))
                draw.line((x + 166, y + 80, x + 166, y + 245), fill=(100, 110, 130, 255))
        frames.append(canvas.convert('RGB'))
    out = HD / 'previews'
    frames[0].save(out / 'idle-alignment.png')
    frames[0].save(out / 'idle-alignment.gif', save_all=True, append_images=frames[1:], duration=300, loop=0, disposal=2)

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    parser.add_argument('--preview', action='store_true')
    args = parser.parse_args()
    positions, report = measure()
    if args.check:
        assert json.loads(DATA.read_text(encoding='utf-8')) == positions, 'Regenerate idle positions'
        assert json.loads(REPORT.read_text(encoding='utf-8')) == report, 'Idle review is stale'
    else:
        for p, data in ((DATA, positions), (REPORT, report)):
            p.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    if args.preview:
        preview(positions)
    print(json.dumps({'variants': len(report['variants']), 'corrected': sum(any(v['offsetsX']) for v in report['variants'].values()), 'maxResidualPixels': max(max(v['correctedCentersX']) - min(v['correctedCentersX']) for v in report['variants'].values())}))
