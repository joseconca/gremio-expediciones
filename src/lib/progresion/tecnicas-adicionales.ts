import { CLASES } from "./clases";
import { CATALOGO_TECNICAS_ADICIONALES } from "./catalogo-tecnicas-adicionales";
import type { ComandoTactico, FamiliaTactica, TecnicaTactica, UnidadTactica } from "../expediciones/motor-tactico";
import type { DefinicionHabilidad } from "../tiposJuego";
import { describirDisenoActiva } from "./catalogo-redisenado";
import type { DisenoActiva, OperacionHabilidad } from "./diseno-habilidades";

const consumir = (clave: string): ComandoTactico => ({ tipo: "consumir", objetivo: "actor", clave, maximo: 2 });
const marca = (clave: string, familia: FamiliaTactica = "preparacion", objetivo: "actor" | "objetivo" = "actor", valor = 1): ComandoTactico => ({ tipo: "estado", familia, clave, objetivo, valor, duracion: 2 });
const limpiar = (familia: FamiliaTactica, objetivo: "actor" | "objetivo" = "actor"): ComandoTactico => ({ tipo: "limpiar", objetivo, familia, maximo: 1 });
const retirar = (fila: number): ComandoTactico => ({ tipo: "mover", fila });
const resistencia = (clave: string, objetivo: "actor" | "objetivo" = "actor"): ComandoTactico => marca(clave, "resistencia", objetivo, 0.15);
const debilitar: ComandoTactico = { tipo: "interrumpir", debilitamiento: 0.25 };
const transferirGuardia: ComandoTactico = { tipo: "transferir", familia: "guardia", fraccion: 0.5 };
const transferirRegeneracion: ComandoTactico = { tipo: "transferir", familia: "regeneracion", fraccion: 0.5 };
const adelantarRegeneracion: ComandoTactico = { tipo: "adelantar", familia: "regeneracion", objetivo: "objetivo" };
const adelantarHerida: ComandoTactico = { tipo: "adelantar", familia: "herida", objetivo: "objetivo" };
const custodia: ComandoTactico = { tipo: "vincular", clave: "custodia", duracion: 2 };

/**
 * Las instrucciones se eligen por identificador explícito, no por texto. Las
 * cantidades de escudo dependen del actor al preparar la acción y se almacenan
 * como cantidades reales; no se vuelven a multiplicar al recibir un impacto.
 */
export function crearTecnicaAdicional(claseId: string, actor: UnidadTactica): TecnicaTactica {
  const datos = CATALOGO_TECNICAS_ADICIONALES[claseId as keyof typeof CATALOGO_TECNICAS_ADICIONALES];
  const clase = CLASES[claseId];
  if (!datos || !clase) throw new Error("CLASE_TACTICA_INEXISTENTE");
  const guardia = (clave: string, objetivo: "actor" | "objetivo" = "actor"): ComandoTactico => ({ tipo: "estado", familia: "guardia", clave, objetivo, valor: Math.max(1, Math.floor(actor.hpMaximo * 0.04)), duracion: 1 });
  const programas: Record<typeof datos.programa, readonly ComandoTactico[]> = {
    observar: [debilitar, marca("evaluacion", "precision", "actor", 10)],
    guardia_apertura: [limpiar("guardia"), marca("apertura")],
    transferir_regeneracion: [transferirRegeneracion],
    senal: [marca("senal", "exposicion", "objetivo", 0.15)],
    brasa_ruptura: [consumir("brasa"), { tipo: "limpiar", objetivo: "objetivo", familia: "guardia", maximo: 1 }],
    leccion_movilidad: [limpiar("preparacion"), retirar(1), marca("proxima_disciplina")],
    transferir_guardia: [transferirGuardia],
    lectura: [debilitar, marca("lectura")],
    cerrar_herida: [adelantarRegeneracion, limpiar("herida", "objetivo")],
    soltar_chi: [consumir("chi"), limpiar("exposicion"), guardia("tension_liberada")],
    cambiar_presa: [{ tipo: "vincular", clave: "presa", duracion: 2 }, debilitar],
    rastro_falso: [retirar(2), resistencia("rastro_falso")],
    mojado: [{ tipo: "estado", objetivo: "objetivo", familia: "marca", clave: "elemento", elemento: "agua", valor: 0, duracion: 2 }],
    romper_maleficio: [adelantarHerida, { tipo: "consumir", objetivo: "objetivo", clave: "maldicion", maximo: 2 }],
    guardia_cura: [{ tipo: "sacrificar", familia: "guardia", fraccion: 0.5 }],
    robar_guardia: [{ tipo: "robar", familia: "guardia", fraccion: 0.5 }],
    trasplantar: [transferirRegeneracion, marca("semilla", "marca", "objetivo")],
    borrar_runa: [consumir("runa"), retirar(1), resistencia("runa_disuelta")],
    renovar_voto: [custodia, resistencia("voto_sagrado", "objetivo")],
    evacuacion: [custodia, retirar(1)],
    cortar_retirada: [{ tipo: "consumir", objetivo: "objetivo", clave: "exposicion", maximo: 2 }, debilitar],
    recomponer_forma: [limpiar("exposicion"), marca("forma_defensiva")],
    revisar_augurio: [consumir("augurio"), resistencia("augurio_revisado")],
    clausura: [{ tipo: "sacrificar", familia: "campo", fraccion: 0.25 }, adelantarRegeneracion],
    paso_vacio: [retirar(2), limpiar("exposicion")],
    deshacer_forma: [consumir("forma"), guardia("forma_disuelta")],
    abandonar_mira: [consumir("mira"), retirar(2), guardia("cobertura_de_tiro")],
    orden_amparo: [{ tipo: "ordenar", modo: "amparo" }],
    sendero: [transferirGuardia, resistencia("sendero_natural", "objetivo")],
    invalidar_rastro: [consumir("observacion"), debilitar],
    descompresion: [consumir("compresion"), limpiar("exposicion"), marca("estabilidad_arcana")],
    disolver_familiar: [{ tipo: "sacrificar", familia: "acompanante", fraccion: 0.25 }],
    descanso: [{ tipo: "sacrificar", familia: "herida", fraccion: 0.25, resultado: "cura_actor" }],
    revocar: [limpiar("pacto"), guardia("contrato_revocado")],
    frenar_furia: [consumir("furia"), limpiar("herida"), guardia("furia_contenida")],
    soltar_agarre: [consumir("contacto"), limpiar("exposicion"), resistencia("agarre_liberado")],
    vigilancia: [custodia, marca("vigilia")],
    correccion: [limpiar("sello"), marca("enlace_de_escritura")],
    silencio: [limpiar("campo"), limpiar("exposicion", "objetivo")],
    suministro_guardia: [consumir("suministro"), guardia("suministro_consumido")],
    desanclar: [{ tipo: "sacrificar", familia: "campo", fraccion: 0 }, retirar(2), guardia("totem_retirado")],
    archivar: [consumir("testimonio"), limpiar("exposicion", "objetivo"), resistencia("testimonio_archivado", "objetivo")],
    contraorden: [consumir("orden"), guardia("contraorden")],
    recoger_senuelo: [consumir("senuelo"), limpiar("marca"), retirar(2)],
    neutralizar: [limpiar("herida", "objetivo"), resistencia("neutralizacion", "objetivo")],
    desmontar: [consumir("refuerzo"), guardia("refuerzo_desmontado")],
    suspender: [consumir("ejecucion"), limpiar("exposicion"), guardia("sentencia_suspendida")],
    cauterizar: [{ tipo: "sacrificar", familia: "herida", fraccion: 0.25, resultado: "cura_actor" }],
    romper_clinch: [consumir("adaptacion"), limpiar("marca"), retirar(1)],
    disolver_formacion: [consumir("formacion"), custodia],
    ceder_ventana: [consumir("respuesta"), guardia("ventana_cedida", "objetivo")],
    circuito_abierto: [limpiar("sello"), resistencia("circuito_abierto", "objetivo")],
    descargar_barrera: [transferirGuardia],
    cerrar_frente: [consumir("frente"), custodia],
    disipar_tempestad: [{ tipo: "sacrificar", familia: "campo", fraccion: 0 }, limpiar("exposicion")],
    liberar_vinculo: [limpiar("vinculo"), { ...adelantarRegeneracion, objetivo: "actor" } as ComandoTactico],
    redistribuir: [transferirGuardia],
    saldar: [consumir("deuda"), guardia("agravio_saldado", "objetivo")],
    anclar: [consumir("velo"), limpiar("exposicion")],
    romper_compas: [consumir("compas"), transferirGuardia, retirar(1)],
    abandonar_abordaje: [consumir("incursion"), retirar(2), guardia("abordaje_abandonado")],
  };
  const aliados = new Set(["transferir_regeneracion", "transferir_guardia", "cerrar_herida", "guardia_cura", "trasplantar", "renovar_voto", "evacuacion", "clausura", "orden_amparo", "sendero", "silencio", "archivar", "neutralizar", "disolver_formacion", "ceder_ventana", "circuito_abierto", "descargar_barrera", "cerrar_frente", "redistribuir", "saldar", "romper_compas"]);
  const enemigos = new Set(["observar", "senal", "brasa_ruptura", "lectura", "cambiar_presa", "mojado", "romper_maleficio", "robar_guardia", "cortar_retirada", "invalidar_rastro", "descanso", "cauterizar"]);
  return {
    id: `${claseId}_tecnica_adicional`, claseId, nombre: datos.nombre,
    costeEnergia: clase.recursoCombate === "mana" ? 0 : clase.recursoCombate === "ambos" ? 25 : 30,
    costeMana: clase.recursoCombate === "mana" ? 10 : clase.recursoCombate === "ambos" ? 3 : 0,
    cooldown: 4,
    objetivo: aliados.has(datos.programa) ? "aliado" : enemigos.has(datos.programa) ? "enemigo" : "propio",
    alcance: "individual", comandos: programas[datos.programa],
  };
}

/** Una compra propia adicional en cada una de las 61 clases, sin alterar IDs anteriores. */
export const HABILIDADES_ADICIONALES: DefinicionHabilidad[] = Object.keys(CATALOGO_TECNICAS_ADICIONALES).map(claseId => {
  const datos = CATALOGO_TECNICAS_ADICIONALES[claseId as keyof typeof CATALOGO_TECNICAS_ADICIONALES];
  const plantilla: UnidadTactica = { id: "catalogo", equipo: "aliado", hp: 100, hpMaximo: 100, energia: 100, energiaMaxima: 100, mana: 100, manaMaximo: 100, ataque: 10, ataqueMagico: 10, defensa: 0, defensaMagica: 0, fila: 1, columna: 0, estados: [], limites: {} };
  const tecnica = crearTecnicaAdicional(claseId, plantilla);
  const operaciones:OperacionHabilidad[]=tecnica.comandos.flatMap<OperacionHabilidad>(op=>{
    if(op.tipo==="estado"&&op.familia==="guardia")return [{tipo:"guardia_porcentaje" as const,objetivo:op.objetivo,porcentaje:.04,duracion:op.duracion}];
    if(op.tipo==="vincular"&&op.clave==="custodia")return [{tipo:"guardia_porcentaje" as const,objetivo:"objetivo" as const,porcentaje:.08,duracion:2},{tipo:"estado" as const,objetivo:"actor" as const,familia:"preparacion" as const,clave:"custodia",valor:1,duracion:3}];
    return [op];
  });
  if(datos.programa==="brasa_ruptura")operaciones.push({tipo:"estado",objetivo:"objetivo",familia:"exposicion",clave:"brasa_expuesta",valor:.05,duracion:2});
  if(datos.programa==="trasplantar")operaciones.push({tipo:"adelantar",familia:"regeneracion",objetivo:"objetivo"});
  if(datos.programa==="descargar_barrera")operaciones.push({tipo:"disipar",objetivo:"actor",negativo:true});
  if(datos.programa==="redistribuir")operaciones.push({tipo:"consumir_preparacion",clave:"luz",efecto:"cura",factor:.15});
  const diseno:DisenoActiva={efecto:"estado",propio:tecnica.objetivo==="propio",operaciones};
  return {
    id: tecnica.id, claseId, nombre: datos.nombre, descripcion: describirDisenoActiva(diseno),
    tipo: "activa", efecto: "estado", animacion: "defensiva", rareza: "basico", precio: 0, costePuntosHabilidad: 1,
    nivelJobRequerido: claseId === "novato" ? 10 : CLASES[claseId].tier === 1 ? 15 : 20,
    costeEnergia: tecnica.costeEnergia, costeMana: tecnica.costeMana, cooldownTurnos: tecnica.cooldown,
    objetivo: { equipo: tecnica.objetivo, patron: "individual", ...(tecnica.objetivo!=="enemigo"?{incluirPropio:true}:{}) }, versionReglas:2,disenoActiva:diseno,
  };
});
