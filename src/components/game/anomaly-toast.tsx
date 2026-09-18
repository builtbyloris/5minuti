import { DiscoveryToast } from "@/components/game/discovery-toast";
import type { AnomalyDefinition } from "@/game/content/anomalies";

export function AnomalyToast({
  anomaly,
  onClose,
}: {
  anomaly: AnomalyDefinition;
  onClose: () => void;
}) {
  return (
    <DiscoveryToast
      closeLabel="Chiudi notifica anomalia"
      label="Anomalia registrata"
      onClose={onClose}
      tone="anomaly"
    >
      {anomaly.title}
    </DiscoveryToast>
  );
}
