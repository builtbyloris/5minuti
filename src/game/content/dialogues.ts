import type { CharacterId } from "@/game/content/characters";
import type { GameCondition } from "@/game/engine/conditions";

export type DialogueChoice = {
  id: string;
  label: string;
  response: string;
  timeCost: number;
};

export type DialogueVariant = {
  choices: DialogueChoice[];
  conditions?: GameCondition[];
  id: string;
  opening: string;
  priority?: number;
};

export type DialogueDefinition = {
  characterId: CharacterId;
  characterName: string;
  id: string;
  variants: DialogueVariant[];
};

export const DIALOGUE_DEFINITIONS: DialogueDefinition[] = [
  {
    characterId: "pharmacist",
    characterName: "Farmacista",
    id: "pharmacist-greeting",
    variants: [
      {
        choices: [
          {
            id: "ask-closing-time",
            label: "Chiedere fino a quando resta aperto",
            response:
              "«Ancora pochi minuti.» Il farmacista torna a sistemare il banco.",
            timeCost: 10,
          },
        ],
        id: "base",
        opening: "«Serve qualcosa?»",
      },
      {
        choices: [
          {
            id: "ask-elena-time",
            label: "Chiedere di Elena e delle 23:57",
            response:
              "«La vedo entrare a quell'ora. Non significa che sappia perché.»",
            timeCost: 10,
          },
        ],
        conditions: [
          {
            has: true,
            knowledgeId: "elena_enters_pharmacy_2357",
            type: "knowledge",
          },
        ],
        id: "knows-elena-time",
        opening: "Il farmacista segue il tuo sguardo verso l'orologio.",
        priority: 1,
      },
    ],
  },
];

export function getDialogueDefinition(id: string) {
  return DIALOGUE_DEFINITIONS.find((dialogue) => dialogue.id === id);
}
