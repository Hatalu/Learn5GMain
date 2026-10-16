'use client';

/**
 * เสียงของระบบสร้างเกม/ห้องเล่นสด (Web Audio สังเคราะห์ ไม่ต้องโหลดไฟล์)
 * ใช้สวิตช์เสียงเดียวกับทั้งเว็บ (getPrefs().sfx) ถ้าเบราว์เซอร์ไม่รองรับก็เงียบไปเฉยๆ
 */
import { getPrefs, loadPrefs } from '@/lib/sound';

let ctx: AudioContext | null = null;
let out: GainNode | null = null;
let prefsLoaded = false;
let muted = false;

function ensure(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!prefsLoaded) {
    prefsLoaded = true;
    try {
      loadPrefs();
    } catch {
      /* ignore */
    }
  }
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
      out = ctx.createGain();
      out.gain.value = 0.9;
      out.connect(ctx.destination);
    } catch {
      return null;
    }
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => null);
  return ctx;
}

export function setGameMuted(m: boolean) {
  muted = m;
}
export const isGameMuted = () => muted;

interface ToneOpt {
  type?: OscillatorType;
  gain?: number;
  slideTo?: number;
  attack?: number;
}

function tone(c: AudioContext, f: number, t: number, dur: number, o: ToneOpt = {}) {
  if (!out) return;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = o.type || 'sine';
  osc.frequency.setValueAtTime(f, t);
  if (o.slideTo) osc.frequency.exponentialRampToValueAtTime(o.slideTo, t + dur);
  const peak = o.gain ?? 0.15;
  const a = o.attack ?? 0.008;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(out);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

function noise(c: AudioContext, t: number, dur: number, gain = 0.08, hp = 1200) {
  if (!out) return;
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = 'highpass';
  f.frequency.value = hp;
  const g = c.createGain();
  g.gain.value = gain;
  src.connect(f).connect(g).connect(out);
  src.start(t);
}

function play(fn: (c: AudioContext, t: number) => void) {
  if (muted) return;
  try {
    if (!getPrefs().sfx) return;
  } catch {
    /* ignore */
  }
  const c = ensure();
  if (!c) return;
  try {
    fn(c, c.currentTime + 0.01);
  } catch {
    /* ignore */
  }
}

export const gsfx = {
  /** เปิดเสียงได้หลังผู้ใช้แตะจอครั้งแรก */
  unlock() {
    ensure();
  },
  tap() {
    play((c, t) => tone(c, 520, t, 0.08, { slideTo: 980, gain: 0.1 }));
  },
  pick() {
    play((c, t) => {
      tone(c, 660, t, 0.1, { slideTo: 1320, gain: 0.13 });
      tone(c, 1320, t + 0.05, 0.12, { gain: 0.05 });
    });
  },
  join() {
    play((c, t) => {
      tone(c, 392, t, 0.12, { slideTo: 784, gain: 0.12 });
      tone(c, 988, t + 0.09, 0.18, { gain: 0.08 });
    });
  },
  tick(urgent = false) {
    play((c, t) => tone(c, urgent ? 1100 : 820, t, 0.05, { type: 'square', gain: urgent ? 0.05 : 0.03 }));
  },
  correct() {
    play((c, t) => {
      [784, 988, 1175, 1568].forEach((f, i) => tone(c, f, t + i * 0.07, 0.32, { type: 'triangle', gain: 0.14 }));
      tone(c, 2093, t + 0.3, 0.5, { gain: 0.06 });
    });
  },
  wrong() {
    // นุ่มนวล ไม่ดุ
    play((c, t) => {
      tone(c, 392, t, 0.22, { type: 'triangle', gain: 0.12, slideTo: 330 });
      tone(c, 330, t + 0.16, 0.3, { type: 'triangle', gain: 0.1, slideTo: 262 });
    });
  },
  timeout() {
    play((c, t) => {
      tone(c, 523, t, 0.15, { type: 'sine', gain: 0.1 });
      tone(c, 392, t + 0.14, 0.35, { type: 'sine', gain: 0.1 });
    });
  },
  streak() {
    play((c, t) => {
      [1047, 1319, 1568, 2093].forEach((f, i) => tone(c, f, t + i * 0.05, 0.18, { gain: 0.07 }));
      noise(c, t, 0.25, 0.04, 4000);
    });
  },
  start() {
    play((c, t) => {
      [523, 659, 784].forEach((f, i) => tone(c, f, t + i * 0.12, 0.2, { type: 'square', gain: 0.06 }));
      tone(c, 1047, t + 0.38, 0.6, { type: 'triangle', gain: 0.16 });
      noise(c, t + 0.38, 0.4, 0.05, 3000);
    });
  },
  count() {
    play((c, t) => tone(c, 660, t, 0.18, { type: 'triangle', gain: 0.14 }));
  },
  go() {
    play((c, t) => tone(c, 1320, t, 0.4, { type: 'triangle', gain: 0.16 }));
  },
  fanfare() {
    play((c, t) => {
      const seq = [523, 523, 523, 659, 784, 659, 784, 1047];
      seq.forEach((f, i) => tone(c, f, t + i * 0.13, 0.24, { type: 'triangle', gain: 0.15 }));
      [1047, 1319, 1568].forEach((f) => tone(c, f, t + 1.1, 1.2, { type: 'sine', gain: 0.07 }));
      noise(c, t + 1.05, 0.8, 0.05, 2500);
    });
  },
  drum() {
    play((c, t) => {
      for (let i = 0; i < 16; i++) tone(c, 110 + (i % 2) * 8, t + i * 0.07, 0.08, { type: 'triangle', gain: 0.08 + i * 0.006 });
    });
  },
  whoosh() {
    play((c, t) => noise(c, t, 0.35, 0.06, 900));
  },
};

/* ------------------------------ BGM ห้องรอ ------------------------------ */
let bgmTimer: ReturnType<typeof setInterval> | null = null;
let step = 0;
const MELODY = [523, 659, 784, 659, 587, 698, 880, 698, 523, 659, 784, 1047, 988, 784, 659, 587];
const BASS = [131, 131, 175, 175, 147, 147, 196, 196];

export function startLobbyMusic() {
  if (bgmTimer) return;
  step = 0;
  bgmTimer = setInterval(() => {
    play((c, t) => {
      const n = MELODY[step % MELODY.length];
      if (step % 2 === 0 || Math.random() < 0.5) tone(c, n, t, 0.22, { type: 'triangle', gain: 0.045 });
      if (step % 2 === 0) tone(c, BASS[(step / 2) % BASS.length], t, 0.4, { type: 'sine', gain: 0.06 });
      if (step % 4 === 2) noise(c, t, 0.05, 0.02, 6000);
    });
    step++;
  }, 260);
}

export function stopLobbyMusic() {
  if (bgmTimer) clearInterval(bgmTimer);
  bgmTimer = null;
}
