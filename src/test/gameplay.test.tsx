import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GameplaySession } from "@/components/game/gameplay-session";
import { localSave } from "@/game/persistence/local-save";
import { createInitialGameState } from "@/game/state/initial-state";

async function flushPromises() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("GameplaySession", () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-16T10:00:00.000Z"));
    await localSave.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("visualizza l'unico clock e applica azioni e navigazione", async () => {
    await localSave.save(createInitialGameState({ id: "guest-test" }));
    render(<GameplaySession />);
    await flushPromises();

    expect(screen.getByText("05:00")).toBeDefined();

    await act(async () => {
      vi.advanceTimersByTime(1_000);
    });
    expect(screen.getByText("04:59")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Aspetta 15 secondi" }));
    await flushPromises();
    expect(screen.getByText("04:44")).toBeDefined();

    fireEvent.click(
      screen.getByRole("button", {
        name: /FarmaciaRaggiungibile · 15s/,
      }),
    );
    await flushPromises();
    expect(screen.getByRole("heading", { name: "Farmacia" })).toBeDefined();
    expect(screen.getByText("04:29")).toBeDefined();
  });

  it("mostra il reset una volta e riparte dal loop successivo", async () => {
    const state = createInitialGameState({ id: "guest-test" });
    await localSave.save({
      ...state,
      run: { ...state.run, remainingSeconds: 2 },
    });
    render(<GameplaySession />);
    await flushPromises();

    await act(async () => {
      vi.advanceTimersByTime(2_000);
      await Promise.resolve();
    });
    expect(screen.getByText("Reset in corso")).toBeDefined();

    await act(async () => {
      vi.advanceTimersByTime(1_200);
      await Promise.resolve();
    });
    expect(screen.getByText("Loop 2")).toBeDefined();
    expect(screen.getByText("05:00")).toBeDefined();
    expect((await localSave.load())?.run.loopNumber).toBe(2);
  });

  it("salva 04:20 in uscita e riparte dallo stesso snapshot al reload", async () => {
    await localSave.save(createInitialGameState({ id: "guest-test" }));
    const firstRender = render(<GameplaySession />);
    await flushPromises();

    await act(async () => {
      vi.advanceTimersByTime(40_000);
    });
    expect(screen.getByText("04:20")).toBeDefined();

    firstRender.unmount();
    await flushPromises();
    expect((await localSave.load())?.run.remainingSeconds).toBe(260);

    render(<GameplaySession />);
    await flushPromises();
    expect(screen.getByText("04:20")).toBeDefined();
  });

  it("salva subito il blackout e aggiorna la scena al secondo 180", async () => {
    const state = createInitialGameState({ id: "guest-test" });
    await localSave.save({
      ...state,
      run: { ...state.run, remainingSeconds: 121 },
    });
    render(<GameplaySession />);
    await flushPromises();

    expect(screen.queryByText("Corrente interrotta")).toBeNull();

    await act(async () => {
      vi.advanceTimersByTime(1_000);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByText("Corrente interrotta")).toBeDefined();
    expect((await localSave.load())?.world.flags.blackout).toBe(true);
  });

  it("acquisisce knowledge con Osserva, aggiorna il Diario e non ripete il toast", async () => {
    const state = createInitialGameState({ id: "guest-test" });
    await localSave.save({
      ...state,
      run: {
        ...state.run,
        currentLocationId: "farmacia",
        remainingSeconds: 180,
      },
    });
    render(<GameplaySession />);
    await flushPromises();

    fireEvent.click(
      screen.getByRole("button", { name: /Osserva ElenaOsserva · 5s/ }),
    );
    await flushPromises();

    expect(screen.getByText("Nuova conoscenza")).toBeDefined();
    expect((await localSave.load())?.progression.knowledge).toEqual([
      "elena_enters_pharmacy_2357",
    ]);

    fireEvent.click(screen.getByText("Diario"));
    expect(
      screen.getAllByText("Elena entra in farmacia alle 23:57").length,
    ).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Chiudi notifica" }));
    fireEvent.click(
      screen.getByRole("button", { name: /Osserva ElenaOsserva · 5s/ }),
    );
    await flushPromises();

    expect(screen.queryByText("Nuova conoscenza")).toBeNull();
  });

  it("mostra il dialogo cross-loop e ne applica il costo senza completare l'Atto", async () => {
    const state = createInitialGameState({ id: "guest-test" });
    await localSave.save({
      ...state,
      progression: {
        ...state.progression,
        knowledge: ["elena_enters_pharmacy_2357"],
      },
      run: { ...state.run, currentLocationId: "farmacia" },
    });
    render(<GameplaySession />);
    await flushPromises();

    fireEvent.click(
      screen.getByRole("button", {
        name: /Parla con il FarmacistaParla/,
      }),
    );
    expect(screen.getByRole("dialog")).toBeDefined();
    expect(
      screen.getByRole("button", {
        name: /Chiedere di Elena e delle 23:57Parla · 10s/,
      }),
    ).toBeDefined();

    fireEvent.click(
      screen.getByRole("button", {
        name: /Chiedere di Elena e delle 23:57Parla · 10s/,
      }),
    );
    await flushPromises();

    expect(screen.getByText("04:50")).toBeDefined();
    expect(
      screen.getAllByText(/Non significa che sappia perché/).length,
    ).toBeGreaterThan(0);
    expect((await localSave.load())?.run.currentActId).toBe(1);
    expect((await localSave.load())?.progression.completedActs).toEqual([]);
  });

  it("scopre un indizio con Esplora e rende disponibile Usa", async () => {
    const state = createInitialGameState({ id: "guest-test" });
    await localSave.save({
      ...state,
      run: { ...state.run, currentLocationId: "farmacia" },
    });
    render(<GameplaySession />);
    await flushPromises();

    expect(screen.queryByText("Usa il campanello")).toBeNull();
    fireEvent.click(
      screen.getByRole("button", {
        name: /Esplora la farmaciaEsplora · 8s/,
      }),
    );
    await flushPromises();

    expect(screen.getByText("Usa il campanello")).toBeDefined();
    fireEvent.click(screen.getByText("Diario"));
    expect(screen.getByText("Impronte nella farmacia")).toBeDefined();
    expect((await localSave.load())?.progression.discoveredClues).toEqual([
      "pharmacy_wet_footprints",
    ]);
  });
});
