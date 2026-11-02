#!/usr/bin/env python3
"""Entrada unica para preparar, verificar y publicar sprites de heroes HD.

No modifica equipos, enemigos ni aprobaciones artisticas de otras variantes.
Ejemplos:
  python scripts/sprites.py estado --clase berserker --sexo m
  python scripts/sprites.py actualizar --clase berserker --sexo m --accion idle --tira idle.png
  python scripts/sprites.py publicar --clase berserker --sexo m --aprobado
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
STAGING = ROOT / "assets/spritesheets/hd-128x256"
RUNTIME = ROOT / "public/sprites/hd-v1/heroes"
CATALOGO = ROOT / "src/lib/generated/sprites-hd.json"
ENSAMBLADOR = ROOT / "scripts/ensamblar-spritesheet-hd.py"
AUDITOR = ROOT / "scripts/auditar-sprites-hd.py"
ACCIONES = (
    "idle", "walk", "hurt", "use_consumable", "dodge", "block_shield",
    "attack_sword", "attack_axe", "attack_spear", "attack_dagger",
    "attack_bow", "attack_staff", "attack_mace", "attack_book", "attack_gloves",
)
TAMANO_CELDA = (128, 256)


def identificador(valor: str) -> str:
    if not re.fullmatch(r"[a-z][a-z0-9_]*", valor):
        raise ValueError("ID de clase no valido; usa letras minusculas, numeros y guion bajo")
    return valor


def variante(clase: str, sexo: str) -> Path:
    base = STAGING / identificador(clase) / sexo
    if not (base / "frames").is_dir():
        raise ValueError("No existe el directorio de fotogramas: " + str(base))
    return base


def hash_archivo(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def ruta_frame(base: Path, clase: str, sexo: str, accion: str, numero: int) -> Path:
    return base / "frames" / accion / f"{clase}-{sexo}-{accion}-{numero:02d}.png"


def validar_fotograma(imagen: Image.Image, etiqueta: str) -> Image.Image:
    if imagen.size != TAMANO_CELDA:
        raise ValueError(f"{etiqueta}: se esperaba 128x256, recibido {imagen.size}")
    if imagen.mode != "RGBA":
        raise ValueError(f"{etiqueta}: debe ser PNG RGBA con transparencia")
    alpha = imagen.getchannel("A")
    if alpha.getbbox() is None or alpha.getextrema()[0] != 0:
        raise ValueError(f"{etiqueta}: necesita figura visible y fondo transparente")
    return imagen.copy()


def leer_fotogramas(tira: Path | None, carpeta: Path | None) -> list[Image.Image]:
    if (tira is None) == (carpeta is None):
        raise ValueError("Proporciona exactamente una fuente: --tira o --fotogramas")
    imagenes: list[Image.Image] = []
    if tira is not None:
        with Image.open(tira) as original:
            if original.format != "PNG" or original.mode != "RGBA" or original.size != (512, 256):
                raise ValueError("--tira requiere PNG RGBA de 512x256 (4 fotogramas de 128x256)")
            for n in range(4):
                imagenes.append(validar_fotograma(
                    original.crop((n * 128, 0, (n + 1) * 128, 256)), f"fotograma {n + 1}"
                ))
    else:
        assert carpeta is not None
        for n in range(1, 5):
            path = carpeta / f"{n:02d}.png"
            with Image.open(path) as original:
                if original.format != "PNG":
                    raise ValueError(f"{path}: debe ser un PNG")
                imagenes.append(validar_fotograma(original, str(path)))
    if len({hashlib.sha256(im.tobytes()).hexdigest() for im in imagenes}) != 4:
        raise ValueError("Los cuatro fotogramas deben ser visualmente diferentes")
    return imagenes


def ejecutar(script: Path, *args: str) -> None:
    resultado = subprocess.run(
        [sys.executable, str(script), *args],
        cwd=ROOT, text=True, capture_output=True, check=False,
    )
    if resultado.returncode:
        raise ValueError(
            f"{script.name} fallo (codigo {resultado.returncode}): "
            + (resultado.stderr or resultado.stdout).strip()
        )


def ensamblar(clase: str, sexo: str) -> dict:
    ejecutar(ENSAMBLADOR, "--class-id", clase, "--sex", sexo, "--preview")
    base = variante(clase, sexo)
    informe = json.loads((base / "qa-report.json").read_text(encoding="utf-8"))
    atlas = base / f"{clase}-{sexo}-sheet.png"
    if informe.get("status") != "passed" or informe.get("framesValidated") != 60:
        raise ValueError("El informe de ensamblado no confirma 60 fotogramas validos")
    if hash_archivo(atlas) != informe.get("sheetSha256"):
        raise ValueError("El atlas difiere del hash del informe")
    return informe


def actualizar(clase: str, sexo: str, accion: str, tira: Path | None, carpeta: Path | None) -> None:
    base = variante(clase, sexo)
    imagenes = leer_fotogramas(tira, carpeta)
    rutas = [ruta_frame(base, clase, sexo, accion, n) for n in range(1, 5)]
    if any(not p.is_file() for p in rutas):
        raise ValueError("Faltan fotogramas originales: no se sobrescribira una variante incompleta")
    anteriores = [p.read_bytes() for p in rutas]
    atlas = base / f"{clase}-{sexo}-sheet.png"
    informe = base / "qa-report.json"
    vista = base / "preview.png"
    derivados = {p: p.read_bytes() if p.is_file() else None for p in (atlas, informe, vista)}
    try:
        for destino, imagen in zip(rutas, imagenes):
            temporal = destino.with_suffix(".temporal.png")
            try:
                imagen.save(temporal, format="PNG")
                temporal.replace(destino)
            finally:
                temporal.unlink(missing_ok=True)
        ensamblar(clase, sexo)
        # El auditor vuelve a calcular el manifiesto; invalida aprobaciones de hashes antiguos.
        ejecutar(AUDITOR, "--write")
    except Exception:
        for destino, anterior in zip(rutas, anteriores):
            destino.write_bytes(anterior)
        for destino, anterior in derivados.items():
            if anterior is None:
                destino.unlink(missing_ok=True)
            else:
                destino.write_bytes(anterior)
        raise
    print(f"Actualizados {clase}/{sexo}/{accion}: 4 fotogramas, atlas, QA y manifiesto.")
    print("Revisa la previsualizacion antes de publicar: " + str(vista.relative_to(ROOT)))


def publicar(clase: str, sexo: str, aprobado: bool) -> None:
    if not aprobado:
        raise ValueError("La publicacion exige --aprobado tras revisar visualmente la animacion")
    base = variante(clase, sexo)
    informe = ensamblar(clase, sexo)
    atlas = base / f"{clase}-{sexo}-sheet.png"
    idle = ruta_frame(base, clase, sexo, "idle", 1)
    if not idle.is_file():
        raise ValueError("Falta el reposo para el retrato")
    with Image.open(idle) as fuente:
        figura = validar_fotograma(fuente, str(idle))
    destino = RUNTIME / clase
    catalogo = json.loads(CATALOGO.read_text(encoding="utf-8"))
    if len(informe["rows"]) != len(ACCIONES) or [r["action"] for r in informe["rows"]] != list(ACCIONES):
        raise ValueError("El orden de acciones no coincide con el contrato de runtime")
    if not all(accion in catalogo["actions"] for accion in ACCIONES):
        raise ValueError("El catalogo de runtime no soporta todas las acciones")
    if sexo not in catalogo["timings"]:
        raise ValueError("No hay tiempos de animacion para este sexo")
    destino.mkdir(parents=True, exist_ok=True)
    (destino / f"{sexo}-sheet.png").write_bytes(atlas.read_bytes())
    (destino / f"{sexo}-idle.png").write_bytes(idle.read_bytes())
    retrato = Image.new("RGBA", (128, 256))
    retrato.alpha_composite(figura.resize((179, 358), Image.Resampling.LANCZOS), (-26, -99))
    retrato.save(destino / f"{sexo}-portrait.png")
    if clase not in catalogo["classes"]:
        catalogo["classes"].append(clase)
        CATALOGO.write_text(
            json.dumps(catalogo, ensure_ascii=False, separators=(",", ":")) + "\n",
            encoding="utf-8",
        )
    print(f"Publicado {clase}/{sexo}: atlas, reposo, retrato y registro de runtime.")
    print("La aprobacion visual fue confirmada expresamente con --aprobado.")


def estado(clase: str, sexo: str) -> None:
    base = variante(clase, sexo)
    origen = base / f"{clase}-{sexo}-sheet.png"
    publicado = RUNTIME / clase / f"{sexo}-sheet.png"
    catalogo = json.loads(CATALOGO.read_text(encoding="utf-8"))
    print(json.dumps({
        "clase": clase, "sexo": sexo,
        "fotogramasPresentes": sum(
            ruta_frame(base, clase, sexo, accion, n).is_file()
            for accion in ACCIONES for n in range(1, 5)
        ),
        "atlasPreparado": origen.is_file(),
        "atlasPublicado": publicado.is_file(),
        "publicacionActualizada": origen.is_file() and publicado.is_file()
        and hash_archivo(origen) == hash_archivo(publicado),
        "registradaEnRuntime": clase in catalogo["classes"],
    }, ensure_ascii=False, indent=2))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="orden", required=True)
    for nombre in ("estado", "validar", "actualizar", "publicar"):
        comando = sub.add_parser(nombre)
        comando.add_argument("--clase", required=True, type=identificador)
        comando.add_argument("--sexo", required=True, choices=("m", "f"))
        if nombre == "actualizar":
            comando.add_argument("--accion", choices=ACCIONES, required=True)
            fuentes = comando.add_mutually_exclusive_group(required=True)
            fuentes.add_argument("--tira", type=Path)
            fuentes.add_argument("--fotogramas", type=Path)
            comando.add_argument("--publicar", action="store_true")
            comando.add_argument("--aprobado", action="store_true")
        if nombre == "publicar":
            comando.add_argument("--aprobado", action="store_true")
    args = parser.parse_args()
    try:
        if args.orden == "estado":
            estado(args.clase, args.sexo)
        elif args.orden == "validar":
            informe = ensamblar(args.clase, args.sexo)
            print(json.dumps({"status": "passed", "frames": informe["framesValidated"],
                              "sheetSha256": informe["sheetSha256"]}, indent=2))
        elif args.orden == "actualizar":
            if args.aprobado and not args.publicar:
                raise ValueError("--aprobado solo tiene sentido con --publicar")
            actualizar(args.clase, args.sexo, args.accion, args.tira, args.fotogramas)
            if args.publicar:
                publicar(args.clase, args.sexo, args.aprobado)
        elif args.orden == "publicar":
            publicar(args.clase, args.sexo, args.aprobado)
    except (ValueError, OSError, json.JSONDecodeError) as error:
        print("ERROR: " + str(error), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
