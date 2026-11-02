"""Pruebas unitarias del orquestador de recursos HD sin alterar assets reales."""
from __future__ import annotations

import importlib.util
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from PIL import Image

HERE = Path(__file__).resolve().parent
SPEC = importlib.util.spec_from_file_location("recursos_cli", HERE / "recursos.py")
cli = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
SPEC.loader.exec_module(cli)


class ResourceCliTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.assets = self.root / "assets/spritesheets/enemies-hd"
        self.output = self.root / "public/sprites/enemies-hd-v1"
        self.catalog = self.root / "src/lib/generated/enemies-hd.json"
        self.assets.mkdir(parents=True)
        self.catalog.parent.mkdir(parents=True)
        self.patcher = patch.multiple(cli, ROOT=self.root, ENEMIGOS=self.assets,
                                      DESTINO_ENEMIGOS=self.output,
                                      CATALOGO_ENEMIGOS=self.catalog)
        self.patcher.start()
        self.addCleanup(self.patcher.stop)

    def fixture(self):
        enemy_id = "slime_acido"
        folder = self.assets / enemy_id
        folder.mkdir(parents=True)
        sheet = folder / f"{enemy_id}-sheet.png"
        img = Image.new("RGBA", (64, 64))
        for frame in range(16):
            x, y = (frame % 4) * 16, (frame // 4) * 16
            img.paste((50 + frame, 100, 190, 255), (x + 3, y + 2, x + 13, y + 15))
        img.save(sheet)
        frame_data = {k: [{"bounds": [3, 2, 13, 15]} for _ in range(4)]
                      for k in ("idle", "hurt", "attack", "dodge")}
        report = {"status": "passed", "frames": 16, "sheetSha256": cli.sha(sheet),
                  "cellSize": [16, 16], "frameData": frame_data,
                  "actorAnchor": [8, 15], "requestedIdleHeight": 70}
        (folder / "qa-report.json").write_text(json.dumps(report), encoding="utf-8")
        manifest = {"actions": ["idle", "hurt", "attack", "dodge"],
                    "enemies": [{"id": enemy_id, "name": "Slime Ácido", "boss": False,
                                 "rank": 0, "status": "candidate",
                                 "report": f"assets/spritesheets/enemies-hd/{enemy_id}/qa-report.json"}]}
        (self.assets / "manifest.json").write_text(json.dumps(manifest), encoding="utf-8")
        self.catalog.write_text(json.dumps({
            "version": "enemies-hd-v1", "actions": manifest["actions"],
            "enemies": {"otro": {"name": "Debe conservarse"}}
        }), encoding="utf-8")
        return enemy_id, sheet

    def test_identificador_bloquea_rutas(self):
        for invalid in ("../x", "a/b", "Elfo", "123", ""):
            with self.assertRaises(ValueError, msg=invalid):
                cli.identificador(invalid)

    def test_publicar_exige_revision(self):
        enemy_id, _ = self.fixture()
        with self.assertRaisesRegex(ValueError, "aprobado"):
            cli.publicar_enemigo(enemy_id, False)
        self.assertFalse((self.output / f"{enemy_id}-sheet.png").exists())

    def test_publicacion_individual_conserva_otras_entradas(self):
        enemy_id, sheet = self.fixture()
        cli.publicar_enemigo(enemy_id, True)
        catalog = json.loads(self.catalog.read_text(encoding="utf-8"))
        self.assertEqual(set(catalog["enemies"]), {"otro", enemy_id})
        self.assertEqual((self.output / f"{enemy_id}-sheet.png").read_bytes(), sheet.read_bytes())
        self.assertEqual(catalog["enemies"][enemy_id]["sha256"], cli.sha(sheet))

    def test_publicacion_rechaza_atlas_alterado(self):
        enemy_id, sheet = self.fixture()
        with Image.open(sheet) as loaded:
            new_img = loaded.copy()
        new_img.putpixel((0, 0), (255, 0, 0, 255))
        new_img.save(sheet)
        with self.assertRaisesRegex(ValueError, "no coincide"):
            cli.publicar_enemigo(enemy_id, True)

    def test_heroe_delega_y_devuelve_error_legible(self):
        with patch.object(cli, "script", side_effect=ValueError("fallo controlado")):
            self.assertEqual(cli.main(["heroe", "estado", "--clase", "novato", "--sexo", "m"]), 1)


if __name__ == "__main__":
    unittest.main()
