export type CharacterId = "controller" | "elena" | "pharmacist" | "red-man";

export type CharacterDefinition = {
  id: CharacterId;
  name: string;
  routineId: CharacterId;
};

export const CHARACTER_DEFINITIONS: CharacterDefinition[] = [
  { id: "elena", name: "Elena", routineId: "elena" },
  { id: "red-man", name: "Uomo in Rosso", routineId: "red-man" },
  { id: "pharmacist", name: "Farmacista", routineId: "pharmacist" },
  { id: "controller", name: "Controllore", routineId: "controller" },
];
