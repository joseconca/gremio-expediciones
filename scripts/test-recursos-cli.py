"""Pruebas unitarias del orquestador de recursos HD sin alterar assets reales."""
from __future__ import annotations

import importlib.util
import json
import contextlib
import io
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

VALIDATOR_SPEC = importlib.util.spec_from_file_location(
    "validar_runtime", HERE / "validar-runtime-sprites-hd.py")
validator = importlib.util.module_from_spec(VALIDATOR_SPEC)
assert VALIDATOR_SPEC and VALIDATOR_SPEC.loader
VALIDATOR_SPEC.loader.exec_module(validator)


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

    def test_variantes_publicadas_comparan_sexos_sin_imponer_orden(self):
        self.assertTrue(validator.coinciden_variantes(["m", "f"], ["f", "m"]))
        self.assertTrue(validator.coinciden_variantes(["m"], ["m"]))
        self.assertTrue(validator.coinciden_variantes([], []))
        self.assertFalse(validator.coinciden_variantes(["m", "f"], ["f"]))
        self.assertFalse(validator.coinciden_variantes(["m"], ["m", "m"]))
        self.assertFalse(validator.coinciden_variantes(["m"], ["m", "otro"]))
        self.assertFalse(validator.coinciden_variantes(["m"], None))

    def test_resumen_muestra_atlas_publicados_y_variantes_faltantes(self):
        heroes = self.root / "src/lib/generated/sprites-hd.json"
        heroes.write_text(json.dumps({
            "classes": ["novato", "berserker"],
            "items": {"espada_hierro": {}},
        }), encoding="utf-8")
        self.catalog.write_text(json.dumps({
            "enemies": {"slime_acido": {}, "mimic": {}},
        }), encoding="utf-8")

        for clase, sexos in (("novato", ("m", "f")), ("berserker", ("m",))):
            carpeta = self.root / "public/sprites/hd-v1/heroes" / clase
            carpeta.mkdir(parents=True)
            for sexo in sexos:
                (carpeta / f"{sexo}-sheet.png").write_bytes(b"atlas-ficticio")

        equipo = self.root / "public/sprites/hd-v1/equipment/espada_hierro"
        equipo.mkdir(parents=True)
        for sexo in ("m", "f"):
            (equipo / f"{sexo}-sheet.png").write_bytes(b"equipo-ficticio")
        self.output.mkdir(parents=True)
        (self.output / "slime_acido-sheet.png").write_bytes(b"enemigo-ficticio")

        resultado = cli.resumen_publicacion()
        self.assertEqual(resultado["ubicacionRuntime"], "public/sprites/")
        self.assertEqual(resultado["heroes"]["clasesEnCatalogoHd"], 2)
        self.assertEqual(resultado["heroes"]["atlasPublicados"], 3)
        self.assertEqual(resultado["heroes"]["variantesPendientes"], {
            "berserker": ["f"],
        })
        self.assertEqual(resultado["enemigos"], {
            "registrados": 2, "atlasPublicados": 1,
        })
        self.assertEqual(resultado["equipo"], {
            "piezasRegistradas": 1, "piezasConAmbosAtlas": 1,
        })
        salida = io.StringIO()
        with contextlib.redirect_stdout(salida):
            self.assertEqual(cli.main(["resumen"]), 0)
        self.assertEqual(json.loads(salida.getvalue()), resultado)

    def test_inventario_distingue_fuentes_y_previsualizaciones_sin_borrar(self):
        rutas = {
            "hd-128x256/novato/m/frames/idle/01.png": b"abc",
            "hd-128x256/novato/m/preview.png": b"1234",
            "hd-128x256/previews/novato-overview.gif": b"12345",
            "enemies-hd/slime_acido/slime_acido-sheet.png": b"123456",
            "originales/tier2/manifest.json": b"1234567",
        }
        for relativa, contenido in rutas.items():
            destino = self.root / "assets/spritesheets" / relativa
            destino.parent.mkdir(parents=True, exist_ok=True)
            destino.write_bytes(contenido)
        resultado = cli.inventario_fuentes()
        self.assertEqual(resultado["total"], {
            "archivos": 5, "bytes": 25, "previsualizaciones": 2,
            "bytesPrevisualizaciones": 9,
        })
        self.assertEqual(resultado["categorias"]["heroesEquipoHd"]["fotogramas"], 1)
        self.assertEqual(resultado["categorias"]["enemigosHd"]["atlasIntermedios"], 1)
        self.assertEqual(resultado["categorias"]["originalesHistoricos"]["archivos"], 1)
        salida = io.StringIO()
        with contextlib.redirect_stdout(salida):
            self.assertEqual(cli.main(["inventario"]), 0)
        self.assertEqual(json.loads(salida.getvalue()), resultado)
        for relativa in rutas:
            self.assertTrue((self.root / "assets/spritesheets" / relativa).is_file())

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

    def test_equipo_publicar_sin_id_valida_antes_de_promover(self):
        with patch.object(cli, "script") as ejecutar:
            self.assertEqual(cli.main(["equipo", "publicar", "--aprobado"]), 0)
            self.assertEqual(ejecutar.call_count, 2)
            self.assertEqual(ejecutar.call_args_list[0].args[0], "validar-equipo-hd.py")
            self.assertEqual(ejecutar.call_args_list[1].args[0], "promover-sprites-hd.py")

    def test_equipo_actualizar_ensambla_una_sola_pieza(self):
        metadata = self.root / "item.json"
        metadata.write_text('{"id":"espada_hierro"}', encoding="utf-8")
        with patch.object(cli, "script") as ejecutar:
            self.assertEqual(cli.main(["equipo", "actualizar", "--metadata", str(metadata)]), 0)
            self.assertEqual(ejecutar.call_count, 2)
            self.assertEqual(ejecutar.call_args_list[0].args[0], "registrar-equipo-hd.py")
            self.assertEqual(ejecutar.call_args_list[1].args,
                             ("ensamblar-equipo-hd.py", "--items", "espada_hierro"))

    def test_heroe_delega_y_devuelve_error_legible(self):
        with patch.object(cli, "script", side_effect=ValueError("fallo controlado")):
            self.assertEqual(cli.main(["heroe", "estado", "--clase", "novato", "--sexo", "m"]), 1)


if __name__ == "__main__":
    unittest.main()
