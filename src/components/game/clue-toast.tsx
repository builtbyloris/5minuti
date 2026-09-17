import { DiscoveryToast } from "@/components/game/discovery-toast";
import type { ClueDefinition } from "@/game/content/clues";

export function ClueToast({
  clue,
  onClose,
}: {
  clue: ClueDefinition;
  onClose: () => void;
}) {
  return (
    <DiscoveryToast
      closeLabel="Chiudi notifica indizio"
      label="Nuovo indizio"
      onClose={onClose}
      tone="clue"
    >
      {clue.title}
    </DiscoveryToast>
  );
}
