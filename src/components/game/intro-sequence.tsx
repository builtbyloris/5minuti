"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { GameButton } from "@/components/ui/game-button";
import { INTRO_SCENES } from "@/game/content/intro";
import { localSave } from "@/game/persistence/local-save";
import { completeIntroduction } from "@/game/state/transitions";

type IntroSequenceProps = {
  mode: "first-run" | "replay";
};

export function IntroSequence({ mode }: IntroSequenceProps) {
  const router = useRouter();
  const [sceneIndex, setSceneIndex] = useState(0);
  const [isLeaving, setIsLeaving] = useState(false);
  const [error, setError] = useState("");
  const scene = INTRO_SCENES[sceneIndex];
  const isLastScene = sceneIndex === INTRO_SCENES.length - 1;

  async function leaveIntroduction() {
    if (isLeaving) {
      return;
    }

    setIsLeaving(true);
    setError("");

    if (mode === "replay") {
      router.push("/");
      return;
    }

    try {
      const game = await localSave.load();

      if (!game) {
        setError("Il salvataggio della partita non è più disponibile.");
        setIsLeaving(false);
        return;
      }

      await localSave.save(completeIntroduction(game));
      router.push("/gioca");
    } catch {
      setError("Non è stato possibile aggiornare il salvataggio.");
      setIsLeaving(false);
    }
  }

  function advance() {
    if (isLastScene) {
      void leaveIntroduction();
      return;
    }

    setSceneIndex((current) => current + 1);
  }

  return (
    <main className="intro" id="main-content">
      <div className="intro__topbar">
        <p className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-text-muted">
          {mode === "first-run" ? "Prima visione" : "Replay volontario"}
        </p>
        <button
          className="min-h-11 px-3 font-mono text-xs uppercase tracking-[0.16em] text-text-main transition-colors hover:text-accent-red-strong focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent-red-strong disabled:text-text-muted"
          disabled={isLeaving}
          onClick={() => void leaveIntroduction()}
          type="button"
        >
          Salta introduzione
        </button>
      </div>

      <section
        aria-labelledby="intro-scene-title"
        aria-live="polite"
        className={`intro__scene intro__scene--${scene.tone}`}
        key={scene.id}
      >
        <div aria-hidden="true" className="intro__image">
          <span className="intro__location">{scene.location}</span>
        </div>

        <div className="intro__copy">
          <div className="flex items-baseline justify-between gap-4">
            <time
              className="font-mono text-3xl font-semibold tracking-[-0.04em] text-accent-red-strong sm:text-4xl"
              dateTime={scene.time}
            >
              {scene.time}
            </time>
            <span className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-text-muted">
              {sceneIndex + 1} / {INTRO_SCENES.length}
            </span>
          </div>

          <p className="mt-6 font-mono text-[0.65rem] uppercase tracking-[0.22em] text-accent-red-strong">
            {scene.label}
          </p>
          <h1
            className="mt-3 max-w-3xl font-display text-3xl uppercase leading-tight tracking-[0.06em] text-text-main sm:text-5xl"
            id="intro-scene-title"
          >
            {scene.title}
          </h1>
          <div className="mt-5 max-w-2xl space-y-3 text-base leading-7 text-text-muted sm:text-lg sm:leading-8">
            {scene.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <GameButton
              className="sm:w-auto sm:min-w-56"
              disabled={isLeaving}
              onClick={advance}
              variant="primary"
            >
              {isLastScene
                ? mode === "first-run"
                  ? "Entra nel loop"
                  : "Termina replay"
                : "Continua"}
            </GameButton>
            {sceneIndex > 0 ? (
              <GameButton
                className="sm:w-auto"
                disabled={isLeaving}
                onClick={() => setSceneIndex((current) => current - 1)}
                variant="quiet"
              >
                Scena precedente
              </GameButton>
            ) : null}
          </div>
          <p
            aria-live="assertive"
            className="mt-4 min-h-5 text-sm text-accent-red-strong"
          >
            {error}
          </p>
        </div>
      </section>
    </main>
  );
}
