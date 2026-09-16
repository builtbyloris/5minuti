import type { GameState } from "@/game/state/types";

export function hasCompletedIntroduction(state: GameState) {
  return state.metadata.introduction.status === "completed";
}

export function getPrimaryMenuAction(state: GameState | null) {
  return state ? "continue" : "new";
}
