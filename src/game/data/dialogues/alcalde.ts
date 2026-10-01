import type { Dialogue } from "../../dialogue/Dialogue";

interface ConstructionPositionOption {
  position: number;
  label: string;
}

export function createAlcaldeDialogue(
  townHallLevel: 1 | 2,
  constructionPositions: ConstructionPositionOption[] = []
): Dialogue {
  if (townHallLevel === 1) {
    return {
      id: "alcalde-town-hall-tutorial",
      nodes: [
        {
          id: "welcome",
          speaker: "Alcalde",
          text: "Bienvenido a tu nuevo hogar. Esta cabaña es solo un ayuntamiento provisional.",
          nextNodeId: "upgrade-offer",
        },
        {
          id: "upgrade-offer",
          speaker: "Alcalde",
          text: "Con los materiales que has traído podemos mejorarla y convertirla en un Ayuntamiento de nivel 2. ¿Empezamos?",
          choices: [
            { text: "Sí, mejorar el Ayuntamiento", nextNodeId: "upgrade-confirm" },
            { text: "Más tarde", nextNodeId: "goodbye" },
          ],
        },
        {
          id: "upgrade-confirm",
          speaker: "Alcalde",
          text: "Confirmo la mejora del Ayuntamiento al nivel 2. ¿Damos la orden?",
          choices: [
            {
              text: "Confirmar mejora",
              nextNodeId: "upgrade-complete",
              eventId: "upgrade-town-hall",
            },
            { text: "Volver", nextNodeId: "upgrade-offer" },
            { text: "Cancelar", nextNodeId: "goodbye" },
          ],
        },
        {
          id: "upgrade-complete",
          speaker: "Alcalde",
          text: "La mejora está lista. Ahora el Ayuntamiento puede coordinar la construcción de nuevos edificios.",
          nextNodeId: null,
        },
        {
          id: "goodbye",
          speaker: "Alcalde",
          text: "De acuerdo. Avísame cuando quieras continuar con la mejora.",
          nextNodeId: null,
        },
      ],
    };
  }

  return {
    id: "alcalde-town-hall-level-2",
    nodes: [
      {
        id: "welcome",
        speaker: "Alcalde",
        text: "El Ayuntamiento ya está preparado para dirigir el crecimiento del poblado.",
        nextNodeId: "building-options",
      },
      {
        id: "building-options",
        speaker: "Alcalde",
        text: constructionPositions.length
          ? "¿Qué te gustaría construir?"
          : "Ahora mismo no hay ningún edificio disponible para construir.",
        choices: constructionPositions.length
          ? [
              { text: "Construir una Taberna", nextNodeId: "tavern-position" },
              { text: "Ahora no", nextNodeId: "goodbye" },
            ]
          : undefined,
        nextNodeId: constructionPositions.length ? undefined : null,
      },
      {
        id: "tavern-position",
        speaker: "Alcalde",
        text: "¿En qué parcela quieres construir la Taberna?",
        choices: constructionPositions.map(({ position, label }) => ({
          text: `Posición ${position}: ${label}`,
          nextNodeId: `confirm-tavern-${position}`,
        })),
      },
      ...constructionPositions.map(({ position, label }) => ({
        id: `confirm-tavern-${position}`,
        speaker: "Alcalde",
        text: `La Taberna se construirá en la posición ${position}, ${label.toLowerCase()}. ¿Confirmas?`,
        choices: [
          {
            text: "Confirmar construcción",
            nextNodeId: "tavern-ordered",
            eventId: `build-tavern-position:${position}`,
          },
          { text: "Elegir otra posición", nextNodeId: "tavern-position" },
          { text: "Cancelar", nextNodeId: "goodbye" },
        ],
      })),
      {
        id: "tavern-ordered",
        speaker: "Alcalde",
        text: "La parcela queda reservada. Los trabajadores ya han empezado la construcción de la Taberna.",
        nextNodeId: null,
      },
      {
        id: "goodbye",
        speaker: "Alcalde",
        text: "De acuerdo. Vuelve cuando quieras continuar con el poblado.",
        nextNodeId: null,
      },
    ],
  };
}