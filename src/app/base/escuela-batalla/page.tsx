"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import CabeceraEdificio from "@/components/CabeceraEdificio";
import { NIVEL_ESCUELA_POR_RAREZA } from "@/lib/configuracionJuego";
import type { DefinicionHabilidad, Rareza } from "@/lib/tiposJuego";
import { useGameStore } from "@/store/useGameStore";

type SlotHabilidad =
  | "activa_1"
  | "activa_2"
  | "activa_3"
  | "pasiva_1"
  | "pasiva_2";

interface HabilidadEnVenta extends DefinicionHabilidad {
  puedeAprender: boolean;
}

interface HabilidadAprendida {
  id: string;
  habilidadId: string;
  slot: string | null;
  habilidad: DefinicionHabilidad;
}

interface DatosHabilidades {
  escuelaNivel: number;
  enVenta: HabilidadEnVenta[];
  aprendidas: HabilidadAprendida[];
}

const SLOTS_ACTIVAS: SlotHabilidad[] = ["activa_1", "activa_2", "activa_3"];

const SLOTS_PASIVAS: SlotHabilidad[] = ["pasiva_1", "pasiva_2"];

function nombreRareza(rareza: Rareza): string {
  switch (rareza) {
    case "basico":
      return "Básica";

    case "comun":
      return "Común";

    case "poco_comun":
      return "Poco común";

    case "raro":
      return "Rara";

    case "epico":
      return "Épica";

    case "legendario":
      return "Legendaria";
  }
}

function estiloRareza(rareza: Rareza): string {
  switch (rareza) {
    case "basico":
      return "border-neutral-400/70 bg-[#665d51]/20 text-[#e5ded1]";

    case "comun":
      return "border-green-600/60 bg-[#29432d]/30 text-green-400";

    case "poco_comun":
      return "border-sky-500/60 bg-[#233b4a]/30 text-sky-300";

    case "raro":
      return "border-amber-500/70 bg-[#4e3920]/30 text-amber-300";

    case "epico":
      return "border-fuchsia-600/70 bg-[#472343]/30 text-fuchsia-300";

    case "legendario":
      return "border-red-600/70 bg-[#4b201c]/30 text-red-300";
  }
}

function esSlotHabilidad(valor: string | null): valor is SlotHabilidad {
  return (
    valor !== null &&
    [...SLOTS_ACTIVAS, ...SLOTS_PASIVAS].includes(valor as SlotHabilidad)
  );
}

function etiquetaSlot(slot: SlotHabilidad): string {
  if (slot.startsWith("activa_")) {
    return `Activa ${slot.slice(-1)}`;
  }

  return `Pasiva ${slot.slice(-1)}`;
}

export default function EscuelaCombatePage() {
  const router = useRouter();

  const { edificios, oro, cargarJugador } = useGameStore();

  const nivelEscuela = edificios.escuelaCombate.nivel;
  const descripcionEdificio = edificios.escuelaCombate.descripcion;

  const [datos, setDatos] = useState<DatosHabilidades | null>(null);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (nivelEscuela === 0) {
      router.push("/base");
    }
  }, [nivelEscuela, router]);

  useEffect(() => {
    if (nivelEscuela === 0) {
      return;
    }

    const cargarHabilidades = async () => {
      setCargando(true);
      setError(null);

      try {
        const respuesta = await fetch("/api/habilidades");
        const resultado = await respuesta.json();

        if (!respuesta.ok) {
          setError(resultado.error || "No se pudieron cargar las habilidades.");
          return;
        }

        setDatos(resultado as DatosHabilidades);
      } catch {
        setError("No se pudieron cargar las habilidades.");
      } finally {
        setCargando(false);
      }
    };

    void cargarHabilidades();
  }, [nivelEscuela]);

  const recargarHabilidades = async () => {
    try {
      const respuesta = await fetch("/api/habilidades");
      const resultado = await respuesta.json();

      if (!respuesta.ok) {
        setError(
          resultado.error || "No se pudieron actualizar las habilidades."
        );
        return;
      }

      setDatos(resultado as DatosHabilidades);
    } catch {
      setError("No se pudieron actualizar las habilidades.");
    }
  };

  const aprenderHabilidad = async (habilidadId: string) => {
    setProcesando(`aprender:${habilidadId}`);
    setError(null);

    try {
      const respuesta = await fetch("/api/habilidades/aprender", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          habilidadId,
        }),
      });

      const resultado = await respuesta.json();

      if (!respuesta.ok) {
        setError(resultado.error || "No se pudo aprender la habilidad.");
        return;
      }

      await recargarHabilidades();
      await cargarJugador();
    } catch {
      setError("Error de conexión al aprender la habilidad.");
    } finally {
      setProcesando(null);
    }
  };

  const equiparHabilidad = async (habilidadId: string, slot: SlotHabilidad) => {
    setProcesando(`equipar:${habilidadId}:${slot}`);
    setError(null);

    try {
      const respuesta = await fetch("/api/habilidades/equipar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          habilidadId,
          slot,
        }),
      });

      const resultado = await respuesta.json();

      if (!respuesta.ok) {
        setError(resultado.error || "No se pudo equipar la habilidad.");
        return;
      }

      await recargarHabilidades();
    } catch {
      setError("Error de conexión al equipar la habilidad.");
    } finally {
      setProcesando(null);
    }
  };

  const desequiparHabilidad = async (habilidadId: string) => {
    setProcesando(`desequipar:${habilidadId}`);
    setError(null);

    try {
      const respuesta = await fetch("/api/habilidades/desequipar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          habilidadId,
        }),
      });

      const resultado = await respuesta.json();

      if (!respuesta.ok) {
        setError(resultado.error || "No se pudo desequipar la habilidad.");
        return;
      }

      await recargarHabilidades();
    } catch {
      setError("Error de conexión al desequipar la habilidad.");
    } finally {
      setProcesando(null);
    }
  };

  const aprendidas = datos?.aprendidas ?? [];

  const habilidadesEquipadas = useMemo(
    () =>
      aprendidas.filter(
        (habilidad) =>
          habilidad.slot !== null && esSlotHabilidad(habilidad.slot)
      ),
    [aprendidas]
  );

  const habilidadesNoEquipadas = useMemo(
    () =>
      aprendidas.filter(
        (habilidad) =>
          habilidad.slot === null || !esSlotHabilidad(habilidad.slot)
      ),
    [aprendidas]
  );

  const obtenerHabilidadEnSlot = (slot: SlotHabilidad) =>
    habilidadesEquipadas.find((habilidad) => habilidad.slot === slot);

  if (nivelEscuela === 0) {
    return null;
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#171512] p-4 font-sans text-[#e8dfc8] md:p-8">
      {/* Fondo ambiental */}
      <div className="pointer-events-none fixed inset-0 -z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(122,88,48,0.18),transparent_35%),radial-gradient(circle_at_80%_75%,rgba(85,67,48,0.14),transparent_40%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(115deg,transparent_0%,rgba(255,255,255,0.025)_48%,transparent_52%)] opacity-20" />
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black/30 to-transparent" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl animate-in fade-in">
        {/* CABECERA */}
        <CabeceraEdificio
          icono="⚔️"
          nombre="Escuela de Combate"
          nivel={nivelEscuela}
        />

        <p className="-mt-6 mb-8 text-[#a99d84]">{descripcionEdificio}</p>

        {/* ====================================================== */}
        {/* OFERTAS */}
        {/* ====================================================== */}

        <section className="mb-8">
          <div className="mb-4">
            <p className="mt-1 text-sm text-[#817563]">
              Técnicas disponibles en el mercado de la Escuela hoy. Vuelve mañana a ver las ofertas.
            </p>
          </div>

          {/* PUESTO DE MERCADO */}
          <div className="relative overflow-hidden rounded-lg border-2 border-[#50351f] bg-[#3b2819] shadow-[0_14px_32px_rgba(0,0,0,0.5)]">
            {/* Lona superior */}
            <div className="relative h-14 overflow-hidden border-b-2 border-[#5d3e23] bg-[#704b2d]">
              <div className="absolute inset-0 opacity-20 bg-[repeating-linear-gradient(90deg,transparent_0,transparent_18px,rgba(255,255,255,0.08)_19px,transparent_20px)]" />

              <div className="absolute inset-x-0 bottom-0 h-2 bg-[#4c301c]" />

              {/* Pequeños tirantes */}
              <span className="absolute left-6 top-1 h-9 w-2 rounded-sm bg-[#2c1c11]" />
              <span className="absolute right-6 top-1 h-9 w-2 rounded-sm bg-[#2c1c11]" />

              <div className="relative flex h-full items-center justify-center">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#ead3aa]">
                  Mercado de técnicas
                </span>
              </div>
            </div>

            {/* Mostrador */}
            <div className="relative p-4 md:p-5">
              {/* Tablas del mostrador */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-5 border-t border-[#5b3c22] bg-[#2d1e13]" />

              {cargando ? (
                <div className="rounded-md border border-[#5d4229] bg-[#241912] p-12 text-center text-[#766957]">
                  Preparando las enseñanzas...
                </div>
              ) : (
                <div className="relative grid grid-cols-1 items-stretch gap-5 md:grid-cols-2">
                  {(datos?.enVenta ?? []).map((habilidad) => {
                    const aprendida = aprendidas.some(
                      (aprendidaItem) =>
                        aprendidaItem.habilidadId === habilidad.id
                    );

                    const nivelNecesario =
                      NIVEL_ESCUELA_POR_RAREZA[habilidad.rareza];

                    const puedeComprar = habilidad.puedeAprender && !aprendida;

                    const comprando = procesando === `aprender:${habilidad.id}`;

                    return (
                      <article
                        key={habilidad.id}
                        className="flex h-full min-h-[220px] flex-col overflow-hidden rounded-[3px] border-2 border-[#9a8158] bg-[#e7d9b7] shadow-[0_8px_18px_rgba(0,0,0,0.35)]"
                      >
                        {/* Pergamino */}
                        <div className="relative flex min-h-[175px] flex-1 flex-col bg-[linear-gradient(135deg,#f0e6cb,#dfcea4)] p-5 shadow-[inset_0_0_24px_rgba(98,67,32,0.12)]">
                          {/* Bordes decorativos */}
                          <div className="pointer-events-none absolute inset-2 border border-[#b39a70]/50" />

                          <div className="relative flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <div className="mb-2">
                                <span
                                  className={`rounded border px-2 py-1 text-[10px] font-black uppercase tracking-widest ${estiloRareza(
                                    habilidad.rareza
                                  )}`}
                                >
                                  {nombreRareza(habilidad.rareza)}
                                </span>
                              </div>

                              <h3 className="text-2xl font-black leading-tight text-[#35271a]">
                                {habilidad.nombre}
                              </h3>
                            </div>

                            {/* Tipo */}
                            <span className="shrink-1 rounded border border-[#8b7659] bg-[#d1c09a] px-2 py-1 text-[10px] font-black uppercase tracking-wider text-[#4d3c2a] shadow-sm">
                              {habilidad.tipo === "activa"
                                ? "Activa"
                                : "Pasiva"}
                            </span>
                          </div>

                          <p className="relative mt-4 text-sm leading-6 text-[#3d3328]">
                            {habilidad.descripcion}
                          </p>
                        </div>

                        {/* Parte inferior del puesto */}
                        <div className="border-t-2 border-[#927650] bg-[#3b2b1d] p-4">
                          {!habilidad.puedeAprender ? (
                            <div className="rounded-md border border-[#594b3d] bg-[#241e18] p-3 text-center">
                              <p className="text-sm font-bold text-[#928370]">
                                🔒 Requiere Escuela nivel {nivelNecesario}
                              </p>
                            </div>
                          ) : aprendida ? (
                            <div className="rounded-md border border-emerald-800/50 bg-[#1e3425] p-3 text-center text-sm font-bold text-emerald-400">
                              ✓ Ya aprendida
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                void aprenderHabilidad(habilidad.id)
                              }
                              disabled={
                                !puedeComprar ||
                                comprando ||
                                oro < habilidad.precio
                              }
                              className={`flex w-full items-center justify-between rounded-md border-2 px-4 py-3 font-black transition-all ${
                                puedeComprar && oro >= habilidad.precio
                                  ? "border-[#9b712f] bg-[#6c4925] text-[#f4e4bf] shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_4px_8px_rgba(0,0,0,0.3)] hover:border-[#c09a50] hover:bg-[#7b542b] active:translate-y-px"
                                  : "cursor-not-allowed border-[#4a4035] bg-[#26211b] text-[#665d52]"
                              }`}
                            >
                              <span>
                                {comprando
                                  ? "Aprendiendo..."
                                  : "Aprender habilidad"}
                              </span>

                              <span className="rounded border border-[#9c6f2d]/50 bg-[#24180e] px-2 py-1 text-amber-400">
                                {habilidad.precio} 🪙
                              </span>
                            </button>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ERROR */}
        {error && (
          <div className="mb-6 rounded-md border border-red-900/70 bg-[#351816] p-4 text-sm font-bold text-red-300 shadow-lg">
            ⚠️ {error}
          </div>
        )}

        {/* ====================================================== */}
        {/* HABILIDADES EQUIPADAS */}
        {/* ====================================================== */}

        <section className="overflow-hidden rounded-lg border-2 border-[#4b3522] bg-[#2d241b] shadow-[0_12px_30px_rgba(0,0,0,0.5)]">
          <div className="border-b-2 border-[#4b3522] bg-[#211812] p-6">
            <h2 className="text-2xl font-black uppercase tracking-[0.08em] text-[#e8d4ab]">
              Habilidades equipadas
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-px bg-[#4b3522] md:grid-cols-2">
            {/* ACTIVAS */}
            <div className="bg-[#211a15] p-4">
              <div className="mb-5">
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-red-400">
                  Activas
                </h3>

                <p className="mt-1 text-xs text-[#736657]">
                  Técnicas utilizables durante el combate.
                </p>
              </div>

              <div className="space-y-2">
                {SLOTS_ACTIVAS.map((slot) => {
                  const equipada = obtenerHabilidadEnSlot(slot);

                  return (
                    <div
                      key={slot}
                      className={`min-h-[64px] rounded-md border p-4 ${
                        equipada
                          ? "border-red-900/60 bg-[#331b18]"
                          : "border-[#3d342b] bg-[#191511]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#776b5d]">
                          {etiquetaSlot(slot)}
                        </span>

                        <span className="text-sm text-[#62584e]">
                          {equipada ? "-" : "＋"}
                        </span>
                      </div>

                      {equipada ? (
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-bold text-[#eee4d1]">
                              {equipada.habilidad.nombre}
                            </p>

                            <p className="mt-1 text-[10px] uppercase tracking-wider text-red-400">
                              {nombreRareza(equipada.habilidad.rareza)}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              void desequiparHabilidad(equipada.habilidadId)
                            }
                            disabled={
                              procesando ===
                              `desequipar:${equipada.habilidadId}`
                            }
                            className="shrink-0 rounded border border-red-900/60 bg-[#231412] px-3 py-2 text-xs font-bold text-red-400 transition hover:bg-red-950/40 disabled:opacity-50"
                          >
                            {procesando === `desequipar:${equipada.habilidadId}`
                              ? "..."
                              : "Quitar"}
                          </button>
                        </div>
                      ) : (
                        <p className="text-sm font-bold text-[#4f473e]">
                          Ranura vacía
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* PASIVAS */}
            <div className="bg-[#1e1a17] p-4">
              <div className="mb-5">
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-sky-400">
                  Pasivas
                </h3>

                <p className="mt-1 text-xs text-[#736657]">
                  Bonificaciones permanentes del aventurero.
                </p>
              </div>

              <div className="space-y-2">
                {SLOTS_PASIVAS.map((slot) => {
                  const equipada = obtenerHabilidadEnSlot(slot);

                  return (
                    <div
                      key={slot}
                      className={`min-h-[64px] rounded-md border p-4 ${
                        equipada
                          ? "border-sky-900/60 bg-[#18252d]"
                          : "border-[#3d342b] bg-[#191511]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#776b5d]">
                          {etiquetaSlot(slot)}
                        </span>

                        <span className="text-sm text-[#62584e]">
                          {equipada ? "-" : "＋"}
                        </span>
                      </div>

                      {equipada ? (
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-bold text-[#eee4d1]">
                              {equipada.habilidad.nombre}
                            </p>

                            <p className="mt-1 text-[10px] uppercase tracking-wider text-sky-400">
                              {nombreRareza(equipada.habilidad.rareza)}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              void desequiparHabilidad(equipada.habilidadId)
                            }
                            disabled={
                              procesando ===
                              `desequipar:${equipada.habilidadId}`
                            }
                            className="shrink-0 rounded border border-sky-900/60 bg-[#141c21] px-3 py-2 text-xs font-bold text-sky-400 transition hover:bg-sky-950/40 disabled:opacity-50"
                          >
                            {procesando === `desequipar:${equipada.habilidadId}`
                              ? "..."
                              : "Quitar"}
                          </button>
                        </div>
                      ) : (
                        <p className="text-sm font-bold text-[#4f473e]">
                          Ranura vacía
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ==================================================== */}
          {/* APRENDIDAS */}
          {/* ==================================================== */}

          <div className="border-t-2 border-[#4b3522] bg-[#211812] p-6">
            <div className="mb-5">
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-[#d3c3a3]">
                Habilidades aprendidas
              </h3>

              <p className="mt-1 text-xs text-[#766858]">
                Técnicas que conoces pero que no llevas equipadas.
              </p>
            </div>

            {habilidadesNoEquipadas.length === 0 ? (
              <div className="rounded-md border border-[#3d342b] bg-[#191511] p-6 text-center">
                <p className="text-sm font-bold text-[#5d554b]">
                  No tienes habilidades aprendidas sin equipar.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {habilidadesNoEquipadas.map((aprendida) => {
                  const habilidad = aprendida.habilidad;

                  const slotsCompatibles =
                    habilidad.tipo === "activa" ? SLOTS_ACTIVAS : SLOTS_PASIVAS;

                  return (
                    <div
                      key={aprendida.id}
                      className="rounded-md border border-[#3e3429] bg-[#191511] p-4 transition-colors hover:border-[#624b31]"
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-bold text-[#eee4d1]">
                              {habilidad.nombre}
                            </h4>

                            <span
                              className={`rounded border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${estiloRareza(
                                habilidad.rareza
                              )}`}
                            >
                              {nombreRareza(habilidad.rareza)}
                            </span>

                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#655b50]">
                              {habilidad.tipo === "activa"
                                ? "Activa"
                                : "Pasiva"}
                            </span>
                          </div>

                          <p className="mt-1 text-xs text-[#6e655a]">
                            Elige una ranura compatible para equiparla.
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {slotsCompatibles.map((slot) => {
                            const estaProcesando =
                              procesando === `equipar:${habilidad.id}:${slot}`;

                            return (
                              <button
                                key={slot}
                                type="button"
                                onClick={() =>
                                  void equiparHabilidad(habilidad.id, slot)
                                }
                                disabled={procesando !== null}
                                className="rounded border border-[#5a4935] bg-[#292118] px-3 py-2 text-xs font-bold text-[#b7a88c] transition-colors hover:border-amber-500/70 hover:bg-[#382a1c] hover:text-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {estaProcesando ? "..." : etiquetaSlot(slot)}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
