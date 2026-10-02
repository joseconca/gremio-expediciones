import type { Dialogue } from "../../dialogue/Dialogue";
import type { DialogueChoice } from "../../dialogue/DialogueNode";
import type { PartySnapshot } from "../../gameplay/PartyManager";

const MAX_LISTED_INVITATIONS = 2;
const MAX_LISTED_CANDIDATES = 3;

export function createEmbajadorDialogue(party: PartySnapshot): Dialogue {
  if (!party.loaded) {
    return {
      id: "embajador-offline",
      nodes: [
        {
          id: "welcome",
          speaker: "Embajador",
          text: "Los mensajeros aún no han vuelto con noticias de otros gremios. Inténtalo de nuevo en unos instantes.",
          nextNodeId: null,
        },
      ],
    };
  }

  const inParty = party.companions.length > 0;
  const choices: DialogueChoice[] = [
    ...party.invitations.slice(0, MAX_LISTED_INVITATIONS).map((invitation) => ({
      text: `Aceptar la invitación de ${invitation.fromDisplayName}`,
      nextNodeId: "joined",
      eventId: `party-accept:${invitation.id}`,
    })),
    ...(!party.isFull && (party.isLeader || !inParty)
      ? party.candidates.slice(0, MAX_LISTED_CANDIDATES).map((candidate) => ({
          text: `Invitar a ${candidate.displayName} (${candidate.characterClass})`,
          nextNodeId: "invited",
          eventId: `party-invite:${candidate.id}`,
        }))
      : []),
    ...(inParty
      ? [
          {
            text: "Abandonar la party",
            nextNodeId: "left",
            eventId: "party-leave",
          },
        ]
      : []),
    { text: "Nada por ahora", nextNodeId: "goodbye" },
  ];

  const summary = inParty
    ? `Tu party: ${party.companions.map((member) => member.displayName).join(", ")}.`
    : "Ahora mismo no formas parte de ninguna party.";

  return {
    id: "embajador-party",
    nodes: [
      {
        id: "welcome",
        speaker: "Embajador",
        text: `${summary} Desde la Embajada puedo ponerte en contacto con aventureros de otros gremios que tambi\u00e9n tengan Embajada. Las parties admiten hasta 3 miembros.`,
        choices,
      },
      {
        id: "invited",
        speaker: "Embajador",
        text: "He enviado la invitaci\u00f3n. Si la acepta, lo ver\u00e1s en tu grupo.",
        nextNodeId: null,
      },
      {
        id: "joined",
        speaker: "Embajador",
        text: "Si la invitaci\u00f3n sigue vigente y hay hueco, ya formas parte de la party.",
        nextNodeId: null,
      },
      {
        id: "left",
        speaker: "Embajador",
        text: "Has dejado la party.",
        nextNodeId: null,
      },
      {
        id: "goodbye",
        speaker: "Embajador",
        text: "Aqu\u00ed estar\u00e9 cuando quieras formar un grupo.",
        nextNodeId: null,
      },
    ],
  };
}
