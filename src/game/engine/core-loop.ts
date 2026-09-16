import {
  type ClockAnchor,
  consumeClockTime,
  getRemainingSeconds,
  hasLoopEnded,
  LOOP_DURATION_SECONDS,
} from "@/game/engine/clock";
import {
  processScheduledEvents,
  type ScheduledEvent,
} from "@/game/engine/scheduler";
import type { GameState } from "@/game/state/types";

export type CoreLoopStep = {
  anchor: ClockAnchor;
  ended: boolean;
  executedEventIds: string[];
  state: GameState;
};

export function advanceCoreLoop(
  state: GameState,
  anchor: ClockAnchor,
  nowMs: number,
  events: ScheduledEvent[],
  consumedSeconds = 0,
): CoreLoopStep {
  const nextAnchor = consumeClockTime(anchor, consumedSeconds);
  const remainingSeconds = getRemainingSeconds(nextAnchor, nowMs);
  const previousElapsed = LOOP_DURATION_SECONDS - state.run.remainingSeconds;
  const currentElapsed = LOOP_DURATION_SECONDS - remainingSeconds;
  const timedState = {
    ...state,
    run: {
      ...state.run,
      remainingSeconds,
    },
  };
  const scheduled = processScheduledEvents(
    timedState,
    events,
    previousElapsed,
    currentElapsed,
  );

  return {
    anchor: nextAnchor,
    ended: hasLoopEnded(remainingSeconds),
    executedEventIds: scheduled.executedEventIds,
    state: scheduled.state,
  };
}

export function createSaveSnapshot(
  state: GameState,
  now = new Date().toISOString(),
): GameState {
  return {
    ...state,
    metadata: {
      ...state.metadata,
      revision: state.metadata.revision + 1,
      updatedAt: now,
    },
  };
}
