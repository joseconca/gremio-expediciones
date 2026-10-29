import type { DefinicionHabilidad } from "../tiposJuego";

/** Los dos descansos heredables comparten el reloj: cinco huecos no lo duplican. */
export function establecerCooldownHabilidad(cooldowns:Record<string,number>,habilidad:DefinicionHabilidad):void{
  const cd=habilidad.cooldownTurnos??0;
  if(cd<=0)return;
  cooldowns[habilidad.id]=cd;
  if(habilidad.versionReglas===2&&(habilidad.recuperarEnergia??0)>0&&!(habilidad.costeEnergia||habilidad.costeMana)){
    for(const id of ["respiracion_interior","respiracion_del_vacio"])cooldowns[id]=Math.max(cooldowns[id]??0,cd);
  }
}
