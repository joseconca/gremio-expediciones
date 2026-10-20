#!/usr/bin/env python3
"""Genera spritesheets integrados de Tier 0 y Tier 1. No dibuja armas sueltas."""
from pathlib import Path
import argparse
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public/sprites/heroes"
W, H = 64, 128
ROWS, COLS = 15, 4
INK = "#261d22"

P = {
 "novato": dict(family="novice",shirt=("#d8c6a2","#9e805a","#f9e8c7"),leather=("#39251f","#805037","#d09a5d"),metal=("#3b4149","#737e89","#d0d3ca"),hair=("#2a1b18","#8c5530"),skin=("#92553f","#d28c65","#f4bd91"),cape=None,hat="none"),
 "espadachin": dict(family="fighter",shirt=("#492a34","#8f4654","#e4a36f"),leather=("#32211e","#815038","#d5a05e"),metal=("#283541","#71899d","#e1e9ed"),hair=("#24191b","#8b4a30"),skin=("#92553f","#d28c65","#f4bd91"),cape=("#142b4b","#315987","#b5d5e8"),hat="none"),
 "acolito": dict(family="cleric",shirt=("#e5d4ad","#b99a5c","#fff5d8"),leather=("#422b22","#8e6037","#e2bd70"),metal=("#6f6a5c","#c9bd98","#fff0c7"),hair=("#49302a","#b07b45"),skin=("#92553f","#d28c65","#f4bd91"),cape=("#4c3832","#80604a","#e5c887"),hat="hood"),
 "arquero": dict(family="ranger",shirt=("#243d2b","#537c42","#b4c87b"),leather=("#35251e","#8b5735","#d5a260"),metal=("#39463a","#7b8c6c","#d2d9ad"),hair=("#39241c","#a56a3e"),skin=("#92553f","#d28c65","#f4bd91"),cape=("#1d3527","#49683a","#a8bd72"),hat="hood"),
 "mago": dict(family="mage",shirt=("#191f42","#344a85","#91aeea"),leather=("#30213f","#75508a","#d2a0d5"),metal=("#303650","#6f85b1","#d6e8ff"),hair=("#241b32","#82639a"),skin=("#92553f","#d28c65","#f4bd91"),cape=("#151d3e","#2c427c","#94b8ee"),hat="point"),
}
ANIMS=("idle","walk","hurt","consumable","dodge","block","sword","axe","spear","dagger","bow","staff","mace","book","gloves")

def col(v):
    if isinstance(v,str): return tuple(bytes.fromhex(v.lstrip("#")))+(255,)
    return v

def poly(d, pts, fill, outline=INK, width=2):
    d.polygon(pts, fill=col(fill))
    if outline: d.line(pts+[pts[0]], fill=col(outline), width=width, joint="curve")

def line(d, pts, fill, width=2):
    d.line(pts, fill=col(fill), width=width, joint="curve")

def rect(d, box, fill, outline=None, width=1):
    d.rectangle(box, fill=col(fill) if fill else None, outline=col(outline) if outline else None, width=width)

def ellipse(d, box, fill, outline=INK, width=2):
    d.ellipse(box, fill=col(fill), outline=col(outline) if outline else None, width=width)

def draw_arm(d, shoulder, elbow, hand, palette, bracer=False):
    line(d,[shoulder,elbow,hand],INK,10)
    line(d,[shoulder,elbow,hand],palette[1],7)
    line(d,[(shoulder[0],shoulder[1]-1),(elbow[0],elbow[1]-1),(hand[0]-1,hand[1]-1)],palette[2],2)
    if bracer:
        line(d,[(elbow[0]-3,elbow[1]-3),(elbow[0]+3,elbow[1]+3)],palette[0],5)
        line(d,[(elbow[0]-2,elbow[1]-3),(elbow[0]+2,elbow[1]+2)],palette[2],1)
    ellipse(d,(hand[0]-4,hand[1]-4,hand[0]+4,hand[1]+4),"#5a392b",INK,1)
    ellipse(d,(hand[0]-3,hand[1]-3,hand[0]+2,hand[1]+2),"#d79570",None,1)

def band(d, start, end, fill, width=5, highlight=None):
    """Banda corta ceñida al brazo/pierna; forma parte de la prenda, no queda flotando."""
    dx=end[0]-start[0]; dy=end[1]-start[1]
    length=max(1,(dx*dx+dy*dy)**0.5)
    nx=-dy/length*width/2; ny=dx/length*width/2
    pts=[(round(start[0]+nx),round(start[1]+ny)),
         (round(end[0]+nx),round(end[1]+ny)),
         (round(end[0]-nx),round(end[1]-ny)),
         (round(start[0]-nx),round(start[1]-ny))]
    poly(d,pts,fill,INK,1)
    if highlight:
        line(d,[pts[0],pts[1]],highlight,1)

def draw_expression(d, fam, sex, row, frame, tx, hy, skin, hair):
    """Expresión de perfil con cejas, párpados, iris, pómulo y boca animados por acción."""
    eye_x, eye_y = 39 + tx, hy + 4
    eye_color = {
        "novice": "#5b3825",
        "fighter": "#263d50",
        "cleric": "#a77a34",
        "ranger": "#526c32",
        "mage": "#4bd4f5",
    }[fam]
    blink = (row == 0 and frame == 2) or (row == 1 and frame == 3) or (row == 3 and frame == 1)
    hurt = row == 2
    drinking = row == 3
    dodge = row == 4
    guarded = row == 5
    striking = row >= 6
    shouting = striking and frame == 2

    # Cejas con inclinación deliberada: cambia la emoción, no solo el color del ojo.
    if hurt:
        brow = [(eye_x-3, eye_y-2), (eye_x-1, eye_y), (eye_x+2, eye_y-1)]
        line(d, brow, hair[0], 2)
        rect(d, (eye_x-1, eye_y-1, eye_x, eye_y-1), skin[2])
    elif dodge:
        line(d, [(eye_x-3, eye_y-4), (eye_x-1, eye_y-5), (eye_x+2, eye_y-3)], hair[1], 2)
        rect(d, (eye_x+1, eye_y-4, eye_x+2, eye_y-3), skin[2])
    elif guarded or striking:
        line(d, [(eye_x-3, eye_y-2), (eye_x-1, eye_y-1), (eye_x+2, eye_y-3)], hair[0], 2)
        if striking and frame == 1:
            rect(d, (eye_x-1, eye_y-2, eye_x+1, eye_y-2), skin[2])
    elif fam == "cleric":
        line(d, [(eye_x-3, eye_y-2), (eye_x-1, eye_y-3), (eye_x+2, eye_y-2)], "#936b3d", 1)
    elif fam == "ranger":
        line(d, [(eye_x-3, eye_y-2), (eye_x-1, eye_y-1), (eye_x+2, eye_y-2)], hair[0], 2)
    else:
        line(d, [(eye_x-3, eye_y-2), (eye_x-1, eye_y-3), (eye_x+2, eye_y-2)], hair[0], 1)

    # Sombra de la cuenca y el párpado superior. El brillo queda dentro del iris.
    if blink or hurt:
        line(d, [(eye_x-2, eye_y+1), (eye_x, eye_y+2), (eye_x+2, eye_y+1)], "#2a1b20", 2)
        if hurt:
            line(d, [(eye_x-1, eye_y+3), (eye_x+1, eye_y+3)], skin[0], 1)
    else:
        if dodge:
            rect(d, (eye_x-2, eye_y, eye_x+2, eye_y+3), "#21181f")
            rect(d, (eye_x-1, eye_y+1, eye_x+1, eye_y+2), "#fff0d4")
            rect(d, (eye_x+1, eye_y+1, eye_x+2, eye_y+2), eye_color)
            rect(d, (eye_x+2, eye_y+1, eye_x+2, eye_y+1), "#ffffff")
        else:
            rect(d, (eye_x-2, eye_y+1, eye_x+2, eye_y+2), "#221920")
            rect(d, (eye_x-1, eye_y+1, eye_x+1, eye_y+2), "#f7e8cb")
            rect(d, (eye_x+1, eye_y+1, eye_x+2, eye_y+2), eye_color)
            rect(d, (eye_x+2, eye_y+1, eye_x+2, eye_y+1), "#fffef0")
        if sex == "f":
            line(d, [(eye_x-2, eye_y), (eye_x-1, eye_y-1), (eye_x+1, eye_y)], hair[0], 1)
            rect(d, (eye_x+2, eye_y, eye_x+2, eye_y+1), hair[0])

    # Luz frontal sobre la nariz y sombra bajo el pómulo para dar volumen al perfil.
    line(d, [(eye_x+3, eye_y+2), (eye_x+4, eye_y+4)], skin[2], 1)
    line(d, [(eye_x-2, eye_y+5), (eye_x, eye_y+6), (eye_x+2, eye_y+5)], skin[0], 1)
    rect(d, (eye_x, eye_y+4, eye_x+1, eye_y+4), skin[1])

    # Firma facial propia de cada arquetipo, pequeña pero visible al tamaño nativo.
    if fam == "fighter":
        # Cicatriz fina y antigua bajo el ojo.
        line(d, [(eye_x-2, eye_y+4), (eye_x-1, eye_y+5), (eye_x, eye_y+6)], "#8d4037", 1)
        rect(d, (eye_x-1, eye_y+4, eye_x-1, eye_y+4), "#e5a06e")
    elif fam == "cleric":
        rect(d, (eye_x+1, eye_y+5, eye_x+2, eye_y+5), "#f2d28a")
        rect(d, (eye_x+2, eye_y+4, eye_x+2, eye_y+4), "#fff0c0")
    elif fam == "ranger":
        line(d, [(eye_x-3, eye_y+3), (eye_x-2, eye_y+5), (eye_x-1, eye_y+6)], "#718b3f", 1)
        rect(d, (eye_x-3, eye_y+4, eye_x-3, eye_y+4), "#d4d49a")
    elif fam == "mage":
        rect(d, (eye_x+1, eye_y+3, eye_x+2, eye_y+3), "#e6fcff")
        rect(d, (eye_x+2, eye_y+4, eye_x+2, eye_y+5), "#7fc8f5")
        rect(d, (eye_x+3, eye_y-1, eye_x+3, eye_y), "#8feaff")
    else:
        # Expresión abierta y joven; dos pecas diminutas iluminan la mejilla.
        rect(d, (eye_x-2, eye_y+5, eye_x-2, eye_y+5), "#c98564")
        rect(d, (eye_x-1, eye_y+6, eye_x-1, eye_y+6), "#e8a27b")

    # La boca se anima: dolor, esfuerzo al beber, alerta o grito de ataque.
    mx, my = 41 + tx, hy + 10
    if hurt:
        ellipse(d, (mx, my-1, mx+3, my+3), "#321920", None, 1)
        rect(d, (mx+1, my-1, mx+2, my), "#fff0d5")
        rect(d, (mx, my+2, mx+2, my+2), "#8d4d48")
    elif drinking and frame == 1:
        ellipse(d, (mx, my-1, mx+2, my+2), "#382026", None, 1)
        rect(d, (mx+1, my-1, mx+1, my-1), "#fff2d2")
    elif drinking and frame == 2:
        line(d, [(mx-1, my), (mx+1, my+1), (mx+3, my)], "#572d2c", 1)
    elif dodge:
        line(d, [(mx-1, my), (mx+1, my-1), (mx+3, my)], "#542b2a", 1)
        rect(d, (mx+1, my, mx+1, my), "#f0d4b5")
    elif shouting:
        ellipse(d, (mx, my-1, mx+3, my+3), "#321920", None, 1)
        rect(d, (mx+1, my-1, mx+2, my), "#fff0cf")
        rect(d, (mx+1, my+2, mx+2, my+2), "#9c5d55")
    elif guarded or (striking and frame == 1):
        line(d, [(mx-1, my), (mx+1, my-1), (mx+3, my)], "#3c2224", 2)
    else:
        line(d, [(mx, my), (mx+2, my)], "#6b3a35", 1)
        rect(d, (mx+1, my-1, mx+1, my-1), skin[2])

    # Jaw shadow and lip highlight close the face without enlarging its silhouette.
    line(d, [(40+tx, hy+13), (42+tx, hy+13)], skin[0], 1)
    rect(d, (42+tx, hy+11, 42+tx, hy+11), skin[2])



def pose(row,f,cid=None):
    dx=[0,-1,0,1][f]; dy=[0,-1,0,1][f]; crouch=0
    if row==1: dx=[-3,1,3,-1][f];dy=[0,-2,0,1][f]
    if row==2:
        dx=[0,-2,-3,0][f];dy=[2,4,3,1][f];crouch=[1,3,3,1][f]
        # Novato: hacer legible el retroceso y la recuperación sin cambiar la celda.
        if cid=="novato":
            dx=[0,-2,-4,1][f]
            dy=[0,5,8,2][f]
            crouch=[0,2,8,2][f]
        # Tier 1 — Espadachín: anticipación, retroceso, compresión y recuperación.
        # La animación ocupa las mismas celdas y mantiene el anclaje de los pies.
        if cid=="espadachin":
            dx=[0,-2,-5,1][f]
            dy=[0,4,8,2][f]
            crouch=[0,2,8,2][f]
    if row==3: dy=[0,-1,-2,0][f]
    if row==4: dx=[-3,-4,2,1][f];dy=[2,5,3,0][f];crouch=[2,5,3,0][f]
    if row==5: dx=[0,1,1,0][f];dy=0
    if row>=6:
        # Preparación, aceleración, impacto y recuperación con siluetas distintas por arma.
        attack_motion={
            6:([0,1,4,0],[0,-5,-2,1],[0,1,0,0]),
            7:([0,1,3,0],[0,-6,-2,0],[0,2,1,0]),
            8:([0,1,5,0],[0,0,-1,0],[0,0,0,0]),
            9:([0,2,3,0],[0,-2,-2,0],[0,0,0,0]),
            10:([0,0,1,0],[0,0,0,0],[0,0,0,0]),
            11:([0,1,2,0],[0,-5,-3,0],[0,0,0,0]),
            12:([0,1,3,0],[0,-6,-3,0],[0,2,1,0]),
            13:([0,1,0,0],[0,-3,-2,0],[0,0,0,0]),
            14:([0,2,3,0],[0,-2,-1,0],[0,1,0,0]),
        }
        ax,ay,ac=attack_motion[row]
        dx,dy,crouch=ax[f],ay[f],ac[f]
    return dx,dy,crouch

def draw_frame(cid, sex, row, f):
    p=P[cid]; fam=p["family"]; shirt=p["shirt"]; leather=p["leather"]; metal=p["metal"]; hair=p["hair"]; cape=p["cape"]
    skin = p["skin"] if sex == "m" else ("#a4604b", "#e4a17f", "#f8c8a1")
    im=Image.new("RGBA",(W,H),(0,0,0,0));d=ImageDraw.Draw(im)
    dx,dy,crouch=pose(row,f,cid); tx=dx; hy=24+dy//2; hip=82+crouch
    # Cloak silhouette is drawn behind the body, not pasted over it.
    if cape:
        c0,c1,c2=cape
        if fam in ("cleric","mage"):
            poly(d,[(22+tx,43+dy),(30+tx,41+dy),(40+tx,52+dy),(39+tx,82+crouch),(31+tx,94+crouch),(19+tx,87+crouch),(20+tx,59+dy)],c0)
            poly(d,[(23+tx,48+dy),(29+tx,51+dy),(29+tx,82+crouch),(22+tx,85+crouch)],c1,INK,1)
            line(d,[(35+tx,54+dy),(34+tx,82+crouch)],c2,2)
        elif fam=="ranger":
            poly(d,[(22+tx,43+dy),(30+tx,42+dy),(27+tx,64+dy),(20+tx,84+crouch),(12+tx,87+crouch),(16+tx,68+dy),(17+tx,52+dy)],c0)
            poly(d,[(19+tx,51+dy),(25+tx,54+dy),(21+tx,76+crouch),(16+tx,82+crouch)],c1,INK,1)
            line(d,[(18+tx,57+dy),(17+tx,73+crouch)],c2,2)
        else:
            poly(d,[(22+tx,43+dy),(30+tx,42+dy),(39+tx,54+dy),(36+tx,77+crouch),(29+tx,86+crouch),(18+tx,81+crouch),(18+tx,60+dy)],c0)
            poly(d,[(23+tx,48+dy),(29+tx,51+dy),(33+tx,70+crouch),(29+tx,80+crouch),(23+tx,76+crouch)],c1,INK,1)
            line(d,[(24+tx,54+dy),(30+tx,71+crouch)],c2,2)
    # El carcaj va cosido al arnés, por detrás del hombro, no como objeto flotante.
    if fam=="ranger":
        poly(d,[(12+tx,41+dy),(18+tx,39+dy),(22+tx,61+crouch),(17+tx,65+crouch),(12+tx,61+crouch)],leather[0],INK,2)
        poly(d,[(13+tx,43+dy),(17+tx,42+dy),(20+tx,59+crouch),(17+tx,61+crouch)],leather[1],INK,1)
        for i in range(4):
            line(d,[(13+tx+i,42+dy),(14+tx+i,38+dy)],("#d8cf9a", "#c5b16e", "#ebdfb2", "#b6c9a3")[i],2)
        line(d,[(13+tx,51+dy),(19+tx,50+dy)],leather[2],2)
        line(d,[(14+tx,56+crouch),(19+tx,55+crouch)],leather[2],1)

    # Legs and boots: frame shifts are integrated into the body pose.
    step=([-4,2,5,-2][f] if row==1 else [3,-3,-4,2][f] if row==4 else [0,1,3,0][f] if row>=6 else 0)
    bh=(26+tx,hip);fh=(37+tx,hip)
    bk=(24+tx+step//2,98+crouch);fk=(39+tx-step//2,99+crouch)
    ba=(24+tx+step,111);fa=(40+tx-step,111)
    if row==5:bk=(26+tx,98+crouch);fk=(38+tx,99+crouch)
    if row>=6 and f==2:fk=(43+tx,98+crouch);fa=(44+tx,111)
    for h,k,a,front in ((bh,bk,ba,False),(fh,fk,fa,True)):
        poly(d,[(h[0]-5,h[1]-1),(h[0]+4,h[1]-2),(k[0]+4,k[1]),(a[0]+4,a[1]),(a[0]-5,a[1]),(k[0]-4,k[1]+1)],("#252b38","#343d4c","#637182")[1 if front else 0],width=2)
        line(d,[(k[0]-2,k[1]+2),(a[0]+2,a[1]-3)],"#69788a",2)
        poly(d,[(a[0]-5,a[1]-5),(a[0]+2,a[1]-6),(a[0]+8,a[1]-2),(a[0]+7,a[1]+2),(a[0]-7,a[1]+2)],leather[0],width=2)
        rect(d,(a[0]-5,a[1]-1,a[0]+6,a[1]+1),leather[2])
        line(d,[(a[0]-2,a[1]-4),(a[0]+2,a[1]-3)],leather[1],1)
    # Class-specific bottom garment.
    if fam in ("cleric","mage"):
        poly(d,[(22+tx,65+dy),(42+tx,65+dy),(46+tx,94+crouch),(41+tx,103+crouch),(18+tx,103+crouch),(15+tx,94+crouch)],shirt[1],width=2)
        poly(d,[(24+tx,69+dy),(31+tx,72+dy),(30+tx,99+crouch),(21+tx,99+crouch)],shirt[0],INK,1)
        line(d,[(36+tx,73+dy),(40+tx,96+crouch)],shirt[2],2)
        line(d,[(19+tx,99+crouch),(41+tx,99+crouch)],leather[2],2)
        for x in (23,28,33,38):rect(d,(x+tx,100+crouch,x+1+tx,102+crouch),leather[2])
    elif fam=="ranger":
        poly(d,[(23+tx,66+dy),(41+tx,66+dy),(40+tx,89+crouch),(34+tx,94+crouch),(25+tx,92+crouch),(21+tx,84+crouch)],shirt[1],width=2)
        poly(d,[(25+tx,69+dy),(30+tx,70+dy),(29+tx,87+crouch),(24+tx,84+crouch)],shirt[2],INK,1)
    elif fam=="novice":
        # Novato lleva túnica corta de viaje y pantalón visible, no una túnica larga de mago.
        poly(d,[(22+tx,65+dy),(42+tx,65+dy),(40+tx,77+crouch),(35+tx,81+crouch),(25+tx,81+crouch),(21+tx,76+crouch)],shirt[0],width=2)
        poly(d,[(24+tx,68+dy),(31+tx,70+dy),(30+tx,77+crouch),(24+tx,77+crouch)],shirt[1],INK,1)
        line(d,[(34+tx,69+dy),(35+tx,77+crouch)],shirt[2],2)
        # Reforzar ambas perneras por delante para que la ropa y las piernas se lean como un conjunto.
        poly(d,[(23+tx,79+crouch),(30+tx,79+crouch),(29+tx,96+crouch),(25+tx,102+crouch),(21+tx,100+crouch)],leather[0],width=1)
        poly(d,[(32+tx,79+crouch),(39+tx,79+crouch),(41+tx,96+crouch),(43+tx,101+crouch),(37+tx,102+crouch),(33+tx,96+crouch)],leather[0],width=1)
        line(d,[(26+tx,83+crouch),(25+tx,95+crouch)],leather[2],1)
        line(d,[(36+tx,83+crouch),(38+tx,95+crouch)],leather[2],1)
    elif fam=="fighter":
        poly(d,[(22+tx,65+dy),(42+tx,65+dy),(41+tx,82+crouch),(36+tx,88+crouch),(25+tx,87+crouch),(21+tx,80+crouch)],leather[0],width=2)
        poly(d,[(24+tx,68+dy),(30+tx,69+dy),(29+tx,82+crouch),(25+tx,81+crouch)],shirt[0],INK,1)
        line(d,[(32+tx,68+dy),(34+tx,82+crouch)],metal[2],2)
    else:
        poly(d,[(22+tx,65+dy),(42+tx,65+dy),(40+tx,85+crouch),(35+tx,90+crouch),(25+tx,89+crouch),(21+tx,82+crouch)],shirt[0],width=2)
        poly(d,[(24+tx,68+dy),(31+tx,70+dy),(30+tx,83+crouch),(24+tx,81+crouch)],shirt[1],INK,1)
        line(d,[(34+tx,68+dy),(36+tx,82+crouch)],shirt[2],2)
    # Rodilleras y correas de bota cosidas al cuero, un acabado humilde propio del Novato.
    if fam=="novice":
        for x in (24+tx,37+tx):
            poly(d,[(x-3,91+crouch),(x+3,91+crouch),(x+4,97+crouch),(x,100+crouch),(x-4,97+crouch)],leather[1],width=1)
            line(d,[(x-2,93+crouch),(x+2,93+crouch)],leather[2],1)
        for x in (ba[0],fa[0]):
            line(d,[(x-4,107),(x+4,107)],leather[1],2)
            rect(d,(x-1,106,x+2,109),metal[1],INK,1)
            rect(d,(x,107,x+1,108),metal[2])
    elif fam=="fighter":
        # Grebas con refuerzo central y remaches que conectan con la coraza.
        for ankle in (ba,fa):
            poly(d,[(ankle[0]-4,101),(ankle[0]+3,101),(ankle[0]+4,108),(ankle[0]-3,108)],metal[0],INK,1)
            line(d,[(ankle[0]-2,102),(ankle[0]+1,106)],metal[2],1)
            rect(d,(ankle[0],104,ankle[0]+1,105),metal[1])
    elif fam=="cleric":
        for ankle in (ba,fa):
            line(d,[(ankle[0]-4,107),(ankle[0]+5,107)],"#d9b96c",2)
            rect(d,(ankle[0],105,ankle[0]+2,108),"#fff0bf",INK,1)
    elif fam=="ranger":
        for ankle in (ba,fa):
            band(d,(ankle[0]-3,105),(ankle[0]+4,106),leather[1],4,leather[2])
            rect(d,(ankle[0]+1,104,ankle[0]+3,106),metal[2],INK,1)
    elif fam=="mage":
        for ankle in (ba,fa):
            line(d,[(ankle[0]-4,107),(ankle[0]+5,107)],"#6f93d3",2)
            rect(d,(ankle[0]+1,105,ankle[0]+3,107),"#d8dcff",INK,1)

    # Main torso is wholly redrawn for each class.
    if fam=="fighter":
        poly(d,[(21+tx,43+dy),(29+tx,39+dy),(38+tx,42+dy),(44+tx,51+dy),(40+tx,70+crouch),(23+tx,70+crouch),(18+tx,54+dy)],metal[0],width=2)
        poly(d,[(24+tx,45+dy),(30+tx,43+dy),(36+tx,48+dy),(34+tx,65+crouch),(24+tx,64+crouch)],shirt[0],INK,1)
        poly(d,[(35+tx,43+dy),(42+tx,47+dy),(44+tx,54+dy),(39+tx,58+dy),(34+tx,51+dy)],metal[1],width=2)
        line(d,[(36+tx,46+dy),(41+tx,51+dy)],metal[2],2)
    elif fam=="ranger":
        poly(d,[(22+tx,43+dy),(29+tx,40+dy),(38+tx,42+dy),(43+tx,51+dy),(40+tx,69+crouch),(23+tx,69+crouch),(18+tx,54+dy)],leather[0],width=2)
        poly(d,[(24+tx,45+dy),(30+tx,43+dy),(36+tx,47+dy),(34+tx,63+crouch),(24+tx,64+crouch)],shirt[0],INK,1)
        poly(d,[(18+tx,48+dy),(24+tx,45+dy),(27+tx,52+dy),(23+tx,59+dy),(18+tx,56+dy)],shirt[1],width=2)
        line(d,[(24+tx,46+dy),(35+tx,64+crouch)],leather[2],2)
    elif fam=="cleric":
        poly(d,[(22+tx,43+dy),(29+tx,39+dy),(38+tx,42+dy),(43+tx,51+dy),(40+tx,70+crouch),(23+tx,70+crouch),(18+tx,54+dy)],shirt[1],width=2)
        poly(d,[(24+tx,45+dy),(30+tx,43+dy),(36+tx,48+dy),(34+tx,65+crouch),(24+tx,65+crouch)],shirt[0],INK,1)
        line(d,[(28+tx,45+dy),(34+tx,52+dy),(30+tx,57+dy)],leather[2],2)
        rect(d,(31+tx,52+dy,34+tx,59+dy),leather[2],INK,1)
    elif fam=="mage":
        poly(d,[(21+tx,43+dy),(29+tx,39+dy),(38+tx,42+dy),(44+tx,51+dy),(40+tx,70+crouch),(23+tx,70+crouch),(18+tx,54+dy)],shirt[0],width=2)
        poly(d,[(24+tx,45+dy),(30+tx,43+dy),(36+tx,48+dy),(34+tx,65+crouch),(24+tx,65+crouch)],shirt[1],INK,1)
        line(d,[(22+tx,53+dy),(28+tx,59+dy),(25+tx,66+crouch)],shirt[2],2)
        line(d,[(36+tx,48+dy),(40+tx,57+dy),(37+tx,63+crouch)],leather[2],2)
    else:
        poly(d,[(22+tx,43+dy),(29+tx,40+dy),(38+tx,42+dy),(43+tx,51+dy),(40+tx,69+crouch),(23+tx,69+crouch),(18+tx,54+dy)],shirt[0],width=2)
        poly(d,[(24+tx,45+dy),(30+tx,43+dy),(36+tx,47+dy),(34+tx,64+crouch),(24+tx,64+crouch)],shirt[1],INK,1)
        line(d,[(23+tx,46+dy),(36+tx,65+crouch)],leather[1],4)
        line(d,[(24+tx,46+dy),(36+tx,65+crouch)],leather[2],1)
    # El Novato combina ropa de viaje con un cuello granate y una bandolera de cuero cosida.
    if fam=="novice":
        poly(d,[(27+tx,40+dy),(35+tx,40+dy),(40+tx,44+dy),(36+tx,49+dy),(29+tx,47+dy),(25+tx,44+dy)],"#65302d",INK,2)
        poly(d,[(29+tx,42+dy),(35+tx,42+dy),(37+tx,44+dy),(33+tx,46+dy),(28+tx,44+dy)],"#a64f3b",INK,1)
        line(d,[(28+tx,44+dy),(33+tx,46+dy)],"#e2a06b",1)
        line(d,[(23+tx,47+dy),(39+tx,65+crouch)],INK,7)
        line(d,[(23+tx,47+dy),(39+tx,65+crouch)],leather[1],4)
        line(d,[(23+tx,47+dy),(39+tx,65+crouch)],leather[2],1)
        for i in range(4):
            x,y=26+tx+i*3,51+dy+i*3
            rect(d,(x,y,x+1,y+1),shirt[2])
        poly(d,[(31+tx,56+dy),(36+tx,57+dy),(36+tx,62+dy),(31+tx,61+dy)],metal[0],INK,1)
        rect(d,(33+tx,58+dy,35+tx,60+dy),metal[2])
        poly(d,[(20+tx,46+dy),(25+tx,44+dy),(28+tx,49+dy),(25+tx,53+dy),(20+tx,52+dy)],leather[1],INK,1)
        line(d,[(21+tx,48+dy),(25+tx,47+dy)],leather[2],1)
        line(d,[(23+tx,72+crouch),(28+tx,73+crouch),(28+tx,76+crouch)],shirt[2],1)
        line(d,[(34+tx,73+crouch),(38+tx,72+crouch)],shirt[2],1)
        for i in range(3):
            rect(d,(25+tx+i*3,75+crouch,26+tx+i*3,76+crouch),leather[2])
        # Bolsa lateral de viaje con solapa y pespuntes.
        poly(d,[(19+tx,67+crouch),(25+tx,68+crouch),(25+tx,77+crouch),(19+tx,76+crouch)],leather[0],INK,1)
        poly(d,[(19+tx,68+crouch),(24+tx,69+crouch),(24+tx,72+crouch),(19+tx,71+crouch)],leather[1],INK,1)
        line(d,[(20+tx,74+crouch),(23+tx,75+crouch)],leather[2],1)
        rect(d,(22+tx,70+crouch,23+tx,72+crouch),metal[2])

    # Refinamiento por arquetipo: los bordes, grabados y costuras forman parte del tejido o la armadura.
    if fam=="fighter":
        # Coraza de acero con biseles, placas de hombro y remaches forjados.
        poly(d,[(18+tx,43+dy),(24+tx,40+dy),(29+tx,43+dy),(27+tx,50+dy),(22+tx,53+dy),(17+tx,49+dy)],metal[1],INK,2)
        poly(d,[(36+tx,42+dy),(42+tx,43+dy),(46+tx,49+dy),(42+tx,54+dy),(36+tx,51+dy)],metal[1],INK,2)
        poly(d,[(21+tx,44+dy),(25+tx,43+dy),(27+tx,47+dy),(23+tx,50+dy)],metal[2],INK,1)
        poly(d,[(37+tx,44+dy),(41+tx,45+dy),(43+tx,49+dy),(40+tx,50+dy)],metal[2],INK,1)
        line(d,[(25+tx,47+dy),(30+tx,45+dy),(36+tx,47+dy)],metal[2],2)
        line(d,[(24+tx,53+dy),(30+tx,56+dy),(36+tx,53+dy)],metal[0],2)
        line(d,[(25+tx,58+dy),(30+tx,60+crouch),(35+tx,58+dy)],metal[1],1)
        # Sello heráldico en esmalte carmesí, unido a la coraza.
        poly(d,[(29+tx,49+dy),(33+tx,48+dy),(36+tx,51+dy),(35+tx,57+dy),(31+tx,60+dy),(28+tx,56+dy)],"#702d3d",INK,1)
        line(d,[(32+tx,50+dy),(32+tx,57+dy)],"#f1d08a",1)
        line(d,[(30+tx,53+dy),(34+tx,53+dy)],"#f1d08a",1)
        for x,y in ((20,52),(25,54),(38,53),(41,49),(28,63),(36,63)):
            ellipse(d,(x+tx,y+dy,x+tx+2,y+dy+2),metal[2],INK,1)
        # Reborde del faldón y pequeñas placas de greba.
        line(d,[(23+tx,81+crouch),(39+tx,82+crouch)],metal[2],2)
        for x in (25,30,35):
            line(d,[(x+tx,84+crouch),(x+tx+1,87+crouch)],metal[1],2)
    elif fam=="cleric":
        # Estola litúrgica con ribete dorado y bordado de cruces en el pecho.
        line(d,[(24+tx,45+dy),(29+tx,50+dy),(27+tx,63+crouch)],"#8f642b",4)
        line(d,[(24+tx,45+dy),(29+tx,50+dy),(27+tx,63+crouch)],"#f7df93",1)
        line(d,[(37+tx,47+dy),(40+tx,53+dy),(37+tx,63+crouch)],"#8f642b",3)
        line(d,[(37+tx,47+dy),(40+tx,53+dy),(37+tx,63+crouch)],"#fff0bf",1)
        # Una cruz bordada en hilo dorado, no un objeto añadido al pecho.
        rect(d,(31+tx,49+dy,33+tx,57+dy),"#946b33",INK,1)
        rect(d,(28+tx,51+dy,36+tx,53+dy),"#f7dc89",INK,1)
        rect(d,(32+tx,50+dy,32+tx,56+dy),"#fff4c9")
        for y in (72,78,84,90,96):
            poly(d,[(18+tx,y+crouch),(20+tx,y-2+crouch),(22+tx,y+crouch)],"#9f7838",INK,1)
            poly(d,[(39+tx,y+crouch),(41+tx,y-2+crouch),(43+tx,y+crouch)],"#9f7838",INK,1)
        line(d,[(17+tx,101+crouch),(42+tx,101+crouch)],"#e3c67e",2)
        line(d,[(20+tx,103+crouch),(39+tx,103+crouch)],"#fff0bf",1)
    elif fam=="ranger":
        # Jerkin articulado, correas cruzadas y placas de cuero remachadas.
        line(d,[(21+tx,45+dy),(28+tx,52+dy),(36+tx,63+crouch)],INK,6)
        line(d,[(21+tx,45+dy),(28+tx,52+dy),(36+tx,63+crouch)],leather[1],3)
        line(d,[(21+tx,45+dy),(28+tx,52+dy),(36+tx,63+crouch)],leather[2],1)
        poly(d,[(18+tx,46+dy),(24+tx,43+dy),(28+tx,48+dy),(25+tx,54+dy),(20+tx,52+dy)],shirt[1],INK,2)
        poly(d,[(19+tx,47+dy),(23+tx,45+dy),(26+tx,48+dy),(23+tx,51+dy)],shirt[2],INK,1)
        for x,y in ((20,49),(24,51),(28,55),(31,59),(34,62)):
            rect(d,(x+tx,y+dy,x+tx+1,y+dy+1),metal[2])
        line(d,[(24+tx,57+dy),(28+tx,60+crouch)],shirt[2],1)
        # Bordado de hojas discreto en la tela verde y dobladillo del manto.
        poly(d,[(32+tx,48+dy),(35+tx,45+dy),(36+tx,49+dy)],"#c8d98a",INK,1)
        poly(d,[(34+tx,52+dy),(38+tx,49+dy),(38+tx,53+dy)],"#c8d98a",INK,1)
        line(d,[(16+tx,80+crouch),(19+tx,83+crouch),(20+tx,86+crouch)],cape[2],2)
    elif fam=="mage":
        # Manto de arcanista: filigrana azul hielo, brocado de estrellas y cierre facetado.
        line(d,[(22+tx,45+dy),(27+tx,48+dy),(25+tx,64+crouch)],"#c59aeb",3)
        line(d,[(22+tx,45+dy),(27+tx,48+dy),(25+tx,64+crouch)],"#fff0c4",1)
        line(d,[(38+tx,47+dy),(41+tx,54+dy),(38+tx,64+crouch)],"#c59aeb",2)
        line(d,[(38+tx,47+dy),(41+tx,54+dy),(38+tx,64+crouch)],"#e7f4ff",1)
        poly(d,[(30+tx,49+dy),(33+tx,46+dy),(36+tx,49+dy),(34+tx,54+dy),(31+tx,54+dy)],"#68c9f0",INK,1)
        poly(d,[(32+tx,48+dy),(34+tx,50+dy),(32+tx,52+dy),(31+tx,50+dy)],"#effbff",INK,1)
        for x,y in ((26,55),(37,57),(28,61),(35,63)):
            # Destellos bordados sobre el tejido, contenidos en la silueta.
            rect(d,(x+tx,y+dy,x+tx+1,y+dy+1),"#e6d1ff")
        for x in (19,23,27,31,35,39,43):
            poly(d,[(x+tx,99+crouch),(x+tx+2,96+crouch),(x+tx+3,99+crouch)],"#9abff4",INK,1)
        line(d,[(22+tx,102+crouch),(41+tx,102+crouch)],"#e4d6ff",2)

    # Belt, buckle and small pouch are stitched into this outfit.
    line(d,[(22+tx,67+crouch),(41+tx,67+crouch)],leather[0],5)
    line(d,[(22+tx,66+crouch),(41+tx,66+crouch)],leather[2],1)
    rect(d,(31+tx,64+crouch,36+tx,70+crouch),metal[0] if fam=="fighter" else leather[1],INK,1)
    rect(d,(33+tx,66+crouch,34+tx,68+crouch),metal[2])
    if fam in ("novice","ranger","fighter"):
        poly(d,[(20+tx,67+crouch),(26+tx,68+crouch),(25+tx,76+crouch),(20+tx,75+crouch)],leather[0],width=1)
        line(d,[(22+tx,70+crouch),(24+tx,70+crouch)],leather[2],1)
    # Neck, head and hair are drawn directly into the body. Female ponytail is part of the silhouette.
    rect(d,(29+tx,34+dy,36+tx,43+dy),skin[1])
    ellipse(d,(27+tx,hy-2,42+tx,hy+16),skin[1],INK,2)
    ellipse(d,(38+tx,hy+5,43+tx,hy+10),skin[0],INK,1)
    poly(d,[(27+tx,hy+5),(29+tx,hy-1),(35+tx,hy-4),(40+tx,hy-1),(43+tx,hy+4),(41+tx,hy+9),(38+tx,hy+6),(34+tx,hy+6),(31+tx,hy+11)],skin[0],INK,2)
    ellipse(d,(38+tx,hy+4,40+tx,hy+6),"#211a1d",None,1)
    line(d,[(39+tx,hy+10),(41+tx,hy+10)],skin[2],1)
    if sex=="f":
        poly(d,[(25+tx,hy+5),(26+tx,hy-3),(31+tx,hy-8),(37+tx,hy-7),(42+tx,hy-2),(42+tx,hy+3),(37+tx,hy+1),(34+tx,hy+4),(30+tx,hy+2)],hair[0],INK,2)
        poly(d,[(26+tx,hy+2),(23+tx,hy+9),(27+tx,hy+18),(31+tx,hy+21),(33+tx,hy+18),(29+tx,hy+8)],hair[0],INK,2)
        line(d,[(25+tx,hy+9),(29+tx,hy+17)],hair[1],2)
    else:
        poly(d,[(25+tx,hy+5),(25+tx,hy-2),(30+tx,hy-8),(35+tx,hy-9),(40+tx,hy-5),(43+tx,hy+1),(40+tx,hy+4),(35+tx,hy+1),(32+tx,hy+4),(29+tx,hy+2)],hair[0],INK,2)
        poly(d,[(27+tx,hy-1),(30+tx,hy-7),(35+tx,hy-8),(39+tx,hy-5),(34+tx,hy-4)],hair[1],INK,1)
        line(d,[(27+tx,hy+3),(30+tx,hy)],hair[1],1)
    # Ojo, ceja y reflejo de mejilla visibles a tamaño nativo.
    rect(d,(38+tx,hy+4,40+tx,hy+5),"#211a1d")
    rect(d,(39+tx,hy+4,39+tx,hy+4),"#fff1cf")
    line(d,[(37+tx,hy+2),(40+tx,hy+2)],hair[1],1)
    rect(d,(41+tx,hy+9,42+tx,hy+9),skin[2])
    if p["hat"]=="hood":
        h0=cape[0]; h1=cape[2]
        poly(d,[(25+tx,hy+8),(24+tx,hy-2),(29+tx,hy-10),(37+tx,hy-10),(43+tx,hy-3),(44+tx,hy+8),(39+tx,hy+6),(37+tx,hy-2),(31+tx,hy+1),(29+tx,hy+8)],h0,INK,2)
        poly(d,[(30+tx,hy+2),(35+tx,hy-1),(40+tx,hy+3),(41+tx,hy+8),(37+tx,hy+10),(31+tx,hy+8)],skin[1],INK,1)
        line(d,[(26+tx,hy-1),(32+tx,hy-7),(38+tx,hy-6)],h1,2)
    elif p["hat"]=="point":
        poly(d,[(22+tx,hy+1),(26+tx,hy-7),(29+tx,hy-18),(34+tx,hy-13),(39+tx,hy-5),(46+tx,hy+1),(22+tx,hy+3)],shirt[0],INK,2)
        poly(d,[(28+tx,hy-9),(31+tx,hy-15),(37+tx,hy-4),(41+tx,hy),(34+tx,hy-1)],shirt[1],INK,1)
        line(d,[(23+tx,hy+1),(45+tx,hy+1)],shirt[2],2)
        # Bordado de la punta y una gema engastada en la banda del sombrero.
        line(d,[(29+tx,hy-14),(33+tx,hy-7),(38+tx,hy-3)],"#e1c477",1)
        poly(d,[(32+tx,hy-1),(34+tx,hy-3),(36+tx,hy-1),(34+tx,hy+2)],"#75d5f5",INK,1)
        rect(d,(34+tx,hy-1,34+tx,hy),"#f6ffff")
    if fam=="cleric" and p["hat"]=="hood":
        # Ribete del capuchón en oro apagado, alineado con el pliegue de la tela.
        line(d,[(25+tx,hy+3),(28+tx,hy-5),(32+tx,hy-8)],"#dcb96c",1)
        line(d,[(39+tx,hy-6),(42+tx,hy+2)],"#f0dba1",1)
    if fam=="ranger" and p["hat"]=="hood":
        line(d,[(25+tx,hy-2),(30+tx,hy-8),(37+tx,hy-8)],"#9ebd6b",2)
        rect(d,(34+tx,hy-8,36+tx,hy-7),"#d9de91")
    # Draw expressions after hair/headgear so the brows, eyes and mouth remain readable.
    draw_expression(d, fam, sex, row, f, tx, hy, skin, hair)
    # Small hair glints follow the locks instead of becoming flat monochrome shapes.
    if sex == "f":
        line(d, [(27+tx,hy-2),(31+tx,hy-6),(35+tx,hy-6)], hair[1], 1)
        rect(d, (25+tx,hy+10,25+tx,hy+11), hair[1])
    else:
        line(d, [(28+tx,hy-3),(31+tx,hy-6),(35+tx,hy-7)], hair[1], 1)
        rect(d, (27+tx,hy+1,27+tx,hy+2), hair[1])
    # Arms use the pose of each animation row; hands are empty for future weapon layers.
    shoulder_back=(23+tx,48+dy); shoulder_front=(39+tx,48+dy)
    if row==3:
        be,bh,fe,fh=(20+tx,57+dy),(21+tx,67+dy),(40+tx,45+dy),(36+tx,35+dy)
    elif row==5:
        be,bh,fe,fh=(27+tx,51+dy),(35+tx,48+dy),(43+tx,53+dy),(49+tx,48+dy)
    elif row==2:
        be,bh,fe,fh=(17+tx,56+dy),(18+tx,48+dy),(43+tx,56+dy),(46+tx,63+dy)
    elif row==4:
        be,bh,fe,fh=(17+tx,56+dy),(13+tx,60+dy),(38+tx,59+dy),(43+tx,63+dy)
    elif row>=6:
        # Cuatro posturas legibles por arma; el objeto se dibujará como capa independiente.
        # Cada frame expresa preparación, ejecución, extensión y recuperación sin incluir el arma.
        attack_poses={
            6:[((27,51),(31,48),(39,49),(42,46)),((27,47),(31,42),(39,46),(42,41)),((31,47),(37,43),(44,46),(52,42)),((29,50),(33,46),(41,49),(44,46))],
            7:[((28,51),(31,48),(39,50),(37,47)),((27,45),(31,37),(37,43),(34,35)),((34,45),(40,41),(43,48),(48,43)),((29,50),(33,45),(40,49),(39,45))],
            8:[((27,52),(27,51),(39,49),(43,49)),((26,50),(28,48),(40,48),(46,47)),((28,51),(31,50),(43,49),(53,48)),((27,52),(28,51),(39,50),(44,50))],
            9:[((28,50),(30,48),(39,50),(43,46)),((27,47),(29,44),(39,47),(44,43)),((32,49),(36,46),(43,46),(50,41)),((29,51),(31,48),(40,49),(44,45))],
            10:[((27,51),(31,48),(41,48),(47,48)),((27,49),(32,46),(41,47),(49,44)),((27,47),(32,44),(42,46),(50,43)),((27,50),(32,48),(41,48),(47,48))],
            11:[((28,52),(30,57),(38,48),(42,41)),((28,50),(31,54),(39,45),(43,36)),((31,49),(35,52),(41,46),(44,41)),((29,52),(31,56),(39,48),(42,42))],
            12:[((28,51),(31,48),(39,50),(37,47)),((27,45),(31,37),(38,44),(36,35)),((33,46),(38,42),(43,47),(48,42)),((29,50),(33,45),(40,49),(39,45))],
            13:[((29,52),(32,50),(41,48),(45,45)),((30,50),(34,47),(42,46),(47,42)),((30,48),(34,44),(44,43),(49,39)),((29,52),(32,50),(41,48),(45,45))],
            14:[((29,52),(31,49),(41,49),(43,47)),((29,49),(32,46),(42,47),(46,44)),((32,48),(37,45),(44,45),(51,42)),((29,52),(31,49),(41,49),(43,47))],
        }
        attack_pose=attack_poses[row][f]
        be,bh,fe,fh=tuple((x+tx,y+dy) for x,y in attack_pose)
    elif row==1:
        be,bh=(17+tx,53+dy+[-2,1,2,-1][f]),(18+tx,59+dy)
        fe,fh=(43+tx,53+dy-[-1,1,2,-2][f]),(44+tx,58+dy)
    else:
        be,bh,fe,fh=(18+tx,54+dy),(19+tx,61+dy),(42+tx,55+dy),(44+tx,61+dy)
    arm_palette=shirt if fam in ("cleric","mage") else leather
    draw_arm(d,shoulder_back,be,bh,arm_palette,bracer=(fam in ("ranger","novice")))
    draw_arm(d,shoulder_front,fe,fh,arm_palette,bracer=(fam in ("fighter","ranger")))
    # Mangas, brazales y guantes coordinados con el vestuario y modelados alrededor de los antebrazos.
    for elbow,hand in ((be,bh),(fe,fh)):
        start=(elbow[0]+(hand[0]-elbow[0])*0.34,elbow[1]+(hand[1]-elbow[1])*0.34)
        end=(elbow[0]+(hand[0]-elbow[0])*0.68,elbow[1]+(hand[1]-elbow[1])*0.68)
        if fam=="fighter":
            band(d,start,end,metal[0],7,metal[2])
            mx,my=round((start[0]+end[0])/2),round((start[1]+end[1])/2)
            rect(d,(mx-1,my-1,mx+1,my+1),metal[2],INK,1)
            ellipse(d,(hand[0]-4,hand[1]-3,hand[0]+3,hand[1]+3),leather[0],INK,1)
            rect(d,(hand[0]-1,hand[1]-2,hand[0]+1,hand[1]),metal[2])
        elif fam=="cleric":
            band(d,start,end,shirt[0],6,"#f8e4a0")
            line(d,[(hand[0]-3,hand[1]-2),(hand[0]+2,hand[1]-2)],"#e0bf6d",2)
        elif fam=="ranger":
            band(d,start,end,leather[0],6,leather[2])
            rect(d,(round(end[0])-1,round(end[1])-1,round(end[0])+1,round(end[1])+1),metal[2],INK,1)
            ellipse(d,(hand[0]-4,hand[1]-3,hand[0]+3,hand[1]+3),leather[0],INK,1)
            rect(d,(hand[0]-1,hand[1]-2,hand[0]+1,hand[1]-1),leather[2])
        elif fam=="mage":
            band(d,start,end,shirt[1],6,"#c0dcff")
            for off in (-2,1):
                rect(d,(round(end[0])+off,round(end[1])-1,round(end[0])+off+1,round(end[1])), "#d5cbff")
    # El arquero conserva la correa y el carcaj cosidos al atuendo; el arco no está dibujado.
    if fam=="ranger":
        line(d,[(22+tx,47+dy),(37+tx,65+crouch)],leather[2],3)
        line(d,[(23+tx,47+dy),(38+tx,65+crouch)],leather[1],1)
        poly(d,[(17+tx,52+dy),(20+tx,51+dy),(23+tx,62+crouch),(20+tx,65+crouch)],leather[0],INK,1)
    # Bordes del manto visibles junto al cuerpo: ribete bordado, no una pieza superpuesta.
    if fam=="fighter":
        line(d,[(18+tx,62+crouch),(17+tx,73+crouch),(20+tx,81+crouch)],"#d9b66c",2)
        line(d,[(19+tx,64+crouch),(18+tx,73+crouch)],"#fff0bf",1)
    elif fam=="ranger":
        line(d,[(16+tx,67+crouch),(14+tx,79+crouch),(12+tx,84+crouch)],cape[2],2)
        for y in (72,77,82):
            rect(d,(15+tx,y+crouch,16+tx,y+1+crouch),"#d0dc91")
    elif fam=="mage":
        # Sigilos pequeños bordados a ambos lados del cierre de la túnica.
        for x,y in ((23,57),(39,60),(25,73),(38,79)):
            poly(d,[(x+tx,y+dy),(x+tx+2,y+dy-2),(x+tx+3,y+dy),(x+tx+1,y+dy+2)],"#a8d9ff",INK,1)
            rect(d,(x+tx+1,y+dy-1,x+tx+2,y+dy), "#f4eeff")

    # Acabado pictórico final: pliegues, material y reflejos contenidos dentro de la silueta.
    # Novato: tela gastada, costuras visibles y pequeños reflejos en cuero usado.
    if fam=="novice":
        line(d,[(25+tx,52+dy),(27+tx,57+dy),(26+tx,62+crouch)],shirt[1],1)
        line(d,[(36+tx,54+dy),(35+tx,59+dy)],shirt[2],1)
        line(d,[(27+tx,72+crouch),(27+tx,76+crouch)],shirt[2],1)
        line(d,[(34+tx,71+crouch),(35+tx,75+crouch)],shirt[1],1)
        for x,y in ((21,73),(24,75),(37,73)):
            rect(d,(x+tx,y+crouch,x+tx+1,y+crouch+1),leather[2])
        line(d,[(23+tx,86+crouch),(27+tx,87+crouch)],leather[2],1)
    elif fam=="fighter":
        # Acero biselado: luz fría en las placas y sombras profundas bajo cada solape.
        line(d,[(23+tx,46+dy),(27+tx,44+dy),(30+tx,45+dy)],metal[2],1)
        line(d,[(37+tx,46+dy),(41+tx,48+dy),(42+tx,51+dy)],metal[2],1)
        line(d,[(23+tx,59+crouch),(27+tx,61+crouch),(31+tx,60+crouch)],metal[1],1)
        line(d,[(36+tx,61+crouch),(39+tx,59+crouch)],metal[0],1)
        for x,y in ((24,48),(39,51),(27,62),(37,62)):
            rect(d,(x+tx,y+dy,x+tx+1,y+dy+1),metal[2])
        line(d,[(24+tx,73+crouch),(27+tx,75+crouch),(31+tx,75+crouch)],leather[2],1)
    elif fam=="cleric":
        # Pliegues verticales de seda y bordado de hilo dorado en las vestiduras.
        line(d,[(22+tx,71+crouch),(23+tx,84+crouch),(21+tx,94+crouch)],shirt[0],1)
        line(d,[(35+tx,72+crouch),(34+tx,85+crouch),(37+tx,96+crouch)],shirt[2],1)
        line(d,[(26+tx,77+crouch),(27+tx,90+crouch)],"#9f7a40",1)
        line(d,[(30+tx,79+crouch),(29+tx,91+crouch)],"#fff0bf",1)
        for x,y in ((22,85),(25,92),(37,87),(33,96)):
            rect(d,(x+tx,y+crouch,x+tx+1,y+crouch+1),"#f5df9b")
    elif fam=="ranger":
        # Grano del cuero, doble costura del jerkin y marcas de hojas del manto.
        line(d,[(23+tx,55+dy),(24+tx,61+crouch)],leather[2],1)
        line(d,[(38+tx,53+dy),(37+tx,61+crouch)],leather[0],1)
        for x,y in ((25,57),(29,60),(33,62),(36,57)):
            rect(d,(x+tx,y+dy,x+tx+1,y+dy+1),shirt[2])
        line(d,[(24+tx,74+crouch),(27+tx,77+crouch),(27+tx,82+crouch)],leather[2],1)
        line(d,[(34+tx,75+crouch),(32+tx,81+crouch)],shirt[2],1)
        for x,y in ((16,73),(17,78),(15,82)):
            poly(d,[(x+tx,y+crouch),(x+tx+2,y+crouch-2),(x+tx+3,y+crouch),(x+tx+1,y+crouch+2)],cape[2],INK,1)
    elif fam=="mage":
        # Pliegues en índigo, ribetes de plata y glifos cosidos al dobladillo.
        line(d,[(23+tx,55+dy),(25+tx,61+crouch),(24+tx,67+crouch)],shirt[1],1)
        line(d,[(37+tx,54+dy),(39+tx,61+crouch),(37+tx,67+crouch)],shirt[2],1)
        line(d,[(27+tx,72+crouch),(28+tx,85+crouch)],"#a8c9f3",1)
        line(d,[(34+tx,73+crouch),(33+tx,86+crouch)],"#bda2e2",1)
        for x,y in ((24,77),(27,83),(35,79),(38,86)):
            poly(d,[(x+tx,y+crouch),(x+tx+1,y+crouch-2),(x+tx+2,y+crouch),(x+tx+1,y+crouch+1)],"#bcdfff",INK,1)
        for x in (24,30,36):
            rect(d,(x+tx,96+crouch,x+tx+1,97+crouch),"#f0d5ff")

    # Final highlights stay within the outline, no free-floating badges or accessories.
    rect(d,(28+tx,44+dy,29+tx,46+dy),shirt[2])
    rect(d,(25+tx,66+crouch,27+tx,67+crouch),leather[2])

    # Tier 1 — Espadachín: golpe recibido legible al tamaño nativo.
    # El flash aparece en el fotograma de impacto y permanece dentro de la silueta.
    if cid in ("novato","espadachin") and row==2 and f==1:
        ix,iy=39+tx,53+dy
        line(d,[(ix-5,iy-2),(ix-2,iy),(ix-4,iy+3)],"#fff2bd",2)
        line(d,[(ix,iy-5),(ix+1,iy-1)],"#f4d17a",2)
        line(d,[(ix+4,iy-3),(ix+1,iy)],"#fff2bd",2)
        line(d,[(ix+4,iy+2),(ix+1,iy+1)],"#e5b55d",1)
        rect(d,(ix-1,iy-1,ix,iy),"#fff9de")
    elif cid in ("novato","espadachin") and row==2 and f==2:
        # Destello residual corto durante la postura encogida de dolor.
        rect(d,(39+tx,54+dy,40+tx,55+dy),"#f4d17a")

    # Una inclinación de pocos grados transmite el golpe; el pivote queda en los pies.
    # Se aplica a la celda aislada para no mover el punto de apoyo en la batalla.
    if row==2 and cid in ("novato","espadachin"):
        angle={0:0.0,1:4.5,2:1.5,3:-2.5}[f]
        if angle:
            im=im.rotate(angle,resample=Image.Resampling.NEAREST,center=(32,112),expand=False)
    return im

def generate(cid, sex):
    sheet=Image.new("RGBA",(256,1920),(0,0,0,0))
    for row in range(ROWS):
        for frame in range(COLS):
            sprite=draw_frame(cid,sex,row,frame)
            # Widen the integrated silhouette with nearest-neighbour scaling; keep pixel edges crisp.
            sprite=sprite.resize((77,H),Image.Resampling.NEAREST).crop((6,0,70,H))
            sheet.alpha_composite(sprite,(frame*W,row*H))
    # Novato utiliza arte aprobado para Idle, Caminar y Recibir daño.
    # El resto de las acciones conserva sus filas actuales hasta cada iteración posterior.
    if cid == "novato":
        walk_path = ROOT / "assets" / "spritesheets" / "novato" / f"novato-{sex}-walk-row.png"
        with Image.open(walk_path) as walk_source:
            walk = walk_source.convert("RGBA")
        assert walk.size == (256, 128), (walk_path, walk.size)
        assert walk.getchannel("A").getextrema()[0] == 0, (walk_path, "la fila debe conservar transparencia")
        sheet.paste((0, 0, 0, 0), (0, H, 256, 2 * H))
        sheet.alpha_composite(walk, (0, H))

        # La tira de daño dibujada a mano está aprobada para la aventurera.
        # El Novato masculino mantiene por ahora la fila generada existente hasta
        # terminar de validar la exportación binaria de su tira personalizada.
        if sex == "f":
            hurt_path = ROOT / "assets" / "spritesheets" / "novato" / f"novato-{sex}-hurt-row.png"
            with Image.open(hurt_path) as hurt_source:
                hurt = hurt_source.convert("RGBA")
            assert hurt.size == (256, 128), (hurt_path, hurt.size)
            assert hurt.getchannel("A").getextrema() == (0, 255), (hurt_path, "se exige transparencia real y píxeles visibles")
            sheet.paste((0, 0, 0, 0), (0, 2 * H, 256, 3 * H))
            sheet.alpha_composite(hurt, (0, 2 * H))

        master_path = ROOT / "assets" / "spritesheets" / "novato" / f"novato-{sex}-master.png"
        with Image.open(master_path) as master_source:
            master = master_source.convert("RGBA")
        assert master.size == (64, 128), (master_path, master.size)

        # Novato masculino: conservar el acabado del sprite maestro y animar el golpe.
        # Se transforman fotogramas completos; no se recompone un cuerpo de otra calidad.
        if sex == "m":
            sheet.paste((0, 0, 0, 0), (0, 2 * H, 256, 3 * H))
            for frame in range(COLS):
                hurt_pose = master.copy()
                if frame == 1:
                    # Retroceso breve alrededor de los pies, con destello sobre el torso.
                    hurt_pose = hurt_pose.rotate(5.0, resample=Image.Resampling.NEAREST,
                                                  center=(32, 114), expand=False)
                    impact = ImageDraw.Draw(hurt_pose)
                    impact.line([(35, 51), (39, 53), (37, 56)], fill="#fff2bd", width=2)
                    impact.line([(40, 49), (40, 52)], fill="#f4d17a", width=2)
                    impact.line([(43, 51), (40, 53)], fill="#fff2bd", width=1)
                    impact.point((39, 52), fill="#fff9de")
                elif frame == 2:
                    # Compresión vertical con la base apoyada en el suelo de la celda.
                    compressed = master.resize((64, 116), Image.Resampling.NEAREST)
                    hurt_pose = Image.new("RGBA", (W, H), (0, 0, 0, 0))
                    hurt_pose.alpha_composite(compressed, (0, 12))
                    impact = ImageDraw.Draw(hurt_pose)
                    impact.point((39, 55), fill="#f4d17a")
                elif frame == 3:
                    # Recuperación inclinándose ligeramente hacia la posición inicial.
                    hurt_pose = hurt_pose.rotate(-2.5, resample=Image.Resampling.NEAREST,
                                                  center=(32, 114), expand=False)
                sheet.alpha_composite(hurt_pose, (frame * W, 2 * H))

        # Idle queda anclado al diseño maestro; variaciones de uno píxel simulan respiración.
        sheet.paste((0, 0, 0, 0), (0, 0, 256, H))
        idle_offsets = ((0, 0), (0, -1), (1, -1), (0, 0))
        for frame, (dx, dy) in enumerate(idle_offsets):
            sheet.alpha_composite(master, (frame * W + dx, dy))

    dest=OUT/cid/f"{cid}-{sex}-sheet.png";dest.parent.mkdir(parents=True,exist_ok=True)
    sheet.save(dest,optimize=True,compress_level=9)
    with Image.open(dest) as verify:
        assert verify.size==(256,1920) and verify.mode=="RGBA" and verify.getchannel("A").getextrema()[0]==0
    print(f"{dest.relative_to(ROOT)}: {dest.stat().st_size} bytes")

def main():
    ap=argparse.ArgumentParser();ap.add_argument("--phase",choices=("novato","tier1","all"),default="novato");a=ap.parse_args()
    classes={"novato":["novato"],"tier1":["espadachin","acolito","arquero","mago"],"all":["novato","espadachin","acolito","arquero","mago"]}[a.phase]
    for cid in classes:
        for sex in ("m","f"):generate(cid,sex)
    print(f"OK: {len(classes)*2} complete sheets, 4 columns × 15 rows, 64×128 cells.")
if __name__=="__main__":main()
