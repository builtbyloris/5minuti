export type KnowledgeDefinition = {
  description: string;
  id: string;
  sourceType: "dialogue" | "investigation" | "observation";
  title: string;
};

export const KNOWLEDGE_DEFINITIONS: KnowledgeDefinition[] = [
  {
    description:
      "Alle 23:57 Elena entra nella farmacia e rimane oltre la vetrina.",
    id: "elena_enters_pharmacy_2357",
    sourceType: "observation",
    title: "Elena entra in farmacia alle 23:57",
  },
  {
    description:
      "Dietro la zona riservata della farmacia esiste un accesso verso uno spazio sotterraneo.",
    id: "pharmacy_has_basement",
    sourceType: "investigation",
    title: "Un accesso sotto la farmacia",
  },
  {
    description:
      "Su un pannello tecnico sotto la farmacia compare il simbolo ECHO.",
    id: "echo_symbol_seen",
    sourceType: "observation",
    title: "Il simbolo ECHO",
  },
  {
    description:
      "Elena si arresta davanti al simbolo ECHO: lo riconosce, ma non spiega perché.",
    id: "elena_recognizes_echo",
    sourceType: "observation",
    title: "Elena riconosce il simbolo",
  },
  {
    description:
      "L'Uomo in Rosso conosce il protagonista e sembra ricordare un ritorno precedente.",
    id: "red_man_knows_player",
    sourceType: "dialogue",
    title: "L'Uomo in Rosso ti conosce",
  },
];

export function getKnowledgeDefinition(id: string) {
  return KNOWLEDGE_DEFINITIONS.find((definition) => definition.id === id);
}
