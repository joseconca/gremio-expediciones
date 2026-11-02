"""Regresiones del comando publico de sprites: no necesitan archivos de produccion."""
import importlib.util
import tempfile
import unittest
from pathlib import Path

from PIL import Image

SOURCE = Path(__file__).with_name("sprites.py")
SPEC = importlib.util.spec_from_file_location("sprite_cli", SOURCE)
sprite = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
SPEC.loader.exec_module(sprite)


class SpriteCliTests(unittest.TestCase):
    def test_tira_valida_tiene_cuatro_poses_independientes(self):
        with tempfile.TemporaryDirectory() as d:
            path = Path(d) / "idle.png"
            tira = Image.new("RGBA", (512, 256), (0, 0, 0, 0))
            for n in range(4):
                tira.paste((30 + n * 30, 90, 120, 255), (n * 128 + 20, 60, n * 128 + 80 + n, 210))
            tira.save(path)
            frames = sprite.leer_fotogramas(path, None)
            self.assertEqual(len(frames), 4)
            self.assertTrue(all(i.size == (128, 256) for i in frames))

    def test_tira_rechaza_fotogramas_duplicados(self):
        with tempfile.TemporaryDirectory() as d:
            path = Path(d) / "same.png"
            tira = Image.new("RGBA", (512, 256))
            for n in range(4):
                tira.paste((200, 130, 100, 255), (n * 128 + 15, 40, n * 128 + 80, 180))
            tira.save(path)
            with self.assertRaisesRegex(ValueError, "diferentes"):
                sprite.leer_fotogramas(path, None)

    def test_tira_rechaza_dimensiones_ajenas(self):
        with tempfile.TemporaryDirectory() as d:
            path = Path(d) / "bad.png"
            Image.new("RGBA", (256, 256)).save(path)
            with self.assertRaisesRegex(ValueError, "512x256"):
                sprite.leer_fotogramas(path, None)

    def test_identificador_rechaza_rutas(self):
        for invalid in ("../berserker", "foo/bar", "MAGO", ""):
            with self.subTest(invalid=invalid):
                with self.assertRaises(ValueError):
                    sprite.identificador(invalid)


if __name__ == "__main__":
    unittest.main()
