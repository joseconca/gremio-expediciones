"""Review new bodies against existing equipment without changing its shared rig."""
import argparse,json,runpy,hashlib
from pathlib import Path
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[1];HD=ROOT/'assets/spritesheets/hd-128x256';E=HD/'equipment'
EXAMPLES={'idle':['espada_hierro','arco_cazador','guantes_lucha'],'walk':['espada_hierro','arco_cazador','guantes_lucha'],'hurt':['espada_hierro'],'dodge':['espada_hierro'],'use_consumable':['pocion'],'block_shield':['escudo_guardian'],'attack_sword':['espada_hierro'],'attack_axe':['hacha_piedra','hacha_orca'],'attack_spear':['lanza_madera'],'attack_dagger':['daga_hierro'],'attack_bow':['arco_cazador'],'attack_staff':['baston_runico'],'attack_mace':['maza_enana'],'attack_book':['libro_aprendiz'],'attack_gloves':['guantes_lucha']}
def review(c,sex):
    m=json.loads((E/'manifest.json').read_text(encoding='utf-8'));r=runpy.run_path(str(ROOT/'scripts/ensamblar-equipo-hd.py'));out=HD/c/sex/'equipment-review';out.mkdir(parents=True,exist_ok=True)
    warnings=[];checks=0;available=[];hashes={}
    for action in m['actions']:
        paths=[HD/c/sex/'frames'/action/f'{c}-{sex}-{action}-{n+1:02d}.png' for n in range(4)]
        if not all(p.exists() for p in paths):continue
        available.append(action);bodies=[Image.open(p).convert('RGBA') for p in paths]
        hashes[action]=[hashlib.sha256(p.read_bytes()).hexdigest() for p in paths]
        for item_id,item in m['items'].items():
            if action not in r['active_actions'](item):continue
            for n,body in enumerate(bodies):
                cfg=item['sheets'][sex]['actions'][action][n]['config']
                for x,y in cfg['contacts']:
                    checks+=1
                    if body.getchannel('A').crop((max(0,x-3),max(0,y-3),min(128,x+4),min(256,y+4))).getextrema()[1]<128:warnings.append({'action':action,'frame':n+1,'item':item_id,'point':[x,y]})
        items=EXAMPLES[action];contact=Image.new('RGB',(1536,len(items)*384+24),'#242630');d=ImageDraw.Draw(contact);d.text((6,5),c+' '+sex+' / '+action+' / '+', '.join(items),fill='white')
        # Keep the full composition and a separate enlarged view of the hands.
        # Alpha contact alone can be covered by cloth rather than a real grip.
        grips=Image.new('RGB',(1408,len(items)*320+24),'#242630')
        ImageDraw.Draw(grips).text((6,5),c+' '+sex+' / '+action+' / grip detail',fill='white')
        for row,item_id in enumerate(items):
            for n,body in enumerate(bodies):
                layer=Image.open(ROOT/m['items'][item_id]['sheets'][sex]['actions'][action][n]['path']).convert('RGBA');cfg=m['items'][item_id]['sheets'][sex]['actions'][action][n]['config']
                combined=r['composite'](body,layer,cfg);tile=Image.new('RGBA',(384,384),'#242630');tile.alpha_composite(combined);contact.paste(tile.convert('RGB'),(n*384,row*384+24))
                grips.paste(tile.convert('RGB').crop((104,128,280,288)).resize((352,320),Image.Resampling.NEAREST),(n*352,row*320+24))
        contact.save(out/(action+'.png'))
        grips.save(out/(action+'-grips.png'))
    result={'status':'contact-review-required' if warnings else 'passed','classId':c,'sex':sex,'actions':available,'bodyHashes':hashes,'contactChecks':checks,'warnings':warnings,'equipmentTransforms':'unchanged; exact existing equipment layers per sex, no class offsets','artisticApproval':'not-automatic'}
    (out/'qa-report.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'class':c,'sex':sex,'actions':len(available),'contactChecks':checks,'warnings':warnings},ensure_ascii=False));return result
if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--class-id',required=True);p.add_argument('--sex',choices=('m','f'),required=True);a=p.parse_args();review(a.class_id,a.sex)
