import json
from pathlib import Path
from PIL import Image
base=Path(__file__).resolve().parents[1]/'assets/spritesheets/enemies-hd'
pages=json.loads((base/'previews/index.json').read_text(encoding='utf-8'))
manifest=json.loads((base/'manifest.json').read_text(encoding='utf-8'))
ids=[id for p in pages for id in p['enemies']]
assert len(ids)==len(set(ids))==54
assert set(ids)=={e['id'] for e in manifest['enemies']}
count=0
for path in base.rglob('*.gif'):
    with Image.open(path) as im:
        assert im.n_frames==4,path
        for frame in range(im.n_frames):
            im.seek(frame)
            im.load()
            count+=1
page=(base/'previews/revision.html').read_text(encoding='utf-8')
for p in pages:assert p['gif'] in page
report={'status':'passed','galleryPages':len(pages),'enemiesRepresented':len(ids),'gifFramesDecoded':count,
        'artApproval':manifest.get('artApproval',{}).get('status','pending-user-review'),
        'runtimeModified':manifest.get('runtimePromotion')=='integrated-on-branch-pending-main-publication'}
(base/'preview-validation-report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print(json.dumps(report))
