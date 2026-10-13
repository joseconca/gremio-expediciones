export interface DialogueNode {
  id: string;
  speaker: string;
  text: string;
  nextNodeId?: string | null;

  choices?: DialogueChoice[];
}

export interface DialogueChoice {
  text: string;
  nextNodeId: string;
  eventId?: string;
}
