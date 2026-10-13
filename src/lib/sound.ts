/**
 * เสียงทั้งหมดสังเคราะห์ด้วย Web Audio (ไม่ต้องโหลดไฟล์) พร้อม graceful fallback
 * - SFX: ป๊อปฟองสบู่ / ประกาย / ระฆังแก้ว / เฉลิมฉลอง
 * - BGM: ทำนองเพนทาโทนิกเบาๆ วนลูป (ปิดเป็นค่าเริ่มต้น)
 * เบราว์เซอร์ต้องมีการแตะ/คลิกก่อนจึงจะเล่นเสียงได้ จึงสร้าง AudioContext ตอนมี gesture แรก
 */

const PREF_KEY = 'l5g_sound_v1';

export interface SoundPrefs {
  sfx: boolean;
  bgm: boolean;
}

let prefs: SoundPrefs = { sfx: true, bgm: false };
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let bgmTimer: ReturnType<typeof setInterval> | null = null;
let bgmStep = 0;
const listeners = new Set<() => void>();

export function loadPrefs(): SoundPrefs {
  try {
    const raw = window.localStorage.getItem(PREF_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      prefs = { sfx: p.sfx !== false, bgm: p.bgm === true };
    }
  } catch {
    /* ใช้ค่าเริ่มต้น */
  }
  return prefs;
}

export const getPrefs = () => prefs;
export const subscribePrefs = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

function savePrefs() {
  try {
    window.localStorage.setItem(PREF_KEY, JSON.stringify(prefs));
  } catch {
    /* ไม่เป็นไร */
  }
  listeners.forEach((l) => l());
}

function ensureCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    } catch {
      return null;
    }
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

/** เรียกเมื่อผู้ใช้แตะ/คลิกครั้งแรก เพื่อปลดล็อกเสียงและเริ่ม BGM ถ้าเปิดไว้ */
export function unlockAudio() {
  const c = ensureCtx();
  if (c && prefs.bgm) startBgm();
}

function tone(freq: number, start: number, dur: number, opts: { type?: OscillatorType; gain?: number; attack?: number; slideTo?: number } = {}) {
  const c = ctx;
  if (!c || !master) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = opts.type || 'sine';
  o.frequency.setValueAtTime(freq, start);
  if (opts.slideTo) o.frequency.exponentialRampToValueAtTime(opts.slideTo, start + dur);
  const peak = opts.gain ?? 0.2;
  const attack = opts.attack ?? 0.01;
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(peak, start + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g).connect(master);
  o.start(start);
  o.stop(start + dur + 0.05);
}

function play(fn: (t: number) => void) {
  if (!prefs.sfx) return;
  const c = ensureCtx();
  if (!c) return;
  fn(c.currentTime + 0.01);
}

export const sfx = {
  /** ป๊อปฟองสบู่ (กดปุ่ม) */
  pop() {
    play((t) => tone(480, t, 0.09, { slideTo: 940, gain: 0.16 }));
  },
  /** ประกายสั้นๆ (ได้ของ/เลื่อนผ่านของพิเศษ) */
  sparkle() {
    play((t) => {
      [1318, 1568, 2093].forEach((f, i) => tone(f, t + i * 0.07, 0.22, { gain: 0.1 }));
    });
  },
  /** ระฆังแก้วตอนตัวละครตื่น */
  wake() {
    play((t) => {
      tone(784, t, 0.5, { gain: 0.12 });
      tone(1175, t + 0.12, 0.6, { gain: 0.1 });
    });
  },
  /** เฉลิมฉลอง (ได้สติกเกอร์/ตัวละครโต) */
  cheer() {
    play((t) => {
      [523, 659, 784, 1047].forEach((f, i) => tone(f, t + i * 0.1, 0.35, { type: 'triangle', gain: 0.16 }));
      tone(1568, t + 0.45, 0.6, { gain: 0.09 });
    });
  },
};

/* ------------------------------ BGM ------------------------------ */
// C เมเจอร์เพนทาโทนิก: C D E G A (หลายอ็อกเทฟ) ฟังสบาย ไม่ขัดกัน
const SCALE = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99];
const PAD_CHORDS = [
  [130.81, 196.0, 329.63],
  [110.0, 164.81, 261.63],
  [87.31, 130.81, 220.0],
  [98.0, 146.83, 246.94],
];

function bgmTick() {
  const c = ctx;
  if (!c || !master || !prefs.bgm || c.state !== 'running') return;
  const t = c.currentTime + 0.05;
  if (bgmStep % 8 === 0) {
    const chord = PAD_CHORDS[(bgmStep / 8) % PAD_CHORDS.length];
    chord.forEach((f) => tone(f, t, 5.2, { gain: 0.022, attack: 1.2 }));
  }
  if (Math.random() < 0.62) {
    const f = SCALE[Math.floor(Math.random() * SCALE.length)];
    tone(f, t, 1.4, { type: 'triangle', gain: 0.03, attack: 0.03 });
  }
  bgmStep++;
}

export function startBgm() {
  if (bgmTimer || !ensureCtx()) return;
  bgmTick();
  bgmTimer = setInterval(bgmTick, 650);
}

export function stopBgm() {
  if (bgmTimer) clearInterval(bgmTimer);
  bgmTimer = null;
}

/** โหลดค่าที่จำไว้แล้วแจ้ง UI (ไม่เริ่มเสียง) */
export function initPrefs() {
  loadPrefs();
  listeners.forEach((l) => l());
}

export function setPrefs(next: Partial<SoundPrefs>) {
  prefs = { ...prefs, ...next };
  savePrefs();
  if (prefs.bgm) startBgm();
  else stopBgm();
  if (next.sfx) sfx.pop();
}

/** พูดข้อความด้วยเสียงไทยของเบราว์เซอร์ (ถ้ามี) คืน false ถ้าไม่รองรับ */
export function speakThai(text: string): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;
  const voices = window.speechSynthesis.getVoices();
  const th = voices.find((v) => v.lang?.toLowerCase().startsWith('th'));
  if (!th) return false;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.voice = th;
  u.lang = th.lang;
  u.rate = 1;
  u.pitch = 1.25;
  window.speechSynthesis.speak(u);
  return true;
}
