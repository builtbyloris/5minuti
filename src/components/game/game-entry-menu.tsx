"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MainMenu } from "@/components/game/main-menu";
import { localSave } from "@/game/persistence/local-save";
import { createInitialGameState } from "@/game/state/initial-state";
import { hasCompletedIntroduction } from "@/game/state/selectors";
import type { GameState } from "@/game/state/types";

type LoadState =
  | { status: "loading" }
  | { game: GameState | null; status: "ready" }
  | { message: string; status: "error" };

export function GameEntryMenu() {
  const router = useRouter();
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    let active = true;

    localSave
      .load()
      .then((game) => {
        if (active) {
          setLoadState({ game, status: "ready" });
        }
      })
      .catch(() => {
        if (active) {
          setLoadState({
            message: "Non è stato possibile leggere il salvataggio locale.",
            status: "error",
          });
        }
      });

    return () => {
      active = false;
    };
  }, []);

  async function handlePrimaryAction() {
    if (loadState.status !== "ready" || isStarting) {
      return;
    }

    setIsStarting(true);

    try {
      if (loadState.game) {
        router.push(
          hasCompletedIntroduction(loadState.game)
            ? "/gioca"
            : "/storia?mode=new",
        );
        return;
      }

      const game = createInitialGameState();
      await localSave.save(game);
      router.push("/storia?mode=new");
    } catch {
      setLoadState({
        message: "Il browser non consente di creare il salvataggio locale.",
        status: "error",
      });
      setIsStarting(false);
    }
  }

  const isLoading = loadState.status === "loading";
  const hasSave = loadState.status === "ready" && Boolean(loadState.game);

  return (
    <>
      <MainMenu
        onPrimaryAction={handlePrimaryAction}
        primaryAction={hasSave ? "continue" : "new"}
        primaryDisabled={
          isLoading || isStarting || loadState.status === "error"
        }
        primaryLabel={
          isLoading
            ? "Verifica salvataggio"
            : isStarting
              ? "Preparazione"
              : undefined
        }
      />
      <p
        aria-live="polite"
        className="mt-3 min-h-5 text-center text-xs text-text-muted"
      >
        {loadState.status === "error" ? loadState.message : ""}
      </p>
    </>
  );
}
