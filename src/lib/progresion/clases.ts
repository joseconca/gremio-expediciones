import type { TipoArmadura, TipoEquipoDominado } from "../tiposJuego";

export interface RequisitoClase {
  claseId: string;
  nivelJob: number;
}

export type ArquetipoClaseId = "novato" | "vanguardia" | "apoyo" | "agil" | "arcano" | "marcial" | "maldito" | "hibrido";
export type AtributoPrincipalId = "fuerza" | "agilidad" | "vitalidad" | "inteligencia" | "destreza" | "suerte";

export interface PerfilArquetipoClase {
  nombre: string;
  crecimientoBase: Readonly<Record<AtributoPrincipalId, number>>;
  bonusPorNivelJob: Readonly<Record<AtributoPrincipalId, number>>;
}

export interface DefinicionClase {
  id: string;
  nombre: string;
  descripcion: string;
  arquetipo: ArquetipoClaseId;
  /** Recurso principal que consume la clase en combate. */
  recursoCombate: "energia" | "mana" | "ambos";
  tier: number;
  nivelJobMaximo: number;
  requisitos: readonly RequisitoClase[];
  armasDominadas: readonly TipoEquipoDominado[];
  armadurasDominadas: readonly TipoArmadura[];
  bonoAtaqueArmaDominada: number;
  bonoDefensaArmaduraDominada: number;
  /** Aumenta proporcionalmente la velocidad de viaje de expediciones. */
  bonusVelocidadExpedicion?: number;
}

const NOVATO_JOB_10: readonly RequisitoClase[] = [{ claseId: "novato", nivelJob: 10 }];
const ESPADACHIN_JOB_20: readonly RequisitoClase[] = [{ claseId: "espadachin", nivelJob: 20 }];
const ACOLITO_JOB_20: readonly RequisitoClase[] = [{ claseId: "acolito", nivelJob: 20 }];
const ARQUERO_JOB_20: readonly RequisitoClase[] = [{ claseId: "arquero", nivelJob: 20 }];
const MAGO_JOB_20: readonly RequisitoClase[] = [{ claseId: "mago", nivelJob: 20 }];

export const ARQUETIPOS_CLASE = {
  novato: { nombre: "Generalista", crecimientoBase: { fuerza: 0.18, agilidad: 0.18, vitalidad: 0.18, inteligencia: 0.18, destreza: 0.18, suerte: 0.18 }, bonusPorNivelJob: { fuerza: 0.04, agilidad: 0.04, vitalidad: 0.04, inteligencia: 0.04, destreza: 0.04, suerte: 0.04 } },
  vanguardia: { nombre: "Vanguardia", crecimientoBase: { fuerza: 0.45, agilidad: 0.12, vitalidad: 0.40, inteligencia: 0.04, destreza: 0.16, suerte: 0.08 }, bonusPorNivelJob: { fuerza: 0.26, agilidad: 0.04, vitalidad: 0.24, inteligencia: 0, destreza: 0.06, suerte: 0.04 } },
  apoyo: { nombre: "Apoyo", crecimientoBase: { fuerza: 0.08, agilidad: 0.10, vitalidad: 0.28, inteligencia: 0.40, destreza: 0.15, suerte: 0.20 }, bonusPorNivelJob: { fuerza: 0.04, agilidad: 0.04, vitalidad: 0.16, inteligencia: 0.22, destreza: 0.07, suerte: 0.10 } },
  agil: { nombre: "Ágil", crecimientoBase: { fuerza: 0.14, agilidad: 0.42, vitalidad: 0.12, inteligencia: 0.04, destreza: 0.40, suerte: 0.24 }, bonusPorNivelJob: { fuerza: 0.06, agilidad: 0.23, vitalidad: 0.05, inteligencia: 0, destreza: 0.24, suerte: 0.12 } },
  arcano: { nombre: "Arcano", crecimientoBase: { fuerza: 0.04, agilidad: 0.08, vitalidad: 0.16, inteligencia: 0.48, destreza: 0.20, suerte: 0.18 }, bonusPorNivelJob: { fuerza: 0, agilidad: 0.05, vitalidad: 0.08, inteligencia: 0.28, destreza: 0.10, suerte: 0.10 } },
  marcial: { nombre: "Marcial", crecimientoBase: { fuerza: 0.30, agilidad: 0.24, vitalidad: 0.25, inteligencia: 0.05, destreza: 0.20, suerte: 0.15 }, bonusPorNivelJob: { fuerza: 0.18, agilidad: 0.18, vitalidad: 0.16, inteligencia: 0, destreza: 0.14, suerte: 0.08 } },
  maldito: { nombre: "Maldiciones", crecimientoBase: { fuerza: 0.04, agilidad: 0.10, vitalidad: 0.15, inteligencia: 0.42, destreza: 0.20, suerte: 0.32 }, bonusPorNivelJob: { fuerza: 0, agilidad: 0.05, vitalidad: 0.05, inteligencia: 0.22, destreza: 0.06, suerte: 0.18 } },
  hibrido: { nombre: "Híbrido", crecimientoBase: { fuerza: 0.28, agilidad: 0.10, vitalidad: 0.38, inteligencia: 0.18, destreza: 0.12, suerte: 0.15 }, bonusPorNivelJob: { fuerza: 0.14, agilidad: 0.05, vitalidad: 0.22, inteligencia: 0.10, destreza: 0.05, suerte: 0.08 } },
} as const satisfies Record<ArquetipoClaseId, PerfilArquetipoClase>;

const DEFINICIONES = {
  // TIER 0
  novato: {
    id: "novato", nombre: "Novato", descripcion: "El punto de partida de todo aventurero.", arquetipo: "novato",
    recursoCombate: "energia", tier: 0, nivelJobMaximo: 10, requisitos: [], armasDominadas: [],
    armadurasDominadas: ["ligera"], bonoAtaqueArmaDominada: 0, bonoDefensaArmaduraDominada: 0,
  },

  // TIER 1 · cuatro ramas de especialización
  espadachin: {
    id: "espadachin", nombre: "Espadachín", descripcion: "Especialista en combate frontal y armas de filo.", arquetipo: "vanguardia",
    recursoCombate: "energia", tier: 1, nivelJobMaximo: 20, requisitos: NOVATO_JOB_10,
    armasDominadas: ["espada", "lanza", "escudo"], armadurasDominadas: ["media", "pesada"],
    bonoAtaqueArmaDominada: 0.15, bonoDefensaArmaduraDominada: 0.1,
  },
  acolito: {
    id: "acolito", nombre: "Acólito", descripcion: "Aprendiz de apoyo, protección y artes sagradas.", arquetipo: "apoyo",
    recursoCombate: "mana", tier: 1, nivelJobMaximo: 20, requisitos: NOVATO_JOB_10,
    armasDominadas: ["maza", "baston"], armadurasDominadas: ["ligera", "media"],
    bonoAtaqueArmaDominada: 0.1, bonoDefensaArmaduraDominada: 0.1,
  },
  arquero: {
    id: "arquero", nombre: "Arquero", descripcion: "Especialista en precisión y armas a distancia.", arquetipo: "agil",
    recursoCombate: "energia", tier: 1, nivelJobMaximo: 20, requisitos: NOVATO_JOB_10,
    armasDominadas: ["arco", "daga"], armadurasDominadas: ["ligera"],
    bonoAtaqueArmaDominada: 0.15, bonoDefensaArmaduraDominada: 0.05,
  },
  mago: {
    id: "mago", nombre: "Mago", descripcion: "Aprendiz de las artes arcanas y los hechizos elementales.", arquetipo: "arcano",
    recursoCombate: "mana", tier: 1, nivelJobMaximo: 20, requisitos: NOVATO_JOB_10,
    armasDominadas: ["baston", "libro"], armadurasDominadas: ["ligera"],
    bonoAtaqueArmaDominada: 0.15, bonoDefensaArmaduraDominada: 0.05,
  },

  // TIER 2 · dos especializaciones por rama
  caballero: {
    id: "caballero", nombre: "Caballero", descripcion: "Guardián de primera línea que prioriza la defensa y la protección.", arquetipo: "vanguardia",
    recursoCombate: "energia", tier: 2, nivelJobMaximo: 40, requisitos: ESPADACHIN_JOB_20,
    armasDominadas: ["espada", "lanza", "escudo"], armadurasDominadas: ["media", "pesada"],
    bonoAtaqueArmaDominada: 0.2, bonoDefensaArmaduraDominada: 0.15,
  },
  duelista: {
    id: "duelista", nombre: "Duelista", descripcion: "Combatiente veloz que combina precisión, fintas y golpes decisivos.", arquetipo: "agil",
    recursoCombate: "energia", tier: 2, nivelJobMaximo: 40, requisitos: ESPADACHIN_JOB_20,
    armasDominadas: ["espada", "daga"], armadurasDominadas: ["ligera", "media"],
    bonoAtaqueArmaDominada: 0.2, bonoDefensaArmaduraDominada: 0.05,
  },
  sacerdote: {
    id: "sacerdote", nombre: "Sacerdote", descripcion: "Sanador especializado en bendiciones, curación y protección mágica.", arquetipo: "apoyo",
    recursoCombate: "mana", tier: 2, nivelJobMaximo: 40, requisitos: ACOLITO_JOB_20,
    armasDominadas: ["maza", "baston", "libro"], armadurasDominadas: ["ligera", "media"],
    bonoAtaqueArmaDominada: 0.1, bonoDefensaArmaduraDominada: 0.15,
  },
  monje: {
    id: "monje", nombre: "Monje", descripcion: "Luchador disciplinado que canaliza su energía en técnicas marciales.", arquetipo: "marcial",
    recursoCombate: "energia", tier: 2, nivelJobMaximo: 40, requisitos: ACOLITO_JOB_20,
    armasDominadas: ["puños", "maza"], armadurasDominadas: ["media", "pesada"],
    bonoAtaqueArmaDominada: 0.2, bonoDefensaArmaduraDominada: 0.1,
  },
  cazador: {
    id: "cazador", nombre: "Cazador", descripcion: "Rastreador ofensivo que marca debilidades y remata a su presa.", arquetipo: "agil",
    recursoCombate: "energia", tier: 2, nivelJobMaximo: 40, requisitos: ARQUERO_JOB_20,
    armasDominadas: ["arco", "daga"], armadurasDominadas: ["ligera", "media"],
    bonoAtaqueArmaDominada: 0.2, bonoDefensaArmaduraDominada: 0.05,
  },
  explorador: {
    id: "explorador", nombre: "Explorador", descripcion: "Aventurero móvil que domina trampas, evasión y rutas difíciles.", arquetipo: "agil",
    recursoCombate: "energia", tier: 2, nivelJobMaximo: 40, requisitos: ARQUERO_JOB_20,
    armasDominadas: ["arco", "daga"], armadurasDominadas: ["ligera"],
    bonoAtaqueArmaDominada: 0.15, bonoDefensaArmaduraDominada: 0.05, bonusVelocidadExpedicion: 0.25,
  },
  elementalista: {
    id: "elementalista", nombre: "Elementalista", descripcion: "Canaliza los elementos para infligir daño mágico y controlar el campo.", arquetipo: "arcano",
    recursoCombate: "mana", tier: 2, nivelJobMaximo: 40, requisitos: MAGO_JOB_20,
    armasDominadas: ["baston", "libro"], armadurasDominadas: ["ligera"],
    bonoAtaqueArmaDominada: 0.2, bonoDefensaArmaduraDominada: 0.05,
  },
  brujo: {
    id: "brujo", nombre: "Brujo", descripcion: "Manipula maldiciones, drenajes y magia oscura.", arquetipo: "maldito",
    recursoCombate: "mana", tier: 2, nivelJobMaximo: 40, requisitos: MAGO_JOB_20,
    armasDominadas: ["baston", "libro", "daga"], armadurasDominadas: ["ligera"],
    bonoAtaqueArmaDominada: 0.2, bonoDefensaArmaduraDominada: 0,
  },

  // TIER 2.5 · cuatro clases híbridas que requieren dos ramas de Tier 2
  cruzado: {
    id: "cruzado", nombre: "Cruzado", descripcion: "Combina la resistencia del Caballero con la curación del Sacerdote.", arquetipo: "hibrido",
    recursoCombate: "ambos", tier: 2.5, nivelJobMaximo: 50,
    requisitos: [{ claseId: "caballero", nivelJob: 40 }, { claseId: "sacerdote", nivelJob: 40 }],
    armasDominadas: ["espada", "maza", "lanza", "escudo"], armadurasDominadas: ["media", "pesada"],
    bonoAtaqueArmaDominada: 0.2, bonoDefensaArmaduraDominada: 0.2,
  },
  pirata: {
    id: "pirata", nombre: "Pirata", descripcion: "Un saqueador versátil que combina la movilidad del Duelista con las técnicas de caza y abordaje.", arquetipo: "hibrido",
    recursoCombate: "energia", tier: 2.5, nivelJobMaximo: 50,
    requisitos: [{ claseId: "duelista", nivelJob: 40 }, { claseId: "cazador", nivelJob: 40 }],
    armasDominadas: ["espada", "daga", "arco"], armadurasDominadas: ["ligera", "media"],
    bonoAtaqueArmaDominada: 0.2, bonoDefensaArmaduraDominada: 0.08, bonusVelocidadExpedicion: 0.1,
  },
  druida: {
    id: "druida", nombre: "Druida", descripcion: "Mezcla la supervivencia del Explorador con la magia elemental y la naturaleza.", arquetipo: "hibrido",
    recursoCombate: "ambos", tier: 2.5, nivelJobMaximo: 50,
    requisitos: [{ claseId: "explorador", nivelJob: 40 }, { claseId: "elementalista", nivelJob: 40 }],
    armasDominadas: ["baston", "arco", "daga"], armadurasDominadas: ["ligera", "media"],
    bonoAtaqueArmaDominada: 0.15, bonoDefensaArmaduraDominada: 0.1,
  },
  espadachin_runico: {
    id: "espadachin_runico", nombre: "Espadachín rúnico", descripcion: "Une las fintas del Duelista con las maldiciones y la energía arcana del Brujo.", arquetipo: "hibrido",
    recursoCombate: "ambos", tier: 2.5, nivelJobMaximo: 50,
    requisitos: [{ claseId: "duelista", nivelJob: 40 }, { claseId: "brujo", nivelJob: 40 }],
    armasDominadas: ["espada", "daga", "baston"], armadurasDominadas: ["ligera", "media"],
    bonoAtaqueArmaDominada: 0.2, bonoDefensaArmaduraDominada: 0.05,
  },

  // TIER 3 · dos evoluciones por cada clase de Tier 2
  paladin: {
    id: "paladin", nombre: "Paladín", descripcion: "Un campeón defensivo que refuerza sus ataques con poder sagrado.", arquetipo: "hibrido",
    recursoCombate: "ambos", tier: 3, nivelJobMaximo: 60, requisitos: [{ claseId: "caballero", nivelJob: 40 }],
    armasDominadas: ["espada", "maza", "lanza", "escudo"], armadurasDominadas: ["media", "pesada"],
    bonoAtaqueArmaDominada: 0.2, bonoDefensaArmaduraDominada: 0.2,
  },
  guardian_real: {
    id: "guardian_real", nombre: "Guardián real", descripcion: "La élite de la defensa: protege a sus aliados y resiste golpes devastadores.", arquetipo: "vanguardia",
    recursoCombate: "energia", tier: 3, nivelJobMaximo: 60, requisitos: [{ claseId: "caballero", nivelJob: 40 }],
    armasDominadas: ["espada", "lanza", "escudo"], armadurasDominadas: ["pesada"],
    bonoAtaqueArmaDominada: 0.15, bonoDefensaArmaduraDominada: 0.25,
  },
  asesino: {
    id: "asesino", nombre: "Asesino", descripcion: "Especialista en precisión, evasión y daño explosivo.", arquetipo: "agil",
    recursoCombate: "energia", tier: 3, nivelJobMaximo: 60, requisitos: [{ claseId: "duelista", nivelJob: 40 }],
    armasDominadas: ["daga", "espada"], armadurasDominadas: ["ligera"],
    bonoAtaqueArmaDominada: 0.25, bonoDefensaArmaduraDominada: 0.02,
  },
  maestro_espadas: {
    id: "maestro_espadas", nombre: "Maestro de espadas", descripcion: "Un duelista perfeccionado que enlaza combos y contraataques.", arquetipo: "marcial",
    recursoCombate: "energia", tier: 3, nivelJobMaximo: 60, requisitos: [{ claseId: "duelista", nivelJob: 40 }],
    armasDominadas: ["espada"], armadurasDominadas: ["media"],
    bonoAtaqueArmaDominada: 0.25, bonoDefensaArmaduraDominada: 0.08,
  },
  oraculo: {
    id: "oraculo", nombre: "Oráculo", descripcion: "Vidente sagrado que fortalece curaciones y anticipa amenazas.", arquetipo: "apoyo",
    recursoCombate: "mana", tier: 3, nivelJobMaximo: 60, requisitos: [{ claseId: "sacerdote", nivelJob: 40 }],
    armasDominadas: ["baston", "libro"], armadurasDominadas: ["ligera", "media"],
    bonoAtaqueArmaDominada: 0.15, bonoDefensaArmaduraDominada: 0.18,
  },
  hierofante: {
    id: "hierofante", nombre: "Hierofante", descripcion: "Maestro de ritos protectores y poder sagrado concentrado.", arquetipo: "apoyo",
    recursoCombate: "mana", tier: 3, nivelJobMaximo: 60, requisitos: [{ claseId: "sacerdote", nivelJob: 40 }],
    armasDominadas: ["maza", "baston"], armadurasDominadas: ["media", "pesada"],
    bonoAtaqueArmaDominada: 0.12, bonoDefensaArmaduraDominada: 0.2,
  },
  asceta: {
    id: "asceta", nombre: "Asceta", descripcion: "Lleva la disciplina corporal y mental hasta un nivel sobrehumano.", arquetipo: "marcial",
    recursoCombate: "energia", tier: 3, nivelJobMaximo: 60, requisitos: [{ claseId: "monje", nivelJob: 40 }],
    armasDominadas: ["puños"], armadurasDominadas: ["ligera", "media"],
    bonoAtaqueArmaDominada: 0.22, bonoDefensaArmaduraDominada: 0.1,
  },
  gran_maestro: {
    id: "gran_maestro", nombre: "Gran maestro", descripcion: "Un artista marcial completo, capaz de alternar ofensiva y defensa sin perder ritmo.", arquetipo: "marcial",
    recursoCombate: "energia", tier: 3, nivelJobMaximo: 60, requisitos: [{ claseId: "monje", nivelJob: 40 }],
    armasDominadas: ["puños", "maza"], armadurasDominadas: ["media", "pesada"],
    bonoAtaqueArmaDominada: 0.22, bonoDefensaArmaduraDominada: 0.15,
  },
  francotirador: {
    id: "francotirador", nombre: "Francotirador", descripcion: "Tirador de élite que busca puntos débiles y golpes críticos.", arquetipo: "agil",
    recursoCombate: "energia", tier: 3, nivelJobMaximo: 60, requisitos: [{ claseId: "cazador", nivelJob: 40 }],
    armasDominadas: ["arco"], armadurasDominadas: ["ligera"],
    bonoAtaqueArmaDominada: 0.25, bonoDefensaArmaduraDominada: 0.02,
  },
  domabestias: {
    id: "domabestias", nombre: "Domabestias", descripcion: "Cazador experto en trampas, criaturas y control de la presa.", arquetipo: "agil",
    recursoCombate: "energia", tier: 3, nivelJobMaximo: 60, requisitos: [{ claseId: "cazador", nivelJob: 40 }],
    armasDominadas: ["arco", "daga"], armadurasDominadas: ["ligera", "media"],
    bonoAtaqueArmaDominada: 0.2, bonoDefensaArmaduraDominada: 0.08,
  },
  guardian_bosque: {
    id: "guardian_bosque", nombre: "Guardián del bosque", descripcion: "Defensor de rutas salvajes que conoce cada sendero y emboscada.", arquetipo: "hibrido",
    recursoCombate: "ambos", tier: 3, nivelJobMaximo: 60, requisitos: [{ claseId: "explorador", nivelJob: 40 }],
    armasDominadas: ["arco", "daga", "baston"], armadurasDominadas: ["ligera", "media"],
    bonoAtaqueArmaDominada: 0.18, bonoDefensaArmaduraDominada: 0.12, bonusVelocidadExpedicion: 0.2,
  },
  rastreador: {
    id: "rastreador", nombre: "Rastreador", descripcion: "Rastreador veterano que encuentra el punto débil antes de que empiece el combate.", arquetipo: "agil",
    recursoCombate: "energia", tier: 3, nivelJobMaximo: 60, requisitos: [{ claseId: "explorador", nivelJob: 40 }],
    armasDominadas: ["arco", "daga"], armadurasDominadas: ["ligera"],
    bonoAtaqueArmaDominada: 0.22, bonoDefensaArmaduraDominada: 0.06, bonusVelocidadExpedicion: 0.15,
  },
  archimago: {
    id: "archimago", nombre: "Archimago", descripcion: "Maestro de la magia elemental y de ataques de gran alcance.", arquetipo: "arcano",
    recursoCombate: "mana", tier: 3, nivelJobMaximo: 60, requisitos: [{ claseId: "elementalista", nivelJob: 40 }],
    armasDominadas: ["baston", "libro"], armadurasDominadas: ["ligera"],
    bonoAtaqueArmaDominada: 0.25, bonoDefensaArmaduraDominada: 0.02,
  },
  invocador: {
    id: "invocador", nombre: "Invocador", descripcion: "Convoca fuerzas elementales para atacar y debilitar a sus enemigos.", arquetipo: "arcano",
    recursoCombate: "mana", tier: 3, nivelJobMaximo: 60, requisitos: [{ claseId: "elementalista", nivelJob: 40 }],
    armasDominadas: ["baston", "libro"], armadurasDominadas: ["ligera"],
    bonoAtaqueArmaDominada: 0.2, bonoDefensaArmaduraDominada: 0.05,
  },
  nigromante: {
    id: "nigromante", nombre: "Nigromante", descripcion: "Domina el drenaje vital, el veneno y la magia funeraria.", arquetipo: "maldito",
    recursoCombate: "mana", tier: 3, nivelJobMaximo: 60, requisitos: [{ claseId: "brujo", nivelJob: 40 }],
    armasDominadas: ["baston", "libro", "daga"], armadurasDominadas: ["ligera"],
    bonoAtaqueArmaDominada: 0.25, bonoDefensaArmaduraDominada: 0,
  },
  demonologo: {
    id: "demonologo", nombre: "Demonólogo", descripcion: "Forma pactos peligrosos para sacrificar defensa a cambio de poder mágico.", arquetipo: "maldito",
    recursoCombate: "mana", tier: 3, nivelJobMaximo: 60, requisitos: [{ claseId: "brujo", nivelJob: 40 }],
    armasDominadas: ["baston", "libro", "daga"], armadurasDominadas: ["ligera"],
    bonoAtaqueArmaDominada: 0.25, bonoDefensaArmaduraDominada: 0,
  },
} as const satisfies Record<string, DefinicionClase>;
export const CLASES: Readonly<Record<string, DefinicionClase>> = DEFINICIONES;
export type IdClase = keyof typeof DEFINICIONES;

export interface ProgresoClaseRequisito {
  claseId: string;
  nivelJob: number;
  desbloqueada: boolean;
}

export interface RequisitoClasePendiente {
  claseId: string;
  nombreClase: string;
  nivelJobRequerido: number;
  nivelJobActual: number;
  desbloqueada: boolean;
}

export interface ResultadoDesbloqueoClase {
  claseExiste: boolean;
  yaDesbloqueada: boolean;
  puedeDesbloquear: boolean;
  requisitosPendientes: RequisitoClasePendiente[];
}

export function obtenerDefinicionClase(claseId: string): DefinicionClase | undefined {
  return CLASES[claseId];
}

/** Resuelve todos los padres; una clase híbrida hereda de ambas ramas. */
export function obtenerAncestrosClase(claseId: string): string[] {
  if (!obtenerDefinicionClase(claseId)) return [];
  const resultado: string[] = [];
  const visitados = new Set<string>();
  const ruta = new Set<string>();

  const visitar = (id: string) => {
    if (ruta.has(id)) throw new Error(`Ciclo detectado en el grafo de clases: ${id}`);
    const clase = obtenerDefinicionClase(id);
    if (!clase) throw new Error(`La clase requisito "${id}" no existe.`);
    ruta.add(id);
    for (const requisito of clase.requisitos) {
      if (ruta.has(requisito.claseId)) throw new Error(`Ciclo detectado en el grafo de clases: ${requisito.claseId}`);
      if (visitados.has(requisito.claseId)) continue;
      visitados.add(requisito.claseId);
      resultado.push(requisito.claseId);
      visitar(requisito.claseId);
    }
    ruta.delete(id);
  };
  visitar(claseId);
  return resultado;
}

export function obtenerClasesHabilidadDisponibles(claseActualId: string): string[] {
  if (!obtenerDefinicionClase(claseActualId)) return [];
  return [claseActualId, ...obtenerAncestrosClase(claseActualId)];
}

export function puedeUsarHabilidadDeClase(claseActualId: string, clasePropietariaId?: string | null): boolean {
  if (!clasePropietariaId) return true;
  return obtenerClasesHabilidadDisponibles(claseActualId).includes(clasePropietariaId);
}

export function evaluarDesbloqueoClase(
  claseObjetivoId: string,
  progresos: readonly ProgresoClaseRequisito[]
): ResultadoDesbloqueoClase {
  const clase = obtenerDefinicionClase(claseObjetivoId);
  if (!clase) return { claseExiste: false, yaDesbloqueada: false, puedeDesbloquear: false, requisitosPendientes: [] };

  if (progresos.some((progreso) => progreso.claseId === claseObjetivoId && progreso.desbloqueada)) {
    return { claseExiste: true, yaDesbloqueada: true, puedeDesbloquear: false, requisitosPendientes: [] };
  }

  const porClase = new Map(progresos.map((progreso) => [progreso.claseId, progreso]));
  const requisitosPendientes = clase.requisitos.flatMap((requisito) => {
    const progreso = porClase.get(requisito.claseId);
    if (progreso?.desbloqueada && progreso.nivelJob >= requisito.nivelJob) return [];
    return [{
      claseId: requisito.claseId,
      nombreClase: CLASES[requisito.claseId]?.nombre ?? requisito.claseId,
      nivelJobRequerido: requisito.nivelJob,
      nivelJobActual: progreso?.nivelJob ?? 0,
      desbloqueada: progreso?.desbloqueada ?? false,
    }];
  });

  return {
    claseExiste: true,
    yaDesbloqueada: false,
    puedeDesbloquear: requisitosPendientes.length === 0,
    requisitosPendientes,
  };
}


/** Incluye la clase activa, las ya desbloqueadas y las que pueden desbloquearse. */
export function obtenerClasesVisibles(claseActivaId: string, progresos: readonly ProgresoClaseRequisito[]): DefinicionClase[] {
  return Object.values(CLASES).filter((clase) => {
    if (clase.id === claseActivaId) return true;
    const estado = evaluarDesbloqueoClase(clase.id, progresos);
    return estado.yaDesbloqueada || estado.puedeDesbloquear;
  });
}

export function calcularBonificacionesDominioEquipo(
  claseId: string,
  tipoArma?: TipoArma | string | null,
  categoriaArmadura?: TipoArmadura | string | null
): { multiplicadorAtaqueArma: number; multiplicadorDefensaArmadura: number } {
  const clase = obtenerDefinicionClase(claseId);
  if (!clase) return { multiplicadorAtaqueArma: 1, multiplicadorDefensaArmadura: 1 };
  const dominaArma = !!tipoArma && clase.armasDominadas.includes(tipoArma as TipoEquipoDominado);
  const dominaArmadura = !!categoriaArmadura && clase.armadurasDominadas.includes(categoriaArmadura as TipoArmadura);
  // El dominio listado en la clase conserva su bono. Si la categoría no
  // está dominada, la eficacia del equipo baja al 75 %.
  return {
    multiplicadorAtaqueArma: !tipoArma
      ? 1
      : dominaArma && clase.bonoAtaqueArmaDominada > 0
        ? 1 + clase.bonoAtaqueArmaDominada
        : 0.75,
    multiplicadorDefensaArmadura: !categoriaArmadura
      ? 1
      : dominaArmadura && clase.bonoDefensaArmaduraDominada > 0
        ? 1 + clase.bonoDefensaArmaduraDominada
        : 0.75,
  };
}
