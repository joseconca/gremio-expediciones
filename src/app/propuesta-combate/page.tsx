"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import SpriteHeroeAnimado from "@/components/combate/SpriteHeroeAnimado";
import SpriteEnemigoAnimado from "@/components/combate/SpriteEnemigoAnimado";
import { ENEMIGOS_HD } from "@/lib/sprites-enemigos-hd";
import { obtenerEnemigoPorId } from "@/lib/enemigos";
import styles from "./preview.module.css";

const HEROES = [
  { nombre: "Aldric", clase: "espadachin", sexo: "chico", arma: "espada_hierro", hp: 840, max: 1080, mp: 64 },
  { nombre: "Lyra", clase: "mago", sexo: "chica", arma: "baston_madera", hp: 420, max: 560, mp: 128 },
  { nombre: "Rowan", clase: "arquero", sexo: "chico", arma: "arco_madera", hp: 610, max: 720, mp: 80 },
  { nombre: "Elara", clase: "acolito", sexo: "chica", arma: "maza_madera", hp: 540, max: 640, mp: 96 },
];
const VISTAS = [
  { id: "solo-desktop", nombre: "Solo · Escritorio", movil: false, party: false },
  { id: "party-desktop", nombre: "Party · Escritorio", movil: false, party: true },
  { id: "solo-mobile", nombre: "Solo · Móvil", movil: true, party: false },
  { id: "party-mobile", nombre: "Party · Móvil", movil: true, party: true },
];

function Escena({ movil, party, jefe }: { movil: boolean; party: boolean; jefe: string }) {
  const [objetivo, setObjetivo] = useState(0);
  const [accion, setAccion] = useState<"idle" | "attack" | "hurt">("idle");
  const [inicio, setInicio] = useState(0);
  const [menu, setMenu] = useState<"principal" | "habilidades" | "objetos">("principal");
  const [expandido, setExpandido] = useState(false);
  const [historial, setHistorial] = useState(["El grupo entra en el claro.", "Aldric está listo para actuar."]);
  const [descripcion, setDescripcion] = useState("Atacar usa el arma equipada contra el enemigo marcado. Huir intenta abandonar el combate.");
  const [huido, setHuido] = useState(false);
  const infoRef = useRef<HTMLDialogElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const heroes = party ? HEROES : HEROES.slice(0, 1);
  const enemigos = jefe ? [jefe] : party ? ["bandido_camino", "orco_despiadado", "esqueleto_guerrero"] : ["bandido_camino"];
  const seleccionado = Math.min(objetivo, enemigos.length - 1);
  const ejecutar = (nombre: string, ahora: number, animacion: typeof accion = "attack") => {
    if (timer.current) clearTimeout(timer.current);
    setInicio(ahora); setAccion(animacion); setMenu("principal");
    const linea = `${nombre} · ${ENEMIGOS_HD[enemigos[seleccionado]].name}`;
    setHistorial(h => [...h.slice(-19), linea]);
    timer.current = setTimeout(() => setAccion("idle"), 1100);
  };
  const ancho = movil ? 390 : 1120;
  const altoEscena = 360;
  return <div className={`${styles.battle} ${movil ? styles.mobile : ""}`} style={{ width: ancho, height: movil ? 760 : 680 }}>
    <header className={styles.battleHeader}><div><span className={styles.eyebrow}>BOSQUE DE LAS CENIZAS</span><strong>{jefe ? "Una presencia ancestral" : "Emboscada en el sendero"}</strong></div><nav className={styles.headerTools} aria-label="Información del combate"><button onClick={() => infoRef.current?.showModal()}>Info</button><span className={styles.turn}>Turno 03</span></nav></header>
    <div className={styles.stage}>
      <div className={styles.stageVeil} />
      <div className={styles.turnNote}>◆ Turno de Aldric</div>
      {heroes.map((h, i) => {
        const size = movil ? (party ? 80 : 124) : (party ? 116 : 172);
        const x = party ? (movil ? [102, 57, 113, 68][i] : [340, 205, 340, 205][i]) : ancho * 0.24;
        const foot = party ? altoEscena * [0.45, 0.59, 0.75, 0.89][i] : altoEscena * 0.8;
        return <div key={h.nombre} className={styles.actor} style={{ left: x, top: foot - size, width: size * 0.7, height: size, zIndex: 10 + i }}>
          <div className={`${styles.ground} ${i === 0 ? styles.activeGround : ""}`} />
          <SpriteHeroeAnimado clase={h.clase} profesionActivaId={h.clase} sexo={h.sexo} nombre={h.nombre} armaId={h.arma} escudoId={i === 0 ? "escudo_guardian" : undefined}
            accion={i === 0 && accion === "attack" ? "attack_sword" : "idle"} inicioAnimacion={inicio} />
        </div>;
      })}
      {enemigos.map((id, i) => {
        const s = ENEMIGOS_HD[id];
        const radio = Math.max(s.anchor[0] - s.bounds[0], s.bounds[2] - s.anchor[0]);
        const unit = Math.min((movil ? (party ? 80 : 124) : (party ? 116 : 172)) / 170, (movil ? 92 : 235) / radio, (altoEscena * 0.58) / (s.anchor[1] - s.bounds[1]));
        const x = ancho * (enemigos.length === 1 ? 0.74 : [0.71, 0.81, 0.69][i]);
        const foot = altoEscena * (enemigos.length === 1 ? 0.8 : [0.48, 0.68, 0.88][i]);
        return <button key={id} className={`${styles.actor} ${styles.enemy}`} aria-label={`Seleccionar ${s.name}`} aria-pressed={seleccionado === i}
          onClick={() => { setObjetivo(i); }}
          style={{ left: x, top: foot - s.height * unit, width: Math.max(64, radio * unit * 1.2), height: s.height * unit, "--unidad-enemigo": `${unit}px`, zIndex: 10 + i } as CSSProperties}>
          <div className={`${styles.ground} ${seleccionado === i ? styles.enemyGround : ""}`} />
          <SpriteEnemigoAnimado enemigoId={id} nombre={s.name} accion={seleccionado === i && accion === "attack" ? "hurt" : seleccionado === i && accion === "hurt" ? "attack" : "idle"} inicioAnimacion={inicio} />
          {seleccionado === i && <span className={styles.targetArrow}>▼</span>}
          {seleccionado === i && accion === "attack" && <span className={styles.damage}>128</span>}
        </button>;
      })}

    </div>
    <footer className={styles.hud}>
      <div className={styles.allCombatants}>
        <section className={styles.teamLedger} aria-label="Aliados">
        {heroes.map((h, i) => <div key={h.nombre} className={`${styles.heroCard} ${i === 0 ? styles.activeCard : ""}`}>
          <div className={styles.cardTitle}><strong>{h.nombre}</strong><span>{i === 0 ? "◆ ACTÚA" : h.clase}</span></div>
          <div className={styles.stat}><span>PV</span><div className={styles.bar}><i style={{ width: `${h.hp / h.max * 100}%` }} /></div><b>{h.hp}<small>/{h.max}</small></b></div>
          <div className={styles.stat}><span>{i === 1 || i === 3 ? "PM" : "EN"}</span><div className={`${styles.bar} ${styles.mana}`}><i style={{ width: "72%" }} /></div><b>{h.mp}</b></div>
        </div>)}</section><section className={styles.teamLedger} aria-label="Enemigos">{enemigos.map((id, i) => {
          const e = obtenerEnemigoPorId(id);
          const hp = e?.hp ?? 100;
          return <button key={id} className={`${styles.heroCard} ${styles.enemyCard} ${seleccionado === i ? styles.selectedEnemyCard : ""}`} aria-label={`Ver ${ENEMIGOS_HD[id].name}`} aria-pressed={seleccionado === i} onClick={() => setObjetivo(i)}>
            <div className={styles.cardTitle}><strong>{ENEMIGOS_HD[id].name}</strong><span>{seleccionado === i ? "◆ MARCADO" : "ENEMIGO"}</span></div>
            <div className={styles.stat}><span>PV</span><div className={`${styles.bar} ${styles.enemyHealth}`}><i style={{width:"100%"}} /></div><b>{hp}<small>/{hp}</small></b></div>
            <div className={styles.stat}><span>PM/EN</span><span className={styles.noResource} title="El combate actual no asigna maná ni energía a los enemigos">—</span></div>
          </button>;
        })}</section>
      </div>
      <div className={`${styles.actionBlock} ${menu !== "principal" ? styles.actionBlockExpanded : ""}`} aria-label="Menú de acciones">
      <div className={styles.orders}>
        <div className={styles.commandGrid}>{["Atacar", "Habilidades", "Objetos", "Huir"].map((label, i) => <button key={label} aria-expanded={i === 1 ? menu === "habilidades" : i === 2 ? menu === "objetos" : undefined} disabled={accion !== "idle" || huido} onClick={() => {
          if (label === "Habilidades" || label === "Objetos") { const next = label === "Habilidades" ? "habilidades" : "objetos"; setMenu(menu === next ? "principal" : next); setDescripcion(next === "habilidades" ? "Selecciona una técnica. El coste se muestra a la derecha." : "Selecciona un consumible. La cantidad disponible se muestra a la derecha."); }
          else if (label === "Huir") { setHuido(true); setHistorial(h => [...h, "Aldric sale del combate (demostración)."]); }
          else ejecutar(label, performance.now());
        }}><span aria-hidden="true">{i === 0 ? "▸" : ""}</span>{label}{(i === 1 || i === 2) && <small>›</small>}</button>)}</div>
      </div>
        {menu !== "principal" && <div className={styles.submenu} aria-label={menu === "habilidades" ? "Lista de habilidades" : "Lista de objetos"}>
          <div className={styles.submenuTitle}><strong>{menu === "habilidades" ? "Habilidades" : "Objetos"}</strong><button aria-label="Cerrar lista" onClick={() => setMenu("principal")}>×</button></div>
          {(menu === "habilidades" ? ["Corte poderoso", "Golpe certero", "Bloquear"] : ["Poción", "Éter", "Antídoto"]).map((nombre, i) => {
            const texto = menu === "habilidades" ? ["Un golpe reforzado con el arma equipada. Coste: 18 EN.", "Un ataque preciso contra un enemigo. Coste: 12 EN.", "Una técnica defensiva. Coste: 8 EN."][i] : ["Recupera puntos de vida. Disponibles: 3.", "Recupera maná. Disponible: 1.", "Elimina veneno. Disponibles: 2."][i];
            return <button key={nombre} disabled={accion !== "idle" || huido} onFocus={() => setDescripcion(texto)} onMouseEnter={() => setDescripcion(texto)} onClick={() => {
              if (menu === "habilidades" && i < 2) ejecutar(nombre, performance.now());
              else { const linea = `${nombre} utilizado · demostración`; setHistorial(h => [...h.slice(-19), linea]); setMenu("principal"); }
            }}><span>{nombre}</span><small>{menu === "habilidades" ? ["18 EN", "12 EN", "8 EN"][i] : ["×3", "×1", "×2"][i]}</small></button>;
          })}
          <p className={styles.actionDescription} aria-live="polite">{descripcion}</p>
        </div>}
      </div>
      {menu === "principal" && <section className={`${styles.historyOnly} ${expandido ? styles.historyOpen : ""}`} aria-label="Historial del combate">
        <button className={styles.historyToggle} aria-label={expandido ? "Reducir historial" : "Ampliar historial"} aria-expanded={expandido} onClick={() => setExpandido(!expandido)}>{expandido ? "−" : "+"}</button>
        <ol>{(expandido ? historial : historial.slice(-4)).map((linea, i) => <li key={i}>{linea}</li>)}</ol>
      </section>}
      {huido && <div className={styles.exitPanel}><strong>Has salido del combate</strong><p>Demostración de la acción Huir.</p><button onClick={() => { setHuido(false); }}>Volver a la vista previa</button></div>}

    </footer>
    <dialog ref={infoRef} className={styles.infoDialog} aria-labelledby={`info-${movil}-${party}`}>
      <header><div><h2 id={`info-${movil}-${party}`}>Participantes</h2><p>Datos de demostración · turno 03</p></div><button autoFocus onClick={() => infoRef.current?.close()} aria-label="Cerrar información">×</button></header>
      <div className={styles.infoTeams}>
        <section><h3>Tu grupo</h3>{heroes.map((h, i) => <article key={h.nombre}><h4>{h.nombre} <small>{h.clase}</small></h4><dl>
          <dt>Vida</dt><dd>{h.hp} / {h.max}</dd><dt>{i === 1 || i === 3 ? "Maná" : "Energía"}</dt><dd>{h.mp}</dd>
          <dt>Ataque físico</dt><dd>{[86, 28, 72, 36][i]}</dd><dt>Ataque mágico</dt><dd>{[14, 96, 18, 74][i]}</dd><dt>Defensa física</dt><dd>{[62, 24, 38, 42][i]}</dd><dt>Defensa mágica</dt><dd>{[28, 68, 32, 64][i]}</dd><dt>Velocidad</dt><dd>{[30, 26, 48, 24][i]}</dd><dt>Posición</dt><dd>{i === 0 ? "Frente" : "Retaguardia"}</dd><dt>Estado</dt><dd>{i === 0 ? "Turno activo" : "En espera"}</dd><dt>Efectos</dt><dd>Ninguno</dd>
        </dl></article>)}</section>
        <section><h3>Rivales</h3>{enemigos.map((id, i) => { const e = obtenerEnemigoPorId(id); return <article key={id}><h4>{ENEMIGOS_HD[id].name}</h4><dl>
          <dt>Vida</dt><dd>{e?.hp ?? 100} / {e?.hp ?? 100}</dd><dt>Ataque físico</dt><dd>{e?.ataque ?? "—"}</dd><dt>Ataque mágico</dt><dd>{e?.ataqueMagico ?? "—"}</dd><dt>Defensa física</dt><dd>{e?.defensa ?? "—"}</dd><dt>Defensa mágica</dt><dd>{e?.defensaMagica ?? "—"}</dd><dt>Velocidad</dt><dd>{e?.velocidad ?? "—"}</dd><dt>Posición</dt><dd>Frente</dd><dt>Estado</dt><dd>{i === seleccionado ? "Objetivo marcado" : "En espera"}</dd><dt>Efectos</dt><dd>Ninguno</dd>
        </dl></article>; })}</section>
      </div>
    </dialog>
  </div>;
}

function Marco({ vista, jefe }: { vista: typeof VISTAS[number]; jefe: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [disponible, setDisponible] = useState(390);
  useEffect(() => {
    if (!ref.current) return;
    const observer = new ResizeObserver(([e]) => setDisponible(e.contentRect.width));
    observer.observe(ref.current); return () => observer.disconnect();
  }, []);
  const width = vista.movil ? 390 : 1120, height = vista.movil ? 760 : 680;
  const scale = Math.min(1, disponible / width);
  return <article className={styles.preview}><div className={styles.previewHeading}><h2>{vista.nombre}</h2><span>{width} × {height}</span></div>
    <div ref={ref} className={styles.frameSpace}><div className={styles.frame} style={{ width: width * scale, height: height * scale }}><div style={{ width, height, transform: `scale(${scale})`, transformOrigin: "top left" }}><Escena key={`${vista.id}-${jefe}`} movil={vista.movil} party={vista.party} jefe={jefe} /></div></div></div>
  </article>;
}

export default function PropuestaCombate() {
  const [vista, setVista] = useState("todas");
  const [jefe, setJefe] = useState("");
  return <main className={styles.page}><div className={styles.intro}><Link href="/revision-sprites">← Revisión de sprites</Link><p className={styles.eyebrow}>PROPUESTA VISUAL · NO APLICADA AL JUEGO</p><h1>Un escenario para la aventura.</h1><p>Órdenes clásicas en una ventana lateral, estados compactos y selección directamente sobre el enemigo. Prueba los objetivos y los botones: esta demostración no modifica tu partida.</p></div>
    <div className={styles.toolbar}><nav aria-label="Vistas de la propuesta">{[{ id: "todas", nombre: "Las cuatro vistas" }, ...VISTAS].map(v => <button key={v.id} aria-pressed={vista === v.id} onClick={() => setVista(v.id)}>{v.nombre}</button>)}</nav>
      <label>Encuentro <select aria-label="Encuentro" value={jefe} onChange={e => setJefe(e.target.value)}><option value="">Enemigos del sendero</option>{Object.entries(ENEMIGOS_HD).filter(([, s]) => s.boss).map(([id, s]) => <option key={id} value={id}>{s.name}</option>)}</select></label>
    </div>
    <p className={styles.hint}>Selecciona una vista para ampliarla. Las vistas de escritorio se reducen proporcionalmente si el panel es estrecho.</p>
    <div className={`${styles.gallery} ${vista !== "todas" ? styles.single : ""}`}>{VISTAS.filter(v => vista === "todas" || vista === v.id).map(v => <Marco key={v.id} vista={v} jefe={jefe} />)}</div>
  </main>;
}
