"use client";

import { useEffect, useState } from "react";
import { PersistenceList } from "@/components/game/persistence-list";
import { AppShell } from "@/components/ui/app-shell";
import { GameButton } from "@/components/ui/game-button";
import { Panel } from "@/components/ui/panel";
import {
  type ActivePersistence,
  getActivePersistences,
  reconcilePersistences,
} from "@/game/engine/persistences";
import { localSave } from "@/game/persistence/local-save";

export function PersistenceArchive() {
  const [persistences, setPersistences] = useState<ActivePersistence[] | null>(
    null,
  );

  useEffect(() => {
    let active = true;

    localSave.load().then((savedGame) => {
      if (!active) {
        return;
      }

      if (!savedGame) {
        setPersistences([]);
        return;
      }

      const reconciled = reconcilePersistences(savedGame);
      setPersistences(getActivePersistences(reconciled));
      if (reconciled !== savedGame) {
        void localSave.save(reconciled);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  return (
    <AppShell>
      <main
        className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8"
        id="main-content"
      >
        <Panel
          className="w-full max-w-2xl"
          eyebrow="Tracce tra i loop"
          title="Archivio"
        >
          <div className="archive-persistences">
            <p className="archive-persistences__intro">
              Qui compaiono solo le alterazioni che il reset non ha cancellato.
              Conoscenze e indizi restano nel Diario.
            </p>
            {persistences === null ? (
              <p className="persistence-list__empty">Lettura del loop…</p>
            ) : (
              <PersistenceList persistences={persistences} />
            )}
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
      </main>
    </AppShell>
  );
}
