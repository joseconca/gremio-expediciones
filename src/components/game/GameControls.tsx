"use client";

import DPad from "./DPad";
import ActionButtons from "./ActionButtons";

interface GameControlsProps {
  disabled?: boolean;
}

export default function GameControls({ disabled = false }: GameControlsProps) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-end justify-between bg-gradient-to-t from-black/50 to-transparent px-[max(1.25rem,env(safe-area-inset-left),env(safe-area-inset-right))] pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-12">
      {disabled ? (
        <p role="status" className="mx-auto rounded-lg border border-amber-200/25 bg-stone-950/90 px-4 py-3 text-center text-sm text-amber-100">
          Viaje en curso: los controles de juego no están disponibles.
        </p>
      ) : (
        <>
          <div className="pointer-events-auto">
            <DPad />
          </div>
          <div className="pointer-events-auto">
            <ActionButtons />
          </div>
        </>
      )}
    </div>
  );
}
