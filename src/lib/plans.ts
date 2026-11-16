/**
 * แพ็กเกจรายเดือน (ราคาเป็นบาท) ใช้ร่วมกันทั้งหน้าเว็บและเซิร์ฟเวอร์
 * ราคาคิดฝั่งเซิร์ฟเวอร์จากไฟล์นี้เท่านั้น สิทธิ์ของแต่ละแพ็กเกจอยู่ในตาราง plan_entitlements (Dev แก้ได้)
 */
export type PlanId = 'plus' | 'pro' | 'master';

export interface Plan {
  id: PlanId;
  name: string;
  price: number;
  tagline: string;
  popular?: boolean;
}

/** ซื้อ 1 ครั้ง = 30 วัน */
export const PLAN_DAYS = 30;

export const PLANS: Plan[] = [
  { id: 'plus', name: 'Plus', price: 99, tagline: 'เริ่มสร้างสื่อและเกมของตัวเอง' },
  { id: 'pro', name: 'Pro', price: 199, tagline: 'สำหรับครูที่สร้างสื่อทุกสัปดาห์', popular: true },
  { id: 'master', name: 'Master', price: 299, tagline: 'ครบทุกอย่าง และสั่งทำนวัตกรรมตามแผนการสอน' },
];

export const PLAN_IDS = PLANS.map((p) => p.id);
export const isPlanId = (v: unknown): v is PlanId => typeof v === 'string' && (PLAN_IDS as string[]).includes(v);
export const planById = (id: string | null | undefined): Plan | undefined => PLANS.find((p) => p.id === id);
export const planName = (id: string | null | undefined) => planById(id)?.name ?? 'ฟรี';

const DAY = 24 * 3600 * 1000;

/**
 * วันหมดอายุใหม่หลังซื้อแพ็กเกจ
 * - ยังไม่เป็นสมาชิก/หมดอายุ: เริ่มนับวันนี้ 30 วัน
 * - ต่ออายุแพ็กเกจเดิม: ต่อจากวันหมดอายุเดิม 30 วัน
 * - เปลี่ยนแพ็กเกจกลางรอบ: วันที่เหลือของแพ็กเกจเดิมแปลงเป็นมูลค่าของแพ็กเกจใหม่ (ปัดลง) แล้วบวก 30 วัน
 *   เช่น Plus เหลือ 20 วัน แล้วซื้อ Master = 20 x 99 / 299 = 6 วัน + 30 = 36 วันของ Master
 */
export function nextTerm(
  cur: { plan?: string | null; until?: string | null },
  to: PlanId,
  now = Date.now()
): { until: string; carriedDays: number } {
  const end = cur.until ? new Date(cur.until).getTime() : NaN;
  const left = !isNaN(end) && end > now ? end - now : 0;
  if (!left) return { until: new Date(now + PLAN_DAYS * DAY).toISOString(), carriedDays: 0 };
  const from = planById(cur.plan) ?? planById('plus')!;
  if (from.id === to) return { until: new Date(end + PLAN_DAYS * DAY).toISOString(), carriedDays: Math.floor(left / DAY) };
  const carried = Math.floor((left * from.price) / planById(to)!.price);
  return { until: new Date(now + carried + PLAN_DAYS * DAY).toISOString(), carriedDays: Math.floor(carried / DAY) };
}
