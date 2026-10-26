"""Verify source provenance, all atlas pixels and stable idle support points."""
import hashlib
import json
import re
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'assets/spritesheets/enemies-hd'

def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()

def audit():
    m = json.loads((BASE/'manifest.json').read_text(encoding='utf-8-sig'))
    assert m['actions'] == ['idle','hurt','attack','dodge']
    complete = []
    for enemy in m['enemies']:
        folder = BASE/enemy['id']
        for metadata in (folder/'source').glob('*.json'):
            src = json.loads(metadata.read_text(encoding='utf-8'))
            assert sha(ROOT/src['source']) == src['sourceSha256'], metadata
            assert src['prompt'] and src['generator'] == 'built-in image_gen'
        if enemy['status'] != 'candidate':
            continue
        q = json.loads((ROOT/enemy['report']).read_text(encoding='utf-8'))
        assert q['frames'] == 16 and q['status'] == 'passed'
        assert sha(ROOT/q['sheetPath']) == q['sheetSha256']
        assert sha(ROOT/q['sourcePath']) == q['sourceSha256']
        with Image.open(ROOT/q['sheetPath']) as sheet:
            cell=q.get('cellSize',[256,256])[0]
            assert sheet.size == (cell*4,cell*4) and sheet.mode == 'RGBA'
            if 'requestedIdleHeight' in q:
                assert abs(q['idleHeightMean']-q['requestedIdleHeight'])<=2, 'Enemy body was shrunk to fit an attack'
            idle_centers = []
            idle_heights = []
            for row, action in enumerate(m['actions']):
                hashes = []
                for col, record in enumerate(q['frameData'][action]):
                    p = ROOT/record['path']
                    assert sha(p) == record['sha256']
                    hashes.append(record['sha256'])
                    with Image.open(p) as frame:
                        assert frame.size == (cell,cell) and frame.mode == 'RGBA'
                        assert frame.getchannel('A').getextrema() == (0,255)
                        bounds = frame.getbbox()
                        assert bounds[0] >= 2 and bounds[1] >= 2 and bounds[2] <= cell-2 and bounds[3] <= cell-2
                        assert frame.tobytes() == sheet.crop((col*cell,row*cell,(col+1)*cell,(row+1)*cell)).tobytes()
                        if action == 'idle':
                            idle_heights.append(bounds[3]-bounds[1])
                            a = frame.getchannel('A').point(lambda v:255 if v>=128 else 0)
                            bottom = a.getbbox()[3]
                            feet = a.crop((0,bottom-8,cell,bottom)).getbbox()
                            idle_centers.append((feet[0]+feet[2])/2)
                assert len(set(hashes)) == 4
            if q.get('idleAnchorMode','ground') == 'ground':
                assert max(idle_centers)-min(idle_centers) <= 2, (enemy['id'],idle_centers)
            if 'requestedIdleHeight' in q:
                targets=json.loads((BASE/'scale-targets.json').read_text(encoding='utf-8'))['targets']
                assert abs(sum(idle_heights)/4-targets[enemy['id']]['idleHeight'])<=2, 'Visible enemy height differs from species target'
            complete.append({'id':enemy['id'],'frames':16,'idleAnchorMode':q.get('idleAnchorMode','ground'),'idleSupportCentersX':idle_centers,'aerialReview':'fixed cell origin; torso visually reviewed, wing tips excluded from ground test' if q.get('idleAnchorMode')=='air' else None})
    assert len(complete) == m.get('completedCandidates',0)
    result = {'status':'passed','expectedEnemies':54,'candidateEnemies':len(complete),'framesValidated':len(complete)*16,'runtimeModified':False,'enemies':complete}
    (BASE/'validation-report.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    doc=ROOT/'docs/plan-enemigos-hd.md'
    text=doc.read_text(encoding='utf-8-sig')
    start='<!-- ENEMIES_HD_PROGRESS_START -->'
    end='<!-- ENEMIES_HD_PROGRESS_END -->'
    lines=[start,'## Avance verificable','',f'{len(complete)} / {len(m["enemies"])} enemigos candidatos; {len(complete)*16} / {len(m["enemies"])*16} fotogramas. Revisión del usuario e integración pendientes.','', '| Enemigo | Estado |','|---|---|']
    lines += ['| '+e['name']+' | '+('16 fotogramas; candidato revisado' if e['status']=='candidate' else 'Pendiente')+' |' for e in m['enemies']]
    lines += ['', 'Previsualizaciones por rango en `assets/spritesheets/enemies-hd/previews`. Se mantienen las fuentes y todas las revisiones anteriores.',end]
    block='\n'.join(lines)
    text=re.sub(re.escape(start)+r'.*?'+re.escape(end),lambda _:block,text,flags=re.S) if start in text else text+'\n\n'+block+'\n'
    doc.write_text(text,encoding='utf-8')
    print(json.dumps({k:v for k,v in result.items() if k!='enemies'}))

if __name__ == '__main__':
    audit()
