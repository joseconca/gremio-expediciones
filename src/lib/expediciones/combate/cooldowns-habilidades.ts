import type { DefinicionHabilidad } from "../../tiposJuego";

/** Los dos descansos heredables comparten el reloj: cinco huecos no lo duplican. */
export function establecerCooldownHabilidad(cooldowns:Record<string,number>,habilidad:DefinicionHabilidad):void{
  const cd=habilidad.cooldownTurnos??0;
  if(cd<=0)return;
  cooldowns[habilidad.id]=cd;
  if(habilidad.versionReglas===2&&(habilidad.recuperarEnergia??0)>0&&!(habilidad.costeEnergia||habilidad.costeMana)){
    for(const id of ["respiracion_interior","respiracion_del_vacio"])cooldowns[id]=Math.max(cooldowns[id]??0,cd);
  }
}

/** Normaliza el estado persistido de cooldowns sin confiar en datos JSON externos. */
export function obtenerCooldowns(valor: unknown): Record<string, number> {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) {
    return {};
  }

  const resultado: Record<string, number> = {};

  for (const [habilidadId, cooldown] of Object.entries(valor)) {
    if (
      typeof cooldown === "number" &&
      Number.isFinite(cooldown) &&
      cooldown > 0
    ) {
      resultado[habilidadId] = Math.floor(cooldown);
    }
  }

  return resultado;
}

export function reducirCooldowns(
  cooldowns: Record<string, number>
): Record<string, number> {
  const resultado: Record<string, number> = {};

  for (const [habilidadId, cooldown] of Object.entries(cooldowns)) {
    const nuevoCooldown = cooldown - 1;

    if (nuevoCooldown > 0) {
      resultado[habilidadId] = nuevoCooldown;
    }
  }

  return resultado;
}
