"use client";

import { useEffect, useState } from "react";
import { GameButton } from "@/components/ui/game-button";
import { Icon } from "@/components/ui/icon";
import { Panel } from "@/components/ui/panel";
import { localSave } from "@/game/persistence/local-save";
import type { GameState } from "@/game/state/types";

type PlayLoadState =
  | { status: "loading" }
  | { game: GameState | null; status: "ready" };

export function PlayReady() {
  const [loadState, setLoadState] = useState<PlayLoadState>({
    status: "loading",
  });

  useEffect(() => {
    let active = true;

    localSave.load().then((game) => {
      if (active) {
        setLoadState({ game, status: "ready" });
      }
    });

    return () => {
      active = false;
    };
  }, []);

  const game = loadState.status === "ready" ? loadState.game : null;

  return (
    <Panel className="w-full max-w-2xl">
      <div className="px-6 py-8 sm:px-10 sm:py-12">
        <Icon className="text-accent-red-strong" name="play" size={28} />
        <p className="mt-6 font-mono text-xs uppercase tracking-[0.22em] text-text-muted">
          {game
            ? `Atto ${game.run.currentActId} · Loop ${game.run.loopNumber}`
            : "Stato partita"}
        </p>
        <h1 className="mt-3 font-display text-3xl uppercase tracking-[0.1em] text-text-main sm:text-4xl">
          {loadState.status === "loading"
            ? "Caricamento"
            : game
              ? "Partita pronta"
              : "Nessuna partita"}
        </h1>
        <p className="mt-5 max-w-lg text-sm leading-6 text-text-muted sm:text-base sm:leading-7">
          {game
            ? "Il salvataggio guest è attivo. Il primo loop giocabile verrà introdotto nella Milestone 3; nessun timer è in esecuzione."
            : "Crea una nuova partita dal menu principale per iniziare l'introduzione."}
        </p>
        <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
          <div className="border border-border-subtle bg-bg-main/50 p-4">
            <dt className="text-text-muted">Posizione iniziale</dt>
            <dd className="mt-1 capitalize text-text-main">
              {game?.run.currentLocationId ?? "—"}
            </dd>
          </div>
          <div className="border border-border-subtle bg-bg-main/50 p-4">
            <dt className="text-text-muted">Finestra disponibile</dt>
            <dd className="mt-1 text-text-main">
              {game ? "5:00 (non avviata)" : "—"}
            </dd>
          </div>
        </dl>
        <GameButton
          className="mt-8 sm:w-auto"
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
