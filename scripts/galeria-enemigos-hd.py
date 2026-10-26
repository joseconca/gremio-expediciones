"""Create review galleries from the completed enemy frames, grouped by rank."""
from pathlib import Path
import json, math
import html
import os, tempfile, time
from PIL import Image, ImageDraw, ImageFont

ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/'assets/spritesheets/enemies-hd'

def save_image(im,path,**kwargs):
    with tempfile.NamedTemporaryFile(dir=path.parent,suffix=path.suffix,delete=False) as opened:
        temp=Path(opened.name)
    try:
        im.save(temp,**kwargs)
        for attempt in range(5):
            try:
                os.replace(temp,path)
                break
            except OSError:
                if attempt==4:raise
                time.sleep(.2)
    finally:
        if temp.exists():temp.unlink()

def main():
    m=json.loads((BASE/'manifest.json').read_text(encoding='utf-8'))
    out=BASE/'previews'
    out.mkdir(exist_ok=True)
    font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',15)
    index=[]
    for group in ('I','II','III','IV','V','bosses'):
        items=[e for e in m['enemies'] if e['status']=='candidate' and (e['boss'] if group=='bosses' else not e['boss'] and e['rank']==group)]
        if not items:
            continue
        for page,start in enumerate(range(0,len(items),4),1):
            entries=items[start:start+4]
            reports={e['id']:json.loads((ROOT/e['report']).read_text(encoding='utf-8')) for e in entries}
            up=max(q['baselineY']-min(f['bounds'][1] for records in q['frameData'].values() for f in records) for q in reports.values())
            down=max(max(f['bounds'][3] for records in q['frameData'].values() for f in records)-q['baselineY'] for q in reports.values())
            stage=max(max(q['cellSize'][0] for q in reports.values()),math.ceil((up+down+32)/64)*64)
            floor=stage-16-down
            cycles=[]
            for phase in range(1,5):
                canvas=Image.new('RGB',(stage*4,52+len(entries)*(stage+24)),'#242630')
                d=ImageDraw.Draw(canvas)
                d.text((8,5),'Enemigos HD / '+('Jefes' if group=='bosses' else 'Rango '+group)+f' / pagina {page} / escala 1:1',font=font,fill='white')
                for col,label in enumerate(('Reposo','Daño','Ataque','Esquiva')):
                    d.text((col*stage+8,28),label,font=font,fill='white')
                for row,e in enumerate(entries):
                    y=52+row*(stage+24)
                    q=reports[e['id']]
                    d.text((8,y+3),e['name'],font=font,fill='white')
                    for col,action in enumerate(m['actions']):
                        with Image.open(BASE/e['id']/'frames'/action/f'{e["id"]}-{action}-{phase:02d}.png') as opened:
                            im=opened.convert('RGBA')
                        canvas.paste(im,(col*stage+stage//2-q['actorAnchor'][0],y+24+floor-q['baselineY']),im)
                cycles.append(canvas)
            stem='enemies-'+group+('' if page==1 else f'-{page:02d}')
            save_image(cycles[0],out/(stem+'.png'))
            save_image(cycles[0],out/(stem+'.gif'),save_all=True,append_images=cycles[1:],duration=220,loop=0,disposal=2)
            index.append({'group':group,'page':page,'enemies':[e['id'] for e in entries],'png':stem+'.png','gif':stem+'.gif','pixelScale':1})
    (out/'index.json').write_text(json.dumps(index,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    options=''.join(f'<option value="{html.escape(p["gif"])}">{html.escape(("Jefes" if p["group"]=="bosses" else "Rango "+p["group"])+" · página "+str(p["page"]))}</option>' for p in index)
    review='''<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Enemigos · revisión de animaciones</title>
<style>body{margin:0;background:#242630;color:#eee;font:16px system-ui}header{position:sticky;top:0;background:#171923;padding:18px;display:flex;gap:12px;align-items:center;flex-wrap:wrap}h1{font-size:20px;margin:0}select,button{font:inherit;padding:8px;border:1px solid #6b7188;border-radius:6px;background:#303447;color:white}p{margin:0;color:#c5cad8;font-size:14px}main{overflow:auto}img{display:block;max-width:100%;height:auto}.real img{max-width:none}</style>
<header><h1>Enemigos revisados</h1><select aria-label="Grupo y página">OPTIONS</select><button id="previous" aria-label="Página anterior">←</button><button id="next" aria-label="Página siguiente">→</button><button id="scale">Tamaño real</button><p>ENEMY_COUNT enemigos · reposo, daño, ataque y esquiva · pendientes de aprobación visual</p></header>
<main><img alt="Cuatro animaciones por enemigo, con escala común entre especies"></main>
<script>const s=document.querySelector('select'),im=document.querySelector('img');function show(){im.src=s.value}function move(n){s.selectedIndex=(s.selectedIndex+n+s.length)%s.length;show()}s.onchange=show;document.querySelector('#previous').onclick=()=>move(-1);document.querySelector('#next').onclick=()=>move(1);document.querySelector('#scale').onclick=e=>{const real=document.body.classList.toggle('real');e.target.textContent=real?'Ajustar a pantalla':'Tamaño real'};show()</script></html>'''.replace('OPTIONS',options).replace('ENEMY_COUNT',str(m.get('completedCandidates',0)))
    (out/'revision.html').write_text(review,encoding='utf-8')
    if m.get('artApproval',{}).get('status')=='approved':
        (out/'revision.html').write_text(review.replace('pendientes de aprobación visual','arte aprobado · integrado en la rama de trabajo'),encoding='utf-8')
    print(json.dumps({'candidates':m.get('completedCandidates',0),'output':out.relative_to(ROOT).as_posix()}))

if __name__=='__main__':main()
