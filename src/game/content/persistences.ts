import type { PersistenceType } from "@/game/state/types";

export type PersistencePolarity = "neutral" | "uneasy";

export type PersistenceEffect = {
  key: string;
  type: "set-world-flag";
  value: boolean;
};

export type PersistenceDefinition = {
  description: string;
  effects: PersistenceEffect[];
  id: string;
  polarity: PersistencePolarity;
  remainingLoops?: number;
  title: string;
  type: PersistenceType;
};

export const PERSISTENCE_DEFINITIONS: PersistenceDefinition[] = [
  {
    description:
      "Un piccolo oggetto non è tornato al posto che il loop gli aveva assegnato.",
    effects: [
      {
        key: "persistent:station-token-shifted",
        type: "set-world-flag",
        value: true,
      },
    ],
    id: "station_token_shifted",
    polarity: "neutral",
    title: "Gettone spostato",
    type: "physical",
  },
  {
    description:
      "Nella farmacia resta una diffidenza istintiva. Non è un ricordo e svanirà.",
    effects: [],
    id: "pharmacist_residual_wariness",
    polarity: "uneasy",
    remainingLoops: 2,
    title: "Diffidenza residua",
    type: "relationship",
  },
];

export function getPersistenceDefinition(id: string) {
  return PERSISTENCE_DEFINITIONS.find((definition) => definition.id === id);
}
