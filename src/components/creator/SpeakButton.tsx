'use client';

import React, { useEffect, useState } from 'react';
import { Square, Volume2 } from 'lucide-react';
import { richToPlain } from '@/lib/game-creator/quiz';
import type { Rich } from '@/lib/game-creator/types';

/** แบ่งข้อความเป็นช่วงภาษาไทย/ไม่ใช่ไทย ให้แต่ละช่วงอ่านด้วยเสียงภาษานั้น (โจทย์อังกฤษที่มีคำสั่งไทยปน) */
export function speechRuns(s: string): { lang: 'th-TH' | 'en-US'; text: string }[] {
  type Lang = 'th-TH' | 'en-US';
  // ช่วงที่มีแต่ตัวเลข/เครื่องหมาย (lang null) อ่านด้วยภาษาของช่วงข้างๆ
  const raw: { lang: Lang | null; text: string }[] = [];
  for (const m of s.matchAll(/[฀-๿]+|[A-Za-z][A-Za-z'’-]*|[^฀-๿A-Za-z]+/g)) {
    const t = m[0];
    raw.push({ lang: /[฀-๿]/.test(t) ? 'th-TH' : /[A-Za-z]/.test(t) ? 'en-US' : null, text: t });
  }
  const fallback: Lang = raw.some((r) => r.lang === 'th-TH') ? 'th-TH' : 'en-US';
  raw.forEach((r, i) => {
    if (r.lang) return;
    const prev = raw.slice(0, i).reverse().find((x) => x.lang)?.lang;
    const next = raw.slice(i + 1).find((x) => x.lang)?.lang;
    // เครื่องหมายล้วนติดช่วงก่อนหน้า ตัวเลขติดช่วงถัดไป (25 + 13 เท่ากับ... อ่านไทยทั้งประโยค)
    r.lang = /\d/.test(r.text) ? (prev && prev === next ? prev : (next ?? prev ?? fallback)) : (prev ?? next ?? fallback);
  });
  const out: { lang: Lang; text: string }[] = [];
  for (const r of raw) {
    const last = out[out.length - 1];
    if (last && last.lang === r.lang) last.text += r.text;
    else out.push({ lang: r.lang!, text: r.text });
  }
  return out.map((r) => ({ ...r, text: r.text.replace(/\s+/g, ' ').trim() })).filter((r) => /[\p{L}\p{N}]/u.test(r.text));
}

/** ข้อความที่จะอ่าน: โจทย์ แล้วตามด้วยตัวเลือกทีละข้อ */
export function questionSpeech(text: Rich, choices: { text: Rich }[] = []): string {
  const q = richToPlain(text, 400);
  const cs = choices.map((c, i) => `${i + 1}. ${richToPlain(c.text, 120)}`).filter((x) => x.length > 3);
  return [q, ...cs].join('. ');
}

const canSpeak = () => typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';

/** ปุ่มฟังเสียงอ่านโจทย์ (Web Speech API ในเครื่อง ไม่ส่งข้อมูลออก) เบราว์เซอร์ที่ไม่รองรับ = ไม่แสดงปุ่ม */
export function SpeakButton({ text, className }: { text: string; className?: string }) {
  const [ok, setOk] = useState(false);
  const [on, setOn] = useState(false);
  useEffect(() => {
    setOk(canSpeak());
    // เปลี่ยนข้อ/ออกจากหน้า = หยุดอ่าน
    return () => {
      if (canSpeak()) window.speechSynthesis.cancel();
    };
  }, [text]);
  if (!ok || !text.trim()) return null;

  const stop = () => {
    window.speechSynthesis.cancel();
    setOn(false);
  };
  const play = () => {
    const ss = window.speechSynthesis;
    ss.cancel();
    const voices = ss.getVoices();
    const runs = speechRuns(text);
    if (!runs.length) return;
    runs.forEach((r, i) => {
      const u = new SpeechSynthesisUtterance(r.text);
      u.lang = r.lang;
      u.rate = r.lang === 'th-TH' ? 1 : 0.9;
      const v = voices.find((x) => x.lang.replace('_', '-').startsWith(r.lang.slice(0, 2)));
      if (v) u.voice = v;
      if (i === runs.length - 1) u.onend = u.onerror = () => setOn(false);
      ss.speak(u);
    });
    setOn(true);
  };

  return (
    <button
      type="button"
      className={className ? `l5g-speak ${className}` : 'l5g-speak'}
      data-on={on}
      aria-label={on ? 'หยุดอ่าน' : 'ฟังเสียงอ่านโจทย์'}
      title={on ? 'หยุดอ่าน' : 'ฟังเสียงอ่านโจทย์'}
      onClick={(e) => {
        e.stopPropagation();
        if (on) stop();
        else play();
      }}
    >
      {on ? <Square className="w-4 h-4" fill="currentColor" /> : <Volume2 className="w-5 h-5" />}
    </button>
  );
}
