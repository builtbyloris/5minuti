import type { InteractionEffect } from "@/game/content/interactions";
import { discoverClue } from "@/game/engine/clues";
import { acquireKnowledge } from "@/game/engine/knowledge";
import type { GameState } from "@/game/state/types";

export type EffectsResult = {
  acquiredKnowledgeIds: string[];
  discoveredClueIds: string[];
  state: GameState;
};

export function applyInteractionEffects(
  state: GameState,
  effects: InteractionEffect[],
): EffectsResult {
  let nextState = state;
  const acquiredKnowledgeIds: string[] = [];
  const discoveredClueIds: string[] = [];

  for (const effect of effects) {
    if (effect.type === "acquire-knowledge") {
      const result = acquireKnowledge(nextState, effect.knowledgeId);
      nextState = result.state;
      if (result.acquired) {
        acquiredKnowledgeIds.push(effect.knowledgeId);
      }
    } else if (effect.type === "discover-clue") {
      const result = discoverClue(nextState, effect.clueId);
      nextState = result.state;
      if (result.discovered) {
        discoveredClueIds.push(effect.clueId);
      }
    } else if (effect.type === "set-location") {
      nextState = {
        ...nextState,
        run: { ...nextState.run, currentLocationId: effect.locationId },
      };
    } else {
      nextState = {
        ...nextState,
        run: {
          ...nextState.run,
          runFlags: {
            ...nextState.run.runFlags,
            [effect.key]: effect.value,
          },
        },
      };
    }
  }

  return { acquiredKnowledgeIds, discoveredClueIds, state: nextState };
}
