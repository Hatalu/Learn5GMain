'use client';

import './games.css';
import './brawl-fish.css';
import './world.css';
import React from 'react';
import type { GameMode } from '@/lib/game-creator/modes';
import { Avatar } from '../Avatar';
import { ChoiceShape, choiceStyle } from '../ChoiceShape';
import { Coin, Flag, Food } from './art';
import { TowerIcon } from './TowerGame';
import { WeaponIcon } from './BrawlGame';
import { FishArt } from './fishArt';

/** ภาพหน้าปกของแต่ละรูปแบบการเล่น */
export function ModeArt({ mode }: { mode: GameMode }) {
  if (mode === 'quiz') {
    return (
      <div className="ma ma-quiz">
        <div className="ma-quiz-q">
          <svg viewBox="0 0 40 30" width="40" height="30" aria-hidden="true">
            <text x="4" y="12" fontSize="11" fontWeight="700" fill="#2a2350">3</text>
            <line x1="2" y1="15" x2="14" y2="15" stroke="#2a2350" strokeWidth="2" />
            <text x="4" y="27" fontSize="11" fontWeight="700" fill="#2a2350">4</text>
            <text x="19" y="21" fontSize="12" fontWeight="700" fill="#2a2350">= ?</text>
          </svg>
        </div>
        <div className="ma-quiz-grid">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} style={{ background: choiceStyle(i).color, animationDelay: `${i * 0.15}s` }}>
              <ChoiceShape i={i} size={16} />
            </span>
          ))}
        </div>
      </div>
    );
  }
  if (mode === 'cafe') {
    return (
      <div className="ma ma-cafe">
        <span className="ma-awning" />
        <div className="ma-cafe-row">
          <span className="ma-bob" style={{ animationDelay: '0s' }}>
            <Avatar id={1} size={46} />
          </span>
          <span className="ma-bubble">
            <Food id="cake" size={22} />
          </span>
          <span className="ma-bob" style={{ animationDelay: '-.7s' }}>
            <Avatar id={4} size={46} />
          </span>
        </div>
        <div className="ma-counter">
          <Food id="bread" size={22} />
          <Food id="milk" size={22} />
          <Food id="donut" size={22} />
          <Coin size={20} />
        </div>
      </div>
    );
  }
  if (mode === 'tower') {
    return (
      <div className="ma ma-tower">
        <span className="ma-path" />
        <span className="ma-t1">
          <TowerIcon kind="owl" size={40} />
        </span>
        <span className="ma-t2">
          <TowerIcon kind="dragon" size={40} />
        </span>
        <span className="ma-t3">
          <TowerIcon kind="squirrel" size={36} />
        </span>
        {[0, 1, 2].map((i) => (
          <span key={i} className="ma-slime" style={{ animationDelay: `${-i * 1.2}s`, ['--sc' as string]: ['#7ddc86', '#5ccbff', '#ff8fc4'][i] }} />
        ))}
      </div>
    );
  }
  if (mode === 'brawl') {
    return (
      <div className="ma ma-brawl">
        {[
          ['#7ddc86', '12%', '18%', '14px', '10px'],
          ['#ff8fc4', '76%', '14%', '-12px', '12px'],
          ['#a77cf2', '80%', '64%', '-14px', '-8px'],
          ['#ffb35c', '8%', '66%', '12px', '-10px'],
        ].map(([c, l, t, dx, dy], i) => (
          <span key={i} className="ma-brawl-mon" style={{ left: l, top: t, ['--mc' as string]: c, ['--dx' as string]: dx, ['--dy' as string]: dy, animationDelay: `${-i * 0.6}s` }} />
        ))}
        <span className="ma-brawl-orbit">
          <i />
          <i />
        </span>
        <span className="ma-brawl-hero">
          <Avatar id={5} gear={{ h: 8, o: 1, m: 0, i: 1 }} size={50} />
        </span>
        <span style={{ position: 'absolute', right: 6, bottom: 4 }}>
          <WeaponIcon id="bolt" size={26} />
        </span>
      </div>
    );
  }
  if (mode === 'turf') {
    return (
      <div className="ma ma-turf">
        {Array.from({ length: 48 }).map((_, i) => (
          <i key={i} style={{ background: ['#ff4fa3', '#3d8bff', '#ffb31a', 'transparent'][(i * 7 + Math.floor(i / 8)) % 4], animationDelay: `${(i % 8) * 0.12 + Math.floor(i / 8) * 0.2}s` }} />
        ))}
        <span className="ma-turf-who">
          <Avatar id={2} gear={{ h: 3, o: 0, m: 0, i: 0 }} size={42} />
        </span>
      </div>
    );
  }
  if (mode === 'treasure') {
    return (
      <div className="ma ma-treasure">
        <span className="ma-tr-island" />
        <span className="ma-tr-chest" />
        <span className="ma-tr-chest ma-tr-chest-2" />
        <span className="ma-tr-who">
          <Avatar id={9} gear={{ h: 1, o: 0, m: 0, i: 0 }} size={40} />
        </span>
      </div>
    );
  }
  if (mode === 'egg') {
    return (
      <div className="ma ma-egg">
        <svg viewBox="0 0 200 96" width="100%" height="100%" aria-hidden="true">
          <rect x="0" y="62" width="200" height="34" fill="#8fdc6a" />
          <ellipse cx="34" cy="74" rx="26" ry="9" fill="#9ff0c8" stroke="#2a2350" strokeWidth="2.5" />
          {/* บอสหลับ */}
          <g className="ma-egg-boss">
            <ellipse cx="150" cy="58" rx="34" ry="26" fill="#ff8fbf" stroke="#2a2350" strokeWidth="3" />
            <ellipse cx="150" cy="64" rx="20" ry="14" fill="#ffd6e8" />
            <ellipse cx="130" cy="32" rx="7" ry="13" fill="#ff8fbf" stroke="#2a2350" strokeWidth="3" />
            <ellipse cx="168" cy="32" rx="7" ry="13" fill="#ff8fbf" stroke="#2a2350" strokeWidth="3" />
            <path d="M138 52 q5 4 10 0 M154 52 q5 4 10 0" stroke="#2a2350" strokeWidth="3" fill="none" strokeLinecap="round" />
          </g>
          <text className="ma-egg-z" x="178" y="22" fontSize="14" fontWeight="900" fill="#fff" stroke="#2a2350" strokeWidth="1.5">Z</text>
          {/* ไข่ 3 ระดับ */}
          <ellipse cx="96" cy="64" rx="9" ry="12" fill="#8fd16a" stroke="#2a2350" strokeWidth="2.5" />
          <ellipse cx="112" cy="70" rx="8" ry="11" fill="#3d8bff" stroke="#2a2350" strokeWidth="2.5" />
          <ellipse cx="80" cy="72" rx="9" ry="12" fill="#ffb31a" stroke="#2a2350" strokeWidth="2.5" />
          <circle cx="78" cy="68" r="2" fill="#fff" />
          <circle cx="94" cy="60" r="2" fill="#fff" />
        </svg>
        <span className="ma-egg-who">
          <Avatar id={4} gear={{ h: 0, o: 0, m: 0, i: 0 }} size={38} />
        </span>
      </div>
    );
  }
  if (mode === 'shape') {
    return (
      <div className="ma ma-hs">
        <svg viewBox="0 0 200 96" width="100%" height="100%" aria-hidden="true">
          <rect width="200" height="96" fill="#bfe6ff" />
          <rect y="84" width="200" height="12" fill="#9fe08a" />
          {[24, 60, 150, 182].map((x, i) => (
            <path key={i} className="ma-ar-star" d={`M${x} ${12 + (i % 2) * 10} l2 5 5 1 -4 3 1 5 -4 -3 -4 3 1 -5 -4 -3 5 -1z`} fill="#ffd23f" stroke="#2a2350" strokeWidth="1" style={{ animationDelay: `${i * 0.35}s` }} />
          ))}
          <path className="ma-hs-line" d="M60 84 L100 18 L140 84" fill="none" stroke="#ff5aa5" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2 12" />
          <g className="ma-hs-kid" style={{ animationDelay: '0s' }}>
            <g transform="translate(78 62) rotate(14)" stroke="#2a2350" strokeWidth="2.2" strokeLinecap="round">
              <line x1="-3" y1="6" x2="-5" y2="22" strokeWidth="5" />
              <line x1="3" y1="6" x2="5" y2="22" strokeWidth="5" />
              <rect x="-7" y="-10" width="14" height="18" rx="5" fill="#ff6b7a" />
              <line x1="-6" y1="-8" x2="-2" y2="-34" strokeWidth="4.5" /><line x1="6" y1="-8" x2="10" y2="-32" strokeWidth="4.5" />
              <circle cx="0" cy="-18" r="8" fill="#ffd9b8" />
              <path d="M-8 -19 q0 -9 8 -9 q8 0 8 9 q-4 -4 -8 -4 q-4 0 -8 4z" fill="#3a2a20" strokeWidth="1.5" />
            </g>
          </g>
          <g className="ma-hs-kid" style={{ animationDelay: '0.2s' }}>
            <g transform="translate(122 62) rotate(-14)" stroke="#2a2350" strokeWidth="2.2" strokeLinecap="round">
              <line x1="-3" y1="6" x2="-5" y2="22" strokeWidth="5" />
              <line x1="3" y1="6" x2="5" y2="22" strokeWidth="5" />
              <rect x="-7" y="-10" width="14" height="18" rx="5" fill="#4a7bf0" />
              <line x1="-6" y1="-8" x2="-10" y2="-32" strokeWidth="4.5" /><line x1="6" y1="-8" x2="2" y2="-34" strokeWidth="4.5" />
              <circle cx="0" cy="-18" r="8" fill="#ffd9b8" />
              <path d="M-8 -19 q0 -9 8 -9 q8 0 8 9 q-4 -4 -8 -4 q-4 0 -8 4z" fill="#3a2a20" strokeWidth="1.5" />
            </g>
          </g>
          <g className="ma-hs-kid" style={{ animationDelay: '0.4s' }}>
            <g transform="translate(100 62) rotate(0)" stroke="#2a2350" strokeWidth="2.2" strokeLinecap="round">
              <line x1="-3" y1="6" x2="-5" y2="22" strokeWidth="5" />
              <line x1="3" y1="6" x2="5" y2="22" strokeWidth="5" />
              <rect x="-7" y="-10" width="14" height="18" rx="5" fill="#25c48a" />
              <line x1="-6" y1="-8" x2="-24" y2="-8" strokeWidth="4.5" /><line x1="6" y1="-8" x2="24" y2="-8" strokeWidth="4.5" />
              <circle cx="0" cy="-18" r="8" fill="#ffd9b8" />
              <path d="M-8 -19 q0 -9 8 -9 q8 0 8 9 q-4 -4 -8 -4 q-4 0 -8 4z" fill="#3a2a20" strokeWidth="1.5" />
            </g>
          </g>
          <g transform="translate(100 74)">
            <circle r="6" fill="#fff" stroke="#2a2350" strokeWidth="1.8" />
            <text y="3" textAnchor="middle" fontSize="8" fontWeight="900" fill="#2a2350">3</text>
          </g>
        </svg>
      </div>
    );
  }
  if (mode === 'ghost') {
    return (
      <div className="ma ma-mk ma-gh">
        <svg viewBox="0 0 200 96" width="100%" height="100%" aria-hidden="true">
          <rect width="200" height="96" fill="#1a1240" />
          <circle cx="168" cy="20" r="11" fill="#fff3c4" />
          {[20, 60, 100, 140].map((x, i) => (
            <circle key={i} className="ma-ar-star" cx={x} cy={(i * 13) % 30 + 8} r="1.5" fill="#b8ffe0" style={{ animationDelay: `${i * 0.3}s` }} />
          ))}
          <path d="M0 96 v-22 h20 v-12 l10 -8 10 8 v12 h30 v-18 h16 v18 h40 l8 -14 8 14 h58 v22z" fill="#2a2050" />
          {/* ลำแสงไฟฉาย */}
          <path d="M58 52 L150 26 L158 70z" fill="#ffe38a" opacity="0.35" />
          {/* ผีน่ารักในวงไฟ */}
          <g className="ma-mk-mob" stroke="#22163f" strokeWidth="2.5" strokeLinejoin="round">
            <path d="M138 66 v-18 a12 12 0 0 1 24 0 v18 l-4 -3 -4 3 -4 -3 -4 3 -4 -3z" fill="#eef2ff" />
            <circle cx="146" cy="47" r="2" fill="#22163f" stroke="none" />
            <circle cx="154" cy="47" r="2" fill="#22163f" stroke="none" />
            <ellipse cx="142" cy="53" rx="2.4" ry="1.4" fill="#ff8fb5" stroke="none" />
            <ellipse cx="158" cy="53" rx="2.4" ry="1.4" fill="#ff8fb5" stroke="none" />
          </g>
          <circle className="ma-mk-bolt" cx="60" cy="50" r="5" fill="#3fe0a0" stroke="#fff" strokeWidth="2" />
          {/* นักล่าผีถือไฟฉาย */}
          <g stroke="#22163f" strokeWidth="2.5" strokeLinejoin="round">
            <rect x="20" y="54" width="9" height="20" rx="3" fill="#8a96a8" />
            <path d="M26 56 h18 l2 24 h-22z" fill="#6d5bff" />
            <circle cx="35" cy="47" r="10" fill="#ffe0c2" />
            <circle cx="31" cy="47" r="3.5" fill="#e8fff6" />
            <circle cx="39" cy="47" r="3.5" fill="#e8fff6" />
            <path d="M44 60 q8 -2 12 -8" fill="none" stroke="#6d5bff" strokeWidth="5" strokeLinecap="round" />
            <rect x="52" y="46" width="8" height="8" rx="1.5" fill="#c0c8d0" />
          </g>
        </svg>
      </div>
    );
  }
  if (mode === 'ocean') {
    return (
      <div className="ma ma-mk ma-og">
        <svg viewBox="0 0 200 96" width="100%" height="100%" aria-hidden="true">
          <defs>
            <linearGradient id="maOgSea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#2fc4e8" />
              <stop offset="1" stopColor="#0f5fa8" />
            </linearGradient>
          </defs>
          <rect width="200" height="96" fill="url(#maOgSea)" />
          <path d="M30 0 l20 0 -30 96 -14 0z M120 0 l14 0 -24 96 -10 0z" fill="#fff" opacity="0.14" />
          {[30, 70, 110, 150, 182].map((x, i) => (
            <circle key={i} className="ma-ar-star" cx={x} cy={(i * 19) % 40 + 10} r={i % 2 ? 2 : 3} fill="none" stroke="#dff8ff" strokeWidth="1.2" style={{ animationDelay: `${i * 0.3}s` }} />
          ))}
          <rect y="84" width="200" height="12" fill="#e8d29a" />
          <g stroke="#123a52" strokeWidth="2.5" strokeLinecap="round" fill="none">
            <path d="M14 86 v-14 l-6 -6 m6 6 l6 -8" stroke="#ff6b9a" strokeWidth="4" />
            <path d="M190 86 v-18 l-5 -6 m5 6 l6 -9" stroke="#ffb347" strokeWidth="4" />
          </g>
          {/* ฟองคำตอบมีปลา */}
          <g className="ma-mk-mob" stroke="#123a52" strokeWidth="2.5">
            <circle cx="160" cy="46" r="20" fill="#dff8ff" fillOpacity="0.45" />
            <ellipse cx="160" cy="47" rx="11" ry="8" fill="#ffb347" />
            <path d="M149 47 l-7 -6 v12z" fill="#ffb347" />
            <circle cx="165" cy="45" r="2" fill="#123a52" stroke="none" />
          </g>
          {/* ขวดพลาสติก */}
          <g stroke="#123a52" strokeWidth="2" transform="rotate(20 112 30)">
            <rect x="106" y="22" width="11" height="20" rx="3" fill="#9ff0d0" />
            <rect x="108.5" y="17" width="6" height="6" fill="#2f8ae8" />
          </g>
          {/* คลื่นน้ำ */}
          <circle className="ma-mk-bolt" cx="60" cy="50" r="6" fill="#59c8ff" stroke="#fff" strokeWidth="2" />
          {/* นักดำน้ำ */}
          <g stroke="#123a52" strokeWidth="2.5" strokeLinejoin="round">
            <rect x="20" y="52" width="8" height="22" rx="4" fill="#ffc53a" />
            <path d="M26 54 h18 l2 26 h-22z" fill="#2f8ae8" />
            <circle cx="35" cy="46" r="10" fill="#ffe0c2" />
            <rect x="26" y="41" width="18" height="8" rx="4" fill="#bff3ff" />
            <path d="M44 58 q8 -2 12 -8" fill="none" stroke="#2f8ae8" strokeWidth="5" strokeLinecap="round" />
          </g>
        </svg>
      </div>
    );
  }
  if (mode === 'magic') {
    return (
      <div className="ma ma-mk">
        <svg viewBox="0 0 200 96" width="100%" height="100%" aria-hidden="true">
          <defs>
            <linearGradient id="maMkSky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#5b3fd0" />
              <stop offset="1" stopColor="#ff9ad5" />
            </linearGradient>
          </defs>
          <rect width="200" height="96" fill="url(#maMkSky)" />
          {[18, 52, 90, 140, 176, 120].map((x, i) => (
            <circle key={i} className="ma-ar-star" cx={x} cy={(i * 17) % 34 + 6} r={i % 2 ? 1.2 : 1.8} fill="#fff" style={{ animationDelay: `${i * 0.3}s` }} />
          ))}
          {/* ปราสาท */}
          <g stroke="#2a1d50" strokeWidth="2.5" strokeLinejoin="round">
            <rect x="86" y="44" width="34" height="34" fill="#fff" />
            <rect x="78" y="34" width="12" height="44" fill="#e8e0ff" />
            <rect x="116" y="34" width="12" height="44" fill="#e8e0ff" />
            <path d="M77 34 l7 -12 7 12z M115 34 l7 -12 7 12z" fill="#ff6b9a" />
            <path d="M97 78 v-12 a6 6 0 0 1 12 0 v12" fill="#6d5bff" />
          </g>
          <rect y="78" width="200" height="18" fill="#7be36b" />
          {/* สไลม์มอนสเตอร์ */}
          <g className="ma-mk-mob" stroke="#2a1d50" strokeWidth="2.5">
            <path d="M152 70 q0 -22 16 -22 q16 0 16 22z" fill="#ff8fc7" />
            <circle cx="162" cy="60" r="2.4" fill="#2a1d50" stroke="none" />
            <circle cx="174" cy="60" r="2.4" fill="#2a1d50" stroke="none" />
          </g>
          {/* ลูกไฟ */}
          <circle className="ma-mk-bolt" cx="60" cy="50" r="6" fill="#ffb347" stroke="#fff" strokeWidth="2" />
          {/* นักเวท */}
          <g stroke="#2a1d50" strokeWidth="2.5" strokeLinejoin="round">
            <path d="M34 54 L20 84 q14 4 28 0z" fill="#6d5bff" />
            <circle cx="34" cy="48" r="9" fill="#ffe0c2" />
            <path d="M22 42 q12 -5 24 0 q-3 3 -12 3 q-9 0 -12 -3z M27 41 l8 -20 9 20z" fill="#6d5bff" />
            <line x1="48" y1="80" x2="50" y2="50" stroke="#8a5a3a" strokeWidth="3.5" />
            <path d="M50 42 l2 5 5 .5 -4 3.5 1 5 -4 -2.5 -4 2.5 1 -5 -4 -3.5 5 -.5z" fill="#ffd23f" strokeWidth="1.5" />
          </g>
        </svg>
      </div>
    );
  }
  if (mode === 'ar') {
    return (
      <div className="ma ma-ar">
        <svg viewBox="0 0 200 96" width="100%" height="100%" aria-hidden="true">
          <rect width="200" height="96" fill="#1b1260" />
          {[12, 40, 70, 96, 128, 160, 186, 24, 112, 176].map((x, i) => (
            <circle key={i} className="ma-ar-star" cx={x} cy={(i * 29) % 70 + 6} r={i % 3 ? 1.2 : 2} fill="#fff" style={{ animationDelay: `${i * 0.3}s` }} />
          ))}
          <circle cx="182" cy="84" r="22" fill="#ff8fc7" stroke="#2a2350" strokeWidth="2.5" />
          {/* ยานเอเลียน */}
          <g className="ma-ar-ufo">
            <ellipse cx="132" cy="34" rx="12" ry="11" fill="#bff3ff" stroke="#2a2350" strokeWidth="2.5" />
            <circle cx="132" cy="34" r="6" fill="#7be36b" />
            <ellipse cx="132" cy="42" rx="26" ry="8" fill="#ffc53a" stroke="#2a2350" strokeWidth="2.5" />
            <circle cx="118" cy="43" r="2" fill="#fff" />
            <circle cx="132" cy="45" r="2" fill="#fff" />
            <circle cx="146" cy="43" r="2" fill="#fff" />
          </g>
          {/* เลเซอร์ */}
          <line className="ma-ar-laser" x1="58" y1="70" x2="126" y2="40" stroke="#2fb8ff" strokeWidth="5" strokeLinecap="round" />
          <line className="ma-ar-laser" x1="58" y1="70" x2="126" y2="40" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
          {/* เด็กยกมือ (โครงร่าง) */}
          <g stroke="#2fb8ff" strokeWidth="4" strokeLinecap="round" fill="none">
            <circle cx="40" cy="52" r="8" fill="#ffe0c2" stroke="#2a2350" strokeWidth="2.5" />
            <path d="M40 60 v20 M30 64 h20 M50 64 l8 6 M30 64 l-6 12" />
          </g>
          <circle cx="58" cy="70" r="4" fill="#fff" stroke="#2fb8ff" strokeWidth="2" />
        </svg>
      </div>
    );
  }
  if (mode === 'fishing') {
    return (
      <div className="ma ma-fish">
        <span className="ma-fish-who">
          <Avatar id={7} gear={{ h: 2, o: 0, m: 1, i: 0 }} size={40} />
        </span>
        <span className="ma-fish-line" />
        <span className="ma-fish-a" style={{ top: '40%' }}>
          <FishArt id="clown" size={34} />
        </span>
        <span className="ma-fish-a" style={{ top: '62%', animationDuration: '9s', animationDelay: '-4s' }}>
          <FishArt id="shark" size={46} />
        </span>
        <span className="ma-fish-a" style={{ top: '80%', animationDuration: '12s', animationDelay: '-2s' }}>
          <FishArt id="angler" size={40} glow />
        </span>
      </div>
    );
  }
  return (
    <div className="ma ma-race">
      {[0, 1, 2].map((i) => (
        <div key={i} className="ma-lane">
          <span className="ma-runner" style={{ animationDelay: `${-i * 0.9}s`, animationDuration: `${3.2 + i * 0.5}s` }}>
            <Avatar id={[0, 7, 3][i]} size={30} />
          </span>
        </div>
      ))}
      <span className="ma-flag">
        <Flag size={22} />
      </span>
    </div>
  );
}
