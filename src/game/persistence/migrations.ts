import { validateGameState } from "@/game/persistence/save-schema";
import { GAME_STATE_SCHEMA_VERSION, type GameState } from "@/game/state/types";

type Migration = (value: unknown) => unknown;

// A migration stored at key N converts schema N to schema N + 1.
const migrations: Partial<Record<number, Migration>> = {
  1: (value) => {
    if (
      typeof value !== "object" ||
      value === null ||
      !("progression" in value) ||
      typeof value.progression !== "object" ||
      value.progression === null
    ) {
      return value;
    }

    return {
      ...value,
      progression: {
        ...value.progression,
        discoveredClues: [],
      },
      schemaVersion: 2,
    };
  },
  2: (value) => {
    if (
      typeof value !== "object" ||
      value === null ||
      !("progression" in value) ||
      typeof value.progression !== "object" ||
      value.progression === null
    ) {
      return value;
    }

    return {
      ...value,
      progression: {
        ...value.progression,
        actGate: { nextActAvailableOn: null },
      },
      schemaVersion: 3,
    };
  },
  3: (value) => {
    if (
      typeof value !== "object" ||
      value === null ||
      !("progression" in value) ||
      typeof value.progression !== "object" ||
      value.progression === null
    ) {
      return value;
    }

    const progression = value.progression as Record<string, unknown>;
    const knowledge = Array.isArray(progression.knowledge)
      ? progression.knowledge.filter(
          (id): id is string => typeof id === "string",
        )
      : [];
    const clues = Array.isArray(progression.discoveredClues)
      ? progression.discoveredClues.filter(
          (id): id is string => typeof id === "string",
        )
      : [];
    const secrets = Array.isArray(progression.discoveredSecrets)
      ? progression.discoveredSecrets.filter(
          (id): id is string => typeof id === "string",
        )
      : [];
    const completedActs = Array.isArray(progression.completedActs)
      ? progression.completedActs.filter(
          (id): id is number => typeof id === "number",
        )
      : [];
    const persistences = Array.isArray(progression.persistences)
      ? progression.persistences
      : [];
    const persistenceIds = persistences.flatMap((entry) =>
      typeof entry === "object" &&
      entry !== null &&
      "id" in entry &&
      typeof entry.id === "string"
        ? [entry.id]
        : [],
    );
    const hasAny = (values: string[], evidence: string[]) =>
      evidence.some((id) => values.includes(id));

    const discoveredLocations = ["piazza"];
    const currentLocationId =
      "run" in value &&
      typeof value.run === "object" &&
      value.run !== null &&
      "currentLocationId" in value.run &&
      typeof value.run.currentLocationId === "string"
        ? value.run.currentLocationId
        : null;
    if (
      currentLocationId &&
      ["farmacia", "stazione", "vicolo"].includes(currentLocationId)
    ) {
      discoveredLocations.push(currentLocationId);
    }
    if (
      hasAny(knowledge, [
        "elena_enters_pharmacy_2357",
        "pharmacy_has_basement",
        "echo_symbol_seen",
        "elena_recognizes_echo",
      ]) ||
      hasAny(clues, [
        "pharmacy_wet_footprints",
        "basement_infrastructure",
        "red_man_reaches_elena_before_blackout",
      ]) ||
      completedActs.some((id) => id >= 1)
    ) {
      if (!discoveredLocations.includes("farmacia")) {
        discoveredLocations.push("farmacia");
      }
    }
    if (
      persistenceIds.includes("station_token_shifted") ||
      secrets.includes("station_red_marks")
    ) {
      if (!discoveredLocations.includes("stazione")) {
        discoveredLocations.push("stazione");
      }
    }

    const discoveredPeople: string[] = [];
    if (
      hasAny(knowledge, [
        "elena_enters_pharmacy_2357",
        "elena_recognizes_echo",
      ]) ||
      completedActs.some((id) => id === 1 || id === 2)
    ) {
      discoveredPeople.push("elena");
    }
    if (
      knowledge.includes("red_man_knows_player") ||
      clues.includes("red_man_reaches_elena_before_blackout") ||
      completedActs.includes(3)
    ) {
      discoveredPeople.push("red-man");
    }
    if (persistenceIds.includes("pharmacist_residual_wariness")) {
      discoveredPeople.push("pharmacist");
    }

    return {
      ...value,
      progression: {
        ...progression,
        discoveredLocations,
        discoveredPeople,
      },
      schemaVersion: 4,
    };
  },
};

export function getSaveSchemaVersion(value: unknown) {
  if (
    typeof value !== "object" ||
    value === null ||
    !("schemaVersion" in value) ||
    typeof value.schemaVersion !== "number" ||
    !Number.isInteger(value.schemaVersion)
  ) {
    return null;
  }

  return value.schemaVersion;
}

export function migrateSave(value: unknown): GameState | null {
  let candidate = value;
  let version = getSaveSchemaVersion(candidate);

  if (version === null || version > GAME_STATE_SCHEMA_VERSION) {
    return null;
  }

  while (version < GAME_STATE_SCHEMA_VERSION) {
    const migrate = migrations[version];

    if (!migrate) {
      return null;
    }

    candidate = migrate(candidate);
    version = getSaveSchemaVersion(candidate);

    if (version === null) {
      return null;
    }
  }

  return validateGameState(candidate);
}
