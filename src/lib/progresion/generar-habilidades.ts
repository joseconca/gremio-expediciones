import type { DefinicionHabilidad } from "../tiposJuego";
import { ESCUELAS, TECNICAS_AVANZADAS } from "../catalogos/habilidades";

/** Generador de técnicas estándar, sin definiciones editables duplicadas. */
export const HABILIDADES_NUEVAS: DefinicionHabilidad[] = ESCUELAS.flatMap(({ claseId, costes, ataque, tactica, pasiva }) => {
  const magia = ["escriba_arcano", "bardo", "alquimista", "runista", "abjurador", "inquisidor", "arconte"].includes(claseId);
  const base = { claseId, rareza: "basico" as const, precio: 0, costePuntosHabilidad: 1 };
  return [
    { ...base, id: `${claseId}_ataque`, nivelJobRequerido: 1, tipo: "activa" as const, efecto: "dano" as const, tipoDano: "fisico" as const, animacion: "ofensiva" as const, multiplicadorDano: 1.4, cooldownTurnos: 3, ...ataque, costeEnergia: costes[0][0], costeMana: costes[0][1] },
    { ...base, id: `${claseId}_tactica`, nivelJobRequerido: 15, tipo: "activa" as const, efecto: "estado" as const, animacion: "defensiva" as const, objetivo: { equipo: "propio" as const, patron: "individual" as const }, cooldownTurnos: 4, ...tactica, costeEnergia: costes[1][0], costeMana: costes[1][1] },
    { ...base, id: `${claseId}_pasiva`, nivelJobRequerido: 25, tipo: "pasiva" as const, ...pasiva },
    { ...base, id: `${claseId}_avanzada`, nivelJobRequerido: 30, tipo: "activa" as const, efecto: "dano" as const, tipoDano: "fisico" as const, animacion: TECNICAS_AVANZADAS[claseId].efecto === "estado" ? "defensiva" as const : TECNICAS_AVANZADAS[claseId].efecto === "curacion_progresiva" ? "curacion" as const : "ofensiva_potenciada" as const, multiplicadorDano: 1.65, cooldownTurnos: 5, ...TECNICAS_AVANZADAS[claseId], costeEnergia: costes[2][0], costeMana: costes[2][1] },
    { ...base, id: `${claseId}_maestria`, nombre: magia ? "Reserva disciplinada" : "Precisión disciplinada", descripcion: magia ? "Aumenta el Maná máximo en 15." : "Aumenta la precisión en 5.", nivelJobRequerido: 40, tipo: "pasiva" as const, ...(magia ? { bonusManaMaximo: 15 } : { bonusPrecision: 5 }) },
  ];
});
