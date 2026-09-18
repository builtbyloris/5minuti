import {
  ARCHIVE_LOCATION_DEFINITIONS,
  ARCHIVE_PERSON_DEFINITIONS,
  type ArchiveFactRule,
} from "@/game/archive/content";
import { ACT_DEFINITIONS } from "@/game/content/acts";
import { getAnomalyDefinition } from "@/game/content/anomalies";
import { getClueDefinition } from "@/game/content/clues";
import { getLocation } from "@/game/content/locations";
import { getSecretDefinition } from "@/game/content/secrets";
import { getActivePersistences } from "@/game/engine/persistences";
import type { GameState } from "@/game/state/types";

export type ArchiveActEntry = {
  hook?: string;
  id: number;
  question: string;
  revelation?: string;
  status: "Completato" | "In corso";
  title: string;
};

export type ArchiveCardEntry = {
  description: string;
  facts: string[];
  id: string;
  title: string;
};

export type ArchivePersistenceEntry = ArchiveCardEntry & {
  duration: string;
  type: string;
};

export type ArchiveViewModel = {
  acts: ArchiveActEntry[];
  anomalies: ArchiveCardEntry[];
  clues: ArchiveCardEntry[];
  hasGame: boolean;
  isV1Complete: boolean;
  locations: ArchiveCardEntry[];
  people: ArchiveCardEntry[];
  persistences: ArchivePersistenceEntry[];
  secrets: ArchiveCardEntry[];
};

function rulePasses(state: GameState, rule?: ArchiveFactRule) {
  if (!rule) {
    return true;
  }

  switch (rule.type) {
    case "completed-act":
      return state.progression.completedActs.includes(rule.actId);
    case "clue":
      return state.progression.discoveredClues.includes(rule.clueId);
    case "knowledge":
      return state.progression.knowledge.includes(rule.knowledgeId);
    case "person":
      return state.progression.discoveredPeople.includes(rule.personId);
    case "persistence":
      return getActivePersistences(state).some(
        ({ definition }) => definition.id === rule.persistenceId,
      );
    case "secret":
      return state.progression.discoveredSecrets.includes(rule.secretId);
  }
}

export function createArchiveViewModel(
  state: GameState | null,
): ArchiveViewModel {
  if (!state) {
    return {
      acts: [],
      anomalies: [],
      clues: [],
      hasGame: false,
      isV1Complete: false,
      locations: [],
      people: [],
      persistences: [],
      secrets: [],
    };
  }

  const completedActs = new Set(state.progression.completedActs);
  const acts = ACT_DEFINITIONS.filter(
    (act) =>
      completedActs.has(act.id) ||
      (act.id === state.run.currentActId && !completedActs.has(act.id)),
  ).map((act) => ({
    ...(completedActs.has(act.id)
      ? { hook: act.hook, revelation: act.revelation }
      : {}),
    id: act.id,
    question: act.question,
    status: completedActs.has(act.id)
      ? ("Completato" as const)
      : ("In corso" as const),
    title: act.title,
  }));
  const people = ARCHIVE_PERSON_DEFINITIONS.filter((person) =>
    state.progression.discoveredPeople.includes(person.id),
  ).map((person) => ({
    description: person.description,
    facts: person.facts
      .filter((fact) => rulePasses(state, fact.rule))
      .map((fact) => fact.text),
    id: person.id,
    title: person.name,
  }));
  const locations = ARCHIVE_LOCATION_DEFINITIONS.filter((location) =>
    state.progression.discoveredLocations.includes(location.id),
  ).map((location) => ({
    description: location.atmosphere,
    facts: location.facts
      .filter((fact) => rulePasses(state, fact.rule))
      .map((fact) => fact.text),
    id: location.id,
    title: location.name,
  }));
  const clues = state.progression.discoveredClues.flatMap((id) => {
    const clue = getClueDefinition(id);
    return clue
      ? [
          {
            description: clue.description,
            facts: [],
            id: clue.id,
            title: clue.title,
          },
        ]
      : [];
  });
  const persistences = getActivePersistences(state).map(
    ({ definition, state: persistence }) => ({
      description: definition.description,
      duration:
        persistence.remainingLoops === undefined
          ? "Stabile attraverso i reset"
          : persistence.remainingLoops === 1
            ? "Ultimo loop attivo"
            : `${persistence.remainingLoops} loop residui, incluso quello corrente`,
      facts: [],
      id: definition.id,
      title: definition.title,
      type: definition.type === "physical" ? "Fisica" : "Relazionale",
    }),
  );
  const secrets = state.progression.discoveredSecrets.flatMap((id) => {
    const secret = getSecretDefinition(id);
    return secret
      ? [
          {
            description: secret.description,
            facts: [],
            id: secret.id,
            title: secret.title,
          },
        ]
      : [];
  });
  const anomalies = [...new Set(state.progression.discoveredAnomalies)].flatMap(
    (id) => {
      const anomaly = getAnomalyDefinition(id);
      const location = anomaly ? getLocation(anomaly.locationId) : null;

      return anomaly
        ? [
            {
              description: anomaly.description,
              facts: location ? [`Luogo: ${location.label}`] : [],
              id: anomaly.id,
              title: anomaly.title,
            },
          ]
        : [];
    },
  );

  return {
    acts,
    anomalies,
    clues,
    hasGame: true,
    isV1Complete: ACT_DEFINITIONS.every((act) => completedActs.has(act.id)),
    locations,
    people,
    persistences,
    secrets,
  };
}
