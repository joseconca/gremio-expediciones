"""Regressions for fixed pivots, two-hand alignment, occlusion and shared rigs."""
import copy,json,runpy,unittest
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
render=runpy.run_path(str(ROOT/'scripts/ensamblar-equipo-hd.py'))
validate=runpy.run_path(str(ROOT/'scripts/validar-equipo-hd.py'))
class EquipmentTests(unittest.TestCase):
    def test_glove_pivots_stay_inside_closed_palms(self):
        m=json.loads((ROOT/'assets/spritesheets/hd-128x256/equipment/manifest.json').read_text(encoding='utf-8'))
        corrections=runpy.run_path(str(ROOT/'scripts/corregir-punos-compartidos-hd.py'))['CHANGES']
        for sex,frame,key,old,new,(left,top,right,bottom) in corrections:
            with self.subTest(sex=sex,frame=frame,key=key):
                x,y=m['rigs'][sex]['actions']['attack_gloves'][frame-1][key]
                self.assertTrue(left<=x<right and top<=y<bottom,'Glove must cover the closed palm, not the elbow or wrist wrap')
                body=Image.open(ROOT/f'assets/spritesheets/hd-128x256/novato/{sex}/frames/attack_gloves/novato-{sex}-attack_gloves-{frame:02d}.png').convert('RGBA')
                self.assertGreaterEqual(body.getpixel((x,y))[3],240)
    def test_shared_contacts_stay_on_measured_canonical_hands(self):
        m=json.loads((ROOT/'assets/spritesheets/hd-128x256/equipment/manifest.json').read_text(encoding='utf-8'))
        cases=[('f','walk',4,(34,172,43,181)),('f','hurt',1,(57,169,66,178)),('m','attack_spear',3,(57,158,68,169)),('m','attack_staff',4,(70,140,79,153)),('f','attack_staff',4,(70,140,79,153))]
        for sex,action,frame,(left,top,right,bottom) in cases:
            with self.subTest(sex=sex,action=action,frame=frame):
                x,y=m['rigs'][sex]['actions'][action][frame-1]['primary']
                self.assertTrue(left<=x<right and top<=y<bottom)
                body=Image.open(ROOT/f'assets/spritesheets/hd-128x256/novato/{sex}/frames/{action}/novato-{sex}-{action}-{frame:02d}.png').convert('RGBA')
                self.assertGreaterEqual(body.getpixel((x,y))[3],240)
    def test_impact_grips_stay_inside_canonical_closed_fists(self):
        # Measured hand regions exclude the wrist, torso and cloth accepted by
        # the former radius-only alpha check. See the shared-grip visual review.
        m=json.loads((ROOT/'assets/spritesheets/hd-128x256/equipment/manifest.json').read_text(encoding='utf-8'))
        cases=[('m','attack_dagger','primary',(68,163,80,176)),('f','attack_spear','primary',(80,148,91,158)),('f','attack_spear','secondary',(103,142,112,151)),('f','attack_axe','primary',(72,183,85,198)),('f','attack_axe','secondary',(71,162,85,177))]
        for sex,action,key,(left,top,right,bottom) in cases:
            with self.subTest(sex=sex,action=action,key=key):
                x,y=m['rigs'][sex]['actions'][action][2][key]
                self.assertTrue(left<=x<right and top<=y<bottom,'Grip must lie in the closed fist, not on nearby cloth or wrist')
                body=Image.open(ROOT/f'assets/spritesheets/hd-128x256/novato/{sex}/frames/{action}/novato-{sex}-{action}-03.png').convert('RGBA')
                self.assertGreaterEqual(body.getpixel((x,y))[3],240)
    def test_rotation_preserves_exact_pivot(self):
        source=Image.new('RGBA',(21,41));source.paste((255,30,0,255),(8,28,13,33))
        for angle in (0,45,90,-135):
            layer=render['place'](source,[10,30],(190,190),angle)
            self.assertGreater(layer.getpixel((190,190))[3],240)
    def test_clipping_is_rejected(self):
        source=Image.new('RGBA',(20,80),'white')
        with self.assertRaisesRegex(ValueError,'clipped'):render['place'](source,[10,70],(2,2))
    def test_two_hand_axis_runs_through_both_contacts(self):
        source=Image.new('RGBA',(9,140));source.paste('white',(3,0,6,140));p=(220,210);s=(185,180)
        angle=render['angle_towards'](p[0]-s[0],p[1]-s[1]);layer=render['place'](source,[4,70],p,angle)
        for x,y in [p,s]:self.assertGreater(layer.getchannel('A').crop((x-2,y-2,x+3,y+3)).getextrema()[1],200)
    def test_front_equipment_restores_hand_without_changing_body(self):
        body=Image.new('RGBA',(128,256));body.paste((240,110,30,255),(35,120,46,131));before=body.tobytes()
        layer=Image.new('RGBA',(384,384));layer.paste((0,0,255,255),(160,180,180,200))
        config={'depth':'front','restoreHands':True,'contacts':[[40,125]],'handMaskRadius':5}
        out=render['composite'](body,layer,config)
        self.assertEqual(out.getpixel((168,189)),(240,110,30,255));self.assertEqual(body.tobytes(),before)
    def test_class_specific_override_is_rejected(self):
        m=json.loads((ROOT/'assets/spritesheets/hd-128x256/equipment/manifest.json').read_text(encoding='utf-8'))
        for level in ('item','rig'):
            changed=copy.deepcopy(m)
            target=next(iter(changed['items'].values())) if level=='item' else changed['rigs']['m']['actions']['idle'][0]
            target['classOffsets']={'mago':[1,2]}
            with self.assertRaisesRegex(ValueError,'Class-specific'):validate['validate_contract'](changed)
    def test_wrong_family_stays_inactive(self):
        self.assertNotIn('attack_bow',render['active_actions']({'family':'sword'}))
        self.assertEqual(render['active_actions']({'family':'consumable'}),['use_consumable'])
if __name__=='__main__':unittest.main(verbosity=2)
