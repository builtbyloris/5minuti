import type { ReactNode } from "react";

type DiscoveryToastProps = {
  children: ReactNode;
  closeLabel: string;
  label: string;
  onClose: () => void;
  tone: "knowledge" | "persistence" | "secret" | "clue";
};

export function DiscoveryToast({
  children,
  closeLabel,
  label,
  onClose,
  tone,
}: DiscoveryToastProps) {
  return (
    <output aria-live="polite" className="discovery-toast" data-tone={tone}>
      <div>
        <p>{label}</p>
        <strong>{children}</strong>
      </div>
      <button aria-label={closeLabel} onClick={onClose} type="button">
        ×
      </button>
    </output>
  );
}
