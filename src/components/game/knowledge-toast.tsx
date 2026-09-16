import type { KnowledgeDefinition } from "@/game/content/knowledge";

type KnowledgeToastProps = {
  knowledge: KnowledgeDefinition;
  onClose: () => void;
};

export function KnowledgeToast({ knowledge, onClose }: KnowledgeToastProps) {
  return (
    <output aria-live="polite" className="knowledge-toast">
      <div>
        <p>Nuova conoscenza</p>
        <strong>{knowledge.title}</strong>
      </div>
      <button aria-label="Chiudi notifica" onClick={onClose} type="button">
        ×
      </button>
    </output>
  );
}
