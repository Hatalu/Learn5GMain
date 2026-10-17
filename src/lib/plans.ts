/** แพลนสมาชิก (ราคาเป็นบาท) ใช้ร่วมกันทั้งหน้าเว็บและเซิร์ฟเวอร์ */
export type PlanId = 'day' | 'egg' | 'kid' | 'grown';

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
    id: 'day',
    name: 'ไฟว์จีวันเดียว',
    stage: 'ลองก่อน',
    days: 1,
    price: 19,
    image: '/plans/fiveg-egg.webp',
    color: { main: '#ff8fc4', soft: '#ffe3f1', stripe: '#e0559a', text: '#7a1e4c' },
    tagline: 'ลองเป็นสมาชิก 1 วัน',
  },
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

/** แพลนรายวัน ใช้เป็นราคาเทียบของแพลนอื่น */
export const DAY_PLAN = PLANS[0];

export const planLength = (p: Pick<Plan, 'days'>) => (p.days === 30 ? '1 เดือน' : p.days === 1 ? '1 วัน' : `${p.days} วัน`);

/** ราคาต่อวัน (ทศนิยม 1 ตำแหน่ง) */
export const perDay = (p: Plan) => Math.round((p.price / p.days) * 10) / 10;

/**
 * ราคาเทียบ = ซื้อแพลนรายวันต่อกันจนครบจำนวนวันเท่ากัน (เป็นราคาที่ขายอยู่จริง)
 * แพลนรายวันเองไม่มีราคาเทียบ
 */
export const comparePrice = (p: Plan): number | null => (p.id === DAY_PLAN.id ? null : DAY_PLAN.price * p.days);

/** ประหยัดกี่บาทเมื่อเทียบกับซื้อรายวัน */
export const saveBaht = (p: Plan): number => {
  const c = comparePrice(p);
  return c ? Math.max(0, c - p.price) : 0;
};

/* ------------------------------------------------------------------ */
/* ข้อเสนอ: ส่วนลดบัญชีใหม่ + โบนัสต่ออายุ (เงื่อนไขจริงตรวจที่เซิร์ฟเวอร์) */
/* ------------------------------------------------------------------ */

/** ส่วนลดบัญชีใหม่: ภายในกี่ชั่วโมงหลังสมัครบัญชี และลดกี่ % (ใช้ได้กับการซื้อครั้งแรกเท่านั้น) */
export const WELCOME_HOURS = 24;
export const WELCOME_PCT = 30;
/** ราคาหลังลด ปัดเศษลงเป็นบาทเต็มเสมอ */
export const welcomePrice = (p: Pick<Plan, 'price'>) => Math.floor((p.price * (100 - WELCOME_PCT)) / 100);

/** โบนัสต่ออายุ: ต่อในช่วงกี่วันก่อน/หลังวันหมดอายุ ได้เพิ่มกี่วัน (แพลนตั้งแต่ 7 วันขึ้นไป) */
export const RENEW_WINDOW_DAYS = 7;
export const RENEW_BONUS_DAYS = 3;
export const RENEW_MIN_PLAN_DAYS = 7;
export const renewBonusFor = (p: Pick<Plan, 'days'>) => (p.days >= RENEW_MIN_PLAN_DAYS ? RENEW_BONUS_DAYS : 0);

/** ข้อเสนอที่ผู้ใช้คนหนึ่งได้อยู่ตอนนี้ (ส่งจากเซิร์ฟเวอร์ให้หน้าเว็บ) */
export interface Offer {
  /** ส่วนลดบัญชีใหม่ หมดเขตเวลานี้ (ISO) */
  welcomeEndsAt: string | null;
  /** โบนัสต่ออายุ หมดเขตเวลานี้ (ISO) */
  renewEndsAt: string | null;
}

export const NO_OFFER: Offer = { welcomeEndsAt: null, renewEndsAt: null };

/** ราคาที่ต้องจ่ายจริงและจำนวนวันที่ได้ ตามข้อเสนอ */
export function quote(p: Plan, offer: Offer, now = Date.now()) {
  const welcome = !!offer.welcomeEndsAt && new Date(offer.welcomeEndsAt).getTime() > now;
  const renew = !welcome && !!offer.renewEndsAt && new Date(offer.renewEndsAt).getTime() > now;
  const bonus = renew ? renewBonusFor(p) : 0;
  return {
    amount: welcome ? welcomePrice(p) : p.price,
    welcome,
    bonusDays: bonus,
    days: p.days + bonus,
  };
}
