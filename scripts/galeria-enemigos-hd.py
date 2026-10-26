"""Create review galleries from the completed enemy frames, grouped by rank."""
from pathlib import Path
import json, math
from PIL import Image, ImageDraw, ImageFont

ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/'assets/spritesheets/enemies-hd'

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
            cycles[0].save(out/(stem+'.png'))
            cycles[0].save(out/(stem+'.gif'),save_all=True,append_images=cycles[1:],duration=220,loop=0,disposal=2)
            index.append({'group':group,'page':page,'enemies':[e['id'] for e in entries],'png':stem+'.png','gif':stem+'.gif','pixelScale':1})
    (out/'index.json').write_text(json.dumps(index,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'candidates':m.get('completedCandidates',0),'output':out.relative_to(ROOT).as_posix()}))

if __name__=='__main__':main()
