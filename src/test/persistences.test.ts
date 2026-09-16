import { describe, expect, it } from "vitest";
import { getDialogueDefinition } from "@/game/content/dialogues";
import { CITY_EVENTS } from "@/game/content/world-events";
import { createClockAnchor } from "@/game/engine/clock";
import { evaluateCondition } from "@/game/engine/conditions";
import { selectDialogueVariant } from "@/game/engine/dialogues";
import { applyInteractionEffects } from "@/game/engine/effects";
import { executeInteraction } from "@/game/engine/interactions";
import { acquireKnowledge } from "@/game/engine/knowledge";
import {
  advancePersistenceLifecycle,
  applyPersistencesToFreshRun,
  getActivePersistences,
  grantPersistence,
  hasPersistence,
  reconcilePersistences,
  removePersistence,
} from "@/game/engine/persistences";
import { resetGameLoop } from "@/game/engine/reset";
import {
  LOCAL_SAVE_KEY,
  LocalSaveAdapter,
  type StorageLike,
} from "@/game/persistence/local-save";
import { createInitialGameState } from "@/game/state/initial-state";
import type { GameState } from "@/game/state/types";

const PHYSICAL_ID = "station_token_shifted";
const RELATIONAL_ID = "pharmacist_residual_wariness";

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

function initialState() {
  return createInitialGameState({ id: "guest-persistence" });
}

function endLoop(state: GameState) {
  return resetGameLoop({
    ...state,
    run: { ...state.run, remainingSeconds: 0 },
  });
}

describe("motore delle persistenze", () => {
  it("concede una persistenza nota una sola volta e rifiuta ID sconosciuti", () => {
    const base = initialState();
    const first = grantPersistence(base, PHYSICAL_ID);
    const duplicate = grantPersistence(first.state, PHYSICAL_ID);

    expect(first.granted).toBe(true);
    expect(hasPersistence(first.state, PHYSICAL_ID)).toBe(true);
    expect(duplicate).toEqual({ granted: false, state: first.state });
    expect(grantPersistence(base, "future-persistence")).toEqual({
      granted: false,
      state: base,
    });
  });

  it("rimuove la persistenza e il relativo effetto derivato", () => {
    const granted = grantPersistence(initialState(), PHYSICAL_ID).state;
    expect(granted.world.flags["persistent:station-token-shifted"]).toBe(true);

    const removed = removePersistence(granted, PHYSICAL_ID);
    expect(removed.removed).toBe(true);
    expect(hasPersistence(removed.state, PHYSICAL_ID)).toBe(false);
    expect(removed.state.world.flags["persistent:station-token-shifted"]).toBe(
      undefined,
    );
  });

  it("interpreta remainingLoops includendo il loop corrente", () => {
    const created = grantPersistence(initialState(), RELATIONAL_ID).state;
    expect(getActivePersistences(created)[0]?.state.remainingLoops).toBe(2);

    const nextLoop = endLoop(created);
    expect(hasPersistence(nextLoop, RELATIONAL_ID)).toBe(true);
    expect(getActivePersistences(nextLoop)[0]?.state.remainingLoops).toBe(1);

    const followingLoop = endLoop(nextLoop);
    expect(hasPersistence(followingLoop, RELATIONAL_ID)).toBe(false);
    expect(followingLoop.progression.persistences).toEqual([]);
  });

  it("mantiene le persistenze senza durata e applica gli effetti in modo idempotente", () => {
    const granted = grantPersistence(initialState(), PHYSICAL_ID).state;
    const nextLoop = endLoop(granted);
    const appliedOnce = applyPersistencesToFreshRun(nextLoop);
    const appliedTwice = applyPersistencesToFreshRun(appliedOnce);

    expect(hasPersistence(nextLoop, PHYSICAL_ID)).toBe(true);
    expect(nextLoop.world.flags).toEqual({
      "persistent:station-token-shifted": true,
    });
    expect(appliedTwice).toBe(appliedOnce);
  });

  it("avanza il ciclo di vita senza alterare conoscenze o altri progressi", () => {
    const known = acquireKnowledge(
      initialState(),
      "elena_enters_pharmacy_2357",
    ).state;
    const granted = grantPersistence(known, RELATIONAL_ID).state;
    const advanced = advancePersistenceLifecycle(granted);

    expect(advanced.progression.knowledge).toEqual([
      "elena_enters_pharmacy_2357",
    ]);
    expect(advanced.progression.persistences[0]?.remainingLoops).toBe(1);
  });
});

describe("persistenza fisica giocabile", () => {
  it("rende disponibile il gettone dopo Esplora, consuma tempo e sopravvive al reset", () => {
    const base = {
      ...initialState(),
      run: {
        ...initialState().run,
        currentLocationId: "stazione",
      },
    };
    const anchor = createClockAnchor(300, 0);
    const explored = executeInteraction(
      base,
      anchor,
      0,
      CITY_EVENTS,
      "explore-station",
    );
    expect(explored.ok).toBe(true);
    if (!explored.ok) {
      return;
    }

    const moved = executeInteraction(
      explored.state,
      explored.anchor,
      0,
      CITY_EVENTS,
      "move-station-token",
    );
    expect(moved.ok).toBe(true);
    if (!moved.ok) {
      return;
    }

    expect(moved.state.run.remainingSeconds).toBe(288);
    expect(moved.grantedPersistenceIds).toEqual([PHYSICAL_ID]);
    expect(moved.state.world.flags["persistent:station-token-shifted"]).toBe(
      true,
    );

    const reset = endLoop(moved.state);
    expect(hasPersistence(reset, PHYSICAL_ID)).toBe(true);
    expect(reset.world.flags["persistent:station-token-shifted"]).toBe(true);
    expect(reset.run.runFlags).toEqual({});
  });
});

describe("persistenza relazionale", () => {
  it("nasce da una scelta di dialogo, modifica il tono e non blocca il dialogo", () => {
    const dialogue = getDialogueDefinition("pharmacist-greeting");
    const choice = dialogue?.variants
      .find((variant) => variant.id === "base")
      ?.choices.find((entry) => entry.id === "press-for-an-answer");
    expect(choice).toBeDefined();

    const affected = applyInteractionEffects(
      initialState(),
      choice?.effects ?? [],
    );
    const atPharmacy = {
      ...affected.state,
      run: { ...affected.state.run, currentLocationId: "farmacia" },
    };

    expect(affected.grantedPersistenceIds).toEqual([RELATIONAL_ID]);
    expect(
      selectDialogueVariant(atPharmacy, "pharmacist-greeting", 0)?.id,
    ).toBe("residual-wariness");
    expect(
      executeInteraction(
        atPharmacy,
        createClockAnchor(300, 0),
        0,
        CITY_EVENTS,
        "talk-pharmacist",
      ).ok,
    ).toBe(true);
  });

  it("resta ottenibile anche quando la variante knowledge è prioritaria", () => {
    const dialogue = getDialogueDefinition("pharmacist-greeting");
    const knowledgeVariant = dialogue?.variants.find(
      (variant) => variant.id === "knows-elena-time",
    );

    expect(
      knowledgeVariant?.choices.some((choice) =>
        choice.effects?.some(
          (effect) =>
            effect.type === "grant-persistence" &&
            effect.persistenceId === RELATIONAL_ID,
        ),
      ),
    ).toBe(true);
  });

  it("combina knowledge e diffidenza senza confonderle", () => {
    const persistent = grantPersistence(initialState(), RELATIONAL_ID).state;
    const known = acquireKnowledge(
      persistent,
      "elena_enters_pharmacy_2357",
    ).state;

    expect(known.progression.knowledge).toHaveLength(1);
    expect(known.progression.persistences).toHaveLength(1);
    expect(selectDialogueVariant(known, "pharmacist-greeting", 0)?.id).toBe(
      "knows-elena-time-and-wary",
    );
  });

  it("supporta condizioni has e lacks persistence", () => {
    const base = initialState();
    const granted = grantPersistence(base, RELATIONAL_ID).state;
    const condition = {
      has: true as const,
      persistenceId: RELATIONAL_ID,
      type: "persistence" as const,
    };

    expect(evaluateCondition(base, condition, 0)).toBe(false);
    expect(evaluateCondition(granted, condition, 0)).toBe(true);
    expect(evaluateCondition(granted, { ...condition, has: false }, 0)).toBe(
      false,
    );
  });
});

describe("save e riconciliazione", () => {
  it("ripristina gli effetti derivati dopo save/load", async () => {
    const adapter = new LocalSaveAdapter(new MemoryStorage());
    const granted = grantPersistence(initialState(), PHYSICAL_ID).state;
    await adapter.save({ ...granted, world: { flags: {} } });

    const loaded = await adapter.load();
    expect(loaded?.world.flags["persistent:station-token-shifted"]).toBe(true);
  });

  it("elimina ID, tipi e duplicati non validi senza invalidare il save", async () => {
    const storage = new MemoryStorage();
    const adapter = new LocalSaveAdapter(storage);
    const state = initialState();
    const dirty = {
      ...state,
      progression: {
        ...state.progression,
        persistences: [
          { active: true, id: PHYSICAL_ID, type: "physical" as const },
          { active: true, id: PHYSICAL_ID, type: "physical" as const },
          { active: true, id: RELATIONAL_ID, type: "world" as const },
          { active: true, id: "removed-content", type: "world" as const },
        ],
      },
    };
    storage.setItem(LOCAL_SAVE_KEY, JSON.stringify(dirty));

    const loaded = await adapter.load();
    expect(loaded?.progression.persistences).toEqual([
      { active: true, id: PHYSICAL_ID, type: "physical" },
    ]);
    expect(
      JSON.parse(storage.getItem(LOCAL_SAVE_KEY) ?? "{}").progression
        .persistences,
    ).toHaveLength(1);
    expect(reconcilePersistences(loaded ?? state)).toEqual(loaded);
  });
});
