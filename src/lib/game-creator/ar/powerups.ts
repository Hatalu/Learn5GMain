/**
 * ไอเทมพิเศษ (Power Up) ของสงครามอวกาศ AR: ได้จากการตอบคำถามและภารกิจเท่านั้น (ไม่มีสุ่มกล่อง ไม่มีซื้อ)
 * เพิ่มไอเทมใหม่ = เพิ่มใน POWERS + เงื่อนไขใน earnedPowers + ผลใน ArGame (has/uses)
 */
export type PowerId = 'laser' | 'shield' | 'double' | 'speed' | 'restore';

export interface PowerDef {
  id: PowerId;
  name: string;
  color: string;
  /** ใช้ได้กี่ข้อ (shield = กันได้กี่ครั้ง, restore = ใช้ทันที) */
  uses: number;
  effect: string;
  how: string;
}

export const POWERS: PowerDef[] = [
  { id: 'laser', name: 'Laser Boost', color: '#ff5a7a', uses: 2, effect: 'เลเซอร์แรง 2 เท่า 2 ข้อ', how: 'ตอบถูกติดกันทุก 5 ข้อ' },
  { id: 'shield', name: 'Energy Shield', color: '#4fd1ff', uses: 1, effect: 'กันการโจมตีได้ 1 ครั้ง', how: 'ข้อ Perfect (ถูกครั้งแรก + ยิงไม่พลาด)' },
  { id: 'double', name: 'Double Score', color: '#ffd23a', uses: 3, effect: 'คะแนนความรู้ 2 เท่า 3 ข้อ', how: 'ตอบถูกติดกัน 3 ข้อ' },
  { id: 'speed', name: 'Speed Boost', color: '#3fe0a0', uses: 3, effect: 'ล็อกเป้าไวขึ้น 3 ข้อ', how: 'ตอบถูกครั้งแรกภายในครึ่งเวลาแรก' },
  { id: 'restore', name: 'Energy Restore', color: '#b58cff', uses: 0, effect: 'เติมพลังงานเต็ม', how: 'ตอบถูกตอนพลังงานต่ำกว่าครึ่ง / ภารกิจสำเร็จ' },
];
export const powerById = (id: PowerId) => POWERS.find((p) => p.id === id)!;

export interface PowerCtx {
  correct: boolean;
  firstTry: boolean;
  /** ใช้เวลาไปไม่เกินครึ่ง */
  fast: boolean;
  answerCombo: number;
  energyRatio: number;
}

/** ไอเทมที่ได้จากการตอบข้อนี้ */
export function earnedPowers(c: PowerCtx): PowerId[] {
  if (!c.correct) return [];
  const out: PowerId[] = [];
  if (c.answerCombo > 0 && c.answerCombo % 5 === 0) out.push('laser');
  else if (c.answerCombo === 3) out.push('double');
  if (c.firstTry && c.fast) out.push('speed');
  if (c.energyRatio < 0.5) out.push('restore');
  return out;
}

/** ไอเทมที่ถืออยู่ของผู้เล่น/ฝั่งหนึ่ง: ค่า = จำนวนครั้ง/ข้อที่เหลือ */
export class Powers {
  left = new Map<PowerId, number>();
  got = 0;
  reset() {
    this.left.clear();
    this.got = 0;
  }
  /** ได้ไอเทม (restore ไม่เก็บ ผู้เรียกเติมพลังงานเอง) ไอเทมเดิมต่อเวลา shield ซ้อนได้ไม่เกิน 3 */
  add(id: PowerId) {
    this.got++;
    const d = powerById(id);
    if (!d.uses) return;
    const cur = this.left.get(id) || 0;
    this.left.set(id, id === 'shield' ? Math.min(3, cur + d.uses) : Math.max(cur, d.uses));
  }
  has(id: PowerId) {
    return (this.left.get(id) || 0) > 0;
  }
  /** ใช้โล่ 1 ครั้ง คืน true ถ้ามี */
  useShield(): boolean {
    const n = this.left.get('shield') || 0;
    if (n <= 0) return false;
    this.left.set('shield', n - 1);
    return true;
  }
  /** จบข้อ: ไอเทมแบบนับข้อลดลง 1 */
  endQuestion() {
    for (const id of ['laser', 'double', 'speed'] as PowerId[]) {
      const n = this.left.get(id) || 0;
      if (n > 0) this.left.set(id, n - 1);
    }
  }
}
