import { describe, expect, it } from "vitest";
import { CHARACTER_DEFINITIONS } from "@/game/content/characters";
import { CITY_LOCATIONS } from "@/game/content/locations";
import { CITY_EVENTS, reconcileCityState } from "@/game/content/world-events";
import { createClockAnchor } from "@/game/engine/clock";
import { advanceCoreLoop } from "@/game/engine/core-loop";
import { navigateToNode } from "@/game/engine/navigation";
import { resetGameLoop } from "@/game/engine/reset";
import {
  getCharactersAtLocation,
  resolveCharacter,
} from "@/game/engine/routines";
import { processScheduledEvents } from "@/game/engine/scheduler";
import { createInitialGameState } from "@/game/state/initial-state";

function character(id: string) {
  const definition = CHARACTER_DEFINITIONS.find((item) => item.id === id);

  if (!definition) {
    throw new Error(`Personaggio mancante: ${id}`);
  }

  return definition;
}

describe("città V1", () => {
  it("definisce i quattro nodi reali e soltanto i collegamenti previsti", () => {
    const ids = new Set(CITY_LOCATIONS.map((location) => location.id));

    expect(CITY_LOCATIONS.map((location) => location.id)).toEqual([
      "piazza",
      "farmacia",
      "stazione",
      "vicolo",
    ]);
    expect(
      CITY_LOCATIONS.find((item) => item.id === "piazza")?.connections,
    ).toEqual([
      { destinationId: "farmacia", travelSeconds: 15 },
      { destinationId: "stazione", travelSeconds: 20 },
      { destinationId: "vicolo", travelSeconds: 12 },
    ]);
    expect(
      CITY_LOCATIONS.find((item) => item.id === "farmacia")?.connections,
    ).toEqual([{ destinationId: "piazza", travelSeconds: 15 }]);
    for (const location of CITY_LOCATIONS) {
      for (const connection of location.connections) {
        expect(ids.has(connection.destinationId)).toBe(true);
        expect(connection.travelSeconds).toBeGreaterThan(0);
      }
    }
  });

  it("rende raggiungibili i nodi periferici soltanto passando dalla piazza", () => {
    const initial = createInitialGameState({ id: "guest-test" });
    const toStation = navigateToNode(initial, CITY_LOCATIONS, "stazione");

    expect(toStation).toMatchObject({ costSeconds: 20, ok: true });
    if (!toStation.ok) {
      return;
    }

    expect(
      navigateToNode(toStation.state, CITY_LOCATIONS, "farmacia"),
    ).toMatchObject({ ok: false, reason: "not-connected" });

    const travelled = advanceCoreLoop(
      toStation.state,
      createClockAnchor(300, 0),
      0,
      CITY_EVENTS,
      toStation.costSeconds,
    );
    expect(travelled.state.run.remainingSeconds).toBe(280);
  });
});

describe("routine NPC", () => {
  it("fa entrare Elena in farmacia esattamente a 23:57", () => {
    const state = createInitialGameState({ id: "guest-test" });

    expect(resolveCharacter(character("elena"), state, 119)).toMatchObject({
      locationId: "piazza",
    });
    expect(resolveCharacter(character("elena"), state, 120)).toMatchObject({
      activity: "Entra nella farmacia e resta oltre la vetrina.",
      locationId: "farmacia",
    });

    const playerAtStation = {
      ...state,
      run: { ...state.run, currentLocationId: "stazione" },
    };
    expect(
      resolveCharacter(character("elena"), playerAtStation, 120).locationId,
    ).toBe("farmacia");
  });

  it("muove l'Uomo in Rosso dalla stazione verso Elena prima del blackout", () => {
    const state = createInitialGameState({ id: "guest-test" });

    expect(resolveCharacter(character("red-man"), state, 0).locationId).toBe(
      "stazione",
    );
    expect(resolveCharacter(character("red-man"), state, 45).locationId).toBe(
      "piazza",
    );
    expect(resolveCharacter(character("red-man"), state, 100).locationId).toBe(
      "farmacia",
    );
    expect(
      resolveCharacter(character("red-man"), state, 180).locationId,
    ).toBeNull();
  });

  it("mostra fasi temporali diverse per Farmacista e Controllore", () => {
    const state = createInitialGameState({ id: "guest-test" });

    expect(
      resolveCharacter(character("pharmacist"), state, 89).activity,
    ).toContain("confezioni");
    expect(
      resolveCharacter(character("pharmacist"), state, 90).activity,
    ).toContain("retrobottega");
    expect(
      resolveCharacter(character("controller"), state, 109).locationId,
    ).toBe("stazione");
    expect(
      resolveCharacter(character("controller"), state, 110).locationId,
    ).toBeNull();
    expect(
      resolveCharacter(character("controller"), state, 210).locationId,
    ).toBe("stazione");
  });

  it("espone soltanto i personaggi presenti nel luogo e nel momento osservato", () => {
    const state = createInitialGameState({ id: "guest-test" });

    expect(
      getCharactersAtLocation(state, "stazione", 0).map((item) => item.name),
    ).toEqual(["Uomo in Rosso", "Controllore"]);
    expect(
      getCharactersAtLocation(state, "stazione", 120).map((item) => item.name),
    ).toEqual([]);
  });

  it("applica una perturbazione dichiarativa senza alterare la routine base", () => {
    const base = createInitialGameState({ id: "guest-test" });
    const perturbed = {
      ...base,
      run: {
        ...base.run,
        runFlags: { "perturbation:red-man-diverted": true },
      },
    };

    expect(resolveCharacter(character("red-man"), base, 100).locationId).toBe(
      "farmacia",
    );
    expect(
      resolveCharacter(character("red-man"), perturbed, 100),
    ).toMatchObject({
      activity: "Devia nel vicolo e sparisce dietro l'angolo.",
      locationId: "vicolo",
    });
  });
});

describe("eventi globali M4", () => {
  it("attiva il blackout esattamente a 23:58", () => {
    const initial = createInitialGameState({ id: "guest-test" });
    const state = {
      ...initial,
      run: { ...initial.run, remainingSeconds: 121 },
    };
    const before = advanceCoreLoop(
      state,
      createClockAnchor(121, 0),
      0,
      CITY_EVENTS,
    );
    const exact = advanceCoreLoop(
      state,
      createClockAnchor(121, 0),
      1_000,
      CITY_EVENTS,
    );

    expect(before.state.run.remainingSeconds).toBe(121);
    expect(before.state.world.flags.blackout).toBeUndefined();
    expect(exact.state.run.remainingSeconds).toBe(120);
    expect(exact.state.world.flags.blackout).toBe(true);
  });

  it("recupera blackout ed eventi intermedi dopo un salto temporale off-screen", () => {
    const state = createInitialGameState({ id: "guest-test" });
    const catchUp = advanceCoreLoop(
      state,
      createClockAnchor(300, 0),
      190_000,
      CITY_EVENTS,
    );

    expect(catchUp.executedEventIds).toEqual([
      "pharmacy-sign-flicker",
      "station-announcement",
      "station-train-passes",
      "alley-shutter-slams",
      "city-blackout",
    ]);
    expect(catchUp.state.world.flags.blackout).toBe(true);
  });

  it("processa gli eventi di luogo una sola volta e senza dipendere dalla posizione", () => {
    const initial = createInitialGameState({ id: "guest-test" });
    const state = {
      ...initial,
      run: { ...initial.run, currentLocationId: "vicolo" },
    };
    const first = processScheduledEvents(state, CITY_EVENTS, 70, 110);
    const second = processScheduledEvents(first.state, CITY_EVENTS, 70, 110);

    expect(first.executedEventIds).toEqual([
      "station-announcement",
      "station-train-passes",
    ]);
    expect(second.executedEventIds).toEqual([]);
  });

  it("pulisce gli eventi della città al reset mantenendo la progressione", () => {
    const state = createInitialGameState({ id: "guest-test" });
    const ended = {
      ...state,
      progression: { ...state.progression, knowledge: ["persistente"] },
      run: { ...state.run, remainingSeconds: 0 },
      world: { flags: { blackout: true, "station-announcement": true } },
    };
    const reset = resetGameLoop(ended);

    expect(reset.world.flags).toEqual({});
    expect(reset.progression.knowledge).toEqual(["persistente"]);
    expect(reset.run.currentLocationId).toBe("piazza");
    expect(resolveCharacter(character("elena"), reset, 0)).toMatchObject({
      activity: "Attraversa la piazza in direzione della farmacia.",
      locationId: "piazza",
    });
    expect(resolveCharacter(character("red-man"), reset, 0).locationId).toBe(
      "stazione",
    );
  });

  it("riconcilia un salvataggio M3 senza cambiare versione dello schema", () => {
    const state = createInitialGameState({ id: "guest-m3" });
    const oldSave = {
      ...state,
      run: {
        ...state.run,
        currentLocationId: "nodo-tecnico",
        remainingSeconds: 110,
      },
    };
    const reconciled = reconcileCityState(oldSave);

    expect(reconciled.schemaVersion).toBe(1);
    expect(reconciled.run.currentLocationId).toBe("piazza");
    expect(reconciled.world.flags.blackout).toBe(true);
  });
});
