"use client";

import { useEffect, useState } from "react";
import { ArchiveTabs } from "@/components/archive/archive-tabs";
import { AppShell } from "@/components/ui/app-shell";
import { GameButton } from "@/components/ui/game-button";
import { Panel } from "@/components/ui/panel";
import {
  type ArchiveViewModel,
  createArchiveViewModel,
} from "@/game/archive/view-model";
import { localSave } from "@/game/persistence/local-save";

export function ArchiveDossier() {
  const [archive, setArchive] = useState<ArchiveViewModel | null>(null);

  useEffect(() => {
    let active = true;

    localSave.load().then((savedGame) => {
      if (active) {
        setArchive(createArchiveViewModel(savedGame));
      }
    });

    return () => {
      active = false;
    };
  }, []);

  return (
    <AppShell>
      <main className="archive-page" id="main-content">
        <Panel
          className="archive-dossier"
          eyebrow="Dossier investigativo"
          title="Archivio"
        >
          <div className="archive-dossier__body">
            <p className="archive-dossier__intro">
              Il dossier raccoglie soltanto ciò che hai osservato. Nessuna
              ipotesi viene registrata come fatto.
            </p>

            {archive === null ? (
              <output className="archive-empty">Lettura del dossier…</output>
            ) : (
              <ArchiveTabs archive={archive} />
            )}

            <nav aria-label="Navigazione Archivio" className="archive-actions">
              <GameButton href="/" icon="arrow-left" variant="quiet">
                Torna al menu
              </GameButton>
              {archive?.hasGame ? (
                <GameButton href="/gioca" variant="secondary">
                  Torna al gioco
                </GameButton>
              ) : null}
            </nav>
          </div>
        </Panel>
      </main>
    </AppShell>
  );
}
