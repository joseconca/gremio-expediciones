"""Show heroes and enemies at exactly 1:1 pixels on the same ground line."""
from io import BytesIO
from pathlib import Path
import json
import subprocess
from PIL import Image, ImageDraw, ImageFont

ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/'assets/spritesheets/enemies-hd'

def old_file(path):
    return subprocess.check_output(['git','show','38617cab:'+path])

def main():
    font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',15)
    hero=Image.open(ROOT/'assets/spritesheets/hd-128x256/espadachin/m/frames/idle/espadachin-m-idle-01.png').convert('RGBA')
    hero_height=hero.getbbox()[3]-hero.getbbox()[1]
    ids=[('bandido_camino','Bandido'),('orco_despiadado','Orco'),('ogro','Ogro')]
    canvas=Image.new('RGBA',(960,3*350),'#242630')
    d=ImageDraw.Draw(canvas)
    rows=[]
    for row,(id,label) in enumerate(ids):
        path=f'assets/spritesheets/enemies-hd/{id}/frames/idle/{id}-idle-01.png'
        old=Image.open(BytesIO(old_file(path))).convert('RGBA')
        current=Image.open(ROOT/path).convert('RGBA')
        old_q=json.loads(old_file(f'assets/spritesheets/enemies-hd/{id}/qa-report.json'))
        q=json.loads((BASE/id/'qa-report.json').read_text(encoding='utf-8'))
        old_height=old.getbbox()[3]-old.getbbox()[1]
        height=current.getbbox()[3]-current.getbbox()[1]
        y=row*350
        d.text((8,y+5),'Mismos pixeles y misma linea de suelo; sin ajustar cada imagen a su recuadro',font=font,fill='white')
        for col,text in enumerate((f'Espadachin / {hero_height} px',f'Antes: {label} / {old_height} px',f'Ahora: {label} / {height} px')):
            d.text((col*320+8,y+30),text,font=font,fill='white')
            d.line((col*320+12,y+320,col*320+308,y+320),fill='#6d806b')
        canvas.alpha_composite(hero,(96,y+320-hero.getbbox()[3]))
        canvas.alpha_composite(old,(320+160-old.width//2,y+320-old_q.get('baselineY',old.getbbox()[3])))
        canvas.alpha_composite(current,(640+160-q['actorAnchor'][0],y+320-q['actorAnchor'][1]))
        rows.append({'enemy':id,'playerHeight':hero_height,'previousHeight':old_height,'newHeight':height,'scale':'1:1 pixels'})
    out=BASE/'previews'
    out.mkdir(exist_ok=True)
    canvas.convert('RGB').save(out/'scale-comparison.png')
    (out/'scale-comparison.json').write_text(json.dumps(rows,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(rows))

if __name__=='__main__':main()
