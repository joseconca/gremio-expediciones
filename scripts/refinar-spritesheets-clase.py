#!/usr/bin/env python3
"""Refinamiento visual de spritesheets: se ejecuta una sola vez sobre las hojas actuales."""
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
MARKER = ROOT / ".spritesheets-clase-refinados-v1"

# id: (familia, tocado, emblema, color de vestuario, acento)
PERFILES = {
    "novato": ("novice","none","dot","#916744","#d8b35e"),
    "espadachin": ("fighter","band","slash","#873f4a","#e5b55d"),
    "acolito": ("priest","hood","cross","#c9b68f","#e8c56f"),
    "arquero": ("ranger","hood","leaf","#526b3b","#cfcc78"),
    "mago": ("mage","point","star","#394c8a","#9de8f5"),
    "caballero": ("heavy","helmet","crest","#733a45","#e8bf6a"),
    "duelista": ("duelist","feather","slash","#6e507e","#f0c36b"),
    "sacerdote": ("priest","mitre","cross","#d9cba7","#e7c768"),
    "monje": ("martial","band","knot","#94703b","#c2e2b0"),
    "cazador": ("ranger","furhood","claw","#6c6840","#dfb46a"),
    "explorador": ("scout","cap","leaf","#64724d","#d8bb71"),
    "elementalista": ("mage","circlet","orb","#3d7c9a","#8ff4ff"),
    "brujo": ("darkmage","hornhood","skull","#51355e","#cb94f3"),
    "cruzado": ("holyheavy","cresthelm","cross","#d7c7a0","#edc766"),
    "pirata": ("pirate","tricorn","skull","#7b3d42","#e9bb5e"),
    "druida": ("druid","antlers","leaf","#557541","#ddd57e"),
    "espadachin_runico": ("fighter","circlet","rune","#3e688b","#6ef2f4"),
    "paladin": ("holyheavy","winghelm","cross","#ddc98b","#ffdc6b"),
    "guardian_real": ("royalheavy","crownhelm","crown","#41628d","#e8c568"),
    "asesino": ("assassin","hoodmask","dagger","#45414d","#d66b68"),
    "maestro_espadas": ("duelist","longband","slash","#873e4b","#e9bf69"),
    "oraculo": ("seer","veil","star","#9375af","#f0d98d"),
    "hierofante": ("priest","tallmitre","sun","#cbb778","#ffe078"),
    "asceta": ("martial","headband","knot","#9d8154","#a9d8c5"),
    "gran_maestro": ("martialmaster","silverhair","knot","#687f91","#f0d68b"),
    "francotirador": ("sniper","goggleshood","crosshair","#54675e","#d4bd67"),
    "domabestias": ("beast","furhood","claw","#8b6540","#e0bb67"),
    "guardian_bosque": ("forestguard","antlers","leaf","#54713a","#e1d776"),
    "rastreador": ("scout","hood","eye","#89805a","#e2c076"),
    "archimago": ("archmage","bigpoint","star","#4c438d","#f0d080"),
    "invocador": ("summoner","hornhood","orb","#754a87","#f09bcb"),
    "nigromante": ("necromancer","skullhood","skull","#3a4c52","#80d7c9"),
    "demonologo": ("demon","horns","demon","#722d3a","#f06d55"),
    "guerrero": ("heavy","helmet","chevron","#854440","#e0ba65"),
    "comerciante": ("merchant","cap","coin","#83623b","#e3c56c"),
}
OSCURO = (27, 21, 27, 255)

def rgba(color, alpha=255):
    return tuple(int(color[i:i+2],16) for i in (1,3,5)) + (alpha,)

def shade(color, factor):
    rgb = rgba(color)[:3]
    return tuple(max(0,min(255,int(c*factor))) for c in rgb) + (255,)

def draw_poly(draw, points, fill, outline=OSCURO, width=1):
    points = [(int(x),int(y)) for x,y in points]
    draw.polygon(points, fill=fill)
    if outline:
        draw.line(points + [points[0]], fill=outline, width=width, joint="curve")

def draw_line(draw, points, fill, width=1):
    draw.line([(int(x),int(y)) for x,y in points], fill=fill, width=width, joint="curve")

def draw_symbol(draw, kind, x, y, color):
    c, hi = rgba(color), (241,225,184,255)
    if kind == "cross":
        draw.rectangle((x-2,y-5,x+2,y+5),fill=c,outline=OSCURO,width=1)
        draw.rectangle((x-5,y-2,x+5,y+1),fill=c,outline=OSCURO,width=1)
        draw_line(draw,[(x,y-3),(x,y+3)],hi)
    elif kind == "star":
        draw_poly(draw,[(x,y-4),(x+2,y-1),(x+5,y),(x+2,y+2),(x,y+4),(x-2,y+2),(x-5,y),(x-2,y-1)],c,OSCURO,1)
    elif kind == "leaf":
        draw_poly(draw,[(x-5,y),(x-2,y-5),(x+3,y-4),(x+5,y),(x+1,y+5)],c,OSCURO,1)
        draw_line(draw,[(x-3,y+3),(x+3,y-3)],hi)
    elif kind == "orb":
        draw.ellipse((x-4,y-4,x+4,y+4),fill=c,outline=OSCURO,width=1)
        draw.ellipse((x-2,y-3,x,y-1),fill=hi)
    elif kind in ("skull","demon"):
        draw.ellipse((x-4,y-4,x+4,y+3),fill=c,outline=OSCURO,width=1)
        draw.rectangle((x-2,y+1,x+2,y+5),fill=c,outline=OSCURO,width=1)
        draw.point((x-2,y),fill=OSCURO); draw.point((x+2,y),fill=OSCURO)
        if kind == "demon":
            draw_line(draw,[(x-3,y-3),(x-6,y-7)],c,2); draw_line(draw,[(x+3,y-3),(x+6,y-7)],c,2)
    elif kind == "coin":
        draw.ellipse((x-4,y-4,x+4,y+4),fill=c,outline=OSCURO,width=1)
        draw.ellipse((x-2,y-2,x+2,y+2),outline=hi,width=1)
    elif kind == "rune":
        draw_line(draw,[(x-3,y-5),(x+3,y+5)],c,2)
        draw_line(draw,[(x+3,y-5),(x-3,y+5)],c,2)
    elif kind == "claw":
        for i in range(3): draw_line(draw,[(x-4+i*4,y-4),(x-1+i*4,y+4)],c)
    elif kind == "crown":
        draw_poly(draw,[(x-5,y+3),(x-5,y-3),(x-2,y),(x,y-5),(x+2,y),(x+5,y-3),(x+5,y+3)],c,OSCURO,1)
    elif kind in ("slash","dagger","chevron"):
        draw_line(draw,[(x-3,y-4),(x+3,y+4)],c,2)
    elif kind in ("eye","crosshair"):
        draw_poly(draw,[(x-5,y),(x-2,y-3),(x+2,y-3),(x+5,y),(x+2,y+3),(x-2,y+3)],c,OSCURO,1)
        draw.point((x,y),fill=hi)
    elif kind == "knot":
        draw.ellipse((x-3,y-4,x+2,y+2),outline=c,width=2)
        draw.ellipse((x-2,y-1,x+3,y+4),outline=c,width=2)
    else:
        draw.point((x,y),fill=c)

def recolor_clothing(image, base, accent, shadow, robe):
    hsv = np.array(image.convert("HSV"), dtype=np.uint8)
    h, sat, value = hsv[:,:,0], hsv[:,:,1], hsv[:,:,2]
    alpha = np.array(image.getchannel("A"), dtype=np.uint8)
    yy = np.arange(image.height)[:,None] % 128
    xx = np.arange(image.width)[None,:] % 64
    accent_hsv = np.array(Image.new("RGB",(1,1),accent).convert("HSV"))[0,0]
    base_hsv = np.array(Image.new("RGB",(1,1),base).convert("HSV"))[0,0]
    # Re-teñir el pañuelo y la capa azul sin tocar piel ni pelo.
    region = (((xx>=8)&(xx<=55)&(yy>=35)&(yy<=66)) | ((xx>=6)&(xx<=24)&(yy>=43)&(yy<=91)))
    mask = region & (h>=100) & (h<=245) & (sat>=18) & (alpha>30)
    h[mask] = accent_hsv[0]
    sat[mask] = np.maximum(sat[mask], min(170,int(accent_hsv[1]*.9)))
    # Teñir el centro de la túnica preservando luces y sombras del dibujo original.
    shirt = (xx>=24)&(xx<=42)&(yy>=54)&(yy<=76)&(sat<170)&(value>60)&(alpha>30)
    h[shirt] = base_hsv[0]
    sat[shirt] = np.maximum(sat[shirt],min(170,int(base_hsv[1]*.9)))
    # Para túnicas, reutilizar sombreado de la parte inferior en lugar de pegar una placa.
    if robe:
        lower = (xx>=15)&(xx<=49)&(yy>=78)&(yy<=101)&(h>=95)&(h<=245)&(sat>=20)&(value<220)&(alpha>30)
        shadow_hsv = np.array(Image.new("RGB",(1,1),shadow).convert("HSV"))[0,0]
        h[lower] = shadow_hsv[0]
        sat[lower] = np.maximum(sat[lower],min(160,int(shadow_hsv[1]*.9)))
    hsv[:,:,0], hsv[:,:,1] = h, sat
    out = Image.merge("HSV",tuple(Image.fromarray(hsv[:,:,i]) for i in range(3))).convert("RGBA")
    out.putalpha(image.getchannel("A"))
    return out

def add_class_gear(sheet, profile, cls):
    style, head, mark, base, accent = profile
    robe = style in {"priest","mage","darkmage","seer","archmage","summoner","necromancer","demon","druid"}
    main, shadow, light = rgba(base), rgba(shade(base,.48)[:3].__str__()) if False else rgba(accent), rgba(accent)
    # Recompute clean shades from the selected garment color.
    main = rgba(base); dark = shade(base,.48); medium = shade(base,.8)
    accent_rgba = rgba(accent); steel = rgba("#788994"); steel_hi = rgba("#c7d0d5")
    overlay = Image.new("RGBA",sheet.size,(0,0,0,0)); d=ImageDraw.Draw(overlay)
    for row in range(15):
        for col in range(4):
            ox, oy = col*64, row*128
            dx = (-1,0,1,0)[col] if row in (1,4,8,9,10,14) else 0
            dy = (0,-1,0,1)[col] if row in (1,2,3,6,7,11,12,13) else 0
            def P(points,fill,outline=OSCURO,width=1):
                draw_poly(d,[(x+ox+dx,y+oy+dy) for x,y in points],fill,outline,width)
            def L(points,fill,width=1):
                draw_line(d,[(x+ox+dx,y+oy+dy) for x,y in points],fill,width)
            def S(kind,x,y):
                draw_symbol(d,kind,x+ox+dx,y+oy+dy,accent)
            # Each profession has a different head silhouette, not just a palette swap.
            if head in ("point","bigpoint"):
                P([(15,23),(25,8),(32,3 if head=="bigpoint" else 6),(40,15),(50,23),(20,25)],dark,OSCURO,2)
                P([(22,21),(29,9),(33,8),(40,20),(46,22),(22,22)],main,None,1)
                L([(19,23),(49,23)],accent_rgba,3); L([(28,13),(32,8)],light,1)
                if head=="bigpoint": S("star",33,17)
            elif head in ("helmet","cresthelm","winghelm","crownhelm"):
                P([(18,26),(19,19),(23,13),(30,10),(38,11),(44,16),(47,25),(41,28),(40,21),(24,21),(22,28)],steel,OSCURO,2)
                L([(21,25),(44,25)],steel_hi,2); L([(24,19),(41,19)],accent_rgba,1)
                if head in ("cresthelm","crownhelm"): P([(27,13),(31,5),(34,13)],accent_rgba,OSCURO,1)
                if head=="winghelm":
                    P([(21,18),(14,14),(17,24)],steel_hi,OSCURO,1); P([(42,18),(49,14),(46,24)],steel_hi,OSCURO,1)
                if head=="crownhelm": S("crown",32,15)
            elif head in ("mitre","tallmitre"):
                pts=[(20,25),(24,9),(32,4),(41,10),(45,25)] if head=="tallmitre" else [(20,25),(25,11),(39,11),(45,25)]
                P(pts,steel_hi,OSCURO,2); L([(22,24),(43,24)],accent_rgba,3); L([(32,11),(32,21)],accent_rgba,2)
            elif head in ("tricorn","feather"):
                P([(15,22),(19,17),(27,18),(34,17),(43,19),(50,24),(17,26)],dark,OSCURO,2); L([(17,24),(47,24)],accent_rgba,2)
                if head=="tricorn": P([(21,20),(17,12),(28,19)],dark,OSCURO,1); P([(39,19),(46,12),(44,22)],dark,OSCURO,1); S("coin",33,20)
                else: P([(34,19),(39,8),(45,9),(41,22)],accent_rgba,OSCURO,1); L([(37,13),(42,10)],light,1)
            elif head in ("hood","furhood","hoodmask","goggleshood","hornhood","skullhood"):
                P([(17,28),(17,20),(22,12),(29,8),(37,10),(44,16),(47,25),(42,27),(40,19),(34,15),(26,17),(22,26)],dark,OSCURO,2)
                L([(22,17),(31,11),(39,14)],accent_rgba,1)
                P([(18,23),(22,20),(23,36),(19,40)],main,OSCURO,1); P([(42,20),(47,23),(46,38),(42,35)],main,OSCURO,1)
                if head=="furhood":
                    for x,y in [(20,34),(23,36),(43,34),(45,36)]: d.ellipse((x+ox+dx-2,y+oy+dy-2,x+ox+dx+2,y+oy+dy+2),fill=light,outline=OSCURO,width=1)
                if head=="hoodmask": d.rectangle((24+ox+dx,38+oy+dy,43+ox+dx,42+oy+dy),fill=dark,outline=OSCURO,width=1); L([(27,39),(40,39)],accent_rgba,1)
                if head=="goggleshood": d.ellipse((34+ox+dx,29+oy+dy,43+ox+dx,34+oy+dy),fill=steel,outline=OSCURO,width=1); d.point((38+ox+dx,31+oy+dy),fill=accent_rgba)
                if head=="skullhood": S("skull",33,17)
                if head=="hornhood": L([(24,15),(20,7)],accent_rgba,2); L([(40,15),(45,7)],accent_rgba,2)
            elif head in ("band","headband","longband","silverhair","circlet"):
                L([(21,20),(43,20)],accent_rgba,3); L([(22,22),(42,22)],dark,1)
                if head=="circlet": S("star",32,18)
                if head=="longband": L([(22,21),(16,29)],accent_rgba,2)
                if head=="silverhair": P([(21,20),(23,12),(30,9),(40,13),(44,22),(38,19),(32,14),(25,21)],steel_hi,OSCURO,1)
            elif head=="veil":
                L([(21,20),(43,20)],accent_rgba,3); P([(22,23),(42,23),(41,40),(36,44),(29,40)],dark,OSCURO,1); L([(25,26),(36,40)],light,1); S("star",32,18)
            elif head in ("antlers","horns"):
                col=accent_rgba if head=="horns" else light
                L([(26,18),(22,9)],col,3); L([(23,11),(17,6)],col,2); L([(24,13),(27,7)],col,2)
                L([(39,18),(43,9)],col,3); L([(42,11),(48,6)],col,2); L([(41,13),(38,7)],col,2)
            elif head=="cap":
                P([(20,21),(23,14),(32,13),(41,17),(47,23),(22,25)],dark,OSCURO,2); L([(22,23),(45,23)],accent_rgba,2)
            # Small plate pauldrons for knightly classes; the original detailed body stays visible.
            if style in ("heavy","holyheavy","royalheavy"):
                P([(16,50),(22,47),(27,53),(24,60),(18,61)],steel,OSCURO,2); P([(39,51),(45,49),(50,55),(47,61),(41,61)],steel,OSCURO,2)
                L([(18,53),(22,51),(24,56)],steel_hi,1); L([(42,54),(46,52),(47,57)],steel_hi,1)
            elif style in ("ranger","scout","sniper","beast","forestguard"):
                P([(9,47),(15,44),(19,53),(16,65),(11,62)],rgba(shade(base,.65)),OSCURO,1); L([(11,49),(16,60)],accent_rgba,1)
                for i in range(3): L([(10+i*2,45),(9+i*2,36)],steel_hi,1)
            elif style in ("martial","martialmaster"):
                for x,y in [(15,65),(17,68),(45,65),(43,68)]: L([(x,y),(x+4,y-3)],light,2)
                L([(24,79),(44,78)],accent_rgba,2)
            # Robed professions recolor the existing lower garment and add fold lines only.
            if robe:
                L([(23,86),(21,93)],dark,1); L([(31,83),(31,94)],light,1); L([(39,86),(42,93)],dark,1)
                L([(22,96),(43,96)],accent_rgba,1)
            elif style=="merchant":
                P([(28,77),(38,77),(39,88),(27,88)],light,OSCURO,1); L([(27,80),(39,80)],accent_rgba,2); L([(32,81),(32,86)],dark,1)
            elif style=="pirate":
                L([(23,77),(43,80)],accent_rgba,3); L([(26,80),(39,83)],steel_hi,1)
            elif style in ("fighter","duelist","assassin"):
                L([(22,77),(43,76)],accent_rgba,2); L([(24,64),(39,78)],light,1)
            if style in ("priest","holyheavy"): S("cross",32,63)
            elif style in ("mage","archmage","darkmage","seer","summoner","necromancer","demon"): S(mark,32,63)
            elif style in ("druid","forestguard"): S("leaf",32,63)
            elif style=="merchant": S("coin",42,79)
            else: S(mark,32,63)
            L([(22,78),(43,78)],dark,3); L([(23,77),(42,77)],accent_rgba,1)
            d.rectangle((31+ox+dx,76+oy+dy,34+ox+dx,79+oy+dy),fill=rgba(shade(base,.65)),outline=OSCURO,width=1)
            if style=="royalheavy": S("crown",32,59)
            if style in ("druid","forestguard"): S("leaf",21,53); S("leaf",44,55)
            if style=="assassin": L([(25,58),(20,66)],accent_rgba,2); L([(38,58),(44,67)],accent_rgba,2)
            if style=="pirate": d.ellipse((44+ox+dx,36+oy+dy,47+ox+dx,39+oy+dy),fill=accent_rgba,outline=OSCURO,width=1)
    return Image.alpha_composite(sheet, overlay)

def save_indexed(image,path):
    alpha=image.getchannel("A")
    quant=image.convert("RGB").quantize(colors=255,method=Image.Quantize.FASTOCTREE,dither=Image.Dither.NONE)
    indexes=np.array(quant,dtype=np.uint8)
    indexes[np.array(alpha,dtype=np.uint8)==0]=255
    indexed=Image.fromarray(indexes,mode="P")
    indexed.putpalette(quant.getpalette()[:765]+[0,0,0])
    tr=bytearray([255]*256);tr[255]=0
    indexed.info["transparency"]=bytes(tr)
    indexed.save(path,optimize=True)

def main():
    if MARKER.exists():
        raise SystemExit("Los spritesheets ya se refinaron; elimina el marcador solo si vas a volver a aplicar el tratamiento.")
    paths=sorted((ROOT/"public/sprites/heroes").glob("*/*-sheet.png"))
    if len(paths)!=70:
        raise SystemExit(f"Se esperaban 70 hojas, encontradas {len(paths)}.")
    expected={p for p in PERFILES}
    found={p.parent.name for p in paths}
    if expected!=found:
        raise SystemExit(f"El catálogo de perfiles no coincide: faltan {sorted(found-expected)}; sobran {sorted(expected-found)}.")
    for idx,path in enumerate(paths,1):
        cls=path.parent.name
        style,head,mark,base,accent=PERFILES[cls]
        image=Image.open(path).convert("RGBA")
        if image.size!=(256,1920): raise SystemExit(f"Dimensiones inválidas para {path}: {image.size}")
        robe=style in {"priest","mage","darkmage","seer","archmage","summoner","necromancer","demon","druid"}
        shadow="#"+"".join(f"{int(c*0.48):02x}" for c in rgba(base)[:3])
        tinted=recolor_clothing(image,base,accent,shadow,robe)
        save_indexed(add_class_gear(tinted,PERFILES[cls],cls),path)
        print(f"{idx}/{len(paths)} {path.relative_to(ROOT)}",flush=True)
    MARKER.write_text("Las hojas se han refinado una vez; para evitar superponer adornos de nuevo, no volver a ejecutar.\n",encoding="utf-8")

if __name__=="__main__":
    main()
