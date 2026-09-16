import { discoverLocation } from "@/game/archive/discoveries";
import type { InteractionEffect } from "@/game/content/interactions";
import { syncActCompletion } from "@/game/engine/acts";
import { getLocalDateKey } from "@/game/engine/calendar";
import { discoverClue } from "@/game/engine/clues";
import { acquireKnowledge } from "@/game/engine/knowledge";
import {
  grantPersistence,
  removePersistence,
} from "@/game/engine/persistences";
import { discoverSecret } from "@/game/engine/secrets";
import type { GameState } from "@/game/state/types";

export type EffectsResult = {
  acquiredKnowledgeIds: string[];
  completedActId: number | null;
  discoveredClueIds: string[];
  discoveredSecretIds: string[];
  grantedPersistenceIds: string[];
  removedPersistenceIds: string[];
  state: GameState;
};

export function applyInteractionEffects(
  state: GameState,
  effects: InteractionEffect[],
  currentDateKey = getLocalDateKey(),
): EffectsResult {
  let nextState = state;
  const acquiredKnowledgeIds: string[] = [];
  const discoveredClueIds: string[] = [];
  const discoveredSecretIds: string[] = [];
  const grantedPersistenceIds: string[] = [];
  const removedPersistenceIds: string[] = [];

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
    } else if (effect.type === "discover-secret") {
      const result = discoverSecret(nextState, effect.secretId);
      nextState = result.state;
      if (result.discovered) {
        discoveredSecretIds.push(effect.secretId);
      }
    } else if (effect.type === "grant-persistence") {
      const result = grantPersistence(nextState, effect.persistenceId);
      nextState = result.state;
      if (result.granted) {
        grantedPersistenceIds.push(effect.persistenceId);
      }
    } else if (effect.type === "remove-persistence") {
      const result = removePersistence(nextState, effect.persistenceId);
      nextState = result.state;
      if (result.removed) {
        removedPersistenceIds.push(effect.persistenceId);
      }
    } else if (effect.type === "set-location") {
      nextState = discoverLocation(
        {
          ...nextState,
          run: { ...nextState.run, currentLocationId: effect.locationId },
        },
        effect.locationId,
      );
    } else if (effect.type === "set-subscene") {
      nextState = {
        ...nextState,
        run: {
          ...nextState.run,
          runFlags: {
            ...nextState.run.runFlags,
            [`subscene:${effect.id}`]: effect.active,
          },
        },
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

  const completion = syncActCompletion(nextState, currentDateKey);

  return {
    acquiredKnowledgeIds,
    completedActId: completion.completedActId,
    discoveredClueIds,
    discoveredSecretIds,
    grantedPersistenceIds,
    removedPersistenceIds,
    state: completion.state,
  };
}
