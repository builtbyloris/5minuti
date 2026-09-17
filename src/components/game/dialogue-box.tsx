"use client";

import { GameButton } from "@/components/ui/game-button";
import { useDialogFocus } from "@/components/ui/use-dialog-focus";
import type { DialogueChoice, DialogueVariant } from "@/game/content/dialogues";

type DialogueBoxProps = {
  characterName: string;
  onChoice: (choice: DialogueChoice) => void;
  onClose: () => void;
  response?: string;
  variant: DialogueVariant;
};

export function DialogueBox({
  characterName,
  onChoice,
  onClose,
  response,
  variant,
}: DialogueBoxProps) {
  const dialogRef = useDialogFocus(onClose, response ?? variant.id);

  return (
    <section
      aria-labelledby="dialogue-title"
      aria-modal="true"
      className="dialogue-box"
      ref={dialogRef}
      role="dialog"
    >
      <header className="dialogue-box__header">
        <div>
          <p>Conversazione</p>
          <h2 id="dialogue-title">{characterName}</h2>
        </div>
        <button
          aria-label="Chiudi dialogo"
          className="dialogue-box__close"
          onClick={onClose}
          type="button"
        >
          ×
        </button>
      </header>
      <div className="dialogue-box__body">
        <p>{response ?? variant.opening}</p>
        {response ? (
          <GameButton onClick={onClose} variant="quiet">
            Chiudi
          </GameButton>
        ) : (
          <div className="dialogue-box__choices">
            {variant.choices.map((choice) => (
              <GameButton key={choice.id} onClick={() => onChoice(choice)}>
                <span className="action-grid__button-copy">
                  <span>{choice.label}</span>
                  <small>Parla · {choice.timeCost}s</small>
                </span>
              </GameButton>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
