/**
 * ภาพ SVG ของ Ghost Hunter AR: นักล่าผี (ชาย/หญิง เสื้อโค้ท หมวก/แว่น สีไฟ) ผีน่ารัก 9 ชนิด อุปกรณ์ สถานที่
 * ห้ามอิโมจิ วาดเองทั้งหมด ผีต้องน่ารัก ไม่น่ากลัว
 */
import React from 'react';
import { COATS, GLOWS, SKINS, type GearId, type GhostId, type Look } from '@/lib/game-creator/ghost/data';

const INK = '#22163f';

export function HunterArt({ look, size = 120, casting = false }: { look: Look; size?: number; casting?: boolean }) {
  const coat = COATS[look.coat];
  const glow = GLOWS[look.glow];
  const skin = SKINS[look.skin];
  const hair = look.g ? '#7a3a2a' : '#3a2a1a';
  return (
    <svg viewBox="0 0 120 140" width={size} height={(size * 140) / 120} aria-hidden="true">
      <ellipse cx="60" cy="132" rx="34" ry="6" fill="#000" opacity="0.2" />
      {look.g === 1 && <path d="M38 58 q-6 28 6 42 h32 q12 -14 6 -42 z" fill={hair} stroke={INK} strokeWidth="3" />}
      {/* เป้เครื่องดูดผี */}
      <rect x="34" y="72" width="16" height="34" rx="6" fill="#8a96a8" stroke={INK} strokeWidth="3" />
      <circle cx="42" cy="80" r="3.5" fill={glow} />
      {/* เสื้อโค้ท */}
      <path d="M42 70 h36 l6 52 h-48 z" fill={coat} stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M60 72 v48" stroke={INK} strokeWidth="2.5" />
      <circle cx="56" cy="86" r="2" fill="#fff" />
      <circle cx="56" cy="98" r="2" fill="#fff" />
      <path d="M46 122 v6 h10 v-6 M64 122 v6 h10 v-6" fill="#2a2a3a" stroke={INK} strokeWidth="2.5" />
      {/* แขนถือไฟฉาย */}
      <g className="mk-staff" data-cast={casting}>
        <path d="M78 80 q12 -4 16 -14" fill="none" stroke={coat} strokeWidth="9" strokeLinecap="round" />
        <circle cx="94" cy="64" r="5" fill={skin} stroke={INK} strokeWidth="2.5" />
        <rect x="90" y="46" width="10" height="18" rx="2" fill="#c0c8d0" stroke={INK} strokeWidth="2.5" />
        <path d="M88 46 h14 l4 -8 h-22z" fill="#8a96a8" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M84 38 l-14 -30 h50 l-14 30z" fill={glow} opacity={casting ? 0.55 : 0.3} className="mk-glow" />
      </g>
      {/* หัว */}
      <circle cx="60" cy="54" r="19" fill={skin} stroke={INK} strokeWidth="3.5" />
      {look.g === 0 ? <path d="M42 50 q4 -12 18 -12 q14 0 18 12 q-8 -5 -18 -4 q-10 -1 -18 4z" fill={hair} /> : <path d="M41 52 q2 -14 19 -14 q17 0 19 14 q-6 -6 -11 -5 q-4 4 -8 0 q-4 4 -8 0 q-5 -1 -11 5z" fill={hair} />}
      <ellipse cx="46" cy="62" rx="4" ry="2.4" fill="#ff8fb5" opacity="0.7" />
      <ellipse cx="74" cy="62" rx="4" ry="2.4" fill="#ff8fb5" opacity="0.7" />
      <path d="M55 64 q5 4 10 0" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
      {look.hat === 0 ? (
        <g>
          <circle cx="51" cy="55" r="7" fill="#e8fff6" fillOpacity="0.6" stroke={INK} strokeWidth="3" />
          <circle cx="69" cy="55" r="7" fill="#e8fff6" fillOpacity="0.6" stroke={INK} strokeWidth="3" />
          <path d="M58 55 h4" stroke={INK} strokeWidth="3" />
          <circle cx="51" cy="55" r="2.6" fill={INK} />
          <circle cx="69" cy="55" r="2.6" fill={INK} />
          <circle cx="51" cy="44" r="3" fill={glow} stroke={INK} strokeWidth="2" />
        </g>
      ) : (
        <g>
          <ellipse cx="52" cy="56" rx="2.8" ry="3.4" fill={INK} />
          <ellipse cx="68" cy="56" rx="2.8" ry="3.4" fill={INK} />
          {look.hat === 1 ? (
            <g>
              <path d="M36 44 q24 -8 48 0 q-6 5 -24 5 q-18 0 -24 -5z" fill="#8a6a4a" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
              <path d="M44 42 q2 -16 16 -18 q14 2 16 18z" fill="#8a6a4a" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
              <path d="M45 38 q15 4 30 0" fill="none" stroke="#3a2a1a" strokeWidth="4" />
            </g>
          ) : (
            <g>
              <path d="M41 44 q19 -8 38 0" fill="none" stroke="#3a3a4a" strokeWidth="5" strokeLinecap="round" />
              <rect x="54" y="32" width="12" height="9" rx="2" fill="#c0c8d0" stroke={INK} strokeWidth="2.5" />
              <circle cx="60" cy="36.5" r="2.6" fill={glow} />
            </g>
          )}
        </g>
      )}
    </svg>
  );
}

export function GhostArt({ id, color, size = 64, locked = false }: { id: GhostId; color: string; size?: number; locked?: boolean }) {
  const c = locked ? '#3a3a5a' : color;
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
      <g stroke={INK} strokeWidth="2.5" strokeLinejoin="round">
        {id === 'pumpkin' ? (
          <>
            <path d="M14 46 q-4 10 4 12 q6 -4 10 0 q6 -4 10 0 q6 -4 10 0 q8 -2 4 -12z" fill={locked ? c : '#f4f4ff'} />
            <ellipse cx="32" cy="32" rx="20" ry="16" fill={locked ? c : '#ff9a3d'} />
            <path d="M32 16 v-6" stroke="#3fae6a" strokeWidth="4" />
            {!locked && <path d="M22 28 l4 -4 4 4z M34 28 l4 -4 4 4z M24 38 q8 6 16 0" fill="#ffe94d" />}
          </>
        ) : (
          <>
            <path d={id === 'giant' ? 'M8 58 v-26 a24 24 0 0 1 48 0 v26 l-8 -5 -8 5 -8 -5 -8 5 -8 -5z' : 'M14 56 v-22 a18 18 0 0 1 36 0 v22 l-6 -4 -6 4 -6 -4 -6 4 -6 -4z'} fill={c} />
            {!locked && (
              <>
                <ellipse cx="25" cy="32" rx="3.4" ry="4.2" fill={INK} stroke="none" />
                <ellipse cx="39" cy="32" rx="3.4" ry="4.2" fill={INK} stroke="none" />
                <circle cx="26" cy="30.5" r="1.2" fill="#fff" stroke="none" />
                <circle cx="40" cy="30.5" r="1.2" fill="#fff" stroke="none" />
                <ellipse cx="20" cy="39" rx="3.5" ry="2" fill="#ff8fb5" stroke="none" opacity="0.8" />
                <ellipse cx="44" cy="39" rx="3.5" ry="2" fill="#ff8fb5" stroke="none" opacity="0.8" />
                <path d="M29 40 q3 3 6 0" fill="none" />
              </>
            )}
            {id === 'king' && <path d="M20 18 l2 -10 6 6 4 -8 4 8 6 -6 2 10z" fill={locked ? c : '#ffc53a'} />}
            {id === 'school' && !locked && <path d="M18 18 l14 -6 14 6 -14 6z M40 18 v8" fill="#2a2a5a" />}
            {id === 'library' && !locked && <rect x="40" y="40" width="12" height="14" rx="1.5" fill="#b85cff" />}
            {id === 'candy' && !locked && <circle cx="32" cy="12" r="5" fill="#ff4d6d" />}
            {id === 'shadow' && !locked && <path d="M14 56 q18 8 36 0" fill="none" stroke="#2a1d50" strokeWidth="4" />}
            {id === 'friendly' && !locked && <path d="M10 34 q-4 -8 4 -10 M54 34 q4 -8 -4 -10" fill="none" />}
            {id === 'baby' && !locked && <circle cx="32" cy="16" r="2.5" fill="#ffe38a" />}
          </>
        )}
        {locked && <text x="32" y="38" textAnchor="middle" fontSize="18" fontWeight="900" fill="#9fb3c8" stroke="none">?</text>}
      </g>
    </svg>
  );
}

export function GearIcon({ id, color, size = 40, locked = false }: { id: GearId; color: string; size?: number; locked?: boolean }) {
  const c = locked ? '#5a5a7a' : color;
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden="true">
      <circle cx="20" cy="20" r="18" fill={c} stroke={INK} strokeWidth="2.5" />
      <g fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        {id === 'flashlight' && <path d="M12 26 l6 -6 m-2 -4 l8 8 l8 -8 l-8 -8z" />}
        {id === 'beam' && <path d="M8 20 h8 M20 12 q8 8 0 16 M26 10 q10 10 0 20" />}
        {id === 'shield' && <path d="M20 8 l10 4 v8 q0 8 -10 12 q-10 -4 -10 -12 v-8z" />}
        {id === 'trap' && <path d="M10 24 h20 v6 h-20z M14 24 l6 -12 6 12" />}
        {id === 'detector' && <path d="M12 28 a10 10 0 0 1 16 -12 M16 26 a5 5 0 0 1 8 -6 M20 24 v0" />}
        {id === 'net' && <path d="M10 12 h20 v16 h-20z M10 20 h20 M17 12 v16 M23 12 v16" />}
        {id === 'sonic' && <path d="M8 20 q3 -6 6 0 t6 0 t6 0 t6 0" />}
        {id === 'vacuum' && <path d="M10 28 l8 -8 M18 20 q4 -8 12 -8 v8 q-8 0 -12 0z" />}
      </g>
      {locked && <rect x="14" y="17" width="12" height="10" rx="2" fill={INK} />}
    </svg>
  );
}

export function PlaceArt({ id, color, size = 86 }: { id: string; color: string; size?: number }) {
  return (
    <svg viewBox="0 0 100 70" width={size} height={(size * 70) / 100} aria-hidden="true">
      <rect width="100" height="70" rx="12" fill={color} opacity="0.25" />
      <circle cx="80" cy="16" r="8" fill="#fff3c4" />
      <g stroke={INK} strokeWidth="2.5" strokeLinejoin="round">
        {id === 'school' && <path d="M22 64 v-30 l28 -16 28 16 v30z M44 64 v-14 h12 v14 M48 30 h4" fill="#7fb8ff" />}
        {id === 'mansion' && <path d="M20 64 v-34 l14 -14 14 14 v-6 h10 v6 l12 12 v22z" fill="#8a6ac8" />}
        {id === 'forest' && [20, 46, 72].map((x) => <path key={x} d={`M${x} 64 v-10 M${x - 12} 54 l12 -30 12 30z`} fill="#3fae6a" />)}
        {id === 'library' && <path d="M18 64 v-40 h64 v40z M26 30 v28 M36 30 v28 M46 30 v28 M60 30 v28 M70 30 v28" fill="#c8a3ff" />}
        {id === 'castle' && <path d="M16 64 v-36 h10 v-8 h8 v8 h8 v-14 h16 v14 h8 v-8 h8 v8 h10 v36z" fill="#d0c8a8" />}
        {id === 'toyward' && <path d="M22 64 v-34 h56 v34z M44 36 h12 v6 h6 v8 h-6 v6 h-12 v-6 h-6 v-8 h6z" fill="#ffc8e0" />}
        {id === 'museum' && <path d="M14 64 h72 M18 30 l32 -16 32 16z M24 34 v26 M38 34 v26 M62 34 v26 M76 34 v26" fill="#bfe6ff" />}
        {id === 'dimension' && <><circle cx="50" cy="40" r="20" fill="#3fe0a0" opacity="0.5" /><path d="M50 22 q14 18 0 36 q-14 -18 0 -36z" fill="#9ff0d0" /></>}
      </g>
      <path d="M8 60 q4 -10 8 0 l-2 -2 -2 2 -2 -2z" fill="#f4f4ff" stroke={INK} strokeWidth="1.5" />
    </svg>
  );
}
