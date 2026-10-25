"""Regressions for fixed pivots, two-hand alignment, occlusion and shared rigs."""
import copy,json,runpy,unittest
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
render=runpy.run_path(str(ROOT/'scripts/ensamblar-equipo-hd.py'))
validate=runpy.run_path(str(ROOT/'scripts/validar-equipo-hd.py'))
class EquipmentTests(unittest.TestCase):
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
