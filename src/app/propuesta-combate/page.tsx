"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import SpriteHeroeAnimado from "@/components/combate/SpriteHeroeAnimado";
import SpriteEnemigoAnimado from "@/components/combate/SpriteEnemigoAnimado";
import { ENEMIGOS_HD } from "@/lib/sprites-enemigos-hd";
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
  const [mensaje, setMensaje] = useState("Elige un objetivo y una orden.");
  const [menu, setMenu] = useState<"principal" | "habilidades" | "objetos">("principal");
  const [registro, setRegistro] = useState(false);
  const [detalles, setDetalles] = useState(false);
  const [huido, setHuido] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const heroes = party ? HEROES : HEROES.slice(0, 1);
  const enemigos = jefe ? [jefe] : party ? ["bandido_camino", "orco_despiadado", "esqueleto_guerrero"] : ["bandido_camino"];
  const seleccionado = Math.min(objetivo, enemigos.length - 1);
  const ejecutar = (nombre: string, ahora: number, animacion: typeof accion = "attack") => {
    if (timer.current) clearTimeout(timer.current);
    setInicio(ahora); setAccion(animacion); setMenu("principal");
    setMensaje(`${nombre} · ${ENEMIGOS_HD[enemigos[seleccionado]].name}`);
    timer.current = setTimeout(() => setAccion("idle"), 1100);
  };
  const ancho = movil ? 390 : 1120;
  const altoEscena = movil ? 470 : 400;
  return <div className={`${styles.battle} ${movil ? styles.mobile : ""}`} style={{ width: ancho, height: movil ? 760 : 680 }}>
    <header className={styles.battleHeader}><div><span className={styles.eyebrow}>BOSQUE DE LAS CENIZAS</span><strong>{jefe ? "Una presencia ancestral" : "Emboscada en el sendero"}</strong></div><span className={styles.turn}>Turno 03</span></header>
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
          onClick={() => { setObjetivo(i); setMensaje(`Objetivo: ${s.name}`); }}
          style={{ left: x, top: foot - s.height * unit, width: Math.max(64, radio * unit * 1.2), height: s.height * unit, "--unidad-enemigo": `${unit}px`, zIndex: 10 + i } as CSSProperties}>
          <div className={`${styles.ground} ${seleccionado === i ? styles.enemyGround : ""}`} />
          <SpriteEnemigoAnimado enemigoId={id} nombre={s.name} accion={seleccionado === i && accion === "attack" ? "hurt" : seleccionado === i && accion === "hurt" ? "attack" : "idle"} inicioAnimacion={inicio} />
          {seleccionado === i && <span className={styles.targetArrow}>▼</span>}
          {seleccionado === i && accion === "attack" && <span className={styles.damage}>128</span>}
        </button>;
      })}
      <div className={styles.caption}>{mensaje}</div>
    </div>
    <footer className={styles.hud}>
      <div className={styles.roster} style={!party ? { gridTemplateColumns: "minmax(0, 1fr)" } : undefined}>{heroes.map((h, i) => <div key={h.nombre} className={`${styles.heroCard} ${i === 0 ? styles.activeCard : ""}`}>
        <div className={styles.cardTitle}><strong>{h.nombre}</strong><span>{i === 0 ? "◆ ACTÚA" : h.clase}</span></div>
        <div className={styles.stat}><span>PV</span><div className={styles.bar}><i style={{ width: `${h.hp / h.max * 100}%` }} /></div><b>{h.hp}<small>/{h.max}</small></b></div>
        <div className={styles.stat}><span>{i === 1 || i === 3 ? "PM" : "EN"}</span><div className={`${styles.bar} ${styles.mana}`}><i style={{ width: "72%" }} /></div><b>{h.mp}</b></div>
      </div>)}</div>
      <div className={styles.orders}><div className={styles.orderTitle}><span>{menu === "principal" ? "Aldric" : menu === "habilidades" ? "Habilidades" : "Objetos"}</span></div>
        <div className={styles.commandGrid}>{(menu === "principal" ? ["Atacar", "Habilidades", "Objetos", "Huir"] : menu === "habilidades" ? ["Corte poderoso", "Golpe certero", "Bloquear", "Volver"] : ["Poción", "Éter", "Antídoto", "Volver"]).map((label, i) => <button key={label} disabled={accion !== "idle" || huido} onClick={() => {
          if (label === "Habilidades") setMenu("habilidades"); else if (label === "Objetos") setMenu("objetos"); else if (label === "Volver") setMenu("principal");
          else if (label === "Huir") { setHuido(true); setMensaje("Has salido del combate · demostración"); }
          else if (label === "Atacar" || label === "Corte poderoso" || label === "Golpe certero") ejecutar(label, performance.now());
          else { setMensaje(`${label} seleccionado · demostración visual`); setMenu("principal"); }
        }}><span aria-hidden="true">{i === 0 ? "▸" : ""}</span>{label}{menu !== "principal" && label !== "Volver" && <small>{menu === "objetos" ? ["×3", "×1", "×2"][i] : ["18 EN", "12 EN", "8 EN"][i]}</small>}</button>)}</div>
      </div>
      <div className={styles.utilities}><button onClick={() => setDetalles(!detalles)}>Detalles</button><span>·</span><button onClick={() => setRegistro(!registro)}>Historial</button></div>
      {detalles && <div className={styles.log}><button onClick={() => setDetalles(false)} aria-label="Cerrar detalles">×</button><strong>{ENEMIGOS_HD[enemigos[seleccionado]].name}</strong><p>PV 760 / 1000 · Posición: frente</p><p>Aldric · PV 840 / 1080 · EN 64</p><small>Datos de muestra. En el juego se conservan las estadísticas, efectos y recursos reales.</small></div>}
      {huido && <div className={styles.exitPanel}><strong>Has salido del combate</strong><p>Demostración de la acción Huir.</p><button onClick={() => { setHuido(false); setMensaje("Elige un objetivo y una orden."); }}>Volver a la vista previa</button></div>}
      {registro && <div className={styles.log}><button onClick={() => setRegistro(false)} aria-label="Cerrar registro">×</button><strong>Registro de combate</strong><p>El grupo entra en el claro.</p><p>{mensaje}</p><small>Demostración: no consume recursos ni modifica tu partida.</small></div>}
    </footer>
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
