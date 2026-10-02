import type { Dialogue } from "../../dialogue/Dialogue";
import type { DialogueNode } from "../../dialogue/DialogueNode";
import type { ConstructibleBuildingType } from "../../gameplay/VillageProgression";

interface ConstructionPositionOption {
  position: number;
  label: string;
}

export type ConstructionOptions = Record<
  ConstructibleBuildingType,
  ConstructionPositionOption[]
>;

const BUILDING_LABELS: Record<ConstructibleBuildingType, string> = {
  tavern: "Taberna",
  embassy: "Embajada",
};

function createConstructionNodes(
  type: ConstructibleBuildingType,
  positions: ConstructionPositionOption[]
): DialogueNode[] {
  const label = BUILDING_LABELS[type];
  return [
    {
      id: `${type}-position`,
      speaker: "Alcalde",
      text: `¿En qué parcela quieres construir la ${label}?`,
      choices: positions.map(({ position, label: positionLabel }) => ({
        text: `Posición ${position}: ${positionLabel}`,
        nextNodeId: `confirm-${type}-${position}`,
      })),
    },
    ...positions.map(({ position, label: positionLabel }) => ({
      id: `confirm-${type}-${position}`,
      speaker: "Alcalde",
      text: `La ${label} se construirá en la posición ${position}, ${positionLabel.toLowerCase()}. ¿Confirmas?`,
      choices: [
        {
          text: "Confirmar construcción",
          nextNodeId: `${type}-ordered`,
          eventId: `build:${type}:${position}`,
        },
        { text: "Elegir otra posición", nextNodeId: `${type}-position` },
        { text: "Cancelar", nextNodeId: "goodbye" },
      ],
    })),
    {
      id: `${type}-ordered`,
      speaker: "Alcalde",
      text: `La parcela queda reservada. Los trabajadores ya han empezado la construcción de la ${label}.`,
      nextNodeId: null,
    },
  ];
}

export function createAlcaldeDialogue(
  townHallLevel: 1 | 2,
  constructionOptions: ConstructionOptions = { tavern: [], embassy: [] }
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

  const buildable = (Object.keys(constructionOptions) as ConstructibleBuildingType[])
    .filter((type) => constructionOptions[type].length > 0);

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
        text: buildable.length
          ? "¿Qué te gustaría construir?"
          : "Ahora mismo no hay ningún edificio disponible para construir.",
        choices: buildable.length
          ? [
              ...buildable.map((type) => ({
                text: `Construir una ${BUILDING_LABELS[type]}`,
                nextNodeId: `${type}-position`,
              })),
              { text: "Ahora no", nextNodeId: "goodbye" },
            ]
          : undefined,
        nextNodeId: buildable.length ? undefined : null,
      },
      ...buildable.flatMap((type) =>
        createConstructionNodes(type, constructionOptions[type])
      ),
      {
        id: "goodbye",
        speaker: "Alcalde",
        text: "De acuerdo. Vuelve cuando quieras continuar con el poblado.",
        nextNodeId: null,
      },
    ],
  };
}