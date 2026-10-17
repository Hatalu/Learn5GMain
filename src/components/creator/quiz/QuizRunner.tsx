'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, Flame, Loader2, Send, Timer, X } from 'lucide-react';
import type { AnswerResult, PublicQuestion } from '@/lib/game-creator/types';
import { MathText } from '../math/MathText';
import { MediaView } from '../MediaView';
import { ChoiceShape, choiceStyle } from '../ChoiceShape';
import { gsfx } from '@/lib/game-creator/gsound';
import { richLength } from '@/lib/game-creator/quiz';
import { MineTag, choiceState } from '../games/QuestionPad';
import { CoachArrow, useCoach } from '../games/Coach';

export type AnswerOutcome = AnswerResult & { rank?: number; players?: number; finished: boolean };

export interface QuizEngine {
  /** คำถามข้อปัจจุบัน หรือ null เมื่อเล่นครบแล้ว */
  next: () => Promise<PublicQuestion | null>;
  answer: (q: PublicQuestion, picks: string[]) => Promise<AnswerOutcome | null>;
}

type Phase = 'count' | 'loading' | 'question' | 'sending' | 'feedback' | 'error';

const FEEDBACK_MS = 2600;

function Burst() {
  return (
    <span className="l5g-burst" aria-hidden="true">
      {Array.from({ length: 14 }).map((_, i) => (
        <i key={i} style={{ ['--a' as string]: `${(i / 14) * 360}deg`, ['--d' as string]: `${60 + (i % 3) * 30}px`, background: ['#ffcf3f', '#ff6b7a', '#3fd6a8', '#4a7bf0', '#fff'][i % 5] }} />
      ))}
    </span>
  );
}

/** ตัวเลขวิ่งขึ้น */
function Rolling({ to, ms = 700 }: { to: number; ms?: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const t0 = performance.now();
    let raf = 0;
    const step = () => {
      const p = Math.min(1, (performance.now() - t0) / ms);
      setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    const safety = setTimeout(() => setN(to), ms + 100);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(safety);
    };
  }, [to, ms]);
  return <>{n.toLocaleString('th-TH')}</>;
}

export function QuizRunner({
  engine,
  score: score0 = 0,
  streak: streak0 = 0,
  countdown = false,
  onFinished,
}: {
  engine: QuizEngine;
  score?: number;
  streak?: number;
  countdown?: boolean;
  onFinished: (final: { score: number }) => void;
}) {
  const [phase, setPhase] = useState<Phase>(countdown ? 'count' : 'loading');
  const [count, setCount] = useState(3);
  const [q, setQ] = useState<PublicQuestion | null>(null);
  const [picks, setPicks] = useState<string[]>([]);
  const [left, setLeft] = useState(1); // สัดส่วนเวลาที่เหลือ 0..1
  const [secs, setSecs] = useState(0);
  const [res, setRes] = useState<AnswerOutcome | null>(null);
  const [score, setScore] = useState(score0);
  const [streak, setStreak] = useState(streak0);
  const [err, setErr] = useState('');
  const deadline = useRef(0);
  const lastTick = useRef(-1);
  const busy = useRef(false);
  const advTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const qRef = useRef<PublicQuestion | null>(null);
  const picksRef = useRef<string[]>([]);
  picksRef.current = picks;
  const runRef = useRef<HTMLDivElement>(null);
  // สอนเล่น: แตะคำตอบ (ข้อแรกข้อเดียว)
  const coach = useCoach([{ id: 'answer', target: '.l5g-choices', text: 'เลือกตัวเลือก ยิ่งตอบไวยิ่งได้คะแนนเยอะ' }], { loops: 1 });
  const coachHit = useRef(coach.hit);
  coachHit.current = coach.hit;

  const load = useCallback(async () => {
    setErr('');
    // ข้อถัดไปมักมาพร้อมผลตอบแล้ว ขึ้นวงหมุนเฉพาะตอนที่ต้องรอจริง
    const slow = setTimeout(() => setPhase('loading'), 220);
    try {
      const nq = await engine.next();
      clearTimeout(slow);
      if (!nq) {
        onFinished({ score });
        return;
      }
      qRef.current = nq;
      setQ(nq);
      setPicks([]);
      setRes(null);
      busy.current = false;
      lastTick.current = -1;
      deadline.current = nq.time > 0 ? performance.now() + Math.max(0, nq.time * 1000 - nq.elapsedMs) : 0;
      setLeft(1);
      setSecs(nq.time);
      setPhase('question');
      gsfx.whoosh();
    } catch (e) {
      clearTimeout(slow);
      setErr(e instanceof Error ? e.message : 'โหลดคำถามไม่สำเร็จ');
      setPhase('error');
    }
  }, [engine, onFinished, score]);

  // นับถอยหลัง 3-2-1 ก่อนข้อแรก
  useEffect(() => {
    if (phase !== 'count') return;
    gsfx.count();
    if (count <= 0) {
      gsfx.go();
      load();
      return;
    }
    const t = setTimeout(() => setCount((c) => c - 1), 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, count]);

  useEffect(() => {
    if (!countdown) load();
    return () => {
      if (advTimer.current) clearTimeout(advTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = useCallback(
    async (chosen: string[]) => {
      const cur = qRef.current;
      if (!cur || busy.current) return;
      busy.current = true;
      setPicks(chosen);
      setPhase('sending');
      try {
        coachHit.current('answer');
        const r = await engine.answer(cur, chosen);
        if (!r) {
          // ข้อมูลไม่ตรงกับเซิร์ฟเวอร์ (เช่นรีเฟรช/ตอบซ้ำ) โหลดข้อปัจจุบันใหม่
          await load();
          return;
        }
        setRes(r);
        setScore(r.score);
        setStreak(r.streak);
        setPhase('feedback');
        if (r.correct) {
          gsfx.correct();
          if (r.streak >= 3) setTimeout(() => gsfx.streak(), 380);
        } else if (r.timeout) gsfx.timeout();
        else gsfx.wrong();
        advTimer.current = setTimeout(() => {
          if (r.finished) onFinished({ score: r.score });
          else load();
        }, FEEDBACK_MS + (r.correct ? 0 : 900));
      } catch (e) {
        busy.current = false;
        setErr(e instanceof Error ? e.message : 'ส่งคำตอบไม่สำเร็จ');
        setPhase('question');
      }
    },
    [engine, load, onFinished]
  );

  // ตัวจับเวลา
  useEffect(() => {
    if (phase !== 'question' || !q || !q.time) return;
    const iv = setInterval(() => {
      const ms = deadline.current - performance.now();
      const frac = Math.max(0, ms / (q.time * 1000));
      setLeft(frac);
      const s = Math.max(0, Math.ceil(ms / 1000));
      setSecs(s);
      if (s <= 5 && s > 0 && s !== lastTick.current) {
        lastTick.current = s;
        gsfx.tick(s <= 3);
      }
      if (ms <= 0) {
        clearInterval(iv);
        submit(q.multi ? picksRef.current : []);
      }
    }, 100);
    return () => clearInterval(iv);
  }, [phase, q, submit]);

  const toggle = (id: string) => {
    if (phase !== 'question' || !q) return;
    if (!q.multi) {
      gsfx.pick();
      submit([id]);
      return;
    }
    gsfx.tap();
    setPicks((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  };

  const skipFeedback = () => {
    if (phase !== 'feedback' || !res) return;
    if (advTimer.current) clearTimeout(advTimer.current);
    gsfx.tap();
    if (res.finished) onFinished({ score: res.score });
    else load();
  };

  if (phase === 'count') {
    return (
      <div className="l5g-run-center">
        <p className="l5g-run-ready">พร้อมไหม</p>
        <div key={count} className="l5g-run-count">
          {count > 0 ? count : 'ไป!'}
        </div>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="l5g-run-center">
        <div className="l5g-card l5g-card-pad text-center">
          <p className="font-bold">{err || 'เกิดข้อผิดพลาด'}</p>
          <button type="button" className="l5g-btn l5g-btn-go mt-4" onClick={load}>
            ลองใหม่
          </button>
        </div>
      </div>
    );
  }

  if (!q || phase === 'loading') {
    return (
      <div className="l5g-run-center">
        <Loader2 className="w-10 h-10 animate-spin text-white drop-shadow" />
      </div>
    );
  }

  const showResult = phase === 'feedback' && res;
  const longest = Math.max(...q.choices.map((c) => richLength(c.text)));
  const hasChoiceMedia = q.choices.some((c) => c.media);
  const cols = q.choices.length <= 2 || (longest > 38 && !hasChoiceMedia) ? 1 : q.choices.length === 3 ? 3 : 2;
  const urgent = q.time > 0 && secs <= 5;

  return (
    <div className="l5g-run" data-phase={phase} ref={runRef}>
      <CoachArrow coach={coach} root={runRef} />
      {/* แถบบน */}
      <div className="l5g-run-top">
        <span className="l5g-pill">
          ข้อ {q.index + 1}
          <small>/{q.total}</small>
        </span>
        {q.points === 2 && <span className="l5g-pill l5g-pill-gold">คะแนน x2</span>}
        {q.points === 0 && <span className="l5g-pill l5g-pill-soft">ไม่คิดคะแนน</span>}
        <span className="flex-1" />
        {streak >= 2 && (
          <span className="l5g-pill l5g-pill-fire" title="ตอบถูกติดกัน">
            <Flame className="w-4 h-4" /> {streak}
          </span>
        )}
        <span className="l5g-pill l5g-pill-score">
          <Rolling to={score} />
        </span>
      </div>

      {q.time > 0 && (
        <div className="l5g-timer" data-urgent={urgent}>
          <span className="l5g-timer-fill" style={{ transform: `scaleX(${phase === 'question' ? left : 0})` }} />
          <span className="l5g-timer-num">
            <Timer className="w-4 h-4" />
            {phase === 'question' ? secs : 0}
          </span>
        </div>
      )}

      {/* โจทย์ */}
      <div className="l5g-qcard" key={q.id}>
        {q.media && (
          <div className="l5g-qmedia">
            <MediaView media={q.media} />
          </div>
        )}
        {q.text.length > 0 && <MathText value={q.text} className="l5g-qtext" />}
        {q.multi && <p className="l5g-qmulti">เลือกได้มากกว่า 1 ข้อ</p>}
      </div>

      {/* ตัวเลือก */}
      <div className="l5g-choices" data-cols={cols} data-media={hasChoiceMedia}>
        {q.choices.map((c, i) => {
          const st = choiceStyle(i);
          const picked = picks.includes(c.id);
          const isRight = !!showResult && res!.correctIds.includes(c.id);
          const state = choiceState({ show: !!showResult, right: isRight, picked, sending: phase === 'sending' });
          return (
            <button
              key={`${q.index}-${c.id}`}
              type="button"
              className="l5g-choice"
              data-state={state}
              style={{ ['--c' as string]: st.color, ['--cd' as string]: st.dark, animationDelay: `${i * 60}ms` }}
              onClick={() => toggle(c.id)}
              disabled={phase !== 'question'}
              aria-pressed={picked}
            >
              <MineTag state={state} />
              <span className="l5g-choice-shape">
                <ChoiceShape i={i} size={26} />
              </span>
              {c.media && (
                <span className="l5g-choice-media">
                  <MediaView media={c.media} controls={false} />
                </span>
              )}
              {c.text.length > 0 && <MathText value={c.text} className="l5g-choice-text" />}
              {q.multi && !showResult && <span className="l5g-choice-check">{picked && <Check className="w-4 h-4" strokeWidth={4} />}</span>}
              {state === 'sent' && <Loader2 className="l5g-choice-wait w-5 h-5 animate-spin" />}
              {showResult && isRight && (
                <span className="l5g-choice-mark l5g-mark-ok">
                  <Check className="w-5 h-5" strokeWidth={4} />
                </span>
              )}
              {showResult && !isRight && picked && (
                <span className="l5g-choice-mark l5g-mark-no">
                  <X className="w-5 h-5" strokeWidth={4} />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {q.multi && phase === 'question' && (
        <div className="l5g-run-submit">
          <button type="button" className="l5g-btn l5g-btn-go l5g-btn-xl" disabled={!picks.length} onClick={() => submit(picks)}>
            <Send className="w-5 h-5" /> ส่งคำตอบ
          </button>
        </div>
      )}

      {err && phase === 'question' && <p className="l5g-err text-center mt-2">{err}</p>}

      {showResult && (
        <button type="button" className="l5g-feedback" data-kind={res!.correct ? 'ok' : res!.timeout ? 'time' : 'no'} onClick={skipFeedback}>
          <span className="l5g-feedback-card">
            {res!.correct && <Burst />}
            <span className="l5g-feedback-icon">{res!.correct ? <Check className="w-9 h-9" strokeWidth={4} /> : res!.timeout ? <Timer className="w-8 h-8" /> : <ArrowRight className="w-8 h-8" />}</span>
            <b className="l5g-feedback-title">{res!.correct ? (res!.streak >= 3 ? `สุดยอด! ถูก ${res!.streak} ข้อติด` : 'ถูกต้อง!') : res!.timeout ? 'หมดเวลา' : 'เกือบแล้ว!'}</b>
            {res!.correct && res!.points > 0 && (
              <span className="l5g-feedback-points">
                +<Rolling to={res!.points} ms={600} />
              </span>
            )}
            {!res!.correct && <span className="l5g-feedback-sub">{res!.correctIds.length ? 'ดูคำตอบที่ถูกได้ด้านล่าง ข้อหน้าเอาใหม่' : 'ไม่เป็นไร ข้อหน้าเอาใหม่นะ'}</span>}
            {res!.rank ? (
              <span className="l5g-feedback-rank">
                อันดับ {res!.rank} จาก {res!.players}
              </span>
            ) : null}
            <span className="l5g-feedback-next">{res!.finished ? 'ดูผล' : 'ข้อต่อไป'} <ArrowRight className="w-4 h-4" /></span>
          </span>
        </button>
      )}
    </div>
  );
}
