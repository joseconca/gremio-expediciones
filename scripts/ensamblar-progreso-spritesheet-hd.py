#!/usr/bin/env python3
"""Generate review previews for any variant; never modifies runtime or approvals."""
import argparse
import runpy
from pathlib import Path
from PIL import Image, ImageDraw
ROOT=Path(__file__).resolve().parents[1]
API=runpy.run_path(str(ROOT/'scripts/auditar-sprites-hd.py'))

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--class-id',default='novato')
    p.add_argument('--sex',choices=('m','f'),default='m')
    args=p.parse_args()
    if not args.class_id.replace('_','').isalnum(): p.error('invalid class id')
    base=ROOT/'assets/spritesheets/hd-128x256'/args.class_id/args.sex
    audit=API['audit_variant'](base,args.class_id,args.sex)
    out=base/'previews';out.mkdir(exist_ok=True,parents=True)
    sheet=Image.new('RGBA',(512,3840))
    actions=audit['technicalActions']
    contact=Image.new('RGB',(512,max(1,len(actions))*280),'#242630')
    draw=ImageDraw.Draw(contact)
    for n,action in enumerate(actions):
        row=API['ACTIONS'].index(action);cycle=[]
        for i in range(4):
            with Image.open(base/'frames'/action/f'{args.class_id}-{args.sex}-{action}-{i+1:02d}.png') as im:
                frame=im.convert('RGBA')
            sheet.alpha_composite(frame,(i*128,row*256))
            contact.paste(frame,(i*128,n*280+24),frame)
            bg=Image.new('RGBA',(128,256),'#242630');bg.alpha_composite(frame);cycle.append(bg.convert('RGB'))
        draw.text((8,n*280+6),action+' / visual review pending',fill='white')
        cycle[0].save(out/f'{action}.gif',save_all=True,append_images=cycle[1:],duration=180 if action!='idle' else 300,loop=0)
    sheet.save(out/f'{args.class_id}-{args.sex}-sheet-progress.png')
    contact.save(out/'contact.png')
    # No second state file: all technical progress is in the sole manifest.
    (out/f'{args.class_id}-{args.sex}-sheet-progress.json').unlink(missing_ok=True)
    print('Preview rows: '+', '.join(actions))

if __name__=='__main__':main()
