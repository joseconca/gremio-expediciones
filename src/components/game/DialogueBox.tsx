"use client";

import type { DialogueNode } from "@/game/dialogue/DialogueNode";

interface DialogueBoxProps {
  node: DialogueNode | null;
}

export default function DialogueBox({ node }: DialogueBoxProps) {
  if (!node) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-x-4 bottom-24 z-20">
      <div className="rounded-lg border border-white/30 bg-black/90 px-4 py-3 text-white shadow-lg">
        <div className="mb-1 text-sm font-bold text-yellow-300">
          {node.speaker}
        </div>

        <div className="text-sm leading-relaxed">{node.text}</div>

        <div className="mt-2 text-right text-xs text-white/50">
          A · Continuar
        </div>
      </div>
    </div>
  );
}
