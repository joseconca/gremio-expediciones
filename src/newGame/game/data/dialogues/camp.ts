import type { Dialogue } from "../../dialogue/Dialogue";

export const campReturnDialogue: Dialogue = {
  id: "return-to-camp",
  nodes: [
    {
      id: "return-prompt",
      speaker: "Campamento",
      text: "¿Quieres regresar a tu campamento?",
      choices: [
        {
          text: "Sí, regresar",
          nextNodeId: "return-confirmed",
          eventId: "return-to-camp",
        },
        {
          text: "No, continuar explorando",
          nextNodeId: "return-cancelled",
        },
      ],
    },
    {
      id: "return-confirmed",
      speaker: "Campamento",
      text: "Volvamos a casa.",
      nextNodeId: null,
    },
    {
      id: "return-cancelled",
      speaker: "Campamento",
      text: "De acuerdo. El mundo aún te espera.",
      nextNodeId: null,
    },
  ],
};
