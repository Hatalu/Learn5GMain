/**
 * อัปเกรดยาน 4 ส่วน (Laser / Shield / Engine / Energy) ซื้อด้วยเหรียญที่สะสมจากการเล่นจริง ระดับ 0-5
 * ผลของแต่ละระดับคิดที่ upEffects ที่เดียว
 */
export type UpId = 'laser' | 'shield' | 'engine' | 'energy';
export type UpLevels = Record<UpId, number>;

export const UP_MAX = 5;
export const UPGRADES: { id: UpId; name: string; color: string; desc: string }[] = [
  { id: 'laser', name: 'Laser', color: '#ff5a7a', desc: 'ยิงบอสแรงขึ้น +25% ต่อระดับ' },
  { id: 'shield', name: 'Shield', color: '#4fd1ff', desc: 'เริ่มรอบบอสพร้อมโล่ (ทุก 2 ระดับ +1)' },
  { id: 'engine', name: 'Engine', color: '#3fe0a0', desc: 'ล็อกเป้าไวขึ้น ช่วงโจมตีนานขึ้น' },
  { id: 'energy', name: 'Energy', color: '#ffd23a', desc: 'พลังงานสูงสุด +20 ชาร์จไวขึ้น' },
];
export const NO_UPS: UpLevels = { laser: 0, shield: 0, engine: 0, energy: 0 };

/** ราคาอัปจากระดับ lvl ไป lvl+1 */
export const upCost = (lvl: number) => 30 + lvl * 30;

export function cleanUps(v: unknown): UpLevels {
  const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  const n = (k: UpId) => Math.max(0, Math.min(UP_MAX, Math.floor(Number(o[k]) || 0)));
  return { laser: n('laser'), shield: n('shield'), engine: n('engine'), energy: n('energy') };
}

export function upEffects(u: UpLevels) {
  return {
    laserLvl: u.laser,
    startShield: Math.floor((u.shield + 1) / 2),
    /** ค้างเป้าเพื่อตอบ (ms) */
    dwellMs: 850 - u.engine * 40,
    /** ค้างเป้ายิงอุกกาบาต/บอส (ms) */
    hitMs: 260 - u.engine * 20,
    /** วินาทีช่วงโจมตีบอส */
    attackS: 6.5 + u.engine * 0.5,
    maxEnergy: 100 + u.energy * 20,
    /** วินาทีที่ต้องยกสองมือค้างเพื่อระเบิดพลัง */
    chargeS: 0.7 - u.energy * 0.06,
    /** กระสุนเลเซอร์ต่อการตอบถูกในรอบบอส */
    shots: 3 + Math.floor(u.laser / 2),
  };
}
