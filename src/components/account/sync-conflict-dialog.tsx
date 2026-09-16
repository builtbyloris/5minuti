"use client";

import { useState } from "react";
import { GameButton } from "@/components/ui/game-button";
import type { ConflictResolution, SyncConflict } from "@/game/sync/types";

function summary(state: SyncConflict["local"]) {
  return {
    act: Math.min(
      3,
      Math.max(state.run.currentActId, state.progression.completedActs.length),
    ),
    loop: state.run.loopNumber,
    updatedAt: new Date(state.metadata.updatedAt).toLocaleString("it-IT"),
  };
}

export function SyncConflictDialog({
  conflict,
  onResolve,
}: {
  conflict: SyncConflict;
  onResolve(resolution: ConflictResolution): void;
}) {
  const [confirmation, setConfirmation] = useState<"cloud" | "local" | null>(
    null,
  );
  const local = summary(conflict.local);
  const cloud = summary(conflict.remote.gameState);

  return (
    <div
      aria-labelledby="sync-conflict-title"
      aria-modal="true"
      className="sync-conflict"
      role="dialog"
    >
      <div className="sync-conflict__panel">
        <p className="sync-conflict__eyebrow">Conflitto di sincronizzazione</p>
        <h2 id="sync-conflict-title">Scegli quali progressi conservare</h2>
        <p>
          L’unione combina le scoperte. Stato del loop e persistenze provengono
          invece da una sola sessione coerente.
        </p>
        <div className="sync-conflict__comparison">
          <section aria-label="Progressi di questo dispositivo">
            <h3>Questo dispositivo</h3>
            <p>Atto raggiunto: {local.act}</p>
            <p>Loop: {local.loop}</p>
            <small>Modificato: {local.updatedAt}</small>
          </section>
          <section aria-label="Progressi cloud">
            <h3>Cloud</h3>
            <p>Atto raggiunto: {cloud.act}</p>
            <p>Loop: {cloud.loop}</p>
            <small>
              Sincronizzato:{" "}
              {new Date(conflict.remote.updatedAt).toLocaleString("it-IT")}
            </small>
          </section>
        </div>

        {confirmation ? (
          <div className="sync-conflict__confirmation">
            <p>
              {confirmation === "cloud"
                ? "I progressi cloud sostituiranno quelli presenti su questo dispositivo."
                : "I progressi di questo dispositivo sostituiranno la copia cloud."}
            </p>
            <div>
              <GameButton
                onClick={() => onResolve(confirmation)}
                variant="primary"
              >
                Conferma sostituzione
              </GameButton>
              <GameButton onClick={() => setConfirmation(null)} variant="quiet">
                Annulla
              </GameButton>
            </div>
          </div>
        ) : (
          <div className="sync-conflict__actions">
            <GameButton
              autoFocus
              onClick={() => onResolve("merge")}
              variant="primary"
            >
              Unisci progressi
            </GameButton>
            <GameButton onClick={() => setConfirmation("local")}>
              Mantieni questo dispositivo
            </GameButton>
            <GameButton onClick={() => setConfirmation("cloud")}>
              Usa progressi cloud
            </GameButton>
          </div>
        )}
      </div>
    </div>
  );
}
