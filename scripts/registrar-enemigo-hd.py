"""Preserve generated enemy sources and mechanically assemble a 4x4 RGBA atlas."""
import argparse
from collections import deque
import hashlib
import json
import math
import os
from pathlib import Path
import shutil
import tempfile
import time
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'assets/spritesheets/enemies-hd'
ACTIONS = ('idle', 'hurt', 'attack', 'dodge')

def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()

def save_image(im, path, **kwargs):
    # Replace complete files atomically, including when a preview/indexer is reading them.
    with tempfile.NamedTemporaryFile(dir=path.parent, suffix=path.suffix, delete=False) as f:
        temp = Path(f.name)
    try:
        im.save(temp, **kwargs)
        for attempt in range(5):
            try:
                os.replace(temp,path)
                break
            except OSError:
                if attempt == 4:
                    raise
                time.sleep(.2)
    finally:
        if temp.exists():
            temp.unlink()

def preserve(data):
    folder = BASE / data['id'] / 'source'
    folder.mkdir(parents=True, exist_ok=True)
    stem = ('dodge' if data.get('action') == 'dodge' else 'sheet') + '-v' + str(data['revision'])
    target = folder / (stem + '.png')
    if target.exists():
        if sha(target) != sha(Path(data['source'])):
            raise ValueError('A revision may not overwrite different original bytes')
    else:
        shutil.copyfile(data['source'], target)
    meta = {**data, 'originalGenerationPath': data.get('originalGenerationPath',data['source']), 'source': target.relative_to(ROOT).as_posix(), 'sourceSha256': sha(target), 'generator': 'built-in image_gen'}
    (folder / (stem + '.json')).write_text(json.dumps(meta, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    return target

def subjects(im):
    """Segment connected subjects; never cut a tail at an artificial grid boundary."""
    w, h = im.size
    original = im.getchannel('A').tobytes()
    pixels = bytearray(1 if a >= 32 else 0 for a in original)
    components = []
    for seed in range(len(pixels)):
        if not pixels[seed]:
            continue
        pixels[seed] = 0
        todo = deque([seed])
        ids = []
        while todo:
            i = todo.popleft()
            ids.append(i)
            x, y = i % w, i // w
            for k in ((i-1 if x else -1), (i+1 if x+1<w else -1), (i-w if y else -1), (i+w if y+1<h else -1)):
                if k >= 0 and pixels[k]:
                    pixels[k] = 0
                    todo.append(k)
        if len(ids) >= 8:
            components.append(ids)
    components.sort(key=len, reverse=True)
    if len(components) < 16 or len(components[15]) < len(components[0]) * .15:
        raise ValueError('Expected sixteen separate complete creatures; revise source')
    main = components[:16]
    centers = [(sum(i % w for i in ids)/len(ids), sum(i//w for i in ids)/len(ids)) for ids in main]
    # Keep small disconnected whiskers/details with their nearest creature.
    for extra in components[16:]:
        cx = sum(i % w for i in extra)/len(extra)
        cy = sum(i//w for i in extra)/len(extra)
        n = min(range(16), key=lambda n: ((centers[n][0]-cx)/(w/4))**2+((centers[n][1]-cy)/(h/4))**2)
        main[n].extend(extra)
    ordered = sorted(range(16), key=lambda n: centers[n][1])
    ordered = [n for row in range(4) for n in sorted(ordered[row*4:row*4+4], key=lambda n: centers[n][0])]
    result = []
    for index, n in enumerate(ordered):
        row, col = divmod(index, 4)
        cx, cy = centers[n]
        if abs(cx-(col+.5)*w/4) > w/4*.7 or abs(cy-(row+.5)*h/4) > h/4*.7:
            raise ValueError('Incorrect four-row/four-column layout')
        mask = bytearray(w*h)
        for i in main[n]:
            mask[i] = original[i]
        layer = im.copy()
        layer.putalpha(Image.frombytes('L', (w,h), bytes(mask)))
        box = layer.getbbox()
        if box[0] == 0 or box[1] == 0 or box[2] == w or box[3] == h:
            raise ValueError(f'Source clipped at outside edge: frame {index+1}')
        result.append((layer, box))
    return result

def register(data, idle_height, reviewed, anchor_mode='ground'):
    source = preserve(data)
    im = Image.open(source).convert('RGBA')
    if im.getchannel('A').getextrema()[0] != 0:
        raise ValueError('Real transparent background required')
    parts = subjects(im)
    # One common scale for all sixteen poses; no per-frame size normalization.
    row_roots = []
    for row in range(4):
        layer, box = parts[row*4]
        support = layer.getchannel('A').crop((box[0],box[3]-15,box[2],box[3])).getbbox()
        row_roots.append((box[0]+(support[0]+support[2])/2, box[3]-row*im.height/4))
    max_extent = max(max(abs(b[0]-(n%4)*im.width/4-row_roots[n//4][0]),abs(b[2]-(n%4)*im.width/4-row_roots[n//4][0])) for n,(_,b) in enumerate(parts))
    min_y = min(b[1]-(n//4)*im.height/4-row_roots[n//4][1] for n,(_,b) in enumerate(parts))
    max_y = max(b[3]-(n//4)*im.height/4-row_roots[n//4][1] for n,(_,b) in enumerate(parts))
    idle_h = sum(b[3]-b[1] for _, b in parts[:4])/4
    # Species size is fixed against the heroes, never reduced to fit a wide attack.
    scale = idle_height/idle_h
    needed = max(2*max_extent*scale+32,(max_y-min_y)*scale+32)
    cell = max(384,math.ceil(needed/64)*64)
    center = cell//2
    baseline = round(cell-12-max_y*scale)
    folder = BASE / data['id']
    sheet = Image.new('RGBA', (cell*4,cell*4))
    report_frames = {}
    for index, (layer, box) in enumerate(parts):
        row, col = divmod(index,4)
        # Position relative to the source cell preserves wind-up/recoil differences.
        local_bottom = box[3] - row * im.height/4
        if row == 0 and anchor_mode == 'ground':
            support = layer.getchannel('A').crop((box[0], box[3]-min(15,box[3]-box[1]), box[2], box[3])).getbbox()
            anchor_x = box[0] + (support[0]+support[2])/2
        else:
            anchor_x = col*im.width/4+row_roots[row][0]
        crop = layer.crop(box)
        crop = crop.resize((max(1,round(crop.width*scale)), max(1,round(crop.height*scale))), Image.Resampling.LANCZOS)
        x = round(center+(box[0]-anchor_x)*scale)
        # Source rows share a common floor; keep recoil and airborne poses intact.
        floor = row_roots[row][1]
        y = round(baseline+(local_bottom-floor)*scale-crop.height)
        if x < 2 or x+crop.width > cell-2 or y < 2 or y+crop.height > cell-2:
            raise ValueError(f'Pose exceeds target cell: {index+1}, {(x,y,crop.size)}')
        frame = Image.new('RGBA', (cell,cell))
        frame.alpha_composite(crop, (x,y))
        idle_dx = 0
        if row == 0 and anchor_mode == 'ground':
            alpha = frame.getchannel('A').point(lambda v:255 if v>=128 else 0)
            bottom = alpha.getbbox()[3]
            feet = alpha.crop((0,bottom-8,cell,bottom)).getbbox()
            idle_dx = math.floor(center-(feet[0]+feet[2])/2+.5)
            aligned = Image.new('RGBA', (cell,cell))
            aligned.alpha_composite(frame,(idle_dx,0))
            frame = aligned
        bounds = frame.getbbox()
        assert bounds[0]>=2 and bounds[1]>=2 and bounds[2]<=cell-2 and bounds[3]<=cell-2, 'Idle alignment clips subject'
        action = ACTIONS[row]
        out = folder / 'frames' / action / f'{data["id"]}-{action}-{col+1:02d}.png'
        out.parent.mkdir(parents=True, exist_ok=True)
        save_image(frame,out)
        report_frames.setdefault(action, []).append({'path':out.relative_to(ROOT).as_posix(), 'sha256':sha(out), 'bounds':frame.getbbox(), 'idleAnchorCorrectionX':idle_dx})
        sheet.alpha_composite(frame, (col*cell,row*cell))
    for action, frames in report_frames.items():
        assert len(set(f['sha256'] for f in frames)) == 4, f'Duplicate poses: {action}'
    target = folder / f'{data["id"]}-sheet.png'
    save_image(sheet,target)
    preview = folder / 'previews'
    preview.mkdir(exist_ok=True)
    for row, action in enumerate(ACTIONS):
        cycle = []
        for col in range(4):
            bg = Image.new('RGBA',(cell,cell),'#242630')
            bg.alpha_composite(sheet.crop((col*cell,row*cell,(col+1)*cell,(row+1)*cell)))
            cycle.append(bg.convert('RGB'))
        save_image(cycle[0],preview/(action+'.gif'),save_all=True,append_images=cycle[1:],duration=300 if action=='idle' else 150,loop=0,disposal=2)
    contact = Image.new('RGBA',sheet.size,'#242630')
    contact.alpha_composite(sheet)
    save_image(contact.convert('RGB'),preview/'contact.png')
    heights=[f['bounds'][3]-f['bounds'][1] for f in report_frames['idle']]
    report = {'status':'passed', 'frames':16, 'actions':list(ACTIONS), 'scale':scale, 'cellSize':[cell,cell], 'sheetSize':[cell*4,cell*4],
              'artDirection':data.get('artDirection','earlier-candidate-style'),
              'requestedIdleHeight':idle_height, 'idleHeightMean':sum(heights)/4, 'actorAnchor':[center,baseline], 'baselineY':baseline, 'idleAnchorMode':anchor_mode,
              'rowReferenceRoots':row_roots, 'sheetPath':target.relative_to(ROOT).as_posix(), 'sheetSha256':sha(target),
              'sourcePath':source.relative_to(ROOT).as_posix(), 'sourceSha256':sha(source),
              'frameData':report_frames, 'visualReview':'assistant-reviewed-candidate' if reviewed else 'pending', 'userApproval':'pending'}
    (folder/'qa-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    manifest_path = BASE/'manifest.json'
    m = json.loads(manifest_path.read_text(encoding='utf-8-sig'))
    item = next(e for e in m['enemies'] if e['id'] == data['id'])
    item.update(status='candidate' if reviewed else 'visual-review-pending',frames=16,sourceRevision=data['revision'],cellSize=[cell,cell],sheetSize=[cell*4,cell*4],idleHeight=idle_height,anchorMode=anchor_mode,artDirection=report['artDirection'],report=(folder/'qa-report.json').relative_to(ROOT).as_posix())
    m['schemaVersion']=2
    m.pop('cellSize',None)
    m.pop('sheetSize',None)
    m['minimumCellSize']=[384,384]
    m['sizePolicy']='Fixed species height in pixels relative to heroes; canvas grows for wide attacks, body never shrinks to fit.'
    m['completedCandidates'] = sum(e['status']=='candidate' for e in m['enemies'])
    m['framesPresent'] = sum(e.get('frames',0) for e in m['enemies'])
    m['framesExpected'] = len(m['enemies'])*16
    m['nextEnemy'] = next((e['id'] for e in m['enemies'] if e['status'] != 'candidate'), None)
    m['status'] = 'in-progress' if m['nextEnemy'] else 'candidate-library-complete-user-review-pending'
    manifest_path.write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'id':data['id'],'frames':16,'scale':scale,'status':item['status'],'completedCandidates':m['completedCandidates']}))

if __name__ == '__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--metadata', type=Path, required=True)
    p.add_argument('--idle-height',type=int)
    p.add_argument('--reviewed',action='store_true')
    p.add_argument('--anchor-mode',choices=('ground','air'))
    p.add_argument('--preserve-only',action='store_true')
    a=p.parse_args()
    data=json.loads(a.metadata.read_text(encoding='utf-8-sig'))
    if a.preserve_only:
        print(preserve(data))
    else:
        targets=json.loads((BASE/'scale-targets.json').read_text(encoding='utf-8'))['targets']
        target=targets[data['id']]
        register(data,a.idle_height or target['idleHeight'],a.reviewed,a.anchor_mode or target['anchorMode'])
