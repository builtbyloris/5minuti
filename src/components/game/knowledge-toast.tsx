import { DiscoveryToast } from "@/components/game/discovery-toast";
import type { KnowledgeDefinition } from "@/game/content/knowledge";

type KnowledgeToastProps = {
  knowledge: KnowledgeDefinition;
  onClose: () => void;
};

export function KnowledgeToast({ knowledge, onClose }: KnowledgeToastProps) {
  return (
    <DiscoveryToast
      closeLabel="Chiudi notifica"
      label="Nuova conoscenza"
      onClose={onClose}
      tone="knowledge"
    >
      {knowledge.title}
    </DiscoveryToast>
  );
}
