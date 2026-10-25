"""Verify lossless packed equipment against every reviewed frame and body hash."""
import hashlib,json
from pathlib import Path
from PIL import Image
R=Path(__file__).resolve().parents[1];H=R/'assets/spritesheets/hd-128x256';P=R/'public/sprites/hd-v1'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def png(p):
    Image.open(p).verify();im=Image.open(p);im.load()
    if im.mode!='RGBA':raise ValueError('Expected RGBA: '+str(p))
    return im
def visible_bytes(im):
    # RGB stored under alpha=0 is invisible and intentionally omitted by packing.
    im=im.copy();im.paste((0,0,0,0),(0,0),im.getchannel('A').point(lambda a:255 if a==0 else 0));return im.tobytes()
def validate():
    m=json.loads((H/'equipment/manifest.json').read_text(encoding='utf-8'));d=json.loads((R/'src/lib/generated/sprites-hd.json').read_text(encoding='utf-8'))
    if d['classes']!=m['classes'] or d['actions']!=m['actions'] or set(d['items'])!=set(m['items']):raise ValueError('Runtime catalog mismatch')
    counts={'bodyAtlases':0,'staticImages':0,'equipmentAtlases':0,'equipmentFrames':0,'unchangedBodyFrames':0};pixels=0
    for c in m['classes']:
        for s in ('m','f'):
            q=json.loads((H/c/s/'qa-report.json').read_text(encoding='utf-8'));file=P/'heroes'/c/f'{s}-sheet.png'
            if png(file).size!=(512,3840) or sha(file)!=q['sheetSha256']:raise ValueError('Body atlas changed')
            counts['bodyAtlases']+=1
            for action,frames in m['renderPolicy']['bodyFrameHashes'][c+'-'+s].items():
                for n,digest in frames.items():
                    if sha(H/c/s/'frames'/action/f'{c}-{s}-{action}-{n}.png')!=digest:raise ValueError('Source body changed')
                    counts['unchangedBodyFrames']+=1
            idle=P/'heroes'/c/f'{s}-idle.png';portrait=P/'heroes'/c/f'{s}-portrait.png'
            if sha(idle)!=m['renderPolicy']['bodyFrameHashes'][c+'-'+s]['idle']['01'] or png(portrait).size!=(128,256):raise ValueError('Portrait invalid')
            counts['staticImages']+=2
    for key,item in m['items'].items():
        runtime=d['items'][key]
        for s in ('m','f'):
            atlas=png(P/'equipment'/key/f'{s}-sheet.png');counts['equipmentAtlases']+=1;pixels+=atlas.width*atlas.height
            for action,records in item['sheets'][s]['actions'].items():
                for n,record in enumerate(records):
                    if sha(R/record['path'])!=record['sha256']:raise ValueError('Source equipment changed')
                    expected=png(R/record['path']);frame=runtime['frames'][s][action][n];x,y,w,h=frame['source'];dx,dy=frame['offset']
                    if min(x,y,dx,dy)<0 or x+w>atlas.width or y+h>atlas.height or dx+w>384 or dy+h>384:raise ValueError('Packed frame clipped')
                    rebuilt=Image.new('RGBA',(384,384));rebuilt.paste(atlas.crop((x,y,x+w,y+h)),(dx,dy))
                    if visible_bytes(rebuilt)!=visible_bytes(expected):raise ValueError(f'Pixels changed: {key}/{s}/{action}/{n+1}')
                    config={k:record['config'][k] for k in ('depth','contacts','restoreHands','handMaskRadius')}
                    if d['compositions'][runtime['composition']][s][action][n]!=config:raise ValueError('Runtime hand mask or depth changed')
                    counts['equipmentFrames']+=1
    original=56*1536*5760
    result={'status':'passed',**counts,'packedEquipmentPixels':pixels,'sourceEquipmentPixels':original,'decodedEquipmentMemoryReductionPercent':round(100*(1-pixels/original),2),'packingPolicy':'Lossless alpha-bounds packing, offsets shared by all classes; no rescaling of weapons or bodies.'}
    (H/'runtime-integration-report.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8');print(json.dumps(result))
if __name__=='__main__':validate()
