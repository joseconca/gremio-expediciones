"use client";

import { Barra, recursosVisibles, type FichaCombatiente } from "./PanelCombatientes";
import IndicadoresEfectosCombate from "./IndicadoresEfectosCombate";
import MarcadorObjetivo from "./MarcadorObjetivo";
import styles from "./estado-sobre-actor.module.css";

/** The effect row always reserves its height, including when no effect is active. */
export default function EstadoSobreActor({ ficha, enemigo = false, efectos = [], comida, habilidades, onInfo, posicion }: {
  ficha: FichaCombatiente; enemigo?: boolean; efectos?: unknown; comida?: string | null;
  habilidades?: { habilidadId: string; slot?: string | null }[]; onInfo?: () => void; posicion?: string;
}) {
  const recursos = recursosVisibles(ficha);
  return <div className={`${styles.root} ${enemigo ? styles.enemyRoot : ""}`} data-estado-actor={ficha.id} data-posicion={posicion}>
    {ficha.seleccionado && ficha.hp > 0 && <MarcadorObjetivo />}
    <button type="button" onClick={onInfo} className={`${styles.plate} ${enemigo ? styles.enemy : ""}`}
      title={ficha.nombre} aria-label={`Información de ${ficha.nombre}`}>
      <strong>{ficha.nombre}{ficha.activo ? " ◆" : ""}</strong>
      <Barra nombre={`Vida de ${ficha.nombre}`} etiqueta="PV" actual={ficha.hp} maximo={ficha.hpMaximo} tipo={enemigo ? "enemyHp" : "hp"} />
      {recursos.energia && <Barra nombre={`Energía de ${ficha.nombre}`} etiqueta="EN" actual={ficha.energia!} maximo={ficha.energiaMaxima!} tipo="energy" />}
      {recursos.mana && <Barra nombre={`Maná de ${ficha.nombre}`} etiqueta="PM" actual={ficha.mana!} maximo={ficha.manaMaximo!} tipo="mana" />}
      {(ficha.estado === "huyo" || ficha.hp <= 0) && <small>{ficha.estado === "huyo" ? "Retirado" : "Caído"}</small>}
    </button>
    <div className={styles.effects} data-fila-efectos>
      <IndicadoresEfectosCombate efectos={efectos} comidaPreparada={comida} habilidades={habilidades} />
    </div>
  </div>;
}
