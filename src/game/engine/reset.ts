import { LOOP_DURATION_SECONDS } from "@/game/engine/clock";
import {
  advancePersistenceLifecycle,
  applyPersistencesToFreshRun,
} from "@/game/engine/persistences";
import type { GameState, LocationId } from "@/game/state/types";

export const INITIAL_LOCATION_ID: LocationId = "piazza";

export function resetGameLoop(
  state: GameState,
  now = new Date().toISOString(),
): GameState {
  if (state.run.remainingSeconds !== 0) {
    return state;
  }

  const baseline = {
    ...state,
    run: {
      ...state.run,
      currentLocationId: INITIAL_LOCATION_ID,
      loopNumber: state.run.loopNumber + 1,
      remainingSeconds: LOOP_DURATION_SECONDS,
      runFlags: {},
    },
    metadata: {
      ...state.metadata,
      revision: state.metadata.revision + 1,
      updatedAt: now,
    },
    world: {
      ...state.world,
      flags: {},
    },
  };

  return applyPersistencesToFreshRun(advancePersistenceLifecycle(baseline));
}
