#!/usr/bin/env python3
"""Entrada de desarrollo para sprites HD: heroes, equipo superpuesto y enemigos.

Conserva los generadores especializados como implementacion interna.
  python scripts/recursos.py heroe estado --clase berserker --sexo m
  python scripts/recursos.py equipo estado --id espada_hierro
  python scripts/recursos.py enemigo estado --id slime_acido
  python scripts/recursos.py enemigo publicar --id slime_acido --aprobado
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ENEMIGOS = ROOT / "assets/spritesheets/enemies-hd"
EQUIPO = ROOT / "assets/spritesheets/hd-128x256/equipment"
DESTINO_ENEMIGOS = ROOT / "public/sprites/enemies-hd-v1"
CATALOGO_ENEMIGOS = ROOT / "src/lib/generated/enemies-hd.json"


def identificador(value: str) -> str:
    if not re.fullmatch(r"[a-z][a-z0-9_]*", value):
        raise ValueError("El identificador solo admite minusculas, numeros y guion bajo")
    return value


def cargar(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8-sig"))


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def script(nombre: str, *args: str) -> None:
    command = [sys.executable, str(ROOT / "scripts" / nombre), *args]
    resultado = subprocess.run(command, cwd=ROOT, text=True, capture_output=True, check=False)
    if resultado.returncode:
        raise ValueError(f"{nombre}: {(resultado.stderr or resultado.stdout).strip()}")
    if resultado.stdout.strip():
        print(resultado.stdout.strip())


def ficha_enemigo(enemy_id: str) -> tuple[dict, dict, Path]:
    manifest = cargar(ENEMIGOS / "manifest.json")
    enemy = next((e for e in manifest["enemies"] if e["id"] == enemy_id), None)
    if enemy is None:
        raise ValueError("Enemigo no registrado: " + enemy_id)
    folder = ENEMIGOS / enemy_id
    return manifest, enemy, folder


def validar_enemigo(enemy_id: str) -> tuple[dict, dict, Path]:
    manifest, item, folder = ficha_enemigo(enemy_id)
    if item["status"] != "candidate":
        raise ValueError("El enemigo aun no tiene la aprobacion candidata requerida")
    report_path = ROOT / item["report"]
    report = cargar(report_path)
    sheet = folder / f"{enemy_id}-sheet.png"
    if report.get("status") != "passed" or report.get("frames") != 16:
        raise ValueError("QA incompleto: se requieren 16 fotogramas")
    if sha(sheet) != report.get("sheetSha256"):
        raise ValueError("El atlas no coincide con el informe QA")
    with Image.open(sheet) as im:
        im.verify()
    with Image.open(sheet) as im:
        if im.format != "PNG" or im.mode != "RGBA":
            raise ValueError("El atlas del enemigo debe ser PNG RGBA")
        cell = report.get("cellSize", [])
        if len(cell) != 2 or im.size != (cell[0] * 4, cell[1] * 4):
            raise ValueError("La hoja no tiene la cuadricula 4x4 anunciada")
    for field in ("frameData", "actorAnchor", "requestedIdleHeight"):
        if field not in report:
            raise ValueError("El informe del enemigo carece de: " + field)
    return manifest, item, folder


def estado_enemigo(enemy_id: str) -> None:
    _, item, folder = ficha_enemigo(enemy_id)
    atlas = folder / f"{enemy_id}-sheet.png"
    runtime = DESTINO_ENEMIGOS / f"{enemy_id}-sheet.png"
    index = cargar(CATALOGO_ENEMIGOS) if CATALOGO_ENEMIGOS.is_file() else {"enemies": {}}
    print(json.dumps({
        "id": enemy_id, "estado": item["status"],
        "atlasFuente": atlas.is_file(), "atlasPublicado": runtime.is_file(),
        "sincronizado": atlas.is_file() and runtime.is_file() and sha(atlas) == sha(runtime),
        "enCatalogo": enemy_id in index.get("enemies", {}),
    }, ensure_ascii=False, indent=2))


def publicar_enemigo(enemy_id: str, aprobado: bool) -> None:
    if not aprobado:
        raise ValueError("Para publicar, verifica el arte y utiliza --aprobado")
    manifest, item, folder = validar_enemigo(enemy_id)
    report = cargar(ROOT / item["report"])
    sheet = folder / f"{enemy_id}-sheet.png"
    bounds = [f["bounds"] for frames in report["frameData"].values() for f in frames]
    if len(bounds) != 16:
        raise ValueError("El QA no contiene los limites de los 16 fotogramas")
    envelope = [min(b[0] for b in bounds), min(b[1] for b in bounds),
                max(b[2] for b in bounds), max(b[3] for b in bounds)]
    catalog = cargar(CATALOGO_ENEMIGOS) if CATALOGO_ENEMIGOS.is_file() else {
        "version": "enemies-hd-v1", "actions": manifest["actions"], "enemies": {}
    }
    if catalog["actions"] != manifest["actions"]:
        raise ValueError("Las acciones del catalogo no coinciden con el manifiesto")
    catalog["enemies"][enemy_id] = {
        "name": item["name"], "boss": item["boss"], "rank": item["rank"],
        "bounds": envelope, "src": f"/sprites/enemies-hd-v1/{enemy_id}-sheet.png",
        "cellSize": report["cellSize"][0], "anchor": report["actorAnchor"],
        "height": report["requestedIdleHeight"], "sha256": sha(sheet)
    }
    # Escribir primero el recurso; despues el indice. Otros enemigos se conservan.
    DESTINO_ENEMIGOS.mkdir(parents=True, exist_ok=True)
    (DESTINO_ENEMIGOS / f"{enemy_id}-sheet.png").write_bytes(sheet.read_bytes())
    CATALOGO_ENEMIGOS.parent.mkdir(parents=True, exist_ok=True)
    CATALOGO_ENEMIGOS.write_text(
        json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"Publicado {enemy_id} sin regenerar el resto de enemigos.")


def estado_equipo(item_id: str) -> None:
    manifest = cargar(EQUIPO / "manifest.json")
    item = manifest.get("items", {}).get(item_id)
    if not item:
        raise ValueError("Elemento de equipo no registrado: " + item_id)
    generated = ROOT / "src/lib/generated/sprites-hd.json"
    runtime = cargar(generated) if generated.is_file() else {"items": {}}
    print(json.dumps({
        "id": item_id, "familia": item.get("family"),
        "maestro": item.get("masterPath"),
        "hojas": {sex: bool(item.get("sheets", {}).get(sex)) for sex in ("m", "f")},
        "publicado": item_id in runtime.get("items", {}),
    }, ensure_ascii=False, indent=2))


def resumen_publicacion() -> dict:
    """Lee qué atlas reales está sirviendo el juego, sin tocar fuentes de arte."""
    heroes = cargar(ROOT / "src/lib/generated/sprites-hd.json")
    enemigos = cargar(CATALOGO_ENEMIGOS)
    ruta_heroes = ROOT / "public/sprites/hd-v1/heroes"
    ruta_equipo = ROOT / "public/sprites/hd-v1/equipment"
    clases = heroes.get("classes", [])
    variantes = {
        clase: [sexo for sexo in ("m", "f")
                if (ruta_heroes / clase / f"{sexo}-sheet.png").is_file()]
        for clase in clases
    }
    piezas = heroes.get("items", {})
    piezas_completas = sum(
        all((ruta_equipo / item / f"{sexo}-sheet.png").is_file()
            for sexo in ("m", "f"))
        for item in piezas
    )
    ids_enemigos = enemigos.get("enemies", {})
    enemigos_publicados = sum(
        (DESTINO_ENEMIGOS / f"{enemy_id}-sheet.png").is_file()
        for enemy_id in ids_enemigos
    )
    return {
        "ubicacionRuntime": "public/sprites/",
        "fuentesEditables": "assets/spritesheets/ (no se cargan en el navegador)",
        "indicesRuntime": "src/lib/generated/",
        "heroes": {
            "clasesEnCatalogoHd": len(clases),
            "atlasPublicados": sum(map(len, variantes.values())),
            "variantesPorClase": variantes,
            "variantesPendientes": {
                clase: [sexo for sexo in ("m", "f") if sexo not in disponibles]
                for clase, disponibles in variantes.items()
                if len(disponibles) != 2
            },
        },
        "enemigos": {
            "registrados": len(ids_enemigos),
            "atlasPublicados": enemigos_publicados,
        },
        "equipo": {
            "piezasRegistradas": len(piezas),
            "piezasConAmbosAtlas": piezas_completas,
        },
    }



def inventario_fuentes() -> dict:
    """Mide las fuentes artísticas sin modificar ni clasificar archivos como borrables."""
    base = ROOT / "assets/spritesheets"
    grupos = {
        "heroesEquipoHd": "hd-128x256",
        "enemigosHd": "enemies-hd",
        "originalesHistoricos": "originales",
    }
    categorias = {}
    total = {"archivos": 0, "bytes": 0, "previsualizaciones": 0,
             "bytesPrevisualizaciones": 0}
    for nombre, carpeta in grupos.items():
        ruta = base / carpeta
        cuenta = {"archivos": 0, "bytes": 0, "fotogramas": 0,
                  "atlasIntermedios": 0, "previsualizaciones": 0,
                  "bytesPrevisualizaciones": 0}
        if ruta.is_dir():
            for archivo in ruta.rglob("*"):
                if not archivo.is_file():
                    continue
                tamano = archivo.stat().st_size
                partes = archivo.relative_to(ruta).parts
                es_preview = "previews" in partes[:-1] or archivo.name.startswith("preview.")
                cuenta["archivos"] += 1
                cuenta["bytes"] += tamano
                if "frames" in partes[:-1]:
                    cuenta["fotogramas"] += 1
                if archivo.name.endswith("-sheet.png"):
                    cuenta["atlasIntermedios"] += 1
                if es_preview:
                    cuenta["previsualizaciones"] += 1
                    cuenta["bytesPrevisualizaciones"] += tamano
        categorias[nombre] = cuenta
        for clave in total:
            total[clave] += cuenta[clave]
    return {
        "directorio": "assets/spritesheets/",
        "categorias": categorias,
        "total": total,
        "advertencia": ("Inventario de solo lectura. Las previsualizaciones son "
                        "derivados potenciales, pero requieren comprobar sus "
                        "consumidores y su regeneración antes de eliminarlas."),
    }



def main(argv: list[str] | None = None) -> int:
    argv = sys.argv[1:] if argv is None else argv
    if argv == ["inventario"]:
        try:
            print(json.dumps(inventario_fuentes(), ensure_ascii=False, indent=2))
            return 0
        except OSError as error:
            print("ERROR: " + str(error), file=sys.stderr)
            return 1
    if argv == ["resumen"]:
        try:
            print(json.dumps(resumen_publicacion(), ensure_ascii=False, indent=2))
            return 0
        except (ValueError, OSError, KeyError, json.JSONDecodeError) as error:
            print("ERROR: " + str(error), file=sys.stderr)
            return 1
    if argv and argv[0] == "heroe":
        try:
            script("sprites.py", *argv[1:])
            return 0
        except (ValueError, OSError) as error:
            print("ERROR: " + str(error), file=sys.stderr)
            return 1
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("tipo", choices=("enemigo", "equipo"))
    parser.add_argument("orden", choices=("estado", "actualizar", "validar", "publicar"))
    parser.add_argument("--id", type=identificador)
    parser.add_argument("--metadata", type=Path)
    parser.add_argument("--aprobado", action="store_true")
    try:
        args = parser.parse_args(argv)
        if args.orden == "estado" and not args.id:
            raise ValueError("estado requiere --id")
        if args.tipo == "enemigo" and args.orden == "publicar" and not args.id:
            raise ValueError("publicar un enemigo requiere --id")
        if args.orden == "actualizar":
            if args.metadata is None:
                raise ValueError("actualizar requiere --metadata con origen y revision")
            if args.tipo == "enemigo":
                script("registrar-enemigo-hd.py", "--metadata", str(args.metadata),
                       *(["--reviewed"] if args.aprobado else []))
            else:
                # Registro + ensamblado de la pieza en una sola orden.
                # La validacion global y la promocion siguen siendo explicitas.
                item_id = identificador(cargar(args.metadata)["id"])
                script("registrar-equipo-hd.py", str(args.metadata))
                script("ensamblar-equipo-hd.py", "--items", item_id)
        elif args.tipo == "enemigo":
            if args.orden == "estado":
                estado_enemigo(args.id)
            elif args.orden == "validar":
                if args.id:
                    validar_enemigo(args.id)
                    print("OK: " + args.id)
                else:
                    script("auditar-enemigos-hd.py")
            elif args.orden == "publicar":
                publicar_enemigo(args.id, args.aprobado)
        elif args.orden == "estado":
            estado_equipo(args.id)
        elif args.orden == "validar":
            # Verificacion global: pivotes y agarres se comparten entre clases.
            script("validar-equipo-hd.py")
        elif args.orden == "publicar":
            if args.id:
                raise ValueError("La publicación de equipo es global; omite --id")
            if not args.aprobado:
                raise ValueError("Para publicar el equipo utiliza --aprobado")
            script("validar-equipo-hd.py")
            script("promover-sprites-hd.py")
    except (ValueError, OSError, KeyError, json.JSONDecodeError) as error:
        print("ERROR: " + str(error), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
