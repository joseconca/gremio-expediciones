"""Publish only validated HD runtime atlases and compact composition metadata."""
import json,hashlib,shutil
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1];HD=ROOT/'assets/spritesheets/hd-128x256';OUT=ROOT/'public/sprites/hd-v1'
def copy_verified(source,target,digest=None):
    raw=source.read_bytes()
    if digest and hashlib.sha256(raw).hexdigest()!=digest:raise ValueError('Source hash changed: '+str(source))
    Image.open(source).verify();target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(source,target)
def promote():
    m=json.loads((HD/'equipment/manifest.json').read_text(encoding='utf-8'))
    qa=json.loads((HD/'equipment/validation-report.json').read_text(encoding='utf-8'))
    if qa['status']!='passed' or qa['bodyFramesUnchanged']!=600:raise ValueError('Validate equipment before promotion')
    result={'version':'hd-v1','classes':m['classes'],'actions':m['actions'],'timings':{s:r['timings'] for s,r in m['rigs'].items()},'items':{},'compositions':{}}
    for c in m['classes']:
        for s in ('m','f'):
            sheet=HD/c/s/f'{c}-{s}-sheet.png'
            if Image.open(sheet).size!=(512,3840):raise ValueError('Incomplete body atlas')
            body_qa=json.loads((HD/c/s/'qa-report.json').read_text(encoding='utf-8'))
            if body_qa['status']!='passed':raise ValueError('Body atlas not validated')
            copy_verified(sheet,OUT/'heroes'/c/f'{s}-sheet.png',body_qa['sheetSha256'])
            idle=HD/c/s/'frames/idle'/f'{c}-{s}-idle-01.png'
            copy_verified(idle,OUT/'heroes'/c/f'{s}-idle.png',m['renderPolicy']['bodyFrameHashes'][c+'-'+s]['idle']['01'])
            # Static cards have no equipment margin. A fixed shared calibration
            # fills the portrait and keeps faces visible in existing avatar crops.
            portrait=Image.new('RGBA',(128,256))
            portrait.alpha_composite(Image.open(idle).convert('RGBA').resize((179,358),Image.Resampling.LANCZOS),(-26,-99))
            portrait.save(OUT/'heroes'/c/f'{s}-portrait.png')
    for key,item in m['items'].items():
        group=item['family']+str(item['hands']);shapes={};packed={}
        for s in ('m','f'):
            entry=item['sheets'][s]
            if hashlib.sha256((ROOT/entry['path']).read_bytes()).hexdigest()!=entry['sha256']:raise ValueError('Equipment atlas changed')
            frames=[]
            for action,records in entry['actions'].items():
                for n,record in enumerate(records):
                    frame=Image.open(ROOT/record['path']).convert('RGBA')
                    if hashlib.sha256((ROOT/record['path']).read_bytes()).hexdigest()!=record['sha256']:raise ValueError('Equipment frame changed')
                    box=frame.getbbox() or (0,0,1,1);frames.append((action,n,frame,box))
            cw=max(b[2]-b[0] for _,_,_,b in frames);ch=max(b[3]-b[1] for _,_,_,b in frames)
            atlas=Image.new('RGBA',(cw*4,ch*(len(frames)//4)));packed[s]={}
            for index,(action,n,frame,box) in enumerate(frames):
                x=(index%4)*cw;y=(index//4)*ch;cut=frame.crop(box);atlas.paste(cut,(x,y))
                packed[s].setdefault(action,[]).append({'source':[x,y,cut.width,cut.height],'offset':[box[0],box[1]]})
            target=OUT/'equipment'/key/f'{s}-sheet.png';target.parent.mkdir(parents=True,exist_ok=True);atlas.save(target)
            shapes[s]={a:[{k:f['config'][k] for k in ('depth','contacts','restoreHands','handMaskRadius')} for f in frames] for a,frames in entry['actions'].items()}
        if group in result['compositions'] and result['compositions'][group]!=shapes:raise ValueError('Different contacts within equipment family')
        result['compositions'][group]=shapes
        result['items'][key]={'family':item['family'],'hands':item['hands'],'composition':group,'actions':list(item['sheets']['m']['actions']),'frames':packed}
    target=ROOT/'src/lib/generated/sprites-hd.json';target.parent.mkdir(parents=True,exist_ok=True);target.write_text(json.dumps(result,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8')
    print('Promoted 10 body atlases, 10 idle frames, 10 calibrated portraits and 56 shared equipment atlases.')
if __name__=='__main__':promote()
