'use client';

import './games.css';
import './games-live.css';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Flame, Loader2, Send, X } from 'lucide-react';
import type { PublicQuestion } from '@/lib/game-creator/types';
import type { LiveOutcome } from '@/lib/game-creator/live-client';
import { MathText } from '../math/MathText';
import { MediaView } from '../MediaView';
import { ChoiceShape, choiceStyle } from '../ChoiceShape';
import type { QuizEngine } from '../quiz/QuizRunner';
import { gsfx } from '@/lib/game-creator/gsound';
import { quickCheck, richLength } from '@/lib/game-creator/quiz';

type Phase = 'loading' | 'question' | 'sending' | 'feedback' | 'idle' | 'error';

/** สถานะของปุ่มคำตอบ (ใช้ทั้งในเกมและควิซ) ให้เห็นชัดว่าเรากดข้อไหน */
export function choiceState(o: { show: boolean; right: boolean; picked: boolean; sending: boolean }) {
  if (o.show) return o.right ? (o.picked ? 'rightpick' : 'right') : o.picked ? 'wrongpick' : 'dim';
  if (o.sending) return o.picked ? 'sent' : 'wait';
  return o.picked ? 'picked' : 'idle';
}

/** ป้าย "คำตอบของฉัน" บนปุ่มที่เลือก */
export function MineTag({ state }: { state: string }) {
  if (state !== 'sent' && state !== 'rightpick' && state !== 'wrongpick') return null;
  return <span className="l5g-choice-mine">คำตอบของฉัน</span>;
}

/** ช่องพิมพ์คำตอบสั้นๆ (คำถามแบบพิมพ์คำตอบ) ใช้ทั้งในเกมและควิซ */
export function TextAnswer({
  disabled,
  big = false,
  result,
  onType,
  onSubmit,
}: {
  disabled: boolean;
  big?: boolean;
  /** หลังส่ง: ถูกไหม + คำตอบที่ถูก (ถ้าเปิดเฉลย) */
  result?: { correct: boolean; answer?: string } | null;
  onType?: (v: string) => void;
  onSubmit: (v: string) => void;
}) {
  const [v, setV] = useState('');
  const box = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!disabled) box.current?.focus({ preventScroll: true });
  }, [disabled]);
  const send = () => {
    if (disabled || !v.trim()) return;
    gsfx.pick();
    onSubmit(v.trim());
  };
  return (
    <div className="l5g-typed" data-big={big} data-state={result ? (result.correct ? 'ok' : 'no') : 'idle'}>
      <div className="l5g-typed-row">
        <input
          ref={box}
          value={v}
          maxLength={60}
          disabled={disabled}
          onChange={(e) => {
            setV(e.target.value);
            onType?.(e.target.value);
          }}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), send())}
          placeholder="พิมพ์คำตอบ"
          aria-label="พิมพ์คำตอบ"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="send"
        />
        <button type="button" className="l5g-btn l5g-btn-go" disabled={disabled || !v.trim()} onClick={send}>
          <Send className="w-4 h-4" /> ส่ง
        </button>
      </div>
      {result && !result.correct && result.answer && (
        <p className="l5g-typed-ans">
          คำตอบที่ถูก: <b>{result.answer}</b>
        </p>
      )}
    </div>
  );
}

/**
 * ตอบคำถามต่อเนื่องไม่จำกัดจำนวน (ใช้ในโหมดเกม): โหลดข้อถัดไปเอง แสดงผลถูก/ผิดสั้นๆ แล้วแจ้งผลกลับให้ตัวเกมทันที
 * - lockMs ตอบผิดแล้วต้องรอ (สะดุด) ก่อนข้อถัดไป
 * - เกมไม่หยุดระหว่างตอบ
 */
export function QuestionPad({
  engine,
  onAnswered,
  rewardText,
  lockMs = 0,
  compact = false,
}: {
  engine: QuizEngine;
  onAnswered: (o: LiveOutcome, q: PublicQuestion) => void;
  rewardText?: (o: LiveOutcome) => string;
  lockMs?: number;
  compact?: boolean;
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
  const cb = useRef({ onAnswered, rewardText });
  cb.current = { onAnswered, rewardText };

  const load = useCallback(async () => {
    setErr('');
    // ข้อถัดไปมักมาพร้อมผลตอบแล้ว (ทันที) ขึ้นวงหมุนเฉพาะตอนที่ต้องรอจริง
    const slow = setTimeout(() => alive.current && setPhase('loading'), 220);
    try {
      const nq = await engine.next();
      clearTimeout(slow);
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
      clearTimeout(slow);
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
    if (!q || busy.current) return;
    busy.current = true;
    setPicks(chosen);
    // รู้ถูก/ผิดทันทีในเครื่อง รางวัลในเกม (onAnswered) ให้ตามผลจากเซิร์ฟเวอร์
    const quick = quickCheck(q, chosen);
    if (quick === null) setPhase('sending');
    else {
      setRes({ correct: quick, timeout: false, points: 0, correctIds: quick ? chosen : [], score: 0, streak: 0, finished: false, pending: true } as unknown as LiveOutcome);
      setPhase('feedback');
      if (quick) gsfx.correct();
      else gsfx.wrong();
    }
    try {
      const r = (await engine.answer(q, chosen)) as LiveOutcome | null;
      if (!alive.current) return;
      if (!r) {
        await load();
        return;
      }
      setRes(r);
      setPhase('feedback');
      if (quick === null || quick !== r.correct) {
        if (r.correct) gsfx.correct();
        else gsfx.wrong();
      }
      cb.current.onAnswered(r, q);
      const wait = r.correct ? 650 : Math.max(1400, lockMs);
      if (!r.correct && lockMs > 0) {
        const until = Date.now() + wait;
        setLockLeft(Math.ceil(wait / 1000));
        const tick = () => {
          const ms = until - Date.now();
          setLockLeft(Math.max(0, Math.ceil(ms / 1000)));
          if (ms > 0 && alive.current) setTimeout(tick, 200);
        };
        tick();
      }
      timer.current = setTimeout(() => alive.current && load(), wait);
    } catch (e) {
      busy.current = false;
      setErr(e instanceof Error ? e.message : 'ส่งคำตอบไม่สำเร็จ');
      setPhase('question');
    }
  };

  const tap = (id: string) => {
    if (phase !== 'question' || !q) return;
    if (!q.multi) {
      gsfx.pick();
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
  if (!q || phase === 'loading' || phase === 'idle') {
    return (
      <div className="l5g-qp l5g-qp-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const show = phase === 'feedback' && !!res;
  const longest = Math.max(0, ...q.choices.map((c) => richLength(c.text)));
  const media = q.choices.some((c) => c.media);
  const typed = q.kind === 'text';
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
      {typed && <TextAnswer key={q.index} disabled={phase !== 'question'} result={show ? res : null} onSubmit={(t) => submit([t])} />}
      <div className="l5g-qp-choices" data-one={one} hidden={typed}>
        {q.choices.map((c, i) => {
          const st = choiceStyle(i);
          const picked = picks.includes(c.id);
          const right = show && res!.correctIds.includes(c.id);
          const state = choiceState({ show, right, picked, sending: phase === 'sending' });
          return (
            <button
              key={`${q.index}-${c.id}`}
              type="button"
              className="l5g-choice l5g-qp-choice"
              data-state={state}
              style={{ ['--c' as string]: st.color, ['--cd' as string]: st.dark, animationDelay: `${i * 40}ms` }}
              onClick={() => tap(c.id)}
              disabled={phase !== 'question'}
              aria-pressed={picked}
            >
              <MineTag state={state} />
              <span className="l5g-choice-shape">
                <ChoiceShape i={i} size={20} />
              </span>
              {c.media && (
                <span className="l5g-choice-media">
                  <MediaView media={c.media} controls={false} />
                </span>
              )}
              {c.text.length > 0 && <MathText value={c.text} className="l5g-choice-text" />}
              {q.multi && !show && <span className="l5g-choice-check">{picked && <Check className="w-4 h-4" strokeWidth={4} />}</span>}
              {state === 'sent' && <Loader2 className="l5g-choice-wait w-5 h-5 animate-spin" />}
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
      {show && (
        <div className="l5g-qp-flash" data-kind={res!.correct ? 'ok' : 'no'}>
          {res!.correct ? (rewardText && !(res as { pending?: boolean }).pending ? rewardText(res!) : 'ถูกต้อง!') : lockMs && lockLeft > 0 ? `สะดุด! รอ ${lockLeft}` : res!.correctIds.length || res!.answer ? 'ดูคำตอบที่ถูกนะ' : 'ยังไม่ถูก ลองข้อต่อไปนะ'}
        </div>
      )}
      {err && phase === 'question' && <p className="l5g-err text-center">{err}</p>}
    </div>
  );
}

/**
 * แผงตอบคำถามข้างเกม (ไม่บังคับจำนวนข้อ ปิดได้ เกมเดินต่อระหว่างตอบ)
 * จอกว้าง = แถบขวา / จอแนวตั้ง = แผ่นล่าง
 */
export function QuestionDock({
  engine,
  open,
  title,
  icon,
  color = '#3fd6a8',
  streak = 0,
  hint,
  rewardText,
  onAnswered,
  onClose,
}: {
  engine: QuizEngine;
  open: boolean;
  title: string;
  icon?: React.ReactNode;
  color?: string;
  streak?: number;
  hint?: string;
  rewardText?: (o: LiveOutcome) => string;
  onAnswered: (o: LiveOutcome, q: PublicQuestion) => void;
  onClose: () => void;
}) {
  // เปิดครั้งแรกแล้วค้างไว้ (ปิด = ซ่อน) จะได้ไม่ต้องโหลดคำถามใหม่ทุกครั้ง
  const [mounted, setMounted] = useState(open);
  useEffect(() => {
    if (open) setMounted(true);
  }, [open]);
  if (!mounted) return null;
  return (
    <aside className="gm-dock" data-open={open} style={{ ['--bc' as string]: color }} aria-hidden={!open}>
      <div className="gm-dock-head">
        <span className="l5g-batch-icon">{icon}</span>
        <div className="min-w-0">
          <b>{title}</b>
          {hint && <small>{hint}</small>}
        </div>
        <span className="flex-1" />
        {streak >= 2 && (
          <span className="gm-dock-streak" title="ตอบถูกติดกัน">
            <Flame className="w-4 h-4" /> {streak}
          </span>
        )}
        <button type="button" className="gm-dock-x" onClick={() => (gsfx.tap(), onClose())} aria-label="ปิดคำถาม">
          <X className="w-5 h-5" strokeWidth={3} />
        </button>
      </div>
      <div className="gm-dock-body">
        <QuestionPad engine={engine} compact rewardText={rewardText} onAnswered={onAnswered} />
      </div>
    </aside>
  );
}
