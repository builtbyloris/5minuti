import type { CharacterId } from "@/game/content/characters";

export type ArchiveFactRule =
  | { actId: number; type: "completed-act" }
  | { clueId: string; type: "clue" }
  | { knowledgeId: string; type: "knowledge" }
  | { personId: CharacterId; type: "person" }
  | { persistenceId: string; type: "persistence" }
  | { secretId: string; type: "secret" };

export type ArchiveFactDefinition = {
  rule?: ArchiveFactRule;
  text: string;
};

export type ArchivePersonDefinition = {
  description: string;
  facts: ArchiveFactDefinition[];
  id: CharacterId;
  name: string;
};

export const ARCHIVE_PERSON_DEFINITIONS: ArchivePersonDefinition[] = [
  {
    description:
      "Una giovane donna osservata sotto i portici, concentrata sul proprio percorso.",
    facts: [
      { text: "È stata vista dirigersi verso la Farmacia." },
      {
        rule: {
          knowledgeId: "elena_enters_pharmacy_2357",
          type: "knowledge",
        },
        text: "Entra nella Farmacia alle 23:57.",
      },
      {
        rule: { actId: 1, type: "completed-act" },
        text: "Non sta semplicemente acquistando medicine.",
      },
      {
        rule: { actId: 1, type: "completed-act" },
        text: "Cerca un accesso sotto la Farmacia.",
      },
      {
        rule: {
          knowledgeId: "elena_recognizes_echo",
          type: "knowledge",
        },
        text: "Riconosce il simbolo ECHO visto sotto la Farmacia.",
      },
    ],
    id: "elena",
    name: "Elena",
  },
  {
    description:
      "Una figura in rosso osservata nell'area della Stazione, attenta a non fermarsi.",
    facts: [
      { text: "Si muove dalla Stazione verso il centro della città." },
      {
        rule: {
          clueId: "red_man_reaches_elena_before_blackout",
          type: "clue",
        },
        text: "Cerca di raggiungere Elena prima del blackout.",
      },
      {
        rule: { knowledgeId: "red_man_knows_player", type: "knowledge" },
        text: "Sembra conoscere il protagonista: «Sei tornato troppo presto.»",
      },
    ],
    id: "red-man",
    name: "Uomo in Rosso",
  },
  {
    description:
      "Il farmacista presidia il banco e il retrobottega durante il loop.",
    facts: [
      {
        rule: {
          persistenceId: "pharmacist_residual_wariness",
          type: "persistence",
        },
        text: "Mostra una diffidenza residua. Non equivale a un ricordo.",
      },
    ],
    id: "pharmacist",
    name: "Farmacista",
  },
  {
    description:
      "Il controllore sorveglia il binario e segue una routine regolare alla Stazione.",
    facts: [],
    id: "controller",
    name: "Controllore",
  },
];

export type ArchiveLocationDefinition = {
  atmosphere: string;
  facts: ArchiveFactDefinition[];
  id: string;
  name: string;
};

export const ARCHIVE_LOCATION_DEFINITIONS: ArchiveLocationDefinition[] = [
  {
    atmosphere:
      "Pioggia sui sampietrini, portici quasi vuoti e l'orologio comunale sopra la città.",
    facts: [],
    id: "piazza",
    name: "Piazza",
  },
  {
    atmosphere:
      "Neon verde, vetri appannati e un banco che nasconde il retrobottega.",
    facts: [
      { text: "Resta aperta durante la finestra del loop." },
      {
        rule: { clueId: "pharmacy_wet_footprints", type: "clue" },
        text: "Impronte bagnate conducono verso l'area riservata.",
      },
      {
        rule: {
          knowledgeId: "pharmacy_has_basement",
          type: "knowledge",
        },
        text: "Dietro la zona riservata esiste un accesso sotterraneo.",
      },
      {
        rule: { clueId: "basement_infrastructure", type: "clue" },
        text: "Sotto l'edificio corrono infrastrutture anomale.",
      },
      {
        rule: { knowledgeId: "echo_symbol_seen", type: "knowledge" },
        text: "Su un pannello sotterraneo è stato visto il simbolo ECHO.",
      },
    ],
    id: "farmacia",
    name: "Farmacia",
  },
  {
    atmosphere:
      "Lampade fredde, rotaie bagnate e annunci incompleti nella nebbia.",
    facts: [
      {
        rule: { personId: "controller", type: "person" },
        text: "Il Controllore segue qui una routine riconoscibile.",
      },
      {
        rule: { personId: "red-man", type: "person" },
        text: "L'Uomo in Rosso è stato osservato nell'area della Stazione.",
      },
      {
        rule: {
          persistenceId: "station_token_shifted",
          type: "persistence",
        },
        text: "Un gettone spostato è rimasto fuori dalla posizione iniziale.",
      },
      {
        rule: { secretId: "station_red_marks", type: "secret" },
        text: "Tre segni rossi cancellati sono stati trovati sull'orario ferroviario.",
      },
    ],
    id: "stazione",
    name: "Stazione",
  },
  {
    atmosphere:
      "Un passaggio stretto dietro i portici, tra grondaie e muri bagnati.",
    facts: [],
    id: "vicolo",
    name: "Vicolo",
  },
];
