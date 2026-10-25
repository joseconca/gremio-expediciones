"""Preserve one generated action and export it against the canonical Novato pose."""
import argparse,copy,hashlib,json,runpy,shutil,subprocess,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];HD=ROOT/'assets/spritesheets/hd-128x256'
def register(class_id,sex,action,source,prompt_file,revision=None):
    path=HD/'manifest.json';m=json.loads(path.read_text(encoding='utf-8'))
    v=next(v for v in m['variants'] if v['classId']==class_id and v['sex']==sex)
    ref=next(v for v in m['variants'] if v['classId']=='novato' and v['sex']==sex)
    base=HD/class_id/sex;dest=base/'source'/(f'{action}-reference-v{revision}.png' if revision else f'{action}-reference.png');dest.parent.mkdir(parents=True,exist_ok=True)
    if dest.exists():
        if hashlib.sha256(dest.read_bytes()).digest()!=hashlib.sha256(source.read_bytes()).digest():raise ValueError('Different source already exists; use --revision')
    else:shutil.copyfile(source,dest)
    reference=ref.get('sources',{}).get(action)
    if reference is None:reference=m['equipmentRigs'][v['equipmentRigId']]['actions'].get(action,{}).get('poseExport')
    if reference is None:
        from PIL import Image
        row=Image.new('RGBA',(512,256))
        for n in range(4):
            with Image.open(HD/'novato'/sex/'frames'/action/f'novato-{sex}-{action}-{n+1:02d}.png') as im:row.alpha_composite(im.convert('RGBA'),(n*128,0))
        reference_path=HD/'novato'/sex/'previews'/f'pose-{action}.png';row.save(reference_path)
        reference={'sourceDimensions':[512,256],'commonCrop':[128,0,256,256],'scale':1,'origin':[0,0],'sourcePath':reference_path.relative_to(ROOT).as_posix()}
    normalize=runpy.run_path(str(ROOT/'scripts/normalizar-accion-hd.py'))['normalize']
    metadata=normalize(dest,base/'frames'/action,class_id,sex,action,reference_transform=reference)
    metadata.update(sourcePath=dest.relative_to(ROOT).as_posix(),generator='built-in imagegen',prompt=prompt_file.read_text(encoding='utf-8-sig'),canonicalPoseSource=reference['sourcePath'],canonicalPoseHashes=[ref['audit']['actions'][action]['frames'][f'{n:02d}']['sha256'] for n in range(1,5)],visualStatus='candidate-reviewed-equipment-contact-pending')
    v.setdefault('sources',{})[action]=metadata
    for n in range(1,5):v.setdefault('frameProvenance',{})[f'{action}/{n:02d}']={'source':f'sources.{action}','frame':n}
    if action=='attack_sword':
        config=copy.deepcopy(ref['equipmentTests'][action])
        config['frames']=[{'bodySha256':hashlib.sha256((base/'frames'/action/f'{class_id}-{sex}-{action}-{n:02d}.png').read_bytes()).hexdigest()} for n in range(1,5)]
        v.setdefault('equipmentTests',{})[action]=config
    v['bodyRegistration']='Novato canonical transforms; equipment rig shared by sex'
    m['nextVariant']=class_id+'-'+sex;m['nextTask']='Continue Tier 1 in class order: Mago, Espadachin, Acolito, Arquero; male then female, 15 registered actions each.'
    path.write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    for script,args in [('auditar-sprites-hd.py',['--write']),('ensamblar-progreso-spritesheet-hd.py',['--class-id',class_id,'--sex',sex])]:subprocess.run([sys.executable,str(ROOT/'scripts'/script),*args],cwd=ROOT,check=True)
    print(json.dumps({'class':class_id,'sex':sex,'action':action,'registration':metadata['scalePolicy']}))
if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--class-id',required=True);p.add_argument('--sex',choices=('m','f'),required=True);p.add_argument('--action',required=True);p.add_argument('--source',type=Path,required=True);p.add_argument('--prompt',type=Path,required=True);p.add_argument('--revision',type=int);a=p.parse_args();register(a.class_id,a.sex,a.action,a.source,a.prompt,a.revision)
