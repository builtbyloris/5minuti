import { describe, expect, it } from "vitest";
import { ACT_DEFINITIONS, getActDefinition } from "@/game/content/acts";
import { getDialogueDefinition } from "@/game/content/dialogues";
import { SECRET_DEFINITIONS } from "@/game/content/secrets";
import { CITY_EVENTS } from "@/game/content/world-events";
import {
  completeAct,
  evaluateActCompletion,
  getCurrentAct,
  getNextAct,
  isV1Complete,
  syncActAvailability,
} from "@/game/engine/acts";
import { getLocalDateKey, getNextLocalDateKey } from "@/game/engine/calendar";
import { createClockAnchor } from "@/game/engine/clock";
import { executeDialogueChoice } from "@/game/engine/dialogue-choices";
import {
  executeInteraction,
  getAvailableInteractions,
} from "@/game/engine/interactions";
import { resetGameLoop } from "@/game/engine/reset";
import { discoverSecret } from "@/game/engine/secrets";
import {
  LocalSaveAdapter,
  type StorageLike,
} from "@/game/persistence/local-save";
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

function at(
  state: GameState,
  elapsedSecond: number,
  currentLocationId = state.run.currentLocationId,
) {
  return {
    ...state,
    run: {
      ...state.run,
      currentLocationId,
      remainingSeconds: 300 - elapsedSecond,
    },
  };
}

function execute(state: GameState, id: string, day = DAY_ONE) {
  return executeInteraction(
    state,
    createClockAnchor(state.run.remainingSeconds, 0),
    0,
    CITY_EVENTS,
    id,
    day,
  );
}

function requireSuccess(result: ReturnType<typeof execute>) {
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error(`Interazione fallita: ${result.reason}`);
  }
  return result;
}

function solveActOne(path: "follow" | "investigate" = "follow") {
  let state = createInitialGameState({ id: `act-one-${path}` });

  if (path === "follow") {
    state = requireSuccess(
      execute(at(state, 105, "piazza"), "follow-elena"),
    ).state;
  } else {
    state = at(state, 120, "farmacia");
  }

  state = requireSuccess(execute(state, "observe-elena-entry")).state;
  state = requireSuccess(execute(state, "explore-pharmacy")).state;
  return requireSuccess(execute(state, "investigate-private-area")).state;
}

function activateActTwo() {
  return syncActAvailability(solveActOne(), DAY_TWO);
}

function solveActTwo() {
  let state = at(activateActTwo(), 120, "farmacia");
  state = requireSuccess(
    execute(state, "enter-pharmacy-basement", DAY_TWO),
  ).state;
  state = requireSuccess(
    execute(state, "explore-basement-infrastructure", DAY_TWO),
  ).state;
  state = requireSuccess(execute(state, "observe-echo-panel", DAY_TWO)).state;
  return requireSuccess(execute(state, "observe-elena-echo-reaction", DAY_TWO))
    .state;
}

function activateActThree() {
  const completed = solveActTwo();
  const freshLoop = resetGameLoop(
    { ...completed, run: { ...completed.run, remainingSeconds: 0 } },
    "2026-09-17T23:00:00.000Z",
    DAY_TWO,
  );
  return syncActAvailability(freshLoop, DAY_THREE);
}

function getRedManChoice() {
  const choice = getDialogueDefinition("red-man-confrontation")?.variants[0]
    ?.choices[0];
  if (!choice) {
    throw new Error("Scelta finale non definita");
  }
  return choice;
}

describe("ActDefinition e calendario", () => {
  it("definisce soltanto i tre Atti V1 con domande canoniche", () => {
    expect(ACT_DEFINITIONS).toHaveLength(3);
    expect(ACT_DEFINITIONS.map((act) => act.question)).toEqual([
      "Perché Elena entra nella farmacia alle 23:57?",
      "Cosa sta cercando Elena?",
      "Perché l'Uomo in Rosso cerca Elena?",
    ]);
    expect(getActDefinition(1)?.title).toBe("La farmacia");
    expect(getNextAct(3)).toBeNull();
    expect(getActDefinition(4)).toBeUndefined();
  });

  it("usa aritmetica di calendario e non millisecondi fissi", () => {
    expect(getNextLocalDateKey("2026-03-28")).toBe("2026-03-29");
    expect(getNextLocalDateKey("2026-10-24")).toBe("2026-10-25");
    expect(getLocalDateKey(new Date(2026, 8, 16, 23, 55))).toBe(DAY_ONE);
  });

  it("mantiene il post-Atto nello stesso giorno e attiva il successivo dopo uno o più giorni", () => {
    const completed = solveActOne();

    expect(completed.progression.actGate.nextActAvailableOn).toBe(DAY_TWO);
    expect(syncActAvailability(completed, DAY_ONE).run.currentActId).toBe(1);
    expect(syncActAvailability(completed, DAY_TWO).run.currentActId).toBe(2);
    expect(syncActAvailability(completed, "2026-09-20").run.currentActId).toBe(
      2,
    );
  });

  it("non avanza un Atto incompleto il giorno successivo", () => {
    const state = createInitialGameState({ id: "incomplete" });
    expect(syncActAvailability(state, "2026-10-20")).toBe(state);
    expect(getCurrentAct(state)?.id).toBe(1);
  });

  it("non consente di saltare un Atto anche con condizioni future soddisfatte", () => {
    const state = createInitialGameState({ id: "no-skip" });
    const invalidActTwoState = {
      ...state,
      progression: {
        ...state.progression,
        discoveredClues: ["basement_infrastructure"],
        knowledge: ["echo_symbol_seen", "elena_recognizes_echo"],
      },
      run: { ...state.run, currentActId: 2 },
    };

    expect(completeAct(invalidActTwoState, 2, DAY_TWO)).toEqual({
      completed: false,
      state: invalidActTwoState,
    });
  });

  it("sincronizza il gate anche attraverso save e reload", async () => {
    const adapter = new LocalSaveAdapter(new MemoryStorage());
    const completed = solveActOne();
    await adapter.save(completed);

    expect((await adapter.load(DAY_ONE))?.run.currentActId).toBe(1);
    expect((await adapter.load(DAY_TWO))?.run.currentActId).toBe(2);
  });
});

describe("Atto 1 — La farmacia", () => {
  it("è completabile seguendo Elena", () => {
    const state = solveActOne("follow");
    expect(state.progression.completedActs).toEqual([1]);
    expect(state.progression.knowledge).toContain("elena_enters_pharmacy_2357");
    expect(state.progression.knowledge).toContain("pharmacy_has_basement");
    expect(state.progression.discoveredClues).toContain(
      "pharmacy_wet_footprints",
    );
  });

  it("è completabile aspettando e indagando senza usare Segui", () => {
    const state = solveActOne("investigate");
    expect(state.progression.completedActs).toEqual([1]);
    expect(state.run.runFlags).not.toHaveProperty("act3:tracking-red-man");
  });

  it("non si completa con una singola scoperta ed è idempotente", () => {
    const partial = requireSuccess(
      execute(
        at(createInitialGameState({ id: "partial" }), 120, "farmacia"),
        "observe-elena-entry",
      ),
    ).state;
    expect(evaluateActCompletion(partial)).toBe(false);
    expect(partial.progression.completedActs).toEqual([]);

    const solved = solveActOne();
    const duplicate = completeAct(solved, 1, DAY_ONE);
    expect(duplicate).toEqual({ completed: false, state: solved });
    expect(solved.progression.completedActs).toEqual([1]);
  });

  it("non espone ECHO prima che l'Atto 2 sia attivo", () => {
    const completed = at(solveActOne(), 120, "farmacia");
    const entered = requireSuccess(
      execute(completed, "enter-pharmacy-basement"),
    ).state;
    const available = getAvailableInteractions(entered, 125).map(
      (interaction) => interaction.id,
    );

    expect(available).not.toContain("observe-echo-panel");
    expect(completed.progression.knowledge).not.toContain("echo_symbol_seen");
  });

  it("conserva progresso dopo reset e completa anche se l'ultima azione arriva a mezzanotte", () => {
    let state = createInitialGameState({ id: "midnight" });
    state = {
      ...state,
      progression: {
        ...state.progression,
        discoveredClues: ["pharmacy_wet_footprints"],
        knowledge: ["elena_enters_pharmacy_2357"],
      },
    };
    state = at(state, 288, "farmacia");
    const lastAction = requireSuccess(
      execute(state, "investigate-private-area"),
    );

    expect(lastAction.ended).toBe(true);
    expect(lastAction.completedActId).toBe(1);
    expect(lastAction.state.progression.completedActs).toEqual([1]);
    const reset = resetGameLoop(
      lastAction.state,
      "2026-09-16T23:00:00.000Z",
      DAY_ONE,
    );
    expect(reset.progression.knowledge).toContain("pharmacy_has_basement");
    expect(reset.progression.discoveredClues).toContain(
      "pharmacy_wet_footprints",
    );
  });
});

describe("Atto 2 — Sotto la farmacia", () => {
  it("si attiva solo dal giorno successivo e usa il seminterrato come subscene", () => {
    const sameDay = at(solveActOne(), 120, "farmacia");
    expect(sameDay.run.currentActId).toBe(1);

    const nextDay = at(syncActAvailability(sameDay, DAY_TWO), 120, "farmacia");
    const entered = requireSuccess(
      execute(nextDay, "enter-pharmacy-basement", DAY_TWO),
    ).state;
    expect(entered.run.currentLocationId).toBe("farmacia");
    expect(entered.run.runFlags["subscene:pharmacy-basement"]).toBe(true);
  });

  it("consente accesso autonomo o dopo aver seguito Elena", () => {
    const autonomous = at(activateActTwo(), 120, "farmacia");
    expect(
      getAvailableInteractions(autonomous, 120).some(
        (interaction) => interaction.id === "enter-pharmacy-basement",
      ),
    ).toBe(true);

    const following = requireSuccess(
      execute(at(activateActTwo(), 105, "piazza"), "follow-elena", DAY_TWO),
    ).state;
    expect(following.run.currentLocationId).toBe("farmacia");
    expect(
      getAvailableInteractions(following, 120).some(
        (interaction) => interaction.id === "enter-pharmacy-basement",
      ),
    ).toBe(true);
  });

  it("richiede infrastruttura, simbolo e reazione di Elena", () => {
    const solved = solveActTwo();
    expect(solved.progression.completedActs).toEqual([1, 2]);
    expect(solved.progression.discoveredClues).toContain(
      "basement_infrastructure",
    );
    expect(solved.progression.knowledge).toContain("echo_symbol_seen");
    expect(solved.progression.knowledge).toContain("elena_recognizes_echo");
  });

  it("è fail-soft se Elena viene mancata", () => {
    let state = at(activateActTwo(), 181, "farmacia");
    state = requireSuccess(
      execute(state, "enter-pharmacy-basement", DAY_TWO),
    ).state;
    state = requireSuccess(
      execute(state, "explore-basement-infrastructure", DAY_TWO),
    ).state;
    state = requireSuccess(execute(state, "observe-echo-panel", DAY_TWO)).state;

    expect(state.progression.knowledge).toContain("echo_symbol_seen");
    expect(
      getAvailableInteractions(state, 201).some(
        (interaction) => interaction.id === "observe-elena-echo-reaction",
      ),
    ).toBe(false);

    const reset = resetGameLoop(
      { ...state, run: { ...state.run, remainingSeconds: 0 } },
      "2026-09-17T23:00:00.000Z",
      DAY_TWO,
    );
    expect(reset.progression.knowledge).toContain("echo_symbol_seen");
    expect(reset.progression.completedActs).toEqual([1]);
  });
});

describe("Atto 3 — L'uomo in rosso", () => {
  it("supporta il percorso Segui dalla Stazione alla Farmacia", () => {
    let state = at(activateActThree(), 0, "stazione");
    state = requireSuccess(
      execute(state, "follow-red-man-from-station", DAY_THREE),
    ).state;
    expect(state.run.currentLocationId).toBe("piazza");
    state = requireSuccess(
      execute(state, "follow-red-man-to-pharmacy", DAY_THREE),
    ).state;

    expect(state.run.currentLocationId).toBe("farmacia");
    expect(state.progression.discoveredClues).toContain(
      "red_man_reaches_elena_before_blackout",
    );
  });

  it("supporta l'intercettazione e rispetta la deadline del blackout", () => {
    const beforeBlackout = at(activateActThree(), 100, "farmacia");
    const observed = requireSuccess(
      execute(beforeBlackout, "observe-red-man-intercept", DAY_THREE),
    ).state;
    expect(observed.progression.discoveredClues).toContain(
      "red_man_reaches_elena_before_blackout",
    );

    const tooLate = at(activateActThree(), 180, "farmacia");
    expect(
      getAvailableInteractions(tooLate, 180).some((interaction) =>
        ["observe-red-man-intercept", "confront-red-man"].includes(
          interaction.id,
        ),
      ),
    ).toBe(false);
  });

  it("pronuncia la frase canonica, acquisisce knowledge e completa la V1", () => {
    const observed = requireSuccess(
      execute(
        at(activateActThree(), 100, "farmacia"),
        "observe-red-man-intercept",
        DAY_THREE,
      ),
    ).state;
    expect(
      getAvailableInteractions(observed, 105).some(
        (interaction) => interaction.id === "confront-red-man",
      ),
    ).toBe(true);

    const choice = getRedManChoice();
    expect(choice.response).toBe("«Sei tornato troppo presto.»");
    const result = executeDialogueChoice(
      observed,
      createClockAnchor(observed.run.remainingSeconds, 0),
      0,
      CITY_EVENTS,
      choice,
      DAY_THREE,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.state.progression.knowledge).toContain(
      "red_man_knows_player",
    );
    expect(result.state.progression.completedActs).toEqual([1, 2, 3]);
    expect(isV1Complete(result.state)).toBe(true);
    expect(syncActAvailability(result.state, "2026-09-30")).toBe(result.state);
    expect(getNextAct(3)).toBeNull();
  });

  it("non rivela identità future nei contenuti M7", () => {
    const serialized = JSON.stringify({
      acts: ACT_DEFINITIONS,
      secrets: SECRET_DEFINITIONS,
    });
    expect(serialized).not.toMatch(/Soggetto 03|Soggetto 08|catastrofe/i);
  });
});

describe("segreti V1", () => {
  it("ne definisce esattamente tre, uno per Atto e nessuno è requisito", () => {
    expect(SECRET_DEFINITIONS).toHaveLength(3);
    expect(SECRET_DEFINITIONS.map((secret) => secret.unlockedAfterAct)).toEqual(
      [1, 2, 3],
    );
    expect(
      ACT_DEFINITIONS.flatMap((act) => act.completionConditions).some(
        (condition) => condition.type === "secret",
      ),
    ).toBe(false);
  });

  it("li scopre una sola volta e li conserva dopo reset e reload", async () => {
    const adapter = new LocalSaveAdapter(new MemoryStorage());
    const base = solveActOne();
    const first = discoverSecret(base, "pharmacy_blank_receipt");
    const duplicate = discoverSecret(first.state, "pharmacy_blank_receipt");
    const reset = resetGameLoop(
      { ...first.state, run: { ...first.state.run, remainingSeconds: 0 } },
      "2026-09-16T23:00:00.000Z",
      DAY_ONE,
    );

    expect(first.discovered).toBe(true);
    expect(duplicate).toEqual({ discovered: false, state: first.state });
    expect(reset.progression.discoveredSecrets).toEqual([
      "pharmacy_blank_receipt",
    ]);
    await adapter.save(reset);
    expect(
      (await adapter.load(DAY_ONE))?.progression.discoveredSecrets,
    ).toEqual(["pharmacy_blank_receipt"]);
  });
});
