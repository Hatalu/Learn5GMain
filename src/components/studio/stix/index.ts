import { FOOD, SPACE, WEATHER } from './food';
import { HOME, MUSIC, SPORT, VEHICLE } from './things';
import { BODY, BUG, FEST, OCEAN } from './life';
import { ANIMALS2, FEELINGS, LABELS, LETTERS } from './chars';

/** สติกเกอร์ชุดเพิ่ม 300+ แบบ (ต่อท้ายชุดเดิม ห้ามเปลี่ยน/ลบ id ที่มีอยู่ เพราะสื่อและปกชุดคำถามอ้างถึง) */
export const MORE_STICKERS = [...FEELINGS, ...ANIMALS2, ...FOOD, ...WEATHER, ...SPACE, ...OCEAN, ...BUG, ...VEHICLE, ...SPORT, ...MUSIC, ...HOME, ...BODY, ...FEST, ...LABELS, ...LETTERS];
