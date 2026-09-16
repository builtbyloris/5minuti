import { describe, expect, it } from "vitest";
import {
  clampRemainingSeconds,
  consumeClockTime,
  createClockAnchor,
  formatCountdown,
  formatNarrativeTime,
  getElapsedSeconds,
  getRemainingSeconds,
  hasLoopEnded,
} from "@/game/engine/clock";
import { advanceCoreLoop } from "@/game/engine/core-loop";
import { type LocationNode, navigateToNode } from "@/game/engine/navigation";
import { resetGameLoop } from "@/game/engine/reset";
import {
  processScheduledEvents,
  type ScheduledEvent,
} from "@/game/engine/scheduler";
import { validateGameState } from "@/game/persistence/save-schema";
import { createInitialGameState } from "@/game/state/initial-state";

describe("GameClock", () => {
  it.each([
    [300, "23:55:00"],
    [240, "23:56:00"],
    [180, "23:57:00"],
    [120, "23:58:00"],
    [60, "23:59:00"],
    [0, "00:00:00"],
  ])("converte %i secondi in %s", (remaining, expected) => {
    expect(formatNarrativeTime(remaining)).toBe(expected);
  });

  it("deriva il tempo dal timestamp senza accumulare drift tra letture", () => {
    const anchor = createClockAnchor(300, 1_000);

    expect(getRemainingSeconds(anchor, 11_000)).toBe(290);
    expect(getRemainingSeconds(anchor, 61_000)).toBe(240);
    expect(getElapsedSeconds(anchor, 61_000)).toBe(60);
  });

  it("clampa il clock e formatta il countdown", () => {
    expect(clampRemainingSeconds(999)).toBe(300);
    expect(clampRemainingSeconds(-7)).toBe(0);
    expect(formatCountdown(300)).toBe("05:00");
    expect(formatCountdown(0)).toBe("00:00");
    expect(hasLoopEnded(0)).toBe(true);
  });

  it("applica costi temporali senza produrre valori negativi", () => {
    const anchor = createClockAnchor(8, 0);
    const consumed = consumeClockTime(anchor, 15);

    expect(getRemainingSeconds(consumed, 0)).toBe(0);
    expect(hasLoopEnded(getRemainingSeconds(consumed, 0))).toBe(true);
  });

  it("riparte da uno snapshot dopo reload senza tornare a 05:00", () => {
    const beforeReload = createClockAnchor(260, 10_000);
    const snapshot = getRemainingSeconds(beforeReload, 20_000);
    const afterReload = createClockAnchor(snapshot, 50_000);

    expect(snapshot).toBe(250);
    expect(getRemainingSeconds(afterReload, 50_000)).toBe(250);
    expect(getRemainingSeconds(afterReload, 60_000)).toBe(240);
  });
});

describe("Event Scheduler", () => {
  const events: ScheduledEvent[] = [
    {
      atElapsedSecond: 60,
      effects: [{ key: "event:a", type: "set-run-flag", value: true }],
      id: "a",
    },
    {
      atElapsedSecond: 62,
      effects: [{ key: "event:b", type: "set-run-flag", value: true }],
      id: "b",
    },
    {
      atElapsedSecond: 62,
      effects: [{ key: "event:c", type: "set-run-flag", value: true }],
      id: "c",
    },
  ];

  it("esegue un evento al secondo esatto", () => {
    const state = createInitialGameState({ id: "guest-test" });
    const result = processScheduledEvents(state, events, 59, 60);

    expect(result.executedEventIds).toEqual(["a"]);
    expect(result.state.run.runFlags["event:a"]).toBe(true);
  });

  it("recupera eventi attraversati e li ordina deterministicamente", () => {
    const state = createInitialGameState({ id: "guest-test" });
    const result = processScheduledEvents(state, events, 58, 63);

    expect(result.executedEventIds).toEqual(["a", "b", "c"]);
  });

  it("non duplica eventi già eseguiti", () => {
    const state = createInitialGameState({ id: "guest-test" });
    const first = processScheduledEvents(state, events, 58, 63);
    const second = processScheduledEvents(first.state, events, 58, 63);

    expect(second.executedEventIds).toEqual([]);
  });

  it("processa eventi senza dipendere da componenti o posizione", () => {
    const state = createInitialGameState({ id: "guest-test" });
    const awayFromFixture = {
      ...state,
      run: { ...state.run, currentLocationId: "off-screen" },
    };
    const result = processScheduledEvents(awayFromFixture, events, 59, 60);

    expect(result.executedEventIds).toEqual(["a"]);
  });
});

describe("navigazione infrastrutturale", () => {
  const nodes: LocationNode[] = [
    {
      connections: [{ destinationId: "b", travelSeconds: 12 }],
      id: "piazza",
      label: "A",
    },
    { connections: [], id: "b", label: "B" },
    { connections: [], id: "c", label: "C" },
  ];

  it("aggiorna il nodo e applica il costo tramite il core loop", () => {
    const state = createInitialGameState({ id: "guest-test" });
    const navigation = navigateToNode(state, nodes, "b");

    expect(navigation.ok).toBe(true);
    if (!navigation.ok) {
      return;
    }

    const step = advanceCoreLoop(
      navigation.state,
      createClockAnchor(300, 0),
      0,
      [],
      navigation.costSeconds,
    );

    expect(step.state.run.currentLocationId).toBe("b");
    expect(step.state.run.remainingSeconds).toBe(288);
  });

  it("rifiuta destinazioni non collegate o inesistenti", () => {
    const state = createInitialGameState({ id: "guest-test" });

    expect(navigateToNode(state, nodes, "c")).toMatchObject({
      ok: false,
      reason: "not-connected",
    });
    expect(navigateToNode(state, nodes, "missing")).toMatchObject({
      ok: false,
      reason: "destination-not-found",
    });
  });
});

describe("reset deterministico", () => {
  it("incrementa una volta e ricostruisce soltanto lo stato di run", () => {
    const state = createInitialGameState({ id: "guest-test" });
    const ended = {
      ...state,
      progression: {
        ...state.progression,
        knowledge: ["test-knowledge"],
        completedActs: [1],
      },
      run: {
        ...state.run,
        currentLocationId: "b",
        remainingSeconds: 0,
        runFlags: { temporary: true },
      },
      world: { flags: { blackout: true } },
    };

    const reset = resetGameLoop(ended, "2026-09-16T10:00:00.000Z");
    const duplicateAttempt = resetGameLoop(reset, "2026-09-16T10:00:01.000Z");

    expect(reset.run.loopNumber).toBe(2);
    expect(reset.run.remainingSeconds).toBe(300);
    expect(reset.run.currentLocationId).toBe("piazza");
    expect(reset.run.runFlags).toEqual({});
    expect(reset.world.flags).toEqual({});
    expect(reset.progression).toEqual(ended.progression);
    expect(duplicateAttempt).toBe(reset);
  });

  it("processa gli eventi finali prima di segnalare la fine", () => {
    const state = createInitialGameState({ id: "guest-test" });
    const event: ScheduledEvent = {
      atElapsedSecond: 300,
      effects: [{ key: "final", type: "set-run-flag", value: true }],
      id: "final",
    };
    const step = advanceCoreLoop(
      state,
      createClockAnchor(8, 0),
      0,
      [event],
      15,
    );

    expect(step.ended).toBe(true);
    expect(step.state.run.remainingSeconds).toBe(0);
    expect(step.state.run.runFlags.final).toBe(true);
  });

  it("recupera una tab rimasta in background oltre la fine del loop", () => {
    const state = createInitialGameState({ id: "guest-test" });
    const step = advanceCoreLoop(state, createClockAnchor(300, 0), 301_000, []);

    expect(step.ended).toBe(true);
    expect(step.state.run.remainingSeconds).toBe(0);
  });

  it("mantiene valido lo stato corrente dopo l'evoluzione delle milestone", () => {
    const milestoneTwoSave = createInitialGameState({
      id: "guest-m2",
      now: "2026-09-16T08:00:00.000Z",
    });

    expect(milestoneTwoSave.schemaVersion).toBe(3);
    expect(
      validateGameState(JSON.parse(JSON.stringify(milestoneTwoSave))),
    ).toEqual(milestoneTwoSave);
  });
});
