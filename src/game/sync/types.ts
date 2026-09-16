import type { CloudSaveRecord } from "@/game/cloud/types";
import type { GameState } from "@/game/state/types";

export type SyncStatus =
  | "conflict"
  | "error"
  | "guest"
  | "pending"
  | "synced"
  | "syncing";

export type SyncConflict = {
  local: GameState;
  remote: CloudSaveRecord;
};

export type SyncState = {
  conflict: SyncConflict | null;
  lastSyncedAt: string | null;
  message: string;
  status: SyncStatus;
};

export type ConflictResolution = "cloud" | "local" | "merge";
