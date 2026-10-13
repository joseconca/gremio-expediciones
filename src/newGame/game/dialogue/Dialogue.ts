import type { DialogueNode } from "./DialogueNode";

export interface Dialogue {
  id: string;
  nodes: DialogueNode[];
}
