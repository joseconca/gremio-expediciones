"use client";
import { useState } from "react";
import Link from "next/link";
import SpriteEnemigoAnimado from "@/components/combate/SpriteEnemigoAnimado";
import SpriteHeroeAnimado from "@/components/combate/SpriteHeroeAnimado";
import { ENEMIGOS_HD, type AccionEnemigoHd } from "@/lib/sprites-enemigos-hd";

const ACCIONES: [AccionEnemigoHd, string][] = [["idle", "Reposo"], ["hurt", "Recibir daño"], ["attack", "Atacar"], ["dodge", "Esquivar"]];
export default function RevisionEnemigos() {
  const [id, setId] = useState("bandido_camino");
  const [accion, setAccion] = useState<AccionEnemigoHd>("idle");
  const [inicio, setInicio] = useState(0);
  const [reflejado, setReflejado] = useState(true);
  const sprite = ENEMIGOS_HD[id];
  return <main className="min-h-screen overflow-x-clip bg-stone-950 p-5 text-stone-100 sm:p-10">
    <div className="mx-auto max-w-5xl"><Link href="/revision-sprites" className="text-amber-300">← Aventureros y equipo</Link>
      <h1 className="mt-6 text-3xl font-bold">Enemigos en combate</h1>
      <p className="mt-3 text-stone-300">Los 54 enemigos y jefes usan sus nuevas animaciones. Compara su tamaño con el espadachín y pulsa una acción para repetirla.</p>
      <div className="my-6 flex flex-wrap items-center gap-4">
        <label>Enemigo <select aria-label="Enemigo" className="rounded bg-stone-800 p-2" value={id} onChange={e => { setId(e.target.value); setInicio(performance.now()); }}>
          {Object.entries(ENEMIGOS_HD).map(([key, entry]) => <option key={key} value={key}>{entry.name}{entry.boss ? " · Jefe" : ""}</option>)}
        </select></label>
        <label><input type="checkbox" checked={reflejado} onChange={e => setReflejado(e.target.checked)} /> Mirar hacia el jugador</label>
      </div>
      <div className="flex flex-wrap gap-2">{ACCIONES.map(([key, label]) => <button key={key} aria-pressed={accion === key}
        onClick={() => { setAccion(key); setInicio(performance.now()); }}
        className={`rounded-lg border px-4 py-2 ${accion === key ? "border-amber-400 bg-amber-950" : "border-stone-700 bg-stone-900"}`}>{label}</button>)}</div>
      <div className="mt-6 grid grid-cols-2 gap-4 rounded-xl border border-stone-700 bg-slate-900 pb-10">
        <article className="flex min-h-[360px] flex-col justify-end"><h2 className="text-center">Espadachín</h2>
          <div className="relative mx-auto h-[180px] w-[110px]">
            <SpriteHeroeAnimado clase="espadachin" sexo="chico" nombre="Espadachín" accion="idle" armaId="espada_hierro" />
          </div></article>
        <article className="flex min-h-[360px] flex-col justify-end"><h2 className="mb-3 text-center">{sprite.name}</h2>
          <div className="relative mx-auto w-[150px] [--unidad-enemigo:1.058824px]" style={{ height: `calc(var(--unidad-enemigo) * ${sprite.height})` }}>
            <SpriteEnemigoAnimado key={id} enemigoId={id} nombre={sprite.name} accion={accion} inicioAnimacion={inicio} reflejado={reflejado} />
          </div></article>
      </div><Link href="/base" className="mt-6 inline-block text-amber-300">Volver al juego →</Link>
    </div>
  </main>;
}
