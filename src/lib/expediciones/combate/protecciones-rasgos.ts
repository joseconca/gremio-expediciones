import type { DefinicionHabilidad, EstadoEfectoHabilidad } from "../../tiposJuego";

export type MarcaProteccion = { tipo: "consagracion" | "ruptura" | "contraofensiva"; creadorId: string; mana?: number; capacidad?: number };
export type ImpactoProtegido = {
  mitigado: number;
  consagracion?: boolean;
  contraofensiva?: string;
  ruptura?: { creadorId: string; mana: number; dano: number };
};

export function registrarMitigacion(
  golpe: { proteccion?: ImpactoProtegido }, mitigado: number, marca?: MarcaProteccion, bloqueado = false, seAgota = true,
) {
  if (mitigado <= 0) return;
  const proteccion = golpe.proteccion ??= { mitigado: 0 };
  proteccion.mitigado += mitigado;
  if (marca?.tipo === "contraofensiva") proteccion.contraofensiva = marca.creadorId;
  if (!seAgota) return;
  if (marca?.tipo === "consagracion") proteccion.consagracion = true;
  if (marca?.tipo === "ruptura") {
    proteccion.ruptura = {
      creadorId: marca.creadorId,
      mana: bloqueado ? Math.ceil((marca.mana ?? 0) * 0.3) : 0,
      dano: Math.floor((marca.capacidad ?? mitigado) * 0.3),
    };
  }
}

export function anotarProteccionTier3(
  clase: string, actorId: string, habilidad: DefinicionHabilidad, efectos: EstadoEfectoHabilidad[],
) {
  if (!["hierofante", "abjurador", "senor_guerra"].includes(clase)) return;
  const marca: MarcaProteccion = clase === "hierofante" ? { tipo: "consagracion", creadorId: actorId }
    : clase === "abjurador" ? { tipo: "ruptura", creadorId: actorId, mana: habilidad.costeMana }
    : { tipo: "contraofensiva", creadorId: actorId };
  for (const efecto of efectos) {
    if (efecto.tipo === "barrera" && efecto.habilidadId === habilidad.id && efecto.creadorId === actorId) efecto.rasgoProteccion = marca;
    for (const estado of efecto.datosTacticos?.estados ?? []) {
      if (estado.familia === "guardia" && estado.fuenteId === habilidad.id && estado.creadorId === actorId) estado.rasgoProteccion = { ...marca, capacidad: estado.valor };
    }
  }
}

export function mitigarPresagio(
  golpe: { dano: number; texto: string; proteccion?: ImpactoProtegido }, efectos: EstadoEfectoHabilidad[],
) {
  const indice = efectos.findIndex(efecto => efecto.tipo === "interno" && ["_presagio", "_lineaLanzas"].includes(efecto.habilidadId));
  if (indice < 0 || golpe.dano <= 0) return;
  const [marca] = efectos.splice(indice, 1);
  const mitigado = Math.max(1, Math.floor(golpe.dano * marca.valor));
  golpe.dano -= mitigado;
  registrarMitigacion(golpe, mitigado);
  golpe.texto += marca.habilidadId === "_presagio" ? " Presagio amortigua el golpe." : " Línea de lanzas amortigua el golpe.";
}

export function curaConsagracion(proteccion: ImpactoProtegido | undefined, hp: number, maximo: number) {
  return proteccion?.consagracion && hp > 0 ? Math.min(maximo - hp, Math.floor(maximo * 0.05)) : 0;
}

export function crearRepresaliaRuptura(proteccion: ImpactoProtegido | undefined) {
  const dano = proteccion?.ruptura?.dano ?? 0;
  return { dano, texto: dano > 0 ? ` Ruptura controlada devuelve ${dano} de daño al atacante.` : "" };
}
