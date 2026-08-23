'use client';
import { useGameStore } from '@/store/useGameStore';

export default function BaseLayout({ children }: { children: React.ReactNode }) {
  const oro = useGameStore((state) => state.oro);

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <header className="flex justify-between items-center bg-slate-800 p-4 border-b border-slate-700">
        <h1 className="text-amber-500 font-bold text-xl">Mi Gremio</h1>
        <div className="text-amber-400 font-bold bg-slate-900 px-3 py-1 rounded-lg border border-amber-600/30">
          🪙 {oro} Oro
        </div>
      </header>
      
      <div className="flex-grow">
        {children}
      </div>
    </div>
  );
}