import type { Dialogue } from "../../dialogue/Dialogue";

export function createTaberneroDialogue(
  options: { canBuyWithGold: boolean; canUseFood: boolean }
): Dialogue {
  const choices = [
    ...(options.canUseFood
      ? [
          {
            text: "Usar comida del inventario",
            nextNodeId: "meal-served",
            eventId: "eat-food",
          },
        ]
      : []),
    ...(options.canBuyWithGold
      ? [
          {
            text: "Comprar un guiso · 10 monedas",
            nextNodeId: "meal-served",
            eventId: "buy-tavern-meal",
          },
        ]
      : []),
    { text: "Ahora no, gracias", nextNodeId: "goodbye" },
  ];

  const canHeal = options.canUseFood || options.canBuyWithGold;

  return {
    id: "tabernero",
    nodes: [
      {
        id: "welcome",
        speaker: "Tabernero",
        text: canHeal
          ? "Te prepararé un guiso que te dejará como nuevo. Puedes usar una comida que ya tengas o pagar 10 monedas. ¿Qué prefieres?"
          : "Bienvenido, viajero. Estás en plena forma o no tienes comida ni oro suficiente para un guiso.",
        choices: canHeal ? choices : undefined,
        nextNodeId: canHeal ? undefined : null,
      },
      {
        id: "meal-served",
        speaker: "Tabernero",
        text: "¡Marchando! El guiso te ha recuperado toda la vida.",
        nextNodeId: null,
      },
      {
        id: "goodbye",
        speaker: "Tabernero",
        text: "Cuando quieras, el fuego y la cocina estarán encendidos.",
        nextNodeId: null,
      },
    ],
  };
}
