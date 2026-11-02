"use client";

import Image from "next/image";
import DescripcionTactil from "@/components/ui/DescripcionTactil";
import { obtenerIconoObjeto, obtenerSpriteObjeto } from "@/lib/objetos";
import type { DefinicionObjeto, ObjetoInventario } from "@/lib/tiposJuego";
import { obtenerDetallesObjeto } from "./detalles-objeto";

interface MiniaturaObjetoProps {
  objeto: DefinicionObjeto;
  instancia?: Pick<ObjetoInventario, "nivelMejora" | "bonificaciones" | "cantidad"> | null;
  /** Clases del botón que abre la misma ventana accesible en todas las pantallas. */
  claseBoton?: string;
  variante?: "oscura" | "madera" | "metal";
  detallesAdicionales?: string[];
  iconoAlternativo?: string;
}

/** Miniatura interactiva común: inventario, equipo, armería, herrería y botica. */
export default function MiniaturaObjeto({
  objeto, instancia, claseBoton, variante = "metal", detallesAdicionales = [], iconoAlternativo,
}: MiniaturaObjetoProps) {
  const sprite = obtenerSpriteObjeto(objeto);
  const nivelMejora = instancia?.nivelMejora ?? 0;
  const detalles = [
    ...obtenerDetallesObjeto(objeto, nivelMejora, instancia?.bonificaciones ?? {}),
    ...(instancia && instancia.cantidad > 1 ? [`Cantidad: ${instancia.cantidad}.`] : []),
    ...detallesAdicionales,
  ];

  return (
    <DescripcionTactil
      titulo={objeto.nombre}
      resumen={objeto.descripcion}
      detalles={detalles}
      etiquetaDetalles="Información del objeto"
      etiquetaAccesible={`Consultar ${objeto.nombre}`}
      claseBoton={claseBoton ?? "flex h-12 w-12 shrink-0 items-center justify-center rounded border border-[#725638] bg-[#17130e] p-1 transition hover:border-amber-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400"}
      variante={variante}
    >
      {sprite ? (
        <Image src={sprite} alt="" aria-hidden="true" width={64} height={64} className="h-full w-full object-contain [image-rendering:pixelated]" />
      ) : (
        <span aria-hidden="true" className="text-2xl">{iconoAlternativo ?? obtenerIconoObjeto(objeto)}</span>
      )}
    </DescripcionTactil>
  );
}
