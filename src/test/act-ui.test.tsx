import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ActCompleteOverlay } from "@/components/game/act-complete-overlay";
import { GameplaySession } from "@/components/game/gameplay-session";
import { SecretToast } from "@/components/game/secret-toast";
import { getActDefinition } from "@/game/content/acts";
import { getSecretDefinition } from "@/game/content/secrets";
import { localSave } from "@/game/persistence/local-save";
import { createInitialGameState } from "@/game/state/initial-state";

async function flushPromises() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("UI Atti e segreti", () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 16, 23, 0));
    await localSave.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("mostra overlay accessibile senza rivelare il puzzle successivo", () => {
    const actDefinition = getActDefinition(1);
    if (!actDefinition) {
      throw new Error("Atto 1 mancante");
    }
    const onContinue = vi.fn();
    render(
      <ActCompleteOverlay
        act={actDefinition}
        isV1Complete={false}
        onContinue={onContinue}
      />,
    );

    expect(screen.getByRole("dialog", { name: /Atto 1/ })).toBeDefined();
    expect(screen.getByText("Atto completato")).toBeDefined();
    expect(screen.queryByText("Cosa sta cercando Elena?")).toBeNull();
    const continueButton = screen.getByRole("button", {
      name: "Continua a esplorare",
    });
    expect(document.activeElement).toBe(continueButton);
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(continueButton);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onContinue).toHaveBeenCalledOnce();
    fireEvent.click(continueButton);
    expect(onContinue).toHaveBeenCalledTimes(2);
  });

  it("annuncia un segreto senza mostrare alcun totale", () => {
    const secret = getSecretDefinition("pharmacy_blank_receipt");
    if (!secret) {
      throw new Error("Segreto mancante");
    }
    render(<SecretToast onClose={() => undefined} secret={secret} />);

    expect(screen.getByText("Segreto scoperto")).toBeDefined();
    expect(screen.queryByText(/1\s*\/\s*3/)).toBeNull();
    expect(screen.queryByText(/3 segreti/)).toBeNull();
  });

  it("mostra domanda senza checklist e completa l'Atto alla mezzanotte", async () => {
    const state = createInitialGameState({ id: "guest-act-ui" });
    await localSave.save({
      ...state,
      progression: {
        ...state.progression,
        discoveredClues: ["pharmacy_wet_footprints"],
        knowledge: ["elena_enters_pharmacy_2357"],
      },
      run: {
        ...state.run,
        currentLocationId: "farmacia",
        remainingSeconds: 12,
      },
    });

    render(<GameplaySession />);
    await flushPromises();

    expect(
      screen.getByText("Perché Elena entra nella farmacia alle 23:57?"),
    ).toBeDefined();
    expect(screen.queryByText(/\d\s*\/\s*3/)).toBeNull();

    fireEvent.click(
      screen.getByRole("button", {
        name: /Indaga la zona privataEsplora · 12s/,
      }),
    );
    await flushPromises();

    expect(screen.getByText("Atto completato")).toBeDefined();
    expect(
      (await localSave.load("2026-09-16"))?.progression.completedActs,
    ).toEqual([1]);
  });
});
