"use client";

import { useState } from "react";
import Image from "next/image";
import type { CombateActivo } from "@/store/useGameStore";
import { obtenerSpriteHeroe } from "@/lib/configuracionJuego";

interface CombateModalProps {
  combate: CombateActivo;
  nombreHeroe: string;
  claseHeroe: string;
  sexoHeroe: "chico" | "chica";
  onAtacar: () => Promise<void>;
  onCerrar: () => void;
}

function porcentajeVida(actual: number, maximo: number): number {
  if (maximo <= 0) return 0;

  return Math.max(0, Math.min(100, (actual / maximo) * 100));
}

function colorLog(linea: string): string {
  if (linea.startsWith("💥")) {
    return "text-fuchsia-300 font-bold";
  }

  if (linea.startsWith("⚔️")) {
    return "text-blue-300";
  }

  if (linea.startsWith("🩸") || linea.startsWith("💀")) {
    return "text-red-400";
  }

  if (linea.startsWith("🏆") || linea.startsWith("💰")) {
    return "text-amber-400 font-bold";
  }

  if (linea.startsWith("⭐") || linea.startsWith("⬆️")) {
    return "text-cyan-300 font-bold";
  }

  if (linea.startsWith("🤡")) {
    return "text-slate-500";
  }

  if (linea.startsWith("💨")) {
    return "text-slate-400";
  }

  if (linea.startsWith("🛡️")) {
    return "text-emerald-300";
  }

  return "text-slate-300";
}

export default function CombateModal({
  combate,
  nombreHeroe,
  claseHeroe,
  sexoHeroe,
  onAtacar,
  onCerrar,
}: CombateModalProps) {
  const [procesando, setProcesando] = useState(false);

  const combateActivo = combate.fase === "activo";
  const victoria = combate.fase === "victoria";
  const derrota = combate.fase === "derrota";
  const huida = combate.fase === "huida";

  const hpHeroe = porcentajeVida(combate.jugadorHp, combate.jugadorHpMaximo);

  const hpEnemigo = porcentajeVida(combate.enemigoHp, combate.enemigoHpMaximo);

  const spriteHeroe = obtenerSpriteHeroe(claseHeroe, sexoHeroe);

  const spriteEnemigo = `/sprites/enemies/${combate.enemigoId}.png`;

  const ejecutarAtaque = async () => {
    if (procesando || !combateActivo || combate.turno !== "jugador") {
      return;
    }

    setProcesando(true);

    try {
      await onAtacar();
    } finally {
      setProcesando(false);
    }
  };

  const ultimasLineas = combate.log.slice(-8);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-3 backdrop-blur-sm sm:p-6">
      <div className="flex max-h-[95vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border-2 border-slate-700 bg-slate-900 shadow-[0_0_70px_rgba(0,0,0,0.8)]">
        {/* ============================================================
            CABECERA
        ============================================================ */}

        <header className="shrink-0 border-b border-slate-700 bg-slate-950 px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg">⚔️</span>

                <span className="text-xs font-black uppercase tracking-[0.3em] text-red-400">
                  Combate
                </span>
              </div>

              <h2 className="mt-1 text-xl font-black uppercase tracking-wide text-white sm:text-2xl">
                {combate.enemigoNombre}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <div className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-center">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                  Ronda
                </p>

                <p className="font-mono text-xl font-black text-amber-400">
                  {combate.ronda}
                </p>
              </div>

              {combateActivo && (
                <div className="hidden rounded-lg border border-blue-900/50 bg-blue-950/30 px-4 py-2 text-center sm:block">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                    Turno
                  </p>

                  <p className="font-black uppercase text-blue-300">
                    {combate.turno === "jugador" ? "Héroe" : "Enemigo"}
                  </p>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ============================================================
            ESCENA
        ============================================================ */}

        <section className="shrink-0 border-b border-slate-700 bg-[radial-gradient(circle_at_50%_40%,#334155_0%,#1e293b_38%,#020617_100%)] px-5 pt-6 pb-5 sm:px-10">
          <div className="grid min-h-[300px] grid-cols-[1fr_auto_1fr] items-end gap-3 sm:min-h-[350px] sm:gap-8">
            {/* HÉROE */}

            <div className="flex min-w-0 flex-col items-center">
              <div className="mb-2 w-full max-w-[260px] rounded-lg border border-blue-900/40 bg-blue-950/30 px-3 py-2 text-center">
                <p className="truncate text-sm font-black uppercase tracking-wide text-blue-200">
                  {nombreHeroe}
                </p>

                <p className="mt-0.5 text-[10px] text-slate-500">
                  Nivel {combate.jugadorNivel}
                </p>
              </div>

              <div className="relative h-40 w-40 sm:h-52 sm:w-52">
                <Image
                  src={spriteHeroe}
                  alt={nombreHeroe}
                  fill
                  sizes="208px"
                  priority
                  className="object-contain [image-rendering:pixelated]"
                />
              </div>

              <div className="mt-3 w-full max-w-[260px]">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-300">
                    HP
                  </span>

                  <span className="font-mono text-xs font-bold text-white">
                    {combate.jugadorHp} / {combate.jugadorHpMaximo}
                  </span>
                </div>

                <div className="h-4 overflow-hidden rounded border border-blue-950 bg-slate-950">
                  <div
                    className="h-full bg-gradient-to-r from-blue-800 to-cyan-400 transition-all duration-500"
                    style={{
                      width: `${hpHeroe}%`,
                    }}
                  />
                </div>

                <div className="mt-2 grid grid-cols-3 text-center text-[10px]">
                  <div>
                    <span className="block text-slate-600">ATQ</span>
                    <span className="font-black text-white">
                      {combate.jugadorAtaque}
                    </span>
                  </div>

                  <div>
                    <span className="block text-slate-600">DEF</span>
                    <span className="font-black text-white">
                      {combate.jugadorDefensa}
                    </span>
                  </div>

                  <div>
                    <span className="block text-slate-600">VEL</span>
                    <span className="font-black text-white">
                      {combate.jugadorVelocidad}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* VS */}

            <div className="mb-28 flex flex-col items-center">
              <span className="text-3xl font-black italic text-slate-600 sm:text-5xl">
                VS
              </span>
            </div>

            {/* ENEMIGO */}

            <div className="flex min-w-0 flex-col items-center">
              <div className="mb-2 w-full max-w-[260px] rounded-lg border border-red-900/40 bg-red-950/30 px-3 py-2 text-center">
                <p className="truncate text-sm font-black uppercase tracking-wide text-red-200">
                  {combate.enemigoNombre}
                </p>

                <p className="mt-0.5 text-[10px] text-slate-500">Enemigo</p>
              </div>

              <div className="relative h-40 w-40 sm:h-52 sm:w-52">
                <Image
                  src={spriteEnemigo}
                  alt={combate.enemigoNombre}
                  fill
                  sizes="208px"
                  priority
                  className="object-contain [image-rendering:pixelated]"
                />
              </div>

              <div className="mt-3 w-full max-w-[260px]">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-red-300">
                    HP
                  </span>

                  <span className="font-mono text-xs font-bold text-white">
                    {combate.enemigoHp} / {combate.enemigoHpMaximo}
                  </span>
                </div>

                <div className="h-4 overflow-hidden rounded border border-red-950 bg-slate-950">
                  <div
                    className="h-full bg-gradient-to-r from-red-800 to-orange-400 transition-all duration-500"
                    style={{
                      width: `${hpEnemigo}%`,
                    }}
                  />
                </div>

                <div className="mt-2 grid grid-cols-3 text-center text-[10px]">
                  <div>
                    <span className="block text-slate-600">ATQ</span>
                    <span className="font-black text-white">
                      {combate.enemigoAtaque}
                    </span>
                  </div>

                  <div>
                    <span className="block text-slate-600">DEF</span>
                    <span className="font-black text-white">
                      {combate.enemigoDefensa}
                    </span>
                  </div>

                  <div>
                    <span className="block text-slate-600">VEL</span>
                    <span className="font-black text-white">
                      {combate.enemigoVelocidad}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================
            ACCIONES
        ============================================================ */}

        <section className="shrink-0 border-b border-slate-700 bg-gradient-to-b from-slate-900 to-slate-950 p-4">
          {combateActivo ? (
            <>
              <div className="mb-3 text-center">
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-600">
                  {combate.turno === "jugador"
                    ? "Tu turno"
                    : "El enemigo está actuando..."}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => void ejecutarAtaque()}
                  disabled={procesando || combate.turno !== "jugador"}
                  className="rounded-xl border-2 border-red-700 bg-gradient-to-b from-red-700 to-red-900 px-5 py-4 text-lg font-black text-white shadow-lg shadow-red-950/40 transition hover:-translate-y-0.5 hover:border-red-500 hover:from-red-600 hover:to-red-800 active:translate-y-0 disabled:cursor-not-allowed disabled:border-slate-700 disabled:from-slate-800 disabled:to-slate-900 disabled:text-slate-600"
                >
                  {procesando ? "⚔️ ATACANDO..." : "⚔️ ATACAR"}
                </button>

                <button
                  type="button"
                  disabled
                  className="rounded-xl border-2 border-slate-700 bg-slate-800/80 px-5 py-4 text-lg font-black text-slate-600"
                >
                  🎒 OBJETOS
                  <span className="mt-1 block text-[9px] font-bold uppercase tracking-wider text-slate-700">
                    Próximamente
                  </span>
                </button>

                <button
                  type="button"
                  disabled
                  className="rounded-xl border-2 border-slate-700 bg-slate-800/80 px-5 py-4 text-lg font-black text-slate-600"
                >
                  ✨ HABILIDADES
                  <span className="mt-1 block text-[9px] font-bold uppercase tracking-wider text-slate-700">
                    Próximamente
                  </span>
                </button>
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={onCerrar}
              className="w-full rounded-xl bg-gradient-to-b from-emerald-600 to-emerald-800 px-5 py-4 text-lg font-black text-white shadow-lg shadow-emerald-950/40 transition hover:from-emerald-500 hover:to-emerald-700"
            >
              Continuar
            </button>
          )}
        </section>

        {/* ============================================================
            LOG
        ============================================================ */}

        <section className="min-h-0 flex-1 bg-[#070b12]">
          <div className="border-b border-slate-800 bg-slate-950 px-5 py-2">
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-600">
              Registro de combate
            </span>
          </div>

          <div className="max-h-40 overflow-y-auto px-5 py-4 sm:max-h-48">
            <div className="space-y-1.5 font-mono text-xs sm:text-sm">
              {ultimasLineas.map((linea, index) => (
                <div
                  key={`${index}-${linea}`}
                  className={`${colorLog(linea)} leading-relaxed`}
                >
                  <span className="mr-2 text-slate-700">
                    [
                    {String(
                      combate.log.length - ultimasLineas.length + index + 1
                    ).padStart(2, "0")}
                    ]
                  </span>

                  {linea}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
