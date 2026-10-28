"""Verify atomic sprite progress saves survive transient Windows file locks."""
import runpy,tempfile,unittest
from pathlib import Path
from unittest.mock import patch

write_progress=runpy.run_path(str(Path(__file__).with_name('registrar-accion-hd.py')))['write_progress']
WORK=Path(__file__).resolve().parents[1]/'work'
WORK.mkdir(exist_ok=True)

class ProgressSaveTests(unittest.TestCase):
    saver=staticmethod(write_progress)
    def test_transient_locks_retry_and_save_utf8(self):
        with tempfile.TemporaryDirectory(dir=WORK) as folder:
            path=Path(folder)/'manifest.json';path.write_text('old',encoding='utf-8')
            real_replace=Path.replace;calls=[]
            def locked_replace(source,target):
                calls.append(source)
                if len(calls)<3:raise PermissionError('temporary lock')
                return real_replace(source,target)
            with patch.object(Path,'replace',locked_replace),patch('time.sleep') as sleep:
                self.saver(path,'{"name":"Oráculo"}')
            self.assertEqual(path.read_text(encoding='utf-8'),'{"name":"Oráculo"}')
            self.assertEqual(len(calls),3);self.assertEqual(sleep.call_count,2)
            self.assertEqual(list(Path(folder).glob('*.tmp')),[])

    def test_permanent_lock_keeps_previous_file_and_cleans_temporary(self):
        with tempfile.TemporaryDirectory(dir=WORK) as folder:
            path=Path(folder)/'manifest.json';path.write_text('old',encoding='utf-8')
            with patch.object(Path,'replace',side_effect=PermissionError('locked')) as replace,patch('time.sleep'):
                with self.assertRaises(PermissionError):self.saver(path,'new')
            self.assertEqual(replace.call_count,6)
            self.assertEqual(path.read_text(encoding='utf-8'),'old')
            self.assertEqual(list(Path(folder).glob('*.tmp')),[])

    def test_other_failures_are_not_retried(self):
        with tempfile.TemporaryDirectory(dir=WORK) as folder:
            path=Path(folder)/'manifest.json'
            with patch.object(Path,'replace',side_effect=OSError('disk error')) as replace,patch('time.sleep') as sleep:
                with self.assertRaises(OSError):self.saver(path,'new')
            self.assertEqual(replace.call_count,1);sleep.assert_not_called()
            self.assertEqual(list(Path(folder).glob('*.tmp')),[])

class AuditProgressSaveTests(ProgressSaveTests):
    saver=staticmethod(runpy.run_path(str(Path(__file__).with_name('auditar-sprites-hd.py')))['write_progress'])

if __name__=='__main__':unittest.main()
