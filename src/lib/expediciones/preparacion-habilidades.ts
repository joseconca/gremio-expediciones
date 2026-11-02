import type { DefinicionHabilidad, EstadoEfectoHabilidad } from "../tiposJuego";
import type { ContextoTecnicaTactica } from "./adaptador-tactico";

/** Preparación local, escalado de área y expiración de estados por ciclo. */
export const obtenerEstadosTacticos = (efectos:readonly EstadoEfectoHabilidad[])=>efectos.flatMap(e=>e.datosTacticos?.estados??[]);
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
  return obtenerEstadosTacticos(c.efectosActor).find(e=>e.clave===clave&&e.creadorId===c.actorId&&e.restantes>0)
    ?? obtenerEstadosTacticos(c.efectosActor).find(e=>e.clave===`enlace_residual:${h.claseId}`&&e.creadorId===c.actorId&&e.restantes>0);
}

/** Se ajusta una copia local; el catálogo global nunca se modifica por un combate. */
export function prepararHabilidadRedisenada(h:DefinicionHabilidad,c:ContextoTecnicaTactica):DefinicionHabilidad{
  const d=h.disenoActiva;
  const n=Math.max(1,Math.min(9,c.numeroObjetivos??1));
  const copia={...h};
  if(h.id==="superNovato_leccion"){
    const ultima=obtenerEstadosTacticos(c.efectosActor).find(e=>e.clave==="_historial");
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
