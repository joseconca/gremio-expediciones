"""Render one reusable equipment sheet per item/sex, then inspect on every body."""
import argparse,copy,hashlib,json,math
from pathlib import Path
from PIL import Image,ImageDraw,ImageChops,ImageFont
ROOT=Path(__file__).resolve().parents[1];HD=ROOT/'assets/spritesheets/hd-128x256';BASE=HD/'equipment'
CANVAS=(384,384);ORIGIN=(128,64);BG='#242630'
FAMILY_ACTION={'sword':'attack_sword','axe':'attack_axe','spear':'attack_spear','dagger':'attack_dagger','bow':'attack_bow','staff':'attack_staff','mace':'attack_mace','book':'attack_book','gloves':'attack_gloves','shield':'block_shield','consumable':'use_consumable','arrow':'attack_bow'}
COMMON=['idle','walk','hurt','dodge']
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def clean(im):
    im.putalpha(im.getchannel('A').point(lambda a:a if a>=32 else 0));return im
def angle_towards(dx,dy):return math.degrees(math.atan2(-dx,-dy))
def place(master,grip,point,angle=0,mirror=False):
    master=master.copy();gx,gy=grip
    if mirror:master=master.transpose(Image.Transpose.FLIP_LEFT_RIGHT);gx=master.width-1-gx
    # Larger than the output cell: rotation never clips the source around the grip.
    pad=Image.new('RGBA',(768,768));pad.alpha_composite(master,(384-gx,384-gy))
    rotated=pad.rotate(angle,Image.Resampling.BICUBIC,center=(384,384))
    extent=rotated.getchannel('A').point(lambda a:255 if a>=32 else 0).getbbox()
    px,py=point;dx=round(px-384);dy=round(py-384)
    mapped=[extent[0]+dx,extent[1]+dy,extent[2]+dx,extent[3]+dy]
    if min(mapped[:2])<1 or mapped[2]>=CANVAS[0] or mapped[3]>=CANVAS[1]:raise ValueError(f'Equipment clipped: {mapped}')
    layer=Image.new('RGBA',CANVAS);layer.alpha_composite(rotated,(dx,dy));return clean(layer)
def body_point(point):return (point[0]+ORIGIN[0],point[1]+ORIGIN[1])
def active_actions(item):
    if item['family'] in ('consumable','arrow'):return [FAMILY_ACTION[item['family']]]
    if item['family']=='shield':return COMMON+['block_shield','attack_sword','attack_dagger','attack_mace']
    return COMMON+[FAMILY_ACTION[item['family']]]
def frame_layer(m,item,sex,action,n):
    config=copy.deepcopy(m['rigs'][sex]['actions'][action][n]);family=item['family']
    master=Image.open(ROOT/item['masterPath']).convert('RGBA');grip=item['grip'][:]
    p=config['primary'];s=config['secondary'];angle=config['angleDegrees'];depth=config['depth'];points=[p]
    if action in COMMON:depth='front';angle=-15 if family not in ('book','shield','gloves') else 0
    if family=='shield':
        # Offhand at the far arm in ordinary rows; the canonical block fist during block.
        if action!='block_shield':p=s
        points=[p];angle=-8 if action=='block_shield' else -15;depth='front'
    elif family=='book':angle=0;points=[p]+([s] if s else [])
    elif family=='spear' and action=='attack_spear':angle=angle_towards(s[0]-p[0],s[1]-p[1]);points=[p,s]
    elif family=='axe' and item['hands']==2 and action=='attack_axe':
        angle=angle_towards(p[0]-s[0],p[1]-s[1]);points=[p,s]
        # Both hands slide along the same shaft during the swing; leave only eight
        # pixels of butt beyond the lower hand. This model-space grip is shared by
        # every class and prevents the long butt from crossing the character face.
        distance=math.hypot(p[0]-s[0],p[1]-s[1]);grip[1]=round(master.height-1-distance-8)
    elif family=='staff' and action=='attack_staff' and s:
        angle=angle_towards(p[0]-s[0],p[1]-s[1]);points=[p,s]
    elif family=='consumable':angle=([0,-15,110,0] if sex=='m' else [0,-15,-35,0])[n]
    if family=='bow':
        # Both generated bow designs curve left. Mirror once as a model-space export
        # so the bow belly faces the target and the tips point back toward the string.
        layer=place(master,grip,body_point(p),0,mirror=True)
        actual_gx=master.width-1-grip[0]
        # Find each solid tip in the outermost occupied two rows, not a class offset.
        alpha=master.getchannel('A');box=alpha.point(lambda a:255 if a>=128 else 0).getbbox()
        tips=[]
        for y in [box[1]+1,box[3]-2]:
            xs=[x for x in range(master.width) if alpha.getpixel((x,y))>=128]
            x=sum(xs)/len(xs) if xs else master.width-2
            tips.append((p[0]+ORIGIN[0]+master.width-1-x-actual_gx,p[1]+ORIGIN[1]+y-grip[1]))
        pull=body_point(s) if action=='attack_bow' and n<2 else ((tips[0][0]+tips[1][0])/2,body_point(p)[1])
        string=Image.new('RGBA',(768,768));draw=ImageDraw.Draw(string)
        draw.line([(round(x*2),round(y*2)) for x,y in [tips[0],pull,tips[1]]],fill=(233,210,169,255),width=2)
        layer.alpha_composite(string.resize(CANVAS,Image.Resampling.LANCZOS));points=[p]+([s] if s else [])
        if action=='attack_bow' and n<2:
            arrow=m['items']['flecha_comun'];aim=(p[0]-s[0],p[1]-s[1]);rotation=-math.degrees(math.atan2(aim[1],aim[0]))
            layer.alpha_composite(place(Image.open(ROOT/arrow['masterPath']).convert('RGBA'),[1,arrow['grip'][1]],body_point(s),rotation))
        config['bowStringContact']=list(pull);config['bowTips']=[list(t) for t in tips]
    elif family=='gloves':
        angle=(180 if action in ('idle','walk') else 0) if action in COMMON else angle
        layer=place(master,grip,body_point(p),angle)
        second=s
        layer.alpha_composite(place(master,grip,body_point(second),180 if action in ('idle','walk') else -12,mirror=True));points=[p,second]
    elif family=='arrow':
        # Separate projectile sheet is available to the future renderer; bow carries
        # the nocked arrow only before release.
        if n<2:layer=Image.new('RGBA',CANVAS);points=[]
        else:layer=place(master,[1,grip[1]],body_point([p[0]+20+(n-2)*32,p[1]]),0);points=[]
    else:layer=place(master,grip,body_point(p),angle)
    config.update(primary=p,secondary=s,modelGrip=grip,angleDegrees=angle,depth=depth,contacts=points,restoreHands=family not in ('gloves','shield'),family=family)
    return clean(layer),config
def composite(body,layer,config):
    body_layer=Image.new('RGBA',CANVAS);body_layer.alpha_composite(body,ORIGIN)
    out=Image.new('RGBA',CANVAS)
    if config['depth']=='behind':out.alpha_composite(layer);out.alpha_composite(body_layer)
    else:
        out.alpha_composite(body_layer);out.alpha_composite(layer)
        if config['restoreHands']:
            mask=Image.new('L',CANVAS);d=ImageDraw.Draw(mask)
            for point in config['contacts']:
                x,y=body_point(point);r=config['handMaskRadius'];d.ellipse((x-r,y-r,x+r,y+r),fill=255)
            mask=ImageChops.multiply(mask,body_layer.getchannel('A'));out.paste(body_layer,(0,0),mask)
    return out
def render(item_ids=None,previews=True):
    mp=BASE/'manifest.json';m=json.loads(mp.read_text(encoding='utf-8'));report={'status':'passed','itemCount':0,'sharedSheets':0,'equipmentFrames':0,'bodyComposites':0,'contactWarnings':[],'classSpecificTransforms':False,'items':{}}
    for key,item in m['items'].items():
        if item_ids and key not in item_ids:continue
        if sha(ROOT/item['masterPath'])!=item['masterSha256']:raise ValueError('Master changed: '+key)
        item['sheets']={};report['itemCount']+=1
        for sex in ['m','f']:
            out=BASE/key/sex;out.mkdir(exist_ok=True);sheet=Image.new('RGBA',tuple(m['sheetDimensions']));records={}
            for action in active_actions(item):
                row=m['actions'].index(action);records[action]=[];cycles={c:[] for c in m['classes']}
                for n in range(4):
                    layer,config=frame_layer(m,item,sex,action,n)
                    target=out/'frames'/action/f'{n+1:02d}.png';target.parent.mkdir(parents=True,exist_ok=True);layer.save(target)
                    sheet.paste(layer,(n*384,row*384));report['equipmentFrames']+=1
                    record={'frame':n+1,'path':target.relative_to(ROOT).as_posix(),'sha256':sha(target),'config':config}
                    records[action].append(record)
                    if not previews:continue
                    for c in m['classes']:
                        bp=HD/c/sex/'frames'/action/f'{c}-{sex}-{action}-{n+1:02d}.png'
                        expected=m['renderPolicy']['bodyFrameHashes'][c+'-'+sex][action][f'{n+1:02d}']
                        if sha(bp)!=expected:raise ValueError('Body changed: '+str(bp))
                        body=Image.open(bp).convert('RGBA')
                        for point in config['contacts']:
                            x,y=point;near=body.getchannel('A').crop((max(0,x-3),max(0,y-3),min(128,x+4),min(256,y+4)))
                            if near.getextrema()[1]<128:report['contactWarnings'].append({'class':c,'sex':sex,'action':action,'frame':n+1,'point':point,'item':key})
                        combined=composite(body,layer,config);bg=Image.new('RGBA',CANVAS,BG);bg.alpha_composite(combined)
                        cycles[c].append(bg.convert('RGB'));report['bodyComposites']+=1
                if previews:
                    preview_root=BASE/'previews'/key/sex;preview_root.mkdir(parents=True,exist_ok=True)
                    contact=Image.new('RGB',(4*384,5*384+24),BG);d=ImageDraw.Draw(contact)
                    d.text((4,4),key+' / '+sex+' / '+action+' / Novato, Mago, Espadachín, Acólito, Arquero',fill='white')
                    comparison=[]
                    for n in range(4):
                        phase=Image.new('RGB',(5*384,408),BG);pd=ImageDraw.Draw(phase)
                        for row,c in enumerate(m['classes']):
                            tile=cycles[c][n]
                            contact.paste(tile,(n*384,24+row*384));phase.paste(tile,(row*384,24));pd.text((row*384+5,5),c,fill='white')
                        comparison.append(phase)
                    contact.save(preview_root/(action+'.png'))
                    comparison[0].save(preview_root/(action+'.gif'),save_all=True,append_images=comparison[1:],duration=m['rigs'][sex]['timings'][action],loop=0,disposal=2)
            path=out/(key+'-'+sex+'-sheet.png');sheet.save(path)
            item['sheets'][sex]={'path':path.relative_to(ROOT).as_posix(),'sha256':sha(path),'dimensions':list(sheet.size),'actions':records,'inactiveRows':'transparent'};report['sharedSheets']+=1
        report['items'][key]={'sexes':2,'actions':active_actions(item)}
        print('Equipo compartido exportado: '+key,flush=True)
    report['status']='contact-review-required' if report['contactWarnings'] else 'passed'
    mp.write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    (BASE/'qa-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({k:v for k,v in report.items() if k not in ('items','contactWarnings')}|{'contactWarnings':len(report['contactWarnings'])}),flush=True)
    return report
if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--items',nargs='*');p.add_argument('--no-previews',action='store_true');args=p.parse_args();render(args.items,not args.no_previews)
