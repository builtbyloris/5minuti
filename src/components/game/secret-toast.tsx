import { DiscoveryToast } from "@/components/game/discovery-toast";
import type { SecretDefinition } from "@/game/content/secrets";

type SecretToastProps = {
  onClose: () => void;
  secret: SecretDefinition;
};

export function SecretToast({ onClose, secret }: SecretToastProps) {
  return (
    <DiscoveryToast
      closeLabel="Chiudi notifica segreto"
      label="Segreto scoperto"
      onClose={onClose}
      tone="secret"
    >
      {secret.title}
    </DiscoveryToast>
  );
}
