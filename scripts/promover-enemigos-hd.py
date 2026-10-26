"""Copy reviewed enemy atlases without altering their pixels or species scale."""
import hashlib, json, shutil
from pathlib import Path
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/'assets/spritesheets/enemies-hd'

def main():
    manifest=json.loads((BASE/'manifest.json').read_text(encoding='utf-8'))
    validation=json.loads((BASE/'validation-report.json').read_text(encoding='utf-8'))
    if validation['status']!='passed' or validation['framesValidated']!=864:
        raise ValueError('Validate all 54 enemy sheets before promotion')
    result={'version':'enemies-hd-v1','actions':manifest['actions'],'enemies':{}}
    for item in manifest['enemies']:
        id=item['id']
        qa=json.loads((ROOT/item['report']).read_text(encoding='utf-8'))
        source=BASE/id/f'{id}-sheet.png'
        digest=hashlib.sha256(source.read_bytes()).hexdigest()
        if item['status']!='candidate' or qa['status']!='passed' or digest!=qa['sheetSha256']:
            raise ValueError('Unvalidated atlas: '+id)
        with Image.open(source) as image:
            image.verify()
        target=ROOT/'public/sprites/enemies-hd-v1'/f'{id}-sheet.png'
        target.parent.mkdir(parents=True,exist_ok=True)
        shutil.copyfile(source,target)
        bounds=[frame['bounds'] for frames in qa['frameData'].values() for frame in frames]
        envelope=[min(b[0] for b in bounds),min(b[1] for b in bounds),max(b[2] for b in bounds),max(b[3] for b in bounds)]
        result['enemies'][id]={'name':item['name'],'boss':item['boss'],'rank':item['rank'],'bounds':envelope,
            'src':f'/sprites/enemies-hd-v1/{id}-sheet.png','cellSize':qa['cellSize'][0],
            'anchor':qa['actorAnchor'],'height':qa['requestedIdleHeight'],'sha256':digest}
    target=ROOT/'src/lib/generated/enemies-hd.json'
    target.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'promotedEnemies':len(result['enemies']),'frames':len(result['enemies'])*16}))

if __name__=='__main__':main()
