'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, CircleAlert, Clock3, Flag, Gamepad2, Loader2, MonitorPlay, Rocket, Shuffle } from 'lucide-react';
import { PaperModal } from './PaperModal';
import { ModeArt } from './games/ModeArt';
import { cleanNickname, NICK_MAX } from '@/lib/game-creator/templates';
import { MODES, fmtDuration, modeById, modeFit, type GameMode } from '@/lib/game-creator/modes';
import { mediaPrefix } from '@/lib/game-creator/prefix';
import { sanitizeQuiz } from '@/lib/game-creator/quiz';
import { createClient } from '@/lib/supabase/client';
import { gsfx } from '@/lib/game-creator/gsound';
import type { QuizContent, RoomMode } from '@/lib/game-creator/types';

const LAST_BG = 'l5g_room_bg';

export function lastBackground(): unknown {
  try {
    const s = localStorage.getItem(LAST_BG);
    return s ? JSON.parse(s) : undefined;
  } catch {
    return undefined;
  }
}
export function rememberBackground(bg: unknown) {
  try {
    localStorage.setItem(LAST_BG, JSON.stringify(bg));
  } catch {
    /* ignore */
  }
}

/** การ์ดเลือกรูปแบบการเล่น พร้อมข้อจำกัดของแต่ละแบบ (ใช้ทั้งตอนเปิดห้องและทดลองเล่น) */
export function ModePicker({ content, value, onPick }: { content: QuizContent | null; value: GameMode | null; onPick: (m: GameMode) => void }) {
  return (
    <div className="l5g-modes">
      {MODES.map((m) => {
        const fit = content ? modeFit(content, m.id) : null;
        const ok = !!fit?.ok;
        return (
          <button
            key={m.id}
            type="button"
            className="l5g-modecard"
            data-on={value === m.id}
            data-ok={ok}
            disabled={!ok}
            style={{ ['--mc' as string]: m.color, ['--md' as string]: m.dark, ['--ms' as string]: m.soft }}
            onClick={() => (gsfx.pick(), onPick(m.id))}
          >
            <span className="l5g-modecard-art">
              <ModeArt mode={m.id} />
              {value === m.id && (
                <span className="l5g-modecard-tick">
                  <Check className="w-4 h-4" strokeWidth={4} />
                </span>
              )}
            </span>
            <span className="l5g-modecard-body">
              <small>{m.genre}</small>
              <b>{m.name}</b>
              <span className="l5g-modecard-tag">{m.tagline}</span>
              <span className="l5g-modecard-rules">
                {(fit?.rules || []).map((r, i) => (
                  <span key={i} data-pass={r.pass}>
                    {r.pass ? <Check className="w-3.5 h-3.5" strokeWidth={3.5} /> : <CircleAlert className="w-3.5 h-3.5" />}
                    {r.text}
                  </span>
                ))}
                {!fit && <span>กำลังตรวจชุดคำถาม…</span>}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** วิธีเล่นของรูปแบบนั้นแบบสั้นๆ */
export function ModeSteps({ mode }: { mode: GameMode }) {
  const m = modeById(mode);
  return (
    <ol className="l5g-modesteps" style={{ ['--mc' as string]: m.color }}>
      {m.steps.map((s, i) => (
        <li key={i}>
          <span>{i + 1}</span>
          {s}
        </li>
      ))}
    </ol>
  );
}

/** เปิดใช้งานชุดคำถาม: เลือกรูปแบบการเล่น -> Host (ดูคนอื่น) หรือ เล่นด้วย -> ได้เลขห้อง 6 หลัก */
export function OpenGameModal({ gameId, title, username, onClose }: { gameId: string; title: string; username: string; onClose: () => void }) {
  const router = useRouter();
  const [content, setContent] = useState<QuizContent | null>(null);
  const [game, setGame] = useState<GameMode | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [mode, setMode] = useState<RoomMode>('watch');
  const [shuffleQuestions, setSQ] = useState(false);
  const [shuffleChoices, setSC] = useState(false);
  const [duration, setDuration] = useState(0);
  const [goal, setGoal] = useState(0);
  const [nick, setNick] = useState(cleanNickname(username) || 'เจ้าของห้อง');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    createClient()
      .from('user_games')
      .select('content')
      .eq('id', gameId)
      .maybeSingle()
      .then(({ data }) => setContent(sanitizeQuiz(data?.content, mediaPrefix())));
  }, [gameId]);

  const info = useMemo(() => (game ? modeById(game) : null), [game]);

  const pick = (g: GameMode) => {
    setGame(g);
    const m = modeById(g);
    setDuration(m.defaultDuration || 0);
    setGoal(m.defaultGoal || 0);
  };

  const open = async () => {
    if (!game) return;
    setBusy(true);
    setErr('');
    gsfx.tap();
    try {
      const r = await fetch('/api/live/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, game, mode, nickname: nick, settings: { shuffleQuestions, shuffleChoices, duration, goal }, background: lastBackground() }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'เปิดห้องไม่สำเร็จ');
      if (j.hostPlayer) {
        try {
          sessionStorage.setItem(`l5g_hostp_${j.roomId}`, JSON.stringify(j.hostPlayer));
        } catch {
          /* ignore */
        }
      }
      gsfx.start();
      router.push(`/create/host?room=${j.roomId}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'เปิดห้องไม่สำเร็จ');
      setBusy(false);
    }
  };

  const Opt = ({ id, icon, name, desc, color }: { id: RoomMode; icon: React.ReactNode; name: string; desc: string; color: string }) => (
    <button type="button" className="l5g-mode" data-on={mode === id} style={{ ['--m' as string]: color }} onClick={() => (gsfx.pick(), setMode(id))}>
      <span className="l5g-mode-icon">{icon}</span>
      <b>{name}</b>
      <span>{desc}</span>
      <span className="l5g-mode-tick">{mode === id && <Check className="w-4 h-4" strokeWidth={4} />}</span>
    </button>
  );

  return (
    <PaperModal title={step === 1 ? 'เลือกรูปแบบการเล่น' : 'ตั้งค่าห้อง'} icon={<Rocket className="w-5 h-5" />} iconBg="#ffcf3f" onClose={onClose} busy={busy} width={step === 1 ? 860 : 580}>
      <p className="font-bold opacity-80 -mt-1 mb-3 truncate">ชุดคำถาม: {title}</p>

      {step === 1 ? (
        <>
          <ModePicker content={content} value={game} onPick={pick} />
          {game && <ModeSteps mode={game} />}
          <div className="l5g-math-foot">
            <span className="flex-1" />
            <button type="button" className="l5g-btn l5g-btn-ghost" onClick={onClose}>
              ยกเลิก
            </button>
            <button type="button" className="l5g-btn l5g-btn-go" disabled={!game} onClick={() => (gsfx.tap(), setStep(2))}>
              ถัดไป
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="l5g-modechip mb-3" style={{ ['--mc' as string]: info?.color }}>
            รูปแบบ: <b>{info?.name}</b>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Opt id="watch" icon={<MonitorPlay className="w-7 h-7" />} name="Host" desc="ดูคนอื่นเล่น ขึ้นจอใหญ่" color="#4fb3ff" />
            <Opt id="play" icon={<Gamepad2 className="w-7 h-7" />} name="เล่นเกมนี้ด้วย" desc="เปิดห้องแล้วร่วมแข่งเอง" color="#ff9a3d" />
          </div>

          {mode === 'play' && (
            <label className="block mt-4">
              <span className="font-bold text-sm">ชื่อของคุณในเกม</span>
              <input className="l5g-input mt-1" value={nick} maxLength={NICK_MAX} onChange={(e) => setNick(e.target.value)} />
            </label>
          )}

          {info?.durations && (
            <div className="mt-4">
              <p className="l5g-qset-label flex items-center gap-1">
                <Clock3 className="w-4 h-4" /> เวลาเล่น
              </p>
              <div className="l5g-chips">
                {info.durations.map((d) => (
                  <button key={d} type="button" className="l5g-chipbtn" data-on={duration === d} onClick={() => (gsfx.tap(), setDuration(d))}>
                    {fmtDuration(d)}
                  </button>
                ))}
              </div>
            </div>
          )}
          {info?.goals && (
            <div className="mt-4">
              <p className="l5g-qset-label flex items-center gap-1">
                <Flag className="w-4 h-4" /> ระยะถึงเส้นชัย
              </p>
              <div className="l5g-chips">
                {info.goals.map((g) => (
                  <button key={g} type="button" className="l5g-chipbtn" data-on={goal === g} onClick={() => (gsfx.tap(), setGoal(g))}>
                    {g} ก้าว
                  </button>
                ))}
              </div>
            </div>
          )}

          {game === 'quiz' && (
            <div className="mt-4 grid gap-2">
              <label className="l5g-switch">
                <input type="checkbox" checked={shuffleQuestions} onChange={(e) => setSQ(e.target.checked)} />
                <span className="l5g-switch-ui" />
                <Shuffle className="w-4 h-4" /> สลับลำดับคำถามของแต่ละคน
              </label>
              <label className="l5g-switch">
                <input type="checkbox" checked={shuffleChoices} onChange={(e) => setSC(e.target.checked)} />
                <span className="l5g-switch-ui" />
                <Shuffle className="w-4 h-4" /> สลับตำแหน่งตัวเลือก
              </label>
            </div>
          )}

          {err && <p className="l5g-err mt-3">{err}</p>}

          <div className="l5g-math-foot">
            <button type="button" className="l5g-btn l5g-btn-ghost" onClick={() => setStep(1)} disabled={busy}>
              <ArrowLeft className="w-4 h-4" /> ย้อนกลับ
            </button>
            <span className="flex-1" />
            <button type="button" className="l5g-btn l5g-btn-go" onClick={open} disabled={busy || (mode === 'play' && !cleanNickname(nick))}>
              {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Rocket className="w-5 h-5" />} เปิดห้อง
            </button>
          </div>
        </>
      )}
    </PaperModal>
  );
}
