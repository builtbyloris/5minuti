"use client";

import { useEffect, useRef, useState } from "react";
import { useAudio } from "@/audio/audio-provider";
import { useAccount } from "@/auth/auth-context";
import { GameButton } from "@/components/ui/game-button";
import { Panel } from "@/components/ui/panel";
import { localSave } from "@/game/persistence/local-save";
import type { GameState } from "@/game/state/types";

type ResetStage = "idle" | "first-confirmation" | "final-confirmation";

export function SaveResetPanel() {
  const { resetProgress, syncState, user } = useAccount();
  const { previewEffects, settings, updateSettings } = useAudio();
  const [game, setGame] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [resetStage, setResetStage] = useState<ResetStage>("idle");
  const [message, setMessage] = useState("");
  const previousResetStageRef = useRef<ResetStage>("idle");

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

  useEffect(() => {
    if (resetStage === "idle" && previousResetStageRef.current !== "idle") {
      document.getElementById("reset-save-button")?.focus();
    }
    previousResetStageRef.current = resetStage;
  }, [resetStage]);

  async function resetSave() {
    const cloudSynced = await resetProgress();
    const nextGame = await localSave.load();
    setGame(nextGame);
    setResetStage("idle");
    setMessage(
      user
        ? cloudSynced
          ? "Progressi reimpostati sul dispositivo e nel cloud."
          : "Progressi reimpostati sul dispositivo. Sincronizzazione cloud in attesa."
        : "Salvataggio locale eliminato. La home mostrerà Nuova partita.",
    );
  }

  return (
    <Panel className="w-full max-w-2xl" eyebrow="Sistema" title="Impostazioni">
      <div className="space-y-8 px-5 py-6 sm:px-8 sm:py-8">
        <section aria-labelledby="audio-settings">
          <h2
            className="font-display text-lg uppercase tracking-[0.1em] text-text-main"
            id="audio-settings"
          >
            Audio
          </h2>
          <div className="settings-controls">
            <label className="settings-range" htmlFor="ambience-volume">
              <span>
                <strong>Atmosfera</strong>
                <output htmlFor="ambience-volume">
                  {settings.ambienceVolume}%
                </output>
              </span>
              <input
                id="ambience-volume"
                max="100"
                min="0"
                onChange={(event) =>
                  updateSettings({
                    ...settings,
                    ambienceVolume: Number(event.currentTarget.value),
                  })
                }
                step="5"
                type="range"
                value={settings.ambienceVolume}
              />
              <small>Pioggia e città notturna durante il loop.</small>
            </label>
            <label className="settings-range" htmlFor="effects-volume">
              <span>
                <strong>Effetti</strong>
                <output htmlFor="effects-volume">
                  {settings.effectsVolume}%
                </output>
              </span>
              <input
                id="effects-volume"
                max="100"
                min="0"
                onChange={(event) =>
                  updateSettings({
                    ...settings,
                    effectsVolume: Number(event.currentTarget.value),
                  })
                }
                onKeyUp={(event) => {
                  if (
                    ["ArrowLeft", "ArrowRight", "Home", "End"].includes(
                      event.key,
                    )
                  ) {
                    previewEffects();
                  }
                }}
                onPointerUp={previewEffects}
                step="5"
                type="range"
                value={settings.effectsVolume}
              />
              <small>Timer, reset e nuove scoperte.</small>
            </label>
          </div>
        </section>

        <section aria-labelledby="accessibility-settings">
          <h2
            className="font-display text-lg uppercase tracking-[0.1em] text-text-main"
            id="accessibility-settings"
          >
            Accessibilità
          </h2>
          <div className="settings-controls">
            <label className="settings-toggle">
              <input
                checked={settings.reducedMotion === "reduce"}
                onChange={(event) =>
                  updateSettings({
                    ...settings,
                    reducedMotion: event.currentTarget.checked
                      ? "reduce"
                      : "system",
                  })
                }
                type="checkbox"
              />
              <span>
                <strong>Riduci movimento ed effetti</strong>
                <small>
                  Sostituisce flash, glitch e movimenti rapidi con transizioni
                  semplici. La preferenza del sistema viene sempre rispettata.
                </small>
              </span>
            </label>
            <label className="settings-toggle">
              <input
                checked={settings.subtitles}
                onChange={(event) =>
                  updateSettings({
                    ...settings,
                    subtitles: event.currentTarget.checked,
                  })
                }
                type="checkbox"
              />
              <span>
                <strong>Sottotitoli intro</strong>
                <small>
                  Mostra le indicazioni essenziali dell’ambiente sonoro.
                </small>
              </span>
            </label>
          </div>
        </section>

        <section
          aria-labelledby="save-settings"
          className="border-t border-border-subtle pt-7"
        >
          <h2
            className="font-display text-lg uppercase tracking-[0.1em] text-text-main"
            id="save-settings"
          >
            {user ? "Salvataggio sincronizzato" : "Salvataggio guest"}
          </h2>
          <p className="mt-3 text-sm leading-6 text-text-muted">
            {isLoading
              ? "Verifica del salvataggio locale…"
              : game
                ? `Atto ${game.run.currentActId}, loop ${game.run.loopNumber}. ${user ? "Il reset crea una nuova partita e la sincronizza nel cloud." : "Il reset cancella definitivamente il progresso locale."}`
                : "Nessun salvataggio locale presente."}
          </p>

          {game && resetStage === "idle" ? (
            <GameButton
              className="mt-5 sm:w-auto"
              id="reset-save-button"
              onClick={() => setResetStage("first-confirmation")}
            >
              Resetta salvataggio
            </GameButton>
          ) : null}

          {game && resetStage === "first-confirmation" ? (
            <fieldset
              aria-label="Prima conferma reset"
              className="mt-5 border border-accent-red/40 bg-accent-red/5 p-4"
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setResetStage("idle");
                }
              }}
            >
              <p className="text-sm leading-6 text-text-main">
                Prima conferma: vuoi preparare la cancellazione completa della
                {user
                  ? "partita su questo dispositivo e nel cloud?"
                  : "partita guest?"}
              </p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <GameButton
                  autoFocus
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
            </fieldset>
          ) : null}

          {game && resetStage === "final-confirmation" ? (
            <fieldset
              aria-label="Conferma finale reset"
              className="mt-5 border border-accent-red bg-accent-red/10 p-4"
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setResetStage("idle");
                }
              }}
            >
              <p className="text-sm font-medium leading-6 text-text-main">
                Seconda e ultima conferma. Questa operazione non può essere
                annullata. {user ? "Il vecchio cloud verrà sostituito." : ""}
              </p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <GameButton
                  autoFocus
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
            </fieldset>
          ) : null}

          <p
            aria-live="polite"
            className="mt-4 min-h-5 text-sm text-accent-green"
          >
            {message}
          </p>
          {user && syncState.status === "error" ? (
            <p className="mt-2 text-xs leading-5 text-text-muted">
              Il reset locale è valido; il cloud verrà ritentato senza
              ripristinare automaticamente i progressi precedenti.
            </p>
          ) : null}
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
