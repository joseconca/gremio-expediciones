import type { ComandoTactico, ElementoTactico } from "../../expediciones/combate/tacticas/tipos-tacticos";

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
/** Datos definidos únicamente en el catálogo editable de habilidades. */
export { DISENO_HABILIDADES } from "../../catalogos/habilidades";
