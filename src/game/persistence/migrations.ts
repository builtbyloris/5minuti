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
