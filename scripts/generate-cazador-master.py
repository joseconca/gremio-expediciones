#!/usr/bin/env python3
"""Generate original raster PNG masters for Tier 2 Cazador, with no embedded weapons."""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets/spritesheets/originales/cazador/v2/source"
OUT.mkdir(parents=True, exist_ok=True)
P = {
 "ink":(28,23,21,255),"ink2":(53,37,27,255),
 "skin":(228,164,121,255),"skinL":(248,199,153,255),"skinS":(170,93,65,255),
 "hairD":(67,39,29,255),"hair":(105,60,38,255),"hairM":(148,85,49,255),"hairL":(201,133,72,255),
 "hoodD":(28,45,32,255),"hood":(44,69,42,255),"hoodM":(63,91,49,255),"hoodL":(101,127,66,255),
 "clothD":(33,48,31,255),"cloth":(45,69,39,255),"clothM":(66,91,48,255),"clothL":(107,127,65,255),
 "capeD":(28,42,31,255),"cape":(37,59,37,255),"capeM":(53,77,44,255),"capeL":(90,111,57,255),
 "leatherD":(48,31,24,255),"leather":(79,48,30,255),"leatherM":(125,77,42,255),"leatherL":(177,121,60,255),
 "metalD":(80,69,43,255),"metal":(155,126,65,255),"metalL":(221,190,107,255),
 "trouserD":(41,39,31,255),"trouser":(59,56,40,255),"trouserL":(94,84,55,255),
 "bootD":(42,30,24,255),"boot":(75,49,32,255),"bootL":(165,113,59,255)
}
def poly(d, pts, color, outline="ink"):
 d.polygon(pts, fill=P[color], outline=P[outline])
def line(d, pts, color, width=1):
 d.line(pts, fill=P[color], width=width, joint="curve")
def rect(d, box, color, outline=None):
 d.rectangle(box, fill=P[color], outline=P[outline] if outline else None)

def draw_frame(sex, action, n):
 im=Image.new("RGBA",(64,128),(0,0,0,0)); d=ImageDraw.Draw(im)
 idle=[(0,0),(0,-1),(1,0),(0,1)]
 stride=[(-4,3),(-1,-2),(4,-3),(1,2)]
 impact=[(0,0),(1,-1),(2,1),(0,2)]
 if action=="idle":
  hy,ty=idle[n][1],0; nlx,nly,flx,fly=0,0,0,0
  alx,aly=[(0,0),(0,-1),(1,0),(0,1)][n]; arx,ary=[(0,0),(0,1),(-1,0),(0,-1)][n]
 elif action=="walk":
  stride_pose=[(-4,2,4,-1),(-2,-1,-3,2),(4,-2,-4,1),(2,1,3,-2)][n]
  hy,ty=[0,-1,0,1][n],0
  nlx,nly=stride_pose[0],stride_pose[1]; flx,fly=stride_pose[2],stride_pose[3]
  arm_pose=[(3,-5),(0,2),(-3,5),(0,-2)][n]
  alx,aly=arm_pose; arx,ary=-arm_pose[0],-arm_pose[1]
 else:
  hy,ty=[2,3,4,2][n],0
  nlx,nly=[(0,0),(1,0),(2,1),(1,0)][n]; flx,fly=[(1,0),(0,1),(-1,0),(0,1)][n]
  alx,aly=[(6,-8),(8,-11),(5,-13),(2,-7)][n]
  arx,ary=[(-6,-7),(-8,-10),(-8,-12),(-4,-8)][n]

 # Short forest cape/mantle.
 poly(d,[(17,37+ty),(26,33+ty),(39,35+ty),(48,43+ty),(51,62),(47,76),(42,86),(31,91),(17,83),(12,68),(13,48)],"capeD")
 poly(d,[(18,39+ty),(26,37+ty),(37,39+ty),(44,46+ty),(45,64),(40,79),(32,84),(20,78),(16,67),(16,49)],"cape")
 poly(d,[(18,46),(21,43),(23,57),(21,70),(17,76),(15,68)],"capeM","capeD")
 line(d,[(17,52),(17,66),(15,71)],"capeL",2); line(d,[(19,78),(25,82),(32,83),(39,78)],"leatherL")
 # Legs and boots.
 poly(d,[(31+flx,71+ty),(40+flx,72+ty),(40+flx,85+fly),(38+flx,97+fly),(35+flx,104+fly),(29+flx,103+fly),(28+flx,98+fly),(32+flx,84+fly)],"trouserD")
 poly(d,[(33+flx,77+ty),(38+flx,78+ty),(37+flx,89+fly),(35+flx,98+fly),(32+flx,100+fly),(31+flx,96+fly),(34+flx,86+fly)],"trouser")
 line(d,[(36+flx,80+ty),(35+flx,89+fly),(33+flx,95+fly)],"trouserL",2)
 poly(d,[(21+nlx,71+ty),(31+nlx,73+ty),(31+nlx,85+nly),(28+nlx,97+nly),(26+nlx,104+nly),(20+nlx,103+nly),(18+nlx,99+nly),(22+nlx,84+nly)],"trouserD")
 poly(d,[(22+nlx,78+ty),(29+nlx,79+ty),(27+nlx,89+nly),(25+nlx,98+nly),(22+nlx,99+nly),(21+nlx,96+nly),(24+nlx,86+nly)],"trouser")
 line(d,[(25+nlx,81+ty),(24+nlx,90+nly),(22+nlx,95+nly)],"trouserL",2)
 poly(d,[(20+nlx,87+nly),(28+nlx,87+nly),(27+nlx,93+nly),(21+nlx,94+nly)],"leather")
 line(d,[(21+nlx,89+nly),(27+nlx,89+nly)],"leatherL")
 poly(d,[(31+flx,87+fly),(38+flx,87+fly),(37+flx,92+fly),(31+flx,92+fly)],"leatherD")
 line(d,[(32+flx,89+fly),(37+flx,89+fly)],"leatherM")
 for x,y in [(18+nlx,98+nly),(28+flx,99+fly)]:
  poly(d,[(x,y),(x+7,y),(x+9,y+8),(x+15,y+11),(x+14,y+17),(x+1,y+17),(x-2,y+13),(x,y+8)],"bootD")
  poly(d,[(x+1,y+1),(x+6,y+1),(x+8,y+8),(x+12,y+11),(x+11,y+13),(x,y+13),(x-1,y+10)],"boot")
  line(d,[(x+1,y+6),(x+7,y+7),(x+8,y+9)],"bootL",2)
  line(d,[(x-1,y+15),(x+13,y+15)],"ink",2)
  rect(d,(x+2,y+4,x+6,y+6),"leatherM"); line(d,[(x+2,y+5),(x+5,y+5)],"metalL")
 # Tunic and layered shoulders.
 poly(d,[(20,36+ty),(27,33+ty),(38,35+ty),(45,43+ty),(43,63+ty),(39,77+ty),(31,81+ty),(21,77+ty),(16,62+ty),(17,45+ty)],"clothD")
 poly(d,[(22,38+ty),(28,36+ty),(37,38+ty),(41,45+ty),(39,61+ty),(36,73+ty),(30,77+ty),(23,73+ty),(20,61+ty),(20,46+ty)],"cloth")
 poly(d,[(23,42+ty),(28,40+ty),(30,44+ty),(29,67+ty),(25,70+ty),(22,61+ty)],"clothM","clothD")
 line(d,[(24,45+ty),(25,54+ty),(24,65+ty)],"clothL",2)
 poly(d,[(17,39+ty),(23,36+ty),(27,41+ty),(24,48+ty),(18,47+ty),(15,43+ty)],"leatherD")
 poly(d,[(18,40+ty),(22,38+ty),(25,42+ty),(23,45+ty),(19,45+ty)],"leatherM","leatherD")
 line(d,[(18,41+ty),(22,40+ty)],"leatherL")
 poly(d,[(37,38+ty),(43,41+ty),(46,47+ty),(41,50+ty),(36,45+ty)],"leatherD")
 poly(d,[(38,40+ty),(42,43+ty),(43,46+ty),(40,47+ty)],"leatherM","leatherD")
 line(d,[(39,42+ty),(42,44+ty)],"leatherL")
 # Reinforced harness and tool pouches only; no bow, arrows, blades or other weapons.
 line(d,[(22,43+ty),(27,49+ty),(32,58+ty)],"leatherD",5)
 line(d,[(22,42+ty),(27,48+ty),(32,57+ty)],"leatherM",2)
 line(d,[(23,43+ty),(28,49+ty)],"leatherL")
 rect(d,(19,65+ty,41,70+ty),"leatherD","ink"); line(d,[(20,66+ty),(39,66+ty)],"leatherL")
 rect(d,(29,65+ty,34,70+ty),"metal","leatherD"); rect(d,(30,66+ty,33,69+ty),"metalL")
 poly(d,[(19,67+ty),(25,67+ty),(25,76+ty),(20,77+ty),(18,73+ty)],"leatherD")
 line(d,[(20,69+ty),(23,69+ty)],"leatherL")
 poly(d,[(37,68+ty),(42,68+ty),(43,75+ty),(38,76+ty)],"leatherD")
 line(d,[(39,70+ty),(41,70+ty)],"leatherL")
 # Arms: empty, gloved hands.
 poly(d,[(17,41+ty),(21,43+ty),(19+alx,55+ty+aly),(16+alx,64+ty+aly),(11+alx,64+ty+aly),(9+alx,60+ty+aly),(13,50+ty)],"leatherD")
 poly(d,[(16,44+ty),(19,45+ty),(17+alx,55+ty+aly),(14+alx,61+ty+aly),(12+alx,60+ty+aly),(15,51+ty)],"leatherM")
 line(d,[(16,47+ty),(14+alx,56+ty+aly)],"leatherL",2)
 poly(d,[(39,42+ty),(44,44+ty),(49+arx,54+ty+ary),(53+arx,62+ty+ary),(49+arx,66+ty+ary),(45+arx,62+ty+ary),(41,52+ty)],"leatherD")
 poly(d,[(40,45+ty),(43,46+ty),(48+arx,55+ty+ary),(50+arx,61+ty+ary),(48+arx,62+ty+ary),(44,52+ty)],"leatherM")
 line(d,[(42,47+ty),(47+arx,56+ty+ary)],"leatherL",2)
 rect(d,(10+alx,60+ty+aly,15+alx,64+ty+aly),"metalD","leatherD")
 line(d,[(11+alx,61+ty+aly),(14+alx,61+ty+aly)],"metalL")
 poly(d,[(10+alx,63+ty+aly),(15+alx,62+ty+aly),(17+alx,66+ty+aly),(15+alx,70+ty+aly),(12+alx,70+ty+aly),(9+alx,67+ty+aly)],"skinS")
 poly(d,[(11+alx,64+ty+aly),(14+alx,64+ty+aly),(15+alx,67+ty+aly),(13+alx,68+ty+aly),(11+alx,67+ty+aly)],"skin")
 rect(d,(49+arx,61+ty+ary,53+arx,65+ty+ary),"metalD","leatherD")
 poly(d,[(49+arx,64+ty+ary),(53+arx,63+ty+ary),(56+arx,67+ty+ary),(54+arx,71+ty+ary),(51+arx,71+ty+ary),(48+arx,68+ty+ary)],"skinS")
 poly(d,[(50+arx,65+ty+ary),(53+arx,65+ty+ary),(54+arx,68+ty+ary),(52+arx,69+ty+ary),(50+arx,68+ty+ary)],"skin")
 # Neck and scarf.
 rect(d,(27,28+hy,36,39+ty),"skinS","ink2")
 poly(d,[(22,36+ty),(27,33+ty),(32,37+ty),(38,34+ty),(43,39+ty),(39,45+ty),(29,44+ty),(22,41+ty)],"hoodD")
 poly(d,[(24,37+ty),(28,36+ty),(32,39+ty),(37,37+ty),(40,40+ty),(37,42+ty),(30,42+ty),(25,40+ty)],"hoodM","hoodD")
 line(d,[(26,38+ty),(31,40+ty),(37,39+ty)],"hoodL",2)
 # Hood behind head.
 poly(d,[(22,12+hy),(25,5+hy),(31,2+hy),(40,4+hy),(46,11+hy),(44,29+hy),(38,36+hy),(27,33+hy),(22,25+hy)],"hoodD")
 poly(d,[(25,11+hy),(28,7+hy),(34,5+hy),(40,7+hy),(43,13+hy),(41,25+hy),(36,31+hy),(29,29+hy),(25,23+hy)],"hood","hoodD")
 line(d,[(26,12+hy),(30,8+hy),(35,7+hy)],"hoodL",2)
 if sex=="m":
  poly(d,[(25,13+hy),(27,6+hy),(33,3+hy),(41,5+hy),(44,10+hy),(42,20+hy),(38,25+hy),(29,24+hy),(24,19+hy)],"hairD")
  poly(d,[(27,11+hy),(30,7+hy),(35,6+hy),(41,9+hy),(40,17+hy),(36,21+hy),(29,20+hy),(26,16+hy)],"hair")
  poly(d,[(28,10+hy),(31,7+hy),(35,7+hy),(38,9+hy),(35,12+hy),(32,11+hy),(29,14+hy)],"hairM","hairD")
  line(d,[(29,9+hy),(32,8+hy),(34,9+hy)],"hairL",2)
  poly(d,[(29,13+hy),(38,12+hy),(42,16+hy),(40,23+hy),(36,27+hy),(31,24+hy),(28,19+hy)],"skin","ink2")
  poly(d,[(30,14+hy),(36,14+hy),(39,16+hy),(37,18+hy),(32,18+hy)],"skinL","skinL")
  rect(d,(35,18+hy,36,19+hy),"ink"); rect(d,(31,17+hy,32,18+hy),"ink")
  rect(d,(31,16+hy,33,16+hy),"hairD"); line(d,[(34,23+hy),(37,23+hy)],"skinS")
  rect(d,(39,20+hy,40,21+hy),"skinS")
  poly(d,[(27,13+hy),(29,9+hy),(33,8+hy),(36,10+hy),(34,13+hy),(31,12+hy),(29,16+hy)],"hairM","hairD")
  line(d,[(30,10+hy),(33,10+hy)],"hairL")
 else:
  poly(d,[(28,13+hy),(23,15+hy),(21,23+hy),(24,33+hy),(29,28+hy),(31,20+hy)],"hairD")
  poly(d,[(26,17+hy),(24,21+hy),(25,28+hy),(28,25+hy)],"hairM","hairD")
  line(d,[(25,20+hy),(26,25+hy)],"hairL")
  poly(d,[(26,12+hy),(29,6+hy),(36,4+hy),(42,8+hy),(43,17+hy),(39,24+hy),(32,25+hy),(26,19+hy)],"hairD")
  poly(d,[(29,11+hy),(32,7+hy),(37,7+hy),(40,11+hy),(39,18+hy),(34,21+hy),(29,17+hy)],"hairM","hairD")
  line(d,[(30,10+hy),(33,8+hy),(37,9+hy)],"hairL",2)
  poly(d,[(29,14+hy),(38,13+hy),(41,17+hy),(39,23+hy),(35,27+hy),(30,24+hy),(27,19+hy)],"skin","ink2")
  poly(d,[(30,15+hy),(36,15+hy),(38,17+hy),(36,19+hy),(32,19+hy)],"skinL","skinL")
  rect(d,(35,18+hy,36,19+hy),"ink"); rect(d,(30,17+hy,31,18+hy),"ink")
  line(d,[(33,23+hy),(36,23+hy)],"skinS"); rect(d,(38,20+hy,39,21+hy),"skinS")
  poly(d,[(27,14+hy),(29,9+hy),(33,8+hy),(36,10+hy),(34,14+hy),(31,13+hy),(29,17+hy)],"hairM","hairD")
  line(d,[(30,10+hy),(33,10+hy)],"hairL")
  rect(d,(24,16+hy,27,18+hy),"hoodL","hoodD")
 # Small seams and stitches.
 line(d,[(24,53+ty),(26,58+ty),(25,64+ty)],"clothL")
 line(d,[(36,51+ty),(37,57+ty)],"leatherL")
 for x,y in [(22,54),(25,58),(35,53),(38,59),(24,69),(35,70)]:
  d.point((x,y),fill=P["clothL"])
 return im

def main():
 for sex in ("m","f"):
  master=Image.new("RGBA",(256,384),(0,0,0,0))
  for row,action in enumerate(("idle","walk","hurt")):
   for col in range(4):
    master.alpha_composite(draw_frame(sex,action,col),(col*64,row*128))
  out=OUT/f"cazador-{sex}-core-3rows.png"
  master.save(out,optimize=True)
  print(out)
if __name__=="__main__": main()
