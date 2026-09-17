import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GameEntryMenu } from "@/components/game/game-entry-menu";
import { IntroSequence } from "@/components/game/intro-sequence";
import { SaveResetPanel } from "@/components/game/save-reset-panel";
import { localSave } from "@/game/persistence/local-save";
import { createInitialGameState } from "@/game/state/initial-state";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

beforeEach(async () => {
  push.mockClear();
  await localSave.clear();
});

describe("flusso Nuova partita / Continua", () => {
  it("mostra Nuova partita senza save e crea lo stato prima dell'intro", async () => {
    render(<GameEntryMenu />);

    const newGame = await screen.findByRole("button", {
      name: "Nuova partita",
    });
    fireEvent.click(newGame);

    await waitFor(() => expect(push).toHaveBeenCalledWith("/storia?mode=new"));
    expect((await localSave.load())?.metadata.introduction.status).toBe(
      "pending",
    );
  });

  it("mostra Continua con save valido e riprende l'intro incompleta", async () => {
    await localSave.save(createInitialGameState({ id: "guest-test" }));
    render(<GameEntryMenu />);

    const continueGame = await screen.findByRole("button", {
      name: "Continua",
    });
    fireEvent.click(continueGame);

    expect(push).toHaveBeenCalledWith("/storia?mode=new");
  });
});

describe("introduzione", () => {
  it("lo skip della prima visione completa l'intro e porta a gioca", async () => {
    await localSave.save(createInitialGameState({ id: "guest-test" }));
    render(<IntroSequence mode="first-run" />);

    fireEvent.click(screen.getByRole("button", { name: "Salta introduzione" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/gioca"));
    expect((await localSave.load())?.metadata.introduction.status).toBe(
      "completed",
    );
  });

  it("il replay non crea o modifica il salvataggio", async () => {
    const state = createInitialGameState({ id: "guest-test" });
    await localSave.save(state);
    const serializedBefore = JSON.stringify(await localSave.load());
    render(<IntroSequence mode="replay" />);

    fireEvent.click(screen.getByRole("button", { name: "Salta introduzione" }));

    expect(push).toHaveBeenCalledWith("/");
    expect(JSON.stringify(await localSave.load())).toBe(serializedBefore);
  });

  it("mostra caption accessibili senza dipendere dall'audio", () => {
    render(<IntroSequence mode="replay" />);

    expect(screen.getByText("[Pioggia sulla città.]")).toBeDefined();
  });
});

describe("reset save", () => {
  it("espone controlli audio e reduced motion accessibili", () => {
    render(<SaveResetPanel />);

    expect(screen.getByRole("slider", { name: /Atmosfera/ })).toBeDefined();
    expect(screen.getByRole("slider", { name: /Effetti/ })).toBeDefined();
    expect(
      screen.getByRole("checkbox", {
        name: /Riduci movimento ed effetti/,
      }),
    ).toBeDefined();
  });

  it("richiede due conferme prima di cancellare il progresso", async () => {
    await localSave.save(createInitialGameState({ id: "guest-test" }));
    render(<SaveResetPanel />);

    let resetButton = await screen.findByRole("button", {
      name: "Resetta salvataggio",
    });
    fireEvent.click(resetButton);
    expect(await localSave.load()).not.toBeNull();

    const firstConfirmation = screen.getByRole("button", {
      name: "Prima conferma",
    });
    expect(document.activeElement).toBe(firstConfirmation);
    fireEvent.keyDown(firstConfirmation, { key: "Escape" });
    resetButton = screen.getByRole("button", { name: "Resetta salvataggio" });
    expect(document.activeElement).toBe(resetButton);

    fireEvent.click(resetButton);
    fireEvent.click(screen.getByRole("button", { name: "Prima conferma" }));
    expect(await localSave.load()).not.toBeNull();

    const finalConfirmation = screen.getByRole("button", {
      name: "Cancella definitivamente",
    });
    expect(document.activeElement).toBe(finalConfirmation);
    fireEvent.click(finalConfirmation);
    fireEvent.click(finalConfirmation);

    await waitFor(async () => expect(await localSave.load()).toBeNull());
    expect(screen.getByText(/La home mostrerà Nuova partita/)).toBeDefined();
  });
});
