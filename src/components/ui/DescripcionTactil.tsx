"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface DescripcionTactilProps {
  titulo: string;
  resumen?: string;
  detalles?: string | string[];
  etiquetaAccesible?: string;
  children?: ReactNode;
  claseBoton?: string;
  variante?: "oscura" | "madera" | "metal";
}

/**
 * Botón de información reutilizable para mouse, teclado y pantallas táctiles.
 * El detalle se renderiza en un portal para evitar que tarjetas con overflow
 * recorten la descripción. Se cierra tocando fuera, pulsando Escape o volviendo
 * a pulsar el disparador, y bloquea el menú contextual sobre el propio icono.
 */
export default function DescripcionTactil({
  titulo,
  resumen,
  detalles,
  etiquetaAccesible,
  children,
  claseBoton,
  variante = "oscura",
}: DescripcionTactilProps) {
  const botonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [abierto, setAbierto] = useState(false);
  const [posicion, setPosicion] = useState({ left: 12, top: 12 });


  const cerrar = () => setAbierto(false);

  const alternar = () => {
    if (abierto) {
      setAbierto(false);
      return;
    }
    const rect = botonRef.current?.getBoundingClientRect();
    if (rect) {
      const anchoPanel = Math.min(304, window.innerWidth - 24);
      const altoEstimado = Math.min(window.innerHeight * 0.55, 320);
      const izquierda = Math.max(12, Math.min(rect.left, window.innerWidth - anchoPanel - 12));
      const debajo = rect.bottom + 8;
      const arriba = debajo + altoEstimado > window.innerHeight - 12
        ? Math.max(12, rect.top - altoEstimado - 8)
        : debajo;
      setPosicion({ left: izquierda, top: arriba });
    }
    setAbierto(true);
  };

  useEffect(() => {
    if (!abierto) return;

    const cerrarFuera = (evento: PointerEvent) => {
      const destino = evento.target;
      if (!(destino instanceof Node)) return;
      if (botonRef.current?.contains(destino) || panelRef.current?.contains(destino)) return;
      setAbierto(false);
    };
    const cerrarEscape = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") setAbierto(false);
    };

    document.addEventListener("pointerdown", cerrarFuera);
    document.addEventListener("keydown", cerrarEscape);
    return () => {
      document.removeEventListener("pointerdown", cerrarFuera);
      document.removeEventListener("keydown", cerrarEscape);
    };
  }, [abierto]);

  const estilos = variante === "madera"
    ? "border-amber-800/80 bg-[#211710] text-amber-100"
    : variante === "metal"
      ? "border-slate-600 bg-slate-950 text-slate-100"
      : "border-stone-700 bg-stone-950/95 text-stone-100";

  const lineas = typeof detalles === "string" ? [detalles] : detalles ?? [];

  return (
    <>
      <button
        ref={botonRef}
        type="button"
        aria-label={etiquetaAccesible ?? `Más información: ${titulo}`}
        aria-expanded={abierto}
        onClick={alternar}
        onContextMenu={(evento) => evento.preventDefault()}
        className={claseBoton ?? "inline-flex h-7 w-7 shrink-0 touch-manipulation items-center justify-center rounded-full border border-stone-600 bg-black/30 text-xs font-black text-amber-200 transition hover:border-amber-400 hover:bg-amber-950/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400"}
      >
        {children ?? "ⓘ"}
      </button>
      {abierto && typeof document !== "undefined" && createPortal(
        <div
          ref={panelRef}
          role="tooltip"
          className={`fixed z-[20000] max-h-[min(55dvh,24rem)] w-[min(19rem,calc(100vw-24px))] overflow-y-auto rounded-lg border p-3 text-left shadow-2xl backdrop-blur-md ${estilos}`}
          style={{ left: posicion.left, top: posicion.top }}
        >
          <div className="flex items-start justify-between gap-3">
            <h4 className="text-sm font-black leading-5">{titulo}</h4>
            <button
              type="button"
              aria-label="Cerrar descripción"
              onClick={cerrar}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-current/20 text-xs opacity-70 hover:opacity-100"
            >✕</button>
          </div>
          {resumen && <p className="mt-2 text-xs leading-relaxed opacity-80">{resumen}</p>}
          {lineas.length > 0 && (
            <div className="mt-2 space-y-1.5 border-t border-current/15 pt-2">
              {lineas.map((linea, indice) => (
                <p key={`${indice}:${linea}`} className="whitespace-normal text-xs leading-relaxed opacity-90">{linea}</p>
              ))}
            </div>
          )}
        </div>,
        document.body
      )}
    </>
  );
}
