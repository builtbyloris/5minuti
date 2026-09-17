import { describe, expect, it, vi } from "vitest";
import {
  AudioController,
  type AudioElementLike,
} from "@/audio/audio-controller";
import { getTimerCue } from "@/audio/audio-cues";
import { getEffectiveReducedMotion } from "@/audio/audio-provider";
import { createInitialGameState } from "@/game/state/initial-state";

class FakeAudio implements AudioElementLike {
  currentTime = 0;
  loop = false;
  pause = vi.fn();
  play = vi.fn<() => Promise<void>>(() => Promise.resolve());
  preload = "";
  volume = 1;

  constructor(readonly src: string) {}
}

describe("AudioController", () => {
  it("attende l'interazione, mantiene una sola istanza per ambience e pulisce", () => {
    const elements: FakeAudio[] = [];
    const controller = new AudioController((src) => {
      const element = new FakeAudio(src);
      elements.push(element);
      return element;
    });

    controller.setGameplayActive(true);
    expect(elements).toHaveLength(0);
    controller.unlock();
    expect(elements).toHaveLength(2);
    expect(elements.every((element) => element.loop)).toBe(true);
    expect(
      elements.every((element) => element.play.mock.calls.length === 1),
    ).toBe(true);

    controller.setGameplayActive(false);
    expect(
      elements.every((element) => element.pause.mock.calls.length > 0),
    ).toBe(true);
    controller.setGameplayActive(true);
    expect(elements).toHaveLength(2);

    controller.dispose();
    expect(elements.every((element) => element.currentTime === 0)).toBe(true);
  });

  it("applica i volumi live, rispetta mute e assorbe play rejection", async () => {
    const elements: FakeAudio[] = [];
    const controller = new AudioController((src) => {
      const element = new FakeAudio(src);
      elements.push(element);
      return element;
    });
    controller.unlock();
    controller.setSettings({ ambienceVolume: 0, effectsVolume: 0 });
    controller.setGameplayActive(true);
    controller.playEffect("discovery");
    expect(elements).toHaveLength(0);

    controller.setSettings({ ambienceVolume: 50, effectsVolume: 80 });
    expect(elements).toHaveLength(2);
    controller.playEffect("discovery");
    const discovery = elements.find((element) =>
      element.src.includes("discovery"),
    );
    expect(discovery?.volume).toBeCloseTo(0.384);

    discovery?.play.mockRejectedValueOnce(new Error("autoplay blocked"));
    expect(() => controller.playEffect("discovery")).not.toThrow();
    await Promise.resolve();
  });

  it("sospende ambience quando la pagina è nascosta e la riallinea al ritorno", () => {
    const elements: FakeAudio[] = [];
    const controller = new AudioController((src) => {
      const element = new FakeAudio(src);
      elements.push(element);
      return element;
    });
    controller.setGameplayActive(true);
    controller.unlock();
    controller.setVisible(false);
    expect(
      elements.every((element) => element.pause.mock.calls.length > 0),
    ).toBe(true);
    const playsBefore = elements.map(
      (element) => element.play.mock.calls.length,
    );
    controller.setVisible(true);
    expect(elements[0]?.play.mock.calls.length).toBeGreaterThan(
      playsBefore[0] ?? 0,
    );
  });
});

describe("audio cues e reduced motion", () => {
  it("emette una sola soglia deterministica anche dopo un catch-up", () => {
    expect(getTimerCue(31, 29)).toBe("timerWarning");
    expect(getTimerCue(29, 28)).toBeNull();
    expect(getTimerCue(11, 9)).toBe("timerUrgent");
    expect(getTimerCue(31, 9)).toBe("timerUrgent");
    expect(getTimerCue(9, 300)).toBeNull();
  });

  it("combina preferenza OS e setting interno con OR", () => {
    const settings = createInitialGameState({ id: "audio-test" }).settings;
    expect(getEffectiveReducedMotion(settings, false)).toBe(false);
    expect(getEffectiveReducedMotion(settings, true)).toBe(true);
    expect(
      getEffectiveReducedMotion(
        { ...settings, reducedMotion: "reduce" },
        false,
      ),
    ).toBe(true);
    expect(
      getEffectiveReducedMotion({ ...settings, reducedMotion: "full" }, true),
    ).toBe(true);
  });
});
