import type { ScheduledEvent } from "@/game/engine/scheduler";

export const CORE_TECHNICAL_EVENTS: ScheduledEvent[] = [
  60, 120, 180, 240, 300,
].map((atElapsedSecond) => ({
  atElapsedSecond,
  effects: [
    {
      key: `system:elapsed:${atElapsedSecond}`,
      type: "set-run-flag",
      value: true,
    },
  ],
  id: `system-elapsed-${atElapsedSecond}`,
}));
