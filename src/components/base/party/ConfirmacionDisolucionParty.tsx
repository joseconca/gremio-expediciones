"use client";

interface ConfirmacionDisolucionPartyProps {
  enViaje: boolean;
  accion: string | null;
  onCancelar: () => void;
  onConfirmar: () => void;
}

/** Confirmación antes de disolver una compañía: sin peticiones ni lógica de viaje. */
export default function ConfirmacionDisolucionParty({
  enViaje, accion, onCancelar, onConfirmar,
}: ConfirmacionDisolucionPartyProps) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirmar-disolucion-party-titulo"
        className="w-full max-w-md rounded-xl border-2 border-red-900/80 bg-[#1c150d] p-5 text-amber-50 shadow-2xl"
      >
        <h2 id="confirmar-disolucion-party-titulo" className="text-lg font-black text-red-200">
          ¿Disolver la compañía?
        </h2>
        {enViaje ? (
          <p className="mt-3 text-sm leading-6 text-slate-200">
            Se cancelará el contrato antes del combate. Cada integrante, incluido tú, abandonará la party y regresará desde la posición actual a su propia base. No se iniciará el combate ni se obtendrán recompensas de esta expedición.
          </p>
        ) : (
          <p className="mt-3 text-sm leading-6 text-slate-200">
            La compañía se disolverá. Los integrantes regresarán a sus bases mediante traslados individuales.
          </p>
        )}
        <p className="mt-2 text-xs text-amber-300/80">
          Esta acción no se puede deshacer automáticamente.
        </p>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={() => onCancelar()}
            disabled={Boolean(accion)}
            className="min-h-11 flex-1 rounded-md border border-slate-600 bg-slate-800 px-4 py-2 font-bold text-slate-200 hover:bg-slate-700 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirmar}
            disabled={Boolean(accion)}
            className="min-h-11 flex-1 rounded-md border border-red-700 bg-red-900 px-4 py-2 font-black text-red-50 hover:bg-red-800 disabled:opacity-50"
          >
            {accion === "disolver" ? "Disolviendo..." : "Sí, disolver"}
          </button>
        </div>
      </section>
    </div>
  );
}
