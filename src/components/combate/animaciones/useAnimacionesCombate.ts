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
const DURACION_IMPACTO_FINAL_EXTRA_MS = 550;
const PAUSA_ENTRE_ATAQUES_ENEMIGOS_MS = 1000;

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
  const [vidasTemporalesCombate, setVidasTemporalesCombate] = useState<Record<string, number> | null>(null);
  const [daniosMultiplesVisibles, setDaniosMultiplesVisibles] = useState<DanoObjetivoVisibleCombate[]>([]);
  const [objetivosMultiplesImpactados, setObjetivosMultiplesImpactados] = useState<string[]>([]);
  const [actoresAnimando, setActoresAnimando] = useState<string[]>([]);
  const [curacionVisible, setCuracionVisible] = useState<CuracionVisibleCombate | null>(null);
  const [pulsosEstadoVisibles, setPulsosEstadoVisibles] = useState<PulsoEstadoVisibleCombate[]>([]);
  const [actorAnimando, setActorAnimando] = useState<string | null>(null);
  const [actorImpactado, setActorImpactado] = useState<string | null>(null);
  const [actorEsquivando, setActorEsquivando] = useState<string | null>(null);
  const [actorSpriteAnimando, setActorSpriteAnimando] = useState<string | null>(null);
  const [accionSpriteActual, setAccionSpriteActual] = useState<"use_consumable" | null>(null);
  const [inicioAccionSprite, setInicioAccionSprite] = useState(0);
  const [inicioImpactoSprite, setInicioImpactoSprite] = useState(0);
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
    opciones: { esResultadoTerminal?: () => boolean } = {},
  ) => {
    const secuencia = ++secuenciaRef.current;
    const sigueActiva = () => montadoRef.current && secuenciaRef.current === secuencia;
    const { actorVisual, objetivoVisual } = destinos;
    setActorSpriteAnimando(actorVisual);
    setActorEsquivando(null);
    setAccionSpriteActual(accion.accionSprite ?? null);
    setInicioAccionSprite(performance.now());
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
    setVidasTemporalesCombate(null);
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
    const impactosEnemigos = accion.actor === "enemigo" ? (accion.impactosEnemigos ?? []) : [];
    setActoresAnimando(
      accion.actor === "enemigo" && impactosEnemigos.length <= 1
        ? (accion.actoresEnemigoIds ?? [])
        : [],
    );

    // Un turno enemigo puede incluir varios atacantes. Aunque el servidor
    // resuelva sus resultados en una sola transacción, la escena los representa
    // uno a uno y muestra el daño de cada golpe antes de pasar al siguiente.
    if (impactosEnemigos.length > 1) {
      setActorAnimando(null);
      setActoresAnimando([]);
      const vidasIniciales = impactosEnemigos.reduce<Record<string, number>>((vidas, impacto) => {
        if (!(impacto.objetivoId in vidas)) vidas[impacto.objetivoId] = impacto.hpAntes;
        return vidas;
      }, {});
      setVidasTemporalesCombate(vidasIniciales);

      for (let indice = 0; indice < impactosEnemigos.length; indice += 1) {
        if (indice > 0) {
          await esperar(PAUSA_ENTRE_ATAQUES_ENEMIGOS_MS, temporizadoresRef.current);
          if (!sigueActiva()) return;
        }

        const impacto = impactosEnemigos[indice];
        const esUltimoImpacto = indice === impactosEnemigos.length - 1;
        setDanioVisible(null);
        setDaniosMultiplesVisibles([]);
        setObjetivosMultiplesImpactados([]);
        setActorImpactado(null);
        setCuracionVisible(null);
        setActorAnimando(impacto.actorEnemigoId);
        setActoresAnimando([impacto.actorEnemigoId]);
        setAnimacionActual(impacto.critico ? "ofensiva_potenciada" : "ofensiva");

        await esperar(250, temporizadoresRef.current);
        if (!sigueActiva()) return;

        const resultadoTerminal = opciones.esResultadoTerminal?.() ?? false;
        setVidasTemporalesCombate((actuales) => ({
          ...(actuales ?? {}),
          [impacto.objetivoId]: impacto.hpDespues,
        }));
        if (impacto.dano > 0) {
          setInicioImpactoSprite(performance.now());
          setActorImpactado(impacto.objetivoId);
          setDanioVisible({
            actor: impacto.objetivoId,
            dano: impacto.dano,
            critico: impacto.critico,
          });
        }

        await esperar(
          (impacto.critico ? 450 : 300) +
            (esUltimoImpacto && resultadoTerminal ? DURACION_IMPACTO_FINAL_EXTRA_MS : 0),
          temporizadoresRef.current,
        );
        if (!sigueActiva()) return;

        setDanioVisible(null);
        setDaniosMultiplesVisibles([]);
        setObjetivosMultiplesImpactados([]);
        setActorImpactado(null);
        setActorAnimando(null);
        setActoresAnimando([]);
      }

      await esperar(200, temporizadoresRef.current);
      if (!sigueActiva()) return;
      setActorAnimando(null);
      setActorImpactado(null);
      setActorSpriteAnimando(null);
      setVidasTemporalesCombate(null);
      setAnimacionActual(null);
      setModoPresentacionActual(null);
      setProyectilesVisibles([]);
      setPulsosEstadoVisibles([]);
      return;
    }

    if (animacionSoporte) {
      if (curacion > 0) {
        setCuracionVisible({
          actor: accion.presentacion?.modo === "curacion" ? objetivoVisual : actorVisual,
          cantidad: curacion,
        });
      }
      const resultadoTerminal = opciones.esResultadoTerminal?.() ?? false;
      await esperar(
        DURACION_CURACION_VISIBLE_MS + (resultadoTerminal ? DURACION_IMPACTO_FINAL_EXTRA_MS : 0),
        temporizadoresRef.current,
      );
      if (!sigueActiva()) return;
      setCuracionVisible(null);
      setActorAnimando(null);
      setActorSpriteAnimando(null);
      setAnimacionActual(null);
      setModoPresentacionActual(null);
      setPulsosEstadoVisibles([]);
      return;
    }

    if (esProyectil && accion.presentacion?.proyectil) {
      const anticipacion = accion.presentacion.proyectil === "flecha" ? 280 : 0;
      if (anticipacion) { await esperar(anticipacion, temporizadoresRef.current); if (!sigueActiva()) return; }
      setProyectilesVisibles([{
        id: secuencia,
        tipo: accion.presentacion.proyectil,
        origen: actorVisual,
        destino: objetivoVisual,
        duracionMs: 440 - anticipacion,
        fallido: accion.tipo === "fallo" || dano <= 0,
      }]);
      await esperar(440 - anticipacion, temporizadoresRef.current);
      if (!sigueActiva()) return;
      setProyectilesVisibles([]);
    } else {
      await esperar(accion.animacion === "ofensiva_potenciada" ? 350 : 250, temporizadoresRef.current);
      if (!sigueActiva()) return;
    }

    // La fase terminal se consulta tras la anticipación del golpe, cuando el
    // estado final recibido del servidor ya se ha propagado a la escena.
    const resultadoTerminal = opciones.esResultadoTerminal?.() ?? false;
    const fallo = accion.tipo === "fallo" || dano <= 0;
    const impactosMultiples = accion.impactosMultiples ?? [];
    const esImpactoMultiple = impactosMultiples.length > 0;
    setInicioImpactoSprite(performance.now());
    if (accion.tipo === "fallo") setActorEsquivando(objetivoVisual);
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

    // En el golpe definitivo prolongamos el impacto para que se aprecien la
    // bajada de vida y el número de daño antes del panel de resultado.
    await esperar(
      (accion.animacion === "ofensiva_potenciada" ? 450 : 300) +
        (resultadoTerminal ? DURACION_IMPACTO_FINAL_EXTRA_MS : 0),
      temporizadoresRef.current,
    );
    if (!sigueActiva()) return;

    setDanioVisible(null);
    setDaniosMultiplesVisibles([]);
    setObjetivosMultiplesImpactados([]);
    setActorImpactado(null);
    setActorEsquivando(null);

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
    setActorSpriteAnimando(null);
    setAnimacionActual(null);
    setModoPresentacionActual(null);
    setProyectilesVisibles([]);
    setPulsosEstadoVisibles([]);
  }, []);

  return {
    danioVisible,
    vidasTemporalesCombate,
    daniosMultiplesVisibles,
    objetivosMultiplesImpactados,
    actoresAnimando,
    curacionVisible,
    pulsosEstadoVisibles,
    actorAnimando,
    actorImpactado,
    actorEsquivando,
    actorSpriteAnimando,
    accionSpriteActual,
    inicioAccionSprite,
    inicioImpactoSprite,
    estadoSprite: { actorImpactado, actorEsquivando, actorSpriteAnimando, objetivosMultiplesImpactados,
      animacionActual, accionSpriteActual, inicioAccionSprite, inicioImpactoSprite },
    animacionActual,
    modoPresentacionActual,
    proyectilesVisibles,
    mostrarResultadoVisual,
  };
}
