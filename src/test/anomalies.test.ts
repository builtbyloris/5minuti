import { describe, expect, it } from "vitest";
import { createArchiveViewModel } from "@/game/archive/view-model";
import {
  ANOMALY_DEFINITIONS,
  getAnomalyDefinition,
} from "@/game/content/anomalies";
import { CITY_LOCATIONS } from "@/game/content/locations";
import { CITY_EVENTS } from "@/game/content/world-events";
import { discoverAnomaly, isPostActExploration } from "@/game/engine/anomalies";
import { createClockAnchor } from "@/game/engine/clock";
import {
  executeInteraction,
  getAvailableInteractions,
} from "@/game/engine/interactions";
import { resetGameLoop } from "@/game/engine/reset";
import {
  LOCAL_SAVE_KEY,
  LocalSaveAdapter,
} from "@/game/persistence/local-save";
import { createInitialGameState } from "@/game/state/initial-state";
import { GAME_STATE_SCHEMA_VERSION, type GameState } from "@/game/state/types";
import { mergeGameStates } from "@/game/sync/merge";

const TODAY = "2026-09-17";
const TOMORROW = "2026-09-18";

function postActState(
  locationId = "piazza",
  overrides: Partial<GameState["run"]> = {},
): GameState {
  const state = createInitialGameState({ id: "anomaly-test" });

  return {
    ...state,
    progression: {
      ...state.progression,
      actGate: { nextActAvailableOn: TOMORROW },
      completedActs: [1],
    },
    run: {
      ...state.run,
      currentLocationId: locationId,
      ...overrides,
    },
  };
}

function availableIds(state: GameState, elapsedSecond: number) {
  return getAvailableInteractions(state, elapsedSecond, TODAY).map(
    (interaction) => interaction.id,
  );
}

function execute(state: GameState, interactionId: string) {
  return executeInteraction(
    state,
    createClockAnchor(state.run.remainingSeconds, 0),
    0,
    CITY_EVENTS,
    interactionId,
    TODAY,
  );
}

describe("catalogo anomalie V1", () => {
  it("contiene esattamente le tre anomalie richieste, con luoghi e testi canonici", () => {
    expect(ANOMALY_DEFINITIONS).toHaveLength(3);
    expect(
      ANOMALY_DEFINITIONS.map(({ id, kind, locationId, title }) => ({
        id,
        kind,
        locationId,
        title,
      })),
    ).toEqual([
      {
        id: "piazza_blue_flicker",
        kind: "daily",
        locationId: "piazza",
        title: "Luce fuori fase",
      },
      {
        id: "pharmacy_bell_second_motion",
        kind: "provoked",
        locationId: "farmacia",
        title: "Il secondo movimento",
      },
      {
        id: "station_display_out_of_time",
        kind: "rare",
        locationId: "stazione",
        title: "Display fuori tempo",
      },
    ]);
    expect(new Set(ANOMALY_DEFINITIONS.map(({ id }) => id)).size).toBe(3);
    const locationIds = new Set(CITY_LOCATIONS.map(({ id }) => id));
    const forbiddenLore =
      /subject|soggetto|catastrofe|elena|simulazione|errore di sistema|rendering|bug|ricostruzione|memoria artificiale|00:01|echo/i;
    for (const definition of ANOMALY_DEFINITIONS) {
      expect(["daily", "provoked", "rare"]).toContain(definition.kind);
      expect(locationIds.has(definition.locationId)).toBe(true);
      expect(`${definition.title} ${definition.description}`).not.toMatch(
        forbiddenLore,
      );
    }
  });

  it("rifiuta ID ignoti e registra ogni anomalia valida una sola volta", () => {
    const state = postActState();
    const unknown = discoverAnomaly(state, "future-spoiler");
    const first = discoverAnomaly(state, "piazza_blue_flicker");
    const duplicate = discoverAnomaly(first.state, "piazza_blue_flicker");

    expect(unknown).toEqual({ discovered: false, state });
    expect(first.discovered).toBe(true);
    expect(first.state.progression.discoveredAnomalies).toEqual([
      "piazza_blue_flicker",
    ]);
    expect(duplicate).toEqual({ discovered: false, state: first.state });
  });

  it.each(
    ANOMALY_DEFINITIONS,
  )("$id resta una discovery distinta da flag, segreti e persistenze", ({
    id,
  }) => {
    const state = postActState();
    const discovered = discoverAnomaly(state, id).state;
    const reset = resetGameLoop({
      ...discovered,
      run: { ...discovered.run, remainingSeconds: 0 },
    });

    expect(reset.progression.discoveredAnomalies).toEqual([id]);
    expect(reset.progression.discoveredSecrets).toEqual([]);
    expect(reset.progression.persistences).toEqual([]);
    expect(reset.run.runFlags).toEqual({});
    expect(
      createArchiveViewModel(reset).anomalies.map((entry) => entry.id),
    ).toEqual([id]);
    expect(discoverAnomaly(reset, id).state).toBe(reset);
  });
});

describe("gate post-Atto", () => {
  it("si apre solo dopo l'Atto corrente, mentre si attende il giorno dopo, o a V1 conclusa", () => {
    const initial = createInitialGameState({ id: "gate-test" });
    const waiting = postActState();
    const completedWithoutGate = {
      ...waiting,
      progression: {
        ...waiting.progression,
        actGate: { nextActAvailableOn: null },
      },
    };
    const complete = {
      ...waiting,
      progression: {
        ...waiting.progression,
        actGate: { nextActAvailableOn: null },
        completedActs: [1, 2, 3],
      },
      run: { ...waiting.run, currentActId: 3 },
    };

    expect(isPostActExploration(initial, TODAY)).toBe(false);
    expect(isPostActExploration(completedWithoutGate, TODAY)).toBe(false);
    expect(isPostActExploration(waiting, TODAY)).toBe(true);
    expect(isPostActExploration(waiting, TOMORROW)).toBe(false);
    expect(isPostActExploration(complete, TOMORROW)).toBe(true);
  });
});

describe("gameplay anomalie", () => {
  it("rende la daily osservabile solo nel post-Atto e la conserva al reset", () => {
    const beforeAct = createInitialGameState({ id: "daily-before" });
    expect(availableIds(beforeAct, 0)).not.toContain(
      "observe-piazza-blue-flicker",
    );

    const result = execute(postActState(), "observe-piazza-blue-flicker");
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.discoveredAnomalyIds).toEqual(["piazza_blue_flicker"]);
    expect(availableIds(result.state, 5)).not.toContain(
      "observe-piazza-blue-flicker",
    );
    expect(
      getAvailableInteractions(result.state, 5, TOMORROW).map(({ id }) => id),
    ).not.toContain("observe-piazza-blue-flicker");
    expect(result.state.progression.discoveredAnomalies).toHaveLength(1);

    const reset = resetGameLoop({
      ...result.state,
      run: { ...result.state.run, remainingSeconds: 0 },
    });
    expect(reset.progression.discoveredAnomalies).toEqual([
      "piazza_blue_flicker",
    ]);
  });

  it("richiede prima l'uso del campanello e perde la provocazione al reset", () => {
    const base = postActState("farmacia");
    expect(availableIds(base, 0)).not.toContain(
      "observe-pharmacy-bell-second-motion",
    );

    const explored = execute(base, "explore-pharmacy");
    expect(explored.ok).toBe(true);
    if (!explored.ok) {
      return;
    }
    const bell = execute(explored.state, "use-pharmacy-bell");
    expect(bell.ok).toBe(true);
    if (!bell.ok) {
      return;
    }

    expect(availableIds(bell.state, 11)).toContain(
      "observe-pharmacy-bell-second-motion",
    );

    const reset = resetGameLoop({
      ...bell.state,
      run: { ...bell.state.run, remainingSeconds: 0 },
    });
    expect(reset.run.runFlags).toEqual({});
    expect(availableIds(reset, 0)).not.toContain(
      "observe-pharmacy-bell-second-motion",
    );
  });

  it("registra la provoked dopo il secondo movimento e la rende persistente", () => {
    const explored = execute(postActState("farmacia"), "explore-pharmacy");
    expect(explored.ok).toBe(true);
    if (!explored.ok) {
      return;
    }
    const bell = execute(explored.state, "use-pharmacy-bell");
    expect(bell.ok).toBe(true);
    if (!bell.ok) {
      return;
    }
    const anomaly = execute(bell.state, "observe-pharmacy-bell-second-motion");
    expect(anomaly.ok).toBe(true);
    if (!anomaly.ok) {
      return;
    }

    expect(anomaly.discoveredAnomalyIds).toEqual([
      "pharmacy_bell_second_motion",
    ]);
    expect(anomaly.state.progression.discoveredAnomalies).toContain(
      "pharmacy_bell_second_motion",
    );
    const reset = resetGameLoop({
      ...anomaly.state,
      run: { ...anomaly.state.run, remainingSeconds: 0 },
    });
    expect(
      createArchiveViewModel(reset).anomalies.map(({ id }) => id),
    ).toContain("pharmacy_bell_second_motion");
  });

  it("espone la rare solo nei loop multipli di 7 e nella finestra 135–180", () => {
    const loopSix = postActState("stazione", { loopNumber: 6 });
    const loopSeven = postActState("stazione", { loopNumber: 7 });
    const loopFourteen = postActState("stazione", { loopNumber: 14 });

    expect(availableIds(loopSix, 150)).not.toContain(
      "observe-station-display-out-of-time",
    );
    expect(availableIds(loopSeven, 134)).not.toContain(
      "observe-station-display-out-of-time",
    );
    expect(availableIds(loopSeven, 135)).toContain(
      "observe-station-display-out-of-time",
    );
    expect(availableIds(loopSeven, 179)).toContain(
      "observe-station-display-out-of-time",
    );
    expect(availableIds(loopSeven, 180)).not.toContain(
      "observe-station-display-out-of-time",
    );
    expect(availableIds(loopFourteen, 150)).toContain(
      "observe-station-display-out-of-time",
    );
  });

  it("non anticipa la rare e la registra tramite la normale azione Osserva", () => {
    const eligible = postActState("stazione", {
      loopNumber: 7,
      remainingSeconds: 150,
    });
    const interaction = getAvailableInteractions(eligible, 150, TODAY).find(
      ({ id }) => id === "observe-station-display-out-of-time",
    );

    expect(interaction?.actionType).toBe("observe");
    expect(interaction?.label).toBe("Osserva il display");

    const result = execute(eligible, "observe-station-display-out-of-time");
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.discoveredAnomalyIds).toEqual([
      "station_display_out_of_time",
    ]);
    expect(
      execute(result.state, "observe-station-display-out-of-time").ok,
    ).toBe(false);
  });

  it("registra una scoperta esattamente al confine del reset", () => {
    const state = postActState("piazza", { remainingSeconds: 5 });
    const result = execute(state, "observe-piazza-blue-flicker");
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.ended).toBe(true);
    expect(result.state.run.remainingSeconds).toBe(0);
    expect(result.state.progression.discoveredAnomalies).toContain(
      "piazza_blue_flicker",
    );
  });
});

describe("persistenza e Archivio", () => {
  it("salva e ricarica le anomalie senza modificare lo schema V1", async () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      removeItem: (key: string) => values.delete(key),
      setItem: (key: string, value: string) => values.set(key, value),
    };
    const adapter = new LocalSaveAdapter(storage);
    const state = ANOMALY_DEFINITIONS.reduce(
      (current, definition) => discoverAnomaly(current, definition.id).state,
      postActState(),
    );

    await adapter.save(state);
    const loaded = await adapter.load(TODAY);

    expect(values.has(LOCAL_SAVE_KEY)).toBe(true);
    expect(loaded?.progression.discoveredAnomalies).toEqual(
      ANOMALY_DEFINITIONS.map(({ id }) => id),
    );
    expect(loaded?.schemaVersion).toBe(GAME_STATE_SCHEMA_VERSION);
    expect(GAME_STATE_SCHEMA_VERSION).toBe(5);
  });

  it("unisce e deduplica le discovery locali e cloud senza cambiare il run", () => {
    const local = discoverAnomaly(postActState(), "piazza_blue_flicker").state;
    const remote = discoverAnomaly(
      postActState(),
      "pharmacy_bell_second_motion",
    ).state;
    const merged = mergeGameStates(local, remote, {
      currentDateKey: TODAY,
    }).state;

    expect(merged.progression.discoveredAnomalies).toEqual([
      "piazza_blue_flicker",
      "pharmacy_bell_second_motion",
    ]);
    expect(merged.run.currentActId).toBe(1);
    expect(merged.progression.actGate.nextActAvailableOn).toBe(TOMORROW);
  });

  it("mostra in Archivio solo le anomalie note scoperte, da 0 a 3", () => {
    let state = postActState();
    expect(createArchiveViewModel(state).anomalies).toEqual([]);

    for (const [index, definition] of ANOMALY_DEFINITIONS.entries()) {
      state = discoverAnomaly(state, definition.id).state;
      const entries = createArchiveViewModel(state).anomalies;
      expect(entries).toHaveLength(index + 1);
      expect(entries.at(-1)).toEqual({
        description: definition.description,
        facts: [
          `Luogo: ${definition.locationId === "piazza" ? "Piazza" : definition.locationId === "farmacia" ? "Farmacia" : "Stazione"}`,
        ],
        id: definition.id,
        title: definition.title,
      });
    }

    const withUnknown = {
      ...state,
      progression: {
        ...state.progression,
        discoveredAnomalies: [
          ...state.progression.discoveredAnomalies,
          "future-spoiler",
        ],
      },
    };
    expect(createArchiveViewModel(withUnknown).anomalies).toHaveLength(3);
    expect(getAnomalyDefinition("future-spoiler")).toBeUndefined();
  });
});
