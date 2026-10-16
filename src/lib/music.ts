'use client';

/**
 * เครื่องเล่นเพลงประกอบของทั้งเว็บ (เพลงเดียวเล่นได้ทีละเพลง)
 * - ซ้อนเป็นชั้น: 'site' (เพลงหน้าเว็บ) อยู่ล่างสุด, 'room' (เพลงในห้องเกม), 'preview' (ฟังตัวอย่าง) อยู่บนสุด
 *   ชั้นบนสุดที่ตั้งเพลงไว้คือเพลงที่ได้ยิน ตั้งเป็น null = เงียบ (บังชั้นล่างด้วย) ปล่อยชั้น = ให้ชั้นล่างเล่นต่อ
 * - มีไฟล์ใน public/music/manifest.json = เล่นไฟล์ mp3 ไม่งั้นสังเคราะห์สดด้วย Web Audio (ไม่ต้องโหลดอะไร)
 * - เบราว์เซอร์ต้องมีการแตะ/คลิกก่อน เพลงจึงจะดังได้ (ระบบรอแตะครั้งแรกให้เอง)
 */
import { TRACKS } from './music-tracks';

type Owner = 'site' | 'room' | 'preview';
const ORDER: Owner[] = ['preview', 'room', 'site'];
const layers = new Map<Owner, string | null>();

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let current: string | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let fileAudio: HTMLAudioElement | null = null;
let files: Set<string> | null = null;
let filesLoading = false;
let unlockArmed = false;

const VOLUME = 0.34;

/* ------------------------------ เลือกเพลงจากชั้น ------------------------------ */

function wanted(): string | null {
  for (const o of ORDER) if (layers.has(o)) return layers.get(o) ?? null;
  return null;
}

/** ตั้งเพลงของชั้นนี้ (null = เงียบ) */
export function setMusic(owner: Owner, id: string | null) {
  layers.set(owner, id);
  apply();
}

/** ปล่อยชั้นนี้ ให้ชั้นล่างเล่นต่อ */
export function releaseMusic(owner: Owner) {
  layers.delete(owner);
  apply();
}

export const nowPlaying = () => current;

function apply() {
  if (typeof window === 'undefined') return;
  const id = wanted();
  if (id === current && (timer || fileAudio)) return;
  stopAll();
  current = id;
  if (!id) return;
  loadFiles();
  armUnlock();
  if (files && files.has(id)) playFile(id);
  else if (ensure()) startSynth(id);
}

/** เบราว์เซอร์ยังไม่ให้เล่นเสียง: รอแตะ/กดปุ่มครั้งแรกแล้วเล่นต่อ */
function armUnlock() {
  if (unlockArmed) return;
  unlockArmed = true;
  const go = () => {
    unlockArmed = false;
    window.removeEventListener('pointerdown', go, true);
    window.removeEventListener('keydown', go, true);
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => null);
    if (fileAudio && fileAudio.paused) fileAudio.play().catch(() => null);
  };
  window.addEventListener('pointerdown', go, true);
  window.addEventListener('keydown', go, true);
}

function loadFiles() {
  if (files || filesLoading) return;
  filesLoading = true;
  fetch('/music/manifest.json', { cache: 'no-cache' })
    .then((r) => (r.ok ? r.json() : { tracks: [] }))
    .then((j: { tracks?: string[] }) => {
      files = new Set(Array.isArray(j.tracks) ? j.tracks : []);
    })
    .catch(() => {
      files = new Set();
    })
    .finally(() => {
      filesLoading = false;
      // เพลงที่กำลังเล่นมีไฟล์จริง: สลับไปเล่นไฟล์
      if (current && files?.has(current) && !fileAudio) {
        current = null;
        apply();
      }
    });
}

function ensure(): boolean {
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return false;
    try {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = VOLUME;
      master.connect(ctx.destination);
    } catch {
      return false;
    }
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => null);
  return ctx.state !== 'closed';
}

function stopAll() {
  if (timer) clearInterval(timer);
  timer = null;
  if (fileAudio) {
    fileAudio.pause();
    fileAudio = null;
  }
  if (master && ctx) {
    // ค่อยๆ เบาลงแล้วต่อเส้นใหม่ (ตัดโน้ตที่ค้าง)
    const old = master;
    old.gain.setTargetAtTime(0, ctx.currentTime, 0.08);
    setTimeout(() => old.disconnect(), 500);
    master = ctx.createGain();
    master.gain.value = VOLUME;
    master.connect(ctx.destination);
  }
}

function playFile(id: string) {
  const a = new Audio(`/music/${id}.mp3`);
  a.loop = true;
  a.volume = 0.5;
  fileAudio = a;
  a.play().catch(() => null); // ยังไม่ได้แตะจอ: armUnlock จะเล่นให้ตอนแตะครั้งแรก
}

/* ------------------------------ สังเคราะห์เพลง ------------------------------ */

type Wave = OscillatorType;
interface Recipe {
  root: number; // โน้ต MIDI ของคีย์
  scale: number[];
  prog: number[]; // ดีกรีของคอร์ดทีละห้อง (4 ห้อง)
  swing?: number;
  lead?: { wave: Wave; oct: number; density: number; len: number; gain: number; cut?: number; bell?: boolean };
  bass?: { wave: Wave; pat: string; gain: number; cut?: number };
  chord?: { wave: Wave; pat: string; gain: number; len: number; cut?: number; pad?: boolean };
  arp?: { wave: Wave; pat: string; gain: number; oct: number; cut?: number };
  drums?: { k: string; s: string; h: string; gain: number };
}

const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const MINOR = [0, 2, 3, 5, 7, 8, 10];
const PENTA = [0, 2, 4, 7, 9];
const MPENTA = [0, 3, 5, 7, 10];
const DORIAN = [0, 2, 3, 5, 7, 9, 10];

// รูปแบบ 16 ช่อง: x = เล่น, - = เว้น (เบส: x = โน้ตหลัก, o = ขั้นห้า, h = สูงคู่แปด)
const R: Record<string, Recipe> = {
  home: {
    root: 60, scale: MAJOR, prog: [0, 4, 5, 3],
    lead: { wave: 'triangle', oct: 1, density: 0.42, len: 2, gain: 0.07, bell: true },
    bass: { wave: 'sine', pat: 'x---o---x---o-x-', gain: 0.13 },
    chord: { wave: 'triangle', pat: '--x---x---x---x-', gain: 0.025, len: 1 },
    drums: { k: 'x-------x-------', s: '----x-------x---', h: '--x---x---x---x-', gain: 0.5 },
  },
  happy: {
    root: 62, scale: MAJOR, prog: [0, 5, 3, 4],
    lead: { wave: 'square', oct: 1, density: 0.55, len: 1, gain: 0.035, cut: 2600 },
    bass: { wave: 'sawtooth', pat: 'x-x-o-x-x-x-o-h-', gain: 0.07, cut: 700 },
    chord: { wave: 'sawtooth', pat: '--x---x---x---x-', gain: 0.02, len: 1, cut: 1800 },
    drums: { k: 'x---x---x---x---', s: '----x-------x---', h: 'x-x-x-x-x-x-x-x-', gain: 0.7 },
  },
  chip: {
    root: 64, scale: MINOR, prog: [0, 5, 2, 6],
    lead: { wave: 'square', oct: 1, density: 0.68, len: 1, gain: 0.04 },
    bass: { wave: 'triangle', pat: 'x-h-x-h-x-h-x-h-', gain: 0.12 },
    arp: { wave: 'square', pat: 'xxxxxxxxxxxxxxxx', gain: 0.016, oct: 2 },
    drums: { k: 'x-----x-x-------', s: '----x-------x--x', h: 'x-x-x-x-x-x-x-x-', gain: 0.6 },
  },
  lofi: {
    root: 57, scale: DORIAN, prog: [0, 3, 4, 2], swing: 0.2,
    lead: { wave: 'triangle', oct: 1, density: 0.28, len: 3, gain: 0.05, bell: true },
    bass: { wave: 'sine', pat: 'x-----x---o-----', gain: 0.15 },
    chord: { wave: 'triangle', pat: 'x-------x-------', gain: 0.03, len: 7, pad: true },
    drums: { k: 'x-------x-x-----', s: '----x-------x---', h: '--x---x---x---xx', gain: 0.45 },
  },
  quest: {
    root: 55, scale: MINOR, prog: [0, 5, 2, 4],
    lead: { wave: 'sawtooth', oct: 1, density: 0.4, len: 3, gain: 0.03, cut: 1900 },
    bass: { wave: 'sawtooth', pat: 'x-x-x-x-x-x-x-x-', gain: 0.06, cut: 500 },
    chord: { wave: 'sawtooth', pat: 'x---------------', gain: 0.018, len: 15, cut: 1400, pad: true },
    arp: { wave: 'triangle', pat: 'x-xx-xx-x-xx-xx-', gain: 0.03, oct: 1 },
    drums: { k: 'x-------x-x-----', s: '------------x-x-', h: '----------------', gain: 0.75 },
  },
  mystery: {
    root: 57, scale: MPENTA, prog: [0, 3, 1, 4],
    lead: { wave: 'sine', oct: 1, density: 0.22, len: 4, gain: 0.07, bell: true },
    bass: { wave: 'sine', pat: 'x---------------', gain: 0.12 },
    chord: { wave: 'triangle', pat: 'x---------------', gain: 0.022, len: 16, pad: true },
    drums: { k: '----------------', s: '----------------', h: '--x-----x--x----', gain: 0.35 },
  },
  race: {
    root: 64, scale: MINOR, prog: [0, 0, 5, 6],
    lead: { wave: 'sawtooth', oct: 1, density: 0.5, len: 1, gain: 0.028, cut: 2400 },
    bass: { wave: 'sawtooth', pat: 'xhxhxhxhxhxhxhxh', gain: 0.06, cut: 650 },
    chord: { wave: 'square', pat: '--x--x----x--x--', gain: 0.016, len: 1, cut: 2000 },
    drums: { k: 'x---x---x---x---', s: '----x-------x---', h: 'xxxxxxxxxxxxxxxx', gain: 0.75 },
  },
  musicbox: {
    root: 72, scale: MAJOR, prog: [0, 3, 4, 0],
    lead: { wave: 'sine', oct: 0, density: 0.6, len: 2, gain: 0.08, bell: true },
    bass: { wave: 'triangle', pat: 'x-----o-x-----o-', gain: 0.07 },
    arp: { wave: 'sine', pat: 'x---x---x---x---', gain: 0.035, oct: 1 },
  },
  funk: {
    root: 60, scale: DORIAN, prog: [0, 0, 3, 4], swing: 0.16,
    lead: { wave: 'square', oct: 1, density: 0.45, len: 1, gain: 0.03, cut: 2200 },
    bass: { wave: 'sawtooth', pat: 'x--x-hx--x-ox-h-', gain: 0.08, cut: 900 },
    chord: { wave: 'square', pat: '-x---x-x-x---x--', gain: 0.018, len: 1, cut: 2600 },
    drums: { k: 'x--x--x---x--x--', s: '----x--x----x---', h: 'x-xxx-xxx-xxx-xx', gain: 0.6 },
  },
  thai: {
    root: 62, scale: PENTA, prog: [0, 3, 1, 4],
    lead: { wave: 'triangle', oct: 1, density: 0.75, len: 1, gain: 0.07, bell: true },
    bass: { wave: 'triangle', pat: 'x---x---x---x-x-', gain: 0.12 },
    arp: { wave: 'square', pat: 'x-x-x-x-x-x-x-x-', gain: 0.012, oct: 2 },
    drums: { k: 'x---x---x---x---', s: '------x-------x-', h: '--x---x---x---x-', gain: 0.6 },
  },
  boss: {
    root: 52, scale: MINOR, prog: [0, 5, 6, 4],
    lead: { wave: 'sawtooth', oct: 1, density: 0.5, len: 2, gain: 0.03, cut: 2200 },
    bass: { wave: 'sawtooth', pat: 'xxxxxxxxxxxxxxxx', gain: 0.06, cut: 450 },
    chord: { wave: 'sawtooth', pat: 'x-----x-x-------', gain: 0.03, len: 2, cut: 1300 },
    drums: { k: 'x-x---x-x-x---x-', s: '----x-------x---', h: 'x-x-x-x-x-x-x-x-', gain: 0.8 },
  },
};

const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

function seeded(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

/** ทำนอง 8 ห้อง: ห้อง 5-8 เล่นซ้ำห้อง 1-4 แต่เปลี่ยนตอนจบ (ฟังติดหูกว่าสุ่มล้วน) */
function makeMelody(id: string, r: Recipe): (number | null)[][] {
  const rnd = seeded(id);
  const n = r.scale.length;
  const bars: (number | null)[][] = [];
  let deg = 0;
  for (let b = 0; b < 8; b++) {
    if (b >= 4 && b < 7) {
      bars.push(bars[b - 4].slice());
      continue;
    }
    const chordRoot = r.prog[b % 4];
    const row: (number | null)[] = [];
    for (let s = 0; s < 16; s++) {
      const strong = s % 4 === 0;
      const p = (r.lead?.density || 0.4) * (strong ? 1.4 : s % 2 === 0 ? 0.9 : 0.5);
      if (rnd() < p) {
        if (strong) {
          const tones = [chordRoot, chordRoot + 2, chordRoot + 4];
          deg = tones[Math.floor(rnd() * 3)] + (rnd() < 0.3 ? n : 0);
        } else deg += rnd() < 0.5 ? 1 : -1;
        deg = Math.max(-2, Math.min(n + 4, deg));
        row.push(deg);
      } else row.push(null);
    }
    if (b === 7) row[0] = chordRoot; // จบห้องสุดท้ายที่โน้ตหลัก
    bars.push(row);
  }
  return bars;
}

function degToMidi(r: Recipe, deg: number, oct = 0) {
  const n = r.scale.length;
  const o = Math.floor(deg / n);
  const i = ((deg % n) + n) % n;
  return r.root + 12 * (o + oct) + r.scale[i];
}

function note(freq: number, t: number, dur: number, wave: Wave, gain: number, opts: { cut?: number; bell?: boolean; pad?: boolean } = {}) {
  if (!ctx || !master) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = wave;
  o.frequency.setValueAtTime(freq, t);
  const attack = opts.pad ? Math.min(0.6, dur * 0.3) : 0.008;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + attack);
  if (opts.bell) g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.25, dur * 1.6));
  else {
    g.gain.setValueAtTime(gain, t + Math.max(attack, dur * 0.7));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }
  let out: AudioNode = g;
  if (opts.cut) {
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = opts.cut;
    g.connect(f);
    out = f;
  }
  o.connect(g);
  out.connect(master);
  o.start(t);
  o.stop(t + (opts.bell ? Math.max(0.3, dur * 1.7) : dur) + 0.05);
}

let noiseBuf: AudioBuffer | null = null;
function noise(t: number, dur: number, gain: number, type: BiquadFilterType, freq: number) {
  if (!ctx || !master) return;
  if (!noiseBuf) {
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t);
  src.stop(t + dur + 0.02);
}

function kick(t: number, gain: number) {
  if (!ctx || !master) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.frequency.setValueAtTime(150, t);
  o.frequency.exponentialRampToValueAtTime(45, t + 0.18);
  g.gain.setValueAtTime(0.32 * gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + 0.26);
}

function startSynth(id: string) {
  const r = R[id] || R.happy;
  const info = TRACKS.find((x) => x.id === id);
  const bpm = info?.bpm || 110;
  const stepDur = 60 / bpm / 4;
  const mel = makeMelody(id, r);
  let step = 0;
  let next = ctx!.currentTime + 0.08;
  const tick = () => {
    if (!ctx || current !== id) return;
    while (next < ctx.currentTime + 0.25) {
      playStep(r, mel, step, next, stepDur);
      const sw = r.swing && step % 2 === 0 ? stepDur * r.swing : r.swing ? -stepDur * r.swing : 0;
      next += stepDur + sw;
      step++;
    }
  };
  tick();
  timer = setInterval(tick, 60);
}

function playStep(r: Recipe, mel: (number | null)[][], step: number, t: number, sd: number) {
  const s = step % 16;
  const bar = Math.floor(step / 16);
  const chordRoot = r.prog[bar % 4];
  if (r.lead) {
    const d = mel[bar % 8][s];
    if (d !== null) note(mtof(degToMidi(r, d, r.lead.oct)), t, sd * r.lead.len, r.lead.wave, r.lead.gain, { cut: r.lead.cut, bell: r.lead.bell });
  }
  if (r.bass) {
    const c = r.bass.pat[s];
    if (c !== '-') {
      const base = degToMidi(r, chordRoot, -2);
      const m = c === 'o' ? degToMidi(r, chordRoot + 4, -2) : c === 'h' ? base + 12 : base;
      note(mtof(m), t, sd * 1.6, r.bass.wave, r.bass.gain, { cut: r.bass.cut });
    }
  }
  if (r.chord && r.chord.pat[s] === 'x') {
    [0, 2, 4].forEach((k) => note(mtof(degToMidi(r, chordRoot + k, 0)), t, sd * r.chord!.len, r.chord!.wave, r.chord!.gain, { cut: r.chord!.cut, pad: r.chord!.pad }));
  }
  if (r.arp && r.arp.pat[s] === 'x') {
    const k = [0, 2, 4, 2][s % 4] + (s >= 8 ? r.scale.length : 0);
    note(mtof(degToMidi(r, chordRoot + k, r.arp.oct)), t, sd * 0.9, r.arp.wave, r.arp.gain, { cut: r.arp.cut, bell: r.arp.wave === 'sine' });
  }
  if (r.drums) {
    const g = r.drums.gain;
    if (r.drums.k[s] === 'x') kick(t, g);
    if (r.drums.s[s] === 'x') {
      noise(t, 0.16, 0.12 * g, 'bandpass', 1800);
      note(190, t, 0.08, 'triangle', 0.05 * g);
    }
    if (r.drums.h[s] === 'x') noise(t, 0.04, 0.05 * g, 'highpass', 7000);
  }
}
