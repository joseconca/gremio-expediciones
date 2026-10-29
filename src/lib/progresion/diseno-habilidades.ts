import type { ComandoTactico, ElementoTactico } from "../expediciones/motor-tactico";

/** Datos serializables: ninguna mecánica se deduce del nombre o descripción. */
export type OperacionHabilidad =
  | ComandoTactico
  | { tipo: "guardia_porcentaje"; objetivo: "actor" | "objetivo"; porcentaje: number; duracion: number }
  | { tipo: "consumir_preparacion"; clave: string; efecto: "ruptura" | "potencia" | "cura" | "guardia"; factor: number }
  | { tipo: "disipar"; objetivo: "actor" | "objetivo"; negativo: boolean }
  | { tipo: "recuperar_mana"; cantidad: number };
export type CondicionPasiva = "ataque" | "apoyo" | "cura_efectiva" | "herida" | "regeneracion" | "guardia" | "ruptura" | "disipacion" | "movilidad" | "invocacion" | "orden" | "sacrificio" | "pacto" | "reaccion" | "preparacion" | "consumo" | "alternar" | "cambiar_objetivo" | "objetivo_herido" | "vida_baja" | "enemigo_protegido" | "objetivo_marcado" | "energia_baja" | "mana_bajo" | "coste_mixto" | "area" | "limpieza" | "fila_propia" | "sobrecuracion";
export type VentajaPasiva = "precision" | "guardia" | "estabilizar" | "curacion" | "mana" | "energia" | "exponer" | "regeneracion" | "resistir" | "limpiar_herida" | "guardar_preparacion";
export type ReglaPasiva = { condicion: CondicionPasiva; ventaja: VentajaPasiva };
export type DisenoActiva = {
  efecto: "dano" | "curacion" | "estado" | "curacion_progresiva";
  potencia?: number;
  cura?: number;
  vendaje?: number;
  barrera?: boolean;
  drenaje?: number;
  herida?: number;
  duracion?: number;
  area?: "fila" | "adyacentes" | "columna";
  propio?: boolean;
  elemento?: ElementoTactico;
  operaciones: OperacionHabilidad[];
};
export type DisenoClase = { activas: DisenoActiva[]; pasivas: [ReglaPasiva,ReglaPasiva] };
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
const area = (d:DisenoActiva,patron:"fila"|"adyacentes"|"columna"="fila"): DisenoActiva=>({...d,area:patron});
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
  mago:{activas:[elemental(golpe(1.25),"arcano"),elemental(area(herida(golpe(1.75),0.07),"adyacentes"),"fuego"),propio(apoyo(preparar("concentracion"),guardia(0.06,"actor")))],pasivas:[p("preparacion","resistir"),p("mana_bajo","estabilizar")]},
  superNovato:{activas:[golpe(2,consumir("enlace"),preparar("enlace")),propio(cura(0.08,{tipo:"recurso",recurso:"energia",cantidad:15})),golpe(1.75,consumir("enlace","guardia"),preparar("proxima_disciplina"))],pasivas:[p("alternar","energia"),p("vida_baja","curacion")]},
  caballero:{activas:[apoyo(guardia(0.16),preparar("custodia")),golpe(0.95,marca("provocacion")),propio(apoyo(guardia(0.14),consumir("custodia","guardia")))],pasivas:[p("guardia","guardar_preparacion"),p("apoyo","estabilizar")]},
  duelista:{activas:[golpe(1.05,preparar("lectura")),golpe(1.65,consumir("lectura","potencia")),propio(apoyo(guardia(0.1),preparar("lectura")))],pasivas:[p("consumo","precision"),p("alternar","guardar_preparacion")]},
  sacerdote:{activas:[cura(0.2,preparar("triaje")),cura(0.09,limpiar),golpe(1.1,marca("sentencia"))],pasivas:[p("objetivo_herido","estabilizar"),p("regeneracion","curacion")]},
  monje:{activas:[golpe(1.15,preparar("chi")),propio(apoyo({tipo:"recurso",recurso:"energia",cantidad:30},preparar("chi"))),golpe(1.55,consumir("chi"),disipar)],pasivas:[p("preparacion","precision"),p("energia_baja","limpiar_herida")]},
  cazador:{activas:[golpe(1,marca("presa"),preparar("debilidad")),golpe(1.55,consumir("debilidad","potencia")),golpe(1.4,marca("presa"),adelantar("herida"))],pasivas:[p("objetivo_herido","guardar_preparacion"),p("objetivo_marcado","resistir")]},
  explorador:{activas:[golpe(1.1,preparar("ruta")),apoyo(marca("trampa"),{tipo:"interrumpir",debilitamiento:0.25}),propio(apoyo(mover(2),consumir("ruta","guardia")))],pasivas:[p("movilidad","energia"),p("consumo","regeneracion")]},
  elementalista:{activas:[elemental(golpe(1.25),"rayo"),elemental(golpe(1.05,preparar("afinidad")),"hielo"),elemental(area(golpe(1.9,consumir("afinidad"))),"fuego")],pasivas:[p("reaccion","resistir"),p("reaccion","guardar_preparacion")]},
  brujo:{activas:[{...golpe(1.1,adelantar("herida")),drenaje:.15},herida(golpe(0.8,marca("maldicion"))),area(golpe(1.65,consumir("maldicion"),preparar("maldicion")),"adyacentes")],pasivas:[p("herida","guardia"),p("disipacion","guardar_preparacion")]},
  cruzado:{activas:[golpe(1.2,preparar("consuelo")),cura(0.16,consumir("consuelo","cura")),golpe(1.4,consumir("custodia"),disipar)],pasivas:[p("guardia","curacion"),p("cura_efectiva","resistir")]},
  pirata:{activas:[golpe(1.1,preparar("treta")),propio(apoyo(mover(2),guardia(0.08),preparar("treta"))),golpe(1.1,{tipo:"robar",familia:"guardia",fraccion:0.5},consumir("treta"))],pasivas:[p("movilidad","limpiar_herida"),p("disipacion","energia")]},
  druida:{activas:[herida(elemental(golpe(0.9,preparar("crecimiento")),"naturaleza")),apoyo(guardia(0.11),preparar("crecimiento")),area(cura(0.23,consumir("crecimiento","cura")))],pasivas:[p("regeneracion","guardar_preparacion"),p("reaccion","regeneracion")]},
  espadachin_runico:{activas:[golpe(1.2,consumir("runa"),preparar("runa")),golpe(1.05,marca("runa_hostil"),preparar("runa")),propio(apoyo(mover(1),guardia(0.09),preparar("runa")))],pasivas:[p("consumo","guardar_preparacion"),p("alternar","exponer")]},
  paladin:{activas:[golpe(1.25,preparar("voto")),cura(0.17,consumir("voto","cura")),golpe(1.35,marca("agravio"),guardia(0.04,"actor"))],pasivas:[p("cura_efectiva","guardar_preparacion"),p("limpieza","resistir")]},
  guardian_real:{activas:[apoyo(guardia(0.18),preparar("custodia")),golpe(1.3,consumir("custodia")),area(apoyo(guardia(0.24),preparar("custodia")))],pasivas:[p("guardia","estabilizar"),p("fila_propia","guardia")]},
  asesino:{activas:[golpe(1.25,marca("exposicion")),herida(golpe(0.9,preparar("ejecucion"))),golpe(1.75,consumir("ejecucion","potencia"))],pasivas:[p("movilidad","resistir"),p("objetivo_herido","exponer")]},
  maestro_espadas:{activas:[golpe(1.25,preparar("forma")),propio(apoyo(guardia(0.12),preparar("forma_defensiva"))),golpe(1.75,consumir("forma"),consumir("forma_defensiva","potencia"))],pasivas:[p("alternar","resistir"),p("preparacion","guardar_preparacion")]},
  oraculo:{activas:[golpe(1,preparar("augurio"),marca("observacion")),regenerar(0.075,preparar("augurio")),golpe(1.4,consumir("augurio"),{tipo:"interrumpir",debilitamiento:0.25})],pasivas:[p("preparacion","estabilizar"),p("objetivo_herido","regeneracion")]},
  hierofante:{activas:[golpe(1.15,preparar("verso")),regenerar(0.065,{tipo:"estado",objetivo:"actor",familia:"campo",clave:"ritual",valor:1,duracion:3}),area(cura(0.24,consumir("verso","cura")))],pasivas:[p("regeneracion","resistir"),p("apoyo","mana")]},
  asceta:{activas:[golpe(1.15,consumir("vacio"),preparar("vacio")),propio(apoyo({tipo:"recurso",recurso:"energia",cantidad:35},preparar("vacio"))),propio(apoyo(mover(2),consumir("vacio","guardia")))],pasivas:[p("energia_baja","resistir"),p("consumo","energia")]},
  gran_maestro:{activas:[golpe(1.25,preparar("forma")),propio(apoyo(guardia(0.1),preparar("forma"))),golpe(1.75,consumir("forma","potencia"))],pasivas:[p("alternar","guardia"),p("preparacion","energia")]},
  francotirador:{activas:[golpe(1.45,consumir("mira","potencia"),preparar("mira")),area(golpe(2,preparar("mira")),"columna"),golpe(1.8,consumir("mira"))],pasivas:[p("objetivo_marcado","guardar_preparacion"),p("preparacion","guardia")]},
  domabestias:{activas:[golpe(0.7,invocar("bestia",.35)),golpe(0.9,marca("trampa"),disipar),golpe(1.05,orden)],pasivas:[p("invocacion","regeneracion"),p("orden","precision")]},
  guardian_bosque:{activas:[area(apoyo(guardia(0.24),preparar("territorio"))),elemental(golpe(1.25,consumir("territorio")),"naturaleza"),area(regenerar(0.075))],pasivas:[p("guardia","resistir"),p("movilidad","guardia")]},
  rastreador:{activas:[golpe(1.05,preparar("observacion")),golpe(1.25,consumir("observacion"),marca("presa")),golpe(1.55,consumir("observacion","potencia"),preparar("observacion"))],pasivas:[p("cambiar_objetivo","guardar_preparacion"),p("objetivo_marcado","guardia")]},
  archimago:{activas:[golpe(1.3,consumir("compresion"),preparar("compresion")),area(golpe(2,consumir("compresion","potencia"))),area(golpe(2.3,consumir("compresion","potencia"),{tipo:"estado",objetivo:"actor",familia:"exposicion",clave:"agotamiento",valor:0.1,duracion:2}))],pasivas:[p("mana_bajo","precision"),p("preparacion","mana")]},
  invocador:{activas:[golpe(0.7,invocar("familiar")),golpe(0.65,orden),area(golpe(1.3,sacrificar("acompanante")))],pasivas:[p("invocacion","mana"),p("orden","guardar_preparacion")]},
  nigromante:{activas:[{...golpe(1.15,preparar("fragmento"),adelantar("herida"),orden),drenaje:.18},herida(golpe(0.9,preparar("fragmento")),0.18),golpe(0.8,consumir("fragmento"),invocar("sombras",0.38))],pasivas:[p("herida","estabilizar"),p("sacrificio","guardia")]},
  demonologo:{activas:[golpe(1.1,marca("contrato")),propio(apoyo({tipo:"pacto",fraccionVida:0.08,duracion:3},preparar("contrato"))),area(golpe(1.9,sacrificar("pacto"),consumir("contrato")))],pasivas:[p("pacto","mana"),p("cura_efectiva","limpiar_herida")]},
  berserker:{activas:[herida(golpe(1,preparar("furia"))),propio(apoyo(preparar("furia"),{tipo:"estado",objetivo:"actor",familia:"exposicion",clave:"furia_expuesta",valor:0.1,duracion:2})),area(golpe(1.9,consumir("furia","potencia")))],pasivas:[p("herida","resistir"),p("sacrificio","estabilizar")]},
  luchador:{activas:[golpe(1.15,preparar("contacto")),propio(apoyo(guardia(0.1),preparar("contacto"))),golpe(1.35,consumir("contacto"),{tipo:"interrumpir",debilitamiento:0.25})],pasivas:[p("energia_baja","guardia"),p("guardia","precision")]},
  centinela:{activas:[golpe(1.15,marca("senal"),preparar("vigilia")),area(apoyo(guardia(0.21),preparar("vigilia"))),area(golpe(1.7,consumir("vigilia")))],pasivas:[p("objetivo_marcado","estabilizar"),p("cambiar_objetivo","guardia")]},
  escriba_arcano:{activas:[golpe(1,marca("debilidad","sello")),apoyo(guardia(0.09),preparar("enlace_de_escritura")),herida(golpe(0.9,consumir("enlace_de_escritura"),marca("abrasion","sello")))],pasivas:[p("consumo","resistir"),p("disipacion","precision")]},
  bardo:{activas:[golpe(1.05,preparar("nota")),area(apoyo(guardia(0.18),preparar("melodia"))),area(regenerar(0.075,consumir("nota","cura")))],pasivas:[p("apoyo","energia"),p("regeneracion","estabilizar")]},
  comerciante:{activas:[golpe(1.05,preparar("suministro")),cura(0.1,preparar("suministro")),golpe(1,consumir("suministro","guardia"),marca("distraccion"))],pasivas:[p("sobrecuracion","guardia"),p("sobrecuracion","energia")]},
  chaman:{activas:[elemental(golpe(1.15,preparar("carga_natural")),"rayo"),area(apoyo(guardia(0.2),{tipo:"estado",objetivo:"actor",familia:"campo",clave:"totem",valor:1,duracion:3})),area(elemental(golpe(1.8,consumir("carga_natural")),"fuego"))],pasivas:[p("reaccion","guardia"),p("sacrificio","resistir")]},
  inquisidor:{activas:[golpe(0.95,disipar,preparar("testimonio")),cura(0.12,limpiar,preparar("testimonio")),golpe(1.45,consumir("testimonio"),marca("sentencia"))],pasivas:[p("limpieza","estabilizar"),p("disipacion","exponer")]},
  heraldo_guerra:{activas:[golpe(1.1,preparar("orden")),area(apoyo(guardia(0.21),preparar("orden"))),area(apoyo(guardia(0.18),preparar("concentracion"),consumir("orden","guardia")))],pasivas:[p("cambiar_objetivo","precision"),p("alternar","mana")]},
  ninja:{activas:[herida(golpe(1.1,preparar("senuelo"))),propio(apoyo(mover(2),guardia(0.08),preparar("senuelo"))),elemental(area(golpe(1.8,consumir("senuelo"))),"fuego")],pasivas:[p("movilidad","precision"),p("consumo","estabilizar")]},
  alquimista:{activas:[golpe(0.95,marca("reactivo")),cura(0.13,limpiar),area(golpe(1.8,consumir("reactivo"),disipar))],pasivas:[p("sobrecuracion","guardar_preparacion"),p("limpieza","regeneracion")]},
  herrero:{activas:[golpe(1.1,disipar),apoyo(guardia(0.13),preparar("refuerzo")),area(golpe(1.8,consumir("refuerzo")))],pasivas:[p("guardia","regeneracion"),p("consumo","guardia")]},
  verdugo:{activas:[golpe(1.15,disipar,preparar("ejecucion")),golpe(1.35,preparar("ejecucion")),golpe(1.85,consumir("ejecucion","potencia"))],pasivas:[p("enemigo_protegido","guardar_preparacion"),p("objetivo_herido","precision")]},
  saqueador:{activas:[{...herida(golpe(1.05),0.16),drenaje:.1},propio(cura(0.1,mover(2))),golpe(1.25,{...sacrificar("herida"),resultado:"cura_actor"})],pasivas:[p("herida","precision"),p("sacrificio","regeneracion")]},
  campeon_arena:{activas:[golpe(1.2,preparar("adaptacion")),propio(cura(0.1,preparar("adaptacion"))),area(golpe(1.9,consumir("adaptacion")))],pasivas:[p("alternar","estabilizar"),p("energia_baja","energia")]},
  mariscal:{activas:[area(golpe(1.75,preparar("formacion"))),apoyo(guardia(0.12),preparar("formacion")),golpe(1.5,consumir("formacion"))],pasivas:[p("movilidad","estabilizar"),p("area","resistir")]},
  vigia:{activas:[golpe(1.15,preparar("respuesta")),propio(apoyo(mover(2),preparar("respuesta"),guardia(0.07))),area(golpe(1.9,consumir("respuesta")))],pasivas:[p("cambiar_objetivo","resistir"),p("preparacion","exponer")]},
  runista:{activas:[herida(golpe(0.9,marca("circuito","sello"))),apoyo(guardia(0.1),preparar("circuito")),area(golpe(1.7,consumir("circuito"),{tipo:"circuito",maximo:3}))],pasivas:[p("consumo","mana"),p("enemigo_protegido","exponer")]},
  abjurador:{activas:[golpe(1.05,consumir("contramagia"),disipar),{...apoyo(preparar("contramagia")),barrera:true},area(golpe(1.65,disipar))],pasivas:[p("guardia","mana"),p("disipacion","resistir")]},
  senor_guerra:{activas:[area(golpe(1.85,preparar("frente"))),area(apoyo(guardia(0.24),preparar("frente"))),golpe(1.9,consumir("frente","potencia"))],pasivas:[p("ruptura","guardia"),p("guardia","exponer")]},
  avatar_tormenta:{activas:[area(elemental(golpe(1.8,consumir("tempestad")),"rayo")),propio(apoyo(preparar("tempestad"),guardia(0.1))),golpe(1.9,consumir("tempestad","potencia"))],pasivas:[p("coste_mixto","mana"),p("preparacion","regeneracion")]},
  cazador_espectral:{activas:[{...golpe(1.2,preparar("vinculo_funeral")),drenaje:.15},apoyo(guardia(0.12),preparar("observacion")),area(herida(golpe(1.8,consumir("observacion","cura")),0.08))],pasivas:[p("herida","guardar_preparacion"),p("cambiar_objetivo","regeneracion")]},
  arconte:{activas:[area(golpe(1.85,preparar("luz"))),area(cura(0.26,limpiar,preparar("luz"))),area(apoyo(guardia(0.23),consumir("luz","guardia")))],pasivas:[p("apoyo","resistir"),p("sobrecuracion","curacion")]},
  justiciero:{activas:[golpe(1.25,preparar("deuda")),cura(0.15,guardia(0.06),preparar("deuda")),area(golpe(1.85,consumir("deuda")))],pasivas:[p("cura_efectiva","estabilizar"),p("sobrecuracion","resistir")]},
  hoja_velo:{activas:[golpe(1.25,consumir("velo")),propio(apoyo(mover(1),preparar("velo"),guardia(0.08))),area(golpe(1.85,consumir("velo","potencia")))],pasivas:[p("ruptura","precision"),p("movilidad","guardar_preparacion")]},
  danzaespadas:{activas:[area(golpe(1.8,preparar("compas"))),area(apoyo(guardia(0.2),preparar("compas"))),golpe(1.8,consumir("compas","potencia"))],pasivas:[p("movilidad","mana"),p("alternar","precision")]},
  corsario:{activas:[golpe(1.2,marca("incursion"),preparar("incursion")),propio(apoyo(mover(2),guardia(0.1),preparar("incursion"))),area(golpe(1.85,consumir("incursion")))],pasivas:[p("objetivo_marcado","energia"),p("consumo","curacion")]},
};
