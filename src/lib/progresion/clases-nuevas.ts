import type { DefinicionClase } from "./clases";

type DatosClase = Pick<DefinicionClase, "id" | "nombre" | "descripcion" | "arquetipo" | "recursoCombate" | "tier" | "armasDominadas" | "armadurasDominadas"> & {
  padres: string[];
};

function clase(datos: DatosClase): DefinicionClase {
  const { padres, ...definicion } = datos;
  return {
    ...definicion,
    nivelJobMaximo: datos.tier === 2 ? 60 : datos.tier === 2.5 ? 70 : 80,
    requisitos: padres.map((claseId) => ({ claseId, nivelJob: datos.tier <= 2.5 ? 20 : 30 })),
    bonoAtaqueArmaDominada: datos.tier >= 3 ? 0.22 : 0.18,
    bonoDefensaArmaduraDominada: 0.1,
  };
}

export const CLASES_NUEVAS: Readonly<Record<string, DefinicionClase>> = Object.fromEntries([
  clase({ id: "berserker", nombre: "Berserker", descripcion: "Canaliza su furia con hachas, sangrado y ataques que sacrifican protección.", arquetipo: "marcial", recursoCombate: "energia", tier: 2, padres: ["espadachin"], armasDominadas: ["hacha"], armadurasDominadas: ["media"] }),
  clase({ id: "luchador", nombre: "Luchador", descripcion: "Combatiente de puños que mantiene la presión mediante su energía y resistencia.", arquetipo: "marcial", recursoCombate: "energia", tier: 2, padres: ["acolito"], armasDominadas: ["puños"], armadurasDominadas: ["ligera", "media"] }),
  clase({ id: "centinela", nombre: "Centinela", descripcion: "Guardia de fronteras que añade lanza y hacha a su entrenamiento de arquero.", arquetipo: "vanguardia", recursoCombate: "energia", tier: 2, padres: ["arquero"], armasDominadas: ["lanza", "hacha", "escudo"], armadurasDominadas: ["media", "pesada"] }),
  clase({ id: "escriba_arcano", nombre: "Escriba arcano", descripcion: "Estudioso de libros y sellos que debilitan al rival y protegen a sus compañeros.", arquetipo: "arcano", recursoCombate: "mana", tier: 2, padres: ["mago"], armasDominadas: ["libro"], armadurasDominadas: ["ligera"] }),
  clase({ id: "bardo", nombre: "Bardo", descripcion: "Acompaña a sus aliados con canciones de precisión, evasión y recuperación.", arquetipo: "apoyo", recursoCombate: "mana", tier: 2, padres: ["arquero"], armasDominadas: ["baston"], armadurasDominadas: ["ligera"] }),
  { ...clase({ id: "comerciante", nombre: "Comerciante", descripcion: "Profesión secreta: completa cinco intercambios comerciales y alcanza Job 20 en una troncal. Obtiene un 20 % más de oportunidades de botín y un 10 % más de oro comercial.", arquetipo: "agil", recursoCombate: "energia", tier: 2, padres: ["novato"], armasDominadas: ["daga", "maza"], armadurasDominadas: ["ligera", "media"] }), requisitos: [{ claseId: "novato", nivelJob: 10 }], descubrimiento: { intercambiosMinimos: 5, nivelJobTroncal: 20 }, bonusBotin: 0.2, bonusOroComercio: 0.1 },
  clase({ id: "chaman", nombre: "Chamán", descripcion: "Une la furia del hacha con maldiciones elementales persistentes.", arquetipo: "hibrido", recursoCombate: "ambos", tier: 2.5, padres: ["berserker", "elementalista"], armasDominadas: ["hacha", "baston"], armadurasDominadas: ["ligera", "media"] }),
  clase({ id: "inquisidor", nombre: "Inquisidor", descripcion: "Combina purificación, drenaje y debilitamientos mediante mazas y libros.", arquetipo: "hibrido", recursoCombate: "mana", tier: 2.5, padres: ["sacerdote", "brujo"], armasDominadas: ["maza", "libro"], armadurasDominadas: ["media"] }),
  clase({ id: "heraldo_guerra", nombre: "Heraldo de guerra", descripcion: "Prepara las ofensivas de sus compañeros con sellos y mejoras de ataque y defensa.", arquetipo: "apoyo", recursoCombate: "ambos", tier: 2.5, padres: ["luchador", "escriba_arcano"], armasDominadas: ["puños", "libro"], armadurasDominadas: ["media"] }),
  clase({ id: "ninja", nombre: "Ninja", descripcion: "Combina el ritmo del Bardo, la movilidad del Explorador y las técnicas del Mago.", arquetipo: "agil", recursoCombate: "ambos", tier: 2.5, padres: ["bardo", "explorador", "mago"], armasDominadas: ["daga"], armadurasDominadas: ["ligera"] }),
  clase({ id: "alquimista", nombre: "Alquimista", descripcion: "Especialista en preparados ofensivos y elixires. La transformación de objetos se incorporará más adelante.", arquetipo: "arcano", recursoCombate: "mana", tier: 2.5, padres: ["comerciante", "mago"], armasDominadas: ["libro"], armadurasDominadas: ["ligera"] }),
  clase({ id: "herrero", nombre: "Herrero", descripcion: "Combina el oficio comercial con refuerzos temporales de ataque y defensa. La fabricación se incorporará más adelante.", arquetipo: "vanguardia", recursoCombate: "energia", tier: 2.5, padres: ["comerciante", "espadachin"], armasDominadas: ["hacha", "maza"], armadurasDominadas: ["media", "pesada"] }),
  clase({ id: "verdugo", nombre: "Verdugo", descripcion: "Especialista en golpes pesados que abren la defensa del objetivo.", arquetipo: "vanguardia", recursoCombate: "energia", tier: 3, padres: ["berserker"], armasDominadas: ["hacha"], armadurasDominadas: ["pesada"] }),
  clase({ id: "saqueador", nombre: "Saqueador", descripcion: "Desgasta a sus enemigos con sangrado y recupera vida al atacar.", arquetipo: "marcial", recursoCombate: "energia", tier: 3, padres: ["berserker"], armasDominadas: ["hacha", "daga"], armadurasDominadas: ["ligera", "media"] }),
  clase({ id: "campeon_arena", nombre: "Campeón de arena", descripcion: "Luchador resistente que administra su energía para sostener combates largos.", arquetipo: "marcial", recursoCombate: "energia", tier: 3, padres: ["luchador"], armasDominadas: ["puños", "maza"], armadurasDominadas: ["media"] }),
  clase({ id: "mariscal", nombre: "Mariscal", descripcion: "Protege a sus aliados y controla las filas enemigas con su lanza.", arquetipo: "vanguardia", recursoCombate: "energia", tier: 3, padres: ["centinela"], armasDominadas: ["lanza", "escudo"], armadurasDominadas: ["pesada"] }),
  clase({ id: "vigia", nombre: "Vigía", descripcion: "Alterna hacha y arco para debilitar al enemigo con precisión.", arquetipo: "agil", recursoCombate: "energia", tier: 3, padres: ["centinela"], armasDominadas: ["hacha", "arco"], armadurasDominadas: ["media"] }),
  clase({ id: "runista", nombre: "Runista", descripcion: "Graba sellos ofensivos que causan daño mágico progresivo.", arquetipo: "arcano", recursoCombate: "mana", tier: 3, padres: ["escriba_arcano"], armasDominadas: ["libro", "baston"], armadurasDominadas: ["ligera"] }),
  clase({ id: "abjurador", nombre: "Abjurador", descripcion: "Protege a sus compañeros con barreras temporales que bloquean un ataque directo.", arquetipo: "apoyo", recursoCombate: "mana", tier: 3, padres: ["escriba_arcano"], armasDominadas: ["libro", "baston"], armadurasDominadas: ["ligera"] }),
  clase({ id: "senor_guerra", nombre: "Señor de la guerra", descripcion: "Une la ofensiva pesada del Verdugo con la protección del Mariscal.", arquetipo: "vanguardia", recursoCombate: "energia", tier: 3.5, padres: ["verdugo", "mariscal"], armasDominadas: ["hacha", "lanza", "escudo"], armadurasDominadas: ["pesada"] }),
  clase({ id: "avatar_tormenta", nombre: "Avatar de la tormenta", descripcion: "Canaliza magia de área mediante técnicas marciales.", arquetipo: "hibrido", recursoCombate: "ambos", tier: 3.5, padres: ["gran_maestro", "archimago"], armasDominadas: ["puños", "baston"], armadurasDominadas: ["media"] }),
  clase({ id: "cazador_espectral", nombre: "Cazador espectral", descripcion: "Combina disparos precisos con drenaje y magia funeraria.", arquetipo: "agil", recursoCombate: "ambos", tier: 3.5, padres: ["francotirador", "nigromante"], armasDominadas: ["arco", "daga"], armadurasDominadas: ["ligera"] }),
  clase({ id: "arconte", nombre: "Arconte", descripcion: "Alterna sostenimiento sagrado y ofensiva arcana para apoyar al grupo.", arquetipo: "apoyo", recursoCombate: "mana", tier: 3.5, padres: ["hierofante", "archimago"], armasDominadas: ["libro", "baston"], armadurasDominadas: ["ligera", "media"] }),
  clase({ id: "justiciero", nombre: "Justiciero", descripcion: "Combatiente sagrado resistente que combina mazas, puños y recuperación.", arquetipo: "hibrido", recursoCombate: "ambos", tier: 3.5, padres: ["paladin", "campeon_arena"], armasDominadas: ["maza", "puños", "escudo"], armadurasDominadas: ["pesada"] }),
  clase({ id: "hoja_velo", nombre: "Hoja del velo", descripcion: "Evolución del Espadachín rúnico: sus técnicas escalan con ataque físico e infligen daño mágico.", arquetipo: "marcial", recursoCombate: "ambos", tier: 3.5, padres: ["espadachin_runico", "maestro_espadas"], armasDominadas: ["espada"], armadurasDominadas: ["media"] }),
  clase({ id: "danzaespadas", nombre: "Danzaespadas", descripcion: "Une danzas de apoyo con ataques ágiles de espada.", arquetipo: "agil", recursoCombate: "ambos", tier: 3.5, padres: ["bardo", "maestro_espadas"], armasDominadas: ["espada"], armadurasDominadas: ["ligera"] }),
  { ...clase({ id: "corsario", nombre: "Corsario", descripcion: "Evolución del Pirata que domina maniobras de abordaje, evasión y ataques oportunistas.", arquetipo: "agil", recursoCombate: "energia", tier: 3.5, padres: ["pirata"], armasDominadas: ["espada", "daga", "arco"], armadurasDominadas: ["ligera", "media"] }), bonusVelocidadExpedicion: 0.15 },
].map((definicion) => [definicion.id, definicion]));
