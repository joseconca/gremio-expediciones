"""Preserve one generated action and export it against the canonical Novato pose."""
import argparse,copy,hashlib,json,runpy,shutil,subprocess,sys,tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];HD=ROOT/'assets/spritesheets/hd-128x256'

def write_progress(path,text):
    temporary=None
    try:
        with tempfile.NamedTemporaryFile(mode='w',encoding='utf-8',dir=path.parent,suffix='.tmp',delete=False) as saved:
            temporary=Path(saved.name)
            saved.write(text)
        temporary.replace(path)
    finally:
        if temporary is not None:temporary.unlink(missing_ok=True)
def register(class_id,sex,action,source,prompt_file,revision=None,frame_sources=None):
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
    # Select complete generated poses from revisions of this same action. Each
    # source uses the identical canonical transform: no painting, limb editing,
    # per-frame movement, resizing or equipment adjustment is performed here.
    for number, selected in (frame_sources or {}).items():
        if number not in range(1,5):raise ValueError('Selected frame must be 1..4')
        selected_dest=base/'source'/f'{action}-frame{number:02d}-reference{("-v"+str(revision)) if revision else ""}.png'
        if selected_dest.exists():
            if hashlib.sha256(selected_dest.read_bytes()).digest()!=hashlib.sha256(selected.read_bytes()).digest():raise ValueError('Different frame source exists; use --revision')
        else:shutil.copyfile(selected,selected_dest)
        exported=ROOT/'work'/'hd-frame-selection'/class_id/sex/action/f'{number:02d}'
        selection=normalize(selected_dest,exported,class_id,sex,action,reference_transform=reference)
        frame_name=f'{class_id}-{sex}-{action}-{number:02d}.png'
        shutil.copyfile(exported/frame_name,base/'frames'/action/frame_name)
        selection.update(sourcePath=selected_dest.relative_to(ROOT).as_posix(),selectedFrame=number,selectionPolicy='complete generated pose; unchanged canonical transform; no pixel retouching')
        metadata.setdefault('frameSourceOverrides',{})[f'{number:02d}']=selection
    previous=v.setdefault('sources',{}).get(action)
    if previous:
        history=previous.get('previousRevisions',[])
        if any(previous.get(key)!=metadata.get(key) for key in ('sourceSha256','sourcePath','frameSourceOverrides')):
            history=history+[{k:val for k,val in previous.items() if k!='previousRevisions'}]
        if history:metadata['previousRevisions']=history
    v['sources'][action]=metadata
    direction=v.get('artDirection',{})
    if revision is not None and direction.get('revision')==revision:
        metadata['artDirectionRevision']=revision
        direction['actionsToRework']=[a for a in direction.get('actionsToRework',[]) if a!=action]
    v['sourceStatus']='hires-library-in-progress'
    for n in range(1,5):
        selected=f'{n:02d}' in metadata.get('frameSourceOverrides',{})
        v.setdefault('frameProvenance',{})[f'{action}/{n:02d}']={'source':f'sources.{action}'+(f'.frameSourceOverrides.{n:02d}' if selected else ''),'frame':n}
    if action=='attack_sword':
        config=copy.deepcopy(ref['equipmentTests'][action])
        config['frames']=[{'bodySha256':hashlib.sha256((base/'frames'/action/f'{class_id}-{sex}-{action}-{n:02d}.png').read_bytes()).hexdigest()} for n in range(1,5)]
        v.setdefault('equipmentTests',{})[action]=config
    v['bodyRegistration']='Novato canonical transforms; equipment rig shared by sex'
    m['nextVariant']=class_id+'-'+sex
    tier=v['tier'];ordered=[c['name'] for c in sorted(m['classes'],key=lambda c:c['order']) if c['tier']==tier]
    m['nextTask']=f'Continue Tier {tier} in class order: '+', '.join(ordered)+'; male then female, 15 registered actions each, shared equipment contacts unchanged.'
    write_progress(path,json.dumps(m,ensure_ascii=False,indent=2)+'\n')
    for script,args in [('auditar-sprites-hd.py',['--write']),('ensamblar-progreso-spritesheet-hd.py',['--class-id',class_id,'--sex',sex])]:subprocess.run([sys.executable,str(ROOT/'scripts'/script),*args],cwd=ROOT,check=True)
    print(json.dumps({'class':class_id,'sex':sex,'action':action,'registration':metadata['scalePolicy']}))
if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--class-id',required=True);p.add_argument('--sex',choices=('m','f'),required=True);p.add_argument('--action',required=True);p.add_argument('--source',type=Path,required=True);p.add_argument('--prompt',type=Path,required=True);p.add_argument('--revision',type=int);p.add_argument('--frame-source',action='append',default=[],metavar='N=PATH',help='Select one complete generated pose from another revision, retaining the same canonical transform');a=p.parse_args()
    selected={}
    for value in a.frame_source:
        number,source_path=value.split('=',1);number=int(number)
        if number in selected:p.error('Duplicate selected frame')
        if number not in range(1,5):p.error('Selected frame must be 1..4')
        selected[number]=Path(source_path)
    register(a.class_id,a.sex,a.action,a.source,a.prompt,a.revision,selected)
