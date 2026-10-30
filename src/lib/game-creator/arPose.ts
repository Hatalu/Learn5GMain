/**
 * ตรรกะตรวจท่าทางเกม AR (ไม่ใช้ DOM จึงทดสอบใน selftest ได้)
 * - จุดจาก MediaPipe เป็นค่า 0..1 ของเฟรมวิดีโอ ต้องแปลงผ่าน object-fit: cover + กลับซ้ายขวา (กระจก) ให้ตรงกับที่เห็นบนจอ
 * - จุดเล็งอยู่ที่มือจริงบนจอ (ขยายระยะจากไหล่ได้นิดหน่อย) ใช้ได้ทั้งสองมือพร้อมกัน มือละเป้า
 * - กันสั่น 3 ชั้น: กรองทุกจุดบนร่างกาย (One Euro), จุดอ้างอิงไหล่กรองหนักกว่า, จอวาดไหลตามทุกเฟรม (Follow)
 * - เลือกตอบด้วยการค้างเป้า (dwell) ไม่ต้องทำท่ายิงที่ตรวจพลาดง่าย
 */

export interface Lm {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

/** ดัชนีจุดบนร่างกาย (MediaPipe Pose 33 จุด) */
export const P = {
  nose: 0,
  lShoulder: 11,
  rShoulder: 12,
  lElbow: 13,
  rElbow: 14,
  lWrist: 15,
  rWrist: 16,
  lIndex: 19,
  rIndex: 20,
  lHip: 23,
  rHip: 24,
} as const;

/** เส้นโครงร่างที่วาดให้เด็กเห็น (ช่วงบนตัว + สะโพก) */
export const BONES: [number, number][] = [
  [11, 12],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
  [11, 23],
  [12, 24],
  [23, 24],
  [15, 19],
  [16, 20],
];

const VIS = 0.5;
export const seen = (l: Lm | undefined, min = VIS) => !!l && (l.visibility ?? 1) >= min;

/** ขนาดภาพวิดีโอบนจอแบบ object-fit: cover */
export interface View {
  vw: number;
  vh: number;
  cw: number;
  ch: number;
  /** กลับซ้ายขวาแบบกระจก (กล้องหน้า) */
  mirror: boolean;
}

/** จุด 0..1 ของเฟรมวิดีโอ -> พิกเซลบนจอ (ตรงกับภาพที่เห็นจริง) */
export function toScreen(x: number, y: number, v: View): { x: number; y: number } {
  const s = Math.max(v.cw / v.vw, v.ch / v.vh);
  const ox = (v.cw - v.vw * s) / 2;
  const oy = (v.ch - v.vh * s) / 2;
  const nx = v.mirror ? 1 - x : x;
  return { x: ox + nx * v.vw * s, y: oy + y * v.vh * s };
}

/* ------------------------------ One Euro filter ------------------------------ */

const alpha = (cutoff: number, dt: number) => {
  const tau = 1 / (2 * Math.PI * cutoff);
  return 1 / (1 + tau / dt);
};

/** กรองสั่นแบบปรับตามความเร็ว: ขยับช้า = นิ่งมาก, ขยับเร็ว = ตามทัน (Casiez et al. 2012) */
export class OneEuro {
  private x: number | null = null;
  private dx = 0;
  constructor(
    private minCutoff = 1.2,
    private beta = 0.008,
    private dCutoff = 1
  ) {}
  reset() {
    this.x = null;
    this.dx = 0;
  }
  filter(v: number, dt: number): number {
    if (this.x === null || dt <= 0) {
      this.x = v;
      return v;
    }
    const d = (v - this.x) / dt;
    this.dx += alpha(this.dCutoff, dt) * (d - this.dx);
    const cut = this.minCutoff + this.beta * Math.abs(this.dx);
    this.x += alpha(cut, dt) * (v - this.x);
    return this.x;
  }
}

/** จุดบนจอที่ไหลตามเป้าหมายทุกเฟรม (ผลตรวจมา 15-30 ครั้ง/วิ แต่จอวาด 60: ไม่ให้เห็นเป็นขั้นบันได) */
export class Follow {
  x = 0;
  y = 0;
  on = false;
  constructor(private rate = 26) {}
  step(tx: number, ty: number, dt: number) {
    if (!this.on) {
      this.x = tx;
      this.y = ty;
      this.on = true;
      return;
    }
    const k = 1 - Math.exp(-dt * this.rate);
    this.x += (tx - this.x) * k;
    this.y += (ty - this.y) * k;
  }
  reset() {
    this.on = false;
  }
}

/* ------------------------------ ร่างกาย 1 คน ------------------------------ */

export interface Body {
  /** จุดทั้งหมดบนจอ (พิกเซล) + ความชัด */
  pts: { x: number; y: number; v: number }[];
  /** กึ่งกลางไหล่ / ความกว้างไหล่ (พิกเซลบนจอ) */
  cx: number;
  cy: number;
  sw: number;
}

/** แปลงผลตรวจเป็นร่างบนจอ (ไม่เห็นไหล่ทั้งสองข้าง = ไม่นับว่าเห็นคน) */
export function toBody(lms: Lm[], v: View): Body | null {
  const ls = lms[P.lShoulder];
  const rs = lms[P.rShoulder];
  if (!seen(ls) || !seen(rs)) return null;
  const pts = lms.map((l) => ({ ...toScreen(l.x, l.y, v), v: l.visibility ?? 1 }));
  const a = pts[P.lShoulder];
  const b = pts[P.rShoulder];
  const sw = Math.hypot(a.x - b.x, a.y - b.y);
  // ไหล่แคบผิดปกติ = หันข้าง/ตรวจพลาด
  if (sw < 12) return null;
  return { pts, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, sw };
}

/**
 * กรองร่างกาย 1 คนให้นิ่ง: ทุกจุดผ่าน One Euro (นิ่งตอนอยู่กับที่ ตามทันตอนขยับเร็ว)
 * จุดที่ชัดน้อยชั่วขณะ (มือบังกันแวบเดียว) ใช้ค่าเดิมต่อได้ 250ms แทนการกระโดด
 * ไหล่กลาง/ความกว้างไหล่ (ใช้อ้างอิง) กรองหนักกว่า เพราะตัวคนขยับช้ากว่ามือ
 */
export class BodySmoother {
  private f: [OneEuro, OneEuro][] = [];
  private last: { x: number; y: number; v: number; t: number }[] = [];
  private ref = [new OneEuro(0.6, 0.004), new OneEuro(0.6, 0.004), new OneEuro(0.4, 0.002)];
  private at = 0;
  constructor(
    private minCutoff = 1.0,
    private beta = 0.015
  ) {}
  reset() {
    this.f = [];
    this.last = [];
    this.ref.forEach((r) => r.reset());
    this.at = 0;
  }
  smooth(b: Body, now: number): Body {
    const dt = this.at ? Math.max(0.001, (now - this.at) / 1000) : 0;
    this.at = now;
    const pts = b.pts.map((p, i) => {
      const f = (this.f[i] ||= [new OneEuro(this.minCutoff, this.beta), new OneEuro(this.minCutoff, this.beta)]);
      const prev = this.last[i];
      if (p.v < VIS && prev && prev.v >= VIS && now - prev.t < 250) return { x: prev.x, y: prev.y, v: prev.v };
      const q = { x: f[0].filter(p.x, dt), y: f[1].filter(p.y, dt), v: p.v };
      this.last[i] = { ...q, t: p.v >= VIS ? now : prev?.t ?? now };
      return q;
    });
    return { pts, cx: this.ref[0].filter(b.cx, dt), cy: this.ref[1].filter(b.cy, dt), sw: this.ref[2].filter(b.sw, dt) };
  }
}

/** แบ่งคนเข้าทีมตามตำแหน่งบนจอ (ซ้าย/ขวาของเส้นแบ่ง) ฝั่งละคนเดียว: เลือกคนที่อยู่ใกล้กล้องที่สุด (ไหล่กว้างสุด) */
export function assignSides(bodies: Body[], splitX: number, sides: 1 | 2): (Body | null)[] {
  if (sides === 1) return [bodies.reduce<Body | null>((best, b) => (!best || b.sw > best.sw ? b : best), null)];
  const out: (Body | null)[] = [null, null];
  for (const b of bodies) {
    const i = b.cx < splitX ? 0 : 1;
    if (!out[i] || b.sw > out[i]!.sw) out[i] = b;
  }
  return out;
}

/* ------------------------------ มือที่ใช้เล็ง ------------------------------ */

export type Hand = 'l' | 'r';

export const HANDS: Hand[] = ['l', 'r'];

/** จุดปลายมือ: เฉลี่ยข้อมือกับปลายนิ้วชี้ (นิ่งกว่าปลายนิ้วอย่างเดียว ชี้ตรงกว่าข้อมืออย่างเดียว) */
export function tip(b: Body, h: Hand): { x: number; y: number } | null {
  const w = b.pts[h === 'l' ? P.lWrist : P.rWrist];
  const i = b.pts[h === 'l' ? P.lIndex : P.rIndex];
  if (!w || w.v < VIS) return null;
  if (!i || i.v < VIS) return { x: w.x, y: w.y };
  return { x: (w.x + i.x) / 2, y: (w.y + i.y) / 2 };
}

/** มือยกขึ้น = ปลายมือสูงกว่าระดับท้อง (ไหล่ + 1.2 เท่าความกว้างไหล่) เล็งเป้าต่ำได้ แต่ปล่อยแขนข้างตัว = ไม่เล็ง */
export function raised(b: Body, h: Hand): boolean {
  const t = tip(b, h);
  return !!t && t.y < b.cy + b.sw * 1.2;
}

/** กรอบเล็งของฝั่ง (พิกเซลบนจอ) */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * มือ -> จุดเล็ง: อยู่ที่มือจริงบนจอ (gain 1) หรือยืดออกจากไหล่ (gain > 1 = ขยับแขนน้อยลง)
 * ไม่ยกมือ = ไม่เล็ง (กันเลือกโดยไม่ตั้งใจ) และไม่หลุดออกนอกฝั่งของตัวเอง
 */
export function aimFromHand(b: Body, h: Hand, gain: number, area: Rect): { x: number; y: number } | null {
  if (!raised(b, h)) return null;
  const t = tip(b, h)!;
  const x = b.cx + (t.x - b.cx) * gain;
  const y = b.cy + (t.y - b.cy) * gain;
  return { x: Math.min(area.x + area.w, Math.max(area.x, x)), y: Math.min(area.y + area.h, Math.max(area.y, y)) };
}

/** ยกสองมือเหนือหัว (ปลายมือสูงกว่าจมูก) = ท่าชาร์จพลัง */
export function bothUp(b: Body): boolean {
  const nose = b.pts[P.nose];
  const L = tip(b, 'l');
  const R = tip(b, 'r');
  if (!L || !R) return false;
  const line = nose && nose.v >= VIS ? nose.y : b.cy - b.sw * 0.9;
  return L.y < line - b.sw * 0.15 && R.y < line - b.sw * 0.15;
}

/** ท่าทางต้องเห็นติดกันหลายเฟรมถึงนับ และหายไปหลายเฟรมถึงเลิก (กันตรวจพลาดชั่วขณะ) */
export class Hold {
  private on = 0;
  private off = 0;
  active = false;
  constructor(
    private need = 4,
    private release = 4
  ) {}
  update(v: boolean): boolean {
    if (v) {
      this.on++;
      this.off = 0;
      if (this.on >= this.need) this.active = true;
    } else {
      this.off++;
      this.on = 0;
      if (this.off >= this.release) this.active = false;
    }
    return this.active;
  }
}

/* ------------------------------ ค้างเป้า (dwell) ------------------------------ */

export interface DwellTarget {
  id: string;
  x: number;
  y: number;
  r: number;
}

/**
 * ค้างเป้าเพื่อเลือก: เป้าที่เล็งอยู่ (เข้าในรัศมี r, ออกเมื่อเกิน 1.3r = กันสั่นที่ขอบ) เติมวงทีละน้อย
 * เป้าอื่นที่เคยเติมไว้ค่อยๆ ลด (ไม่หายทันทีเมื่อมือแกว่งออกแวบเดียว) เต็ม = เลือก แล้วพักสั้นๆ
 */
export class Dwell {
  hover: string | null = null;
  prog = new Map<string, number>();
  private cool = 0;
  constructor(public ms = 850) {}
  reset() {
    this.hover = null;
    this.prog.clear();
    this.cool = 0;
  }
  /** คืน id ที่เลือกสำเร็จในเฟรมนี้ */
  update(aim: { x: number; y: number } | null, targets: DwellTarget[], dtMs: number): string | null {
    if (this.cool > 0) this.cool -= dtMs;
    let hover: string | null = null;
    if (aim) {
      const cur = this.hover ? targets.find((t) => t.id === this.hover) : undefined;
      if (cur && Math.hypot(aim.x - cur.x, aim.y - cur.y) <= cur.r * 1.3) hover = cur.id;
      else {
        let best = Infinity;
        for (const t of targets) {
          const d = Math.hypot(aim.x - t.x, aim.y - t.y);
          if (d <= t.r && d < best) {
            best = d;
            hover = t.id;
          }
        }
      }
    }
    this.hover = hover;
    let fired: string | null = null;
    for (const t of targets) {
      const p = this.prog.get(t.id) || 0;
      if (t.id === hover && this.cool <= 0) {
        const n = p + dtMs / this.ms;
        if (n >= 1) {
          fired = t.id;
          this.prog.set(t.id, 0);
          this.cool = 350;
        } else this.prog.set(t.id, n);
      } else if (p > 0) this.prog.set(t.id, Math.max(0, p - (dtMs / this.ms) * 1.6));
    }
    return fired;
  }
}

/* ------------------------------ คะแนน ------------------------------ */

export const AR_POINTS = { correct: 100, speedMax: 20, retry: 50, meteor: 10 } as const;

/** ตอบถูกครั้งแรก: 100 + โบนัสความไวสูงสุด 20 / ถูกหลังตอบผิด: 50 */
export function arAnswerPoints(firstTry: boolean, usedMs: number, limitMs: number): number {
  if (!firstTry) return AR_POINTS.retry;
  const left = limitMs > 0 ? Math.max(0, 1 - usedMs / limitMs) : 0;
  return AR_POINTS.correct + Math.round(AR_POINTS.speedMax * left);
}

/** ดาวตอนจบ: ถูกครั้งแรก >= 90% = 3, >= 60% = 2, ถูกอย่างน้อย 1 = 1 */
export function arStars(firstCorrect: number, total: number): number {
  if (!total || !firstCorrect) return 0;
  const r = firstCorrect / total;
  return r >= 0.9 ? 3 : r >= 0.6 ? 2 : 1;
}
