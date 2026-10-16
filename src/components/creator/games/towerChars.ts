/**
 * ตัวละครป้องกันฐาน (Tower Defense) 12 ตัว วาดเป็น SVG ล้วน (ห้ามอิโมจิ)
 * ภาพเดียวกันใช้ทั้งในกระเป๋า (img) และบนแผนที่ (canvas drawImage)
 */

export type CharKind = 'owl' | 'squirrel' | 'bunny' | 'bee' | 'penguin' | 'dragon' | 'cat' | 'panda' | 'fox' | 'octopus' | 'unicorn' | 'phoenix';
export type Rarity = 'common' | 'rare' | 'epic';

export interface CharDef {
  kind: CharKind;
  name: string;
  rarity: Rarity;
  /** ความสามารถ (สั้นๆ สำหรับเด็ก) */
  desc: string;
  range: number;
  cd: number;
  dmg: number;
  speed: number;
  splash?: number;
  /** ทำให้ช้าลง: ตัวคูณความเร็ว + วินาที */
  slow?: [number, number];
  /** ติดไฟ: วินาที (ความแรง 40% ต่อวินาที) */
  burn?: number;
  /** กระสุนเด้งต่อไปอีกกี่ตัว */
  chain?: number;
  /** กระแทกถอยหลัง (ระยะ) */
  knock?: number;
  /** ยิงพร้อมกันกี่เป้า */
  multi?: number;
  /** ได้เหรียญเพิ่มเมื่อปราบ */
  bounty?: number;
  /** ลักษณะกระสุน */
  shot: { c: string; c2: string; r: number; kind: 'orb' | 'star' | 'stick' | 'tri' };
  color: string;
}

export const RARITY: Record<Rarity, { name: string; color: string; dark: string; odds: number }> = {
  common: { name: 'ธรรมดา', color: '#8fd3ff', dark: '#3f9ad6', odds: 0.6 },
  rare: { name: 'หายาก', color: '#c4a2ff', dark: '#8a5ae0', odds: 0.32 },
  epic: { name: 'สุดยอด', color: '#ffd84a', dark: '#e0a210', odds: 0.08 },
};

export const CHARS: CharDef[] = [
  { kind: 'owl', name: 'นกฮูก', rarity: 'common', desc: 'ยิงไกล แรง', range: 175, cd: 1.05, dmg: 3.2, speed: 470, shot: { c: '#e3d4ff', c2: '#a77cf2', r: 6, kind: 'stick' }, color: '#a77cf2' },
  { kind: 'squirrel', name: 'กระรอก', rarity: 'common', desc: 'ปาลูกโอ๊กรัวๆ', range: 118, cd: 0.36, dmg: 1, speed: 560, shot: { c: '#b07448', c2: '#7a4a24', r: 5, kind: 'orb' }, color: '#ffb35c' },
  { kind: 'bunny', name: 'กระต่าย', rarity: 'common', desc: 'แครอทระเบิด โดนเป็นวง', range: 115, cd: 1.25, dmg: 2.2, speed: 380, splash: 55, shot: { c: '#ff9a3d', c2: '#5cc46c', r: 7, kind: 'tri' }, color: '#ffb3cf' },
  { kind: 'bee', name: 'ผึ้งน้อย', rarity: 'common', desc: 'ยิงทีละ 2 ตัว', range: 135, cd: 0.55, dmg: 1.2, speed: 600, multi: 2, shot: { c: '#ffd84a', c2: '#2a2350', r: 4, kind: 'orb' }, color: '#ffd84a' },
  { kind: 'penguin', name: 'เพนกวิน', rarity: 'rare', desc: 'ก้อนหิมะ ทำให้ช้าลง', range: 135, cd: 0.95, dmg: 1.2, speed: 440, slow: [0.45, 1.8], shot: { c: '#ffffff', c2: '#7cc8ff', r: 7, kind: 'orb' }, color: '#5b6bb5' },
  { kind: 'dragon', name: 'มังกร', rarity: 'rare', desc: 'พ่นไฟ โดนเป็นวง + ติดไฟ', range: 125, cd: 1.35, dmg: 2.4, speed: 330, splash: 62, burn: 1.5, shot: { c: '#ff9a3d', c2: '#ffd84a', r: 8, kind: 'orb' }, color: '#7ddc86' },
  { kind: 'cat', name: 'แมวนินจา', rarity: 'rare', desc: 'ดาวกระจายเด้ง 2 ตัว', range: 150, cd: 0.75, dmg: 2, speed: 560, chain: 2, shot: { c: '#e7e1f6', c2: '#5b5f78', r: 7, kind: 'star' }, color: '#8c8fb0' },
  { kind: 'panda', name: 'แพนด้า', rarity: 'rare', desc: 'ทุบแรง กระเด็นถอยหลัง', range: 105, cd: 1.6, dmg: 5.5, speed: 420, knock: 38, shot: { c: '#7ddc86', c2: '#3f9a4c', r: 7, kind: 'stick' }, color: '#f4f4f8' },
  { kind: 'fox', name: 'จิ้งจอก', rarity: 'rare', desc: 'เวทมนตร์ ปราบได้เหรียญ +3', range: 140, cd: 0.9, dmg: 2.2, speed: 520, bounty: 3, shot: { c: '#ff9ad5', c2: '#ffffff', r: 6, kind: 'orb' }, color: '#ff8a3d' },
  { kind: 'octopus', name: 'ปลาหมึก', rarity: 'epic', desc: 'พ่นหมึกเป็นวง ทำให้ช้า', range: 140, cd: 1.3, dmg: 1.8, speed: 360, splash: 78, slow: [0.55, 1.6], shot: { c: '#5b3f8a', c2: '#ff7fc8', r: 8, kind: 'orb' }, color: '#ff7fc8' },
  { kind: 'unicorn', name: 'ยูนิคอร์น', rarity: 'epic', desc: 'สายรุ้งเด้ง 4 ตัว', range: 165, cd: 1.0, dmg: 3, speed: 620, chain: 4, shot: { c: '#ffffff', c2: '#ff8fc4', r: 7, kind: 'star' }, color: '#f6f0ff' },
  { kind: 'phoenix', name: 'ฟีนิกซ์', rarity: 'epic', desc: 'ลูกไฟยักษ์ ไกลและแรงสุด', range: 185, cd: 0.85, dmg: 4.4, speed: 480, splash: 55, burn: 2, shot: { c: '#ff6b4a', c2: '#ffd84a', r: 9, kind: 'orb' }, color: '#ff6b4a' },
];

export const charDef = (k: CharKind) => CHARS.find((c) => c.kind === k)!;
export const STARTERS: CharKind[] = ['owl', 'squirrel', 'dragon'];

/** สุ่มตัวละครตามโอกาสของแต่ละระดับ (minRare = การันตีหายากขึ้นไป) */
export function rollChar(minRare = false): CharKind {
  let r = Math.random();
  let rarity: Rarity = r < RARITY.epic.odds ? 'epic' : r < RARITY.epic.odds + RARITY.rare.odds ? 'rare' : 'common';
  if (minRare && rarity === 'common') rarity = Math.random() < 0.2 ? 'epic' : 'rare';
  const pool = CHARS.filter((c) => c.rarity === rarity);
  r = Math.random();
  return pool[Math.floor(r * pool.length)].kind;
}

/* ------------------------------ ภาพ SVG ------------------------------ */

const INK = '#2a2350';
const SW = 'stroke="#2a2350" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"';

const body = (fill: string, rx = 30, ry = 28, cy = 60) => `<ellipse cx="50" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" ${SW}/>`;
const shine = (x = 37, y = 44) => `<ellipse cx="${x}" cy="${y}" rx="7" ry="4" fill="#fff" opacity=".6" transform="rotate(-30 ${x} ${y})"/>`;
const eyes = (y = 56, gap = 10, r = 4.6) =>
  [-1, 1]
    .map((s) => `<ellipse cx="${50 + s * gap}" cy="${y}" rx="${r}" ry="${r * 1.18}" fill="${INK}"/><circle cx="${50 + s * gap + r * 0.38}" cy="${y - r * 0.45}" r="${r * 0.42}" fill="#fff"/>`)
    .join('');
const blush = (y = 66, gap = 19) => `<ellipse cx="${50 - gap}" cy="${y}" rx="5.5" ry="3.2" fill="#ff7fae" opacity=".6"/><ellipse cx="${50 + gap}" cy="${y}" rx="5.5" ry="3.2" fill="#ff7fae" opacity=".6"/>`;
const smile = (y = 66) => `<path d="M45 ${y} Q50 ${y + 5} 55 ${y}" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>`;

const ART: Record<CharKind, string> = {
  owl:
    `<path d="M30 40 L24 16 L42 33 Z" fill="#7e52cf" ${SW}/><path d="M70 40 L76 16 L58 33 Z" fill="#7e52cf" ${SW}/>` +
    `<ellipse cx="22" cy="64" rx="8" ry="15" fill="#7e52cf" ${SW}/><ellipse cx="78" cy="64" rx="8" ry="15" fill="#7e52cf" ${SW}/>` +
    body('#a77cf2') +
    `<ellipse cx="50" cy="72" rx="17" ry="13" fill="#e3d4ff"/>` +
    `<circle cx="39" cy="54" r="10.5" fill="#fff8ec" stroke="${INK}" stroke-width="3"/><circle cx="61" cy="54" r="10.5" fill="#fff8ec" stroke="${INK}" stroke-width="3"/>` +
    eyes(54, 11, 4.4) +
    `<path d="M45 62 L55 62 L50 70 Z" fill="#ff9a3d" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>` +
    shine(36, 40),
  squirrel:
    `<path d="M66 82 C96 84 100 40 80 26 C66 16 56 30 66 40 C76 48 72 62 62 64 Z" fill="#e88a2e" ${SW}/>` +
    `<path d="M74 34 C82 38 84 50 80 58" stroke="#ffd29a" stroke-width="4" fill="none" stroke-linecap="round"/>` +
    `<circle cx="34" cy="35" r="8" fill="#e88a2e" ${SW}/><circle cx="62" cy="35" r="8" fill="#e88a2e" ${SW}/>` +
    body('#ffb35c', 27, 26, 61) +
    `<ellipse cx="48" cy="72" rx="15" ry="11" fill="#ffe2bf"/>` +
    eyes(56, 9) +
    blush(65, 17) +
    `<path d="M43 64 Q48 69 53 64" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>` +
    `<rect x="45" y="67" width="6" height="5" rx="1.5" fill="#fff" stroke="${INK}" stroke-width="2"/>` +
    shine(36, 46),
  bunny:
    `<ellipse cx="37" cy="22" rx="8.5" ry="21" fill="#fff4f8" ${SW}/><ellipse cx="63" cy="22" rx="8.5" ry="21" fill="#fff4f8" ${SW}/>` +
    `<ellipse cx="37" cy="24" rx="3.6" ry="14" fill="#ffb3cf"/><ellipse cx="63" cy="24" rx="3.6" ry="14" fill="#ffb3cf"/>` +
    body('#fff4f8') +
    eyes(57, 10) +
    blush(66) +
    `<ellipse cx="50" cy="64" rx="3.6" ry="2.6" fill="#ff7fae"/>` +
    smile(67) +
    `<path d="M74 82 L88 60 L80 86 Z" fill="#ff9a3d" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><path d="M86 62 L92 54 M86 62 L94 62" stroke="#5cc46c" stroke-width="3.5" stroke-linecap="round"/>` +
    shine(37, 46),
  bee:
    `<ellipse cx="32" cy="34" rx="13" ry="10" fill="#d9f1ff" opacity=".9" ${SW} transform="rotate(-25 32 34)"/><ellipse cx="68" cy="34" rx="13" ry="10" fill="#d9f1ff" opacity=".9" ${SW} transform="rotate(25 68 34)"/>` +
    `<path d="M42 36 L36 20 M58 36 L64 20" stroke="${INK}" stroke-width="3" stroke-linecap="round"/><circle cx="36" cy="19" r="4" fill="${INK}"/><circle cx="64" cy="19" r="4" fill="${INK}"/>` +
    `<clipPath id="bee-c"><ellipse cx="50" cy="60" rx="30" ry="28"/></clipPath>` +
    body('#ffd84a') +
    `<g clip-path="url(#bee-c)"><rect x="18" y="68" width="64" height="7" fill="${INK}"/><rect x="18" y="79" width="64" height="6" fill="${INK}"/></g>` +
    `<ellipse cx="50" cy="60" rx="30" ry="28" fill="none" ${SW}/>` +
    eyes(54, 10) +
    blush(62) +
    smile(62) +
    shine(37, 44),
  penguin:
    `<ellipse cx="22" cy="64" rx="7" ry="15" fill="#3b4a8a" ${SW} transform="rotate(15 22 64)"/><ellipse cx="78" cy="64" rx="7" ry="15" fill="#3b4a8a" ${SW} transform="rotate(-15 78 64)"/>` +
    body('#5b6bb5') +
    `<ellipse cx="50" cy="65" rx="21" ry="21" fill="#fff"/>` +
    eyes(55, 9) +
    blush(64, 15) +
    `<path d="M44 61 L56 61 L50 68 Z" fill="#ffb35c" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>` +
    `<path d="M26 77 Q50 88 74 77 L72 84 Q50 94 28 84 Z" fill="#ff6b7a" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>` +
    `<path d="M70 82 L74 94 L66 92 Z" fill="#ff6b7a" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>` +
    shine(36, 44),
  dragon:
    `<path d="M24 56 L4 36 L10 62 L22 66 Z" fill="#4fb55c" ${SW}/><path d="M76 56 L96 36 L90 62 L78 66 Z" fill="#4fb55c" ${SW}/>` +
    `<path d="M36 38 L32 18 L44 34 Z" fill="#fff8ec" ${SW}/><path d="M64 38 L68 18 L56 34 Z" fill="#fff8ec" ${SW}/>` +
    body('#7ddc86') +
    `<ellipse cx="50" cy="73" rx="16" ry="11" fill="#d9f7c9"/>` +
    `<path d="M46 32 L50 26 L54 32" fill="#ffcf3f" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>` +
    eyes(55, 10) +
    blush(64) +
    `<circle cx="46" cy="64" r="1.6" fill="${INK}"/><circle cx="54" cy="64" r="1.6" fill="${INK}"/>` +
    smile(68) +
    shine(37, 44),
  cat:
    `<path d="M26 44 L26 16 L46 34 Z" fill="#8c8fb0" ${SW}/><path d="M74 44 L74 16 L54 34 Z" fill="#8c8fb0" ${SW}/>` +
    `<path d="M30 38 L30 24 L40 33 Z" fill="#ffb3cf"/><path d="M70 38 L70 24 L60 33 Z" fill="#ffb3cf"/>` +
    body('#8c8fb0') +
    `<rect x="22" y="45" width="56" height="17" rx="8" fill="${INK}"/>` +
    `<ellipse cx="40" cy="53.5" rx="7" ry="5.5" fill="#fff"/><ellipse cx="60" cy="53.5" rx="7" ry="5.5" fill="#fff"/><circle cx="41" cy="54" r="3.2" fill="${INK}"/><circle cx="61" cy="54" r="3.2" fill="${INK}"/>` +
    `<rect x="22" y="36" width="56" height="7" rx="3" fill="#ff4d6a" stroke="${INK}" stroke-width="2.5"/>` +
    `<path d="M78 40 Q90 34 94 42 M78 40 Q88 46 92 52" stroke="#ff4d6a" stroke-width="4" fill="none" stroke-linecap="round"/>` +
    blush(68) +
    `<path d="M45 70 Q47.5 73 50 70 Q52.5 73 55 70" stroke="${INK}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`,
  panda:
    `<circle cx="28" cy="36" r="10" fill="${INK}"/><circle cx="72" cy="36" r="10" fill="${INK}"/>` +
    body('#f4f4f8') +
    `<ellipse cx="39" cy="56" rx="8" ry="10" fill="${INK}" transform="rotate(25 39 56)"/><ellipse cx="61" cy="56" rx="8" ry="10" fill="${INK}" transform="rotate(-25 61 56)"/>` +
    `<circle cx="40" cy="55" r="3.4" fill="#fff"/><circle cx="60" cy="55" r="3.4" fill="#fff"/><circle cx="41" cy="54" r="1.4" fill="${INK}"/><circle cx="61" cy="54" r="1.4" fill="${INK}"/>` +
    `<ellipse cx="50" cy="64" rx="4.6" ry="3.2" fill="${INK}"/>` +
    blush(68, 20) +
    smile(68) +
    `<rect x="72" y="58" width="9" height="30" rx="3" fill="#7ddc86" stroke="${INK}" stroke-width="3" transform="rotate(20 76 73)"/>` +
    shine(36, 44),
  fox:
    `<path d="M24 50 L18 14 L46 36 Z" fill="#ff8a3d" ${SW}/><path d="M76 50 L82 14 L54 36 Z" fill="#ff8a3d" ${SW}/>` +
    `<path d="M22 24 L19 14 L28 21 Z" fill="#fff"/><path d="M78 24 L81 14 L72 21 Z" fill="#fff"/>` +
    body('#ff8a3d') +
    `<path d="M24 62 Q36 58 50 72 Q64 58 76 62 Q72 86 50 88 Q28 86 24 62 Z" fill="#fff8ec"/>` +
    eyes(55, 11) +
    blush(64, 21) +
    `<ellipse cx="50" cy="69" rx="4" ry="3" fill="${INK}"/>` +
    `<path d="M50 72 L50 75 M46 76 Q50 79 54 76" stroke="${INK}" stroke-width="2.5" fill="none" stroke-linecap="round"/>` +
    `<path d="M70 18 L72 12 L74 18 L80 20 L74 22 L72 28 L70 22 L64 20 Z" fill="#ff9ad5" stroke="${INK}" stroke-width="1.8"/>`,
  octopus:
    `<path d="M24 66 Q16 84 26 90 Q32 80 34 74 M36 72 Q34 90 42 94 Q46 84 46 76 M54 76 Q54 86 58 94 Q66 90 64 72 M66 74 Q68 82 74 90 Q84 84 76 66" fill="#ff7fc8" ${SW}/>` +
    `<ellipse cx="50" cy="52" rx="29" ry="30" fill="#ff7fc8" ${SW}/>` +
    `<circle cx="34" cy="38" r="3.5" fill="#ffc2e4"/><circle cx="64" cy="34" r="4.5" fill="#ffc2e4"/><circle cx="68" cy="46" r="2.6" fill="#ffc2e4"/>` +
    eyes(55, 10) +
    blush(64) +
    `<ellipse cx="50" cy="67" rx="4" ry="3" fill="${INK}"/>` +
    shine(36, 36),
  unicorn:
    `<path d="M44 30 L50 2 L56 30 Z" fill="#ffd84a" ${SW}/><path d="M46 22 L54 18 M45 14 L53 10" stroke="#e0a210" stroke-width="2.5"/>` +
    `<path d="M30 40 L28 24 L40 34 Z" fill="#f6f0ff" ${SW}/><path d="M70 40 L72 24 L60 34 Z" fill="#f6f0ff" ${SW}/>` +
    `<path d="M74 38 Q92 48 84 72 Q80 60 72 58 Z" fill="#8fd3ff" ${SW}/><path d="M72 34 Q88 36 90 54 Q82 46 72 46 Z" fill="#ff8fc4" ${SW}/><path d="M64 32 Q80 26 86 40 Q76 36 68 40 Z" fill="#ffd84a" ${SW}/>` +
    body('#f6f0ff') +
    eyes(57, 10) +
    blush(66) +
    smile(67) +
    shine(36, 46),
  phoenix:
    `<path d="M40 34 Q34 12 44 4 Q44 18 50 26 Q52 10 60 6 Q58 22 60 34 Z" fill="#ffd84a" ${SW}/>` +
    `<path d="M24 52 Q4 44 2 24 Q14 34 22 34 Q14 22 18 12 Q26 30 34 40 Z" fill="#ff9a3d" ${SW}/><path d="M76 52 Q96 44 98 24 Q86 34 78 34 Q86 22 82 12 Q74 30 66 40 Z" fill="#ff9a3d" ${SW}/>` +
    body('#ff6b4a') +
    `<ellipse cx="50" cy="72" rx="16" ry="11" fill="#ffd84a"/>` +
    eyes(55, 10) +
    blush(63) +
    `<path d="M45 62 L55 62 L50 69 Z" fill="#ffd84a" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>` +
    shine(37, 44),
};

/** SVG ของตัวละคร (ขนาดภาพ 160px ให้คมบนจอความละเอียดสูง) */
export function charSvg(k: CharKind): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="160" height="160">${ART[k]}</svg>`;
}

const uriCache = new Map<CharKind, string>();
export function charUri(k: CharKind): string {
  let u = uriCache.get(k);
  if (!u) {
    u = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(charSvg(k))}`;
    uriCache.set(k, u);
  }
  return u;
}

const imgCache = new Map<CharKind, HTMLImageElement>();
/** ภาพสำหรับวาดบน canvas (คืน null ถ้ายังโหลดไม่เสร็จ) */
export function charImg(k: CharKind): HTMLImageElement | null {
  if (typeof Image === 'undefined') return null;
  let im = imgCache.get(k);
  if (!im) {
    im = new Image();
    im.src = charUri(k);
    imgCache.set(k, im);
  }
  return im.complete && im.naturalWidth > 0 ? im : null;
}
export function preloadChars() {
  CHARS.forEach((c) => charImg(c.kind));
}
