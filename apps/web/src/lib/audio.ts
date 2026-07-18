/**
 * Soft rhythmic instrumental (no vocals) + light SFX via Web Audio.
 * Sweet harmony loop — gentle piano/kalimba feel to help users relax.
 */

type SfxKind = "tap" | "claim" | "complete" | "spin";

let ctx: AudioContext | null = null;
let musicNodes: { stop: () => void } | null = null;

function getCtx() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

export async function unlockAudio() {
  const c = getCtx();
  if (c?.state === "suspended") await c.resume();
}

export function playSfx(kind: SfxKind, enabled: boolean) {
  if (!enabled) return;
  const c = getCtx();
  if (!c) return;
  void c.resume();

  const now = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain);
  gain.connect(c.destination);

  const tones: Record<SfxKind, { f: number; d: number; type: OscillatorType }> =
    {
      tap: { f: 720, d: 0.05, type: "triangle" },
      claim: { f: 523.25, d: 0.2, type: "sine" },
      complete: { f: 659.25, d: 0.32, type: "sine" },
      spin: { f: 392, d: 0.1, type: "triangle" },
    };
  const t = tones[kind];
  osc.type = t.type;
  osc.frequency.setValueAtTime(t.f, now);
  if (kind === "complete") {
    osc.frequency.linearRampToValueAtTime(880, now + t.d * 0.6);
  }
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.1, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + t.d);
  osc.start(now);
  osc.stop(now + t.d + 0.02);
}

/** MIDI-ish note → Hz */
function n(midi: number) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function pluck(
  c: AudioContext,
  dest: AudioNode,
  freq: number,
  when: number,
  dur: number,
  vel = 0.12
) {
  const osc = c.createOscillator();
  const gain = c.createGain();
  const filter = c.createBiquadFilter();
  osc.type = "triangle";
  osc.frequency.value = freq;
  filter.type = "lowpass";
  filter.frequency.value = 2200;
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(dest);
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(vel, when + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  osc.start(when);
  osc.stop(when + dur + 0.05);
}

function softChord(
  c: AudioContext,
  dest: AudioNode,
  midis: number[],
  when: number,
  dur: number,
  vel = 0.04
) {
  midis.forEach((m, i) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sine";
    osc.frequency.value = n(m);
    osc.connect(gain);
    gain.connect(dest);
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(vel / (1 + i * 0.25), when + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    osc.start(when);
    osc.stop(when + dur + 0.05);
  });
}

/**
 * Sweet instrumental loop (~72 BPM): soft chords + melodic arpeggio.
 * Ends each phrase on a gentle resolving harmony, then repeats.
 */
export function startMusic(enabled: boolean) {
  stopMusic();
  if (!enabled) return;
  const c = getCtx();
  if (!c) return;
  void c.resume();

  const master = c.createGain();
  master.gain.value = 0.55;
  const compressor = c.createDynamicsCompressor();
  compressor.threshold.value = -24;
  compressor.knee.value = 18;
  compressor.ratio.value = 3;
  master.connect(compressor);
  compressor.connect(c.destination);

  const bpm = 72;
  const beat = 60 / bpm;
  // 8 bars × 4 beats — sweet major progression that resolves home
  // C – G – Am – F – C – Em – F – C (resolved cadence)
  const chords: number[][] = [
    [60, 64, 67], // C
    [59, 62, 67], // G/B
    [57, 60, 64], // Am
    [53, 57, 60], // F
    [60, 64, 67], // C
    [52, 55, 59], // Em
    [53, 57, 60], // F
    [48, 52, 55, 60], // C (warm resolve)
  ];

  // Melodic motif (instrumental only) — soft descending then lift
  const melody: { step: number; midi: number; len: number }[] = [
    { step: 0, midi: 72, len: 1 },
    { step: 1, midi: 76, len: 1 },
    { step: 2, midi: 79, len: 1 },
    { step: 3, midi: 76, len: 1 },
    { step: 4, midi: 74, len: 1 },
    { step: 5, midi: 72, len: 1 },
    { step: 6, midi: 71, len: 1 },
    { step: 7, midi: 72, len: 1 },
    { step: 8, midi: 69, len: 1 },
    { step: 9, midi: 72, len: 1 },
    { step: 10, midi: 76, len: 1 },
    { step: 11, midi: 74, len: 1 },
    { step: 12, midi: 72, len: 1 },
    { step: 13, midi: 67, len: 1 },
    { step: 14, midi: 69, len: 1 },
    { step: 15, midi: 72, len: 1 },
    { step: 16, midi: 76, len: 1 },
    { step: 17, midi: 79, len: 0.5 },
    { step: 17.5, midi: 76, len: 0.5 },
    { step: 18, midi: 74, len: 1 },
    { step: 19, midi: 72, len: 1 },
    { step: 20, midi: 71, len: 1 },
    { step: 21, midi: 69, len: 1 },
    { step: 22, midi: 67, len: 1 },
    { step: 23, midi: 65, len: 1 },
    { step: 24, midi: 64, len: 1 },
    { step: 25, midi: 67, len: 1 },
    { step: 26, midi: 69, len: 1 },
    { step: 27, midi: 72, len: 1 },
    { step: 28, midi: 71, len: 1 },
    { step: 29, midi: 72, len: 1 },
    { step: 30, midi: 74, len: 1 },
    { step: 31, midi: 72, len: 2 }, // soft landing
  ];

  const loopBeats = 32;
  const loopSec = loopBeats * beat;
  let nextLoopAt = c.currentTime + 0.05;
  let timer: number | undefined;
  let stopped = false;

  const scheduleLoop = (startAt: number) => {
    chords.forEach((chord, bar) => {
      const t = startAt + bar * 4 * beat;
      softChord(c, master, chord, t, 4 * beat * 0.95, 0.045);
      // light arpeggio under the chord for rhythm
      chord.forEach((m, i) => {
        pluck(c, master, n(m), t + i * (beat / 2), beat * 1.2, 0.05);
      });
      // soft pulse on beats 1 & 3
      pluck(c, master, n(chord[0] - 12), t, beat * 1.5, 0.06);
      pluck(c, master, n(chord[0] - 12), t + beat * 2, beat * 1.2, 0.045);
    });

    melody.forEach((note) => {
      const t = startAt + note.step * beat;
      pluck(c, master, n(note.midi), t, note.len * beat * 0.9, 0.11);
    });
  };

  const tick = () => {
    if (stopped) return;
    const now = c.currentTime;
    while (nextLoopAt < now + loopSec + 0.5) {
      scheduleLoop(nextLoopAt);
      nextLoopAt += loopSec;
    }
    timer = window.setTimeout(tick, (loopSec * 1000) / 2);
  };

  scheduleLoop(nextLoopAt);
  nextLoopAt += loopSec;
  timer = window.setTimeout(tick, (loopSec * 1000) / 2);

  musicNodes = {
    stop: () => {
      stopped = true;
      if (timer) window.clearTimeout(timer);
      try {
        master.disconnect();
        compressor.disconnect();
      } catch {
        /* ignore */
      }
    },
  };
}

export function stopMusic() {
  musicNodes?.stop();
  musicNodes = null;
}

export function setMusicEnabled(enabled: boolean) {
  if (enabled) startMusic(true);
  else stopMusic();
}
