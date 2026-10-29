import type { DefinicionHabilidad, EstadoEfectoHabilidad } from "../tiposJuego";
import type { ResultadoHabilidad } from "./combate";
import { convertirEstadosTacticos, exportarEstadosTacticos, type ContextoTecnicaTactica } from "./adaptador-tactico";
import { aplicarEstadoTactico, curarTactico, devolverRecursoTactico, ejecutarComandosTacticos, type MundoTactico, type UnidadTactica } from "./motor-tactico";
import type { OperacionHabilidad, ReglaPasiva } from "../progresion/diseno-habilidades";

const tacticos = (efectos:readonly EstadoEfectoHabilidad[])=>efectos.flatMap(e=>e.datosTacticos?.estados??[]);
export function actualizarRelojContexto(c:ContextoTecnicaTactica):ContextoTecnicaTactica{
  const actualizar=(lista:EstadoEfectoHabilidad[])=>lista.map(e=>{
    if(!e.datosTacticos)return {...e};
    const datos=e.datosTacticos,diferencia=Math.max(0,c.ciclo-(datos.limites._ciclo??c.ciclo));
    const limites=Object.fromEntries(Object.entries(datos.limites).filter(([k])=>!k.startsWith("pago:")&&!k.startsWith("cura_pasiva:")||k.startsWith(`pago:${c.ciclo}:`)||k===`cura_pasiva:${c.ciclo}`));
    return {...e,datosTacticos:{...datos,limites:{...limites,_ciclo:c.ciclo},estados:datos.estados.map(s=>({...s,restantes:s.restantes-(s.reloj==="ciclo"?diferencia:0)})).filter(s=>s.restantes>0)}};
  });
  return {...c,efectosActor:actualizar(c.efectosActor),efectosObjetivo:actualizar(c.efectosObjetivo)};
}
function preparacion(c:ContextoTecnicaTactica,h:DefinicionHabilidad,clave:string){
  return tacticos(c.efectosActor).find(e=>e.clave===clave&&e.creadorId===c.actorId&&e.restantes>0)
    ?? tacticos(c.efectosActor).find(e=>e.clave===`enlace_residual:${h.claseId}`&&e.creadorId===c.actorId&&e.restantes>0);
}

/** Se ajusta una copia local; el catálogo global nunca se modifica por un combate. */
export function prepararHabilidadRedisenada(h:DefinicionHabilidad,c:ContextoTecnicaTactica):DefinicionHabilidad{
  const d=h.disenoActiva;
  const n=Math.max(1,Math.min(9,c.numeroObjetivos??1));
  const copia={...h};
  if(h.id==="superNovato_leccion"){
    const ultima=tacticos(c.efectosActor).find(e=>e.clave==="_historial");
    copia.tipoDano=ultima?.elemento==="arcano"?"magico":"fisico";
    copia.escaladoDano="polivalente";
  }
  let potencia=0,ruptura=0;
  for(const op of d?.operaciones??[])if(op.tipo==="consumir_preparacion"&&c.principal!==false){
    const carga=preparacion(c,h,op.clave);
    if(carga){if(op.efecto==="potencia")potencia+=op.factor*carga.valor;else if(op.efecto==="ruptura")ruptura+=op.factor*carga.valor;}
  }
  if(copia.multiplicadorDano)copia.multiplicadorDano=copia.multiplicadorDano*(1+Math.min(.25,potencia))/n;
  if(copia.danoProgresivoPorcentaje)copia.danoProgresivoPorcentaje/=n;
  if(copia.curacionPorcentaje)copia.curacionPorcentaje*=c.pesoCuracion??(1/n);
  if(copia.curacionProgresivaPorcentaje)copia.curacionProgresivaPorcentaje/=n;
  // El resolver aplica este porcentaje a la defensa para esta acción solamente.
  copia.rupturaDefensaTemporal=Math.min(.3,ruptura);
  return copia;
}

function esCondicion(r:ReglaPasiva,h:DefinicionHabilidad,c:ContextoTecnicaTactica,base:ResultadoHabilidad,m:MundoTactico,limpiezas:number,disipaciones:number):boolean{
  const ops=h.disenoActiva?.operaciones??[];
  const hay=(tipo:OperacionHabilidad["tipo"])=>ops.some(op=>op.tipo===tipo);
  const anterior=tacticos(c.efectosActor).find(e=>e.clave==="_historial");
  const hostil=!c.objetivoAliado;
  const exito=base.accion.tipo!=="fallo";
  switch(r.condicion){
    case "ataque":return hostil&&base.accion.dano>0;
    case "apoyo":return c.objetivoAliado&&exito;
    case "cura_efectiva":return c.objetivoAliado&&(base.accion.curacion??0)>0;
    case "herida":return (!!h.danoProgresivoPorcentaje&&base.accion.dano>0&&!base.impactoBloqueado)||ops.some(o=>o.tipo==="adelantar"&&o.familia==="herida")&&m.eventos.some(e=>e.tipo==="dano");
    case "regeneracion":return h.efecto==="curacion_progresiva"||ops.some(o=>o.tipo==="adelantar"&&o.familia==="regeneracion");
    case "guardia":return hay("guardia_porcentaje")||hay("transferir")||!!h.disenoActiva?.barrera;
    case "ruptura":return ops.some(o=>o.tipo==="consumir_preparacion"&&o.efecto==="ruptura")&&m.eventos.some(e=>e.tipo==="consumo");
    case "disipacion":return disipaciones>0;
    case "limpieza":return limpiezas>0;
    case "movilidad":return hay("mover");
    case "invocacion":return hay("invocar")&&m.unidades[0].estados.some(e=>e.familia==="acompanante"&&e.fuenteId===h.id);
    case "orden":return hay("ordenar")&&m.unidades[0].limites.pulsoAcompanante===c.ciclo&&!c.efectosActor.some(e=>e.datosTacticos?.limites.pulsoAcompanante===c.ciclo);
    case "sacrificio":return hay("sacrificar")&&m.eventos.some(e=>e.tipo==="consumo");
    case "pacto":return hay("pacto")&&m.eventos.some(e=>e.tipo==="recurso"&&e.detalle==="vida_comprometida"&&e.cantidad>0);
    case "reaccion":return hay("reaccion")&&m.eventos.some(e=>e.tipo==="consumo");
    case "preparacion":return ops.some(o=>o.tipo==="estado"&&o.familia==="preparacion");
    case "consumo":return m.eventos.some(e=>e.tipo==="consumo");
    case "alternar":return !!anterior&&anterior.valor!==(hostil?1:0);
    case "cambiar_objetivo":return !!anterior&&anterior.destinatarioId!==c.objetivoId;
    case "objetivo_herido":return c.objetivoHp<c.objetivoHpMaximo*.5;
    case "vida_baja":return c.actorHp<c.actorHpMaximo*.3;
    case "enemigo_protegido":return hostil&&c.efectosObjetivo.some(e=>e.tipo==="barrera"||e.tipo==="bonus_defensa"||e.datosTacticos?.estados.some(s=>s.familia==="guardia"));
    case "objetivo_marcado":return tacticos(c.efectosObjetivo).some(e=>e.creadorId===c.actorId&&!e.clave.startsWith("_")&&["marca","sello"].includes(e.familia));
    case "energia_baja":return c.energia-(h.costeEnergia??0)<c.energiaMaxima*.3;
    case "mana_bajo":return c.manaMaximo>0&&c.mana-(h.costeMana??0)<c.manaMaximo*.3;
    case "coste_mixto":return !!h.costeEnergia&&!!h.costeMana;
    case "area":return (c.numeroObjetivos??1)>1;
    case "fila_propia":return c.objetivoAliado&&c.filaActor===c.filaObjetivo;
    case "sobrecuracion":return c.objetivoAliado&&h.efecto==="curacion"&&c.objetivoHp<c.objetivoHpMaximo&&c.objetivoHp+(c.objetivoHpMaximo*(h.curacionPorcentaje??0))>c.objetivoHpMaximo;
  }
}

export function aplicarMecanicasHabilidad(h:DefinicionHabilidad,c:ContextoTecnicaTactica,base:ResultadoHabilidad):ResultadoHabilidad{
  for(const e of base.efectos)e.creadorId=c.actorId;
  const propio=c.actorId===c.objetivoId;
  let efectosActor=base.efectosActorActualizados??(c.objetivoAliado&&!propio?c.efectosActor:(base.efectosJugadorActualizados??c.efectosActor));
  let efectosObjetivo=base.efectosEnemigoActualizados??(c.objetivoAliado?(base.efectosJugadorActualizados??c.efectosObjetivo):c.efectosObjetivo);
  if(propio)efectosActor=efectosObjetivo=[...efectosActor,...base.efectos.filter(e=>e.objetivo!=="enemigo")];
  else efectosObjetivo=[...efectosObjetivo,...base.efectos.filter(e=>c.objetivoAliado?e.objetivo!=="enemigo":e.objetivo==="enemigo")];
  const crear=(actor:boolean):UnidadTactica=>{
    const efectos=actor?efectosActor:efectosObjetivo,id=actor?c.actorId:c.objetivoId;
    return {id,equipo:actor||c.objetivoAliado?"aliado":"enemigo",hp:actor?(base.actorHpActualizado??(c.objetivoAliado&&!propio?c.actorHp:base.jugadorHp)):(c.objetivoAliado?base.jugadorHp:Math.max(0,c.objetivoHp-base.accion.dano)),hpMaximo:actor?c.actorHpMaximo:c.objetivoHpMaximo,energia:actor?Math.max(0,c.energia-(h.costeEnergia??0)):0,energiaMaxima:actor?c.energiaMaxima:100,mana:actor?Math.max(0,c.mana-(h.costeMana??0)):0,manaMaximo:actor?c.manaMaximo:10,ataque:c.ataque,ataqueMagico:c.ataqueMagico,defensa:actor?c.defensaActor:c.defensaObjetivo,defensaMagica:actor?c.defensaMagicaActor:c.defensaMagicaObjetivo,fila:actor?c.filaActor:c.filaObjetivo,columna:0,estados:convertirEstadosTacticos(efectos,id,c.actorId),limites:{...efectos.find(e=>e.datosTacticos)?.datosTacticos?.limites}};
  };
  const actor=crear(true),objetivo=propio?actor:crear(false);
  if(h.efecto==="dano")actor.estados=actor.estados.filter(e=>e.familia!=="precision");
  actor.limites._ciclo=c.ciclo;
  objetivo.limites._ciclo=c.ciclo;
  const mundo:MundoTactico={version:2,ciclo:c.ciclo,unidades:propio?[actor]:[actor,objetivo],eventos:[]};
  const energiaAntes=actor.energia,manaAntes=actor.mana;
  let limpiezas=0,disipaciones=0;
  let defensaActor=c.defensaActor;
  const n=Math.max(1,c.numeroObjetivos??1);
  const fuente=h.id;
  const estado=(destino:UnidadTactica,clave:string,familia:import("./motor-tactico").FamiliaTactica,valor:number,duracion=2,origen=fuente)=>aplicarEstadoTactico(mundo,destino.id,{id:`${c.actorId}:${origen}:${clave}`,fuenteId:origen,creadorId:c.actorId,familia,clave,valor,restantes:duracion,reloj:"turno",cargas:1});
  for(const op of h.disenoActiva?.operaciones??[]){
    if(base.impactoBloqueado&&!("objetivo"in op&&op.objetivo==="actor"))continue;
    if(c.principal===false&&(op.tipo==="consumir_preparacion"||op.tipo==="invocar"||op.tipo==="ordenar"||op.tipo==="mover"||op.tipo==="pacto"||op.tipo==="sacrificar"||("objetivo"in op&&op.objetivo==="actor")))continue;
    if(base.accion.tipo==="fallo"&&!("objetivo" in op&&op.objetivo==="actor"))continue;
    if(op.tipo==="disipar"){
      const esActor=op.objetivo==="actor",efectos=esActor?efectosActor:efectosObjetivo;
      const indice=efectos.findIndex(e=>op.negativo?["dano_progresivo","debuff_defensa","debuff_ataque","debuff_precision"].includes(e.tipo):["bonus_defensa","bonus_ataque","bonus_ataque_magico","bonus_evasion","bonus_precision","barrera"].includes(e.tipo));
      if(indice>=0){const [retirado]=efectos.splice(indice,1);if(op.negativo)limpiezas++;else disipaciones++;const u=esActor?actor:objetivo;u.estados=u.estados.filter(e=>e.fuenteId!==retirado.habilidadId);if(retirado.tipo==="debuff_defensa"){if(esActor||propio)defensaActor+=retirado.valor;if(esActor?(propio||!c.objetivoAliado):c.objetivoAliado)base.jugadorDefensa+=retirado.valor;else if(!esActor)base.enemigoDefensa+=retirado.valor;}if(retirado.tipo==="bonus_defensa"){if(esActor||propio)defensaActor=Math.max(0,defensaActor-retirado.valor);if(esActor?(propio||!c.objetivoAliado):c.objetivoAliado)base.jugadorDefensa=Math.max(0,base.jugadorDefensa-retirado.valor);else if(!esActor)base.enemigoDefensa=Math.max(0,base.enemigoDefensa-retirado.valor);}}
      else {const u=esActor?actor:objetivo;const e=u.estados.find(e=>op.negativo?["herida","exposicion"].includes(e.familia):["guardia","precision","resistencia"].includes(e.familia));if(e){u.estados=u.estados.filter(s=>s!==e);if(op.negativo)limpiezas++;else disipaciones++;}}
    }else if(op.tipo==="consumir_preparacion"){
      const e=actor.estados.find(e=>e.clave===op.clave||e.clave===`enlace_residual:${h.claseId}`);
      if(e){actor.estados=actor.estados.filter(s=>s!==e);mundo.eventos.push({tipo:"consumo",actorId:actor.id,objetivoId:actor.id,fuenteId:h.id,cantidad:1});if(op.efecto==="guardia")estado(actor,"guardia_preparada","guardia",actor.hpMaximo*.04,2);if(op.efecto==="cura")curarTactico(mundo,actor.id,c.objetivoAliado?objetivo.id:actor.id,h.id,actor.hpMaximo*.04/n);}
    }else if(op.tipo==="guardia_porcentaje")estado(op.objetivo==="actor"?actor:objetivo,`guardia:${h.id}`,"guardia",Math.floor(actor.hpMaximo*op.porcentaje/n),op.duracion);
    else if(op.tipo==="invocar")ejecutarComandosTacticos(mundo,actor.id,objetivo.id,h.id,[{...op,potencia:Math.max(1,Math.floor(Math.max(actor.ataque,actor.ataqueMagico)*op.potencia))}]);
    else if(op.tipo==="estado"&&op.familia==="sello")ejecutarComandosTacticos(mundo,actor.id,objetivo.id,h.id,[{...op,valor:Math.max(1,Math.floor(Math.max(actor.ataque,actor.ataqueMagico)*op.valor/n))}]);
    else if(op.tipo==="recuperar_mana")actor.mana=Math.min(actor.manaMaximo,actor.mana+op.cantidad);
    else if(op.tipo!=="recurso"||op.recurso!=="energia")ejecutarComandosTacticos(mundo,actor.id,objetivo.id,h.id,[op]);
  }
  if(c.principal!==false){
    for(const pasiva of (c.pasivas??[]).slice(0,3)){
      const r=pasiva.reglaPasiva;
      if(!r||!esCondicion(r,h,c,base,mundo,limpiezas,disipaciones))continue;
      const limite=`pasiva:${pasiva.id}`,reloj=r.condicion==="vida_baja"?-1:c.ciclo;
      if(actor.limites[limite]===reloj)continue;actor.limites[limite]=reloj;
      const clave=`pasiva:${r.ventaja}`;
      const estadoPasivo=(u:UnidadTactica,k:string,f:import("./motor-tactico").FamiliaTactica,v:number,d=2)=>estado(u,k,f,v,d,pasiva.id);
      switch(r.ventaja){
        case "mana":devolverRecursoTactico(mundo,actor.id,pasiva.id,"mana",5,h.costeMana??0,h.id);break;
        case "energia":devolverRecursoTactico(mundo,actor.id,pasiva.id,"energia",10,h.costeEnergia??0,h.id);break;
        case "precision":estadoPasivo(actor,clave,"precision",5,2);break;
        case "guardia":estadoPasivo(actor,clave,"guardia",actor.hpMaximo*.03,2);break;
        case "curacion":{const max=Math.floor(actor.hpMaximo*.06),k=`cura_pasiva:${c.ciclo}`,usado=actor.limites[k]??0;const cantidad=Math.min(Math.floor(actor.hpMaximo*.02),Math.max(0,max-usado));curarTactico(mundo,actor.id,actor.id,pasiva.id,cantidad);actor.limites[k]=usado+cantidad;break;}
        case "regeneracion":estadoPasivo(actor,clave,"regeneracion",Math.max(1,Math.floor(actor.hpMaximo*.01)),2);break;
        case "resistir":estadoPasivo(actor,clave,"resistencia",.15,2);break;
        case "exponer":if(!c.objetivoAliado)estadoPasivo(objetivo,clave,"exposicion",.05,2);break;
        case "estabilizar":{const e=actor.estados.find(e=>e.familia==="herida");if(e)e.restantes--;actor.estados=actor.estados.filter(e=>e.restantes>0);break;}
        case "limpiar_herida":actor.estados=actor.estados.filter((e,i,a)=>e!==a.find(s=>s.familia==="herida"));break;
        case "guardar_preparacion":estadoPasivo(actor,`enlace_residual:${pasiva.claseId}`,"preparacion",.5,2);break;
      }
    }
    estado(actor,"_historial","preparacion",c.objetivoAliado?0:1,3);
    const historial=actor.estados.find(e=>e.clave==="_historial");if(historial){historial.destinatarioId=c.objetivoId;historial.elemento=h.tipoDano==="magico"?"arcano":"fisico";}
  }
  const propios=exportarEstadosTacticos(actor,efectosActor).map(e=>({...e,objetivo:"jugador" as const}));
  const ajenos=exportarEstadosTacticos(objetivo,efectosObjetivo).map(e=>({...e,objetivo:c.objetivoAliado?"jugador" as const:"enemigo" as const}));
  const danoExtra=mundo.eventos.filter(e=>e.tipo==="dano"&&e.objetivoId===c.objetivoId).reduce((s,e)=>s+e.cantidad,0);
  const curacionExtra=Math.max(0,actor.hp-(base.actorHpActualizado??(c.objetivoAliado&&!propio?c.actorHp:base.jugadorHp)));
  return {...base,accion:{...base.accion,dano:Math.min(c.objetivoHp,base.accion.dano+danoExtra),...(curacionExtra>0?{curacion:(base.accion.curacion??0)+curacionExtra}:{}),texto:base.accion.texto},jugadorHp:c.objetivoAliado?objetivo.hp:actor.hp,actorHpActualizado:actor.hp,actorDefensaActualizada:defensaActor,filaActorActualizada:actor.fila,efectos:[],efectosActorActualizados:propios,...(c.objetivoAliado?{efectosJugadorActualizados:ajenos}:{efectosJugadorActualizados:propios,efectosEnemigoActualizados:ajenos}),recursosRecuperados:{energia:Math.max(0,actor.energia-energiaAntes),mana:Math.max(0,actor.mana-manaAntes)}};
}
