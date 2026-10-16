/**
 * เครื่องประดับของตัวละครผู้เล่น (หมวก / ชุด / หน้ากาก / ของถือ)
 * เก็บเป็นเลขลำดับของแต่ละหมวด 0 = ไม่ใส่ (คอลัมน์ room_players.gear แบบ jsonb)
 * เพิ่มของใหม่: ต่อท้ายรายการ (ห้ามสลับลำดับ ของเดิมจะเปลี่ยน) แล้ววาดใน AvatarGear.tsx
 */

export type GearSlot = 'h' | 'o' | 'm' | 'i';

export interface Gear {
  h: number;
  o: number;
  m: number;
  i: number;
}

export const NO_GEAR: Gear = { h: 0, o: 0, m: 0, i: 0 };

export const GEAR_SLOTS: { key: GearSlot; name: string; items: string[] }[] = [
  { key: 'h', name: 'หมวก', items: ['ไม่ใส่', 'มงกุฎ', 'หมวกแก๊ป', 'หมวกพ่อมด', 'หมวกโจรสลัด', 'โบว์', 'หมวกปาร์ตี้', 'หมวกเชฟ', 'หมวกไวกิ้ง', 'มงกุฎดอกไม้'] },
  { key: 'o', name: 'ชุด', items: ['ไม่ใส่', 'ผ้าคลุมฮีโร่', 'ผ้าพันคอ', 'หูกระต่าย', 'เกราะอัศวิน', 'ชุดเอี๊ยม', 'กระโปรงบัลเล่ต์', 'เหรียญดาว', 'เสื้อนักบินอวกาศ'] },
  { key: 'm', name: 'หน้ากาก', items: ['ไม่ใส่', 'แว่นกันแดด', 'แว่นกลม', 'หน้ากากฮีโร่', 'หนวดเท่', 'แว่นดำน้ำ', 'แว่นดาว', 'แว่นหัวใจ', 'ผ้าปิดนินจา'] },
  { key: 'i', name: 'ของถือ', items: ['ไม่ถือ', 'ค้อนยักษ์', 'ดาบ', 'คทา', 'ไม้เบสบอล', 'ไม้กายสิทธิ์', 'ลูกโป่ง', 'อมยิ้ม', 'โล่', 'ธงสายฟ้า'] },
];

export const gearCount = (slot: GearSlot) => GEAR_SLOTS.find((s) => s.key === slot)!.items.length;

export function cleanGear(x: unknown): Gear {
  const s = x && typeof x === 'object' ? (x as Record<string, unknown>) : {};
  const one = (k: GearSlot) => {
    const v = s[k];
    return Number.isInteger(v) && (v as number) >= 0 && (v as number) < gearCount(k) ? (v as number) : 0;
  };
  return { h: one('h'), o: one('o'), m: one('m'), i: one('i') };
}

export function randomGear(): Gear {
  const r = (k: GearSlot) => (Math.random() < 0.35 ? 0 : 1 + Math.floor(Math.random() * (gearCount(k) - 1)));
  return { h: r('h'), o: r('o'), m: Math.random() < 0.5 ? 0 : r('m'), i: r('i') };
}

export const sameGear = (a: Gear | null | undefined, b: Gear | null | undefined) => {
  const x = cleanGear(a);
  const y = cleanGear(b);
  return x.h === y.h && x.o === y.o && x.m === y.m && x.i === y.i;
};
