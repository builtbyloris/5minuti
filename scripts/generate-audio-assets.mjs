import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SAMPLE_RATE = 22_050;
const OUTPUT_DIRECTORY = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "public",
  "audio",
);

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1_664_525 + 1_013_904_223) >>> 0;
    return value / 2 ** 32;
  };
}

function periodicTexture(seed, voices, minimumCycles, maximumCycles) {
  const random = seededRandom(seed);
  const oscillators = Array.from({ length: voices }, () => ({
    amplitude: 0.25 + random() * 0.75,
    cycles:
      minimumCycles +
      Math.floor(random() * (maximumCycles - minimumCycles + 1)),
    phase: random() * Math.PI * 2,
  }));
  const normalization = oscillators.reduce(
    (total, oscillator) => total + oscillator.amplitude,
    0,
  );

  return (progress) =>
    oscillators.reduce(
      (sample, oscillator) =>
        sample +
        Math.sin(
          progress * Math.PI * 2 * oscillator.cycles + oscillator.phase,
        ) *
          oscillator.amplitude,
      0,
    ) / normalization;
}

function envelope(progress, attack = 0.08, release = 0.2) {
  return Math.min(1, progress / attack, (1 - progress) / release);
}

async function writeWave(name, durationSeconds, generator) {
  const sampleCount = Math.floor(SAMPLE_RATE * durationSeconds);
  const dataSize = sampleCount * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let index = 0; index < sampleCount; index += 1) {
    const progress = index / sampleCount;
    const sample = Math.max(-1, Math.min(1, generator(progress)));
    buffer.writeInt16LE(Math.round(sample * 32_767), 44 + index * 2);
  }

  await writeFile(join(OUTPUT_DIRECTORY, name), buffer);
}

await mkdir(OUTPUT_DIRECTORY, { recursive: true });

const rainHigh = periodicTexture(23_955, 72, 300, 4_800);
const rainBody = periodicTexture(55_023, 36, 40, 700);
await writeWave(
  "rain-loop.wav",
  8,
  (progress) => 0.23 * rainHigh(progress) + 0.12 * rainBody(progress),
);

const cityLow = periodicTexture(23_958, 20, 8, 120);
const cityAir = periodicTexture(23_959, 12, 160, 900);
await writeWave(
  "city-loop.wav",
  12,
  (progress) => 0.2 * cityLow(progress) + 0.035 * cityAir(progress),
);

await writeWave(
  "timer-cue.wav",
  0.22,
  (progress) =>
    Math.sin(progress * Math.PI * 2 * 176) *
    envelope(progress, 0.04, 0.45) *
    0.32,
);

await writeWave("reset-cue.wav", 0.8, (progress) => {
  const descendingFrequency = 150 - progress * 90;
  const pulse = Math.sin(progress * Math.PI * 2 * descendingFrequency);
  const harmonic = Math.sin(progress * Math.PI * 2 * 43) * 0.4;
  return (pulse + harmonic) * envelope(progress, 0.03, 0.7) * 0.28;
});

await writeWave("discovery-cue.wav", 0.48, (progress) => {
  const first = Math.sin(progress * Math.PI * 2 * 440);
  const second = Math.sin(progress * Math.PI * 2 * 660) * progress;
  return (first + second) * envelope(progress, 0.05, 0.45) * 0.2;
});

console.log("Generated original procedural WAV assets in public/audio.");
