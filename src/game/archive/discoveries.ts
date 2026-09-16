import {
  CHARACTER_DEFINITIONS,
  type CharacterId,
} from "@/game/content/characters";
import { CITY_LOCATIONS } from "@/game/content/locations";
import { getActiveSubscene } from "@/game/content/subscenes";
import { getCharactersAtLocation } from "@/game/engine/routines";
import type { GameState, LocationId } from "@/game/state/types";

const VALID_PERSON_IDS = new Set(
  CHARACTER_DEFINITIONS.map((character) => character.id),
);
const VALID_LOCATION_IDS = new Set(
  CITY_LOCATIONS.map((location) => location.id),
);

function appendUnique(values: string[], id: string) {
  return values.includes(id) ? values : [...values, id];
}

export function discoverPerson(state: GameState, personId: CharacterId) {
  if (!VALID_PERSON_IDS.has(personId)) {
    return state;
  }

  const discoveredPeople = appendUnique(
    state.progression.discoveredPeople,
    personId,
  );

  return discoveredPeople === state.progression.discoveredPeople
    ? state
    : {
        ...state,
        progression: { ...state.progression, discoveredPeople },
      };
}

export function discoverLocation(state: GameState, locationId: LocationId) {
  if (!VALID_LOCATION_IDS.has(locationId)) {
    return state;
  }

  const discoveredLocations = appendUnique(
    state.progression.discoveredLocations,
    locationId,
  );

  return discoveredLocations === state.progression.discoveredLocations
    ? state
    : {
        ...state,
        progression: { ...state.progression, discoveredLocations },
      };
}

export function syncVisiblePeople(state: GameState, elapsedSecond: number) {
  const activeSubscene = getActiveSubscene(state);
  const visiblePeople = getCharactersAtLocation(
    state,
    state.run.currentLocationId,
    elapsedSecond,
  ).filter(
    (character) =>
      !activeSubscene ||
      activeSubscene.visibleCharacterIds.includes(character.id),
  );

  return visiblePeople.reduce(
    (nextState, character) => discoverPerson(nextState, character.id),
    state,
  );
}

export function reconcileArchiveDiscoveries(state: GameState) {
  const discoveredPeople = [
    ...new Set(state.progression.discoveredPeople),
  ].filter((id) => VALID_PERSON_IDS.has(id as CharacterId));
  const discoveredLocations = [
    ...new Set(["piazza", ...state.progression.discoveredLocations]),
  ].filter((id) => VALID_LOCATION_IDS.has(id));
  const unchanged =
    discoveredPeople.length === state.progression.discoveredPeople.length &&
    discoveredPeople.every(
      (id, index) => id === state.progression.discoveredPeople[index],
    ) &&
    discoveredLocations.length ===
      state.progression.discoveredLocations.length &&
    discoveredLocations.every(
      (id, index) => id === state.progression.discoveredLocations[index],
    );

  return unchanged
    ? state
    : {
        ...state,
        progression: {
          ...state.progression,
          discoveredLocations,
          discoveredPeople,
        },
      };
}
