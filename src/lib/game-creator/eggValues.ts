/**
 * ค่ากลางของโหมด "ขโมยไข่บอสหลับ" ที่ทั้งตัวเกมและเพดานคะแนนฝั่งเซิร์ฟเวอร์ใช้ร่วมกัน
 * แผนที่เป็นเส้นตรง: ฐาน -> ไบโอม 1 -> ... -> ไบโอม 5 ยิ่งไกล ไข่ยิ่งหนัก บอสยิ่งวิ่งเร็ว
 * คะแนน = น้ำหนักสัตว์ที่ฟักได้ (kg) ไม่ลดลง / เหรียญ = เท่ากับคะแนนที่ได้ แต่ใช้ซื้ออัปความเร็ว
 */
export type EggRarity = 'common' | 'rare' | 'legend' | 'secret';

export const RARITY: Record<EggRarity, { name: string; kg: number; size: number; color: string; weight: number; bossBoost: number }> = {
  common: { name: 'ธรรมดา', kg: 2, size: 0.8, color: '#8fd16a', weight: 70, bossBoost: 1 },
  rare: { name: 'หายาก', kg: 6, size: 1, color: '#3d8bff', weight: 21, bossBoost: 1.05 },
  legend: { name: 'ตำนาน', kg: 15, size: 1.25, color: '#ffb31a', weight: 7, bossBoost: 1.1 },
  secret: { name: 'ความลับ', kg: 40, size: 1.5, color: '#ff4fa3', weight: 2, bossBoost: 1.15 },
};

/** จำนวนไบโอมบนเส้นทาง */
export const EGG_BIOMES = 5;
/** ตัวคูณน้ำหนักไข่ตามลำดับไบโอม (ไบโอม 1 -> 5) */
export const BIOME_KG = [1, 2, 3.5, 6, 10];
/** ความเร็วบอสตามลำดับไบโอม (หน่วย/วินาที) */
export const BOSS_SPEED = [6.6, 7.3, 8.0, 8.8, 9.6];
/** ขนาดไข่สุ่ม (คูณกับขนาดตามระดับ) */
export const SIZE_MIN = 0.75;
export const SIZE_MAX = 1.35;

export const EGG_MAX_VALUE = Math.ceil(RARITY.secret.kg * BIOME_KG[EGG_BIOMES - 1] * SIZE_MAX);

/** ไข่ในหนึ่งไบโอม: ธรรมดา 5 หายาก 3 ตำนาน 2 ความลับ 1 (ลำดับในตารางไข่ของไบโอม) */
export const EGG_SLOTS_RARITY: EggRarity[] = ['common', 'common', 'common', 'common', 'common', 'rare', 'rare', 'rare', 'legend', 'legend', 'secret'];

/** ราคาอัปความเร็ว (เลเวล 1 -> 7) หน่วยเหรียญ = kg ที่ฟักได้ */
export const SPEED_COST = [15, 40, 90, 180, 320, 520, 800];

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

/** น้ำหนักสัตว์ที่ฟักจากไข่ (kg จำนวนเต็ม อย่างน้อย 1) */
export function eggKg(tier: number, type: number, size: number) {
  const t = Math.max(0, Math.min(EGG_BIOMES - 1, tier));
  const sz = Math.max(SIZE_MIN, Math.min(SIZE_MAX, size));
  return Math.max(1, Math.round(RARITY[EGG_SLOTS_RARITY[type]].kg * BIOME_KG[t] * sz));
}

/** ใครได้ไข่ไปเมื่อขโมยพร้อมกัน: เวลาน้อยกว่าชนะ เท่ากัน = ลำดับผู้เล่นน้อยกว่า */
export const takeWins = (t: number, i: number, ot: number, oi: number) => t < ot || (t === ot && i < oi);

/** รอบไข่ (เกิดใหม่ทุก reset วินาที นับจากเริ่มเกม) */
export const eggEpoch = (now: number, startedAt: number, reset: number) => Math.max(0, Math.floor((now - startedAt) / (Math.max(30, reset) * 1000)));
