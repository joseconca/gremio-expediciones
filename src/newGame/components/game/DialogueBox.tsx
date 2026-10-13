"use client";

import type { DialogueNode } from "@/game/dialogue/DialogueNode";
import { useEffect, useRef } from "react";

interface DialogueBoxProps {
  node: DialogueNode | null;
  selectedChoiceIndex: number;
}

export default function DialogueBox({
  node,
  selectedChoiceIndex,
}: DialogueBoxProps) {
  const selectedRef = useRef<HTMLLIElement>(null);
  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: "nearest" });
  }, [node, selectedChoiceIndex]);
  if (!node) {
    return null;
  }

  return (
    <div className="pointer-events-auto absolute inset-x-4 bottom-40 z-20 max-h-[calc(100%-11rem)] overflow-y-auto overscroll-contain sm:bottom-52 sm:max-h-[calc(100%-14rem)]">
      <div className="rounded-lg border border-white/30 bg-black/90 px-4 py-3 text-white shadow-lg">
        <div className="mb-1 text-sm font-bold text-yellow-300">
          {node.speaker}
        </div>

        <div className="text-sm leading-relaxed">{node.text}</div>

        {node.choices?.length ? (
          <ol className="mt-3 space-y-1" aria-label="Opciones de diálogo">
            {node.choices.map((choice, index) => (
              <li
                key={`${choice.nextNodeId}-${choice.text}`}
                ref={index === selectedChoiceIndex ? selectedRef : undefined}
                aria-current={index === selectedChoiceIndex ? "true" : undefined}
                className={`rounded px-2 py-1 text-sm ${
                  index === selectedChoiceIndex
                    ? "bg-amber-300/20 font-semibold text-amber-200"
                    : "text-white/75"
                }`}
              >
                {index === selectedChoiceIndex ? "▶ " : "　"}
                {choice.text}
              </li>
            ))}
          </ol>
        ) : null}

        <div className="mt-2 text-right text-xs text-white/50">
          {node.choices?.length
            ? "↑ / ↓ · Elegir　A · Confirmar　B · Cerrar"
            : "A · Continuar　B · Cerrar"}
        </div>
      </div>
    </div>
  );
}
