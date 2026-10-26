"use client";
import { useState } from "react";
import Link from "next/link";
import SpriteHeroeAnimado from "@/components/combate/SpriteHeroeAnimado";
import { BIBLIOTECA_SPRITES_HD, resolverAccionHeroeHd, type AccionHeroeHd } from "@/lib/sprites-heroes-hd";

const NOMBRES: Record<string, string> = { novato: "Novato", mago: "Mago", espadachin: "Espadachín", acolito: "Acólito", arquero: "Arquero" };
const OPCIONES: [string, string][] = [["idle", "En reposo"], ["walk", "Caminar"], ["attack", "Atacar"], ["hurt", "Recibir daño"], ["dodge", "Esquivar"], ["block_shield", "Bloquear"], ["use_consumable", "Beber poción"]];
export default function RevisionSprites() {
  const [sexo, setSexo] = useState("chico"); const [arma, setArma] = useState("espada_hierro");
  const [escudo, setEscudo] = useState(""); const [accion, setAccion] = useState("idle");
  const [inicio, setInicio] = useState(0); const [reflejado, setReflejado] = useState(false);
  const [party, setParty] = useState(false);
  const cambiar = (fn: () => void) => { fn(); setInicio(performance.now()); };
  const accionSprite: AccionHeroeHd = accion === "attack"
    ? resolverAccionHeroeHd({ animando: true, armaId: arma }) : accion as AccionHeroeHd;
  return <main className="min-h-screen overflow-x-clip bg-stone-950 p-5 text-stone-100 sm:p-10">
    <div className="mx-auto max-w-7xl"><Link href="/base" className="text-amber-300">← Volver al juego</Link>
      <h1 className="mt-6 text-3xl font-bold">Aventureros y equipo</h1>
      <Link href="/revision-enemigos" className="mt-3 inline-block text-amber-300">Revisar enemigos y jefes →</Link>
      <p className="mt-3 max-w-3xl text-stone-300">Prueba el mismo equipo sobre las cinco clases. Esta vista usa el montaje que se muestra en combate. Pulsa una acción para repetirla.</p>
      <div className="my-6 flex flex-wrap items-center gap-4 rounded-xl border border-stone-700 bg-stone-900 p-4">
        <label>Sexo <select aria-label="Sexo" className="rounded bg-stone-800 p-2" value={sexo} onChange={e => cambiar(() => setSexo(e.target.value))}><option value="chico">Masculino</option><option value="chica">Femenino</option></select></label>
        <label>Arma <select aria-label="Arma" className="max-w-52 rounded bg-stone-800 p-2" value={arma} onChange={e => cambiar(() => setArma(e.target.value))}>
          <option value="">Sin arma</option>{Object.entries(BIBLIOTECA_SPRITES_HD.items).filter(([, i]) => !["shield", "arrow", "consumable"].includes(i.family)).map(([id]) => <option key={id} value={id}>{id.replaceAll("_", " ")}</option>)}</select></label>
        <label>Escudo <select aria-label="Escudo" className="rounded bg-stone-800 p-2" value={escudo} disabled={BIBLIOTECA_SPRITES_HD.items[arma]?.hands === 2} onChange={e => cambiar(() => setEscudo(e.target.value))}><option value="">Sin escudo</option><option value="escudo_guardian">Guardián</option><option value="escudo_madera">Madera</option></select></label>
        <label><input type="checkbox" checked={reflejado} onChange={e => setReflejado(e.target.checked)} /> Mirar a la izquierda</label>
        <label><input type="checkbox" checked={party} onChange={e => setParty(e.target.checked)} /> Tamaño de grupo</label>
      </div>
      <div className="flex flex-wrap gap-2">{OPCIONES.map(([id, nombre]) => <button key={id} aria-pressed={accion === id} onClick={() => cambiar(() => setAccion(id))} className={`rounded-lg border px-4 py-2 ${accion === id ? "border-amber-400 bg-amber-950" : "border-stone-700 bg-stone-900"}`}>{nombre}</button>)}</div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">{BIBLIOTECA_SPRITES_HD.classes.map(clase => <article key={clase} className="relative rounded-xl border border-stone-700 bg-gradient-to-b from-slate-900 to-stone-900 px-4 pb-12 pt-40">
        <div className={`relative mx-auto ${party ? "h-[126px] w-[110px]" : "h-[180px] w-[180px]"}`}>
          <SpriteHeroeAnimado clase={clase} profesionActivaId={clase} sexo={sexo} nombre="" accion={accionSprite} armaId={arma} escudoId={escudo} inicioAnimacion={inicio} reflejado={reflejado} sombra contextoSombra={party ? "party" : "hero"} />
          <SpriteHeroeAnimado clase={clase} profesionActivaId={clase} sexo={sexo} nombre={NOMBRES[clase]} accion={accionSprite} armaId={arma} escudoId={escudo} inicioAnimacion={inicio} reflejado={reflejado} className="z-10" />
        </div><h2 className="relative z-20 mt-8 text-center text-lg font-bold">{NOMBRES[clase]}</h2>
      </article>)}</div>
    </div>
  </main>;
}
