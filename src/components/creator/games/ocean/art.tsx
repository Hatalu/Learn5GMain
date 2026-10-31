/**
 * ภาพ SVG ของ Ocean Guardian AR: นักพิทักษ์ (ชาย/หญิง ชุดดำน้ำ อุปกรณ์ ตีนกบ) สัตว์ทะเล 8 ชนิด สมบัติ พลังพิเศษ พื้นที่
 * ห้ามอิโมจิ วาดเองทั้งหมด
 */
import React from 'react';
import { FINS, SKINS, SUITS, type AnimalId, type Look, type PowerId, type TreasureId } from '@/lib/game-creator/ocean/data';

const INK = '#123a52';

export function DiverArt({ look, size = 120, casting = false }: { look: Look; size?: number; casting?: boolean }) {
  const suit = SUITS[look.suit];
  const fin = FINS[look.fin];
  const skin = SKINS[look.skin];
  const hair = look.g ? '#7a3a2a' : '#3a2a1a';
  return (
    <svg viewBox="0 0 120 140" width={size} height={(size * 140) / 120} aria-hidden="true">
      <ellipse cx="60" cy="132" rx="34" ry="6" fill="#000" opacity="0.15" />
      {/* ถังออกซิเจน */}
      <rect x="40" y="70" width="14" height="40" rx="7" fill="#ffc53a" stroke={INK} strokeWidth="3" />
      {look.g === 1 && <path d="M38 58 q-6 26 6 40 h32 q12 -14 6 -40 z" fill={hair} stroke={INK} strokeWidth="3" />}
      {/* ลำตัว + ขา + ตีนกบ */}
      <path d="M44 70 h32 l4 40 h-40 z" fill={suit} stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M48 108 l-6 18 h14 l2 -18 M72 108 l6 18 h-14 l-2 -18" fill={suit} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <path d="M36 126 q6 -6 22 0 q-8 8 -22 0z M84 126 q-6 -6 -22 0 q8 8 22 0z" fill={fin} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M50 84 h20" stroke="#fff" strokeOpacity="0.5" strokeWidth="3" />
      {/* แขนยื่นพลังคลื่น */}
      <g className="mk-staff" data-cast={casting}>
        <path d="M76 78 q14 -4 18 -16" fill="none" stroke={suit} strokeWidth="9" strokeLinecap="round" />
        <circle cx="95" cy="60" r="5" fill={skin} stroke={INK} strokeWidth="2.5" />
        <circle cx="98" cy="52" r={casting ? 15 : 9} fill="#7fe8ff" opacity="0.55" className="mk-glow" />
        <path d="M90 50 q8 -6 16 0 M92 44 q6 -4 12 0" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
      </g>
      {/* หัว */}
      <circle cx="60" cy="54" r="19" fill={skin} stroke={INK} strokeWidth="3.5" />
      {look.g === 0 ? <path d="M42 50 q4 -12 18 -12 q14 0 18 12 q-8 -5 -18 -4 q-10 -1 -18 4z" fill={hair} /> : <path d="M41 52 q2 -14 19 -14 q17 0 19 14 q-6 -6 -11 -5 q-4 4 -8 0 q-4 4 -8 0 q-5 -1 -11 5z" fill={hair} />}
      <ellipse cx="46" cy="62" rx="4" ry="2.4" fill="#ff8fb5" opacity="0.7" />
      <ellipse cx="74" cy="62" rx="4" ry="2.4" fill="#ff8fb5" opacity="0.7" />
      <path d="M55 64 q5 4 10 0" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
      {look.gear === 0 && (
        <g>
          <rect x="44" y="47" width="32" height="14" rx="7" fill="#bff3ff" stroke={INK} strokeWidth="3" />
          <path d="M60 47 v14" stroke={INK} strokeWidth="2" />
          <circle cx="52" cy="54" r="2.6" fill={INK} />
          <circle cx="68" cy="54" r="2.6" fill={INK} />
          <path d="M78 52 v-16 q0 -4 4 -4" fill="none" stroke="#ff6b3d" strokeWidth="4" strokeLinecap="round" />
        </g>
      )}
      {look.gear === 1 && (
        <g>
          <ellipse cx="52" cy="56" rx="2.8" ry="3.4" fill={INK} />
          <ellipse cx="68" cy="56" rx="2.8" ry="3.4" fill={INK} />
          <circle cx="60" cy="54" r="26" fill="#dff8ff" fillOpacity="0.35" stroke={INK} strokeWidth="3.5" />
          <path d="M44 40 q8 -8 18 -8" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
          <rect x="44" y="76" width="32" height="7" rx="3" fill="#c0c8d0" stroke={INK} strokeWidth="2.5" />
        </g>
      )}
      {look.gear === 2 && (
        <g>
          <ellipse cx="52" cy="56" rx="2.8" ry="3.4" fill={INK} />
          <ellipse cx="68" cy="56" rx="2.8" ry="3.4" fill={INK} />
          <path d="M42 40 q18 -22 36 0 q-4 -8 -9 -2 q-4 -8 -9 -2 q-5 -6 -9 2 q-5 -6 -9 2z" fill="#ffb3c6" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
          <circle cx="60" cy="30" r="3.4" fill="#f3eaff" stroke={INK} strokeWidth="1.8" />
        </g>
      )}
    </svg>
  );
}

export function AnimalArt({ id, size = 64, locked = false }: { id: AnimalId; size?: number; locked?: boolean }) {
  const f = locked ? '#9fb3c8' : undefined;
  const eye = (x: number, y: number) => (
    <>
      <circle cx={x} cy={y} r="3.2" fill={INK} />
      <circle cx={x + 1} cy={y - 1} r="1" fill="#fff" />
    </>
  );
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true" opacity={locked ? 0.55 : 1}>
      <g stroke={INK} strokeWidth="2.5" strokeLinejoin="round">
        {id === 'turtle' && (
          <>
            <ellipse cx="30" cy="36" rx="18" ry="12" fill={f || '#3fcf7a'} />
            <path d="M18 34 l6 -6 6 6 6 -6 6 6" fill="none" stroke="#1f8a4a" />
            <circle cx="50" cy="32" r="7" fill={f || '#9be36b'} />
            <ellipse cx="16" cy="46" rx="6" ry="3" fill={f || '#9be36b'} />
            <ellipse cx="42" cy="47" rx="6" ry="3" fill={f || '#9be36b'} />
            {eye(52, 30)}
          </>
        )}
        {(id === 'dolphin' || id === 'whale' || id === 'shark') && (
          <>
            <path d={id === 'whale' ? 'M6 34 q4 -16 28 -16 q22 0 24 16 q-2 12 -24 12 q-22 0 -28 -12z' : 'M8 34 q8 -14 28 -14 q18 0 22 14 q-4 8 -22 8 q-20 0 -28 -8z'} fill={f || (id === 'dolphin' ? '#59a8ff' : id === 'whale' ? '#4a7bd0' : '#8aa0b8')} />
            <path d="M14 38 q18 8 38 0" fill={f || '#eef6ff'} />
            <path d={id === 'shark' ? 'M30 20 l6 -12 4 12z' : 'M30 20 l4 -8 6 8z'} fill={f || (id === 'shark' ? '#8aa0b8' : id === 'dolphin' ? '#59a8ff' : '#4a7bd0')} />
            <path d="M8 34 l-6 -8 v18z" fill={f || '#4a7bd0'} />
            {eye(48, 30)}
            {id === 'whale' && <path d="M30 14 q-4 -8 0 -10 M34 14 q4 -8 0 -10" fill="none" stroke="#7fe8ff" />}
          </>
        )}
        {id === 'clownfish' && (
          <>
            <ellipse cx="32" cy="32" rx="20" ry="13" fill={f || '#ff8f3d'} />
            <path d="M24 20 v24 M38 20 v24" stroke="#fff" strokeWidth="5" />
            <path d="M12 32 l-8 -8 v16z" fill={f || '#ff8f3d'} />
            {eye(44, 29)}
          </>
        )}
        {id === 'seahorse' && (
          <>
            <path d="M30 12 q12 0 12 10 l-6 4 q8 8 2 18 q-6 10 -12 6 q-4 -3 2 -6 q4 -2 0 -8 q-8 -8 -2 -16z" fill={f || '#ffc53a'} />
            <path d="M42 18 h10" strokeWidth="4" stroke={f || '#ffc53a'} />
            {eye(35, 18)}
          </>
        )}
        {id === 'octopus' && (
          <>
            <ellipse cx="32" cy="24" rx="16" ry="15" fill={f || '#ff6b9a'} />
            {[16, 23, 30, 37, 44].map((x) => (
              <path key={x} d={`M${x} 34 q-2 12 ${x < 32 ? -4 : 4} 18`} fill="none" stroke={f || '#ff6b9a'} strokeWidth="5" strokeLinecap="round" />
            ))}
            {eye(26, 24)}
            {eye(38, 24)}
          </>
        )}
        {id === 'penguin' && (
          <>
            <ellipse cx="32" cy="34" rx="14" ry="22" fill={f || '#3a4a6b'} />
            <ellipse cx="32" cy="38" rx="9" ry="16" fill="#fff" />
            <path d="M29 24 l3 5 3 -5z" fill={f || '#ffb347'} />
            <path d="M26 56 h6 M34 56 h6" stroke={f || '#ffb347'} strokeWidth="4" />
            {eye(27, 19)}
            {eye(37, 19)}
          </>
        )}
      </g>
    </svg>
  );
}

export function TreasureIcon({ id, size = 34 }: { id: TreasureId; size?: number }) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden="true">
      <g stroke={INK} strokeWidth="2.5" strokeLinejoin="round">
        {id === 'pearl' && (
          <>
            <path d="M6 26 q14 -20 28 0 q-14 10 -28 0z" fill="#ffb3c6" />
            <circle cx="20" cy="22" r="7" fill="#f3eaff" />
            <circle cx="18" cy="20" r="2" fill="#fff" stroke="none" />
          </>
        )}
        {id === 'shell' && <path d="M20 6 q14 4 14 18 q-14 10 -28 0 q0 -14 14 -18z M20 6 v26 M12 10 l4 22 M28 10 l-4 22" fill="#ffc53a" />}
        {id === 'coral' && <path d="M20 36 v-14 l-8 -8 m8 8 l8 -10 m-8 10 v-12 M12 14 v-6 M28 12 v-6" fill="none" stroke="#ff6b9a" strokeWidth="5" strokeLinecap="round" />}
        {id === 'crystal' && <path d="M20 4 l10 12 -10 20 -10 -20z M10 16 h20" fill="#7fe8ff" />}
      </g>
    </svg>
  );
}

export function PowerIcon({ id, color, size = 40, locked = false }: { id: PowerId; color: string; size?: number; locked?: boolean }) {
  const c = locked ? '#9fb3c8' : color;
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden="true">
      <circle cx="20" cy="20" r="18" fill={c} stroke={INK} strokeWidth="2.5" />
      <g fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        {id === 'wave' && <path d="M8 22 q4 -6 8 0 t8 0 t8 0" />}
        {id === 'shield' && <circle cx="20" cy="20" r="9" />}
        {id === 'magnet' && <path d="M12 12 v8 a8 8 0 0 0 16 0 v-8" />}
        {id === 'heal' && <path d="M20 12 v16 M12 20 h16" />}
        {id === 'boost' && <path d="M10 14 h14 M8 20 h18 M12 26 h14 M26 12 l6 8 -6 8" />}
        {id === 'super' && <path d="M6 26 q6 -14 14 -6 q6 6 14 -8 M6 32 q8 -8 14 -2 q6 4 14 -6" />}
        {id === 'double' && <path d="M12 14 l6 12 M18 14 l-6 12 M24 18 a4 4 0 1 1 8 0 q0 4 -8 8 h8" />}
      </g>
      {locked && <rect x="14" y="17" width="12" height="10" rx="2" fill={INK} />}
    </svg>
  );
}

export function ZoneArt({ id, color, size = 86 }: { id: string; color: string; size?: number }) {
  return (
    <svg viewBox="0 0 100 70" width={size} height={(size * 70) / 100} aria-hidden="true">
      <rect width="100" height="70" rx="12" fill={color} opacity="0.25" />
      <g stroke={INK} strokeWidth="2.5" strokeLinejoin="round">
        {id === 'reef' && <path d="M20 66 v-20 l-8 -10 m8 10 l8 -12 M50 66 v-26 l10 -10 M74 66 v-14 l-8 -8 m8 8 l8 -10" fill="none" stroke="#ff6b9a" strokeWidth="5" strokeLinecap="round" />}
        {id === 'deep' && <><circle cx="50" cy="34" r="12" fill="#ffe94d" opacity="0.8" /><path d="M10 60 q40 -14 80 0" fill="none" /></>}
        {id === 'sharkv' && <path d="M10 66 l20 -36 20 36 M50 66 l20 -44 20 44 M40 30 l8 -14 4 14z" fill="#5b8bd0" />}
        {id === 'jellyf' && [24, 50, 76].map((x) => <path key={x} d={`M${x - 12} 34 q12 -24 24 0z M${x - 6} 34 v18 M${x + 6} 34 v18`} fill="#d9a3ff" />)}
        {id === 'ship' && <path d="M14 50 l60 -10 l12 14 h-64z M40 44 v-30 l22 18z" fill="#c08a3e" />}
        {id === 'cave' && <><path d="M8 66 q42 -80 84 0z" fill="#3a2a1a" /><rect x="38" y="46" width="24" height="16" rx="3" fill="#ffc53a" /></>}
        {id === 'volcano' && <><path d="M14 66 l26 -40 h20 l26 40z" fill="#8a4a3a" /><path d="M44 24 q6 -14 12 0" fill="#ff6b3d" /></>}
        {id === 'palace' && <path d="M24 64 v-28 l8 -14 8 14 v28 M44 64 v-38 l8 -16 8 16 v38 M64 64 v-28 l8 -14 8 14 v28z" fill="#bff3ff" />}
      </g>
    </svg>
  );
}
