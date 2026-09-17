import { describe, expect, it } from "vitest";
import {
  discoverLocation,
  discoverPerson,
  reconcileArchiveDiscoveries,
  syncVisiblePeople,
} from "@/game/archive/discoveries";
import { createArchiveViewModel } from "@/game/archive/view-model";
import { migrateSave } from "@/game/persistence/migrations";
import { createInitialGameState } from "@/game/state/initial-state";

function progressedState() {
  const initial = createInitialGameState({
    id: "guest-archive",
    now: "2026-09-16T08:00:00.000Z",
  });

  return {
    ...initial,
    metadata: {
      ...initial.metadata,
      introduction: {
        completedAt: "2026-09-16T08:01:00.000Z",
        status: "completed" as const,
      },
    },
  };
}

describe("discovery Archivio", () => {
  it("parte soltanto dalla Piazza e registra persone e luoghi una sola volta", () => {
    const state = progressedState();
    const withPharmacy = discoverLocation(state, "farmacia");
    const samePharmacy = discoverLocation(withPharmacy, "farmacia");
    const withElena = discoverPerson(samePharmacy, "elena");
    const sameElena = discoverPerson(withElena, "elena");

    expect(state.progression.discoveredLocations).toEqual(["piazza"]);
    expect(withPharmacy.progression.discoveredLocations).toEqual([
      "piazza",
      "farmacia",
    ]);
    expect(samePharmacy).toBe(withPharmacy);
    expect(withElena.progression.discoveredPeople).toEqual(["elena"]);
    expect(sameElena).toBe(withElena);
  });

  it("registra soltanto gli NPC realmente visibili nella scena corrente", () => {
    const state = progressedState();
    const square = syncVisiblePeople(state, 0);
    const stationState = {
      ...square,
      run: { ...square.run, currentLocationId: "stazione" },
    };
    const station = syncVisiblePeople(stationState, 20);

    expect(square.progression.discoveredPeople).toEqual(["elena"]);
    expect(station.progression.discoveredPeople).toEqual([
      "elena",
      "red-man",
      "controller",
    ]);
  });

  it("riconcilia duplicati e ID ignoti senza invalidare il resto del save", () => {
    const state = progressedState();
    const dirty = {
      ...state,
      progression: {
        ...state.progression,
        discoveredLocations: ["piazza", "farmacia", "farmacia", "futuro"],
        discoveredPeople: ["elena", "elena", "subject-03"],
      },
    };
    const reconciled = reconcileArchiveDiscoveries(dirty);

    expect(reconciled.progression.discoveredLocations).toEqual([
      "piazza",
      "farmacia",
    ]);
    expect(reconciled.progression.discoveredPeople).toEqual(["elena"]);
    expect(reconciled.player).toEqual(state.player);
  });
});

describe("ArchiveViewModel anti-spoiler", () => {
  it("con un save pulito espone solo Atto 1 e Piazza", () => {
    const archive = createArchiveViewModel(progressedState());
    const serialized = JSON.stringify(archive);

    expect(archive.acts.map((act) => act.id)).toEqual([1]);
    expect(archive.locations.map((location) => location.id)).toEqual([
      "piazza",
    ]);
    expect(archive.people).toEqual([]);
    expect(archive.clues).toEqual([]);
    expect(archive.secrets).toEqual([]);
    expect(archive.anomalies).toEqual([]);
    expect(serialized).not.toContain("ECHO");
    expect(serialized).not.toContain("Uomo in Rosso");
    expect(serialized).not.toContain("seminterrato");
    expect(serialized).not.toContain("Atto 2");
    expect(serialized).not.toContain("Soggetto");
  });

  it("evolve la scheda Elena soltanto con scoperte reali", () => {
    const seen = discoverPerson(progressedState(), "elena");
    const known = {
      ...seen,
      progression: {
        ...seen.progression,
        knowledge: ["elena_enters_pharmacy_2357"],
      },
    };
    const actOne = {
      ...known,
      progression: { ...known.progression, completedActs: [1] },
    };
    const actTwo = {
      ...actOne,
      progression: {
        ...actOne.progression,
        completedActs: [1, 2],
        knowledge: [...actOne.progression.knowledge, "elena_recognizes_echo"],
      },
    };

    expect(createArchiveViewModel(seen).people[0]?.facts).toEqual([
      "È stata vista dirigersi verso la Farmacia.",
    ]);
    expect(createArchiveViewModel(known).people[0]?.facts).toContain(
      "Entra nella Farmacia alle 23:57.",
    );
    expect(createArchiveViewModel(actOne).people[0]?.facts).toContain(
      "Cerca un accesso sotto la Farmacia.",
    );
    expect(createArchiveViewModel(actTwo).people[0]?.facts).toContain(
      "Riconosce il simbolo ECHO visto sotto la Farmacia.",
    );
  });

  it("evolve Uomo in Rosso senza mai rivelarne un'identità futura", () => {
    const seen = discoverPerson(progressedState(), "red-man");
    const clue = {
      ...seen,
      progression: {
        ...seen.progression,
        discoveredClues: ["red_man_reaches_elena_before_blackout"],
      },
    };
    const final = {
      ...clue,
      progression: {
        ...clue.progression,
        completedActs: [1, 2, 3],
        knowledge: ["red_man_knows_player"],
      },
    };
    const entry = createArchiveViewModel(final).people[0];

    expect(createArchiveViewModel(seen).people[0]?.facts).toHaveLength(1);
    expect(createArchiveViewModel(clue).people[0]?.facts).toContain(
      "Cerca di raggiungere Elena prima del blackout.",
    );
    expect(entry?.facts).toContain(
      "Sembra conoscere il protagonista: «Sei tornato troppo presto.»",
    );
    expect(JSON.stringify(entry)).not.toContain("Soggetto 03");
  });

  it("mostra dettagli della Farmacia solo dopo clue e knowledge corrispondenti", () => {
    const visited = discoverLocation(progressedState(), "farmacia");
    const base = createArchiveViewModel(visited).locations.find(
      (location) => location.id === "farmacia",
    );
    const informed = {
      ...visited,
      progression: {
        ...visited.progression,
        discoveredClues: ["pharmacy_wet_footprints", "basement_infrastructure"],
        knowledge: ["pharmacy_has_basement", "echo_symbol_seen"],
      },
    };
    const detailed = createArchiveViewModel(informed).locations.find(
      (location) => location.id === "farmacia",
    );

    expect(base?.facts).toEqual(["Resta aperta durante la finestra del loop."]);
    expect(JSON.stringify(base)).not.toContain("ECHO");
    expect(detailed?.facts).toContain(
      "Su un pannello sotterraneo è stato visto il simbolo ECHO.",
    );
  });

  it("deriva indizi, persistenze, segreti e anomalie esclusivamente dallo stato", () => {
    const state = progressedState();
    const full = {
      ...state,
      progression: {
        ...state.progression,
        discoveredAnomalies: ["observed-variation"],
        discoveredClues: ["pharmacy_wet_footprints", "unknown-clue"],
        discoveredSecrets: ["pharmacy_blank_receipt", "unknown-secret"],
        persistences: [
          {
            active: true,
            id: "pharmacist_residual_wariness",
            remainingLoops: 2,
            type: "relationship" as const,
          },
        ],
      },
    };
    const archive = createArchiveViewModel(full);

    expect(archive.clues.map((entry) => entry.id)).toEqual([
      "pharmacy_wet_footprints",
    ]);
    expect(archive.persistences[0]?.duration).toContain("2 loop residui");
    expect(archive.secrets.map((entry) => entry.id)).toEqual([
      "pharmacy_blank_receipt",
    ]);
    expect(archive.anomalies).toHaveLength(1);
    expect(archive.anomalies[0]?.title).toBe("Anomalia registrata");
  });

  it("mostra Fine V1 senza creare un Atto 4", () => {
    const state = progressedState();
    const final = {
      ...state,
      progression: { ...state.progression, completedActs: [1, 2, 3] },
      run: { ...state.run, currentActId: 3 },
    };
    const archive = createArchiveViewModel(final);

    expect(archive.acts.map((act) => act.id)).toEqual([1, 2, 3]);
    expect(archive.isV1Complete).toBe(true);
    expect(JSON.stringify(archive)).not.toContain("Atto 4");
  });
});

describe("migrazione Archivio v4", () => {
  it("migra v3 in modo conservativo preservando tutta la progressione", () => {
    const state = progressedState();
    const {
      discoveredLocations: _locations,
      discoveredPeople: _people,
      ...legacyProgression
    } = state.progression;
    const legacy = {
      ...state,
      progression: {
        ...legacyProgression,
        completedActs: [1, 2],
        discoveredAnomalies: ["existing-anomaly"],
        discoveredClues: ["pharmacy_wet_footprints", "basement_infrastructure"],
        discoveredSecrets: ["station_red_marks"],
        knowledge: ["elena_enters_pharmacy_2357", "elena_recognizes_echo"],
        persistences: [
          { active: true, id: "station_token_shifted", type: "physical" },
        ],
      },
      run: { ...state.run, loopNumber: 9 },
      schemaVersion: 3,
    };
    const migrated = migrateSave(legacy);

    expect(migrated?.schemaVersion).toBe(5);
    expect(migrated?.progression.discoveredLocations).toEqual([
      "piazza",
      "farmacia",
      "stazione",
    ]);
    expect(migrated?.progression.discoveredPeople).toEqual(["elena"]);
    expect(migrated?.progression.completedActs).toEqual([1, 2]);
    expect(migrated?.progression.discoveredAnomalies).toEqual([
      "existing-anomaly",
    ]);
    expect(migrated?.progression.discoveredSecrets).toEqual([
      "station_red_marks",
    ]);
    expect(migrated?.run.loopNumber).toBe(9);
    expect(migrated?.settings).toEqual(state.settings);
  });
});
