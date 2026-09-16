import type { GameState } from "@/game/state/types";

export function completeIntroduction(
  state: GameState,
  now = new Date().toISOString(),
): GameState {
  if (state.metadata.introduction.status === "completed") {
    return state;
  }

  return {
    ...state,
    metadata: {
      ...state.metadata,
      introduction: {
        completedAt: now,
        status: "completed",
      },
      revision: state.metadata.revision + 1,
      updatedAt: now,
    },
  };
}
