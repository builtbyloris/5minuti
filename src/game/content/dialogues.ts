import type { CharacterId } from "@/game/content/characters";
import type { InteractionEffect } from "@/game/content/interactions";
import type { GameCondition } from "@/game/engine/conditions";

export type DialogueChoice = {
  effects?: InteractionEffect[];
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
          {
            effects: [
              {
                persistenceId: "pharmacist_residual_wariness",
                type: "grant-persistence",
              },
            ],
            id: "press-for-an-answer",
            label: "Insistere per una risposta",
            response:
              "Il farmacista si irrigidisce. «Le ho già detto quello che so.»",
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
          {
            effects: [
              {
                persistenceId: "pharmacist_residual_wariness",
                type: "grant-persistence",
              },
            ],
            id: "press-for-an-answer-known",
            label: "Insistere perché dica il resto",
            response:
              "Il farmacista si irrigidisce. «Non c'è altro. E smetta di fissarmi così.»",
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
      {
        choices: [
          {
            id: "ask-closing-time-wary",
            label: "Chiedere fino a quando resta aperto",
            response:
              "«Ancora pochi minuti.» La risposta arriva senza che ti guardi.",
            timeCost: 10,
          },
        ],
        conditions: [
          {
            has: true,
            persistenceId: "pharmacist_residual_wariness",
            type: "persistence",
          },
        ],
        id: "residual-wariness",
        opening:
          "Il farmacista ti squadra per un istante, come davanti a un pericolo che non sa nominare.",
        priority: 2,
      },
      {
        choices: [
          {
            id: "ask-elena-time-wary",
            label: "Chiedere di Elena e delle 23:57",
            response:
              "«La vedo entrare a quell'ora.» Fa una pausa. «Non significa che debba fidarmi di lei.»",
            timeCost: 10,
          },
        ],
        conditions: [
          {
            has: true,
            knowledgeId: "elena_enters_pharmacy_2357",
            type: "knowledge",
          },
          {
            has: true,
            persistenceId: "pharmacist_residual_wariness",
            type: "persistence",
          },
        ],
        id: "knows-elena-time-and-wary",
        opening:
          "Il farmacista segue il tuo sguardo verso l'orologio, ma tiene una mano sotto il banco.",
        priority: 3,
      },
    ],
  },
  {
    characterId: "red-man",
    characterName: "Uomo in Rosso",
    id: "red-man-confrontation",
    variants: [
      {
        choices: [
          {
            effects: [
              {
                knowledgeId: "red_man_knows_player",
                type: "acquire-knowledge",
              },
            ],
            id: "ask-red-man-identity",
            label: "Chiedere come fa a conoscerti",
            response: "«Sei tornato troppo presto.»",
            timeCost: 8,
          },
        ],
        id: "confrontation",
        opening:
          "Non cerca una via di fuga. Ti guarda come se avesse già sentito i tuoi passi.",
      },
    ],
  },
];

export function getDialogueDefinition(id: string) {
  return DIALOGUE_DEFINITIONS.find((dialogue) => dialogue.id === id);
}
