"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [registro, setRegistro] = useState(false);
  const [email, setEmail] = useState("");
  const [nombre, setNombre] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCargando(true);
    setError("");

    const endpoint = registro ? "/api/auth/register" : "/api/auth/login";
    const body = registro ? { email, nombre, password } : { email, password };
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json();

    if (!response.ok) {
      setError(data.error || "No se pudo completar la operación.");
      setCargando(false);
      return;
    }

    router.push("/base");
  }

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-6">
      <form onSubmit={enviar} className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-xl p-8 shadow-2xl">
        <h1 className="text-3xl font-bold text-amber-500 mb-2">
          {registro ? "Funda tu gremio" : "Entrar al gremio"}
        </h1>
        <p className="text-slate-400 mb-6">
          {registro ? "Crea una cuenta para empezar tu expedición." : "Continúa tu aventura."}
        </p>

        <label className="block text-sm font-semibold mb-2" htmlFor="email">Email</label>
        <input id="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="w-full mb-4 rounded bg-slate-900 border border-slate-600 p-3" />

        {registro && (
          <>
            <label className="block text-sm font-semibold mb-2" htmlFor="nombre">Nombre del gremio</label>
            <input id="nombre" required value={nombre} onChange={(event) => setNombre(event.target.value)} className="w-full mb-4 rounded bg-slate-900 border border-slate-600 p-3" />
          </>
        )}

        <label className="block text-sm font-semibold mb-2" htmlFor="password">Contraseña</label>
        <input id="password" type="password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} className="w-full mb-5 rounded bg-slate-900 border border-slate-600 p-3" />

        {error && <p className="mb-4 text-red-400 text-sm">{error}</p>}
        <button disabled={cargando} className="w-full rounded bg-amber-600 hover:bg-amber-500 disabled:opacity-50 p-3 font-bold">
          {cargando ? "Conectando..." : registro ? "Crear cuenta" : "Iniciar sesión"}
        </button>
        <button type="button" onClick={() => { setRegistro(!registro); setError(""); }} className="w-full mt-4 text-sm text-blue-300 hover:underline">
          {registro ? "Ya tengo una cuenta" : "Crear una cuenta"}
        </button>
      </form>
    </main>
  );
}