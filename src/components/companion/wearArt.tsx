import React from 'react';

/** ชุดของปุ๋ง วาดในกรอบเดียวกับ Buddy (200x220) เสื้อผ้าถูกตัดตามรูปตัวด้วย clipPath ใน Buddy */
const O = '#2a2350';
const s = { stroke: O, strokeWidth: 3.5, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
const P = (d: string, fill = 'none', w = 3.5) => <path d={d} fill={fill} stroke={O} strokeWidth={w} strokeLinejoin="round" strokeLinecap="round" />;
const C = (x: number, y: number, r: number, fill: string, w = 3.5) => <circle cx={x} cy={y} r={r} fill={fill} stroke={O} strokeWidth={w} />;
const D = (x: number, y: number, r: number, fill: string) => <circle cx={x} cy={y} r={r} fill={fill} />;
const starD = (x: number, y: number, r: number) => {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const q = i % 2 ? r * 0.45 : r;
    d += `${i ? 'L' : 'M'}${(x + Math.cos(a) * q).toFixed(1)} ${(y + Math.sin(a) * q).toFixed(1)} `;
  }
  return d + 'Z';
};
const Star = (x: number, y: number, r: number, fill = '#ffc53a') => P(starD(x, y, r), fill, 3);

/** เสื้อคอกลมเริ่มใต้ปาก */
const shirt = (fill: string, y = 158) => <path d={`M15 ${y} Q60 ${y - 2} 78 ${y} Q100 ${y + 14} 122 ${y} Q140 ${y - 2} 185 ${y} V215 H15 Z`} fill={fill} {...s} />;

/** ชิ้นบนหัว/หน้า */
export const TOP_ART: Record<string, React.ReactNode> = {
  cap: (
    <g>
      <path d="M54 62 Q100 8 146 62 Z" fill="#ffc53a" stroke="#f5a50f" strokeWidth="4" strokeLinejoin="round" />
      <path d="M54 62 Q60 74 112 70 Q150 66 150 62 Z" fill="#f5a50f" />
      <circle cx="100" cy="16" r="7" fill="#f53d9b" />
    </g>
  ),
  crown: (
    <g>
      <path d="M60 52 L64 18 L82 36 L100 10 L118 36 L136 18 L140 52 Z" fill="#ffc53a" stroke="#f5a50f" strokeWidth="4" strokeLinejoin="round" />
      <circle cx="64" cy="18" r="5" fill="#f53d9b" />
      <circle cx="100" cy="10" r="5.5" fill="#2fd196" />
      <circle cx="136" cy="18" r="5" fill="#2eb4f5" />
    </g>
  ),
  glasses: (
    <g fill="none" stroke="#2a2740" strokeWidth="5">
      <circle cx="76" cy="107" r="21" fill="#fff" fillOpacity="0.18" />
      <circle cx="124" cy="107" r="21" fill="#fff" fillOpacity="0.18" />
      <path d="M97 106 Q100 100 103 106" strokeLinecap="round" />
    </g>
  ),
  'h-bow': <g>{P('M100 44 L68 26 Q60 44 68 60 Z', '#ff6fae')}{P('M100 44 L132 26 Q140 44 132 60 Z', '#ff6fae')}{C(100, 44, 9, '#ff9fc9')}</g>,
  'h-flower': <g>{[0, 72, 144, 216, 288].map((a) => <circle key={a} cx={128 + 13 * Math.cos((a * Math.PI) / 180)} cy={40 + 13 * Math.sin((a * Math.PI) / 180)} r="10" fill="#ff8fbf" {...s} />)}{C(128, 40, 8, '#ffd84a')}</g>,
  'h-beanie': <g>{P('M56 64 Q58 18 100 18 Q142 18 144 64 Z', '#4cc1a4')}{P('M52 56 Q100 44 148 56 L148 72 Q100 60 52 72 Z', '#2f9e85')}{C(100, 14, 11, '#ffe08a')}</g>,
  'h-straw': <g>{P('M26 64 Q100 42 174 64 Q100 84 26 64 Z', '#f2c66d')}{P('M64 58 Q64 22 100 22 Q136 22 136 58 Q100 68 64 58 Z', '#f7d98a')}{P('M64 50 Q100 60 136 50 L136 58 Q100 68 64 58 Z', '#ef5d5d')}</g>,
  'h-cat': <g>{P('M56 58 L52 14 L90 40 Z', '#ffb0cf')}{P('M144 58 L148 14 L110 40 Z', '#ffb0cf')}{P('M60 46 L58 26 L76 38 Z', '#fff', 0)}{P('M140 46 L142 26 L124 38 Z', '#fff', 0)}</g>,
  'h-headset': <g>{P('M40 84 Q40 20 100 20 Q160 20 160 84', 'none', 9)}<path d="M40 84 Q40 20 100 20 Q160 20 160 84" fill="none" stroke="#7c5cff" strokeWidth="4" />{C(38, 92, 16, '#7c5cff')}{C(162, 92, 16, '#7c5cff')}{D(38, 92, 6, '#ffd84a')}{D(162, 92, 6, '#ffd84a')}</g>,
  'h-chef': <g>{P('M64 62 V40 Q40 34 50 16 Q60 2 78 12 Q88 -6 112 4 Q124 -4 138 14 Q158 22 136 40 V62 Q100 72 64 62 Z', '#fff')}{P('M64 52 Q100 62 136 52', 'none', 3)}</g>,
  'h-grad': <g>{P('M66 52 Q100 66 134 52 L134 38 H66 Z', '#39325e')}{P('M100 12 L170 36 L100 58 L30 36 Z', '#4a4178')}{P('M100 36 L150 42 V70', 'none', 3)}{C(150, 74, 6, '#ffc53a', 3)}</g>,
  'h-wizard': <g>{P('M40 64 Q100 46 160 64 Q100 78 40 64 Z', '#5b3fc4')}{P('M64 58 Q84 30 104 -6 Q120 30 136 58 Q100 68 64 58 Z', '#6d4fe0')}{Star(100, 36, 9)}{D(88, 50, 3, '#ffe08a')}{D(116, 22, 2.5, '#ffe08a')}</g>,
  'h-astro': <g>{P('M30 112 Q26 22 100 22 Q174 22 170 112 Q168 150 100 152 Q32 150 30 112 Z', '#ffffff')}<path d="M44 108 Q44 56 100 56 Q156 56 156 108 Q156 144 100 146 Q44 144 44 108 Z" fill="#bfe6ff" fillOpacity="0.28" stroke={O} strokeWidth="3" />{D(70, 74, 5, '#fff')}{C(100, 30, 5, '#ef5d5d', 2)}</g>,

  'g-round': <g fill="#fff" fillOpacity="0.12" stroke="#b5532a" strokeWidth="5"><circle cx="76" cy="107" r="19" /><circle cx="124" cy="107" r="19" /><path d="M95 104 Q100 99 105 104" fill="none" /></g>,
  'g-sun': <g>{P('M52 92 H96 L92 120 Q74 128 58 118 Z', '#2a2350')}{P('M104 92 H148 L142 118 Q126 128 108 120 Z', '#2a2350')}{P('M94 98 H106', 'none', 5)}<path d="M62 100 L74 100" stroke="#fff" strokeWidth="4" strokeLinecap="round" /><path d="M114 100 L126 100" stroke="#fff" strokeWidth="4" strokeLinecap="round" /></g>,
  'g-star': <g>{P(starD(76, 106, 27), '#ffd84a', 3.5)}{P(starD(124, 106, 27), '#ff8fbf', 3.5)}{D(78, 108, 7, '#2a2740')}{D(122, 108, 7, '#2a2740')}</g>,
  'g-stache': <g>{P('M100 128 Q84 118 72 126 Q64 132 58 124 Q60 142 80 138 Q94 136 100 130 Q106 136 120 138 Q140 142 142 124 Q136 132 128 126 Q116 118 100 128 Z', '#5a3a26')}</g>,
  'g-mask': <g>{P('M46 92 Q74 82 100 96 Q126 82 154 92 Q156 124 126 124 Q108 124 100 110 Q92 124 74 124 Q44 124 46 92 Z', '#ef4f6b')}<ellipse cx="76" cy="106" rx="14" ry="13" fill="#fff" stroke={O} strokeWidth="3" /><ellipse cx="124" cy="106" rx="14" ry="13" fill="#fff" stroke={O} strokeWidth="3" />{D(78, 107, 7, '#2a2740')}{D(122, 107, 7, '#2a2740')}</g>,

  's5-w': <g>{P('M20 66 Q100 10 180 66 Q100 54 20 66 Z', '#e8c98a')}{P('M60 46 L68 36 M100 30 L100 20 M140 46 L132 36 M80 36 L84 28 M120 36 L116 28', 'none', 3)}{P('M36 62 Q100 50 164 62', 'none', 3)}</g>,
  's9-w': <g>{P('M46 88 Q100 78 154 88 V124 Q126 134 100 120 Q74 134 46 124 Z', '#bfe6ff')}<path d="M58 94 L78 92" stroke="#fff" strokeWidth="5" strokeLinecap="round" /><circle cx="76" cy="108" r="6" fill="#2a2740" /><circle cx="124" cy="108" r="6" fill="#2a2740" />{P('M46 100 L34 104 M154 100 L166 104', 'none', 6)}</g>,
  's10-w': <g>{P('M100 12 Q100 2 110 -2', 'none', 5)}<ellipse cx="74" cy="44" rx="20" ry="24" fill="#ff8a2a" {...s} /><ellipse cx="126" cy="44" rx="20" ry="24" fill="#ff8a2a" {...s} /><ellipse cx="100" cy="42" rx="26" ry="28" fill="#ffa53a" {...s} />{P('M88 36 l6 8 h-12 z M112 36 l6 8 h-12 z', '#7a3c10', 2)}{P('M84 52 Q100 62 116 52', 'none', 3)}</g>,
  's12-w': <g>{P('M56 62 Q70 14 122 10 Q150 10 164 44 Q146 30 134 34 Q142 52 144 62 Q100 72 56 62 Z', '#e8402f')}{C(166, 50, 10, '#fff')}{P('M50 56 Q100 44 150 56 Q156 66 150 72 Q100 60 50 72 Q44 66 50 56 Z', '#fff')}</g>,
};

/** เสื้อผ้า (ถูกตัดตามรูปตัว) */
export const BODY_ART: Record<string, React.ReactNode> = {
  'b-tee': <g>{shirt('#5ab0ff')}{Star(100, 182, 9, '#fff')}</g>,
  'b-stripe': <g>{shirt('#fff')}<path d="M15 172 H185 M15 184 H185 M15 196 H185" stroke="#ef5d5d" strokeWidth="6" /></g>,
  'b-overall': <g>{shirt('#ffd84a')}{P('M60 212 V168 H140 V212 Z', '#4a7fd4')}{P('M70 168 L72 150 M130 168 L128 150', 'none', 7)}{D(76, 174, 3.5, '#ffc53a')}{D(124, 174, 3.5, '#ffc53a')}{P('M84 182 H116 V198 H84 Z', '#5e92e6', 3)}</g>,
  'b-uniform': <g>{shirt('#ffffff')}{P('M78 158 L100 176 L122 158', '#ffffff')}{P('M92 172 L100 190 L108 172 L100 178 Z', '#3f4a8a', 2.5)}{P('M15 196 H185 V215 H15 Z', '#3f4a8a')}{P('M124 172 H142 V186 H124 Z', '#fff', 2.5)}</g>,
  'b-sport': <g>{shirt('#ef5d5d')}{P('M15 174 H185', 'none', 0)}<path d="M15 170 H70 M130 170 H185" stroke="#fff" strokeWidth="6" />{P('M84 170 L78 196 M116 170 L122 196', 'none', 0)}<text x="100" y="196" fontSize="26" fontWeight="800" textAnchor="middle" fill="#fff" stroke={O} strokeWidth="1.2">5</text></g>,
  'b-pajama': <g>{shirt('#8fa2ff')}{Star(62, 178, 6, '#ffe08a')}{Star(136, 176, 6, '#ffe08a')}{Star(100, 192, 6, '#ffe08a')}{D(84, 172, 2.5, '#fff')}{D(118, 186, 2.5, '#fff')}</g>,
  'b-dress': <g>{P('M15 158 Q60 156 78 158 Q100 172 122 158 Q140 156 185 158 L190 215 H10 Z', '#ff8fbf')}<path d="M15 180 Q40 190 60 180 Q80 190 100 180 Q120 190 140 180 Q160 190 185 180" fill="none" stroke="#fff" strokeWidth="5" />{D(60, 200, 4, '#fff')}{D(100, 202, 4, '#fff')}{D(140, 200, 4, '#fff')}</g>,
  'b-suit': <g>{shirt('#3a3560')}{P('M78 158 L100 196 L122 158 Q100 172 78 158 Z', '#fff')}{P('M100 168 L84 160 V176 Z M100 168 L116 160 V176 Z', '#ef4f6b', 2.5)}{D(100, 188, 3, O)}</g>,
  'b-lab': <g>{shirt('#fdfdff')}{P('M100 172 V215', 'none', 3)}{P('M78 158 L92 182 L100 172 L108 182 L122 158', '#eef2ff')}{P('M124 186 H144 V200 H124 Z', '#eef2ff', 2.5)}<path d="M130 186 V176" stroke="#2eb4f5" strokeWidth="3" /><path d="M137 186 V178" stroke="#ef4f6b" strokeWidth="3" /></g>,
  'b-hero': <g>{shirt('#3f6fe8')}{P('M84 164 H116 L124 178 L100 200 L76 178 Z', '#ffc53a')}<text x="100" y="186" fontSize="20" fontWeight="800" textAnchor="middle" fill="#ef4f6b">5G</text>{P('M15 202 H185', 'none', 7)}</g>,

  's1-w': <g>{shirt('#ffe08a')}{Star(100, 184, 13, '#ff6fae')}{Star(62, 178, 7, '#7c5cff')}{Star(138, 178, 7, '#2eb4f5')}</g>,
  's2-w': <g>{shirt('#e8402f')}{P('M100 164 V215', 'none', 3)}{P('M88 172 H112 M88 184 H112 M88 196 H112', 'none', 4)}{P('M78 158 Q100 172 122 158', 'none', 5)}{D(66, 186, 7, '#ffc53a')}{D(134, 186, 7, '#ffc53a')}</g>,
  's3-w': <g><ellipse cx="100" cy="188" rx="80" ry="22" fill="#ffd84a" {...s} /><ellipse cx="100" cy="186" rx="50" ry="10" fill="#f5a50f" fillOpacity="0.5" stroke={O} strokeWidth="3" /><path d="M36 176 L36 200 M164 176 L164 200" stroke="#ef5d5d" strokeWidth="9" /></g>,
  's4-w': <g>{shirt('#22b8cf')}{[[60, 176], [100, 190], [140, 174], [80, 200], [122, 202]].map(([x, y], i) => <g key={i}>{D(x - 5, y, 4.5, '#ffb3d0')}{D(x + 5, y, 4.5, '#ffb3d0')}{D(x, y - 5, 4.5, '#ffb3d0')}{D(x, y + 5, 4.5, '#ffb3d0')}{D(x, y, 3, '#ffd84a')}</g>)}</g>,
  's7-w': <g>{P('M15 158 Q60 156 78 158 Q100 172 122 158 Q140 156 185 158 V215 H15 Z', '#ffd84a')}{P('M100 170 V215', 'none', 3)}{D(90, 184, 3.5, O)}{D(90, 200, 3.5, O)}{P('M76 158 L100 170 L124 158', '#ffc21a')}</g>,
  's8-w': <g>{Array.from({ length: 13 }, (_, i) => { const a = (Math.PI * (i + 0.5)) / 13; return <circle key={i} cx={100 - 48 * Math.cos(a)} cy={158 + 26 * Math.sin(a)} r="6.5" fill="#fff" {...s} strokeWidth={2.2} />; })}{C(100, 186, 7, '#ffc53a', 2.5)}{P('M100 193 V210', 'none', 3)}{D(100, 212, 4, '#ff6fae')}</g>,
  's11-w': <g>{shirt('#f5b83d')}{P('M15 172 Q60 190 100 170 Q140 190 185 172 V186 Q140 204 100 184 Q60 204 15 186 Z', '#b5328a')}<path d="M15 180 Q60 197 100 177 Q140 197 185 180" fill="none" stroke="#ffe08a" strokeWidth="2.5" strokeDasharray="4 4" />{P('M15 200 H185 V215 H15 Z', '#7a2f8e')}</g>,
};

/** ชิ้นหลังตัว */
export const BACK_ART: Record<string, React.ReactNode> = {
  cape: <path d="M58 104 Q100 92 142 104 L160 190 Q100 214 40 190 Z" fill="#f53d9b" stroke="#bb1569" strokeWidth="3" />,
  'k-bag': <g>{P('M32 92 Q100 64 168 92 L172 176 Q100 196 28 176 Z', '#ef8a3a')}{P('M26 136 L14 130 V164 L28 170', '#ffa960')}{P('M174 136 L186 130 V164 L172 170', '#ffa960')}</g>,
  'k-butter': <g>{P('M56 112 Q6 58 2 104 Q0 138 44 138 Q6 150 26 176 Q44 190 62 150 Z', '#ff9fc9')}{P('M144 112 Q194 58 198 104 Q200 138 156 138 Q194 150 174 176 Q156 190 138 150 Z', '#ff9fc9')}{D(26, 108, 7, '#ffe08a')}{D(174, 108, 7, '#ffe08a')}{D(36, 164, 5, '#8fe0ff')}{D(164, 164, 5, '#8fe0ff')}</g>,
  'k-angel': <g>{P('M52 118 Q6 94 -4 126 Q2 134 12 132 Q2 144 14 150 Q22 150 28 144 Q24 158 38 160 Q50 156 58 140 Z', '#fff')}{P('M148 118 Q194 94 204 126 Q198 134 188 132 Q198 144 186 150 Q178 150 172 144 Q176 158 162 160 Q150 156 142 140 Z', '#fff')}</g>,
  'k-dragon': <g>{P('M54 104 L2 66 Q8 96 -2 112 Q14 110 22 122 Q28 116 34 132 Q42 124 56 142 Z', '#3fbf8f')}{P('M146 104 L198 66 Q192 96 202 112 Q186 110 178 122 Q172 116 166 132 Q158 124 144 142 Z', '#3fbf8f')}{P('M54 104 L18 96 M54 112 L26 118 M146 104 L182 96 M146 112 L174 118', 'none', 3)}</g>,
  'k-jet': <g>{P('M22 96 Q34 72 48 96 V168 H22 Z', '#c8d0e6')}{P('M152 96 Q164 72 178 96 V168 H152 Z', '#c8d0e6')}{P('M24 168 L35 202 L46 168 Z', '#ff8a2a')}{P('M154 168 L165 202 L176 168 Z', '#ff8a2a')}{P('M30 168 L35 188 L40 168 Z', '#ffd84a', 0)}{P('M160 168 L165 188 L170 168 Z', '#ffd84a', 0)}{D(35, 110, 6, '#ef4f6b')}{D(165, 110, 6, '#ef4f6b')}</g>,
  's6-w': <g>{P('M34 94 Q100 66 166 94 L170 176 Q100 196 30 176 Z', '#3f6fe8')}{P('M26 140 L14 134 V164 L28 170', '#ffc53a')}{P('M174 140 L186 134 V164 L172 170', '#ffc53a')}</g>,
};
