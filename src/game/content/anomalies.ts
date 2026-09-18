import type { GameCondition } from "@/game/engine/conditions";
import type { LocationId } from "@/game/state/types";

export type AnomalyKind = "daily" | "provoked" | "rare";

export type AnomalyDefinition = {
  conditions: GameCondition[];
  description: string;
  id: string;
  kind: AnomalyKind;
  locationId: LocationId;
  title: string;
};

export const PIAZZA_BLUE_FLICKER_ANOMALY: AnomalyDefinition = {
  conditions: [
    { type: "post-act-exploration" },
    { locationId: "piazza", type: "location" },
    { anomalyId: "piazza_blue_flicker", has: false, type: "anomaly" },
  ],
  description:
    "Per un istante, un lampione della piazza emette un impulso azzurro isolato. Non coincide con nessun evento noto.",
  id: "piazza_blue_flicker",
  kind: "daily",
  locationId: "piazza",
  title: "Luce fuori fase",
};

export const PHARMACY_BELL_SECOND_MOTION_ANOMALY: AnomalyDefinition = {
  conditions: [
    { type: "post-act-exploration" },
    { locationId: "farmacia", type: "location" },
    { active: false, id: "pharmacy-basement", type: "subscene" },
    { key: "interaction:bell-used", type: "run-flag", value: true },
    {
      anomalyId: "pharmacy_bell_second_motion",
      has: false,
      type: "anomaly",
    },
  ],
  description:
    "Dopo essere stato suonato, il campanello vibra una seconda volta senza essere toccato.",
  id: "pharmacy_bell_second_motion",
  kind: "provoked",
  locationId: "farmacia",
  title: "Il secondo movimento",
};

export const STATION_DISPLAY_OUT_OF_TIME_ANOMALY: AnomalyDefinition = {
  conditions: [
    { type: "post-act-exploration" },
    { locationId: "stazione", type: "location" },
    { divisor: 7, type: "loop-divisible-by" },
    {
      fromElapsedSecond: 135,
      toElapsedSecond: 180,
      type: "elapsed-window",
    },
    {
      anomalyId: "station_display_out_of_time",
      has: false,
      type: "anomaly",
    },
  ],
  description:
    "Per un istante, il display della stazione mostra 23:55 mentre il loop è già avanzato. Subito dopo torna normale.",
  id: "station_display_out_of_time",
  kind: "rare",
  locationId: "stazione",
  title: "Display fuori tempo",
};

export const ANOMALY_DEFINITIONS: AnomalyDefinition[] = [
  PIAZZA_BLUE_FLICKER_ANOMALY,
  PHARMACY_BELL_SECOND_MOTION_ANOMALY,
  STATION_DISPLAY_OUT_OF_TIME_ANOMALY,
];

export function getAnomalyDefinition(id: string) {
  return ANOMALY_DEFINITIONS.find((definition) => definition.id === id);
}
