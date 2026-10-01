export interface DialogueNode {
  id: string;
  speaker: string;
  text: string;

  choices?: DialogueChoice[];
}

export interface DialogueChoice {
  text: string;
  nextNodeId: string;
}
