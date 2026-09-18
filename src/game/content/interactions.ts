import {
  PHARMACY_BELL_SECOND_MOTION_ANOMALY,
  PIAZZA_BLUE_FLICKER_ANOMALY,
  STATION_DISPLAY_OUT_OF_TIME_ANOMALY,
} from "@/game/content/anomalies";
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
  | { anomalyId: string; type: "discover-anomaly" }
  | { knowledgeId: string; type: "acquire-knowledge" }
  | { clueId: string; type: "discover-clue" }
  | { secretId: string; type: "discover-secret" }
  | { persistenceId: string; type: "grant-persistence" }
  | { persistenceId: string; type: "remove-persistence" }
  | { key: string; type: "set-run-flag"; value: boolean }
  | { active: boolean; id: string; type: "set-subscene" }
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
    actionType: "observe",
    conditions: PIAZZA_BLUE_FLICKER_ANOMALY.conditions,
    effects: [
      {
        anomalyId: PIAZZA_BLUE_FLICKER_ANOMALY.id,
        type: "discover-anomaly",
      },
    ],
    id: "observe-piazza-blue-flicker",
    label: "Osserva il lampione",
    result: "Per un istante, il lampione emette un impulso azzurro isolato.",
    timeCost: 5,
  },
  {
    actionType: "observe",
    conditions: PHARMACY_BELL_SECOND_MOTION_ANOMALY.conditions,
    effects: [
      {
        anomalyId: PHARMACY_BELL_SECOND_MOTION_ANOMALY.id,
        type: "discover-anomaly",
      },
    ],
    id: "observe-pharmacy-bell-second-motion",
    label: "Osserva il campanello",
    result: "Il campanello vibra una seconda volta senza essere toccato.",
    timeCost: 5,
  },
  {
    actionType: "observe",
    conditions: STATION_DISPLAY_OUT_OF_TIME_ANOMALY.conditions,
    effects: [
      {
        anomalyId: STATION_DISPLAY_OUT_OF_TIME_ANOMALY.id,
        type: "discover-anomaly",
      },
    ],
    id: "observe-station-display-out-of-time",
    label: "Osserva il display",
    result: "Il display mostra 23:55, poi torna subito all'orario corrente.",
    timeCost: 5,
  },
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
    conditions: [
      { locationId: "farmacia", type: "location" },
      { active: false, id: "pharmacy-basement", type: "subscene" },
    ],
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
    actionType: "use",
    conditions: [
      { locationId: "stazione", type: "location" },
      {
        key: "interaction:station-explored",
        type: "run-flag",
        value: true,
      },
      {
        has: false,
        persistenceId: "station_token_shifted",
        type: "persistence",
      },
    ],
    effects: [
      {
        persistenceId: "station_token_shifted",
        type: "grant-persistence",
      },
    ],
    id: "move-station-token",
    label: "Sposta il gettone",
    result: "Lasci il gettone sul bordo del muretto, lontano dalla panchina.",
    timeCost: 4,
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
      { active: false, id: "pharmacy-basement", type: "subscene" },
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
      { active: false, id: "pharmacy-basement", type: "subscene" },
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
      { active: false, id: "pharmacy-basement", type: "subscene" },
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
  {
    actionType: "explore",
    conditions: [
      { actId: 1, type: "act-is" },
      { locationId: "farmacia", type: "location" },
      { active: false, id: "pharmacy-basement", type: "subscene" },
      {
        has: true,
        knowledgeId: "elena_enters_pharmacy_2357",
        type: "knowledge",
      },
      { clueId: "pharmacy_wet_footprints", has: true, type: "clue" },
      {
        has: false,
        knowledgeId: "pharmacy_has_basement",
        type: "knowledge",
      },
    ],
    effects: [
      { knowledgeId: "pharmacy_has_basement", type: "acquire-knowledge" },
    ],
    id: "investigate-private-area",
    label: "Indaga la zona privata",
    result:
      "Dietro uno scaffale mobile trovi una scala che scende sotto la farmacia.",
    timeCost: 12,
  },
  {
    actionType: "use",
    conditions: [
      { actId: 1, has: true, type: "act-completed" },
      { locationId: "farmacia", type: "location" },
      { active: false, id: "pharmacy-basement", type: "subscene" },
      {
        has: true,
        knowledgeId: "pharmacy_has_basement",
        type: "knowledge",
      },
    ],
    effects: [{ active: true, id: "pharmacy-basement", type: "set-subscene" }],
    id: "enter-pharmacy-basement",
    label: "Scendi sotto la farmacia",
    result: "Richiudi lo scaffale dietro di te e scendi nel seminterrato.",
    timeCost: 5,
  },
  {
    actionType: "use",
    conditions: [
      { locationId: "farmacia", type: "location" },
      { active: true, id: "pharmacy-basement", type: "subscene" },
    ],
    effects: [{ active: false, id: "pharmacy-basement", type: "set-subscene" }],
    id: "exit-pharmacy-basement",
    label: "Torna al retrobottega",
    result: "Risali la scala e richiudi l'accesso.",
    timeCost: 5,
  },
  {
    actionType: "explore",
    conditions: [
      { actId: 2, type: "act-is" },
      { active: true, id: "pharmacy-basement", type: "subscene" },
      { clueId: "basement_infrastructure", has: false, type: "clue" },
    ],
    effects: [{ clueId: "basement_infrastructure", type: "discover-clue" }],
    id: "explore-basement-infrastructure",
    label: "Esplora l'infrastruttura",
    result:
      "Dietro l'intonaco corrono cavi schermati e condotti troppo grandi per l'edificio.",
    timeCost: 8,
  },
  {
    actionType: "observe",
    conditions: [
      { actId: 2, type: "act-is" },
      { active: true, id: "pharmacy-basement", type: "subscene" },
      { clueId: "basement_infrastructure", has: true, type: "clue" },
      { has: false, knowledgeId: "echo_symbol_seen", type: "knowledge" },
    ],
    effects: [{ knowledgeId: "echo_symbol_seen", type: "acquire-knowledge" }],
    id: "observe-echo-panel",
    label: "Osserva il pannello",
    result: "Sotto la polvere emerge un simbolo blu e una sola parola: ECHO.",
    timeCost: 7,
  },
  {
    actionType: "observe",
    characterId: "elena",
    conditions: [
      { actId: 2, type: "act-is" },
      { active: true, id: "pharmacy-basement", type: "subscene" },
      { characterId: "elena", type: "character-present" },
      { has: true, knowledgeId: "echo_symbol_seen", type: "knowledge" },
      {
        has: false,
        knowledgeId: "elena_recognizes_echo",
        type: "knowledge",
      },
      {
        fromElapsedSecond: 120,
        toElapsedSecond: 180,
        type: "elapsed-window",
      },
    ],
    effects: [
      { knowledgeId: "elena_recognizes_echo", type: "acquire-knowledge" },
    ],
    id: "observe-elena-echo-reaction",
    label: "Osserva Elena",
    result:
      "Elena si ferma davanti al simbolo. Lo riconosce, poi controlla la scala alle sue spalle.",
    timeCost: 5,
  },
  {
    actionType: "follow",
    characterId: "red-man",
    conditions: [
      { actId: 3, type: "act-is" },
      { locationId: "stazione", type: "location" },
      { characterId: "red-man", type: "character-present" },
      {
        fromElapsedSecond: 0,
        toElapsedSecond: 45,
        type: "elapsed-window",
      },
    ],
    effects: [
      { locationId: "piazza", type: "set-location" },
      { key: "act3:tracking-red-man", type: "set-run-flag", value: true },
    ],
    id: "follow-red-man-from-station",
    label: "Segui l'Uomo in Rosso",
    result: "Lo segui dalla stazione fino ai portici della piazza.",
    timeCost: 45,
  },
  {
    actionType: "follow",
    characterId: "red-man",
    conditions: [
      { actId: 3, type: "act-is" },
      { locationId: "piazza", type: "location" },
      { characterId: "red-man", type: "character-present" },
      { key: "act3:tracking-red-man", type: "run-flag", value: true },
      {
        fromElapsedSecond: 45,
        toElapsedSecond: 100,
        type: "elapsed-window",
      },
    ],
    effects: [
      { locationId: "farmacia", type: "set-location" },
      {
        clueId: "red_man_reaches_elena_before_blackout",
        type: "discover-clue",
      },
    ],
    id: "follow-red-man-to-pharmacy",
    label: "Continua a seguirlo",
    result:
      "Non cerca una via d'uscita: punta alla farmacia, dove sta arrivando Elena.",
    timeCost: 55,
  },
  {
    actionType: "observe",
    characterId: "red-man",
    conditions: [
      { actId: 3, type: "act-is" },
      { locationId: "farmacia", type: "location" },
      { active: false, id: "pharmacy-basement", type: "subscene" },
      { characterId: "red-man", type: "character-present" },
      {
        fromElapsedSecond: 100,
        toElapsedSecond: 180,
        type: "elapsed-window",
      },
      {
        clueId: "red_man_reaches_elena_before_blackout",
        has: false,
        type: "clue",
      },
    ],
    effects: [
      {
        clueId: "red_man_reaches_elena_before_blackout",
        type: "discover-clue",
      },
    ],
    id: "observe-red-man-intercept",
    label: "Osserva l'Uomo in Rosso",
    result:
      "Controlla Elena oltre la vetrina e l'orologio: vuole raggiungerla prima del blackout.",
    timeCost: 5,
  },
  {
    actionType: "talk",
    characterId: "red-man",
    conditions: [
      { actId: 3, type: "act-is" },
      { locationId: "farmacia", type: "location" },
      { active: false, id: "pharmacy-basement", type: "subscene" },
      { characterId: "red-man", type: "character-present" },
      {
        clueId: "red_man_reaches_elena_before_blackout",
        has: true,
        type: "clue",
      },
      {
        fromElapsedSecond: 100,
        toElapsedSecond: 180,
        type: "elapsed-window",
      },
    ],
    dialogueId: "red-man-confrontation",
    effects: [],
    id: "confront-red-man",
    label: "Ferma l'Uomo in Rosso",
    result: "L'Uomo in Rosso si volta prima che tu possa chiamarlo.",
    timeCost: 0,
  },
  {
    actionType: "explore",
    conditions: [
      { actId: 1, has: true, type: "act-completed" },
      { locationId: "farmacia", type: "location" },
      { active: false, id: "pharmacy-basement", type: "subscene" },
      { has: false, secretId: "pharmacy_blank_receipt", type: "secret" },
    ],
    effects: [{ secretId: "pharmacy_blank_receipt", type: "discover-secret" }],
    id: "find-pharmacy-secret",
    label: "Controlla il registratore",
    result: "Sotto il registratore trovi uno scontrino rimasto incastrato.",
    timeCost: 4,
  },
  {
    actionType: "explore",
    conditions: [
      { actId: 2, has: true, type: "act-completed" },
      { active: true, id: "pharmacy-basement", type: "subscene" },
      { has: false, secretId: "basement_dry_line", type: "secret" },
    ],
    effects: [{ secretId: "basement_dry_line", type: "discover-secret" }],
    id: "find-basement-secret",
    label: "Esamina la parete cieca",
    result: "Una linea di polvere asciutta attraversa il muro umido.",
    timeCost: 4,
  },
  {
    actionType: "explore",
    conditions: [
      { actId: 3, has: true, type: "act-completed" },
      { locationId: "stazione", type: "location" },
      { has: false, secretId: "station_red_marks", type: "secret" },
    ],
    effects: [{ secretId: "station_red_marks", type: "discover-secret" }],
    id: "find-station-secret",
    label: "Esamina l'orario ferroviario",
    result: "Sul retro dell'orario scopri tre segni rossi quasi cancellati.",
    timeCost: 4,
  },
];

export function getInteractionDefinition(id: string) {
  return INTERACTION_DEFINITIONS.find((definition) => definition.id === id);
}
