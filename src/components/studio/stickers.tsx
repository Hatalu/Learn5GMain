import React from 'react';

/** สติกเกอร์วาดเอง (SVG ล้วน ห้ามอิโมจิ) กรอบ 0-100 เส้นขอบเข้มหนาแบบการ์ตูน */
const O = '#2a2350';
const s = { stroke: O, strokeWidth: 4, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };

export interface StickerDef {
  id: string;
  label: string;
  cat: StickerCat;
  el: React.ReactNode;
}
export type StickerCat = 'math' | 'sci' | 'eng' | 'thai' | 'learn' | 'nature' | 'animal' | 'award' | 'sign' | 'stamp';
export const STICKER_CATS: { id: StickerCat; label: string }[] = [
  { id: 'math', label: 'คณิตศาสตร์' },
  { id: 'sci', label: 'วิทยาศาสตร์' },
  { id: 'eng', label: 'ภาษาอังกฤษ' },
  { id: 'thai', label: 'ภาษาไทย' },
  { id: 'learn', label: 'การเรียน' },
  { id: 'nature', label: 'ธรรมชาติ' },
  { id: 'animal', label: 'สัตว์' },
  { id: 'award', label: 'รางวัล' },
  { id: 'sign', label: 'สัญลักษณ์' },
  { id: 'stamp', label: 'ตราคำชม' },
];

const eyes = (y = 48, dx = 13, cx = 50) => (
  <>
    <circle cx={cx - dx} cy={y} r="4.5" fill={O} />
    <circle cx={cx + dx} cy={y} r="4.5" fill={O} />
    <circle cx={cx - dx + 1.5} cy={y - 1.5} r="1.4" fill="#fff" />
    <circle cx={cx + dx + 1.5} cy={y - 1.5} r="1.4" fill="#fff" />
  </>
);
const cheeks = (y = 58, dx = 22) => (
  <>
    <ellipse cx={50 - dx} cy={y} rx="6" ry="4" fill="#ff9fb7" opacity=".8" />
    <ellipse cx={50 + dx} cy={y} rx="6" ry="4" fill="#ff9fb7" opacity=".8" />
  </>
);
const smile = (y = 58) => <path d={`M43 ${y} Q50 ${y + 7} 57 ${y}`} fill="none" {...s} strokeWidth={3.5} />;

function Stamp({ text, color, size = 19 }: { text: string; color: string; size?: number }) {
  return (
    <g>
      <circle cx="50" cy="50" r="45" fill="#fff" stroke={color} strokeWidth="5" />
      <circle cx="50" cy="50" r="37" fill="none" stroke={color} strokeWidth="2.5" strokeDasharray="4 4" />
      <path d="M50 10 L53 17 L60 17 L54 21 L56 28 L50 24 L44 28 L46 21 L40 17 L47 17 Z" fill={color} />
      <text x="50" y="58" textAnchor="middle" fontSize={size} fontWeight="700" fill={color} style={{ fontFamily: 'var(--font-mitr), sans-serif' }}>
        {text}
      </text>
      <path d="M26 72 Q50 84 74 72" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" />
    </g>
  );
}

export const STICKERS: StickerDef[] = [
  /* ---------------- การเรียน ---------------- */
  {
    id: 'pencil',
    label: 'ดินสอ',
    cat: 'learn',
    el: (
      <g {...s}>
        <path d="M20 80 L28 58 L70 16 L84 30 L42 72 Z" fill="#ffd166" />
        <path d="M70 16 L78 8 L92 22 L84 30 Z" fill="#ff8fab" />
        <path d="M20 80 L28 58 L42 72 Z" fill="#ffe8c2" />
        <path d="M20 80 L23 72 L28 77 Z" fill={O} />
        <path d="M33 63 L75 21" fill="none" strokeWidth="3" />
      </g>
    ),
  },
  {
    id: 'book',
    label: 'หนังสือ',
    cat: 'learn',
    el: (
      <g {...s}>
        <path d="M8 24 Q30 16 50 26 Q70 16 92 24 V82 Q70 74 50 84 Q30 74 8 82 Z" fill="#fff" />
        <path d="M50 26 V84" fill="none" />
        <path d="M8 24 Q30 16 50 26 V84 Q30 74 8 82 Z" fill="#7cc6ff" />
        <path d="M60 38 Q72 34 82 38 M60 50 Q72 46 82 50 M60 62 Q72 58 82 62" fill="none" strokeWidth="3" />
      </g>
    ),
  },
  {
    id: 'apple',
    label: 'แอปเปิล',
    cat: 'learn',
    el: (
      <g {...s}>
        <path d="M50 30 C36 18 12 24 14 50 C16 76 34 92 50 84 C66 92 84 76 86 50 C88 24 64 18 50 30 Z" fill="#ff6b7a" />
        <path d="M50 30 Q50 18 56 10" fill="none" />
        <path d="M54 20 Q66 8 78 14 Q70 26 54 20 Z" fill="#6ee7b7" />
        <path d="M28 44 Q30 36 36 34" fill="none" stroke="#fff" strokeWidth="4" />
      </g>
    ),
  },
  {
    id: 'bulb',
    label: 'หลอดไฟไอเดีย',
    cat: 'learn',
    el: (
      <g {...s}>
        <path d="M50 10 C30 10 18 26 20 42 C22 56 34 60 36 72 H64 C66 60 78 56 80 42 C82 26 70 10 50 10 Z" fill="#ffe066" />
        <rect x="36" y="72" width="28" height="14" rx="4" fill="#c7d2fe" />
        <path d="M42 92 H58" fill="none" />
        <path d="M42 50 L50 40 L58 50" fill="none" strokeWidth="3" />
        <path d="M6 30 L12 32 M94 30 L88 32 M50 2 V4" fill="none" strokeWidth="3" />
      </g>
    ),
  },
  {
    id: 'clock',
    label: 'นาฬิกา',
    cat: 'learn',
    el: (
      <g {...s}>
        <circle cx="50" cy="54" r="38" fill="#fff" />
        <circle cx="50" cy="54" r="38" fill="none" stroke="#7c5cf0" strokeWidth="7" />
        <path d="M50 54 V32 M50 54 L66 62" fill="none" />
        <circle cx="50" cy="54" r="4" fill={O} />
        <path d="M22 18 L32 26 M78 18 L68 26" fill="none" strokeWidth="6" stroke="#ff8fab" />
      </g>
    ),
  },
  {
    id: 'magnifier',
    label: 'แว่นขยาย',
    cat: 'learn',
    el: (
      <g {...s}>
        <path d="M60 60 L88 88" fill="none" strokeWidth="12" stroke={O} />
        <path d="M62 62 L86 86" fill="none" strokeWidth="6" stroke="#ff9a3d" />
        <circle cx="40" cy="40" r="28" fill="#c9f0ff" />
        <path d="M26 32 Q30 22 40 20" fill="none" stroke="#fff" strokeWidth="5" />
      </g>
    ),
  },
  {
    id: 'globe',
    label: 'ลูกโลก',
    cat: 'learn',
    el: (
      <g {...s}>
        <circle cx="50" cy="46" r="34" fill="#7cc6ff" />
        <path d="M30 28 Q40 30 38 42 Q30 50 36 60 Q28 58 22 48 Q20 36 30 28 Z M58 22 Q72 26 76 40 Q66 42 60 50 Q52 44 56 34 Z M54 64 Q66 60 72 66 Q64 76 54 76 Z" fill="#6ee7b7" strokeWidth="3" />
        <path d="M30 88 H70 M50 80 V88" fill="none" />
      </g>
    ),
  },
  {
    id: 'blocks',
    label: 'บล็อก ABC',
    cat: 'learn',
    el: (
      <g {...s}>
        <rect x="8" y="50" width="40" height="40" rx="6" fill="#ff8fab" />
        <rect x="52" y="50" width="40" height="40" rx="6" fill="#7cc6ff" />
        <rect x="30" y="10" width="40" height="40" rx="6" fill="#ffd166" />
        <text x="50" y="40" textAnchor="middle" fontSize="26" fontWeight="800" fill={O} stroke="none" style={{ fontFamily: 'sans-serif' }}>
          A
        </text>
        <text x="28" y="80" textAnchor="middle" fontSize="26" fontWeight="800" fill={O} stroke="none" style={{ fontFamily: 'sans-serif' }}>
          B
        </text>
        <text x="72" y="80" textAnchor="middle" fontSize="26" fontWeight="800" fill={O} stroke="none" style={{ fontFamily: 'sans-serif' }}>
          C
        </text>
      </g>
    ),
  },
  {
    id: 'ruler',
    label: 'ไม้บรรทัด',
    cat: 'learn',
    el: (
      <g {...s}>
        <rect x="6" y="36" width="88" height="28" rx="4" fill="#ffd166" transform="rotate(-20 50 50)" />
        <path d="M20 46 V54 M32 42 V50 M44 38 V50 M56 34 V42 M68 30 V42 M80 26 V34" fill="none" strokeWidth="3" transform="rotate(-20 50 50) translate(0 6)" />
      </g>
    ),
  },
  {
    id: 'rocket',
    label: 'จรวด',
    cat: 'learn',
    el: (
      <g {...s}>
        <path d="M50 6 C66 18 70 40 66 64 H34 C30 40 34 18 50 6 Z" fill="#fff" />
        <circle cx="50" cy="36" r="9" fill="#7cc6ff" />
        <path d="M34 50 L20 66 L34 66 Z M66 50 L80 66 L66 66 Z" fill="#ff6b7a" />
        <path d="M40 66 Q50 96 60 66 Z" fill="#ffb347" />
      </g>
    ),
  },

  /* ---------------- ธรรมชาติ ---------------- */
  {
    id: 'sun',
    label: 'พระอาทิตย์',
    cat: 'nature',
    el: (
      <g {...s}>
        {Array.from({ length: 8 }, (_, i) => (
          <path key={i} d="M50 4 L56 18 H44 Z" fill="#ffb347" transform={`rotate(${i * 45} 50 50)`} />
        ))}
        <circle cx="50" cy="50" r="26" fill="#ffe066" />
        {eyes(46, 9)}
        {smile(55)}
      </g>
    ),
  },
  {
    id: 'cloudy',
    label: 'ก้อนเมฆ',
    cat: 'nature',
    el: (
      <g {...s}>
        <path d="M22 76 C8 76 6 58 18 54 C14 38 32 30 42 38 C46 22 70 20 74 38 C90 36 96 54 86 62 C92 74 80 78 76 76 Z" fill="#fff" />
        {eyes(56, 10)}
        {cheeks(64, 18)}
      </g>
    ),
  },
  {
    id: 'rainbow',
    label: 'รุ้ง',
    cat: 'nature',
    el: (
      <g {...s} fill="none">
        <path d="M8 76 A42 42 0 0 1 92 76" stroke="#ff6b7a" strokeWidth="10" />
        <path d="M18 76 A32 32 0 0 1 82 76" stroke="#ffd166" strokeWidth="10" />
        <path d="M28 76 A22 22 0 0 1 72 76" stroke="#6ee7b7" strokeWidth="10" />
        <path d="M38 76 A12 12 0 0 1 62 76" stroke="#7cc6ff" strokeWidth="10" />
        <ellipse cx="14" cy="80" rx="12" ry="8" fill="#fff" stroke={O} strokeWidth="4" />
        <ellipse cx="86" cy="80" rx="12" ry="8" fill="#fff" stroke={O} strokeWidth="4" />
      </g>
    ),
  },
  {
    id: 'flower',
    label: 'ดอกไม้',
    cat: 'nature',
    el: (
      <g {...s}>
        <path d="M50 60 V96" fill="none" stroke="#34d399" strokeWidth="6" />
        <path d="M50 82 Q66 70 74 78 Q62 92 50 86" fill="#6ee7b7" />
        {Array.from({ length: 6 }, (_, i) => (
          <ellipse key={i} cx="50" cy="20" rx="12" ry="16" fill="#ff8fab" transform={`rotate(${i * 60} 50 40)`} />
        ))}
        <circle cx="50" cy="40" r="12" fill="#ffd166" />
      </g>
    ),
  },
  {
    id: 'tree',
    label: 'ต้นไม้',
    cat: 'nature',
    el: (
      <g {...s}>
        <path d="M44 62 H56 V94 H44 Z" fill="#b07a4f" />
        <path d="M50 6 C70 6 84 20 82 38 C92 48 86 66 70 66 H30 C14 66 8 48 18 38 C16 20 30 6 50 6 Z" fill="#4ade80" />
        <circle cx="36" cy="36" r="4" fill="#ff6b7a" />
        <circle cx="62" cy="28" r="4" fill="#ff6b7a" />
        <circle cx="64" cy="50" r="4" fill="#ff6b7a" />
      </g>
    ),
  },
  {
    id: 'leaf',
    label: 'ใบไม้',
    cat: 'nature',
    el: (
      <g {...s}>
        <path d="M14 86 C10 40 40 12 88 12 C88 60 60 90 14 86 Z" fill="#6ee7b7" />
        <path d="M14 86 L70 30 M40 60 L40 44 M54 46 L62 46 M30 70 L48 70" fill="none" strokeWidth="3" />
      </g>
    ),
  },
  {
    id: 'moonface',
    label: 'พระจันทร์',
    cat: 'nature',
    el: (
      <g {...s}>
        <path d="M60 6 A44 44 0 1 0 94 64 A34 34 0 1 1 60 6 Z" fill="#ffe066" />
        <circle cx="40" cy="58" r="3.5" fill={O} />
        <path d="M30 70 Q38 76 46 70" fill="none" strokeWidth="3" />
        <path d="M80 18 L82 24 L88 26 L82 28 L80 34 L78 28 L72 26 L78 24 Z" fill="#fff" strokeWidth="2.5" />
      </g>
    ),
  },
  {
    id: 'planet',
    label: 'ดาวเคราะห์',
    cat: 'nature',
    el: (
      <g {...s}>
        <circle cx="50" cy="50" r="28" fill="#c4b5fd" />
        <path d="M8 62 Q50 36 92 38 Q96 44 84 50" fill="none" stroke="#ffb347" strokeWidth="7" />
        <path d="M8 62 Q4 56 16 50" fill="none" stroke="#ffb347" strokeWidth="7" />
        <circle cx="40" cy="40" r="5" fill="#a78bfa" strokeWidth="2" />
      </g>
    ),
  },
  {
    id: 'water',
    label: 'หยดน้ำ',
    cat: 'nature',
    el: (
      <g {...s}>
        <path d="M50 6 C62 28 82 44 82 64 C82 82 68 94 50 94 C32 94 18 82 18 64 C18 44 38 28 50 6 Z" fill="#7cc6ff" />
        {eyes(62, 11)}
        {smile(72)}
      </g>
    ),
  },

  /* ---------------- สัตว์ ---------------- */
  {
    id: 'cat',
    label: 'แมว',
    cat: 'animal',
    el: (
      <g {...s}>
        <path d="M16 40 L18 8 L42 26 H58 L82 8 L84 40 C92 76 70 92 50 92 C30 92 8 76 16 40 Z" fill="#ffc78a" />
        <path d="M24 22 L26 34 L34 28 Z M76 22 L74 34 L66 28 Z" fill="#ff9fb7" strokeWidth="2" />
        {eyes(54, 15)}
        <path d="M46 64 L54 64 L50 69 Z" fill="#ff8fab" strokeWidth="2" />
        <path d="M50 69 Q44 76 40 72 M50 69 Q56 76 60 72 M8 60 L30 64 M8 70 L30 68 M92 60 L70 64 M92 70 L70 68" fill="none" strokeWidth="2.5" />
      </g>
    ),
  },
  {
    id: 'bear',
    label: 'หมี',
    cat: 'animal',
    el: (
      <g {...s}>
        <circle cx="22" cy="24" r="13" fill="#c08457" />
        <circle cx="78" cy="24" r="13" fill="#c08457" />
        <circle cx="50" cy="54" r="38" fill="#c08457" />
        <ellipse cx="50" cy="68" rx="17" ry="13" fill="#f3d2b0" />
        {eyes(50, 15)}
        <ellipse cx="50" cy="62" rx="6" ry="4.5" fill={O} />
        <path d="M44 72 Q50 77 56 72" fill="none" strokeWidth="3" />
      </g>
    ),
  },
  {
    id: 'bunny',
    label: 'กระต่าย',
    cat: 'animal',
    el: (
      <g {...s}>
        <ellipse cx="34" cy="24" rx="10" ry="22" fill="#fff" />
        <ellipse cx="66" cy="24" rx="10" ry="22" fill="#fff" />
        <ellipse cx="34" cy="26" rx="4" ry="13" fill="#ff9fb7" stroke="none" />
        <ellipse cx="66" cy="26" rx="4" ry="13" fill="#ff9fb7" stroke="none" />
        <circle cx="50" cy="62" r="32" fill="#fff" />
        {eyes(58, 13)}
        {cheeks(68, 20)}
        <path d="M46 68 L54 68 L50 72 Z" fill="#ff8fab" strokeWidth="2" />
      </g>
    ),
  },
  {
    id: 'chick',
    label: 'ลูกเจี๊ยบ',
    cat: 'animal',
    el: (
      <g {...s}>
        <path d="M50 12 C76 12 88 36 86 58 C84 82 68 92 50 92 C32 92 16 82 14 58 C12 36 24 12 50 12 Z" fill="#ffe066" />
        <path d="M44 6 Q50 14 56 6" fill="none" />
        {eyes(46, 14)}
        <path d="M42 56 L58 56 L50 66 Z" fill="#ffb347" />
        {cheeks(60, 26)}
        <path d="M14 58 Q4 50 8 40 M86 58 Q96 50 92 40" fill="none" />
      </g>
    ),
  },
  {
    id: 'fish',
    label: 'ปลา',
    cat: 'animal',
    el: (
      <g {...s}>
        <path d="M74 50 L96 30 V70 Z" fill="#ff9a3d" />
        <path d="M8 50 C20 22 58 18 78 50 C58 82 20 78 8 50 Z" fill="#ffb347" />
        <circle cx="28" cy="44" r="4.5" fill={O} />
        <path d="M44 34 Q50 50 44 66 M56 36 Q62 50 56 64" fill="none" strokeWidth="3" />
      </g>
    ),
  },
  {
    id: 'owl',
    label: 'นกฮูก',
    cat: 'animal',
    el: (
      <g {...s}>
        <path d="M18 18 L30 30 H70 L82 18 L86 60 C86 82 70 94 50 94 C30 94 14 82 14 60 Z" fill="#a78bfa" />
        <circle cx="35" cy="46" r="13" fill="#fff" />
        <circle cx="65" cy="46" r="13" fill="#fff" />
        <circle cx="35" cy="46" r="5" fill={O} />
        <circle cx="65" cy="46" r="5" fill={O} />
        <path d="M44 60 L56 60 L50 70 Z" fill="#ffb347" />
        <path d="M34 78 Q50 70 66 78" fill="none" strokeWidth="3" />
      </g>
    ),
  },
  {
    id: 'elephant',
    label: 'ช้าง',
    cat: 'animal',
    el: (
      <g {...s}>
        <ellipse cx="18" cy="46" rx="16" ry="22" fill="#b8c4e0" />
        <ellipse cx="82" cy="46" rx="16" ry="22" fill="#b8c4e0" />
        <circle cx="50" cy="46" r="30" fill="#c9d3ec" />
        <path d="M44 62 C44 80 46 92 56 92 C62 92 62 84 58 84" fill="#c9d3ec" />
        {eyes(42, 13)}
        {cheeks(54, 21)}
      </g>
    ),
  },

  /* ---------------- รางวัล ---------------- */
  {
    id: 'trophy',
    label: 'ถ้วยรางวัล',
    cat: 'award',
    el: (
      <g {...s}>
        <path d="M24 16 H8 C8 36 18 44 30 44 M76 16 H92 C92 36 82 44 70 44" fill="none" />
        <path d="M24 8 H76 V32 C76 50 64 60 50 60 C36 60 24 50 24 32 Z" fill="#ffd166" />
        <path d="M44 60 H56 V76 H44 Z" fill="#ffb347" />
        <rect x="28" y="76" width="44" height="14" rx="4" fill="#7c5cf0" />
        <path d="M50 20 L53 27 L60 27 L54 31 L56 38 L50 34 L44 38 L46 31 L40 27 L47 27 Z" fill="#fff" strokeWidth="2" />
      </g>
    ),
  },
  {
    id: 'medal',
    label: 'เหรียญ',
    cat: 'award',
    el: (
      <g {...s}>
        <path d="M28 4 H44 L56 40 H40 Z" fill="#7cc6ff" />
        <path d="M72 4 H56 L44 40 H60 Z" fill="#ff6b7a" />
        <circle cx="50" cy="64" r="28" fill="#ffd166" />
        <circle cx="50" cy="64" r="18" fill="none" strokeWidth="3" />
        <text x="50" y="72" textAnchor="middle" fontSize="22" fontWeight="800" fill={O} stroke="none" style={{ fontFamily: 'sans-serif' }}>
          1
        </text>
      </g>
    ),
  },
  {
    id: 'crown',
    label: 'มงกุฎ',
    cat: 'award',
    el: (
      <g {...s}>
        <path d="M10 30 L30 52 L50 18 L70 52 L90 30 L82 80 H18 Z" fill="#ffd166" />
        <rect x="18" y="72" width="64" height="12" rx="3" fill="#ffb347" />
        <circle cx="50" cy="56" r="6" fill="#ff6b7a" />
        <circle cx="10" cy="28" r="5" fill="#fff" />
        <circle cx="50" cy="16" r="5" fill="#fff" />
        <circle cx="90" cy="28" r="5" fill="#fff" />
      </g>
    ),
  },
  {
    id: 'gift',
    label: 'กล่องของขวัญ',
    cat: 'award',
    el: (
      <g {...s}>
        <rect x="12" y="40" width="76" height="52" rx="4" fill="#ff8fab" />
        <rect x="8" y="28" width="84" height="16" rx="4" fill="#ffb3c8" />
        <path d="M44 28 H56 V92 H44 Z" fill="#ffd166" />
        <path d="M50 28 C40 10 22 14 28 26 C32 30 44 30 50 28 C56 30 68 30 72 26 C78 14 60 10 50 28 Z" fill="#ffd166" />
      </g>
    ),
  },
  {
    id: 'balloon',
    label: 'ลูกโป่ง',
    cat: 'award',
    el: (
      <g {...s}>
        <path d="M36 70 Q30 82 38 96 M64 66 Q72 80 62 96" fill="none" strokeWidth="2.5" />
        <ellipse cx="36" cy="40" rx="20" ry="25" fill="#ff6b7a" />
        <ellipse cx="64" cy="36" rx="20" ry="25" fill="#7cc6ff" />
        <path d="M33 65 L36 70 L39 65 Z M61 61 L64 66 L67 61 Z" fill={O} strokeWidth="2" />
        <path d="M26 30 Q28 24 32 22 M54 26 Q56 20 60 18" fill="none" stroke="#fff" strokeWidth="4" />
      </g>
    ),
  },
  {
    id: 'ribbon',
    label: 'โบว์รางวัล',
    cat: 'award',
    el: (
      <g {...s}>
        <path d="M34 56 L22 96 L36 88 L44 98 L50 60 Z M66 56 L78 96 L64 88 L56 98 L50 60 Z" fill="#7c5cf0" />
        <path d={`M${star(14, 40).join(' L')} Z`} fill="#ff8fab" transform="translate(14 0) scale(.72)" />
        <circle cx="50" cy="36" r="20" fill="#fff" />
        <path d="M40 36 L47 43 L60 29" fill="none" strokeWidth="5" stroke="#34d399" />
      </g>
    ),
  },

  /* ---------------- สัญลักษณ์ ---------------- */
  {
    id: 'check',
    label: 'ถูก',
    cat: 'sign',
    el: (
      <g {...s}>
        <circle cx="50" cy="50" r="42" fill="#34d399" />
        <path d="M28 52 L44 68 L74 36" fill="none" stroke="#fff" strokeWidth="10" />
      </g>
    ),
  },
  {
    id: 'wrong',
    label: 'ผิด',
    cat: 'sign',
    el: (
      <g {...s}>
        <circle cx="50" cy="50" r="42" fill="#ff6b7a" />
        <path d="M32 32 L68 68 M68 32 L32 68" fill="none" stroke="#fff" strokeWidth="10" />
      </g>
    ),
  },
  {
    id: 'question',
    label: 'คำถาม',
    cat: 'sign',
    el: (
      <g {...s}>
        <circle cx="50" cy="50" r="42" fill="#7cc6ff" />
        <path d="M36 38 C36 24 64 22 64 38 C64 50 50 50 50 62" fill="none" stroke="#fff" strokeWidth="9" />
        <circle cx="50" cy="76" r="5.5" fill="#fff" stroke="none" />
      </g>
    ),
  },
  {
    id: 'alert',
    label: 'ข้อควรระวัง',
    cat: 'sign',
    el: (
      <g {...s}>
        <path d="M50 8 L94 88 H6 Z" fill="#ffd166" />
        <path d="M50 36 V60" fill="none" strokeWidth="9" />
        <circle cx="50" cy="74" r="5.5" fill={O} stroke="none" />
      </g>
    ),
  },
  {
    id: 'heartface',
    label: 'หัวใจ',
    cat: 'sign',
    el: (
      <g {...s}>
        <path d="M50 90 C18 68 4 50 6 30 C8 14 22 6 34 8 C42 10 48 16 50 22 C52 16 58 10 66 8 C78 6 92 14 94 30 C96 50 82 68 50 90 Z" fill="#ff6b7a" />
        {eyes(42, 13)}
        {smile(54)}
      </g>
    ),
  },
  {
    id: 'sparkle',
    label: 'ประกายดาว',
    cat: 'sign',
    el: (
      <g {...s}>
        <path d="M44 6 Q48 40 82 44 Q48 48 44 82 Q40 48 6 44 Q40 40 44 6 Z" fill="#ffd166" />
        <path d="M80 62 Q81 74 92 76 Q81 78 80 90 Q79 78 68 76 Q79 74 80 62 Z" fill="#ff8fab" strokeWidth="3" />
      </g>
    ),
  },
  {
    id: 'note',
    label: 'โน้ตดนตรี',
    cat: 'sign',
    el: (
      <g {...s}>
        <path d="M38 76 V20 L84 10 V64" fill="none" strokeWidth="6" />
        <path d="M38 20 L84 10 V24 L38 34 Z" fill={O} />
        <ellipse cx="28" cy="78" rx="13" ry="10" fill="#a78bfa" />
        <ellipse cx="74" cy="66" rx="13" ry="10" fill="#a78bfa" />
      </g>
    ),
  },
  {
    id: 'thumb',
    label: 'ยอดเยี่ยม',
    cat: 'sign',
    el: (
      <g {...s}>
        <path d="M32 44 L48 10 C58 8 60 18 58 26 L54 40 H82 C90 40 92 50 86 54 C92 58 90 66 84 68 C88 74 84 80 78 80 C80 86 76 92 68 92 H36 Z" fill="#ffc78a" />
        <rect x="10" y="42" width="22" height="52" rx="4" fill="#7c5cf0" />
      </g>
    ),
  },
  {
    id: 'pin',
    label: 'หมุดปัก',
    cat: 'sign',
    el: (
      <g {...s}>
        <path d="M50 58 V94" fill="none" strokeWidth="5" />
        <path d="M32 12 H68 L62 32 C74 38 78 48 78 58 H22 C22 48 26 38 38 32 Z" fill="#ff6b7a" />
        <path d="M40 18 H52" fill="none" stroke="#fff" strokeWidth="4" />
      </g>
    ),
  },

  /* ---------------- คณิตศาสตร์ ---------------- */
  {
    id: 'm-plus',
    label: 'บวก',
    cat: 'math',
    el: (
      <g {...s}>
        <rect x="10" y="12" width="80" height="80" rx="18" fill="#ff8fab" />
        <rect x="10" y="12" width="80" height="72" rx="18" fill="#ffffff55" stroke="none" />
        <text x="50" y="79" textAnchor="middle" fontSize="84" fontWeight="800" fill="#2a2350" stroke="none" style={{ fontFamily: 'var(--font-mitr), sans-serif' }}>
          +
        </text>
      </g>
    ),
  },
  {
    id: 'm-minus',
    label: 'ลบ',
    cat: 'math',
    el: (
      <g {...s}>
        <rect x="10" y="12" width="80" height="80" rx="18" fill="#7cc6ff" />
        <rect x="10" y="12" width="80" height="72" rx="18" fill="#ffffff55" stroke="none" />
        <text x="50" y="79" textAnchor="middle" fontSize="84" fontWeight="800" fill="#2a2350" stroke="none" style={{ fontFamily: 'var(--font-mitr), sans-serif' }}>
          −
        </text>
      </g>
    ),
  },
  {
    id: 'm-times',
    label: 'คูณ',
    cat: 'math',
    el: (
      <g {...s}>
        <rect x="10" y="12" width="80" height="80" rx="18" fill="#ffd166" />
        <rect x="10" y="12" width="80" height="72" rx="18" fill="#ffffff55" stroke="none" />
        <text x="50" y="79" textAnchor="middle" fontSize="84" fontWeight="800" fill="#2a2350" stroke="none" style={{ fontFamily: 'var(--font-mitr), sans-serif' }}>
          ×
        </text>
      </g>
    ),
  },
  {
    id: 'm-divide',
    label: 'หาร',
    cat: 'math',
    el: (
      <g {...s}>
        <rect x="10" y="12" width="80" height="80" rx="18" fill="#6ee7b7" />
        <rect x="10" y="12" width="80" height="72" rx="18" fill="#ffffff55" stroke="none" />
        <text x="50" y="79" textAnchor="middle" fontSize="84" fontWeight="800" fill="#2a2350" stroke="none" style={{ fontFamily: 'var(--font-mitr), sans-serif' }}>
          ÷
        </text>
      </g>
    ),
  },
  {
    id: 'm-equal',
    label: 'เท่ากับ',
    cat: 'math',
    el: (
      <g {...s}>
        <rect x="10" y="12" width="80" height="80" rx="18" fill="#c4b5fd" />
        <rect x="10" y="12" width="80" height="72" rx="18" fill="#ffffff55" stroke="none" />
        <text x="50" y="79" textAnchor="middle" fontSize="84" fontWeight="800" fill="#2a2350" stroke="none" style={{ fontFamily: 'var(--font-mitr), sans-serif' }}>
          =
        </text>
      </g>
    ),
  },
  {
    id: 'm-123',
    label: 'ตัวเลข 123',
    cat: 'math',
    el: (
      <g {...s}>
        <rect x="10" y="12" width="80" height="80" rx="18" fill="#ffb347" />
        <rect x="10" y="12" width="80" height="72" rx="18" fill="#ffffff55" stroke="none" />
        <text x="50" y="63.68" textAnchor="middle" fontSize="38" fontWeight="800" fill="#2a2350" stroke="none" style={{ fontFamily: 'var(--font-mitr), sans-serif' }}>
          123
        </text>
      </g>
    ),
  },
  {
    id: 'm-pi',
    label: 'พาย',
    cat: 'math',
    el: (
      <g {...s}>
        <rect x="10" y="12" width="80" height="80" rx="18" fill="#a7f3d0" />
        <rect x="10" y="12" width="80" height="72" rx="18" fill="#ffffff55" stroke="none" />
        <text x="50" y="71.6" textAnchor="middle" fontSize="60" fontWeight="800" fill="#2a2350" stroke="none" style={{ fontFamily: 'var(--font-mitr), sans-serif' }}>
          π
        </text>
      </g>
    ),
  },
  {
    id: 'm-calc',
    label: 'เครื่องคิดเลข',
    cat: 'math',
    el: (
      <g {...s}>
        <rect x="20" y="6" width="60" height="88" rx="10" fill="#7c5cf0" />
        <rect x="28" y="14" width="44" height="18" rx="4" fill="#d1fae5" />
        <text x="66" y="28" textAnchor="end" fontSize="13" fontWeight="800" fill="#2a2350" stroke="none" style={{ fontFamily: 'monospace' }}>
          123
        </text>
        {[0, 1, 2].flatMap((r) => [0, 1, 2].map((c) => <rect key={`${r}${c}`} x={28 + c * 16} y={40 + r * 16} width="12" height="12" rx="3" fill={r === 2 && c === 2 ? '#ff8fab' : '#fff'} strokeWidth="2.5" />))}
      </g>
    ),
  },
  {
    id: 'm-protractor',
    label: 'ไม้โปรแทรกเตอร์',
    cat: 'math',
    el: (
      <g {...s}>
        <path d="M6 76 A44 44 0 0 1 94 76 Z" fill="#c9f0ff" />
        <path d="M30 76 A20 20 0 0 1 70 76" fill="none" />
        {Array.from({ length: 13 }, (_, i) => {
          const a = Math.PI - (i * Math.PI) / 12;
          return <line key={i} x1={50 + 44 * Math.cos(a)} y1={76 - 44 * Math.sin(a)} x2={50 + 37 * Math.cos(a)} y2={76 - 37 * Math.sin(a)} strokeWidth="2.5" />;
        })}
        <circle cx="50" cy="76" r="3" fill="#2a2350" />
      </g>
    ),
  },
  {
    id: 'm-setsquare',
    label: 'ไม้ฉาก',
    cat: 'math',
    el: (
      <g {...s}>
        <path d="M14 10 L14 90 L90 90 Z" fill="#ffd166" />
        <path d="M28 46 L28 76 L58 76 Z" fill="#fff" />
        <path d="M14 30 H22 M14 50 H22 M14 70 H22 M34 90 V82 M54 90 V82 M74 90 V82" strokeWidth="2.5" />
      </g>
    ),
  },
  {
    id: 'm-abacus',
    label: 'ลูกคิด',
    cat: 'math',
    el: (
      <g {...s}>
        <rect x="8" y="10" width="84" height="80" rx="8" fill="#b07a4f" />
        <rect x="16" y="18" width="68" height="64" rx="4" fill="#fff8ec" />
        {[30, 50, 70].map((y, r) => (
          <g key={y}>
            <line x1="16" x2="84" y1={y} y2={y} strokeWidth="3" />
            {[0, 1, 2, 3].slice(0, 2 + r).map((i) => (
              <circle key={i} cx={26 + i * 11} cy={y} r="5.5" fill={['#ff6b7a', '#7cc6ff', '#6ee7b7'][r]} strokeWidth="2.5" />
            ))}
          </g>
        ))}
      </g>
    ),
  },
  {
    id: 'm-cube',
    label: 'ลูกบาศก์',
    cat: 'math',
    el: (
      <g {...s}>
        <path d="M50 10 L88 30 L88 72 L50 92 L12 72 L12 30 Z" fill="#a78bfa" />
        <path d="M50 10 L88 30 L50 50 L12 30 Z" fill="#c4b5fd" />
        <path d="M50 50 L88 30 L88 72 L50 92 Z" fill="#7c5cf0" />
      </g>
    ),
  },
  {
    id: 'm-chart',
    label: 'กราฟแท่ง',
    cat: 'math',
    el: (
      <g {...s}>
        <path d="M12 10 V88 H92" fill="none" />
        <rect x="22" y="56" width="14" height="32" fill="#ff8fab" />
        <rect x="42" y="36" width="14" height="52" fill="#7cc6ff" />
        <rect x="62" y="20" width="14" height="68" fill="#6ee7b7" />
        <path d="M22 50 L44 30 L66 14 L84 10" fill="none" stroke="#e07a12" />
      </g>
    ),
  },
  {
    id: 'm-shapes',
    label: 'รูปเรขาคณิต',
    cat: 'math',
    el: (
      <g {...s}>
        <circle cx="30" cy="30" r="20" fill="#ff8fab" />
        <rect x="54" y="12" width="36" height="36" rx="4" fill="#7cc6ff" />
        <path d="M50 56 L76 92 L24 92 Z" fill="#ffd166" />
      </g>
    ),
  },

  /* ---------------- วิทยาศาสตร์ ---------------- */
  {
    id: 's-beaker',
    label: 'บีกเกอร์',
    cat: 'sci',
    el: (
      <g {...s}>
        <path d="M22 12 H78 L72 22 V86 Q72 92 66 92 H34 Q28 92 28 86 V22 Z" fill="#fff" />
        <path d="M28 54 H72 V86 Q72 92 66 92 H34 Q28 92 28 86 Z" fill="#6ee7b7" />
        <circle cx="42" cy="66" r="4" fill="#fff" strokeWidth="2" />
        <circle cx="56" cy="76" r="3" fill="#fff" strokeWidth="2" />
        <path d="M60 32 H72 M60 42 H72" strokeWidth="2.5" />
      </g>
    ),
  },
  {
    id: 's-tube',
    label: 'หลอดทดลอง',
    cat: 'sci',
    el: (
      <g {...s}>
        <rect x="18" y="8" width="20" height="80" rx="10" fill="#fff" />
        <rect x="18" y="48" width="20" height="40" rx="10" fill="#ff8fab" />
        <rect x="44" y="8" width="20" height="80" rx="10" fill="#fff" />
        <rect x="44" y="36" width="20" height="52" rx="10" fill="#7cc6ff" />
        <rect x="70" y="8" width="20" height="80" rx="10" fill="#fff" />
        <rect x="70" y="58" width="20" height="30" rx="10" fill="#ffd166" />
      </g>
    ),
  },
  {
    id: 's-micro',
    label: 'กล้องจุลทรรศน์',
    cat: 'sci',
    el: (
      <g {...s}>
        <rect x="18" y="84" width="64" height="10" rx="4" fill="#7c5cf0" />
        <path d="M56 84 Q76 64 64 36" fill="none" strokeWidth="8" stroke="#2a2350" />
        <path d="M56 84 Q76 64 64 36" fill="none" strokeWidth="4" stroke="#a78bfa" />
        <rect x="30" y="10" width="16" height="44" rx="5" fill="#c4b5fd" transform="rotate(-25 38 32)" />
        <rect x="26" y="62" width="40" height="8" rx="3" fill="#ffd166" />
        <circle cx="34" cy="10" r="6" fill="#fff" />
      </g>
    ),
  },
  {
    id: 's-atom',
    label: 'อะตอม',
    cat: 'sci',
    el: (
      <g {...s} fill="none">
        <ellipse cx="50" cy="50" rx="42" ry="15" stroke="#2a73d9" />
        <ellipse cx="50" cy="50" rx="42" ry="15" stroke="#e8456b" transform="rotate(60 50 50)" />
        <ellipse cx="50" cy="50" rx="42" ry="15" stroke="#2f9e6e" transform="rotate(-60 50 50)" />
        <circle cx="50" cy="50" r="8" fill="#ffd166" stroke="#2a2350" />
      </g>
    ),
  },
  {
    id: 's-dna',
    label: 'ดีเอ็นเอ',
    cat: 'sci',
    el: (
      <g {...s} fill="none">
        <path d="M30 6 C70 26 70 36 50 50 C30 64 30 74 70 94" stroke="#7c5cf0" strokeWidth="6" />
        <path d="M70 6 C30 26 30 36 50 50 C70 64 70 74 30 94" stroke="#e8456b" strokeWidth="6" />
        {[18, 32, 68, 82].map((y) => (
          <line key={y} x1="38" x2="62" y1={y} y2={y} strokeWidth="3" />
        ))}
      </g>
    ),
  },
  {
    id: 's-magnet',
    label: 'แม่เหล็ก',
    cat: 'sci',
    el: (
      <g {...s}>
        <path d="M14 10 H38 V54 Q38 66 50 66 Q62 66 62 54 V10 H86 V54 Q86 90 50 90 Q14 90 14 54 Z" fill="#ff6b7a" />
        <rect x="14" y="10" width="24" height="16" fill="#e5e7eb" />
        <rect x="62" y="10" width="24" height="16" fill="#e5e7eb" />
      </g>
    ),
  },
  {
    id: 's-thermo',
    label: 'เทอร์โมมิเตอร์',
    cat: 'sci',
    el: (
      <g {...s}>
        <rect x="40" y="6" width="20" height="68" rx="10" fill="#fff" />
        <circle cx="50" cy="80" r="14" fill="#ff6b7a" />
        <rect x="46" y="30" width="8" height="46" fill="#ff6b7a" stroke="none" />
        <path d="M60 20 H68 M60 34 H68 M60 48 H68" strokeWidth="2.5" />
      </g>
    ),
  },
  {
    id: 's-earth',
    label: 'โลก',
    cat: 'sci',
    el: (
      <g {...s}>
        <circle cx="50" cy="50" r="40" fill="#7cc6ff" />
        <path d="M24 30 Q38 26 40 40 Q30 52 38 64 Q24 60 18 46 Q16 36 24 30 Z M56 18 Q74 24 80 42 Q66 44 58 54 Q48 44 54 32 Z M54 70 Q70 64 78 72 Q66 86 54 84 Z" fill="#6ee7b7" strokeWidth="3" />
        {eyes(56, 12)}
        {smile(66)}
      </g>
    ),
  },
  {
    id: 's-sprout',
    label: 'ต้นอ่อน',
    cat: 'sci',
    el: (
      <g {...s}>
        <path d="M22 70 H78 L72 94 H28 Z" fill="#c08457" />
        <path d="M50 70 V40" fill="none" stroke="#2f9e6e" strokeWidth="6" />
        <path d="M50 46 C30 46 20 30 22 16 C38 16 50 28 50 46 Z" fill="#6ee7b7" />
        <path d="M50 40 C66 40 80 30 80 14 C64 14 50 24 50 40 Z" fill="#34d399" />
      </g>
    ),
  },
  {
    id: 's-telescope',
    label: 'กล้องโทรทรรศน์',
    cat: 'sci',
    el: (
      <g {...s}>
        <path d="M44 56 L30 94 M52 56 L66 94" fill="none" strokeWidth="5" />
        <rect x="14" y="30" width="70" height="20" rx="8" fill="#7c5cf0" transform="rotate(-25 50 40)" />
        <rect x="76" y="14" width="14" height="28" rx="5" fill="#c4b5fd" transform="rotate(-25 83 28)" />
        <circle cx="48" cy="54" r="6" fill="#ffd166" />
      </g>
    ),
  },
  {
    id: 's-germ',
    label: 'เชื้อโรค',
    cat: 'sci',
    el: (
      <g {...s}>
        {Array.from({ length: 8 }, (_, i) => (
          <g key={i} transform={`rotate(${i * 45} 50 50)`}>
            <line x1="50" y1="14" x2="50" y2="22" strokeWidth="4" />
            <circle cx="50" cy="11" r="5" fill="#6ee7b7" strokeWidth="3" />
          </g>
        ))}
        <circle cx="50" cy="50" r="30" fill="#a7f3d0" />
        {eyes(48, 10)}
        <path d="M42 62 Q50 56 58 62" fill="none" strokeWidth="3.5" />
      </g>
    ),
  },

  /* ---------------- ภาษาอังกฤษ ---------------- */
  {
    id: 'e-hello',
    label: 'Hello!',
    cat: 'eng',
    el: (
      <g {...s}>
        <path d="M14 14 H86 Q96 14 96 24 V62 Q96 72 86 72 H44 L26 90 L30 72 H14 Q4 72 4 62 V24 Q4 14 14 14 Z" fill="#7cc6ff" />
        <text x="50" y="50.7" textAnchor="middle" fontSize="22" fontWeight="800" fill="#2a2350" stroke="none" style={{ fontFamily: 'var(--font-mitr), sans-serif' }}>
          Hello!
        </text>
      </g>
    ),
  },
  {
    id: 'e-hi',
    label: 'Hi!',
    cat: 'eng',
    el: (
      <g {...s}>
        <path d="M14 14 H86 Q96 14 96 24 V62 Q96 72 86 72 H44 L26 90 L30 72 H14 Q4 72 4 62 V24 Q4 14 14 14 Z" fill="#ffd166" />
        <text x="50" y="53.5" textAnchor="middle" fontSize="30" fontWeight="800" fill="#2a2350" stroke="none" style={{ fontFamily: 'var(--font-mitr), sans-serif' }}>
          Hi!
        </text>
      </g>
    ),
  },
  {
    id: 'e-thanks',
    label: 'Thank you',
    cat: 'eng',
    el: (
      <g {...s}>
        <path d="M14 14 H86 Q96 14 96 24 V62 Q96 72 86 72 H44 L26 90 L30 72 H14 Q4 72 4 62 V24 Q4 14 14 14 Z" fill="#ff8fab" />
        <text x="50" y="48.6" textAnchor="middle" fontSize="16" fontWeight="800" fill="#2a2350" stroke="none" style={{ fontFamily: 'var(--font-mitr), sans-serif' }}>
          Thank you
        </text>
      </g>
    ),
  },
  {
    id: 'e-goodjob',
    label: 'Good job!',
    cat: 'eng',
    el: (
      <g {...s}>
        <path d="M14 14 H86 Q96 14 96 24 V62 Q96 72 86 72 H44 L26 90 L30 72 H14 Q4 72 4 62 V24 Q4 14 14 14 Z" fill="#6ee7b7" />
        <text x="50" y="48.95" textAnchor="middle" fontSize="17" fontWeight="800" fill="#2a2350" stroke="none" style={{ fontFamily: 'var(--font-mitr), sans-serif' }}>
          Good job!
        </text>
      </g>
    ),
  },
  {
    id: 'e-aa',
    label: 'Aa',
    cat: 'eng',
    el: (
      <g {...s}>
        <rect x="10" y="12" width="80" height="80" rx="18" fill="#ff8fab" />
        <rect x="10" y="12" width="80" height="72" rx="18" fill="#ffffff55" stroke="none" />
        <text x="50" y="66.56" textAnchor="middle" fontSize="46" fontWeight="800" fill="#2a2350" stroke="none" style={{ fontFamily: 'var(--font-mitr), sans-serif' }}>
          Aa
        </text>
      </g>
    ),
  },
  {
    id: 'e-abc',
    label: 'abc',
    cat: 'eng',
    el: (
      <g {...s}>
        <rect x="10" y="12" width="80" height="80" rx="18" fill="#7cc6ff" />
        <rect x="10" y="12" width="80" height="72" rx="18" fill="#ffffff55" stroke="none" />
        <text x="50" y="63.68" textAnchor="middle" fontSize="38" fontWeight="800" fill="#2a2350" stroke="none" style={{ fontFamily: 'var(--font-mitr), sans-serif' }}>
          abc
        </text>
      </g>
    ),
  },
  {
    id: 'e-dict',
    label: 'Dictionary',
    cat: 'eng',
    el: (
      <g {...s}>
        <path d="M20 10 H76 Q84 10 84 18 V90 H28 Q20 90 20 82 Z" fill="#2a73d9" />
        <path d="M20 82 Q20 74 28 74 H84" fill="none" />
        <rect x="30" y="22" width="44" height="22" rx="4" fill="#fff" />
        <text x="52" y="38" textAnchor="middle" fontSize="15" fontWeight="800" fill="#2a2350" stroke="none" style={{ fontFamily: 'var(--font-mitr), sans-serif' }}>
          A-Z
        </text>
      </g>
    ),
  },
  {
    id: 'e-qa',
    label: 'Q & A',
    cat: 'eng',
    el: (
      <g {...s}>
        <circle cx="34" cy="40" r="26" fill="#c4b5fd" />
        <circle cx="66" cy="62" r="26" fill="#ffd166" />
        <text x="34" y="50" textAnchor="middle" fontSize="28" fontWeight="800" fill="#2a2350" stroke="none" style={{ fontFamily: 'var(--font-mitr), sans-serif' }}>
          Q
        </text>
        <text x="66" y="72" textAnchor="middle" fontSize="28" fontWeight="800" fill="#2a2350" stroke="none" style={{ fontFamily: 'var(--font-mitr), sans-serif' }}>
          A
        </text>
      </g>
    ),
  },

  /* ---------------- ภาษาไทย ---------------- */
  {
    id: 't-kokai',
    label: 'ก ไก่',
    cat: 'thai',
    el: (
      <g {...s}>
        <rect x="10" y="12" width="80" height="80" rx="18" fill="#ffd166" />
        <rect x="10" y="12" width="80" height="72" rx="18" fill="#ffffff55" stroke="none" />
        <text x="50" y="71.6" textAnchor="middle" fontSize="60" fontWeight="800" fill="#2a2350" stroke="none" style={{ fontFamily: 'var(--font-mitr), sans-serif' }}>
          ก
        </text>
      </g>
    ),
  },
  {
    id: 't-kokho',
    label: 'กขค',
    cat: 'thai',
    el: (
      <g {...s}>
        <rect x="10" y="12" width="80" height="80" rx="18" fill="#7cc6ff" />
        <rect x="10" y="12" width="80" height="72" rx="18" fill="#ffffff55" stroke="none" />
        <text x="50" y="62.96" textAnchor="middle" fontSize="36" fontWeight="800" fill="#2a2350" stroke="none" style={{ fontFamily: 'var(--font-mitr), sans-serif' }}>
          กขค
        </text>
      </g>
    ),
  },
  {
    id: 't-num',
    label: 'เลขไทย',
    cat: 'thai',
    el: (
      <g {...s}>
        <rect x="10" y="12" width="80" height="80" rx="18" fill="#6ee7b7" />
        <rect x="10" y="12" width="80" height="72" rx="18" fill="#ffffff55" stroke="none" />
        <text x="50" y="62.24" textAnchor="middle" fontSize="34" fontWeight="800" fill="#2a2350" stroke="none" style={{ fontFamily: 'var(--font-mitr), sans-serif' }}>
          ๑๒๓
        </text>
      </g>
    ),
  },
  {
    id: 't-vowel',
    label: 'สระ',
    cat: 'thai',
    el: (
      <g {...s}>
        <rect x="10" y="12" width="80" height="80" rx="18" fill="#ff8fab" />
        <rect x="10" y="12" width="80" height="72" rx="18" fill="#ffffff55" stroke="none" />
        <text x="50" y="62.96" textAnchor="middle" fontSize="36" fontWeight="800" fill="#2a2350" stroke="none" style={{ fontFamily: 'var(--font-mitr), sans-serif' }}>
          สระ
        </text>
      </g>
    ),
  },
  {
    id: 't-hello',
    label: 'สวัสดี',
    cat: 'thai',
    el: (
      <g {...s}>
        <path d="M14 14 H86 Q96 14 96 24 V62 Q96 72 86 72 H44 L26 90 L30 72 H14 Q4 72 4 62 V24 Q4 14 14 14 Z" fill="#ffd166" />
        <text x="50" y="51.4" textAnchor="middle" fontSize="24" fontWeight="800" fill="#2a2350" stroke="none" style={{ fontFamily: 'var(--font-mitr), sans-serif' }}>
          สวัสดี
        </text>
      </g>
    ),
  },
  {
    id: 't-thanks',
    label: 'ขอบคุณ',
    cat: 'thai',
    el: (
      <g {...s}>
        <path d="M14 14 H86 Q96 14 96 24 V62 Q96 72 86 72 H44 L26 90 L30 72 H14 Q4 72 4 62 V24 Q4 14 14 14 Z" fill="#c4b5fd" />
        <text x="50" y="50.7" textAnchor="middle" fontSize="22" fontWeight="800" fill="#2a2350" stroke="none" style={{ fontFamily: 'var(--font-mitr), sans-serif' }}>
          ขอบคุณ
        </text>
      </g>
    ),
  },
  {
    id: 't-book',
    label: 'หนังสือภาษาไทย',
    cat: 'thai',
    el: (
      <g {...s}>
        <path d="M20 10 H76 Q84 10 84 18 V90 H28 Q20 90 20 82 Z" fill="#e8456b" />
        <path d="M20 82 Q20 74 28 74 H84" fill="none" />
        <rect x="30" y="22" width="44" height="26" rx="4" fill="#fff" />
        <text x="52" y="41" textAnchor="middle" fontSize="15" fontWeight="700" fill="#2a2350" stroke="none" style={{ fontFamily: 'var(--font-mitr), sans-serif' }}>
          ภาษาไทย
        </text>
      </g>
    ),
  },

  /* ---------------- ตราคำชม ---------------- */
  { id: 'st-great', label: 'เก่งมาก', cat: 'stamp', el: <Stamp text="เก่งมาก" color="#e8456b" /> },
  { id: 'st-good', label: 'ดีมาก', cat: 'stamp', el: <Stamp text="ดีมาก" color="#2f9e6e" size={22} /> },
  { id: 'st-excellent', label: 'ยอดเยี่ยม', cat: 'stamp', el: <Stamp text="ยอดเยี่ยม" color="#7c5cf0" size={16} /> },
  { id: 'st-try', label: 'สู้ๆ นะ', cat: 'stamp', el: <Stamp text="สู้ๆ นะ" color="#e07a12" /> },
  { id: 'st-neat', label: 'เรียบร้อย', cat: 'stamp', el: <Stamp text="เรียบร้อย" color="#2a73d9" size={16} /> },
  { id: 'st-done', label: 'ส่งแล้ว', cat: 'stamp', el: <Stamp text="ส่งแล้ว" color="#475569" /> },
];

function star(n: number, inner: number) {
  return Array.from({ length: n * 2 }, (_, i) => {
    const r = i % 2 ? inner : 50;
    const a = ((-90 + (180 / n) * i) * Math.PI) / 180;
    return `${(50 + r * Math.cos(a)).toFixed(1)},${(50 + r * Math.sin(a)).toFixed(1)}`;
  });
}

const byId = new Map(STICKERS.map((x) => [x.id, x]));
export const stickerById = (id: string) => byId.get(id);

export function StickerArt({ id, className }: { id: string; className?: string }) {
  const d = byId.get(id);
  return (
    <svg viewBox="0 0 100 100" className={className} preserveAspectRatio="xMidYMid meet" aria-hidden="true" style={{ overflow: 'visible' }}>
      {d ? d.el : <rect x="10" y="10" width="80" height="80" rx="12" fill="#eee" stroke="#ccc" strokeWidth="4" strokeDasharray="8 6" />}
    </svg>
  );
}
