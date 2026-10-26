"use client";

import { useState, type ComponentProps } from "react";
import CombateModal from "@/components/combate/CombateModal";
import AsedioModal from "@/components/combate/AsedioModal";
import type { Personaje, CombatePve, CombateActivo } from "@/store/useGameStore";
import { crearEnemigosEnCombate } from "@/lib/expediciones/enemigos-combate";
import { obtenerEnemigoPorId } from "@/lib/enemigos";
import { obtenerObjetoPorId } from "@/lib/objetos";

const personaje: Personaje = {
  id: "revision", nombre: "Aldric", clase: "cruzado", profesionActivaId: "cruzado", sexo: "chico", posicionCombate: "mele",
  fuerza: 20, agilidad: 20, vitalidad: 20, inteligencia: 20, destreza: 20, suerte: 20,
  energiaActual: 64, manaActual: 48, puntosAtributoDisponibles: 0, nivelJob: 20, experienciaJob: 0, puntosHabilidadDisponibles: 0,
  hpActual: 840, estado: "combatiendo", comidaPreparada: null, nivel: 20, experiencia: 0, velocidadMejoras: 0, capacidadCarruajeMejoras: 0,
  habilidades: [], inventario: [{ id: "pocion-revision", objetoId: "pocion", cantidad: 3, nivelMejora: 0, sufijoId: null, bonificaciones: {}, objeto: obtenerObjetoPorId("pocion")! }], equipo: { arma: null, manoSecundaria: null, casco: null, armadura: null, pantalones: null, botas: null, guantes: null, accesorio: null, anillo1: null, anillo2: null },
  hpMaximo: 1080, ataque: 80, defensa: 40, velocidad: 40, capacidadCarruaje: 10, probCritico: 0.1, danoCritico: 150, ataqueMagico: 60, defensaMagica: 35, precision: 95, evasion: 0.1,
  energiaMaxima: 100, manaMaximo: 80, regeneracionEnergiaPorTurno: 5, regeneracionManaPorTurno: 5,
};
const habilidades: NonNullable<ComponentProps<typeof CombateModal>["habilidadesIniciales"]> = [
  { id: "r1", habilidadId: "corte_runa", slot: "activa1", habilidad: { id: "corte_runa", nombre: "Corte poderoso", descripcion: "Un golpe físico con energía y maná.", tipo: "activa", rareza: "comun", precio: 0, costeEnergia: 18, costeMana: 12, cooldownTurnos: 3 } },
  { id: "r2", habilidadId: "guardia_caballero", slot: "activa2", habilidad: { id: "guardia_caballero", nombre: "Guardia arcana", descripcion: "Protección mágica en recuperación.", tipo: "activa", rareza: "comun", precio: 0, costeMana: 10, cooldownTurnos: 3 } },
];
const base: CombatePve = {
  id: "revision-local", version: 1, expedicionId: "revision-local", fase: "activo", ronda: 3, turno: "jugador", tipo: "normal",
  jugadorHp: 840, jugadorHpMaximo: 1080, jugadorAtaque: 80, jugadorDefensa: 40, jugadorVelocidad: 40, jugadorProbCritico: 0.1, jugadorDanoCritico: 150, jugadorNivel: 20,
  enemigoHp: 400, enemigoHpMaximo: 500, enemigoAtaque: 60, enemigoDefensa: 30, enemigoVelocidad: 30, enemigoProbCritico: 0.1, enemigoDanoCritico: 150, enemigoNivel: 20,
  oroGanado: 0, experienciaGanada: 0, cooldowns: { guardia_caballero: 2 }, efectos: [], log: ["El grupo entra en el claro.", "El enemigo prepara su ataque.", "Aldric está listo para actuar."], creado: "2026-10-26T00:00:00Z", actualizado: "2026-10-26T00:00:00Z",
};
const sinAccion = async () => null;
const participantes: NonNullable<ComponentProps<typeof CombateModal>["partyMode"]>["participantes"] = ["cruzado", "mago", "espadachin", "acolito"].map((clase, i) => ({
  id: `p${i}`, usuarioId: `u${i}`, nombre: ["Aldric", "Lyra", "Rowan", "Elara"][i], clase, profesionActivaId: clase, sexo: i % 2 ? "chica" : "chico", esLider: i === 0, ordenTurno: i, estado: "activo", jugadorPosicion: i < 2 ? "mele" : "retaguardia",
  jugadorHp: 500, jugadorHpMaximo: 700, jugadorAtaque: 80, jugadorAtaqueMagico: 60, jugadorDefensa: 40, jugadorDefensaMagica: 35, jugadorVelocidad: 40, jugadorProbCritico: 0.1, jugadorDanoCritico: 150, jugadorPrecision: 95, jugadorEvasion: 0.1, jugadorNivel: 20,
  jugadorEnergiaActual: 64, jugadorEnergiaMaxima: 100, jugadorManaActual: 48, jugadorManaMaximo: 80,
}));

export default function Revision() {
  const [modo, setModo] = useState<string | null>(null);
  const ids = modo === "party humanoides" ? ["ghoul_cripta", "bandido_camino", "goblin_explorador"] : [modo?.includes("boss") ? "dragon_bosque_verde" : "orco_despiadado"];
  const enemigos = crearEnemigosEnCombate(ids.map(id => obtenerEnemigoPorId(id)!), "normal");
  const combate = { ...base, enemigos, enemigoId: enemigos[0].enemigoId, enemigoNombre: enemigos[0].nombre };
  const asedio: CombateActivo = { ...base, tipo: "asedio", turno: modo === "defensor" ? "defensor" : "atacante", botinResuelto: false, cooldownsDefensor: { guardia_caballero: 1 }, efectosDefensor: [], ultimoTurnoEn: base.creado, atacanteNombre: "Aldric", defensorNombre: "Rival", atacanteClase: "cruzado", defensorClase: "espadachin", atacanteSexo: "chico", defensorSexo: "chico" };
  return <main style={{ padding: 24 }}><h1>Revisión local del combate real</h1><p>Datos de prueba. Las acciones no modifican partidas. Recarga esta página para cambiar de escenario.</p>
    {["solo", "party", "party humanoides", "solo boss", "party boss", "atacante", "defensor"].map(m => <button key={m} style={{ margin: 8, padding: 12, border: "1px solid" }} onClick={() => setModo(m)}>{m}</button>)}
    {modo && (modo === "atacante" || modo === "defensor" ? <AsedioModal combate={asedio} personaje={personaje} esAtacante={modo === "atacante"} habilidadesIniciales={habilidades} onAccionCombate={sinAccion} onCerrar={() => setModo(null)} /> : <CombateModal combate={combate} personaje={personaje} habilidadesIniciales={habilidades} onAccionCombate={sinAccion} onCerrar={() => setModo(null)} partyMode={modo.startsWith("party") ? { usuarioId: "u0", nombreExpedicion: "Revisión de formación", faseTurno: "jugador", turnoActualUsuarioId: "u0", estadoJugador: "activo", participantes: modo === "party humanoides" ? [{ ...participantes[2], usuarioId: "u0", esLider: true, jugadorPosicion: "mele" }, { ...participantes[1], jugadorPosicion: "centro" }] : participantes, ultimaAccion: null, onAccionParty: sinAccion } : undefined} />)}
  </main>;
}
