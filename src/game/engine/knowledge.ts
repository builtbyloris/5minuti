import {
  getKnowledgeDefinition,
  KNOWLEDGE_DEFINITIONS,
} from "@/game/content/knowledge";
import type { GameState } from "@/game/state/types";

export type AcquireKnowledgeResult = {
  acquired: boolean;
  state: GameState;
};

export function acquireKnowledge(
  state: GameState,
  knowledgeId: string,
): AcquireKnowledgeResult {
  if (
    !getKnowledgeDefinition(knowledgeId) ||
    state.progression.knowledge.includes(knowledgeId)
  ) {
    return { acquired: false, state };
  }

  return {
    acquired: true,
    state: {
      ...state,
      progression: {
        ...state.progression,
        knowledge: [...state.progression.knowledge, knowledgeId],
      },
    },
  };
}

export function getAcquiredKnowledge(state: GameState) {
  const acquired = new Set(state.progression.knowledge);

  return KNOWLEDGE_DEFINITIONS.filter((definition) =>
    acquired.has(definition.id),
  );
}
