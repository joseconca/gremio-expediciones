"use client";

import type { Direction } from "@/game/input/InputState";

interface DPadButtonProps {
  direction: Direction;
  label: string;
}

function DPadButton({ direction, label }: DPadButtonProps) {
  const emit = (action: "add" | "remove") => {
    document.dispatchEvent(
      new CustomEvent("VirtualDPad", {
        detail: {
          dir: direction,
          action,
        },
      })
    );
  };

  return (
    <button
      type="button"
      aria-label={label}
      className="touch-none rounded-lg bg-white/20 text-2xl text-white backdrop-blur-sm active:bg-white/40"
      onPointerDown={(event) => {
        event.preventDefault();

        event.currentTarget.setPointerCapture(event.pointerId);

        emit("add");
      }}
      onPointerUp={(event) => {
        event.preventDefault();

        emit("remove");
      }}
      onPointerCancel={(event) => {
        event.preventDefault();

        emit("remove");
      }}
      onLostPointerCapture={() => emit("remove")}
    >
      {label}
    </button>
  );
}

export default function DPad() {
  return (
    <div className="grid h-36 w-36 grid-cols-3 grid-rows-3 gap-1">
      <div />

      <DPadButton direction="up" label="▲" />

      <div />

      <DPadButton direction="left" label={"◀\uFE0E"} />

      <div className="rounded-lg bg-white/10" />

      <DPadButton direction="right" label={"▶\uFE0E"} />

      <div />

      <DPadButton direction="down" label="▼" />

      <div />
    </div>
  );
}
