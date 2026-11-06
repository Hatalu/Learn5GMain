/** ภารกิจรายวัน รายสัปดาห์ และความสำเร็จ นับจากเหตุการณ์ (ev) ทั้งหมด */

export type PetEv =
  | 'correct' | 'answer' | 'puzzle' | 'balloon' | 'play' // เรียนรู้
  | 'feed' | 'veg' | 'wash' | 'sleep' | 'pet' | 'full' | 'happy' // ดูแล
  | 'catch' | 'match' | 'game' // มินิเกม
  | 'buy' | 'wear' | 'decor' | 'color' | 'album' | 'report' | 'visit';

export interface Mission {
  id: string;
  text: string;
  ev: PetEv;
  need: number;
  stars: number;
  /** ภารกิจเรียนรู้ รายวันจะมีอย่างน้อย 2 ข้อ */
  learn?: boolean;
  /** พาไปที่ไหนเมื่อกด */
  go?: 'puzzle' | 'food' | 'wash' | 'sleep' | 'play' | 'shop' | 'room' | 'report' | 'album' | 'home' | 'pet';
}

const M = (id: string, text: string, ev: PetEv, need: number, stars: number, go?: Mission['go'], learn?: boolean): Mission => ({ id, text, ev, need, stars, go, learn });

export const DAILY_POOL: Mission[] = [
  M('d-puzzle', 'เล่นปริศนาวันนี้', 'puzzle', 1, 5, 'puzzle', true),
  M('d-correct3', 'ตอบถูก 3 ข้อ', 'correct', 3, 3, 'play', true),
  M('d-correct5', 'ตอบถูก 5 ข้อ', 'correct', 5, 5, 'play', true),
  M('d-correct10', 'ตอบถูก 10 ข้อ', 'correct', 10, 8, 'play', true),
  M('d-answer8', 'ตอบคำถาม 8 ข้อ', 'answer', 8, 4, 'play', true),
  M('d-balloon', 'ยิงลูกโป่งคำตอบให้ถูก 3 ลูก', 'balloon', 3, 4, 'play', true),
  M('d-balloon6', 'ยิงลูกโป่งคำตอบให้ถูก 6 ลูก', 'balloon', 6, 6, 'play', true),
  M('d-play', 'เล่นเกมในเว็บ 1 เกม', 'play', 1, 3, 'home', true),

  M('d-feed1', 'ป้อนข้าวปุ๋ง', 'feed', 1, 1, 'food'),
  M('d-feed3', 'ป้อนอาหาร 3 ครั้ง', 'feed', 3, 2, 'food'),
  M('d-veg', 'ให้ปุ๋งกินผักผลไม้ 2 อย่าง', 'veg', 2, 2, 'food'),
  M('d-full', 'ป้อนจนปุ๋งอิ่มแปล้', 'full', 1, 2, 'food'),
  M('d-wash', 'อาบน้ำให้ปุ๋ง', 'wash', 1, 2, 'wash'),
  M('d-sleep', 'พาปุ๋งเข้านอน', 'sleep', 1, 1, 'sleep'),
  M('d-pet5', 'ลูบหัวปุ๋ง 5 ครั้ง', 'pet', 5, 1, 'pet'),
  M('d-pet15', 'ลูบหัวปุ๋ง 15 ครั้ง', 'pet', 15, 2, 'pet'),
  M('d-happy', 'ทำให้ทุกหลอดเกิน 70%', 'happy', 1, 3, 'food'),
  M('d-catch', 'เล่นเกมรับผลไม้', 'catch', 1, 2, 'play'),
  M('d-match', 'เล่นเกมจับคู่ภาพ', 'match', 1, 2, 'play'),
  M('d-game2', 'เล่นมินิเกม 2 รอบ', 'game', 2, 2, 'play'),
  M('d-buy', 'ซื้อของใหม่ 1 ชิ้น', 'buy', 1, 2, 'shop'),
  M('d-wear', 'เปลี่ยนชุดให้ปุ๋ง', 'wear', 1, 1, 'shop'),
  M('d-decor', 'จัดห้องใหม่', 'decor', 1, 1, 'room'),
  M('d-color', 'เปลี่ยนสีตัวปุ๋ง', 'color', 1, 1, 'shop'),
  M('d-album', 'เปิดดูสมุดสติกเกอร์', 'album', 1, 1, 'album'),
  M('d-report', 'ดูรายงานสัปดาห์นี้', 'report', 1, 1, 'report'),
];

export const WEEKLY_POOL: Mission[] = [
  M('w-visit3', 'มาเยี่ยมปุ๋ง 3 วัน', 'visit', 3, 8),
  M('w-visit5', 'มาเยี่ยมปุ๋ง 5 วัน', 'visit', 5, 15),
  M('w-correct30', 'ตอบถูก 30 ข้อ', 'correct', 30, 15, 'play', true),
  M('w-correct60', 'ตอบถูก 60 ข้อ', 'correct', 60, 25, 'play', true),
  M('w-puzzle3', 'เล่นปริศนา 3 วัน', 'puzzle', 3, 12, 'puzzle', true),
  M('w-puzzle5', 'เล่นปริศนา 5 วัน', 'puzzle', 5, 20, 'puzzle', true),
  M('w-feed12', 'ป้อนอาหาร 12 ครั้ง', 'feed', 12, 6, 'food'),
  M('w-wash4', 'อาบน้ำ 4 ครั้ง', 'wash', 4, 6, 'wash'),
  M('w-game8', 'เล่นมินิเกม 8 รอบ', 'game', 8, 8, 'play'),
  M('w-buy2', 'ซื้อของใหม่ 2 ชิ้น', 'buy', 2, 6, 'shop'),
];

/** ครบทุกภารกิจรายวันแล้วรับเพิ่ม (ไม่สุ่ม) */
export const DAY_ALL_BONUS = 5;

/** ความสำเร็จตลอดอายุ นับจาก total */
export const ACHIEVEMENTS: Mission[] = [
  ...([[10, 3], [50, 8], [200, 20], [500, 40], [1000, 80]] as const).map(([n, s]) => M(`a-correct${n}`, `ตอบถูกรวม ${n} ข้อ`, 'correct', n, s, 'play', true)),
  ...([[1, 3], [7, 10], [30, 30], [100, 80]] as const).map(([n, s]) => M(`a-puzzle${n}`, `เล่นปริศนารวม ${n} วัน`, 'puzzle', n, s, 'puzzle', true)),
  ...([[10, 3], [50, 8], [200, 20]] as const).map(([n, s]) => M(`a-feed${n}`, `ป้อนอาหารรวม ${n} ครั้ง`, 'feed', n, s, 'food')),
  ...([[10, 3], [50, 10], [100, 20]] as const).map(([n, s]) => M(`a-veg${n}`, `กินผักผลไม้รวม ${n} ครั้ง`, 'veg', n, s, 'food')),
  ...([[5, 3], [30, 10], [100, 25]] as const).map(([n, s]) => M(`a-wash${n}`, `อาบน้ำรวม ${n} ครั้ง`, 'wash', n, s, 'wash')),
  ...([[50, 3], [500, 15]] as const).map(([n, s]) => M(`a-pet${n}`, `ลูบหัวรวม ${n} ครั้ง`, 'pet', n, s, 'pet')),
  ...([[10, 4], [50, 12], [200, 30]] as const).map(([n, s]) => M(`a-game${n}`, `เล่นมินิเกมรวม ${n} รอบ`, 'game', n, s, 'play')),
  ...([[1, 2], [10, 10], [30, 30]] as const).map(([n, s]) => M(`a-buy${n}`, `สะสมของรวม ${n} ชิ้น`, 'buy', n, s, 'shop')),
  ...([[7, 8], [30, 25], [100, 70]] as const).map(([n, s]) => M(`a-visit${n}`, `มาเยี่ยมปุ๋งรวม ${n} วัน`, 'visit', n, s)),
];

export function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** สุ่มแบบมีเมล็ด: วันเดียวกันได้ผลเดิมทุกครั้ง */
export function seeded(seed: string): () => number {
  let a = hashStr(seed) || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffled<T>(arr: readonly T[], rnd: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** ภารกิจวันนี้ 6 ข้อ: เรียนรู้ 2 + ดูแล/เล่น 4 ไม่ซ้ำเหตุการณ์กัน */
export function dailyMissions(date: string): Mission[] {
  const rnd = seeded(`day:${date}`);
  const pool = shuffled(DAILY_POOL, rnd);
  const out: Mission[] = [];
  const pick = (learn: boolean, n: number) => {
    for (const m of pool) {
      if (n === 0) break;
      if (!!m.learn !== learn || out.some((o) => o.ev === m.ev)) continue;
      out.push(m);
      n--;
    }
  };
  pick(true, 2);
  pick(false, 4);
  return out;
}

/** ภารกิจสัปดาห์นี้ 4 ข้อ มีเรียนรู้อย่างน้อย 2 */
export function weeklyMissions(week: string): Mission[] {
  const rnd = seeded(`week:${week}`);
  const pool = shuffled(WEEKLY_POOL, rnd);
  const out: Mission[] = [];
  for (const m of pool) if (m.learn && out.length < 2 && !out.some((o) => o.ev === m.ev)) out.push(m);
  for (const m of pool) if (!m.learn && out.length < 4 && !out.some((o) => o.ev === m.ev)) out.push(m);
  return out;
}
