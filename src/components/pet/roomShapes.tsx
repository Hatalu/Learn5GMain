import React from 'react';
import { stickerById } from '@/components/studio/stickers';

/** ของแต่งห้องวาดจากรูปทรง + สี (a = สีอ่อน, b = สีเข้ม) */
const O = '#2a2350';
const st = { stroke: O, strokeWidth: 4, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
const R = (x: number, y: number, w: number, h: number, fill: string, r = 0) => <rect x={x} y={y} width={w} height={h} rx={r} fill={fill} {...st} />;
const P = (d: string, fill = 'none') => <path d={d} fill={fill} {...st} />;
const C = (x: number, y: number, r: number, fill: string) => <circle cx={x} cy={y} r={r} fill={fill} {...st} />;
const E = (x: number, y: number, rx: number, ry: number, fill: string) => <ellipse cx={x} cy={y} rx={rx} ry={ry} fill={fill} {...st} />;
const WOOD = '#c98a52';
const GLASS = '#cdeefc';
const starD = (x: number, y: number, r: number) => {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const t = -Math.PI / 2 + (i * Math.PI) / 5;
    const q = i % 2 ? r * 0.5 : r;
    d += `${i ? 'L' : 'M'}${(x + Math.cos(t) * q).toFixed(1)} ${(y + Math.sin(t) * q).toFixed(1)} `;
  }
  return d + 'Z';
};
const water = <path d="M26 52 Q60 42 94 52 T162 52 T230 52 T262 52 V62 H26 Z" fill="#8fe0ff" />;
const foam = <g fill="#fff" stroke="#bfe6f7" strokeWidth="2"><circle cx="70" cy="44" r="13" /><circle cx="92" cy="36" r="16" /><circle cx="196" cy="42" r="14" /><circle cx="216" cy="46" r="10" /></g>;

type Shape = (a: string, b: string) => { vb: string; el: React.ReactNode };

export const SHAPES: Record<string, Shape> = {
  /* อ่างอาบน้ำ 276x128 */
  'bt-round': (a, b) => ({ vb: '0 0 276 128', el: <g>{water}{foam}{P('M12 52 H264 Q262 112 200 114 H76 Q14 112 12 52 Z', a)}{R(4, 44, 268, 14, b, 7)}{R(60, 112, 20, 14, b, 4)}{R(196, 112, 20, 14, b, 4)}</g> }),
  'bt-claw': (a, b) => ({ vb: '0 0 276 128', el: <g>{water}{foam}{P('M10 52 H266 Q270 104 214 110 H62 Q6 104 10 52 Z', a)}{R(2, 44, 272, 12, '#fff', 6)}{P('M66 110 Q54 118 48 126 H74 L80 110 Z', b)}{P('M210 110 Q222 118 228 126 H202 L196 110 Z', b)}{P('M250 44 V22 Q250 10 234 12', 'none')}{C(232, 14, 5, b)}</g> }),
  'bt-square': (a, b) => ({ vb: '0 0 276 128', el: <g>{water}{foam}{R(10, 52, 256, 70, a, 10)}{R(2, 42, 272, 14, b, 5)}{P('M30 74 H246 M30 98 H246', 'none')}</g> }),
  'bt-wood': (a, b) => ({ vb: '0 0 276 128', el: <g>{water}{foam}{P('M18 50 H258 L244 122 H32 Z', WOOD)}{P('M60 50 L66 122 M104 50 L108 122 M148 50 L148 122 M192 50 L188 122 M232 50 L222 122', 'none')}{P('M16 70 H260 M26 102 H250', 'none')}<path d="M16 70 H260 M26 102 H250" stroke={b} strokeWidth="7" /></g> }),

  /* อ่างล้างหน้า 84x140 */
  'bs-ped': (a, b) => ({ vb: '0 0 84 140', el: <g>{P('M32 66 H52 L58 136 H26 Z', a)}{P('M4 34 H80 Q78 70 42 72 Q6 70 4 34 Z', a)}{R(0, 28, 84, 10, b, 5)}{P('M42 28 V10 H56 V18')}</g> }),
  'bs-bowl': (a, b) => ({ vb: '0 0 84 140', el: <g>{R(6, 64, 72, 70, WOOD, 6)}{P('M6 88 H78')}{C(42, 76, 3, O)}{P('M12 36 H72 Q70 64 42 64 Q14 64 12 36 Z', a)}{R(8, 30, 68, 8, b, 4)}{P('M42 30 V12 H56 V20')}</g> }),
  'bs-cab': (a, b) => ({ vb: '0 0 84 140', el: <g>{R(4, 42, 76, 94, a, 6)}{P('M42 58 V136')}{C(34, 96, 3.5, O)}{C(50, 96, 3.5, O)}{R(0, 32, 84, 16, b, 5)}{P('M42 32 V12 H56 V20')}</g> }),

  /* กระจก 80x110 */
  'bm-round': (a, b) => ({ vb: '0 0 80 110', el: <g>{C(40, 54, 38, b)}{C(40, 54, 29, GLASS)}<path d="M26 42 L42 30 M30 58 L54 38" stroke="#fff" strokeWidth="5" strokeLinecap="round" />{C(40, 92, 0, a)}</g> }),
  'bm-oval': (a, b) => ({ vb: '0 0 80 110', el: <g>{E(40, 55, 36, 52, b)}{E(40, 55, 27, 42, GLASS)}<path d="M28 42 L44 26 M30 62 L52 38" stroke="#fff" strokeWidth="5" strokeLinecap="round" />{C(40, 6, 4, a)}</g> }),
  'bm-arch': (a, b) => ({ vb: '0 0 80 110', el: <g>{P('M4 106 V40 Q4 4 40 4 Q76 4 76 40 V106 Z', b)}{P('M14 96 V42 Q14 14 40 14 Q66 14 66 42 V96 Z', GLASS)}<path d="M26 50 L44 30 M28 72 L54 44" stroke="#fff" strokeWidth="5" strokeLinecap="round" />{R(20, 96, 40, 6, a, 3)}</g> }),
  'bm-star': (a, b) => ({ vb: '0 0 80 110', el: <g>{P(starD(40, 56, 48), b)}{P(starD(40, 56, 32), GLASS)}<path d="M32 50 L46 40" stroke="#fff" strokeWidth="5" strokeLinecap="round" />{C(40, 56, 0, a)}</g> }),

  /* ผ้าเช็ดตัว 90x110 */
  'bo-bar': (a, b) => ({ vb: '0 0 90 110', el: <g>{P('M6 16 H84', 'none')}{C(6, 16, 5, '#d7dcea')}{C(84, 16, 5, '#d7dcea')}{R(18, 14, 54, 86, a, 6)}<path d="M22 72 H68 M22 84 H68" stroke={b} strokeWidth="6" /></g> }),
  'bo-ring': (a, b) => ({ vb: '0 0 90 110', el: <g>{C(45, 26, 20, 'none')}{C(45, 6, 4, '#d7dcea')}{P('M26 36 H64 L74 104 H16 Z', a)}<path d="M22 82 H68 M20 94 H70" stroke={b} strokeWidth="5" /></g> }),
  'bo-hook': (a, b) => ({ vb: '0 0 90 110', el: <g>{R(4, 8, 82, 12, WOOD, 4)}{C(22, 14, 3.5, O)}{C(68, 14, 3.5, O)}{P('M10 20 H42 V96 Q26 104 10 96 Z', a)}{P('M50 20 H80 V70 Q64 78 50 70 Z', b)}</g> }),

  /* พรม 250x100 */
  oval: (a, b) => ({ vb: '0 0 250 100', el: <g>{E(125, 50, 121, 46, a)}<ellipse cx="125" cy="50" rx="86" ry="30" fill="none" stroke={b} strokeWidth="6" strokeDasharray="10 8" /></g> }),
  rect: (a, b) => ({ vb: '0 0 250 100', el: <g>{R(6, 10, 238, 80, a, 10)}<rect x="22" y="24" width="206" height="52" rx="6" fill="none" stroke={b} strokeWidth="6" /><path d="M6 24 H-4 M6 40 H-4 M6 60 H-4 M6 76 H-4 M244 24 H254 M244 40 H254 M244 60 H254 M244 76 H254" stroke={O} strokeWidth="3" /></g> }),
  flower: (a, b) => ({ vb: '0 0 250 100', el: <g>{E(125, 50, 121, 46, a)}{[[62, 48], [125, 34], [188, 48], [96, 72], [156, 72]].map(([x, y], i) => <g key={i} fill={b}><circle cx={x - 7} cy={y} r="6" /><circle cx={x + 7} cy={y} r="6" /><circle cx={x} cy={y - 5} r="6" /><circle cx={x} cy={y + 5} r="6" /><circle cx={x} cy={y} r="4" fill="#fff" /></g>)}</g> }),
  cloud: (a, b) => ({ vb: '0 0 250 100', el: <g>{P('M34 90 Q2 88 8 60 Q0 34 34 34 Q44 8 84 16 Q116 -4 150 14 Q200 4 216 34 Q250 40 242 64 Q248 90 214 90 Z', a)}<path d="M60 62 Q125 44 190 62" fill="none" stroke={b} strokeWidth="6" strokeLinecap="round" /></g> }),

  /* เตียง 276x160 */
  'nb-classic': (a, b) => ({ vb: '0 0 276 160', el: <g>{R(4, 20, 30, 134, WOOD, 8)}{R(242, 56, 30, 98, WOOD, 8)}{R(14, 92, 248, 50, '#fff')}{R(40, 66, 66, 36, '#fff', 14)}{P('M100 86 H262 V136 H100 Q88 110 100 86 Z', a)}<path d="M126 90 V136 M170 90 V136 M216 90 V136" stroke={b} strokeWidth="6" /></g> }),
  'nb-round': (a, b) => ({ vb: '0 0 276 160', el: <g>{P('M14 150 Q-10 70 60 34 H216 Q286 70 262 150 Z', WOOD)}{E(138, 112, 118, 36, '#fff')}{P('M92 110 Q138 80 248 104 Q250 138 138 146 Q78 138 92 110 Z', a)}{E(62, 92, 30, 17, b)}</g> }),
  'nb-canopy': (a, b) => ({ vb: '0 0 276 160', el: <g>{R(6, 0, 10, 154, WOOD, 4)}{R(260, 0, 10, 154, WOOD, 4)}{P('M0 6 H276 Q250 40 214 16 Q180 44 138 16 Q96 44 62 16 Q26 40 0 6 Z', b)}{R(14, 94, 248, 48, '#fff')}{R(36, 70, 62, 34, '#fff', 14)}{P('M94 88 H262 V136 H94 Q84 110 94 88 Z', a)}</g> }),
  'nb-car': (a, b) => ({ vb: '0 0 276 160', el: <g>{P('M6 132 V84 Q8 58 46 58 H84 Q104 26 150 26 Q196 26 208 62 H240 Q270 66 270 96 V132 Z', b)}{P('M92 62 Q110 36 148 36 Q180 36 192 62 Z', GLASS)}{R(28, 78, 216, 42, a, 12)}{R(36, 70, 56, 28, '#fff', 12)}{C(60, 134, 20, O)}{C(216, 134, 20, O)}{C(60, 134, 8, '#ffc53a')}{C(216, 134, 8, '#ffc53a')}</g> }),

  /* โต๊ะข้างเตียง 62x88 */
  'ns-plain': (a, b) => ({ vb: '0 0 62 88', el: <g>{R(6, 28, 50, 52, a, 5)}{P('M6 54 H56')}{C(31, 41, 3, O)}{C(31, 67, 3, O)}{R(2, 22, 58, 9, b, 4)}</g> }),
  'ns-lamp': (a, b) => ({ vb: '0 0 62 88', el: <g>{R(6, 44, 50, 40, a, 5)}{C(31, 62, 3, O)}{R(2, 38, 58, 9, b, 4)}{P('M31 38 V22')}{P('M14 24 L22 2 H40 L48 24 Z', '#fff3b0')}</g> }),
  'ns-books': (a, b) => ({ vb: '0 0 62 88', el: <g>{R(6, 44, 50, 40, a, 5)}{C(31, 62, 3, O)}{R(2, 38, 58, 9, b, 4)}{R(10, 26, 40, 11, '#ef5d5d', 2)}{R(14, 14, 34, 11, '#5ab0ff', 2)}{R(10, 3, 30, 10, '#ffd84a', 2)}</g> }),

  /* หน้าต่างผ้าม่าน 170x136 */
  curtain: (a, b) => ({ vb: '0 0 170 136', el: <g>{R(26, 12, 118, 112, '#27306f', 8)}<circle cx="110" cy="44" r="14" fill="#ffe9a8" /><circle cx="52" cy="40" r="2.4" fill="#fff" /><circle cx="76" cy="84" r="2" fill="#fff" /><circle cx="120" cy="96" r="2.2" fill="#fff" />{P('M85 12 V124 M26 68 H144')}{P('M4 6 Q46 70 28 130 H6 Z', a)}{P('M166 6 Q124 70 142 130 H164 Z', a)}<path d="M14 40 Q20 84 14 128 M156 40 Q150 84 156 128" stroke={b} strokeWidth="5" fill="none" />{P('M0 6 H170')}</g> }),

  /* โคมไฟห้อยเพดาน 84x84 */
  ball: (a, b) => ({ vb: '0 0 84 84', el: <g>{P('M42 0 V26')}{C(42, 50, 26, a)}<circle cx="33" cy="41" r="6" fill="#fff" />{R(32, 20, 20, 8, b, 3)}</g> }),
  bell: (a, b) => ({ vb: '0 0 84 84', el: <g>{P('M42 0 V20')}{P('M10 66 Q14 22 42 20 Q70 22 74 66 Z', a)}{C(42, 70, 8, '#fff3b0')}{R(6, 62, 72, 8, b, 4)}</g> }),
  star: (a, b) => ({ vb: '0 0 84 84', el: <g>{P('M42 0 V14')}{P(starD(42, 48, 36), a)}<path d={starD(42, 48, 14)} fill={b} /></g> }),

  /* โต๊ะกินข้าว 276x88 */
  'dt-rect': (a, b) => ({ vb: '0 0 276 88', el: <g>{R(22, 24, 18, 62, WOOD, 4)}{R(236, 24, 18, 62, WOOD, 4)}{R(4, 8, 268, 20, a, 6)}<path d="M20 28 Q60 44 100 28 Q138 44 176 28 Q216 44 256 28" fill="none" stroke={b} strokeWidth="5" /></g> }),
  'dt-round': (a, b) => ({ vb: '0 0 276 88', el: <g>{R(124, 30, 28, 46, WOOD, 4)}{E(138, 80, 56, 7, WOOD)}{E(138, 22, 134, 18, a)}<ellipse cx="138" cy="20" rx="96" ry="9" fill="none" stroke={b} strokeWidth="4" /></g> }),
  'dt-low': (a, b) => ({ vb: '0 0 276 88', el: <g>{R(40, 50, 14, 34, WOOD, 3)}{R(222, 50, 14, 34, WOOD, 3)}{R(14, 34, 248, 18, a, 6)}{R(6, 66, 54, 18, b, 8)}{R(216, 66, 54, 18, b, 8)}</g> }),
  'dt-pic': (a, b) => ({ vb: '0 0 276 88', el: <g>{P('M40 28 L16 84 M236 28 L260 84 M60 28 L84 84 M216 28 L192 84', 'none')}{R(4, 8, 268, 22, '#fff', 6)}{[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => <rect key={i} x={6 + i * 29.2} y={i % 2 ? 19 : 10} width="29" height="9" fill={i % 2 ? a : b} />)}</g> }),

  /* ตู้เย็น 86x230 */
  'dr-classic': (a, b) => ({ vb: '0 0 86 230', el: <g>{R(4, 4, 78, 222, a, 12)}{P('M4 76 H82')}{R(14, 30, 7, 30, b, 3)}{R(14, 90, 7, 44, b, 3)}{R(50, 20, 22, 18, '#ffd84a', 3)}{C(64, 110, 7, '#ff7a9c')}</g> }),
  'dr-retro': (a, b) => ({ vb: '0 0 86 230', el: <g>{P('M4 216 V36 Q4 4 43 4 Q82 4 82 36 V216 Z', a)}{P('M4 84 H82')}{R(66, 34, 8, 34, '#d7dcea', 4)}{R(66, 98, 8, 46, '#d7dcea', 4)}{R(16, 216, 12, 12, b, 3)}{R(58, 216, 12, 12, b, 3)}<path d="M4 150 H82" stroke={b} strokeWidth="8" /></g> }),
  'dr-double': (a, b) => ({ vb: '0 0 86 230', el: <g>{R(4, 4, 78, 222, a, 10)}{P('M43 4 V226')}{R(32, 60, 6, 56, b, 3)}{R(48, 60, 6, 56, b, 3)}{R(12, 18, 22, 30, GLASS, 4)}{R(52, 150, 20, 14, '#ffd84a', 3)}</g> }),

  /* เตา 88x165 */
  'ds-oven': (a, b) => ({ vb: '0 0 88 165', el: <g>{P('M26 28 H62 V18 H26 Z', '#8a8fa3')}{R(4, 40, 80, 120, a, 8)}{R(14, 76, 60, 60, GLASS, 6)}{R(18, 64, 52, 5, b, 2)}{C(20, 52, 5, b)}{C(44, 52, 5, b)}{C(68, 52, 5, b)}{R(0, 30, 88, 10, O, 4)}</g> }),
  'ds-grill': (a, b) => ({ vb: '0 0 88 165', el: <g>{R(4, 52, 80, 108, a, 8)}{R(0, 42, 88, 12, O, 4)}{P('M12 42 V14 H76 V42', 'none')}<path d="M12 22 H76 M12 32 H76" stroke="#8a8fa3" strokeWidth="4" />{R(16, 72, 56, 30, b, 6)}{C(28, 124, 6, '#ffd84a')}{C(60, 124, 6, '#ffd84a')}</g> }),
  'ds-pot': (a, b) => ({ vb: '0 0 88 165', el: <g>{R(4, 66, 80, 94, a, 8)}{R(0, 56, 88, 12, O, 4)}{P('M18 56 V24 H70 V56 Z', b)}{R(12, 16, 64, 10, '#8a8fa3', 4)}{C(44, 11, 5, '#8a8fa3')}{P('M34 8 Q30 0 36 -6 M54 8 Q50 0 56 -6', 'none')}{R(16, 88, 56, 46, GLASS, 6)}</g> }),
};

/** ชั้นวางมีสติกเกอร์ 3 ชิ้น: art[2] = "id|id|id" */
export function ShelfArt({ wood, list }: { wood: string; list: string }) {
  return (
    <g>
      {list.split('|').map((id, i) => (
        <svg key={i} x={18 + i * 80} y={0} width="58" height="58" viewBox="0 0 100 100" style={{ overflow: 'visible' }}>{stickerById(id)?.el}</svg>
      ))}
      {R(2, 56, 254, 12, wood, 4)}
    </g>
  );
}
export const SHELF_VB = '0 0 258 70';

/** ลายผนัง/พื้น คืน [ขนาดลาย, ลาย] */
export function tileOf(kind: string, fg: string): [number, React.ReactNode] {
  switch (kind) {
    case 'tile': return [60, <path key="t" d="M0 0 H60 M0 0 V60" stroke={fg} strokeWidth="4" fill="none" />];
    case 'check': return [80, <g key="t" fill={fg}><rect width="40" height="40" /><rect x="40" y="40" width="40" height="40" /></g>];
    case 'scale': return [50, <path key="t" d="M0 25 A25 25 0 0 1 50 25 M-25 50 A25 25 0 0 1 25 50 M25 50 A25 25 0 0 1 75 50" stroke={fg} strokeWidth="4" fill="none" />];
    case 'wave': return [80, <path key="t" d="M0 20 Q20 2 40 20 T80 20 M0 60 Q20 42 40 60 T80 60" stroke={fg} strokeWidth="5" fill="none" />];
    case 'dots': return [44, <g key="t" fill={fg}><circle cx="11" cy="11" r="6" /><circle cx="33" cy="33" r="6" /></g>];
    case 'diag': return [60, <path key="t" d="M30 0 L60 30 L30 60 L0 30 Z" stroke={fg} strokeWidth="4" fill="none" />];
    case 'stripe': return [60, <rect key="t" width="30" height="60" fill={fg} />];
    case 'star': return [80, <g key="t" fill={fg}><path d={starD(20, 22, 7)} /><path d={starD(60, 60, 5)} /></g>];
    case 'heart': return [64, <g key="t" fill={fg}><path d="M16 26 C2 14 10 4 16 12 C22 4 30 14 16 26 Z" /><path d="M48 58 C34 46 42 36 48 44 C54 36 62 46 48 58 Z" /></g>];
    case 'brick': return [80, <g key="t" fill="none" stroke={fg} strokeWidth="3"><rect x="1" y="1" width="78" height="18" /><rect x="-39" y="21" width="78" height="18" /><rect x="41" y="21" width="78" height="18" /></g>];
    case 'plank': return [120, <path key="t" d="M0 30 H120 M0 60 H120 M0 90 H120 M40 0 V30 M100 30 V60 M20 60 V90 M80 90 V120" stroke={fg} strokeWidth="3" fill="none" />];
    default: return [60, null];
  }
}
export const SURFACE_KINDS = ['tile', 'check', 'scale', 'wave', 'dots', 'diag', 'stripe', 'star', 'heart', 'brick', 'plank'];
