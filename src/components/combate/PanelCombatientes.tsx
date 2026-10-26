import { CLASES } from "@/lib/progresion/clases";
import styles from "./combate-rpg.module.css";

export interface FichaCombatiente {
  id: string; nombre: string; claseId?: string | null;
  hp: number; hpMaximo: number;
  energia?: number; energiaMaxima?: number; mana?: number; manaMaximo?: number;
  activo?: boolean; estado?: string; seleccionado?: boolean;
}

export function recursosVisibles(ficha: FichaCombatiente) {
  const recurso = CLASES[ficha.claseId ?? ""]?.recursoCombate;
  return {
    energia: ficha.energia !== undefined && ficha.energiaMaxima !== undefined && recurso !== "mana",
    mana: ficha.mana !== undefined && ficha.manaMaximo !== undefined && recurso !== "energia",
  };
}

function Barra({ nombre, etiqueta, actual, maximo, tipo }: {
  nombre: string; etiqueta: string; actual: number; maximo: number; tipo: string;
}) {
  const valor = Math.max(0, actual), max = Math.max(0, maximo);
  return <div className={styles.stat} title={`${nombre}: ${valor}/${max}`}>
    <span>{etiqueta}</span><div className={`${styles.bar} ${styles[tipo]}`} role="progressbar"
      aria-label={nombre} aria-valuemin={0} aria-valuemax={max || 1} aria-valuenow={Math.min(valor, max)}>
      <i style={{ width: `${max > 0 ? Math.min(100, valor / max * 100) : 0}%` }} />
    </div><b>{valor}<small>/{max}</small></b>
  </div>;
}

export default function PanelCombatientes({ aliados, enemigos, onInfo }: {
  aliados: FichaCombatiente[]; enemigos: FichaCombatiente[]; onInfo: () => void;
}) {
  return <div className={styles.roster}>
    {[aliados, enemigos].map((equipo, lado) => <div key={lado} className={styles.team} aria-label={lado ? "Enemigos" : "Aliados"}>
      {equipo.map(f => { const recursos = recursosVisibles(f); return <button type="button" key={f.id}
        className={`${styles.card} ${f.activo ? styles.active : ""} ${f.seleccionado ? styles.marked : ""}`}
        onClick={onInfo} aria-label={`Información de ${f.nombre}`}>
        <span className={styles.name}>{f.nombre}<small>{f.estado === "huyo" ? "Retirado" : f.hp <= 0 ? "Caído" : f.activo ? "◆" : ""}</small></span>
        <div className={styles.resources}>
          <Barra nombre={`Vida de ${f.nombre}`} etiqueta="PV" actual={f.hp} maximo={f.hpMaximo} tipo={lado ? "enemyHp" : "hp"} />
          {recursos.energia && <Barra nombre={`Energía de ${f.nombre}`} etiqueta="EN" actual={f.energia!} maximo={f.energiaMaxima!} tipo="energy" />}
          {recursos.mana && <Barra nombre={`Maná de ${f.nombre}`} etiqueta="PM" actual={f.mana!} maximo={f.manaMaximo!} tipo="mana" />}
        </div>
      </button>; })}
    </div>)}
  </div>;
}
