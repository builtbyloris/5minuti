"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AudioController } from "@/audio/audio-controller";
import type { EffectCueId } from "@/audio/audio-cues";
import { localSave } from "@/game/persistence/local-save";
import type { SettingsState } from "@/game/state/types";

const DEFAULT_SETTINGS: SettingsState = {
  ambienceVolume: 55,
  effectsVolume: 70,
  reducedMotion: "system",
  subtitles: true,
};

type AudioContextValue = {
  effectiveReducedMotion: boolean;
  playEffect(cue: EffectCueId): void;
  previewEffects(): void;
  settings: SettingsState;
  updateSettings(settings: SettingsState): void;
};

const AudioContext = createContext<AudioContextValue>({
  effectiveReducedMotion: false,
  playEffect: () => undefined,
  previewEffects: () => undefined,
  settings: DEFAULT_SETTINGS,
  updateSettings: () => undefined,
});

export function getEffectiveReducedMotion(
  settings: SettingsState,
  systemReducedMotion: boolean,
) {
  return systemReducedMotion || settings.reducedMotion === "reduce";
}

export function AudioProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const controllerRef = useRef<AudioController | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settingsRef = useRef(DEFAULT_SETTINGS);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [systemReducedMotion, setSystemReducedMotion] = useState(false);

  if (!controllerRef.current) {
    controllerRef.current = new AudioController();
  }

  const applySettings = useCallback((nextSettings: SettingsState) => {
    settingsRef.current = nextSettings;
    setSettings(nextSettings);
    controllerRef.current?.setSettings(nextSettings);
  }, []);

  const persistSettings = useCallback(async () => {
    const game = await localSave.load();
    if (!game) {
      return;
    }

    const now = new Date().toISOString();
    await localSave.save({
      ...game,
      metadata: {
        ...game.metadata,
        revision: game.metadata.revision + 1,
        updatedAt: now,
      },
      settings: settingsRef.current,
    });
  }, []);

  const updateSettings = useCallback(
    (nextSettings: SettingsState) => {
      applySettings(nextSettings);
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        saveTimeoutRef.current = null;
        void persistSettings();
      }, 300);
    },
    [applySettings, persistSettings],
  );

  useEffect(() => {
    let active = true;
    void localSave.load().then((game) => {
      if (active && game) {
        applySettings(game.settings);
      }
    });

    const unsubscribe = localSave.subscribe((game) => {
      applySettings(game.settings);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [applySettings]);

  useEffect(() => {
    if (!window.matchMedia) {
      return;
    }
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setSystemReducedMotion(media.matches);
    updatePreference();
    media.addEventListener("change", updatePreference);
    return () => media.removeEventListener("change", updatePreference);
  }, []);

  const effectiveReducedMotion = getEffectiveReducedMotion(
    settings,
    systemReducedMotion,
  );

  useEffect(() => {
    document.documentElement.dataset.motion = effectiveReducedMotion
      ? "reduce"
      : "full";
  }, [effectiveReducedMotion]);

  useEffect(() => {
    controllerRef.current?.setGameplayActive(pathname === "/gioca");
  }, [pathname]);

  useEffect(() => {
    const controller = controllerRef.current;
    const unlock = () => controller?.unlock();
    const handleVisibility = () =>
      controller?.setVisible(document.visibilityState === "visible");

    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      document.removeEventListener("visibilitychange", handleVisibility);
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        void persistSettings();
      }
      controller?.dispose();
    };
  }, [persistSettings]);

  const playEffect = useCallback((cue: EffectCueId) => {
    controllerRef.current?.playEffect(cue);
  }, []);

  const previewEffects = useCallback(() => {
    controllerRef.current?.playEffect("discovery");
  }, []);

  const value = useMemo<AudioContextValue>(
    () => ({
      effectiveReducedMotion,
      playEffect,
      previewEffects,
      settings,
      updateSettings,
    }),
    [
      effectiveReducedMotion,
      playEffect,
      previewEffects,
      settings,
      updateSettings,
    ],
  );

  return (
    <AudioContext.Provider value={value}>{children}</AudioContext.Provider>
  );
}

export function useAudio() {
  return useContext(AudioContext);
}
