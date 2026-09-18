import { ACT_DEFINITIONS } from "@/game/content/acts";
import { getAnomalyDefinition } from "@/game/content/anomalies";
import { isDateKeyAvailable } from "@/game/engine/calendar";
import type { GameState } from "@/game/state/types";

export function isPostActExploration(state: GameState, currentDateKey: string) {
  const currentAct = ACT_DEFINITIONS.find(
    (definition) => definition.id === state.run.currentActId,
  );
  const v1Complete = ACT_DEFINITIONS.every((definition) =>
    state.progression.completedActs.includes(definition.id),
  );

  if (v1Complete) {
    return true;
  }

  return Boolean(
    currentAct &&
      state.progression.completedActs.includes(currentAct.id) &&
      state.progression.actGate.nextActAvailableOn !== null &&
      !isDateKeyAvailable(
        state.progression.actGate.nextActAvailableOn,
        currentDateKey,
      ),
  );
}

export function discoverAnomaly(state: GameState, anomalyId: string) {
  if (
    !getAnomalyDefinition(anomalyId) ||
    state.progression.discoveredAnomalies.includes(anomalyId)
  ) {
    return { discovered: false, state };
  }

  return {
    discovered: true,
    state: {
      ...state,
      progression: {
        ...state.progression,
        discoveredAnomalies: [
          ...state.progression.discoveredAnomalies,
          anomalyId,
        ],
      },
    },
  };
}
