import React from 'react';
import { BUDDY_COLOR_HEX, BuddyColor, Hat } from '@/lib/companion';
import { cn } from '@/lib/utils/cn';
import { BACK_ART, BODY_ART, TOP_ART } from './wearArt';
import { SpeciesEars, SpeciesMark, SpeciesOver, SpeciesTail, SpeciesUnder } from './speciesArt';
import { PUNG, speciesById } from '@/lib/pet/species';

export type BuddyExpr = 'smile' | 'happy' | 'eat' | 'sleepy' | 'sad' | 'wow';
const BODY_D = 'M100 38 C150 38 172 92 168 136 C164 180 136 198 100 198 C64 198 36 180 32 136 C28 92 50 38 100 38 Z';

/**
 * ตัวละครคู่หู "ปุ๋ง" โตตามจำนวนดาวที่สะสม (4 ขั้น)
 * 0 ไข่มหัศจรรย์ / 1 ลูกน้อยจอมซน / 2 นักผจญภัย / 3 ฮีโร่แห่ง 5G
 */
export function Buddy({
  stage = 0,
  color = 'violet',
  hat = 'none',
  size = 200,
  className,
  animate = true,
  asleep = false,
  wear,
  expr = 'smile',
  species,
  grow,
  weight,
  tired = 0,
}: {
  stage?: number;
  color?: string;
  hat?: Hat | string;
  size?: number;
  className?: string;
  animate?: boolean;
  /** หลับอยู่ (หลับตา + Zz) ใช้ตอนตัวละครกำลังจะตื่น */
  asleep?: boolean;
  /** ชุดในห้องเลี้ยงปุ๋ง ส่งมาแล้วไม่ใช้ hat */
  wear?: { hat?: string; face?: string; body?: string; back?: string };
  expr?: BuddyExpr;
  /** ชนิดคู่หู (lib/pet/species) ไม่ส่ง = ปุ๋ง */
  species?: string;
  /** อายุ 0-1 ใช้แทนขนาดตามขั้น ไม่ส่ง = ขนาดเดิม */
  grow?: number;
  /** น้ำหนัก 50 = สมส่วน มากกว่า = ตัวกว้าง */
  weight?: number;
  /** ขอบตาดำ 0-2 */
  tired?: number;
}) {
  const clipId = React.useId();
  const sp = species && species !== PUNG ? speciesById(species) : undefined;
  const c = sp ?? BUDDY_COLOR_HEX[(color as BuddyColor) in BUDDY_COLOR_HEX ? (color as BuddyColor) : 'violet'];
  const isEgg = stage === 0;
  const scale = grow != null && !isEgg ? 0.72 + 0.28 * grow : [0.8, 0.82, 0.92, 1][Math.max(0, Math.min(3, stage))];
  const w = isEgg ? 50 : weight ?? 50;
  const sx = w > 50 ? 1 + ((Math.min(w, 100) - 50) / 50) * 0.26 : 1 - ((50 - Math.max(w, 15)) / 35) * 0.1;
  const sy = w > 50 ? 1 - ((Math.min(w, 100) - 50) / 50) * 0.05 : 1;
  const cheek = w >= 65 ? 13 : 9;

  return (
    <svg
      viewBox="0 0 200 220"
      width={size}
      height={size * 1.1}
      className={cn('overflow-visible', animate && 'animate-float-slow', className)}
      role="img"
      aria-label="ตัวละครคู่หู"
    >
      <ellipse cx="100" cy="206" rx={52 * scale * sx} ry="9" fill="#000" opacity="0.14" />

      {/* ผ้าคลุมอยู่หลังตัว */}
      {!wear && hat === 'cape' && !isEgg && (
        <path d="M58 104 Q100 92 142 104 L160 190 Q100 214 40 190 Z" fill="#f53d9b" stroke="#bb1569" strokeWidth="3" />
      )}

      <g transform={`translate(100 ${isEgg ? 112 : 118}) scale(${scale * sx} ${scale * sy}) translate(-100 -112)`}>
        {!isEgg && sp && <SpeciesTail s={sp} />}
        {!isEgg && wear?.back && BACK_ART[wear.back]}
        {isEgg ? (
          <g>
            <path d="M100 26 C146 26 168 84 168 130 C168 178 138 198 100 198 C62 198 32 178 32 130 C32 84 54 26 100 26 Z" fill={c.body} stroke={c.dark} strokeWidth="4" />
            <circle cx="72" cy="110" r="13" fill={c.light} opacity="0.85" />
            <circle cx="128" cy="86" r="9" fill={c.light} opacity="0.85" />
            <circle cx="120" cy="150" r="15" fill={c.light} opacity="0.85" />
            <path d="M58 70 Q70 48 92 42" fill="none" stroke="#fff" strokeOpacity="0.6" strokeWidth="7" strokeLinecap="round" />
            {/* ตาแอบมองผ่านรอยแตก */}
            <path d="M84 124 L94 114 L100 126 L108 112 L118 124" fill="none" stroke={c.dark} strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />
          </g>
        ) : (
          <g>
            {/* หนวด/ดาวบนหัว */}
            {stage >= 2 && !sp && (
              <g>
                <path d="M100 40 Q100 22 100 14" stroke={c.dark} strokeWidth="4" strokeLinecap="round" />
                <path d="M100 -2 l5 11 12 1 -9 8 3 12 -11 -6 -11 6 3 -12 -9 -8 12 -1z" fill="#ffc53a" stroke="#f5a50f" strokeWidth="2" strokeLinejoin="round" transform="translate(0 8)" />
              </g>
            )}
            {/* หู */}
            {sp ? (
              <SpeciesEars s={sp} />
            ) : (
              <g className="bd-ears">
                <circle cx="52" cy="64" r="17" fill={c.body} stroke={c.dark} strokeWidth="4" />
                <circle cx="148" cy="64" r="17" fill={c.body} stroke={c.dark} strokeWidth="4" />
                <circle cx="52" cy="64" r="8" fill={c.light} />
                <circle cx="148" cy="64" r="8" fill={c.light} />
              </g>
            )}
            {/* ตัว */}
            <path d={BODY_D} fill={c.body} stroke={c.dark} strokeWidth="4" />
            <ellipse cx="100" cy="150" rx="40" ry="34" fill={c.light} opacity="0.7" />
            {sp?.mark && (
              <>
                <clipPath id={`${clipId}m`}><path d={BODY_D} /></clipPath>
                <g clipPath={`url(#${clipId}m)`}><SpeciesMark s={sp} /></g>
                <path d={BODY_D} fill="none" stroke={c.dark} strokeWidth="4" />
              </>
            )}
            {wear?.body && BODY_ART[wear.body] && (
              <>
                <clipPath id={clipId}><path d={BODY_D} /></clipPath>
                <g clipPath={`url(#${clipId})`}>{BODY_ART[wear.body]}</g>
                <path d={BODY_D} fill="none" stroke={c.dark} strokeWidth="4" />
              </>
            )}
            {stage >= 3 && !wear?.body && !sp && (
              <path d="M100 126 l7 15 17 2 -13 11 4 17 -15 -9 -15 9 4 -17 -13 -11 17 -2z" fill="#ffc53a" stroke="#f5a50f" strokeWidth="3" strokeLinejoin="round" />
            )}
            {/* แขน */}
            {(stage >= 2 || sp) && (
              <>
                <g className="bd-arm-l"><ellipse cx="38" cy="140" rx="11" ry="17" fill={c.body} stroke={c.dark} strokeWidth="4" transform="rotate(24 38 140)" /></g>
                <g className="bd-arm-r"><ellipse cx="162" cy="140" rx="11" ry="17" fill={c.body} stroke={c.dark} strokeWidth="4" transform="rotate(-24 162 140)" /></g>
              </>
            )}
            {sp && <SpeciesUnder s={sp} />}
            {/* ตา */}
            {expr === 'happy' && !asleep ? (
              <g fill="none" stroke="#2a2740" strokeWidth="6" strokeLinecap="round">
                <path d="M60 110 Q76 90 92 110" />
                <path d="M108 110 Q124 90 140 110" />
              </g>
            ) : expr === 'sleepy' && !asleep ? (
              <g>
                <ellipse cx="76" cy="108" rx="14" ry="12" fill="#fff" />
                <ellipse cx="124" cy="108" rx="14" ry="12" fill="#fff" />
                <circle cx="78" cy="112" r="7" fill="#2a2740" />
                <circle cx="122" cy="112" r="7" fill="#2a2740" />
                <path d="M60 104 H92 M108 104 H140" stroke={c.dark} strokeWidth="6" strokeLinecap="round" />
              </g>
            ) : asleep ? (
              <g fill="none" stroke="#2a2740" strokeWidth="5" strokeLinecap="round">
                <path d="M62 108 Q76 120 90 108" />
                <path d="M110 108 Q124 120 138 108" />
              </g>
            ) : (
              <g className="buddy-eyes">
                <ellipse cx="76" cy="106" rx="14" ry="17" fill="#fff" />
                <ellipse cx="124" cy="106" rx="14" ry="17" fill="#fff" />
                <ellipse cx="79" cy="109" rx="8" ry="10" fill="#2a2740" />
                <ellipse cx="121" cy="109" rx="8" ry="10" fill="#2a2740" />
                <circle cx="82" cy="104" r="3.4" fill="#fff" />
                <circle cx="124" cy="104" r="3.4" fill="#fff" />
              </g>
            )}
            {tired > 0 && !asleep && (
              <g fill="none" stroke="#4b3a6b" strokeLinecap="round" opacity={tired > 1 ? 0.75 : 0.42}>
                <path d="M60 126 Q76 137 92 126" strokeWidth={tired > 1 ? 7 : 5} />
                <path d="M108 126 Q124 137 140 126" strokeWidth={tired > 1 ? 7 : 5} />
              </g>
            )}
            {/* ปาก + แก้ม */}
            {expr === 'eat' && !asleep ? (
              <ellipse className="pr-chew" cx="100" cy="142" rx="14" ry="12" fill="#7a2840" stroke="#2a2740" strokeWidth="4" />
            ) : expr === 'wow' && !asleep ? (
              <ellipse cx="100" cy="144" rx="9" ry="11" fill="#7a2840" stroke="#2a2740" strokeWidth="4" />
            ) : expr === 'sad' && !asleep ? (
              <path d="M86 148 Q100 136 114 148" fill="none" stroke="#2a2740" strokeWidth="4" strokeLinecap="round" />
            ) : expr === 'happy' && !asleep ? (
              <path d="M80 134 Q100 166 120 134 Z" fill="#7a2840" stroke="#2a2740" strokeWidth="4" strokeLinejoin="round" />
            ) : (
              <path d={asleep ? 'M90 142 Q100 148 110 142' : 'M86 138 Q100 154 114 138'} fill={asleep ? 'none' : '#fff'} stroke="#2a2740" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            )}
            <circle cx="58" cy="134" r={cheek} fill="#ff8fb3" opacity="0.55" />
            <circle cx="142" cy="134" r={cheek} fill="#ff8fb3" opacity="0.55" />
            {sp && <SpeciesOver s={sp} />}
            {/* เท้า */}
            <ellipse cx="74" cy="196" rx="20" ry="9" fill={c.dark} />
            <ellipse cx="126" cy="196" rx="20" ry="9" fill={c.dark} />
          </g>
        )}

        {/* ชุดในห้องเลี้ยงปุ๋ง */}
        {!isEgg && wear?.face && TOP_ART[wear.face]}
        {!isEgg && wear?.hat && TOP_ART[wear.hat]}
        {/* เครื่องแต่งตัว */}
        {!wear && !isEgg && hat === 'cap' && (
          <g>
            <path d="M54 62 Q100 8 146 62 Z" fill="#ffc53a" stroke="#f5a50f" strokeWidth="4" strokeLinejoin="round" />
            <path d="M54 62 Q60 74 112 70 Q150 66 150 62 Z" fill="#f5a50f" />
            <circle cx="100" cy="16" r="7" fill="#f53d9b" />
          </g>
        )}
        {!wear && !isEgg && hat === 'glasses' && (
          <g fill="none" stroke="#2a2740" strokeWidth="5">
            <circle cx="76" cy="107" r="21" fill="#fff" fillOpacity="0.18" />
            <circle cx="124" cy="107" r="21" fill="#fff" fillOpacity="0.18" />
            <path d="M97 106 Q100 100 103 106" strokeLinecap="round" />
          </g>
        )}
        {!wear && !isEgg && hat === 'crown' && (
          <g>
            <path d="M60 52 L64 18 L82 36 L100 10 L118 36 L136 18 L140 52 Z" fill="#ffc53a" stroke="#f5a50f" strokeWidth="4" strokeLinejoin="round" />
            <circle cx="64" cy="18" r="5" fill="#f53d9b" />
            <circle cx="100" cy="10" r="5.5" fill="#2fd196" />
            <circle cx="136" cy="18" r="5" fill="#2eb4f5" />
          </g>
        )}
      </g>
    </svg>
  );
}
