"""Create review galleries from the completed enemy frames, grouped by rank."""
from pathlib import Path
import json
from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/'assets/spritesheets/enemies-hd'

def main():
    m=json.loads((BASE/'manifest.json').read_text(encoding='utf-8'))
    out=BASE/'previews'
    out.mkdir(exist_ok=True)
    for group in ('I','II','III','IV','V','bosses'):
        items=[e for e in m['enemies'] if e['status']=='candidate' and (e['boss'] if group=='bosses' else not e['boss'] and e['rank']==group)]
        if not items:
            continue
        cycles=[]
        for phase in range(1,5):
            canvas=Image.new('RGB',(1024,52+len(items)*280),'#242630')
            d=ImageDraw.Draw(canvas)
            d.text((8,5),'Enemigos HD / '+('Jefes' if group=='bosses' else 'Rango '+group)+' / candidatos para revision',fill='white')
            for col,label in enumerate(('Reposo','Dano','Ataque','Esquiva')):
                d.text((col*256+8,28),label,fill='white')
            for row,e in enumerate(items):
                y=52+row*280
                d.text((8,y+3),e['name'],fill='white')
                for col,action in enumerate(m['actions']):
                    im=Image.open(BASE/e['id']/'frames'/action/f'{e["id"]}-{action}-{phase:02d}.png').convert('RGBA')
                    canvas.paste(im,(col*256,y+24),im)
            cycles.append(canvas)
        stem='enemies-'+group
        cycles[0].save(out/(stem+'.png'))
        cycles[0].save(out/(stem+'.gif'),save_all=True,append_images=cycles[1:],duration=220,loop=0,disposal=2)
    print(json.dumps({'candidates':m.get('completedCandidates',0),'output':out.relative_to(ROOT).as_posix()}))

if __name__=='__main__':main()
