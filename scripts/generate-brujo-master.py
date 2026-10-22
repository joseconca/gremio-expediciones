#!/usr/bin/env python3
"""Generate weapon-free raster PNG masters for Tier 2 Brujo."""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets/spritesheets/originales/brujo/v2/source"
OUT.mkdir(parents=True, exist_ok=True)

P = {
 "ink":(20,18,27,255),"ink2":(43,30,43,255),
 "skin":(211,157,133,255),"skin_l":(241,192,164,255),"skin_s":(132,77,73,255),
 "hair_d":(32,25,39,255),"hair":(62,39,71,255),"hair_m":(105,63,117,255),"hair_l":(157,106,167,255),
 "robe_d":(29,24,39,255),"robe":(47,34,58,255),"robe_m":(70,44,84,255),"robe_l":(108,71,128,255),
 "wine_d":(64,24,51,255),"wine":(102,34,68,255),"wine_m":(145,50,83,255),"wine_l":(194,91,117,255),
 "silver_d":(79,77,93,255),"silver":(148,145,164,255),"silver_l":(208,208,220,255),
 "bone_d":(98,79,76,255),"bone":(174,148,132,255),"bone_l":(222,205,185,255),
 "trouser_d":(31,29,40,255),"trouser":(51,45,62,255),"trouser_l":(85,74,99,255),
 "boot_d":(29,25,29,255),"boot":(57,39,41,255),"boot_l":(119,79,68,255),
}
def poly(d,pts,color,outline="ink"):
 d.polygon(pts,fill=P[color],outline=P[outline])
def line(d,pts,color,width=1):
 d.line(pts,fill=P[color],width=width,joint="curve")
def rect(d,box,color,outline=None):
 d.rectangle(box,fill=P[color],outline=P[outline] if outline else None)

def draw_frame(sex,action,n):
 im=Image.new("RGBA",(64,128),(0,0,0,0)); d=ImageDraw.Draw(im)
 if action=="idle":
  hy=[0,-1,0,1][n]; ty=0
  ll=[(0,0),(0,-1),(1,0),(0,1)][n]; rl=[(0,0),(1,1),(0,0),(-1,-1)][n]
  la=[(0,0),(0,-1),(1,0),(0,1)][n]; ra=[(0,0),(-1,0),(0,1),(1,0)][n]
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

 # Long torn-edged mantle with an asymmetrical hem.
 poly(d,[(18,33+ty),(25,30+ty),(39,33+ty),(47,42+ty),(49,58),(45,78),
         (39,88),(31,92),(20,86),(13,68),(14,45)],"wine_d")
 poly(d,[(19,36+ty),(26,34+ty),(37,36+ty),(43,44+ty),(44,60),(40,77),
         (32,85),(23,81),(17,65),(17,46)],"wine")
 poly(d,[(19,43),(23,40),(25,57),(20,72),(16,75),(14,63)],"wine_m","wine_d")
 line(d,[(17,49),(18,63),(15,69)],"wine_l",2)
 line(d,[(22,80),(27,84),(32,84),(39,77)],"silver")
 # Legs emerging below split robe.
 poly(d,[(31+rx,77+ty),(39+rx,78+ty),(39+rx,88+ry),(36+rx,99+ry),
         (34+rx,105+ry),(29+rx,104+ry),(28+rx,99+ry),(32+rx,88+ry)],"trouser_d")
 poly(d,[(33+rx,82+ty),(37+rx,83+ty),(36+rx,92+ry),(33+rx,100+ry),
         (31+rx,100+ry),(31+rx,96+ry),(34+rx,88+ry)],"trouser")
 line(d,[(35+rx,85+ty),(34+rx,94+ry),(32+rx,98+ry)],"trouser_l",2)
 poly(d,[(21+lx,77+ty),(31+lx,78+ty),(30+lx,89+ly),(27+lx,100+ly),
         (25+lx,105+ly),(20+lx,104+ly),(18+lx,100+ly),(22+lx,88+ly)],"trouser_d")
 poly(d,[(23+lx,83+ty),(29+lx,84+ty),(27+lx,93+ly),(24+lx,100+ly),
         (22+lx,100+ly),(22+lx,97+ly),(25+lx,89+ly)],"trouser")
 line(d,[(25+lx,86+ty),(24+lx,94+ly),(22+lx,98+ly)],"trouser_l",2)
 for x,y in [(19+lx,99+ly),(28+rx,99+ry)]:
  poly(d,[(x,y),(x+7,y),(x+8,y+7),(x+14,y+10),(x+13,y+16),
          (x+1,y+16),(x-2,y+12),(x,y+7)],"boot_d")
  poly(d,[(x+1,y+1),(x+6,y+1),(x+7,y+7),(x+12,y+10),
          (x+11,y+13),(x,y+13),(x-1,y+10)],"boot")
  line(d,[(x+1,y+5),(x+7,y+6),(x+8,y+9)],"boot_l",2)
  line(d,[(x-1,y+14),(x+12,y+14)],"ink",2)

 # Dark robe. Split front panel is layered clothing, not a weapon.
 poly(d,[(21,35+ty),(27,32+ty),(38,34+ty),(44,42+ty),(43,65+ty),
         (47,84+ty),(42,94+ty),(33,91+ty),(29,87+ty),(23,94+ty),
         (14,88+ty),(18,70+ty),(17,45+ty)],"robe_d")
 poly(d,[(23,38+ty),(28,35+ty),(37,37+ty),(41,44+ty),(40,65+ty),
         (43,83+ty),(40,89+ty),(33,87+ty),(29,83+ty),(23,89+ty),
         (17,84+ty),(21,68+ty),(20,46+ty)],"robe")
 poly(d,[(23,43+ty),(27,40+ty),(29,46+ty),(28,72+ty),
         (24,83+ty),(19,82+ty),(22,68+ty)],"robe_m","robe_d")
 line(d,[(23,47+ty),(24,63+ty),(21,77+ty)],"robe_l",2)
 # Burgundy central stole and silver sewn border.
 poly(d,[(29,42+ty),(36,41+ty),(37,67+ty),(35,82+ty),
         (30,84+ty),(27,80+ty),(29,65+ty)],"wine_d","silver_d")
 poly(d,[(30,44+ty),(35,44+ty),(35,66+ty),(33,79+ty),
         (30,80+ty),(29,65+ty)],"wine")
 line(d,[(31,46+ty),(32,62+ty),(31,75+ty)],"wine_l")
 line(d,[(28,43+ty),(27,67+ty),(24,83+ty)],"silver")
 line(d,[(37,43+ty),(37,67+ty),(35,82+ty)],"silver")
 # Small stitched sigils on fabric; no glowing spell effect.
 poly(d,[(31,53+ty),(34,57+ty),(31,61+ty),(28,57+ty)],"silver","silver_d")
 line(d,[(31,55+ty),(31,59+ty)],"silver_l")
 line(d,[(29,57+ty),(33,57+ty)],"silver_l")
 for x,y in [(23,72),(25,75),(38,70),(37,75),(24,81),(39,81)]:
  d.point((x,y+ty),fill=P["silver_l"])
 # Oversized dark sleeves and empty hands.
 poly(d,[(17,38+ty),(24,36+ty),(28,42+ty),(24+alx,55+ty+aly),
         (20+alx,62+ty+aly),(15+alx,62+ty+aly),(13+alx,58+ty+aly),
         (17,49+ty)],"robe_d")
 poly(d,[(18,41+ty),(22,40+ty),(24+alx,54+ty+aly),
         (20+alx,59+ty+aly),(17+alx,58+ty+aly),(18,49+ty)],"robe_m")
 line(d,[(18,45+ty),(19+alx,54+ty+aly)],"silver",2)
 poly(d,[(39,39+ty),(44,42+ty),(49+arx,54+ty+ary),
         (52+arx,61+ty+ary),(48+arx,65+ty+ary),(44+arx,61+ty+ary),
         (40,51+ty)],"robe_d")
 poly(d,[(40,42+ty),(43,44+ty),(48+arx,55+ty+ary),
         (49+arx,60+ty+ary),(47+arx,61+ty+ary),(44,52+ty)],"robe_m")
 line(d,[(42,45+ty),(47+arx,56+ty+ary)],"silver",2)
 rect(d,(15+alx,59+ty+aly,19+alx,63+ty+aly),"silver_d","ink2")
 poly(d,[(14+alx,62+ty+aly),(18+alx,62+ty+aly),(20+alx,66+ty+aly),
         (18+alx,70+ty+aly),(15+alx,70+ty+aly),(12+alx,67+ty+aly)],"skin_s")
 poly(d,[(15+alx,63+ty+aly),(18+alx,64+ty+aly),(18+alx,67+ty+aly),
         (16+alx,68+ty+aly),(14+alx,66+ty+aly)],"skin")
 rect(d,(48+arx,59+ty+ary,52+arx,63+ty+ary),"silver_d","ink2")
 poly(d,[(48+arx,62+ty+ary),(52+arx,62+ty+ary),(55+arx,66+ty+ary),
         (53+arx,70+ty+ary),(50+arx,70+ty+ary),(47+arx,67+ty+ary)],"skin_s")
 poly(d,[(49+arx,63+ty+ary),(52+arx,64+ty+ary),(52+arx,67+ty+ary),
         (50+arx,68+ty+ary),(49+arx,66+ty+ary)],"skin")

 # High collar and layered hood.
 rect(d,(27,28+hy,36,39+ty),"skin_s","ink2")
 poly(d,[(21,34+ty),(27,31+ty),(32,36+ty),(39,33+ty),
         (44,39+ty),(40,46+ty),(29,44+ty),(22,41+ty)],"robe_d")
 poly(d,[(24,36+ty),(28,34+ty),(32,38+ty),(37,36+ty),
         (40,40+ty),(37,42+ty),(30,41+ty),(25,39+ty)],"wine")
 line(d,[(25,37+ty),(31,39+ty),(37,38+ty)],"silver",2)
 # Large hood silhouette gives Brujo a different shape from Elementalista.
 poly(d,[(20,13+hy),(22,6+hy),(29,1+hy),(39,3+hy),(46,11+hy),
         (45,23+hy),(40,32+hy),(29,35+hy),(21,28+hy)],"robe_d")
 poly(d,[(24,11+hy),(27,6+hy),(33,4+hy),(40,8+hy),(42,16+hy),
         (39,25+hy),(32,29+hy),(25,24+hy)],"robe","robe_d")
 line(d,[(26,12+hy),(29,8+hy),(34,7+hy)],"robe_l",2)
 # Face under the shadowed brow.
 if sex=="m":
  poly(d,[(26,13+hy),(29,9+hy),(36,8+hy),(41,13+hy),(40,21+hy),
          (36,27+hy),(30,25+hy),(27,20+hy)],"skin","ink2")
  poly(d,[(27,14+hy),(30,10+hy),(36,10+hy),(40,14+hy),(36,14+hy),
          (32,13+hy),(29,17+hy)],"hair_m","hair_d")
  line(d,[(29,11+hy),(34,10+hy),(38,12+hy)],"hair_l")
  rect(d,(34,17+hy,35,18+hy),"ink")
  rect(d,(29,17+hy,30,18+hy),"ink")
  line(d,[(32,22+hy),(36,22+hy)],"skin_s")
  rect(d,(39,20+hy,40,21+hy),"skin_s")
  poly(d,[(27,13+hy),(29,9+hy),(34,7+hy),(38,9+hy),
          (34,13+hy),(31,12+hy),(29,16+hy)],"hair","hair_d")
 else:
  poly(d,[(27,13+hy),(23,16+hy),(22,24+hy),(25,34+hy),
          (29,29+hy),(30,20+hy)],"hair_d")
  poly(d,[(24,19+hy),(24,25+hy),(27,30+hy),(28,25+hy)],"hair_m","hair_d")
  line(d,[(25,21+hy),(27,26+hy)],"hair_l")
  poly(d,[(27,12+hy),(30,7+hy),(37,6+hy),(42,11+hy),
          (42,18+hy),(38,25+hy),(32,26+hy),(27,20+hy)],"hair_d")
  poly(d,[(30,11+hy),(33,8+hy),(38,9+hy),(40,13+hy),
          (39,19+hy),(34,22+hy),(29,17+hy)],"hair_m","hair_d")
  line(d,[(31,10+hy),(34,9+hy),(38,11+hy)],"hair_l",2)
  poly(d,[(29,14+hy),(38,13+hy),(41,17+hy),(39,23+hy),
          (34,27+hy),(30,23+hy),(27,18+hy)],"skin","ink2")
  poly(d,[(30,15+hy),(36,15+hy),(39,17+hy),(36,19+hy),(32,19+hy)],"skin_l","skin_l")
  rect(d,(34,18+hy,35,19+hy),"ink")
  rect(d,(29,17+hy,30,18+hy),"ink")
  line(d,[(33,23+hy),(36,23+hy)],"skin_s")
  rect(d,(39,20+hy,40,21+hy),"skin_s")
 # Hood silver pin and tiny stitched symbols, not an external spell effect.
 poly(d,[(25,31+ty),(28,34+ty),(25,37+ty),(22,34+ty)],"silver","silver_d")
 rect(d,(24,33+ty,26,35+ty),"wine_l")
 line(d,[(20,49+ty),(21,57+ty)],"silver_d")
 line(d,[(42,50+ty),(43,58+ty)],"silver_d")
 return im

def main():
 for sex in ("m","f"):
  master=Image.new("RGBA",(256,384),(0,0,0,0))
  for row,action in enumerate(("idle","walk","hurt")):
   for col in range(4):
    master.alpha_composite(draw_frame(sex,action,col),(col*64,row*128))
  path=OUT/f"brujo-{sex}-core-3rows.png"
  master.save(path,optimize=True)
  print(path)
if __name__=="__main__": main()
