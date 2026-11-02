import type { DefinicionHabilidad } from "../../tiposJuego";
import { habilidad } from "./crear-habilidad";

/** Datos originales agrupados por profesión; el motor de reglas v2 los transforma después. */
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
