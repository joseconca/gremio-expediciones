import type { DefinicionHabilidad, EstadoEfectoHabilidad } from "../../../tiposJuego";
import { crearTecnicaAdicional } from "../../../progresion/tecnicas-adicionales";
import { resolverTecnicaTactica } from "./motor-tactico";
import type { EstadoTactico, UnidadTactica } from "./tipos-tacticos";

/**
 * Frontera entre los efectos persistidos del combate y el motor puro.
 * La persistencia de datos y la actualización versionada corresponden a los servicios.
 */
export type ContextoTecnicaTactica = {
  numeroObjetivos?: number;
  principal?: boolean;
  pesoCuracion?: number;
  pasivas?: DefinicionHabilidad[];
  actorId: string;
  objetivoId: string;
  claseId: string;
  ciclo: number;
  actorHp: number;
  actorHpMaximo: number;
  energia: number;
  energiaMaxima: number;
  mana: number;
  manaMaximo: number;
  ataque: number;
  ataqueMagico: number;
  defensaActor: number;
  defensaMagicaActor: number;
  efectosActor: EstadoEfectoHabilidad[];
  objetivoHp: number;
  objetivoHpMaximo: number;
  defensaObjetivo: number;
  defensaMagicaObjetivo: number;
  efectosObjetivo: EstadoEfectoHabilidad[];
  objetivoAliado: boolean;
  filaActor: number;
  filaObjetivo: number;
};

/**
 * Convierte tanto estados tácticos actuales como DoT/HoT anteriores.
 * Cada estado táctico recibe una copia para evitar modificar los efectos de origen.
 */
export const convertirEstadosTacticos = (
  efectos: readonly EstadoEfectoHabilidad[],
  propietarioId: string,
  creadorPorDefecto: string
): EstadoTactico[] => efectos.flatMap((efecto) => {
  if (efecto.tipo === "tactico") {
    return efecto.datosTacticos?.estados.map((estado) => ({ ...estado })) ?? [];
  }
  if (efecto.tipo !== "dano_progresivo" && efecto.tipo !== "curacion_progresiva") {
    return [];
  }

  return [{
    id: `legacy:${propietarioId}:${efecto.habilidadId}:${efecto.tipo}`,
    fuenteId: efecto.habilidadId,
    creadorId: efecto.creadorId ?? creadorPorDefecto,
    familia: efecto.tipo === "dano_progresivo" ? "herida" as const : "regeneracion" as const,
    clave: efecto.familia ?? efecto.tipo,
    valor: efecto.valor,
    restantes: efecto.turnosRestantes,
    reloj: "turno" as const,
    cargas: 1,
  }];
});

/**
 * Reconstruye los efectos persistibles: conserva los efectos no tácticos,
 * recupera los pulsos legacy todavía vivos y guarda el estado del motor.
 */
export function exportarEstadosTacticos(
  unidad: UnidadTactica,
  anteriores: readonly EstadoEfectoHabilidad[]
): EstadoEfectoHabilidad[] {
  const periodicos = anteriores.flatMap((efecto) => {
    if (efecto.tipo !== "dano_progresivo" && efecto.tipo !== "curacion_progresiva") {
      return [];
    }
    const estado = unidad.estados.find(
      (actual) => actual.id === `legacy:${unidad.id}:${efecto.habilidadId}:${efecto.tipo}`
    );
    return estado
      ? [{ ...efecto, valor: estado.valor, turnosRestantes: estado.restantes }]
      : [];
  });

  const estados = unidad.estados.filter((estado) => !estado.id.startsWith("legacy:"));
  const resultado = [
    ...anteriores.filter((efecto) =>
      !["tactico", "dano_progresivo", "curacion_progresiva"].includes(efecto.tipo)
    ),
    ...periodicos,
  ];
  if (estados.length || Object.keys(unidad.limites).length) {
    resultado.push({
      habilidadId: `tactica:${unidad.id}`,
      tipo: "tactico",
      valor: 0,
      duracionTurnos: 1,
      turnosRestantes: 1,
      objetivo: "jugador",
      datosTacticos: {
        version: 2,
        propietarioId: unidad.id,
        estados,
        limites: unidad.limites,
      },
    });
  }
  return resultado;
}

/** Aplica una técnica adicional conservando el contrato previo del combate. */
export function resolverTecnicaAdicional(
  habilidad: DefinicionHabilidad,
  contexto: ContextoTecnicaTactica
) {
  if (!habilidad.claseId || habilidad.programaTactico !== "tecnica_adicional") {
    throw new Error("PROGRAMA_TACTICO_DESCONOCIDO");
  }

  const crearUnidad = (propio: boolean): UnidadTactica => {
    const id = propio ? contexto.actorId : contexto.objetivoId;
    const efectos = propio ? contexto.efectosActor : contexto.efectosObjetivo;
    return {
      id,
      equipo: propio || contexto.objetivoAliado ? "aliado" : "enemigo",
      claseId: propio ? contexto.claseId : undefined,
      hp: propio ? contexto.actorHp : contexto.objetivoHp,
      hpMaximo: propio ? contexto.actorHpMaximo : contexto.objetivoHpMaximo,
      energia: propio ? contexto.energia : 0,
      energiaMaxima: propio ? contexto.energiaMaxima : 100,
      mana: propio ? contexto.mana : 0,
      manaMaximo: propio ? contexto.manaMaximo : 10,
      ataque: contexto.ataque,
      ataqueMagico: contexto.ataqueMagico,
      defensa: propio ? contexto.defensaActor : contexto.defensaObjetivo,
      defensaMagica: propio ? contexto.defensaMagicaActor : contexto.defensaMagicaObjetivo,
      fila: propio ? contexto.filaActor : contexto.filaObjetivo,
      columna: 0,
      estados: convertirEstadosTacticos(efectos, id, contexto.actorId),
      // Este adaptador toma los límites del efecto táctico persistido.
      limites: { ...efectos.find((efecto) => efecto.tipo === "tactico")?.datosTacticos?.limites },
    };
  };

  const actor = crearUnidad(true);
  const tecnica = crearTecnicaAdicional(habilidad.claseId, actor);
  // El catálogo y el pago transaccional usan los mismos costes.
  // Los rangos no reducen CD ni generan recuperaciones por transformación.
  tecnica.costeEnergia = habilidad.costeEnergia ?? 0;
  tecnica.costeMana = habilidad.costeMana ?? 0;
  tecnica.cooldown = habilidad.cooldownTurnos ?? 4;

  const mundo = resolverTecnicaTactica({
    version: 2,
    ciclo: contexto.ciclo,
    unidades: contexto.actorId === contexto.objetivoId
      ? [actor]
      : [actor, crearUnidad(false)],
    eventos: [],
  }, contexto.actorId, contexto.objetivoId, tecnica);

  const actorFinal = mundo.unidades.find((unidad) => unidad.id === contexto.actorId)!;
  const objetivoFinal = mundo.unidades.find((unidad) => unidad.id === contexto.objetivoId)!;
  const dano = mundo.eventos
    .filter((evento) => evento.tipo === "dano" && evento.objetivoId === contexto.objetivoId)
    .reduce((total, evento) => total + evento.cantidad, 0);
  const cura = mundo.eventos
    .filter((evento) => evento.tipo === "cura")
    .reduce((total, evento) => total + evento.cantidad, 0);

  return {
    accion: {
      actor: "jugador" as const,
      tipo: "habilidad" as const,
      animacion: "defensiva" as const,
      dano,
      critico: false,
      ...(cura > 0 ? { curacion: cura } : {}),
      texto: `Usas ${habilidad.nombre}.`,
    },
    actorHp: actorFinal.hp,
    objetivoHp: objetivoFinal.hp,
    efectosActor: exportarEstadosTacticos(actorFinal, contexto.efectosActor),
    efectosObjetivo: exportarEstadosTacticos(
      objetivoFinal,
      contexto.actorId === contexto.objetivoId
        ? contexto.efectosActor
        : contexto.efectosObjetivo
    ),
    filaActor: actorFinal.fila,
  };
}
