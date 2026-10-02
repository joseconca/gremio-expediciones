import type { Dialogue } from "../../dialogue/Dialogue";

export function createNoticeDialogue(speaker: string, text: string): Dialogue {
  return {
    id: "notice",
    nodes: [{ id: "notice", speaker, text, nextNodeId: null }],
  };
}
