import type { EstadoParty } from "./tipos";

type Props = {
  visitasEntrantes: EstadoParty["visitasEntrantes"];
  ahora: number;
  accion: string | null;
  ocupado: boolean;
  puedeGestionarVisitasParty: boolean;
  ejecutar: (clave: string, ruta: string, trasladoId?: string) => Promise<void>;
  segundosRestantes: (fecha: string, ahora: number) => number;
  formatoCuentaAtras: (total: number) => string;
};

/** Avisos de visitas; las decisiones y el sondeo siguen en PanelParty. */
export default function VisitasEntrantesParty({ visitasEntrantes, ahora, accion, ocupado, puedeGestionarVisitasParty, ejecutar, segundosRestantes, formatoCuentaAtras }: Props) {
  return visitasEntrantes.length > 0 ? (
        <div className="mt-3">
          <h3 className="mb-2 text-sm font-black uppercase tracking-wide text-[#7a3029]">
            Visitas entrantes
          </h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {visitasEntrantes.map((traslado) => {
              const visitante = traslado.visitante;
              const restante = segundosRestantes(traslado.fechaLlegada, ahora);
              const haLlegado = traslado.haLlegadoEnServidor ?? restante === 0;
              const llegadaEsperandoConfirmacion = restante === 0 && !haLlegado;
              return (
                <article key={traslado.id} className="rounded-sm border border-[#b96b60] bg-[#f7d9d2]/80 p-3 text-[#49231f] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.25)]">
                  <p className="font-serif font-black text-[#49231f]">{visitante?.personaje?.nombre ?? "Aventurero visitante"}</p>
                  <p className="mt-1 text-sm text-[#69413a]">{visitante?.nombre ?? "Gremio desconocido"}</p>
                  <p className="mt-1 text-xs text-[#75483d]">
                    {haLlegado
                      ? "Ha llegado a tu base; decide si incorporarlo."
                      : llegadaEsperandoConfirmacion
                        ? "Confirmando la llegada con el servidor..."
                        : `En camino: ${formatoCuentaAtras(restante)}`}
                  </p>
                  {haLlegado ? (
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        disabled={Boolean(accion) || !puedeGestionarVisitasParty || ocupado}
                        onClick={() => void ejecutar("aceptar:" + traslado.id, "/api/party/transfer/aceptar", traslado.id)}
                        title={ocupado ? "Tu personaje debe estar disponible en la base." : !puedeGestionarVisitasParty ? "Solo el líder de una party puede aceptar visitas." : undefined}
                        className="flex-1 rounded-md border border-emerald-800 bg-emerald-950/70 px-2 py-2 text-xs font-black text-emerald-200 hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {accion === "aceptar:" + traslado.id ? "Aceptando..." : "Aceptar"}
                      </button>
                      <button
                        type="button"
                        disabled={Boolean(accion) || !puedeGestionarVisitasParty || ocupado}
                        onClick={() => void ejecutar("rechazar:" + traslado.id, "/api/party/transfer/rechazar", traslado.id)}
                        title={ocupado ? "Tu personaje debe estar disponible en la base." : !puedeGestionarVisitasParty ? "Solo el líder de una party puede rechazar visitas." : undefined}
                        className="flex-1 rounded-md border border-red-900 bg-red-950/70 px-2 py-2 text-xs font-black text-red-200 hover:bg-red-900 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {accion === "rechazar:" + traslado.id ? "Rechazando..." : "Rechazar"}
                      </button>
                    </div>
                  ) : (
                    <p className="mt-2 text-xs font-semibold text-[#80463d]">Las opciones aparecerán cuando llegue.</p>
                  )}
                </article>
              );
            })}
          </div>
        </div>
  ) : null;
}
