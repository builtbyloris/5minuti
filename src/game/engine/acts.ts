import {
  ACT_DEFINITIONS,
  type ActDefinition,
  getActDefinition,
} from "@/game/content/acts";
import {
  getNextLocalDateKey,
  isDateKeyAvailable,
} from "@/game/engine/calendar";
import { conditionsPass } from "@/game/engine/conditions";
import type { ActId, GameState } from "@/game/state/types";

export { getActDefinition };

export function getCurrentAct(state: GameState) {
  return getActDefinition(state.run.currentActId) ?? null;
}

export function isActCompleted(state: GameState, actId: ActId) {
  return state.progression.completedActs.includes(actId);
}

export function evaluateActCompletion(
  state: GameState,
  definition = getCurrentAct(state),
) {
  return Boolean(
    definition &&
      !isActCompleted(state, definition.id) &&
      conditionsPass(state, definition.completionConditions, 0),
  );
}

export function getNextAct(actId: ActId) {
  return (
    ACT_DEFINITIONS.find((definition) => definition.id === actId + 1) ?? null
  );
}

function applyCompletionEffects(state: GameState, definition: ActDefinition) {
  if (definition.onCompleteEffects.length === 0) {
    return state;
  }

  const runFlags = { ...state.run.runFlags };
  for (const effect of definition.onCompleteEffects) {
    runFlags[effect.key] = effect.value;
  }

  return { ...state, run: { ...state.run, runFlags } };
}

export function completeAct(
  state: GameState,
  actId: ActId,
  currentDateKey: string,
) {
  const definition = getActDefinition(actId);
  const nextAct = getNextAct(actId);
  const previousActsCompleted = ACT_DEFINITIONS.filter(
    (candidate) => candidate.id < actId,
  ).every((candidate) => isActCompleted(state, candidate.id));

  if (
    !definition ||
    state.run.currentActId !== actId ||
    !previousActsCompleted ||
    isActCompleted(state, actId) ||
    !evaluateActCompletion(state, definition)
  ) {
    return { completed: false, state };
  }

  const completedState: GameState = {
    ...state,
    progression: {
      ...state.progression,
      actGate: {
        nextActAvailableOn: nextAct
          ? getNextLocalDateKey(currentDateKey)
          : null,
      },
      completedActs: [...state.progression.completedActs, actId],
    },
  };

  return {
    completed: true,
    state: applyCompletionEffects(completedState, definition),
  };
}

export function syncActCompletion(state: GameState, currentDateKey: string) {
  const current = getCurrentAct(state);
  if (!current || !evaluateActCompletion(state, current)) {
    return { completedActId: null, state };
  }

  const result = completeAct(state, current.id, currentDateKey);
  return {
    completedActId: result.completed ? current.id : null,
    state: result.state,
  };
}

export function syncActAvailability(
  state: GameState,
  currentDateKey: string,
): GameState {
  const current = getCurrentAct(state);
  if (!current || !isActCompleted(state, current.id)) {
    return state;
  }

  const nextAct = getNextAct(current.id);
  if (
    !nextAct ||
    !isDateKeyAvailable(
      state.progression.actGate.nextActAvailableOn,
      currentDateKey,
    )
  ) {
    return state;
  }

  return {
    ...state,
    progression: {
      ...state.progression,
      actGate: { nextActAvailableOn: null },
    },
    run: { ...state.run, currentActId: nextAct.id },
  };
}

export function isV1Complete(state: GameState) {
  return ACT_DEFINITIONS.every((definition) =>
    isActCompleted(state, definition.id),
  );
}
