import { describe, expect, it } from "vitest";
import { createArchiveViewModel } from "@/game/archive/view-model";
import { getDialogueDefinition } from "@/game/content/dialogues";
import { CITY_EVENTS } from "@/game/content/world-events";
import { syncActAvailability } from "@/game/engine/acts";
import { createClockAnchor } from "@/game/engine/clock";
import { executeDialogueChoice } from "@/game/engine/dialogue-choices";
import { executeInteraction } from "@/game/engine/interactions";
import { resetGameLoop } from "@/game/engine/reset";
import {
  LOCAL_SAVE_KEY,
  LocalSaveAdapter,
  type StorageLike,
} from "@/game/persistence/local-save";
import { migrateSave } from "@/game/persistence/migrations";
import { createInitialGameState } from "@/game/state/initial-state";
import type { GameState } from "@/game/state/types";

const DAY_ONE = "2026-09-16";
const DAY_TWO = "2026-09-17";
const DAY_THREE = "2026-09-18";

class MemoryStorage implements StorageLike {
  readonly values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

function at(state: GameState, elapsed: number, location = "piazza") {
  return {
    ...state,
    run: {
      ...state.run,
      currentLocationId: location,
      remainingSeconds: 300 - elapsed,
    },
  };
}

function interact(state: GameState, id: string, day = DAY_ONE) {
  const result = executeInteraction(
    state,
    createClockAnchor(state.run.remainingSeconds, 0),
    0,
    CITY_EVENTS,
    id,
    day,
  );
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error(`Interazione non riuscita: ${id} (${result.reason})`);
  }
  return result;
}

function solveActOne(state = createInitialGameState({ id: "m11-e2e" })) {
  let current = at(state, 105);
  current = interact(current, "follow-elena").state;
  current = interact(current, "observe-elena-entry").state;
  current = interact(current, "explore-pharmacy").state;
  return interact(current, "investigate-private-area").state;
}

function solveActTwo(state: GameState) {
  let current = at(state, 120, "farmacia");
  current = interact(current, "enter-pharmacy-basement", DAY_TWO).state;
  current = interact(current, "explore-basement-infrastructure", DAY_TWO).state;
  current = interact(current, "observe-echo-panel", DAY_TWO).state;
  return interact(current, "observe-elena-echo-reaction", DAY_TWO).state;
}

function solveActThree(state: GameState) {
  let current = at(state, 0, "stazione");
  current = interact(current, "follow-red-man-from-station", DAY_THREE).state;
  current = interact(current, "follow-red-man-to-pharmacy", DAY_THREE).state;
  const dialogue = getDialogueDefinition("red-man-confrontation");
  const choice = dialogue?.variants[0]?.choices[0];
  if (!choice) {
    throw new Error("Scelta finale Atto 3 assente");
  }
  const result = executeDialogueChoice(
    current,
    createClockAnchor(current.run.remainingSeconds, 0),
    0,
    CITY_EVENTS,
    choice,
    DAY_THREE,
  );
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error("Dialogo finale Atto 3 fallito");
  }
  return result.state;
}

function nextActLoop(state: GameState, resetDay: string, nextDay: string) {
  const reset = resetGameLoop(
    { ...state, run: { ...state.run, remainingSeconds: 0 } },
    `${resetDay}T23:59:59.000Z`,
    resetDay,
  );
  return syncActAvailability(reset, nextDay);
}

describe("M11 — percorso V1 end-to-end", () => {
  it("attraversa Atti 1–3, reload e gate giornalieri senza saltare contenuti", async () => {
    const adapter = new LocalSaveAdapter(new MemoryStorage());
    const actOne = solveActOne();
    expect(actOne.progression.completedActs).toEqual([1]);
    expect(actOne.run.currentActId).toBe(1);
    expect(JSON.stringify(createArchiveViewModel(actOne))).not.toContain(
      "ECHO",
    );

    await adapter.save(nextActLoop(actOne, DAY_ONE, DAY_ONE));
    const dayTwo = await adapter.load(DAY_TWO);
    expect(dayTwo?.run.currentActId).toBe(2);
    const actTwo = solveActTwo(dayTwo as GameState);
    expect(actTwo.progression.completedActs).toEqual([1, 2]);
    expect(actTwo.progression.knowledge).toContain("echo_symbol_seen");

    await adapter.save(nextActLoop(actTwo, DAY_TWO, DAY_TWO));
    expect((await adapter.load(DAY_TWO))?.run.currentActId).toBe(2);
    const dayThree = await adapter.load(DAY_THREE);
    expect(dayThree?.run.currentActId).toBe(3);
    const actThree = solveActThree(dayThree as GameState);

    expect(actThree.progression.completedActs).toEqual([1, 2, 3]);
    expect(actThree.progression.knowledge).toContain("red_man_knows_player");
    expect(syncActAvailability(actThree, "2026-09-30")).toBe(actThree);
    expect(createArchiveViewModel(actThree).isV1Complete).toBe(true);
  });
});

describe("M11 — integrazione reset e mezzanotte", () => {
  it("pulisce il transiente e riapplica la persistenza sulla baseline del loop successivo", () => {
    let state = at(
      createInitialGameState({ id: "m11-reset" }),
      280,
      "stazione",
    );
    state = interact(state, "explore-station").state;
    state = interact(state, "move-station-token").state;
    state = {
      ...state,
      progression: {
        ...state.progression,
        discoveredClues: ["pharmacy_wet_footprints"],
        knowledge: ["elena_enters_pharmacy_2357"],
      },
      run: { ...state.run, remainingSeconds: 0 },
      world: { flags: { ...state.world.flags, blackout: true } },
    };

    const reset = resetGameLoop(state, "2026-09-16T22:00:00.000Z", DAY_ONE);

    expect(reset.run).toMatchObject({
      currentLocationId: "piazza",
      loopNumber: 2,
      remainingSeconds: 300,
      runFlags: {},
    });
    expect(reset.progression.knowledge).toEqual(["elena_enters_pharmacy_2357"]);
    expect(reset.progression.discoveredClues).toEqual([
      "pharmacy_wet_footprints",
    ]);
    expect(reset.world.flags).toEqual({
      "persistent:station-token-shifted": true,
    });
  });

  it("applica un segreto prima del reset quando l'azione termina esattamente a 00:00", () => {
    const solved = solveActOne();
    const state = {
      ...solved,
      run: {
        ...solved.run,
        currentLocationId: "farmacia",
        remainingSeconds: 4,
      },
    };
    const result = interact(state, "find-pharmacy-secret");

    expect(result.ended).toBe(true);
    expect(result.discoveredSecretIds).toEqual(["pharmacy_blank_receipt"]);
    const reset = resetGameLoop(result.state, undefined, DAY_ONE);
    expect(reset.progression.discoveredSecrets).toEqual([
      "pharmacy_blank_receipt",
    ]);
  });

  it("applica knowledge e completamento Atto prima del reset da dialogo", () => {
    const dayTwo = nextActLoop(solveActOne(), DAY_ONE, DAY_TWO);
    const actTwo = solveActTwo(dayTwo);
    const dayThree = nextActLoop(actTwo, DAY_TWO, DAY_THREE);
    let state = at(dayThree, 100, "farmacia");
    state = interact(state, "observe-red-man-intercept", DAY_THREE).state;
    state = { ...state, run: { ...state.run, remainingSeconds: 8 } };
    const choice = getDialogueDefinition("red-man-confrontation")?.variants[0]
      ?.choices[0];
    if (!choice) {
      throw new Error("Scelta dialogo mancante");
    }
    const result = executeDialogueChoice(
      state,
      createClockAnchor(8, 0),
      0,
      CITY_EVENTS,
      choice,
      DAY_THREE,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.ended).toBe(true);
    expect(result.state.progression.completedActs).toEqual([1, 2, 3]);
    const reset = resetGameLoop(result.state, undefined, DAY_THREE);
    expect(reset.progression.knowledge).toContain("red_man_knows_player");
    expect(reset.progression.completedActs).toEqual([1, 2, 3]);
  });
});

describe("M11 — catena migrazioni e dimensione save", () => {
  function legacy(version: 1 | 2 | 3 | 4) {
    const state = createInitialGameState({ id: `legacy-v${version}` });
    const progression: Record<string, unknown> = {
      ...state.progression,
      completedActs: [1],
      discoveredAnomalies: ["legacy-anomaly"],
      discoveredClues: ["pharmacy_wet_footprints"],
      discoveredSecrets: ["pharmacy_blank_receipt"],
      knowledge: ["elena_enters_pharmacy_2357"],
      persistences: [
        { active: true, id: "station_token_shifted", type: "physical" },
      ],
    };
    if (version < 4) {
      delete progression.discoveredLocations;
      delete progression.discoveredPeople;
    }
    if (version < 3) {
      delete progression.actGate;
    }
    if (version < 2) {
      delete progression.discoveredClues;
    }

    return {
      ...state,
      progression,
      run: { ...state.run, loopNumber: 7 },
      schemaVersion: version,
      settings:
        version < 5
          ? { reducedMotion: "reduce", subtitles: false }
          : state.settings,
    };
  }

  it.each([
    1, 2, 3, 4,
  ] as const)("migra esplicitamente v%i fino a v5 conservando il progresso compatibile", (version) => {
    const migrated = migrateSave(legacy(version));

    expect(migrated?.schemaVersion).toBe(5);
    expect(migrated?.run.loopNumber).toBe(7);
    expect(migrated?.progression.knowledge).toContain(
      "elena_enters_pharmacy_2357",
    );
    expect(migrated?.progression.persistences[0]?.id).toBe(
      "station_token_shifted",
    );
    expect(migrated?.progression.discoveredSecrets).toEqual([
      "pharmacy_blank_receipt",
    ]);
    expect(migrated?.progression.discoveredAnomalies).toEqual([
      "legacy-anomaly",
    ]);
    expect(migrated?.progression.actGate).toBeDefined();
    expect(migrated?.progression.discoveredLocations).toContain("piazza");
    expect(migrated?.settings).toMatchObject({
      ambienceVolume: 55,
      effectsVolume: 70,
      reducedMotion: "reduce",
    });
  });

  it("carica v5 direttamente e mantiene save nuovo e completo entro limiti ragionevoli", async () => {
    const storage = new MemoryStorage();
    const adapter = new LocalSaveAdapter(storage);
    const fresh = createInitialGameState({ id: "m11-size" });
    await adapter.save(fresh);
    const freshBytes = new TextEncoder().encode(
      storage.getItem(LOCAL_SAVE_KEY) ?? "",
    ).byteLength;

    const actOne = solveActOne(fresh);
    const actTwo = solveActTwo(nextActLoop(actOne, DAY_ONE, DAY_TWO));
    const completed = solveActThree(nextActLoop(actTwo, DAY_TWO, DAY_THREE));
    await adapter.save(completed);
    const completedBytes = new TextEncoder().encode(
      storage.getItem(LOCAL_SAVE_KEY) ?? "",
    ).byteLength;

    expect(await adapter.load(DAY_THREE)).toEqual(completed);
    expect(freshBytes).toBeGreaterThan(500);
    expect(freshBytes).toBeLessThan(5_000);
    expect(completedBytes).toBeGreaterThan(freshBytes);
    expect(completedBytes).toBeLessThan(10_000);
  });
});
