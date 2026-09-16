import {
  CHARACTER_DEFINITIONS,
  type CharacterDefinition,
  type CharacterId,
} from "@/game/content/characters";
import { CHARACTER_ROUTINES, type RoutineStep } from "@/game/content/routines";
import type { GameState, LocationId } from "@/game/state/types";

export type ResolvedCharacter = {
  activity: string;
  id: CharacterId;
  locationId: LocationId | null;
  name: string;
};

function conditionPasses(state: GameState, step: RoutineStep) {
  return (
    !step.condition ||
    state.run.runFlags[step.condition.key] === step.condition.value
  );
}

export function resolveCharacter(
  definition: CharacterDefinition,
  state: GameState,
  elapsedSecond: number,
): ResolvedCharacter {
  const step = CHARACTER_ROUTINES[definition.routineId]
    .filter(
      (candidate) =>
        candidate.atElapsedSecond <= elapsedSecond &&
        conditionPasses(state, candidate),
    )
    .sort(
      (left, right) =>
        right.atElapsedSecond - left.atElapsedSecond ||
        (right.priority ?? 0) - (left.priority ?? 0),
    )[0];

  return {
    activity: step?.activity ?? "Non è visibile.",
    id: definition.id,
    locationId: step?.locationId ?? null,
    name: definition.name,
  };
}

export function getCharactersAtLocation(
  state: GameState,
  locationId: LocationId,
  elapsedSecond: number,
) {
  return CHARACTER_DEFINITIONS.map((definition) =>
    resolveCharacter(definition, state, elapsedSecond),
  ).filter((character) => character.locationId === locationId);
}
