import { describe, expect, it } from "vitest";
import { createInitialGameState } from "@/game/state/initial-state";
import { mergeGameStates } from "@/game/sync/merge";

function stateAt(
  id: string,
  updatedAt: string,
  patch: Partial<ReturnType<typeof createInitialGameState>["progression"]> = {},
) {
  const state = createInitialGameState({ id, now: updatedAt });
  return {
    ...state,
    metadata: { ...state.metadata, updatedAt },
    progression: { ...state.progression, ...patch },
  };
}

describe("mergeGameStates", () => {
  it("unisce e deduplica tutta la progressione monotonic", () => {
    const local = stateAt("local", "2026-09-16T10:00:00.000Z", {
      completedActs: [1],
      discoveredAnomalies: ["anomalia-locale"],
      discoveredClues: ["pharmacy_wet_footprints"],
      discoveredLocations: ["piazza", "farmacia"],
      discoveredPeople: ["elena"],
      discoveredSecrets: ["pharmacy_blank_receipt"],
      knowledge: ["elena_enters_pharmacy_2357"],
    });
    const remote = stateAt("remote", "2026-09-16T11:00:00.000Z", {
      completedActs: [1, 2],
      discoveredAnomalies: ["anomalia-cloud"],
      discoveredClues: ["basement_infrastructure"],
      discoveredLocations: ["piazza", "stazione"],
      discoveredPeople: ["red-man"],
      discoveredSecrets: ["basement_dry_line"],
      knowledge: ["echo_symbol_seen"],
    });
    const merged = mergeGameStates(local, remote, {
      currentDateKey: "2026-09-16",
    }).state;

    expect(merged.progression.completedActs).toEqual([1, 2]);
    expect(merged.progression.knowledge).toEqual([
      "echo_symbol_seen",
      "elena_enters_pharmacy_2357",
    ]);
    expect(merged.progression.discoveredClues).toEqual([
      "basement_infrastructure",
      "pharmacy_wet_footprints",
    ]);
    expect(merged.progression.discoveredSecrets).toEqual([
      "basement_dry_line",
      "pharmacy_blank_receipt",
    ]);
    expect(merged.progression.discoveredAnomalies).toEqual([
      "anomalia-cloud",
      "anomalia-locale",
    ]);
    expect(merged.progression.discoveredPeople).toEqual(["red-man", "elena"]);
    expect(merged.progression.discoveredLocations).toEqual([
      "piazza",
      "stazione",
      "farmacia",
    ]);
  });

  it("usa una sola snapshot per run, world e persistenze e mantiene settings locali", () => {
    const localBase = stateAt("local", "2026-09-16T10:00:00.000Z");
    const remoteBase = stateAt("remote", "2026-09-16T11:00:00.000Z");
    const local = {
      ...localBase,
      run: {
        ...localBase.run,
        currentLocationId: "vicolo",
        loopNumber: 7,
        remainingSeconds: 111,
        runFlags: { local: true },
      },
      settings: { reducedMotion: "reduce" as const, subtitles: false },
      world: { flags: { local: true } },
    };
    const remote = {
      ...remoteBase,
      progression: {
        ...remoteBase.progression,
        persistences: [
          {
            active: true,
            id: "pharmacist_residual_wariness",
            remainingLoops: 1,
            type: "relationship" as const,
          },
        ],
      },
      run: {
        ...remoteBase.run,
        currentLocationId: "stazione",
        loopNumber: 10,
        remainingSeconds: 42,
        runFlags: { remote: true },
      },
      world: { flags: { remote: true } },
    };
    const result = mergeGameStates(local, remote);

    expect(result.base).toBe("remote");
    expect(result.state.run).toEqual(remote.run);
    expect(result.state.world).toEqual(remote.world);
    expect(result.state.progression.persistences).toEqual(
      remote.progression.persistences,
    );
    expect(result.state.settings).toEqual(local.settings);
    expect(result.state.player).toEqual(local.player);
  });

  it("non crea salti negli Atti né Atto 4 e riconcilia il daily gate", () => {
    const local = stateAt("local", "2026-09-16T10:00:00.000Z", {
      completedActs: [1],
    });
    const remoteBase = stateAt("remote", "2026-09-16T11:00:00.000Z", {
      actGate: { nextActAvailableOn: "2026-09-17" },
      completedActs: [1, 2, 4],
    });
    const remote = {
      ...remoteBase,
      run: { ...remoteBase.run, currentActId: 2 },
    };
    const beforeGate = mergeGameStates(local, remote, {
      currentDateKey: "2026-09-16",
    }).state;
    const afterGate = mergeGameStates(local, remote, {
      currentDateKey: "2026-09-17",
    }).state;

    expect(beforeGate.progression.completedActs).toEqual([1, 2]);
    expect(beforeGate.run.currentActId).toBe(2);
    expect(afterGate.run.currentActId).toBe(3);
    expect(afterGate.progression.completedActs).not.toContain(4);
  });

  it("è idempotente a parità di input", () => {
    const local = stateAt("local", "2026-09-16T10:00:00.000Z", {
      knowledge: ["elena_enters_pharmacy_2357"],
    });
    const remote = stateAt("remote", "2026-09-16T09:00:00.000Z", {
      discoveredClues: ["pharmacy_wet_footprints"],
    });
    const first = mergeGameStates(local, remote).state;
    const second = mergeGameStates(first, remote).state;

    expect(second).toEqual(first);
  });
});
