import {
  type DialogueVariant,
  getDialogueDefinition,
} from "@/game/content/dialogues";
import { conditionsPass } from "@/game/engine/conditions";
import type { GameState } from "@/game/state/types";

export function selectDialogueVariant(
  state: GameState,
  dialogueId: string,
  elapsedSecond: number,
): DialogueVariant | null {
  const dialogue = getDialogueDefinition(dialogueId);

  if (!dialogue) {
    return null;
  }

  return (
    dialogue.variants
      .filter((variant) =>
        conditionsPass(state, variant.conditions, elapsedSecond),
      )
      .sort((left, right) => (right.priority ?? 0) - (left.priority ?? 0))[0] ??
    null
  );
}
