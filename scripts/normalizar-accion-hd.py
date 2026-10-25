#!/usr/bin/env python3
"""Extract four cells with ONE common crop/scale; retain original source bytes."""
import argparse,json,hashlib
from pathlib import Path
from PIL import Image

def normalize(source, output, class_id, sex, action, threshold=128):
    with Image.open(source) as opened:
        opened.load();im=opened.convert('RGBA')
    if im.width%4:raise ValueError('Source must have four equal-width cells')
    if im.getchannel('A').getextrema()[0]!=0:raise ValueError('Source needs real alpha')
    w=im.width//4;cells=[];boxes=[]
    for i in range(4):
        cell=im.crop((i*w,0,(i+1)*w,im.height))
        cell.putalpha(cell.getchannel('A').point(lambda v:0 if v<threshold else v))
        box=cell.getchannel('A').getbbox()
        if not box or box[0]==0 or box[2]==w:raise ValueError('Empty/clipped source cell')
        boxes.append(box);cells.append(cell)
    common=(min(b[0] for b in boxes),min(b[1] for b in boxes),max(b[2] for b in boxes),max(b[3] for b in boxes))
    cw,ch=common[2]-common[0],common[3]-common[1]
    scale=min(116/cw,232/ch)
    size=(round(cw*scale),round(ch*scale));origin=((128-size[0])//2,248-size[1])
    output.mkdir(parents=True,exist_ok=True)
    for n,cell in enumerate(cells,1):
        sprite=cell.crop(common).resize(size,Image.Resampling.LANCZOS)
        sprite.putalpha(sprite.getchannel('A').point(lambda v:0 if v<32 else v))
        frame=Image.new('RGBA',(128,256));frame.alpha_composite(sprite,origin)
        frame.save(output/f'{class_id}-{sex}-{action}-{n:02d}.png')
    return {'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'sourceDimensions':list(im.size),'commonCrop':list(common),'scale':scale,'origin':list(origin),'alphaThreshold':threshold,'method':'shared crop and scale, no per-frame centering or resizing'}

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--source',type=Path,required=True);p.add_argument('--output',type=Path,required=True)
    p.add_argument('--class-id',required=True);p.add_argument('--sex',choices=('m','f'),required=True);p.add_argument('--action',required=True)
    a=p.parse_args();print(json.dumps(normalize(a.source,a.output,a.class_id,a.sex,a.action)))
