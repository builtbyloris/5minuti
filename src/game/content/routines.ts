import type { CharacterId } from "@/game/content/characters";
import type { LocationId } from "@/game/state/types";

export type RoutineStep = {
  activity: string;
  atElapsedSecond: number;
  condition?: { key: string; value: boolean };
  locationId: LocationId | null;
  priority?: number;
};

export const CHARACTER_ROUTINES: Record<CharacterId, RoutineStep[]> = {
  elena: [
    {
      activity: "Attraversa la piazza in direzione della farmacia.",
      atElapsedSecond: 0,
      locationId: "piazza",
    },
    {
      activity: "Raggiunge la porta della farmacia.",
      atElapsedSecond: 105,
      locationId: "piazza",
    },
    {
      activity: "Entra nella farmacia e resta oltre la vetrina.",
      atElapsedSecond: 120,
      locationId: "farmacia",
    },
    {
      activity: "Resta immobile oltre la vetrina, nel buio.",
      atElapsedSecond: 180,
      locationId: "farmacia",
    },
  ],
  "red-man": [
    {
      activity: "Osserva il binario senza guardare l'orologio.",
      atElapsedSecond: 0,
      locationId: "stazione",
    },
    {
      activity: "Attraversa i portici, seguendo la direzione di Elena.",
      atElapsedSecond: 45,
      locationId: "piazza",
    },
    {
      activity: "Si ferma sotto la pensilina, davanti alla farmacia.",
      atElapsedSecond: 100,
      locationId: "farmacia",
    },
    {
      activity: "Devia nel vicolo e sparisce dietro l'angolo.",
      atElapsedSecond: 100,
      condition: { key: "perturbation:red-man-diverted", value: true },
      locationId: "vicolo",
      priority: 1,
    },
    {
      activity: "Non è più visibile dopo il blackout.",
      atElapsedSecond: 180,
      locationId: null,
    },
  ],
  pharmacist: [
    {
      activity: "Sistema alcune confezioni dietro il banco.",
      atElapsedSecond: 0,
      locationId: "farmacia",
    },
    {
      activity: "Controlla qualcosa nel retrobottega.",
      atElapsedSecond: 90,
      locationId: "farmacia",
    },
    {
      activity: "Torna al banco e osserva la porta.",
      atElapsedSecond: 150,
      locationId: "farmacia",
    },
    {
      activity: "Resta dietro il banco, illuminato dalla luce d'emergenza.",
      atElapsedSecond: 180,
      locationId: "farmacia",
    },
  ],
  controller: [
    {
      activity: "Controlla il binario e il tabellone degli arrivi.",
      atElapsedSecond: 0,
      locationId: "stazione",
    },
    {
      activity: "Si allontana lungo la banchina.",
      atElapsedSecond: 70,
      locationId: "stazione",
    },
    {
      activity: "È fuori vista, oltre la pensilina.",
      atElapsedSecond: 110,
      locationId: null,
    },
    {
      activity: "Ricompare accanto all'orologio fermo.",
      atElapsedSecond: 210,
      locationId: "stazione",
    },
  ],
};
