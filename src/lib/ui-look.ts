/**
 * ธีมหน้าเว็บ (จำค่าไว้ในเครื่อง) แยกจากโหมดมืด/สว่าง และระดับกราฟิก
 * - normal  ปกติ: แบบที่เว็บเป็นอยู่
 * - minimal มินิมอล: หน้าหลักเหลือแค่ของจำเป็น (เครื่องมือครู เข้าห้อง คลังเกม) ไม่มีของตกแต่ง
 * - clean   คลีน: ส่วนเดิมครบ แต่ไม่มีป้ายโฆษณา/ของตกแต่งลอยไปมา ดูเรียบสบายตา
 * ค่าถูกเขียนลง <html data-ui="..."> ให้ CSS ซ่อนบล็อกที่มี data-hide (สคริปต์ใน layout ตั้งก่อนวาดหน้าแรก ไม่กระพริบ)
 */
export type UiLook = 'normal' | 'minimal' | 'clean';

export const UI_KEY = 'l5g_ui';
export const UI_LOOKS: { id: UiLook; label: string; hint: string }[] = [
  { id: 'normal', label: 'ปกติ', hint: 'แบบเดิมของเว็บ' },
  { id: 'minimal', label: 'มินิมอล', hint: 'เหลือแค่เกมและคลังเกม' },
  { id: 'clean', label: 'คลีน', hint: 'ครบทุกส่วน ไม่มีป้ายและของตกแต่ง' },
];

const isLook = (v: unknown): v is UiLook => v === 'normal' || v === 'minimal' || v === 'clean';

let look: UiLook = 'normal';
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === 'undefined') return;
  loaded = true;
  try {
    const v = window.localStorage.getItem(UI_KEY);
    if (isLook(v)) look = v;
  } catch {
    /* ไม่มี storage ก็ใช้ปกติ */
  }
}

export function getUiLook(): UiLook {
  load();
  return look;
}

export const getServerUiLook = (): UiLook => 'normal';

export function subscribeUiLook(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function setUiLook(next: UiLook) {
  load();
  look = next;
  try {
    window.localStorage.setItem(UI_KEY, next);
  } catch {
    /* เก็บไม่ได้ก็ใช้แค่รอบนี้ */
  }
  document.documentElement.dataset.ui = next;
  listeners.forEach((l) => l());
}

/** หน้าที่เป็นเครื่องมือ/เกมเต็มจอ: ธีมมินิมอลไม่แตะ (ตัวแก้ไขมีสี/เงาที่มีความหมาย) ตั้ง <html data-tool> โดย UiLookScope */
export const TOOL_ROUTES = ['/studio/edit', '/create/edit', '/create/host', '/play'];
export const isToolRoute = (path: string) => TOOL_ROUTES.some((p) => path === p || path.startsWith(p + '/'));

/** สคริปต์เล็กใน <head>: ตั้ง data-ui (และ data-tool) ก่อนหน้าแรกวาด */
export const UI_BOOT = `try{var u=localStorage.getItem('${UI_KEY}');document.documentElement.dataset.ui=(u==='minimal'||u==='clean')?u:'normal'}catch(e){document.documentElement.dataset.ui='normal'}try{var p=location.pathname;if(${JSON.stringify(TOOL_ROUTES)}.some(function(r){return p===r||p.indexOf(r+'/')===0}))document.documentElement.dataset.tool='1'}catch(e){}`;
