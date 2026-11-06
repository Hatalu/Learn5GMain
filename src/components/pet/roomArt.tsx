import React, { useId } from 'react';
import { stickerById } from '@/components/studio/stickers';
import { itemById, type RoomSlot, type Season } from '@/lib/pet/catalog';
import type { Phase } from '@/lib/companion';

const O = '#2a2350';
const st = { stroke: O, strokeWidth: 4, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
const R = (x: number, y: number, w: number, h: number, fill: string, r = 0) => <rect x={x} y={y} width={w} height={h} rx={r} fill={fill} {...st} />;
const P = (d: string, fill = 'none') => <path d={d} fill={fill} {...st} />;
const C = (x: number, y: number, r: number, fill: string) => <circle cx={x} cy={y} r={r} fill={fill} {...st} />;

/* ------------------------------ ผนังและพื้น ------------------------------ */

const star = (x: number, y: number, r: number, fill: string) => {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const q = i % 2 ? r * 0.45 : r;
    d += `${i ? 'L' : 'M'}${(x + Math.cos(a) * q).toFixed(1)} ${(y + Math.sin(a) * q).toFixed(1)} `;
  }
  return <path d={d + 'Z'} fill={fill} />;
};
const heart = (x: number, y: number, s: number, fill: string) => <path d={`M${x} ${y + s} C${x - s * 1.6} ${y - s * 0.2} ${x - s * 0.6} ${y - s * 1.1} ${x} ${y - s * 0.3} C${x + s * 0.6} ${y - s * 1.1} ${x + s * 1.6} ${y - s * 0.2} ${x} ${y + s} Z`} fill={fill} />;

const WALLS: Record<string, { bg: string; size?: number; tile?: React.ReactNode }> = {
  'wa-sky': { bg: '#a9e4f5', size: 70, tile: <>{star(18, 18, 7, '#c9effa')}{star(54, 52, 7, '#c9effa')}</> },
  'wa-mint': { bg: '#b6efd8', size: 44, tile: <><circle cx="11" cy="11" r="5" fill="#d9f8ea" /><circle cx="33" cy="33" r="5" fill="#d9f8ea" /></> },
  'wa-peach': { bg: '#ffd8bf', size: 60, tile: <rect x="0" y="0" width="30" height="60" fill="#ffe6d6" /> },
  'wa-grape': { bg: '#c4b2ff', size: 74, tile: <>{star(18, 20, 8, '#dcd0ff')}{star(56, 54, 6, '#e8e0ff')}</> },
  'wa-sun': { bg: '#ffe58f', size: 64, tile: <>{heart(16, 18, 7, '#fff0b8')}{heart(48, 48, 7, '#fff0b8')}</> },
  'wa-brick': { bg: '#e8a58a', size: 80, tile: <g fill="#efb9a3" stroke="#d68f73" strokeWidth="2"><rect x="1" y="1" width="78" height="18" /><rect x="-39" y="21" width="78" height="18" /><rect x="41" y="21" width="78" height="18" /></g> },
  'wa-forest': { bg: '#a6dfa0', size: 90, tile: <g fill="#8ed08a"><path d="M20 70 L34 34 L48 70 Z" /><path d="M56 40 L66 14 L76 40 Z" /><rect x="31" y="70" width="6" height="12" fill="#7bb577" /></g> },
  'wa-space': { bg: '#2b2a6b', size: 90, tile: <>{star(20, 22, 6, '#ffe08a')}{star(64, 60, 4, '#fff')}<circle cx="60" cy="18" r="2" fill="#fff" /><circle cx="24" cy="70" r="2.5" fill="#8fd0ff" /></> },
};
const FLOORS: Record<string, { bg: string; size?: number; tile?: React.ReactNode }> = {
  'fl-wood': { bg: '#d9a06a', size: 120, tile: <g stroke="#bb8350" strokeWidth="3"><path d="M0 30 H120 M0 60 H120 M0 90 H120 M40 0 V30 M100 30 V60 M20 60 V90 M80 90 V120" /></g> },
  'fl-check': { bg: '#fff3dc', size: 100, tile: <><rect width="50" height="50" fill="#f4c7a1" /><rect x="50" y="50" width="50" height="50" fill="#f4c7a1" /></> },
  'fl-cream': { bg: '#f7e8cf', size: 90, tile: <path d="M0 45 H90 M45 0 V90" stroke="#ecd7b4" strokeWidth="3" /> },
  'fl-grass': { bg: '#8ed66f', size: 70, tile: <g stroke="#6fbd50" strokeWidth="3" strokeLinecap="round"><path d="M14 22 l-3 -9 M14 22 l3 -9 M50 54 l-3 -9 M50 54 l3 -9" /></g> },
  'fl-cloud': { bg: '#dff2ff', size: 110, tile: <g fill="#fff"><circle cx="24" cy="30" r="14" /><circle cx="42" cy="26" r="17" /><circle cx="60" cy="32" r="12" /><circle cx="86" cy="80" r="12" /><circle cx="70" cy="84" r="9" /></g> },
};

function Surface({ def, x, y, w, h, pid }: { def: { bg: string; size?: number; tile?: React.ReactNode }; x: number; y: number; w: number; h: number; pid: string }) {
  return (
    <>
      <rect x={x} y={y} width={w} height={h} fill={def.bg} />
      {def.tile && (
        <>
          <defs>
            <pattern id={pid} width={def.size} height={def.size} patternUnits="userSpaceOnUse">{def.tile}</pattern>
          </defs>
          <rect x={x} y={y} width={w} height={h} fill={`url(#${pid})`} />
        </>
      )}
    </>
  );
}

/* ------------------------------ เฟอร์นิเจอร์ ------------------------------ */

const sofa = (a: string, b: string) => (
  <g>
    {R(14, 30, 122, 74, a, 24)}
    {R(26, 70, 98, 40, b, 14)}
    {R(2, 60, 32, 56, a, 15)}
    {R(116, 60, 32, 56, a, 15)}
    {R(16, 112, 14, 18, '#8a5a3a', 4)}
    {R(120, 112, 14, 18, '#8a5a3a', 4)}
  </g>
);

const PIECES: Record<string, { vb: string; el: React.ReactNode }> = {
  'so-orange': { vb: '0 0 150 130', el: (<g>{R(30, 22, 90, 78, '#ff9c3e', 22)}{R(36, 72, 78, 34, '#ffbb70', 12)}{R(16, 60, 26, 46, '#ff8a2a', 12)}{R(108, 60, 26, 46, '#ff8a2a', 12)}{R(42, 106, 12, 22, '#8a5a3a', 4)}{R(96, 106, 12, 22, '#8a5a3a', 4)}</g>) },
  'so-blue': { vb: '0 0 150 130', el: sofa('#5ab0ff', '#9ad2ff') },
  'so-bean': { vb: '0 0 150 130', el: (<g>{P('M14 118 Q0 60 50 30 Q80 10 112 36 Q150 66 136 118 Q75 134 14 118 Z', '#ff7ab8')}{P('M44 76 Q76 56 106 78', 'none')}<path d="M34 50 Q50 34 68 30" stroke="#ffb3d6" strokeWidth="8" strokeLinecap="round" fill="none" /></g>) },
  'so-bed': { vb: '0 0 150 130', el: (<g>{R(6, 22, 26, 96, '#8a5a3a', 8)}{R(120, 52, 24, 66, '#8a5a3a', 8)}{R(14, 72, 122, 36, '#fff')}{P('M60 72 H136 V108 H60 Q48 90 60 72 Z', '#7c9cff')}{R(22, 52, 42, 24, '#ffd2e4', 10)}</g>) },
  'so-cloud': { vb: '0 0 150 130', el: (<g>{P('M16 112 Q-6 86 18 68 Q14 34 50 38 Q72 12 100 36 Q138 32 132 68 Q156 88 134 112 Z', '#fff')}{P('M38 94 Q75 80 112 94', 'none')}{R(40, 112, 12, 16, '#a9c8ff', 4)}{R(98, 112, 12, 16, '#a9c8ff', 4)}</g>) },

  'tv-old': { vb: '0 0 140 150', el: (<g>{R(18, 118, 104, 26, '#c98a52', 6)}{R(14, 30, 112, 88, '#37c79b', 14)}{R(26, 42, 70, 62, '#ffe8a8', 8)}{C(110, 58, 6, '#ffd84a')}{C(110, 80, 6, '#ff7a59')}{P('M52 30 L38 8 M72 30 L90 8')}</g>) },
  'tv-shelf': { vb: '0 0 140 150', el: (<g>{R(16, 8, 108, 138, '#c98a52', 6)}{P('M16 52 H124 M16 98 H124')}{R(26, 20, 12, 32, '#ef5d5d')}{R(38, 26, 12, 26, '#5ab0ff')}{R(50, 18, 12, 34, '#ffd84a')}{R(84, 30, 14, 22, '#7bd389')}{R(30, 66, 12, 32, '#a66ce8')}{R(42, 62, 12, 36, '#ff9f43')}{C(94, 84, 12, '#ff8fbf')}{R(26, 110, 40, 12, '#5ab0ff')}{R(30, 122, 36, 12, '#ef5d5d')}{R(84, 108, 26, 26, '#7bd389', 4)}</g>) },

  'la-ball': { vb: '0 0 120 110', el: (<g>{P('M60 0 V36')}{C(60, 62, 28, '#fff3b0')}<circle cx="50" cy="52" r="7" fill="#fff" /></g>) },
  'la-star': { vb: '0 0 120 110', el: (<g>{P('M60 0 V30')}<g transform="translate(0 0)">{(() => { let d = ''; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5; const q = i % 2 ? 16 : 36; d += `${i ? 'L' : 'M'}${(60 + Math.cos(a) * q).toFixed(1)} ${(66 + Math.sin(a) * q).toFixed(1)} `; } return P(d + 'Z', '#ffd84a'); })()}</g></g>) },
  'la-moon': { vb: '0 0 120 110', el: (<g>{P('M60 0 V26')}{P('M74 30 A36 36 0 1 0 74 98 A28 28 0 1 1 74 30 Z', '#ffe08a')}</g>) },
  'la-chand': { vb: '0 0 120 110', el: (<g>{P('M60 0 V24')}{P('M16 52 Q60 24 104 52')}{P('M60 24 V52')}{[16, 38, 60, 82, 104].map((x, i) => <g key={x}>{P(`M${x} ${i % 2 ? 42 : 52} v8`)}{C(x, (i % 2 ? 42 : 52) + 18, 10, '#fff3b0')}</g>)}</g>) },

  'ru-round': { vb: '0 0 260 110', el: (<g><ellipse cx="130" cy="55" rx="126" ry="50" fill="#ff9fb4" {...st} /><ellipse cx="130" cy="55" rx="92" ry="34" fill="#ffc9d5" /></g>) },
  'ru-star': { vb: '0 0 260 110', el: (<g><ellipse cx="130" cy="55" rx="126" ry="50" fill="#7c9cff" {...st} /><g transform="translate(130 55) scale(1 .6)">{star(0, 0, 40, '#ffe08a')}</g></g>) },
  'ru-rainbow': { vb: '0 0 260 110', el: (<g>{['#ef5d5d', '#ff9f43', '#ffd84a', '#7bd389', '#5ab0ff', '#a66ce8'].map((c, i) => <ellipse key={c} cx="130" cy="55" rx={126 - i * 19} ry={50 - i * 8} fill={c} {...(i === 0 ? st : {})} />)}</g>) },
  'ru-flower': { vb: '0 0 260 110', el: (<g><ellipse cx="130" cy="55" rx="126" ry="50" fill="#b6efd8" {...st} />{[[70, 50], [130, 36], [190, 52], [110, 78], [160, 80]].map(([x, y], i) => <g key={i} fill="#ff8fbf"><circle cx={x - 8} cy={y} r="7" /><circle cx={x + 8} cy={y} r="7" /><circle cx={x} cy={y - 5} r="7" /><circle cx={x} cy={y + 5} r="7" /><circle cx={x} cy={y} r="5" fill="#ffd84a" /></g>)}</g>) },
  'ru-math': { vb: '0 0 260 110', el: (<g><ellipse cx="130" cy="55" rx="126" ry="50" fill="#ffe58f" {...st} />{['1', '+', '2', '=', '3'].map((c, i) => <text key={i} x={58 + i * 36} y="68" fontSize="34" fontWeight="800" textAnchor="middle" fill="#7c5cff">{c}</text>)}</g>) },
};

export function StickerAt({ id, x, y, w, h }: { id: string; x: number; y: number; w: number; h: number }) {
  return (
    <svg x={x} y={y} width={w} height={h} viewBox="0 0 100 100" style={{ overflow: 'visible' }}>
      {stickerById(id)?.el}
    </svg>
  );
}

function Piece({ id, x, y, w, h }: { id: string; x: number; y: number; w: number; h: number }) {
  const it = itemById(id);
  if (it?.sticker) return <StickerAt id={it.sticker} x={x} y={y} w={w} h={h} />;
  const p = PIECES[id];
  if (!p) return null;
  return (
    <svg x={x} y={y} width={w} height={h} viewBox={p.vb} style={{ overflow: 'visible' }}>
      {p.el}
    </svg>
  );
}

const SLOT_BOX: Partial<Record<RoomSlot, [number, number, number, number]>> = {
  rug: [255, 450, 290, 118],
  sofa: [203, 285, 150, 136],
  tv: [452, 268, 145, 158],
  lamp: [340, 0, 120, 108],
  toy: [212, 442, 82, 82],
  fest: [508, 426, 88, 88],
};

function Window({ phase, season }: { phase: Phase; season: Season }) {
  const sky = { dawn: '#ffd9b8', day: '#a5e0ff', dusk: '#ffb48f', night: '#27306f' }[phase];
  const rainy = season.month >= 6 && season.month <= 10 && phase !== 'night';
  return (
    <g>
      <clipPath id="pr-win"><rect x="228" y="70" width="118" height="136" rx="10" /></clipPath>
      <rect x="228" y="70" width="118" height="136" rx="10" fill={sky} />
      <g clipPath="url(#pr-win)">
        {phase === 'night' ? (
          <>
            <circle cx="310" cy="102" r="17" fill="#ffe9a8" />
            <circle cx="302" cy="97" r="14" fill={sky} />
            <circle cx="250" cy="98" r="2.4" fill="#fff" />
            <circle cx="276" cy="122" r="2" fill="#fff" />
            <circle cx="330" cy="140" r="2.2" fill="#fff" />
          </>
        ) : (
          <circle cx="306" cy="104" r="18" fill="#ffd84a" />
        )}
        <ellipse cx="256" cy="212" rx="60" ry="36" fill={phase === 'night' ? '#2f5a55' : '#7bd389'} />
        <ellipse cx="330" cy="222" rx="66" ry="40" fill={phase === 'night' ? '#264a48' : '#5fc66a'} />
        {rainy && (
          <g stroke="#ffffff" strokeOpacity="0.75" strokeWidth="2.4" strokeLinecap="round">
            {[240, 262, 284, 306, 328].map((x, i) => <path key={x} className="pr-rain" style={{ animationDelay: `${i * 0.13}s` }} d={`M${x} 76 l-5 14`} />)}
          </g>
        )}
      </g>
      <rect x="228" y="70" width="118" height="136" rx="10" fill="none" stroke={O} strokeWidth="7" />
      <path d="M287 70 V206 M228 138 H346" stroke={O} strokeWidth="5" />
      <path d="M214 62 Q240 130 222 212 L212 212 Z" fill={season.c1} {...st} />
      <path d="M360 62 Q334 130 352 212 L362 212 Z" fill={season.c1} {...st} />
      <path d="M208 62 H366" stroke={O} strokeWidth="7" strokeLinecap="round" />
    </g>
  );
}

function Bunting({ season }: { season: Season }) {
  return (
    <g>
      <path d="M0 8 Q200 62 400 10 Q600 62 800 8" fill="none" stroke={O} strokeWidth="3" />
      {Array.from({ length: 21 }, (_, i) => {
        const x = 20 + i * 38;
        const t = ((x % 400) / 400) * 2 - 1;
        const y = 10 + 24 * (1 - t * t);
        return <path key={i} d={`M${x - 13} ${y} H${x + 13} L${x} ${y + 26} Z`} fill={i % 2 ? season.c1 : season.c2} stroke={O} strokeWidth="2.5" strokeLinejoin="round" />;
      })}
    </g>
  );
}

export function RoomScene({ room, season, phase }: { room: Partial<Record<RoomSlot, string>>; season: Season; phase: Phase }) {
  const uid = useId().replace(/:/g, '');
  const wall = WALLS[room.wall || 'wa-sky'] || WALLS['wa-sky'];
  const floor = FLOORS[room.floor || 'fl-wood'] || FLOORS['fl-wood'];
  const place = (slot: RoomSlot) => {
    const id = room[slot];
    const b = SLOT_BOX[slot];
    return id && b ? <Piece key={slot} id={id} x={b[0]} y={b[1]} w={b[2]} h={b[3]} /> : null;
  };
  const picId = room.pic;
  return (
    <svg className="pr-scene" viewBox="0 -250 800 850" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <Surface def={wall} x={0} y={-250} w={800} h={662} pid={`${uid}w`} />
      <Surface def={floor} x={0} y={412} w={800} h={188} pid={`${uid}f`} />
      <rect x="0" y="400" width="800" height="16" fill="#fff" stroke={O} strokeWidth="4" />
      <Window phase={phase} season={season} />
      {picId && (
        <g>
          <rect x="446" y="84" width="104" height="104" rx="8" fill="#fff" stroke={O} strokeWidth="7" />
          <rect x="446" y="84" width="104" height="104" rx="8" fill="none" stroke="#c98a52" strokeWidth="3" />
          <Piece id={picId} x={458} y={96} w={80} h={80} />
        </g>
      )}
      <Bunting season={season} />
      {room.lamp && <path d="M400 -250 V4" stroke={O} strokeWidth="4" />}
      {place('lamp')}
      {place('sofa')}
      {place('tv')}
      {place('rug')}
      {place('toy')}
      {place('fest')}
    </svg>
  );
}

/** รูปย่อของของแต่งห้องในร้าน */
export function RoomThumb({ id }: { id: string }) {
  const uid = useId().replace(/:/g, '');
  const it = itemById(id);
  if (!it) return null;
  if (it.slot === 'wall' || it.slot === 'floor') {
    const def = (it.slot === 'wall' ? WALLS : FLOORS)[id];
    return (
      <svg viewBox="0 0 200 200" className="pr-thumb" aria-hidden="true">
        <Surface def={def} x={0} y={0} w={200} h={200} pid={`${uid}t`} />
      </svg>
    );
  }
  if (it.sticker) {
    return (
      <svg viewBox="0 0 100 100" className="pr-thumb" aria-hidden="true" style={{ overflow: 'visible' }}>
        {stickerById(it.sticker)?.el}
      </svg>
    );
  }
  return (
    <svg viewBox={PIECES[id]?.vb} className="pr-thumb" aria-hidden="true" style={{ overflow: 'visible' }}>
      {PIECES[id]?.el}
    </svg>
  );
}

/** ใช้ตรวจใน selftest ว่าของทุกชิ้นมีภาพ */
export function hasRoomArt(id: string): boolean {
  const it = itemById(id);
  if (!it) return false;
  if (it.slot === 'wall') return !!WALLS[id];
  if (it.slot === 'floor') return !!FLOORS[id];
  if (it.sticker) return !!stickerById(it.sticker);
  return !!PIECES[id];
}
