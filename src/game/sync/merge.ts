import { reconcileArchiveDiscoveries } from "@/game/archive/discoveries";
import { ACT_DEFINITIONS } from "@/game/content/acts";
import { syncActAvailability } from "@/game/engine/acts";
import { getLocalDateKey } from "@/game/engine/calendar";
import type { GameState } from "@/game/state/types";

export type MergeContext = {
  currentDateKey?: string;
  tieBreaker?: "local" | "remote";
};

export type MergeResult = {
  base: "local" | "remote";
  state: GameState;
};

function union(values: string[], additions: string[]) {
  return [...new Set([...values, ...additions])];
}

function normalizedCompletedActs(states: GameState[]) {
  const discovered = new Set(
    states.flatMap((state) => state.progression.completedActs),
  );
  const completed: number[] = [];

  for (const act of ACT_DEFINITIONS) {
    if (!discovered.has(act.id)) {
      break;
    }
    completed.push(act.id);
  }

  return completed;
}

function narrativeScore(state: GameState) {
  const completed = normalizedCompletedActs([state]).length;
  return [completed, Math.min(state.run.currentActId, ACT_DEFINITIONS.length)];
}

function selectBase(
  local: GameState,
  remote: GameState,
  tieBreaker: "local" | "remote",
) {
  const localScore = narrativeScore(local);
  const remoteScore = narrativeScore(remote);

  if (localScore[0] !== remoteScore[0]) {
    return localScore[0] > remoteScore[0] ? "local" : "remote";
  }
  if (localScore[1] !== remoteScore[1]) {
    return localScore[1] > remoteScore[1] ? "local" : "remote";
  }

  const localUpdated = Date.parse(local.metadata.updatedAt);
  const remoteUpdated = Date.parse(remote.metadata.updatedAt);
  if (
    Number.isFinite(localUpdated) &&
    Number.isFinite(remoteUpdated) &&
    localUpdated !== remoteUpdated
  ) {
    return localUpdated > remoteUpdated ? "local" : "remote";
  }

  return tieBreaker;
}

export function mergeGameStates(
  local: GameState,
  remote: GameState,
  context: MergeContext = {},
): MergeResult {
  const base = selectBase(local, remote, context.tieBreaker ?? "local");
  const baseState = base === "local" ? local : remote;
  const otherState = base === "local" ? remote : local;
  const completedActs = normalizedCompletedActs([local, remote]);
  const lastCompleted = completedActs.at(-1) ?? 0;
  const nextActId = Math.min(lastCompleted + 1, ACT_DEFINITIONS.length);
  const currentActId =
    lastCompleted === ACT_DEFINITIONS.length
      ? ACT_DEFINITIONS.length
      : baseState.run.currentActId === nextActId
        ? nextActId
        : Math.max(1, lastCompleted);
  const merged: GameState = {
    ...baseState,
    player: local.player,
    progression: {
      ...baseState.progression,
      completedActs,
      discoveredAnomalies: union(
        baseState.progression.discoveredAnomalies,
        otherState.progression.discoveredAnomalies,
      ),
      discoveredClues: union(
        baseState.progression.discoveredClues,
        otherState.progression.discoveredClues,
      ),
      discoveredLocations: union(
        baseState.progression.discoveredLocations,
        otherState.progression.discoveredLocations,
      ),
      discoveredPeople: union(
        baseState.progression.discoveredPeople,
        otherState.progression.discoveredPeople,
      ),
      discoveredSecrets: union(
        baseState.progression.discoveredSecrets,
        otherState.progression.discoveredSecrets,
      ),
      knowledge: union(
        baseState.progression.knowledge,
        otherState.progression.knowledge,
      ),
    },
    run: { ...baseState.run, currentActId },
    settings: local.settings,
  };

  return {
    base,
    state: syncActAvailability(
      reconcileArchiveDiscoveries(merged),
      context.currentDateKey ?? getLocalDateKey(),
    ),
  };
}
