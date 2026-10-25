"""Verify every shared HD equipment atlas, source, frame and body contact."""
import json,hashlib,runpy
from io import BytesIO
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1];HD=ROOT/'assets/spritesheets/hd-128x256';BASE=HD/'equipment'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def png(path,expected=None):
    data=path.read_bytes()
    if expected and hashlib.sha256(data).hexdigest()!=expected:raise ValueError('SHA mismatch: '+str(path))
    Image.open(BytesIO(data)).verify();im=Image.open(BytesIO(data));im.load()
    if im.mode!='RGBA':raise ValueError('Expected RGBA: '+str(path))
    return im
def validate_contract(m):
    if m['canvas']!=[384,384] or m['bodyOrigin']!=[128,64]:raise ValueError('Shared origin/canvas changed')
    if m['classSpecificTransformsAllowed']:raise ValueError('Class-specific transforms forbidden')
    for sex,rig in m['rigs'].items():
        if rig['sex']!=sex:raise ValueError('Rig sex mismatch')
        if set(rig['actions'])!=set(m['actions']):raise ValueError('Missing action rig')
        for rows in rig['actions'].values():
            if len(rows)!=4:raise ValueError('Expected four synchronized contacts')
            for frame in rows:
                if any(k in frame for k in ('classId','classOffsets','classScale','offsetsByClass')):raise ValueError('Class-specific transform forbidden')
    for item in m['items'].values():
        if any(k in item for k in ('classId','classOffsets','classScale','offsetsByClass')):raise ValueError('Class-specific transform forbidden')
def validate():
    m=json.loads((BASE/'manifest.json').read_text(encoding='utf-8'));validate_contract(m)
    renderer=runpy.run_path(str(ROOT/'scripts/ensamblar-equipo-hd.py'))
    expected={p.stem for p in (ROOT/'public/sprites/items/weapons').glob('*.png')}|{'escudo_guardian','escudo_madera','pocion','flecha_comun'}
    if set(m['items'])!=expected:raise ValueError('Equipment catalog incomplete')
    counts={'items':len(expected),'originals':0,'sharedSheets':0,'equipmentFrames':0,'bodyContacts':0,'bodyFramesUnchanged':0,'mirroredFrames':0}
    for key,item in m['items'].items():
        for source in [item]+item.get('previousMasters',[]):png(ROOT/source['sourcePath'],source['sourceSha256']);counts['originals']+=1
        master=png(ROOT/item['masterPath'],item['masterSha256'])
        if list(master.size)!=item['masterDimensions']:raise ValueError('Master dimensions changed')
        for sex in ['m','f']:
            entry=item['sheets'][sex];sheet=png(ROOT/entry['path'],entry['sha256']);counts['sharedSheets']+=1
            if list(sheet.size)!=m['sheetDimensions']:raise ValueError('Wrong sheet dimensions')
            if set(entry['actions'])!=set(renderer['active_actions'](item)):raise ValueError('Active rows incomplete')
            for row,action in enumerate(m['actions']):
                if action not in entry['actions']:
                    if sheet.crop((0,row*384,1536,(row+1)*384)).getchannel('A').getbbox():raise ValueError('Inactive equipment row must be transparent')
                    continue
                for n,frame in enumerate(entry['actions'][action]):
                    layer=png(ROOT/frame['path'],frame['sha256']);counts['equipmentFrames']+=1
                    crop=sheet.crop((n*384,row*384,(n+1)*384,(row+1)*384))
                    if crop.tobytes()!=layer.tobytes():raise ValueError('Atlas differs from frame: '+frame['path'])
                    regenerated,config=renderer['frame_layer'](m,item,sex,action,n)
                    if regenerated.tobytes()!=layer.tobytes() or config!=frame['config']:raise ValueError('Atlas no longer matches canonical rig')
                    box=layer.getchannel('A').getbbox()
                    if box and (box[0]<=0 or box[1]<=0 or box[2]>=384 or box[3]>=384):raise ValueError('Clipped equipment')
                    mirrored=layer.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
                    if mirrored.transpose(Image.Transpose.FLIP_LEFT_RIGHT).tobytes()!=layer.tobytes():raise ValueError('Mirroring loses pixels')
                    counts['mirroredFrames']+=1
                    for point in config['contacts']:
                        if point==config['primary'] or item['family'] in ('spear','axe','staff','gloves'):
                            x,y=renderer['body_point'](point)
                            if layer.getchannel('A').crop((x-3,y-3,x+4,y+4)).getextrema()[1]<32:raise ValueError(f'Weapon misses a grip: {key} {sex} {action} {n+1} {point}')
                        for c in m['classes']:
                            body=Image.open(HD/c/sex/'frames'/action/f'{c}-{sex}-{action}-{n+1:02d}.png').convert('RGBA');x,y=point
                            if body.getchannel('A').crop((max(0,x-3),max(0,y-3),min(128,x+4),min(256,y+4))).getextrema()[1]<128:raise ValueError(f'Grip outside body: {c} {sex} {action} {n+1} {point}')
                            counts['bodyContacts']+=1
    for key,actions in m['renderPolicy']['bodyFrameHashes'].items():
        c,sex=key.rsplit('-',1)
        for action,frames in actions.items():
            for n,expected_hash in frames.items():
                path=HD/c/sex/'frames'/action/f'{c}-{sex}-{action}-{n}.png'
                if sha(path)!=expected_hash:raise ValueError('Approved body changed: '+str(path))
                counts['bodyFramesUnchanged']+=1
    result={'status':'passed',**counts,'classSpecificTransforms':False}
    (BASE/'validation-report.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(result));return result
if __name__=='__main__':validate()
