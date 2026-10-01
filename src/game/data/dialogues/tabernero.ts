import type { Dialogue } from "../../dialogue/Dialogue";

export function createTaberneroDialogue(canBuyMeal: boolean): Dialogue {
  return {
    id: "tabernero",
    nodes: [
      {
        id: "welcome",
        speaker: "Tabernero",
        text: canBuyMeal
          ? "Siéntate un momento. Un plato caliente cuesta 10 monedas y te recuperará 30 puntos de vida. ¿Te sirvo?"
          : "Bienvenido, viajero. Cuando necesites comer o descansar, aquí tendrás un plato caliente.",
        choices: canBuyMeal
          ? [
              {
                text: "Comprar comida · 10 monedas",
                nextNodeId: "meal-served",
                eventId: "buy-tavern-meal",
              },
              { text: "Ahora no, gracias", nextNodeId: "goodbye" },
            ]
          : undefined,
        nextNodeId: canBuyMeal ? undefined : null,
      },
      {
        id: "meal-served",
        speaker: "Tabernero",
        text: "¡Marchando! Come despacio; la aventura puede esperar unos minutos.",
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
