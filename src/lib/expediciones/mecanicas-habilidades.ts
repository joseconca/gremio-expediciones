import type { DefinicionHabilidad, EstadoEfectoHabilidad } from "../tiposJuego";
import type { ResultadoHabilidad } from "./combate";
import { convertirEstadosTacticos, exportarEstadosTacticos, type ContextoTecnicaTactica } from "./adaptador-tactico";
import { aplicarEstadoTactico, curarTactico, devolverRecursoTactico, ejecutarComandosTacticos, type MundoTactico, type UnidadTactica } from "./motor-tactico";
import type { OperacionHabilidad, ReglaPasiva } from "../progresion/diseno-habilidades";
import { obtenerEstadosTacticos as tacticos } from "./preparacion-habilidades";

// Mantener la API de preparacion anterior para los importadores existentes.
export { actualizarRelojContexto, prepararHabilidadRedisenada } from "./preparacion-habilidades";

/** Verifica las condiciones tácticas de las pasivas; no modifica el mundo. */
function esCondicion(
  regla: ReglaPasiva,
  habilidad: DefinicionHabilidad,
  contexto: ContextoTecnicaTactica,
  resultado: ResultadoHabilidad,
  mundo: MundoTactico,
  limpiezas: number,
  disipaciones: number
): boolean {
  const operaciones = habilidad.disenoActiva?.operaciones ?? [];
  const hay = (tipo: OperacionHabilidad["tipo"]) => operaciones.some((op) => op.tipo === tipo);
  const anterior = tacticos(contexto.efectosActor).find((e) => e.clave === "_historial");
  const hostil = !contexto.objetivoAliado;
  const exito = resultado.accion.tipo !== "fallo";
  switch (regla.condicion) {
    case "ataque":
      return hostil&&resultado.accion.dano>0;
    case "apoyo":
      return contexto.objetivoAliado&&exito;
    case "cura_efectiva":
      return contexto.objetivoAliado&&(resultado.accion.curacion??0)>0;
    case "herida":
      return (!!habilidad.danoProgresivoPorcentaje&&resultado.accion.dano>0&&!resultado.impactoBloqueado)||operaciones.some(o=>o.tipo==="adelantar"&&o.familia==="herida")&&mundo.eventos.some(e=>e.tipo==="dano");
    case "regeneracion":
      return habilidad.efecto==="curacion_progresiva"||operaciones.some(o=>o.tipo==="adelantar"&&o.familia==="regeneracion");
    case "guardia":
      return hay("guardia_porcentaje")||hay("transferir")||!!habilidad.disenoActiva?.barrera;
    case "ruptura":
      return operaciones.some(o=>o.tipo==="consumir_preparacion"&&o.efecto==="ruptura")&&mundo.eventos.some(e=>e.tipo==="consumo");
    case "disipacion":
      return disipaciones>0;
    case "limpieza":
      return limpiezas>0;
    case "movilidad":
      return hay("mover");
    case "invocacion":
      return hay("invocar")&&mundo.unidades[0].estados.some(e=>e.familia==="acompanante"&&e.fuenteId===habilidad.id);
    case "orden":
      return hay("ordenar")&&mundo.unidades[0].limites.pulsoAcompanante===contexto.ciclo&&!contexto.efectosActor.some(e=>e.datosTacticos?.limites.pulsoAcompanante===contexto.ciclo);
    case "sacrificio":
      return hay("sacrificar")&&mundo.eventos.some(e=>e.tipo==="consumo");
    case "pacto":
      return hay("pacto")&&mundo.eventos.some(e=>e.tipo==="recurso"&&e.detalle==="vida_comprometida"&&e.cantidad>0);
    case "reaccion":
      return hay("reaccion")&&mundo.eventos.some(e=>e.tipo==="consumo");
    case "preparacion":
      return operaciones.some(o=>o.tipo==="estado"&&o.familia==="preparacion");
    case "consumo":
      return mundo.eventos.some(e=>e.tipo==="consumo");
    case "alternar":
      return !!anterior&&anterior.valor!==(hostil?1:0);
    case "cambiar_objetivo":
      return !!anterior&&anterior.destinatarioId!==contexto.objetivoId;
    case "objetivo_herido":
      return contexto.objetivoHp<contexto.objetivoHpMaximo*.5;
    case "vida_baja":
      return contexto.actorHp<contexto.actorHpMaximo*.3;
    case "enemigo_protegido":
      return hostil&&contexto.efectosObjetivo.some(e=>e.tipo==="barrera"||e.tipo==="bonus_defensa"||e.datosTacticos?.estados.some(s=>s.familia==="guardia"));
    case "objetivo_marcado":
      return tacticos(contexto.efectosObjetivo).some(e=>e.creadorId===contexto.actorId&&!e.clave.startsWith("_")&&["marca","sello"].includes(e.familia));
    case "energia_baja":
      return contexto.energia-(habilidad.costeEnergia??0)<contexto.energiaMaxima*.3;
    case "mana_bajo":
      return contexto.manaMaximo>0&&contexto.mana-(habilidad.costeMana??0)<contexto.manaMaximo*.3;
    case "coste_mixto":
      return !!habilidad.costeEnergia&&!!habilidad.costeMana;
    case "area":
      return (contexto.numeroObjetivos??1)>1;
    case "fila_propia":
      return contexto.objetivoAliado&&contexto.filaActor===contexto.filaObjetivo;
    case "sobrecuracion":
      return contexto.objetivoAliado&&habilidad.efecto==="curacion"&&contexto.objetivoHp<contexto.objetivoHpMaximo&&contexto.objetivoHp+(contexto.objetivoHpMaximo*(habilidad.curacionPorcentaje??0))>contexto.objetivoHpMaximo;
  }
}

/** Aplica las operaciones tácticas después de resolver la acción principal. */
export function aplicarMecanicasHabilidad(
  habilidad: DefinicionHabilidad,
  contexto: ContextoTecnicaTactica,
  resultadoBase: ResultadoHabilidad
): ResultadoHabilidad {
  for (const efecto of resultadoBase.efectos) efecto.creadorId = contexto.actorId;

  const propio = contexto.actorId === contexto.objetivoId;
  let efectosActor = resultadoBase.efectosActorActualizados ??
    (contexto.objetivoAliado && !propio
      ? contexto.efectosActor
      : (resultadoBase.efectosJugadorActualizados ?? contexto.efectosActor));
  let efectosObjetivo = resultadoBase.efectosEnemigoActualizados ??
    (contexto.objetivoAliado
      ? (resultadoBase.efectosJugadorActualizados ?? contexto.efectosObjetivo)
      : contexto.efectosObjetivo);

  if (propio) {
    // Actor y objetivo comparten los mismos efectos en las acciones propias.
    efectosActor = efectosObjetivo = [
      ...efectosActor,
      ...resultadoBase.efectos.filter((efecto) => efecto.objetivo !== "enemigo"),
    ];
  } else {
    efectosObjetivo = [
      ...efectosObjetivo,
      ...resultadoBase.efectos.filter((efecto) =>
        contexto.objetivoAliado ? efecto.objetivo !== "enemigo" : efecto.objetivo === "enemigo"
      ),
    ];
  }

  const crearUnidad = (esActor: boolean): UnidadTactica => {
    const efectos = esActor ? efectosActor : efectosObjetivo;
    const id = esActor ? contexto.actorId : contexto.objetivoId;
    return {
      id,
      equipo: esActor || contexto.objetivoAliado ? "aliado" : "enemigo",
      hp: esActor
        ? (resultadoBase.actorHpActualizado ??
          (contexto.objetivoAliado && !propio ? contexto.actorHp : resultadoBase.jugadorHp))
        : (contexto.objetivoAliado
          ? resultadoBase.jugadorHp
          : Math.max(0, contexto.objetivoHp - resultadoBase.accion.dano)),
      hpMaximo: esActor ? contexto.actorHpMaximo : contexto.objetivoHpMaximo,
      energia: esActor ? Math.max(0, contexto.energia - (habilidad.costeEnergia ?? 0)) : 0,
      energiaMaxima: esActor ? contexto.energiaMaxima : 100,
      mana: esActor ? Math.max(0, contexto.mana - (habilidad.costeMana ?? 0)) : 0,
      manaMaximo: esActor ? contexto.manaMaximo : 10,
      ataque: contexto.ataque,
      ataqueMagico: contexto.ataqueMagico,
      defensa: esActor ? contexto.defensaActor : contexto.defensaObjetivo,
      defensaMagica: esActor ? contexto.defensaMagicaActor : contexto.defensaMagicaObjetivo,
      fila: esActor ? contexto.filaActor : contexto.filaObjetivo,
      columna: 0,
      estados: convertirEstadosTacticos(efectos, id, contexto.actorId),
      limites: { ...efectos.find((efecto) => efecto.datosTacticos)?.datosTacticos?.limites },
    };
  };

  const actor = crearUnidad(true);
  const objetivo = propio ? actor : crearUnidad(false);
  if (habilidad.efecto === "dano") {
    actor.estados = actor.estados.filter((estado) => estado.familia !== "precision");
  }
  actor.limites._ciclo = contexto.ciclo;
  objetivo.limites._ciclo = contexto.ciclo;

  const mundo: MundoTactico = {
    version: 2,
    ciclo: contexto.ciclo,
    unidades: propio ? [actor] : [actor, objetivo],
    eventos: [],
  };
  const energiaAntes = actor.energia;
  const manaAntes = actor.mana;
  let limpiezas = 0;
  let disipaciones = 0;
  let defensaActor = contexto.defensaActor;
  const numeroObjetivos = Math.max(1, contexto.numeroObjetivos ?? 1);
  const fuente = habilidad.id;

  const agregarEstado = (
    destino: UnidadTactica,
    clave: string,
    familia: import("./motor-tactico").FamiliaTactica,
    valor: number,
    duracion = 2,
    origen = fuente
  ) =>
    aplicarEstadoTactico(mundo, destino.id, {
      id: `${contexto.actorId}:${origen}:${clave}`,
      fuenteId: origen,
      creadorId: contexto.actorId,
      familia,
      clave,
      valor,
      restantes: duracion,
      reloj: "turno",
      cargas: 1,
    });
  for(const op of habilidad.disenoActiva?.operaciones??[]){
    if(resultadoBase.impactoBloqueado&&!("objetivo"in op&&op.objetivo==="actor"))continue;
    if(contexto.principal===false&&(op.tipo==="consumir_preparacion"||op.tipo==="invocar"||op.tipo==="ordenar"||op.tipo==="mover"||op.tipo==="pacto"||op.tipo==="sacrificar"||("objetivo"in op&&op.objetivo==="actor")))continue;
    if(resultadoBase.accion.tipo==="fallo"&&!("objetivo" in op&&op.objetivo==="actor"))continue;
    if(op.tipo==="disipar"){
      const esActor=op.objetivo==="actor",efectos=esActor?efectosActor:efectosObjetivo;
      const indice=efectos.findIndex(e=>op.negativo?["dano_progresivo","debuff_defensa","debuff_ataque","debuff_precision"].includes(e.tipo):["bonus_defensa","bonus_ataque","bonus_ataque_magico","bonus_evasion","bonus_precision","barrera"].includes(e.tipo));
      if(indice>=0){const [retirado]=efectos.splice(indice,1);if(op.negativo)limpiezas++;else disipaciones++;const u=esActor?actor:objetivo;u.estados=u.estados.filter(e=>e.fuenteId!==retirado.habilidadId);if(retirado.tipo==="debuff_defensa"){if(esActor||propio)defensaActor+=retirado.valor;if(esActor?(propio||!contexto.objetivoAliado):contexto.objetivoAliado)resultadoBase.jugadorDefensa+=retirado.valor;else if(!esActor)resultadoBase.enemigoDefensa+=retirado.valor;}if(retirado.tipo==="bonus_defensa"){if(esActor||propio)defensaActor=Math.max(0,defensaActor-retirado.valor);if(esActor?(propio||!contexto.objetivoAliado):contexto.objetivoAliado)resultadoBase.jugadorDefensa=Math.max(0,resultadoBase.jugadorDefensa-retirado.valor);else if(!esActor)resultadoBase.enemigoDefensa=Math.max(0,resultadoBase.enemigoDefensa-retirado.valor);}}
      else {const u=esActor?actor:objetivo;const e=u.estados.find(e=>op.negativo?["herida","exposicion"].includes(e.familia):["guardia","precision","resistencia"].includes(e.familia));if(e){u.estados=u.estados.filter(s=>s!==e);if(op.negativo)limpiezas++;else disipaciones++;}}
    }else if(op.tipo==="consumir_preparacion"){
      const e=actor.estados.find(e=>e.clave===op.clave||e.clave===`enlace_residual:${habilidad.claseId}`);
      if(e){actor.estados=actor.estados.filter(s=>s!==e);mundo.eventos.push({tipo:"consumo",actorId:actor.id,objetivoId:actor.id,fuenteId:habilidad.id,cantidad:1});if(op.efecto==="guardia")agregarEstado(actor,"guardia_preparada","guardia",actor.hpMaximo*.04,2);if(op.efecto==="cura")curarTactico(mundo,actor.id,contexto.objetivoAliado?objetivo.id:actor.id,habilidad.id,actor.hpMaximo*.04/numeroObjetivos);}
    }else if(op.tipo==="guardia_porcentaje")agregarEstado(op.objetivo==="actor"?actor:objetivo,`guardia:${habilidad.id}`,"guardia",Math.floor(actor.hpMaximo*op.porcentaje/numeroObjetivos),op.duracion);
    else if(op.tipo==="invocar")ejecutarComandosTacticos(mundo,actor.id,objetivo.id,habilidad.id,[{...op,potencia:Math.max(1,Math.floor(Math.max(actor.ataque,actor.ataqueMagico)*op.potencia))}]);
    else if(op.tipo==="estado"&&op.familia==="sello")ejecutarComandosTacticos(mundo,actor.id,objetivo.id,habilidad.id,[{...op,valor:Math.max(1,Math.floor(Math.max(actor.ataque,actor.ataqueMagico)*op.valor/numeroObjetivos))}]);
    else if(op.tipo==="recuperar_mana")actor.mana=Math.min(actor.manaMaximo,actor.mana+op.cantidad);
    else if(op.tipo!=="recurso"||op.recurso!=="energia")ejecutarComandosTacticos(mundo,actor.id,objetivo.id,habilidad.id,[op]);
  }
  if(contexto.principal!==false){
    for(const pasiva of (contexto.pasivas??[]).slice(0,3)){
      const r=pasiva.reglaPasiva;
      if(!r||!esCondicion(r,habilidad,contexto,resultadoBase,mundo,limpiezas,disipaciones))continue;
      const limite=`pasiva:${pasiva.id}`,reloj=r.condicion==="vida_baja"?-1:contexto.ciclo;
      if(actor.limites[limite]===reloj)continue;actor.limites[limite]=reloj;
      const clave=`pasiva:${r.ventaja}`;
      const estadoPasivo=(u:UnidadTactica,k:string,f:import("./motor-tactico").FamiliaTactica,v:number,d=2)=>agregarEstado(u,k,f,v,d,pasiva.id);
      switch(r.ventaja){
        case "mana":devolverRecursoTactico(mundo,actor.id,pasiva.id,"mana",5,habilidad.costeMana??0,habilidad.id);break;
        case "energia":devolverRecursoTactico(mundo,actor.id,pasiva.id,"energia",10,habilidad.costeEnergia??0,habilidad.id);break;
        case "precision":estadoPasivo(actor,clave,"precision",5,2);break;
        case "guardia":estadoPasivo(actor,clave,"guardia",actor.hpMaximo*.03,2);break;
        case "curacion":{const max=Math.floor(actor.hpMaximo*.06),k=`cura_pasiva:${contexto.ciclo}`,usado=actor.limites[k]??0;const cantidad=Math.min(Math.floor(actor.hpMaximo*.02),Math.max(0,max-usado));curarTactico(mundo,actor.id,actor.id,pasiva.id,cantidad);actor.limites[k]=usado+cantidad;break;}
        case "regeneracion":estadoPasivo(actor,clave,"regeneracion",Math.max(1,Math.floor(actor.hpMaximo*.01)),2);break;
        case "resistir":estadoPasivo(actor,clave,"resistencia",.15,2);break;
        case "exponer":if(!contexto.objetivoAliado)estadoPasivo(objetivo,clave,"exposicion",.05,2);break;
        case "estabilizar":{const e=actor.estados.find(e=>e.familia==="herida");if(e)e.restantes--;actor.estados=actor.estados.filter(e=>e.restantes>0);break;}
        case "limpiar_herida":actor.estados=actor.estados.filter((e,i,a)=>e!==a.find(s=>s.familia==="herida"));break;
        case "guardar_preparacion":estadoPasivo(actor,`enlace_residual:${pasiva.claseId}`,"preparacion",.5,2);break;
      }
    }
    agregarEstado(actor,"_historial","preparacion",contexto.objetivoAliado?0:1,3);
    const historial=actor.estados.find(e=>e.clave==="_historial");if(historial){historial.destinatarioId=contexto.objetivoId;historial.elemento=habilidad.tipoDano==="magico"?"arcano":"fisico";}
  }
  const propios=exportarEstadosTacticos(actor,efectosActor).map(e=>({...e,objetivo:"jugador" as const}));
  const ajenos=exportarEstadosTacticos(objetivo,efectosObjetivo).map(e=>({...e,objetivo:contexto.objetivoAliado?"jugador" as const:"enemigo" as const}));
  const danoExtra=mundo.eventos.filter(e=>e.tipo==="dano"&&e.objetivoId===contexto.objetivoId).reduce((s,e)=>s+e.cantidad,0);
  const curacionExtra=Math.max(0,actor.hp-(resultadoBase.actorHpActualizado??(contexto.objetivoAliado&&!propio?contexto.actorHp:resultadoBase.jugadorHp)));
  return {...resultadoBase,accion:{...resultadoBase.accion,dano:Math.min(contexto.objetivoHp,resultadoBase.accion.dano+danoExtra),...(curacionExtra>0?{curacion:(resultadoBase.accion.curacion??0)+curacionExtra}:{}),texto:resultadoBase.accion.texto},jugadorHp:contexto.objetivoAliado?objetivo.hp:actor.hp,actorHpActualizado:actor.hp,actorDefensaActualizada:defensaActor,filaActorActualizada:actor.fila,efectos:[],efectosActorActualizados:propios,...(contexto.objetivoAliado?{efectosJugadorActualizados:ajenos}:{efectosJugadorActualizados:propios,efectosEnemigoActualizados:ajenos}),recursosRecuperados:{energia:Math.max(0,actor.energia-energiaAntes),mana:Math.max(0,actor.mana-manaAntes)}};
}
