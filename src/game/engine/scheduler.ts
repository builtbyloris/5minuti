import type { GameState } from "@/game/state/types";

const EXECUTED_PREFIX = "scheduler:executed:";
const CANCELLED_PREFIX = "scheduler:cancelled:";

export type SchedulerCondition = {
  key: string;
  type: "run-flag-equals";
  value: boolean;
};

export type SchedulerEffect =
  | {
      key: string;
      type: "set-run-flag";
      value: boolean;
    }
  | {
      eventId: string;
      type: "cancel-event";
    }
  | {
      key: string;
      type: "set-world-flag";
      value: boolean;
    };

export type ScheduledEvent = {
  atElapsedSecond: number;
  conditions?: SchedulerCondition[];
  effects: SchedulerEffect[];
  id: string;
};

export type SchedulerResult = {
  executedEventIds: string[];
  state: GameState;
};

function isMarked(state: GameState, prefix: string, eventId: string) {
  return state.run.runFlags[`${prefix}${eventId}`] === true;
}

function conditionsPass(
  state: GameState,
  conditions: SchedulerCondition[] = [],
) {
  return conditions.every(
    (condition) => state.run.runFlags[condition.key] === condition.value,
  );
}

function applyEffects(state: GameState, effects: SchedulerEffect[]) {
  const runFlags = { ...state.run.runFlags };
  const worldFlags = { ...state.world.flags };

  for (const effect of effects) {
    if (effect.type === "set-run-flag") {
      runFlags[effect.key] = effect.value;
    } else if (effect.type === "cancel-event") {
      runFlags[`${CANCELLED_PREFIX}${effect.eventId}`] = true;
    } else {
      worldFlags[effect.key] = effect.value;
    }
  }

  return {
    ...state,
    run: {
      ...state.run,
      runFlags,
    },
    world: {
      ...state.world,
      flags: worldFlags,
    },
  };
}

export function processScheduledEvents(
  state: GameState,
  events: ScheduledEvent[],
  previousElapsedSecond: number,
  currentElapsedSecond: number,
): SchedulerResult {
  const dueEvents = events
    .filter(
      (event) =>
        event.atElapsedSecond > previousElapsedSecond &&
        event.atElapsedSecond <= currentElapsedSecond,
    )
    .sort(
      (left, right) =>
        left.atElapsedSecond - right.atElapsedSecond ||
        left.id.localeCompare(right.id),
    );

  let nextState = state;
  const executedEventIds: string[] = [];

  for (const event of dueEvents) {
    if (
      isMarked(nextState, EXECUTED_PREFIX, event.id) ||
      isMarked(nextState, CANCELLED_PREFIX, event.id) ||
      !conditionsPass(nextState, event.conditions)
    ) {
      continue;
    }

    nextState = applyEffects(nextState, event.effects);
    nextState = {
      ...nextState,
      run: {
        ...nextState.run,
        runFlags: {
          ...nextState.run.runFlags,
          [`${EXECUTED_PREFIX}${event.id}`]: true,
        },
      },
    };
    executedEventIds.push(event.id);
  }

  return { executedEventIds, state: nextState };
}
