"""Render independent sword/body layers using shared frame index and explicit grips."""
import argparse,json,hashlib
from pathlib import Path
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[1]
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def resolve_rig(manifest,variant,action):
    """Bodies of all classes fit one equipment trajectory per sex/action."""
    rig=manifest['equipmentRigs'][variant['equipmentRigId']]
    if rig['sex']!=variant['sex']:raise ValueError('Equipment rig sex mismatch')
    config=variant['equipmentTests'][action]
    if any(key in config for key in ('equipmentCanvas','bodyOrigin','weaponScale')):
        raise ValueError('Class-specific equipment transform is not allowed')
    frames=rig['actions'][action]['frames']
    if len(frames)!=4 or len(config['frames'])!=4:raise ValueError('Expected four synchronized frames')
    if any(set(frame)!={'bodySha256'} for frame in config['frames']):
        raise ValueError('Class-specific hand trajectory is not allowed')
    return rig,frames

def render(sex):
    manifest_path=ROOT/'assets/spritesheets/hd-128x256/manifest.json'
    manifest=json.loads(manifest_path.read_text(encoding='utf-8'))
    variant=next(v for v in manifest['variants'] if v['classId']=='novato' and v['sex']==sex)
    config=variant['equipmentTests']['attack_sword']
    rig,rig_frames=resolve_rig(manifest,variant,'attack_sword')
    if rig['equipmentCanvas']!=[256,256] or rig['bodyOrigin']!=[64,0] or rig['weaponScale']!=1:raise ValueError('Unsupported preview transform')
    source=ROOT/config['weaponPath']
    if sha(source)!=config['weaponSha256']:raise ValueError('Weapon changed: review grip before rebuilding')
    with Image.open(source) as im:weapon=im.convert('RGBA')
    base=ROOT/'assets/spritesheets/hd-128x256/novato'/sex
    out=base/'previews/equipment-sword';out.mkdir(parents=True,exist_ok=True)
    cycle=[];contact=Image.new('RGB',(1024,256),'#242630')
    for i,frame in enumerate(rig_frames):
        path=base/'frames/attack_sword'/f'novato-{sex}-attack_sword-{i+1:02d}.png'
        if sha(path)!=config['frames'][i]['bodySha256']:raise ValueError('Body changed: anchors require review')
        with Image.open(path) as im:body=im.convert('RGBA')
        x,y=frame['grip'];gx,gy=config['weaponGrip']
        if body.getpixel((x,y))[3]<128:raise ValueError('Grip is outside visible body')
        # Rotate on a padded canvas about the grip, so the grip cannot drift.
        pad=Image.new('RGBA',(256,256));pad.alpha_composite(weapon,(128-gx,128-gy))
        rotated=pad.rotate(frame['angleDegrees'],Image.Resampling.BICUBIC,center=(128,128))
        layer=Image.new('RGBA',(256,256));layer.alpha_composite(rotated,(x+64-128,y-128))
        box=layer.getchannel('A').getbbox()
        if box is None or box[0]<=0 or box[1]<=0 or box[2]>=256 or box[3]>=256:raise ValueError('Equipment clipped')
        layer.save(out/f'weapon-{i+1:02d}.png')
        body_layer=Image.new('RGBA',(256,256));body_layer.alpha_composite(body,(64,0))
        combined=Image.new('RGBA',(256,256))
        if frame['depth']=='behind':combined.alpha_composite(layer);combined.alpha_composite(body_layer)
        else:
            combined.alpha_composite(body_layer);combined.alpha_composite(layer)
            mask=Image.new('L',(256,256));draw=ImageDraw.Draw(mask);r=frame['handMaskRadius']
            draw.ellipse((x+64-r,y-r,x+64+r,y+r),fill=255)
            # Only restore original hand pixels. Transparent pixels never erase the weapon.
            import PIL.ImageChops
            mask=PIL.ImageChops.multiply(mask,body_layer.getchannel('A'))
            combined.paste(body_layer,(0,0),mask)
        combined.save(out/f'composite-{i+1:02d}.png')
        bg=Image.new('RGBA',(256,256),'#242630');bg.alpha_composite(combined)
        cycle.append(bg.convert('RGB'));contact.paste(cycle[-1],(256*i,0))
    contact.save(out/'contact.png');cycle[0].save(out/'preview.gif',save_all=True,append_images=cycle[1:],duration=[170,110,180,210],loop=0)
    print(json.dumps({'sex':sex,'frames':4,'bodyUnmodified':True,'canvas':[256,256],'bodyOrigin':[64,0],'output':out.relative_to(ROOT).as_posix()}))
if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--sex',choices=('m','f'),default='m');render(parser.parse_args().sex)
