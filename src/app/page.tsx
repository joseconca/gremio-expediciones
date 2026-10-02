"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Home() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/mundo/jugador", { cache: "no-store" })
      .then((response) => {
        if (cancelled) return;
        if (response.ok) router.replace("/newGame");
        else setChecking(false);
      })
      .catch(() => {
        if (!cancelled) setChecking(false);
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (checking) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-slate-900 p-8 text-slate-100">
        <p className="animate-pulse font-bold text-amber-500">Conectando con el gremio...</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-900 p-8 text-slate-100">
      <div className="max-w-xl text-center">
        <h1 className="mb-4 text-4xl font-bold text-amber-500">Gremio de Expediciones</h1>
        <p className="mb-8 text-lg text-slate-300">
          Levanta tu poblado en el mapa real, explora y combate junto a otros aventureros.
        </p>
        <Link
          href="/login"
          className="rounded-lg bg-amber-600 px-8 py-3 font-bold text-white transition-colors hover:bg-amber-500"
        >
          Entrar o crear cuenta
        </Link>
      </div>
    </main>
  );
}
