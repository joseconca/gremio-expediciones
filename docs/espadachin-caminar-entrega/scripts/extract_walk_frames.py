from PIL import Image, ImageDraw
from pathlib import Path
import numpy as np, json
src_path=Path(__file__).resolve().parents[1]/'source'/'concept_walk.png'
src=Image.open(src_path).convert('RGBA')
outdir=Path(__file__).resolve().parents[1]
(outdir/'sprites').mkdir(parents=True, exist_ok=True)
(outdir/'previews').mkdir(parents=True, exist_ok=True)
# Tight per-character crops inside the generated per-frame cells; excludes all panel labels/grid separators.
config={
 'm': {'label':'masculino','frames':[(132,248,306,442),(320,248,490,442),(512,248,682,442),(701,248,876,442)]},
 'f': {'label':'femenino','frames':[(129,703,293,871),(318,703,488,871),(508,703,676,871),(697,703,861,871)]},
}
report={'source':{'file':src_path.name,'size':list(src.size)},'frames':{},'criteria':{}}
for sex,cfg in config.items():
    frames=[]
    for i,box in enumerate(cfg['frames']):
        crop=src.crop(box)
        arr=np.array(crop).copy()
        # Strip low-alpha colored background glow and all background artifacts.
        arr[:,:,3][arr[:,:,3] < 96] = 0
        # Treat remaining source silhouette as hard-edged pixels after resampling.
        crop=Image.fromarray(arr,'RGBA')
        # Find the visible silhouette; ignore any non-character pixel cluster near the crop edges.
        mask=crop.getchannel('A').point(lambda p: 255 if p>=96 else 0)
        bbox=mask.getbbox()
        if not bbox: raise RuntimeError(f'empty sprite {sex} {i+1}')
        subject=crop.crop(bbox)
        # Normalize to the 64x128 runtime proportion: full-height heroic figure with cloak and limbs contained.
        rgb=subject.convert('RGB').resize((60,120),Image.Resampling.LANCZOS)
        rgb=rgb.quantize(colors=80,method=Image.Quantize.MEDIANCUT,dither=Image.Dither.NONE).convert('RGB')
        am=subject.getchannel('A').resize((60,120),Image.Resampling.LANCZOS)
        am=am.point(lambda p:255 if p>=128 else 0)
        cell=Image.new('RGBA',(64,128),(0,0,0,0))
        cell.paste(rgb,(2,4))
        ac=Image.new('L',(64,128),0); ac.paste(am,(2,4)); cell.putalpha(ac)
        cell.save(outdir/'sprites'/f'espadachin-{sex}-walk-{i+1:02d}.png',optimize=True)
        frames.append(cell)
        a=np.asarray(cell.getchannel('A')); ys,xs=np.where(a>0)
        report['frames'][f'{sex}-{i+1}']={
          'source_crop':list(box),'subject_bbox':list(bbox),'native_bbox':[int(xs.min()),int(ys.min()),int(xs.max()+1),int(ys.max()+1)],
          'visible_pixels':int((a>0).sum()),'opaque_pixels':int((a==255).sum()),'unique_rgb_colors':len(cell.convert('RGB').getcolors(64*128) or [])
        }
    strip=Image.new('RGBA',(256,128),(0,0,0,0))
    for i,frame in enumerate(frames): strip.alpha_composite(frame,(64*i,0))
    path=outdir/'sprites'/f'espadachin-{sex}-walk.png'; # Runtime-friendly indexed PNG: 31 opaque colors plus a dedicated transparent palette index.
    rgbq=strip.convert('RGB').quantize(colors=31,method=Image.Quantize.MEDIANCUT,dither=Image.Dither.NONE)
    p_strip=rgbq.copy()
    pal=rgbq.getpalette()[:31*3]
    pal += [255,0,255]
    pal += [0]*(768-len(pal))
    p_strip.putpalette(pal)
    pix=p_strip.load(); aa=strip.getchannel('A').load()
    for yy in range(128):
      for xx in range(256):
        if aa[xx,yy] == 0: pix[xx,yy]=31
    p_strip.save(path,optimize=True,transparency=31)
    preview=Image.new('RGBA',(1024,512),(37,39,46,255)); d=ImageDraw.Draw(preview)
    for yy in range(0,512,16):
      for xx in range(0,1024,16):
       if ((xx//16)+(yy//16))%2: d.rectangle((xx,yy,xx+15,yy+15),fill=(50,52,60,255))
    preview.alpha_composite(strip.resize((1024,512),Image.Resampling.NEAREST))
    d=ImageDraw.Draw(preview)
    for x in [256,512,768]: d.line((x,0,x,512),fill=(105,173,210,240),width=1)
    preview.convert('RGB').save(outdir/'previews'/f'espadachin-{sex}-walk-preview.png',quality=95)
    arr=np.asarray(strip)
    framehash=[]
    for i,frame in enumerate(frames):
      framehash.append(int(np.asarray(frame.convert('RGB')).astype('int16').sum()))
    diff=[]
    for i in range(3):
      aa=np.asarray(frames[i]).astype('int16'); bb=np.asarray(frames[i+1]).astype('int16')
      diff.append(int(np.abs(aa-bb).sum()))
    report['criteria'][sex]={'strip_size':list(strip.size),'mode':strip.mode,'alpha_extrema':list(strip.getchannel('A').getextrema()),'strip_bytes':path.stat().st_size,'frame_count':len(frames),'adjacent_frame_pixel_diffs':diff,'all_frames_different':len(set(framehash))==4}
(outdir/'qa-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(report,ensure_ascii=False,indent=2))
