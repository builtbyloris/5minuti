export type KnowledgeDefinition = {
  description: string;
  id: string;
  sourceType: "observation";
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
];

export function getKnowledgeDefinition(id: string) {
  return KNOWLEDGE_DEFINITIONS.find((definition) => definition.id === id);
}
