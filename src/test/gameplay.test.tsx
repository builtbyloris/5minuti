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
});
