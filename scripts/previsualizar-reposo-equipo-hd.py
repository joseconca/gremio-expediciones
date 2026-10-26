"""Preview the actual packed runtime layers with stable idle equipment and hand masks."""
from pathlib import Path
import json
from PIL import Image, ImageDraw, ImageChops

ROOT = Path(__file__).resolve().parents[1]
HD = ROOT / 'assets/spritesheets/hd-128x256'
DATA = json.loads((ROOT / 'src/lib/generated/sprites-hd.json').read_text(encoding='utf-8'))
POSITIONS = json.loads((ROOT / 'src/lib/generated/posiciones-idle-hd.json').read_text(encoding='utf-8'))
OUT = HD / 'previews'

def render(c, s, n, ids, stable=True):
    dx = POSITIONS[c][s][n]
    body = Image.open(HD / c / s / 'frames/idle' / f'{c}-{s}-idle-{n+1:02d}.png').convert('RGBA')
    body_layer = Image.new('RGBA', (384, 384))
    body_layer.alpha_composite(body, (128 + dx, 64))
    result = body_layer.copy()
    for item_id in ids:
        item = DATA['items'][item_id]
        phase = 0 if stable else n
        cfg = DATA['compositions'][item['composition']][s]['idle'][phase]
        rect = item['frames'][s]['idle'][phase]
        atlas = Image.open(ROOT / f'public/sprites/hd-v1/equipment/{item_id}/{s}-sheet.png').convert('RGBA')
        x, y, w, h = rect['source']
        ox, oy = rect['offset']
        shift = 0 if stable else dx
        result.alpha_composite(atlas.crop((x, y, x+w, y+h)), (ox + shift, oy))
        if cfg['restoreHands']:
            mask = Image.new('L', (384, 384))
            draw = ImageDraw.Draw(mask)
            r = cfg['handMaskRadius']
            for x, y in cfg['contacts']:
                x += 128 + shift
                y += 64
                draw.ellipse((x-r, y-r, x+r, y+r), fill=255)
            result.paste(body_layer, (0, 0), ImageChops.multiply(mask, body_layer.getchannel('A')))
    stage = Image.new('RGBA', result.size, '#242630')
    stage.alpha_composite(result)
    return stage.convert('RGB').crop((70, 140, 330, 325))

def main():
    classes = list(POSITIONS)
    sets = [('Espada y escudo', ['espada_hierro', 'escudo_madera']),
            ('Arco', ['arco_cazador']), ('Baston', ['baston_runico']),
            ('Libro', ['libro_aprendiz']), ('Guantes', ['guantes_lucha'])]
    cycles = []
    poses = Image.new('RGB', (1040, len(classes)*210), '#242630')
    for n in range(4):
        gallery = Image.new('RGB', (1300, len(classes)*210), '#242630')
        draw = ImageDraw.Draw(gallery)
        for row, c in enumerate(classes):
            for col, (label, ids) in enumerate(sets):
                gallery.paste(render(c, 'f', n, ids), (col*260, row*210+20))
                draw.text((col*260+5, row*210+3), c+' / '+label, fill='white')
            poses.paste(render(c, 'f', n, sets[0][1]), (n*260, row*210+20))
            ImageDraw.Draw(poses).text((n*260+5, row*210+3), c+f' / {n+1}', fill='white')
        cycles.append(gallery)
    cycles[0].save(OUT / 'idle-equipment-f.png')
    cycles[0].save(OUT / 'idle-equipment-f.gif', save_all=True, append_images=cycles[1:], duration=300, loop=0, disposal=2)
    poses.save(OUT / 'idle-equipment-f-poses.png')
    before_after = []
    for n in range(4):
        stage = Image.new('RGB', (520, 210), '#242630')
        for col, stable in enumerate((False, True)):
            stage.paste(render('mago', 'f', n, sets[0][1], stable), (col*260, 20))
            ImageDraw.Draw(stage).text((col*260+5, 3), 'Maga / '+('Corregido' if stable else 'Antes'), fill='white')
        before_after.append(stage.resize((1040, 420), Image.Resampling.NEAREST))
    before_after[0].save(OUT / 'idle-equipment-comparison.gif', save_all=True, append_images=before_after[1:], duration=300, loop=0, disposal=2)
    print(json.dumps({'femaleVariants': len(classes), 'equipmentSets': len(sets), 'phases': 4, 'source': 'Packed game equipment and original body frames'}))

if __name__ == '__main__':
    main()
