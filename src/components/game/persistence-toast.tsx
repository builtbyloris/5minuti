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
    <output aria-live="polite" className="persistence-toast">
      <div>
        <p>Qualcosa resiste al reset</p>
        <strong>{persistence.title}</strong>
      </div>
      <button
        aria-label="Chiudi notifica persistenza"
        onClick={onClose}
        type="button"
      >
        ×
      </button>
    </output>
  );
}
