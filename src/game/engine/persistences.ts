import {
  getPersistenceDefinition,
  PERSISTENCE_DEFINITIONS,
  type PersistenceDefinition,
} from "@/game/content/persistences";
import type { GameState, PersistenceState } from "@/game/state/types";

export type ActivePersistence = {
  definition: PersistenceDefinition;
  state: PersistenceState;
};

function applyDefinitionEffects(
  state: GameState,
  definition: PersistenceDefinition,
) {
  if (definition.effects.length === 0) {
    return state;
  }

  const flags = { ...state.world.flags };
  for (const effect of definition.effects) {
    flags[effect.key] = effect.value;
  }

  return { ...state, world: { ...state.world, flags } };
}

export function hasPersistence(state: GameState, id: string) {
  const definition = getPersistenceDefinition(id);

  if (!definition) {
    return false;
  }

  return state.progression.persistences.some(
    (persistence) =>
      persistence.id === id &&
      persistence.type === definition.type &&
      persistence.active &&
      (persistence.remainingLoops === undefined ||
        persistence.remainingLoops > 0),
  );
}

export function grantPersistence(state: GameState, id: string) {
  const definition = getPersistenceDefinition(id);

  if (!definition || hasPersistence(state, id)) {
    return { granted: false, state };
  }

  const persistence: PersistenceState = {
    active: true,
    id: definition.id,
    type: definition.type,
    ...(definition.remainingLoops === undefined
      ? {}
      : { remainingLoops: definition.remainingLoops }),
  };
  const withoutPrevious = state.progression.persistences.filter(
    (entry) => entry.id !== id,
  );
  const nextState: GameState = {
    ...state,
    progression: {
      ...state.progression,
      persistences: [...withoutPrevious, persistence],
    },
  };

  return {
    granted: true,
    state: applyDefinitionEffects(nextState, definition),
  };
}

export function removePersistence(state: GameState, id: string) {
  if (!state.progression.persistences.some((entry) => entry.id === id)) {
    return { removed: false, state };
  }

  const definition = getPersistenceDefinition(id);
  const flags = { ...state.world.flags };
  for (const effect of definition?.effects ?? []) {
    delete flags[effect.key];
  }

  return {
    removed: true,
    state: {
      ...state,
      progression: {
        ...state.progression,
        persistences: state.progression.persistences.filter(
          (entry) => entry.id !== id,
        ),
      },
      world: { ...state.world, flags },
    },
  };
}

export function getActivePersistences(state: GameState): ActivePersistence[] {
  return state.progression.persistences.flatMap((persistence) => {
    const definition = getPersistenceDefinition(persistence.id);

    if (
      !definition ||
      definition.type !== persistence.type ||
      !persistence.active ||
      persistence.remainingLoops === 0
    ) {
      return [];
    }

    return [{ definition, state: persistence }];
  });
}

export function advancePersistenceLifecycle(state: GameState): GameState {
  const persistences = getActivePersistences(state).flatMap(
    ({ definition, state: persistence }) => {
      if (persistence.remainingLoops === undefined) {
        return [persistence];
      }

      if (persistence.remainingLoops <= 1) {
        return [];
      }

      return [
        {
          ...persistence,
          remainingLoops: persistence.remainingLoops - 1,
          type: definition.type,
        },
      ];
    },
  );

  return {
    ...state,
    progression: { ...state.progression, persistences },
  };
}

export function applyPersistencesToFreshRun(state: GameState): GameState {
  const persistenceFlagKeys = new Set(
    PERSISTENCE_DEFINITIONS.flatMap((definition) =>
      definition.effects.map((effect) => effect.key),
    ),
  );
  const flags = Object.fromEntries(
    Object.entries(state.world.flags).filter(
      ([key]) => !persistenceFlagKeys.has(key),
    ),
  );
  let nextState: GameState = {
    ...state,
    world: { ...state.world, flags },
  };

  for (const { definition } of getActivePersistences(nextState)) {
    nextState = applyDefinitionEffects(nextState, definition);
  }

  const previousEntries = Object.entries(state.world.flags);
  const nextEntries = Object.entries(nextState.world.flags);
  const flagsUnchanged =
    previousEntries.length === nextEntries.length &&
    previousEntries.every(
      ([key, value]) => nextState.world.flags[key] === value,
    );

  return flagsUnchanged ? state : nextState;
}

export function reconcilePersistences(state: GameState): GameState {
  const seen = new Set<string>();
  const validPersistences = getActivePersistences(state).flatMap(
    ({ state: persistence }) => {
      if (seen.has(persistence.id)) {
        return [];
      }
      seen.add(persistence.id);
      return [persistence];
    },
  );
  const changed =
    validPersistences.length !== state.progression.persistences.length;
  const reconciled = changed
    ? {
        ...state,
        progression: {
          ...state.progression,
          persistences: validPersistences,
        },
      }
    : state;

  return applyPersistencesToFreshRun(reconciled);
}
