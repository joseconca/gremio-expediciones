/** Server-owned content, independent of legacy inventory and gameplay effects.
 * These items have no sprite or use action yet; do not invent asset paths. */
export const EXPEDITION_ITEMS = [
  { id: "world-potion", name: "Poción curativa", chance: 35 },
  { id: "world-ration", name: "Ración de viaje", chance: 55 },
  { id: "world-relic", name: "Fragmento de reliquia", chance: 15 },
] as const;

// Every suffix is a prepositional complement: it agrees with any prefix.
export const EXPEDITION_PREFIXES = [
  "El tesoro", "El alijo", "La caza", "La guarida", "Las ruinas", "El campamento",
  "El bastión", "La senda", "El refugio", "La torre", "El santuario", "La cripta",
  "El paso", "La fortaleza", "El escondite", "La mina", "El pozo", "La vigilia",
  "El misterio", "La amenaza", "El secreto", "La patrulla", "El rescate", "La búsqueda",
  "El asedio", "La incursión", "La emboscada", "El rastro", "La expedición", "El encargo",
  "La defensa", "La entrada", "El hallazgo", "La exploración", "El desafío", "La travesía",
] as const;

export const EXPEDITION_LOCATIONS = [
  "del bosque de ceniza", "del valle de los ecos", "de la colina roja", "del río de cristal",
  "del pantano oscuro", "de la frontera", "del camino viejo", "de las montañas azules",
  "del puente de piedra", "de la aldea perdida", "del desfiladero", "de la costa brumosa",
  "de las cuevas del norte", "del claro de la luna", "del barranco seco", "de la arboleda",
  "del molino abandonado", "del lago profundo", "del sendero oculto", "de las tierras altas",
  "del jardín de espinas", "de la quebrada", "del bosque de abedules", "de la llanura gris",
  "del puerto antiguo", "de las ruinas del alba", "del valle de las nieblas", "de la cantera",
  "de las dunas doradas", "del robledal", "del arroyo frío", "de la senda del cuervo",
  "del paso del lobo", "de las piedras gemelas", "del cerro de la campana", "de la ribera",
  "del bosque de los susurros", "de la torre caída", "del camino de la sal", "de la cumbre blanca",
  "del valle de las luciérnagas", "del campo de brezos", "del puente de los peregrinos", "de la laguna verde",
] as const;

export const EXPEDITION_DESCRIPTIONS = [
  "Los exploradores han encontrado huellas recientes. Investiga la zona y elimina la amenaza.",
  "Una criatura impide el paso a las caravanas. Despeja la ruta para el gremio.",
  "Los vecinos oyen ruidos al caer la noche. Averigua qué acecha en la zona.",
  "Una patrulla ha pedido refuerzos. Enfréntate a la criatura que bloquea su regreso.",
  "Hay suministros abandonados junto al camino. Recupera el lugar antes de que se pierdan.",
  "Las señales del sendero han sido destruidas. Asegura el paso para los viajeros.",
  "Un mensajero vio una criatura entre las ruinas. Comprueba su informe y acaba con el peligro.",
  "Los leñadores no se atreven a volver al trabajo. Libera la zona de su amenaza.",
  "Un campamento permanece vacío desde ayer. Sigue las huellas y asegura el lugar.",
  "Los mercaderes han cambiado de ruta por miedo. Devuelve la seguridad al camino.",
  "Una criatura ronda los almacenes del gremio. Intercepta su avance antes de que llegue.",
  "El vigía ha encendido una señal de alarma. Acude a su llamada y despeja la zona.",
  "Se han encontrado restos de una caravana. Investiga el ataque y elimina al responsable.",
  "Los rastreadores han marcado una guarida. Aprovecha la oportunidad para neutralizar el peligro.",
  "Un viajero logró escapar de una emboscada. Sigue su descripción hasta el encuentro.",
  "El paso lleva días cerrado. Derrota a la criatura que mantiene alejados a los viajeros.",
  "Las reservas de un puesto avanzado están en riesgo. Protege la ruta de abastecimiento.",
  "Los habitantes necesitan recuperar sus herramientas. Asegura el lugar donde las abandonaron.",
  "Una amenaza se acerca a los campos. Detén su avance antes de que alcance las cosechas.",
  "El gremio quiere reabrir una ruta olvidada. Explora sus alrededores y elimina el peligro.",
  "Una expedición anterior dejó señales de auxilio. Sigue su rastro y asegura el regreso.",
  "Los guardias han localizado movimientos extraños. Investiga y neutraliza la amenaza.",
  "Hay huellas junto al refugio de los peregrinos. Despeja sus alrededores para que puedan descansar.",
  "Una criatura custodia un cargamento perdido. Derrota a su guardián y asegura la zona.",
] as const;

// Both species use actual existing art. Elite names are variants, not new assets.
export const EXPEDITION_ENEMIES = [
  {
    sprite: "/sprites/enemies/arana.png",
    normal: ["Araña del camino", "Araña de la espesura", "Araña de las ruinas", "Araña acechadora"],
    elite: ["Matriarca de la espesura", "Araña reina de las ruinas", "Tejedora del abismo", "Araña ancestral"],
  },
  {
    sprite: "/sprites/enemies/ogro.png",
    normal: ["Ogro del barranco", "Ogro errante", "Ogro de la cantera", "Ogro saqueador"],
    elite: ["Ogro señor del paso", "Ogro caudillo de la frontera", "Ogro guardián de las ruinas", "Ogro coloso del valle"],
  },
] as const;