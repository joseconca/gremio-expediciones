import type { DefinicionHabilidad } from "../tiposJuego";
import type { ElementoTactico } from "../expediciones/motor-tactico";
import type { CondicionPasiva, VentajaPasiva } from "../progresion/diseno-habilidades";
import { habilidad } from "../progresion/crear-habilidad";
import type { DisenoActiva, DisenoClase, OperacionHabilidad, ReglaPasiva } from "../progresion/diseno-habilidades";

/** ÚNICO CATÁLOGO EDITABLE DE HABILIDADES: datos originales, escuelas y diseños v2.
 * Los motores y adaptadores de compatibilidad no contienen definiciones.
 * El orden de las habilidades es parte del contrato: no modificarlo sin pruebas.
 */

// Escuelas, especializaciones y técnicas.
type Tecnica = Pick<DefinicionHabilidad, "nombre" | "descripcion"> & Partial<DefinicionHabilidad>;
type CosteTecnica = readonly [energia: number, mana: number];

interface Escuela {
  claseId: string;
  /** Costes finales: ataque, táctica y avanzada. Sin multiplicadores globales. */
  costes: readonly [CosteTecnica, CosteTecnica, CosteTecnica];
  ataque: Tecnica;
  tactica: Tecnica;
  pasiva: Tecnica;
}
const aliado = { equipo: "aliado", patron: "individual", incluirPropio: true } as const;
const grupo = { equipo: "aliado", patron: "todos", incluirPropio: true } as const;
const fila = { equipo: "enemigo", patron: "fila" } as const;
const area = { equipo: "enemigo", patron: "todos" } as const;

/** Catálogo inicial jugable; fabricación y transmutación no forman parte de esta entrega. */
export const ESCUELAS: Escuela[] = [
  { claseId: "berserker", costes: [[35, 0], [30, 0], [55, 0]], ataque: { nombre: "Hachazo sangrante", descripcion: "Golpea y causa sangrado durante dos turnos.", danoProgresivoPorcentaje: 0.12, duracionTurnos: 2 }, tactica: { nombre: "Furia desatada", descripcion: "Aumenta tu ataque un 20 % y reduce tu defensa un 10 % durante tres turnos.", estadosSecundarios: [{ tipo: "bonus_ataque", valor: 0.2, duracionTurnos: 3, objetivo: "jugador" }, { tipo: "debuff_defensa", valor: 0.1, duracionTurnos: 3, objetivo: "jugador" }] }, pasiva: { nombre: "Corazón indómito", descripcion: "Aumenta la vida máxima en 15.", bonusHpMaximo: 15 } },
  { claseId: "luchador", costes: [[35, 0], [25, 0], [45, 0]], ataque: { nombre: "Puño firme", descripcion: "Un golpe preciso que recupera 10 de energía.", recuperarEnergia: 10 }, tactica: { nombre: "Guardia del luchador", descripcion: "Mejora tu evasión un 10 % durante tres turnos.", estadosSecundarios: [{ tipo: "bonus_evasion", valor: 0.1, duracionTurnos: 3, objetivo: "jugador" }] }, pasiva: { nombre: "Fondo físico", descripcion: "Aumenta la energía máxima en 10.", bonusEnergiaMaxima: 10 } },
  { claseId: "centinela", costes: [[35, 0], [30, 0], [50, 0]], ataque: { nombre: "Empuje de frontera", descripcion: "Golpea y reduce el ataque rival un 10 % durante dos turnos.", estadosSecundarios: [{ tipo: "debuff_ataque", valor: 0.1, duracionTurnos: 2, objetivo: "enemigo" }] }, tactica: { nombre: "Cubrir la frontera", descripcion: "Aumenta la defensa de un aliado un 15 % durante tres turnos.", efecto: "bonus_defensa", bonusDefensaPorcentaje: 0.15, duracionTurnos: 3, objetivo: aliado }, pasiva: { nombre: "Vigilancia", descripcion: "Aumenta la precisión en 5.", bonusPrecision: 5 } },
  { claseId: "escriba_arcano", costes: [[0, 14], [0, 12], [0, 18]], ataque: { nombre: "Sello debilitante", descripcion: "Inflige daño mágico y reduce el ataque rival un 10 % durante dos turnos.", tipoDano: "magico", estadosSecundarios: [{ tipo: "debuff_ataque", valor: 0.1, duracionTurnos: 2, objetivo: "enemigo" }] }, tactica: { nombre: "Glifo de concentración", descripcion: "Mejora el ataque mágico de un aliado un 12 % durante tres turnos.", objetivo: aliado, estadosSecundarios: [{ tipo: "bonus_ataque_magico", valor: 0.12, duracionTurnos: 3, objetivo: "jugador" }] }, pasiva: { nombre: "Lectura profunda", descripcion: "Aumenta el Maná máximo en 12.", bonusManaMaximo: 12 } },
  { claseId: "bardo", costes: [[0, 14], [0, 22], [0, 28]], ataque: { nombre: "Nota discordante", descripcion: "Inflige daño mágico y reduce la precisión rival en 8 durante dos turnos.", tipoDano: "magico", estadosSecundarios: [{ tipo: "debuff_precision", valor: 8, duracionTurnos: 2, objetivo: "enemigo" }] }, tactica: { nombre: "Compás de marcha", descripcion: "Aumenta la precisión en 6 y la evasión un 6 % de todos los aliados durante tres turnos.", objetivo: grupo, estadosSecundarios: [{ tipo: "bonus_precision", valor: 6, duracionTurnos: 3, objetivo: "jugador" }, { tipo: "bonus_evasion", valor: 0.06, duracionTurnos: 3, objetivo: "jugador" }] }, pasiva: { nombre: "Respiración del cantor", descripcion: "Aumenta la regeneración de Maná en 1.", bonusRegeneracionMana: 1 } },
  { claseId: "comerciante", costes: [[30, 0], [35, 0], [40, 0]], ataque: { nombre: "Golpe de oportunidad", descripcion: "Un golpe físico con un 10 % adicional de probabilidad crítica.", probabilidadCritico: 0.1 }, tactica: { nombre: "Suministros de viaje", descripcion: "Recupera un 15 % de la vida máxima de un aliado.", efecto: "curacion", curacionPorcentaje: 0.15, objetivo: aliado }, pasiva: { nombre: "Preparación del mercader", descripcion: "Aumenta la vida máxima en 12.", bonusHpMaximo: 12 } },
  { claseId: "chaman", costes: [[30, 10], [30, 14], [40, 18]], ataque: { nombre: "Hacha de tormenta", descripcion: "Combina fuerza y magia e inflige daño progresivo durante dos turnos.", tipoDano: "hibrido", danoProgresivoPorcentaje: 0.15, duracionTurnos: 2 }, tactica: { nombre: "Bendición tribal", descripcion: "Mejora el ataque de los aliados un 12 % durante tres turnos.", objetivo: grupo, estadosSecundarios: [{ tipo: "bonus_ataque", valor: 0.12, duracionTurnos: 3, objetivo: "jugador" }] }, pasiva: { nombre: "Vigor ancestral", descripcion: "Aumenta el ataque físico y mágico en 2.", bonusAtaque: 2, bonusAtaqueMagico: 2 } },
  { claseId: "inquisidor", costes: [[0, 16], [0, 16], [0, 22]], ataque: { nombre: "Juicio penitente", descripcion: "Inflige daño mágico y recupera un 20 % del daño causado.", tipoDano: "magico", roboVida: 0.2 }, tactica: { nombre: "Absolución", descripcion: "Cura un 12 % de vida a un aliado y elimina sus perjuicios.", efecto: "curacion", curacionPorcentaje: 0.12, limpiarEstadosNegativos: true, objetivo: aliado }, pasiva: { nombre: "Voluntad inquisitorial", descripcion: "Aumenta la defensa mágica en 5.", bonusDefensaMagica: 5 } },
  { claseId: "heraldo_guerra", costes: [[25, 8], [35, 16], [30, 18]], ataque: { nombre: "Golpe de mando", descripcion: "Un golpe físico que reduce la defensa rival un 12 % durante dos turnos.", estadosSecundarios: [{ tipo: "debuff_defensa", valor: 0.12, duracionTurnos: 2, objetivo: "enemigo" }] }, tactica: { nombre: "Grito de avance", descripcion: "Mejora ataque y defensa de todos los aliados un 15 % durante dos turnos.", objetivo: grupo, cooldownTurnos: 5, estadosSecundarios: [{ tipo: "bonus_ataque", valor: 0.15, duracionTurnos: 2, objetivo: "jugador" }, { tipo: "bonus_defensa", valor: 0.15, duracionTurnos: 2, objetivo: "jugador" }] }, pasiva: { nombre: "Autoridad", descripcion: "Aumenta la energía máxima en 12.", bonusEnergiaMaxima: 12 } },
  { claseId: "ninja", costes: [[35, 4], [25, 3], [45, 7]], ataque: { nombre: "Corte de sombra", descripcion: "Un ataque híbrido que causa daño progresivo durante dos turnos.", tipoDano: "hibrido", danoProgresivoPorcentaje: 0.12, duracionTurnos: 2 }, tactica: { nombre: "Velo de humo", descripcion: "Mejora tu evasión un 18 % durante dos turnos.", estadosSecundarios: [{ tipo: "bonus_evasion", valor: 0.18, duracionTurnos: 2, objetivo: "jugador" }] }, pasiva: { nombre: "Paso silencioso", descripcion: "Aumenta la velocidad en 3.", bonusVelocidad: 3 } },
  { claseId: "alquimista", costes: [[0, 16], [0, 18], [0, 30]], ataque: { nombre: "Preparado corrosivo", descripcion: "Inflige daño mágico y reduce la defensa rival un 15 % durante dos turnos.", tipoDano: "magico", estadosSecundarios: [{ tipo: "debuff_defensa", valor: 0.15, duracionTurnos: 2, objetivo: "enemigo" }] }, tactica: { nombre: "Elixir revitalizante", descripcion: "Cura un 20 % de la vida máxima de un aliado.", efecto: "curacion", curacionPorcentaje: 0.2, objetivo: aliado }, pasiva: { nombre: "Dosificación", descripcion: "Aumenta la curación un 8 %.", bonusCuracion: 0.08 } },
  { claseId: "herrero", costes: [[35, 0], [35, 0], [55, 0]], ataque: { nombre: "Golpe de forja", descripcion: "Un golpe físico que reduce la defensa rival un 15 % durante dos turnos.", estadosSecundarios: [{ tipo: "debuff_defensa", valor: 0.15, duracionTurnos: 2, objetivo: "enemigo" }] }, tactica: { nombre: "Refuerzo de campaña", descripcion: "Mejora ataque y defensa de un aliado un 15 % durante tres turnos.", objetivo: aliado, estadosSecundarios: [{ tipo: "bonus_ataque", valor: 0.15, duracionTurnos: 3, objetivo: "jugador" }, { tipo: "bonus_defensa", valor: 0.15, duracionTurnos: 3, objetivo: "jugador" }] }, pasiva: { nombre: "Temple del acero", descripcion: "Aumenta la defensa en 5.", bonusDefensa: 5 } },
  { claseId: "verdugo", costes: [[40, 0], [30, 0], [45, 0]], ataque: { nombre: "Hacha quebrantadora", descripcion: "Un golpe pesado que reduce la defensa rival un 20 % durante dos turnos.", multiplicadorDano: 1.65, estadosSecundarios: [{ tipo: "debuff_defensa", valor: 0.2, duracionTurnos: 2, objetivo: "enemigo" }] }, tactica: { nombre: "Preparar ejecución", descripcion: "Mejora tu ataque un 22 % durante dos turnos.", estadosSecundarios: [{ tipo: "bonus_ataque", valor: 0.22, duracionTurnos: 2, objetivo: "jugador" }] }, pasiva: { nombre: "Fuerza implacable", descripcion: "Aumenta el ataque en 5.", bonusAtaque: 5 } },
  { claseId: "saqueador", costes: [[40, 0], [25, 0], [55, 0]], ataque: { nombre: "Desgarro voraz", descripcion: "Causa sangrado y recupera un 18 % del daño directo.", roboVida: 0.18, danoProgresivoPorcentaje: 0.15, duracionTurnos: 2 }, tactica: { nombre: "Paso de saqueo", descripcion: "Mejora tu evasión un 12 % durante tres turnos.", estadosSecundarios: [{ tipo: "bonus_evasion", valor: 0.12, duracionTurnos: 3, objetivo: "jugador" }] }, pasiva: { nombre: "Instinto rapaz", descripcion: "Aumenta la probabilidad crítica en 5 puntos.", probabilidadCritico: 0.05 } },
  { claseId: "campeon_arena", costes: [[40, 0], [35, 0], [55, 0]], ataque: { nombre: "Puño del campeón", descripcion: "Un golpe contundente que recupera 10 de energía.", recuperarEnergia: 10 }, tactica: { nombre: "Segundo aliento", descripcion: "Recupera un 18 % de vida y 15 de energía.", efecto: "curacion", curacionPorcentaje: 0.18, recuperarEnergia: 15 }, pasiva: { nombre: "Resistencia de arena", descripcion: "Aumenta la vida máxima en 22.", bonusHpMaximo: 22 } },
  { claseId: "mariscal", costes: [[50, 0], [45, 0], [45, 0]], ataque: { nombre: "Lanza de contención", descripcion: "Golpea una fila y reduce su ataque un 10 % durante dos turnos.", objetivo: fila, multiplicadorDano: 1.05, estadosSecundarios: [{ tipo: "debuff_ataque", valor: 0.1, duracionTurnos: 2, objetivo: "enemigo" }] }, tactica: { nombre: "Formación defensiva", descripcion: "Aumenta la defensa de todos los aliados un 15 % durante tres turnos.", efecto: "bonus_defensa", bonusDefensaPorcentaje: 0.15, duracionTurnos: 3, objetivo: grupo }, pasiva: { nombre: "Disciplina de mando", descripcion: "Aumenta la defensa en 5.", bonusDefensa: 5 } },
  { claseId: "vigia", costes: [[35, 0], [30, 0], [50, 0]], ataque: { nombre: "Disparo de vigilancia", descripcion: "Disparo que reduce la precisión rival en 12 durante dos turnos.", estadosSecundarios: [{ tipo: "debuff_precision", valor: 12, duracionTurnos: 2, objetivo: "enemigo" }] }, tactica: { nombre: "Posición ventajosa", descripcion: "Mejora tu precisión en 10 y evasión un 8 % durante tres turnos.", estadosSecundarios: [{ tipo: "bonus_precision", valor: 10, duracionTurnos: 3, objetivo: "jugador" }, { tipo: "bonus_evasion", valor: 0.08, duracionTurnos: 3, objetivo: "jugador" }] }, pasiva: { nombre: "Ojo de frontera", descripcion: "Aumenta la precisión en 7.", bonusPrecision: 7 } },
  { claseId: "runista", costes: [[0, 18], [0, 16], [0, 34]], ataque: { nombre: "Sello abrasador", descripcion: "Inflige daño mágico y daño progresivo durante tres turnos.", tipoDano: "magico", danoProgresivoPorcentaje: 0.16, duracionTurnos: 3 }, tactica: { nombre: "Inscripción de poder", descripcion: "Mejora el ataque mágico de un aliado un 18 % durante tres turnos.", objetivo: aliado, estadosSecundarios: [{ tipo: "bonus_ataque_magico", valor: 0.18, duracionTurnos: 3, objetivo: "jugador" }] }, pasiva: { nombre: "Tinta arcana", descripcion: "Aumenta el ataque mágico en 5.", bonusAtaqueMagico: 5 } },
  { claseId: "abjurador", costes: [[0, 16], [0, 20], [0, 26]], ataque: { nombre: "Pulso de rechazo", descripcion: "Inflige daño mágico y reduce el ataque rival un 12 % durante dos turnos.", tipoDano: "magico", estadosSecundarios: [{ tipo: "debuff_ataque", valor: 0.12, duracionTurnos: 2, objetivo: "enemigo" }] }, tactica: { nombre: "Barrera de negación", descripcion: "Un aliado bloquea el siguiente ataque directo durante dos turnos. No acumula cargas.", objetivo: aliado, cooldownTurnos: 6, estadosSecundarios: [{ tipo: "barrera", valor: 1, duracionTurnos: 2, objetivo: "jugador" }] }, pasiva: { nombre: "Conocimiento protector", descripcion: "Aumenta la defensa mágica en 6.", bonusDefensaMagica: 6 } },
  { claseId: "senor_guerra", costes: [[50, 0], [50, 0], [45, 0]], ataque: { nombre: "Ruptura de línea", descripcion: "Golpea una fila y reduce su defensa un 15 % durante dos turnos.", objetivo: fila, multiplicadorDano: 1.2, estadosSecundarios: [{ tipo: "debuff_defensa", valor: 0.15, duracionTurnos: 2, objetivo: "enemigo" }] }, tactica: { nombre: "Orden de conquista", descripcion: "Mejora ataque y defensa del grupo un 15 % durante dos turnos.", objetivo: grupo, estadosSecundarios: [{ tipo: "bonus_ataque", valor: 0.15, duracionTurnos: 2, objetivo: "jugador" }, { tipo: "bonus_defensa", valor: 0.15, duracionTurnos: 2, objetivo: "jugador" }] }, pasiva: { nombre: "Presencia del caudillo", descripcion: "Aumenta la vida máxima en 25.", bonusHpMaximo: 25 } },
  { claseId: "avatar_tormenta", costes: [[45, 22], [25, 12], [40, 18]], ataque: { nombre: "Puño de la tormenta", descripcion: "Golpea a todos los enemigos con daño híbrido.", tipoDano: "hibrido", objetivo: area, multiplicadorDano: 1.05, cooldownTurnos: 5 }, tactica: { nombre: "Canalizar la tempestad", descripcion: "Mejora tu ataque físico y mágico un 15 % durante tres turnos.", estadosSecundarios: [{ tipo: "bonus_ataque", valor: 0.15, duracionTurnos: 3, objetivo: "jugador" }, { tipo: "bonus_ataque_magico", valor: 0.15, duracionTurnos: 3, objetivo: "jugador" }] }, pasiva: { nombre: "Equilibrio elemental", descripcion: "Aumenta el ataque físico y mágico en 3.", bonusAtaque: 3, bonusAtaqueMagico: 3 } },
  { claseId: "cazador_espectral", costes: [[35, 4], [30, 3], [45, 7]], ataque: { nombre: "Flecha espectral", descripcion: "Un disparo con escalado físico y daño mágico que drena un 20 % del daño.", tipoDano: "magico", escaladoDano: "fisico", roboVida: 0.2, presentacionVisual: { modo: "proyectil", proyectil: "flecha", elemento: "sombras", impacto: "destello" } }, tactica: { nombre: "Acecho funerario", descripcion: "Mejora tu ataque un 18 % y evasión un 8 % durante dos turnos.", estadosSecundarios: [{ tipo: "bonus_ataque", valor: 0.18, duracionTurnos: 2, objetivo: "jugador" }, { tipo: "bonus_evasion", valor: 0.08, duracionTurnos: 2, objetivo: "jugador" }] }, pasiva: { nombre: "Ojo del más allá", descripcion: "Aumenta la precisión en 8.", bonusPrecision: 8 } },
  { claseId: "arconte", costes: [[0, 26], [0, 34], [0, 28]], ataque: { nombre: "Convergencia sagrada", descripcion: "Inflige daño mágico a una fila enemiga.", tipoDano: "magico", objetivo: fila, multiplicadorDano: 1.2 }, tactica: { nombre: "Luz del arconte", descripcion: "Cura un 15 % de vida a todos los aliados y elimina sus perjuicios.", efecto: "curacion", curacionPorcentaje: 0.15, limpiarEstadosNegativos: true, objetivo: grupo, cooldownTurnos: 6, costeMana: 16 }, pasiva: { nombre: "Gracia arcana", descripcion: "Mejora la curación un 10 % y el ataque mágico en 3.", bonusCuracion: 0.1, bonusAtaqueMagico: 3 } },
  { claseId: "justiciero", costes: [[30, 10], [25, 12], [40, 18]], ataque: { nombre: "Puño de justicia", descripcion: "Inflige daño híbrido y recupera un 20 % del daño causado.", tipoDano: "hibrido", roboVida: 0.2 }, tactica: { nombre: "Amparo del justo", descripcion: "Cura un 18 % de vida a un aliado y mejora su defensa un 12 % durante dos turnos.", efecto: "curacion", curacionPorcentaje: 0.18, objetivo: aliado, estadosSecundarios: [{ tipo: "bonus_defensa", valor: 0.12, duracionTurnos: 2, objetivo: "jugador" }] }, pasiva: { nombre: "Convicción", descripcion: "Aumenta la defensa física y mágica en 3.", bonusDefensa: 3, bonusDefensaMagica: 3 } },
  { claseId: "hoja_velo", costes: [[35, 4], [30, 3], [45, 7]], ataque: { nombre: "Corte del velo", descripcion: "Usa el ataque físico para infligir daño mágico y una herida espectral durante dos turnos.", tipoDano: "magico", escaladoDano: "fisico", danoProgresivoPorcentaje: 0.12, duracionTurnos: 2, presentacionVisual: { modo: "cuerpo_a_cuerpo", elemento: "arcano", impacto: "destello" } }, tactica: { nombre: "Filo entre mundos", descripcion: "Mejora tu ataque físico un 20 % durante tres turnos.", estadosSecundarios: [{ tipo: "bonus_ataque", valor: 0.2, duracionTurnos: 3, objetivo: "jugador" }] }, pasiva: { nombre: "Acero del velo", descripcion: "Aumenta el ataque físico en 6.", bonusAtaque: 6 } },
  { claseId: "danzaespadas", costes: [[40, 5], [35, 5], [40, 5]], ataque: { nombre: "Danza cortante", descripcion: "Golpea una fila con un 10 % adicional de probabilidad crítica.", objetivo: fila, multiplicadorDano: 1.1, probabilidadCritico: 0.1 }, tactica: { nombre: "Danza de la victoria", descripcion: "Mejora el ataque del grupo un 12 % y su evasión un 6 % durante tres turnos.", objetivo: grupo, estadosSecundarios: [{ tipo: "bonus_ataque", valor: 0.12, duracionTurnos: 3, objetivo: "jugador" }, { tipo: "bonus_evasion", valor: 0.06, duracionTurnos: 3, objetivo: "jugador" }] }, pasiva: { nombre: "Gracia del acero", descripcion: "Aumenta la evasión un 5 %.", bonusEvasion: 0.05 } },
  { claseId: "corsario", costes: [[40, 0], [25, 0], [55, 0]], ataque: { nombre: "Abordaje", descripcion: "Golpea y reduce defensa un 12 % y precisión en 8 durante dos turnos.", estadosSecundarios: [{ tipo: "debuff_defensa", valor: 0.12, duracionTurnos: 2, objetivo: "enemigo" }, { tipo: "debuff_precision", valor: 8, duracionTurnos: 2, objetivo: "enemigo" }] }, tactica: { nombre: "Maniobra de escape", descripcion: "Mejora tu evasión un 15 % durante tres turnos.", estadosSecundarios: [{ tipo: "bonus_evasion", valor: 0.15, duracionTurnos: 3, objetivo: "jugador" }] }, pasiva: { nombre: "Veterano del abordaje", descripcion: "Aumenta el ataque en 4 y la velocidad en 2.", bonusAtaque: 4, bonusVelocidad: 2 } },
];

export const TECNICAS_AVANZADAS: Record<string, Tecnica> = {
  berserker: { nombre: "Hacha desbocada", descripcion: "Golpea una fila a cambio de reducir tu defensa un 12 % durante dos turnos.", objetivo: fila, multiplicadorDano: 1.1, estadosSecundarios: [{ tipo: "debuff_defensa", valor: 0.12, duracionTurnos: 2, objetivo: "jugador" }] },
  luchador: { nombre: "Golpe al centro", descripcion: "Reduce el ataque enemigo un 15 % durante dos turnos.", estadosSecundarios: [{ tipo: "debuff_ataque", valor: 0.15, duracionTurnos: 2, objetivo: "enemigo" }] },
  centinela: { nombre: "Barrido de frontera", descripcion: "Golpea una fila enemiga.", objetivo: fila, multiplicadorDano: 1.05 },
  escriba_arcano: { nombre: "Inscripción abrasiva", descripcion: "Inflige daño mágico progresivo durante tres turnos.", tipoDano: "magico", multiplicadorDano: 1.1, danoProgresivoPorcentaje: 0.12, duracionTurnos: 3 },
  bardo: { nombre: "Balada reparadora", descripcion: "Todos los aliados recuperan un 5 % de vida por turno durante tres turnos.", efecto: "curacion_progresiva", objetivo: grupo, curacionProgresivaPorcentaje: 0.05, duracionTurnos: 3, multiplicadorDano: undefined },
  comerciante: { nombre: "Distraer al bandido", descripcion: "Golpea y reduce la precisión rival en 10 durante tres turnos.", estadosSecundarios: [{ tipo: "debuff_precision", valor: 10, duracionTurnos: 3, objetivo: "enemigo" }] },
  chaman: { nombre: "Maldición de cenizas", descripcion: "Inflige daño híbrido a una fila y causa desgaste durante dos turnos.", tipoDano: "hibrido", objetivo: fila, multiplicadorDano: 0.95, danoProgresivoPorcentaje: 0.1, duracionTurnos: 2 },
  inquisidor: { nombre: "Sentencia del inquisidor", descripcion: "Inflige daño mágico y reduce el ataque rival un 15 % durante dos turnos.", tipoDano: "magico", estadosSecundarios: [{ tipo: "debuff_ataque", valor: 0.15, duracionTurnos: 2, objetivo: "enemigo" }] },
  heraldo_guerra: { nombre: "Sello de concentración", descripcion: "Mejora el ataque mágico del grupo un 15 % durante dos turnos.", efecto: "estado", objetivo: grupo, multiplicadorDano: undefined, estadosSecundarios: [{ tipo: "bonus_ataque_magico", valor: 0.15, duracionTurnos: 2, objetivo: "jugador" }] },
  ninja: { nombre: "Arte de las brasas", descripcion: "Inflige daño mágico a una fila y reduce su precisión en 8 durante dos turnos.", tipoDano: "magico", objetivo: fila, multiplicadorDano: 1, estadosSecundarios: [{ tipo: "debuff_precision", valor: 8, duracionTurnos: 2, objetivo: "enemigo" }] },
  alquimista: { nombre: "Reactivo volátil", descripcion: "Inflige daño mágico a todos los enemigos.", tipoDano: "magico", objetivo: area, multiplicadorDano: 0.95 },
  herrero: { nombre: "Martillo quebrantador", descripcion: "Golpea una fila y reduce su ataque un 10 % durante dos turnos.", objetivo: fila, multiplicadorDano: 1, estadosSecundarios: [{ tipo: "debuff_ataque", valor: 0.1, duracionTurnos: 2, objetivo: "enemigo" }] },
  verdugo: { nombre: "Ejecución implacable", descripcion: "Un golpe físico de gran potencia.", multiplicadorDano: 1.95 },
  saqueador: { nombre: "Cosecha voraz", descripcion: "Un ataque potente que recupera un 25 % del daño causado.", multiplicadorDano: 1.6, roboVida: 0.25 },
  campeon_arena: { nombre: "Romper el cerco", descripcion: "Golpea una fila y recupera 3 de energía.", objetivo: fila, multiplicadorDano: 1.1, recuperarEnergia: 3 },
  mariscal: { nombre: "Estocada de mando", descripcion: "Golpea y reduce la defensa rival un 20 % durante dos turnos.", multiplicadorDano: 1.6, estadosSecundarios: [{ tipo: "debuff_defensa", valor: 0.2, duracionTurnos: 2, objetivo: "enemigo" }] },
  vigia: { nombre: "Salva de frontera", descripcion: "Dispara a una fila enemiga.", objetivo: fila, multiplicadorDano: 1.2 },
  runista: { nombre: "Círculo de ruptura", descripcion: "Inflige daño mágico a todos los enemigos.", tipoDano: "magico", objetivo: area, multiplicadorDano: 1.05 },
  abjurador: { nombre: "Disipación hostil", descripcion: "Inflige daño mágico a una fila y reduce su ataque un 12 % durante dos turnos.", tipoDano: "magico", objetivo: fila, multiplicadorDano: 1, estadosSecundarios: [{ tipo: "debuff_ataque", valor: 0.12, duracionTurnos: 2, objetivo: "enemigo" }] },
  senor_guerra: { nombre: "Asalto del caudillo", descripcion: "Un golpe físico devastador.", multiplicadorDano: 2 },
  avatar_tormenta: { nombre: "Convergencia del trueno", descripcion: "Concentra fuerza y magia en un objetivo.", tipoDano: "hibrido", multiplicadorDano: 1.95 },
  cazador_espectral: { nombre: "Lluvia de ánimas", descripcion: "Dispara a una fila con daño mágico de escalado físico y desgaste durante dos turnos.", tipoDano: "magico", escaladoDano: "fisico", objetivo: fila, multiplicadorDano: 1.1, danoProgresivoPorcentaje: 0.1, duracionTurnos: 2, presentacionVisual: { modo: "proyectil", proyectil: "flecha", elemento: "sombras", impacto: "destello" } },
  arconte: { nombre: "Mandato celestial", descripcion: "Mejora el ataque mágico de todos los aliados un 20 % durante tres turnos.", efecto: "estado", objetivo: grupo, multiplicadorDano: undefined, estadosSecundarios: [{ tipo: "bonus_ataque_magico", valor: 0.2, duracionTurnos: 3, objetivo: "jugador" }] },
  justiciero: { nombre: "Veredicto sagrado", descripcion: "Inflige daño híbrido a una fila enemiga.", tipoDano: "hibrido", objetivo: fila, multiplicadorDano: 1.25 },
  hoja_velo: { nombre: "Ruptura entre mundos", descripcion: "Usa el ataque físico para infligir daño mágico a una fila.", tipoDano: "magico", escaladoDano: "fisico", objetivo: fila, multiplicadorDano: 1.25, presentacionVisual: { modo: "cuerpo_a_cuerpo", elemento: "arcano", impacto: "destello" } },
  danzaespadas: { nombre: "Último compás", descripcion: "Un ataque físico preciso con un 15 % adicional de probabilidad crítica.", multiplicadorDano: 1.75, probabilidadCritico: 0.15 },
  corsario: { nombre: "Salva de abordaje", descripcion: "Dispara a una fila y reduce su precisión en 10 durante dos turnos.", objetivo: fila, multiplicadorDano: 1.15, estadosSecundarios: [{ tipo: "debuff_precision", valor: 10, duracionTurnos: 2, objetivo: "enemigo" }] },
};


// Habilidades troncales.
export const HABILIDADES_TRONCALES: DefinicionHabilidad[] = [
  // NOVATO
  habilidad({
    id: "golpe_apresurado", claseId: "novato", nivelJobRequerido: 1,
    nombre: "Golpe apresurado", descripcion: "Un ataque sencillo y fiable.",
    tipo: "activa", efecto: "dano", animacion: "ofensiva", multiplicadorDano: 1.2,
    costeEnergia: 25, cooldownTurnos: 2,
  }),
  habilidad({
    id: "primeros_auxilios", claseId: "novato", nivelJobRequerido: 3,
    nombre: "Primeros Auxilios", descripcion: "Cura un 15 % de la vida máxima y un 15 % adicional repartido en los dos turnos siguientes.",
    tipo: "activa", efecto: "curacion", animacion: "curacion", curacionPorcentaje: 0.15,
    duracionTurnos: 2,
    estadosSecundarios: [{ tipo: "curacion_progresiva", valor: 0.075, duracionTurnos: 2, objetivo: "jugador" }],
    costeEnergia: 40, cooldownTurnos: 7,
  }),
  habilidad({
    id: "guardia_improvisada", claseId: "novato", nivelJobRequerido: 5,
    nombre: "Guardia improvisada", descripcion: "Aumenta la defensa un 8 % durante 4 turnos.",
    tipo: "activa", efecto: "bonus_defensa", animacion: "defensiva", bonusDefensaPorcentaje: 0.08,
    duracionTurnos: 4, costeEnergia: 25, cooldownTurnos: 4,
  }),
  habilidad({
    id: "aguante_aprendiz", claseId: "novato", nivelJobRequerido: 8,
    nombre: "Aguante de aprendiz", descripcion: "Aumenta la vida máxima en 8 puntos.",
    tipo: "pasiva", bonusHpMaximo: 8,
  }),

  // ESPADACHÍN
  habilidad({
    id: "estocada_espadachin", claseId: "espadachin", nivelJobRequerido: 1,
    nombre: "Estocada", descripcion: "Concentra la fuerza en un golpe físico preciso.",
    tipo: "activa", efecto: "dano", animacion: "ofensiva_potenciada", multiplicadorDano: 1.4,
    costeEnergia: 25, cooldownTurnos: 2,
  }),
  habilidad({
    id: "tajo_sangrante", claseId: "espadachin", nivelJobRequerido: 10,
    nombre: "Tajo sangrante", descripcion: "Inflige daño y provoca sangrado durante 2 turnos.",
    tipo: "activa", efecto: "dano", animacion: "ofensiva_potenciada", multiplicadorDano: 1.05,
    danoProgresivoPorcentaje: 0.25, duracionTurnos: 2, costeEnergia: 35, cooldownTurnos: 3,
  }),
  habilidad({
    id: "rompeguardia", claseId: "espadachin", nivelJobRequerido: 20,
    nombre: "Rompeguardia", descripcion: "Inflige daño y reduce la defensa enemiga un 15 % durante 2 turnos.",
    tipo: "activa", efecto: "dano", animacion: "ofensiva_potenciada", multiplicadorDano: 1.1,
    estadosSecundarios: [{ tipo: "debuff_defensa", valor: 0.15, duracionTurnos: 2, objetivo: "enemigo" }],
    costeEnergia: 40, cooldownTurnos: 4,
  }),
  habilidad({
    id: "tecnica_duelo", claseId: "espadachin", nivelJobRequerido: 20,
    nombre: "Técnica de duelo", descripcion: "Aumenta la probabilidad de crítico en 5 puntos porcentuales.",
    tipo: "pasiva", probabilidadCritico: 0.05,
  }),

  // ACÓLITO
  habilidad({
    id: "luz_acolito", claseId: "acolito", nivelJobRequerido: 1,
    nombre: "Luz sanadora", descripcion: "Restaura un 12 % de la vida máxima.",
    tipo: "activa", efecto: "curacion", animacion: "curacion", curacionPorcentaje: 0.12,
    costeMana: 8, cooldownTurnos: 3,
  }),
  habilidad({
    id: "rejuvenecer", claseId: "acolito", nivelJobRequerido: 10,
    nombre: "Rejuvenecer", descripcion: "Restaura un 8 % de la vida máxima por turno durante 3 turnos.",
    tipo: "activa", efecto: "curacion_progresiva", animacion: "curacion",
    curacionProgresivaPorcentaje: 0.08, duracionTurnos: 3, costeMana: 12, cooldownTurnos: 4,
  }),
  habilidad({
    id: "golpe_consagrado", claseId: "acolito", nivelJobRequerido: 20, tipoDano: "magico",
    nombre: "Golpe consagrado", descripcion: "Inflige daño mágico y restaura un 15 % del daño efectivo como vida.",
    tipo: "activa", efecto: "dano", animacion: "ofensiva_potenciada", multiplicadorDano: 1.25,
    roboVida: 0.15, costeMana: 12, cooldownTurnos: 3,
  }),
  habilidad({
    id: "escudo_fe", claseId: "acolito", nivelJobRequerido: 18,
    nombre: "Escudo de fe", descripcion: "Aumenta la defensa un 12 % durante 2 turnos.",
    tipo: "activa", efecto: "bonus_defensa", animacion: "defensiva", bonusDefensaPorcentaje: 0.12,
    duracionTurnos: 2, costeMana: 8, cooldownTurnos: 4,
  }),
  habilidad({
    id: "plegaria_constante", claseId: "acolito", nivelJobRequerido: 20,
    nombre: "Plegaria constante", descripcion: "Aumenta la regeneración de Maná en 1 punto por turno.",
    tipo: "pasiva", bonusRegeneracionMana: 1,
  }),

  // ARQUERO
  habilidad({
    id: "disparo_arquero",
    presentacionVisual: {"modo":"proyectil","proyectil":"flecha","elemento":"fisico","impacto":"golpe"},
    claseId: "arquero", nivelJobRequerido: 1,
    nombre: "Disparo preciso", descripcion: "Un disparo certero con una bonificación crítica.",
    tipo: "activa", efecto: "dano", animacion: "ofensiva_potenciada", multiplicadorDano: 1.5,
    probabilidadCritico: 0.1, costeEnergia: 25, cooldownTurnos: 2,
  }),
  habilidad({
    id: "flecha_penetrante",
    presentacionVisual: {"modo":"proyectil","proyectil":"flecha","elemento":"fisico","impacto":"golpe"},
    claseId: "arquero", nivelJobRequerido: 10,
    nombre: "Flecha penetrante", descripcion: "Inflige daño y reduce la defensa enemiga un 12 % durante 2 turnos.",
    tipo: "activa", efecto: "dano", animacion: "ofensiva_potenciada", multiplicadorDano: 1.2,
    estadosSecundarios: [{ tipo: "debuff_defensa", valor: 0.12, duracionTurnos: 2, objetivo: "enemigo" }],
    costeEnergia: 35, cooldownTurnos: 3,
  }),
  habilidad({
    id: "tiro_oportunidad",
    presentacionVisual: {"modo":"proyectil","proyectil":"flecha","elemento":"fisico","impacto":"golpe"},
    claseId: "arquero", nivelJobRequerido: 20,
    nombre: "Tiro de oportunidad", descripcion: "Un disparo moderado con un 25 % adicional de probabilidad crítica.",
    tipo: "activa", efecto: "dano", animacion: "ofensiva_potenciada", multiplicadorDano: 1.1,
    probabilidadCritico: 0.25, costeEnergia: 35, cooldownTurnos: 3,
  }),
  habilidad({
    id: "ojo_halcon", claseId: "arquero", nivelJobRequerido: 20,
    nombre: "Ojo de halcón", descripcion: "Aumenta la precisión en 5 puntos.",
    tipo: "pasiva", bonusPrecision: 5,
  }),

  // MAGO
  habilidad({
    id: "chispa_mago",
    presentacionVisual: {"modo":"proyectil","proyectil":"esfera_arcana","elemento":"arcano","impacto":"destello"},
    claseId: "mago", nivelJobRequerido: 1, tipoDano: "magico",
    nombre: "Chispa arcana", descripcion: "Un proyectil mágico de daño directo.",
    tipo: "activa", efecto: "dano", animacion: "ofensiva_potenciada", multiplicadorDano: 1.6,
    costeMana: 10, cooldownTurnos: 2,
  }),
  habilidad({
    id: "bola_fuego",
    presentacionVisual: {"modo":"proyectil","proyectil":"bola_fuego","elemento":"fuego","impacto":"explosion"},
    objetivo: { equipo: "enemigo", patron: "adyacentes" },
    claseId: "mago", nivelJobRequerido: 10, tipoDano: "magico",
    nombre: "Bola de fuego", descripcion: "La explosión daña al objetivo y a los enemigos adyacentes y aplica quemadura durante 2 turnos.",
    tipo: "activa", efecto: "dano", animacion: "ofensiva_potenciada", multiplicadorDano: 1.2,
    danoProgresivoPorcentaje: 0.25, duracionTurnos: 2, costeMana: 20, cooldownTurnos: 3,
  }),
  habilidad({
    id: "concentracion_arcana", claseId: "mago", nivelJobRequerido: 20,
    nombre: "Concentración arcana", descripcion: "Aumenta el ataque mágico un 25 % durante 5 turnos.",
    tipo: "activa", efecto: "bonus_ataque_magico", animacion: "defensiva",
    estadosSecundarios: [{ tipo: "bonus_ataque_magico", valor: 0.25, duracionTurnos: 5, objetivo: "jugador" }],
    costeMana: 14, cooldownTurnos: 4,
  }),
  habilidad({
    id: "reserva_arcana", claseId: "mago", nivelJobRequerido: 20,
    nombre: "Reserva arcana", descripcion: "Aumenta el Maná máximo en 20 puntos.",
    tipo: "pasiva", bonusManaMaximo: 20,
  }),

  // CABALLERO
  habilidad({
    id: "guardia_caballero", claseId: "caballero", nivelJobRequerido: 1,
    nombre: "Guardia del Caballero", descripcion: "Aumenta la defensa un 12 % durante 3 turnos.",
    tipo: "activa", efecto: "bonus_defensa", animacion: "defensiva", bonusDefensaPorcentaje: 0.12,
    duracionTurnos: 3, costeEnergia: 30, cooldownTurnos: 4,
  }),
  habilidad({
    id: "provocacion", claseId: "caballero", nivelJobRequerido: 15,
    nombre: "Provocación", descripcion: "Inflige daño y reduce el ataque enemigo un 12 % durante 2 turnos.",
    tipo: "activa", efecto: "dano", animacion: "ofensiva", multiplicadorDano: 0.9,
    estadosSecundarios: [{ tipo: "debuff_ataque", valor: 0.12, duracionTurnos: 2, objetivo: "enemigo" }],
    costeEnergia: 35, cooldownTurnos: 4,
  }),
  habilidad({
    id: "muro_viviente", claseId: "caballero", nivelJobRequerido: 30,
    nombre: "Muro viviente", descripcion: "Aumenta la vida máxima en 20 puntos.",
    tipo: "pasiva", bonusHpMaximo: 20,
  }),

  // DUELISTA
  habilidad({
    id: "finta_fulminante", claseId: "duelista", nivelJobRequerido: 1,
    nombre: "Finta fulminante", descripcion: "Inflige daño y aumenta la evasión un 12 % durante 2 turnos.",
    tipo: "activa", efecto: "dano", animacion: "ofensiva_potenciada", multiplicadorDano: 1.2,
    estadosSecundarios: [{ tipo: "bonus_evasion", valor: 0.12, duracionTurnos: 2, objetivo: "jugador" }],
    costeEnergia: 35, cooldownTurnos: 3,
  }),
  habilidad({
    id: "corte_final", claseId: "duelista", nivelJobRequerido: 15,
    nombre: "Corte final", descripcion: "Un golpe potente que inflige daño aumentado.",
    tipo: "activa", efecto: "dano", animacion: "ofensiva_potenciada", multiplicadorDano: 1.65,
    costeEnergia: 40, cooldownTurnos: 4,
  }),
  habilidad({
    id: "reflejos_duelista", claseId: "duelista", nivelJobRequerido: 30,
    nombre: "Reflejos del Duelista", descripcion: "Aumenta la evasión en 6 puntos porcentuales.",
    tipo: "pasiva", bonusEvasion: 0.06,
  }),

  // SACERDOTE
  habilidad({
    id: "bendicion_sacerdote", claseId: "sacerdote", nivelJobRequerido: 1,
    nombre: "Bendición", descripcion: "Restaura un 18 % de la vida máxima.",
    tipo: "activa", efecto: "curacion", animacion: "curacion", curacionPorcentaje: 0.18,
    costeMana: 16, cooldownTurnos: 4,
  }),
  habilidad({
    id: "purificacion", claseId: "sacerdote", nivelJobRequerido: 15,
    nombre: "Purificación", descripcion: "Cura un 8 % de la vida máxima y elimina estados negativos.",
    tipo: "activa", efecto: "curacion", animacion: "curacion", curacionPorcentaje: 0.08,
    limpiarEstadosNegativos: true, costeMana: 14, cooldownTurnos: 3,
  }),
  habilidad({
    id: "manos_piadosas", claseId: "sacerdote", nivelJobRequerido: 30,
    nombre: "Manos piadosas", descripcion: "Aumenta la eficacia de las curaciones un 12 %.",
    tipo: "pasiva", bonusCuracion: 0.12,
  }),

  // MONJE
  habilidad({
    id: "puno_ascendente", claseId: "monje", nivelJobRequerido: 1,
    nombre: "Puño ascendente", descripcion: "Un golpe marcial de gran precisión.",
    tipo: "activa", efecto: "dano", animacion: "ofensiva_potenciada", multiplicadorDano: 1.45,
    costeEnergia: 30, cooldownTurnos: 2,
  }),
  habilidad({
    id: "respiracion_interior", claseId: "monje", nivelJobRequerido: 15,
    nombre: "Respiración interior", descripcion: "Recupera 30 de Energía y aumenta la defensa un 10 % durante 2 turnos.",
    tipo: "activa", efecto: "bonus_defensa", animacion: "defensiva", bonusDefensaPorcentaje: 0.1,
    duracionTurnos: 2, recuperarEnergia: 30, costeEnergia: 0, cooldownTurnos: 6,
  }),
  habilidad({
    id: "disciplina_marcial", claseId: "monje", nivelJobRequerido: 30,
    nombre: "Disciplina marcial", descripcion: "Aumenta el ataque y la defensa en 2 puntos.",
    tipo: "pasiva", bonusAtaque: 2, bonusDefensa: 2,
  }),

  // CAZADOR
  habilidad({
    id: "marca_presa",
    presentacionVisual: {"modo":"proyectil","proyectil":"flecha","elemento":"naturaleza","impacto":"destello"},
    claseId: "cazador", nivelJobRequerido: 1,
    nombre: "Marca de presa", descripcion: "Golpea y reduce la defensa enemiga un 12 % durante 2 turnos.",
    tipo: "activa", efecto: "dano", animacion: "ofensiva", multiplicadorDano: 1,
    estadosSecundarios: [{ tipo: "debuff_defensa", valor: 0.12, duracionTurnos: 2, objetivo: "enemigo" }],
    costeEnergia: 35, cooldownTurnos: 4,
  }),
  habilidad({
    id: "flecha_mortal",
    presentacionVisual: {"modo":"proyectil","proyectil":"flecha","elemento":"fisico","impacto":"golpe"},
    claseId: "cazador", nivelJobRequerido: 15,
    nombre: "Flecha mortal", descripcion: "Un disparo de daño elevado con una bonificación crítica.",
    tipo: "activa", efecto: "dano", animacion: "ofensiva_potenciada", multiplicadorDano: 1.55,
    probabilidadCritico: 0.1, costeEnergia: 40, cooldownTurnos: 4,
  }),
  habilidad({
    id: "instinto_depredador", claseId: "cazador", nivelJobRequerido: 30,
    nombre: "Instinto depredador", descripcion: "Aumenta la probabilidad de crítico en 5 puntos.",
    tipo: "pasiva", probabilidadCritico: 0.05,
  }),

  // EXPLORADOR
  habilidad({
    id: "tiro_evasivo", claseId: "explorador", nivelJobRequerido: 1,
    nombre: "Tiro evasivo", descripcion: "Inflige daño y aumenta la evasión un 12 % durante 2 turnos.",
    tipo: "activa", efecto: "dano", animacion: "ofensiva", multiplicadorDano: 1.1,
    estadosSecundarios: [{ tipo: "bonus_evasion", valor: 0.12, duracionTurnos: 2, objetivo: "jugador" }],
    costeEnergia: 30, cooldownTurnos: 3,
  }),
  habilidad({
    id: "trampa_cegadora", claseId: "explorador", nivelJobRequerido: 15,
    nombre: "Trampa cegadora", descripcion: "Inflige daño y reduce la precisión enemiga en 10 puntos durante 2 turnos.",
    tipo: "activa", efecto: "dano", animacion: "ofensiva", multiplicadorDano: 0.9,
    estadosSecundarios: [{ tipo: "debuff_precision", valor: 10, duracionTurnos: 2, objetivo: "enemigo" }],
    costeEnergia: 30, cooldownTurnos: 4,
  }),
  habilidad({
    id: "paso_ligero", claseId: "explorador", nivelJobRequerido: 30,
    nombre: "Paso ligero", descripcion: "Aumenta la velocidad en 5 puntos.",
    tipo: "pasiva", bonusVelocidad: 5,
  }),

  // ELEMENTALISTA
  habilidad({
    id: "descarga_elemental",
    presentacionVisual: {"modo":"proyectil","proyectil":"rayo","elemento":"rayo","impacto":"destello"},
    claseId: "elementalista", nivelJobRequerido: 1, tipoDano: "magico",
    nombre: "Descarga elemental", descripcion: "Un ataque mágico concentrado de gran potencia.",
    tipo: "activa", efecto: "dano", animacion: "ofensiva_potenciada", multiplicadorDano: 1.8,
    costeMana: 18, cooldownTurnos: 3,
  }),
  habilidad({
    id: "sello_elemental", claseId: "elementalista", nivelJobRequerido: 15, tipoDano: "magico",
    nombre: "Sello elemental", descripcion: "Inflige daño mágico y reduce la defensa enemiga un 15 % durante 2 turnos.",
    tipo: "activa", efecto: "dano", animacion: "ofensiva", multiplicadorDano: 0.95,
    estadosSecundarios: [{ tipo: "debuff_defensa", valor: 0.15, duracionTurnos: 2, objetivo: "enemigo" }],
    costeMana: 14, cooldownTurnos: 4,
  }),
  habilidad({
    id: "resonancia_elemental", claseId: "elementalista", nivelJobRequerido: 30,
    nombre: "Resonancia elemental", descripcion: "Aumenta el ataque mágico en 4 puntos.",
    tipo: "pasiva", bonusAtaqueMagico: 4,
  }),

  // BRUJO
  habilidad({
    id: "drenaje_vital",
    presentacionVisual: {"modo":"proyectil","proyectil":"orbe_sombra","elemento":"sombras","impacto":"destello"},
    claseId: "brujo", nivelJobRequerido: 1, tipoDano: "magico",
    nombre: "Drenaje vital", descripcion: "Inflige daño mágico y restaura un 20 % del daño efectivo como vida.",
    tipo: "activa", efecto: "dano", animacion: "ofensiva_potenciada", multiplicadorDano: 1.15,
    roboVida: 0.2, costeMana: 14, cooldownTurnos: 3,
  }),
  habilidad({
    id: "maldicion_debilitante", claseId: "brujo", nivelJobRequerido: 15, tipoDano: "magico",
    nombre: "Maldición debilitante", descripcion: "Reduce el ataque enemigo un 12 % y su defensa un 10 % durante 2 turnos.",
    tipo: "activa", efecto: "dano", animacion: "ofensiva", multiplicadorDano: 0.65,
    estadosSecundarios: [
      { tipo: "debuff_ataque", valor: 0.12, duracionTurnos: 2, objetivo: "enemigo" },
      { tipo: "debuff_defensa", valor: 0.1, duracionTurnos: 2, objetivo: "enemigo" },
    ],
    costeMana: 18, cooldownTurnos: 4,
  }),
  habilidad({
    id: "pacto_sombrio", claseId: "brujo", nivelJobRequerido: 30,
    nombre: "Pacto sombrío", descripcion: "Aumenta el ataque mágico en 6 puntos a cambio de 2 puntos de defensa.",
    tipo: "pasiva", bonusAtaqueMagico: 6, bonusDefensa: -2,
  }),

  // CRUZADO
  habilidad({
    id: "golpe_cruzado", claseId: "cruzado", nivelJobRequerido: 1, tipoDano: "hibrido",
    nombre: "Golpe cruzado", descripcion: "Un ataque híbrido que combina fuerza física y energía sagrada.",
    tipo: "activa", efecto: "dano", animacion: "ofensiva_potenciada", multiplicadorDano: 1.5,
    costeEnergia: 40, costeMana: 8, cooldownTurnos: 3,
  }),
  habilidad({
    id: "voto_protector", claseId: "cruzado", nivelJobRequerido: 15,
    nombre: "Voto protector", descripcion: "Cura un 12 % de la vida máxima y aumenta la defensa un 10 % durante 2 turnos.",
    tipo: "activa", efecto: "curacion", animacion: "curacion", curacionPorcentaje: 0.12,
    estadosSecundarios: [{ tipo: "bonus_defensa", valor: 0.1, duracionTurnos: 2, objetivo: "jugador" }],
    costeEnergia: 25, costeMana: 11, cooldownTurnos: 4,
  }),
  habilidad({
    id: "juicio_sagrado", claseId: "cruzado", nivelJobRequerido: 25, tipoDano: "hibrido",
    nombre: "Juicio sagrado", descripcion: "Inflige daño híbrido y reduce el ataque enemigo un 8 % durante 2 turnos.",
    tipo: "activa", efecto: "dano", animacion: "ofensiva_potenciada", multiplicadorDano: 1.25,
    estadosSecundarios: [{ tipo: "debuff_ataque", valor: 0.08, duracionTurnos: 2, objetivo: "enemigo" }],
    costeEnergia: 30, costeMana: 11, cooldownTurnos: 4,
  }),
  habilidad({
    id: "fe_inquebrantable", claseId: "cruzado", nivelJobRequerido: 35,
    nombre: "Fe inquebrantable", descripcion: "Aumenta la defensa física y mágica en 3 puntos.",
    tipo: "pasiva", bonusDefensa: 3, bonusDefensaMagica: 3,
  }),
  habilidad({"claseId":"novato","id":"instinto_superviviente","nivelJobRequerido":9,"nombre":"Instinto superviviente","descripcion":"Aumenta la evasión en 2 puntos porcentuales.","tipo":"pasiva","bonusEvasion":0.02}),
  habilidad({"claseId":"espadachin","id":"corazon_acero","nivelJobRequerido":10,"nombre":"Corazón de acero","descripcion":"Aumenta la defensa física en 2 puntos.","tipo":"pasiva","bonusDefensa":2}),
  habilidad({"claseId":"acolito","id":"corazon_compasivo","nivelJobRequerido":10,"nombre":"Corazón compasivo","descripcion":"Mejora ligeramente la regeneración de vida.","tipo":"pasiva","bonusRegeneracionVida":0.3}),
  habilidad({"claseId":"arquero","id":"punteria_tranquila","nivelJobRequerido":10,"nombre":"Puntería tranquila","descripcion":"Aumenta la precisión en 3 puntos.","tipo":"pasiva","bonusPrecision":3}),
  habilidad({"claseId":"mago","id":"mente_despejada","nivelJobRequerido":10,"nombre":"Mente despejada","descripcion":"Aumenta el Maná máximo en 5 puntos.","tipo":"pasiva","bonusManaMaximo":5}),
  habilidad({"claseId":"caballero","id":"baluarte_acero","nivelJobRequerido":30,"nombre":"Baluarte de acero","descripcion":"Refuerza la defensa un 18 % durante 3 turnos.","tipo":"activa","efecto":"bonus_defensa","animacion":"defensiva","bonusDefensaPorcentaje":0.18,"duracionTurnos":3,"costeEnergia":40,"cooldownTurnos":5}),
  habilidad({"claseId":"caballero","id":"veterania_caballero","nivelJobRequerido":40,"nombre":"Veteranía del Caballero","descripcion":"Aumenta la vida máxima en 12 puntos.","tipo":"pasiva","bonusHpMaximo":12}),
  habilidad({"claseId":"duelista","id":"danza_hojas","nivelJobRequerido":30,"nombre":"Danza de hojas","descripcion":"Una secuencia rápida que aumenta la evasión durante 2 turnos.","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":1.15,"costeEnergia":40,"cooldownTurnos":4,"estadosSecundarios":[{"tipo":"bonus_evasion","valor":0.1,"duracionTurnos":2,"objetivo":"jugador"}]}),
  habilidad({"claseId":"duelista","id":"mano_firme_duelista","nivelJobRequerido":40,"nombre":"Mano firme","descripcion":"Aumenta la probabilidad de crítico en 3 puntos porcentuales.","tipo":"pasiva","probabilidadCritico":0.03}),
  habilidad({"claseId":"sacerdote","id":"castigo_sagrado","nivelJobRequerido":30,"nombre":"Castigo sagrado","descripcion":"Descarga daño sagrado y reduce el ataque enemigo un 8 % durante 2 turnos.","tipoDano":"magico","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":1.25,"costeMana":20,"cooldownTurnos":4,"estadosSecundarios":[{"tipo":"debuff_ataque","valor":0.08,"duracionTurnos":2,"objetivo":"enemigo"}]}),
  habilidad({"claseId":"sacerdote","id":"luz_persistente","nivelJobRequerido":40,"nombre":"Luz persistente","descripcion":"Aumenta la regeneración de Maná en 1 punto por turno.","tipo":"pasiva","bonusRegeneracionMana":1}),
  habilidad({"claseId":"monje","id":"onda_chi","nivelJobRequerido":30,"nombre":"Onda chi","descripcion":"Libera una onda de energía marcial que debilita el ataque enemigo.","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":1.25,"costeEnergia":45,"cooldownTurnos":4,"estadosSecundarios":[{"tipo":"debuff_ataque","valor":0.1,"duracionTurnos":2,"objetivo":"enemigo"}]}),
  habilidad({"claseId":"monje","id":"mente_calmada","nivelJobRequerido":40,"nombre":"Mente calmada","descripcion":"Aumenta la regeneración de Energía en 3 puntos por turno.","tipo":"pasiva","bonusRegeneracionEnergia":3}),
  habilidad({"claseId":"cazador","id":"disparo_triple","nivelJobRequerido":30,"nombre":"Disparo triple","descripcion":"Tres impactos precisos en una sola acción.","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":1.45,"costeEnergia":25,"cooldownTurnos":4,"probabilidadCritico":0.08}),
  habilidad({"claseId":"cazador","id":"piel_rastreador","nivelJobRequerido":40,"nombre":"Piel de rastreador","descripcion":"Aumenta la precisión en 4 puntos.","tipo":"pasiva","bonusPrecision":4}),
  habilidad({"claseId":"explorador","id":"paso_sombra","nivelJobRequerido":30,"nombre":"Paso de sombra","descripcion":"Un ataque desde un ángulo inesperado aumenta la evasión.","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":1.15,"costeEnergia":40,"cooldownTurnos":4,"estadosSecundarios":[{"tipo":"bonus_evasion","valor":0.12,"duracionTurnos":2,"objetivo":"jugador"}]}),
  habilidad({"claseId":"explorador","id":"supervivencia_explorador","nivelJobRequerido":40,"nombre":"Supervivencia","descripcion":"Aumenta la evasión en 3 puntos porcentuales.","tipo":"pasiva","bonusEvasion":0.03}),
  habilidad({"claseId":"elementalista","id":"tormenta_elemental","nivelJobRequerido":30,"nombre":"Tormenta elemental","descripcion":"Una ráfaga de energía elemental golpea con gran potencia.","tipoDano":"magico","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":1.55,"costeMana":24,"cooldownTurnos":4,"estadosSecundarios":[{"tipo":"debuff_defensa","valor":0.08,"duracionTurnos":2,"objetivo":"enemigo"}]}),
  habilidad({"claseId":"elementalista","id":"corazon_elemental","nivelJobRequerido":40,"nombre":"Corazón elemental","descripcion":"Aumenta el Maná máximo en 8 puntos.","tipo":"pasiva","bonusManaMaximo":8}),
  habilidad({"claseId":"brujo","id":"peste_maldita","nivelJobRequerido":30,"nombre":"Peste maldita","descripcion":"Inflige daño y aplica daño progresivo durante 3 turnos.","tipoDano":"magico","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":0.9,"costeMana":22,"cooldownTurnos":5,"danoProgresivoPorcentaje":0.18,"duracionTurnos":3,"estadosSecundarios":[{"tipo":"debuff_ataque","valor":0.08,"duracionTurnos":2,"objetivo":"enemigo"}]}),
  habilidad({"claseId":"brujo","id":"eco_maldito","nivelJobRequerido":40,"nombre":"Eco maldito","descripcion":"Aumenta la regeneración de Maná en 1 punto por turno.","tipo":"pasiva","bonusRegeneracionMana":1}),
  habilidad({"claseId":"cruzado","id":"aura_cruzada","nivelJobRequerido":45,"nombre":"Aura cruzada","descripcion":"Aumenta la defensa mágica en 3 puntos.","tipo":"pasiva","bonusDefensaMagica":3}),
];

// Habilidades evolutivas.
export const HABILIDADES_EVOLUCIONES: DefinicionHabilidad[] = [
  habilidad({"claseId":"pirata","id":"abordaje_feroz","nivelJobRequerido":1,"nombre":"Abordaje feroz","descripcion":"Un golpe brutal que provoca sangrado durante 2 turnos.","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":1.25,"costeEnergia":40,"cooldownTurnos":3,"danoProgresivoPorcentaje":0.16,"duracionTurnos":2}),
  habilidad({"claseId":"pirata","id":"bomba_humo","nivelJobRequerido":20,"nombre":"Bomba de humo","descripcion":"Daña y reduce la precisión enemiga durante 2 turnos.","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":0.85,"costeEnergia":35,"cooldownTurnos":4,"estadosSecundarios":[{"tipo":"debuff_precision","valor":8,"duracionTurnos":2,"objetivo":"enemigo"}]}),
  habilidad({"claseId":"pirata","id":"saqueo_audaz","nivelJobRequerido":40,"nombre":"Saqueo audaz","descripcion":"Un ataque oportunista que mejora la evasión durante 2 turnos.","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":1.3,"costeEnergia":45,"cooldownTurnos":4,"estadosSecundarios":[{"tipo":"bonus_evasion","valor":0.1,"duracionTurnos":2,"objetivo":"jugador"}]}),
  habilidad({"claseId":"pirata","id":"instinto_del_mar","nivelJobRequerido":25,"nombre":"Instinto del mar","descripcion":"Aumenta la evasión en 3 puntos porcentuales.","tipo":"pasiva","bonusEvasion":0.03}),
  habilidad({"claseId":"pirata","id":"botin_pirata","nivelJobRequerido":45,"nombre":"Botín pirata","descripcion":"Aumenta el ataque físico en 3 puntos.","tipo":"pasiva","bonusAtaque":3}),
  habilidad({"claseId":"druida","id":"zarzas_vivas","nivelJobRequerido":1,"nombre":"Zarzas vivas","descripcion":"Las raíces hieren y mantienen un daño progresivo durante 2 turnos.","tipoDano":"magico","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":1.05,"costeMana":16,"cooldownTurnos":3,"danoProgresivoPorcentaje":0.14,"duracionTurnos":2}),
  habilidad({"claseId":"druida","id":"piel_corteza","nivelJobRequerido":20,"nombre":"Piel de corteza","descripcion":"Refuerza la defensa un 15 % durante 3 turnos.","tipo":"activa","efecto":"bonus_defensa","animacion":"defensiva","bonusDefensaPorcentaje":0.15,"duracionTurnos":3,"costeMana":14,"cooldownTurnos":4}),
  habilidad({"claseId":"druida","id":"lluvia_estrellas","nivelJobRequerido":40,"nombre":"Lluvia de estrellas","descripcion":"Invoca una descarga elemental de gran potencia.","tipoDano":"hibrido","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":1.55,"costeMana":22,"cooldownTurnos":4}),
  habilidad({"claseId":"druida","id":"simbiotico","nivelJobRequerido":25,"nombre":"Vínculo simbiótico","descripcion":"Aumenta la vida máxima en 12 puntos.","tipo":"pasiva","bonusHpMaximo":12}),
  habilidad({"claseId":"druida","id":"raices_misticas","nivelJobRequerido":45,"nombre":"Raíces místicas","descripcion":"Aumenta la regeneración de Maná en 1 punto por turno.","tipo":"pasiva","bonusRegeneracionMana":1}),
  habilidad({"claseId":"espadachin_runico","id":"corte_runa","nivelJobRequerido":1,"nombre":"Corte rúnico","descripcion":"Un tajo imbuido que combina acero y magia.","tipoDano":"hibrido","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":1.4,"costeEnergia":30,"costeMana":9,"cooldownTurnos":3}),
  habilidad({"claseId":"espadachin_runico","id":"marca_arcana","nivelJobRequerido":20,"nombre":"Marca arcana","descripcion":"Golpea y reduce la defensa enemiga un 10 % durante 2 turnos.","tipoDano":"magico","tipo":"activa","efecto":"dano","animacion":"ofensiva","multiplicadorDano":0.95,"costeEnergia":25,"costeMana":11,"cooldownTurnos":4,"estadosSecundarios":[{"tipo":"debuff_defensa","valor":0.1,"duracionTurnos":2,"objetivo":"enemigo"}]}),
  habilidad({"claseId":"espadachin_runico","id":"paso_runique","nivelJobRequerido":40,"nombre":"Paso rúnico","descripcion":"Desaparece entre símbolos arcanos y aumenta la evasión durante 2 turnos.","tipo":"activa","efecto":"bonus_defensa","animacion":"defensiva","costeEnergia":25,"costeMana":9,"cooldownTurnos":4,"duracionTurnos":2,"estadosSecundarios":[{"tipo":"bonus_evasion","valor":0.1,"duracionTurnos":2,"objetivo":"jugador"}]}),
  habilidad({"claseId":"espadachin_runico","id":"runas_grabadas","nivelJobRequerido":25,"nombre":"Runas grabadas","descripcion":"Aumenta el ataque mágico en 3 puntos.","tipo":"pasiva","bonusAtaqueMagico":3}),
  habilidad({"claseId":"espadachin_runico","id":"filo_imbuido","nivelJobRequerido":45,"nombre":"Filo imbuido","descripcion":"Aumenta el ataque físico en 2 puntos.","tipo":"pasiva","bonusAtaque":2}),
  habilidad({"claseId":"paladin","id":"martillo_sagrado","nivelJobRequerido":1,"nombre":"Martillo sagrado","descripcion":"Golpea con fuerza y reduce el ataque enemigo.","tipoDano":"hibrido","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":1.4,"costeEnergia":35,"costeMana":9,"cooldownTurnos":3,"estadosSecundarios":[{"tipo":"debuff_ataque","valor":0.1,"duracionTurnos":2,"objetivo":"enemigo"}]}),
  habilidad({"claseId":"paladin","id":"escudo_redentor","nivelJobRequerido":25,"nombre":"Escudo redentor","descripcion":"Recupera un 12 % de vida y refuerza la defensa durante 2 turnos.","tipo":"activa","efecto":"curacion","animacion":"curacion","curacionPorcentaje":0.12,"costeMana":13,"costeEnergia":25,"cooldownTurnos":4,"estadosSecundarios":[{"tipo":"bonus_defensa","valor":0.12,"duracionTurnos":2,"objetivo":"jugador"}]}),
  habilidad({"claseId":"paladin","id":"sentencia_luminosa","nivelJobRequerido":45,"nombre":"Sentencia luminosa","descripcion":"Descarga un poderoso golpe híbrido.","tipoDano":"hibrido","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":1.7,"costeEnergia":45,"costeMana":15,"cooldownTurnos":5}),
  habilidad({"claseId":"paladin","id":"juramento_paladin","nivelJobRequerido":30,"nombre":"Juramento del Paladín","descripcion":"Aumenta la defensa física y mágica en 3 puntos.","tipo":"pasiva","bonusDefensa":3,"bonusDefensaMagica":3}),
  habilidad({"claseId":"paladin","id":"corazon_puro","nivelJobRequerido":55,"nombre":"Corazón puro","descripcion":"Aumenta la vida máxima en 18 puntos.","tipo":"pasiva","bonusHpMaximo":18}),
  habilidad({"claseId":"guardian_real","id":"orden_inquebrantable","nivelJobRequerido":1,"nombre":"Orden inquebrantable","descripcion":"Refuerza la defensa un 20 % durante 3 turnos.","tipo":"activa","efecto":"bonus_defensa","animacion":"defensiva","bonusDefensaPorcentaje":0.2,"duracionTurnos":3,"costeEnergia":45,"cooldownTurnos":5}),
  habilidad({"claseId":"guardian_real","id":"contraataque_real","nivelJobRequerido":25,"nombre":"Contraataque real","descripcion":"Castiga al enemigo y reduce su ataque durante 2 turnos.","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":1.2,"costeEnergia":45,"cooldownTurnos":4,"estadosSecundarios":[{"tipo":"debuff_ataque","valor":0.12,"duracionTurnos":2,"objetivo":"enemigo"}]}),
  habilidad({"claseId":"guardian_real","id":"muralla_viviente","nivelJobRequerido":45,"nombre":"Muralla viviente","descripcion":"Un golpe reforzado que aumenta la propia defensa.","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":1.35,"costeEnergia":60,"cooldownTurnos":5,"estadosSecundarios":[{"tipo":"bonus_defensa","valor":0.16,"duracionTurnos":3,"objetivo":"jugador"}]}),
  habilidad({"claseId":"guardian_real","id":"sangre_real","nivelJobRequerido":30,"nombre":"Sangre real","descripcion":"Aumenta la vida máxima en 20 puntos.","tipo":"pasiva","bonusHpMaximo":20}),
  habilidad({"claseId":"guardian_real","id":"placas_impenetrables","nivelJobRequerido":55,"nombre":"Placas impenetrables","descripcion":"Aumenta la defensa física en 5 puntos.","tipo":"pasiva","bonusDefensa":5}),
  habilidad({"claseId":"asesino","id":"golpe_silencioso","nivelJobRequerido":1,"nombre":"Golpe silencioso","descripcion":"Un ataque preciso con una probabilidad crítica elevada.","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":1.35,"costeEnergia":35,"cooldownTurnos":3,"probabilidadCritico":0.12}),
  habilidad({"claseId":"asesino","id":"veneno_oculto","nivelJobRequerido":25,"nombre":"Veneno oculto","descripcion":"Envenena al objetivo con daño progresivo durante 3 turnos.","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":0.85,"costeEnergia":40,"cooldownTurnos":4,"danoProgresivoPorcentaje":0.2,"duracionTurnos":3}),
  habilidad({"claseId":"asesino","id":"ejecucion","nivelJobRequerido":45,"nombre":"Ejecución","descripcion":"Un golpe de alto riesgo y gran daño.","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":1.85,"costeEnergia":50,"cooldownTurnos":5,"probabilidadCritico":0.08}),
  habilidad({"claseId":"asesino","id":"paso_sin_ruido","nivelJobRequerido":30,"nombre":"Paso sin ruido","descripcion":"Aumenta la evasión en 4 puntos porcentuales.","tipo":"pasiva","bonusEvasion":0.04}),
  habilidad({"claseId":"asesino","id":"anatomia_precisa","nivelJobRequerido":55,"nombre":"Anatomía precisa","descripcion":"Aumenta la probabilidad crítica en 4 puntos porcentuales.","tipo":"pasiva","probabilidadCritico":0.04}),
  habilidad({"claseId":"maestro_espadas","id":"combo_maestro","nivelJobRequerido":1,"nombre":"Combo maestro","descripcion":"Una serie de cortes fluidos que termina en un golpe potente.","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":1.45,"costeEnergia":30,"cooldownTurnos":3}),
  habilidad({"claseId":"maestro_espadas","id":"guardia_perfecta","nivelJobRequerido":25,"nombre":"Guardia perfecta","descripcion":"Aumenta la defensa un 15 % durante 3 turnos.","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":0.55,"costeEnergia":30,"cooldownTurnos":4,"estadosSecundarios":[{"tipo":"bonus_defensa","valor":0.15,"duracionTurnos":3,"objetivo":"jugador"}]}),
  habilidad({"claseId":"maestro_espadas","id":"corte_dimension","nivelJobRequerido":45,"nombre":"Corte dimensional","descripcion":"Un golpe de precisión devastadora.","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":1.8,"costeEnergia":45,"cooldownTurnos":5}),
  habilidad({"claseId":"maestro_espadas","id":"filo_perfecto","nivelJobRequerido":30,"nombre":"Filo perfecto","descripcion":"Aumenta el ataque físico en 4 puntos.","tipo":"pasiva","bonusAtaque":4}),
  habilidad({"claseId":"maestro_espadas","id":"ritmo_de_combate","nivelJobRequerido":55,"nombre":"Ritmo de combate","descripcion":"Aumenta la velocidad en 3 puntos.","tipo":"pasiva","bonusVelocidad":3}),
  habilidad({"claseId":"oraculo","id":"destello_profetico","nivelJobRequerido":1,"nombre":"Destello profético","descripcion":"Daña al enemigo y reduce su precisión durante 2 turnos.","tipoDano":"magico","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":1.2,"costeMana":16,"cooldownTurnos":3,"estadosSecundarios":[{"tipo":"debuff_precision","valor":8,"duracionTurnos":2,"objetivo":"enemigo"}]}),
  habilidad({"claseId":"oraculo","id":"presagio_sanador","nivelJobRequerido":25,"nombre":"Presagio sanador","descripcion":"Restaura un 20 % de vida y aplica curación progresiva durante 2 turnos.","tipo":"activa","efecto":"curacion","animacion":"curacion","curacionPorcentaje":0.2,"costeMana":22,"cooldownTurnos":5,"duracionTurnos":2,"estadosSecundarios":[{"tipo":"curacion_progresiva","valor":0.06,"duracionTurnos":2,"objetivo":"jugador"}]}),
  habilidad({"claseId":"oraculo","id":"vision_abrumadora","nivelJobRequerido":45,"nombre":"Visión abrumadora","descripcion":"Un rayo sagrado de gran potencia.","tipoDano":"magico","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":1.65,"costeMana":24,"cooldownTurnos":5}),
  habilidad({"claseId":"oraculo","id":"vista_interior","nivelJobRequerido":30,"nombre":"Vista interior","descripcion":"Aumenta la precisión en 4 puntos.","tipo":"pasiva","bonusPrecision":4}),
  habilidad({"claseId":"oraculo","id":"augurio_favorable","nivelJobRequerido":55,"nombre":"Augurio favorable","descripcion":"Aumenta la regeneración de Maná en 2 puntos por turno.","tipo":"pasiva","bonusRegeneracionMana":2}),
  habilidad({"claseId":"hierofante","id":"martillo_ritual","nivelJobRequerido":1,"nombre":"Martillo ritual","descripcion":"Un golpe sagrado con daño mágico.","tipoDano":"magico","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":1.35,"costeMana":16,"cooldownTurnos":3}),
  habilidad({"claseId":"hierofante","id":"barrera_ritual","nivelJobRequerido":25,"nombre":"Barrera ritual","descripcion":"Refuerza la defensa física y mágica durante 3 turnos.","tipo":"activa","efecto":"bonus_defensa","animacion":"defensiva","bonusDefensaPorcentaje":0.16,"duracionTurnos":3,"costeMana":18,"cooldownTurnos":5,"estadosSecundarios":[{"tipo":"bonus_defensa","valor":0.16,"duracionTurnos":3,"objetivo":"jugador"}]}),
  habilidad({"claseId":"hierofante","id":"juicio_del_hierofante","nivelJobRequerido":45,"nombre":"Juicio del hierofante","descripcion":"Desata un ataque sagrado que reduce la defensa enemiga.","tipoDano":"magico","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":1.5,"costeMana":24,"cooldownTurnos":5,"estadosSecundarios":[{"tipo":"debuff_defensa","valor":0.12,"duracionTurnos":2,"objetivo":"enemigo"}]}),
  habilidad({"claseId":"hierofante","id":"ritual_perenne","nivelJobRequerido":30,"nombre":"Ritual perenne","descripcion":"Aumenta la defensa mágica en 4 puntos.","tipo":"pasiva","bonusDefensaMagica":4}),
  habilidad({"claseId":"hierofante","id":"reserva_sagrada","nivelJobRequerido":55,"nombre":"Reserva sagrada","descripcion":"Aumenta el Maná máximo en 15 puntos.","tipo":"pasiva","bonusManaMaximo":15}),
  habilidad({"claseId":"asceta","id":"palma_vacia","nivelJobRequerido":1,"nombre":"Palma vacía","descripcion":"Un golpe de precisión que debilita al enemigo.","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":1.35,"costeEnergia":35,"cooldownTurnos":3,"estadosSecundarios":[{"tipo":"debuff_ataque","valor":0.08,"duracionTurnos":2,"objetivo":"enemigo"}]}),
  habilidad({"claseId":"asceta","id":"respiracion_del_vacio","nivelJobRequerido":25,"nombre":"Respiración del vacío","descripcion":"Recupera Energía y refuerza la defensa por 2 turnos.","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":0.65,"costeEnergia":0,"cooldownTurnos":6,"recuperarEnergia":35,"duracionTurnos":2,"estadosSecundarios":[{"tipo":"bonus_defensa","valor":0.12,"duracionTurnos":2,"objetivo":"jugador"}]}),
  habilidad({"claseId":"asceta","id":"mil_pasos","nivelJobRequerido":45,"nombre":"Mil pasos","descripcion":"Encadena golpes veloces y mejora la evasión.","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":1.55,"costeEnergia":55,"cooldownTurnos":4,"estadosSecundarios":[{"tipo":"bonus_evasion","valor":0.12,"duracionTurnos":2,"objetivo":"jugador"}]}),
  habilidad({"claseId":"asceta","id":"cuerpo_templado","nivelJobRequerido":30,"nombre":"Cuerpo templado","descripcion":"Aumenta la vida máxima en 14 puntos.","tipo":"pasiva","bonusHpMaximo":14}),
  habilidad({"claseId":"asceta","id":"flujo_constante","nivelJobRequerido":55,"nombre":"Flujo constante","descripcion":"Aumenta la regeneración de Energía en 4 puntos por turno.","tipo":"pasiva","bonusRegeneracionEnergia":4}),
  habilidad({"claseId":"gran_maestro","id":"puño_del_maestro","nivelJobRequerido":1,"nombre":"Puño del maestro","descripcion":"Un golpe marcial de alta potencia.","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":1.45,"costeEnergia":25,"cooldownTurnos":3}),
  habilidad({"claseId":"gran_maestro","id":"forma_inmutable","nivelJobRequerido":25,"nombre":"Forma inmutable","descripcion":"Aumenta ataque y defensa durante 2 turnos.","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":0.9,"costeEnergia":40,"cooldownTurnos":4,"estadosSecundarios":[{"tipo":"bonus_ataque","valor":0.1,"duracionTurnos":2,"objetivo":"jugador"},{"tipo":"bonus_defensa","valor":0.1,"duracionTurnos":2,"objetivo":"jugador"}]}),
  habilidad({"claseId":"gran_maestro","id":"impacto_celestial","nivelJobRequerido":45,"nombre":"Impacto celestial","descripcion":"Un impacto devastador con alto coste de Energía.","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":1.8,"costeEnergia":45,"cooldownTurnos":5}),
  habilidad({"claseId":"gran_maestro","id":"disciplina_absoluta","nivelJobRequerido":30,"nombre":"Disciplina absoluta","descripcion":"Aumenta el ataque físico en 3 puntos.","tipo":"pasiva","bonusAtaque":3}),
  habilidad({"claseId":"gran_maestro","id":"respiracion_maestra","nivelJobRequerido":55,"nombre":"Respiración maestra","descripcion":"Aumenta la regeneración de vida por turno.","tipo":"pasiva","bonusRegeneracionVida":0.8}),
  habilidad({"claseId":"francotirador","id":"tiro_al_corazon","nivelJobRequerido":1,"nombre":"Tiro al corazón","descripcion":"Un disparo preciso con probabilidad crítica adicional.","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":1.5,"costeEnergia":45,"cooldownTurnos":3,"probabilidadCritico":0.12}),
  habilidad({"claseId":"francotirador","id":"perforacion_total","nivelJobRequerido":25,"nombre":"Perforación total","descripcion":"Ignora parcialmente la defensa reduciéndola durante 2 turnos.","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":1.2,"costeEnergia":50,"cooldownTurnos":4,"estadosSecundarios":[{"tipo":"debuff_defensa","valor":0.16,"duracionTurnos":2,"objetivo":"enemigo"}]}),
  habilidad({"claseId":"francotirador","id":"disparo_letal","nivelJobRequerido":45,"nombre":"Disparo letal","descripcion":"Un disparo extremo diseñado para causar daño elevado.","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":1.9,"costeEnergia":50,"cooldownTurnos":5,"probabilidadCritico":0.1}),
  habilidad({"claseId":"francotirador","id":"ojo_de_aguila","nivelJobRequerido":30,"nombre":"Ojo de águila","descripcion":"Aumenta la precisión en 5 puntos.","tipo":"pasiva","bonusPrecision":5}),
  habilidad({"claseId":"francotirador","id":"pulso_estable","nivelJobRequerido":55,"nombre":"Pulso estable","descripcion":"Aumenta la probabilidad crítica en 4 puntos porcentuales.","tipo":"pasiva","probabilidadCritico":0.04}),
  habilidad({"claseId":"domabestias","id":"llamada_salvaje","nivelJobRequerido":1,"nombre":"Llamada salvaje","descripcion":"Un ataque coordinado con una criatura aliada.","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":1.3,"costeEnergia":40,"cooldownTurnos":3,"estadosSecundarios":[{"tipo":"bonus_ataque","valor":0.08,"duracionTurnos":2,"objetivo":"jugador"}]}),
  habilidad({"claseId":"domabestias","id":"trampa_de_raices","nivelJobRequerido":25,"nombre":"Trampa de raíces","descripcion":"Daña y reduce la evasión ofensiva con una penalización de precisión.","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":1,"costeEnergia":45,"cooldownTurnos":4,"estadosSecundarios":[{"tipo":"debuff_precision","valor":10,"duracionTurnos":2,"objetivo":"enemigo"}]}),
  habilidad({"claseId":"domabestias","id":"caceria_en_manada","nivelJobRequerido":45,"nombre":"Cacería en manada","descripcion":"Una emboscada coordinada de gran potencia.","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":1.65,"costeEnergia":45,"cooldownTurnos":5}),
  habilidad({"claseId":"domabestias","id":"vinculo_bestial","nivelJobRequerido":30,"nombre":"Vínculo bestial","descripcion":"Aumenta el ataque físico en 3 puntos.","tipo":"pasiva","bonusAtaque":3}),
  habilidad({"claseId":"domabestias","id":"sentidos_agudos","nivelJobRequerido":55,"nombre":"Sentidos agudos","descripcion":"Aumenta la evasión en 3 puntos porcentuales.","tipo":"pasiva","bonusEvasion":0.03}),
  habilidad({"claseId":"guardian_bosque","id":"raices_guardianas","nivelJobRequerido":1,"nombre":"Raíces guardianas","descripcion":"Las raíces ralentizan al enemigo y refuerzan tu defensa.","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":0.95,"costeEnergia":30,"cooldownTurnos":4,"estadosSecundarios":[{"tipo":"bonus_defensa","valor":0.12,"duracionTurnos":2,"objetivo":"jugador"},{"tipo":"debuff_ataque","valor":0.08,"duracionTurnos":2,"objetivo":"enemigo"}]}),
  habilidad({"claseId":"guardian_bosque","id":"flecha_verde","nivelJobRequerido":25,"nombre":"Flecha verde","descripcion":"Un disparo infundido con magia natural.","tipoDano":"magico","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":1.35,"costeMana":14,"cooldownTurnos":3}),
  habilidad({"claseId":"guardian_bosque","id":"refugio_del_bosque","nivelJobRequerido":45,"nombre":"Refugio del bosque","descripcion":"Restaura un 16 % de vida y aplica curación progresiva.","tipo":"activa","efecto":"curacion","animacion":"curacion","curacionPorcentaje":0.16,"costeEnergia":25,"costeMana":13,"cooldownTurnos":5,"estadosSecundarios":[{"tipo":"curacion_progresiva","valor":0.05,"duracionTurnos":2,"objetivo":"jugador"}]}),
  habilidad({"claseId":"guardian_bosque","id":"piel_de_roble","nivelJobRequerido":30,"nombre":"Piel de roble","descripcion":"Aumenta la defensa física en 3 puntos.","tipo":"pasiva","bonusDefensa":3}),
  habilidad({"claseId":"guardian_bosque","id":"viaje_silvestre","nivelJobRequerido":55,"nombre":"Viaje silvestre","descripcion":"Aumenta la velocidad en 4 puntos.","tipo":"pasiva","bonusVelocidad":4}),
  habilidad({"claseId":"rastreador","id":"marcar_objetivo","nivelJobRequerido":1,"nombre":"Marcar objetivo","descripcion":"Reduce la defensa del enemigo antes del disparo.","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":1.05,"costeEnergia":35,"cooldownTurnos":3,"estadosSecundarios":[{"tipo":"debuff_defensa","valor":0.14,"duracionTurnos":2,"objetivo":"enemigo"}]}),
  habilidad({"claseId":"rastreador","id":"flecha_perseguidora","nivelJobRequerido":25,"nombre":"Flecha perseguidora","descripcion":"Un disparo certero que aumenta tu precisión.","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":1.35,"costeEnergia":35,"cooldownTurnos":3,"estadosSecundarios":[{"tipo":"bonus_ataque","valor":0.08,"duracionTurnos":2,"objetivo":"jugador"}]}),
  habilidad({"claseId":"rastreador","id":"emboscada_final","nivelJobRequerido":45,"nombre":"Emboscada final","descripcion":"Una emboscada que causa daño elevado.","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":1.75,"costeEnergia":45,"cooldownTurnos":5}),
  habilidad({"claseId":"rastreador","id":"rastreo_experto","nivelJobRequerido":30,"nombre":"Rastreo experto","descripcion":"Aumenta la precisión en 4 puntos.","tipo":"pasiva","bonusPrecision":4}),
  habilidad({"claseId":"rastreador","id":"paso_del_cazador","nivelJobRequerido":55,"nombre":"Paso del cazador","descripcion":"Aumenta la evasión en 4 puntos porcentuales.","tipo":"pasiva","bonusEvasion":0.04}),
  habilidad({"claseId":"archimago","id":"lanza_arcana","nivelJobRequerido":1,"nombre":"Lanza arcana","descripcion":"Concentra energía mágica en un ataque directo.","tipoDano":"magico","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":1.55,"costeMana":10,"cooldownTurnos":3}),
  habilidad({"claseId":"archimago","id":"explosion_elemental","nivelJobRequerido":25,"nombre":"Explosión elemental","descripcion":"Golpea con una explosión que debilita la defensa.","tipoDano":"magico","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":1.3,"costeMana":22,"cooldownTurnos":4,"estadosSecundarios":[{"tipo":"debuff_defensa","valor":0.12,"duracionTurnos":2,"objetivo":"enemigo"}]}),
  habilidad({"claseId":"archimago","id":"cataclismo","nivelJobRequerido":45,"nombre":"Cataclismo","descripcion":"Una descarga arcana de daño extremo.","tipoDano":"magico","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":1.95,"costeMana":30,"cooldownTurnos":5}),
  habilidad({"claseId":"archimago","id":"nucleo_arcano","nivelJobRequerido":30,"nombre":"Núcleo arcano","descripcion":"Aumenta el ataque mágico en 5 puntos.","tipo":"pasiva","bonusAtaqueMagico":5}),
  habilidad({"claseId":"archimago","id":"reserva_infinita","nivelJobRequerido":55,"nombre":"Reserva infinita","descripcion":"Aumenta el Maná máximo en 18 puntos.","tipo":"pasiva","bonusManaMaximo":18}),
  habilidad({"claseId":"invocador","id":"esfera_invocada","nivelJobRequerido":1,"nombre":"Esfera invocada","descripcion":"Una esfera elemental golpea al objetivo.","tipoDano":"magico","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":1.35,"costeMana":8,"cooldownTurnos":3}),
  habilidad({"claseId":"invocador","id":"sellos_paralelos","nivelJobRequerido":25,"nombre":"Sellos paralelos","descripcion":"Golpea y reduce el ataque enemigo durante 2 turnos.","tipoDano":"magico","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":1.15,"costeMana":18,"cooldownTurnos":4,"estadosSecundarios":[{"tipo":"debuff_ataque","valor":0.1,"duracionTurnos":2,"objetivo":"enemigo"}]}),
  habilidad({"claseId":"invocador","id":"convergencia","nivelJobRequerido":45,"nombre":"Convergencia","descripcion":"Combina fuerzas invocadas en un poderoso ataque.","tipoDano":"magico","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":1.75,"costeMana":26,"cooldownTurnos":5,"danoProgresivoPorcentaje":0.12,"duracionTurnos":2}),
  habilidad({"claseId":"invocador","id":"familiar_arcano","nivelJobRequerido":30,"nombre":"Familiar arcano","descripcion":"Aumenta la regeneración de Maná en 1.5 puntos por turno.","tipo":"pasiva","bonusRegeneracionMana":1.5}),
  habilidad({"claseId":"invocador","id":"vinculo_elemental","nivelJobRequerido":55,"nombre":"Vínculo elemental","descripcion":"Aumenta el ataque mágico en 4 puntos.","tipo":"pasiva","bonusAtaqueMagico":4}),
  habilidad({"claseId":"nigromante","id":"toque_funebre","nivelJobRequerido":1,"nombre":"Toque fúnebre","descripcion":"Drena la fuerza vital e inflige daño mágico.","tipoDano":"magico","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":1.3,"costeMana":18,"cooldownTurnos":3,"roboVida":0.18}),
  habilidad({"claseId":"nigromante","id":"plaga_oscura","nivelJobRequerido":25,"nombre":"Plaga oscura","descripcion":"Inflige daño y aplica daño progresivo durante 3 turnos.","tipoDano":"magico","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":0.9,"costeMana":20,"cooldownTurnos":4,"danoProgresivoPorcentaje":0.2,"duracionTurnos":3}),
  habilidad({"claseId":"nigromante","id":"ejercito_de_sombras","nivelJobRequerido":45,"nombre":"Ejército de sombras","descripcion":"Un estallido de energía necrótica de gran potencia.","tipoDano":"magico","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":1.8,"costeMana":28,"cooldownTurnos":5}),
  habilidad({"claseId":"nigromante","id":"manto_funebre","nivelJobRequerido":30,"nombre":"Manto fúnebre","descripcion":"Aumenta la defensa mágica en 4 puntos.","tipo":"pasiva","bonusDefensaMagica":4}),
  habilidad({"claseId":"nigromante","id":"alma_persistente","nivelJobRequerido":55,"nombre":"Alma persistente","descripcion":"Aumenta la vida máxima en 15 puntos.","tipo":"pasiva","bonusHpMaximo":15}),
  habilidad({"claseId":"demonologo","id":"cadena_infernal","nivelJobRequerido":1,"nombre":"Cadena infernal","descripcion":"Un golpe mágico que debilita el ataque enemigo.","tipoDano":"magico","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":1.25,"costeMana":18,"cooldownTurnos":3,"estadosSecundarios":[{"tipo":"debuff_ataque","valor":0.1,"duracionTurnos":2,"objetivo":"enemigo"}]}),
  habilidad({"claseId":"demonologo","id":"pacto_de_sangre","nivelJobRequerido":25,"nombre":"Pacto de sangre","descripcion":"Sacrifica parte de tu defensa para lanzar un ataque potente.","tipoDano":"magico","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":1.45,"costeMana":20,"cooldownTurnos":4,"estadosSecundarios":[{"tipo":"bonus_ataque_magico","valor":0.14,"duracionTurnos":2,"objetivo":"jugador"}]}),
  habilidad({"claseId":"demonologo","id":"abismo","nivelJobRequerido":45,"nombre":"Abismo","descripcion":"Abre una fisura de magia oscura que causa daño extremo.","tipoDano":"magico","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":1.9,"costeMana":30,"cooldownTurnos":5}),
  habilidad({"claseId":"demonologo","id":"pacto_menor","nivelJobRequerido":30,"nombre":"Pacto menor","descripcion":"Aumenta el ataque mágico en 4 puntos, a costa de 1 de defensa.","tipo":"pasiva","bonusAtaqueMagico":4,"bonusDefensa":-1}),
  habilidad({"claseId":"demonologo","id":"corazon_infernal","nivelJobRequerido":55,"nombre":"Corazón infernal","descripcion":"Aumenta el Maná máximo en 15 puntos.","tipo":"pasiva","bonusManaMaximo":15}),];

// Super Novato.
const base={claseId:"superNovato",rareza:"basico" as const,precio:0,costePuntosHabilidad:1};
export const HABILIDADES_SUPER_NOVATO:DefinicionHabilidad[]=[
  {...base,id:"superNovato_enlace",nombre:"Técnica de enlace",descripcion:"",tipo:"activa",efecto:"dano",nivelJobRequerido:1,costeEnergia:35,cooldownTurnos:3},
  {...base,id:"superNovato_recurso",nombre:"Recurso improvisado",descripcion:"",tipo:"activa",efecto:"curacion",nivelJobRequerido:20,costeMana:8,cooldownTurnos:6},
  {...base,id:"superNovato_leccion",nombre:"Lección práctica",descripcion:"",tipo:"activa",efecto:"dano",nivelJobRequerido:40,costeEnergia:35,costeMana:5,cooldownTurnos:5},
  {...base,id:"superNovato_incansable",nombre:"Aprendiz incansable",descripcion:"",tipo:"pasiva",nivelJobRequerido:25},
  {...base,id:"superNovato_contingencia",nombre:"Plan de contingencia",descripcion:"",tipo:"pasiva",nivelJobRequerido:60},
];

// Motor declarativo de habilidades (datos de diseño v2).
const golpe = (potencia: number,...operaciones: OperacionHabilidad[]): DisenoActiva => ({ efecto: "dano", potencia, operaciones });
const apoyo = (...operaciones: OperacionHabilidad[]): DisenoActiva => ({ efecto: "estado", operaciones });
const cura = (cantidad: number,...operaciones: OperacionHabilidad[]): DisenoActiva => ({ efecto: "curacion", cura: cantidad, operaciones });
const regenerar = (cantidad: number,...operaciones: OperacionHabilidad[]): DisenoActiva => ({ efecto: "curacion_progresiva", cura: cantidad, duracion: 3, operaciones });
const preparar = (clave: string): OperacionHabilidad => ({tipo:"estado",objetivo:"actor",familia:"preparacion",clave,valor:1,duracion:3});
const consumir = (clave: string,efecto: "ruptura"|"potencia"|"cura"|"guardia" = "ruptura"): OperacionHabilidad => ({tipo:"consumir_preparacion",clave,efecto,factor:0.15});
const guardia = (porcentaje=0.12,objetivo: "actor"|"objetivo"="objetivo"): OperacionHabilidad => ({tipo:"guardia_porcentaje",objetivo,porcentaje,duracion:2});
const limpiar: OperacionHabilidad = {tipo:"disipar",objetivo:"objetivo",negativo:true};
const disipar: OperacionHabilidad = {tipo:"disipar",objetivo:"objetivo",negativo:false};
const adelantar = (familia:"herida"|"regeneracion",objetivo:"actor"|"objetivo"="objetivo"): OperacionHabilidad => ({tipo:"adelantar",familia,objetivo});
const mover = (fila:number): OperacionHabilidad => ({tipo:"mover",fila});
const marca = (clave:string,familia:"marca"|"sello"="marca"): OperacionHabilidad => ({tipo:"estado",objetivo:"objetivo",familia,clave,valor:familia==="sello"?.18:1,duracion:3});
const areaDiseno = (d:DisenoActiva,patron:"fila"|"adyacentes"|"columna"="fila"): DisenoActiva=>({...d,area:patron});
const herida = (d:DisenoActiva,valor=0.14):DisenoActiva=>({...d,herida:valor,duracion:2});
const propio = (d:DisenoActiva):DisenoActiva=>({...d,propio:true});
const p = (condicion:CondicionPasiva,ventaja:VentajaPasiva):ReglaPasiva=>({condicion,ventaja});
const elemental=(d:DisenoActiva,elemento:ElementoTactico):DisenoActiva=>({...d,elemento,operaciones:[...d.operaciones,{tipo:"reaccion",elemento}]});
const invocar=(clave:string,potencia=0.22):OperacionHabilidad=>({tipo:"invocar",clave,potencia,duracion:6,mantenimiento:0,manual:true});
const orden:OperacionHabilidad={tipo:"ordenar",modo:"asalto"};
const sacrificar=(familia:"acompanante"|"campo"|"pacto"|"herida"):Extract<OperacionHabilidad,{tipo:"sacrificar"}>=>({tipo:"sacrificar",familia,fraccion:0.5});

/** Una fila por clase, también para las que aún no tienen sprite definitivo. */
export const DISENO_HABILIDADES: Record<string,DisenoClase> = {
  novato:{activas:[golpe(1.15),{...cura(0.15),vendaje:.075,duracion:2},propio(apoyo(guardia(0.1)))],pasivas:[p("vida_baja","estabilizar"),p("vida_baja","guardia")]},
  espadachin:{activas:[golpe(1.25,consumir("apertura"),preparar("apertura")),herida(golpe(0.9)),golpe(0.85,disipar,{tipo:"estado",objetivo:"objetivo",familia:"exposicion",clave:"ruptura",valor:.15,duracion:2})],pasivas:[p("enemigo_protegido","precision"),p("guardia","limpiar_herida")]},
  acolito:{activas:[cura(0.18),regenerar(0.075),golpe(1.1,adelantar("regeneracion","actor")),apoyo(guardia(0.14))],pasivas:[p("cambiar_objetivo","mana"),p("sobrecuracion","regeneracion")]},
  arquero:{activas:[golpe(1.2,consumir("punteria"),preparar("punteria")),golpe(1.05,disipar),golpe(1.25,marca("presa"),preparar("punteria"))],pasivas:[p("objetivo_marcado","precision"),p("apoyo","guardar_preparacion")]},
  mago:{activas:[elemental(golpe(1.25),"arcano"),elemental(areaDiseno(herida(golpe(1.75),0.07),"adyacentes"),"fuego"),propio(apoyo(preparar("concentracion"),guardia(0.06,"actor")))],pasivas:[p("preparacion","resistir"),p("mana_bajo","estabilizar")]},
  superNovato:{activas:[golpe(2,consumir("enlace"),preparar("enlace")),propio(cura(0.08,{tipo:"recurso",recurso:"energia",cantidad:15})),golpe(1.75,consumir("enlace","guardia"),preparar("proxima_disciplina"))],pasivas:[p("alternar","energia"),p("vida_baja","curacion")]},
  caballero:{activas:[apoyo(guardia(0.16),preparar("custodia")),golpe(0.95,marca("provocacion")),propio(apoyo(guardia(0.14),consumir("custodia","guardia")))],pasivas:[p("guardia","guardar_preparacion"),p("apoyo","estabilizar")]},
  duelista:{activas:[golpe(1.05,preparar("lectura")),golpe(1.65,consumir("lectura","potencia")),propio(apoyo(guardia(0.1),preparar("lectura")))],pasivas:[p("consumo","precision"),p("alternar","guardar_preparacion")]},
  sacerdote:{activas:[cura(0.2,preparar("triaje")),cura(0.09,limpiar),golpe(1.1,marca("sentencia"))],pasivas:[p("objetivo_herido","estabilizar"),p("regeneracion","curacion")]},
  monje:{activas:[golpe(1.15,preparar("chi")),propio(apoyo({tipo:"recurso",recurso:"energia",cantidad:30},preparar("chi"))),golpe(1.55,consumir("chi"),disipar)],pasivas:[p("preparacion","precision"),p("energia_baja","limpiar_herida")]},
  cazador:{activas:[golpe(1,marca("presa"),preparar("debilidad")),golpe(1.55,consumir("debilidad","potencia")),golpe(1.4,marca("presa"),adelantar("herida"))],pasivas:[p("objetivo_herido","guardar_preparacion"),p("objetivo_marcado","resistir")]},
  explorador:{activas:[golpe(1.1,preparar("ruta")),apoyo(marca("trampa"),{tipo:"interrumpir",debilitamiento:0.25}),propio(apoyo(mover(2),consumir("ruta","guardia")))],pasivas:[p("movilidad","energia"),p("consumo","regeneracion")]},
  elementalista:{activas:[elemental(golpe(1.25),"rayo"),elemental(golpe(1.05,preparar("afinidad")),"hielo"),elemental(areaDiseno(golpe(1.9,consumir("afinidad"))),"fuego")],pasivas:[p("reaccion","resistir"),p("reaccion","guardar_preparacion")]},
  brujo:{activas:[{...golpe(1.1,adelantar("herida")),drenaje:.15},herida(golpe(0.8,marca("maldicion"))),areaDiseno(golpe(1.65,consumir("maldicion"),preparar("maldicion")),"adyacentes")],pasivas:[p("herida","guardia"),p("disipacion","guardar_preparacion")]},
  cruzado:{activas:[golpe(1.2,preparar("consuelo")),cura(0.16,consumir("consuelo","cura")),golpe(1.4,consumir("custodia"),disipar)],pasivas:[p("guardia","curacion"),p("cura_efectiva","resistir")]},
  pirata:{activas:[golpe(1.1,preparar("treta")),propio(apoyo(mover(2),guardia(0.08),preparar("treta"))),golpe(1.1,{tipo:"robar",familia:"guardia",fraccion:0.5},consumir("treta"))],pasivas:[p("movilidad","limpiar_herida"),p("disipacion","energia")]},
  druida:{activas:[herida(elemental(golpe(0.9,preparar("crecimiento")),"naturaleza")),apoyo(guardia(0.11),preparar("crecimiento")),areaDiseno(cura(0.23,consumir("crecimiento","cura")))],pasivas:[p("regeneracion","guardar_preparacion"),p("reaccion","regeneracion")]},
  espadachin_runico:{activas:[golpe(1.2,consumir("runa"),preparar("runa")),golpe(1.05,marca("runa_hostil"),preparar("runa")),propio(apoyo(mover(1),guardia(0.09),preparar("runa")))],pasivas:[p("consumo","guardar_preparacion"),p("alternar","exponer")]},
  paladin:{activas:[golpe(1.25,preparar("voto")),cura(0.17,consumir("voto","cura")),golpe(1.35,marca("agravio"),guardia(0.04,"actor"))],pasivas:[p("cura_efectiva","guardar_preparacion"),p("limpieza","resistir")]},
  guardian_real:{activas:[apoyo(guardia(0.18),preparar("custodia")),golpe(1.3,consumir("custodia")),areaDiseno(apoyo(guardia(0.24),preparar("custodia")))],pasivas:[p("guardia","estabilizar"),p("fila_propia","guardia")]},
  asesino:{activas:[golpe(1.25,marca("exposicion")),herida(golpe(0.9,preparar("ejecucion"))),golpe(1.75,consumir("ejecucion","potencia"))],pasivas:[p("movilidad","resistir"),p("objetivo_herido","exponer")]},
  maestro_espadas:{activas:[golpe(1.25,preparar("forma")),propio(apoyo(guardia(0.12),preparar("forma_defensiva"))),golpe(1.75,consumir("forma"),consumir("forma_defensiva","potencia"))],pasivas:[p("alternar","resistir"),p("preparacion","guardar_preparacion")]},
  oraculo:{activas:[golpe(1,preparar("augurio"),marca("observacion")),regenerar(0.075,preparar("augurio")),golpe(1.4,consumir("augurio"),{tipo:"interrumpir",debilitamiento:0.25})],pasivas:[p("preparacion","estabilizar"),p("objetivo_herido","regeneracion")]},
  hierofante:{activas:[golpe(1.15,preparar("verso")),regenerar(0.065,{tipo:"estado",objetivo:"actor",familia:"campo",clave:"ritual",valor:1,duracion:3}),areaDiseno(cura(0.24,consumir("verso","cura")))],pasivas:[p("regeneracion","resistir"),p("apoyo","mana")]},
  asceta:{activas:[golpe(1.15,consumir("vacio"),preparar("vacio")),propio(apoyo({tipo:"recurso",recurso:"energia",cantidad:35},preparar("vacio"))),propio(apoyo(mover(2),consumir("vacio","guardia")))],pasivas:[p("energia_baja","resistir"),p("consumo","energia")]},
  gran_maestro:{activas:[golpe(1.25,preparar("forma")),propio(apoyo(guardia(0.1),preparar("forma"))),golpe(1.75,consumir("forma","potencia"))],pasivas:[p("alternar","guardia"),p("preparacion","energia")]},
  francotirador:{activas:[golpe(1.45,consumir("mira","potencia"),preparar("mira")),areaDiseno(golpe(2,preparar("mira")),"columna"),golpe(1.8,consumir("mira"))],pasivas:[p("objetivo_marcado","guardar_preparacion"),p("preparacion","guardia")]},
  domabestias:{activas:[golpe(0.7,invocar("bestia",.35)),golpe(0.9,marca("trampa"),disipar),golpe(1.05,orden)],pasivas:[p("invocacion","regeneracion"),p("orden","precision")]},
  guardian_bosque:{activas:[areaDiseno(apoyo(guardia(0.24),preparar("territorio"))),elemental(golpe(1.25,consumir("territorio")),"naturaleza"),areaDiseno(regenerar(0.075))],pasivas:[p("guardia","resistir"),p("movilidad","guardia")]},
  rastreador:{activas:[golpe(1.05,preparar("observacion")),golpe(1.25,consumir("observacion"),marca("presa")),golpe(1.55,consumir("observacion","potencia"),preparar("observacion"))],pasivas:[p("cambiar_objetivo","guardar_preparacion"),p("objetivo_marcado","guardia")]},
  archimago:{activas:[golpe(1.3,consumir("compresion"),preparar("compresion")),areaDiseno(golpe(2,consumir("compresion","potencia"))),areaDiseno(golpe(2.3,consumir("compresion","potencia"),{tipo:"estado",objetivo:"actor",familia:"exposicion",clave:"agotamiento",valor:0.1,duracion:2}))],pasivas:[p("mana_bajo","precision"),p("preparacion","mana")]},
  invocador:{activas:[golpe(0.7,invocar("familiar")),golpe(0.65,orden),areaDiseno(golpe(1.3,sacrificar("acompanante")))],pasivas:[p("invocacion","mana"),p("orden","guardar_preparacion")]},
  nigromante:{activas:[{...golpe(1.15,preparar("fragmento"),adelantar("herida"),orden),drenaje:.18},herida(golpe(0.9,preparar("fragmento")),0.18),golpe(0.8,consumir("fragmento"),invocar("sombras",0.38))],pasivas:[p("herida","estabilizar"),p("sacrificio","guardia")]},
  demonologo:{activas:[golpe(1.1,marca("contrato")),propio(apoyo({tipo:"pacto",fraccionVida:0.08,duracion:3},preparar("contrato"))),areaDiseno(golpe(1.9,sacrificar("pacto"),consumir("contrato")))],pasivas:[p("pacto","mana"),p("cura_efectiva","limpiar_herida")]},
  berserker:{activas:[herida(golpe(1,preparar("furia"))),propio(apoyo(preparar("furia"),{tipo:"estado",objetivo:"actor",familia:"exposicion",clave:"furia_expuesta",valor:0.1,duracion:2})),areaDiseno(golpe(1.9,consumir("furia","potencia")))],pasivas:[p("herida","resistir"),p("sacrificio","estabilizar")]},
  luchador:{activas:[golpe(1.15,preparar("contacto")),propio(apoyo(guardia(0.1),preparar("contacto"))),golpe(1.35,consumir("contacto"),{tipo:"interrumpir",debilitamiento:0.25})],pasivas:[p("energia_baja","guardia"),p("guardia","precision")]},
  centinela:{activas:[golpe(1.15,marca("senal"),preparar("vigilia")),areaDiseno(apoyo(guardia(0.21),preparar("vigilia"))),areaDiseno(golpe(1.7,consumir("vigilia")))],pasivas:[p("objetivo_marcado","estabilizar"),p("cambiar_objetivo","guardia")]},
  escriba_arcano:{activas:[golpe(1,marca("debilidad","sello")),apoyo(guardia(0.09),preparar("enlace_de_escritura")),herida(golpe(0.9,consumir("enlace_de_escritura"),marca("abrasion","sello")))],pasivas:[p("consumo","resistir"),p("disipacion","precision")]},
  bardo:{activas:[golpe(1.05,preparar("nota")),areaDiseno(apoyo(guardia(0.18),preparar("melodia"))),areaDiseno(regenerar(0.075,consumir("nota","cura")))],pasivas:[p("apoyo","energia"),p("regeneracion","estabilizar")]},
  comerciante:{activas:[golpe(1.05,preparar("suministro")),cura(0.1,preparar("suministro")),golpe(1,consumir("suministro","guardia"),marca("distraccion"))],pasivas:[p("sobrecuracion","guardia"),p("sobrecuracion","energia")]},
  chaman:{activas:[elemental(golpe(1.15,preparar("carga_natural")),"rayo"),areaDiseno(apoyo(guardia(0.2),{tipo:"estado",objetivo:"actor",familia:"campo",clave:"totem",valor:1,duracion:3})),areaDiseno(elemental(golpe(1.8,consumir("carga_natural")),"fuego"))],pasivas:[p("reaccion","guardia"),p("sacrificio","resistir")]},
  inquisidor:{activas:[golpe(0.95,disipar,preparar("testimonio")),cura(0.12,limpiar,preparar("testimonio")),golpe(1.45,consumir("testimonio"),marca("sentencia"))],pasivas:[p("limpieza","estabilizar"),p("disipacion","exponer")]},
  heraldo_guerra:{activas:[golpe(1.1,preparar("orden")),areaDiseno(apoyo(guardia(0.21),preparar("orden"))),areaDiseno(apoyo(guardia(0.18),preparar("concentracion"),consumir("orden","guardia")))],pasivas:[p("cambiar_objetivo","precision"),p("alternar","mana")]},
  ninja:{activas:[herida(golpe(1.1,preparar("senuelo"))),propio(apoyo(mover(2),guardia(0.08),preparar("senuelo"))),elemental(areaDiseno(golpe(1.8,consumir("senuelo"))),"fuego")],pasivas:[p("movilidad","precision"),p("consumo","estabilizar")]},
  alquimista:{activas:[golpe(0.95,marca("reactivo")),cura(0.13,limpiar),areaDiseno(golpe(1.8,consumir("reactivo"),disipar))],pasivas:[p("sobrecuracion","guardar_preparacion"),p("limpieza","regeneracion")]},
  herrero:{activas:[golpe(1.1,disipar),apoyo(guardia(0.13),preparar("refuerzo")),areaDiseno(golpe(1.8,consumir("refuerzo")))],pasivas:[p("guardia","regeneracion"),p("consumo","guardia")]},
  verdugo:{activas:[golpe(1.15,disipar,preparar("ejecucion")),golpe(1.35,preparar("ejecucion")),golpe(1.85,consumir("ejecucion","potencia"))],pasivas:[p("enemigo_protegido","guardar_preparacion"),p("objetivo_herido","precision")]},
  saqueador:{activas:[{...herida(golpe(1.05),0.16),drenaje:.1},propio(cura(0.1,mover(2))),golpe(1.25,{...sacrificar("herida"),resultado:"cura_actor"})],pasivas:[p("herida","precision"),p("sacrificio","regeneracion")]},
  campeon_arena:{activas:[golpe(1.2,preparar("adaptacion")),propio(cura(0.1,preparar("adaptacion"))),areaDiseno(golpe(1.9,consumir("adaptacion")))],pasivas:[p("alternar","estabilizar"),p("energia_baja","energia")]},
  mariscal:{activas:[areaDiseno(golpe(1.75,preparar("formacion"))),apoyo(guardia(0.12),preparar("formacion")),golpe(1.5,consumir("formacion"))],pasivas:[p("movilidad","estabilizar"),p("area","resistir")]},
  vigia:{activas:[golpe(1.15,preparar("respuesta")),propio(apoyo(mover(2),preparar("respuesta"),guardia(0.07))),areaDiseno(golpe(1.9,consumir("respuesta")))],pasivas:[p("cambiar_objetivo","resistir"),p("preparacion","exponer")]},
  runista:{activas:[herida(golpe(0.9,marca("circuito","sello"))),apoyo(guardia(0.1),preparar("circuito")),areaDiseno(golpe(1.7,consumir("circuito"),{tipo:"circuito",maximo:3}))],pasivas:[p("consumo","mana"),p("enemigo_protegido","exponer")]},
  abjurador:{activas:[golpe(1.05,consumir("contramagia"),disipar),{...apoyo(preparar("contramagia")),barrera:true},areaDiseno(golpe(1.65,disipar))],pasivas:[p("guardia","mana"),p("disipacion","resistir")]},
  senor_guerra:{activas:[areaDiseno(golpe(1.85,preparar("frente"))),areaDiseno(apoyo(guardia(0.24),preparar("frente"))),golpe(1.9,consumir("frente","potencia"))],pasivas:[p("ruptura","guardia"),p("guardia","exponer")]},
  avatar_tormenta:{activas:[areaDiseno(elemental(golpe(1.8,consumir("tempestad")),"rayo")),propio(apoyo(preparar("tempestad"),guardia(0.1))),golpe(1.9,consumir("tempestad","potencia"))],pasivas:[p("coste_mixto","mana"),p("preparacion","regeneracion")]},
  cazador_espectral:{activas:[{...golpe(1.2,preparar("vinculo_funeral")),drenaje:.15},apoyo(guardia(0.12),preparar("observacion")),areaDiseno(herida(golpe(1.8,consumir("observacion","cura")),0.08))],pasivas:[p("herida","guardar_preparacion"),p("cambiar_objetivo","regeneracion")]},
  arconte:{activas:[areaDiseno(golpe(1.85,preparar("luz"))),areaDiseno(cura(0.26,limpiar,preparar("luz"))),areaDiseno(apoyo(guardia(0.23),consumir("luz","guardia")))],pasivas:[p("apoyo","resistir"),p("sobrecuracion","curacion")]},
  justiciero:{activas:[golpe(1.25,preparar("deuda")),cura(0.15,guardia(0.06),preparar("deuda")),areaDiseno(golpe(1.85,consumir("deuda")))],pasivas:[p("cura_efectiva","estabilizar"),p("sobrecuracion","resistir")]},
  hoja_velo:{activas:[golpe(1.25,consumir("velo")),propio(apoyo(mover(1),preparar("velo"),guardia(0.08))),areaDiseno(golpe(1.85,consumir("velo","potencia")))],pasivas:[p("ruptura","precision"),p("movilidad","guardar_preparacion")]},
  danzaespadas:{activas:[areaDiseno(golpe(1.8,preparar("compas"))),areaDiseno(apoyo(guardia(0.2),preparar("compas"))),golpe(1.8,consumir("compas","potencia"))],pasivas:[p("movilidad","mana"),p("alternar","precision")]},
  corsario:{activas:[golpe(1.2,marca("incursion"),preparar("incursion")),propio(apoyo(mover(2),guardia(0.1),preparar("incursion"))),areaDiseno(golpe(1.85,consumir("incursion")))],pasivas:[p("objetivo_marcado","energia"),p("consumo","curacion")]},
};

// Nombres de presentación.
/** Nombres propios; los efectos se describen desde las reglas ejecutables. */
export const NOMBRES_REDISENIO: Record<string,string> = {
  "golpe_apresurado": "Golpe apresurado",
  "primeros_auxilios": "Primeros auxilios",
  "guardia_improvisada": "Guardia improvisada",
  "aguante_aprendiz": "Aguante de aprendiz",
  "instinto_superviviente": "Instinto superviviente",
  "estocada_espadachin": "Estocada",
  "tajo_sangrante": "Tajo sangrante",
  "rompeguardia": "Rompeguardia",
  "tecnica_duelo": "Técnica de duelo",
  "corazon_acero": "Corazón de acero",
  "luz_acolito": "Luz sanadora",
  "rejuvenecer": "Rejuvenecer",
  "golpe_consagrado": "Golpe consagrado",
  "plegaria_constante": "Plegaria constante",
  "corazon_compasivo": "Corazón compasivo",
  "disparo_arquero": "Disparo preciso",
  "flecha_penetrante": "Flecha penetrante",
  "tiro_oportunidad": "Tiro de oportunidad",
  "ojo_halcon": "Ojo de halcón",
  "punteria_tranquila": "Puntería tranquila",
  "chispa_mago": "Chispa arcana",
  "bola_fuego": "Bola de fuego",
  "concentracion_arcana": "Concentración arcana",
  "reserva_arcana": "Reserva arcana",
  "mente_despejada": "Mente despejada",
  "guardia_caballero": "Guardia del Caballero",
  "provocacion": "Provocación",
  "baluarte_acero": "Baluarte de acero",
  "muro_viviente": "Muro viviente",
  "veterania_caballero": "Veteranía del Caballero",
  "finta_fulminante": "Finta fulminante",
  "corte_final": "Corte final",
  "danza_hojas": "Danza de hojas",
  "reflejos_duelista": "Reflejos del Duelista",
  "mano_firme_duelista": "Mano firme",
  "bendicion_sacerdote": "Bendición",
  "purificacion": "Purificación",
  "castigo_sagrado": "Castigo sagrado",
  "manos_piadosas": "Manos piadosas",
  "luz_persistente": "Luz persistente",
  "puno_ascendente": "Puño ascendente",
  "respiracion_interior": "Respiración interior",
  "onda_chi": "Onda chi",
  "disciplina_marcial": "Disciplina marcial",
  "mente_calmada": "Mente calmada",
  "marca_presa": "Marca de presa",
  "flecha_mortal": "Flecha mortal",
  "disparo_triple": "Disparo triple",
  "instinto_depredador": "Instinto depredador",
  "piel_rastreador": "Piel de rastreador",
  "tiro_evasivo": "Tiro evasivo",
  "trampa_cegadora": "Trampa cegadora",
  "paso_sombra": "Paso de sombra",
  "paso_ligero": "Paso ligero",
  "supervivencia_explorador": "Supervivencia",
  "descarga_elemental": "Descarga elemental",
  "sello_elemental": "Sello glacial",
  "tormenta_elemental": "Tormenta elemental",
  "resonancia_elemental": "Resonancia elemental",
  "corazon_elemental": "Corazón elemental",
  "drenaje_vital": "Drenaje vital",
  "maldicion_debilitante": "Maldición debilitante",
  "peste_maldita": "Peste maldita",
  "pacto_sombrio": "Pacto sombrío",
  "eco_maldito": "Eco maldito",
  "golpe_cruzado": "Golpe cruzado",
  "voto_protector": "Voto protector",
  "juicio_sagrado": "Juicio sagrado",
  "fe_inquebrantable": "Fe inquebrantable",
  "aura_cruzada": "Aura cruzada",
  "abordaje_feroz": "Abordaje feroz",
  "bomba_humo": "Bomba de humo",
  "saqueo_audaz": "Saqueo audaz",
  "instinto_del_mar": "Instinto del mar",
  "botin_pirata": "Botín pirata",
  "zarzas_vivas": "Zarzas vivas",
  "piel_corteza": "Piel de corteza",
  "lluvia_estrellas": "Lluvia de estrellas",
  "simbiotico": "Vínculo simbiótico",
  "raices_misticas": "Raíces místicas",
  "corte_runa": "Corte rúnico",
  "marca_arcana": "Marca arcana",
  "paso_runique": "Paso rúnico",
  "runas_grabadas": "Runas grabadas",
  "filo_imbuido": "Filo imbuido",
  "martillo_sagrado": "Martillo sagrado",
  "escudo_redentor": "Escudo redentor",
  "sentencia_luminosa": "Sentencia luminosa",
  "juramento_paladin": "Juramento del Paladín",
  "corazon_puro": "Corazón puro",
  "orden_inquebrantable": "Orden inquebrantable",
  "contraataque_real": "Contraataque real",
  "muralla_viviente": "Muralla viviente",
  "sangre_real": "Sangre real",
  "placas_impenetrables": "Placas impenetrables",
  "golpe_silencioso": "Golpe silencioso",
  "veneno_oculto": "Veneno oculto",
  "ejecucion": "Ejecución",
  "paso_sin_ruido": "Paso sin ruido",
  "anatomia_precisa": "Anatomía precisa",
  "combo_maestro": "Combo maestro",
  "guardia_perfecta": "Guardia perfecta",
  "corte_dimension": "Corte dimensional",
  "filo_perfecto": "Filo perfecto",
  "ritmo_de_combate": "Ritmo de combate",
  "destello_profetico": "Destello profético",
  "presagio_sanador": "Presagio sanador",
  "vision_abrumadora": "Visión abrumadora",
  "vista_interior": "Vista interior",
  "augurio_favorable": "Augurio favorable",
  "martillo_ritual": "Martillo ritual",
  "barrera_ritual": "Barrera ritual",
  "juicio_del_hierofante": "Juicio del hierofante",
  "ritual_perenne": "Ritual perenne",
  "reserva_sagrada": "Reserva sagrada",
  "palma_vacia": "Palma vacía",
  "respiracion_del_vacio": "Respiración del vacío",
  "mil_pasos": "Mil pasos",
  "cuerpo_templado": "Cuerpo templado",
  "flujo_constante": "Flujo constante",
  "puño_del_maestro": "Puño del maestro",
  "forma_inmutable": "Forma inmutable",
  "impacto_celestial": "Impacto celestial",
  "disciplina_absoluta": "Disciplina absoluta",
  "respiracion_maestra": "Respiración maestra",
  "tiro_al_corazon": "Tiro al corazón",
  "perforacion_total": "Perforación total",
  "disparo_letal": "Disparo letal",
  "ojo_de_aguila": "Ojo de águila",
  "pulso_estable": "Pulso estable",
  "llamada_salvaje": "Llamada salvaje",
  "trampa_de_raices": "Trampa de raíces",
  "caceria_en_manada": "Cacería en manada",
  "vinculo_bestial": "Vínculo bestial",
  "sentidos_agudos": "Sentidos agudos",
  "raices_guardianas": "Raíces guardianas",
  "flecha_verde": "Flecha verde",
  "refugio_del_bosque": "Refugio del bosque",
  "piel_de_roble": "Piel de roble",
  "viaje_silvestre": "Viaje silvestre",
  "marcar_objetivo": "Marcar objetivo",
  "flecha_perseguidora": "Flecha perseguidora",
  "emboscada_final": "Emboscada final",
  "rastreo_experto": "Rastreo experto",
  "paso_del_cazador": "Paso del cazador",
  "lanza_arcana": "Lanza arcana",
  "explosion_elemental": "Explosión elemental",
  "cataclismo": "Cataclismo",
  "nucleo_arcano": "Núcleo arcano",
  "reserva_infinita": "Recuperación profunda",
  "esfera_invocada": "Esfera invocada",
  "sellos_paralelos": "Sellos paralelos",
  "convergencia": "Convergencia",
  "familiar_arcano": "Familiar arcano",
  "vinculo_elemental": "Vínculo elemental",
  "toque_funebre": "Toque fúnebre",
  "plaga_oscura": "Plaga oscura",
  "ejercito_de_sombras": "Ejército de sombras",
  "manto_funebre": "Manto fúnebre",
  "alma_persistente": "Alma persistente",
  "cadena_infernal": "Cadena infernal",
  "pacto_de_sangre": "Pacto de sangre",
  "abismo": "Abismo",
  "pacto_menor": "Pacto menor",
  "corazon_infernal": "Corazón infernal",
  "berserker_ataque": "Hachazo sangrante",
  "berserker_tactica": "Furia desatada",
  "berserker_avanzada": "Hacha desbocada",
  "berserker_pasiva": "Corazón indómito",
  "berserker_maestria": "Maestría de riesgo",
  "luchador_ataque": "Puño firme",
  "luchador_tactica": "Guardia del luchador",
  "luchador_avanzada": "Golpe al centro",
  "luchador_pasiva": "Fondo físico",
  "luchador_maestria": "Maestría de contacto",
  "centinela_ataque": "Empuje de frontera",
  "centinela_tactica": "Cubrir la frontera",
  "centinela_avanzada": "Barrido de frontera",
  "centinela_pasiva": "Vigilancia",
  "centinela_maestria": "Maestría de frontera",
  "escriba_arcano_ataque": "Sello debilitante",
  "escriba_arcano_tactica": "Glifo de concentración",
  "escriba_arcano_avanzada": "Inscripción abrasiva",
  "escriba_arcano_pasiva": "Lectura profunda",
  "escriba_arcano_maestria": "Maestría de escritura",
  "bardo_ataque": "Nota discordante",
  "bardo_tactica": "Compás de marcha",
  "bardo_avanzada": "Balada reparadora",
  "bardo_pasiva": "Respiración del cantor",
  "bardo_maestria": "Maestría de interpretación",
  "comerciante_ataque": "Golpe de oportunidad",
  "comerciante_tactica": "Suministros de viaje",
  "comerciante_avanzada": "Distraer al bandido",
  "comerciante_pasiva": "Preparación del mercader",
  "comerciante_maestria": "Maestría de intendencia",
  "chaman_ataque": "Hacha de tormenta",
  "chaman_tactica": "Bendición tribal",
  "chaman_avanzada": "Maldición de cenizas",
  "chaman_pasiva": "Vigor ancestral",
  "chaman_maestria": "Maestría totémica",
  "inquisidor_ataque": "Juicio penitente",
  "inquisidor_tactica": "Absolución",
  "inquisidor_avanzada": "Sentencia del inquisidor",
  "inquisidor_pasiva": "Voluntad inquisitorial",
  "inquisidor_maestria": "Maestría de examen",
  "heraldo_guerra_ataque": "Golpe de mando",
  "heraldo_guerra_tactica": "Grito de avance",
  "heraldo_guerra_avanzada": "Sello de concentración",
  "heraldo_guerra_pasiva": "Autoridad",
  "heraldo_guerra_maestria": "Maestría de mando",
  "ninja_ataque": "Corte de sombra",
  "ninja_tactica": "Velo de humo",
  "ninja_avanzada": "Arte de las brasas",
  "ninja_pasiva": "Paso silencioso",
  "ninja_maestria": "Maestría del engaño",
  "alquimista_ataque": "Preparado corrosivo",
  "alquimista_tactica": "Elixir revitalizante",
  "alquimista_avanzada": "Reactivo volátil",
  "alquimista_pasiva": "Dosificación",
  "alquimista_maestria": "Maestría de neutralización",
  "herrero_ataque": "Golpe de forja",
  "herrero_tactica": "Refuerzo de campaña",
  "herrero_avanzada": "Martillo quebrantador",
  "herrero_pasiva": "Temple del acero",
  "herrero_maestria": "Maestría de reparación",
  "verdugo_ataque": "Hacha quebrantadora",
  "verdugo_tactica": "Preparar ejecución",
  "verdugo_avanzada": "Ejecución implacable",
  "verdugo_pasiva": "Fuerza implacable",
  "verdugo_maestria": "Maestría del cadalso",
  "saqueador_ataque": "Desgarro voraz",
  "saqueador_tactica": "Paso de saqueo",
  "saqueador_avanzada": "Cosecha voraz",
  "saqueador_pasiva": "Instinto rapaz",
  "saqueador_maestria": "Maestría del despojo",
  "campeon_arena_ataque": "Puño del campeón",
  "campeon_arena_tactica": "Segundo aliento",
  "campeon_arena_avanzada": "Romper el cerco",
  "campeon_arena_pasiva": "Resistencia de arena",
  "campeon_arena_maestria": "Maestría del duelo largo",
  "mariscal_ataque": "Lanza de contención",
  "mariscal_tactica": "Formación defensiva",
  "mariscal_avanzada": "Estocada de mando",
  "mariscal_pasiva": "Disciplina de mando",
  "mariscal_maestria": "Maestría de coordinación",
  "vigia_ataque": "Disparo de vigilancia",
  "vigia_tactica": "Posición ventajosa",
  "vigia_avanzada": "Salva de frontera",
  "vigia_pasiva": "Ojo de frontera",
  "vigia_maestria": "Maestría de observación",
  "runista_ataque": "Sello abrasador",
  "runista_tactica": "Inscripción de poder",
  "runista_avanzada": "Círculo de ruptura",
  "runista_pasiva": "Tinta arcana",
  "runista_maestria": "Maestría de circuitos",
  "abjurador_ataque": "Pulso de rechazo",
  "abjurador_tactica": "Barrera de negación",
  "abjurador_avanzada": "Disipación hostil",
  "abjurador_pasiva": "Conocimiento protector",
  "abjurador_maestria": "Maestría de negación",
  "senor_guerra_ataque": "Ruptura de línea",
  "senor_guerra_tactica": "Orden de conquista",
  "senor_guerra_avanzada": "Asalto del caudillo",
  "senor_guerra_pasiva": "Presencia del caudillo",
  "senor_guerra_maestria": "Maestría de frentes",
  "avatar_tormenta_ataque": "Puño de la tormenta",
  "avatar_tormenta_tactica": "Canalizar la tempestad",
  "avatar_tormenta_avanzada": "Convergencia del trueno",
  "avatar_tormenta_pasiva": "Equilibrio elemental",
  "avatar_tormenta_maestria": "Maestría de canalización",
  "cazador_espectral_ataque": "Flecha espectral",
  "cazador_espectral_tactica": "Acecho funerario",
  "cazador_espectral_avanzada": "Lluvia de ánimas",
  "cazador_espectral_pasiva": "Ojo del más allá",
  "cazador_espectral_maestria": "Maestría del vínculo",
  "arconte_ataque": "Convergencia sagrada",
  "arconte_tactica": "Luz del arconte",
  "arconte_avanzada": "Mandato celestial",
  "arconte_pasiva": "Gracia arcana",
  "arconte_maestria": "Maestría de concordia",
  "justiciero_ataque": "Puño de justicia",
  "justiciero_tactica": "Amparo del justo",
  "justiciero_avanzada": "Veredicto sagrado",
  "justiciero_pasiva": "Convicción",
  "justiciero_maestria": "Maestría de reparación",
  "hoja_velo_ataque": "Corte del velo",
  "hoja_velo_tactica": "Filo entre mundos",
  "hoja_velo_avanzada": "Ruptura entre mundos",
  "hoja_velo_pasiva": "Acero del velo",
  "hoja_velo_maestria": "Maestría de tránsito",
  "danzaespadas_ataque": "Danza cortante",
  "danzaespadas_tactica": "Danza de la victoria",
  "danzaespadas_avanzada": "Último compás",
  "danzaespadas_pasiva": "Gracia del acero",
  "danzaespadas_maestria": "Maestría del compás",
  "corsario_ataque": "Abordaje",
  "corsario_tactica": "Maniobra de escape",
  "corsario_avanzada": "Salva de abordaje",
  "corsario_pasiva": "Veterano del abordaje",
  "corsario_maestria": "Maestría de incursión"
};

// Técnicas adicionales de cada profesión.
/** Catálogo explícito de la técnica adicional de cada clase. */
export const CATALOGO_TECNICAS_ADICIONALES = {
  "novato": {
    "nombre": "Evaluar el peligro",
    "descripcion": "Observa una preparación enemiga y prepara precisión para un ataque; no roba un turno.",
    "programa": "observar"
  },
  "espadachin": {
    "nombre": "Cambio de empuñadura",
    "descripcion": "Sacrifica una guardia propia para preparar Apertura sin golpear al enemigo.",
    "programa": "guardia_apertura"
  },
  "acolito": {
    "nombre": "Recogimiento",
    "descripcion": "Transfiere parte de tu regeneración pendiente a un aliado sin duplicar sus pulsos.",
    "programa": "transferir_regeneracion"
  },
  "arquero": {
    "nombre": "Disparo de señal",
    "descripcion": "Marca al objetivo para que un aliado aproveche una exposición breve, en vez de aumentar tu daño inmediato.",
    "programa": "senal"
  },
  "mago": {
    "nombre": "Disipar chispa",
    "descripcion": "Consume una brasa propia sobre el objetivo para romper parte de una protección mágica.",
    "programa": "brasa_ruptura"
  },
  "superNovato": {
    "nombre": "Cambiar de lección",
    "descripcion": "Consume una preparación propia para cambiar de posición y preparar la siguiente disciplina; no copia otra habilidad.",
    "programa": "leccion_movilidad"
  },
  "caballero": {
    "nombre": "Relevo de escudo",
    "descripcion": "Transfiere la mitad de tu protección restante al aliado elegido conservando su expiración.",
    "programa": "transferir_guardia"
  },
  "duelista": {
    "nombre": "Desafío medido",
    "descripcion": "Debilita una preparación rival y prepara una lectura para tu siguiente respuesta.",
    "programa": "lectura"
  },
  "sacerdote": {
    "nombre": "Cerrar la herida",
    "descripcion": "Adelanta un pulso de tu regeneración sobre el aliado y elimina una herida; el pulso adelantado desaparece del futuro.",
    "programa": "cerrar_herida"
  },
  "monje": {
    "nombre": "Soltar tensión",
    "descripcion": "Consume una preparación de chi para limpiar una exposición propia; sin chi conserva una guardia menor.",
    "programa": "soltar_chi"
  },
  "cazador": {
    "nombre": "Cambiar de presa",
    "descripcion": "Traslada tu marca a otro enemigo y reduce una preparación del nuevo objetivo; no deja dos presas.",
    "programa": "cambiar_presa"
  },
  "explorador": {
    "nombre": "Rastro falso",
    "descripcion": "Retirada hacia retaguardia que prepara una resistencia breve a las marcas enemigas.",
    "programa": "rastro_falso"
  },
  "elementalista": {
    "nombre": "Templar elemento",
    "descripcion": "Aplica mojado sin daño para preparar una reacción; sustituye la preparación elemental anterior.",
    "programa": "mojado"
  },
  "brujo": {
    "nombre": "Romper maleficio",
    "descripcion": "Consume una maldición propia para adelantar un pulso de su herida; renuncia al mantenimiento restante de esa maldición.",
    "programa": "romper_maleficio"
  },
  "cruzado": {
    "nombre": "Reconciliación",
    "descripcion": "Consume tu guardia para recuperar vida del aliado elegido dentro del presupuesto sacrificado.",
    "programa": "guardia_cura"
  },
  "pirata": {
    "nombre": "Botín de combate",
    "descripcion": "Roba una parte de la protección numérica rival; dura como máximo dos turnos y no crea objetos.",
    "programa": "robar_guardia"
  },
  "druida": {
    "nombre": "Trasplantar",
    "descripcion": "Mueve parte de tu regeneración a un aliado conservando duración; no crea otro ciclo de crecimiento.",
    "programa": "trasplantar"
  },
  "espadachin_runico": {
    "nombre": "Borrar la runa",
    "descripcion": "Consume una inscripción propia para retirarte y resistir una respuesta mágica.",
    "programa": "borrar_runa"
  },
  "paladin": {
    "nombre": "Renovar el voto",
    "descripcion": "Cambia el destinatario de custodia y le prepara resistencia sagrada; termina el vínculo anterior.",
    "programa": "renovar_voto"
  },
  "guardian_real": {
    "nombre": "Evacuación",
    "descripcion": "Vincula al aliado con tu custodia y prepara tu retirada a la fila central; no concede iniciativa.",
    "programa": "evacuacion"
  },
  "asesino": {
    "nombre": "Cortar la retirada",
    "descripcion": "Consume una marca propia para debilitar la preparación enemiga; pierde esa oportunidad de ejecución.",
    "programa": "cortar_retirada"
  },
  "maestro_espadas": {
    "nombre": "Recomponer la forma",
    "descripcion": "Limpia una exposición propia y prepara la forma defensiva, renunciando a continuar la secuencia ofensiva.",
    "programa": "recomponer_forma"
  },
  "oraculo": {
    "nombre": "Revisar el augurio",
    "descripcion": "Cambia una predicción por resistencia al siguiente perjuicio; no añade otra predicción simultánea.",
    "programa": "revisar_augurio"
  },
  "hierofante": {
    "nombre": "Clausura piadosa",
    "descripcion": "Consume un campo propio para adelantar la regeneración del aliado; el campo no vuelve a pulsar.",
    "programa": "clausura"
  },
  "asceta": {
    "nombre": "Paso vacío",
    "descripcion": "Retirada que elimina una exposición propia; gastar energía no genera otra recuperación.",
    "programa": "paso_vacio"
  },
  "gran_maestro": {
    "nombre": "Deshacer la forma",
    "descripcion": "Consume la preparación de forma para transformar su presupuesto en protección breve.",
    "programa": "deshacer_forma"
  },
  "francotirador": {
    "nombre": "Abandonar la mira",
    "descripcion": "Renuncia a la preparación de tiro para cambiar a retaguardia y conseguir una cobertura menor.",
    "programa": "abandonar_mira"
  },
  "domabestias": {
    "nombre": "Llamada de refugio",
    "descripcion": "El acompañante dedica su único pulso del ciclo a proteger al destinatario; no ataca también.",
    "programa": "orden_amparo"
  },
  "guardian_bosque": {
    "nombre": "Sendero protegido",
    "descripcion": "Traslada parte de tu protección a un aliado y prepara una resistencia natural breve.",
    "programa": "sendero"
  },
  "rastreador": {
    "nombre": "Invalidar el rastro",
    "descripcion": "Consume tu observación para reducir una preparación enemiga; no conserva información para el remate.",
    "programa": "invalidar_rastro"
  },
  "archimago": {
    "nombre": "Descompresión",
    "descripcion": "Consume una carga de compresión para limpiar una exposición propia y estabilizar tu próxima preparación.",
    "programa": "descompresion"
  },
  "invocador": {
    "nombre": "Disolver familiar",
    "descripcion": "Sacrifica el acompañante para curarte con una fracción de su presupuesto futuro; no activa premios por final natural.",
    "programa": "disolver_familiar"
  },
  "nigromante": {
    "nombre": "Descanso prestado",
    "descripcion": "Consume una herida funeraria para estabilizarte; no duplica sus pulsos ni cuenta como muerte.",
    "programa": "descanso"
  },
  "demonologo": {
    "nombre": "Revocar contrato",
    "descripcion": "Termina el pacto y prepara una protección breve; la vida comprometida no se devuelve.",
    "programa": "revocar"
  },
  "berserker": {
    "nombre": "Frenar la furia",
    "descripcion": "Consume la preparación ofensiva y limpia una herida propia para volver a protegerte.",
    "programa": "frenar_furia"
  },
  "luchador": {
    "nombre": "Soltar el agarre",
    "descripcion": "Libera una marca de contacto para limpiar una exposición propia y preparar resistencia física.",
    "programa": "soltar_agarre"
  },
  "centinela": {
    "nombre": "Cambiar la vigilancia",
    "descripcion": "Renueva la custodia sobre otro aliado y prepara una señal sobre el siguiente agresor.",
    "programa": "vigilancia"
  },
  "escriba_arcano": {
    "nombre": "Corrección marginal",
    "descripcion": "Retira un sello propio y prepara otro sobre un destinatario distinto; conserva solo el enlace, no su daño.",
    "programa": "correccion"
  },
  "bardo": {
    "nombre": "Silencio entre versos",
    "descripcion": "Cierra la melodía propia para limpiar una exposición de un aliado; no mantiene la canción completa.",
    "programa": "silencio"
  },
  "comerciante": {
    "nombre": "Reserva de emergencia",
    "descripcion": "Consume el suministro preparado para una protección breve; no devuelve consumibles ni produce oro.",
    "programa": "suministro_guardia"
  },
  "chaman": {
    "nombre": "Desanclar tótem",
    "descripcion": "Sacrifica tu campo para protegerte durante la retirada; no crea un segundo tótem.",
    "programa": "desanclar"
  },
  "inquisidor": {
    "nombre": "Archivar testimonio",
    "descripcion": "Consume un testimonio para limpiar una exposición aliada y resistir su siguiente aplicación.",
    "programa": "archivar"
  },
  "heraldo_guerra": {
    "nombre": "Contraorden",
    "descripcion": "Consume una orden propia y prepara cobertura en su lugar; no mantiene las dos órdenes.",
    "programa": "contraorden"
  },
  "ninja": {
    "nombre": "Recoger el señuelo",
    "descripcion": "Retira tu señuelo para limpiar una marca enemiga y volver a retaguardia; pierde el engaño ofensivo.",
    "programa": "recoger_senuelo"
  },
  "alquimista": {
    "nombre": "Neutralización",
    "descripcion": "Retira una herida de un aliado y deja resistencia a su siguiente aplicación; no genera reactivo de daño.",
    "programa": "neutralizar"
  },
  "herrero": {
    "nombre": "Desmontar refuerzo",
    "descripcion": "Consume un refuerzo propio para reparar parcialmente tu guardia; no mejora equipo fuera del combate.",
    "programa": "desmontar"
  },
  "verdugo": {
    "nombre": "Suspender sentencia",
    "descripcion": "Renuncia a la ejecución preparada para defenderte y limpiar una exposición propia.",
    "programa": "suspender"
  },
  "saqueador": {
    "nombre": "Cauterizar",
    "descripcion": "Consume una herida propia del enemigo para recuperar parte de su presupuesto; desaparece toda su duración futura.",
    "programa": "cauterizar"
  },
  "campeon_arena": {
    "nombre": "Romper el clinch",
    "descripcion": "Consume adaptación para eliminar una marca propia y reposicionarte en la fila central.",
    "programa": "romper_clinch"
  },
  "mariscal": {
    "nombre": "Disolver formación",
    "descripcion": "Cierra la formación ofensiva y prepara un vínculo de custodia sin añadir una acción de grupo.",
    "programa": "disolver_formacion"
  },
  "vigia": {
    "nombre": "Ceder la ventana",
    "descripcion": "Consume la preparación de respuesta para proteger a un aliado en vez de disparar.",
    "programa": "ceder_ventana"
  },
  "runista": {
    "nombre": "Circuito abierto",
    "descripcion": "Retira un sello propio para preparar resistencia arcana en un aliado; renuncia a cerrarlo como daño.",
    "programa": "circuito_abierto"
  },
  "abjurador": {
    "nombre": "Descargar barrera",
    "descripcion": "Transfiere parte de tu protección a un aliado; la porción transferida desaparece del lanzador.",
    "programa": "descargar_barrera"
  },
  "senor_guerra": {
    "nombre": "Cerrar el frente",
    "descripcion": "Termina la preparación ofensiva y prepara custodia sobre un aliado; el frente deja de ofrecer ruptura.",
    "programa": "cerrar_frente"
  },
  "avatar_tormenta": {
    "nombre": "Disipar tempestad",
    "descripcion": "Consume el campo de tempestad y limpia una exposición propia; pierde todos los pulsos futuros.",
    "programa": "disipar_tempestad"
  },
  "cazador_espectral": {
    "nombre": "Liberar vínculo",
    "descripcion": "Termina tu vínculo funerario y adelanta una regeneración propia; no drena hacia dos destinatarios.",
    "programa": "liberar_vinculo"
  },
  "arconte": {
    "nombre": "Redistribuir santuario",
    "descripcion": "Mueve parte de tu protección acumulada a un aliado manteniendo el presupuesto total de Luz.",
    "programa": "redistribuir"
  },
  "justiciero": {
    "nombre": "Saldar agravio",
    "descripcion": "Consume la deuda preparada para proteger al perjudicado en vez de infligir represalia.",
    "programa": "saldar"
  },
  "hoja_velo": {
    "nombre": "Anclar al mundo",
    "descripcion": "Cierra el Velo y limpia una exposición propia; pierde el acceso a la retaguardia durante esa ventana.",
    "programa": "anclar"
  },
  "danzaespadas": {
    "nombre": "Romper el compás",
    "descripcion": "Renuncia al compás para trasladar protección a un aliado y volver a la fila central.",
    "programa": "romper_compas"
  },
  "corsario": {
    "nombre": "Abandonar abordaje",
    "descripcion": "Consume el plan de incursión para preparar una retirada protegida; no conserva sus etapas de daño.",
    "programa": "abandonar_abordaje"
  }
} as const;
