#!/usr/bin/env python3
"""Validate and publish Novato masculino Dodge and Block Shield frames.

Run from the root of a clean checkout of joseconca/gremio-expediciones on
branch creacion-sprite-sheets:

  python C:/Temp/novato-sprite-recovery-2026-10-24/apply_recovery.py \
      --source C:/Temp/novato-sprite-recovery-2026-10-24

The script makes an art commit and a docs/checkpoint commit for each action,
then pushes after every commit so progress is durable. It never changes runtime
spritesheets or commits the presentation/source boards.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import os
import struct
import subprocess
import sys
from datetime import date
from pathlib import Path

REPO_BRANCH = "creacion-sprite-sheets"
REPO_FULL_NAME = "joseconca/gremio-expediciones"
BASE = Path("assets/spritesheets/hd-128x256")
MANIFEST = BASE / "manifest.json"
CHECKPOINT = Path("docs/sprites/checkpoint-sprites-hd-2026-10-24.md")
VARIANT_ROOT = BASE / "novato/m"
ACTIONS = ("dodge", "block_shield")


def run_git(root: Path, *args: str, check: bool = True) -> str:
    p = subprocess.run(["git", *args], cwd=root, text=True, stdout=subprocess.PIPE,
                       stderr=subprocess.PIPE, encoding="utf-8", errors="replace")
    if check and p.returncode:
        raise RuntimeError(f"git {' '.join(args)} falló ({p.returncode}):\n{p.stderr.strip()}")
    return p.stdout.strip()


def discover_repo(start: Path) -> Path:
    for p in (start, *start.parents):
        if (p / ".git").exists() and (p / MANIFEST).is_file() and (p / CHECKPOINT).is_file():
            return p.resolve()
    raise RuntimeError("No encuentro la raíz de gremio-expediciones (se esperan .git, manifest.json y el checkpoint). Ejecuta desde el repositorio.")


def png_info(data: bytes) -> dict:
    if not data.startswith(b"\x89PNG\r\n\x1a\n"):
        raise ValueError("no es un PNG válido")
    pos = 8
    width = height = color_type = bit_depth = None
    trns = None
    while pos + 8 <= len(data):
        length = struct.unpack(">I", data[pos:pos+4])[0]
        typ = data[pos+4:pos+8]
        body_start = pos + 8
        body_end = body_start + length
        if body_end + 4 > len(data):
            raise ValueError("PNG truncado (chunk fuera de los límites)")
        body = data[body_start:body_end]
        if typ == b"IHDR":
            width, height, bit_depth, color_type, comp, filt, interlace = struct.unpack(">IIBBBBB", body)
        elif typ == b"tRNS":
            trns = body
        elif typ == b"IEND":
            break
        pos = body_end + 4
    if width is None:
        raise ValueError("falta el chunk IHDR")
    if color_type == 3:
        alphas = list(trns or b"")
        if not alphas:
            raise ValueError("PNG indexed sin tRNS; no tiene transparencia real")
        # Palette entries not listed in tRNS default to alpha=255.
        has_clear = 0 in alphas
        has_opaque = 255 in alphas or len(alphas) < 256
    elif color_type == 6:
        # RGBA; IDAT decoding is needed for exhaustive alpha extrema, QA's SHA still protects source.
        has_clear = has_opaque = True
    else:
        has_clear = has_opaque = False
    return {"width": width, "height": height, "bit_depth": bit_depth,
            "color_type": color_type, "indexed_transparency": bool(trns),
            "has_clear": has_clear, "has_opaque": has_opaque}


def validate_frame(frame: Path, qa_path: Path, expected_action: str, n: int) -> None:
    data = frame.read_bytes()
    qa = json.loads(qa_path.read_text(encoding="utf-8"))
    info = png_info(data)
    expected_path = (BASE / f"novato/m/frames/{expected_action}/{frame.name}").as_posix()
    errors = []
    if (info["width"], info["height"]) != (128, 256): errors.append(f"dimensiones={info['width']}x{info['height']}")
    if info["color_type"] != 3 or not info["indexed_transparency"] or not info["has_clear"] or not info["has_opaque"]:
        errors.append(f"transparencia/PNG no válido: {info}")
    digest = hashlib.sha256(data).hexdigest()
    if qa.get("image", {}).get("sha256") != digest: errors.append("SHA-256 distinto del QA")
    if qa.get("image", {}).get("dimensions") != [128, 256]: errors.append("QA con dimensiones distintas")
    if qa.get("path") != expected_path: errors.append(f"path del QA distinto: {qa.get('path')}")
    if qa.get("action") != expected_action or qa.get("frameNumber") != n: errors.append("acción/número del QA incorrecto")
    if qa.get("status") != "technical-passed-visual-review-pending": errors.append("estado QA inesperado")
    checks = qa.get("checks", {})
    required = ("exactDimensions", "realTransparency", "characterVisible", "bodyNotClipped", "individualFrameOnly", "alphaBoundingBoxInsideCell")
    for key in required:
        if checks.get(key) is not True: errors.append(f"QA no supera {key}")
    if checks.get("uniqueWithinAction") is not True:
        errors.append("QA no certifica unicidad dentro de la acción")
    if errors:
        raise RuntimeError(f"QA rechazado para {frame.name}: " + "; ".join(errors))
    print(f"  OK {frame.name}: 128x256, transparencia, SHA-256 y QA coinciden")


def ensure_clean(root: Path, source: Path) -> None:
    status = run_git(root, "status", "--porcelain", "--untracked-files=all")
    allowed = source.resolve()
    unexpected = []
    for line in status.splitlines():
        path_text = line[3:].strip().strip('"')
        p = (root / path_text).resolve()
        try:
            p.relative_to(allowed)
            continue
        except ValueError:
            unexpected.append(line)
    if unexpected:
        raise RuntimeError("El checkout tiene cambios ajenos a este paquete. Confírmalos o guárdalos antes de seguir:\n" + "\n".join(unexpected))


def verify_remote_head(root: Path, expected_sha: str) -> None:
    rows = run_git(root, "ls-remote", "origin", f"refs/heads/{REPO_BRANCH}").splitlines()
    remote_sha = rows[0].split()[0] if rows else ""
    if remote_sha != expected_sha:
        raise RuntimeError(
            f"Verificación remota fallida: origin/{REPO_BRANCH}={remote_sha or '<sin referencia>'}, "
            f"pero el commit esperado es {expected_sha}. No avances el checkpoint."
        )
    print(f"  Remoto verificado: origin/{REPO_BRANCH} -> {remote_sha}")


def push(root: Path) -> None:
    expected = run_git(root, "rev-parse", "HEAD")
    print("  push origin " + REPO_BRANCH)
    run_git(root, "push", "origin", REPO_BRANCH)
    verify_remote_head(root, expected)


def commit(root: Path, message: str, paths: list[str], do_push: bool) -> str:
    run_git(root, "add", "--", *paths)
    changed = run_git(root, "diff", "--cached", "--name-only")
    if not changed:
        print("  Sin cambios para este commit; se reutiliza HEAD.")
        return run_git(root, "rev-parse", "HEAD")
    run_git(root, "commit", "-m", message)
    sha = run_git(root, "rev-parse", "HEAD")
    print(f"  Commit: {sha} — {message}")
    if do_push:
        push(root)
    return sha


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data: dict) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def update_manifest(root: Path, action: str, art_commit: str, next_action: str) -> None:
    path = root / MANIFEST
    data = read_json(path)
    variant = next((v for v in data["variants"] if v.get("classId") == "novato" and v.get("sex") == "m"), None)
    if variant is None:
        raise RuntimeError("No encuentro la variante novato/m en el manifiesto")
    completed = variant.setdefault("actionsCompleted", [])
    for n in range(1, 5):
        label = f"{action}/{n:02d}"
        if label not in completed:
            completed.append(label)
    # Preserve canonical action ordering from the technical contract.
    order = {name: i for i, name in enumerate(data["technicalContract"]["actions"])}
    completed.sort(key=lambda item: (order.get(item.split("/")[0], 999), int(item.split("/")[1])))
    variant["lastCommit"] = art_commit
    variant["qaStatus"] = "technical-passed-visual-review-pending"
    pretty = {"dodge": "Esquivar", "block_shield": "Bloquear con escudo"}[action]
    next_frame_name = f"novato-m-{next_action}-01"
    last_frame_path = (BASE / f"novato/m/frames/{action}/novato-m-{action}-04.png").as_posix()
    last_qa_path = last_frame_path[:-4] + ".qa.json"
    data["nextFrame"] = next_frame_name
    data["lastFrameCompleted"] = last_frame_path
    data["lastFrameQa"] = last_qa_path
    data["lastFrameCommit"] = art_commit
    checkpoint = data.setdefault("checkpoint", {})
    checkpoint["updatedAt"] = date.today().isoformat()
    checkpoint["branch"] = REPO_BRANCH
    checkpoint["nextFrame"] = next_frame_name
    checkpoint["worklogPath"] = CHECKPOINT.as_posix()
    action_labels = {
        "idle": "Idle", "walk": "Walk", "hurt": "Hurt", "use_consumable": "Use Consumable",
        "dodge": "Esquivar", "block_shield": "Bloquear con escudo"
    }
    completed_actions = sorted({item.split("/")[0] for item in completed},
                               key=lambda name: order.get(name, 999))
    completed_label = ", ".join(action_labels.get(name, name) for name in completed_actions)
    checkpoint["note"] = (
        f"Novato masculino: acciones con 4 PNG individuales y QA por fotograma: {completed_label}. "
        "QA técnico aprobado; revisión artística conjunta pendiente. "
        f"Siguiente recurso: {next_frame_name}. No ensamblar ni promover a runtime antes de revisar las 15 acciones."
    )
    variant["notes"] = (variant.get("notes", "").rstrip() + f" {pretty}: frames 01–04 individuales y QA por fotograma; commit de arte {art_commit[:12]}. QA técnico aprobado, revisión artística visual conjunta pendiente. No promover a runtime hasta revisar la hoja completa.").strip()
    write_json(path, data)


def update_checkpoint(root: Path, completed_action: str, art_commit: str, next_action: str, remote_published: bool) -> None:
    path = root / CHECKPOINT
    text = path.read_text(encoding="utf-8")
    action_name = {"dodge": "Esquivar", "block_shield": "Bloquear (escudo)"}[completed_action]
    next_name = {"block_shield": "Bloquear con escudo", "attack_sword": "Ataque con espada 1H"}[next_action]
    bullet = f"- `{action_name}`: frames 01–04 completos como PNG individuales de 128×256, con QA por fotograma. Commit de arte: `{art_commit}`. QA técnico aprobado; revisión visual pendiente.\n"
    # Insert the newest completed action after the previous checkpoint line.
    anchor = "- `Use Consumable`:"
    if completed_action == "block_shield":
        anchor = "- `Esquivar`:"
    idx = text.find(anchor)
    if idx >= 0:
        end = text.find("\n", idx)
        if end < 0: end = len(text)
        if bullet.strip() not in text:
            text = text[:end+1] + bullet + text[end+1:]
    else:
        # Keep recovery robust if the exact old checkpoint wording changes.
        marker = "**Ilustración maestra para menús**"
        pos = text.find(marker)
        if pos >= 0:
            text = text[:pos] + bullet + "\n" + text[pos:]
    import re
    text = re.sub(r"- Siguiente recurso exacto: .*", f"- Siguiente recurso exacto: `novato-m-{next_action}-01` ({next_name}, frame 01). No se ha empezado Novato femenino ni otra clase.", text, count=1)
    # Replace the next-session section with the exact checkpoint after this action.
    cut = text.find("## Próxima sesión")
    if cut >= 0:
        next_block = ("## Próxima sesión\n\n" +
            f"Continuar **Novato masculino · {next_name}** como una tanda de cuatro poses. Separar los PNG individuales, verificar 128×256 y transparencia real, generar/verificar QA por fotograma y guardar un commit de arte. Actualizar manifiesto y checkpoint tras verificar el SHA remoto. No promover sprites a runtime hasta completar y revisar visualmente las 15 acciones.\n")
        # Preserve subsequent sections (acceptance criteria, notes, audit trail).
        next_heading = text.find("\n## ", cut + len("## Próxima sesión"))
        end = next_heading if next_heading >= 0 else len(text)
        text = text[:cut] + next_block + text[end:]
    # Add audit entry to CI/commits without inventing a workflow status.
    publication_note = ("Publicación remota verificada por SHA después del push." if remote_published
                        else "Commit local todavía sin publicar; no tratar el SHA como remoto.")
    entry = f"- Commit de arte de {action_name}: `{art_commit}`. {publication_note} Revisión visual: pendiente.\n"
    marker = "## Criterios de aceptación que no deben relajarse"
    if marker in text and entry.strip() not in text:
        text = text.replace(marker, entry + "\n" + marker, 1)
    path.write_text(text, encoding="utf-8")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--source", required=True, help="Carpeta extraída del ZIP (contiene dodge/ y block_shield/)")
    ap.add_argument("--no-push", action="store_true", help="Crear commits locales pero no hacer push")
    args = ap.parse_args()
    source = Path(args.source).resolve()
    if not (source / "dodge").is_dir() or not (source / "block_shield").is_dir():
        raise RuntimeError("--source debe apuntar a la carpeta con dodge/ y block_shield/")
    root = discover_repo(Path.cwd())
    branch = run_git(root, "branch", "--show-current")
    if branch != REPO_BRANCH:
        raise RuntimeError(f"Rama actual '{branch}', se exige '{REPO_BRANCH}'. No se cambia de rama automáticamente.")
    ensure_clean(root, source)
    print(f"Repositorio: {root}\nRama: {branch}\nHEAD inicial: {run_git(root,'rev-parse','HEAD')}")
    # Do not auto-merge or overwrite. If a remote exists, refuse to proceed with a stale checkout.
    remote_head = run_git(root, "ls-remote", "origin", f"refs/heads/{REPO_BRANCH}", check=False).split()
    if remote_head:
        local_head = run_git(root, "rev-parse", "HEAD")
        remote_sha = remote_head[0]
        if local_head != remote_sha:
            raise RuntimeError(f"HEAD local ({local_head}) no coincide con origin/{REPO_BRANCH} ({remote_sha}). Ejecuta git fetch y actualiza con fast-forward antes de aplicar.")
    do_push = not args.no_push
    for action in ACTIONS:
        print(f"\n=== {action} ===")
        source_action = source / action
        dest_action = root / VARIANT_ROOT / "frames" / action
        dest_action.mkdir(parents=True, exist_ok=True)
        staged_paths = []
        action_hashes = set()
        for n in range(1, 5):
            name = f"novato-m-{action}-{n:02d}.png"
            src_png = source_action / name
            src_qa = source_action / f"{name[:-4]}.qa.json"
            if not src_png.is_file() or not src_qa.is_file():
                raise RuntimeError(f"Falta PNG o QA de {name}")
            validate_frame(src_png, src_qa, action, n)
            png_sha = hashlib.sha256(src_png.read_bytes()).hexdigest()
            if png_sha in action_hashes:
                raise RuntimeError(f"Fotograma duplicado dentro de {action}: {name}")
            action_hashes.add(png_sha)
            dst_png = dest_action / name
            dst_qa = dest_action / src_qa.name
            for src, dst in ((src_png, dst_png), (src_qa, dst_qa)):
                if dst.exists():
                    if hashlib.sha256(dst.read_bytes()).hexdigest() != hashlib.sha256(src.read_bytes()).hexdigest():
                        raise RuntimeError(f"El archivo de destino existe con distinto contenido: {dst}; no se sobrescribe")
                else:
                    dst.write_bytes(src.read_bytes())
                staged_paths.append(dst.relative_to(root).as_posix())
        art_sha = commit(root, f"art(sprites): completar acción {'Esquivar' if action=='dodge' else 'Bloquear'} de Novato masculino (4 frames)", staged_paths, do_push)
        next_action = "block_shield" if action == "dodge" else "attack_sword"
        update_manifest(root, action, art_sha, next_action)
        update_checkpoint(root, action, art_sha, next_action, remote_published=do_push)
        docs_sha = commit(root, f"docs(sprites): checkpoint tras {'Esquivar' if action=='dodge' else 'Bloquear'}", [MANIFEST.as_posix(), CHECKPOINT.as_posix()], do_push)
        print(f"  Acción y QA publicados: {art_sha}\n  Manifiesto/checkpoint: {docs_sha}\n  Próximo recurso: novato-m-{next_action}-01")
    print("\nRECUPERACIÓN COMPLETADA: se han creado commits separados para Esquivar y Bloquear, con commits de documentación tras cada acción.")
    print("Las revisiones artísticas permanecen pendientes; no se ensamblan ni promueven las spritesheets runtime.")
    return 0

if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise SystemExit(1)
