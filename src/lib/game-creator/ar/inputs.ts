/**
 * วิธีเลือกเป้าแบบเฉพาะของแต่ละเกม AR (ใช้แทน Dwell ได้ทันที: มี hover / prog / reset / update เหมือนกัน)
 * - Space Battle: ค้างมือบนเป้า (Dwell เดิม)
 * - Magic Kingdom: วาดวงเวทล้อมเป้า (CircleDraw)
 * - Ocean Guardian: ขยับทั้งตัวไปเลนของเป้า (Dwell เดิม แต่ส่งตำแหน่งตัวและวัดเฉพาะแกน x ดูใน OceanGame)
 * - Ghost Hunter: ปัดมือเร็วๆ ผ่านเป้า (Swipe)
 */
import { Dwell, type DwellTarget } from '../arPose';

type Pt = { x: number; y: number } | null;

/** มุมต่างแบบวนรอบ (-PI..PI) */
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

/**
 * วาดวงล้อมเป้า: รวมมุมที่มือหมุนรอบจุดกลางเป้า ขณะมืออยู่ในวงแหวน 0.4r..2.2r
 * ครบ ~1.6PI (เด็กมักวาดไม่ปิดวง) = เลือก ออกนอกวงแหวนเกิน 300ms = เริ่มนับใหม่
 */
export class CircleDraw extends Dwell {
  /** มุมที่ต้องหมุนครบ (เรเดียน) */
  need: number;
  private ang = new Map<string, { last: number; sum: number; out: number }>();
  private wait = 0;
  /** k = ตัวคูณวงแหวนที่นับ / scale = สัดส่วนมุมที่ต้องวาด (อัปเกรดความไวทำให้วาดสั้นลง) */
  constructor(public k = 1, scale = 1) {
    super();
    this.need = 1.6 * Math.PI * scale;
  }
  reset() {
    super.reset();
    this.ang.clear();
    this.wait = 0;
  }
  update(aim: Pt, targets: DwellTarget[], dtMs: number): string | null {
    if (this.wait > 0) this.wait -= dtMs;
    let fired: string | null = null;
    let best = 0;
    this.hover = null;
    for (const t of targets) {
      let st = this.ang.get(t.id);
      const d = aim ? Math.hypot(aim.x - t.x, aim.y - t.y) : Infinity;
      if (aim && d >= t.r * 0.4 && d <= t.r * 2.2 * this.k) {
        const a = Math.atan2(aim.y - t.y, aim.x - t.x);
        if (!st) st = { last: a, sum: 0, out: 0 };
        else {
          st.sum += wrap(a - st.last);
          st.last = a;
          st.out = 0;
        }
        this.ang.set(t.id, st);
      } else if (st) {
        st.out += dtMs;
        if (st.out > 300) this.ang.delete(t.id);
      }
      const p = st ? Math.min(1, Math.abs(st.sum) / this.need) : 0;
      if (p > 0) this.prog.set(t.id, p);
      else this.prog.delete(t.id);
      if (p > best) {
        best = p;
        this.hover = t.id;
      }
      if (p >= 1 && this.wait <= 0 && !fired) fired = t.id;
    }
    if (fired) {
      this.ang.clear();
      this.prog.clear();
      this.wait = 350;
    }
    return fired;
  }
}

/** ระยะที่สั้นที่สุดจากจุด c ถึงเส้นตรง a-b */
function segDist(a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const L = dx * dx + dy * dy;
  const u = L ? Math.max(0, Math.min(1, ((c.x - a.x) * dx + (c.y - a.y) * dy) / L)) : 0;
  return Math.hypot(a.x + u * dx - c.x, a.y + u * dy - c.y);
}

/**
 * ปัดมือผ่านเป้า: มือต้องเริ่มนอกเป้าแล้วพุ่งผ่านเป้าด้วยความเร็ว >= speed() พิกเซล/วินาที
 * (ส่งความเร็วอ้างอิงจากความกว้างไหล่ ให้ยืนใกล้/ไกลกล้องก็ปัดแรงเท่ากัน) พักเลือกซ้ำ 600ms กันโบกมั่ว
 */
export class Swipe extends Dwell {
  private trail: { x: number; y: number; ms: number }[] = [];
  private clock = 0;
  private wait = 0;
  constructor(public speed: () => number) {
    super();
  }
  reset() {
    super.reset();
    this.trail = [];
    this.wait = 0;
  }
  update(aim: Pt, targets: DwellTarget[], dtMs: number): string | null {
    this.clock += dtMs;
    if (this.wait > 0) this.wait -= dtMs;
    this.hover = null;
    this.prog.clear();
    if (!aim) {
      this.trail = [];
      return null;
    }
    this.trail.push({ x: aim.x, y: aim.y, ms: this.clock });
    // เก็บเส้นทางมือ 180ms ล่าสุด
    while (this.trail.length > 2 && this.clock - this.trail[0].ms > 180) this.trail.shift();
    const a = this.trail[0];
    const span = (this.clock - a.ms) / 1000;
    const v = span > 0 ? Math.hypot(aim.x - a.x, aim.y - a.y) / span : 0;
    for (const t of targets) if (Math.hypot(aim.x - t.x, aim.y - t.y) <= t.r) this.hover = t.id;
    if (this.wait > 0 || v < this.speed()) return null;
    let fired: string | null = null;
    let near = Infinity;
    for (const t of targets) {
      const d = segDist(a, aim, t);
      if (d <= t.r && Math.hypot(a.x - t.x, a.y - t.y) > t.r && d < near) {
        near = d;
        fired = t.id;
      }
    }
    if (fired) {
      this.wait = 600;
      this.trail = [];
    }
    return fired;
  }
}
