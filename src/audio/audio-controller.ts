import {
  AUDIO_TRACKS,
  type AudioTrackId,
  type EffectCueId,
} from "@/audio/audio-cues";

export type AudioChannelSettings = {
  ambienceVolume: number;
  effectsVolume: number;
};

export type AudioElementLike = {
  currentTime: number;
  loop: boolean;
  pause(): void;
  play(): Promise<void> | void;
  preload: string;
  volume: number;
};

export type AudioElementFactory = (src: string) => AudioElementLike;

const AMBIENCE_TRACKS: AudioTrackId[] = ["rain", "city"];

function defaultFactory(src: string): AudioElementLike {
  return new Audio(src);
}

function normalizedVolume(value: number) {
  return Math.min(1, Math.max(0, value / 100));
}

export class AudioController {
  readonly #elements = new Map<AudioTrackId, AudioElementLike>();
  readonly #factory: AudioElementFactory;
  #gameplayActive = false;
  #settings: AudioChannelSettings = {
    ambienceVolume: 55,
    effectsVolume: 70,
  };
  #unlocked = false;
  #visible = true;

  constructor(factory: AudioElementFactory = defaultFactory) {
    this.#factory = factory;
  }

  dispose() {
    for (const element of this.#elements.values()) {
      element.pause();
      element.currentTime = 0;
    }
    this.#elements.clear();
  }

  playEffect(cue: EffectCueId) {
    if (
      !this.#unlocked ||
      !this.#visible ||
      this.#settings.effectsVolume === 0
    ) {
      return;
    }

    const element = this.getElement(cue);
    element.currentTime = 0;
    this.safePlay(element);
  }

  setGameplayActive(active: boolean) {
    this.#gameplayActive = active;
    this.syncAmbience();
  }

  setSettings(settings: AudioChannelSettings) {
    this.#settings = settings;
    this.syncVolumes();
    this.syncAmbience();
  }

  setVisible(visible: boolean) {
    this.#visible = visible;
    this.syncAmbience();
  }

  unlock() {
    if (this.#unlocked) {
      return;
    }

    this.#unlocked = true;
    this.syncAmbience();
  }

  private getElement(trackId: AudioTrackId) {
    const existing = this.#elements.get(trackId);
    if (existing) {
      return existing;
    }

    const definition = AUDIO_TRACKS[trackId];
    const element = this.#factory(definition.src);
    element.loop = definition.loop;
    element.preload = "auto";
    this.#elements.set(trackId, element);
    this.setElementVolume(trackId, element);
    return element;
  }

  private pauseAmbience() {
    for (const trackId of AMBIENCE_TRACKS) {
      const element = this.#elements.get(trackId);
      if (element) {
        element.pause();
      }
    }
  }

  private safePlay(element: AudioElementLike) {
    try {
      const result = element.play();
      if (result && "catch" in result) {
        void result.catch(() => undefined);
      }
    } catch {
      // Audio is presentation only: unavailable assets must never stop gameplay.
    }
  }

  private setElementVolume(trackId: AudioTrackId, element: AudioElementLike) {
    const definition = AUDIO_TRACKS[trackId];
    const channelVolume =
      definition.channel === "ambience"
        ? this.#settings.ambienceVolume
        : this.#settings.effectsVolume;
    element.volume = normalizedVolume(channelVolume) * definition.gain;
  }

  private syncAmbience() {
    if (
      !this.#unlocked ||
      !this.#visible ||
      !this.#gameplayActive ||
      this.#settings.ambienceVolume === 0
    ) {
      this.pauseAmbience();
      return;
    }

    for (const trackId of AMBIENCE_TRACKS) {
      const element = this.getElement(trackId);
      this.safePlay(element);
    }
  }

  private syncVolumes() {
    for (const [trackId, element] of this.#elements) {
      this.setElementVolume(trackId, element);
    }
  }
}
