import type { CharacterId } from "@/game/content/characters";
import type { GameCondition } from "@/game/engine/conditions";
import type { LocationId } from "@/game/state/types";

export type InteractionAction =
  | "explore"
  | "follow"
  | "observe"
  | "talk"
  | "use";

export type InteractionEffect =
  | { knowledgeId: string; type: "acquire-knowledge" }
  | { clueId: string; type: "discover-clue" }
  | { key: string; type: "set-run-flag"; value: boolean }
  | { locationId: LocationId; type: "set-location" };

export type InteractionDefinition = {
  actionType: InteractionAction;
  characterId?: CharacterId;
  conditions: GameCondition[];
  dialogueId?: string;
  effects: InteractionEffect[];
  id: string;
  label: string;
  result: string;
  timeCost: number;
};

export const INTERACTION_DEFINITIONS: InteractionDefinition[] = [
  {
    actionType: "explore",
    conditions: [{ locationId: "piazza", type: "location" }],
    effects: [
      { key: "interaction:square-explored", type: "set-run-flag", value: true },
    ],
    id: "explore-square",
    label: "Esplora la piazza",
    result: "Sotto i portici la pioggia copre quasi ogni rumore.",
    timeCost: 7,
  },
  {
    actionType: "explore",
    conditions: [{ locationId: "farmacia", type: "location" }],
    effects: [
      { clueId: "pharmacy_wet_footprints", type: "discover-clue" },
      {
        key: "interaction:pharmacy-explored",
        type: "set-run-flag",
        value: true,
      },
    ],
    id: "explore-pharmacy",
    label: "Esplora la farmacia",
    result: "Vicino al banco noti una fila di impronte ancora bagnate.",
    timeCost: 8,
  },
  {
    actionType: "explore",
    conditions: [{ locationId: "stazione", type: "location" }],
    effects: [
      {
        key: "interaction:station-explored",
        type: "set-run-flag",
        value: true,
      },
    ],
    id: "explore-station",
    label: "Esplora la stazione",
    result: "Il tabellone ripete lo stesso ritardo, poi torna vuoto.",
    timeCost: 8,
  },
  {
    actionType: "explore",
    conditions: [{ locationId: "vicolo", type: "location" }],
    effects: [
      { key: "interaction:alley-explored", type: "set-run-flag", value: true },
    ],
    id: "explore-alley",
    label: "Esplora il vicolo",
    result: "L'acqua corre verso una grata ostruita dalle foglie.",
    timeCost: 7,
  },
  {
    actionType: "observe",
    characterId: "elena",
    conditions: [
      { locationId: "farmacia", type: "location" },
      { characterId: "elena", type: "character-present" },
      {
        fromElapsedSecond: 120,
        toElapsedSecond: 180,
        type: "elapsed-window",
      },
    ],
    effects: [
      {
        knowledgeId: "elena_enters_pharmacy_2357",
        type: "acquire-knowledge",
      },
    ],
    id: "observe-elena-entry",
    label: "Osserva Elena",
    result: "Alle 23:57 Elena entra nella farmacia e rimane oltre la vetrina.",
    timeCost: 5,
  },
  {
    actionType: "talk",
    characterId: "pharmacist",
    conditions: [
      { locationId: "farmacia", type: "location" },
      { characterId: "pharmacist", type: "character-present" },
    ],
    dialogueId: "pharmacist-greeting",
    effects: [],
    id: "talk-pharmacist",
    label: "Parla con il Farmacista",
    result: "Il farmacista alza lo sguardo dal banco.",
    timeCost: 0,
  },
  {
    actionType: "follow",
    characterId: "elena",
    conditions: [
      { locationId: "piazza", type: "location" },
      { characterId: "elena", type: "character-present" },
      {
        fromElapsedSecond: 105,
        toElapsedSecond: 120,
        type: "elapsed-window",
      },
    ],
    effects: [{ locationId: "farmacia", type: "set-location" }],
    id: "follow-elena",
    label: "Segui Elena",
    result: "Segui Elena sotto i portici fino alla farmacia.",
    timeCost: 15,
  },
  {
    actionType: "use",
    conditions: [
      { locationId: "farmacia", type: "location" },
      {
        key: "interaction:pharmacy-explored",
        type: "run-flag",
        value: true,
      },
    ],
    effects: [
      { key: "interaction:bell-used", type: "set-run-flag", value: true },
    ],
    id: "use-pharmacy-bell",
    label: "Usa il campanello",
    result:
      "Il campanello emette un suono secco. Nessuno lascia il proprio posto.",
    timeCost: 3,
  },
];

export function getInteractionDefinition(id: string) {
  return INTERACTION_DEFINITIONS.find((definition) => definition.id === id);
}
