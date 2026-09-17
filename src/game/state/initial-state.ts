import { GAME_STATE_SCHEMA_VERSION, type GameState } from "@/game/state/types";

type InitialStateOptions = {
  id?: string;
  now?: string;
};

function createGuestId(now: string) {
  const randomId = globalThis.crypto?.randomUUID?.();

  return randomId ? `guest-${randomId}` : `guest-${now}`;
}

export function createInitialGameState(
  options: InitialStateOptions = {},
): GameState {
  const now = options.now ?? new Date().toISOString();

  return {
    schemaVersion: GAME_STATE_SCHEMA_VERSION,
    player: {
      id: options.id ?? createGuestId(now),
      mode: "guest",
    },
    run: {
      currentActId: 1,
      currentLocationId: "piazza",
      loopNumber: 1,
      remainingSeconds: 300,
      runFlags: {},
    },
    progression: {
      actGate: {
        nextActAvailableOn: null,
      },
      completedActs: [],
      discoveredAnomalies: [],
      discoveredClues: [],
      discoveredLocations: ["piazza"],
      discoveredPeople: [],
      discoveredSecrets: [],
      knowledge: [],
      persistences: [],
      relationships: {},
    },
    world: {
      flags: {},
    },
    settings: {
      ambienceVolume: 55,
      effectsVolume: 70,
      reducedMotion: "system",
      subtitles: true,
    },
    metadata: {
      createdAt: now,
      introduction: {
        completedAt: null,
        status: "pending",
      },
      revision: 1,
      updatedAt: now,
    },
  };
}
