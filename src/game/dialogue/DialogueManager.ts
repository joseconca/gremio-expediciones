import type { Dialogue } from "./Dialogue";
import type { DialogueNode } from "./DialogueNode";

export interface DialogueState {
  active: boolean;
  dialogue: Dialogue | null;
  currentNode: DialogueNode | null;
  selectedChoiceIndex: number;
}

type DialogueListener = (state: DialogueState) => void;

const EMPTY_DIALOGUE_STATE: DialogueState = {
  active: false,
  dialogue: null,
  currentNode: null,
  selectedChoiceIndex: 0,
};

export class DialogueManager {
  private dialogue: Dialogue | null = null;
  private currentNodeId: string | null = null;
  private selectedChoiceIndex = 0;

  private state: DialogueState = EMPTY_DIALOGUE_STATE;

  private readonly listeners = new Set<DialogueListener>();

  start(dialogue: Dialogue): void {
    if (dialogue.nodes.length === 0) {
      this.close();
      return;
    }

    this.dialogue = dialogue;
    this.currentNodeId = dialogue.nodes[0].id;
    this.selectedChoiceIndex = 0;
    this.updateState();
  }

  advance(): void {
    const currentNode = this.getCurrentNode();
    if (!this.dialogue || !currentNode || currentNode.choices?.length) return;

    if (currentNode.nextNodeId === null) {
      this.close();
      return;
    }

    if (currentNode.nextNodeId) {
      this.goToNode(currentNode.nextNodeId);
      return;
    }

    const currentNodeIndex = this.dialogue.nodes.findIndex(
      (node) => node.id === currentNode.id
    );
    const nextNode = this.dialogue.nodes[currentNodeIndex + 1];

    if (!nextNode) {
      this.close();
      return;
    }

    this.goToNode(nextNode.id);
  }

  moveSelection(direction: -1 | 1): void {
    const choiceCount = this.getCurrentNode()?.choices?.length ?? 0;
    if (choiceCount < 2) return;

    this.selectedChoiceIndex =
      (this.selectedChoiceIndex + direction + choiceCount) % choiceCount;
    this.updateState();
  }

  selectChoice(): void {
    const choice = this.getCurrentNode()?.choices?.[this.selectedChoiceIndex];
    if (choice) {
      this.goToNode(choice.nextNodeId);
    }
  }

  close(): void {
    this.dialogue = null;
    this.currentNodeId = null;
    this.selectedChoiceIndex = 0;
    this.updateState();
  }

  isActive(): boolean {
    return this.dialogue !== null;
  }

  getCurrentNode(): DialogueNode | null {
    if (!this.dialogue || !this.currentNodeId) return null;

    return (
      this.dialogue.nodes.find((node) => node.id === this.currentNodeId) ?? null
    );
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
      selectedChoiceIndex: this.selectedChoiceIndex,
    };

    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  private goToNode(nodeId: string): void {
    if (!this.dialogue?.nodes.some((node) => node.id === nodeId)) {
      this.close();
      return;
    }

    this.currentNodeId = nodeId;
    this.selectedChoiceIndex = 0;
    this.updateState();
  }
}
