"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AccionAnimadaCombate } from "@/lib/expediciones/combate";

export interface PulsoEstadoVisibleCombate {
  actor: string;
  tipo: "curacion" | "dano";
  cantidad: number;
}

export interface DestinosVisualesAccionCombate {
  actorVisual: string;
  objetivoVisual: string;
  pulsosEstadoVisibles: PulsoEstadoVisibleCombate[];
}

interface DanoVisibleCombate {
  actor: string;
  dano: number;
  critico: boolean;
}

interface CuracionVisibleCombate {
  actor: string;
  cantidad: number;
}

/** Retraso cancelable para que una vista desmontada no deje timers vivos. */
function esperar(milisegundos: number, temporizadores: Map<number, () => void>): Promise<void> {
  return new Promise((resolver) => {
    let id = 0;
    const completar = () => {
      temporizadores.delete(id);
      resolver();
    };
    id = window.setTimeout(completar, milisegundos);
    temporizadores.set(id, () => {
      window.clearTimeout(id);
      temporizadores.delete(id);
      resolver();
    });
  });
}

/**
 * Secuencia visual compartida por el combate de expedición/party y el asedio PvP.
 * Recibe identidades ya resueltas por la escena y no modifica reglas del combate.
 */
export function useAnimacionesCombate() {
  const [danioVisible, setDanioVisible] = useState<DanoVisibleCombate | null>(null);
  const [curacionVisible, setCuracionVisible] = useState<CuracionVisibleCombate | null>(null);
  const [pulsosEstadoVisibles, setPulsosEstadoVisibles] = useState<PulsoEstadoVisibleCombate[]>([]);
  const [actorAnimando, setActorAnimando] = useState<string | null>(null);
  const [actorImpactado, setActorImpactado] = useState<string | null>(null);
  const [animacionActual, setAnimacionActual] = useState<AccionAnimadaCombate["animacion"] | null>(null);

  const secuenciaRef = useRef(0);
  const montadoRef = useRef(true);
  const temporizadoresRef = useRef(new Map<number, () => void>());

  useEffect(() => {
    montadoRef.current = true;
    return () => {
      montadoRef.current = false;
      secuenciaRef.current += 1;
      for (const cancelar of temporizadoresRef.current.values()) cancelar();
      temporizadoresRef.current.clear();
    };
  }, []);

  const mostrarResultadoVisual = useCallback(async (
    accion: AccionAnimadaCombate,
    destinos: DestinosVisualesAccionCombate,
  ) => {
    const secuencia = ++secuenciaRef.current;
    const sigueActiva = () => montadoRef.current && secuenciaRef.current === secuencia;
    const { actorVisual, objetivoVisual } = destinos;
    const curacion = accion.curacion ?? 0;
    const dano = accion.dano;
    const animacionSoporte = accion.presentacion?.modo === "curacion" ||
      accion.animacion === "curacion" ||
      accion.animacion === "defensiva" ||
      accion.animacion === "escudo";

    setDanioVisible(null);
    setCuracionVisible(null);
    setActorImpactado(null);
    setPulsosEstadoVisibles(destinos.pulsosEstadoVisibles);
    setAnimacionActual(accion.animacion);
    setActorAnimando(
      accion.presentacion?.modo === "curacion" ? objetivoVisual : actorVisual,
    );

    if (animacionSoporte) {
      if (curacion > 0) {
        setCuracionVisible({
          actor: accion.presentacion?.modo === "curacion" ? objetivoVisual : actorVisual,
          cantidad: curacion,
        });
      }
      await esperar(700, temporizadoresRef.current);
      if (!sigueActiva()) return;
      setCuracionVisible(null);
      setActorAnimando(null);
      setAnimacionActual(null);
      setPulsosEstadoVisibles([]);
      return;
    }

    await esperar(accion.animacion === "ofensiva_potenciada" ? 350 : 250, temporizadoresRef.current);
    if (!sigueActiva()) return;

    setActorImpactado(objetivoVisual);
    if (dano > 0) {
      setDanioVisible({ actor: objetivoVisual, dano, critico: accion.critico });
    }
    // El robo de vida es un segundo efecto de la misma acción: el daño aparece
    // en el objetivo y la curación sobre el actor que lo ejecutó.
    if (curacion > 0) {
      setCuracionVisible({ actor: actorVisual, cantidad: curacion });
    }

    await esperar(accion.animacion === "ofensiva_potenciada" ? 450 : 300, temporizadoresRef.current);
    if (!sigueActiva()) return;

    setDanioVisible(null);
    setActorImpactado(null);

    if (curacion > 0) {
      await esperar(700, temporizadoresRef.current);
      if (!sigueActiva()) return;
      setCuracionVisible(null);
    }

    await esperar(accion.animacion === "ofensiva_potenciada" ? 300 : 200, temporizadoresRef.current);
    if (!sigueActiva()) return;

    setActorAnimando(null);
    setAnimacionActual(null);
    setPulsosEstadoVisibles([]);
  }, []);

  return {
    danioVisible,
    curacionVisible,
    pulsosEstadoVisibles,
    actorAnimando,
    actorImpactado,
    animacionActual,
    mostrarResultadoVisual,
  };
}
