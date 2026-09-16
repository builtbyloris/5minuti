"use client";

import { useEffect, useState } from "react";
import { GameButton } from "@/components/ui/game-button";
import { Panel } from "@/components/ui/panel";
import { localSave } from "@/game/persistence/local-save";
import type { GameState } from "@/game/state/types";

type ResetStage = "idle" | "first-confirmation" | "final-confirmation";

export function SaveResetPanel() {
  const [game, setGame] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [resetStage, setResetStage] = useState<ResetStage>("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    localSave.load().then((savedGame) => {
      if (active) {
        setGame(savedGame);
        setIsLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  async function resetSave() {
    await localSave.clear();
    setGame(null);
    setResetStage("idle");
    setMessage("Salvataggio locale eliminato. La home mostrerà Nuova partita.");
  }

  return (
    <Panel className="w-full max-w-2xl" eyebrow="Sistema" title="Impostazioni">
      <div className="space-y-8 px-5 py-6 sm:px-8 sm:py-8">
        <section aria-labelledby="accessibility-settings">
          <h2
            className="font-display text-lg uppercase tracking-[0.1em] text-text-main"
            id="accessibility-settings"
          >
            Accessibilità
          </h2>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div className="border border-border-subtle bg-bg-main/50 p-4">
              <dt className="text-text-muted">Sottotitoli intro</dt>
              <dd className="mt-1 text-text-main">
                {game?.settings.subtitles === false ? "Disattivati" : "Attivi"}
              </dd>
            </div>
            <div className="border border-border-subtle bg-bg-main/50 p-4">
              <dt className="text-text-muted">Movimento</dt>
              <dd className="mt-1 text-text-main">
                {game?.settings.reducedMotion === "reduce"
                  ? "Ridotto"
                  : "Preferenza di sistema"}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-xs leading-5 text-text-muted">
            Le preferenze audio saranno disponibili quando verrà introdotto il
            relativo sistema.
          </p>
        </section>

        <section
          aria-labelledby="save-settings"
          className="border-t border-border-subtle pt-7"
        >
          <h2
            className="font-display text-lg uppercase tracking-[0.1em] text-text-main"
            id="save-settings"
          >
            Salvataggio guest
          </h2>
          <p className="mt-3 text-sm leading-6 text-text-muted">
            {isLoading
              ? "Verifica del salvataggio locale…"
              : game
                ? `Atto ${game.run.currentActId}, loop ${game.run.loopNumber}. Il reset cancella definitivamente il progresso locale.`
                : "Nessun salvataggio locale presente."}
          </p>

          {game && resetStage === "idle" ? (
            <GameButton
              className="mt-5 sm:w-auto"
              onClick={() => setResetStage("first-confirmation")}
            >
              Resetta salvataggio
            </GameButton>
          ) : null}

          {game && resetStage === "first-confirmation" ? (
            <div className="mt-5 border border-accent-red/40 bg-accent-red/5 p-4">
              <p className="text-sm leading-6 text-text-main">
                Prima conferma: vuoi preparare la cancellazione completa della
                partita guest?
              </p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <GameButton
                  className="sm:w-auto"
                  onClick={() => setResetStage("final-confirmation")}
                  variant="primary"
                >
                  Prima conferma
                </GameButton>
                <GameButton
                  className="sm:w-auto"
                  onClick={() => setResetStage("idle")}
                  variant="quiet"
                >
                  Annulla
                </GameButton>
              </div>
            </div>
          ) : null}

          {game && resetStage === "final-confirmation" ? (
            <div className="mt-5 border border-accent-red bg-accent-red/10 p-4">
              <p className="text-sm font-medium leading-6 text-text-main">
                Seconda e ultima conferma. Questa operazione non può essere
                annullata.
              </p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <GameButton
                  className="sm:w-auto"
                  onClick={() => void resetSave()}
                  variant="primary"
                >
                  Cancella definitivamente
                </GameButton>
                <GameButton
                  className="sm:w-auto"
                  onClick={() => setResetStage("idle")}
                  variant="quiet"
                >
                  Annulla
                </GameButton>
              </div>
            </div>
          ) : null}

          <p
            aria-live="polite"
            className="mt-4 min-h-5 text-sm text-accent-green"
          >
            {message}
          </p>
        </section>

        <GameButton
          className="sm:w-auto"
          href="/"
          icon="arrow-left"
          variant="quiet"
        >
          Torna al menu
        </GameButton>
      </div>
    </Panel>
  );
}
