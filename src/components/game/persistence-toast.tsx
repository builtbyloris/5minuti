import { DiscoveryToast } from "@/components/game/discovery-toast";
import type { PersistenceDefinition } from "@/game/content/persistences";

type PersistenceToastProps = {
  onClose: () => void;
  persistence: PersistenceDefinition;
};

export function PersistenceToast({
  onClose,
  persistence,
}: PersistenceToastProps) {
  return (
    <DiscoveryToast
      closeLabel="Chiudi notifica persistenza"
      label="Qualcosa resiste al reset"
      onClose={onClose}
      tone="persistence"
    >
      {persistence.title}
    </DiscoveryToast>
  );
}
