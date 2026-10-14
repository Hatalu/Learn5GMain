/** แพลนสมาชิก (ราคาเป็นบาท) ใช้ร่วมกันทั้งหน้าเว็บและเซิร์ฟเวอร์ */
export type PlanId = 'egg' | 'kid' | 'grown';

export interface Plan {
  id: PlanId;
  name: string;
  stage: string;
  days: number;
  price: number;
  image: string;
  /** สีประจำแพลน (ธีมงานวัด Tang Tang) */
  color: { main: string; soft: string; stripe: string; text: string };
  tagline: string;
  badge?: string;
}

export const PLANS: Plan[] = [
  {
    id: 'egg',
    name: 'ไข่ไฟว์จี',
    stage: 'ร่างไข่',
    days: 7,
    price: 39,
    image: '/plans/fiveg-egg.webp',
    color: { main: '#3fd6a8', soft: '#d8fbef', stripe: '#1fa883', text: '#0d5c47' },
    tagline: 'ลองเป็นสมาชิก 1 สัปดาห์',
  },
  {
    id: 'kid',
    name: 'ไฟว์จีน้อย',
    stage: 'ร่างเด็ก',
    days: 14,
    price: 59,
    image: '/plans/fiveg-kid.webp',
    color: { main: '#4fb3ff', soft: '#d9f1ff', stripe: '#4a7bf0', text: '#123f7a' },
    tagline: 'เล่นสนุกต่อเนื่อง 2 สัปดาห์',
    badge: 'ยอดนิยม',
  },
  {
    id: 'grown',
    name: 'ไฟว์จีตัวโต',
    stage: 'ร่างโต',
    days: 30,
    price: 99,
    image: '/plans/fiveg-grown.webp',
    color: { main: '#ffcf3f', soft: '#fff3c4', stripe: '#ff9a3d', text: '#7a3a00' },
    tagline: 'คุ้มที่สุด เล่นเต็มเดือน',
    badge: 'คุ้มที่สุด',
  },
];

export const planById = (id: string): Plan | undefined => PLANS.find((p) => p.id === id);

/** ราคาต่อวัน (ทศนิยม 1 ตำแหน่ง) */
export const perDay = (p: Plan) => Math.round((p.price / p.days) * 10) / 10;

/** ประหยัดกี่ % เมื่อเทียบกับซื้อแพลนไข่ต่อเนื่องจนครบจำนวนวันเท่ากัน */
export const savePercent = (p: Plan) => {
  const base = PLANS[0].price / PLANS[0].days;
  return Math.max(0, Math.round((1 - p.price / p.days / base) * 100));
};
