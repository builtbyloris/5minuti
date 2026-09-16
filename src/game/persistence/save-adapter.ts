import type { GameState } from "@/game/state/types";

export interface SaveAdapter {
  clear(): Promise<void>;
  load(): Promise<GameState | null>;
  save(state: GameState): Promise<void>;
}
