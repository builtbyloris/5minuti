"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CityMap } from "@/components/game/city-map";
import { CountdownTimer } from "@/components/game/countdown-timer";
import { ResetOverlay } from "@/components/game/reset-overlay";
import { GameButton } from "@/components/ui/game-button";
import { Panel } from "@/components/ui/panel";
import {
  CITY_LOCATIONS,
  getLocation,
  getObservableDetails,
} from "@/game/content/locations";
import { CITY_EVENTS, reconcileCityState } from "@/game/content/world-events";
import {
  type ClockAnchor,
  createClockAnchor,
  getElapsedSeconds,
} from "@/game/engine/clock";
import { advanceCoreLoop, createSaveSnapshot } from "@/game/engine/core-loop";
import { navigateToNode } from "@/game/engine/navigation";
import { resetGameLoop } from "@/game/engine/reset";
import { getCharactersAtLocation } from "@/game/engine/routines";
import { localSave } from "@/game/persistence/local-save";
import type { GameState } from "@/game/state/types";

type SessionPhase = "loading" | "missing" | "playing" | "resetting" | "error";

const UI_REFRESH_MS = 500;
const PERIODIC_SNAPSHOT_SECONDS = 5;
const RESET_OVERLAY_MS = 1200;

export function GameplaySession() {
  const [game, setGame] = useState<GameState | null>(null);
  const [phase, setPhase] = useState<SessionPhase>("loading");
  const [notice, setNotice] = useState("");
  const stateRef = useRef<GameState | null>(null);
  const anchorRef = useRef<ClockAnchor | null>(null);
  const phaseRef = useRef<SessionPhase>("loading");
  const resetInProgressRef = useRef(false);
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRemainingRef = useRef<number | null>(null);

  const updatePhase = useCallback((nextPhase: SessionPhase) => {
    phaseRef.current = nextPhase;
    setPhase(nextPhase);
  }, []);

  const persist = useCallback(async (state: GameState, touch = true) => {
    const snapshot = touch ? createSaveSnapshot(state) : state;
    stateRef.current = snapshot;
    lastSavedRemainingRef.current = snapshot.run.remainingSeconds;
    setGame(snapshot);
    await localSave.save(snapshot);
    return snapshot;
  }, []);

  const finishReset = useCallback(async () => {
    const current = stateRef.current;

    if (!current) {
      return;
    }

    const nowMs = Date.now();
    const resetState = resetGameLoop(current);
    anchorRef.current = createClockAnchor(
      resetState.run.remainingSeconds,
      nowMs,
    );
    await persist(resetState, false);
    resetInProgressRef.current = false;
    setNotice("Nuovo loop avviato alle 23:55.");
    updatePhase("playing");
  }, [persist, updatePhase]);

  const beginReset = useCallback(
    async (endedState: GameState) => {
      if (resetInProgressRef.current) {
        return;
      }

      resetInProgressRef.current = true;
      updatePhase("resetting");
      await persist(endedState);
      resetTimeoutRef.current = setTimeout(() => {
        void finishReset();
      }, RESET_OVERLAY_MS);
    },
    [finishReset, persist, updatePhase],
  );

  const applyStep = useCallback(
    async (consumedSeconds = 0, actionNotice?: string) => {
      const current = stateRef.current;
      const anchor = anchorRef.current;

      if (!current || !anchor || phaseRef.current !== "playing") {
        return;
      }

      const step = advanceCoreLoop(
        current,
        anchor,
        Date.now(),
        CITY_EVENTS,
        consumedSeconds,
      );
      anchorRef.current = step.anchor;
      stateRef.current = step.state;
      setGame(step.state);

      if (actionNotice) {
        setNotice(actionNotice);
      } else if (step.executedEventIds.length > 0) {
        setNotice("Qualcosa è cambiato in città.");
      }

      if (step.ended) {
        await beginReset(step.state);
        return;
      }

      const lastSaved = lastSavedRemainingRef.current;
      const shouldSave =
        consumedSeconds > 0 ||
        step.executedEventIds.length > 0 ||
        lastSaved === null ||
        lastSaved - step.state.run.remainingSeconds >=
          PERIODIC_SNAPSHOT_SECONDS;

      if (shouldSave) {
        await persist(step.state);
      }
    },
    [beginReset, persist],
  );

  const saveCurrentSnapshot = useCallback(() => {
    const current = stateRef.current;
    const anchor = anchorRef.current;

    if (!current || !anchor || phaseRef.current === "loading") {
      return;
    }

    if (phaseRef.current === "resetting") {
      void localSave.save(createSaveSnapshot(current));
      return;
    }

    const step = advanceCoreLoop(current, anchor, Date.now(), CITY_EVENTS);
    stateRef.current = step.state;
    void localSave.save(createSaveSnapshot(step.state));
  }, []);

  useEffect(() => {
    let active = true;

    localSave
      .load()
      .then((savedGame) => {
        if (!active) {
          return;
        }

        if (!savedGame) {
          updatePhase("missing");
          return;
        }

        const reconciledGame = reconcileCityState(savedGame);
        stateRef.current = reconciledGame;
        lastSavedRemainingRef.current = reconciledGame.run.remainingSeconds;
        anchorRef.current = createClockAnchor(
          reconciledGame.run.remainingSeconds,
          Date.now(),
        );
        setGame(reconciledGame);
        updatePhase("playing");

        if (reconciledGame !== savedGame) {
          void localSave.save(reconciledGame);
        }

        if (reconciledGame.run.remainingSeconds === 0) {
          void beginReset(reconciledGame);
        }
      })
      .catch(() => {
        if (active) {
          updatePhase("error");
        }
      });

    const refreshId = window.setInterval(() => {
      void applyStep();
    }, UI_REFRESH_MS);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void applyStep();
      }
    };

    window.addEventListener("pagehide", saveCurrentSnapshot);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      active = false;
      window.clearInterval(refreshId);
      window.removeEventListener("pagehide", saveCurrentSnapshot);
      document.removeEventListener("visibilitychange", handleVisibility);
      saveCurrentSnapshot();

      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current);
      }
    };
  }, [applyStep, beginReset, saveCurrentSnapshot, updatePhase]);

  async function consumeTime(seconds: number) {
    await applyStep(
      seconds,
      `Azione completata: ${seconds} secondi trascorsi.`,
    );
  }

  async function travel(destinationId: string) {
    const current = stateRef.current;

    if (!current || phaseRef.current !== "playing") {
      return;
    }

    const navigation = navigateToNode(current, CITY_LOCATIONS, destinationId);

    if (!navigation.ok) {
      setNotice("Destinazione non collegata.");
      return;
    }

    stateRef.current = navigation.state;
    await applyStep(
      navigation.costSeconds,
      `Spostamento completato: ${navigation.costSeconds} secondi trascorsi.`,
    );
  }

  if (phase === "loading") {
    return (
      <p className="m-auto px-6 py-16 font-mono text-xs uppercase tracking-[0.2em] text-text-muted">
        Sincronizzazione del loop…
      </p>
    );
  }

  if (phase === "missing" || phase === "error" || !game) {
    return (
      <main className="m-auto w-full max-w-xl px-5 py-10" id="main-content">
        <Panel eyebrow="Stato partita" title="Nessun loop attivo">
          <div className="p-6 sm:p-8">
            <p className="text-sm leading-6 text-text-muted">
              {phase === "error"
                ? "Non è stato possibile caricare il salvataggio locale."
                : "Crea una nuova partita dal menu principale prima di entrare nel loop."}
            </p>
            <GameButton
              className="mt-6 sm:w-auto"
              href="/"
              icon="arrow-left"
              variant="quiet"
            >
              Torna al menu
            </GameButton>
          </div>
        </Panel>
      </main>
    );
  }

  const currentNode = getLocation(game.run.currentLocationId);
  const elapsedSecond = getElapsedSeconds(
    createClockAnchor(game.run.remainingSeconds, 0),
    0,
  );
  const presentCharacters = currentNode
    ? getCharactersAtLocation(game, currentNode.id, elapsedSecond)
    : [];
  const observableDetails = currentNode
    ? getObservableDetails(game, currentNode)
    : [];
  const isBlackout = game.world.flags.blackout === true;

  return (
    <main className="gameplay" id="main-content">
      <header className="gameplay__header">
        <div>
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-text-muted">
            Atto corrente
          </p>
          <p className="mt-1 font-display text-xl uppercase tracking-[0.12em] text-text-main">
            Atto {game.run.currentActId}
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-text-muted">
            Iterazione
          </p>
          <p className="mt-1 font-mono text-sm text-text-main">
            Loop {game.run.loopNumber}
          </p>
        </div>
      </header>

      <div
        className={`gameplay__grid ${isBlackout ? "gameplay__grid--blackout" : ""}`}
      >
        <section
          className={`gameplay__scene gameplay__scene--${currentNode?.scene ?? "square"}`}
          aria-labelledby="scene-title"
        >
          <div className="gameplay__scene-image" aria-hidden="true" />
          <div className="gameplay__scene-copy">
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-accent-red-strong">
              {isBlackout ? "Corrente interrotta" : currentNode?.atmosphere}
            </p>
            <h1
              className="mt-2 font-display text-3xl uppercase tracking-[0.08em] text-text-main sm:text-4xl"
              id="scene-title"
            >
              {currentNode?.label ?? game.run.currentLocationId}
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-text-muted">
              {currentNode?.description}
            </p>
            {observableDetails.map((detail) => (
              <p className="gameplay__observation" key={detail}>
                {detail}
              </p>
            ))}

            <section
              className="character-presence"
              aria-labelledby="presence-title"
            >
              <h2 id="presence-title">Presenti ora</h2>
              {presentCharacters.length > 0 ? (
                <ul>
                  {presentCharacters.map((character) => (
                    <li key={character.id}>
                      <strong>{character.name}</strong>
                      <span>{character.activity}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>Nessuno in vista.</p>
              )}
            </section>
          </div>
        </section>

        <aside className="gameplay__controls">
          <CountdownTimer remainingSeconds={game.run.remainingSeconds} />

          <Panel eyebrow="Percorsi" title="Mappa della città">
            <div className="space-y-3 p-4 sm:p-5">
              <CityMap
                currentLocationId={game.run.currentLocationId}
                disabled={phase !== "playing"}
                locations={CITY_LOCATIONS}
                onTravel={(destinationId) => void travel(destinationId)}
              />

              <GameButton
                className="mt-4"
                disabled={phase !== "playing"}
                onClick={() => void consumeTime(15)}
              >
                Aspetta 15 secondi
              </GameButton>
            </div>
          </Panel>

          <p
            aria-live="polite"
            className="min-h-6 text-sm leading-6 text-text-muted"
          >
            {notice ||
              "Il tempo continua anche quando la scheda è in background."}
          </p>

          <GameButton
            className="sm:w-auto"
            href="/"
            icon="arrow-left"
            variant="quiet"
          >
            Sospendi e torna al menu
          </GameButton>
        </aside>
      </div>

      {phase === "resetting" ? (
        <ResetOverlay loopNumber={game.run.loopNumber} />
      ) : null}
    </main>
  );
}
