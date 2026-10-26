"""Compare anatomy at fixed combat scale, isolating the style revision."""
from pathlib import Path
from io import BytesIO
import json, subprocess
from PIL import Image,ImageDraw,ImageFont

ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/'assets/spritesheets/enemies-hd'

def main():
    font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',16)
    hero=Image.open(ROOT/'assets/spritesheets/hd-128x256/espadachin/m/frames/idle/espadachin-m-idle-01.png').convert('RGBA')
    canvas=Image.new('RGBA',(960,720),'#242630');d=ImageDraw.Draw(canvas)
    for row,(id,name) in enumerate((('bandido_camino','Bandido'),('goblin_explorador','Goblin'))):
        y=row*360
        p=f'assets/spritesheets/enemies-hd/{id}/frames/idle/{id}-idle-01.png'
        old=Image.open(BytesIO(subprocess.check_output(['git','show','0684dea2:'+p]))).convert('RGBA')
        oldq=json.loads(subprocess.check_output(['git','show',f'0684dea2:assets/spritesheets/enemies-hd/{id}/qa-report.json']))
        current=Image.open(ROOT/p).convert('RGBA')
        q=json.loads((BASE/id/'qa-report.json').read_text(encoding='utf-8'))
        for col,label in enumerate(('Personaje jugable','Antes: '+name,'Ahora: '+name)):
            d.text((col*320+12,y+12),label,font=font,fill='white')
            d.line((col*320+12,y+330,col*320+308,y+330),fill='#6d806b')
        d.text((12,y+42),'Escala 1:1; misma altura antes y despues',font=font,fill='#cbd2db')
        canvas.alpha_composite(hero,(96,y+330-hero.getbbox()[3]))
        canvas.alpha_composite(old,(480-oldq['actorAnchor'][0],y+330-oldq['actorAnchor'][1]))
        canvas.alpha_composite(current,(800-q['actorAnchor'][0],y+330-q['actorAnchor'][1]))
    canvas.convert('RGB').save(BASE/'previews/style-comparison.png')
    print('Created fixed-scale style comparison')

if __name__=='__main__':main()
