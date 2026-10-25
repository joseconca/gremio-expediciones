#!/usr/bin/env python3
"""Extract four cells with ONE common crop/scale; retain original source bytes."""
import argparse,json,hashlib
from pathlib import Path
from PIL import Image

def normalize(source, output, class_id, sex, action, threshold=128, fixed_scale=None):
    with Image.open(source) as opened:
        opened.load();im=opened.convert('RGBA')
    if im.width%4:raise ValueError('Source must have four equal-width cells')
    if im.getchannel('A').getextrema()[0]!=0:raise ValueError('Source needs real alpha')
    # Segment complete subjects before slicing: generated artwork may cross an
    # artificial quarter boundary while remaining fully intact in the source.
    from collections import deque
    alpha=im.getchannel('A').point(lambda v:255 if v>=threshold else 0)
    pixels=bytearray(alpha.tobytes());width,height=im.size;components=[]
    for seed in range(len(pixels)):
        if not pixels[seed]:continue
        pixels[seed]=0;todo=deque([seed]);indices=[]
        while todo:
            idx=todo.popleft();indices.append(idx);x=idx%width;y=idx//width
            for nxt in ((idx-1 if x else -1),(idx+1 if x+1<width else -1),(idx-width if y else -1),(idx+width if y+1<height else -1)):
                if nxt>=0 and pixels[nxt]:pixels[nxt]=0;todo.append(nxt)
        if len(indices)>1000:components.append(indices)
    components=sorted(components,key=len,reverse=True)[:4]
    if len(components)!=4:raise ValueError('Expected four separate complete subjects')
    components.sort(key=lambda ids:sum(n%width for n in ids)/len(ids))
    w=im.width//4;cells=[];boxes=[];padding=w
    for i,ids in enumerate(components):
        mask=bytearray(width*height)
        for n in ids:mask[n]=255
        layer=im.copy();layer.putalpha(Image.frombytes('L',im.size,bytes(mask)))
        fullbox=layer.getchannel('A').getbbox()
        if fullbox[0]==0 or fullbox[1]==0 or fullbox[2]==width or fullbox[3]==height:raise ValueError('Subject clipped at source edge')
        cell=layer.crop((i*w-padding,0,(i+1)*w+padding,height))
        box=cell.getchannel('A').getbbox()
        boxes.append(box);cells.append(cell)
    common=(min(b[0] for b in boxes),min(b[1] for b in boxes),max(b[2] for b in boxes),max(b[3] for b in boxes))
    cw,ch=common[2]-common[0],common[3]-common[1]
    scale=fixed_scale if fixed_scale is not None else min(116/cw,232/ch)
    if scale<=0 or cw*scale>116 or ch*scale>232:raise ValueError('Fixed scale clips the pose; revise artwork instead of shrinking the action')
    size=(round(cw*scale),round(ch*scale));origin=((128-size[0])//2,248-size[1])
    output.mkdir(parents=True,exist_ok=True)
    for n,cell in enumerate(cells,1):
        sprite=cell.crop(common).resize(size,Image.Resampling.LANCZOS)
        sprite.putalpha(sprite.getchannel('A').point(lambda v:0 if v<32 else v))
        frame=Image.new('RGBA',(128,256));frame.alpha_composite(sprite,origin)
        frame.save(output/f'{class_id}-{sex}-{action}-{n:02d}.png')
    return {'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'sourceDimensions':list(im.size),'commonCrop':list(common),'scale':scale,'origin':list(origin),'alphaThreshold':threshold,'method':'shared crop and scale, no per-frame centering or resizing','scalePolicy':'fixed-across-actions' if fixed_scale is not None else 'fit-action'}

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--source',type=Path,required=True);p.add_argument('--output',type=Path,required=True)
    p.add_argument('--class-id',required=True);p.add_argument('--sex',choices=('m','f'),required=True);p.add_argument('--action',required=True)
    p.add_argument('--fixed-scale',type=float,default=None,help='Use one reference scale across actions; reject clipping')
    a=p.parse_args();print(json.dumps(normalize(a.source,a.output,a.class_id,a.sex,a.action,fixed_scale=a.fixed_scale)))
