import { GameButton } from "@/components/ui/game-button";
import type { InteractionDefinition } from "@/game/content/interactions";

type ActionGridProps = {
  disabled?: boolean;
  interactions: InteractionDefinition[];
  onSelect: (
    interaction: InteractionDefinition,
    trigger: HTMLButtonElement,
  ) => void;
};

const actionLabels: Record<InteractionDefinition["actionType"], string> = {
  explore: "Esplora",
  follow: "Segui",
  observe: "Osserva",
  talk: "Parla",
  use: "Usa",
};

export function ActionGrid({
  disabled = false,
  interactions,
  onSelect,
}: ActionGridProps) {
  return (
    <section aria-labelledby="actions-title" className="action-grid">
      <header className="action-grid__header">
        <p>Interazioni</p>
        <h2 id="actions-title">Azioni disponibili</h2>
      </header>
      {interactions.length > 0 ? (
        <div className="action-grid__buttons">
          {interactions.map((interaction) => (
            <GameButton
              disabled={disabled}
              key={interaction.id}
              onClick={(event) => onSelect(interaction, event.currentTarget)}
              variant={
                interaction.actionType === "observe" ? "primary" : "secondary"
              }
            >
              <span className="action-grid__button-copy">
                <span>{interaction.label}</span>
                <small>
                  {actionLabels[interaction.actionType]}
                  {interaction.timeCost > 0
                    ? ` · ${interaction.timeCost}s`
                    : ""}
                </small>
              </span>
            </GameButton>
          ))}
        </div>
      ) : (
        <p className="action-grid__empty">
          Nessuna interazione disponibile in questo momento.
        </p>
      )}
    </section>
  );
}
