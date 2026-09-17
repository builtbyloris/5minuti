export const AUDIO_TRACKS = {
  rain: {
    channel: "ambience",
    gain: 0.38,
    loop: true,
    src: "/audio/rain-loop.wav",
  },
  city: {
    channel: "ambience",
    gain: 0.18,
    loop: true,
    src: "/audio/city-loop.wav",
  },
  timerWarning: {
    channel: "effects",
    gain: 0.34,
    loop: false,
    src: "/audio/timer-cue.wav",
  },
  timerUrgent: {
    channel: "effects",
    gain: 0.62,
    loop: false,
    src: "/audio/timer-cue.wav",
  },
  reset: {
    channel: "effects",
    gain: 0.66,
    loop: false,
    src: "/audio/reset-cue.wav",
  },
  discovery: {
    channel: "effects",
    gain: 0.48,
    loop: false,
    src: "/audio/discovery-cue.wav",
  },
} as const;

export type AudioTrackId = keyof typeof AUDIO_TRACKS;
export type EffectCueId = Exclude<AudioTrackId, "rain" | "city">;

export function getTimerCue(
  previousSeconds: number,
  currentSeconds: number,
): EffectCueId | null {
  if (currentSeconds >= previousSeconds) {
    return null;
  }

  if (previousSeconds > 10 && currentSeconds <= 10) {
    return "timerUrgent";
  }

  if (previousSeconds > 30 && currentSeconds <= 30) {
    return "timerWarning";
  }

  return null;
}
