export const GAME_STATE_SCHEMA_VERSION = 3 as const;

export type ActId = number;

export type LocationId = string;

export type RelationshipState = "unknown" | "neutral" | "trusted" | "hostile";

export type PersistenceType =
  | "physical"
  | "relationship"
  | "world"
  | "temporary";

export type PersistenceState = {
  active: boolean;
  id: string;
  remainingLoops?: number;
  type: PersistenceType;
};

export type PlayerState = {
  id: string;
  mode: "guest";
};

export type RunState = {
  currentActId: ActId;
  currentLocationId: LocationId;
  loopNumber: number;
  remainingSeconds: number;
  runFlags: Record<string, boolean>;
};

export type ProgressionState = {
  actGate: {
    nextActAvailableOn: string | null;
  };
  completedActs: ActId[];
  discoveredAnomalies: string[];
  discoveredClues: string[];
  discoveredSecrets: string[];
  knowledge: string[];
  persistences: PersistenceState[];
  relationships: Record<string, RelationshipState>;
};

export type WorldState = {
  flags: Record<string, boolean>;
};

export type SettingsState = {
  reducedMotion: "system" | "reduce" | "full";
  subtitles: boolean;
};

export type IntroductionState = {
  completedAt: string | null;
  status: "pending" | "completed";
};

export type SaveMetadata = {
  createdAt: string;
  introduction: IntroductionState;
  revision: number;
  updatedAt: string;
};

export type GameState = {
  metadata: SaveMetadata;
  player: PlayerState;
  progression: ProgressionState;
  run: RunState;
  schemaVersion: typeof GAME_STATE_SCHEMA_VERSION;
  settings: SettingsState;
  world: WorldState;
};
