#!/usr/bin/env python3
"""Generate weapon-free raster PNG masters for Tier 2 Explorador."""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets/spritesheets/originales/explorador/v2/source"
OUT.mkdir(parents=True, exist_ok=True)

P = {
    "ink": (30, 29, 27, 255), "ink2": (54, 43, 33, 255),
    "skin": (230, 174, 132, 255), "skin_l": (248, 205, 164, 255), "skin_s": (165, 98, 70, 255),
    "hair_d": (58, 36, 30, 255), "hair": (107, 61, 38, 255), "hair_m": (151, 88, 50, 255), "hair_l": (204, 139, 76, 255),
    "cloth_d": (35, 48, 43, 255), "cloth": (57, 76, 64, 255), "cloth_m": (84, 104, 80, 255), "cloth_l": (132, 144, 105, 255),
    "teal_d": (27, 60, 62, 255), "teal": (38, 91, 91, 255), "teal_m": (61, 125, 117, 255), "teal_l": (114, 166, 145, 255),
    "sand_d": (87, 57, 36, 255), "sand": (147, 102, 58, 255), "sand_m": (193, 145, 85, 255), "sand_l": (224, 187, 121, 255),
    "leather_d": (53, 35, 28, 255), "leather": (88, 56, 36, 255), "leather_m": (131, 83, 49, 255), "leather_l": (182, 126, 68, 255),
    "metal_d": (74, 71, 53, 255), "metal": (159, 142, 90, 255), "metal_l": (219, 197, 131, 255),
    "trouser_d": (42, 43, 38, 255), "trouser": (65, 65, 53, 255), "trouser_l": (105, 99, 74, 255),
    "boot_d": (38, 31, 27, 255), "boot": (75, 52, 36, 255), "boot_l": (155, 112, 63, 255),
}
def poly(d, pts, color, outline="ink"):
    d.polygon(pts, fill=P[color], outline=P[outline])
def line(d, pts, color, width=1):
    d.line(pts, fill=P[color], width=width, joint="curve")
def rect(d, box, color, outline=None):
    d.rectangle(box, fill=P[color], outline=P[outline] if outline else None)

def draw_frame(sex, action, frame):
    im = Image.new("RGBA", (64, 128), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    idle_bob = [0, -1, 0, 1][frame]
    if action == "idle":
        head_y, torso_y = idle_bob, 0
        left_leg, right_leg = [(0,0), (0,-1), (1,0), (0,1)][frame], [(0,0), (1,1), (0,0), (-1,-1)][frame]
        left_arm, right_arm = [(0,0), (0,-1), (1,0), (0,1)][frame], [(0,0), (1,0), (0,1), (-1,0)][frame]
        lean = [0,0,0,0][frame]
    elif action == "walk":
        head_y, torso_y = [0,-1,0,1][frame], 0
        left_leg = [(-4,1), (-2,-1), (4,-2), (2,1)][frame]
        right_leg = [(4,-2), (2,1), (-4,1), (-2,-1)][frame]
        left_arm = [(3,-3), (1,1), (-3,4), (-1,-1)][frame]
        right_arm = [(-3,4), (-1,-1), (3,-3), (1,1)][frame]
        lean = [0,0,1,0][frame]
    else:
        head_y, torso_y = [1,2,3,1][frame], [1,2,3,1][frame]
        left_leg = [(0,0),(1,0),(2,1),(0,0)][frame]
        right_leg = [(0,0),(-1,1),(-1,0),(1,0)][frame]
        left_arm = [(4,-7),(6,-9),(4,-11),(1,-6)][frame]
        right_arm = [(-4,-5),(-6,-8),(-6,-10),(-3,-6)][frame]
        lean = [1,2,3,1][frame]

    # Short travel cape, not a weapon layer.
    poly(d, [(18,38+torso_y),(24,34+torso_y),(38,36+torso_y),(46,43+torso_y),
             (48,58),(45,72),(39,84),(29,88),(18,80),(12,64),(14,47)], "teal_d")
    poly(d, [(19,40+torso_y),(25,37+torso_y),(37,39+torso_y),(42,45+torso_y),
             (43,59),(39,75),(30,82),(21,76),(16,63),(17,48)], "teal")
    poly(d, [(19,46),(23,43),(24,55),(21,68),(17,73),(15,64)], "teal_m", "teal_d")
    line(d, [(17,51),(18,63),(16,68)], "teal_l", 2)
    line(d, [(19,76),(24,80),(30,81),(37,75)], "sand_m", 1)

    # Trousers and counter-moving legs; shoes stay on the same baseline.
    lx, ly = left_leg; rx, ry = right_leg
    poly(d, [(30+rx,70+torso_y),(40+rx,70+torso_y),(40+rx,83+ry),(37+rx,96+ry),
             (34+rx,103+ry),(29+rx,102+ry),(28+rx,97+ry),(32+rx,83+ry)], "trouser_d")
    poly(d, [(32+rx,76+torso_y),(38+rx,77+torso_y),(37+rx,88+ry),(34+rx,97+ry),
             (32+rx,98+ry),(31+rx,94+ry),(34+rx,84+ry)], "trouser")
    line(d, [(35+rx,79+torso_y),(35+rx,88+ry),(33+rx,94+ry)], "trouser_l", 2)
    poly(d, [(20+lx,69+torso_y),(31+lx,71+torso_y),(30+lx,83+ly),(27+lx,96+ly),
             (24+lx,103+ly),(19+lx,103+ly),(17+lx,99+ly),(22+lx,83+ly)], "trouser_d")
    poly(d, [(22+lx,76+torso_y),(29+lx,78+torso_y),(27+lx,88+ly),(24+lx,97+ly),
             (22+lx,98+ly),(21+lx,94+ly),(24+lx,84+ly)], "trouser")
    line(d, [(25+lx,79+torso_y),(24+lx,89+ly),(22+lx,94+ly)], "trouser_l", 2)
    # Knee wraps and pads
    poly(d, [(21+lx,87+ly),(28+lx,87+ly),(27+lx,92+ly),(21+lx,93+ly)], "sand_d")
    line(d, [(22+lx,89+ly),(27+lx,89+ly)], "sand_l")
    poly(d, [(31+rx,86+ry),(38+rx,86+ry),(37+rx,91+ry),(31+rx,91+ry)], "leather_d")
    line(d, [(32+rx,88+ry),(37+rx,88+ry)], "leather_l")
    # Travel boots with high cuffs
    for x, y in [(18+lx,98+ly),(29+rx,98+ry)]:
        poly(d, [(x,y),(x+7,y),(x+8,y+7),(x+14,y+10),(x+14,y+16),
                 (x+1,y+16),(x-2,y+12),(x,y+7)], "boot_d")
        poly(d, [(x+1,y+1),(x+6,y+1),(x+7,y+7),(x+12,y+10),(x+11,y+13),
                 (x,y+13),(x-1,y+10)], "boot")
        line(d, [(x+1,y+5),(x+7,y+6),(x+8,y+9)], "boot_l", 2)
        line(d, [(x-1,y+14),(x+13,y+14)], "ink", 2)
        rect(d, (x+2,y+3,x+6,y+5), "sand", "leather_d")

    # Travel tunic and open-front vest, deliberately lighter than the Cazador.
    poly(d, [(20,37+torso_y),(27,34+torso_y),(38,36+torso_y),(44,42+torso_y),
             (42,62+torso_y),(38,76+torso_y),(30,80+torso_y),(22,76+torso_y),
             (17,62+torso_y),(17,44+torso_y)], "cloth_d")
    poly(d, [(22,39+torso_y),(28,37+torso_y),(36,39+torso_y),(40,45+torso_y),
             (38,61+torso_y),(35,72+torso_y),(29,76+torso_y),(24,72+torso_y),
             (20,61+torso_y),(20,46+torso_y)], "cloth")
    poly(d, [(22,43+torso_y),(27,41+torso_y),(29,45+torso_y),(28,66+torso_y),
             (24,69+torso_y),(21,60+torso_y)], "cloth_m", "cloth_d")
    line(d, [(23,46+torso_y),(24,56+torso_y),(23,65+torso_y)], "cloth_l", 2)
    # Open travel vest with contrasting shoulder panels.
    poly(d, [(19,38+torso_y),(24,36+torso_y),(28,41+torso_y),(25,57+torso_y),
             (22,62+torso_y),(18,55+torso_y),(17,44+torso_y)], "sand_d")
    poly(d, [(20,39+torso_y),(23,38+torso_y),(26,42+torso_y),(23,53+torso_y),
             (21,56+torso_y),(19,51+torso_y)], "sand", "sand_d")
    line(d, [(20,42+torso_y),(22,46+torso_y)], "sand_l")
    poly(d, [(36,39+torso_y),(41,41+torso_y),(44,49+torso_y),(40,54+torso_y),
             (36,49+torso_y)], "teal_d")
    poly(d, [(37,41+torso_y),(40,43+torso_y),(42,49+torso_y),(40,51+torso_y)], "teal_m")

    # Shoulder strap and navigation/supply pouches, no weapon or quiver.
    line(d, [(22,42+torso_y),(27,49+torso_y),(33,59+torso_y)], "leather_d", 5)
    line(d, [(22,42+torso_y),(27,49+torso_y),(33,59+torso_y)], "leather_m", 2)
    line(d, [(23,43+torso_y),(28,50+torso_y)], "leather_l")
    rect(d, (19,64+torso_y,41,69+torso_y), "leather_d", "ink")
    line(d, [(20,65+torso_y),(39,65+torso_y)], "sand_l")
    rect(d, (29,64+torso_y,34,69+torso_y), "metal", "leather_d")
    rect(d, (30,65+torso_y,33,68+torso_y), "metal_l")
    # Pouches: square travel pouch and a narrow case on the hip.
    poly(d, [(18,67+torso_y),(24,67+torso_y),(25,75+torso_y),(21,77+torso_y),
             (17,73+torso_y)], "leather_d")
    poly(d, [(19,68+torso_y),(23,68+torso_y),(23,73+torso_y),(20,74+torso_y)], "sand")
    line(d, [(20,69+torso_y),(22,69+torso_y)], "sand_l")
    poly(d, [(37,67+torso_y),(42,68+torso_y),(42,76+torso_y),(38,77+torso_y)], "teal_d")
    line(d, [(38,69+torso_y),(41,69+torso_y)], "teal_l")

    # Arms move opposite to the legs; open hands remain visible and empty.
    alx, aly = left_arm; arx, ary = right_arm
    poly(d, [(17,41+torso_y),(21,43+torso_y),(19+alx,54+torso_y+aly),
             (16+alx,62+torso_y+aly),(11+alx,63+torso_y+aly),
             (9+alx,59+torso_y+aly),(13,50+torso_y)], "sand_d")
    poly(d, [(17,44+torso_y),(19,45+torso_y),(17+alx,55+torso_y+aly),
             (14+alx,60+torso_y+aly),(12+alx,59+torso_y+aly),
             (15,51+torso_y)], "sand")
    line(d, [(16,47+torso_y),(14+alx,56+torso_y+aly)], "sand_l", 2)
    poly(d, [(39,42+torso_y),(44,44+torso_y),(49+arx,54+torso_y+ary),
             (53+arx,61+torso_y+ary),(49+arx,65+torso_y+ary),
             (45+arx,62+torso_y+ary),(41,52+torso_y)], "leather_d")
    poly(d, [(40,45+torso_y),(43,46+torso_y),(48+arx,55+torso_y+ary),
             (50+arx,60+torso_y+ary),(48+arx,61+torso_y+ary),(44,52+torso_y)], "leather")
    line(d, [(42,47+torso_y),(47+arx,56+torso_y+ary)], "leather_l", 2)
    rect(d, (10+alx,60+torso_y+aly,15+alx,64+torso_y+aly), "metal", "leather_d")
    poly(d, [(10+alx,63+torso_y+aly),(15+alx,62+torso_y+aly),
             (17+alx,66+torso_y+aly),(15+alx,70+torso_y+aly),
             (12+alx,70+torso_y+aly),(9+alx,67+torso_y+aly)], "skin_s")
    poly(d, [(11+alx,64+torso_y+aly),(14+alx,64+torso_y+aly),
             (15+alx,67+torso_y+aly),(13+alx,68+torso_y+aly),
             (11+alx,67+torso_y+aly)], "skin")
    rect(d, (49+arx,60+torso_y+ary,53+arx,64+torso_y+ary), "metal", "leather_d")
    poly(d, [(49+arx,63+torso_y+ary),(53+arx,62+torso_y+ary),
             (56+arx,66+torso_y+ary),(54+arx,70+torso_y+ary),
             (51+arx,70+torso_y+ary),(48+arx,67+torso_y+ary)], "skin_s")
    poly(d, [(50+arx,64+torso_y+ary),(53+arx,64+torso_y+ary),
             (54+arx,67+torso_y+ary),(52+arx,68+torso_y+ary),
             (50+arx,67+torso_y+ary)], "skin")

    # Neck scarf with an explorer blue-green accent.
    rect(d, (27,28+head_y,36,39+torso_y), "skin_s", "ink2")
    poly(d, [(22,35+torso_y),(27,33+torso_y),(32,37+torso_y),
             (38,34+torso_y),(43,39+torso_y),(39,45+torso_y),
             (29,44+torso_y),(22,41+torso_y)], "teal_d")
    poly(d, [(24,37+torso_y),(28,36+torso_y),(32,39+torso_y),
             (37,37+torso_y),(40,40+torso_y),(37,42+torso_y),
             (30,42+torso_y),(25,40+torso_y)], "teal_m", "teal_d")
    line(d, [(26,38+torso_y),(31,40+torso_y),(37,39+torso_y)], "teal_l", 2)
    # Travel cap/head wrap, different silhouette from hooded Cazador.
    poly(d, [(24,12+head_y),(25,5+head_y),(31,2+head_y),(39,4+head_y),
             (44,10+head_y),(43,22+head_y),(38,31+head_y),(27,30+head_y),
             (23,22+head_y)], "cloth_d")
    poly(d, [(26,11+head_y),(29,7+head_y),(35,6+head_y),(41,10+head_y),
             (41,21+head_y),(36,28+head_y),(29,27+head_y),(25,21+head_y)], "skin", "ink2")
    if sex == "m":
        poly(d, [(24,13+head_y),(26,7+head_y),(31,3+head_y),(40,5+head_y),
                 (44,10+head_y),(41,16+head_y),(36,13+head_y),(31,16+head_y),
                 (27,20+head_y),(23,18+head_y)], "hair_d")
        poly(d, [(27,11+head_y),(30,7+head_y),(35,7+head_y),(39,10+head_y),
                 (35,12+head_y),(31,12+head_y),(28,16+head_y)], "hair")
        line(d, [(28,10+head_y),(32,8+head_y),(35,9+head_y)], "hair_l", 2)
        poly(d, [(29,14+head_y),(37,13+head_y),(40,16+head_y),
                 (38,23+head_y),(34,26+head_y),(29,22+head_y),(27,18+head_y)], "skin", "ink2")
        poly(d, [(30,15+head_y),(35,15+head_y),(38,17+head_y),(36,19+head_y),
                 (32,19+head_y)], "skin_l", "skin_l")
        rect(d, (35,18+head_y,36,19+head_y), "ink")
        rect(d, (30,17+head_y,31,18+head_y), "ink")
        line(d, [(33,22+head_y),(36,22+head_y)], "skin_s")
        rect(d, (38,20+head_y,39,21+head_y), "skin_s")
        poly(d, [(27,13+head_y),(29,9+head_y),(33,8+head_y),
                 (36,10+head_y),(34,13+head_y),(31,12+head_y),
                 (29,16+head_y)], "hair_m", "hair_d")
        line(d, [(30,10+head_y),(33,10+head_y)], "hair_l")
    else:
        # Side braid and tied-back hair make the female silhouette distinct.
        poly(d, [(28,13+head_y),(24,15+head_y),(22,22+head_y),
                 (24,32+head_y),(28,29+head_y),(30,20+head_y)], "hair_d")
        poly(d, [(25,18+head_y),(24,22+head_y),(26,28+head_y),
                 (28,25+head_y)], "hair_m", "hair_d")
        line(d, [(25,21+head_y),(27,25+head_y)], "hair_l")
        poly(d, [(27,12+head_y),(29,6+head_y),(36,4+head_y),
                 (42,8+head_y),(43,16+head_y),(39,23+head_y),
                 (32,25+head_y),(27,19+head_y)], "hair_d")
        poly(d, [(29,11+head_y),(32,7+head_y),(37,7+head_y),
                 (40,11+head_y),(39,18+head_y),(34,21+head_y),
                 (29,17+head_y)], "hair_m", "hair_d")
        line(d, [(30,10+head_y),(33,8+head_y),(37,9+head_y)], "hair_l", 2)
        poly(d, [(29,14+head_y),(37,13+head_y),(40,16+head_y),
                 (38,23+head_y),(34,26+head_y),(29,22+head_y),
                 (27,18+head_y)], "skin", "ink2")
        poly(d, [(30,15+head_y),(35,15+head_y),(38,17+head_y),
                 (36,19+head_y),(32,19+head_y)], "skin_l", "skin_l")
        rect(d, (35,18+head_y,36,19+head_y), "ink")
        rect(d, (30,17+head_y,31,18+head_y), "ink")
        line(d, [(33,22+head_y),(36,22+head_y)], "skin_s")
        rect(d, (38,20+head_y,39,21+head_y), "skin_s")
        poly(d, [(27,14+head_y),(29,9+head_y),(33,8+head_y),
                 (36,10+head_y),(34,14+head_y),(31,13+head_y),
                 (29,17+head_y)], "hair_m", "hair_d")
        line(d, [(30,10+head_y),(33,10+head_y)], "hair_l")
        # Brass/tan tie on the side braid.
        rect(d, (23,17+head_y,26,19+head_y), "metal_l", "sand_d")

    # Small stitched seams and map-case clasps.
    line(d, [(24,53+torso_y),(26,58+torso_y),(25,64+torso_y)], "cloth_l")
    line(d, [(36,51+torso_y),(37,57+torso_y)], "sand_l")
    for x,y in [(22,54),(25,58),(35,53),(38,59),(24,69),(35,70)]:
        d.point((x,y), fill=P["sand_l"])
    return im

def main():
    for sex in ("m", "f"):
        master = Image.new("RGBA", (256, 384), (0, 0, 0, 0))
        for row, action in enumerate(("idle", "walk", "hurt")):
            for col in range(4):
                master.alpha_composite(draw_frame(sex, action, col), (col*64, row*128))
        destination = OUT / f"explorador-{sex}-core-3rows.png"
        master.save(destination, optimize=True)
        print(destination)

if __name__ == "__main__":
    main()
