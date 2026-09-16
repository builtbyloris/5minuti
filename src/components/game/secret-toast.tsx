import type { SecretDefinition } from "@/game/content/secrets";

type SecretToastProps = {
  onClose: () => void;
  secret: SecretDefinition;
};

export function SecretToast({ onClose, secret }: SecretToastProps) {
  return (
    <output aria-live="polite" className="secret-toast">
      <div>
        <p>Segreto scoperto</p>
        <strong>{secret.title}</strong>
      </div>
      <button
        aria-label="Chiudi notifica segreto"
        onClick={onClose}
        type="button"
      >
        ×
      </button>
    </output>
  );
}
