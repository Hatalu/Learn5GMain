'use client';

/**
 * มนุษย์สร้างรูป (เล่นในเครื่องเดียว): จอเดียวเห็นคำถาม ตัวเลือก และท่าของแต่ละตัวเลือก
 * แต่ละกลุ่มทำท่าของคำตอบที่เลือก ครูมองแล้วแตะกลุ่มที่ตอบถูก (แตะตามลำดับ = อันดับตอบก่อน-หลัง) ไม่ใช้กล้อง
 */
import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, LogOut, Maximize2, Medal, RotateCcw, Trophy, X } from 'lucide-react';
import type { QuizQuestion } from '@/lib/game-creator/types';
import { MathText } from '../../math/MathText';
import { MediaView } from '../../MediaView';
import { Confetti } from '../../live/PlayerSession';
import { gsfx } from '@/lib/game-creator/gsound';
import { releaseMusic, setMusic } from '@/lib/music';
import { roomTrack } from '@/lib/music-tracks';
import { CHOICE_POSES, pointsFor, ranks, teamName, toggleTeam, totals, type Round, type ShapeSettings } from '@/lib/game-creator/shape/settings';
import { PoseKid } from './KidStage';
import './shape.css';

const COLORS = ['#2fb8ff', '#ff8a2f', '#25c48a', '#ff6bb8', '#9b6cf0', '#e0a800', '#ff5a6e', '#14b8b8', '#7c8cf8', '#8bbf3f'];

export function ShapeGame({ questions, settings, title, onExit }: { questions: QuizQuestion[]; settings: ShapeSettings; title: string; onExit: () => void }) {
  const list = useMemo(() => (settings.count ? questions.slice(0, settings.count) : questions), [questions, settings.count]);
  const blank = () => list.map(() => ({ teams: [], order: settings.order }) as Round);
  const [mounted, setMounted] = useState(false);
  const [i, setI] = useState(0);
  const [rounds, setRounds] = useState<Round[]>(blank);
  const [reveal, setReveal] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    setMusic('room', roomTrack(settings.music, 'shape'));
    return () => releaseMusic('room');
  }, [settings.music]);

  if (!mounted) return null;

  const q = list[i];
  const round = rounds[i];
  const scores = totals(rounds, settings.teams);

  const go = (to: number) => {
    gsfx.pick();
    setReveal(false);
    setI(to);
  };
  const tapTeam = (t: number) => {
    if (round.teams.includes(t)) gsfx.tap();
    else gsfx.correct();
    setRounds((rs) => rs.map((r, k) => (k === i ? { ...r, teams: toggleTeam(r.teams, t) } : r)));
  };
  // เปลี่ยนการนับอันดับมีผลตั้งแต่ข้อนี้เป็นต้นไป ข้อที่ผ่านแล้วคะแนนคงเดิม
  const toggleOrder = () => (gsfx.tap(), setRounds((rs) => rs.map((r, k) => (k >= i ? { ...r, order: !round.order } : r))));
  const finish = () => (gsfx.fanfare(), setReveal(false), setDone(true));
  const again = () => (gsfx.start(), setRounds(blank()), setI(0), setReveal(false), setDone(false));
  const fullScreen = () => {
    gsfx.tap();
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    else document.documentElement.requestFullscreen?.().catch(() => {});
  };
  const exit = () => {
    if (!done && rounds.some((r) => r.teams.length) && !window.confirm('ออกจากเกม? คะแนนจะหายทั้งหมด')) return;
    onExit();
  };

  const rank = ranks(scores);
  const byScore = scores.map((_, t) => t).sort((a, b) => scores[b] - scores[a]);
  const top = Math.max(1, ...scores);
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  return createPortal(
    <div className="hs-root">
      <header className="hs-top">
        <button type="button" className="hs-icon" onClick={exit} aria-label="ออกจากเกม">
          <X className="w-5 h-5" />
        </button>
        <div className="hs-title">
          <b>{done ? 'สรุปคะแนน' : `ข้อ ${i + 1} / ${list.length}`}</b>
          <span>{title}</span>
        </div>
        <button type="button" className="hs-icon" onClick={fullScreen} aria-label="เต็มจอ">
          <Maximize2 className="w-5 h-5" />
        </button>
      </header>

      {done ? (
        <main className="hs-main">
          <div className="hs-sum hs-pop">
            <h2>
              <Trophy className="w-8 h-8" /> {top > 1 && scores.some((s) => s > 0) ? `ชนะเลิศ: ${byScore.filter((t) => rank[t] === 1).map(teamName).join(', ')}` : 'จบเกมแล้ว'}
            </h2>
            {byScore.map((t, k) => (
              <div key={t} className="hs-brow" style={{ ['--c' as string]: COLORS[t % COLORS.length], animationDelay: `${k * 0.07}s` }}>
                <span className="hs-rank" data-r={rank[t]}>
                  {rank[t]}
                </span>
                <div className="hs-bname">
                  <b>{teamName(t)}</b>
                  <i className="hs-bar">
                    <i style={{ width: `${(scores[t] / top) * 100}%` }} />
                  </i>
                </div>
                <b className="hs-bscore">{scores[t]}</b>
              </div>
            ))}
            <div className="hs-row">
              <button type="button" className="hs-btn" onClick={() => (gsfx.tap(), setDone(false))}>
                <ArrowLeft className="w-5 h-5" /> แก้คะแนน
              </button>
              <button type="button" className="hs-btn" onClick={again}>
                <RotateCcw className="w-5 h-5" /> เล่นอีกครั้ง
              </button>
              <button type="button" className="hs-btn hs-go" onClick={onExit}>
                <LogOut className="w-5 h-5" /> ออกจากเกม
              </button>
            </div>
          </div>
          {!reduced && <Confetti />}
        </main>
      ) : (
        <>
          <main className="hs-main">
            <div key={q.id + i} className="hs-q hs-pop">
              <h2 className="hs-qtext">
                <MathText value={q.text} />
              </h2>
              {q.media && <MediaView media={q.media} className="hs-qmedia" />}
              <div className="hs-choices" data-n={q.choices.length}>
                {q.choices.map((c, k) => (
                  <div key={c.id} className="hs-choice" data-ok={reveal && c.correct ? 1 : 0} data-dim={reveal && !c.correct ? 1 : 0}>
                    <PoseKid pose={CHOICE_POSES[k % CHOICE_POSES.length]} i={k} />
                    <div className="hs-ctext">
                      <em>{CHOICE_POSES[k % CHOICE_POSES.length].name}</em>
                      <b>
                        <MathText value={c.text} />
                      </b>
                      {c.media && <MediaView media={c.media} className="hs-cmedia" />}
                    </div>
                    {reveal && c.correct && <Check className="hs-tick" strokeWidth={4} />}
                  </div>
                ))}
              </div>
            </div>
          </main>

          <footer className="hs-foot">
            <p className="hs-tip">{round.order ? 'แตะกลุ่มที่ตอบถูก เรียงตามลำดับที่ตอบ (กลุ่มแรกที่แตะ = ตอบก่อน)' : 'แตะกลุ่มที่ตอบถูก'}</p>
            <div className="hs-teams">
              {scores.map((s, t) => {
                const at = round.teams.indexOf(t);
                return (
                  <button key={t} type="button" className="hs-team" data-on={at >= 0 ? 1 : 0} style={{ ['--c' as string]: COLORS[t % COLORS.length] }} onClick={() => tapTeam(t)} aria-pressed={at >= 0}>
                    {at >= 0 && round.order && <span className="hs-badge">ที่ {at + 1}</span>}
                    <b>{teamName(t)}</b>
                    <span>
                      {s} คะแนน{at >= 0 ? ` (+${pointsFor(at, round.order)})` : ''}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="hs-actions">
              <button type="button" className="hs-btn" disabled={i === 0} onClick={() => go(i - 1)}>
                <ArrowLeft className="w-5 h-5" /> ข้อก่อน
              </button>
              <button type="button" className="hs-btn" data-on={reveal ? 1 : 0} onClick={() => (gsfx.tap(), setReveal((r) => !r))}>
                {reveal ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />} {reveal ? 'ซ่อนเฉลย' : 'ดูเฉลย'}
              </button>
              <button type="button" className="hs-btn" data-on={round.order ? 1 : 0} onClick={toggleOrder} aria-pressed={round.order}>
                <Medal className="w-5 h-5" /> {round.order ? 'นับอันดับ' : 'ไม่นับอันดับ'}
              </button>
              <button type="button" className="hs-btn hs-go" onClick={() => (i + 1 < list.length ? go(i + 1) : finish())}>
                {i + 1 < list.length ? 'ข้อต่อไป' : 'สรุปคะแนน'} <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </footer>
        </>
      )}
    </div>,
    document.body
  );
}
