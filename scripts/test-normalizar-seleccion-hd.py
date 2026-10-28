"""Whole-pose selection must retain canonical geometry and reject clipping."""
import runpy
import tempfile
import unittest
from pathlib import Path
from PIL import Image, ImageDraw

normalize=runpy.run_path(str(Path(__file__).with_name('normalizar-accion-hd.py')))['normalize']

class SelectionTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.root=Path(self.temp.name)
        self.source=self.root/'source.png'
        self.reference={'sourceDimensions':[400,180],'scale':1,'origin':[0,20],'commonCrop':[120,0,220,180]}
    def tearDown(self):self.temp.cleanup()
    def source_image(self,first_x=40,last_x=40):
        im=Image.new('RGBA',(400,180));draw=ImageDraw.Draw(im)
        for n,x in enumerate([first_x,40,40,last_x]):draw.rectangle((n*100+x,20,n*100+x+45,150),fill='white')
        im.save(self.source)
    def export(self,folder,selected=None):
        return normalize(self.source,self.root/folder,'test','f','walk',reference_transform=self.reference,selected_frames=selected)
    def test_unselected_bad_pose_does_not_block_valid_complete_pose(self):
        self.source_image(first_x=5)
        with self.assertRaisesRegex(ValueError,'Pose 1'):self.export('all')
        self.export('selected',{4})
        self.assertEqual([p.name for p in (self.root/'selected').iterdir()],['test-f-walk-04.png'])
        with Image.open(self.root/'selected/test-f-walk-04.png') as im:self.assertEqual(im.getbbox(),(20,40,66,171))
    def test_selected_bad_pose_still_rejected(self):
        self.source_image(last_x=5)
        with self.assertRaisesRegex(ValueError,'Pose 4'):self.export('bad',{4})
    def test_selection_keeps_identical_pixels(self):
        self.source_image();self.export('all');self.export('selected',{4})
        self.assertEqual((self.root/'all/test-f-walk-04.png').read_bytes(),(self.root/'selected/test-f-walk-04.png').read_bytes())

if __name__=='__main__':unittest.main(verbosity=2)
