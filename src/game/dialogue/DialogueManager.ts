import type { Dialogue } from "./Dialogue";
import type { DialogueNode } from "./DialogueNode";

export interface DialogueState {
  active: boolean;
  dialogue: Dialogue | null;
  currentNode: DialogueNode | null;
}

type DialogueListener = (state: DialogueState) => void;

const EMPTY_DIALOGUE_STATE: DialogueState = {
  active: false,
  dialogue: null,
  currentNode: null,
};

export class DialogueManager {
  private dialogue: Dialogue | null = null;
  private currentNodeIndex = 0;

  private state: DialogueState = EMPTY_DIALOGUE_STATE;

  private readonly listeners = new Set<DialogueListener>();

  start(dialogue: Dialogue): void {
    this.dialogue = dialogue;
    this.currentNodeIndex = 0;
    this.updateState();
  }

  advance(): void {
    if (!this.dialogue) return;

    this.currentNodeIndex++;

    if (this.currentNodeIndex >= this.dialogue.nodes.length) {
      this.close();
      return;
    }

    this.updateState();
  }

  close(): void {
    this.dialogue = null;
    this.currentNodeIndex = 0;
    this.updateState();
  }

  isActive(): boolean {
    return this.dialogue !== null;
  }

  getCurrentNode(): DialogueNode | null {
    if (!this.dialogue) return null;

    return this.dialogue.nodes[this.currentNodeIndex] ?? null;
  }

  getState(): DialogueState {
    return this.state;
  }

  subscribe(listener: DialogueListener): () => void {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  private updateState(): void {
    this.state = {
      active: this.dialogue !== null,
      dialogue: this.dialogue,
      currentNode: this.getCurrentNode(),
    };

    for (const listener of this.listeners) {
      listener(this.state);
    }
  }
}
