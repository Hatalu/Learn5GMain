/**
 * ระดับกราฟิกของเว็บ (จำค่าไว้ในเครื่อง)
 * - lite   ลื่น: ปิดแอนิเมชันวนซ้ำ/ฉากหลังเคลื่อนไหว/เบลอ, 3D และเกมวาดที่ความละเอียด 1x
 * - normal ปกติ: แบบที่เว็บเป็นอยู่
 * - hd     สวย: ภาพคมขึ้น (ความละเอียดสูงสุด 2.5x), ฉากหลังลอยไปมา, กระจกเบลอ, ผงดาวตามนิ้ว
 * ค่าถูกเขียนลง <html data-gfx="..."> ให้ CSS ใช้ และสคริปต์ใน layout ตั้งค่าก่อนวาดหน้าแรก (ไม่กระพริบ)
 */
export type Gfx = 'lite' | 'normal' | 'hd';

export const GFX_KEY = 'l5g_gfx';
export const GFX_LEVELS: { id: Gfx; label: string; hint: string }[] = [
  { id: 'lite', label: 'ลื่น', hint: 'เครื่องทำงานน้อยสุด' },
  { id: 'normal', label: 'ปกติ', hint: 'แบบเดิมของเว็บ' },
  { id: 'hd', label: 'สวย', hint: 'คมชัด แอนิเมชันเต็ม' },
];

const isGfx = (v: unknown): v is Gfx => v === 'lite' || v === 'normal' || v === 'hd';

let level: Gfx = 'normal';
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === 'undefined') return;
  loaded = true;
  try {
    const v = window.localStorage.getItem(GFX_KEY);
    if (isGfx(v)) level = v;
  } catch {
    /* ไม่มี storage ก็ใช้ปกติ */
  }
}

export function getGfx(): Gfx {
  load();
  return level;
}

export const getServerGfx = (): Gfx => 'normal';

export function subscribeGfx(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function setGfx(next: Gfx) {
  load();
  level = next;
  try {
    window.localStorage.setItem(GFX_KEY, next);
  } catch {
    /* เก็บไม่ได้ก็ใช้แค่รอบนี้ */
  }
  document.documentElement.dataset.gfx = next;
  listeners.forEach((l) => l());
}

/** ความละเอียดของ canvas/WebGL ตามระดับกราฟิก (normal = ค่าเดิมที่แต่ละที่ใช้) */
export function gfxDpr(normalCap = 1.5): number {
  const d = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
  const g = getGfx();
  if (g === 'lite') return 1;
  return Math.min(d, g === 'hd' ? 2.5 : normalCap);
}

/** สคริปต์เล็กใน <head>: ตั้ง data-gfx ก่อนหน้าแรกวาด */
export const GFX_BOOT = `try{var g=localStorage.getItem('${GFX_KEY}');document.documentElement.dataset.gfx=(g==='lite'||g==='hd')?g:'normal'}catch(e){document.documentElement.dataset.gfx='normal'}`;
