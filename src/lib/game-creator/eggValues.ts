/**
 * ค่ากลางของโหมด "ขโมยไข่บอสหลับ" ที่ทั้งตัวเกมและเพดานคะแนนฝั่งเซิร์ฟเวอร์ใช้ร่วมกัน
 * คะแนน = มูลค่าไข่ที่พากลับฐานได้ (ไม่ลดลง) / เหรียญ = เท่ากับคะแนนที่ได้ แต่ใช้ซื้ออัปความเร็วได้
 */
export type EggRarity = 'common' | 'rare' | 'legend' | 'secret';

export const RARITY: Record<EggRarity, { name: string; value: number; color: string; weight: number; bossBoost: number }> = {
  common: { name: 'ธรรมดา', value: 10, color: '#8fd16a', weight: 70, bossBoost: 1 },
  rare: { name: 'หายาก', value: 30, color: '#3d8bff', weight: 21, bossBoost: 1.06 },
  legend: { name: 'ตำนาน', value: 80, color: '#ffb31a', weight: 7, bossBoost: 1.12 },
  secret: { name: 'ความลับ', value: 200, color: '#ff4fa3', weight: 2, bossBoost: 1.18 },
};

export const EGG_MAX_VALUE = RARITY.secret.value;

/** ไข่ในหนึ่งไบโอม: ธรรมดา 5 หายาก 3 ตำนาน 2 ความลับ 1 (ลำดับในตารางไข่ของไบโอม) */
export const EGG_SLOTS_RARITY: EggRarity[] = ['common', 'common', 'common', 'common', 'common', 'rare', 'rare', 'rare', 'legend', 'legend', 'secret'];

/** ราคาอัปความเร็ว (เลเวล 1 -> 5) */
export const SPEED_COST = [20, 50, 100, 180, 300];

/**
 * เลือกชนิดไข่ (0-10 ในตารางของไบโอม) จากเลขสุ่ม 0..1
 * สุ่มระดับความหายากตามน้ำหนักก่อน แล้วสุ่มชนิดในระดับนั้น
 */
export function pickEggType(r1: number, r2: number): number {
  const order: EggRarity[] = ['common', 'rare', 'legend', 'secret'];
  const total = order.reduce((a, k) => a + RARITY[k].weight, 0);
  let x = r1 * total;
  let rar: EggRarity = 'common';
  for (const k of order) {
    if (x < RARITY[k].weight) {
      rar = k;
      break;
    }
    x -= RARITY[k].weight;
  }
  const ids = EGG_SLOTS_RARITY.map((k, i) => (k === rar ? i : -1)).filter((i) => i >= 0);
  return ids[Math.min(ids.length - 1, Math.floor(r2 * ids.length))];
}

/** ใครได้ไข่ไปเมื่อขโมยพร้อมกัน: เวลาน้อยกว่าชนะ เท่ากัน = ลำดับผู้เล่นน้อยกว่า */
export const takeWins = (t: number, i: number, ot: number, oi: number) => t < ot || (t === ot && i < oi);
