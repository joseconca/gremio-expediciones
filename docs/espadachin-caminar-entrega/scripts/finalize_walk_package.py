from PIL import Image, ImageDraw
from pathlib import Path
import numpy as np, json, hashlib, zipfile, shutil

ROOT = Path(__file__).resolve().parents[1]
SPR = ROOT/'sprites'; PREV = ROOT/'previews'
SRC = ROOT/'source'/'concept_walk.png'
frames_report = {}
for sex in ('m','f'):
    cells=[]
    for i in range(1,5):
        p=SPR/f'espadachin-{sex}-walk-{i:02d}.png'
        im=Image.open(p).convert('RGBA')
        if im.size != (64,128): raise ValueError(f'{p.name}: bad cell size {im.size}')
        if im.getchannel('A').getextrema() != (0,255): raise ValueError(f'{p.name}: unexpected alpha')
        cells.append(im)
    rgba=Image.new('RGBA',(256,128),(0,0,0,0))
    for i,cell in enumerate(cells): rgba.alpha_composite(cell,(64*i,0))
    # 16-color indexed sheet plus a dedicated transparent index; fits the small native sprite scale.
    quant=rgba.convert('RGB').quantize(colors=16,method=Image.Quantize.MEDIANCUT,dither=Image.Dither.NONE)
    palette=quant.getpalette()[:16*3]+[255,0,255]
    palette += [0]*(768-len(palette)); quant.putpalette(palette)
    qpx=quant.load(); alpha=rgba.getchannel('A').load()
    for y in range(128):
        for x in range(256):
            if alpha[x,y] == 0: qpx[x,y]=16
    target=SPR/f'espadachin-{sex}-walk.png'
    quant.save(target,optimize=True,transparency=16)
    # Reopen the saved file and create the preview from the exact committed-format asset.
    final=Image.open(target).convert('RGBA')
    pv=Image.new('RGBA',(1024,512),(37,39,46,255)); d=ImageDraw.Draw(pv)
    for y in range(0,512,16):
        for x in range(0,1024,16):
            if ((x//16)+(y//16))%2: d.rectangle((x,y,x+15,y+15),fill=(50,52,60,255))
    pv.alpha_composite(final.resize((1024,512),Image.Resampling.NEAREST)); d=ImageDraw.Draw(pv)
    for x in (256,512,768): d.line((x,0,x,512),fill=(105,173,210,240),width=1)
    pv.convert('RGB').save(PREV/f'espadachin-{sex}-walk-preview.png',quality=95)
    aa=np.array(final.getchannel('A'))
    boxes=[]; diffs=[]
    for i in range(4):
        cell=final.crop((i*64,0,(i+1)*64,128))
        a=np.array(cell.getchannel('A')); ys,xs=np.where(a>0)
        boxes.append([int(xs.min()),int(ys.min()),int(xs.max()+1),int(ys.max()+1)])
    for i in range(3):
        diffs.append(int(np.abs(np.asarray(final.crop((i*64,0,(i+1)*64,128))).astype('int16')-
                                np.asarray(final.crop(((i+1)*64,0,(i+2)*64,128))).astype('int16')).sum()))
    frames_report[sex]={
      'path':target.name,'size_px':list(final.size),'mode_on_disk':Image.open(target).mode,
      'alpha_extrema':list(final.getchannel('A').getextrema()),'transparent_pixels':int((aa==0).sum()),
      'visible_bbox_per_frame':boxes,'adjacent_rgba_pixel_differences':diffs,
      'all_four_frames_different':len(set(hashlib.sha256(c.tobytes()).hexdigest() for c in [final.crop((i*64,0,(i+1)*64,128)) for i in range(4)]))==4,
      'file_bytes':target.stat().st_size,'sha256':hashlib.sha256(target.read_bytes()).hexdigest()
    }
report={
 'task':'Tier 1 Swordsman — Walk only',
 'source_concept':{'name':SRC.name,'size_px':list(Image.open(SRC).size)},
 'spec':{'strip_size':[256,128],'cell_size':[64,128],'frames':4,'columns':4,'rows':1,'transparent_background':True,'weapon_in_body':False,'view':'three-quarter, facing right'},
 'palette_note':'Indexed PNG, 16 opaque palette colors plus dedicated transparent index; reduced for compact runtime asset at native scale.',
 'status':'local QA package; not yet committed to GitHub or wired into active runtime spritesheets',
 'characters':frames_report
}
(ROOT/'qa-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
readme='''# Espadachín Tier 1 — Caminar\n\nEntrega de trabajo para revisar antes de integrar. Incluye cuatro fotogramas por sexo, con celdas 64×128 y tira 256×128. El PNG de cada tira usa una paleta indexada de 16 colores opacos más un índice transparente dedicado.\n\n- `sprites/espadachin-m-walk.png`: masculino, 4 fotogramas horizontales.\n- `sprites/espadachin-f-walk.png`: femenino, 4 fotogramas horizontales.\n- `sprites/espadachin-{m,f}-walk-01..04.png`: celdas de trabajo RGBA independientes.\n- `previews/`: ampliaciones nearest-neighbor de los PNG finales, con rejilla de celdas.\n- `source/concept_walk.png`: concepto original completo del que se aislaron los frames.\n- `finalize_walk_package.py`: normalización de paleta, previsualizaciones y validación.\n- `qa-report.json`: medidas, alfa, diferencias de fotogramas y SHA-256.\n\n**No se ha cambiado la hoja activa de runtime.** La versión de arte todavía no está registrada como PNG en GitHub; no debe integrarse hasta que el blob binario publicado tenga el mismo hash que el recurso local.\n\nLas armas se mantendrán fuera del cuerpo y se renderizarán por capas equipables en una fase posterior.\n'''
(ROOT/'README.md').write_text(readme,encoding='utf-8')
(ROOT/'source').mkdir(exist_ok=True)
shutil.copy2(SRC,ROOT/'source'/'concept_walk.png')
# Include the exact documented plan and current generator for reproducibility in the local review package.
shutil.copy2(Path(__file__).resolve().parents[1]/'scripts'/'extract_walk_frames.py',ROOT/'scripts'/'extract_walk_frames.py')
zip_path=ROOT.parent/'espadachin-caminar-entrega.zip'
with zipfile.ZipFile(zip_path,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
    for p in ROOT.rglob('*'):
        if p.is_file(): z.write(p,p.relative_to(ROOT.parent))
print(json.dumps(report,ensure_ascii=False,indent=2))
print('ZIP',zip_path,zip_path.stat().st_size)
