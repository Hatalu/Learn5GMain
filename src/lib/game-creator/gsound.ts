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
  /** เปิดตัวอันดับบนแท่นรับรางวัล (1 = ใหญ่สุด) */
  reveal(place = 3) {
    play((c, t) => {
      noise(c, t, 0.3, 0.05, 700);
      tone(c, 90, t, 0.35, { type: 'sine', gain: 0.22, slideTo: 45 });
      const base = place === 1 ? [523, 659, 784, 1047] : place === 2 ? [440, 554, 659] : [392, 494];
      base.forEach((f, i) => tone(c, f, t + 0.08 + i * 0.09, 0.4, { type: 'triangle', gain: 0.12 }));
      if (place === 1) noise(c, t + 0.1, 1.1, 0.06, 3200);
    });
  },
  /** เลเวลอัป (Monster Brawl) */
  levelUp() {
    play((c, t) => {
      [523, 659, 784, 1047, 1319].forEach((f, i) => tone(c, f, t + i * 0.06, 0.22, { type: 'square', gain: 0.05 }));
      tone(c, 1568, t + 0.32, 0.5, { type: 'triangle', gain: 0.08 });
    });
  },
  /** ค้อนทุบพื้น / ระเบิด */
  boom() {
    play((c, t) => {
      tone(c, 120, t, 0.3, { type: 'sine', gain: 0.25, slideTo: 40 });
      noise(c, t, 0.25, 0.07, 400);
    });
  },
  /** เหวี่ยงเบ็ด */
  cast() {
    play((c, t) => {
      noise(c, t, 0.4, 0.05, 2500);
      tone(c, 700, t, 0.4, { type: 'sine', gain: 0.05, slideTo: 1600 });
    });
  },
  /** ตกน้ำ */
  plop() {
    play((c, t) => {
      tone(c, 900, t, 0.12, { type: 'sine', gain: 0.12, slideTo: 260 });
      noise(c, t + 0.03, 0.18, 0.04, 1800);
    });
  },
  /** ปลากินเบ็ด */
  bite() {
    play((c, t) => {
      tone(c, 1200, t, 0.08, { type: 'square', gain: 0.06 });
      tone(c, 1200, t + 0.14, 0.08, { type: 'square', gain: 0.06 });
    });
  },
  /** หมุนรอกดึงปลา */
  reel() {
    play((c, t) => tone(c, 380 + Math.random() * 60, t, 0.05, { type: 'square', gain: 0.025 }));
  },
  /** ระยิบระยับตอนจบชุดคำถาม */
  sparkleish() {
    play((c, t) => [1568, 2093, 2637].forEach((f, i) => tone(c, f, t + i * 0.06, 0.25, { gain: 0.07 })));
  },
  coin() {
    play((c, t) => {
      tone(c, 988, t, 0.08, { type: 'square', gain: 0.05 });
      tone(c, 1319, t + 0.07, 0.22, { type: 'square', gain: 0.05 });
    });
  },
  cash() {
    play((c, t) => {
      noise(c, t, 0.08, 0.05, 5000);
      [1319, 1568, 2093].forEach((f, i) => tone(c, f, t + 0.05 + i * 0.05, 0.2, { type: 'triangle', gain: 0.09 }));
    });
  },
  cook() {
    play((c, t) => noise(c, t, 0.25, 0.035, 2200));
  },
  door() {
    play((c, t) => {
      tone(c, 1760, t, 0.5, { gain: 0.05 });
      tone(c, 2217, t + 0.12, 0.5, { gain: 0.04 });
    });
  },
  sad() {
    play((c, t) => tone(c, 330, t, 0.3, { type: 'triangle', gain: 0.07, slideTo: 247 }));
  },
  build() {
    play((c, t) => {
      tone(c, 196, t, 0.12, { type: 'square', gain: 0.06 });
      tone(c, 392, t + 0.1, 0.18, { type: 'triangle', gain: 0.1 });
      noise(c, t, 0.15, 0.05, 600);
    });
  },
  shoot(kind = 0) {
    play((c, t) => {
      if (kind === 2) noise(c, t, 0.18, 0.025, 800);
      else tone(c, kind === 1 ? 1200 : 900, t, 0.05, { type: 'square', gain: 0.018, slideTo: kind === 1 ? 700 : 500 });
    });
  },
  splat() {
    play((c, t) => {
      tone(c, 260, t, 0.12, { type: 'sine', gain: 0.1, slideTo: 90 });
      noise(c, t, 0.08, 0.03, 1500);
    });
  },
  hurt() {
    play((c, t) => tone(c, 180, t, 0.25, { type: 'sawtooth', gain: 0.05, slideTo: 90 }));
  },
  wave() {
    play((c, t) => [392, 523, 659].forEach((f, i) => tone(c, f, t + i * 0.09, 0.3, { type: 'square', gain: 0.05 })));
  },
  boost() {
    play((c, t) => {
      tone(c, 300, t, 0.4, { type: 'sawtooth', gain: 0.05, slideTo: 1400 });
      noise(c, t + 0.1, 0.3, 0.04, 3000);
    });
  },
  slip() {
    play((c, t) => tone(c, 900, t, 0.45, { type: 'sine', gain: 0.1, slideTo: 150 }));
  },
  step() {
    play((c, t) => tone(c, 520, t, 0.07, { type: 'triangle', gain: 0.07, slideTo: 780 }));
  },
  /** แตรไซเรน 1 ครั้ง (บอสตื่น) */
  siren() {
    play((c, t) => {
      for (let i = 0; i < 2; i++) {
        tone(c, 560, t + i * 0.8, 0.4, { type: 'sawtooth', gain: 0.07, slideTo: 1150, attack: 0.03 });
        tone(c, 1150, t + i * 0.8 + 0.4, 0.4, { type: 'sawtooth', gain: 0.07, slideTo: 560 });
      }
    });
  },
};
