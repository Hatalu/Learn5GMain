import React from 'react';
import type { Arm, CharLook } from '@/lib/studio/char';

/**
 * วาดตัวละครแต่งเอง (SVG ล้วน กรอบ 0 0 200 300) หัวโตแบบการ์ตูน แขน/ขาเป็นข้อต่อ จัดท่าได้
 * ชั้นวาด: ผมด้านหลัง > กระเป๋า > ขา/รองเท้า > กางเกง/กระโปรง > คอ > เสื้อ > เปียด้านหน้า > แขน > ของในมือ > หัว > หน้า > ผมด้านหน้า > แว่น/หมวก
 */
const O = '#2a2350';
const rad = (d: number) => (d * Math.PI) / 180;
type P = [number, number];

function limb(s: P, side: -1 | 1, a: Arm, l1: number, l2: number) {
  const dir = (deg: number): P => [side * Math.sin(rad(deg)), Math.cos(rad(deg))];
  const u = dir(a.sh);
  const e: P = [s[0] + u[0] * l1, s[1] + u[1] * l1];
  const f = dir(a.sh + a.el);
  const h: P = [e[0] + f[0] * l2, e[1] + f[1] * l2];
  return { s, e, h };
}
const lerp = (a: P, b: P, t: number): P => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const line = (...pts: P[]) => 'M' + pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' L');
const stroke = (w: number, c: string) => ({ fill: 'none', stroke: c, strokeWidth: w, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const });

const LONG_SLEEVE = ['hoodie', 'sweater', 'labcoat', 'teacher'];
const LEG_POSE: Record<string, [Arm, Arm]> = {
  stand: [{ sh: 4, el: -4 }, { sh: 4, el: -4 }],
  wide: [{ sh: 16, el: -10 }, { sh: 16, el: -10 }],
  jump: [{ sh: 42, el: -75 }, { sh: 42, el: -75 }],
  step: [{ sh: 2, el: 0 }, { sh: 22, el: -28 }],
};

/* ------------------------------------------------------------------ ผม */
function curlyCap(c: string) {
  const dots = Array.from({ length: 10 }, (_, i) => {
    const a = rad(-172 + i * 18.2);
    return <circle key={i} cx={100 + 52 * Math.cos(a)} cy={86 + 50 * Math.sin(a)} r={15} fill={c} stroke={O} strokeWidth={3} />;
  });
  return (
    <g>
      {dots}
      <path d="M50,86 C50,46 72,36 100,36 C128,36 150,46 150,86 C140,70 120,64 100,66 C80,64 60,70 50,86 Z" fill={c} />
    </g>
  );
}

function hairBack(id: string, c: string) {
  const p = { fill: c, stroke: O, strokeWidth: 3.5, strokeLinejoin: 'round' as const };
  switch (id) {
    case 'bob':
      return <path d="M40,90 C38,50 62,30 100,30 C138,30 162,50 160,90 L160,138 Q160,146 150,146 L50,146 Q40,146 40,138 Z" {...p} />;
    case 'long':
      return <path d="M40,90 C38,46 64,28 100,28 C136,28 162,46 160,90 L164,196 Q150,210 132,200 L68,200 Q50,210 36,196 Z" {...p} />;
    case 'ponytail':
      return <path d="M146,60 C178,62 186,96 176,132 C172,150 166,164 158,170 C160,146 158,118 148,96 Z" {...p} />;
    case 'twintails':
      return (
        <>
          <path d="M50,84 C24,92 18,130 26,168 C30,180 40,182 44,172 C40,146 42,118 56,100 Z" {...p} />
          <path d="M150,84 C176,92 182,130 174,168 C170,180 160,182 156,172 C160,146 158,118 144,100 Z" {...p} />
        </>
      );
    case 'bun':
      return <circle cx="100" cy="30" r="22" {...p} />;
    default:
      return null;
  }
}

function hairFront(id: string, c: string) {
  const p = { fill: c, stroke: O, strokeWidth: 3.5, strokeLinejoin: 'round' as const };
  switch (id) {
    case 'spiky':
      return <path d="M46,94 L42,62 L58,66 L54,40 L74,50 L78,22 L94,42 L104,18 L114,42 L126,24 L130,50 L148,40 L144,66 L158,62 L154,94 C146,76 132,68 100,68 C70,68 54,76 46,94 Z" {...p} />;
    case 'side':
      return <path d="M46,98 C36,46 80,22 120,30 C150,36 164,62 154,98 C150,82 142,72 132,66 C110,76 80,74 58,60 C52,70 48,84 46,98 Z" {...p} />;
    case 'bowl':
      return <path d="M44,96 C40,44 70,26 100,26 C130,26 160,44 156,96 L154,80 Q100,72 46,80 Z" {...p} />;
    case 'curly':
      return curlyCap(c);
    case 'bald':
      return <path d="M76,48 Q86,40 98,40" {...stroke(4, '#ffffff99')} />;
    case 'long':
    case 'braids':
      return <path d="M44,100 C38,46 70,28 100,28 C130,28 162,46 156,100 C150,78 138,66 112,60 L100,52 L88,60 C62,66 50,78 44,100 Z" {...p} />;
    case 'bob':
      return <path d="M42,100 C38,48 66,28 100,28 C134,28 162,48 158,100 C152,84 146,76 140,74 C126,78 112,70 104,62 C92,72 74,78 58,74 C52,80 46,90 42,100 Z" {...p} />;
    default:
      // short, ponytail, twintails, bun
      return <path d="M46,94 C38,48 66,28 100,28 C134,28 162,48 154,94 C150,78 140,68 128,64 C118,74 100,72 88,66 C78,74 62,74 52,84 Z" {...p} />;
  }
}

/* ------------------------------------------------------------------ หน้า */
function Eyes({ id }: { id: string }) {
  const L: P = [78, 98];
  const R: P = [122, 98];
  const big = (x: number, y: number, k: number) => (
    <g key={k}>
      <ellipse cx={x} cy={y} rx="7" ry="9" fill={O} />
      <circle cx={x + 2.4} cy={y - 3.2} r="2.6" fill="#fff" />
      <circle cx={x - 2} cy={y + 3} r="1.3" fill="#fff" />
    </g>
  );
  const arc = (x: number, y: number, up: boolean, k: number) => <path key={k} d={`M${x - 8},${y + (up ? 2 : -2)} Q${x},${y + (up ? -8 : 6)} ${x + 8},${y + (up ? 2 : -2)}`} {...stroke(3.5, O)} />;
  switch (id) {
    case 'dot':
      return (
        <>
          {[L, R].map(([x, y], k) => (
            <g key={k}>
              <circle cx={x} cy={y} r="5.5" fill={O} />
              <circle cx={x + 1.8} cy={y - 1.8} r="1.6" fill="#fff" />
            </g>
          ))}
        </>
      );
    case 'sparkle':
      return (
        <>
          {[L, R].map(([x, y], k) => (
            <g key={k}>
              <ellipse cx={x} cy={y} rx="8" ry="10" fill={O} />
              <path d={`M${x + 2},${y - 7} Q${x + 3},${y - 3} ${x + 7},${y - 2} Q${x + 3},${y - 1} ${x + 2},${y + 3} Q${x + 1},${y - 1} ${x - 3},${y - 2} Q${x + 1},${y - 3} ${x + 2},${y - 7} Z`} fill="#fff" />
              <circle cx={x - 3} cy={y + 4} r="1.6" fill="#fff" />
            </g>
          ))}
        </>
      );
    case 'happy':
      return <>{[L, R].map(([x, y], k) => arc(x, y, true, k))}</>;
    case 'wink':
      return (
        <>
          {big(L[0], L[1], 0)}
          {arc(R[0], R[1], true, 1)}
        </>
      );
    case 'sleepy':
      return (
        <>
          {[L, R].map(([x, y], k) => (
            <g key={k}>
              <path d={`M${x - 8},${y} Q${x},${y + 6} ${x + 8},${y}`} fill={O} />
              <path d={`M${x - 9},${y} L${x + 9},${y}`} {...stroke(3, O)} />
            </g>
          ))}
        </>
      );
    case 'surprised':
      return (
        <>
          {[L, R].map(([x, y], k) => (
            <g key={k}>
              <circle cx={x} cy={y} r="9" fill="#fff" stroke={O} strokeWidth="3" />
              <circle cx={x} cy={y} r="3.5" fill={O} />
            </g>
          ))}
        </>
      );
    case 'closed':
      return <>{[L, R].map(([x, y], k) => arc(x, y, false, k))}</>;
    default:
      return (
        <>
          {big(L[0], L[1], 0)}
          {big(R[0], R[1], 1)}
        </>
      );
  }
}

function Brows({ id, c }: { id: string; c: string }) {
  const s = stroke(3.5, c);
  switch (id) {
    case 'soft':
      return <path d="M70,80 Q78,76 86,79 M114,79 Q122,76 130,80" {...s} />;
    case 'up':
      return <path d="M69,76 Q78,68 87,74 M113,74 Q122,68 131,76" {...s} />;
    case 'angry':
      return <path d="M70,76 L87,82 M113,82 L130,76" {...s} />;
    case 'worried':
      return <path d="M70,82 L86,76 M114,76 L130,82" {...s} />;
    default:
      return null;
  }
}

function Mouth({ id }: { id: string }) {
  const s = stroke(3.5, O);
  switch (id) {
    case 'grin':
      return (
        <g>
          <path d="M87,115 Q100,136 113,115 Z" fill="#8a2b3e" stroke={O} strokeWidth="3" strokeLinejoin="round" />
          <path d="M90,116 L110,116 L109,120 L91,120 Z" fill="#fff" />
          <path d="M95,128 Q100,123 105,128 Q100,131 95,128 Z" fill="#ff8fa3" />
        </g>
      );
    case 'open':
      return <ellipse cx="100" cy="121" rx="6.5" ry="8" fill="#8a2b3e" stroke={O} strokeWidth="3" />;
    case 'small':
      return <path d="M95,119 Q100,124 105,119" {...s} />;
    case 'tongue':
      return (
        <g>
          <path d="M98,121 Q102,132 108,124 L106,120 Z" fill="#ff8fa3" stroke={O} strokeWidth="2.5" />
          <path d="M89,117 Q100,127 111,117" {...s} />
        </g>
      );
    case 'flat':
      return <path d="M92,121 L108,121" {...s} />;
    case 'sad':
      return <path d="M90,125 Q100,115 110,125" {...s} />;
    case 'cat':
      return <path d="M89,118 Q94,125 100,118 Q106,125 111,118" {...s} />;
    default:
      return <path d="M89,117 Q100,129 111,117" {...s} />;
  }
}

/* ------------------------------------------------------------------ ของในมือ */
function Held({ id, at, c }: { id: string; at: P; c: string }) {
  const [x, y] = at;
  switch (id) {
    case 'book':
      return (
        <g transform={`translate(${x} ${y}) rotate(-10)`}>
          <rect x="-16" y="-20" width="32" height="40" rx="3" fill={c} stroke={O} strokeWidth="3" />
          <path d="M-10,-12 H10 M-10,-5 H6" {...stroke(2.5, '#ffffffcc')} />
        </g>
      );
    case 'pencil':
      return (
        <g transform={`translate(${x} ${y}) rotate(-35)`}>
          <rect x="-4.5" y="-30" width="9" height="34" fill="#ffd166" stroke={O} strokeWidth="2.5" />
          <path d="M-4.5,4 L0,13 L4.5,4 Z" fill="#ffe8c2" stroke={O} strokeWidth="2.5" strokeLinejoin="round" />
          <rect x="-4.5" y="-36" width="9" height="7" fill="#ff8fab" stroke={O} strokeWidth="2.5" />
        </g>
      );
    case 'flask':
      return (
        <g transform={`translate(${x} ${y - 6})`}>
          <path d="M-5,-22 V-8 L-15,12 Q-17,18 -10,18 H10 Q17,18 15,12 L5,-8 V-22 Z" fill="#fff" stroke={O} strokeWidth="3" strokeLinejoin="round" />
          <path d="M-12,8 L12,8 L14,13 Q15,16 10,16 H-10 Q-15,16 -14,13 Z" fill={c} />
          <path d="M-7,-22 H7" {...stroke(3, O)} />
        </g>
      );
    case 'star':
      return (
        <g transform={`translate(${x} ${y})`}>
          <path d="M0,0 L-10,-34" {...stroke(4, O)} />
          <path d="M-12,-52 L-8,-42 L3,-41 L-5,-34 L-2,-23 L-12,-29 L-22,-23 L-19,-34 L-27,-41 L-16,-42 Z" fill="#ffd166" stroke={O} strokeWidth="2.5" strokeLinejoin="round" />
        </g>
      );
    case 'ball':
      return (
        <g transform={`translate(${x + 4} ${y - 14})`}>
          <circle r="15" fill={c} stroke={O} strokeWidth="3" />
          <path d="M-15,0 Q0,-6 15,0 M0,-15 Q-6,0 0,15" {...stroke(2.5, '#ffffffbb')} />
        </g>
      );
    default:
      return null;
  }
}

/* ------------------------------------------------------------------ สัตว์ */

/** ทำสีเข้มขึ้น (k < 0) หรืออ่อนลง (k > 0) */
function shade(hex: string, k: number) {
  const n = parseInt(hex.slice(1, 7), 16);
  const ch = (v: number) => Math.round(Math.min(255, Math.max(0, k < 0 ? v * (1 + k) : v + (255 - v) * k)));
  return '#' + [n >> 16, (n >> 8) & 255, n & 255].map((v) => ch(v).toString(16).padStart(2, '0')).join('');
}

/** ส่วนที่อยู่หลังหัว: หู แผงคอ ตาโปนของกบ */
function AnimalBack({ sp, c, c2 }: { sp: string; c: string; c2: string }) {
  const p = { fill: c, stroke: O, strokeWidth: 3.5, strokeLinejoin: 'round' as const };
  const inner = (d: string, fill = c2) => <path d={d} fill={fill} />;
  switch (sp) {
    case 'cat':
    case 'fox':
      return (
        <g>
          <path d="M54,66 L46,16 L88,42 Z" {...p} />
          <path d="M146,66 L154,16 L112,42 Z" {...p} />
          {inner('M58,56 L54,28 L78,44 Z', sp === 'cat' ? '#ffb3c6' : c2)}
          {inner('M142,56 L146,28 L122,44 Z', sp === 'cat' ? '#ffb3c6' : c2)}
        </g>
      );
    case 'rabbit':
      return (
        <g>
          <ellipse cx="78" cy="22" rx="14" ry="38" transform="rotate(-10 78 22)" {...p} />
          <ellipse cx="122" cy="22" rx="14" ry="38" transform="rotate(10 122 22)" {...p} />
          <ellipse cx="78" cy="24" rx="7" ry="28" transform="rotate(-10 78 24)" fill={c2} />
          <ellipse cx="122" cy="24" rx="7" ry="28" transform="rotate(10 122 24)" fill={c2} />
        </g>
      );
    case 'bear':
    case 'panda':
    case 'tiger':
      return (
        <g>
          <circle cx="58" cy="46" r="18" {...p} fill={sp === 'panda' ? c2 : c} />
          <circle cx="142" cy="46" r="18" {...p} fill={sp === 'panda' ? c2 : c} />
          {sp !== 'panda' && <circle cx="58" cy="46" r="9" fill={sp === 'tiger' ? '#ffffff' : c2} />}
          {sp !== 'panda' && <circle cx="142" cy="46" r="9" fill={sp === 'tiger' ? '#ffffff' : c2} />}
        </g>
      );
    case 'mouse':
      return (
        <g>
          <circle cx="50" cy="50" r="28" {...p} />
          <circle cx="150" cy="50" r="28" {...p} />
          <circle cx="50" cy="50" r="17" fill={c2} />
          <circle cx="150" cy="50" r="17" fill={c2} />
        </g>
      );
    case 'koala':
      return (
        <g>
          <circle cx="46" cy="66" r="28" {...p} />
          <circle cx="154" cy="66" r="28" {...p} />
          <circle cx="48" cy="68" r="16" fill={c2} />
          <circle cx="152" cy="68" r="16" fill={c2} />
        </g>
      );
    case 'monkey':
      return (
        <g>
          <circle cx="44" cy="94" r="18" {...p} />
          <circle cx="156" cy="94" r="18" {...p} />
          <circle cx="44" cy="94" r="10" fill={c2} />
          <circle cx="156" cy="94" r="10" fill={c2} />
        </g>
      );
    case 'lion': {
      const dots = Array.from({ length: 14 }, (_, i) => {
        const a = rad(i * (360 / 14));
        return <circle key={i} cx={100 + 62 * Math.cos(a)} cy={90 + 60 * Math.sin(a)} r="20" fill={c2} stroke={O} strokeWidth="3" />;
      });
      return (
        <g>
          {dots}
          <circle cx="100" cy="90" r="64" fill={c2} />
          <circle cx="62" cy="44" r="13" {...p} />
          <circle cx="138" cy="44" r="13" {...p} />
        </g>
      );
    }
    case 'elephant':
      return (
        <g>
          <ellipse cx="38" cy="94" rx="32" ry="40" {...p} />
          <ellipse cx="162" cy="94" rx="32" ry="40" {...p} />
          <ellipse cx="40" cy="94" rx="19" ry="27" fill={c2} />
          <ellipse cx="160" cy="94" rx="19" ry="27" fill={c2} />
        </g>
      );
    case 'pig':
      return (
        <g>
          <path d="M56,54 L52,22 L84,40 Z" {...p} />
          <path d="M144,54 L148,22 L116,40 Z" {...p} />
          {inner('M60,46 L58,30 L76,40 Z')}
          {inner('M140,46 L142,30 L124,40 Z')}
        </g>
      );
    case 'frog':
      return (
        <g>
          <circle cx="76" cy="46" r="24" {...p} />
          <circle cx="124" cy="46" r="24" {...p} />
        </g>
      );
    case 'chick':
      return <path d="M92,40 Q88,18 100,22 Q104,8 110,24 Q122,16 112,40 Z" {...p} />;
    case 'dog':
      return null;
    default:
      return null;
  }
}

/** ลวดลายบนหน้า (ก่อนวาดตา): ปาก จมูก ลาย หนวด */
function AnimalFace({ sp, c, c2 }: { sp: string; c: string; c2: string }) {
  const nose = (fill = O) => <path d="M93,104 Q100,99 107,104 Q103,112 100,112 Q97,112 93,104 Z" fill={fill} stroke={O} strokeWidth="1.5" strokeLinejoin="round" />;
  const whiskers = (
    <path d="M76,112 L50,106 M76,118 L50,120 M124,112 L150,106 M124,118 L150,120" {...stroke(2.2, O)} />
  );
  const muzzle = (fill: string, rx = 22, ry = 15) => <ellipse cx="100" cy="115" rx={rx} ry={ry} fill={fill} />;
  switch (sp) {
    case 'cat':
      return (
        <g>
          {muzzle(c2, 20, 13)}
          {nose('#ff8fab')}
          {whiskers}
          <path d="M86,40 L90,52 M100,36 V50 M114,40 L110,52" {...stroke(4, shade(c, -0.25))} />
        </g>
      );
    case 'dog':
      return (
        <g>
          <ellipse cx="54" cy="96" rx="15" ry="34" transform="rotate(16 54 96)" fill={shade(c, -0.28)} stroke={O} strokeWidth="3.5" />
          <ellipse cx="146" cy="96" rx="15" ry="34" transform="rotate(-16 146 96)" fill={shade(c, -0.28)} stroke={O} strokeWidth="3.5" />
          {muzzle(c2)}
          {nose()}
        </g>
      );
    case 'bear':
      return (
        <g>
          {muzzle(c2)}
          {nose()}
        </g>
      );
    case 'panda':
      return (
        <g>
          <ellipse cx="78" cy="100" rx="14" ry="17" transform="rotate(-28 78 100)" fill={c2} />
          <ellipse cx="122" cy="100" rx="14" ry="17" transform="rotate(28 122 100)" fill={c2} />
          {nose()}
        </g>
      );
    case 'fox':
      return (
        <g>
          <path d="M48,100 Q72,96 100,126 Q128,96 152,100 Q144,138 100,142 Q56,138 48,100 Z" fill={c2} />
          {nose()}
        </g>
      );
    case 'lion':
      return (
        <g>
          {muzzle('#fff3e0')}
          {nose()}
        </g>
      );
    case 'tiger':
      return (
        <g>
          {muzzle('#ffffff')}
          {nose('#ff8fab')}
          {whiskers}
          <path d="M100,36 V54 M84,40 L88,54 M116,40 L112,54 M48,92 L64,96 M46,104 L62,104 M152,92 L136,96 M154,104 L138,104" {...stroke(4.5, c2)} />
        </g>
      );
    case 'mouse':
      return (
        <g>
          {nose('#ff8fab')}
          {whiskers}
        </g>
      );
    case 'rabbit':
      return (
        <g>
          {nose('#ff8fab')}
          <path d="M80,112 L58,108 M80,118 L58,120 M120,112 L142,108 M120,118 L142,120" {...stroke(2, O)} />
        </g>
      );
    case 'monkey':
      return (
        <g>
          <path d="M100,72 C70,58 54,84 66,104 C58,126 80,140 100,138 C120,140 142,126 134,104 C146,84 130,58 100,72 Z" fill={c2} />
          <circle cx="96" cy="108" r="2.4" fill={O} />
          <circle cx="104" cy="108" r="2.4" fill={O} />
        </g>
      );
    case 'koala':
      return <ellipse cx="100" cy="106" rx="11" ry="14" fill="#3b3561" stroke={O} strokeWidth="2" />;
    case 'pig':
      return (
        <g>
          <ellipse cx="100" cy="108" rx="17" ry="12" fill={c2} stroke={O} strokeWidth="3" />
          <ellipse cx="94" cy="108" rx="3" ry="4.5" fill={O} />
          <ellipse cx="106" cy="108" rx="3" ry="4.5" fill={O} />
        </g>
      );
    case 'frog':
      return (
        <g>
          <circle cx="76" cy="46" r="15" fill={c2} />
          <circle cx="124" cy="46" r="15" fill={c2} />
        </g>
      );
    case 'penguin':
      return <path d="M100,80 C86,60 56,68 60,98 C62,122 84,134 100,134 C116,134 138,122 140,98 C144,68 114,60 100,80 Z" fill={c2} />;
    default:
      return null;
  }
}

/** ส่วนที่วาดทับหน้า (แทนปาก): จะงอยปาก งวงช้าง */
function AnimalFront({ sp, c, c2 }: { sp: string; c: string; c2: string }) {
  if (sp === 'chick' || sp === 'penguin')
    return <path d="M86,111 L100,103 L114,111 L100,121 Z" fill={sp === 'chick' ? c2 : '#ff9a3d'} stroke={O} strokeWidth="3" strokeLinejoin="round" />;
  if (sp === 'elephant')
    return <path d="M90,100 C88,128 94,152 114,154 C124,154 124,142 116,141 C104,139 108,124 110,100 Z" fill={c} stroke={O} strokeWidth="3.5" strokeLinejoin="round" />;
  return null;
}
/** ชนิดที่ไม่วาดปากปกติ */
const NO_MOUTH = ['chick', 'penguin', 'elephant'];

function Tail({ sp, c, c2 }: { sp: string; c: string; c2: string }) {
  const tube = (d: string, w: number, fill = c) => (
    <g>
      <path d={d} {...stroke(w + 6, O)} />
      <path d={d} {...stroke(w, fill)} />
    </g>
  );
  switch (sp) {
    case 'cat':
    case 'tiger':
      return tube('M124,214 C160,216 170,184 158,160', 9);
    case 'dog':
      return tube('M124,206 Q150,198 154,176', 11);
    case 'fox':
      return (
        <g>
          <ellipse cx="152" cy="196" rx="18" ry="38" transform="rotate(38 152 196)" fill={c} stroke={O} strokeWidth="3.5" />
          <ellipse cx="170" cy="172" rx="10" ry="14" transform="rotate(38 170 172)" fill={c2} />
        </g>
      );
    case 'lion':
      return (
        <g>
          {tube('M124,214 C156,226 168,202 162,184', 6)}
          <circle cx="162" cy="182" r="10" fill={c2} stroke={O} strokeWidth="3" />
        </g>
      );
    case 'monkey':
      return tube('M124,214 C172,222 176,168 150,170 C136,172 140,190 152,188', 7);
    case 'pig':
      return tube('M126,212 C142,210 146,198 138,196 C130,194 132,206 144,204', 4);
    case 'mouse':
      return tube('M124,216 C170,238 178,196 188,188', 4, c2);
    case 'rabbit':
      return <circle cx="136" cy="214" r="13" fill="#ffffff" stroke={O} strokeWidth="3" />;
    case 'bear':
    case 'panda':
    case 'koala':
      return <circle cx="134" cy="214" r="10" fill={sp === 'panda' ? c2 : c} stroke={O} strokeWidth="3" />;
    case 'elephant':
      return tube('M124,212 Q144,222 144,236', 4);
    default:
      return null;
  }
}

/* ------------------------------------------------------------------ ตัวละคร */
export function CharArt({ look, viewBox = '0 0 200 300', className, title }: { look: CharLook; viewBox?: string; className?: string; title?: string }) {
  const L = look;
  const skin = L.skin;
  const sp = L.species;
  const animal = sp !== 'human';
  const frog = sp === 'frog';
  const has = (a: string) => L.accs.includes(a);
  const held = L.accs.find((a) => ['book', 'pencil', 'flask', 'star', 'ball'].includes(a));
  const dress = L.top === 'dress';
  const long = LONG_SLEEVE.includes(L.top);
  const sleeve = L.top === 'labcoat' ? '#ffffff' : L.top === 'overall' ? L.topColor2 : L.topColor;

  // แขน: ไหล่ซ้าย/ขวา (ซ้ายของจอ = แขน L)
  const la = limb([75, 158], -1, L.l, 33, 30);
  const ra = limb([125, 158], 1, L.r, 33, 30);
  const [lp, rp] = LEG_POSE[L.legs] || LEG_POSE.stand;
  const ll = limb([88, 214], -1, lp, 35, 33);
  const rl = limb([112, 214], 1, rp, 35, 33);

  const drawArm = (a: ReturnType<typeof limb>, k: string) => {
    const end = long ? a.h : lerp(a.s, a.e, 0.62);
    const sleevePts: P[] = long ? [a.s, a.e, lerp(a.e, a.h, 0.82)] : [a.s, end];
    return (
      <g key={k}>
        <path d={line(a.s, a.e, a.h)} {...stroke(19, O)} />
        <path d={line(...sleevePts)} {...stroke(22, O)} />
        <path d={line(a.s, a.e, a.h)} {...stroke(13, skin)} />
        <path d={line(...sleevePts)} {...stroke(16, sleeve)} />
        <circle cx={a.h[0]} cy={a.h[1]} r="8.5" fill={skin} stroke={O} strokeWidth="3" />
      </g>
    );
  };

  const pantsLen = L.bottom === 'pants' && !dress ? 1 : L.bottom === 'shorts' && !dress ? 0.55 : 0;
  const drawLeg = (g: ReturnType<typeof limb>, side: -1 | 1, k: string) => {
    const covered: P[] = pantsLen === 1 ? [g.s, g.e, lerp(g.e, g.h, 0.9)] : pantsLen ? [g.s, lerp(g.s, g.e, pantsLen)] : [];
    const shoe: P = [g.h[0] + side * 4, g.h[1] + 3];
    const boots = L.shoes === 'boots';
    return (
      <g key={k}>
        <path d={line(g.s, g.e, g.h)} {...stroke(21, O)} />
        {covered.length > 0 && <path d={line(...covered)} {...stroke(24, O)} />}
        <path d={line(g.s, g.e, g.h)} {...stroke(15, skin)} />
        {covered.length > 0 && <path d={line(...covered)} {...stroke(18, L.bottomColor)} />}
        {boots && <path d={line(lerp(g.e, g.h, 0.45), g.h)} {...stroke(17, L.shoesColor)} />}
        {L.shoes === 'sandals' ? (
          <g>
            <ellipse cx={shoe[0]} cy={shoe[1] + 2} rx="13" ry="5" fill={L.shoesColor} stroke={O} strokeWidth="3" />
            <path d={`M${shoe[0] - 6},${shoe[1]} Q${shoe[0]},${shoe[1] - 7} ${shoe[0] + 6},${shoe[1]}`} {...stroke(3, O)} />
          </g>
        ) : (
          <g>
            <path
              d={`M${shoe[0] - 12},${shoe[1] + 5} Q${shoe[0] - 13},${shoe[1] - 8} ${shoe[0]},${shoe[1] - 8} Q${shoe[0] + 14},${shoe[1] - 8} ${shoe[0] + 15},${shoe[1] + 5} Z`}
              fill={L.shoesColor}
              stroke={O}
              strokeWidth="3"
              strokeLinejoin="round"
            />
            {L.shoes === 'sneakers' && <path d={`M${shoe[0] - 12},${shoe[1] + 2} H${shoe[0] + 14}`} {...stroke(3, '#ffffff')} />}
          </g>
        )}
      </g>
    );
  };

  const torso = 'M70,158 Q70,146 84,145 L116,145 Q130,146 130,158 L128,216 L72,216 Z';
  const face = L.face === 'oval' ? { rx: 50, ry: 57 } : L.face === 'chubby' ? { rx: 58, ry: 52 } : { rx: 54, ry: 54 };

  return (
    <svg viewBox={viewBox} className={className} preserveAspectRatio="xMidYMid meet" aria-hidden={title ? undefined : true} style={{ overflow: viewBox === '0 0 200 300' ? 'visible' : 'hidden' }}>
      {title && <title>{title}</title>}
      {animal && <Tail sp={sp} c={skin} c2={L.fur2} />}
      {hairBack(L.hair, L.hairColor)}
      {has('backpack') && <rect x="62" y="150" width="76" height="66" rx="14" fill={L.accColor} stroke={O} strokeWidth="3.5" />}

      {drawLeg(ll, -1, 'll')}
      {drawLeg(rl, 1, 'rl')}

      {/* กางเกง/กระโปรง (ส่วนสะโพก) */}
      {!dress && (L.bottom === 'skirt' || L.bottom === 'pleated') ? (
        <g>
          <path d="M73,206 L127,206 L140,252 Q100,260 60,252 Z" fill={L.bottomColor} stroke={O} strokeWidth="3.5" strokeLinejoin="round" />
          {L.bottom === 'pleated' && <path d="M86,212 L80,254 M100,212 L100,256 M114,212 L120,254" {...stroke(2.5, '#00000033')} />}
        </g>
      ) : !dress ? (
        <path d="M72,206 L128,206 L131,232 L69,232 Z" fill={L.bottomColor} stroke={O} strokeWidth="3.5" strokeLinejoin="round" />
      ) : null}

      {/* คอ */}
      <rect x="91" y="130" width="18" height="22" rx="6" fill={skin} stroke={O} strokeWidth="3" />

      {/* เสื้อ */}
      {L.top === 'hoodie' && <path d="M66,152 Q60,128 84,132 L116,132 Q140,128 134,152 Z" fill={L.topColor} stroke={O} strokeWidth="3.5" />}
      {dress && <path d="M74,200 L126,200 L146,262 Q100,272 54,262 Z" fill={L.topColor} stroke={O} strokeWidth="3.5" strokeLinejoin="round" />}
      <path d={torso} fill={L.top === 'labcoat' || L.top === 'overall' ? L.topColor2 : L.topColor} stroke={O} strokeWidth="3.5" strokeLinejoin="round" />
      {L.top === 'school' && (
        <g>
          <path d="M84,145 L100,160 L92,170 Z M116,145 L100,160 L108,170 Z" fill="#fff" stroke={O} strokeWidth="3" strokeLinejoin="round" />
          <path d="M100,160 V214" {...stroke(2, '#00000022')} />
          <circle cx="100" cy="182" r="2.2" fill={O} />
          <circle cx="100" cy="200" r="2.2" fill={O} />
          <path d="M95,160 L105,160 L103,166 L97,166 Z M97,166 L94,186 L100,192 L106,186 L103,166" fill={L.topColor2} stroke={O} strokeWidth="2" strokeLinejoin="round" />
          <rect x="108" y="172" width="14" height="12" rx="2" fill="none" stroke={O} strokeWidth="2" />
        </g>
      )}
      {L.top === 'hoodie' && (
        <g>
          <path d="M80,190 H120 L116,212 H84 Z" fill="none" stroke={O} strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M94,148 V168 M106,148 V168" {...stroke(2.5, O)} />
        </g>
      )}
      {L.top === 'sweater' && (
        <g>
          <path d="M71,176 H129 M71,192 H129" {...stroke(8, L.topColor2)} />
          <path d="M84,145 Q100,156 116,145" fill="none" stroke={O} strokeWidth="3" />
        </g>
      )}
      {L.top === 'labcoat' && (
        <g>
          <path d="M70,158 Q70,146 84,145 L96,145 L94,216 L72,216 Z M130,158 Q130,146 116,145 L104,145 L106,216 L128,216 Z" fill="#ffffff" stroke={O} strokeWidth="3" strokeLinejoin="round" />
          <path d="M84,145 L96,172 L90,176 Z M116,145 L104,172 L110,176 Z" fill="#e5e7eb" stroke={O} strokeWidth="2.5" strokeLinejoin="round" />
          <rect x="110" y="186" width="13" height="10" rx="2" fill="none" stroke={O} strokeWidth="2" />
          <path d="M113,186 V178" {...stroke(2.5, '#3b82f6')} />
        </g>
      )}
      {dress && <path d="M72,198 H128" {...stroke(7, L.topColor2)} />}
      {L.top === 'overall' && (
        <g>
          <path d="M80,172 H120 V216 H80 Z" fill={L.bottomColor} stroke={O} strokeWidth="3" />
          <path d="M80,174 L76,148 M120,174 L124,148" {...stroke(6, L.bottomColor)} />
          <circle cx="84" cy="176" r="2.5" fill="#ffd166" stroke={O} strokeWidth="1.5" />
          <circle cx="116" cy="176" r="2.5" fill="#ffd166" stroke={O} strokeWidth="1.5" />
          <rect x="92" y="184" width="16" height="12" rx="2" fill="none" stroke={O} strokeWidth="2" />
        </g>
      )}
      {L.top === 'teacher' && (
        <g>
          <path d="M84,145 L100,158 L116,145" fill="none" stroke={O} strokeWidth="3" />
          <path d="M100,158 L88,152 L88,166 Z M100,158 L112,152 L112,166 Z" fill={L.topColor2} stroke={O} strokeWidth="2.5" strokeLinejoin="round" />
          <circle cx="100" cy="159" r="3.5" fill={L.topColor2} stroke={O} strokeWidth="2" />
        </g>
      )}
      {(L.top === 'tshirt' || dress) && <path d="M86,145 Q100,155 114,145" fill="none" stroke={O} strokeWidth="3" />}
      {has('backpack') && <path d="M78,150 L82,206 M122,150 L118,206" {...stroke(5, L.accColor)} />}

      {/* เปียด้านหน้า */}
      {L.hair === 'braids' && (
        <g>
          {[56, 144].map((x) => (
            <g key={x}>
              {[0, 1, 2, 3].map((i) => (
                <ellipse key={i} cx={x} cy={112 + i * 18} rx="9" ry="11" fill={L.hairColor} stroke={O} strokeWidth="3" />
              ))}
              <path d={`M${x - 6},${186} H${x + 6}`} {...stroke(5, L.accColor)} />
            </g>
          ))}
        </g>
      )}

      {drawArm(la, 'la')}
      {held && <Held id={held} at={ra.h} c={L.accColor} />}
      {drawArm(ra, 'ra')}

      {/* หัว (สัตว์: หู/แผงคอหลังหัว แทนหูคน) */}
      {animal ? (
        <AnimalBack sp={sp} c={skin} c2={L.fur2} />
      ) : (
        <>
          <circle cx={100 - face.rx + 2} cy="94" r="10" fill={skin} stroke={O} strokeWidth="3" />
          <circle cx={100 + face.rx - 2} cy="94" r="10" fill={skin} stroke={O} strokeWidth="3" />
        </>
      )}
      <ellipse cx="100" cy="88" rx={face.rx} ry={face.ry} fill={skin} stroke={O} strokeWidth="3.5" />
      {animal && <AnimalFace sp={sp} c={skin} c2={L.fur2} />}
      {L.blush && (
        <g>
          <ellipse cx="68" cy="112" rx="8" ry="5" fill="#ff8fab" opacity="0.55" />
          <ellipse cx="132" cy="112" rx="8" ry="5" fill="#ff8fab" opacity="0.55" />
        </g>
      )}
      {/* กบ: ตาอยู่บนตาโปนด้านบนหัว */}
      <g transform={frog ? 'translate(0 -52)' : undefined}>
        <Eyes id={L.eyes} />
        <Brows id={L.brows} c={animal && L.hair === 'bald' ? shade(skin, -0.5) : L.hair === 'bald' ? '#6b4a33' : L.hairColor === '#f2f2f2' ? '#8a8a8a' : L.hairColor} />
      </g>
      {!NO_MOUTH.includes(sp) && <Mouth id={L.mouth} />}
      {animal && <AnimalFront sp={sp} c={skin} c2={L.fur2} />}
      {!(animal && L.hair === 'bald') && hairFront(L.hair, L.hairColor)}
      {L.hair === 'ponytail' && <circle cx="148" cy="66" r="6" fill={L.accColor} stroke={O} strokeWidth="2.5" />}
      {L.hair === 'twintails' && (
        <>
          <circle cx="52" cy="92" r="6" fill={L.accColor} stroke={O} strokeWidth="2.5" />
          <circle cx="148" cy="92" r="6" fill={L.accColor} stroke={O} strokeWidth="2.5" />
        </>
      )}

      {/* แว่น */}
      {has('glasses') && (
        <g fill="none" stroke={O} strokeWidth="3">
          <circle cx="78" cy="98" r="13" fill="#ffffff33" />
          <circle cx="122" cy="98" r="13" fill="#ffffff33" />
          <path d="M91,97 Q100,92 109,97" />
        </g>
      )}
      {has('squares') && (
        <g fill="#ffffff33" stroke={O} strokeWidth="3">
          <rect x="63" y="88" width="30" height="21" rx="5" />
          <rect x="107" y="88" width="30" height="21" rx="5" />
          <path d="M93,96 H107" fill="none" />
        </g>
      )}
      {has('sunglasses') && (
        <g stroke={O} strokeWidth="3">
          <path d="M62,90 H94 Q94,110 78,110 Q62,110 62,90 Z M106,90 H138 Q138,110 122,110 Q106,110 106,90 Z" fill="#1f2937" />
          <path d="M94,93 H106" fill="none" />
          <path d="M70,95 L76,95" stroke="#ffffff88" strokeWidth="2.5" />
        </g>
      )}

      {/* ที่ผม / หมวก */}
      {has('headband') && <path d="M50,70 Q100,26 150,70" {...stroke(9, L.accColor)} />}
      {has('headphones') && (
        <g>
          <path d="M44,90 Q44,26 100,26 Q156,26 156,90" {...stroke(7, O)} />
          <rect x="34" y="80" width="18" height="28" rx="8" fill={L.accColor} stroke={O} strokeWidth="3" />
          <rect x="148" y="80" width="18" height="28" rx="8" fill={L.accColor} stroke={O} strokeWidth="3" />
        </g>
      )}
      {has('bow') && (
        <g transform="translate(140 46) rotate(15)">
          <path d="M0,0 L-18,-11 L-18,11 Z M0,0 L18,-11 L18,11 Z" fill={L.accColor} stroke={O} strokeWidth="3" strokeLinejoin="round" />
          <circle r="5" fill={L.accColor} stroke={O} strokeWidth="2.5" />
        </g>
      )}
      {has('flower') && (
        <g transform="translate(150 66)">
          {[0, 72, 144, 216, 288].map((a) => (
            <ellipse key={a} cx="0" cy="-8" rx="5.5" ry="8" fill={L.accColor} stroke={O} strokeWidth="2" transform={`rotate(${a})`} />
          ))}
          <circle r="4.5" fill="#ffd166" stroke={O} strokeWidth="2" />
        </g>
      )}
      {has('cap') && (
        <g>
          <path d="M46,66 C48,22 152,22 154,66 Z" fill={L.accColor} stroke={O} strokeWidth="3.5" strokeLinejoin="round" />
          <path d="M100,60 L172,64 Q180,72 160,74 L100,70 Z" fill={L.accColor} stroke={O} strokeWidth="3.5" strokeLinejoin="round" />
          <circle cx="100" cy="27" r="4" fill={O} />
        </g>
      )}
      {has('beanie') && (
        <g>
          <path d="M44,72 C44,18 156,18 156,72 Z" fill={L.accColor} stroke={O} strokeWidth="3.5" />
          <rect x="40" y="60" width="120" height="18" rx="8" fill={L.accColor} stroke={O} strokeWidth="3.5" />
          <path d="M56,62 V76 M72,62 V76 M88,62 V76 M104,62 V76 M120,62 V76 M136,62 V76" {...stroke(2, '#00000033')} />
          <circle cx="100" cy="18" r="10" fill="#fff" stroke={O} strokeWidth="3" />
        </g>
      )}
      {has('gradcap') && (
        <g>
          <path d="M60,46 Q100,58 140,46 L140,60 Q100,72 60,60 Z" fill="#2a2350" stroke={O} strokeWidth="3" />
          <path d="M100,14 L172,34 L100,54 L28,34 Z" fill="#2a2350" stroke={O} strokeWidth="3" strokeLinejoin="round" />
          <path d="M100,34 L150,44 L152,72" {...stroke(3, L.accColor)} />
          <circle cx="152" cy="74" r="5" fill={L.accColor} />
        </g>
      )}
      {has('crown') && <path d="M62,48 L66,16 L84,34 L100,10 L116,34 L134,16 L138,48 Z" fill="#ffd166" stroke={O} strokeWidth="3.5" strokeLinejoin="round" />}
    </svg>
  );
}
