import { describe, expect, it } from "vitest";
import {
  LOCAL_SAVE_KEY,
  LocalSaveAdapter,
  type StorageLike,
} from "@/game/persistence/local-save";
import { validateGameState } from "@/game/persistence/save-schema";
import { createInitialGameState } from "@/game/state/initial-state";
import { completeIntroduction } from "@/game/state/transitions";
import { GAME_STATE_SCHEMA_VERSION } from "@/game/state/types";

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

describe("GameState iniziale", () => {
  it("crea una partita guest valida senza progressi o spoiler", () => {
    const state = createInitialGameState({
      id: "guest-test",
      now: "2026-09-16T08:00:00.000Z",
    });

    expect(state.schemaVersion).toBe(GAME_STATE_SCHEMA_VERSION);
    expect(state.run).toEqual({
      currentActId: 1,
      currentLocationId: "piazza",
      loopNumber: 1,
      remainingSeconds: 300,
      runFlags: {},
    });
    expect(state.progression).toEqual({
      completedActs: [],
      discoveredAnomalies: [],
      discoveredClues: [],
      discoveredSecrets: [],
      knowledge: [],
      persistences: [],
      relationships: {},
    });
    expect(state.metadata.introduction.status).toBe("pending");
    expect(validateGameState(state)).toEqual(state);
  });

  it("completa l'intro senza alterare la progressione", () => {
    const state = createInitialGameState({
      id: "guest-test",
      now: "2026-09-16T08:00:00.000Z",
    });
    const progressionBefore = structuredClone(state.progression);
    const completed = completeIntroduction(state, "2026-09-16T08:01:00.000Z");

    expect(completed.progression).toEqual(progressionBefore);
    expect(completed.run).toEqual(state.run);
    expect(completed.metadata.introduction).toEqual({
      completedAt: "2026-09-16T08:01:00.000Z",
      status: "completed",
    });
    expect(completed.metadata.revision).toBe(2);
  });
});

describe("LocalSaveAdapter", () => {
  it("salva, carica e cancella uno stato valido", async () => {
    const storage = new MemoryStorage();
    const adapter = new LocalSaveAdapter(storage);
    const state = createInitialGameState({ id: "guest-test" });

    await adapter.save(state);
    expect(await adapter.load()).toEqual(state);

    await adapter.clear();
    expect(await adapter.load()).toBeNull();
  });

  it("mantiene knowledge e clue dopo save/load", async () => {
    const adapter = new LocalSaveAdapter(new MemoryStorage());
    const state = createInitialGameState({ id: "guest-test" });
    const progressed = {
      ...state,
      progression: {
        ...state.progression,
        discoveredClues: ["pharmacy_wet_footprints"],
        knowledge: ["elena_enters_pharmacy_2357"],
      },
    };

    await adapter.save(progressed);

    expect((await adapter.load())?.progression).toMatchObject({
      discoveredClues: ["pharmacy_wet_footprints"],
      knowledge: ["elena_enters_pharmacy_2357"],
    });
  });

  it("migra un salvataggio M4 v1 aggiungendo gli indizi senza perdere dati", async () => {
    const storage = new MemoryStorage();
    const adapter = new LocalSaveAdapter(storage);
    const state = createInitialGameState({ id: "guest-m4" });
    const { discoveredClues: _clues, ...legacyProgression } = state.progression;
    const legacySave = {
      ...state,
      progression: {
        ...legacyProgression,
        knowledge: ["elena_enters_pharmacy_2357"],
      },
      schemaVersion: 1,
    };
    storage.setItem(LOCAL_SAVE_KEY, JSON.stringify(legacySave));

    const migrated = await adapter.load();

    expect(migrated?.schemaVersion).toBe(2);
    expect(migrated?.progression.knowledge).toEqual([
      "elena_enters_pharmacy_2357",
    ]);
    expect(migrated?.progression.discoveredClues).toEqual([]);
  });

  it("gestisce un save assente", async () => {
    const adapter = new LocalSaveAdapter(new MemoryStorage());

    expect(await adapter.load()).toBeNull();
  });

  it("ignora e rimuove JSON corrotto senza provocare crash", async () => {
    const storage = new MemoryStorage();
    const adapter = new LocalSaveAdapter(storage);
    storage.setItem(LOCAL_SAVE_KEY, "{non-json");

    expect(await adapter.load()).toBeNull();
    expect(storage.getItem(LOCAL_SAVE_KEY)).toBeNull();
  });

  it("rifiuta dati con schema non valido senza cancellare versioni future", async () => {
    const storage = new MemoryStorage();
    const adapter = new LocalSaveAdapter(storage);
    const state = createInitialGameState({ id: "guest-test" });

    storage.setItem(
      LOCAL_SAVE_KEY,
      JSON.stringify({ ...state, schemaVersion: 99 }),
    );

    expect(await adapter.load()).toBeNull();
    expect(storage.getItem(LOCAL_SAVE_KEY)).not.toBeNull();

    storage.setItem(
      LOCAL_SAVE_KEY,
      JSON.stringify({ ...state, run: { loopNumber: 0 } }),
    );
    expect(await adapter.load()).toBeNull();
    expect(storage.getItem(LOCAL_SAVE_KEY)).toBeNull();
    expect(validateGameState({ ...state, run: { loopNumber: 0 } })).toBeNull();
  });
});
