import type { GameState } from "@/game/state/types";

export type CloudSaveRecord = {
  gameState: GameState;
  revision: number;
  schemaVersion: number;
  updatedAt: string;
};

export type CloudSaveRow = {
  game_state: unknown;
  revision: number;
  schema_version: number;
  updated_at: string;
  user_id: string;
};

export type CloudSaveErrorCode =
  | "conflict"
  | "future-schema"
  | "invalid-payload"
  | "network";

export class CloudSaveError extends Error {
  constructor(
    readonly code: CloudSaveErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "CloudSaveError";
  }
}
