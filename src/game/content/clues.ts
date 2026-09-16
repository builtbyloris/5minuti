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
  {
    description:
      "Cavi, condotti schermati e componenti tecnici proseguono oltre i muri del seminterrato: non appartengono a una normale farmacia.",
    id: "basement_infrastructure",
    locationId: "farmacia",
    title: "Infrastruttura sotterranea",
  },
  {
    description:
      "L'Uomo in Rosso attraversa la città per raggiungere Elena alla farmacia prima del blackout delle 23:58.",
    id: "red_man_reaches_elena_before_blackout",
    locationId: "farmacia",
    title: "Una corsa prima del blackout",
  },
];

export function getClueDefinition(id: string) {
  return CLUE_DEFINITIONS.find((definition) => definition.id === id);
}
