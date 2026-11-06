'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Check, Copy, Download, Home, Share2, Sparkles } from 'lucide-react';
import { Buddy } from '@/components/companion/Buddy';
import { StarIcon } from '@/components/companion/Stars';
import { useCompanion } from '@/components/companion/CompanionProvider';
import { petAct, recordAnswer } from '@/lib/companion-store';
import { bkkParts, msUntilMidnight, shownStage } from '@/lib/companion';
import { puzzleStreak, savePuzzle } from '@/lib/pet/logic';
import { seasonOfMonth } from '@/lib/pet/catalog';
import { PUZZLE_COUNT, PUZZLE_LEVELS, PUZZLE_SECONDS, dailyPuzzle, puzzleNumber, puzzleScore, shareText, type PuzzleLevel } from '@/lib/pet/puzzle';
import { gsfx } from '@/lib/game-creator/gsound';
import { sfx } from '@/lib/sound';
import { AnswerStamp, LevelPick, saveLevel, savedLevel } from './PetGames';
import './pet.css';

/** ปริศนาประจำวัน 1 นาที: โจทย์เดียวกันทุกเครื่องในวันเดียวกัน เล่นได้วันละครั้ง ไม่ต้องล็อกอิน */
export function DailyPuzzle() {
  const { state, ready } = useCompanion();
  const parts = useMemo(() => bkkParts(), []);
  const today = parts.date;
  const played = state.pet.puzzles.find((p) => p.d === today);
  const [lv, setLv] = useState<PuzzleLevel | null>(null);
  const [started, setStarted] = useState(false);
  const [justStars, setJustStars] = useState<number | null>(null);
  const season = seasonOfMonth(parts.month);

  useEffect(() => setLv(savedLevel()), []);

  const finish = useCallback(
    (m: string, secs: number, level: PuzzleLevel) => {
      let got = 0;
      petAct((p) => {
        const r = savePuzzle(p, { d: today, lv: level, m, s: secs }, today);
        got = r.stars;
        return r.ps;
      });
      setJustStars(got);
      sfx.cheer();
    },
    [today]
  );

  return (
    <div className="pz-page">
      <div className="pz-box">
        <div className="pz-head">
          <div>
            <small>{season.name}</small>
            <h1>ปริศนาวันนี้ ฉบับที่ {puzzleNumber(today)}</h1>
          </div>
          <Link href="/buddy" className="pr-icon-btn" aria-label="ไปห้องปุ๋ง"><Home className="w-5 h-5" /></Link>
        </div>

        {!ready ? (
          <div className="pz-card">กำลังโหลด...</div>
        ) : played ? (
          <Result date={today} lv={played.lv as PuzzleLevel} marks={played.m} secs={played.s} streak={puzzleStreak(state.pet, today)} stars={justStars} look={{ stage: shownStage(state.stars, state.pet.hatched), color: state.color, wear: state.pet.wear, species: state.pet.species }} />
        ) : !lv ? (
          <div className="pz-card">
            <LevelPick onPick={(l) => { saveLevel(l); setLv(l); }} />
          </div>
        ) : !started ? (
          <div className="pz-card" style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: 22, fontWeight: 800 }}>5 ข้อ 60 วินาที</h2>
            <p style={{ fontWeight: 600, color: '#625c86', margin: '4px 0 12px' }}>เล่นได้วันละครั้ง ทุกคนได้โจทย์เดียวกัน</p>
            <p style={{ fontWeight: 800, marginBottom: 12 }}>{PUZZLE_LEVELS.find((l) => l.id === lv)!.label} ({PUZZLE_LEVELS.find((l) => l.id === lv)!.sub})</p>
            <div className="pr-row">
              <button type="button" className="pr-btn pr-btn-ghost" onClick={() => setLv(null)}>เปลี่ยนระดับ</button>
              <button type="button" className="pr-btn" onClick={() => { sfx.pop(); setStarted(true); }}><Sparkles className="w-4 h-4" /> เริ่มเลย</button>
            </div>
          </div>
        ) : (
          <Play date={today} lv={lv} onEnd={(m, s) => finish(m, s, lv)} />
        )}
      </div>
    </div>
  );
}

/* ------------------------------ ระหว่างเล่น ------------------------------ */

function Play({ date, lv, onEnd }: { date: string; lv: PuzzleLevel; onEnd: (marks: string, secs: number) => void }) {
  const qs = useMemo(() => dailyPuzzle(date, lv), [date, lv]);
  const [i, setI] = useState(0);
  const [marks, setMarks] = useState<string[]>([]);
  const [wrong, setWrong] = useState<string[]>([]);
  const [okPick, setOkPick] = useState<string | null>(null);
  const [reveal, setReveal] = useState(false);
  const [built, setBuilt] = useState<number[]>([]);
  const [left, setLeft] = useState(PUZZLE_SECONDS);
  const started = useRef(Date.now());
  const busy = useRef(false);
  const ended = useRef(false);
  const q = qs[i];

  const end = useCallback(
    (m: string[]) => {
      if (ended.current) return;
      ended.current = true;
      // ข้อที่ยังไม่ได้ตอบตอนหมดเวลานับเป็นผิด
      for (let k = m.length; k < PUZZLE_COUNT; k++) recordAnswer(false, qs[k].subj);
      const full = (m.join('') + '0'.repeat(PUZZLE_COUNT)).slice(0, PUZZLE_COUNT);
      onEnd(full, Math.min(PUZZLE_SECONDS, Math.round((Date.now() - started.current) / 1000)));
    },
    [onEnd, qs]
  );

  useEffect(() => {
    const t = setInterval(() => {
      const l = Math.max(0, PUZZLE_SECONDS - (Date.now() - started.current) / 1000);
      setLeft(l);
    }, 250);
    return () => clearInterval(t);
  }, []);

  const marksRef = useRef(marks);
  marksRef.current = marks;
  useEffect(() => {
    if (left <= 0) end(marksRef.current);
  }, [left, end]);

  const next = (mark: string, ok: boolean) => {
    recordAnswer(ok, q.subj);
    const m = [...marks, mark];
    setMarks(m);
    setTimeout(
      () => {
        busy.current = false;
        setWrong([]);
        setOkPick(null);
        setReveal(false);
        setBuilt([]);
        if (i + 1 >= PUZZLE_COUNT) end(m);
        else setI(i + 1);
      },
      ok ? 520 : 1300
    );
  };

  const judge = (val: string) => {
    if (busy.current) return;
    if (val === q.answer) {
      busy.current = true;
      setOkPick(val);
      gsfx.correct();
      next(wrong.length ? '1' : '2', true);
    } else if (wrong.length === 0) {
      gsfx.wrong();
      setWrong([val]);
    } else {
      busy.current = true;
      gsfx.wrong();
      setWrong((w) => [...w, val]);
      setReveal(true);
      next('0', false);
    }
  };

  const tapTile = (idx: number) => {
    if (busy.current || built.includes(idx)) return;
    sfx.pop();
    const b = [...built, idx];
    setBuilt(b);
    if (b.length === q.choices.length) {
      const word = b.map((k) => q.choices[k]).join('');
      if (word === q.answer) judge(word);
      else {
        judge(word);
        if (!busy.current) setTimeout(() => setBuilt([]), 500);
      }
    }
  };

  return (
    <>
      <div className="pz-time" data-low={left < 15 || undefined} role="timer" aria-label={`เหลือ ${Math.ceil(left)} วินาที`}>
        <i style={{ width: `${(left / PUZZLE_SECONDS) * 100}%` }} />
      </div>
      <div className="pz-marks" aria-hidden="true">
        {Array.from({ length: PUZZLE_COUNT }, (_, k) => <span key={k} className="pz-mark" data-v={marks[k]} data-cur={k === i || undefined} />)}
      </div>
      <div className="pz-card" key={i} style={{ animation: 'pr-bounce .35s both', position: 'relative' }}>
        {okPick && <AnswerStamp kind="ok" />}
        {!okPick && wrong.length > 0 && <AnswerStamp key={wrong.length} kind="no" />}
        <span className="pz-tag">{q.tag}</span>
        <p className="pz-prompt">{q.prompt}</p>
        {wrong.length > 0 && !reveal && <p className="pz-hint">{q.hint} ลองอีกครั้ง</p>}
        {reveal && <p className="pz-hint">คำตอบคือ {q.answer} ไม่เป็นไรนะ</p>}
        {q.kind === 'word' ? (
          <>
            <div className="pz-slots">
              {q.answer.split('').map((_, k) => <span key={k} className="pz-slot" data-fill={built[k] !== undefined || undefined}>{built[k] !== undefined ? q.choices[built[k]] : ''}</span>)}
            </div>
            <div className="pz-tiles">
              {q.choices.map((c, k) => <button key={k} type="button" className="pz-tile" disabled={built.includes(k)} onClick={() => tapTile(k)}>{c}</button>)}
            </div>
            {built.length > 0 && !busy.current && <button type="button" className="pr-link" onClick={() => setBuilt([])}>เรียงใหม่</button>}
          </>
        ) : (
          <div className="pz-choices">
            {q.choices.map((c) => (
              <button key={c} type="button" className="pz-choice" data-state={okPick === c ? 'ok' : wrong.includes(c) ? 'no' : reveal && c === q.answer ? 'show' : undefined} disabled={wrong.includes(c)} onClick={() => judge(c)}>
                {c}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

/* ------------------------------ ผล + แชร์ ------------------------------ */

function Result({ date, lv, marks, secs, streak, stars, look }: {
  date: string; lv: PuzzleLevel; marks: string; secs: number; streak: number; stars: number | null;
  look: { stage: number; color: string; species: string; wear: Partial<Record<'hat' | 'face' | 'body' | 'back', string>> };
}) {
  const card = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const label = PUZZLE_LEVELS.find((l) => l.id === lv)!;
  const text = shareText(date, lv, marks, secs);
  const score = puzzleScore(marks, secs);
  const right = marks.split('').filter((c) => c !== '0').length;
  const canShare = typeof navigator !== 'undefined' && !!navigator.share;

  const image = async (): Promise<Blob | null> => {
    if (!card.current) return null;
    const { toBlob } = await import('html-to-image');
    return toBlob(card.current, { pixelRatio: 2, cacheBust: true });
  };

  const download = async (b: Blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(b);
    a.download = `ปริศนา5G-${puzzleNumber(date)}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  };

  const share = async () => {
    setBusy(true);
    try {
      const b = await image();
      const file = b ? new File([b], `puzzle-${puzzleNumber(date)}.png`, { type: 'image/png' }) : null;
      if (file && navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], text });
      else await navigator.share({ text });
    } catch {
      /* ผู้ใช้กดยกเลิก */
    }
    setBusy(false);
  };

  const left = msUntilMidnight(bkkParts());
  return (
    <>
      <div ref={card} className="pz-share">
        <div>
          <h2>ปริศนา 5G ฉบับที่ {puzzleNumber(date)}</h2>
          <small>{label.label} {label.sub}</small>
        </div>
        <Buddy stage={Math.max(1, look.stage)} color={look.color} wear={look.wear} species={look.species} size={150} animate={false} expr={right >= 3 ? 'happy' : 'smile'} />
        <div>
          <div className="pz-score">{score}</div>
          <small>ถูก {right} จาก {PUZZLE_COUNT} ข้อ{streak > 1 ? ` · เล่นต่อเนื่อง ${streak} วัน` : ''}</small>
        </div>
        <div className="pz-share-marks">
          {marks.split('').map((c, i) => <i key={i} data-v={c} />)}
        </div>
        <div className="pz-share-foot">ใครเก่งกว่ามาท้ากัน learn5g-th.online/puzzle</div>
      </div>

      {stars !== null && stars > 0 && (
        <p className="pz-next" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
          ได้ <StarIcon className="w-5 h-5" /> {stars} ดาว ไปซื้อของให้ปุ๋งได้เลย
        </p>
      )}

      <div className="pz-actions">
        {canShare && <button type="button" className="pr-btn" disabled={busy} onClick={share}><Share2 className="w-4 h-4" /> แชร์</button>}
        <button type="button" className="pr-btn pr-btn-ghost" disabled={busy} onClick={async () => { setBusy(true); const b = await image(); if (b) await download(b); setBusy(false); }}><Download className="w-4 h-4" /> บันทึกรูป</button>
        <button
          type="button"
          className="pr-btn pr-btn-ghost"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(text);
              setCopied(true);
              setTimeout(() => setCopied(false), 1600);
            } catch {
              /* เบราว์เซอร์ไม่อนุญาต */
            }
          }}
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copied ? 'คัดลอกแล้ว' : 'คัดลอกข้อความ'}
        </button>
        <Link href="/buddy" className="pr-btn">เอาดาวไปให้ปุ๋ง</Link>
      </div>
      <p className="pz-next">ปริศนาใหม่ในอีก {Math.floor(left / 3600000)} ชม. {Math.floor((left % 3600000) / 60000)} นาที</p>
    </>
  );
}
