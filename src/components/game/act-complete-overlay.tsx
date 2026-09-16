import { GameButton } from "@/components/ui/game-button";
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
  return (
    <section
      aria-labelledby="act-complete-title"
      aria-modal="true"
      className="act-complete-overlay"
      role="dialog"
    >
      <div aria-hidden="true" className="act-complete-overlay__signal" />
      <p>{isV1Complete ? "Fine della V1" : "Atto completato"}</p>
      <h2 id="act-complete-title">
        Atto {act.id} — {act.title}
      </h2>
      <blockquote>{act.revelation}</blockquote>
      <p className="act-complete-overlay__hook">
        {isV1Complete ? "Sei tornato troppo presto." : act.hook}
      </p>
      <GameButton autoFocus onClick={onContinue}>
        Continua a esplorare
      </GameButton>
    </section>
  );
}
