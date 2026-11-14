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
};

export function GameArt({ id }: { id: string }) {
  return (
    <svg viewBox="0 0 160 100" className="ag-art" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
      {ARTS[id]}
    </svg>
  );
}
