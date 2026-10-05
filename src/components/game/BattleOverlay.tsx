"use client";

import Image from "next/image";
import { useEffect, useRef, type CSSProperties } from "react";
import type { CombatController, CombatSnapshot } from "@/game/gameplay/CombatManager";
import BattleCharacterSprite from "./BattleCharacterSprite";
import { ATTACK_ANIMATION_MS } from "@/shared/combat";
import { enemyDifficultyColor } from "@/shared/enemies";

interface BattleOverlayProps {
  manager: CombatController;
  snapshot: CombatSnapshot;
  potionCount: number;
  busy?: boolean;
  serverControlled?: boolean;
  error?: string | null;
  title?: string;
  presentationNow: number;
}

const healthPercent = (current: number, maximum: number) => maximum > 0 ? Math.max(0, Math.min(100, current / maximum * 100)) : 0;

export default function BattleOverlay({ manager, snapshot, potionCount, busy = false, serverControlled = false, error, title = "Encuentro en el exterior", presentationNow }: BattleOverlayProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const hasEnemy = snapshot.enemy !== null;
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !hasEnemy) return;
    const previous = document.activeElement;
    dialog.focus({ preventScroll: true });
    const containFocus = (event: FocusEvent) => {
      if (event.target instanceof Node && !dialog.contains(event.target)) dialog.focus({ preventScroll: true });
    };
    document.addEventListener("focusin", containFocus);
    return () => {
      document.removeEventListener("focusin", containFocus);
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus({ preventScroll: true });
    };
  }, [hasEnemy]);

  const enemy = snapshot.enemy;
  if (!enemy) return null;
  const enemies = snapshot.enemies?.length ? snapshot.enemies : [enemy];
  const player = snapshot.party.find((member) => member.isLocalPlayer);
  const actor = snapshot.party.find((member) => member.id === snapshot.actingMemberId) ?? player ?? snapshot.party[0];
  const actingEnemy = enemies.find((candidate) => candidate.id === snapshot.actingMemberId);
  const finished = snapshot.phase !== "active";
  const enemyTurn = (snapshot.turn ?? "player") === "enemy";
  const blocked = busy || enemyTurn || finished || snapshot.canAct === false;
  const confirmedAction = snapshot.lastAction;
  const action = confirmedAction && presentationNow >= confirmedAction.at &&
    presentationNow - confirmedAction.at <= ATTACK_ANIMATION_MS ? confirmedAction : null;
  const playerAttack = action?.actor === "player" && action.kind === "attack";
  const enemyAttack = action?.actor === "enemy" && action.kind === "attack";
  const attacker = snapshot.party.find((member) => member.id === action?.actorMemberId) ?? actor;
  const recipient = snapshot.party.find((member) => member.id === action?.targetMemberId) ?? player ?? snapshot.party[0];
  const result = snapshot.phase === "victory" ? "Victoria" : snapshot.phase === "defeat" ? "Derrota" : "Huida";
  const status = finished ? result : busy ? "Resolviendo turno en el servidor…" : enemyTurn ? `${actingEnemy?.name ?? enemy.name} prepara su ataque…`
    : snapshot.canAct === false ? `Turno de ${actor?.name ?? "otro miembro"}; actuará desde su sesión.`
    : `Turno de ${actor?.name ?? "tu grupo"}`;

  return (
    <section ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={`Combate · ${title}`} className="battle" onKeyDown={(event) => {
      if (event.key !== "Tab") return;
      const buttons = dialogRef.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)");
      if (!buttons?.length) { event.preventDefault(); return; }
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialogRef.current)) {
        event.preventDefault(); first.focus();
      }
    }}>
      <header className="heading"><div><p className="eyebrow">{title}</p><h2>{enemy.name}{enemy.level ? ` · Nv. ${enemy.level}` : ""}</h2></div><span>Grupo {snapshot.party.length}/3</span></header>
      <main className="field">
        <div className="health-cards">
          <div className="party-cards">{snapshot.party.map((member) => (
            <article key={member.id} className={`health-card ${member.isLocalPlayer && member.attributes.currentHealth > 0 ? "local-card" : ""}`}>
              <div className="card-title"><strong>{member.name}</strong><span>{member.isLocalPlayer ? "Tú" : "Aliado"}</span></div>
              <div className="meter" role="progressbar" aria-label={`Vida de ${member.name}`} aria-valuemin={0} aria-valuemax={member.attributes.maxHealth} aria-valuenow={member.attributes.currentHealth}><span style={{ width: `${healthPercent(member.attributes.currentHealth, member.attributes.maxHealth)}%` }} /></div>
              <div className="stats"><span>Nv. {member.level ?? "—"}</span><span>{member.attributes.currentHealth}/{member.attributes.maxHealth} HP</span><span>Velocidad {member.attributes.speed}</span></div>
            </article>
          ))}</div>
          <div className="enemy-cards" aria-label="Enemigos">
            {enemies.map((target) => {
              const selected = target.id === (snapshot.selectedTargetId ?? enemy.id);
              const content = <>
                <div className="card-title"><strong>{target.name}{target.level ? ` · Nv. ${target.level}` : ""}</strong><span>{selected ? "Objetivo" : "Rival"}</span></div>
                <div className="meter" role="progressbar" aria-label={`Vida de ${target.name}`} aria-valuemin={0} aria-valuemax={target.attributes.maxHealth} aria-valuenow={target.attributes.currentHealth}><span style={{ width: `${healthPercent(target.attributes.currentHealth, target.attributes.maxHealth)}%` }} /></div>
                <div className="stats"><span>Nv. {target.level ?? "—"}</span><span>{target.attributes.currentHealth}/{target.attributes.maxHealth} HP</span><span>Velocidad {target.attributes.speed}</span></div>
              </>;
              return enemies.length > 1 ? <button key={target.id} type="button" className={`health-card enemy-card ${selected ? "selected-target" : ""}`}
                aria-pressed={selected} disabled={blocked || (serverControlled && !snapshot.party.some((member) => member.isLocalPlayer && member.id === snapshot.actingMemberId))}
                onClick={() => manager.selectTarget?.(target.id)}>{content}</button>
                : <article key={target.id} className="health-card enemy-card">{content}</article>;
            })}
          </div>
        </div>
        <div className="arena" aria-label="Tu grupo a la izquierda y el enemigo a la derecha">
          <div className="party-stage">{snapshot.party.map((member, index) => (
            <div key={member.id} className="member" style={{ "--offset-x": `${index * 20}px`, "--offset-y": `${index * -16}px`, zIndex: snapshot.party.length - index } as CSSProperties}>
              <div key={enemyAttack && recipient?.id === member.id ? `member-motion:${enemy.id}:${action.id}` : "member-motion:rest"} className={enemyAttack && recipient?.id === member.id ? "hurt" : ""}>
                <BattleCharacterSprite name={member.name} spriteSrc={member.spriteSrc} alive={member.attributes.currentHealth > 0} local={member.isLocalPlayer} attackId={playerAttack && attacker?.id === member.id ? action.id : undefined} />
              </div>
              {enemyAttack && recipient?.id === member.id && action.damage > 0 && <span key={`member-damage:${enemy.id}:${action.id}`} className="damage" aria-hidden="true">−{action.damage}</span>}
            </div>
          ))}</div>
          <div className={`enemy-stage ${enemies.length > 1 ? "multiple-enemies" : ""}`}>
            {enemies.map((target, index) => <div key={target.id} className="enemy-piece" style={{
              "--enemy-index": index,
              "--difficulty-color": enemyDifficultyColor(target.level ?? actor?.level ?? 1, player?.level ?? 1),
            } as CSSProperties}>
              <div key={action && (action.targetEnemyId ?? enemy.id) === target.id ? `enemy-motion:${target.id}:${action.id}` : `enemy-motion:${target.id}`}
                className={`enemy-motion ${enemyAttack && action?.targetEnemyId === target.id ? "lunge" : playerAttack && (action?.targetEnemyId ?? enemy.id) === target.id ? "hurt" : ""}`}>
                <Image src={target.sprite} alt={target.name} width={192} height={192} unoptimized className={`enemy-image ${target.attributes.currentHealth <= 0 ? "defeated" : ""}`} />
              </div>
              {playerAttack && (action?.targetEnemyId ?? enemy.id) === target.id && action.damage > 0 && <span key={`enemy-damage:${target.id}:${action.id}`} className="damage" aria-hidden="true">−{action.damage}</span>}
            </div>)}
          </div>
        </div>
        <p className="turn" role="status">{status}</p>
      </main>
      <footer className="console">
        <div className="narration">
          <p className="eyebrow">{finished ? "Resultado del encuentro" : "¿Qué vas a hacer?"}</p>
          <p aria-live="polite">{snapshot.log}</p>
          {error && <p role="alert" className="error">{error}</p>}
          {serverControlled && !finished && <p className="hint">Habilidades y objetos no disponibles en combates de expedición.</p>}
        </div>
        <div className="command-panel">
          {finished ? <div className="result"><strong className={snapshot.phase}>{result}</strong><button type="button" disabled={busy} onClick={() => manager.closeResult()}>Continuar</button></div> : snapshot.menu !== "root" ? (
            <nav className="submenu" aria-label="Selección de combate">
              {snapshot.menu === "skills" ? <p>Aún no tienes habilidades aprendidas.</p> : <button type="button" disabled={blocked || serverControlled || potionCount <= 0 || !player || player.attributes.currentHealth <= 0 || player.attributes.currentHealth >= player.attributes.maxHealth} onClick={() => manager.usePotion()}>Poción ×{potionCount}<small>Recupera hasta 30 HP</small></button>}
              <button type="button" disabled={blocked} onClick={() => manager.selectMenu("root")}>Volver</button>
            </nav>
          ) : (
            <nav className="commands" aria-label="Acciones de combate">
              <button type="button" className="attack-command" disabled={blocked} onClick={() => manager.act("attack")}>Atacar<small>Ataque físico</small></button>
              <button type="button" disabled={blocked || serverControlled} onClick={() => manager.act("skill")}>Habilidades<small>{serverControlled ? "No disponibles" : "Ver habilidades"}</small></button>
              <button type="button" disabled={blocked || serverControlled} onClick={() => manager.act("item")}>Objetos<small>{serverControlled ? "No disponibles" : `Pociones ×${potionCount}`}</small></button>
              <button type="button" disabled={blocked} onClick={() => manager.act("flee")}>Huir<small>Abandonar combate</small></button>
            </nav>
          )}
        </div>
      </footer>
      <style jsx>{`
        .battle { position: fixed; inset: 0; z-index: 60; display: flex; flex-direction: column; overflow-y: auto; overscroll-behavior: contain; color: #fff2d3; background: radial-gradient(ellipse at 70% 15%, #59675088, transparent 65%), linear-gradient(#17272e 15%, #304737 65%, #1b3029); padding-top: env(safe-area-inset-top); }
        .heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 20px; flex-shrink: 0; background: #101b22cc; border-bottom: 2px solid #cba86966; }
        .heading > span { font-size: 11px; white-space: nowrap; }
        .eyebrow { font-size: 10px; text-transform: uppercase; letter-spacing: .16em; color: #e4be78; font-weight: 800; margin: 0 0 4px; }
        h2 { font-size: clamp(16px, 2vw, 24px); font-weight: 900; margin: 0; }
        .field { width: 100%; max-width: 1080px; margin: auto; flex: 1 0 auto; display: flex; flex-direction: column; padding: 16px 20px 8px; min-width: 0; }
        .health-cards { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: clamp(12px, 5vw, 90px); align-items: start; z-index: 5; }
        .party-cards { display: grid; gap: 6px; }
        .health-card { background: #fff0cf; color: #253431; border: 2px solid #7a795b; border-radius: 8px 2px; box-shadow: 3px 3px 0 #0c1b2488; padding: 8px 10px; min-width: 0; }
        .enemy-cards { display: grid; gap: 6px; min-width: 0; }
        .enemy-card { width: 100%; text-align: left; }
        .selected-target { border-color: #e7b64d; box-shadow: 0 0 0 2px #e7b64d88, 3px 3px 0 #0c1b2488; }
        .local-card { border-color: #e7b64d; }
        .card-title, .stats { display: flex; justify-content: space-between; align-items: baseline; gap: 6px; }
        .card-title strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; }
        .card-title > span { font-size: 9px; text-transform: uppercase; }
        .stats { font-size: 10px; font-variant-numeric: tabular-nums; flex-wrap: wrap; }
        .meter { margin: 5px 0; height: 7px; background: #243330; border-radius: 2px; overflow: hidden; }
        .meter > span { display: block; height: 100%; background: #62bd81; transition: width .25s ease; }
        .enemy-card .meter > span { background: #e07564; }
        .arena { flex: 1; min-height: 210px; display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); align-items: end; gap: 12px; padding: 28px 0 8px; }
        .party-stage, .enemy-stage { position: relative; width: 100%; height: clamp(128px, 20vw, 192px); }
        .party-stage::before, .enemy-stage::before { content: ""; position: absolute; width: 86%; height: 28px; left: 7%; bottom: -6px; border-radius: 50%; background: #aec28a22; border-bottom: 3px solid #0f241f55; }
        .member { position: absolute; bottom: 0; left: calc(18% + var(--offset-x)); transform: translateY(var(--offset-y)); }
        .enemy-stage { display: flex; justify-content: center; align-items: end; }
        .enemy-piece { position: relative; width: 100%; display: flex; justify-content: center; align-items: end; }
        .enemy-piece::before { content: ""; position: absolute; z-index: 0; width: 62%; height: 18px; left: 19%; bottom: 2px; border: 2px solid var(--difficulty-color); border-radius: 50%; background: color-mix(in srgb, var(--difficulty-color) 20%, transparent); box-shadow: 0 0 12px color-mix(in srgb, var(--difficulty-color) 55%, transparent); }
        .multiple-enemies .enemy-piece { position: absolute; left: calc(var(--enemy-index) * 28%); width: 68%; }
        .multiple-enemies .enemy-piece:nth-child(even) { bottom: 24px; }
        .enemy-motion { width: clamp(100px, 20vw, 192px); height: clamp(100px, 20vw, 192px); position: relative; z-index: 1; }
        .enemy-stage :global(.enemy-image) { width: 100%; height: 100%; object-fit: contain; image-rendering: pixelated; }
        .enemy-stage :global(.defeated) { opacity: .4; filter: grayscale(1); }
        .lunge { animation: enemy-lunge .4s ease-out; }
        .hurt { animation: hit .4s ease-out; }
        .damage { position: absolute; left: 50%; top: 10%; z-index: 8; color: #fff0d6; font-size: clamp(24px, 5vw, 36px); font-weight: 900; text-shadow: 2px 2px #7c3028, -1px -1px #301a14; pointer-events: none; animation: damage-rise .85s ease-out forwards; }
        .turn { margin: 8px 0 0; text-align: center; font-size: 12px; font-weight: 700; color: #fff0c8; }
        .console { flex-shrink: 0; display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr); gap: 12px; padding: 12px max(12px, env(safe-area-inset-right)) max(12px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left)); border-top: 3px solid #d6b06d; background: #142127; }
        .narration, .command-panel { border: 2px solid #cba869; border-radius: 6px; padding: 12px; background: #fff0d4; color: #263237; min-width: 0; box-shadow: inset 0 0 0 2px #fff9eb; }
        .narration { font-size: 15px; line-height: 1.5; }
        .narration .eyebrow { color: #79603d; }
        .narration p { margin: 0 0 6px; overflow-wrap: anywhere; }
        .narration .hint { font-size: 11px; color: #5e6967; }
        .narration .error { color: #a4312d; font-weight: 700; }
        .commands { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }
        button { width: 100%; min-height: 44px; padding: 8px; border: 1px solid #b6a886; border-radius: 3px; background: #efe1c4; text-align: left; font-weight: 900; font-size: 13px; cursor: pointer; }
        button small { display: block; font-size: 10px; font-weight: 500; margin-top: 2px; }
        button:enabled:hover { background: #e7c987; }
        button:focus-visible { outline: 3px solid #286982; outline-offset: 2px; }
        button:disabled { opacity: .45; cursor: not-allowed; }
        .attack-command { background: #e8c277; }
        .submenu, .result { display: grid; gap: 10px; font-size: 13px; }
        .result > strong { font-size: 20px; text-transform: uppercase; }
        .victory { color: #26734a; } .defeat { color: #a4312d; }
        @keyframes enemy-lunge { 0%, 100% { transform: translateX(0); } 40% { transform: translateX(-28px); } }
        @keyframes hit { 0%, 100% { filter: none; transform: translateX(0); } 25%, 65% { filter: brightness(2); transform: translateX(5px); } 45% { transform: translateX(-5px); } }
        @keyframes damage-rise { 0% { opacity: 0; transform: translate(-50%, 8px); } 15%, 60% { opacity: 1; } 100% { opacity: 0; transform: translate(-50%, -45px); } }
        @media (max-width: 600px) { .heading { padding: 10px 12px; } .field { padding: 12px 10px 8px; } .health-card { padding: 6px; } .stats { font-size: 9px; gap: 2px; } .console { grid-template-columns: minmax(0, 1fr); gap: 8px; } .narration { font-size: 14px; padding: 10px; } .command-panel { padding: 8px; } .member { left: calc(8% + var(--offset-x)); } }
        @media (max-height: 500px) { .heading { padding: 6px 12px; } .field { padding: 8px 12px 4px; } .arena { min-height: 120px; padding-top: 8px; } .party-stage, .enemy-stage { height: 120px; } .enemy-motion { width: 120px; height: 120px; } .turn { margin-top: 4px; font-size: 11px; } .console { grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr); padding-top: 8px; gap: 8px; } .narration, .command-panel { padding: 8px; } button { padding: 5px 8px; } }
        @media (prefers-reduced-motion: reduce) { .lunge, .hurt { animation: none; } .damage { animation-timing-function: step-end; } .meter > span { transition: none; } }
      `}</style>
    </section>
  );
}
