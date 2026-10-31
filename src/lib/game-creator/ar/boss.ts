/**
 * บอสของสงครามอวกาศ AR (ข้อมูล + กติกา) เพิ่มบอสใหม่ = เพิ่มรายการใน BOSSES + หน้าตาใน scene.ts (makeBoss)
 * - ตอบถูกในรอบบอส = ได้กระสุนเลเซอร์ แล้วเข้าช่วงโจมตีให้เล็งยิงบอส
 * - บอสโจมตีเฉพาะช่วงโจมตี (ไม่โจมตีตอนอ่านโจทย์) มีสัญญาณเตือนก่อนเสมอ
 * - โดนโจมตี = พลังงานลด ไม่มีแพ้ (พลังงานหมด = ยานมึนครู่เดียวแล้วฟื้น)
 */
import type { MotionId } from './gestures';

export type AttackKind = 'lane' | 'wide' | 'ground';
export type BossId = 'jelly' | 'golem' | 'mecha';

export interface BossDef {
  id: BossId;
  name: string;
  color: string;
  /** พลังชีวิตต่อข้อในรอบบอส ต่อ 1 ฝั่ง (คูณจำนวนข้อ x จำนวนฝั่งตอนเริ่ม) */
  hpPerQ: number;
  attacks: AttackKind[];
  /** วินาทีระหว่างการโจมตี */
  every: number;
  /** วินาทีเตือนก่อนโดน */
  warn: number;
  /** พลังงานที่ลดเมื่อโดน */
  dmg: number;
  /** เหรียญเมื่อชนะ */
  coins: number;
  /** คะแนนการเล่นเมื่อชนะ */
  bonus: number;
}

export const BOSSES: BossDef[] = [
  { id: 'jelly', name: 'แมงกะพรุนยักษ์ จุ๊บจุ๊บ', color: '#ff7ac8', hpPerQ: 22, attacks: ['lane'], every: 2.6, warn: 1.5, dmg: 18, coins: 40, bonus: 150 },
  { id: 'golem', name: 'ยักษ์หินดวงจันทร์', color: '#a98bff', hpPerQ: 26, attacks: ['lane', 'ground'], every: 2.3, warn: 1.35, dmg: 22, coins: 60, bonus: 220 },
  { id: 'mecha', name: 'ยานแม่หุ่นยนต์', color: '#4fd1ff', hpPerQ: 30, attacks: ['lane', 'wide', 'ground'], every: 2.0, warn: 1.2, dmg: 26, coins: 80, bonus: 300 },
];

export const bossById = (id: string): BossDef => BOSSES.find((b) => b.id === id) || BOSSES[0];

/** จำนวนข้อที่เป็นรอบบอส (ท้ายชุด): 1 ใน 3 ของทั้งหมด อย่างน้อย 2 ข้อ ไม่เกินทั้งชุด */
export function bossQuestions(total: number): number {
  if (total < 3) return total;
  return Math.min(total, Math.max(2, Math.round(total / 3)));
}

export const bossHp = (b: BossDef, qs: number, sides: number) => Math.max(30, Math.round(b.hpPerQ * qs * Math.max(1, sides)));

/** ท่าที่ใช้ป้องกันแต่ละการโจมตี */
export const COUNTER: Record<AttackKind, MotionId> = { lane: 'dodge', wide: 'shield', ground: 'jump' };
export const ATTACK_TEXT: Record<AttackKind, string> = { lane: 'เอียงหลบ!', wide: 'ประกบสองมือ ตั้งโล่!', ground: 'กระโดด!' };

/** สุ่มการโจมตีเฉพาะแบบที่ท่าป้องกันเปิดอยู่ (ปิดหมด = บอสไม่โจมตี) */
export function pickAttack(b: BossDef, allowed: (m: MotionId) => boolean, rnd = Math.random): AttackKind | null {
  const ok = b.attacks.filter((a) => allowed(COUNTER[a]));
  if (ok.length) return ok[Math.floor(rnd() * ok.length) % ok.length];
  const any = (['lane', 'wide', 'ground'] as AttackKind[]).filter((a) => allowed(COUNTER[a]));
  return any.length ? any[0] : null;
}

/** สถานะผู้เล่นตอนการโจมตีมาถึง */
export interface DefState {
  lean: -1 | 0 | 1;
  shield: boolean;
  /** กระโดดล่าสุด (ms) */
  jumpAt: number;
  now: number;
}

/** หลบ/กันได้ไหม: lane = เอียงไปฝั่งตรงข้ามช่องที่โดนยิง, wide = โล่, ground = กระโดดภายใน 0.6 วิ ก่อนถึง */
export function defended(kind: AttackKind, lane: -1 | 1, s: DefState): boolean {
  if (kind === 'lane') return s.lean === -lane;
  if (kind === 'wide') return s.shield;
  return s.now - s.jumpAt < 600;
}

/** ความเสียหายต่อนัด: 10 + 25% ต่อระดับเลเซอร์ (บูสต์ = 2 เท่า) */
export const shotDamage = (laserLvl: number, boosted: boolean) => Math.round(10 * (1 + 0.25 * laserLvl) * (boosted ? 2 : 1));
