import React from 'react';
import './night.css';

/**
 * ท้องฟ้ากลางคืน (โชว์เฉพาะโหมดมืด) วางเป็นฉากหลังของหน้าสร้างเกม / สมัครสมาชิก
 * ดาวระยิบ พระจันทร์ ดาวตก เนินเขากับหิ่งห้อย ไม่บังการกด (ตำแหน่งคงที่ กัน hydration ไม่ตรง)
 */
const STARS = Array.from({ length: 70 }, (_, i) => ({
  left: (i * 47 + 13) % 100,
  top: (i * 29 + 5) % 78,
  size: 1.5 + ((i * 7) % 3),
  delay: (i % 11) * 0.37,
  dur: 2.2 + (i % 5) * 0.5,
}));
const FLIES = Array.from({ length: 14 }, (_, i) => ({ left: (i * 61 + 7) % 96, bottom: 4 + ((i * 17) % 22), delay: (i % 7) * 0.9 }));

export function NightSky() {
  return (
    <div className="nsky" aria-hidden="true">
      <div className="nsky-aurora" />
      {STARS.map((s, i) => (
        <span key={i} className="nsky-star" style={{ left: `${s.left}%`, top: `${s.top}%`, width: s.size, height: s.size, animationDelay: `${s.delay}s`, animationDuration: `${s.dur}s` }} />
      ))}
      <span className="nsky-shoot" style={{ top: '12%', left: '70%' }} />
      <span className="nsky-shoot" style={{ top: '26%', left: '35%', animationDelay: '5.5s' }} />
      <svg className="nsky-moon" viewBox="0 0 120 120" width="120" height="120">
        <defs>
          <radialGradient id="nsky-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fff6c8" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#fff6c8" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="60" cy="60" r="58" fill="url(#nsky-glow)" />
        <path d="M74 26 A36 36 0 1 0 92 82 A30 30 0 1 1 74 26 Z" fill="#fff3b0" stroke="#2a2350" strokeWidth="3" />
        <circle cx="52" cy="58" r="4" fill="#f0dc8a" />
        <circle cx="60" cy="80" r="3" fill="#f0dc8a" />
        <circle cx="47" cy="74" r="2" fill="#2a2350" />
        <path d="M54 86 Q58 89 62 86" fill="none" stroke="#2a2350" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <svg className="nsky-hills" viewBox="0 0 1200 160" preserveAspectRatio="none">
        <path d="M0 110 Q150 40 320 90 T640 80 T960 70 T1200 90 L1200 160 L0 160 Z" fill="#2b2470" />
        <path d="M0 135 Q220 90 430 125 T860 115 T1200 120 L1200 160 L0 160 Z" fill="#1f1a56" />
      </svg>
      {FLIES.map((f, i) => (
        <span key={i} className="nsky-fly" style={{ left: `${f.left}%`, bottom: `${f.bottom}%`, animationDelay: `${f.delay}s` }} />
      ))}
    </div>
  );
}
