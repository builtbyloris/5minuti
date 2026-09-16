import { CITY_LOCATIONS } from "@/game/content/locations";
import {
  processScheduledEvents,
  type ScheduledEvent,
} from "@/game/engine/scheduler";
import type { GameState } from "@/game/state/types";

export const CITY_EVENTS: ScheduledEvent[] = [
  {
    atElapsedSecond: 30,
    effects: [
      { key: "pharmacy-sign-flicker", type: "set-world-flag", value: true },
    ],
    id: "pharmacy-sign-flicker",
  },
  {
    atElapsedSecond: 75,
    effects: [
      { key: "station-announcement", type: "set-world-flag", value: true },
    ],
    id: "station-announcement",
  },
  {
    atElapsedSecond: 105,
    effects: [
      { key: "station-train-passes", type: "set-world-flag", value: true },
    ],
    id: "station-train-passes",
  },
  {
    atElapsedSecond: 145,
    effects: [
      { key: "alley-shutter-slams", type: "set-world-flag", value: true },
    ],
    id: "alley-shutter-slams",
  },
  {
    atElapsedSecond: 180,
    effects: [{ key: "blackout", type: "set-world-flag", value: true }],
    id: "city-blackout",
  },
];

export function reconcileCityState(state: GameState) {
  const elapsedSecond = 300 - state.run.remainingSeconds;
  const scheduled = processScheduledEvents(
    state,
    CITY_EVENTS,
    -1,
    elapsedSecond,
  ).state;
  const hasValidLocation = CITY_LOCATIONS.some(
    (location) => location.id === scheduled.run.currentLocationId,
  );

  if (hasValidLocation) {
    return scheduled;
  }

  return {
    ...scheduled,
    run: {
      ...scheduled.run,
      currentLocationId: "piazza",
    },
  };
}
