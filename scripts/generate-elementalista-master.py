#!/usr/bin/env python3
"""Generate weapon-free raster PNG masters for Tier 2 Elementalista."""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets/spritesheets/originales/elementalista/v2/source"
OUT.mkdir(parents=True, exist_ok=True)
P = {
 "ink":(23,24,39,255),"ink2":(40,37,56,255),
 "skin":(231,177,143,255),"skin_l":(250,211,178,255),"skin_s":(169,104,83,255),
 "hair_d":(38,42,66,255),"hair":(66,84,120,255),"hair_m":(111,143,183,255),"hair_l":(180,207,232,255),
 "robe_d":(28,38,79,255),"robe":(43,56,112,255),"robe_m":(63,84,153,255),"robe_l":(113,138,201,255),
 "violet_d":(52,36,91,255),"violet":(80,53,132,255),"violet_m":(121,87,176,255),"violet_l":(177,139,218,255),
 "cyan_d":(36,79,99,255),"cyan":(51,120,143,255),"cyan_m":(86,166,182,255),"cyan_l":(147,210,215,255),
 "gold_d":(91,63,42,255),"gold":(163,119,58,255),"gold_m":(213,171,85,255),"gold_l":(244,213,131,255),
 "trouser_d":(35,34,47,255),"trouser":(54,54,76,255),"trouser_l":(91,89,118,255),
 "boot_d":(34,29,37,255),"boot":(62,47,57,255),"boot_l":(141,106,80,255),
}
def poly(d, pts, color, outline="ink"):
 d.polygon(pts, fill=P[color], outline=P[outline])
def line(d, pts, color, width=1):
 d.line(pts, fill=P[color], width=width, joint="curve")
def rect(d, box, color, outline=None):
 d.rectangle(box, fill=P[color], outline=P[outline] if outline else None)

def draw_frame(sex, action, n):
 im=Image.new("RGBA",(64,128),(0,0,0,0)); d=ImageDraw.Draw(im)
 if action=="idle":
  hy=[0,-1,0,1][n]; ty=0
  ll=[(0,0),(0,-1),(1,0),(0,1)][n]; rl=[(0,0),(1,1),(0,0),(-1,-1)][n]
  la=[(0,0),(1,-1),(0,0),(-1,1)][n]; ra=[(0,0),(-1,1),(1,0),(0,-1)][n]
  lean=0
 elif action=="walk":
  hy=[0,-1,0,1][n]; ty=0
  ll=[(-4,1),(-2,-1),(4,-2),(2,1)][n]; rl=[(4,-2),(2,1),(-4,1),(-2,-1)][n]
  la=[(3,-4),(1,1),(-3,4),(-1,-1)][n]; ra=[(-3,4),(-1,-1),(3,-4),(1,1)][n]
  lean=[0,0,1,0][n]
 else:
  hy=[2,3,4,2][n]; ty=[1,2,3,1][n]
  ll=[(0,0),(1,0),(2,1),(0,0)][n]; rl=[(0,0),(-1,1),(-1,0),(1,0)][n]
  la=[(5,-8),(7,-10),(6,-12),(2,-7)][n]; ra=[(-5,-6),(-7,-9),(-7,-11),(-3,-7)][n]
  lean=[1,2,3,1][n]
 lx,ly=ll; rx,ry=rl; alx,aly=la; arx,ary=ra

 # Flowing back mantle.
 poly(d,[(18,35+ty),(25,32+ty),(39,34+ty),(47,42+ty),(49,60),(45,77),(37,89),(28,92),(17,83),(12,64),(14,45)],"violet_d")
 poly(d,[(20,38+ty),(26,35+ty),(37,37+ty),(43,44+ty),(44,61),(39,78),(30,86),(21,78),(16,63),(17,47)],"violet")
 poly(d,[(20,43),(24,40),(25,58),(21,71),(17,75),(15,64)],"violet_m","violet_d")
 line(d,[(17,49),(18,64),(16,69)],"violet_l",2)
 line(d,[(19,79),(24,84),(30,85),(37,79)],"gold_m")
 # Legs visible below robe.
 poly(d,[(31+rx,77+ty),(39+rx,78+ty),(39+rx,88+ry),(36+rx,99+ry),(34+rx,105+ry),(29+rx,104+ry),(28+rx,99+ry),(32+rx,88+ry)],"trouser_d")
 poly(d,[(33+rx,82+ty),(37+rx,83+ty),(36+rx,92+ry),(33+rx,100+ry),(31+rx,100+ry),(31+rx,96+ry),(34+rx,88+ry)],"trouser")
 line(d,[(35+rx,85+ty),(34+rx,94+ry),(32+rx,98+ry)],"trouser_l",2)
 poly(d,[(21+lx,77+ty),(31+lx,78+ty),(30+lx,89+ly),(27+lx,100+ly),(25+lx,105+ly),(20+lx,104+ly),(18+lx,100+ly),(22+lx,88+ly)],"trouser_d")
 poly(d,[(23+lx,83+ty),(29+lx,84+ty),(27+lx,93+ly),(24+lx,100+ly),(22+lx,100+ly),(22+lx,97+ly),(25+lx,89+ly)],"trouser")
 line(d,[(25+lx,86+ty),(24+lx,94+ly),(22+lx,98+ly)],"trouser_l",2)
 for x,y in [(19+lx,99+ly),(28+rx,99+ry)]:
  poly(d,[(x,y),(x+7,y),(x+8,y+7),(x+14,y+10),(x+13,y+16),(x+1,y+16),(x-2,y+12),(x,y+7)],"boot_d")
  poly(d,[(x+1,y+1),(x+6,y+1),(x+7,y+7),(x+12,y+10),(x+11,y+13),(x,y+13),(x-1,y+10)],"boot")
  line(d,[(x+1,y+5),(x+7,y+6),(x+8,y+9)],"boot_l",2)
  line(d,[(x-1,y+14),(x+12,y+14)],"ink",2)
 # Long blue-violet elemental robe, flare at hem.
 poly(d,[(21,36+ty),(27,33+ty),(38,35+ty),(44,42+ty),(43,65+ty),(47,84+ty),(43,94+ty),(33,91+ty),(29,88+ty),(23,94+ty),(14,88+ty),(18,70+ty),(17,45+ty)],"robe_d")
 poly(d,[(23,38+ty),(28,36+ty),(37,38+ty),(41,44+ty),(40,65+ty),(43,83+ty),(40,89+ty),(33,87+ty),(29,83+ty),(23,89+ty),(17,84+ty),(21,68+ty),(20,46+ty)],"robe")
 poly(d,[(23,43+ty),(27,40+ty),(29,46+ty),(28,72+ty),(24,83+ty),(19,82+ty),(22,68+ty)],"robe_m","robe_d")
 line(d,[(23,47+ty),(24,63+ty),(21,77+ty)],"robe_l",2)
 # Inner cyan panel and gold hem ornament.
 poly(d,[(29,42+ty),(35,41+ty),(36,66+ty),(35,82+ty),(30,84+ty),(27,80+ty),(29,65+ty)],"cyan_d","gold_d")
 poly(d,[(30,44+ty),(34,44+ty),(34,66+ty),(33,79+ty),(30,80+ty),(29,65+ty)],"cyan")
 line(d,[(31,46+ty),(32,62+ty),(31,75+ty)],"cyan_l")
 line(d,[(19,85+ty),(24,89+ty),(29,84+ty),(33,88+ty),(40,85+ty)],"gold_m",2)
 # Gold geometric elemental embroidery: diamond and small rays, not a weapon/effect.
 poly(d,[(31,53+ty),(34,57+ty),(31,61+ty),(28,57+ty)],"gold_m","gold_d")
 rect(d,(30,56+ty,32,58+ty),"gold_l")
 line(d,[(24,56+ty),(27,58+ty)],"gold_l")
 line(d,[(35,58+ty),(38,56+ty)],"gold_l")
 line(d,[(24,72+ty),(26,75+ty),(24,78+ty)],"gold_m")
 line(d,[(37,72+ty),(39,75+ty),(37,78+ty)],"gold_m")
 # Sleeves, shoulders and forearm wraps.
 poly(d,[(17,39+ty),(23,37+ty),(27,42+ty),(24+alx,54+ty+aly),(20+alx,62+ty+aly),(15+alx,62+ty+aly),(13+alx,58+ty+aly),(17,49+ty)],"robe_d")
 poly(d,[(18,42+ty),(22,41+ty),(24+alx,54+ty+aly),(20+alx,59+ty+aly),(17+alx,58+ty+aly),(18,49+ty)],"robe_m")
 line(d,[(18,45+ty),(19+alx,54+ty+aly)],"gold_m",2)
 poly(d,[(39,40+ty),(44,43+ty),(49+arx,54+ty+ary),(52+arx,61+ty+ary),(48+arx,65+ty+ary),(44+arx,61+ty+ary),(40,51+ty)],"robe_d")
 poly(d,[(40,43+ty),(43,45+ty),(48+arx,55+ty+ary),(49+arx,60+ty+ary),(47+arx,61+ty+ary),(44,52+ty)],"robe_m")
 line(d,[(42,46+ty),(47+arx,56+ty+ary)],"gold_m",2)
 rect(d,(15+alx,59+ty+aly,19+alx,63+ty+aly),"gold_d","ink2")
 line(d,[(16+alx,60+ty+aly),(18+alx,60+ty+aly)],"gold_l")
 rect(d,(48+arx,59+ty+ary,52+arx,63+ty+ary),"gold_d","ink2")
 line(d,[(49+arx,60+ty+ary),(51+arx,60+ty+ary)],"gold_l")
 poly(d,[(14+alx,62+ty+aly),(18+alx,62+ty+aly),(20+alx,66+ty+aly),
         (18+alx,70+ty+aly),(15+alx,70+ty+aly),(12+alx,67+ty+aly)],"skin_s")
 poly(d,[(15+alx,63+ty+aly),(18+alx,64+ty+aly),(18+alx,67+ty+aly),
         (16+alx,68+ty+aly),(14+alx,66+ty+aly)],"skin")
 poly(d,[(48+arx,62+ty+ary),(52+arx,62+ty+ary),(55+arx,66+ty+ary),
         (53+arx,70+ty+ary),(50+arx,70+ty+ary),(47+arx,67+ty+ary)],"skin_s")
 poly(d,[(49+arx,63+ty+ary),(52+arx,64+ty+ary),(52+arx,67+ty+ary),
         (50+arx,68+ty+ary),(49+arx,66+ty+ary)],"skin")
 # Waist sash and medallion.
 line(d,[(20,66+ty),(40,66+ty)],"violet_l",3)
 rect(d,(28,64+ty,35,70+ty),"gold_d","ink2")
 rect(d,(29,65+ty,34,69+ty),"gold_m")
 rect(d,(30,66+ty,33,68+ty),"cyan_l")
 # Neck and collar.
 rect(d,(27,28+hy,36,39+ty),"skin_s","ink2")
 poly(d,[(22,35+ty),(27,33+ty),(32,37+ty),(38,34+ty),(43,39+ty),
         (39,45+ty),(29,44+ty),(22,41+ty)],"robe_d")
 poly(d,[(24,37+ty),(28,36+ty),(32,39+ty),(37,37+ty),(40,40+ty),
         (37,42+ty),(30,42+ty),(25,40+ty)],"cyan_m","robe_d")
 line(d,[(26,38+ty),(31,40+ty),(37,39+ty)],"cyan_l",2)
 # Head and swept blue-silver hair; distinct male/female profiles.
 poly(d,[(23,12+hy),(25,5+hy),(31,2+hy),(40,4+hy),(45,11+hy),
         (43,23+hy),(38,31+hy),(27,29+hy),(23,22+hy)],"hair_d")
 if sex=="m":
  poly(d,[(25,12+hy),(29,7+hy),(35,6+hy),(41,9+hy),(42,15+hy),
          (38,17+hy),(35,13+hy),(31,16+hy),(28,20+hy),(24,18+hy)],"hair")
  poly(d,[(28,10+hy),(31,7+hy),(36,8+hy),(39,10+hy),(35,12+hy),(31,12+hy)],"hair_m","hair_d")
  line(d,[(30,9+hy),(34,8+hy),(37,9+hy)],"hair_l",2)
  poly(d,[(29,14+hy),(37,13+hy),(40,17+hy),(38,23+hy),(34,26+hy),
          (29,22+hy),(27,18+hy)],"skin","ink2")
  poly(d,[(30,15+hy),(35,15+hy),(38,17+hy),(36,19+hy),(32,19+hy)],"skin_l","skin_l")
  rect(d,(35,18+hy,36,19+hy),"ink"); rect(d,(30,17+hy,31,18+hy),"ink")
  line(d,[(33,22+hy),(36,22+hy)],"skin_s"); rect(d,(38,20+hy,39,21+hy),"skin_s")
  poly(d,[(27,14+hy),(29,10+hy),(33,8+hy),(36,10+hy),(34,14+hy),
          (31,13+hy),(29,17+hy)],"hair_m","hair_d")
 else:
  poly(d,[(27,12+hy),(23,15+hy),(22,24+hy),(24,33+hy),(29,29+hy),(30,21+hy)],"hair")
  poly(d,[(24,19+hy),(24,25+hy),(27,29+hy),(28,25+hy)],"hair_m","hair_d")
  line(d,[(25,21+hy),(27,26+hy)],"hair_l")
  poly(d,[(26,12+hy),(29,6+hy),(36,4+hy),(42,8+hy),(43,17+hy),
          (39,24+hy),(32,25+hy),(26,19+hy)],"hair_d")
  poly(d,[(29,11+hy),(32,7+hy),(37,7+hy),(40,11+hy),(39,18+hy),
          (34,21+hy),(29,17+hy)],"hair_m","hair_d")
  line(d,[(30,10+hy),(33,8+hy),(37,9+hy)],"hair_l",2)
  poly(d,[(29,14+hy),(37,13+hy),(40,16+hy),(38,23+hy),(34,26+hy),
          (29,22+hy),(27,18+hy)],"skin","ink2")
  poly(d,[(30,15+hy),(35,15+hy),(38,17+hy),(36,19+hy),(32,19+hy)],"skin_l","skin_l")
  rect(d,(35,18+hy,36,19+hy),"ink"); rect(d,(30,17+hy,31,18+hy),"ink")
  line(d,[(33,22+hy),(36,22+hy)],"skin_s"); rect(d,(38,20+hy,39,21+hy),"skin_s")
  poly(d,[(27,14+hy),(29,10+hy),(33,8+hy),(36,10+hy),(34,14+hy),
          (31,13+hy),(29,17+hy)],"hair_m","hair_d")
 # Simple circlet with center gem: worn clothing, not a spell effect.
 line(d,[(27,11+hy),(32,9+hy),(38,11+hy)],"gold_m",2)
 poly(d,[(31,8+hy),(33,10+hy),(31,12+hy),(29,10+hy)],"cyan_l","gold_d")
 # Engraved hems and small motes on the robe fabric.
 for x,y in [(21,82),(25,85),(36,83),(39,81),(25,57),(38,60)]:
  d.point((x,y+ty),fill=P["gold_l"])
 line(d,[(20,87+ty),(24,89+ty)],"gold_l")
 line(d,[(37,88+ty),(41,86+ty)],"gold_l")
 return im

def main():
 for sex in ("m","f"):
  master=Image.new("RGBA",(256,384),(0,0,0,0))
  for row,action in enumerate(("idle","walk","hurt")):
   for col in range(4):
    master.alpha_composite(draw_frame(sex,action,col),(col*64,row*128))
  path=OUT/f"elementalista-{sex}-core-3rows.png"
  master.save(path,optimize=True)
  print(path)
if __name__=="__main__": main()
