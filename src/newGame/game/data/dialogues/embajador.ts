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
    ...party.invitations.slice(0, MAX_LISTED_INVITATIONS).flatMap((invitation) => [
      {
        text: `Aceptar la invitación de ${invitation.fromDisplayName}`,
        nextNodeId: "pending",
        eventId: `party-accept:${invitation.id}`,
      },
      {
        text: `Rechazar la invitación de ${invitation.fromDisplayName}`,
        nextNodeId: "pending",
        eventId: `party-reject:${invitation.id}`,
      },
    ]),
    ...(!party.isFull && (party.isLeader || !inParty)
      ? party.candidates.slice(0, MAX_LISTED_CANDIDATES).map((candidate) => ({
          text: `Invitar a ${candidate.displayName} (${candidate.characterClass})`,
          nextNodeId: "pending",
          eventId: `party-invite:${candidate.id}`,
        }))
      : []),
    ...(inParty
      ? [
          {
            text: "Abandonar la party",
            nextNodeId: "pending",
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
        id: "pending",
        speaker: "Embajador",
        text: "Consultando con los mensajeros…",
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
