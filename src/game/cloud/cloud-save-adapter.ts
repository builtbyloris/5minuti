import type { CloudSaveRecord } from "@/game/cloud/types";
import type { GameState } from "@/game/state/types";

export interface CloudSaveAdapter {
  create(userId: string, state: GameState): Promise<CloudSaveRecord>;
  load(userId: string): Promise<CloudSaveRecord | null>;
  update(
    userId: string,
    state: GameState,
    expectedRevision: number,
  ): Promise<CloudSaveRecord>;
}
