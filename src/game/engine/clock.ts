export const LOOP_DURATION_SECONDS = 300;

export type ClockAnchor = {
  anchoredAtMs: number;
  remainingMillisecondsAtAnchor: number;
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

export function clampRemainingSeconds(seconds: number) {
  return clamp(Math.floor(seconds), 0, LOOP_DURATION_SECONDS);
}

export function createClockAnchor(
  remainingSeconds: number,
  nowMs: number,
): ClockAnchor {
  return {
    anchoredAtMs: nowMs,
    remainingMillisecondsAtAnchor:
      clampRemainingSeconds(remainingSeconds) * 1000,
  };
}

export function getRemainingMilliseconds(anchor: ClockAnchor, nowMs: number) {
  const elapsedMilliseconds = Math.max(0, nowMs - anchor.anchoredAtMs);

  return clamp(
    anchor.remainingMillisecondsAtAnchor - elapsedMilliseconds,
    0,
    LOOP_DURATION_SECONDS * 1000,
  );
}

export function getRemainingSeconds(anchor: ClockAnchor, nowMs: number) {
  return Math.ceil(getRemainingMilliseconds(anchor, nowMs) / 1000);
}

export function getElapsedSeconds(anchor: ClockAnchor, nowMs: number) {
  return LOOP_DURATION_SECONDS - getRemainingSeconds(anchor, nowMs);
}

export function consumeClockTime(
  anchor: ClockAnchor,
  seconds: number,
): ClockAnchor {
  const costMilliseconds = Math.max(0, Math.floor(seconds)) * 1000;

  return {
    ...anchor,
    remainingMillisecondsAtAnchor: Math.max(
      0,
      anchor.remainingMillisecondsAtAnchor - costMilliseconds,
    ),
  };
}

export function hasLoopEnded(remainingSeconds: number) {
  return clampRemainingSeconds(remainingSeconds) === 0;
}

export function formatCountdown(remainingSeconds: number) {
  const safeSeconds = clampRemainingSeconds(remainingSeconds);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function formatNarrativeTime(remainingSeconds: number) {
  const elapsedSeconds =
    LOOP_DURATION_SECONDS - clampRemainingSeconds(remainingSeconds);
  const totalSeconds = 23 * 3600 + 55 * 60 + elapsedSeconds;
  const wrappedSeconds = totalSeconds % (24 * 3600);
  const hours = Math.floor(wrappedSeconds / 3600);
  const minutes = Math.floor((wrappedSeconds % 3600) / 60);
  const seconds = wrappedSeconds % 60;

  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}
