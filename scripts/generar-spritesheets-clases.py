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
 "novato": dict(family="novice",shirt=("#eee0c4","#b8a27d","#fff1d8"),leather=("#563326","#8b5635","#c28a55"),metal=("#414750","#727b83","#c2c8c7"),hair=("#3a251d","#78462b"),skin=("#a9684e","#d89570","#f0bd96"),cape=None,hat="none"),
 "espadachin": dict(family="fighter",shirt=("#263b54","#3f5d7b","#9ab9cc"),leather=("#4d2b26","#8e5438","#c28a51"),metal=("#343e4c","#778995","#d5dcda"),hair=("#39261d","#74432b"),skin=("#a9684e","#d89570","#f0bd96"),cape=("#203657","#3e6085","#8aaac7"),hat="none"),
 "acolito": dict(family="cleric",shirt=("#d8c7a1","#b5a071","#fbefd4"),leather=("#54392a","#90613a","#d2ac69"),metal=("#656b6d","#a8aeaa","#e6e0c9"),hair=("#54372b","#956244"),skin=("#a9684e","#d89570","#f0bd96"),cape=("#604939","#94714d","#dac9a3"),hat="hood"),
 "arquero": dict(family="ranger",shirt=("#30452e","#526e3c","#9cac70"),leather=("#473025","#8b5c38","#c0935b"),metal=("#454d43","#818b75","#c5c7a8"),hair=("#483024","#89613d"),skin=("#a9684e","#d89570","#f0bd96"),cape=("#293f2b","#49633a","#91a05f"),hat="hood"),
 "mago": dict(family="mage",shirt=("#222b52","#394c83","#829fd0"),leather=("#3d2940","#78537c","#c39dcc"),metal=("#3a405d","#717da1","#c9d5e8"),hair=("#30243b","#69547a"),skin=("#a9684e","#d89570","#f0bd96"),cape=("#1d274a","#354576","#788fc1"),hat="point"),
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

def pose(row,f):
    dx=[0,-1,0,1][f]; dy=[0,-1,0,1][f]; crouch=0
    if row==1: dx=[-3,1,3,-1][f];dy=[0,-2,0,1][f]
    if row==2: dx=[0,-2,-3,0][f];dy=[2,4,3,1][f];crouch=[1,3,3,1][f]
    if row==3: dy=[0,-1,-2,0][f]
    if row==4: dx=[-3,-4,2,1][f];dy=[2,5,3,0][f];crouch=[2,5,3,0][f]
    if row==5: dx=[0,1,1,0][f];dy=0
    if row>=6:
        if row in (6,7,12):dx=[-1,1,3,0][f];dy=[0,-3,-1,1][f]
        elif row in (8,9,10):dx=[0,1,2,0][f];dy=[0,0,-1,0][f]
        else:dx=[0,1,0,-1][f];dy=[0,-2,-1,0][f]
    return dx,dy,crouch

def draw_frame(cid, sex, row, f):
    p=P[cid]; fam=p["family"]; shirt=p["shirt"]; leather=p["leather"]; metal=p["metal"]; skin=p["skin"]; hair=p["hair"]; cape=p["cape"]
    im=Image.new("RGBA",(W,H),(0,0,0,0));d=ImageDraw.Draw(im)
    dx,dy,crouch=pose(row,f); tx=dx; hy=24+dy//2; hip=82+crouch
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
    elif fam=="fighter":
        poly(d,[(22+tx,65+dy),(42+tx,65+dy),(41+tx,82+crouch),(36+tx,88+crouch),(25+tx,87+crouch),(21+tx,80+crouch)],leather[0],width=2)
        poly(d,[(24+tx,68+dy),(30+tx,69+dy),(29+tx,82+crouch),(25+tx,81+crouch)],shirt[0],INK,1)
        line(d,[(32+tx,68+dy),(34+tx,82+crouch)],metal[2],2)
    else:
        poly(d,[(22+tx,65+dy),(42+tx,65+dy),(40+tx,85+crouch),(35+tx,90+crouch),(25+tx,89+crouch),(21+tx,82+crouch)],shirt[0],width=2)
        poly(d,[(24+tx,68+dy),(31+tx,70+dy),(30+tx,83+crouch),(24+tx,81+crouch)],shirt[1],INK,1)
        line(d,[(34+tx,68+dy),(36+tx,82+crouch)],shirt[2],2)
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
    if p["hat"]=="hood":
        h0=cape[0]; h1=cape[2]
        poly(d,[(25+tx,hy+8),(24+tx,hy-2),(29+tx,hy-10),(37+tx,hy-10),(43+tx,hy-3),(44+tx,hy+8),(39+tx,hy+6),(37+tx,hy-2),(31+tx,hy+1),(29+tx,hy+8)],h0,INK,2)
        poly(d,[(30+tx,hy+2),(35+tx,hy-1),(40+tx,hy+3),(41+tx,hy+8),(37+tx,hy+10),(31+tx,hy+8)],skin[1],INK,1)
        line(d,[(26+tx,hy-1),(32+tx,hy-7),(38+tx,hy-6)],h1,2)
    elif p["hat"]=="point":
        poly(d,[(22+tx,hy+1),(26+tx,hy-7),(29+tx,hy-18),(34+tx,hy-13),(39+tx,hy-5),(46+tx,hy+1),(22+tx,hy+3)],shirt[0],INK,2)
        poly(d,[(28+tx,hy-9),(31+tx,hy-15),(37+tx,hy-4),(41+tx,hy),(34+tx,hy-1)],shirt[1],INK,1)
        line(d,[(23+tx,hy+1),(45+tx,hy+1)],shirt[2],2)
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
        attack_pose={6:((19,47),(15,40),(42,48),(50,42)),7:((20,47),(19,38),(40,47),(42,36)),8:((19,49),(13,49),(42,49),(52,49)),9:((21,49),(19,53),(40,48),(47,43)),10:((19,49),(15,49),(43,47),(50,45)),11:((21,47),(22,39),(40,47),(47,41)),12:((20,47),(19,37),(42,48),(49,38)),13:((20,48),(18,42),(42,48),(50,43)),14:((22,49),(22,53),(42,48),(48,52))}[row]
        be,bh,fe,fh=tuple((x+tx,y+dy) for x,y in attack_pose)
    elif row==1:
        be,bh=(17+tx,53+dy+[-2,1,2,-1][f]),(18+tx,59+dy)
        fe,fh=(43+tx,53+dy-[-1,1,2,-2][f]),(44+tx,58+dy)
    else:
        be,bh,fe,fh=(18+tx,54+dy),(19+tx,61+dy),(42+tx,55+dy),(44+tx,61+dy)
    arm_palette=shirt if fam in ("cleric","mage") else leather
    draw_arm(d,shoulder_back,be,bh,arm_palette,bracer=(fam in ("ranger","novice")))
    if fam=="fighter":
        ellipse(d,(34+tx,42+dy,47+tx,54+dy),metal[1],INK,2)
        ellipse(d,(36+tx,43+dy,44+tx,49+dy),metal[2],INK,1)
        line(d,[(37+tx,47+dy),(43+tx,46+dy)],metal[0],2)
    draw_arm(d,shoulder_front,fe,fh,arm_palette,bracer=(fam in ("fighter","ranger")))
    if fam=="mage":
        line(d,[(28+tx,55+dy),(35+tx,62+crouch)],leather[2],3)
        rect(d,(31+tx,58+crouch,35+tx,62+crouch),metal[0],INK,1)
        ellipse(d,(32+tx,59+crouch,34+tx,61+crouch),"#83c9ed",INK,1)
    elif fam=="cleric":
        line(d,[(31+tx,49+dy),(35+tx,53+dy),(31+tx,58+dy)],leather[2],2)
        ellipse(d,(30+tx,53+dy,34+tx,57+dy),"#e7c766",INK,1)
    elif fam=="ranger":
        line(d,[(22+tx,47+dy),(37+tx,65+crouch)],leather[2],3)
        line(d,[(23+tx,47+dy),(38+tx,65+crouch)],leather[1],1)
        poly(d,[(17+tx,52+dy),(20+tx,51+dy),(23+tx,62+crouch),(20+tx,65+crouch)],leather[0],INK,1)
    elif fam=="fighter":
        line(d,[(28+tx,48+dy),(35+tx,63+crouch)],metal[2],2)
        line(d,[(31+tx,55+dy),(35+tx,60+crouch)],metal[0],2)
    # Final highlights stay within the outline, no free-floating badges or accessories.
    rect(d,(28+tx,44+dy,29+tx,46+dy),shirt[2])
    rect(d,(25+tx,66+crouch,27+tx,67+crouch),leather[2])
    return im

def generate(cid, sex):
    sheet=Image.new("RGBA",(256,1920),(0,0,0,0))
    for row in range(ROWS):
        for frame in range(COLS):
            sprite=draw_frame(cid,sex,row,frame)
            # Widen the integrated silhouette with nearest-neighbour scaling; keep pixel edges crisp.
            sprite=sprite.resize((77,H),Image.Resampling.NEAREST).crop((6,0,70,H))
            sheet.alpha_composite(sprite,(frame*W,row*H))
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
