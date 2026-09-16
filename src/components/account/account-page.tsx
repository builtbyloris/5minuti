"use client";

import { useAccount } from "@/auth/auth-context";
import { ProfileBadge } from "@/components/account/profile-badge";
import { SyncConflictDialog } from "@/components/account/sync-conflict-dialog";
import { AppShell } from "@/components/ui/app-shell";
import { GameButton } from "@/components/ui/game-button";
import { Panel } from "@/components/ui/panel";

function formatLastSync(value: string | null) {
  return value ? new Date(value).toLocaleString("it-IT") : "Non disponibile";
}

export function AccountPage({ authResult }: { authResult: string | null }) {
  const {
    authConfigured,
    authError,
    authLoading,
    resolveConflict,
    signInWithGoogle,
    signOut,
    syncNow,
    syncState,
    user,
  } = useAccount();

  return (
    <AppShell>
      <main className="account-page" id="main-content">
        <Panel className="account-panel" eyebrow="Profilo" title="Account">
          <div className="account-panel__body">
            <ProfileBadge />

            {authLoading ? (
              <p className="account-copy">Verifica della sessione…</p>
            ) : user ? (
              <section aria-labelledby="account-session-title">
                <h2 id="account-session-title">
                  {user.displayName ?? "Account sincronizzato"}
                </h2>
                {user.email ? (
                  <p className="account-email">{user.email}</p>
                ) : null}
                <dl className="account-status">
                  <div>
                    <dt>Stato</dt>
                    <dd>{syncState.message}</dd>
                  </div>
                  <div>
                    <dt>Ultima sincronizzazione</dt>
                    <dd>{formatLastSync(syncState.lastSyncedAt)}</dd>
                  </div>
                </dl>
                <div className="account-actions">
                  <GameButton
                    disabled={syncState.status === "syncing"}
                    onClick={() => void syncNow()}
                  >
                    Sincronizza ora
                  </GameButton>
                  <GameButton onClick={() => void signOut()} variant="quiet">
                    Esci dall’account
                  </GameButton>
                </div>
              </section>
            ) : (
              <section aria-labelledby="guest-session-title">
                <h2 id="guest-session-title">Stai giocando come ospite</h2>
                <p className="account-copy">
                  I progressi sono salvati su questo dispositivo. L’account è
                  facoltativo e serve soltanto per sincronizzarli.
                </p>
                <GameButton
                  className="mt-6 sm:w-auto"
                  disabled={!authConfigured}
                  icon="login"
                  onClick={() => void signInWithGoogle()}
                  variant="primary"
                >
                  Accedi con Google
                </GameButton>
                {!authConfigured ? (
                  <p className="account-configuration-note">
                    Sincronizzazione cloud non configurata. La modalità ospite
                    resta completamente disponibile.
                  </p>
                ) : null}
              </section>
            )}

            <p aria-live="polite" className="account-message">
              {authError ?? authResult ?? syncState.message}
            </p>

            <nav
              aria-label="Navigazione account"
              className="account-navigation"
            >
              <GameButton href="/" icon="arrow-left" variant="quiet">
                Torna al menu
              </GameButton>
              <GameButton href="/gioca" variant="secondary">
                Torna al gioco
              </GameButton>
            </nav>
          </div>
        </Panel>
      </main>

      {syncState.conflict ? (
        <SyncConflictDialog
          conflict={syncState.conflict}
          onResolve={(resolution) => void resolveConflict(resolution)}
        />
      ) : null}
    </AppShell>
  );
}
