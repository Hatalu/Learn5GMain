/**
 * ท่าทางเพิ่มเติมของสงครามอวกาศ AR (ตรรกะล้วน ทดสอบใน selftest ได้)
 * ทุกท่าเทียบกับ "ท่ายืนปกติ" (baseline) ที่จับตอนตั้งค่ากล้อง แล้วค่อยๆ ปรับตามเมื่อผู้เล่นขยับที่ยืน
 * ระยะทุกอย่างคิดเป็นเท่าของความกว้างไหล่ (sw) จึงใช้ได้ทั้งเด็กยืนใกล้และไกลกล้อง
 * ความไว (sensitivity) = ตัวคูณเกณฑ์: ไวมาก = ขยับน้อยก็นับ
 */
import { bothUp, tip, Hold, type Body } from '../arPose';

export type MotionId = 'dodge' | 'jump' | 'shield' | 'charge' | 'victory';

/** ท่าที่ครูเปิด/ปิดได้ (บิตในค่า mask) */
export const MOTIONS: { id: MotionId; bit: number; name: string; how: string }[] = [
  { id: 'dodge', bit: 1, name: 'เอียงหลบ', how: 'เอียงตัวซ้าย/ขวา (ไม่ต้องก้าว)' },
  { id: 'jump', bit: 2, name: 'กระโดด', how: 'ย่อแล้วกระโดดเบาๆ' },
  { id: 'shield', bit: 4, name: 'โล่สองมือ', how: 'ประกบสองมือไว้หน้าอก' },
  { id: 'charge', bit: 8, name: 'ชาร์จพลัง', how: 'ยกสองมือเหนือหัวค้างไว้' },
  { id: 'victory', bit: 16, name: 'ท่าชัยชนะ', how: 'กางแขนเป็นตัว V' },
];
export const ALL_MOTIONS = 31;
/** ค่าเริ่มต้น: ปิดกระโดด (ปลอดภัยกว่าเมื่อยืนใกล้กัน ครูเปิดเองได้) */
export const DEFAULT_MOTIONS = ALL_MOTIONS & ~2;
export const motionOn = (mask: number, id: MotionId) => (mask & (MOTIONS.find((m) => m.id === id)?.bit ?? 0)) !== 0;

/** ความไว: ตัวคูณเกณฑ์ (มาก = ขยับน้อยก็นับ) */
export const SENS = [
  { name: 'ต้องขยับเยอะ', k: 1.3 },
  { name: 'ปกติ', k: 1 },
  { name: 'ไวมาก', k: 0.75 },
];
export const sensK = (i: number) => SENS[i]?.k ?? 1;

export interface Baseline {
  cx: number;
  cy: number;
  sw: number;
}

/** เอียงตัว: ไหล่กลางเคลื่อนจากที่ยืนปกติเกิน 0.55 ไหล่ (-1 = ไปทางซ้ายจอ, 1 = ขวาจอ) */
export function leanOf(b: Body, base: Baseline, k = 1): -1 | 0 | 1 {
  const d = b.cx - base.cx;
  const th = base.sw * 0.55 * k;
  return d <= -th ? -1 : d >= th ? 1 : 0;
}

/** กระโดด: ไหล่สูงขึ้นจากที่ยืนปกติเกิน 0.3 ไหล่ */
export function jumping(b: Body, base: Baseline, k = 1): boolean {
  return base.cy - b.cy > base.sw * 0.3 * k;
}

/** โล่สองมือ: ข้อมือสองข้างชิดกัน (< 0.75 ไหล่) อยู่หน้าลำตัว ระดับอก-ท้อง */
export function shieldPose(b: Body, k = 1): boolean {
  const L = tip(b, 'l');
  const R = tip(b, 'r');
  if (!L || !R) return false;
  const near = Math.hypot(L.x - R.x, L.y - R.y) < b.sw * 0.75 * (2 - k);
  const mx = (L.x + R.x) / 2;
  const my = (L.y + R.y) / 2;
  return near && Math.abs(mx - b.cx) < b.sw * 0.9 && my > b.cy - b.sw * 0.4 && my < b.cy + b.sw * 1.6;
}

/** ท่าชัยชนะ: สองมือสูงกว่าไหล่ และกางห่างกันเกิน 1.8 ไหล่ (ตัว V) */
export function victoryPose(b: Body, k = 1): boolean {
  const L = tip(b, 'l');
  const R = tip(b, 'r');
  if (!L || !R) return false;
  const up = b.cy - b.sw * 0.3 * k;
  return L.y < up && R.y < up && Math.abs(L.x - R.x) > b.sw * 1.8 * k;
}

/** ชาร์จพลัง = ยกสองมือเหนือหัว (ใช้ของเดิม) แต่ไม่นับถ้ากางเป็นตัว V */
export const chargePose = (b: Body, k = 1) => bothUp(b) && !victoryPose(b, k);

/** กางแขนออกข้างเป็นตัว T: สองมืออยู่ราวระดับไหล่ และห่างกันเกิน 2.4 ไหล่ */
export function spreadPose(b: Body, k = 1): boolean {
  const L = tip(b, 'l');
  const R = tip(b, 'r');
  if (!L || !R) return false;
  const band = b.sw * 0.75 * (2 - k);
  return Math.abs(L.y - b.cy) < band && Math.abs(R.y - b.cy) < band && Math.abs(L.x - R.x) > b.sw * 2.4 * k;
}

/** สองมือห่างกัน (ใช้ร่วมกับ Clap: ต้องแยกมือก่อนถึงปรบได้อีก) */
export function handsApart(b: Body): boolean {
  const L = tip(b, 'l');
  const R = tip(b, 'r');
  return !!L && !!R && Math.hypot(L.x - R.x, L.y - R.y) > b.sw * 1.1;
}

/** สองมือแตะกันระดับอก-หน้า */
export function handsTouch(b: Body): boolean {
  const L = tip(b, 'l');
  const R = tip(b, 'r');
  if (!L || !R) return false;
  const my = (L.y + R.y) / 2;
  return Math.hypot(L.x - R.x, L.y - R.y) < b.sw * 0.4 && my < b.cy + b.sw * 0.8 && my > b.cy - b.sw * 1.4;
}

/**
 * ปรบมือ = มือที่ห่างกันอยู่ เข้ามาแตะกันเร็ว (ภายใน 450ms) ต่างจากโล่ที่ประกบค้างไว้
 * ปรบแล้วต้องแยกมือออกก่อนถึงนับครั้งใหม่
 */
export class Clap {
  private apartAt = -1e9;
  private armed = false;
  update(b: Body, now: number): boolean {
    if (handsApart(b)) {
      this.apartAt = now;
      this.armed = true;
      return false;
    }
    if (this.armed && handsTouch(b) && now - this.apartAt < 450) {
      this.armed = false;
      return true;
    }
    return false;
  }
}

export type GestureEvent = 'dodgeL' | 'dodgeR' | 'jump' | 'shield' | 'charge' | 'victory';

/**
 * สถานะท่าทางของผู้เล่น 1 คน: ต้องเห็นติดกันหลายเฟรมถึงนับ (Hold) และยิงเหตุการณ์ครั้งเดียวตอนเริ่มท่า
 * ท่ายืนปกติปรับตามช้าๆ เฉพาะตอนไม่ได้ทำท่า (ผู้เล่นเดินไปยืนที่ใหม่ก็ยังใช้ได้)
 */
export class Gestures {
  base: Baseline | null = null;
  lean: -1 | 0 | 1 = 0;
  shield = false;
  charge = false;
  victory = false;
  jumpAt = -1e9;
  private hl = new Hold(3, 4);
  private hr = new Hold(3, 4);
  private hj = new Hold(2, 3);
  private hs = new Hold(4, 5);
  private hc = new Hold(3, 5);
  private hv = new Hold(4, 5);
  private calibN = 0;

  reset() {
    this.base = null;
    this.calibN = 0;
    this.lean = 0;
    this.shield = this.charge = this.victory = false;
  }

  /** จับท่ายืนปกติ (เรียกตอนตั้งค่ากล้อง ระหว่างยืนนิ่ง): เฉลี่ยสะสม */
  calibrate(b: Body) {
    const n = Math.min(30, ++this.calibN);
    if (!this.base) this.base = { cx: b.cx, cy: b.cy, sw: b.sw };
    else {
      this.base.cx += (b.cx - this.base.cx) / n;
      this.base.cy += (b.cy - this.base.cy) / n;
      this.base.sw += (b.sw - this.base.sw) / n;
    }
  }

  /** อัปเดตทุกครั้งที่ได้ผลตรวจใหม่ คืนเหตุการณ์ที่เพิ่งเริ่ม */
  update(b: Body, now: number, k = 1): GestureEvent[] {
    if (!this.base) this.calibrate(b);
    const base = this.base!;
    const out: GestureEvent[] = [];
    const ln = leanOf(b, base, k);
    const wasL = this.lean;
    const L = this.hl.update(ln === -1);
    const R = this.hr.update(ln === 1);
    this.lean = L ? -1 : R ? 1 : 0;
    if (this.lean !== wasL && this.lean) out.push(this.lean < 0 ? 'dodgeL' : 'dodgeR');
    const j = this.hj.update(jumping(b, base, k));
    if (j && now - this.jumpAt > 700) {
      this.jumpAt = now;
      out.push('jump');
    }
    const s = this.hs.update(shieldPose(b, k));
    if (s && !this.shield) out.push('shield');
    this.shield = s;
    const v = this.hv.update(victoryPose(b, k));
    if (v && !this.victory) out.push('victory');
    this.victory = v;
    const c = this.hc.update(chargePose(b, k));
    if (c && !this.charge) out.push('charge');
    this.charge = c;
    // ปรับท่ายืนปกติตามช้าๆ เฉพาะตอนยืนเฉยๆ
    if (!this.lean && !j && Math.abs(b.cx - base.cx) < base.sw * 0.25 * k) {
      base.cx += (b.cx - base.cx) * 0.03;
      base.cy += (b.cy - base.cy) * 0.03;
      base.sw += (b.sw - base.sw) * 0.03;
    }
    return out;
  }
}

/** ชื่อท่าที่โชว์บนจอเมื่อตรวจเจอจริง */
export const GESTURE_TEXT: Record<GestureEvent, string> = {
  dodgeL: 'เอียงซ้าย',
  dodgeR: 'เอียงขวา',
  jump: 'กระโดด',
  shield: 'โล่สองมือ',
  charge: 'ชาร์จพลัง',
  victory: 'ท่าชัยชนะ',
};
