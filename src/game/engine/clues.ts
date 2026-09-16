import { CLUE_DEFINITIONS, getClueDefinition } from "@/game/content/clues";
import type { GameState } from "@/game/state/types";

export type DiscoverClueResult = {
  discovered: boolean;
  state: GameState;
};

export function discoverClue(
  state: GameState,
  clueId: string,
): DiscoverClueResult {
  if (
    !getClueDefinition(clueId) ||
    state.progression.discoveredClues.includes(clueId)
  ) {
    return { discovered: false, state };
  }

  return {
    discovered: true,
    state: {
      ...state,
      progression: {
        ...state.progression,
        discoveredClues: [...state.progression.discoveredClues, clueId],
      },
    },
  };
}

export function getDiscoveredClues(state: GameState) {
  const discovered = new Set(state.progression.discoveredClues);

  return CLUE_DEFINITIONS.filter((definition) => discovered.has(definition.id));
}
