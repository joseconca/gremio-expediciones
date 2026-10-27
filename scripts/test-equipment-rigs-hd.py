"""Shared grip contract: different classes cannot customize an equipment row."""
import copy,json,runpy,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
resolve=runpy.run_path(str(ROOT/'scripts/previsualizar-equipo-hd.py'))['resolve_rig']
class RigTests(unittest.TestCase):
    def setUp(self):
        self.manifest=json.loads((ROOT/'assets/spritesheets/hd-128x256/manifest.json').read_text(encoding='utf-8'))
        self.male=next(v for v in self.manifest['variants'] if v['classId']=='novato' and v['sex']=='m')
    def test_all_classes_share_exactly_one_rig_per_sex(self):
        for sex in ('m','f'):
            variants=[v for v in self.manifest['variants'] if v['sex']==sex]
            self.assertEqual(len(variants),len(self.manifest['classes']))
            self.assertEqual(len({v['equipmentRigId'] for v in variants}),1)
            for v in variants:self.assertEqual(self.manifest['equipmentRigs'][v['equipmentRigId']]['sex'],sex)
        female=next(v for v in self.manifest['variants'] if v['classId']=='novato' and v['sex']=='f')
        self.assertNotEqual(self.male['equipmentRigId'],female['equipmentRigId'])
    def test_another_class_uses_identical_canonical_sword_frames(self):
        other=copy.deepcopy(self.male);other['classId']='mago'
        self.assertIs(resolve(self.manifest,self.male,'attack_sword')[1],resolve(self.manifest,other,'attack_sword')[1])
    def test_per_class_hand_and_transform_overrides_are_rejected(self):
        for key in ('equipmentCanvas','bodyOrigin','weaponScale','grip'):
            with self.subTest(key=key):
                variant=copy.deepcopy(self.male);config=variant['equipmentTests']['attack_sword']
                if key=='grip':config['frames'][0]['grip']=[1,1]
                else:config[key]=1
                with self.assertRaisesRegex(ValueError,'Class-specific'):resolve(self.manifest,variant,'attack_sword')
    def test_wrong_sex_cannot_use_other_rig(self):
        self.male['sex']='f'
        with self.assertRaisesRegex(ValueError,'sex mismatch'):resolve(self.manifest,self.male,'attack_sword')
if __name__=='__main__':unittest.main(verbosity=2)
