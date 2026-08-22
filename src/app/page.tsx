import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-slate-900 text-slate-100">
      <div className="text-center max-w-xl">
        <h1 className="text-4xl font-bold mb-4 text-amber-500">
          Gremio de Expediciones
        </h1>

        <p className="text-lg mb-8 text-slate-300">
          Gestiona tu base, recluta aventureros y envíalos a explorar el mundo
          real.
        </p>

        <Link href="/crear-base" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors">
          Fundar mi Gremio
        </Link>
        
      </div>
    </main>
  );
}
