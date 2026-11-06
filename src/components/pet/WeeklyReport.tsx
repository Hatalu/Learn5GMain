'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Award, Crown, Download, Home, Printer } from 'lucide-react';
import { Buddy } from '@/components/companion/Buddy';
import { useCompanion } from '@/components/companion/CompanionProvider';
import { JoinButton } from '@/components/membership/JoinButton';
import { petAct } from '@/lib/companion-store';
import { bkkParts, shownStage } from '@/lib/companion';
import { track, weekOf } from '@/lib/pet/logic';
import { CERT_LABEL, CERT_RULES, DAY_LABEL, SUBJ_LABEL, prevWeek, weekReport, type WeekReport } from '@/lib/pet/report';
import './pet.css';

const NAME_KEY = 'l5g_cert_name';
const TIER_COLOR = { gold: '#f5b83d', silver: '#a9b6c9', bronze: '#d08a55' } as const;

const fmt = (d: string) => new Date(`${d}T00:00:00+07:00`).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', timeZone: 'Asia/Bangkok' });

/** รายงานรายสัปดาห์สำหรับผู้ปกครอง + ใบประกาศให้เด็ก ข้อมูลจากการเล่นจริงเท่านั้น */
export function WeeklyReport() {
  const { state, ready, entitled } = useCompanion();
  const today = useMemo(() => bkkParts().date, []);
  const thisWeek = weekOf(today);
  const [week, setWeek] = useState(thisWeek);
  const r = useMemo(() => weekReport(state.pet, today, week), [state.pet, today, week]);

  useEffect(() => {
    if (ready) petAct((p) => (p.pet.day.d === today && p.pet.day.c.report ? p : track(p, 'report', today)));
  }, [ready, today]);

  const up = r.ok - r.prevOk;
  return (
    <div className="rp-week-page">
      <div className="rp-week">
        <div className="rp-w-head">
          <div>
            <h1>รายงานการเรียนรู้</h1>
            <small style={{ fontWeight: 600 }}>{fmt(r.week)} - {fmt(r.end)}</small>
          </div>
          <div className="pr-row">
            <button type="button" className="pr-btn pr-btn-ghost" data-on={week === thisWeek || undefined} disabled={week === thisWeek} onClick={() => setWeek(thisWeek)}>สัปดาห์นี้</button>
            <button type="button" className="pr-btn pr-btn-ghost" disabled={week !== thisWeek} onClick={() => setWeek(prevWeek(thisWeek))}>สัปดาห์ก่อน</button>
            <Link href="/buddy" className="pr-icon-btn" aria-label="ไปห้องปุ๋ง"><Home className="w-5 h-5" /></Link>
          </div>
        </div>

        <section className="rp-w-card">
          <div className="rp-stats">
            <div className="rp-stat"><b>{r.activeDays}/7</b><small>วันที่มาเรียน</small></div>
            <div className="rp-stat"><b>{r.ok}</b><small>ข้อที่ตอบถูก</small>{entitled && r.prevOk > 0 && up > 0 && <em>มากกว่าสัปดาห์ก่อน {up} ข้อ</em>}</div>
            <div className="rp-stat"><b>{r.tot ? `${r.pct}%` : '-'}</b><small>ตอบถูกจาก {r.tot} ข้อ</small></div>
            <div className="rp-stat"><b>{r.puzzles}</b><small>ปริศนา · ต่อเนื่อง {r.streak} วัน</small></div>
          </div>
        </section>

        <section className="rp-w-card">
          <h2>ข้อที่ตอบถูกรายวัน</h2>
          <Bars r={r} today={today} />
        </section>

        <section className="rp-w-card">
          <h2>แยกตามวิชา</h2>
          <div className={entitled ? '' : 'rp-blur'} aria-hidden={!entitled || undefined}>
            {r.subjects.length === 0 && <p className="pr-note">ยังไม่มีการตอบคำถามในสัปดาห์นี้ ลองเล่นปริศนาวันนี้ดูไหม</p>}
            {r.subjects.map((s) => (
              <div key={s.key} className="rp-subj">
                <span>{SUBJ_LABEL[s.key]}</span>
                <div className="pr-bar"><i style={{ width: `${s.pct}%`, background: '#7c5cff' }} /></div>
                <span>{s.pct}% ({s.ok}/{s.tot})</span>
              </div>
            ))}
            {r.best && <p className="rp-tip">เก่งสุดสัปดาห์นี้: {SUBJ_LABEL[r.best]}{r.practice ? ` · ควรฝึกเพิ่ม: ${SUBJ_LABEL[r.practice]}` : ''}</p>}
          </div>
          {!entitled && (
            <div className="rp-lock">
              <Crown className="w-7 h-7 text-sun-500" />
              <p>ดูผลแยกวิชาและเรื่องที่ควรฝึก สำหรับสมาชิก</p>
              <JoinButton className="pr-btn">สมัครสมาชิก</JoinButton>
            </div>
          )}
        </section>

        <Certificate r={r} look={{ stage: Math.max(1, shownStage(state.stars, state.pet.hatched)), color: state.color, wear: state.pet.wear, species: state.pet.species }} />
        <p className="pr-note" style={{ textAlign: 'center' }}>
          นับจากปริศนา ลูกโป่งคำตอบ และเกมจากชุดคำถาม {entitled ? 'บันทึกกับบัญชี' : 'บันทึกในเครื่องนี้'} · เกมในคลังยังไม่ส่งคะแนนรายข้อเข้ารายงาน
        </p>
      </div>
    </div>
  );
}

function Bars({ r, today }: { r: WeekReport; today: string }) {
  const max = Math.max(1, ...r.days.map((d) => d.ok));
  return (
    <div className="rp-bars">
      {r.days.map((d, i) => (
        <div key={d.d} className="rp-col" title={`${fmt(d.d)}: ถูก ${d.ok} จาก ${d.tot} ข้อ`}>
          {d.ok > 0 && <span>{d.ok}</span>}
          <i style={{ height: `${Math.round((d.ok / max) * 72)}%` }} />
          <span style={{ fontWeight: d.d === today ? 800 : 600, textDecoration: d.d === today ? 'underline' : undefined }}>{DAY_LABEL[i]}</span>
        </div>
      ))}
    </div>
  );
}

function Certificate({ r, look }: { r: WeekReport; look: { stage: number; color: string; species: string; wear: Partial<Record<'hat' | 'face' | 'body' | 'back', string>> } }) {
  const sheet = useRef<HTMLDivElement>(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      setName(localStorage.getItem(NAME_KEY) || '');
    } catch {
      /* ไม่จำชื่อก็ใช้ได้ */
    }
  }, []);

  const rule = CERT_RULES[CERT_RULES.length - 1];
  if (!r.cert) {
    return (
      <section className="rp-w-card">
        <h2><Award className="inline w-5 h-5 mr-1" /> ใบประกาศสัปดาห์นี้</h2>
        <p style={{ fontWeight: 600 }}>อีกนิดเดียว: มาเรียน {rule.days} วัน และตอบถูก {rule.ok} ข้อ</p>
        <div className="rp-subj"><span>วันที่มาเรียน</span><div className="pr-bar"><i style={{ width: `${Math.min(100, (r.activeDays / rule.days) * 100)}%` }} /></div><span>{r.activeDays}/{rule.days}</span></div>
        <div className="rp-subj"><span>ตอบถูก</span><div className="pr-bar"><i style={{ width: `${Math.min(100, (r.ok / rule.ok) * 100)}%` }} /></div><span>{r.ok}/{rule.ok}</span></div>
      </section>
    );
  }

  const color = TIER_COLOR[r.cert];
  const save = async () => {
    if (!sheet.current) return;
    setBusy(true);
    try {
      const { toPng } = await import('html-to-image');
      const url = await toPng(sheet.current, { pixelRatio: 2, cacheBust: true });
      const a = document.createElement('a');
      a.href = url;
      a.download = `ใบประกาศ-${r.week}.png`;
      a.click();
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rp-w-card">
      <h2><Award className="inline w-5 h-5 mr-1" /> ใบประกาศระดับ{CERT_LABEL[r.cert]}</h2>
      <div className="ce-form no-print">
        <input
          value={name}
          maxLength={40}
          placeholder="พิมพ์ชื่อบนใบประกาศ"
          aria-label="ชื่อบนใบประกาศ"
          onChange={(e) => {
            setName(e.target.value);
            try {
              localStorage.setItem(NAME_KEY, e.target.value);
            } catch {
              /* ไม่จำชื่อก็ใช้ได้ */
            }
          }}
        />
        <button type="button" className="pr-btn" disabled={busy} onClick={save}><Download className="w-4 h-4" /> บันทึกรูป</button>
        <button type="button" className="pr-btn pr-btn-ghost" onClick={() => window.print()}><Printer className="w-4 h-4" /> พิมพ์</button>
      </div>
      <div className="ce-wrap">
        <div ref={sheet} className="ce-sheet" style={{ '--tier': color } as React.CSSProperties}>
          <div className="ce-medal">
            <svg viewBox="0 0 100 100" aria-hidden="true">
              <path d="M30 4 L44 44 L56 44 L70 4 Z" fill="#7c5cff" stroke="#2a2350" strokeWidth="4" strokeLinejoin="round" />
              <circle cx="50" cy="62" r="32" fill={color} stroke="#2a2350" strokeWidth="4" />
              <path d="M50 42 l6 13 14 1 -11 9 4 14 -13 -8 -13 8 4 -14 -11 -9 14 -1z" fill="#fff" stroke="#2a2350" strokeWidth="3" strokeLinejoin="round" />
            </svg>
          </div>
          <h3>ใบประกาศนักเรียนรู้ระดับ{CERT_LABEL[r.cert]}</h3>
          <p className="ce-sub">มอบให้แก่</p>
          <p className="ce-name">{name.trim() || 'นักเรียนรู้คนเก่ง'}</p>
          <p className="ce-text">ตั้งใจเรียนรู้สม่ำเสมอ ตลอดสัปดาห์ {fmt(r.week)} - {fmt(r.end)}</p>
          <p className="ce-stats">มาเรียน {r.activeDays} วัน · ตอบถูก {r.ok} ข้อ · แม่นยำ {r.pct}%</p>
          <div className="ce-buddy"><Buddy stage={look.stage} color={look.color} wear={look.wear} species={look.species} size={110} animate={false} expr="happy" /></div>
          <span className="ce-site">สื่อการสอน 5G · learn5g-th.online</span>
        </div>
      </div>
    </section>
  );
}
