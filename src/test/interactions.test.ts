import { describe, expect, it } from "vitest";
import { CITY_EVENTS } from "@/game/content/world-events";
import { createClockAnchor } from "@/game/engine/clock";
import { getDiscoveredClues } from "@/game/engine/clues";
import { evaluateCondition } from "@/game/engine/conditions";
import { selectDialogueVariant } from "@/game/engine/dialogues";
import {
  executeInteraction,
  getAvailableInteractions,
} from "@/game/engine/interactions";
import {
  acquireKnowledge,
  getAcquiredKnowledge,
} from "@/game/engine/knowledge";
import { resetGameLoop } from "@/game/engine/reset";
import { createInitialGameState } from "@/game/state/initial-state";
import type { GameState } from "@/game/state/types";

const ELENA_KNOWLEDGE = "elena_enters_pharmacy_2357";

function stateAt(elapsedSecond: number, locationId = "piazza") {
  const state = createInitialGameState({ id: "guest-test" });

  return {
    ...state,
    run: {
      ...state.run,
      currentLocationId: locationId,
      remainingSeconds: 300 - elapsedSecond,
    },
  };
}

function execute(state: GameState, interactionId: string) {
  return executeInteraction(
    state,
    createClockAnchor(state.run.remainingSeconds, 0),
    0,
    CITY_EVENTS,
    interactionId,
  );
}

describe("knowledge", () => {
  it("acquisisce una conoscenza valida una sola volta", () => {
    const state = createInitialGameState({ id: "guest-test" });
    const first = acquireKnowledge(state, ELENA_KNOWLEDGE);
    const duplicate = acquireKnowledge(first.state, ELENA_KNOWLEDGE);

    expect(first.acquired).toBe(true);
    expect(first.state.progression.knowledge).toEqual([ELENA_KNOWLEDGE]);
    expect(duplicate.acquired).toBe(false);
    expect(duplicate.state).toBe(first.state);
  });

  it("non acquisisce ID non definiti", () => {
    const state = createInitialGameState({ id: "guest-test" });

    expect(acquireKnowledge(state, "future-spoiler")).toEqual({
      acquired: false,
      state,
    });
  });

  it("mantiene knowledge e clue dopo il reset senza creare persistenze M6", () => {
    const observed = execute(stateAt(120, "farmacia"), "observe-elena-entry");
    expect(observed.ok).toBe(true);
    if (!observed.ok) {
      return;
    }

    const explored = execute(observed.state, "explore-pharmacy");
    expect(explored.ok).toBe(true);
    if (!explored.ok) {
      return;
    }

    const ended = {
      ...explored.state,
      run: { ...explored.state.run, remainingSeconds: 0 },
    };
    const reset = resetGameLoop(ended);

    expect(reset.progression.knowledge).toEqual([ELENA_KNOWLEDGE]);
    expect(reset.progression.discoveredClues).toEqual([
      "pharmacy_wet_footprints",
    ]);
    expect(reset.progression.persistences).toEqual([]);
    expect(reset.run.runFlags).toEqual({});
  });
});

describe("conditions", () => {
  it("valuta knowledge e location in entrambi gli stati", () => {
    const base = stateAt(120, "farmacia");
    const known = acquireKnowledge(base, ELENA_KNOWLEDGE).state;

    expect(
      evaluateCondition(
        base,
        { has: true, knowledgeId: ELENA_KNOWLEDGE, type: "knowledge" },
        120,
      ),
    ).toBe(false);
    expect(
      evaluateCondition(
        known,
        { has: true, knowledgeId: ELENA_KNOWLEDGE, type: "knowledge" },
        120,
      ),
    ).toBe(true);
    expect(
      evaluateCondition(
        known,
        { locationId: "farmacia", type: "location" },
        120,
      ),
    ).toBe(true);
  });

  it("valuta presenza NPC, run flag e world flag", () => {
    const base = stateAt(120, "farmacia");
    const flagged = {
      ...base,
      run: { ...base.run, runFlags: { explored: true } },
      world: { flags: { blackout: true } },
    };

    expect(
      evaluateCondition(
        base,
        { characterId: "elena", type: "character-present" },
        120,
      ),
    ).toBe(true);
    expect(
      evaluateCondition(
        flagged,
        { key: "explored", type: "run-flag", value: true },
        120,
      ),
    ).toBe(true);
    expect(
      evaluateCondition(
        flagged,
        { key: "blackout", type: "world-flag", value: true },
        120,
      ),
    ).toBe(true);
  });
});

describe("interactions", () => {
  it("espone soltanto le azioni disponibili", () => {
    const atSquare = getAvailableInteractions(stateAt(0), 0).map(
      (interaction) => interaction.id,
    );
    const atPharmacy = getAvailableInteractions(
      stateAt(120, "farmacia"),
      120,
    ).map((interaction) => interaction.id);

    expect(atSquare).toEqual(["explore-square"]);
    expect(atPharmacy).toEqual([
      "explore-pharmacy",
      "observe-elena-entry",
      "talk-pharmacist",
    ]);
  });

  it("consuma il costo attraverso il core loop e processa gli eventi attraversati", () => {
    const result = execute(stateAt(25), "explore-square");

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.state.run.remainingSeconds).toBe(268);
    expect(result.state.world.flags["pharmacy-sign-flicker"]).toBe(true);
  });

  it("un'azione che raggiunge mezzanotte termina correttamente il loop", () => {
    const result = execute(stateAt(295), "explore-square");

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.ended).toBe(true);
    expect(result.state.run.remainingSeconds).toBe(0);
  });

  it("osserva Elena soltanto nella finestra corretta e non genera un secondo toast", () => {
    const tooEarly = execute(stateAt(119, "farmacia"), "observe-elena-entry");
    const first = execute(stateAt(120, "farmacia"), "observe-elena-entry");

    expect(tooEarly).toMatchObject({ ok: false, reason: "conditions-not-met" });
    expect(first.ok).toBe(true);
    if (!first.ok) {
      return;
    }
    expect(first.acquiredKnowledgeIds).toEqual([ELENA_KNOWLEDGE]);

    const duplicateState = {
      ...first.state,
      run: { ...first.state.run, remainingSeconds: 170 },
    };
    const duplicate = execute(duplicateState, "observe-elena-entry");
    expect(duplicate.ok).toBe(true);
    if (duplicate.ok) {
      expect(duplicate.acquiredKnowledgeIds).toEqual([]);
      expect(duplicate.state.progression.knowledge).toEqual([ELENA_KNOWLEDGE]);
    }
  });

  it("segue Elena, consuma tempo e risolve la routine senza congelarla", () => {
    const result = execute(stateAt(105), "follow-elena");

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.state.run.remainingSeconds).toBe(180);
    expect(result.state.run.currentLocationId).toBe("farmacia");
    expect(
      getAvailableInteractions(result.state, 120).some(
        (interaction) => interaction.id === "observe-elena-entry",
      ),
    ).toBe(true);
    expect(execute(stateAt(104), "follow-elena")).toMatchObject({
      ok: false,
      reason: "conditions-not-met",
    });
  });

  it("sblocca Usa dopo Esplora senza creare una persistenza", () => {
    const base = stateAt(20, "farmacia");
    expect(execute(base, "use-pharmacy-bell")).toMatchObject({
      ok: false,
      reason: "conditions-not-met",
    });

    const explored = execute(base, "explore-pharmacy");
    expect(explored.ok).toBe(true);
    if (!explored.ok) {
      return;
    }
    const used = execute(explored.state, "use-pharmacy-bell");
    expect(used.ok).toBe(true);
    if (used.ok) {
      expect(used.state.run.runFlags["interaction:bell-used"]).toBe(true);
      expect(used.state.progression.persistences).toEqual([]);
    }
  });

  it("non duplica un indizio già scoperto", () => {
    const first = execute(stateAt(20, "farmacia"), "explore-pharmacy");
    expect(first.ok).toBe(true);
    if (!first.ok) {
      return;
    }
    const second = execute(first.state, "explore-pharmacy");
    expect(second.ok).toBe(true);
    if (second.ok) {
      expect(second.discoveredClueIds).toEqual([]);
      expect(second.state.progression.discoveredClues).toEqual([
        "pharmacy_wet_footprints",
      ]);
    }
  });
});

describe("dialogue e diario cross-loop", () => {
  it("seleziona dialogo base senza knowledge e variante dopo un reset", () => {
    const firstLoop = stateAt(120, "farmacia");
    expect(
      selectDialogueVariant(firstLoop, "pharmacist-greeting", 120)?.id,
    ).toBe("base");

    const observed = execute(firstLoop, "observe-elena-entry");
    expect(observed.ok).toBe(true);
    if (!observed.ok) {
      return;
    }
    const reset = resetGameLoop({
      ...observed.state,
      run: { ...observed.state.run, remainingSeconds: 0 },
    });
    const nextLoopAtPharmacy = {
      ...reset,
      run: { ...reset.run, currentLocationId: "farmacia" },
    };

    expect(
      selectDialogueVariant(nextLoopAtPharmacy, "pharmacist-greeting", 0)?.id,
    ).toBe("knows-elena-time");
    expect(nextLoopAtPharmacy.run.currentActId).toBe(1);
    expect(nextLoopAtPharmacy.progression.completedActs).toEqual([]);
  });

  it("il diario deriva soltanto conoscenze e indizi realmente scoperti", () => {
    const empty = createInitialGameState({ id: "guest-test" });
    expect(getAcquiredKnowledge(empty)).toEqual([]);
    expect(getDiscoveredClues(empty)).toEqual([]);

    const observed = execute(stateAt(120, "farmacia"), "observe-elena-entry");
    expect(observed.ok).toBe(true);
    if (!observed.ok) {
      return;
    }
    const explored = execute(observed.state, "explore-pharmacy");
    expect(explored.ok).toBe(true);
    if (explored.ok) {
      expect(
        getAcquiredKnowledge(explored.state).map((item) => item.id),
      ).toEqual([ELENA_KNOWLEDGE]);
      expect(getDiscoveredClues(explored.state).map((item) => item.id)).toEqual(
        ["pharmacy_wet_footprints"],
      );
    }
  });
});
