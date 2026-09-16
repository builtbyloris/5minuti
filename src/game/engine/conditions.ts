import type { CharacterId } from "@/game/content/characters";
import { hasPersistence } from "@/game/engine/persistences";
import { getCharactersAtLocation } from "@/game/engine/routines";
import type { GameState, LocationId } from "@/game/state/types";

export type GameCondition =
  | { actId: number; type: "act-is" }
  | { actId: number; has: boolean; type: "act-completed" }
  | { locationId: LocationId; type: "location" }
  | { characterId: CharacterId; type: "character-present" }
  | { clueId: string; has: boolean; type: "clue" }
  | { has: boolean; knowledgeId: string; type: "knowledge" }
  | { has: boolean; persistenceId: string; type: "persistence" }
  | { has: boolean; secretId: string; type: "secret" }
  | { key: string; type: "run-flag"; value: boolean }
  | { key: string; type: "world-flag"; value: boolean }
  | { active: boolean; id: string; type: "subscene" }
  | {
      fromElapsedSecond: number;
      toElapsedSecond: number;
      type: "elapsed-window";
    };

export function evaluateCondition(
  state: GameState,
  condition: GameCondition,
  elapsedSecond: number,
) {
  switch (condition.type) {
    case "act-is":
      return (
        state.run.currentActId === condition.actId &&
        !state.progression.completedActs.includes(condition.actId)
      );
    case "act-completed":
      return (
        state.progression.completedActs.includes(condition.actId) ===
        condition.has
      );
    case "location":
      return state.run.currentLocationId === condition.locationId;
    case "character-present":
      return getCharactersAtLocation(
        state,
        state.run.currentLocationId,
        elapsedSecond,
      ).some((character) => character.id === condition.characterId);
    case "knowledge":
      return (
        state.progression.knowledge.includes(condition.knowledgeId) ===
        condition.has
      );
    case "clue":
      return (
        state.progression.discoveredClues.includes(condition.clueId) ===
        condition.has
      );
    case "persistence":
      return hasPersistence(state, condition.persistenceId) === condition.has;
    case "secret":
      return (
        state.progression.discoveredSecrets.includes(condition.secretId) ===
        condition.has
      );
    case "run-flag":
      return state.run.runFlags[condition.key] === condition.value;
    case "world-flag":
      return state.world.flags[condition.key] === condition.value;
    case "subscene":
      return (
        (state.run.runFlags[`subscene:${condition.id}`] === true) ===
        condition.active
      );
    case "elapsed-window":
      return (
        elapsedSecond >= condition.fromElapsedSecond &&
        elapsedSecond < condition.toElapsedSecond
      );
  }
}

export function conditionsPass(
  state: GameState,
  conditions: GameCondition[] = [],
  elapsedSecond: number,
) {
  return conditions.every((condition) =>
    evaluateCondition(state, condition, elapsedSecond),
  );
}
