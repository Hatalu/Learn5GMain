/**
 * แป้นลัดของโหมดเอกสาร (แบบ Word) + แป้นลัดแม่แบบในหน้าต่างสมการ (แบบ MathType) ที่ผู้ใช้ตั้งเองได้
 * ปุ่มเก็บเป็น "combo" เช่น Ctrl+Shift+KeyF (ใช้ e.code จะได้ทำงานตอนแป้นภาษาไทยด้วย)
 * แป้นลัดแม่แบบทำงานเฉพาะในหน้าต่างสมการ (เหมือน MathType) จึงไม่ชนกับแป้นลัด Word
 * การตั้งค่าเก็บในเครื่อง (localStorage)
 */

export interface KeyEventLike {
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  code: string;
}

const MOD_CODES = /^(Control|Shift|Alt|Meta|OS)(Left|Right)?$/;

/** ปุ่มที่กด เป็นข้อความเดียว (null = กดแค่ปุ่ม Ctrl/Shift/Alt) */
export function comboOf(e: KeyEventLike): string | null {
  if (!e.code || MOD_CODES.test(e.code)) return null;
  const parts: string[] = [];
  if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
  if (e.altKey) parts.push('Alt');
  if (e.shiftKey) parts.push('Shift');
  parts.push(e.code);
  return parts.join('+');
}

const CODE_LABEL: Record<string, string> = {
  Equal: '=',
  Minus: '-',
  Period: '.',
  Comma: ',',
  Slash: '/',
  Backslash: '\\',
  BracketLeft: '[',
  BracketRight: ']',
  Semicolon: ';',
  Quote: "'",
  Backquote: '`',
  Space: 'Space',
  Enter: 'Enter',
  Escape: 'Esc',
  Backspace: 'Backspace',
  Delete: 'Delete',
  Tab: 'Tab',
};

/** ข้อความที่แสดงให้ผู้ใช้อ่าน เช่น Ctrl + Shift + F */
export function comboLabel(c: string): string {
  return c
    .split('+')
    .map((p) => CODE_LABEL[p] ?? p.replace(/^Key/, '').replace(/^Digit/, '').replace(/^Numpad/, 'Num ').replace(/^Arrow/, ''))
    .join(' + ');
}

/* ------------------------------------------------------------------ แป้นลัดโหมด Word */

export type WordKeyId =
  | 'bold' | 'italic' | 'underline'
  | 'left' | 'center' | 'right' | 'justify'
  | 'sizeUp' | 'sizeDown' | 'sizePlus' | 'sizeMinus'
  | 'sub' | 'sup' | 'clear'
  | 'line1' | 'line2' | 'line15'
  | 'indent' | 'outdent' | 'bullets'
  | 'h1' | 'h2' | 'h3'
  | 'pageBreak' | 'math' | 'mathDisplay' | 'find' | 'replace';

export const WORD_KEYS: { id: WordKeyId; combo: string; label: string }[] = [
  { id: 'bold', combo: 'Ctrl+KeyB', label: 'ตัวหนา' },
  { id: 'italic', combo: 'Ctrl+KeyI', label: 'ตัวเอียง' },
  { id: 'underline', combo: 'Ctrl+KeyU', label: 'ขีดเส้นใต้' },
  { id: 'left', combo: 'Ctrl+KeyL', label: 'ชิดซ้าย' },
  { id: 'center', combo: 'Ctrl+KeyE', label: 'กึ่งกลาง' },
  { id: 'right', combo: 'Ctrl+KeyR', label: 'ชิดขวา' },
  { id: 'justify', combo: 'Ctrl+KeyJ', label: 'เต็มบรรทัด' },
  { id: 'sizeUp', combo: 'Ctrl+Shift+Period', label: 'ตัวอักษรใหญ่ขึ้น' },
  { id: 'sizeDown', combo: 'Ctrl+Shift+Comma', label: 'ตัวอักษรเล็กลง' },
  { id: 'sizePlus', combo: 'Ctrl+BracketRight', label: 'ตัวอักษร +1' },
  { id: 'sizeMinus', combo: 'Ctrl+BracketLeft', label: 'ตัวอักษร -1' },
  { id: 'sub', combo: 'Ctrl+Equal', label: 'ตัวห้อย' },
  { id: 'sup', combo: 'Ctrl+Shift+Equal', label: 'ตัวยก' },
  { id: 'clear', combo: 'Ctrl+Space', label: 'ล้างรูปแบบ' },
  { id: 'line1', combo: 'Ctrl+Digit1', label: 'ระยะบรรทัด 1' },
  { id: 'line2', combo: 'Ctrl+Digit2', label: 'ระยะบรรทัด 2' },
  { id: 'line15', combo: 'Ctrl+Digit5', label: 'ระยะบรรทัด 1.5' },
  { id: 'indent', combo: 'Ctrl+KeyM', label: 'เพิ่มการเยื้อง' },
  { id: 'outdent', combo: 'Ctrl+Shift+KeyM', label: 'ลดการเยื้อง' },
  { id: 'bullets', combo: 'Ctrl+Shift+KeyL', label: 'สัญลักษณ์แสดงหัวข้อ' },
  { id: 'h1', combo: 'Ctrl+Alt+Digit1', label: 'หัวเรื่อง 1' },
  { id: 'h2', combo: 'Ctrl+Alt+Digit2', label: 'หัวเรื่อง 2' },
  { id: 'h3', combo: 'Ctrl+Alt+Digit3', label: 'หัวเรื่อง 3' },
  { id: 'pageBreak', combo: 'Ctrl+Enter', label: 'ขึ้นหน้าใหม่' },
  { id: 'math', combo: 'Alt+Equal', label: 'สมการในบรรทัด (MathType)' },
  { id: 'mathDisplay', combo: 'Alt+KeyQ', label: 'สมการแยกบรรทัด (MathType)' },
  { id: 'find', combo: 'Ctrl+KeyF', label: 'ค้นหา' },
  { id: 'replace', combo: 'Ctrl+KeyH', label: 'แทนที่' },
];

/** ปุ่มที่ห้ามตั้ง (ใช้แก้ไขข้อความ / เบราว์เซอร์จองไว้) */
export const RESERVED: Record<string, string> = {
  'Ctrl+KeyC': 'คัดลอก',
  'Ctrl+KeyV': 'วาง',
  'Ctrl+KeyX': 'ตัด',
  'Ctrl+KeyA': 'เลือกทั้งหมด',
  'Ctrl+KeyZ': 'ย้อนกลับ',
  'Ctrl+KeyY': 'ทำซ้ำ',
  'Ctrl+Shift+KeyZ': 'ทำซ้ำ',
  'Ctrl+KeyS': 'บันทึก',
  'Ctrl+KeyN': 'เบราว์เซอร์: หน้าต่างใหม่',
  'Ctrl+KeyT': 'เบราว์เซอร์: แท็บใหม่',
  'Ctrl+KeyW': 'เบราว์เซอร์: ปิดแท็บ',
  'Ctrl+Shift+KeyN': 'เบราว์เซอร์: หน้าต่างไม่ระบุตัวตน',
  'Ctrl+Shift+KeyT': 'เบราว์เซอร์: เปิดแท็บที่ปิดไป',
  'Ctrl+Tab': 'เบราว์เซอร์: สลับแท็บ',
  'Alt+F4': 'ปิดโปรแกรม',
};

/** ปุ่มที่ไม่มี Ctrl/Alt ใช้พิมพ์ข้อความ ตั้งเป็นแป้นลัดไม่ได้ (ยกเว้นปุ่ม F1-F12) */
export const needsModifier = (combo: string) => !/^(Ctrl|Alt)\+/.test(combo) && !/(^|\+)F\d{1,2}$/.test(combo);

/* ------------------------------------------------------------------ แป้นลัด MathType */

/** ค่าเริ่มต้นตามแป้นลัดของ MathType (ใส่ LaTeX ของแม่แบบ -> ปุ่ม) */
export const MATH_DEFAULTS: Record<string, string> = {
  '\\frac{#0}{#?}': 'Ctrl+KeyF',
  '#0^{#?}': 'Ctrl+KeyH',
  '#0_{#?}': 'Ctrl+KeyL',
  '\\sqrt{#0}': 'Ctrl+KeyR',
  '\\left(#0\\right)': 'Ctrl+Digit9',
  '\\left[#0\\right]': 'Ctrl+BracketLeft',
  '\\int #0\\,d#?': 'Ctrl+KeyI',
  '\\sqrt[#?]{#0}': 'Ctrl+Shift+KeyR',
};

/** ปุ่มที่หน้าต่างสมการใช้เอง */
const MATH_OWN: Record<string, string> = {
  Enter: 'ใส่สูตร (Enter)',
  Escape: 'ปิดหน้าต่าง (Esc)',
};

/** แป้นลัดแม่แบบ: LaTeX ของแม่แบบ -> ปุ่ม (ไม่มีในรายการ = ไม่ได้ตั้ง) เก็บในเครื่อง */
export type MathKeys = Record<string, string>;

const STORE = 'l5g_math_keys_v1';

export function loadMathKeys(): MathKeys {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE) || 'null') as unknown;
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      const out: MathKeys = {};
      for (const [k, v] of Object.entries(raw)) if (typeof v === 'string' && k.length < 300 && v.length < 60) out[k] = v;
      return out;
    }
  } catch {
    /* ไม่มีที่เก็บ ใช้ค่าเริ่มต้น */
  }
  return { ...MATH_DEFAULTS };
}

export function saveMathKeys(s: MathKeys) {
  try {
    localStorage.setItem(STORE, JSON.stringify(s));
  } catch {
    /* โหมดส่วนตัว: ใช้ได้เฉพาะรอบนี้ */
  }
}

/** แม่แบบของปุ่มนี้ */
export const mathKeyOf = (s: MathKeys, combo: string): string | null => Object.entries(s).find(([, c]) => c === combo)?.[0] ?? null;

export type Conflict = { kind: 'reserved'; label: string } | { kind: 'math'; ins: string };

/** ปุ่มนี้ชนกับอะไรไหม (ไม่นับแม่แบบ selfIns ของตัวเอง) */
export function conflictOf(s: MathKeys, combo: string, selfIns: string): Conflict | null {
  const plain = combo.replace(/^Shift\+/, '');
  if (MATH_OWN[plain]) return { kind: 'reserved', label: MATH_OWN[plain] };
  if (RESERVED[combo]) return { kind: 'reserved', label: RESERVED[combo] };
  if (needsModifier(combo)) return { kind: 'reserved', label: 'ปุ่มนี้ใช้พิมพ์ข้อความ ต้องกด Ctrl หรือ Alt ร่วมด้วย' };
  const m = Object.entries(s).find(([ins, c]) => c === combo && ins !== selfIns);
  return m ? { kind: 'math', ins: m[0] } : null;
}

/** ตั้งปุ่มให้แม่แบบ ถ้าชนกับแม่แบบอื่น ปิดของเดิม (ผู้ใช้เลือกแล้ว) */
export function assignMath(s: MathKeys, ins: string, combo: string): MathKeys {
  const out: MathKeys = {};
  for (const [k, c] of Object.entries(s)) if (c !== combo) out[k] = c;
  out[ins] = combo;
  return out;
}
