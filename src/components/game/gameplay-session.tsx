"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getTimerCue } from "@/audio/audio-cues";
import { useAudio } from "@/audio/audio-provider";
import { ActCompleteOverlay } from "@/components/game/act-complete-overlay";
import { ActionGrid } from "@/components/game/action-grid";
import { AnomalyToast } from "@/components/game/anomaly-toast";
import { CityMap } from "@/components/game/city-map";
import { ClueToast } from "@/components/game/clue-toast";
import { CountdownTimer } from "@/components/game/countdown-timer";
import { DialogueBox } from "@/components/game/dialogue-box";
import { Journal } from "@/components/game/journal";
import { KnowledgeToast } from "@/components/game/knowledge-toast";
import { PersistenceToast } from "@/components/game/persistence-toast";
import { ResetOverlay } from "@/components/game/reset-overlay";
import { SecretToast } from "@/components/game/secret-toast";
import { GameButton } from "@/components/ui/game-button";
import { Panel } from "@/components/ui/panel";
import { discoverPerson, syncVisiblePeople } from "@/game/archive/discoveries";
import { type ActDefinition, getActDefinition } from "@/game/content/acts";
import {
  type AnomalyDefinition,
  getAnomalyDefinition,
} from "@/game/content/anomalies";
import { type ClueDefinition, getClueDefinition } from "@/game/content/clues";
import {
  type DialogueChoice,
  type DialogueVariant,
  getDialogueDefinition,
} from "@/game/content/dialogues";
import type { InteractionDefinition } from "@/game/content/interactions";
import {
  getKnowledgeDefinition,
  type KnowledgeDefinition,
} from "@/game/content/knowledge";
import {
  CITY_LOCATIONS,
  getLocation,
  getObservableDetails,
} from "@/game/content/locations";
import {
  getPersistenceDefinition,
  type PersistenceDefinition,
} from "@/game/content/persistences";
import {
  getSecretDefinition,
  type SecretDefinition,
} from "@/game/content/secrets";
import { getActiveSubscene } from "@/game/content/subscenes";
import { CITY_EVENTS, reconcileCityState } from "@/game/content/world-events";
import {
  getCurrentAct,
  isActCompleted,
  isV1Complete,
} from "@/game/engine/acts";
import { getLocalDateKey } from "@/game/engine/calendar";
import {
  type ClockAnchor,
  createClockAnchor,
  getElapsedSeconds,
} from "@/game/engine/clock";
import { getDiscoveredClues } from "@/game/engine/clues";
import { advanceCoreLoop, createSaveSnapshot } from "@/game/engine/core-loop";
import { executeDialogueChoice } from "@/game/engine/dialogue-choices";
import { selectDialogueVariant } from "@/game/engine/dialogues";
import {
  executeInteraction,
  getAvailableInteractions,
} from "@/game/engine/interactions";
import { getAcquiredKnowledge } from "@/game/engine/knowledge";
import { navigateToNode } from "@/game/engine/navigation";
import {
  getActivePersistences,
  reconcilePersistences,
} from "@/game/engine/persistences";
import { resetGameLoop } from "@/game/engine/reset";
import { getCharactersAtLocation } from "@/game/engine/routines";
import { localSave } from "@/game/persistence/local-save";
import type { GameState } from "@/game/state/types";

type SessionPhase = "loading" | "missing" | "playing" | "resetting" | "error";

type ActiveDialogue = {
  characterName: string;
  response?: string;
  variant: DialogueVariant;
};

const UI_REFRESH_MS = 500;
const PERIODIC_SNAPSHOT_SECONDS = 5;
const RESET_OVERLAY_MS = 1200;

export function GameplaySession() {
  const { playEffect } = useAudio();
  const [game, setGame] = useState<GameState | null>(null);
  const [phase, setPhase] = useState<SessionPhase>("loading");
  const [notice, setNotice] = useState("");
  const [activeDialogue, setActiveDialogue] = useState<ActiveDialogue | null>(
    null,
  );
  const [knowledgeToast, setKnowledgeToast] =
    useState<KnowledgeDefinition | null>(null);
  const [anomalyToast, setAnomalyToast] = useState<AnomalyDefinition | null>(
    null,
  );
  const [persistenceToast, setPersistenceToast] =
    useState<PersistenceDefinition | null>(null);
  const [secretToast, setSecretToast] = useState<SecretDefinition | null>(null);
  const [clueToast, setClueToast] = useState<ClueDefinition | null>(null);
  const [completedAct, setCompletedAct] = useState<ActDefinition | null>(null);
  const stateRef = useRef<GameState | null>(null);
  const anchorRef = useRef<ClockAnchor | null>(null);
  const phaseRef = useRef<SessionPhase>("loading");
  const resetInProgressRef = useRef(false);
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRemainingRef = useRef<number | null>(null);
  const previousRemainingRef = useRef<number | null>(null);
  const actionInProgressRef = useRef(false);
  const dialogueTriggerRef = useRef<HTMLElement | null>(null);

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
    const resetState = resetGameLoop(
      current,
      new Date().toISOString(),
      getLocalDateKey(),
    );
    anchorRef.current = createClockAnchor(
      resetState.run.remainingSeconds,
      nowMs,
    );
    await persist(resetState, false);
    resetInProgressRef.current = false;
    setActiveDialogue(null);
    setAnomalyToast(null);
    setKnowledgeToast(null);
    setPersistenceToast(null);
    setSecretToast(null);
    setClueToast(null);
    setNotice("Nuovo loop avviato alle 23:55.");
    updatePhase("playing");
  }, [persist, updatePhase]);

  const beginReset = useCallback(
    async (endedState: GameState) => {
      if (resetInProgressRef.current) {
        return;
      }

      resetInProgressRef.current = true;
      playEffect("reset");
      updatePhase("resetting");
      await persist(endedState);
      resetTimeoutRef.current = setTimeout(() => {
        void finishReset();
      }, RESET_OVERLAY_MS);
    },
    [finishReset, persist, playEffect, updatePhase],
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
      const elapsedSecond = 300 - step.state.run.remainingSeconds;
      const discoveredState = syncVisiblePeople(step.state, elapsedSecond);
      const archiveChanged = discoveredState !== step.state;
      anchorRef.current = step.anchor;
      stateRef.current = discoveredState;
      setGame(discoveredState);

      if (actionNotice) {
        setNotice(actionNotice);
      } else if (step.executedEventIds.length > 0) {
        setNotice("Qualcosa è cambiato in città.");
      }

      if (step.ended) {
        await beginReset(discoveredState);
        return;
      }

      const lastSaved = lastSavedRemainingRef.current;
      const shouldSave =
        consumedSeconds > 0 ||
        archiveChanged ||
        step.executedEventIds.length > 0 ||
        lastSaved === null ||
        lastSaved - discoveredState.run.remainingSeconds >=
          PERIODIC_SNAPSHOT_SECONDS;

      if (shouldSave) {
        await persist(discoveredState);
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

        const reconciledGameBase = reconcilePersistences(
          reconcileCityState(savedGame),
        );
        const reconciledGame = syncVisiblePeople(
          reconciledGameBase,
          300 - reconciledGameBase.run.remainingSeconds,
        );
        stateRef.current = reconciledGame;
        previousRemainingRef.current = reconciledGame.run.remainingSeconds;
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

  useEffect(() => {
    if (!game || phase !== "playing") {
      return;
    }

    const previous = previousRemainingRef.current;
    if (previous !== null) {
      const cue = getTimerCue(previous, game.run.remainingSeconds);
      if (cue) {
        playEffect(cue);
      }
    }
    previousRemainingRef.current = game.run.remainingSeconds;
  }, [game, phase, playEffect]);

  useEffect(() => {
    if (!anomalyToast) {
      return;
    }

    const timeoutId = window.setTimeout(() => setAnomalyToast(null), 5_000);

    return () => window.clearTimeout(timeoutId);
  }, [anomalyToast]);

  useEffect(() => {
    if (!knowledgeToast) {
      return;
    }

    const timeoutId = window.setTimeout(() => setKnowledgeToast(null), 5_000);

    return () => window.clearTimeout(timeoutId);
  }, [knowledgeToast]);

  useEffect(() => {
    if (!persistenceToast) {
      return;
    }

    const timeoutId = window.setTimeout(() => setPersistenceToast(null), 5_000);

    return () => window.clearTimeout(timeoutId);
  }, [persistenceToast]);

  useEffect(() => {
    if (!secretToast) {
      return;
    }

    const timeoutId = window.setTimeout(() => setSecretToast(null), 5_000);

    return () => window.clearTimeout(timeoutId);
  }, [secretToast]);

  useEffect(() => {
    if (!clueToast) {
      return;
    }

    const timeoutId = window.setTimeout(() => setClueToast(null), 5_000);

    return () => window.clearTimeout(timeoutId);
  }, [clueToast]);

  async function consumeTime(seconds: number) {
    await applyStep(
      seconds,
      `Azione completata: ${seconds} secondi trascorsi.`,
    );
  }

  async function runExclusiveAction(action: () => Promise<void>) {
    if (actionInProgressRef.current || phaseRef.current !== "playing") {
      return;
    }

    actionInProgressRef.current = true;
    try {
      await action();
    } finally {
      actionInProgressRef.current = false;
    }
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
    setActiveDialogue(null);
    await applyStep(
      navigation.costSeconds,
      `Spostamento completato: ${navigation.costSeconds} secondi trascorsi.`,
    );
  }

  async function performInteraction(interaction: InteractionDefinition) {
    const current = stateRef.current;
    const anchor = anchorRef.current;

    if (!current || !anchor || phaseRef.current !== "playing") {
      return;
    }

    if (interaction.dialogueId) {
      const observedState = interaction.characterId
        ? discoverPerson(current, interaction.characterId)
        : current;
      if (observedState !== current) {
        await persist(observedState);
      }
      const dialogue = getDialogueDefinition(interaction.dialogueId);
      const elapsed = 300 - observedState.run.remainingSeconds;
      const variant = selectDialogueVariant(
        observedState,
        interaction.dialogueId,
        elapsed,
      );

      if (dialogue && variant) {
        setActiveDialogue({ characterName: dialogue.characterName, variant });
        setNotice(interaction.result);
      }
      return;
    }

    const result = executeInteraction(
      current,
      anchor,
      Date.now(),
      CITY_EVENTS,
      interaction.id,
      getLocalDateKey(),
    );

    if (!result.ok) {
      setNotice("Questa possibilità non è più disponibile.");
      return;
    }

    anchorRef.current = result.anchor;
    stateRef.current = result.state;
    setGame(result.state);
    setNotice(result.interaction.result);

    const acquiredId = result.acquiredKnowledgeIds[0];
    const acquired = acquiredId ? getKnowledgeDefinition(acquiredId) : null;
    if (acquired) {
      setKnowledgeToast(acquired);
    }

    const discoveredAnomalyId = result.discoveredAnomalyIds[0];
    const discoveredAnomaly = discoveredAnomalyId
      ? getAnomalyDefinition(discoveredAnomalyId)
      : null;
    if (discoveredAnomaly) {
      setAnomalyToast(discoveredAnomaly);
    }

    const discoveredClueId = result.discoveredClueIds[0];
    const discoveredClue = discoveredClueId
      ? getClueDefinition(discoveredClueId)
      : null;
    if (discoveredClue) {
      setClueToast(discoveredClue);
    }

    const grantedPersistenceId = result.grantedPersistenceIds[0];
    const grantedPersistence = grantedPersistenceId
      ? getPersistenceDefinition(grantedPersistenceId)
      : null;
    if (grantedPersistence) {
      setPersistenceToast(grantedPersistence);
    }

    const discoveredSecretId = result.discoveredSecretIds[0];
    const discoveredSecret = discoveredSecretId
      ? getSecretDefinition(discoveredSecretId)
      : null;
    if (discoveredSecret) {
      setSecretToast(discoveredSecret);
    }

    if (
      result.acquiredKnowledgeIds.length > 0 ||
      result.discoveredAnomalyIds.length > 0 ||
      result.discoveredClueIds.length > 0 ||
      result.grantedPersistenceIds.length > 0 ||
      result.discoveredSecretIds.length > 0
    ) {
      playEffect("discovery");
    }

    if (result.completedActId !== null) {
      setCompletedAct(getActDefinition(result.completedActId) ?? null);
    }

    if (result.ended) {
      await beginReset(result.state);
      return;
    }

    await persist(result.state);
  }

  async function chooseDialogueOption(choice: DialogueChoice) {
    const current = stateRef.current;
    const anchor = anchorRef.current;
    if (!current || !anchor || phaseRef.current !== "playing") {
      return;
    }

    const effects = executeDialogueChoice(
      current,
      anchor,
      Date.now(),
      CITY_EVENTS,
      choice,
      getLocalDateKey(),
    );
    if (!effects.ok) {
      await beginReset(effects.state);
      return;
    }

    anchorRef.current = effects.anchor;
    stateRef.current = effects.state;
    setGame(effects.state);
    const acquiredId = effects.acquiredKnowledgeIds[0];
    const acquired = acquiredId ? getKnowledgeDefinition(acquiredId) : null;
    if (acquired) {
      setKnowledgeToast(acquired);
    }
    const discoveredAnomalyId = effects.discoveredAnomalyIds[0];
    const discoveredAnomaly = discoveredAnomalyId
      ? getAnomalyDefinition(discoveredAnomalyId)
      : null;
    if (discoveredAnomaly) {
      setAnomalyToast(discoveredAnomaly);
    }
    const discoveredClueId = effects.discoveredClueIds[0];
    const discoveredClue = discoveredClueId
      ? getClueDefinition(discoveredClueId)
      : null;
    if (discoveredClue) {
      setClueToast(discoveredClue);
    }
    const grantedPersistenceId = effects.grantedPersistenceIds[0];
    const grantedPersistence = grantedPersistenceId
      ? getPersistenceDefinition(grantedPersistenceId)
      : null;
    if (grantedPersistence) {
      setPersistenceToast(grantedPersistence);
    }

    const discoveredSecretId = effects.discoveredSecretIds[0];
    const discoveredSecret = discoveredSecretId
      ? getSecretDefinition(discoveredSecretId)
      : null;
    if (discoveredSecret) {
      setSecretToast(discoveredSecret);
    }
    if (
      effects.acquiredKnowledgeIds.length > 0 ||
      effects.discoveredAnomalyIds.length > 0 ||
      effects.discoveredClueIds.length > 0 ||
      effects.grantedPersistenceIds.length > 0 ||
      effects.discoveredSecretIds.length > 0
    ) {
      playEffect("discovery");
    }

    if (effects.completedActId !== null) {
      setCompletedAct(getActDefinition(effects.completedActId) ?? null);
    }

    setActiveDialogue((current) =>
      current ? { ...current, response: choice.response } : current,
    );
    setNotice(choice.response);

    if (effects.ended) {
      await beginReset(effects.state);
      return;
    }

    await persist(effects.state);
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
  const activeSubscene = getActiveSubscene(game);
  const currentAct = getCurrentAct(game);
  const currentActIsCompleted = currentAct
    ? isActCompleted(game, currentAct.id)
    : false;
  const storyComplete = isV1Complete(game);
  const elapsedSecond = getElapsedSeconds(
    createClockAnchor(game.run.remainingSeconds, 0),
    0,
  );
  const presentCharacters = currentNode
    ? getCharactersAtLocation(game, currentNode.id, elapsedSecond).filter(
        (character) =>
          !activeSubscene ||
          activeSubscene.visibleCharacterIds.includes(character.id),
      )
    : [];
  const observableDetails =
    currentNode && !activeSubscene
      ? getObservableDetails(game, currentNode)
      : [];
  const isBlackout = game.world.flags.blackout === true;
  const availableInteractions = getAvailableInteractions(
    game,
    elapsedSecond,
    getLocalDateKey(),
  );
  const acquiredKnowledge = getAcquiredKnowledge(game);
  const discoveredClues = getDiscoveredClues(game);
  const activePersistences = getActivePersistences(game);

  return (
    <main className="gameplay" id="main-content">
      <header className="gameplay__header">
        <div>
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-text-muted">
            Atto corrente
          </p>
          <p className="mt-1 font-display text-xl uppercase tracking-[0.12em] text-text-main">
            Atto {game.run.currentActId} · {currentAct?.title}
          </p>
          <p className="gameplay__act-question">{currentAct?.question}</p>
          <p className="gameplay__act-status">
            {storyComplete
              ? "Fine V1"
              : currentActIsCompleted
                ? "Completato oggi · Il prossimo Atto sarà disponibile domani"
                : "In corso"}
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
          className={`gameplay__scene gameplay__scene--${activeSubscene ? "basement" : (currentNode?.scene ?? "square")}`}
          aria-labelledby="scene-title"
        >
          <div className="gameplay__scene-image" aria-hidden="true" />
          <div className="gameplay__scene-copy">
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-accent-red-strong">
              {isBlackout
                ? "Corrente interrotta"
                : (activeSubscene?.atmosphere ?? currentNode?.atmosphere)}
            </p>
            <h1
              className="mt-2 font-display text-3xl uppercase tracking-[0.08em] text-text-main sm:text-4xl"
              id="scene-title"
            >
              {activeSubscene?.title ??
                currentNode?.label ??
                game.run.currentLocationId}
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-text-muted">
              {activeSubscene?.description ?? currentNode?.description}
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

          <ActionGrid
            disabled={phase !== "playing" || Boolean(activeDialogue)}
            interactions={availableInteractions}
            onSelect={(interaction, trigger) => {
              if (interaction.dialogueId) {
                dialogueTriggerRef.current = trigger;
              }
              void runExclusiveAction(() => performInteraction(interaction));
            }}
          />

          {activeDialogue ? (
            <DialogueBox
              characterName={activeDialogue.characterName}
              onChoice={(choice) =>
                void runExclusiveAction(() => chooseDialogueOption(choice))
              }
              onClose={() => setActiveDialogue(null)}
              response={activeDialogue.response}
              returnFocus={dialogueTriggerRef.current}
              variant={activeDialogue.variant}
            />
          ) : null}

          <Journal
            clues={discoveredClues}
            knowledge={acquiredKnowledge}
            persistences={activePersistences}
          />

          <Panel eyebrow="Percorsi" title="Mappa della città">
            <div className="space-y-3 p-4 sm:p-5">
              <CityMap
                currentLocationId={game.run.currentLocationId}
                disabled={
                  phase !== "playing" ||
                  Boolean(activeDialogue) ||
                  Boolean(activeSubscene)
                }
                locations={CITY_LOCATIONS}
                onTravel={(destinationId) =>
                  void runExclusiveAction(() => travel(destinationId))
                }
              />

              <GameButton
                className="mt-4"
                disabled={phase !== "playing" || Boolean(activeDialogue)}
                onClick={() => void runExclusiveAction(() => consumeTime(15))}
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

      {knowledgeToast ? (
        <KnowledgeToast
          knowledge={knowledgeToast}
          onClose={() => setKnowledgeToast(null)}
        />
      ) : null}

      {anomalyToast ? (
        <AnomalyToast
          anomaly={anomalyToast}
          onClose={() => setAnomalyToast(null)}
        />
      ) : null}

      {persistenceToast ? (
        <PersistenceToast
          onClose={() => setPersistenceToast(null)}
          persistence={persistenceToast}
        />
      ) : null}

      {secretToast ? (
        <SecretToast
          onClose={() => setSecretToast(null)}
          secret={secretToast}
        />
      ) : null}

      {clueToast ? (
        <ClueToast clue={clueToast} onClose={() => setClueToast(null)} />
      ) : null}

      {completedAct ? (
        <ActCompleteOverlay
          act={completedAct}
          isV1Complete={storyComplete}
          onContinue={() => setCompletedAct(null)}
        />
      ) : null}
    </main>
  );
}
