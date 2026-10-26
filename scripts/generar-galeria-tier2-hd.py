from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import json
root=Path.cwd()
base=root/'assets/spritesheets/hd-128x256'
manifest=json.loads((base/'manifest.json').read_text(encoding='utf-8'))
classes=['caballero','duelista','sacerdote','monje','cazador','explorador','elementalista','brujo']
names=['Caballero','Duelista','Sacerdote','Monje','Cazador','Explorador','Elementalista','Brujo']
variants=[(c,s,n) for c,n in zip(classes,names) for s in ['m','f']]
actions=manifest['technicalContract']['actions']
labels=['Reposo','Caminar','Daño','Consumible','Esquivar','Bloquear','Espada','Hacha','Lanza','Daga','Arco','Bastón','Maza','Libro','Guantes']
try: font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',15)
except OSError: font=ImageFont.load_default()
canvases=[]
for phase in range(1,5):
    canvas=Image.new('RGB',(2216,2890),(35,38,47));d=ImageDraw.Draw(canvas)
    d.text((12,8),'Tier 2 · 16 variantes · 15 acciones · 960 fotogramas · candidatos para revisión',font=font,fill='white')
    for col,(c,s,n) in enumerate(variants):
        x=104+col*132
        d.text((x+5,36),n+(' M' if s=='m' else ' F'),font=font,fill='white')
        for row,(action,label) in enumerate(zip(actions,labels)):
            y=70+row*187
            if col==0: d.text((5,y+77),label,font=font,fill=(205,210,220))
            im=Image.open(base/c/s/'frames'/action/f'{c}-{s}-{action}-{phase:02d}.png').convert('RGBA')
            canvas.paste(im.crop((0,72,128,256)),(x,y),im.crop((0,72,128,256)))
    canvases.append(canvas)
out=base/'previews';out.mkdir(exist_ok=True)
canvases[0].save(out/'tier2-overview.png')
canvases[0].save(out/'tier2-overview.gif',save_all=True,append_images=canvases[1:],duration=180,loop=0,disposal=2)
print('Created Tier 2 overview PNG/GIF')

