/** Reparte la reserva entre heridas reales; la vida llena no consume cuota. */
export function calcularPesosCuracion(objetivos:readonly {id:string;hp:number;hpMaximo:number}[]):Record<string,number>{
  const faltantes=objetivos.map(o=>({id:o.id,falta:Math.max(0,o.hpMaximo-o.hp)}));
  const total=faltantes.reduce((s,o)=>s+o.falta,0);
  return Object.fromEntries(faltantes.map(o=>[o.id,total>0?o.falta/total:0]));
}
