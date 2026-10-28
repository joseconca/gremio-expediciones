"""Record measured canonical palm centers for the shared combat gloves."""
import copy
import json
import runpy
from pathlib import Path
from PIL import Image,ImageDraw

ROOT=Path(__file__).resolve().parents[1]
HD=ROOT/'assets/spritesheets/hd-128x256'
CHANGES=[
    ('m',1,'primary',[60,149],[65,140],[60,134,70,147]),
    ('m',3,'secondary',[80,142],[86,139],[82,132,91,148]),
    ('m',4,'primary',[60,149],[65,140],[60,134,70,147]),
    ('f',1,'primary',[60,149],[65,147],[61,141,71,154]),
    ('f',3,'secondary',[78,143],[43,145],[38,138,49,153]),
]

def main():
    path=HD/'equipment/manifest.json'
    m=json.loads(path.read_text(encoding='utf-8'))
    if m.get('sharedGripCorrection',{}).get('revision')==4:
        assert all(m['rigs'][s]['actions']['attack_gloves'][n-1][key]==new for s,n,key,old,new,roi in CHANGES)
        print('Shared glove palm correction revision 4 already applied.');return
    assert m['sharedGripCorrection']['revision']==3,'Review later rig revisions before applying this measurement'
    before=copy.deepcopy(m)
    for sex,frame,key,old,new,roi in CHANGES:
        config=m['rigs'][sex]['actions']['attack_gloves'][frame-1]
        assert config[key]==old
        body=Image.open(HD/f'novato/{sex}/frames/attack_gloves/novato-{sex}-attack_gloves-{frame:02d}.png').convert('RGBA')
        assert body.getpixel(tuple(new))[3]>=240
        config[key]=new
    relative='assets/spritesheets/hd-128x256/equipment/previews/shared-grip-correction-r4-before-after.png'
    render=runpy.run_path(str(ROOT/'scripts/ensamblar-equipo-hd.py'))
    proof=Image.new('RGB',(1536,1536),'#242630');draw=ImageDraw.Draw(proof)
    for group,sex in enumerate(('m','f')):
        for version,data in enumerate((before,m)):
            row=group*2+version
            for phase in range(4):
                body=Image.open(HD/f'novato/{sex}/frames/attack_gloves/novato-{sex}-attack_gloves-{phase+1:02d}.png').convert('RGBA')
                layer,config=render['frame_layer'](data,data['items']['guantes_lucha'],sex,'attack_gloves',phase)
                combined=render['composite'](body,layer,config).crop((128,144,256,264)).resize((384,360),Image.Resampling.NEAREST)
                proof.paste(combined,(phase*384,row*384+24),combined)
                draw.text((phase*384+5,row*384+5),f'{sex} phase {phase+1} - '+('before' if version==0 else 'after'),fill='white')
    proof.save(ROOT/relative)
    m.setdefault('sharedGripCorrectionHistory',[]).append(copy.deepcopy(m['sharedGripCorrection']))
    m['sharedGripCorrection']={
        'revision':4,'reason':'Combat glove pivots belong inside canonical closed palms, not wrist wraps or the forward elbow',
        'changes':[{'sex':s,'action':'attack_gloves','frame':n,'field':key,'previous':old,'corrected':new} for s,n,key,old,new,roi in CHANGES],
        'canonicalHandRegions':[{'sex':s,'action':'attack_gloves','frame':n,'field':key,'region':roi} for s,n,key,old,new,roi in CHANGES],
        'bodyPolicy':'Preserve all body artwork; one shared equipment rig per sex; no class offsets',
        'visualReference':relative,
    }
    write=runpy.run_path(str(ROOT/'scripts/registrar-accion-hd.py'))['write_progress']
    write(path,json.dumps(m,ensure_ascii=False,indent=2)+'\n')
    bodies=HD/'manifest.json';manifest=json.loads(bodies.read_text(encoding='utf-8'))
    manifest['equipmentCompositionRigRevision']=4
    write(bodies,json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'revision':4,'changedSharedContacts':len(CHANGES),'bodyFramesModified':0,'equipmentMustBeRendered':True}))

if __name__=='__main__':main()
