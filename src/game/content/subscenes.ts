import type { CharacterId } from "@/game/content/characters";
import type { LocationId } from "@/game/state/types";

export type SubsceneDefinition = {
  atmosphere: string;
  description: string;
  id: string;
  locationId: LocationId;
  title: string;
  visibleCharacterIds: CharacterId[];
};

export const SUBSCENE_DEFINITIONS: SubsceneDefinition[] = [
  {
    atmosphere: "Cemento umido, cavi e un ronzio oltre le pareti.",
    description:
      "Una scala stretta conduce sotto il retrobottega. Le strutture qui non appartengono alla farmacia.",
    id: "pharmacy-basement",
    locationId: "farmacia",
    title: "Sotto la farmacia",
    visibleCharacterIds: ["elena"],
  },
];

export function getActiveSubsceneId(state: {
  run: { runFlags: Record<string, boolean> };
}) {
  return (
    SUBSCENE_DEFINITIONS.find(
      (definition) => state.run.runFlags[`subscene:${definition.id}`] === true,
    )?.id ?? null
  );
}

export function getActiveSubscene(state: {
  run: { runFlags: Record<string, boolean> };
}) {
  const id = getActiveSubsceneId(state);
  return (
    SUBSCENE_DEFINITIONS.find((definition) => definition.id === id) ?? null
  );
}
