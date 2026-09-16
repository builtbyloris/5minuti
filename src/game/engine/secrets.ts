import {
  getSecretDefinition,
  SECRET_DEFINITIONS,
} from "@/game/content/secrets";
import type { GameState } from "@/game/state/types";

export function discoverSecret(state: GameState, secretId: string) {
  if (
    !getSecretDefinition(secretId) ||
    state.progression.discoveredSecrets.includes(secretId)
  ) {
    return { discovered: false, state };
  }

  return {
    discovered: true,
    state: {
      ...state,
      progression: {
        ...state.progression,
        discoveredSecrets: [...state.progression.discoveredSecrets, secretId],
      },
    },
  };
}

export function getDiscoveredSecrets(state: GameState) {
  return state.progression.discoveredSecrets.flatMap((id) => {
    const definition = getSecretDefinition(id);
    return definition ? [definition] : [];
  });
}

export function getAvailableSecretDefinitions(state: GameState) {
  return SECRET_DEFINITIONS.filter(
    (definition) =>
      state.progression.completedActs.includes(definition.unlockedAfterAct) &&
      !state.progression.discoveredSecrets.includes(definition.id),
  );
}
