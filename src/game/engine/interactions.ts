import {
  getInteractionDefinition,
  INTERACTION_DEFINITIONS,
  type InteractionDefinition,
} from "@/game/content/interactions";
import { type ClockAnchor, LOOP_DURATION_SECONDS } from "@/game/engine/clock";
import { conditionsPass } from "@/game/engine/conditions";
import { advanceCoreLoop } from "@/game/engine/core-loop";
import { applyInteractionEffects } from "@/game/engine/effects";
import type { ScheduledEvent } from "@/game/engine/scheduler";
import type { GameState } from "@/game/state/types";

export type InteractionExecutionResult =
  | {
      acquiredKnowledgeIds: string[];
      anchor: ClockAnchor;
      discoveredClueIds: string[];
      ended: boolean;
      executedEventIds: string[];
      interaction: InteractionDefinition;
      ok: true;
      state: GameState;
    }
  | {
      ok: false;
      reason: "conditions-not-met" | "interaction-not-found" | "loop-ended";
      state: GameState;
    };

export function getAvailableInteractions(
  state: GameState,
  elapsedSecond: number,
) {
  return INTERACTION_DEFINITIONS.filter((interaction) =>
    conditionsPass(state, interaction.conditions, elapsedSecond),
  );
}

export function executeInteraction(
  state: GameState,
  anchor: ClockAnchor,
  nowMs: number,
  events: ScheduledEvent[],
  interactionId: string,
): InteractionExecutionResult {
  const interaction = getInteractionDefinition(interactionId);

  if (!interaction) {
    return { ok: false, reason: "interaction-not-found", state };
  }

  const synchronized = advanceCoreLoop(state, anchor, nowMs, events);
  if (synchronized.ended) {
    return { ok: false, reason: "loop-ended", state: synchronized.state };
  }

  const elapsedSecond =
    LOOP_DURATION_SECONDS - synchronized.state.run.remainingSeconds;

  if (
    !conditionsPass(synchronized.state, interaction.conditions, elapsedSecond)
  ) {
    return {
      ok: false,
      reason: "conditions-not-met",
      state: synchronized.state,
    };
  }

  const timed = advanceCoreLoop(
    synchronized.state,
    synchronized.anchor,
    nowMs,
    events,
    interaction.timeCost,
  );
  const effects = applyInteractionEffects(timed.state, interaction.effects);

  return {
    acquiredKnowledgeIds: effects.acquiredKnowledgeIds,
    anchor: timed.anchor,
    discoveredClueIds: effects.discoveredClueIds,
    ended: timed.ended,
    executedEventIds: [
      ...synchronized.executedEventIds,
      ...timed.executedEventIds,
    ],
    interaction,
    ok: true,
    state: effects.state,
  };
}
