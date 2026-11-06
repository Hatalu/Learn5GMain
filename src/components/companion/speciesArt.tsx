import React from 'react';
import type { Species } from '@/lib/pet/species';

/** ชิ้นส่วนสัตว์วาดบนตัวเดียวกับ Buddy (200x220) ชุดเดิมจึงใส่ได้ทุกชนิด */
const INK = '#2a2740';
type Pal = Pick<Species, 'body' | 'dark' | 'light'>;

const mirror = (el: React.ReactNode) => <g transform="matrix(-1 0 0 1 200 0)">{el}</g>;
const both = (el: React.ReactNode) => <>{el}{mirror(el)}</>;

export function SpeciesTail({ s }: { s: Species }) {
  const f = { fill: s.body, stroke: s.dark, strokeWidth: 4, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
  switch (s.tail) {
    case 'long': return <path className="bd-tail" d="M160 176 Q196 176 190 136 Q188 124 180 130 Q182 158 156 160 Z" {...f} />;
    case 'bushy': return <g className="bd-tail"><path d="M156 178 Q204 186 196 126 Q170 124 152 156 Z" {...f} /><path d="M196 126 Q182 124 172 134 Q188 146 197 142 Z" fill="#fff" stroke={s.dark} strokeWidth="3" /></g>;
    case 'puff': return <circle className="bd-tail" cx="168" cy="172" r="17" fill={s.ears === 'panda' ? s.dark : '#fff'} stroke={s.dark} strokeWidth="4" />;
    case 'curl': return <path className="bd-tail" d="M160 172 Q186 176 186 156 Q186 142 174 146 Q166 152 176 158" fill="none" stroke={s.dark} strokeWidth="9" strokeLinecap="round" />;
    case 'stripe': return <g className="bd-tail"><path d="M158 178 Q198 178 192 134" fill="none" stroke={s.dark} strokeWidth="16" strokeLinecap="round" /><path d="M158 178 Q198 178 192 134" fill="none" stroke={s.body} strokeWidth="9" strokeLinecap="round" /><path d="M176 170 l8 7 M187 156 l9 3 M191 143 l9 0" stroke={s.dark} strokeWidth="5" strokeLinecap="round" /></g>;
    case 'tuft': return <g className="bd-tail"><path d="M158 178 Q192 180 188 146" fill="none" stroke={s.dark} strokeWidth="6" strokeLinecap="round" /><circle cx="188" cy="138" r="13" fill="#c9792b" stroke={s.dark} strokeWidth="3" /></g>;
    case 'dino': return <g className="bd-tail"><path d="M152 150 Q206 156 206 196 Q176 196 148 188 Z" {...f} /><path d="M176 154 l6 -12 6 16 M192 164 l10 -10 2 20" fill={s.light} stroke={s.dark} strokeWidth="3" strokeLinejoin="round" /></g>;
    case 'arrow': return <g className="bd-tail"><path d="M156 178 Q196 182 192 146" fill="none" stroke={s.dark} strokeWidth="9" strokeLinecap="round" /><path d="M192 118 L206 148 L178 148 Z" fill={s.light} stroke={s.dark} strokeWidth="4" strokeLinejoin="round" /></g>;
    case 'shell': return <g><ellipse cx="100" cy="134" rx="86" ry="72" fill="#7fb069" stroke="#3f7a3a" strokeWidth="5" /><path d="M24 118 L58 96 M176 118 L142 96 M20 150 H42 M180 150 H158" stroke="#3f7a3a" strokeWidth="5" strokeLinecap="round" /></g>;
    case 'wings': return both(<path className="bd-wing" d="M40 112 Q2 124 8 162 Q30 160 44 146 Z" fill={s.dark} stroke={s.dark} strokeWidth="3" strokeLinejoin="round" />);
    case 'wool': return <circle className="bd-tail" cx="170" cy="168" r="16" fill="#fff" stroke={s.dark} strokeWidth="4" />;
    default: return null;
  }
}

export function SpeciesEars({ s }: { s: Species }) {
  const f = { fill: s.body, stroke: s.dark, strokeWidth: 4, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
  const inner = { fill: s.light };
  const pair = (el: React.ReactNode) => <g className="bd-ears">{both(el)}</g>;
  switch (s.ears) {
    case 'round': return pair(<><circle cx="52" cy="64" r="19" {...f} /><circle cx="52" cy="64" r="9" {...inner} /></>);
    case 'cat': return pair(<><path d="M46 80 L40 20 L90 48 Z" {...f} /><path d="M52 66 L49 35 L76 50 Z" {...inner} /></>);
    case 'fox': return pair(<><path d="M42 84 L28 12 L92 48 Z" {...f} /><path d="M28 12 L33 34 L49 28 Z" fill={s.dark} /><path d="M50 66 L42 36 L74 50 Z" {...inner} /></>);
    case 'flop': return pair(<path d="M56 50 Q20 44 14 90 Q14 120 34 120 Q46 104 54 76 Z" fill={s.dark} stroke={s.dark} strokeWidth="4" strokeLinejoin="round" />);
    case 'long': return pair(<g transform="rotate(-10 72 50)"><ellipse cx="70" cy="18" rx="17" ry="42" {...f} /><ellipse cx="70" cy="20" rx="8" ry="30" {...inner} /></g>);
    case 'koala': return pair(<><circle cx="36" cy="66" r="31" {...f} /><circle cx="38" cy="68" r="17" {...inner} /></>);
    case 'panda': return pair(<circle cx="52" cy="60" r="20" fill={s.dark} stroke={s.dark} strokeWidth="4" />);
    case 'mouse': return pair(<><circle cx="46" cy="58" r="25" {...f} /><circle cx="46" cy="58" r="14" fill="#ffc2d1" /></>);
    case 'pig': return pair(<path d="M52 66 L44 28 L84 44 Q70 62 52 66 Z" {...f} />);
    case 'cow': return <><g className="bd-ears">{both(<><path d="M76 44 Q68 22 76 12 Q86 26 88 40 Z" fill="#f2e3c6" stroke={s.dark} strokeWidth="3" strokeLinejoin="round" /><ellipse cx="32" cy="74" rx="24" ry="12" transform="rotate(-14 32 74)" {...f} /><ellipse cx="32" cy="74" rx="13" ry="6" transform="rotate(-14 32 74)" {...inner} /></>)}</g></>;
    case 'sheep': return <>{[[50, 60], [70, 40], [100, 32], [130, 40], [150, 60]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="21" fill="#fff" stroke={s.dark} strokeWidth="3.5" />)}<g className="bd-ears">{both(<ellipse cx="26" cy="96" rx="19" ry="10" transform="rotate(20 26 96)" fill={s.dark} />)}</g></>;
    case 'elephant': return pair(<><path d="M58 60 Q2 30 -6 92 Q-4 146 44 134 Z" {...f} /><path d="M46 76 Q12 58 8 96 Q8 122 38 118 Z" {...inner} /></>);
    case 'monkey': return pair(<><circle cx="26" cy="98" r="23" {...f} /><circle cx="26" cy="98" r="13" {...inner} /></>);
    case 'lion': return <>{Array.from({ length: 16 }, (_, i) => { const a = (i / 16) * Math.PI * 2; return <circle key={i} cx={100 + 76 * Math.cos(a)} cy={102 + 72 * Math.sin(a)} r="22" fill="#d9822b" stroke="#a65d14" strokeWidth="3.5" />; })}<g className="bd-ears">{both(<circle cx="50" cy="56" r="14" {...f} />)}</g></>;
    case 'frog': return pair(<><circle cx="66" cy="50" r="23" {...f} /><circle cx="66" cy="48" r="13" fill="#fff" /><circle cx="68" cy="50" r="6.5" fill={INK} /></>);
    case 'tuft': return <g className="bd-ears"><path d="M100 42 Q90 18 78 20 Q90 28 92 42 M100 42 Q100 12 110 10 Q104 26 108 42 M104 44 Q118 22 128 28 Q116 32 112 46" fill={s.body} stroke={s.dark} strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" /></g>;
    case 'owl': return pair(<path d="M52 72 L38 22 L88 46 Z" fill={s.dark} stroke={s.dark} strokeWidth="4" strokeLinejoin="round" />);
    case 'dino': return <g className="bd-ears">{[[64, 40, 22], [84, 30, 26], [100, 26, 30], [116, 30, 26], [136, 40, 22]].map(([x, y, h]) => <path key={x} d={`M${x - 12} ${y + 12} L${x} ${y - h + 6} L${x + 12} ${y + 12} Z`} fill={s.light} stroke={s.dark} strokeWidth="4" strokeLinejoin="round" />)}</g>;
    case 'dragon': return <g className="bd-ears">{both(<><path d="M70 46 Q50 22 56 2 Q78 16 88 40 Z" fill="#ffe08a" stroke={s.dark} strokeWidth="4" strokeLinejoin="round" /><path d="M42 80 L6 58 L14 92 Z" {...f} /></>)}</g>;
    case 'deer': return <>{pair(<ellipse cx="36" cy="82" rx="24" ry="12" transform="rotate(-20 36 82)" {...f} />)}<g fill="none" stroke="#8a5a2b" strokeWidth="7" strokeLinecap="round"><path d="M72 46 L58 8 M64 26 L42 22 M60 14 L68 -6" /><path d="M128 46 L142 8 M136 26 L158 22 M140 14 L132 -6" /></g></>;
    case 'giraffe': return <>{pair(<ellipse cx="36" cy="80" rx="22" ry="11" transform="rotate(-20 36 80)" {...f} />)}{[78, 122].map((x) => <g key={x}><path d={`M${x} 46 V14`} stroke={s.dark} strokeWidth="9" strokeLinecap="round" /><circle cx={x} cy="10" r="9" fill={s.dark} /></g>)}</>;
    case 'horse': return <>{pair(<path d="M60 58 L46 16 L84 42 Z" {...f} />)}<path d="M100 28 Q78 24 74 50 Q88 44 94 58 Q100 46 106 58 Q112 44 126 50 Q122 24 100 28 Z" fill={s.dark} stroke={s.dark} strokeWidth="3" strokeLinejoin="round" /></>;
    case 'antenna': return <g className="bd-ears">{both(<><path d="M82 44 Q72 18 56 10" fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round" /><circle cx="54" cy="9" r="8" fill={INK} /></>)}</g>;
    case 'spike': return <g>{Array.from({ length: 11 }, (_, i) => { const a = Math.PI + ((i + 0.5) / 11) * Math.PI; const x = 100 + 78 * Math.cos(a); const y = 96 + 72 * Math.sin(a); const dx = 26 * Math.cos(a); const dy = 26 * Math.sin(a); return <path key={i} d={`M${x - dy / 2} ${y + dx / 2} L${x + dx} ${y + dy} L${x + dy / 2} ${y - dx / 2} Z`} fill={s.dark} stroke={s.dark} strokeWidth="3" strokeLinejoin="round" />; })}</g>;
    case 'fin': return <path d="M78 42 Q100 -8 128 -2 Q118 18 122 42 Z" {...f} />;
    case 'unicorn': return <><path d="M88 42 L100 -8 L112 42 Z" fill="#ffd84a" stroke="#c99a1c" strokeWidth="4" strokeLinejoin="round" /><path d="M92 28 L108 22 M94 14 L105 10" stroke="#c99a1c" strokeWidth="3" /><path d="M116 42 Q168 34 170 96 Q152 76 136 68 Q140 56 116 54 Z" fill="#ff9fd2" stroke="#d464a8" strokeWidth="3.5" strokeLinejoin="round" /><g className="bd-ears">{both(<path d="M56 62 L50 28 L80 46 Z" {...f} />)}</g></>;
    default: return null;
  }
}

/** ลายบนตัว ถูกตัดตามรูปตัว */
export function SpeciesMark({ s }: { s: Species }) {
  switch (s.mark) {
    case 'stripes': return <path d="M100 38 V62 M72 44 L78 66 M128 44 L122 66 M32 112 H56 M168 112 H144 M32 136 H52 M168 136 H148 M38 164 H58 M162 164 H142" stroke={INK} strokeWidth="8" strokeLinecap="round" />;
    case 'patches': return <g fill="#55504a"><path d="M100 30 Q150 30 176 90 Q150 96 132 74 Q112 56 100 30 Z" /><ellipse cx="46" cy="164" rx="30" ry="22" /><ellipse cx="146" cy="176" rx="22" ry="16" /></g>;
    case 'belly': return <ellipse cx="100" cy="146" rx="48" ry="46" fill={s.light} />;
    case 'spots': return <g fill={s.dark} opacity=".55"><circle cx="58" cy="76" r="8" /><circle cx="140" cy="70" r="6" /><circle cx="44" cy="150" r="7" /><circle cx="158" cy="146" r="8" /></g>;
    default: return null;
  }
}

/** ใต้ตาและปาก: ลายรอบตา ปากกระบอก */
export function SpeciesUnder({ s }: { s: Species }) {
  const cheek = s.nose === 'bear' || s.nose === 'dog' || s.nose === 'monkey';
  return (
    <>
      {s.mark === 'eyes' && both(<ellipse cx="76" cy="106" rx="24" ry="27" transform="rotate(12 76 106)" fill={s.ears === 'owl' ? s.light : s.dark} />)}
      {s.mark === 'mask' && <path d="M38 92 Q100 72 162 92 Q168 122 128 124 Q108 122 100 110 Q92 122 72 124 Q32 122 38 92 Z" fill={s.dark} />}
      {s.nose === 'monkey' && <path d="M46 104 Q60 66 90 84 Q100 90 110 84 Q140 66 154 104 Q164 164 100 168 Q36 164 46 104 Z" fill={s.light} />}
      {cheek && s.nose !== 'monkey' && <ellipse cx="100" cy="138" rx="34" ry="26" fill={s.light} />}
    </>
  );
}

/** ทับปาก: จมูก จะงอย งวง */
export function SpeciesOver({ s }: { s: Species }) {
  const line = { stroke: INK, strokeWidth: 3, strokeLinecap: 'round' as const };
  switch (s.nose) {
    case 'cat': return <><path d="M92 124 H108 L100 134 Z" fill="#ff7a9c" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />{both(<path d="M60 128 L34 122 M60 138 L32 140" {...line} />)}</>;
    case 'dog': case 'bear': return <ellipse cx="100" cy="126" rx="11" ry="8" fill={INK} />;
    case 'monkey': return <>{both(<circle cx="94" cy="128" r="2.6" fill={INK} />)}</>;
    case 'snout': return <><ellipse cx="100" cy="128" rx="20" ry="14" fill={s.ears === 'cow' ? '#ffb3c7' : s.light} stroke={s.dark} strokeWidth="3.5" />{both(<ellipse cx="92" cy="128" rx="3.5" ry="5" fill={INK} />)}</>;
    case 'beak': return <path d="M84 122 H116 L100 142 Z" fill="#ff9f1c" stroke={INK} strokeWidth="3" strokeLinejoin="round" />;
    case 'bill': return <path d="M72 124 Q100 110 128 124 Q134 138 100 142 Q66 138 72 124 Z" fill="#ff9f1c" stroke={INK} strokeWidth="3" strokeLinejoin="round" />;
    case 'trunk': return <path className="bd-trunk" d="M86 118 Q100 110 114 118 Q116 160 106 178 Q98 192 80 184 Q74 176 84 172 Q92 176 92 164 Q88 140 86 118 Z" fill={s.body} stroke={s.dark} strokeWidth="4" strokeLinejoin="round" />;
    default: return null;
  }
}
