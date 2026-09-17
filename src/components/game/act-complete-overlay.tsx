"use client";

import { GameButton } from "@/components/ui/game-button";
import { useDialogFocus } from "@/components/ui/use-dialog-focus";
import type { ActDefinition } from "@/game/content/acts";

type ActCompleteOverlayProps = {
  act: ActDefinition;
  isV1Complete: boolean;
  onContinue: () => void;
};

export function ActCompleteOverlay({
  act,
  isV1Complete,
  onContinue,
}: ActCompleteOverlayProps) {
  const dialogRef = useDialogFocus(onContinue);

  return (
    <section
      aria-describedby="act-complete-description"
      aria-labelledby="act-complete-title"
      aria-modal="true"
      className="act-complete-overlay"
      ref={dialogRef}
      role="dialog"
    >
      <div aria-hidden="true" className="act-complete-overlay__signal" />
      <p>{isV1Complete ? "Fine della V1" : "Atto completato"}</p>
      <h2 id="act-complete-title">
        Atto {act.id} — {act.title}
      </h2>
      <blockquote id="act-complete-description">{act.revelation}</blockquote>
      <p className="act-complete-overlay__hook">
        {isV1Complete ? "Sei tornato troppo presto." : act.hook}
      </p>
      <GameButton autoFocus onClick={onContinue}>
        Continua a esplorare
      </GameButton>
    </section>
  );
}
