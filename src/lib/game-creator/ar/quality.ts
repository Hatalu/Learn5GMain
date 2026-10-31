/**
 * คุณภาพการตรวจท่าของระบบ AR (ใช้ร่วมทุกเกม AR, ตรรกะล้วน ทดสอบใน selftest)
 * - หน้าถูกบัง/เห็นหน้าไม่เต็ม = จุดตัวเพี้ยน -> เตือนกลางจอ และไม่นับการเล็งช่วงนั้น
 * - ตัวกระโดดไปมาผิดธรรมชาติ (ตรวจสลับคน/สั่น) = เตือนเหมือนกัน
 * - ล็อกผู้เล่นคนเดิม: คนเดินผ่านข้างหลัง/ยืนไกลไม่แย่งการควบคุม
 */
import type { Body } from '../arPose';

/** จุดบนใบหน้า (MediaPipe Pose): จมูก ตาซ้าย ตาขวา ปากซ้าย ปากขวา */
const FACE = [0, 2, 5, 9, 10];

/** สัดส่วนความชัดของจุดบนใบหน้า 0..1 */
export function faceScore(b: Body): number {
  let s = 0;
  for (const i of FACE) s += Math.min(1, Math.max(0, b.pts[i]?.v ?? 0));
  return s / FACE.length;
}

/** คนที่เล็กกว่านี้ (ไหล่แคบกว่า 4.5% ของความกว้างจอ) = ยืนไกล/คนข้างหลัง ไม่นับ */
export const MIN_SW = 0.045;

export interface Lock {
  x: number;
  y: number;
  sw: number;
  at: number;
}

/**
 * เลือกผู้เล่นจากคนที่เห็น: ยึดคนเดิมไว้ก่อน (ใกล้ตำแหน่งเดิม ขนาดไหล่ใกล้เคียง)
 * คนเดิมหายเกิน holdMs ค่อยเปลี่ยนเป็นคนที่ใกล้กล้องที่สุด
 */
export function pickBody(cands: Body[], lock: Lock | null, now: number, holdMs = 700): Body | null {
  if (!cands.length) return null;
  if (lock && now - lock.at < holdMs) {
    let best: Body | null = null;
    let bd = Infinity;
    for (const b of cands) {
      const r = b.sw / lock.sw;
      if (r < 0.65 || r > 1.5) continue;
      const d = Math.hypot(b.cx - lock.x, b.cy - lock.y) / lock.sw;
      if (d < 1.2 && d < bd) (best = b), (bd = d);
    }
    return best;
  }
  return cands.reduce((a, b) => (b.sw > a.sw ? b : a));
}

export const toLock = (b: Body, now: number): Lock => ({ x: b.cx, y: b.cy, sw: b.sw, at: now });

export type QualityIssue = 'face' | 'shaky' | null;

/**
 * เฝ้าดูคุณภาพของคนหนึ่งคน: ปัญหาต้องเป็นติดกันเกิน warnMs ถึงเตือน (กันกระพริบ) หายแล้วค่อยเลิกเตือนหลัง clearMs
 * - face: จุดบนหน้าไม่ชัด (มือ/ของบัง หันข้าง ก้มหน้า ออกนอกกรอบ)
 * - shaky: ไหล่กระโดดเร็วผิดปกติ หรือความกว้างไหล่เปลี่ยนวูบ (ตรวจสลับคน/ภาพเบลอ)
 */
export class Quality {
  issue: QualityIssue = null;
  private shake = 0;
  private prev: { cx: number; cy: number; sw: number; t: number } | null = null;
  private badSince = 0;
  private goodSince = 0;
  private bad: QualityIssue = null;
  constructor(
    private warnMs = 600,
    private clearMs = 400
  ) {}

  reset() {
    this.issue = null;
    this.shake = 0;
    this.prev = null;
    this.badSince = this.goodSince = 0;
    this.bad = null;
  }

  /** b = ร่างดิบ (ยังไม่กรอง) ของผลตรวจล่าสุด */
  update(b: Body, now: number): QualityIssue {
    const p = this.prev;
    if (p) {
      // ความเร็วไหล่ต่อวินาที (เป็นเท่าของความกว้างไหล่) ไม่ขึ้นกับอัตราเฟรม
      const dt = Math.max(0.016, (now - p.t) / 1000);
      const v = Math.hypot(b.cx - p.cx, b.cy - p.cy) / p.sw / dt;
      const jump = Math.abs(b.sw - p.sw) / p.sw > 0.3 ? 6 : 0;
      this.shake = this.shake * 0.75 + (v + jump) * 0.25;
    }
    this.prev = { cx: b.cx, cy: b.cy, sw: b.sw, t: now };
    const cur: QualityIssue = faceScore(b) < 0.55 ? 'face' : this.shake > 4.5 ? 'shaky' : null;
    if (cur) {
      if (this.bad !== cur) (this.bad = cur), (this.badSince = now);
      this.goodSince = 0;
      if (now - this.badSince >= this.warnMs) this.issue = cur;
    } else {
      this.bad = null;
      if (!this.goodSince) this.goodSince = now;
      if (this.issue && now - this.goodSince >= this.clearMs) this.issue = null;
    }
    return this.issue;
  }
}
