import type { DefinicionHabilidad } from "./tiposJuego";
import { puedeUsarHabilidadDeClase } from "./progresion/clases";
import { HABILIDADES_NUEVAS } from "./habilidades-nuevas";

type EntradaHabilidad = Omit<DefinicionHabilidad, "rareza" | "precio" | "costePuntosHabilidad"> &
  Partial<Pick<DefinicionHabilidad, "rareza" | "precio" | "costePuntosHabilidad">>;

function habilidad(datos: EntradaHabilidad): DefinicionHabilidad {
  return { rareza: "basico", precio: 0, costePuntosHabilidad: 1, ...datos };
}

/** Habilidades profesionales de Job. Las clases avanzadas heredan las de sus antecesoras. */
export const HABILIDADES: DefinicionHabilidad[] = [
  ...HABILIDADES_NUEVAS,
  // NOVATO
  habilidad({
    id: "golpe_apresurado", claseId: "novato", nivelJobRequerido: 1,
    nombre: "Golpe apresurado", descripcion: "Un ataque sencillo y fiable.",
    tipo: "activa", efecto: "dano", animacion: "ofensiva", multiplicadorDano: 1.2,
    costeEnergia: 4, cooldownTurnos: 2,
  }),
  habilidad({
    id: "primeros_auxilios", claseId: "novato", nivelJobRequerido: 3,
    nombre: "Primeros Auxilios", descripcion: "Cura un 15 % de la vida máxima y un 15 % adicional repartido en los dos turnos siguientes.",
    tipo: "activa", efecto: "curacion", animacion: "curacion", curacionPorcentaje: 0.15,
    duracionTurnos: 2,
    estadosSecundarios: [{ tipo: "curacion_progresiva", valor: 0.075, duracionTurnos: 2, objetivo: "jugador" }],
    costeEnergia: 4, cooldownTurnos: 5,
  }),
  habilidad({
    id: "guardia_improvisada", claseId: "novato", nivelJobRequerido: 5,
    nombre: "Guardia improvisada", descripcion: "Aumenta la defensa un 8 % durante 4 turnos.",
    tipo: "activa", efecto: "bonus_defensa", animacion: "defensiva", bonusDefensaPorcentaje: 0.08,
    duracionTurnos: 4, costeEnergia: 5, cooldownTurnos: 4,
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
    costeEnergia: 5, cooldownTurnos: 2,
  }),
  habilidad({
    id: "tajo_sangrante", claseId: "espadachin", nivelJobRequerido: 10,
    nombre: "Tajo sangrante", descripcion: "Inflige daño y provoca sangrado durante 2 turnos.",
    tipo: "activa", efecto: "dano", animacion: "ofensiva_potenciada", multiplicadorDano: 1.05,
    danoProgresivoPorcentaje: 0.25, duracionTurnos: 2, costeEnergia: 7, cooldownTurnos: 3,
  }),
  habilidad({
    id: "rompeguardia", claseId: "espadachin", nivelJobRequerido: 20,
    nombre: "Rompeguardia", descripcion: "Inflige daño y reduce la defensa enemiga un 15 % durante 2 turnos.",
    tipo: "activa", efecto: "dano", animacion: "ofensiva_potenciada", multiplicadorDano: 1.1,
    estadosSecundarios: [{ tipo: "debuff_defensa", valor: 0.15, duracionTurnos: 2, objetivo: "enemigo" }],
    costeEnergia: 8, cooldownTurnos: 4,
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
    costeMana: 6, cooldownTurnos: 3,
  }),
  habilidad({
    id: "rejuvenecer", claseId: "acolito", nivelJobRequerido: 10,
    nombre: "Rejuvenecer", descripcion: "Restaura un 8 % de la vida máxima por turno durante 3 turnos.",
    tipo: "activa", efecto: "curacion_progresiva", animacion: "curacion",
    curacionProgresivaPorcentaje: 0.08, duracionTurnos: 3, costeMana: 7, cooldownTurnos: 4,
  }),
  habilidad({
    id: "golpe_consagrado", claseId: "acolito", nivelJobRequerido: 20, tipoDano: "magico",
    nombre: "Golpe consagrado", descripcion: "Inflige daño mágico y restaura un 15 % del daño efectivo como vida.",
    tipo: "activa", efecto: "dano", animacion: "ofensiva_potenciada", multiplicadorDano: 1.25,
    roboVida: 0.15, costeMana: 7, cooldownTurnos: 3,
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
    probabilidadCritico: 0.1, costeEnergia: 5, cooldownTurnos: 2,
  }),
  habilidad({
    id: "flecha_penetrante",
    presentacionVisual: {"modo":"proyectil","proyectil":"flecha","elemento":"fisico","impacto":"golpe"},
    claseId: "arquero", nivelJobRequerido: 10,
    nombre: "Flecha penetrante", descripcion: "Inflige daño y reduce la defensa enemiga un 12 % durante 2 turnos.",
    tipo: "activa", efecto: "dano", animacion: "ofensiva_potenciada", multiplicadorDano: 1.2,
    estadosSecundarios: [{ tipo: "debuff_defensa", valor: 0.12, duracionTurnos: 2, objetivo: "enemigo" }],
    costeEnergia: 7, cooldownTurnos: 3,
  }),
  habilidad({
    id: "tiro_oportunidad",
    presentacionVisual: {"modo":"proyectil","proyectil":"flecha","elemento":"fisico","impacto":"golpe"},
    claseId: "arquero", nivelJobRequerido: 20,
    nombre: "Tiro de oportunidad", descripcion: "Un disparo moderado con un 25 % adicional de probabilidad crítica.",
    tipo: "activa", efecto: "dano", animacion: "ofensiva_potenciada", multiplicadorDano: 1.1,
    probabilidadCritico: 0.25, costeEnergia: 7, cooldownTurnos: 3,
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
    costeMana: 7, cooldownTurnos: 2,
  }),
  habilidad({
    id: "bola_fuego",
    presentacionVisual: {"modo":"proyectil","proyectil":"bola_fuego","elemento":"fuego","impacto":"explosion"},
    objetivo: { equipo: "enemigo", patron: "adyacentes" },
    claseId: "mago", nivelJobRequerido: 10, tipoDano: "magico",
    nombre: "Bola de fuego", descripcion: "La explosión daña al objetivo y a los enemigos adyacentes y aplica quemadura durante 2 turnos.",
    tipo: "activa", efecto: "dano", animacion: "ofensiva_potenciada", multiplicadorDano: 1.2,
    danoProgresivoPorcentaje: 0.25, duracionTurnos: 2, costeMana: 10, cooldownTurnos: 3,
  }),
  habilidad({
    id: "concentracion_arcana", claseId: "mago", nivelJobRequerido: 20,
    nombre: "Concentración arcana", descripcion: "Aumenta el ataque mágico un 25 % durante 5 turnos.",
    tipo: "activa", efecto: "bonus_ataque_magico", animacion: "defensiva",
    estadosSecundarios: [{ tipo: "bonus_ataque_magico", valor: 0.25, duracionTurnos: 5, objetivo: "jugador" }],
    costeMana: 7, cooldownTurnos: 4,
  }),
  habilidad({
    id: "reserva_arcana", claseId: "mago", nivelJobRequerido: 20,
    nombre: "Reserva arcana", descripcion: "Aumenta el Maná máximo en 100 puntos.",
    tipo: "pasiva", bonusManaMaximo: 100,
  }),

  // CABALLERO
  habilidad({
    id: "guardia_caballero", claseId: "caballero", nivelJobRequerido: 1,
    nombre: "Guardia del Caballero", descripcion: "Aumenta la defensa un 12 % durante 3 turnos.",
    tipo: "activa", efecto: "bonus_defensa", animacion: "defensiva", bonusDefensaPorcentaje: 0.12,
    duracionTurnos: 3, costeEnergia: 8, cooldownTurnos: 4,
  }),
  habilidad({
    id: "provocacion", claseId: "caballero", nivelJobRequerido: 15,
    nombre: "Provocación", descripcion: "Inflige daño y reduce el ataque enemigo un 12 % durante 2 turnos.",
    tipo: "activa", efecto: "dano", animacion: "ofensiva", multiplicadorDano: 0.9,
    estadosSecundarios: [{ tipo: "debuff_ataque", valor: 0.12, duracionTurnos: 2, objetivo: "enemigo" }],
    costeEnergia: 7, cooldownTurnos: 4,
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
    costeEnergia: 7, cooldownTurnos: 3,
  }),
  habilidad({
    id: "corte_final", claseId: "duelista", nivelJobRequerido: 15,
    nombre: "Corte final", descripcion: "Un golpe potente que inflige daño aumentado.",
    tipo: "activa", efecto: "dano", animacion: "ofensiva_potenciada", multiplicadorDano: 1.65,
    costeEnergia: 10, cooldownTurnos: 4,
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
    costeMana: 10, cooldownTurnos: 4,
  }),
  habilidad({
    id: "purificacion", claseId: "sacerdote", nivelJobRequerido: 15,
    nombre: "Purificación", descripcion: "Cura un 8 % de la vida máxima y elimina estados negativos.",
    tipo: "activa", efecto: "curacion", animacion: "curacion", curacionPorcentaje: 0.08,
    limpiarEstadosNegativos: true, costeMana: 8, cooldownTurnos: 3,
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
    costeEnergia: 6, cooldownTurnos: 2,
  }),
  habilidad({
    id: "respiracion_interior", claseId: "monje", nivelJobRequerido: 15,
    nombre: "Respiración interior", descripcion: "Recupera 8 de Energía y aumenta la defensa un 10 % durante 2 turnos.",
    tipo: "activa", efecto: "bonus_defensa", animacion: "defensiva", bonusDefensaPorcentaje: 0.1,
    duracionTurnos: 2, recuperarEnergia: 8, costeEnergia: 0, cooldownTurnos: 5,
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
    costeEnergia: 7, cooldownTurnos: 4,
  }),
  habilidad({
    id: "flecha_mortal",
    presentacionVisual: {"modo":"proyectil","proyectil":"flecha","elemento":"fisico","impacto":"golpe"},
    claseId: "cazador", nivelJobRequerido: 15,
    nombre: "Flecha mortal", descripcion: "Un disparo de daño elevado con una bonificación crítica.",
    tipo: "activa", efecto: "dano", animacion: "ofensiva_potenciada", multiplicadorDano: 1.55,
    probabilidadCritico: 0.1, costeEnergia: 9, cooldownTurnos: 4,
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
    costeEnergia: 6, cooldownTurnos: 3,
  }),
  habilidad({
    id: "trampa_cegadora", claseId: "explorador", nivelJobRequerido: 15,
    nombre: "Trampa cegadora", descripcion: "Inflige daño y reduce la precisión enemiga en 10 puntos durante 2 turnos.",
    tipo: "activa", efecto: "dano", animacion: "ofensiva", multiplicadorDano: 0.9,
    estadosSecundarios: [{ tipo: "debuff_precision", valor: 10, duracionTurnos: 2, objetivo: "enemigo" }],
    costeEnergia: 6, cooldownTurnos: 4,
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
    costeMana: 12, cooldownTurnos: 3,
  }),
  habilidad({
    id: "sello_elemental", claseId: "elementalista", nivelJobRequerido: 15, tipoDano: "magico",
    nombre: "Sello elemental", descripcion: "Inflige daño mágico y reduce la defensa enemiga un 15 % durante 2 turnos.",
    tipo: "activa", efecto: "dano", animacion: "ofensiva", multiplicadorDano: 0.95,
    estadosSecundarios: [{ tipo: "debuff_defensa", valor: 0.15, duracionTurnos: 2, objetivo: "enemigo" }],
    costeMana: 9, cooldownTurnos: 4,
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
    roboVida: 0.2, costeMana: 8, cooldownTurnos: 3,
  }),
  habilidad({
    id: "maldicion_debilitante", claseId: "brujo", nivelJobRequerido: 15, tipoDano: "magico",
    nombre: "Maldición debilitante", descripcion: "Reduce el ataque enemigo un 12 % y su defensa un 10 % durante 2 turnos.",
    tipo: "activa", efecto: "dano", animacion: "ofensiva", multiplicadorDano: 0.65,
    estadosSecundarios: [
      { tipo: "debuff_ataque", valor: 0.12, duracionTurnos: 2, objetivo: "enemigo" },
      { tipo: "debuff_defensa", valor: 0.1, duracionTurnos: 2, objetivo: "enemigo" },
    ],
    costeMana: 10, cooldownTurnos: 4,
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
    costeEnergia: 8, costeMana: 4, cooldownTurnos: 3,
  }),
  habilidad({
    id: "voto_protector", claseId: "cruzado", nivelJobRequerido: 15,
    nombre: "Voto protector", descripcion: "Cura un 12 % de la vida máxima y aumenta la defensa un 10 % durante 2 turnos.",
    tipo: "activa", efecto: "curacion", animacion: "curacion", curacionPorcentaje: 0.12,
    estadosSecundarios: [{ tipo: "bonus_defensa", valor: 0.1, duracionTurnos: 2, objetivo: "jugador" }],
    costeEnergia: 4, costeMana: 6, cooldownTurnos: 4,
  }),
  habilidad({
    id: "juicio_sagrado", claseId: "cruzado", nivelJobRequerido: 25, tipoDano: "hibrido",
    nombre: "Juicio sagrado", descripcion: "Inflige daño híbrido y reduce el ataque enemigo un 8 % durante 2 turnos.",
    tipo: "activa", efecto: "dano", animacion: "ofensiva_potenciada", multiplicadorDano: 1.25,
    estadosSecundarios: [{ tipo: "debuff_ataque", valor: 0.08, duracionTurnos: 2, objetivo: "enemigo" }],
    costeEnergia: 6, costeMana: 6, cooldownTurnos: 4,
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
  habilidad({"claseId":"caballero","id":"baluarte_acero","nivelJobRequerido":30,"nombre":"Baluarte de acero","descripcion":"Refuerza la defensa un 18 % durante 3 turnos.","tipo":"activa","efecto":"bonus_defensa","animacion":"defensiva","bonusDefensaPorcentaje":0.18,"duracionTurnos":3,"costeEnergia":9,"cooldownTurnos":5}),
  habilidad({"claseId":"caballero","id":"veterania_caballero","nivelJobRequerido":40,"nombre":"Veteranía del Caballero","descripcion":"Aumenta la vida máxima en 12 puntos.","tipo":"pasiva","bonusHpMaximo":12}),
  habilidad({"claseId":"duelista","id":"danza_hojas","nivelJobRequerido":30,"nombre":"Danza de hojas","descripcion":"Una secuencia rápida que aumenta la evasión durante 2 turnos.","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":1.15,"costeEnergia":8,"cooldownTurnos":4,"estadosSecundarios":[{"tipo":"bonus_evasion","valor":0.1,"duracionTurnos":2,"objetivo":"jugador"}]}),
  habilidad({"claseId":"duelista","id":"mano_firme_duelista","nivelJobRequerido":40,"nombre":"Mano firme","descripcion":"Aumenta la probabilidad de crítico en 3 puntos porcentuales.","tipo":"pasiva","probabilidadCritico":0.03}),
  habilidad({"claseId":"sacerdote","id":"castigo_sagrado","nivelJobRequerido":30,"nombre":"Castigo sagrado","descripcion":"Descarga daño sagrado y reduce el ataque enemigo un 8 % durante 2 turnos.","tipoDano":"magico","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":1.25,"costeMana":11,"cooldownTurnos":4,"estadosSecundarios":[{"tipo":"debuff_ataque","valor":0.08,"duracionTurnos":2,"objetivo":"enemigo"}]}),
  habilidad({"claseId":"sacerdote","id":"luz_persistente","nivelJobRequerido":40,"nombre":"Luz persistente","descripcion":"Aumenta la regeneración de Maná en 1 punto por turno.","tipo":"pasiva","bonusRegeneracionMana":1}),
  habilidad({"claseId":"monje","id":"onda_chi","nivelJobRequerido":30,"nombre":"Onda chi","descripcion":"Libera una onda de energía marcial que debilita el ataque enemigo.","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":1.25,"costeEnergia":9,"cooldownTurnos":4,"estadosSecundarios":[{"tipo":"debuff_ataque","valor":0.1,"duracionTurnos":2,"objetivo":"enemigo"}]}),
  habilidad({"claseId":"monje","id":"mente_calmada","nivelJobRequerido":40,"nombre":"Mente calmada","descripcion":"Aumenta la regeneración de Energía en 1 punto por turno.","tipo":"pasiva","bonusRegeneracionEnergia":1}),
  habilidad({"claseId":"cazador","id":"disparo_triple","nivelJobRequerido":30,"nombre":"Disparo triple","descripcion":"Tres impactos precisos en una sola acción.","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":1.45,"costeEnergia":10,"cooldownTurnos":4,"probabilidadCritico":0.08}),
  habilidad({"claseId":"cazador","id":"piel_rastreador","nivelJobRequerido":40,"nombre":"Piel de rastreador","descripcion":"Aumenta la precisión en 4 puntos.","tipo":"pasiva","bonusPrecision":4}),
  habilidad({"claseId":"explorador","id":"paso_sombra","nivelJobRequerido":30,"nombre":"Paso de sombra","descripcion":"Un ataque desde un ángulo inesperado aumenta la evasión.","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":1.15,"costeEnergia":8,"cooldownTurnos":4,"estadosSecundarios":[{"tipo":"bonus_evasion","valor":0.12,"duracionTurnos":2,"objetivo":"jugador"}]}),
  habilidad({"claseId":"explorador","id":"supervivencia_explorador","nivelJobRequerido":40,"nombre":"Supervivencia","descripcion":"Aumenta la evasión en 3 puntos porcentuales.","tipo":"pasiva","bonusEvasion":0.03}),
  habilidad({"claseId":"elementalista","id":"tormenta_elemental","nivelJobRequerido":30,"nombre":"Tormenta elemental","descripcion":"Una ráfaga de energía elemental golpea con gran potencia.","tipoDano":"magico","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":1.55,"costeMana":13,"cooldownTurnos":4,"estadosSecundarios":[{"tipo":"debuff_defensa","valor":0.08,"duracionTurnos":2,"objetivo":"enemigo"}]}),
  habilidad({"claseId":"elementalista","id":"corazon_elemental","nivelJobRequerido":40,"nombre":"Corazón elemental","descripcion":"Aumenta el Maná máximo en 8 puntos.","tipo":"pasiva","bonusManaMaximo":8}),
  habilidad({"claseId":"brujo","id":"peste_maldita","nivelJobRequerido":30,"nombre":"Peste maldita","descripcion":"Inflige daño y aplica daño progresivo durante 3 turnos.","tipoDano":"magico","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":0.9,"costeMana":12,"cooldownTurnos":5,"danoProgresivoPorcentaje":0.18,"duracionTurnos":3,"estadosSecundarios":[{"tipo":"debuff_ataque","valor":0.08,"duracionTurnos":2,"objetivo":"enemigo"}]}),
  habilidad({"claseId":"brujo","id":"eco_maldito","nivelJobRequerido":40,"nombre":"Eco maldito","descripcion":"Aumenta la regeneración de Maná en 1 punto por turno.","tipo":"pasiva","bonusRegeneracionMana":1}),
  habilidad({"claseId":"cruzado","id":"aura_cruzada","nivelJobRequerido":45,"nombre":"Aura cruzada","descripcion":"Aumenta la defensa mágica en 3 puntos.","tipo":"pasiva","bonusDefensaMagica":3}),
  habilidad({"claseId":"pirata","id":"abordaje_feroz","nivelJobRequerido":1,"nombre":"Abordaje feroz","descripcion":"Un golpe brutal que provoca sangrado durante 2 turnos.","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":1.25,"costeEnergia":8,"cooldownTurnos":3,"danoProgresivoPorcentaje":0.16,"duracionTurnos":2}),
  habilidad({"claseId":"pirata","id":"bomba_humo","nivelJobRequerido":20,"nombre":"Bomba de humo","descripcion":"Daña y reduce la precisión enemiga durante 2 turnos.","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":0.85,"costeEnergia":7,"cooldownTurnos":4,"estadosSecundarios":[{"tipo":"debuff_precision","valor":8,"duracionTurnos":2,"objetivo":"enemigo"}]}),
  habilidad({"claseId":"pirata","id":"saqueo_audaz","nivelJobRequerido":40,"nombre":"Saqueo audaz","descripcion":"Un ataque oportunista que mejora la evasión durante 2 turnos.","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":1.3,"costeEnergia":9,"cooldownTurnos":4,"estadosSecundarios":[{"tipo":"bonus_evasion","valor":0.1,"duracionTurnos":2,"objetivo":"jugador"}]}),
  habilidad({"claseId":"pirata","id":"instinto_del_mar","nivelJobRequerido":25,"nombre":"Instinto del mar","descripcion":"Aumenta la evasión en 3 puntos porcentuales.","tipo":"pasiva","bonusEvasion":0.03}),
  habilidad({"claseId":"pirata","id":"botin_pirata","nivelJobRequerido":45,"nombre":"Botín pirata","descripcion":"Aumenta el ataque físico en 3 puntos.","tipo":"pasiva","bonusAtaque":3}),
  habilidad({"claseId":"druida","id":"zarzas_vivas","nivelJobRequerido":1,"nombre":"Zarzas vivas","descripcion":"Las raíces hieren y mantienen un daño progresivo durante 2 turnos.","tipoDano":"magico","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":1.05,"costeMana":8,"cooldownTurnos":3,"danoProgresivoPorcentaje":0.14,"duracionTurnos":2}),
  habilidad({"claseId":"druida","id":"piel_corteza","nivelJobRequerido":20,"nombre":"Piel de corteza","descripcion":"Refuerza la defensa un 15 % durante 3 turnos.","tipo":"activa","efecto":"bonus_defensa","animacion":"defensiva","bonusDefensaPorcentaje":0.15,"duracionTurnos":3,"costeMana":7,"cooldownTurnos":4}),
  habilidad({"claseId":"druida","id":"lluvia_estrellas","nivelJobRequerido":40,"nombre":"Lluvia de estrellas","descripcion":"Invoca una descarga elemental de gran potencia.","tipoDano":"hibrido","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":1.55,"costeMana":12,"cooldownTurnos":4}),
  habilidad({"claseId":"druida","id":"simbiotico","nivelJobRequerido":25,"nombre":"Vínculo simbiótico","descripcion":"Aumenta la vida máxima en 12 puntos.","tipo":"pasiva","bonusHpMaximo":12}),
  habilidad({"claseId":"druida","id":"raices_misticas","nivelJobRequerido":45,"nombre":"Raíces místicas","descripcion":"Aumenta la regeneración de Maná en 1 punto por turno.","tipo":"pasiva","bonusRegeneracionMana":1}),
  habilidad({"claseId":"espadachin_runico","id":"corte_runa","nivelJobRequerido":1,"nombre":"Corte rúnico","descripcion":"Un tajo imbuido que combina acero y magia.","tipoDano":"hibrido","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":1.4,"costeEnergia":6,"costeMana":5,"cooldownTurnos":3}),
  habilidad({"claseId":"espadachin_runico","id":"marca_arcana","nivelJobRequerido":20,"nombre":"Marca arcana","descripcion":"Golpea y reduce la defensa enemiga un 10 % durante 2 turnos.","tipoDano":"magico","tipo":"activa","efecto":"dano","animacion":"ofensiva","multiplicadorDano":0.95,"costeEnergia":4,"costeMana":6,"cooldownTurnos":4,"estadosSecundarios":[{"tipo":"debuff_defensa","valor":0.1,"duracionTurnos":2,"objetivo":"enemigo"}]}),
  habilidad({"claseId":"espadachin_runico","id":"paso_runique","nivelJobRequerido":40,"nombre":"Paso rúnico","descripcion":"Desaparece entre símbolos arcanos y aumenta la evasión durante 2 turnos.","tipo":"activa","efecto":"bonus_defensa","animacion":"defensiva","costeEnergia":4,"costeMana":5,"cooldownTurnos":4,"duracionTurnos":2,"estadosSecundarios":[{"tipo":"bonus_evasion","valor":0.1,"duracionTurnos":2,"objetivo":"jugador"}]}),
  habilidad({"claseId":"espadachin_runico","id":"runas_grabadas","nivelJobRequerido":25,"nombre":"Runas grabadas","descripcion":"Aumenta el ataque mágico en 3 puntos.","tipo":"pasiva","bonusAtaqueMagico":3}),
  habilidad({"claseId":"espadachin_runico","id":"filo_imbuido","nivelJobRequerido":45,"nombre":"Filo imbuido","descripcion":"Aumenta el ataque físico en 2 puntos.","tipo":"pasiva","bonusAtaque":2}),
  habilidad({"claseId":"paladin","id":"martillo_sagrado","nivelJobRequerido":1,"nombre":"Martillo sagrado","descripcion":"Golpea con fuerza y reduce el ataque enemigo.","tipoDano":"hibrido","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":1.4,"costeEnergia":7,"costeMana":5,"cooldownTurnos":3,"estadosSecundarios":[{"tipo":"debuff_ataque","valor":0.1,"duracionTurnos":2,"objetivo":"enemigo"}]}),
  habilidad({"claseId":"paladin","id":"escudo_redentor","nivelJobRequerido":25,"nombre":"Escudo redentor","descripcion":"Recupera un 12 % de vida y refuerza la defensa durante 2 turnos.","tipo":"activa","efecto":"curacion","animacion":"curacion","curacionPorcentaje":0.12,"costeMana":7,"costeEnergia":4,"cooldownTurnos":4,"estadosSecundarios":[{"tipo":"bonus_defensa","valor":0.12,"duracionTurnos":2,"objetivo":"jugador"}]}),
  habilidad({"claseId":"paladin","id":"sentencia_luminosa","nivelJobRequerido":45,"nombre":"Sentencia luminosa","descripcion":"Descarga un poderoso golpe híbrido.","tipoDano":"hibrido","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":1.7,"costeEnergia":9,"costeMana":8,"cooldownTurnos":5}),
  habilidad({"claseId":"paladin","id":"juramento_paladin","nivelJobRequerido":30,"nombre":"Juramento del Paladín","descripcion":"Aumenta la defensa física y mágica en 3 puntos.","tipo":"pasiva","bonusDefensa":3,"bonusDefensaMagica":3}),
  habilidad({"claseId":"paladin","id":"corazon_puro","nivelJobRequerido":55,"nombre":"Corazón puro","descripcion":"Aumenta la vida máxima en 18 puntos.","tipo":"pasiva","bonusHpMaximo":18}),
  habilidad({"claseId":"guardian_real","id":"orden_inquebrantable","nivelJobRequerido":1,"nombre":"Orden inquebrantable","descripcion":"Refuerza la defensa un 20 % durante 3 turnos.","tipo":"activa","efecto":"bonus_defensa","animacion":"defensiva","bonusDefensaPorcentaje":0.2,"duracionTurnos":3,"costeEnergia":10,"cooldownTurnos":5}),
  habilidad({"claseId":"guardian_real","id":"contraataque_real","nivelJobRequerido":25,"nombre":"Contraataque real","descripcion":"Castiga al enemigo y reduce su ataque durante 2 turnos.","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":1.2,"costeEnergia":9,"cooldownTurnos":4,"estadosSecundarios":[{"tipo":"debuff_ataque","valor":0.12,"duracionTurnos":2,"objetivo":"enemigo"}]}),
  habilidad({"claseId":"guardian_real","id":"muralla_viviente","nivelJobRequerido":45,"nombre":"Muralla viviente","descripcion":"Un golpe reforzado que aumenta la propia defensa.","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":1.35,"costeEnergia":12,"cooldownTurnos":5,"estadosSecundarios":[{"tipo":"bonus_defensa","valor":0.16,"duracionTurnos":3,"objetivo":"jugador"}]}),
  habilidad({"claseId":"guardian_real","id":"sangre_real","nivelJobRequerido":30,"nombre":"Sangre real","descripcion":"Aumenta la vida máxima en 20 puntos.","tipo":"pasiva","bonusHpMaximo":20}),
  habilidad({"claseId":"guardian_real","id":"placas_impenetrables","nivelJobRequerido":55,"nombre":"Placas impenetrables","descripcion":"Aumenta la defensa física en 5 puntos.","tipo":"pasiva","bonusDefensa":5}),
  habilidad({"claseId":"asesino","id":"golpe_silencioso","nivelJobRequerido":1,"nombre":"Golpe silencioso","descripcion":"Un ataque preciso con una probabilidad crítica elevada.","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":1.35,"costeEnergia":7,"cooldownTurnos":3,"probabilidadCritico":0.12}),
  habilidad({"claseId":"asesino","id":"veneno_oculto","nivelJobRequerido":25,"nombre":"Veneno oculto","descripcion":"Envenena al objetivo con daño progresivo durante 3 turnos.","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":0.85,"costeEnergia":8,"cooldownTurnos":4,"danoProgresivoPorcentaje":0.2,"duracionTurnos":3}),
  habilidad({"claseId":"asesino","id":"ejecucion","nivelJobRequerido":45,"nombre":"Ejecución","descripcion":"Un golpe de alto riesgo y gran daño.","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":1.85,"costeEnergia":13,"cooldownTurnos":5,"probabilidadCritico":0.08}),
  habilidad({"claseId":"asesino","id":"paso_sin_ruido","nivelJobRequerido":30,"nombre":"Paso sin ruido","descripcion":"Aumenta la evasión en 4 puntos porcentuales.","tipo":"pasiva","bonusEvasion":0.04}),
  habilidad({"claseId":"asesino","id":"anatomia_precisa","nivelJobRequerido":55,"nombre":"Anatomía precisa","descripcion":"Aumenta la probabilidad crítica en 4 puntos porcentuales.","tipo":"pasiva","probabilidadCritico":0.04}),
  habilidad({"claseId":"maestro_espadas","id":"combo_maestro","nivelJobRequerido":1,"nombre":"Combo maestro","descripcion":"Una serie de cortes fluidos que termina en un golpe potente.","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":1.45,"costeEnergia":9,"cooldownTurnos":3}),
  habilidad({"claseId":"maestro_espadas","id":"guardia_perfecta","nivelJobRequerido":25,"nombre":"Guardia perfecta","descripcion":"Aumenta la defensa un 15 % durante 3 turnos.","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":0.55,"costeEnergia":7,"cooldownTurnos":4,"estadosSecundarios":[{"tipo":"bonus_defensa","valor":0.15,"duracionTurnos":3,"objetivo":"jugador"}]}),
  habilidad({"claseId":"maestro_espadas","id":"corte_dimension","nivelJobRequerido":45,"nombre":"Corte dimensional","descripcion":"Un golpe de precisión devastadora.","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":1.8,"costeEnergia":13,"cooldownTurnos":5}),
  habilidad({"claseId":"maestro_espadas","id":"filo_perfecto","nivelJobRequerido":30,"nombre":"Filo perfecto","descripcion":"Aumenta el ataque físico en 4 puntos.","tipo":"pasiva","bonusAtaque":4}),
  habilidad({"claseId":"maestro_espadas","id":"ritmo_de_combate","nivelJobRequerido":55,"nombre":"Ritmo de combate","descripcion":"Aumenta la velocidad en 3 puntos.","tipo":"pasiva","bonusVelocidad":3}),
  habilidad({"claseId":"oraculo","id":"destello_profetico","nivelJobRequerido":1,"nombre":"Destello profético","descripcion":"Daña al enemigo y reduce su precisión durante 2 turnos.","tipoDano":"magico","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":1.2,"costeMana":8,"cooldownTurnos":3,"estadosSecundarios":[{"tipo":"debuff_precision","valor":8,"duracionTurnos":2,"objetivo":"enemigo"}]}),
  habilidad({"claseId":"oraculo","id":"presagio_sanador","nivelJobRequerido":25,"nombre":"Presagio sanador","descripcion":"Restaura un 20 % de vida y aplica curación progresiva durante 2 turnos.","tipo":"activa","efecto":"curacion","animacion":"curacion","curacionPorcentaje":0.2,"costeMana":12,"cooldownTurnos":5,"duracionTurnos":2,"estadosSecundarios":[{"tipo":"curacion_progresiva","valor":0.06,"duracionTurnos":2,"objetivo":"jugador"}]}),
  habilidad({"claseId":"oraculo","id":"vision_abrumadora","nivelJobRequerido":45,"nombre":"Visión abrumadora","descripcion":"Un rayo sagrado de gran potencia.","tipoDano":"magico","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":1.65,"costeMana":13,"cooldownTurnos":5}),
  habilidad({"claseId":"oraculo","id":"vista_interior","nivelJobRequerido":30,"nombre":"Vista interior","descripcion":"Aumenta la precisión en 4 puntos.","tipo":"pasiva","bonusPrecision":4}),
  habilidad({"claseId":"oraculo","id":"augurio_favorable","nivelJobRequerido":55,"nombre":"Augurio favorable","descripcion":"Aumenta la regeneración de Maná en 2 puntos por turno.","tipo":"pasiva","bonusRegeneracionMana":2}),
  habilidad({"claseId":"hierofante","id":"martillo_ritual","nivelJobRequerido":1,"nombre":"Martillo ritual","descripcion":"Un golpe sagrado con daño mágico.","tipoDano":"magico","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":1.35,"costeMana":8,"cooldownTurnos":3}),
  habilidad({"claseId":"hierofante","id":"barrera_ritual","nivelJobRequerido":25,"nombre":"Barrera ritual","descripcion":"Refuerza la defensa física y mágica durante 3 turnos.","tipo":"activa","efecto":"bonus_defensa","animacion":"defensiva","bonusDefensaPorcentaje":0.16,"duracionTurnos":3,"costeMana":10,"cooldownTurnos":5,"estadosSecundarios":[{"tipo":"bonus_defensa","valor":0.16,"duracionTurnos":3,"objetivo":"jugador"}]}),
  habilidad({"claseId":"hierofante","id":"juicio_del_hierofante","nivelJobRequerido":45,"nombre":"Juicio del hierofante","descripcion":"Desata un ataque sagrado que reduce la defensa enemiga.","tipoDano":"magico","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":1.5,"costeMana":13,"cooldownTurnos":5,"estadosSecundarios":[{"tipo":"debuff_defensa","valor":0.12,"duracionTurnos":2,"objetivo":"enemigo"}]}),
  habilidad({"claseId":"hierofante","id":"ritual_perenne","nivelJobRequerido":30,"nombre":"Ritual perenne","descripcion":"Aumenta la defensa mágica en 4 puntos.","tipo":"pasiva","bonusDefensaMagica":4}),
  habilidad({"claseId":"hierofante","id":"reserva_sagrada","nivelJobRequerido":55,"nombre":"Reserva sagrada","descripcion":"Aumenta el Maná máximo en 15 puntos.","tipo":"pasiva","bonusManaMaximo":15}),
  habilidad({"claseId":"asceta","id":"palma_vacia","nivelJobRequerido":1,"nombre":"Palma vacía","descripcion":"Un golpe de precisión que debilita al enemigo.","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":1.35,"costeEnergia":7,"cooldownTurnos":3,"estadosSecundarios":[{"tipo":"debuff_ataque","valor":0.08,"duracionTurnos":2,"objetivo":"enemigo"}]}),
  habilidad({"claseId":"asceta","id":"respiracion_del_vacio","nivelJobRequerido":25,"nombre":"Respiración del vacío","descripcion":"Recupera Energía y refuerza la defensa por 2 turnos.","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":0.65,"costeEnergia":0,"cooldownTurnos":5,"recuperarEnergia":10,"duracionTurnos":2,"estadosSecundarios":[{"tipo":"bonus_defensa","valor":0.12,"duracionTurnos":2,"objetivo":"jugador"}]}),
  habilidad({"claseId":"asceta","id":"mil_pasos","nivelJobRequerido":45,"nombre":"Mil pasos","descripcion":"Encadena golpes veloces y mejora la evasión.","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":1.55,"costeEnergia":11,"cooldownTurnos":4,"estadosSecundarios":[{"tipo":"bonus_evasion","valor":0.12,"duracionTurnos":2,"objetivo":"jugador"}]}),
  habilidad({"claseId":"asceta","id":"cuerpo_templado","nivelJobRequerido":30,"nombre":"Cuerpo templado","descripcion":"Aumenta la vida máxima en 14 puntos.","tipo":"pasiva","bonusHpMaximo":14}),
  habilidad({"claseId":"asceta","id":"flujo_constante","nivelJobRequerido":55,"nombre":"Flujo constante","descripcion":"Aumenta la regeneración de Energía en 2 puntos por turno.","tipo":"pasiva","bonusRegeneracionEnergia":2}),
  habilidad({"claseId":"gran_maestro","id":"puño_del_maestro","nivelJobRequerido":1,"nombre":"Puño del maestro","descripcion":"Un golpe marcial de alta potencia.","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":1.45,"costeEnergia":9,"cooldownTurnos":3}),
  habilidad({"claseId":"gran_maestro","id":"forma_inmutable","nivelJobRequerido":25,"nombre":"Forma inmutable","descripcion":"Aumenta ataque y defensa durante 2 turnos.","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":0.9,"costeEnergia":8,"cooldownTurnos":4,"estadosSecundarios":[{"tipo":"bonus_ataque","valor":0.1,"duracionTurnos":2,"objetivo":"jugador"},{"tipo":"bonus_defensa","valor":0.1,"duracionTurnos":2,"objetivo":"jugador"}]}),
  habilidad({"claseId":"gran_maestro","id":"impacto_celestial","nivelJobRequerido":45,"nombre":"Impacto celestial","descripcion":"Un impacto devastador con alto coste de Energía.","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":1.8,"costeEnergia":14,"cooldownTurnos":5}),
  habilidad({"claseId":"gran_maestro","id":"disciplina_absoluta","nivelJobRequerido":30,"nombre":"Disciplina absoluta","descripcion":"Aumenta el ataque físico en 3 puntos.","tipo":"pasiva","bonusAtaque":3}),
  habilidad({"claseId":"gran_maestro","id":"respiracion_maestra","nivelJobRequerido":55,"nombre":"Respiración maestra","descripcion":"Aumenta la regeneración de vida por turno.","tipo":"pasiva","bonusRegeneracionVida":0.8}),
  habilidad({"claseId":"francotirador","id":"tiro_al_corazon","nivelJobRequerido":1,"nombre":"Tiro al corazón","descripcion":"Un disparo preciso con probabilidad crítica adicional.","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":1.5,"costeEnergia":9,"cooldownTurnos":3,"probabilidadCritico":0.12}),
  habilidad({"claseId":"francotirador","id":"perforacion_total","nivelJobRequerido":25,"nombre":"Perforación total","descripcion":"Ignora parcialmente la defensa reduciéndola durante 2 turnos.","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":1.2,"costeEnergia":10,"cooldownTurnos":4,"estadosSecundarios":[{"tipo":"debuff_defensa","valor":0.16,"duracionTurnos":2,"objetivo":"enemigo"}]}),
  habilidad({"claseId":"francotirador","id":"disparo_letal","nivelJobRequerido":45,"nombre":"Disparo letal","descripcion":"Un disparo extremo diseñado para causar daño elevado.","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":1.9,"costeEnergia":14,"cooldownTurnos":5,"probabilidadCritico":0.1}),
  habilidad({"claseId":"francotirador","id":"ojo_de_aguila","nivelJobRequerido":30,"nombre":"Ojo de águila","descripcion":"Aumenta la precisión en 5 puntos.","tipo":"pasiva","bonusPrecision":5}),
  habilidad({"claseId":"francotirador","id":"pulso_estable","nivelJobRequerido":55,"nombre":"Pulso estable","descripcion":"Aumenta la probabilidad crítica en 4 puntos porcentuales.","tipo":"pasiva","probabilidadCritico":0.04}),
  habilidad({"claseId":"domabestias","id":"llamada_salvaje","nivelJobRequerido":1,"nombre":"Llamada salvaje","descripcion":"Un ataque coordinado con una criatura aliada.","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":1.3,"costeEnergia":8,"cooldownTurnos":3,"estadosSecundarios":[{"tipo":"bonus_ataque","valor":0.08,"duracionTurnos":2,"objetivo":"jugador"}]}),
  habilidad({"claseId":"domabestias","id":"trampa_de_raices","nivelJobRequerido":25,"nombre":"Trampa de raíces","descripcion":"Daña y reduce la evasión ofensiva con una penalización de precisión.","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":1,"costeEnergia":9,"cooldownTurnos":4,"estadosSecundarios":[{"tipo":"debuff_precision","valor":10,"duracionTurnos":2,"objetivo":"enemigo"}]}),
  habilidad({"claseId":"domabestias","id":"caceria_en_manada","nivelJobRequerido":45,"nombre":"Cacería en manada","descripcion":"Una emboscada coordinada de gran potencia.","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":1.65,"costeEnergia":12,"cooldownTurnos":5}),
  habilidad({"claseId":"domabestias","id":"vinculo_bestial","nivelJobRequerido":30,"nombre":"Vínculo bestial","descripcion":"Aumenta el ataque físico en 3 puntos.","tipo":"pasiva","bonusAtaque":3}),
  habilidad({"claseId":"domabestias","id":"sentidos_agudos","nivelJobRequerido":55,"nombre":"Sentidos agudos","descripcion":"Aumenta la evasión en 3 puntos porcentuales.","tipo":"pasiva","bonusEvasion":0.03}),
  habilidad({"claseId":"guardian_bosque","id":"raices_guardianas","nivelJobRequerido":1,"nombre":"Raíces guardianas","descripcion":"Las raíces ralentizan al enemigo y refuerzan tu defensa.","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":0.95,"costeEnergia":6,"cooldownTurnos":4,"estadosSecundarios":[{"tipo":"bonus_defensa","valor":0.12,"duracionTurnos":2,"objetivo":"jugador"},{"tipo":"debuff_ataque","valor":0.08,"duracionTurnos":2,"objetivo":"enemigo"}]}),
  habilidad({"claseId":"guardian_bosque","id":"flecha_verde","nivelJobRequerido":25,"nombre":"Flecha verde","descripcion":"Un disparo infundido con magia natural.","tipoDano":"magico","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":1.35,"costeMana":7,"cooldownTurnos":3}),
  habilidad({"claseId":"guardian_bosque","id":"refugio_del_bosque","nivelJobRequerido":45,"nombre":"Refugio del bosque","descripcion":"Restaura un 16 % de vida y aplica curación progresiva.","tipo":"activa","efecto":"curacion","animacion":"curacion","curacionPorcentaje":0.16,"costeEnergia":4,"costeMana":7,"cooldownTurnos":5,"estadosSecundarios":[{"tipo":"curacion_progresiva","valor":0.05,"duracionTurnos":2,"objetivo":"jugador"}]}),
  habilidad({"claseId":"guardian_bosque","id":"piel_de_roble","nivelJobRequerido":30,"nombre":"Piel de roble","descripcion":"Aumenta la defensa física en 3 puntos.","tipo":"pasiva","bonusDefensa":3}),
  habilidad({"claseId":"guardian_bosque","id":"viaje_silvestre","nivelJobRequerido":55,"nombre":"Viaje silvestre","descripcion":"Aumenta la velocidad en 4 puntos.","tipo":"pasiva","bonusVelocidad":4}),
  habilidad({"claseId":"rastreador","id":"marcar_objetivo","nivelJobRequerido":1,"nombre":"Marcar objetivo","descripcion":"Reduce la defensa del enemigo antes del disparo.","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":1.05,"costeEnergia":7,"cooldownTurnos":3,"estadosSecundarios":[{"tipo":"debuff_defensa","valor":0.14,"duracionTurnos":2,"objetivo":"enemigo"}]}),
  habilidad({"claseId":"rastreador","id":"flecha_perseguidora","nivelJobRequerido":25,"nombre":"Flecha perseguidora","descripcion":"Un disparo certero que aumenta tu precisión.","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":1.35,"costeEnergia":9,"cooldownTurnos":3,"estadosSecundarios":[{"tipo":"bonus_ataque","valor":0.08,"duracionTurnos":2,"objetivo":"jugador"}]}),
  habilidad({"claseId":"rastreador","id":"emboscada_final","nivelJobRequerido":45,"nombre":"Emboscada final","descripcion":"Una emboscada que causa daño elevado.","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":1.75,"costeEnergia":13,"cooldownTurnos":5}),
  habilidad({"claseId":"rastreador","id":"rastreo_experto","nivelJobRequerido":30,"nombre":"Rastreo experto","descripcion":"Aumenta la precisión en 4 puntos.","tipo":"pasiva","bonusPrecision":4}),
  habilidad({"claseId":"rastreador","id":"paso_del_cazador","nivelJobRequerido":55,"nombre":"Paso del cazador","descripcion":"Aumenta la evasión en 4 puntos porcentuales.","tipo":"pasiva","bonusEvasion":0.04}),
  habilidad({"claseId":"archimago","id":"lanza_arcana","nivelJobRequerido":1,"nombre":"Lanza arcana","descripcion":"Concentra energía mágica en un ataque directo.","tipoDano":"magico","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":1.55,"costeMana":10,"cooldownTurnos":3}),
  habilidad({"claseId":"archimago","id":"explosion_elemental","nivelJobRequerido":25,"nombre":"Explosión elemental","descripcion":"Golpea con una explosión que debilita la defensa.","tipoDano":"magico","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":1.3,"costeMana":12,"cooldownTurnos":4,"estadosSecundarios":[{"tipo":"debuff_defensa","valor":0.12,"duracionTurnos":2,"objetivo":"enemigo"}]}),
  habilidad({"claseId":"archimago","id":"cataclismo","nivelJobRequerido":45,"nombre":"Cataclismo","descripcion":"Una descarga arcana de daño extremo.","tipoDano":"magico","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":1.95,"costeMana":16,"cooldownTurnos":5}),
  habilidad({"claseId":"archimago","id":"nucleo_arcano","nivelJobRequerido":30,"nombre":"Núcleo arcano","descripcion":"Aumenta el ataque mágico en 5 puntos.","tipo":"pasiva","bonusAtaqueMagico":5}),
  habilidad({"claseId":"archimago","id":"reserva_infinita","nivelJobRequerido":55,"nombre":"Reserva infinita","descripcion":"Aumenta el Maná máximo en 18 puntos.","tipo":"pasiva","bonusManaMaximo":18}),
  habilidad({"claseId":"invocador","id":"esfera_invocada","nivelJobRequerido":1,"nombre":"Esfera invocada","descripcion":"Una esfera elemental golpea al objetivo.","tipoDano":"magico","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":1.35,"costeMana":8,"cooldownTurnos":3}),
  habilidad({"claseId":"invocador","id":"sellos_paralelos","nivelJobRequerido":25,"nombre":"Sellos paralelos","descripcion":"Golpea y reduce el ataque enemigo durante 2 turnos.","tipoDano":"magico","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":1.15,"costeMana":10,"cooldownTurnos":4,"estadosSecundarios":[{"tipo":"debuff_ataque","valor":0.1,"duracionTurnos":2,"objetivo":"enemigo"}]}),
  habilidad({"claseId":"invocador","id":"convergencia","nivelJobRequerido":45,"nombre":"Convergencia","descripcion":"Combina fuerzas invocadas en un poderoso ataque.","tipoDano":"magico","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":1.75,"costeMana":14,"cooldownTurnos":5,"danoProgresivoPorcentaje":0.12,"duracionTurnos":2}),
  habilidad({"claseId":"invocador","id":"familiar_arcano","nivelJobRequerido":30,"nombre":"Familiar arcano","descripcion":"Aumenta la regeneración de Maná en 1.5 puntos por turno.","tipo":"pasiva","bonusRegeneracionMana":1.5}),
  habilidad({"claseId":"invocador","id":"vinculo_elemental","nivelJobRequerido":55,"nombre":"Vínculo elemental","descripcion":"Aumenta el ataque mágico en 4 puntos.","tipo":"pasiva","bonusAtaqueMagico":4}),
  habilidad({"claseId":"nigromante","id":"toque_funebre","nivelJobRequerido":1,"nombre":"Toque fúnebre","descripcion":"Drena la fuerza vital e inflige daño mágico.","tipoDano":"magico","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":1.3,"costeMana":9,"cooldownTurnos":3,"roboVida":0.18}),
  habilidad({"claseId":"nigromante","id":"plaga_oscura","nivelJobRequerido":25,"nombre":"Plaga oscura","descripcion":"Inflige daño y aplica daño progresivo durante 3 turnos.","tipoDano":"magico","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":0.9,"costeMana":11,"cooldownTurnos":4,"danoProgresivoPorcentaje":0.2,"duracionTurnos":3}),
  habilidad({"claseId":"nigromante","id":"ejercito_de_sombras","nivelJobRequerido":45,"nombre":"Ejército de sombras","descripcion":"Un estallido de energía necrótica de gran potencia.","tipoDano":"magico","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":1.8,"costeMana":15,"cooldownTurnos":5}),
  habilidad({"claseId":"nigromante","id":"manto_funebre","nivelJobRequerido":30,"nombre":"Manto fúnebre","descripcion":"Aumenta la defensa mágica en 4 puntos.","tipo":"pasiva","bonusDefensaMagica":4}),
  habilidad({"claseId":"nigromante","id":"alma_persistente","nivelJobRequerido":55,"nombre":"Alma persistente","descripcion":"Aumenta la vida máxima en 15 puntos.","tipo":"pasiva","bonusHpMaximo":15}),
  habilidad({"claseId":"demonologo","id":"cadena_infernal","nivelJobRequerido":1,"nombre":"Cadena infernal","descripcion":"Un golpe mágico que debilita el ataque enemigo.","tipoDano":"magico","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":1.25,"costeMana":9,"cooldownTurnos":3,"estadosSecundarios":[{"tipo":"debuff_ataque","valor":0.1,"duracionTurnos":2,"objetivo":"enemigo"}]}),
  habilidad({"claseId":"demonologo","id":"pacto_de_sangre","nivelJobRequerido":25,"nombre":"Pacto de sangre","descripcion":"Sacrifica parte de tu defensa para lanzar un ataque potente.","tipoDano":"magico","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":1.45,"costeMana":11,"cooldownTurnos":4,"estadosSecundarios":[{"tipo":"bonus_ataque_magico","valor":0.14,"duracionTurnos":2,"objetivo":"jugador"}]}),
  habilidad({"claseId":"demonologo","id":"abismo","nivelJobRequerido":45,"nombre":"Abismo","descripcion":"Abre una fisura de magia oscura que causa daño extremo.","tipoDano":"magico","tipo":"activa","efecto":"dano","animacion":"ofensiva_potenciada","multiplicadorDano":1.9,"costeMana":16,"cooldownTurnos":5}),
  habilidad({"claseId":"demonologo","id":"pacto_menor","nivelJobRequerido":30,"nombre":"Pacto menor","descripcion":"Aumenta el ataque mágico en 4 puntos, a costa de 1 de defensa.","tipo":"pasiva","bonusAtaqueMagico":4,"bonusDefensa":-1}),
  habilidad({"claseId":"demonologo","id":"corazon_infernal","nivelJobRequerido":55,"nombre":"Corazón infernal","descripcion":"Aumenta el Maná máximo en 15 puntos.","tipo":"pasiva","bonusManaMaximo":15}),
];

export function obtenerHabilidadPorId(id: string): DefinicionHabilidad | undefined {
  return HABILIDADES.find((habilidad) => habilidad.id === id);
}

export function obtenerHabilidadesDisponiblesParaClase(claseActualId: string): DefinicionHabilidad[] {
  return HABILIDADES.filter((habilidad) =>
    puedeUsarHabilidadDeClase(claseActualId, habilidad.claseId)
  );
}

export function obtenerHabilidadesActivas(): DefinicionHabilidad[] {
  return HABILIDADES.filter((habilidad) => habilidad.tipo === "activa");
}

export function obtenerHabilidadesPasivas(): DefinicionHabilidad[] {
  return HABILIDADES.filter((habilidad) => habilidad.tipo === "pasiva");
}
