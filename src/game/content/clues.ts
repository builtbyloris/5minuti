export type ClueDefinition = {
  description: string;
  id: string;
  locationId: string;
  title: string;
};

export const CLUE_DEFINITIONS: ClueDefinition[] = [
  {
    description:
      "Impronte bagnate attraversano la farmacia e si interrompono davanti alla porta riservata al personale.",
    id: "pharmacy_wet_footprints",
    locationId: "farmacia",
    title: "Impronte nella farmacia",
  },
];

export function getClueDefinition(id: string) {
  return CLUE_DEFINITIONS.find((definition) => definition.id === id);
}
