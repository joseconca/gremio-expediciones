"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AccionAnimadaCombate } from "@/lib/expediciones/combate";
import type { ModoPresentacionCombate, TipoProyectilCombate } from "@/lib/tiposJuego";

export interface PulsoEstadoVisibleCombate {
  actor: string;
  tipo: "curacion" | "dano";
  cantidad: number;
}

export interface ProyectilVisibleCombate {
  id: number;
  tipo: TipoProyectilCombate;
  origen: string;
  destino: string;
  duracionMs: number;
  fallido: boolean;
}

export interface DestinosVisualesAccionCombate {
  actorVisual: string;
  objetivoVisual: string;
  pulsosEstadoVisibles: PulsoEstadoVisibleCombate[];
}

const DURACION_CURACION_VISIBLE_MS = 1550;

interface DanoVisibleCombate {
  actor: string;
  dano: number;
  critico: boolean;
}

interface DanoObjetivoVisibleCombate {
  objetivoId: string;
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
  const [daniosMultiplesVisibles, setDaniosMultiplesVisibles] = useState<DanoObjetivoVisibleCombate[]>([]);
  const [objetivosMultiplesImpactados, setObjetivosMultiplesImpactados] = useState<string[]>([]);
  const [actoresAnimando, setActoresAnimando] = useState<string[]>([]);
  const [curacionVisible, setCuracionVisible] = useState<CuracionVisibleCombate | null>(null);
  const [pulsosEstadoVisibles, setPulsosEstadoVisibles] = useState<PulsoEstadoVisibleCombate[]>([]);
  const [actorAnimando, setActorAnimando] = useState<string | null>(null);
  const [actorImpactado, setActorImpactado] = useState<string | null>(null);
  const [animacionActual, setAnimacionActual] = useState<AccionAnimadaCombate["animacion"] | null>(null);
  const [modoPresentacionActual, setModoPresentacionActual] = useState<ModoPresentacionCombate | null>(null);
  const [proyectilesVisibles, setProyectilesVisibles] = useState<ProyectilVisibleCombate[]>([]);

  const secuenciaRef = useRef(0);
  const montadoRef = useRef(true);
  const temporizadoresRef = useRef(new Map<number, () => void>());

  useEffect(() => {
    montadoRef.current = true;
    const temporizadores = temporizadoresRef.current;
    return () => {
      montadoRef.current = false;
      secuenciaRef.current += 1;
      for (const cancelar of temporizadores.values()) cancelar();
      temporizadores.clear();
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
    const modoPresentacion = accion.presentacion?.modo ?? (
      accion.animacion === "curacion"
        ? "curacion"
        : accion.animacion === "defensiva" || accion.animacion === "escudo"
          ? "defensiva"
          : accion.animacion === "ofensiva" || accion.animacion === "ofensiva_potenciada"
            ? "cuerpo_a_cuerpo"
            : "estado"
    );
    const animacionSoporte = modoPresentacion === "curacion" ||
      accion.animacion === "curacion" ||
      accion.animacion === "defensiva" ||
      accion.animacion === "escudo";
    const esProyectil = modoPresentacion === "proyectil" && Boolean(accion.presentacion?.proyectil);

    setDanioVisible(null);
    setDaniosMultiplesVisibles([]);
    setObjetivosMultiplesImpactados([]);
    setCuracionVisible(null);
    setActorImpactado(null);
    setProyectilesVisibles([]);
    setPulsosEstadoVisibles(destinos.pulsosEstadoVisibles);
    setAnimacionActual(accion.animacion);
    setModoPresentacionActual(modoPresentacion);
    setActorAnimando(
      accion.presentacion?.modo === "curacion" ? objetivoVisual : actorVisual,
    );
    setActoresAnimando(accion.actor === "enemigo" ? (accion.actoresEnemigoIds ?? []) : []);

    if (animacionSoporte) {
      if (curacion > 0) {
        setCuracionVisible({
          actor: accion.presentacion?.modo === "curacion" ? objetivoVisual : actorVisual,
          cantidad: curacion,
        });
      }
      await esperar(DURACION_CURACION_VISIBLE_MS, temporizadoresRef.current);
      if (!sigueActiva()) return;
      setCuracionVisible(null);
      setActorAnimando(null);
      setAnimacionActual(null);
      setModoPresentacionActual(null);
      setPulsosEstadoVisibles([]);
      return;
    }

    if (esProyectil && accion.presentacion?.proyectil) {
      setProyectilesVisibles([{
        id: secuencia,
        tipo: accion.presentacion.proyectil,
        origen: actorVisual,
        destino: objetivoVisual,
        duracionMs: 440,
        fallido: accion.tipo === "fallo" || dano <= 0,
      }]);
      await esperar(440, temporizadoresRef.current);
      if (!sigueActiva()) return;
      setProyectilesVisibles([]);
    } else {
      await esperar(accion.animacion === "ofensiva_potenciada" ? 350 : 250, temporizadoresRef.current);
      if (!sigueActiva()) return;
    }

    const fallo = accion.tipo === "fallo" || dano <= 0;
    const impactosMultiples = accion.impactosMultiples ?? [];
    const esImpactoMultiple = impactosMultiples.length > 0;
    if (!fallo) {
      if (esImpactoMultiple) setObjetivosMultiplesImpactados(impactosMultiples.map((impacto) => impacto.objetivoId));
      else setActorImpactado(objetivoVisual);
    }
    if (esImpactoMultiple) {
      setDaniosMultiplesVisibles(impactosMultiples);
    } else if (dano > 0) {
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
    setDaniosMultiplesVisibles([]);
    setObjetivosMultiplesImpactados([]);
    setActorImpactado(null);

    if (curacion > 0) {
      await esperar(DURACION_CURACION_VISIBLE_MS, temporizadoresRef.current);
      if (!sigueActiva()) return;
      setCuracionVisible(null);
    }

    await esperar(accion.animacion === "ofensiva_potenciada" ? 300 : 200, temporizadoresRef.current);
    if (!sigueActiva()) return;

    setDaniosMultiplesVisibles([]);
    setObjetivosMultiplesImpactados([]);
    setActoresAnimando([]);
    setActorAnimando(null);
    setAnimacionActual(null);
    setModoPresentacionActual(null);
    setProyectilesVisibles([]);
    setPulsosEstadoVisibles([]);
  }, []);

  return {
    danioVisible,
    daniosMultiplesVisibles,
    objetivosMultiplesImpactados,
    actoresAnimando,
    curacionVisible,
    pulsosEstadoVisibles,
    actorAnimando,
    actorImpactado,
    animacionActual,
    modoPresentacionActual,
    proyectilesVisibles,
    mostrarResultadoVisual,
  };
}
