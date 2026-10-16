'use client';

import './games.css';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Loader2, Send, X } from 'lucide-react';
import type { PublicQuestion } from '@/lib/game-creator/types';
import type { LiveOutcome } from '@/lib/game-creator/live-client';
import { MathText } from '../math/MathText';
import { MediaView } from '../MediaView';
import { ChoiceShape, choiceStyle } from '../ChoiceShape';
import type { QuizEngine } from '../quiz/QuizRunner';
import { gsfx } from '@/lib/game-creator/gsound';
import { richLength } from '@/lib/game-creator/quiz';

type Phase = 'loading' | 'question' | 'sending' | 'feedback' | 'locked' | 'idle' | 'error';

/**
 * ตอบคำถามทีละข้อ (ใช้ในโหมดเกม): โหลดข้อถัดไปเอง แสดงผลถูก/ผิดสั้นๆ แล้วแจ้งผลกลับให้ตัวเกม
 * - continueAfter(o) คืน false = หยุดหลังข้อนี้ (เช่น ครบ 3 ข้อแล้ว)
 * - lockMs ตอบผิดแล้วต้องรอ (สะดุด) ก่อนข้อถัดไป
 */
export function QuestionPad({
  engine,
  onAnswered,
  continueAfter,
  rewardText,
  lockMs = 0,
  compact = false,
  paused = false,
}: {
  engine: QuizEngine;
  onAnswered: (o: LiveOutcome, q: PublicQuestion) => void;
  continueAfter?: (o: LiveOutcome) => boolean;
  rewardText?: (o: LiveOutcome) => string;
  lockMs?: number;
  compact?: boolean;
  paused?: boolean;
}) {
  const [phase, setPhase] = useState<Phase>('loading');
  const [q, setQ] = useState<PublicQuestion | null>(null);
  const [picks, setPicks] = useState<string[]>([]);
  const [res, setRes] = useState<LiveOutcome | null>(null);
  const [lockLeft, setLockLeft] = useState(0);
  const [err, setErr] = useState('');
  const busy = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alive = useRef(true);
  const cb = useRef({ onAnswered, continueAfter });
  cb.current = { onAnswered, continueAfter };

  const load = useCallback(async () => {
    setPhase('loading');
    setErr('');
    try {
      const nq = await engine.next();
      if (!alive.current) return;
      if (!nq) {
        setPhase('idle');
        return;
      }
      setQ(nq);
      setPicks([]);
      setRes(null);
      busy.current = false;
      setPhase('question');
    } catch (e) {
      if (!alive.current) return;
      setErr(e instanceof Error ? e.message : 'โหลดคำถามไม่สำเร็จ');
      setPhase('error');
    }
  }, [engine]);

  useEffect(() => {
    alive.current = true;
    load();
    return () => {
      alive.current = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [load]);

  const submit = async (chosen: string[]) => {
    if (!q || busy.current || paused) return;
    busy.current = true;
    setPhase('sending');
    try {
      const r = (await engine.answer(q, chosen)) as LiveOutcome | null;
      if (!alive.current) return;
      if (!r) {
        await load();
        return;
      }
      setRes(r);
      setPhase('feedback');
      if (r.correct) gsfx.correct();
      else gsfx.wrong();
      cb.current.onAnswered(r, q);
      const go = cb.current.continueAfter ? cb.current.continueAfter(r) : true;
      const wait = r.correct ? 750 : Math.max(1500, lockMs);
      if (!r.correct && lockMs > 0) {
        const until = Date.now() + wait;
        setLockLeft(Math.ceil(wait / 1000));
        const tick = () => {
          const ms = until - Date.now();
          setLockLeft(Math.max(0, Math.ceil(ms / 1000)));
          if (ms > 0 && alive.current) timer.current = setTimeout(tick, 200);
        };
        tick();
      }
      timer.current = setTimeout(() => {
        if (!alive.current) return;
        if (go) load();
        else setPhase('idle');
      }, wait);
    } catch (e) {
      busy.current = false;
      setErr(e instanceof Error ? e.message : 'ส่งคำตอบไม่สำเร็จ');
      setPhase('question');
    }
  };

  const tap = (id: string) => {
    if (phase !== 'question' || !q || paused) return;
    if (!q.multi) {
      gsfx.pick();
      setPicks([id]);
      submit([id]);
      return;
    }
    gsfx.tap();
    setPicks((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  };

  if (phase === 'error') {
    return (
      <div className="l5g-qp l5g-qp-center">
        <p className="font-bold">{err}</p>
        <button type="button" className="l5g-btn l5g-btn-go l5g-btn-sm mt-2" onClick={load}>
          ลองใหม่
        </button>
      </div>
    );
  }
  if (!q || phase === 'loading') {
    return (
      <div className="l5g-qp l5g-qp-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const show = phase === 'feedback' && res;
  const longest = Math.max(...q.choices.map((c) => richLength(c.text)));
  const media = q.choices.some((c) => c.media);
  const one = q.choices.length <= 2 || (longest > 30 && !media);

  return (
    <div className="l5g-qp" data-compact={compact} data-phase={phase}>
      <div className="l5g-qp-q" key={`${q.index}`}>
        {q.media && (
          <div className="l5g-qp-media">
            <MediaView media={q.media} />
          </div>
        )}
        {q.text.length > 0 && <MathText value={q.text} className="l5g-qp-text" />}
        {q.multi && <span className="l5g-qmulti">เลือกได้มากกว่า 1 ข้อ</span>}
      </div>
      <div className="l5g-qp-choices" data-one={one}>
        {q.choices.map((c, i) => {
          const st = choiceStyle(i);
          const picked = picks.includes(c.id);
          const right = !!show && res!.correctIds.includes(c.id);
          const state = show ? (right ? 'right' : picked ? 'wrongpick' : 'dim') : picked ? 'picked' : 'idle';
          return (
            <button
              key={c.id}
              type="button"
              className="l5g-choice l5g-qp-choice"
              data-state={state}
              style={{ ['--c' as string]: st.color, ['--cd' as string]: st.dark, animationDelay: `${i * 40}ms` }}
              onClick={() => tap(c.id)}
              disabled={phase !== 'question' || paused}
            >
              <span className="l5g-choice-shape">
                <ChoiceShape i={i} size={20} />
              </span>
              {c.media && (
                <span className="l5g-choice-media">
                  <MediaView media={c.media} controls={false} />
                </span>
              )}
              {c.text.length > 0 && <MathText value={c.text} className="l5g-choice-text" />}
              {show && right && (
                <span className="l5g-choice-mark l5g-mark-ok">
                  <Check className="w-4 h-4" strokeWidth={4} />
                </span>
              )}
              {show && !right && picked && (
                <span className="l5g-choice-mark l5g-mark-no">
                  <X className="w-4 h-4" strokeWidth={4} />
                </span>
              )}
            </button>
          );
        })}
      </div>
      {q.multi && phase === 'question' && (
        <button type="button" className="l5g-btn l5g-btn-go l5g-btn-sm l5g-qp-send" disabled={!picks.length} onClick={() => submit(picks)}>
          <Send className="w-4 h-4" /> ส่งคำตอบ
        </button>
      )}
      {phase === 'sending' && (
        <div className="l5g-qp-flash" data-kind="wait">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      )}
      {show && (
        <div className="l5g-qp-flash" data-kind={res!.correct ? 'ok' : 'no'}>
          {res!.correct ? (rewardText ? rewardText(res!) : 'ถูกต้อง!') : lockMs && lockLeft > 0 ? `สะดุด! รอ ${lockLeft}` : 'ดูข้อที่ถูกนะ'}
        </div>
      )}
      {err && phase === 'question' && <p className="l5g-err text-center">{err}</p>}
    </div>
  );
}

/** หน้าต่างตอบคำถามเป็นชุด (เช่น 3 ข้อ) แล้วสรุปผล ใช้ใน Café / Tower */
export function QuizBatch({
  engine,
  count = 3,
  title,
  icon,
  color = '#ffcf3f',
  rewardText,
  summary,
  onAnswered,
  onDone,
}: {
  engine: QuizEngine;
  count?: number;
  title: string;
  icon?: React.ReactNode;
  color?: string;
  rewardText?: (o: LiveOutcome) => string;
  summary: (correct: number) => string;
  onAnswered: (o: LiveOutcome) => void;
  onDone: (correct: number) => void;
}) {
  const [done, setDone] = useState(0);
  const [ok, setOk] = useState(0);
  const [results, setResults] = useState<boolean[]>([]);
  const [finished, setFinished] = useState(false);
  const [mounted, setMounted] = useState(false);
  const counted = useRef({ done: 0, ok: 0 });
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;
  return createPortal(
    <div className="l5g-batch-back">
      <div className="l5g-batch" style={{ ['--bc' as string]: color }}>
        <div className="l5g-batch-head">
          <span className="l5g-batch-icon">{icon}</span>
          <b>{title}</b>
          <span className="flex-1" />
          <span className="l5g-batch-dots">
            {Array.from({ length: count }).map((_, i) => (
              <i key={i} data-state={i < results.length ? (results[i] ? 'ok' : 'no') : i === results.length ? 'now' : 'todo'} />
            ))}
          </span>
        </div>
        {!finished ? (
          <QuestionPad
            engine={engine}
            compact
            rewardText={rewardText}
            onAnswered={(o) => {
              counted.current.done += 1;
              if (o.correct) counted.current.ok += 1;
              setDone(counted.current.done);
              setOk(counted.current.ok);
              setResults((r) => [...r, o.correct]);
              onAnswered(o);
            }}
            continueAfter={() => {
              const more = counted.current.done < count;
              if (!more) setTimeout(() => (setFinished(true), gsfx.sparkleish()), 800);
              return more;
            }}
          />
        ) : (
          <div className="l5g-batch-sum">
            <div className="l5g-batch-score">
              {ok}
              <small>/{done}</small>
            </div>
            <p>{summary(ok)}</p>
            <button type="button" className="l5g-btn l5g-btn-go l5g-btn-xl" onClick={() => (gsfx.tap(), onDone(ok))}>
              กลับไปเล่นต่อ
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
