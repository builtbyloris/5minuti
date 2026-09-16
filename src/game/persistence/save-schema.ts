import {
  GAME_STATE_SCHEMA_VERSION,
  type GameState,
  type PersistenceState,
} from "@/game/state/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}

function isNumberArray(value: unknown): value is number[] {
  return (
    Array.isArray(value) &&
    value.every((item) => Number.isInteger(item) && item > 0)
  );
}

function isBooleanRecord(value: unknown): value is Record<string, boolean> {
  return (
    isRecord(value) &&
    Object.values(value).every((item) => typeof item === "boolean")
  );
}

function isRelationshipRecord(
  value: unknown,
): value is GameState["progression"]["relationships"] {
  const states = ["unknown", "neutral", "trusted", "hostile"];

  return (
    isRecord(value) &&
    Object.values(value).every(
      (item) => typeof item === "string" && states.includes(item),
    )
  );
}

function isPersistence(value: unknown): value is PersistenceState {
  if (!isRecord(value)) {
    return false;
  }

  const validTypes = ["physical", "relationship", "world", "temporary"];

  return (
    typeof value.id === "string" &&
    typeof value.active === "boolean" &&
    typeof value.type === "string" &&
    validTypes.includes(value.type) &&
    (value.remainingLoops === undefined ||
      (typeof value.remainingLoops === "number" &&
        Number.isInteger(value.remainingLoops) &&
        value.remainingLoops >= 0))
  );
}

export function validateGameState(value: unknown): GameState | null {
  if (!isRecord(value) || value.schemaVersion !== GAME_STATE_SCHEMA_VERSION) {
    return null;
  }

  const { metadata, player, progression, run, settings, world } = value;

  if (
    !isRecord(player) ||
    typeof player.id !== "string" ||
    player.id.length === 0 ||
    player.mode !== "guest"
  ) {
    return null;
  }

  if (
    !isRecord(run) ||
    typeof run.currentActId !== "number" ||
    !Number.isInteger(run.currentActId) ||
    run.currentActId < 1 ||
    typeof run.currentLocationId !== "string" ||
    run.currentLocationId.length === 0 ||
    typeof run.loopNumber !== "number" ||
    !Number.isInteger(run.loopNumber) ||
    run.loopNumber < 1 ||
    typeof run.remainingSeconds !== "number" ||
    !Number.isInteger(run.remainingSeconds) ||
    run.remainingSeconds < 0 ||
    run.remainingSeconds > 300 ||
    !isBooleanRecord(run.runFlags)
  ) {
    return null;
  }

  if (
    !isRecord(progression) ||
    !isRecord(progression.actGate) ||
    (progression.actGate.nextActAvailableOn !== null &&
      (typeof progression.actGate.nextActAvailableOn !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(progression.actGate.nextActAvailableOn))) ||
    !isNumberArray(progression.completedActs) ||
    !isStringArray(progression.knowledge) ||
    !Array.isArray(progression.persistences) ||
    !progression.persistences.every(isPersistence) ||
    !isStringArray(progression.discoveredClues) ||
    !isStringArray(progression.discoveredLocations) ||
    !isStringArray(progression.discoveredPeople) ||
    !isStringArray(progression.discoveredSecrets) ||
    !isStringArray(progression.discoveredAnomalies) ||
    !isRelationshipRecord(progression.relationships)
  ) {
    return null;
  }

  if (!isRecord(world) || !isBooleanRecord(world.flags)) {
    return null;
  }

  if (
    !isRecord(settings) ||
    !["system", "reduce", "full"].includes(String(settings.reducedMotion)) ||
    typeof settings.subtitles !== "boolean"
  ) {
    return null;
  }

  if (
    !isRecord(metadata) ||
    typeof metadata.createdAt !== "string" ||
    typeof metadata.updatedAt !== "string" ||
    typeof metadata.revision !== "number" ||
    !Number.isInteger(metadata.revision) ||
    metadata.revision < 1 ||
    !isRecord(metadata.introduction) ||
    !["pending", "completed"].includes(String(metadata.introduction.status)) ||
    (metadata.introduction.completedAt !== null &&
      typeof metadata.introduction.completedAt !== "string") ||
    (metadata.introduction.status === "completed" &&
      typeof metadata.introduction.completedAt !== "string")
  ) {
    return null;
  }

  return value as GameState;
}
