import type { GameCondition } from "@/game/engine/conditions";
import type { ActId } from "@/game/state/types";

export type ActCompletionEffect = {
  key: string;
  type: "set-run-flag";
  value: boolean;
};

export type ActDefinition = {
  completionConditions: GameCondition[];
  hook: string;
  id: ActId;
  onCompleteEffects: ActCompletionEffect[];
  question: string;
  revelation: string;
  title: string;
  unlockedInteractions: string[];
};

export const ACT_DEFINITIONS: ActDefinition[] = [
  {
    completionConditions: [
      {
        has: true,
        knowledgeId: "elena_enters_pharmacy_2357",
        type: "knowledge",
      },
      { clueId: "pharmacy_wet_footprints", has: true, type: "clue" },
      {
        has: true,
        knowledgeId: "pharmacy_has_basement",
        type: "knowledge",
      },
    ],
    hook: "Elena sta cercando qualcosa sotto la città.",
    id: 1,
    onCompleteEffects: [],
    question: "Perché Elena entra nella farmacia alle 23:57?",
    revelation: "Sotto la farmacia esiste un accesso che Elena sta cercando.",
    title: "La farmacia",
    unlockedInteractions: ["investigate-private-area"],
  },
  {
    completionConditions: [
      { clueId: "basement_infrastructure", has: true, type: "clue" },
      { has: true, knowledgeId: "echo_symbol_seen", type: "knowledge" },
      {
        has: true,
        knowledgeId: "elena_recognizes_echo",
        type: "knowledge",
      },
    ],
    hook: "Qualcuno la sta seguendo.",
    id: 2,
    onCompleteEffects: [],
    question: "Cosa sta cercando Elena?",
    revelation: "ECHO compare sotto la farmacia. Elena riconosce il simbolo.",
    title: "Sotto la farmacia",
    unlockedInteractions: [
      "enter-pharmacy-basement",
      "explore-basement-infrastructure",
      "observe-echo-panel",
      "observe-elena-echo-reaction",
    ],
  },
  {
    completionConditions: [
      {
        clueId: "red_man_reaches_elena_before_blackout",
        has: true,
        type: "clue",
      },
      {
        has: true,
        knowledgeId: "red_man_knows_player",
        type: "knowledge",
      },
    ],
    hook: "Non è il primo a ricordare.",
    id: 3,
    onCompleteEffects: [],
    question: "Perché l'Uomo in Rosso cerca Elena?",
    revelation: "L'Uomo in Rosso conosce il protagonista.",
    title: "L'uomo in rosso",
    unlockedInteractions: [
      "follow-red-man-from-station",
      "follow-red-man-to-pharmacy",
      "observe-red-man-intercept",
      "confront-red-man",
    ],
  },
];

export function getActDefinition(id: ActId) {
  return ACT_DEFINITIONS.find((definition) => definition.id === id);
}
