"""Regression checks for keeping body scale across narrow and wide actions."""
import runpy,tempfile,unittest
from pathlib import Path
from PIL import Image,ImageDraw
normalize=runpy.run_path(str(Path(__file__).with_name('normalizar-accion-hd.py')))['normalize']
class ScaleTests(unittest.TestCase):
    def source(self,path,wide=False):
        im=Image.new('RGBA',(1200,300));draw=ImageDraw.Draw(im)
        for center in (150,450,750,1050):
            draw.rectangle((center-20,30,center+19,69),fill='red')
            draw.rectangle((center-20,70,center+19,229),fill='blue')
            if wide:draw.rectangle((center+20,100,center+109,119),fill='blue')
        im.save(path)
    def test_wider_action_keeps_reference_head_size(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp);sizes=[]
            for action,wide in [('idle',False),('attack_sword',True)]:
                source=root/(action+'.png');self.source(source,wide)
                normalize(source,root/action,'novato','m',action,fixed_scale=.5)
                with Image.open(root/action/f'novato-m-{action}-01.png') as im:
                    mask=Image.new('L',im.size);mask.putdata([255 if r>200 and g<40 and b<40 and a>128 else 0 for r,g,b,a in im.convert('RGBA').getdata()]);box=mask.getbbox()
                    sizes.append((box[2]-box[0],box[3]-box[1]))
            self.assertEqual(sizes[0],sizes[1])
    def test_wider_costume_preserves_absolute_canonical_hand_position(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp);narrow=root/'narrow.png';wide=root/'wide.png'
            self.source(narrow);self.source(wide,True)
            reference=normalize(narrow,root/'reference','novato','m','idle',fixed_scale=.5)
            normalize(wide,root/'mage','mago','m','idle',reference_transform=reference)
            centers=[]
            for path in (root/'reference/novato-m-idle-01.png',root/'mage/mago-m-idle-01.png'):
                with Image.open(path) as im:
                    points=[(x,y) for y in range(256) for x in range(128) if (lambda c:c[0]>200 and c[1]<40 and c[2]<40 and c[3]>128)(im.getpixel((x,y)))]
                centers.append((sum(x for x,y in points)/len(points),sum(y for x,y in points)/len(points)))
            self.assertAlmostEqual(centers[0][0],centers[1][0],delta=1)
            self.assertAlmostEqual(centers[0][1],centers[1][1],delta=1)
    def test_registered_export_refuses_costume_outside_body_canvas(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp);source=root/'source.png';self.source(source,True)
            reference={'sourceDimensions':[1200,300],'commonCrop':[0,0,100,100],'scale':1,'origin':[0,0]}
            with self.assertRaisesRegex(ValueError,'canonical body canvas'):
                normalize(source,root/'frames','mago','m','idle',reference_transform=reference)
            self.assertFalse((root/'frames').exists())
    def test_root_calibration_preserves_crouch_instead_of_filling_each_pose(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp);source=root/'source.png'
            im=Image.new('RGBA',(1200,300));draw=ImageDraw.Draw(im)
            for i,cx in enumerate((150,450,750,1050)):
                top=120 if i==2 else 70
                draw.rectangle((cx-16,top,cx+15,229),fill='blue')
                draw.rectangle((cx-16,top,cx+15,top+31),fill='red')
            im.save(source)
            reference={'sourceDimensions':[1200,300],'commonCrop':[430,30,470,230],'scale':.5,'origin':[54,148],'calibrateFirstPose':True,'referenceFirstFrameBounds':[54,148,74,248]}
            normalize(source,root/'frames','mago','m','dodge',reference_transform=reference)
            boxes=[]
            for n in (1,3):
                with Image.open(root/'frames'/f'mago-m-dodge-{n:02d}.png') as frame:boxes.append(frame.getchannel('A').getbbox())
            self.assertAlmostEqual(boxes[0][3],248,delta=1)
            self.assertAlmostEqual(boxes[0][3]-boxes[0][1],100,delta=2)
            self.assertLess(boxes[1][3]-boxes[1][1],boxes[0][3]-boxes[0][1]-20)
    def test_original_width_need_not_be_divisible_by_four(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp);source=root/'source.png';self.source(source,True)
            with Image.open(source) as im: original=im.crop((0,0,1198,300))
            original.save(source)
            metadata=normalize(source,root/'frames','novato','m','walk',fixed_scale=.5)
            self.assertEqual(metadata['sourceDimensions'],[1198,300])
            self.assertEqual(len(list((root/'frames').glob('*.png'))),4)
            with Image.open(root/'frames/novato-m-walk-04.png') as last:
                self.assertEqual(last.size,(128,256));self.assertIsNotNone(last.getchannel('A').getbbox())
    def test_clipping_rejected_before_writing_frames(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp);source=root/'source.png';self.source(source,True)
            with self.assertRaisesRegex(ValueError,'clips'):
                normalize(source,root/'frames','novato','m','idle',fixed_scale=2)
            self.assertFalse((root/'frames').exists())
if __name__=='__main__':unittest.main(verbosity=2)
