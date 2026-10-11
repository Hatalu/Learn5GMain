/**
 * ภาพประกอบเคลื่อนไหว (SVG ล้วน) สำหรับสไลด์ป้ายหน้าแรก
 * ทุกการเคลื่อนไหวใช้ CSS animation จึงหยุดเองเมื่อผู้ใช้ตั้งค่า "ลดการเคลื่อนไหว"
 */
import React from 'react';

const DISPLAY_FONT = { fontFamily: 'var(--font-mitr), sans-serif' } as const;

/** ดาว 4 แฉก */
export function Spark({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} aria-hidden="true">
      <path
        d="M12 0c.9 6.2 2.8 8.9 12 12-9.2 3.1-11.1 5.8-12 12-.9-6.2-2.8-8.9-12-12C9.2 8.9 11.1 6.2 12 0z"
        fill="currentColor"
      />
    </svg>
  );
}

/** ลายจุด + ดาวกระพริบ ใช้เป็นฉากหลังร่วมของทุกสไลด์ */
export function HeroDecor() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      <div
        className="absolute inset-0 opacity-[0.13]"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1.2px, transparent 0)',
          backgroundSize: '26px 26px',
        }}
      />
      <div className="hero-parallax-deep absolute inset-0">
        <Spark className="absolute top-[12%] left-[46%] w-5 h-5 text-white/80 animate-twinkle" />
        <Spark className="absolute top-[70%] left-[38%] w-3 h-3 text-white/70 animate-twinkle [animation-delay:1.1s]" />
        <Spark className="absolute top-[22%] right-[6%] w-4 h-4 text-white/80 animate-twinkle [animation-delay:2s]" />
        <Spark className="absolute bottom-[18%] right-[40%] w-4 h-4 text-sun-300 animate-twinkle [animation-delay:0.6s]" />
      </div>
      <div className="absolute -top-32 -left-24 w-96 h-96 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute -bottom-40 right-[-10%] w-[30rem] h-[30rem] rounded-full bg-black/20 blur-3xl" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Slide 1: ดาวเคราะห์ 5G และดวงจันทร์ประจำวิชาโคจรรอบ                  */
/* ------------------------------------------------------------------ */

function Moon({
  cx,
  cy,
  r,
  color,
  label,
  counterClass,
}: {
  cx: number;
  cy: number;
  r: number;
  color: string;
  label: string;
  counterClass: string;
}) {
  return (
    <g className={counterClass} style={{ transformOrigin: `${cx}px ${cy}px` }}>
      <circle cx={cx} cy={cy} r={r + 7} fill={color} opacity="0.25" />
      <circle cx={cx} cy={cy} r={r} fill={color} stroke="#fff" strokeWidth="4" />
      <text
        x={cx}
        y={cy + r * 0.38}
        textAnchor="middle"
        fontSize={r * 1.05}
        fontWeight="600"
        fill="#fff"
        style={DISPLAY_FONT}
      >
        {label}
      </text>
    </g>
  );
}

export function OrbitArt() {
  return (
    <svg viewBox="0 0 400 400" className="w-full h-full overflow-visible" aria-hidden="true">
      <defs>
        <radialGradient id="oa-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#ffd25e" stopOpacity="0.6" />
          <stop offset="1" stopColor="#ffd25e" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="oa-planet" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffe08a" />
          <stop offset="1" stopColor="#f5a50f" />
        </linearGradient>
      </defs>

      <circle cx="200" cy="200" r="160" fill="url(#oa-glow)" className="animate-pulse" />
      <circle cx="200" cy="200" r="130" fill="none" stroke="#fff" strokeOpacity="0.3" strokeWidth="2" strokeDasharray="4 10" />
      <circle cx="200" cy="200" r="178" fill="none" stroke="#fff" strokeOpacity="0.2" strokeWidth="2" strokeDasharray="2 12" />

      {/* ดาวเคราะห์กลาง */}
      <g className="animate-float-slow">
        <ellipse cx="200" cy="200" rx="118" ry="26" fill="none" stroke="#fff" strokeOpacity="0.45" strokeWidth="7" transform="rotate(-18 200 200)" />
        <circle cx="200" cy="200" r="78" fill="url(#oa-planet)" />
        <circle cx="170" cy="168" r="20" fill="#fff" fillOpacity="0.35" />
        <circle cx="236" cy="236" r="9" fill="#f5a50f" fillOpacity="0.7" />
        <text x="200" y="216" textAnchor="middle" fontSize="56" fontWeight="600" fill="#271358" style={DISPLAY_FONT}>
          5G
        </text>
        <path d="M82 200 A118 26 0 0 0 318 200" fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round" transform="rotate(-18 200 200)" />
      </g>

      {/* วงโคจรใน */}
      <g className="animate-[spin_22s_linear_infinite]" style={{ transformOrigin: '200px 200px' }}>
        <Moon cx={330} cy={200} r={24} color="#2fd196" label="+" counterClass="animate-[spin_22s_linear_infinite_reverse]" />
      </g>

      {/* วงโคจรนอก */}
      <g className="animate-[spin_34s_linear_infinite_reverse]" style={{ transformOrigin: '200px 200px' }}>
        <Moon cx={200} cy={22} r={22} color="#f53d9b" label="A" counterClass="animate-[spin_34s_linear_infinite]" />
        <Moon cx={46} cy={290} r={20} color="#2eb4f5" label="S" counterClass="animate-[spin_34s_linear_infinite]" />
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* คณิตศาสตร์: นาฬิกาเข็มหมุน + บล็อกตัวเลขลอย                          */
/* ------------------------------------------------------------------ */

function Tile({
  x,
  y,
  size,
  color,
  text,
  textColor = '#fff',
  rotate = 0,
  delay = '0s',
  float = 'animate-float',
}: {
  x: number;
  y: number;
  size: number;
  color: string;
  text: string;
  textColor?: string;
  rotate?: number;
  delay?: string;
  float?: string;
}) {
  const c = size / 2;
  return (
    <g className={float} style={{ animationDelay: delay }}>
      <g transform={`rotate(${rotate} ${x + c} ${y + c})`}>
        <rect x={x} y={y + 6} width={size} height={size} rx={size * 0.28} fill="#000" opacity="0.15" />
        <rect x={x} y={y} width={size} height={size} rx={size * 0.28} fill={color} stroke="#fff" strokeWidth="4" />
        <text x={x + c} y={y + c + size * 0.2} textAnchor="middle" fontSize={size * 0.58} fontWeight="600" fill={textColor} style={DISPLAY_FONT}>
          {text}
        </text>
      </g>
    </g>
  );
}

export function MathArt() {
  const ticks = Array.from({ length: 12 }, (_, i) => {
    const a = (i * 30 * Math.PI) / 180;
    const outer = 80;
    const inner = i % 3 === 0 ? 64 : 71;
    return (
      <line
        key={i}
        x1={200 + Math.sin(a) * outer}
        y1={205 - Math.cos(a) * outer}
        x2={200 + Math.sin(a) * inner}
        y2={205 - Math.cos(a) * inner}
        stroke="#271358"
        strokeWidth={i % 3 === 0 ? 6 : 3}
        strokeLinecap="round"
      />
    );
  });

  return (
    <svg viewBox="0 0 400 400" className="w-full h-full overflow-visible" aria-hidden="true">
      <circle cx="200" cy="205" r="150" fill="#fff" opacity="0.08" />
      <g className="animate-float-slow">
        <circle cx="200" cy="213" r="100" fill="#000" opacity="0.15" />
        <circle cx="200" cy="205" r="100" fill="#fff" stroke="#17b07a" strokeWidth="12" />
        {ticks}
        <line x1="200" y1="205" x2="200" y2="158" stroke="#271358" strokeWidth="10" strokeLinecap="round" transform="rotate(-60 200 205)" />
        <g className="animate-[spin_9s_linear_infinite]" style={{ transformOrigin: '200px 205px' }}>
          <line x1="200" y1="215" x2="200" y2="134" stroke="#df2182" strokeWidth="6" strokeLinecap="round" />
        </g>
        <circle cx="200" cy="205" r="10" fill="#271358" />
        <circle cx="200" cy="205" r="4" fill="#ffc53a" />
      </g>

      <Tile x={22} y={40} size={66} color="#ff62b3" text="2" rotate={-12} delay="0.3s" />
      <Tile x={300} y={30} size={74} color="#ffc53a" text="1" textColor="#271358" rotate={10} />
      <Tile x={318} y={262} size={62} color="#5ccbff" text="+" rotate={-8} delay="1.2s" float="animate-float-slow" />
      <Tile x={30} y={290} size={58} color="#a285ff" text="×" rotate={12} delay="0.8s" />
      <Tile x={170} y={330} size={46} color="#fff" text="=" textColor="#17b07a" delay="1.6s" float="animate-float-slow" />

      <g className="animate-float" style={{ animationDelay: '2s' }}>
        <path d="M120 12 L150 62 L90 62 Z" fill="#ffd25e" stroke="#fff" strokeWidth="4" strokeLinejoin="round" />
      </g>
      <g className="animate-float-slow" style={{ animationDelay: '0.5s' }}>
        <circle cx="352" cy="180" r="16" fill="#52e3ad" stroke="#fff" strokeWidth="4" />
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* วิทยาศาสตร์: อะตอมหมุน + ฟองอากาศ                                   */
/* ------------------------------------------------------------------ */

export function ScienceArt() {
  const orbits = [0, 60, 120];
  const bubbles = [
    { cx: 60, cy: 320, r: 14, d: '0s' },
    { cx: 92, cy: 270, r: 9, d: '0.8s' },
    { cx: 330, cy: 300, r: 16, d: '0.4s' },
    { cx: 350, cy: 80, r: 10, d: '1.4s' },
    { cx: 50, cy: 90, r: 12, d: '2s' },
  ];
  return (
    <svg viewBox="0 0 400 400" className="w-full h-full overflow-visible" aria-hidden="true">
      <defs>
        <radialGradient id="sa-core" cx="35%" cy="35%" r="70%">
          <stop offset="0" stopColor="#ffc2e2" />
          <stop offset="1" stopColor="#df2182" />
        </radialGradient>
      </defs>
      <circle cx="200" cy="200" r="150" fill="#fff" opacity="0.08" />
      <g className="animate-[spin_26s_linear_infinite]" style={{ transformOrigin: '200px 200px' }}>
        {orbits.map((deg, i) => (
          <g key={deg} transform={`rotate(${deg} 200 200)`}>
            <ellipse cx="200" cy="200" rx="140" ry="48" fill="none" stroke="#fff" strokeOpacity="0.75" strokeWidth="5" />
            <circle cx={i === 1 ? 60 : 340} cy="200" r="13" fill={['#ffc53a', '#52e3ad', '#5ccbff'][i]} stroke="#fff" strokeWidth="4" />
          </g>
        ))}
      </g>
      <g className="animate-float-slow">
        <circle cx="200" cy="200" r="40" fill="url(#sa-core)" stroke="#fff" strokeWidth="5" />
        <circle cx="188" cy="188" r="9" fill="#fff" fillOpacity="0.55" />
      </g>
      {bubbles.map((b) => (
        <g key={`${b.cx}-${b.cy}`} className="animate-float" style={{ animationDelay: b.d }}>
          <circle cx={b.cx} cy={b.cy} r={b.r} fill="#fff" fillOpacity="0.18" stroke="#fff" strokeOpacity="0.8" strokeWidth="3" />
          <circle cx={b.cx - b.r * 0.35} cy={b.cy - b.r * 0.35} r={b.r * 0.25} fill="#fff" />
        </g>
      ))}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* ภาษาอังกฤษ: หนังสือเปิด + ตัวอักษรลอย + บับเบิลคำพูด                 */
/* ------------------------------------------------------------------ */

export function EnglishArt() {
  return (
    <svg viewBox="0 0 400 400" className="w-full h-full overflow-visible" aria-hidden="true">
      <circle cx="200" cy="210" r="150" fill="#fff" opacity="0.08" />

      {/* หนังสือ */}
      <g className="animate-float-slow">
        <path d="M200 296 Q135 268 62 282 L62 362 Q135 350 200 376 Z" fill="#000" opacity="0.15" transform="translate(0 8)" />
        <path d="M200 296 Q265 268 338 282 L338 362 Q265 350 200 376 Z" fill="#000" opacity="0.15" transform="translate(0 8)" />
        <path d="M200 296 Q135 268 62 282 L62 362 Q135 350 200 376 Z" fill="#fff" />
        <path d="M200 296 Q265 268 338 282 L338 362 Q265 350 200 376 Z" fill="#fff0f8" />
        <line x1="200" y1="296" x2="200" y2="376" stroke="#df2182" strokeWidth="5" strokeLinecap="round" />
        {[0, 1, 2].map((i) => (
          <g key={i} stroke="#d9ccff" strokeWidth="4" strokeLinecap="round">
            <line x1="84" y1={304 + i * 16} x2="176" y2={312 + i * 16} />
            <line x1="224" y1={312 + i * 16} x2="316" y2={304 + i * 16} />
          </g>
        ))}
      </g>

      <Tile x={52} y={128} size={76} color="#7140f0" text="A" rotate={-12} />
      <Tile x={160} y={62} size={80} color="#2fd196" text="B" rotate={4} delay="0.6s" float="animate-float-slow" />
      <Tile x={276} y={140} size={72} color="#f53d9b" text="C" rotate={12} delay="1.1s" />

      {/* บับเบิลคำพูด */}
      <g className="animate-wiggle" style={{ transformOrigin: '300px 70px' }}>
        <rect x="248" y="18" width="128" height="56" rx="22" fill="#fff" />
        <path d="M276 72 L268 94 L294 72 Z" fill="#fff" />
        <text x="312" y="55" textAnchor="middle" fontSize="24" fontWeight="600" fill="#5f2fd4" style={DISPLAY_FONT}>
          Hello!
        </text>
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Premium: มงกุฎทอง + รัศมีหมุน                                        */
/* ------------------------------------------------------------------ */

export function CrownArt() {
  const rays = Array.from({ length: 12 }, (_, i) => {
    const a1 = ((i * 30 - 6) * Math.PI) / 180;
    const a2 = ((i * 30 + 6) * Math.PI) / 180;
    const R = 220;
    return (
      <polygon
        key={i}
        points={`200,200 ${200 + Math.cos(a1) * R},${200 + Math.sin(a1) * R} ${200 + Math.cos(a2) * R},${200 + Math.sin(a2) * R}`}
        fill="#ffd25e"
        opacity={i % 2 ? 0.08 : 0.16}
      />
    );
  });

  return (
    <svg viewBox="0 0 400 400" className="w-full h-full overflow-visible" aria-hidden="true">
      <defs>
        <linearGradient id="ca-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe08a" />
          <stop offset="1" stopColor="#f5a50f" />
        </linearGradient>
        <radialGradient id="ca-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#ffc53a" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ffc53a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g className="animate-[spin_40s_linear_infinite]" style={{ transformOrigin: '200px 200px' }}>
        {rays}
      </g>
      <circle cx="200" cy="205" r="130" fill="url(#ca-glow)" className="animate-pulse" />

      <g className="animate-float-slow">
        <path d="M112 282 L96 152 L156 204 L200 116 L244 204 L304 152 L288 282 Z" fill="#000" opacity="0.2" transform="translate(0 10)" />
        <path d="M112 282 L96 152 L156 204 L200 116 L244 204 L304 152 L288 282 Z" fill="url(#ca-gold)" stroke="#fff" strokeWidth="6" strokeLinejoin="round" />
        <rect x="104" y="262" width="192" height="38" rx="12" fill="#f5a50f" stroke="#fff" strokeWidth="6" />
        <circle cx="96" cy="150" r="14" fill="#f53d9b" stroke="#fff" strokeWidth="5" />
        <circle cx="200" cy="112" r="16" fill="#2fd196" stroke="#fff" strokeWidth="5" />
        <circle cx="304" cy="150" r="14" fill="#2eb4f5" stroke="#fff" strokeWidth="5" />
        <circle cx="152" cy="281" r="8" fill="#f53d9b" />
        <circle cx="200" cy="281" r="9" fill="#7140f0" />
        <circle cx="248" cy="281" r="8" fill="#2eb4f5" />
        <path d="M140 230 Q170 200 200 222" fill="none" stroke="#fff" strokeOpacity="0.6" strokeWidth="7" strokeLinecap="round" />
      </g>

      <g className="animate-twinkle" style={{ transformOrigin: '70px 80px' }}>
        <path d="M70 52c1.6 11 5 15.8 21 21.4-16 5.6-19.4 10.4-21 21.4-1.6-11-5-15.8-21-21.4 16-5.6 19.4-10.4 21-21.4z" fill="#ffe08a" />
      </g>
      <g className="animate-twinkle" style={{ transformOrigin: '336px 300px', animationDelay: '1.3s' }}>
        <path d="M336 280c1.2 8 3.6 11.4 15 15.4-11.4 4-13.8 7.4-15 15.4-1.2-8-3.6-11.4-15-15.4 11.4-4 13.8-7.4 15-15.4z" fill="#fff" />
      </g>
    </svg>
  );
}
