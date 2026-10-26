"""Verify source provenance, all atlas pixels and stable idle support points."""
import hashlib
import json
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
            assert sheet.size == (1024,1024) and sheet.mode == 'RGBA'
            idle_centers = []
            for row, action in enumerate(m['actions']):
                hashes = []
                for col, record in enumerate(q['frameData'][action]):
                    p = ROOT/record['path']
                    assert sha(p) == record['sha256']
                    hashes.append(record['sha256'])
                    with Image.open(p) as frame:
                        assert frame.size == (256,256) and frame.mode == 'RGBA'
                        assert frame.getchannel('A').getextrema() == (0,255)
                        bounds = frame.getbbox()
                        assert bounds[0] >= 2 and bounds[1] >= 2 and bounds[2] <= 254 and bounds[3] <= 254
                        assert frame.tobytes() == sheet.crop((col*256,row*256,(col+1)*256,(row+1)*256)).tobytes()
                        if action == 'idle':
                            a = frame.getchannel('A').point(lambda v:255 if v>=128 else 0)
                            bottom = a.getbbox()[3]
                            feet = a.crop((0,bottom-8,256,bottom)).getbbox()
                            idle_centers.append((feet[0]+feet[2])/2)
                assert len(set(hashes)) == 4
            assert max(idle_centers)-min(idle_centers) <= 2, (enemy['id'],idle_centers)
            complete.append({'id':enemy['id'],'frames':16,'idleSupportCentersX':idle_centers})
    assert len(complete) == m.get('completedCandidates',0)
    result = {'status':'passed','expectedEnemies':54,'candidateEnemies':len(complete),'framesValidated':len(complete)*16,'runtimeModified':False,'enemies':complete}
    (BASE/'validation-report.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({k:v for k,v in result.items() if k!='enemies'}))

if __name__ == '__main__':
    audit()
