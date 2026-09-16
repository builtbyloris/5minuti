import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import type { AuthAdapter } from "@/auth/auth-adapter";
import { AccountProvider } from "@/auth/auth-context";
import type { AuthSession, AuthStateListener } from "@/auth/types";
import { AccountPage } from "@/components/account/account-page";
import { ProfileBadge } from "@/components/account/profile-badge";
import { SyncConflictDialog } from "@/components/account/sync-conflict-dialog";
import { localSave } from "@/game/persistence/local-save";
import { createInitialGameState } from "@/game/state/initial-state";

class FakeAuthAdapter implements AuthAdapter {
  listener: AuthStateListener | null = null;
  signInFails = false;
  session: AuthSession | null;

  constructor(
    readonly configured: boolean,
    session: AuthSession | null = null,
  ) {
    this.session = session;
  }

  async getSession() {
    return this.session;
  }

  onAuthStateChange(listener: AuthStateListener) {
    this.listener = listener;
    return () => {
      this.listener = null;
    };
  }

  async signInWithGoogle() {
    if (this.signInFails) {
      throw new Error("oauth error");
    }
  }

  async signOut() {
    this.session = null;
    this.listener?.(null);
  }

  expire() {
    this.session = null;
    this.listener?.(null);
  }
}

const accountSession: AuthSession = {
  user: {
    avatarUrl: null,
    displayName: "Loris",
    email: "loris@example.test",
    id: "user-1",
  },
};

beforeEach(async () => {
  await localSave.clear();
});

describe("account UI", () => {
  it("resta guest-safe quando Supabase non è configurato", async () => {
    render(
      <AccountProvider adapter={new FakeAuthAdapter(false)}>
        <AccountPage authResult={null} />
      </AccountProvider>,
    );

    expect(await screen.findByText("Stai giocando come ospite")).toBeDefined();
    expect(screen.getByText(/cloud non configurata/i)).toBeDefined();
    expect(
      screen
        .getByRole("button", { name: "Accedi con Google" })
        .hasAttribute("disabled"),
    ).toBe(true);
  });

  it("mostra ProfileBadge guest e account con stato leggibile", async () => {
    const guest = render(
      <AccountProvider adapter={new FakeAuthAdapter(false)}>
        <ProfileBadge />
      </AccountProvider>,
    );
    expect(await screen.findByText("Ospite")).toBeDefined();
    guest.unmount();

    render(
      <AccountProvider adapter={new FakeAuthAdapter(true, accountSession)}>
        <ProfileBadge />
      </AccountProvider>,
    );
    expect(await screen.findByText("Loris")).toBeDefined();
    expect(await screen.findByText(/cloud non disponibile/i)).toBeDefined();
  });

  it("gestisce errore auth e session expiry senza bloccare la modalità guest", async () => {
    const adapter = new FakeAuthAdapter(true);
    adapter.signInFails = true;
    render(
      <AccountProvider adapter={adapter}>
        <AccountPage authResult={null} />
      </AccountProvider>,
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Accedi con Google" }),
    );
    expect(
      await screen.findByText(/Non è stato possibile avviare l'accesso Google/),
    ).toBeDefined();

    adapter.session = accountSession;
    adapter.listener?.(accountSession);
    expect(await screen.findByText("loris@example.test")).toBeDefined();
    adapter.expire();
    expect(await screen.findByText("Stai giocando come ospite")).toBeDefined();
  });

  it("logout non cancella il salvataggio locale", async () => {
    const saved = createInitialGameState({ id: "guest-kept" });
    await localSave.save(saved);
    const adapter = new FakeAuthAdapter(true, accountSession);
    render(
      <AccountProvider adapter={adapter}>
        <AccountPage authResult={null} />
      </AccountProvider>,
    );

    fireEvent.click(
      await screen.findByRole("button", { name: "Esci dall’account" }),
    );
    await waitFor(() =>
      expect(screen.getByText("Stai giocando come ospite")).toBeDefined(),
    );
    expect(await localSave.load()).toEqual(saved);
  });

  it("gestisce focus e conferma prima delle scelte distruttive", () => {
    const local = createInitialGameState({ id: "local" });
    const remote = createInitialGameState({ id: "remote" });
    render(
      <SyncConflictDialog
        conflict={{
          local,
          remote: {
            gameState: remote,
            revision: 2,
            schemaVersion: 4,
            updatedAt: "2026-09-16T12:00:00.000Z",
          },
        }}
        onResolve={() => undefined}
      />,
    );

    const merge = screen.getByRole("button", { name: "Unisci progressi" });
    expect(document.activeElement).toBe(merge);
    fireEvent.click(
      screen.getByRole("button", { name: "Usa progressi cloud" }),
    );
    expect(
      screen.getByRole("button", { name: "Conferma sostituzione" }),
    ).toBeDefined();
  });
});
