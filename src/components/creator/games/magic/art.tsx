/**
 * ภาพ SVG ของ Magic Kingdom AR: นักเวท (ชาย/หญิง ชุด หมวก ไม้เท้า สีพลัง) + สัตว์เลี้ยงเวทมนตร์ 5 ชนิด
 * ใช้ทั้งหน้าแต่งตัว แผนที่ และในเกม (ห้ามอิโมจิ วาดเองทั้งหมด)
 */
import React from 'react';
import { AURAS, ROBES, SKINS, type Look, type PetId } from '@/lib/game-creator/magic/data';

const INK = '#2a1d50';

export function MageArt({ look, size = 120, casting = false, className }: { look: Look; size?: number; casting?: boolean; className?: string }) {
  const robe = ROBES[look.robe];
  const aura = AURAS[look.aura];
  const skin = SKINS[look.skin];
  const hair = look.g ? '#7a3a2a' : '#3a2a1a';
  return (
    <svg viewBox="0 0 120 140" width={size} height={(size * 140) / 120} className={className} aria-hidden="true">
      <defs>
        <radialGradient id={`mk-aura-${look.aura}`}>
          <stop offset="0%" stopColor={aura} stopOpacity="0.85" />
          <stop offset="100%" stopColor={aura} stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="60" cy="132" rx="34" ry="6" fill="#000" opacity="0.18" />
      {/* ผม (หญิง = ผมยาว) */}
      {look.g === 1 && <path d="M36 60 q-6 30 6 44 h36 q12 -14 6 -44 z" fill={hair} stroke={INK} strokeWidth="3" />}
      {/* เสื้อคลุม */}
      <path d="M60 66 L28 128 q32 8 64 0 Z" fill={robe} stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M60 70 L46 126 M60 70 L74 126" stroke="#fff" strokeOpacity="0.35" strokeWidth="2.5" />
      <circle cx="60" cy="96" r="5" fill={aura} stroke={INK} strokeWidth="2.5" />
      {look.g === 1 && <path d="M40 112 q20 8 40 0" fill="none" stroke="#fff" strokeOpacity="0.6" strokeWidth="3" />}
      {/* แขนซ้ายถือไม้เท้า */}
      <g className="mk-staff" data-cast={casting}>
        <path d="M84 92 q10 -8 12 -20" fill="none" stroke={robe} strokeWidth="9" strokeLinecap="round" />
        <path d="M84 92 q10 -8 12 -20" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.4" />
        <line x1="98" y1="112" x2="98" y2="46" stroke="#8a5a3a" strokeWidth="5" strokeLinecap="round" />
        <line x1="98" y1="112" x2="98" y2="46" stroke={INK} strokeWidth="1.5" strokeOpacity="0.5" strokeLinecap="round" />
        <circle cx="96" cy="72" r="5" fill={skin} stroke={INK} strokeWidth="2.5" />
        <circle cx="98" cy="38" r={casting ? 18 : 12} fill={`url(#mk-aura-${look.aura})`} className="mk-glow" />
        {look.staff === 0 && <path d="M98 28 l3 7 7 1 -5 5 1.5 7 -6.5 -3.5 -6.5 3.5 1.5 -7 -5 -5 7 -1 z" fill="#ffd23f" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />}
        {look.staff === 1 && <path d="M98 24 l7 12 -7 12 -7 -12 z" fill="#7fe8ff" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />}
        {look.staff === 2 && <path d="M104 30 a10 10 0 1 0 0 16 a8 8 0 1 1 0 -16 z" fill="#fff3a8" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />}
      </g>
      {/* หัว */}
      <circle cx="60" cy="56" r="20" fill={skin} stroke={INK} strokeWidth="3.5" />
      {look.g === 0 ? <path d="M41 52 q4 -12 19 -12 q15 0 19 12 q-8 -5 -19 -4 q-11 -1 -19 4z" fill={hair} /> : <path d="M40 54 q2 -14 20 -14 q18 0 20 14 q-6 -7 -12 -6 q-4 4 -8 0 q-4 4 -8 0 q-6 -1 -12 6z" fill={hair} />}
      <ellipse cx="52" cy="58" rx="3" ry="3.6" fill={INK} />
      <ellipse cx="68" cy="58" rx="3" ry="3.6" fill={INK} />
      <circle cx="53" cy="56.6" r="1.1" fill="#fff" />
      <circle cx="69" cy="56.6" r="1.1" fill="#fff" />
      <ellipse cx="46" cy="64" rx="4" ry="2.4" fill="#ff8fb5" opacity="0.7" />
      <ellipse cx="74" cy="64" rx="4" ry="2.4" fill="#ff8fb5" opacity="0.7" />
      <path d="M55 65 q5 4 10 0" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
      {/* หมวก */}
      {look.hat === 0 && (
        <g>
          <path d="M34 44 q26 -10 52 0 q-6 6 -26 6 q-20 0 -26 -6z" fill={robe} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
          <path d="M44 42 L62 4 q4 -2 6 2 L76 42 z" fill={robe} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
          <path d="M47 36 q14 4 27 0" fill="none" stroke={aura} strokeWidth="4" />
        </g>
      )}
      {look.hat === 1 && (
        <g>
          <path d="M36 44 q24 -8 48 0 q-6 5 -24 5 q-18 0 -24 -5z" fill="#3a2a6b" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
          <path d="M44 42 q2 -26 18 -32 q10 4 14 32 z" fill="#3a2a6b" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
          <path d="M58 22 l2 4 4.5 .6 -3.3 3 .8 4.5 -4 -2.2 -4 2.2 .8 -4.5 -3.3 -3 4.5 -.6z" fill="#ffd23f" />
          <circle cx="68" cy="34" r="2" fill="#fff" />
          <circle cx="52" cy="36" r="1.5" fill="#fff" />
        </g>
      )}
      {look.hat === 2 && (
        <g>
          <path d="M40 42 L42 24 L51 34 L60 18 L69 34 L78 24 L80 42 Z" fill="#ffc53a" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
          <circle cx="60" cy="33" r="3.5" fill={aura} stroke={INK} strokeWidth="2" />
          <circle cx="47" cy="37" r="2" fill="#ff6b9a" />
          <circle cx="73" cy="37" r="2" fill="#59c8ff" />
        </g>
      )}
    </svg>
  );
}

export function PetArt({ id, size = 60, className }: { id: PetId; size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 80 80" width={size} height={size} className={className} aria-hidden="true">
      <ellipse cx="40" cy="74" rx="20" ry="4" fill="#000" opacity="0.15" />
      {id === 'cat' && (
        <g stroke={INK} strokeWidth="3" strokeLinejoin="round">
          <path d="M58 58 q14 -4 10 -18" fill="none" stroke="#ffb347" strokeWidth="6" strokeLinecap="round" />
          <ellipse cx="40" cy="56" rx="18" ry="14" fill="#ffb347" />
          <path d="M22 34 L24 14 L36 26 M58 34 L56 14 L44 26" fill="#ffb347" />
          <circle cx="40" cy="36" r="17" fill="#ffb347" />
          <path d="M28 12 l3 -5 3 5 z" fill="#b85cff" strokeWidth="2" />
        </g>
      )}
      {id === 'dragon' && (
        <g stroke={INK} strokeWidth="3" strokeLinejoin="round">
          <path d="M16 40 q-10 -14 2 -22 q2 12 10 14 z M64 40 q10 -14 -2 -22 q-2 12 -10 14 z" fill="#ffd23f" />
          <ellipse cx="40" cy="56" rx="17" ry="14" fill="#3fcf7a" />
          <circle cx="40" cy="36" r="17" fill="#3fcf7a" />
          <path d="M30 22 l-2 -8 6 5 M50 22 l2 -8 -6 5" fill="#fff3c4" />
          <ellipse cx="40" cy="44" rx="8" ry="5" fill="#9ff0b0" strokeWidth="2" />
        </g>
      )}
      {id === 'fairy' && (
        <g stroke={INK} strokeWidth="3" strokeLinejoin="round">
          <ellipse cx="22" cy="34" rx="14" ry="10" fill="#bff3ff" opacity="0.9" className="mk-wing" />
          <ellipse cx="58" cy="34" rx="14" ry="10" fill="#bff3ff" opacity="0.9" className="mk-wing" />
          <path d="M40 46 L28 68 h24 z" fill="#ff8fc7" />
          <circle cx="40" cy="36" r="14" fill="#ffe0c2" />
          <path d="M26 32 q14 -16 28 0" fill="#ffd23f" />
          <circle cx="40" cy="14" r="3" fill="#fff3a8" strokeWidth="2" />
        </g>
      )}
      {id === 'phoenix' && (
        <g stroke={INK} strokeWidth="3" strokeLinejoin="round">
          <path d="M40 60 q-22 16 -30 2 q14 2 18 -8 M40 60 q22 16 30 2 q-14 2 -18 -8" fill="#ffc53a" />
          <path d="M14 36 q8 -16 18 -6 M66 36 q-8 -16 -18 -6" fill="#ff9a3d" />
          <ellipse cx="40" cy="50" rx="15" ry="14" fill="#ff6b3d" />
          <circle cx="40" cy="34" r="14" fill="#ff6b3d" />
          <path d="M34 20 q2 -12 6 -14 q2 6 0 14 M42 20 q4 -10 10 -10 q-2 6 -6 12" fill="#ffd23f" strokeWidth="2.5" />
          <path d="M37 40 l3 4 3 -4 z" fill="#ffd23f" strokeWidth="2" />
        </g>
      )}
      {id === 'unicorn' && (
        <g stroke={INK} strokeWidth="3" strokeLinejoin="round">
          <ellipse cx="40" cy="56" rx="18" ry="13" fill="#ffffff" />
          <circle cx="40" cy="36" r="16" fill="#ffffff" />
          <path d="M40 22 l-4 -18 8 18 z" fill="#ffd23f" />
          <path d="M26 26 q-6 10 0 22 q4 -8 6 -16 M28 22 q8 -6 14 0" fill="#b9a3ff" />
          <path d="M28 32 l-4 -8 8 4" fill="#ffffff" />
          <ellipse cx="40" cy="44" rx="7" ry="4" fill="#ffd6ec" strokeWidth="2" />
        </g>
      )}
      {/* หน้าน่ารักร่วม */}
      <g>
        <ellipse cx="34" cy="35" rx="2.6" ry="3.2" fill={INK} />
        <ellipse cx="46" cy="35" rx="2.6" ry="3.2" fill={INK} />
        <circle cx="35" cy="34" r="1" fill="#fff" />
        <circle cx="47" cy="34" r="1" fill="#fff" />
        <ellipse cx="29" cy="40" rx="3" ry="1.8" fill="#ff8fb5" opacity="0.8" />
        <ellipse cx="51" cy="40" rx="3" ry="1.8" fill="#ff8fb5" opacity="0.8" />
      </g>
    </svg>
  );
}

/** ไอคอนเวทแต่ละแบบ (วงกลมสี + สัญลักษณ์) */
export function SpellIcon({ id, color, size = 36, locked = false }: { id: string; color: string; size?: number; locked?: boolean }) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden="true">
      <circle cx="20" cy="20" r="17" fill={locked ? '#8a82a8' : color} stroke={INK} strokeWidth="3" />
      <g fill="#fff" stroke={INK} strokeWidth="1.8" strokeLinejoin="round">
        {id === 'fire' && <path d="M20 9 q8 8 6 15 q-1 6 -6 7 q-6 -1 -6 -7 q0 -4 3 -6 q0 4 2 4 q-1 -6 1 -13z" />}
        {id === 'ice' && <path d="M20 8 v24 M10 14 l20 12 M30 14 l-20 12" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" />}
        {id === 'thunder' && <path d="M23 7 l-10 15 h7 l-4 11 l11 -16 h-7 z" />}
        {id === 'wind' && <path d="M9 15 h16 a4 4 0 1 0 -4 -4 M9 21 h20 a4 4 0 1 1 -4 4 M11 27 h8" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" />}
        {id === 'earth' && <path d="M20 8 l11 5 v8 q0 8 -11 12 q-11 -4 -11 -12 v-8z" />}
        {id === 'heal' && <path d="M17 10 h6 v7 h7 v6 h-7 v7 h-6 v-7 h-7 v-6 h7z" />}
        {id === 'rainbow' && <path d="M8 27 a12 12 0 0 1 24 0 M12 27 a8 8 0 0 1 16 0" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" />}
      </g>
      {locked && <rect x="13" y="17" width="14" height="11" rx="2" fill="#4a4268" stroke={INK} strokeWidth="2" />}
    </svg>
  );
}

/** ภาพดินแดนในแผนที่ (เกาะลอย + สัญลักษณ์ประจำดินแดน) */
export function LandArt({ id, color, size = 92 }: { id: string; color: string; size?: number }) {
  return (
    <svg viewBox="0 0 100 80" width={size} height={(size * 80) / 100} aria-hidden="true">
      <path d="M10 46 q40 -10 80 0 q-6 22 -40 30 q-34 -8 -40 -30z" fill="#8a6a4a" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <ellipse cx="50" cy="46" rx="40" ry="9" fill={color} stroke={INK} strokeWidth="3" />
      <g stroke={INK} strokeWidth="2.5" strokeLinejoin="round">
        {id === 'castle' && (
          <>
            <rect x="34" y="20" width="32" height="24" fill="#fff" />
            <rect x="28" y="12" width="10" height="32" fill="#e8e0ff" />
            <rect x="62" y="12" width="10" height="32" fill="#e8e0ff" />
            <path d="M27 12 l6 -10 6 10z M61 12 l6 -10 6 10z" fill="#ff6b9a" />
            <path d="M45 44 v-10 a5 5 0 0 1 10 0 v10" fill="#6d5bff" />
          </>
        )}
        {id === 'forest' && (
          <>
            <path d="M30 44 l10 -26 10 26z M50 44 l12 -32 12 32z" fill="#3fcf7a" />
            <circle cx="28" cy="38" r="5" fill="#ff8fc7" />
            <circle cx="76" cy="40" r="4" fill="#ffd23f" />
          </>
        )}
        {id === 'ice' && (
          <>
            <path d="M30 44 l8 -24 8 24z M46 44 l10 -32 10 32z M64 44 l6 -16 6 16z" fill="#dff6ff" />
            <path d="M54 22 l2 -6 2 6" fill="#fff" />
          </>
        )}
        {id === 'volcano' && (
          <>
            <path d="M28 44 l16 -26 h12 l16 26z" fill="#7a3a2a" />
            <path d="M44 18 q6 -8 12 0" fill="#ff6b3d" />
            <path d="M48 18 q2 -12 6 -14 q2 8 -2 14" fill="#ffc53a" />
          </>
        )}
        {id === 'sky' && (
          <>
            <ellipse cx="38" cy="30" rx="14" ry="8" fill="#fff" />
            <ellipse cx="62" cy="22" rx="12" ry="7" fill="#fff" />
            <path d="M48 44 v-14 l10 6 -10 6" fill="#ffc53a" />
          </>
        )}
        {id === 'dark' && (
          <>
            <path d="M34 44 v-22 l8 -8 8 8 v22z" fill="#3a2a6b" />
            <path d="M54 44 v-28 l7 -8 7 8 v28z" fill="#2a1d50" />
            <circle cx="42" cy="26" r="2.5" fill="#ff4d8a" />
            <circle cx="61" cy="22" r="2.5" fill="#ff4d8a" />
          </>
        )}
      </g>
    </svg>
  );
}
