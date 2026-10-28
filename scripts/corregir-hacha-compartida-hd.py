"""Place female axe impact grips on the measured canonical fists."""
import copy,json,runpy
from pathlib import Path
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[1];HD=ROOT/'assets/spritesheets/hd-128x256'
CHANGES=[('primary',[88,196],[78,190],[72,183,85,198]),('secondary',[77,155],[78,169],[71,162,85,177])]
def main():
 path=HD/'equipment/manifest.json';m=json.loads(path.read_text(encoding='utf-8'));revision=m['sharedGripCorrection']['revision']
 if revision==5:
  assert all(m['rigs']['f']['actions']['attack_axe'][2][key]==new for key,old,new,roi in CHANGES)
  print('Shared axe impact correction revision 5 already applied.');return
 assert revision==4,'Review later shared rig revisions before applying this correction'
 before=copy.deepcopy(m);body=Image.open(HD/'novato/f/frames/attack_axe/novato-f-attack_axe-03.png').convert('RGBA')
 for key,old,new,roi in CHANGES:
  assert m['rigs']['f']['actions']['attack_axe'][2][key]==old
  assert body.getpixel(tuple(new))[3]>=240
  m['rigs']['f']['actions']['attack_axe'][2][key]=new
 render=runpy.run_path(str(ROOT/'scripts/ensamblar-equipo-hd.py'));proof=Image.new('RGB',(1536,744),'#242630');d=ImageDraw.Draw(proof)
 for row,cid in enumerate(['novato','maestro_espadas']):
  b=Image.open(HD/cid/'f/frames/attack_axe'/f'{cid}-f-attack_axe-03.png').convert('RGBA')
  for col,(version,data,item) in enumerate([('before',before,'hacha_piedra'),('after',m,'hacha_piedra'),('before',before,'hacha_berserker'),('after',m,'hacha_berserker')]):
   layer,config=render['frame_layer'](data,data['items'][item],'f','attack_axe',2);im=render['composite'](b,layer,config).crop((128,195,256,315)).resize((384,360),Image.Resampling.NEAREST);proof.paste(im,(col*384,row*372+12),im);d.text((col*384+4,row*372),cid+' '+item+' '+version,fill='white')
 relative='assets/spritesheets/hd-128x256/equipment/previews/shared-axe-impact-r5-before-after.png';proof.save(ROOT/relative)
 m.setdefault('sharedGripCorrectionHistory',[]).append(copy.deepcopy(m['sharedGripCorrection']))
 m['sharedGripCorrection']={'revision':5,'reason':'Female axe impact contacts were on scarf/air and trousers instead of the two closed fists','changes':[{'sex':'f','action':'attack_axe','frame':3,'field':key,'previous':old,'corrected':new} for key,old,new,roi in CHANGES],'canonicalHandRegions':[{'sex':'f','action':'attack_axe','frame':3,'field':key,'region':roi} for key,old,new,roi in CHANGES],'bodyPolicy':'Preserve all body artwork; one shared rig per sex; no class offsets','visualReference':relative}
 write=runpy.run_path(str(ROOT/'scripts/registrar-accion-hd.py'))['write_progress'];write(path,json.dumps(m,ensure_ascii=False,indent=2)+'\n');p=HD/'manifest.json';b=json.loads(p.read_text(encoding='utf-8'));b['equipmentCompositionRigRevision']=5;write(p,json.dumps(b,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'revision':5,'sharedContactsCorrected':2,'bodyFramesModified':0}))
if __name__=='__main__':main()
