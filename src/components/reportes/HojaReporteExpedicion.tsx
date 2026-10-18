"use client";

import { useState } from "react";
import Image from "next/image";
import { obtenerRutaSpriteEnemigo } from "@/lib/enemigos";
import { obtenerObjetoPorId, obtenerSpriteObjeto } from "@/lib/objetos";
import type { ObjetoReporteExpedicion, ReporteExpedicion } from "@/lib/tiposJuego";

interface HojaReporteExpedicionProps {
  reporte: ReporteExpedicion;
  onCerrar: () => void;
}

function formatearDuracion(segundosEntrada: number): string {
  const segundos = Math.max(0, Math.floor(segundosEntrada));
  const horas = Math.floor(segundos / 3600);
  const minutos = Math.floor((segundos % 3600) / 60);
  const resto = segundos % 60;
  if (horas > 0) return resto > 0 ? `${horas} h ${minutos} min` : `${horas} h ${minutos} min`;
  if (minutos > 0) return resto > 0 ? `${minutos} min ${resto} s` : `${minutos} min`;
  return `${resto} s`;
}

function imagenObjeto(objetoId: string) {
  const objeto = obtenerObjetoPorId(objetoId);
  return objeto ? obtenerSpriteObjeto(objeto) : null;
}

function colorLog(linea: string): string {
  if (linea.startsWith("🏆") || linea.startsWith("🎉") || linea.startsWith("✨")) return "text-[#36543a]";
  if (linea.startsWith("💀") || linea.startsWith("🩸") || linea.startsWith("🏹")) return "text-[#8b3228]";
  if (linea.startsWith("💰") || linea.startsWith("⭐") || linea.startsWith("🎁")) return "text-[#79551f]";
  if (linea.startsWith("⚔️") || linea.startsWith("🌀") || linea.startsWith("🤡")) return "text-[#65503a]";
  return "text-[#594632]";
}

export default function HojaReporteExpedicion({ reporte, onCerrar }: HojaReporteExpedicionProps) {
  const [cronicaAbierta, setCronicaAbierta] = useState(false);

  const esComercio = reporte.tipo === "comercio";
  const esExito = reporte.resultadoFinal === "exito";
  const esDerrota = reporte.resultadoFinal === "derrota";
  const esRetirada = reporte.resultadoFinal === "huida";
  const esElite = reporte.tipoMision === "elite";
  const enemigoId = reporte.tipo === "combate" && "enemigoId" in reporte ? reporte.enemigoId : null;
  const enemigoPrincipal = reporte.tipo === "combate" && "enemigo" in reporte ? reporte.enemigo : null;
  const derrotados = reporte.enemigosDerrotados?.filter(Boolean) ?? [];
  if (derrotados.length === 0 && esExito && enemigoPrincipal && !esComercio) derrotados.push(enemigoPrincipal);

  const nombreEstado = esExito ? "ÉXITO" : esDerrota ? "FRACASO" : esRetirada ? "RETIRADA" : "CANCELADA";
  const titulo = esComercio
    ? esExito ? "Ruta comercial completada" : esRetirada ? "Retirada de la ruta" : "Ruta comercial fallida"
    : esElite
      ? esExito ? "Expedición élite completada" : esRetirada ? "Retirada de la expedición élite" : "Expedición élite fallida"
      : esExito ? "Expedición completada" : esRetirada ? "Retirada del combate" : esDerrota ? "Expedición fallida" : "Expedición cancelada";

  const piel = esComercio
    ? "border-[#92744a] bg-[linear-gradient(155deg,#eadbb8_0%,#dec99e_54%,#cdb486_100%)] text-[#3e2b1b]"
    : esElite
      ? "border-[#92744a] bg-[linear-gradient(155deg,#f3e5bd_0%,#e7d4a7_54%,#d7bd87_100%)] text-[#3e2b1b]"
      : "border-[#b8b7ab] bg-[linear-gradient(155deg,#fffef8_0%,#f0efe8_54%,#deddd3_100%)] text-[#343b3a]";

  const oro = Math.max(0, Math.trunc(reporte.oroGanado ?? 0));
  const filasRecompensa = [
    { clave: "oro", etiqueta: "Oro", icono: "🪙", cantidad: oro, color: "text-[#79551f]" },
    { clave: "madera", etiqueta: "Madera", icono: "🪵", cantidad: Math.max(0, Math.trunc(reporte.recompensa?.madera ?? 0)), color: "text-[#426b3f]" },
    { clave: "piedra", etiqueta: "Piedra", icono: "🪨", cantidad: Math.max(0, Math.trunc(reporte.recompensa?.piedra ?? 0)), color: "text-[#62645d]" },
    { clave: "metal", etiqueta: "Metal", icono: "⚙️", cantidad: Math.max(0, Math.trunc(reporte.recompensa?.metal ?? 0)), color: "text-[#52636b]" },
    { clave: "xp-base", etiqueta: "Experiencia Base", icono: "✨", cantidad: Math.max(0, Math.trunc(reporte.experienciaGanada ?? 0)), color: "text-[#395d83]" },
    { clave: "xp-job", etiqueta: "Experiencia Job", icono: "📜", cantidad: Math.max(0, Math.trunc(reporte.experienciaJobGanada ?? 0)), color: "text-[#6e4f76]" },
  ].filter((fila) => fila.cantidad > 0);

  // Solo mostramos objetos confirmados como entregados; las recompensas previstas
  // pueden no haberse obtenido si la expedición terminó en derrota.
  const objetos: ObjetoReporteExpedicion[] = (reporte.objetosObtenidos ?? []).map((objeto) => ({ ...objeto }));
  const log = Array.isArray(reporte.logCombate) ? reporte.logCombate.filter((linea) => typeof linea === "string" && linea.trim().length > 0) : [];
  const textoCronica = esComercio ? "Consultar crónica de la ruta" : derrotados.length > 0
    ? `Has derrotado a ${derrotados.join(", ")}`
    : esRetirada ? "Consultar crónica de la retirada" : "Consultar crónica de la expedición";

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#100c08]/85 p-2 backdrop-blur-sm sm:p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-reporte-expedicion"
        className={`relative isolate flex max-h-[94dvh] w-full max-w-xl flex-col overflow-y-auto border-2 p-3 shadow-[0_24px_80px_rgba(0,0,0,0.6),inset_0_0_0_2px_rgba(255,247,215,0.36)] custom-scrollbar sm:p-5 ${piel}`}
      >
        <div aria-hidden="true" className="pointer-events-none absolute inset-1 border border-current/25" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-25 bg-[repeating-linear-gradient(0deg,transparent_0,transparent_23px,rgba(95,67,36,0.14)_24px,transparent_25px)]" />
        <span aria-hidden="true" className="absolute left-1/2 top-2 z-10 h-3 w-3 -translate-x-1/2 rounded-full border border-[#6d281e] bg-[#a43c2b] shadow-[0_1px_2px_rgba(0,0,0,0.65),inset_0_1px_1px_rgba(255,220,180,0.6)]" />

        <header className="relative z-[1] flex items-start justify-between gap-3 border-b border-dashed border-current/30 px-1 pb-3 pt-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative flex h-12 w-12 shrink-0 items-center justify-center border border-current/30 bg-[#d4bf91]/70 shadow-[inset_0_0_0_2px_rgba(255,245,210,0.35)]">
              {esComercio ? (
                <span className="text-2xl" aria-hidden="true">🐪</span>
              ) : (
                <Image
                  src={enemigoId ? obtenerRutaSpriteEnemigo(enemigoId) : "/sprites/tesoro.png"}
                  alt=""
                  fill
                  sizes="48px"
                  className="object-contain p-1 [image-rendering:pixelated]"
                />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#765938]">Gremio · informe de misión</p>
              <h2 id="titulo-reporte-expedicion" className="mt-0.5 font-serif text-xl font-black leading-tight sm:text-2xl">{titulo}</h2>
              <p className="mt-1 text-[11px] font-semibold text-[#664a2d]">
                {esComercio ? `Ruta comercial · ${reporte.objetivoNombre ?? "Gremio aliado"}` : esElite ? "Contrato de élite" : "Expedición de combate"}
                {typeof reporte.amenaza === "number" ? ` · Amenaza ${reporte.amenaza}` : ""}
              </p>
            </div>
          </div>
          <span className={`shrink-0 border px-2 py-1 text-[9px] font-black uppercase tracking-wider ${esExito ? "border-[#496d43] bg-[#d5e2c6] text-[#36543a]" : esDerrota ? "border-[#a45449] bg-[#f1c9bd] text-[#8b3228]" : "border-[#98743c] bg-[#f2dfac] text-[#79551f]"}`}>
            {nombreEstado}
          </span>
        </header>

        <div className="relative z-[1] mt-3 flex flex-wrap items-center gap-2 text-[11px] font-bold">
          {typeof reporte.duracionSegundos === "number" && reporte.duracionSegundos >= 0 && (
            <span className="inline-flex items-center gap-1 border border-[#a28a5e]/70 bg-[#f6e8c7]/75 px-2.5 py-1.5 text-[#664a2d]">
              <span aria-hidden="true">⌛</span> Tiempo empleado: {formatearDuracion(reporte.duracionSegundos)}
            </span>
          )}
          {esElite && <span className="border border-[#a58a58] bg-[#f6e8c7]/75 px-2.5 py-1.5 text-[#79551f]">✦ Contrato de élite</span>}
        </div>

        {esComercio && (
          <section className="relative z-[1] mt-3 border border-[#a28a5e]/70 bg-[#f6e8c7]/65 p-3">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#806341]">Vínculo comercial</p>
            <div className="mt-1 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-serif text-base font-black text-[#352318]">{reporte.objetivoNombre ?? "Gremio aliado"}</p>
                <p className="text-[11px] text-[#664a2d]">Afinidad entre gremios</p>
              </div>
              <span className="shrink-0 border border-[#92744a] bg-[#eadbb8] px-3 py-1.5 font-mono text-lg font-black text-[#36543a]">{reporte.afinidad} <span className="text-xs">♥</span></span>
            </div>
          </section>
        )}

        {reporte.tipo === "combate" && (
          <section className="relative z-[1] mt-3 border border-current/25 bg-[#f8efd9]/70 p-3">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#806341]">Resultado del encuentro</p>
            {log.length > 0 ? (
              <button
                type="button"
                onClick={() => setCronicaAbierta((abierta) => !abierta)}
                aria-expanded={cronicaAbierta}
                aria-controls="cronica-reporte-expedicion"
                className="mt-1 flex min-h-10 w-full items-center justify-between gap-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#68472c]"
              >
                <span className={`font-serif text-base font-black ${derrotados.length > 0 || esExito ? "text-[#36543a]" : "text-[#8b3228]"}`}>
                  {derrotados.length > 0 ? (derrotados.length === 1 ? "🏆 Has derrotado a " : "🏆 Enemigos derrotados: ") + derrotados.join(", ") : esRetirada ? "🏃 Te has retirado del combate" : esDerrota ? "💀 El aventurero ha caído en combate" : esExito ? "🏆 Encuentro completado" : "📜 Expedición cancelada"}
                </span>
                <span aria-hidden="true" className="shrink-0 text-sm">{cronicaAbierta ? "⌃" : "⌄"}</span>
              </button>
            ) : (
              <p className="mt-1 font-serif text-base font-black text-[#594632]">
                {derrotados.length > 0 ? "Has derrotado a " + derrotados.join(", ") : esDerrota ? "El aventurero ha caído en combate" : esRetirada ? "Te has retirado del combate" : "Encuentro concluido"}
              </p>
            )}
          </section>
        )}

        <section className="relative z-[1] mt-4">
          <div className="flex items-center justify-between gap-3 border-b border-current/25 pb-2">
            <h3 className="font-serif text-lg font-black">Recompensas obtenidas</h3>
            {filasRecompensa.length > 0 && <span className="text-[9px] font-black uppercase tracking-wider text-[#806341]">{filasRecompensa.length} {filasRecompensa.length === 1 ? "recompensa" : "recompensas"}</span>}
          </div>

          {filasRecompensa.length > 0 || objetos.length > 0 ? (
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {filasRecompensa.map((fila) => (
                <div key={fila.clave} className="flex min-w-0 items-center gap-2 border border-[#a28a5e]/55 bg-[#f6e8c7]/70 p-2">
                  <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center border border-[#a28a5e]/60 bg-[#d4bf91]/70 text-lg">{fila.icono}</span>
                  <div className="min-w-0">
                    <p className="truncate text-[9px] font-bold uppercase tracking-wide text-[#806341]">{fila.etiqueta}</p>
                    <p className={`font-mono text-base font-black ${fila.color}`}>+{fila.cantidad.toLocaleString("es-ES")}</p>
                  </div>
                </div>
              ))}
              {objetos.map((objeto, indice) => {
                const sprite = imagenObjeto(objeto.objetoId);
                const nombre = objeto.nombre ?? obtenerObjetoPorId(objeto.objetoId)?.nombre ?? objeto.objetoId;
                return (
                  <div key={`${objeto.objetoId}-${indice}`} className="col-span-2 flex min-w-0 items-center gap-3 border border-[#8e774e]/70 bg-[#f6e8c7]/75 p-2 sm:col-span-1">
                    <div className="relative flex h-11 w-11 shrink-0 items-center justify-center border border-[#a28a5e]/70 bg-[#d4bf91]/80">
                      {sprite ? <Image src={sprite} alt="" fill sizes="44px" className="object-contain p-0.5 [image-rendering:pixelated]" /> : <span className="text-xl" aria-hidden="true">📦</span>}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9px] font-black uppercase tracking-wide text-[#806341]">Objeto obtenido</p>
                      <p className="break-words text-xs font-black text-[#352318]">{nombre}{objeto.sufijoId ? ` · ${objeto.sufijoId}` : ""}</p>
                      <p className="font-mono text-[11px] font-bold text-[#36543a]">×{objeto.cantidad}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-3 border border-dashed border-[#a28a5e]/60 px-3 py-2.5 text-xs italic text-[#765938]">
              {esExito ? "No has obtenido recompensas adicionales en esta actividad." : "No se han obtenido recompensas."}
            </p>
          )}
        </section>

        {log.length > 0 && (
          <section className="relative z-[1] mt-4 border-t border-dashed border-current/30 pt-3">
            {esComercio && (
              <button
                type="button"
                onClick={() => setCronicaAbierta((abierta) => !abierta)}
                aria-expanded={cronicaAbierta}
                aria-controls="cronica-reporte-expedicion"
                className="flex min-h-11 w-full items-center justify-between gap-3 border border-[#92744a]/70 bg-[#d4bf91]/55 px-3 py-2 text-left text-xs font-black text-[#4b321f] transition hover:bg-[#f0e2c0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#68472c]"
              >
                <span className="min-w-0 truncate">{textoCronica}</span>
                <span aria-hidden="true" className="shrink-0 text-sm">{cronicaAbierta ? "⌃" : "⌄"}</span>
              </button>
            )}
            {cronicaAbierta && (
              <div id="cronica-reporte-expedicion" className="mt-2 max-h-64 space-y-1.5 overflow-y-auto border border-[#a28a5e]/60 bg-[#f8efd9]/75 p-3">
                {log.map((linea, indice) => (
                  <p key={String(indice) + "-" + linea} className={`text-[11px] leading-relaxed sm:text-xs ${colorLog(linea)}`}>
                    <span className="mr-1 font-mono text-[9px] opacity-55">{String(indice + 1).padStart(2, "0")}.</span>{linea}
                  </p>
                ))}
              </div>
            )}
          </section>
        )}
        <footer className="relative z-[1] mt-4 border-t border-dashed border-current/30 pt-3">
          <button
            type="button"
            onClick={onCerrar}
            className="min-h-12 w-full border border-[#5b3b21] bg-[linear-gradient(#6e4a2a,#3f2919)] px-4 py-3 text-sm font-black uppercase tracking-[0.12em] text-[#fff0d5] shadow-[inset_0_1px_rgba(255,220,170,0.2),0_2px_0_rgba(0,0,0,0.25)] transition hover:brightness-110 active:translate-y-px"
          >
            Cerrar informe · Volver al gremio
          </button>
          <p className="mt-2 text-center font-serif text-[9px] italic text-[#806341]">Registrado en los anales del gremio</p>
        </footer>
      </section>
    </div>
  );
}
