import type { Dialogue } from "../../dialogue/Dialogue";

export const alcaldeNpcDialogue: Dialogue = {
  id: "alcalde",
  nodes: [
    {
      id: "welcome",
      speaker: "Alcalde",
      text: "Bienvenido al Ayuntamiento.",
    },
    {
      id: "question",
      speaker: "Alcalde",
      text: "¿Qué necesitas hacer en el poblado?",
    },
    {
      id: "end",
      speaker: "Alcalde",
      text: "Cuando necesites algo, vuelve a verme.",
    },
  ],
};