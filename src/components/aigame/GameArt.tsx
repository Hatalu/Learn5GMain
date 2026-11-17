/** ภาพปกการ์ดเกม (SVG วาดเอง ห้ามอิโมจิ) */
import React from 'react';

const S = { stroke: '#2a2350', strokeWidth: 3 } as const;

const ARTS: Record<string, React.ReactNode> = {
  balloon: (
    <>
      <rect width="160" height="100" fill="#bfe9ff" />
      <path d="M0 84 Q50 66 100 82 T160 78 V100 H0Z" fill="#7bd389" />
      {[
        [38, 40, '#ff6b7a'],
        [80, 30, '#ffcf3f'],
        [122, 44, '#4fb3ff'],
      ].map(([x, y, c]) => (
        <g key={String(x)}>
          <path d={`M${x} ${Number(y) + 22}c-3 8 3 12 0 22`} stroke="#2a2350" strokeWidth="1.5" fill="none" />
          <ellipse cx={x} cy={y} rx="15" ry="19" fill={String(c)} {...S} />
        </g>
      ))}
    </>
  ),
  runner: (
    <>
      <rect width="160" height="100" fill="#bdeeff" />
      <path d="M62 40 H98 L150 100 H10Z" fill="#7d6bd6" {...S} />
      <path d="M74 40 L56 100 M86 40 L104 100" stroke="#fff" strokeWidth="2" strokeDasharray="6 6" />
      {[
        [66, '#ff6b7a'],
        [80, '#3fd6a8'],
        [94, '#ffcf3f'],
      ].map(([x, c]) => (
        <rect key={String(x)} x={Number(x) - 6} y="44" width="12" height="12" rx="3" fill={String(c)} stroke="#2a2350" strokeWidth="2" />
      ))}
      <circle cx="80" cy="80" r="9" fill="#ff6b7a" {...S} />
    </>
  ),
  mole: (
    <>
      <rect width="160" height="100" fill="#8edc6f" />
      {[40, 80, 120].map((x, i) => (
        <g key={x}>
          <ellipse cx={x} cy="78" rx="18" ry="7" fill="#5b3b2a" {...S} />
          {i === 1 && <path d="M66 78c0-24 28-24 28 0Z" fill="#a9785a" {...S} />}
        </g>
      ))}
      <rect x="64" y="24" width="32" height="16" rx="5" fill="#fff" {...S} />
    </>
  ),
  fishing: (
    <>
      <rect width="160" height="100" fill="#36b6e8" />
      <rect width="160" height="22" fill="#bfeaff" />
      <path d="M60 14h40l-6 10H66Z" fill="#ff9a3d" {...S} />
      <path d="M80 18 V60" stroke="#2a2350" strokeWidth="1.5" />
      <path d="M48 64c8-12 30-12 38 0-8 12-30 12-38 0Z" fill="#ffcf3f" {...S} />
      <path d="M96 84c8-10 26-10 32 0-6 10-24 10-32 0Z" fill="#ff6b7a" {...S} />
    </>
  ),
  memory: (
    <>
      <rect width="160" height="100" fill="#a3714c" />
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={22 + i * 31} y={i % 2 ? 26 : 34} width="26" height="38" rx="5" fill={i === 1 ? '#fff8ec' : '#7c5cf0'} {...S} />
      ))}
    </>
  ),
  castle: (
    <>
      <rect width="160" height="100" fill="#ffe4f1" />
      <rect y="62" width="160" height="38" fill="#c8f1d6" />
      <rect x="10" y="34" width="40" height="40" rx="4" fill="#ffd9e6" {...S} />
      <path d="M8 36l12-16 12 16M28 36l12-16 12 16" fill="#ff6b7a" {...S} />
      {[90, 120].map((x, i) => (
        <path key={x} d={`M${x - 12} 74c0-16 6-24 12-24s12 8 12 24Z`} fill={i ? '#3fd6a8' : '#9b6cf0'} {...S} />
      ))}
    </>
  ),
  tug: (
    <>
      <rect width="160" height="100" fill="#7fd67a" />
      <rect width="160" height="30" fill="#cdeeff" />
      <path d="M20 58 H140" stroke="#a8743f" strokeWidth="5" />
      <path d="M80 50 v18" stroke="#ff3d4f" strokeWidth="6" />
      <circle cx="30" cy="56" r="11" fill="#4fb3ff" {...S} />
      <circle cx="130" cy="56" r="11" fill="#ff8ac2" {...S} />
    </>
  ),
  space: (
    <>
      <rect width="160" height="100" fill="#1f1a56" />
      {[
        [20, 18],
        [130, 30],
        [60, 80],
        [146, 84],
      ].map(([x, y]) => (
        <circle key={x} cx={x} cy={y} r="1.6" fill="#fff" />
      ))}
      <circle cx="56" cy="40" r="16" fill="none" stroke="#ffcf3f" strokeWidth="5" />
      <circle cx="108" cy="46" r="12" fill="none" stroke="#3fd6a8" strokeWidth="4" />
      <path d="M62 84q18-18 36 0q-18 6-36 0Z" fill="#c9b8ff" {...S} />
    </>
  ),
  belt: (
    <>
      <rect width="160" height="100" fill="#ffeedd" />
      <rect y="64" width="160" height="36" fill="#d9c2ff" />
      <circle cx="26" cy="22" r="11" fill="#bfe9ff" {...S} />
      <circle cx="134" cy="22" r="11" fill="#bfe9ff" {...S} />
      <rect x="10" y="40" width="118" height="12" rx="6" fill="#5d5486" {...S} />
      {[24, 50, 76, 102].map((x) => (
        <circle key={x} cx={x} cy="56" r="4" fill="#ffcf3f" stroke="#2a2350" strokeWidth="2" />
      ))}
      <rect x="54" y="22" width="26" height="18" rx="4" fill="#ffcf7a" {...S} />
      <path d="M140 60V34l-14-10" stroke="#9b6cf0" strokeWidth="6" strokeLinecap="round" fill="none" />
      <circle cx="126" cy="24" r="5" fill="#ffcf3f" {...S} />
      {[
        [34, '#4fb3ff'],
        [80, '#ff8a5c'],
        [126, '#9b6cf0'],
      ].map(([x, c]) => (
        <path key={String(x)} d={`M${Number(x) - 18} 72h36l-5 24h-26Z`} fill={String(c)} {...S} strokeLinejoin="round" />
      ))}
    </>
  ),
  roll: (
    <>
      <rect width="160" height="100" fill="#ffe9d6" />
      <path d="M8 96 L30 46 H130 L152 96Z" fill="#f3c58e" {...S} strokeLinejoin="round" />
      {[
        [52, '#4fb3ff', '#2f7fd6'],
        [108, '#ff8a5c', '#e8553a'],
      ].map(([x, c, r]) => (
        <g key={String(x)}>
          <rect x={Number(x) - 13} y="34" width="26" height="20" rx="2" fill={String(c)} {...S} />
          <path d={`M${Number(x) - 17} 36 L${x} 20 L${Number(x) + 17} 36Z`} fill={String(r)} {...S} strokeLinejoin="round" />
          <rect x={Number(x) - 4} y="42" width="8" height="12" fill="#7a4a2a" />
        </g>
      ))}
      <path d="M80 84 Q70 66 56 58" stroke="#2a2350" strokeWidth="2" strokeDasharray="4 4" fill="none" />
      <circle cx="80" cy="82" r="10" fill="#ff6b7a" {...S} />
      <circle cx="77" cy="80" r="1.6" fill="#2a2350" />
      <circle cx="84" cy="80" r="1.6" fill="#2a2350" />
    </>
  ),
  train: (
    <>
      <rect width="160" height="100" fill="#a9e4ff" />
      <path d="M0 62 Q50 44 100 58 T160 54 V100 H0Z" fill="#c6efb4" />
      <path d="M0 72 H160" stroke="#8a5a3c" strokeWidth="4" strokeDasharray="6 5" />
      <rect x="8" y="46" width="34" height="22" rx="5" fill="#ff6b7a" {...S} />
      <rect x="26" y="36" width="16" height="32" rx="4" fill="#ff8fa0" {...S} />
      <circle cx="18" cy="70" r="5" fill="#ffcf3f" {...S} />
      <circle cx="36" cy="70" r="5" fill="#ffcf3f" {...S} />
      <circle cx="14" cy="30" r="5" fill="#fff" />
      <circle cx="8" cy="22" r="4" fill="#fff" />
      {[
        [48, '#4fb3ff', '1'],
        [84, '#ffcf3f', '2'],
        [120, '#3fd6a8', '3'],
      ].map(([x, c, t]) => (
        <g key={String(x)}>
          <rect x={x} y="50" width="30" height="18" rx="4" fill={String(c)} {...S} />
          <circle cx={Number(x) + 8} cy="70" r="4" fill="#fff" {...S} />
          <circle cx={Number(x) + 22} cy="70" r="4" fill="#fff" {...S} />
          <text x={Number(x) + 15} y="63" fontSize="11" fontWeight="900" textAnchor="middle" fill="#2a2350">
            {t}
          </text>
        </g>
      ))}
    </>
  ),
  stack: (
    <>
      <rect width="160" height="100" fill="#ffe7c7" />
      <rect y="70" width="160" height="30" fill="#9fd8ff" />
      {[0, 1, 2].map((i) => (
        <rect key={i} x={i * 2 + 8} y={8 + i * 6} width="10" height={70 - i * 6} fill={['#c9b8ff', '#ffb3cf', '#9fe3c4'][i]} opacity=".7" />
      ))}
      <rect x="40" y="14" width="5" height="62" fill="#ffcf3f" {...S} />
      <path d="M42 16 H96" stroke="#ff9a3d" strokeWidth="6" strokeLinecap="round" />
      <path d="M92 16 V26" stroke="#2a2350" strokeWidth="2" />
      {['#ff6b7a', '#4fb3ff', '#ffcf3f'].map((c, i) => (
        <rect key={c} x="78" y={60 - i * 14} width="30" height="13" rx="3" fill={c} {...S} />
      ))}
      <rect x="116" y="66" width="26" height="12" rx="3" fill="#3fd6a8" {...S} />
      <rect x="84" y="20" width="18" height="10" rx="2" fill="#9b6cf0" {...S} />
    </>
  ),
};

export function GameArt({ id }: { id: string }) {
  return (
    <svg viewBox="0 0 160 100" className="ag-art" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
      {ARTS[id]}
    </svg>
  );
}
