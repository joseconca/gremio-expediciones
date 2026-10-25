"""Preserve a generated equipment master and downsample it once for shared rigs."""
import argparse,json,hashlib,shutil
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/'assets/spritesheets/hd-128x256/equipment'
LENGTHS={'sword':90,'axe':100,'spear':154,'dagger':46,'staff':124,'bow':104,'mace':78,'book':42,'gloves':19,'shield':54,'consumable':22,'arrow':76}
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def register(metadata):
    BASE.mkdir(parents=True,exist_ok=True)
    path=BASE/'manifest.json'
    m=json.loads(path.read_text(encoding='utf-8')) if path.exists() else {'schemaVersion':1,'status':'equipment-production-in-progress','generator':'built-in imagegen','canvas':[384,384],'bodyOrigin':[128,64],'bodyCell':[128,256],'classes':['novato','mago','espadachin','acolito','arquero'],'classSpecificTransformsAllowed':False,'items':{}}
    item_id=metadata['id'];family=metadata['family'];source=Path(metadata['source'])
    revision=metadata.get('revision')
    dest=BASE/item_id/'source'/('master-v'+str(revision)+'.png' if revision else 'master.png');dest.parent.mkdir(parents=True,exist_ok=True)
    if dest.exists() and sha(dest)!=sha(source):raise ValueError('Original exists; preserve it and use a revision')
    if source.resolve()!=dest.resolve():shutil.copyfile(source,dest)
    im=Image.open(dest).convert('RGBA');alpha=im.getchannel('A')
    box=alpha.point(lambda a:255 if a>=128 else 0).getbbox()
    if box is None:raise ValueError('Empty generated master')
    im.putalpha(alpha.point(lambda a:a if a>=32 else 0))
    # Crop and uniform downsampling are mechanical export; retain original bytes.
    box=(max(0,box[0]-2),max(0,box[1]-2),min(im.width,box[2]+2),min(im.height,box[3]+2))
    cut=im.crop(box);length=154 if family=='axe' and metadata['hands']==2 else LENGTHS[family]
    scale=length/(cut.width if family in ('book','arrow') else cut.height)
    size=(max(1,round(cut.width*scale)),max(1,round(cut.height*scale)))
    master=cut.resize(size,Image.Resampling.LANCZOS)
    master.putalpha(master.getchannel('A').point(lambda a:a if a>=32 else 0))
    target=BASE/item_id/'master.png';master.save(target)
    grip_fraction={'sword':(.5,.86),'axe':(.5,.57 if metadata['hands']==2 else .81),'spear':(.5,.70),'dagger':(.5,.83),'staff':(.5,.72),'bow':(.18,.5),'mace':(.5,.82),'book':(.5,.92),'gloves':(.5,.40),'shield':(.5,.50),'consumable':(.5,.26),'arrow':(.10,.5)}[family]
    grip=[round((size[0]-1)*grip_fraction[0]),round((size[1]-1)*grip_fraction[1])]
    item={k:v for k,v in metadata.items() if k!='source'}
    item.update(sourcePath=dest.relative_to(ROOT).as_posix(),sourceSha256=sha(dest),sourceDimensions=list(Image.open(dest).size),masterPath=target.relative_to(ROOT).as_posix(),masterSha256=sha(target),masterDimensions=list(size),sourceCrop=list(box),scale=scale,alphaFloor=32,grip=grip,status='master-candidate-contact-review-pending')
    previous=m['items'].get(item_id)
    if previous and revision:
        item['previousMasters']=previous.get('previousMasters',[])+[{k:v for k,v in previous.items() if k not in ('previousMasters','sheets')}]
    m['items'][item_id]=item
    path.write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'item':item_id,'master':size,'grip':grip}))
if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('metadata',type=Path);args=p.parse_args()
    register(json.loads(args.metadata.read_text(encoding='utf-8-sig')))
