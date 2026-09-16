export type SecretDefinition = {
  description: string;
  id: string;
  locationId: string;
  title: string;
  unlockedAfterAct: number;
};

export const SECRET_DEFINITIONS: SecretDefinition[] = [
  {
    description:
      "Uno scontrino delle 23:55 è rimasto sotto il registratore, senza alcun acquisto registrato.",
    id: "pharmacy_blank_receipt",
    locationId: "farmacia",
    title: "Lo scontrino vuoto",
    unlockedAfterAct: 1,
  },
  {
    description:
      "Una striscia di polvere asciutta interrompe l'umidità del seminterrato lungo una parete cieca.",
    id: "basement_dry_line",
    locationId: "farmacia",
    title: "La linea asciutta",
    unlockedAfterAct: 2,
  },
  {
    description:
      "Sul retro dell'orario ferroviario qualcuno ha tracciato tre piccoli segni rossi, poi li ha cancellati.",
    id: "station_red_marks",
    locationId: "stazione",
    title: "Tre segni rossi",
    unlockedAfterAct: 3,
  },
];

export function getSecretDefinition(id: string) {
  return SECRET_DEFINITIONS.find((definition) => definition.id === id);
}
