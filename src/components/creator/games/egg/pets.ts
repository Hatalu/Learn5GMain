/**
 * สัตว์ที่ฟักจากไข่: ชนิดไข่ (ไบโอม + ลำดับ) -> รูปร่าง สี ชื่อ
 * ใช้ทั้งภาพ 3 มิติ (scene.ts) และภาพ SVG ในกระเป๋า/ตอนฟัก (PetArt.tsx)
 */
import { BIOMES, type BossPart } from './biomes';
import { EGG_SLOTS_RARITY, type EggRarity } from '@/lib/game-creator/eggValues';

export const PET_KINDS: BossPart[][] = [['ears'], ['ears', 'tail'], ['horns'], ['wings'], ['cap'], ['claws'], ['shell'], ['spikes'], ['crown'], ['fur', 'horns'], ['wings', 'horns'], ['tail', 'fur']];

export interface PetInfo {
  /** ไบโอม (ลำดับใน BIOMES) */
  b: number;
  /** ชนิดไข่ 0-10 */
  t: number;
  kg: number;
}

export interface PetLook {
  name: string;
  parts: BossPart[];
  body: string;
  belly: string;
  rarity: EggRarity;
}

export function petLook(b: number, t: number): PetLook {
  const egg = BIOMES[b]?.eggs[t] || BIOMES[0].eggs[0];
  return {
    name: egg.name.replace(/^ไข่/, 'ลูก'),
    parts: PET_KINDS[(b * 5 + t * 7) % PET_KINDS.length],
    body: egg.base,
    belly: egg.spot,
    rarity: EGG_SLOTS_RARITY[t] || 'common',
  };
}

/** ขนาดตัว (เท่าของขนาดปกติ) ตามน้ำหนัก: 2 kg ~0.8 เท่า / 500 kg ~2.4 เท่า */
export const petScale = (kg: number) => 0.45 + Math.cbrt(Math.max(1, kg)) * 0.25;
