"""Create a review gallery of existing generated equipment; no game integration."""
import json,html
from pathlib import Path
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[1];BASE=ROOT/'assets/spritesheets/hd-128x256/equipment'
def build():
    m=json.loads((BASE/'manifest.json').read_text(encoding='utf-8'));out=BASE/'previews';out.mkdir(exist_ok=True)
    actions={'sword':'attack_sword','axe':'attack_axe','spear':'attack_spear','dagger':'attack_dagger','bow':'attack_bow','staff':'attack_staff','mace':'attack_mace','book':'attack_book','gloves':'attack_gloves','shield':'block_shield','consumable':'use_consumable','arrow':'attack_bow'}
    catalog=Image.new('RGB',(1400,4*224+48),'#242630');d=ImageDraw.Draw(catalog)
    d.text((16,15),'Equipo HD / 24 armas, 2 escudos, pocion y flecha / originales nuevos conservados',fill='white')
    rows=['# Equipo HD compartido','', 'Novato, Mago, Espadachín, Acólito y Arquero usan las mismas capas por sexo. Cada comparativa sigue este orden de clases. Cuatro fases por acción.','', '**56 hojas compartidas, 1104 fotogramas de equipo.** Celdas de 384×384; el cuerpo de 128×256 conserva su escala y se coloca en (128,64). Las filas incompatibles con un objeto son transparentes. El juego sigue pendiente de integración.','', '![Catálogo de arte](catalogo.png)','', 'Abre `galeria.html` en un navegador para elegir objeto, sexo y acción, detener la animación, ampliar o reflejar la imagen. Las previews son composiciones para revisión; las capas reutilizables están en las carpetas de cada objeto.','', '| Objeto | Contacto masculino | Animación masculina | Contacto femenino | Animación femenina |','|---|---|---|---|---|']
    options=[];data={}
    for n,(key,item) in enumerate(m['items'].items()):
        x=(n%7)*200;y=(n//7)*224+48
        original=Image.open(ROOT/item['sourcePath']).convert('RGBA').crop(item['sourceCrop']);original.thumbnail((164,174),Image.Resampling.LANCZOS)
        catalog.paste(original,(x+(200-original.width)//2,y+4),original);d.text((x+8,y+190),key,fill='white')
        a=actions[item['family']];rows.append(f'| {key} | [PNG]({key}/m/{a}.png) | [GIF]({key}/m/{a}.gif) | [PNG]({key}/f/{a}.png) | [GIF]({key}/f/{a}.gif) |')
        options.append(f'<option value="{html.escape(key)}">{html.escape(key.replace("_"," "))}</option>')
        data[key]={'main':a,'actions':list(item['sheets']['m']['actions'])}
    catalog.save(out/'catalogo.png');(out/'README.md').write_text('\n'.join(rows)+'\n',encoding='utf-8')
    page='''<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Equipo HD · revisión</title>
<style>body{margin:0;background:#242630;color:#f4eee4;font:16px system-ui}main{padding:24px}h1{font-size:26px}p{max-width:920px;line-height:1.5;color:#c8c8d0}nav{display:flex;gap:14px;align-items:center;flex-wrap:wrap;padding:16px 0}label{display:flex;gap:8px;align-items:center}select,button{font:inherit;border:1px solid #727582;border-radius:7px;padding:8px;background:#343743;color:white}#view{overflow:auto;border:1px solid #494d5b;border-radius:12px}#preview{display:block;transform-origin:center}small{display:block;margin:14px 0;color:#c8c8d0}</style>
<main><h1>Equipo HD compartido</h1><p>La misma arma sobre Novato, Mago, Espadachín, Acólito y Arquero. Elige una animación o revisa sus cuatro fases en la hoja de contacto. Los cuerpos conservan su escala. La incorporación al juego queda para el siguiente paso.</p>
<nav><label>Objeto <select id="item">OPTIONS</select></label><label>Sexo <select id="sex"><option value="m">Masculino</option><option value="f">Femenino</option></select></label><label>Acción <select id="action"></select></label><label><input type="checkbox" id="animated" checked>Animar</label><label><input type="checkbox" id="flip">Reflejar imagen</label><label>Escala <select id="zoom"><option value="0.75">75 %</option><option value="1" selected>100 %</option><option value="1.5">150 %</option><option value="2">200 %</option></select></label></nav>
<small id="caption"></small><div id="view"><img id="preview" alt="Comparativa del mismo equipo en las cinco clases"></div><p><a href="catalogo.png" style="color:#e9c37f">Ver catálogo completo de arte</a> · Al reflejar se invierte toda la imagen, incluidos los rótulos; en el juego se reflejará la composición del personaje.</p></main>
<script>const data=DATA;const $=id=>document.getElementById(id);function refresh(){const key=$('item').value,sex=$('sex').value,a=$('action').value,animated=$('animated').checked;const im=$('preview');im.src=key+'/'+sex+'/'+a+(animated?'.gif':'.png');im.style.width=((animated?1920:1536)*Number($('zoom').value))+'px';im.style.transform=$('flip').checked?'scaleX(-1)':'';$('caption').textContent=animated?'De izquierda a derecha: Novato · Mago · Espadachín · Acólito · Arquero':'Filas: Novato · Mago · Espadachín · Acólito · Arquero. Columnas: fases 1 a 4.';}function choose(){const d=data[$('item').value];$('action').replaceChildren(...d.actions.map(a=>new Option(a.replaceAll('_',' '),a)));$('action').value=d.main;refresh();}$('item').onchange=choose;['sex','action','animated','flip','zoom'].forEach(id=>$(id).onchange=refresh);choose();</script></html>'''
    (out/'galeria.html').write_text(page.replace('OPTIONS',''.join(options)).replace('DATA',json.dumps(data)),encoding='utf-8')
    print('Galeria de 28 objetos: '+str(out))
if __name__=='__main__':build()
