import type { DefinicionHabilidad } from "../tiposJuego";
import { DISENO_HABILIDADES, type DisenoActiva, type ReglaPasiva } from "./diseno-habilidades";
import { NOMBRES_REDISENIO } from "./nombres-redisenio";

const condicion: Record<ReglaPasiva["condicion"],string> = {
  ataque:"Al acertar una técnica ofensiva",apoyo:"Al usar una técnica de apoyo",cura_efectiva:"Al recuperar vida real de un aliado",herida:"Al aplicar o consumir una herida",regeneracion:"Al usar una regeneración",guardia:"Al conceder protección",ruptura:"Al consumir una preparación de ruptura",disipacion:"Al eliminar una mejora enemiga",movilidad:"Al usar una técnica de movilidad",invocacion:"Al invocar un acompañante",orden:"Al dar una orden al acompañante",sacrificio:"Al sacrificar un efecto propio",pacto:"Al comprometer vida en un pacto",reaccion:"Al completar una reacción elemental",preparacion:"Al preparar una técnica",consumo:"Al consumir una preparación",alternar:"Al alternar una técnica ofensiva y una de apoyo",cambiar_objetivo:"Al cambiar de destinatario respecto a la técnica anterior",objetivo_herido:"Al actuar sobre un objetivo por debajo del 50 % de vida",vida_baja:"Al usar una técnica con menos del 30 % de vida",enemigo_protegido:"Al atacar a un rival protegido",objetivo_marcado:"Al actuar sobre un objetivo marcado por ti",energia_baja:"Al usar una técnica con menos del 30 % de energía",mana_bajo:"Al usar una técnica con menos del 30 % de maná",coste_mixto:"Al pagar energía y maná en la misma técnica",area:"Al usar una técnica de área",limpieza:"Al limpiar un perjuicio",fila_propia:"Al apoyar a un aliado de tu misma fila",sobrecuracion:"Al sobrar parte de una curación",
};
const ventaja: Record<ReglaPasiva["ventaja"],string> = {
  precision:"preparas 5 puntos de precisión para un impacto",guardia:"obtienes protección equivalente al 3 % de tu vida máxima",estabilizar:"acortas en un pulso una herida propia sin sufrirlo",curacion:"recuperas hasta el 2 % de tu vida máxima",mana:"recuperas hasta el 25 % del maná pagado, con límite compartido de 5 PM por ciclo",energia:"recuperas hasta el 25 % de la energía pagada, con límite compartido de 10 EN por ciclo",exponer:"expones un 5 % de defensa enemiga para un impacto",regeneracion:"preparas dos pulsos de cura del 1 % de tu vida máxima cada uno",resistir:"resistes parcialmente el siguiente perjuicio durante dos turnos",limpiar_herida:"eliminas una herida propia",guardar_preparacion:"conservas un enlace residual para la siguiente técnica de tu clase de origen",
};
export function describirReglaPasiva(r:ReglaPasiva):string {
  return `${condicion[r.condicion]}, ${ventaja[r.ventaja]}. ${r.condicion === "vida_baja" ? "Una vez por combate" : "Una vez por ciclo"}. Las ventajas de la misma familia no se acumulan.`;
}
export function describirDisenoActiva(d:DisenoActiva):string {
  const porc=(n:number)=>Math.round(n*10000)/100;
  const partes:string[]=[];
  if(d.efecto==="dano")partes.push(`Ataque con potencia ×${d.potencia}.`);
  if(d.cura)partes.push(d.efecto==="curacion_progresiva"?`Cura un ${porc(d.cura)} % por turno durante tres turnos.`:`Cura un ${porc(d.cura)} % de vida máxima.`);
  if(d.herida)partes.push(`Herida: ${porc(d.herida)} % del ataque por pulso durante ${d.duracion} turnos.`);
  if(d.vendaje)partes.push(`Vendaje: ${porc(d.vendaje)} % de vida por turno durante ${d.duracion??3} turnos.`);
  if(d.barrera)partes.push("Bloquea el siguiente impacto directo durante dos turnos; los pulsos no la consumen.");
  if(d.drenaje)partes.push(`Drena un ${Math.round(d.drenaje*100)} % del daño efectivo, con límite del 8 % de vida del lanzador.`);
  if(d.area)partes.push(`Afecta a ${d.area}; el presupuesto se reparte entre sus objetivos.`);
  for(const op of d.operaciones){
    switch(op.tipo){
      case "estado":partes.push(op.familia==="exposicion"?`Expone un ${porc(op.valor)} % de defensa para un impacto, durante ${op.duracion} turnos.`:op.familia==="resistencia"?`Resiste un ${porc(op.valor)} % de la potencia del siguiente perjuicio, durante ${op.duracion} turnos.`:op.familia==="precision"?`Prepara ${op.valor} puntos de precisión para un intento de ataque, durante ${op.duracion} turnos.`:op.familia==="sello"?`Sello ${op.clave}: reserva un ${porc(op.valor)} % del mejor ataque durante ${op.duracion} turnos; se consume al cerrar un circuito.`:`Prepara ${op.clave.replaceAll("_"," ")} durante ${op.duracion} turnos para técnicas y pasivas compatibles.`);break;
      case "consumir_preparacion":partes.push(`Consume ${op.clave.replaceAll("_"," ")} para ${op.efecto==="potencia"?`aumentar hasta ${porc(op.factor)} % el daño`:op.efecto==="ruptura"?`ignorar hasta ${porc(op.factor)} % de defensa`:op.efecto==="guardia"?"proteger al lanzador un 4 % de su vida":"recuperar un 4 % de vida del lanzador"}; sin ella conserva su efecto básico.`);break;
      case "guardia_porcentaje":partes.push(`Protección del ${porc(op.porcentaje)} % de vida del lanzador durante ${op.duracion} turnos.`);break;
      case "disipar":partes.push(op.negativo?"Elimina un perjuicio del destinatario.":"Retira una mejora del rival.");break;
      case "adelantar":partes.push(`Adelanta y consume un pulso de ${op.familia === "herida"?"daño":"cura"} pendiente.`);break;
      case "mover":partes.push(`Te desplazas a ${["primera fila","fila central","retaguardia"][op.fila]}.`);break;
      case "invocar":partes.push("Prepara un acompañante de tres órdenes y hasta seis ciclos; reemplaza el anterior y no tiene turno independiente.");break;
      case "ordenar":partes.push("Resuelve una orden del acompañante; máximo una por ciclo.");break;
      case "sacrificar":partes.push(`Consume ${op.familia} y convierte parte de su presupuesto pendiente.`);break;
      case "reaccion":partes.push(`Aplica ${op.elemento}; puede consumir una preparación elemental compatible.`);break;
      case "interrumpir":partes.push("Debilita una preparación enemiga; no hace perder su turno.");break;
      case "pacto":partes.push(`Compromete ${op.fraccionVida*100} % de vida sin poder matarte; no cuenta como daño enemigo.`);break;
      case "circuito":partes.push("Cierra y consume tus sellos del objetivo.");break;
      case "recurso":partes.push(`Recupera ${op.cantidad} de ${op.recurso}.`);break;
      case "recuperar_mana":partes.push(`Recupera ${op.cantidad} de maná.`);break;
      case "limpiar":partes.push(`Retira un efecto de ${op.familia??"perjuicio"} del ${op.objetivo==="actor"?"lanzador":"destinatario"}.`);break;
      case "consumir":partes.push(`Consume hasta ${op.maximo??1} cargas de ${op.clave.replaceAll("_"," ")} si existen.`);break;
      case "transferir":partes.push(`Transfiere un ${porc(op.fraccion)} % de tu ${op.familia==="guardia"?"protección":"regeneración"} a un aliado, conservando su duración. Sobre ti convierte el 20 % en recuperación, sin duplicar presupuesto.`);break;
      case "robar":partes.push(`Retira una ${op.familia} rival y conserva un ${porc(op.fraccion)} % durante un máximo de dos turnos.`);break;
      case "vincular":partes.push(`Marca al destinatario con ${op.clave.replaceAll("_"," ")} durante ${op.duracion} turnos.`);break;
    }
  }
  return partes.join(" ");
}

export function crearCatalogoRedisenado(base: readonly DefinicionHabilidad[]):DefinicionHabilidad[]{
  const vistos=new Map<string,{a:number;p:number}>();
  return base.map(original=>{
    const id=original.claseId ?? "novato",perfil=DISENO_HABILIDADES[id];
    if(!perfil)throw new Error(`FALTA_DISENO_${id}`);
    const indices=vistos.get(id) ?? {a:0,p:0};vistos.set(id,indices);
    if(original.tipo==="pasiva"){
      const regla=perfil.pasivas[indices.p++];
      if(!regla)throw new Error(`FALTA_PASIVA_${original.id}`);
      const h:DefinicionHabilidad={id:original.id,claseId:id,nombre:NOMBRES_REDISENIO[original.id]??original.nombre,descripcion:describirReglaPasiva(regla),tipo:"pasiva",rareza:original.rareza,precio:original.precio,costePuntosHabilidad:original.costePuntosHabilidad,nivelJobRequerido:original.nivelJobRequerido,versionReglas:2,reglaPasiva:regla};
      if(h.id==="aguante_aprendiz"){delete h.reglaPasiva;h.bonusHpMaximo=8;h.descripcion="Aumenta la vida máxima en 8 puntos.";}
      if(h.id==="reserva_arcana"){delete h.reglaPasiva;h.bonusManaMaximo=20;h.descripcion="Aumenta el maná máximo en 20 puntos.";}
      if(h.id==="nucleo_arcano"){delete h.reglaPasiva;h.conversionReservaInteligencia=true;h.descripcion="Sacrifica el 10 % de maná máximo estable para convertirlo en inteligencia, limitada al 20 % de tu inteligencia previa y a 12 puntos. No realimenta maná.";}
      return h;
    }
    const d=perfil.activas[indices.a++];
    if(!d)throw new Error(`FALTA_ACTIVA_${original.id}`);
    const h:DefinicionHabilidad={...original,nombre:NOMBRES_REDISENIO[original.id]??original.nombre,descripcion:describirDisenoActiva(d),versionReglas:2,disenoActiva:d,efecto:d.efecto,objetivo:{equipo:d.propio?"propio":d.efecto==="dano"?"enemigo":"aliado",patron:d.area??"individual",...(d.efecto!=="dano"?{incluirPropio:true}:{})},animacion:d.efecto==="dano"?"ofensiva":d.efecto==="curacion"||d.efecto==="curacion_progresiva"?"curacion":"defensiva"};
    for(const key of ["multiplicadorDano","curacion","curacionPorcentaje","curacionProgresivaPorcentaje","danoProgresivoPorcentaje","estadosSecundarios","bonusDefensaPorcentaje","limpiarEstadosNegativos","roboVida","recuperarEnergia","duracionTurnos"] as const)delete h[key];
    if(d.potencia)h.multiplicadorDano=d.potencia;
    if(id==="superNovato"&&d.efecto==="dano")h.escaladoDano="polivalente";
    if(d.cura){if(d.efecto==="curacion_progresiva")h.curacionProgresivaPorcentaje=d.cura;else h.curacionPorcentaje=d.cura;}
    if(d.herida)h.danoProgresivoPorcentaje=d.herida;
    if(d.drenaje)h.roboVida=d.drenaje;
    if(d.duracion)h.duracionTurnos=d.duracion;
    if(d.vendaje)h.estadosSecundarios=[{tipo:"curacion_progresiva",valor:d.vendaje,duracionTurnos:d.duracion??3,objetivo:"jugador"}];
    if(d.barrera)h.estadosSecundarios=[{tipo:"barrera",valor:1,duracionTurnos:2,objetivo:"jugador"}];
    const recuperacion=d.operaciones.find(op=>op.tipo==="recurso"&&op.recurso==="energia");
    if(recuperacion?.tipo==="recurso")h.recuperarEnergia=recuperacion.cantidad;
    if(original.recuperarEnergia&&!original.costeEnergia&&!original.costeMana){h.costeEnergia=0;h.costeMana=0;h.cooldownTurnos=6;}
    h.cooldownTurnos=Math.max(2,h.cooldownTurnos??3);
    if(h.id==="esfera_invocada"){h.costeMana=16;h.cooldownTurnos=5;}
    if(h.id==="sellos_paralelos"){h.costeMana=10;h.cooldownTurnos=2;}
    return h;
  });
}
