import MissionMap from "@/components/MissionMap";
import type { Personaje } from "@/store/useGameStore";
import type { EstadoParty } from "./tipos";

type Props = {
  trasladosPropios: EstadoParty["trasladosPropios"];
  ahora: number;
  personaje: Personaje | null;
  accion: string | null;
  ejecutar: (clave: string, ruta: string, trasladoId?: string) => Promise<void>;
  segundosRestantes: (fecha: string, ahora: number) => number;
  formatoCuentaAtras: (total: number) => string;
};

/** Cartas de traslados propios; el estado HTTP y el sondeo viven en PanelParty. */
export default function TrasladosPropiosParty({ trasladosPropios, ahora, personaje, accion, ejecutar, segundosRestantes, formatoCuentaAtras }: Props) {
  return <>
    {trasladosPropios.map((traslado) => {
        const restante = segundosRestantes(traslado.fechaLlegada, ahora);
        const destino = traslado.anfitrion?.nombre ?? "la base de destino";
        const regresando = traslado.estado === "regresando";
        const esperando = traslado.estado === "pendiente";
        return (
          <article key={traslado.id} className="mb-2 rounded-lg border border-sky-900/60 bg-sky-950/20 p-3">
            <p className="font-bold text-sky-100">
              {regresando ? "↩ Regresando a tu base" : esperando ? "⏳ En espera de aceptación" : `🚶 Camino a la base de ${destino}`}
            </p>
            <p className="mt-1 text-xs text-slate-300">
              {regresando
                ? `Llegada estimada: ${restante === 0 ? "procesando llegada..." : formatoCuentaAtras(restante)}`
                : esperando
                  ? `Has llegado. El propietario de ${destino} debe aceptar o rechazar la visita.`
                  : `Llegada estimada en ${formatoCuentaAtras(restante)}.`}
            </p>
            {traslado.origenCoords && traslado.destinoCoords && (
              <div className="mt-3 overflow-hidden rounded-lg border border-sky-900/70 bg-slate-950/60">
                <div className="flex items-center justify-between gap-2 border-b border-sky-900/60 px-3 py-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-sky-200">
                    Recorrido del traslado
                  </p>
                  <span className="text-[10px] text-slate-400">
                    {regresando ? "Regreso a tu base" : esperando ? "Has llegado al destino" : "En camino"}
                  </span>
                </div>
                <div className="relative h-64 w-full">
                  <MissionMap
                    baseCoords={regresando ? traslado.destinoCoords : traslado.origenCoords}
                    misiones={[]}
                    destinoExpedicion={regresando ? traslado.origenCoords : traslado.destinoCoords}
                    fechaSalida={traslado.fechaSalida}
                    fechaLlegada={traslado.fechaLlegada}
                    nombreHeroe={personaje?.nombre ?? "Tu aventurero"}
                    claseHeroe={personaje?.clase}
                    sexoHeroe={personaje?.sexo}
                    profesionActivaIdHeroe={personaje?.profesionActivaId}
                    regresando={regresando}
                    ajustarVistaRuta
                    etiquetaBase="Tu base"
                    etiquetaDestino={regresando ? "Base desde la que regresas" : "Base que visitas"}
                    rutasEntrantes={[]}
                    onSelectMission={() => undefined}
                  />
                </div>
                <div className="flex justify-between gap-2 px-3 py-2 text-[10px] text-slate-400">
                  <span>{regresando ? "Punto de salida" : "Tu base"}</span>
                  <span>{regresando ? "Tu base de regreso" : "Base de " + destino}</span>
                </div>
              </div>
            )}
            {esperando && (
              <div className="mt-3 rounded-md border border-sky-900/70 bg-slate-950/50 p-2">
                <p className="text-[11px] text-slate-300">
                  No tienes que esperar indefinidamente: puedes volver a tu base ahora. La visita se cancelará y no se creará una party.
                </p>
                <button
                  type="button"
                  disabled={Boolean(accion)}
                  onClick={() => void ejecutar("volver:" + traslado.id, "/api/party/transfer/volver", traslado.id)}
                  className="mt-2 min-h-10 w-full rounded-md border border-sky-700/80 bg-sky-950/70 px-3 py-2 text-xs font-black text-sky-100 hover:bg-sky-900 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {accion === "volver:" + traslado.id ? "Organizando regreso..." : "↩ Volver a mi base"}
                </button>
              </div>
            )}
            {traslado.decision === "visitante_volver" && (
              <p className="mt-2 rounded border border-sky-900/70 bg-sky-950/30 p-2 text-[11px] text-sky-200">
                Has cancelado la espera de aceptación y estás regresando a tu propia base.
              </p>
            )}
            {traslado.decision === "lider_disuelve" && (
              <p className="mt-2 rounded border border-amber-800/70 bg-amber-950/30 p-2 text-[11px] text-amber-200">
                Este traslado se inició al disolver la compañía; la membresía de la party ya no está activa.
              </p>
            )}
          </article>
        );
    })}
  </>;
}
