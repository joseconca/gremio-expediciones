import copy
import json
import runpy
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from PIL import Image,ImageDraw,PngImagePlugin
API=runpy.run_path(str(Path(__file__).with_name('auditar-sprites-hd.py')))

class AuditTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.root=Path(self.temp.name)
    def tearDown(self):self.temp.cleanup()
    def test_manifest_keeps_unicode_after_audit(self):
        p=self.root/'manifest.json'
        manifest={'name':'Cham\u00e1n y Espadach\u00edn r\u00fanico','variants':[]}
        p.write_text(json.dumps(manifest,ensure_ascii=False),encoding='utf-8')
        with patch('sys.argv',['auditar-sprites-hd.py','--root',str(self.root),'--write']):
            self.assertEqual(API['main'](),0)
        self.assertEqual(json.loads(p.read_text(encoding='utf-8')),manifest)
    def test_interrupted_replace_keeps_previous_manifest(self):
        p=self.root/'manifest.json';p.write_text('previous',encoding='utf-8')
        with patch.object(Path,'replace',side_effect=OSError('interrupted')):
            with self.assertRaises(OSError):API['write_progress'](p,'new')
        self.assertEqual(p.read_text(encoding='utf-8'),'previous')
        self.assertEqual(list(self.root.iterdir()),[p])
    def frame(self,n=1):
        p=self.root/'novato/m/frames/idle'/f'novato-m-idle-{n:02d}.png';p.parent.mkdir(parents=True,exist_ok=True)
        im=Image.new('RGBA',(128,256));ImageDraw.Draw(im).rectangle((20+n,20,80,240),fill='red');im.save(p);return p
    def test_crc_damage_rejected(self):
        p=self.frame();data=bytearray(p.read_bytes());idx=data.index(b'IDAT');data[idx+6]^=1;p.write_bytes(data)
        self.assertEqual(API['inspect_frame'](p)['status'],'invalid')
    def test_truncated_stream_rejected(self):
        p=self.frame();p.write_bytes(p.read_bytes()[:50]);self.assertEqual(API['inspect_frame'](p)['status'],'invalid')
    def test_metadata_cannot_fake_distinct_poses(self):
        p=self.frame()
        for i in range(2,5):
            q=self.frame(i);meta=PngImagePlugin.PngInfo();meta.add_text('frame',str(i))
            with Image.open(p) as im:im.save(q,pnginfo=meta)
        a=API['audit_variant'](self.root/'novato/m','novato','m')
        self.assertEqual(a['actions']['idle']['status'],'duplicate-poses')
    def test_missing_and_invalid_frames_do_not_complete_action(self):
        self.frame();p=self.frame(2);p.write_bytes(b'broken')
        a=API['audit_variant'](self.root/'novato/m','novato','m')
        self.assertEqual(a['validFrames'],1);self.assertEqual(a['invalidFrames'],1);self.assertEqual(a['technicalActions'],[])
    def test_visual_approval_invalidated_by_changed_bytes(self):
        for n in range(1,5):self.frame(n)
        m={'variants':[{'classId':'novato','sex':'m'}]};m=API['reconcile'](m,self.root)
        self.assertEqual(m['variants'][0]['actionsCompleted'],[])
        hashes=[API['inspect_frame'](self.frame(n))['sha256'] for n in range(1,5)]
        m['variants'][0]['visualApprovals']={'idle':{'frameHashes':hashes}}
        self.assertEqual(API['reconcile'](m,self.root)['variants'][0]['actionsCompleted'],['idle'])
        p=self.frame();im=Image.open(p).convert('RGBA');im.putpixel((50,50),(0,0,255,255));im.save(p)
        self.assertEqual(API['reconcile'](m,self.root)['variants'][0]['actionsCompleted'],[])

if __name__=='__main__':unittest.main(verbosity=2)
