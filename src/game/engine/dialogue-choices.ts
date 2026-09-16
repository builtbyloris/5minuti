import type { DialogueChoice } from "@/game/content/dialogues";
import type { ClockAnchor } from "@/game/engine/clock";
import { advanceCoreLoop } from "@/game/engine/core-loop";
import { applyInteractionEffects } from "@/game/engine/effects";
import type { ScheduledEvent } from "@/game/engine/scheduler";
import type { GameState } from "@/game/state/types";

export function executeDialogueChoice(
  state: GameState,
  anchor: ClockAnchor,
  nowMs: number,
  events: ScheduledEvent[],
  choice: DialogueChoice,
  currentDateKey?: string,
) {
  const synchronized = advanceCoreLoop(state, anchor, nowMs, events);
  if (synchronized.ended) {
    return { ok: false as const, state: synchronized.state };
  }

  const timed = advanceCoreLoop(
    synchronized.state,
    synchronized.anchor,
    nowMs,
    events,
    choice.timeCost,
  );
  const effects = applyInteractionEffects(
    timed.state,
    choice.effects ?? [],
    currentDateKey,
  );

  return {
    ...effects,
    anchor: timed.anchor,
    ended: timed.ended,
    executedEventIds: [
      ...synchronized.executedEventIds,
      ...timed.executedEventIds,
    ],
    ok: true as const,
  };
}
