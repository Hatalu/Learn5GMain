'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, CircleAlert, Clock3, Eye, Flag, Gamepad2, Gauge, ListOrdered, Users, Loader2, Monitor, MonitorPlay, Play, RefreshCw, Rocket, Shuffle, Smartphone, Sparkles } from 'lucide-react';
import { PaperModal } from './PaperModal';
import { MusicPicker } from './live/MusicPicker';
import { ModeArt } from './games/ModeArt';
import { cleanNickname, NICK_MAX } from '@/lib/game-creator/templates';
import { MODES, PLAY_TYPES, fmtDuration, modeById, modeFit, playTypeOf, type GameMode, type PlayType } from '@/lib/game-creator/modes';
import { mediaPrefix } from '@/lib/game-creator/prefix';
import { sanitizeQuiz } from '@/lib/game-creator/quiz';
import { createClient } from '@/lib/supabase/client';
import { gsfx } from '@/lib/game-creator/gsound';
import type { QuizContent, RoomMode } from '@/lib/game-creator/types';
import { AR_COUNTS, AR_DEFAULTS, AR_LEVELS, AR_MEMBERS, AR_TIMES, arQuery, type ArSettings } from '@/lib/game-creator/arSettings';
import { BOSSES } from '@/lib/game-creator/ar/boss';

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
/** ป้ายวิธีเล่นบนการ์ดรูปแบบเกม (เข้าร่วมห้อง / เล่นในเครื่องเดียว + เดี่ยว/ทีม) */
export function PlayTypeTag({ mode }: { mode: GameMode }) {
  const m = modeById(mode);
  const pt = PLAY_TYPES.find((p) => p.id === playTypeOf(m))!;
  return (
    <span className="l5g-ptag-row">
      <span className="l5g-ptag" style={{ ['--pc' as string]: pt.color }}>
        {pt.id === 'room' ? <Smartphone className="w-3.5 h-3.5" strokeWidth={3} /> : <Monitor className="w-3.5 h-3.5" strokeWidth={3} />}
        {pt.name}
      </span>
      {m.teams && (
        <span className="l5g-ptag" style={{ ['--pc' as string]: '#25c48a' }}>
          <Users className="w-3.5 h-3.5" strokeWidth={3} /> เดี่ยว & ทีม
        </span>
      )}
    </span>
  );
}

export function ModePicker({ content, value, onPick }: { content: QuizContent | null; value: GameMode | null; onPick: (m: GameMode) => void }) {
  const [pt, setPt] = useState<PlayType>(value ? playTypeOf(modeById(value)) : 'room');
  const list = MODES.filter((m) => playTypeOf(m) === pt);
  return (
    <>
      <div className="l5g-ptypes" role="tablist" aria-label="วิธีเล่น">
        {PLAY_TYPES.map((p) => {
          const n = MODES.filter((m) => playTypeOf(m) === p.id).length;
          return (
            <button key={p.id} type="button" role="tab" aria-selected={pt === p.id} className="l5g-ptype" data-on={pt === p.id} style={{ ['--pc' as string]: p.color }} onClick={() => (gsfx.pick(), setPt(p.id))}>
              <span className="l5g-ptype-ic">{p.id === 'room' ? <Smartphone className="w-6 h-6" /> : <Monitor className="w-6 h-6" />}</span>
              <span className="min-w-0">
                <b>{p.name}</b>
                <small>{p.desc}</small>
              </span>
              <em>{n ? `${n} เกม` : 'เร็วๆ นี้'}</em>
            </button>
          );
        })}
      </div>
      {!list.length ? (
        <div className="l5g-ptype-empty">
          <Sparkles className="w-8 h-8" />
          <b>เกมแบบเล่นในเครื่องเดียว กำลังจะมาเร็วๆ นี้</b>
          <span>ตอนนี้เลือก &quot;เข้าร่วมห้อง&quot; ก่อนได้เลย</span>
        </div>
      ) : (
    <div className="l5g-modes">
      {list.map((m) => {
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
              <PlayTypeTag mode={m.id} />
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
      )}
    </>
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

/** ตั้งค่าเกมแบบเล่นในเครื่องเดียว (ไม่เปิดห้อง): เดี่ยว/ทีม จำนวนข้อ เวลาต่อข้อ ความยาก เพลง */
export function LocalSetup({ mode, usable, value, onChange }: { mode: GameMode; usable: number; value: ArSettings; onChange: (v: ArSettings) => void }) {
  const info = modeById(mode);
  const set = (p: Partial<ArSettings>) => (gsfx.tap(), onChange({ ...value, ...p }));
  const counts = AR_COUNTS.filter((n) => n === 0 || n < usable);
  return (
    <>
      <div className="l5g-modechip mb-3" style={{ ['--mc' as string]: info.color }}>
        รูปแบบ: <b>{info.name}</b> <span className="opacity-70">(เล่นในเครื่องนี้ ไม่ต้องเปิดห้อง)</span>
      </div>
      <div className="grid gap-4">
        <div>
          <p className="l5g-qset-label flex items-center gap-1">
            <Users className="w-4 h-4" /> ผู้เล่น
          </p>
          <div className="l5g-chips">
            {(info.teams || [0]).map((t) => (
              <button key={t} type="button" className="l5g-chipbtn" data-on={value.teams === t} onClick={() => set({ teams: t })}>
                {t === 2 ? '2 ทีม (จอแบ่งซ้าย-ขวา)' : t ? `${t} ทีม (ผลัดกันเล่น)` : 'เล่นเดี่ยว'}
              </button>
            ))}
          </div>
        </div>
        {value.teams > 0 && (
          <div>
            <p className="l5g-qset-label flex items-center gap-1">
              <Users className="w-4 h-4" /> สมาชิกต่อทีม (สลับคนคุมยานทุกข้อ)
            </p>
            <div className="l5g-chips">
              {AR_MEMBERS.map((n) => (
                <button key={n} type="button" className="l5g-chipbtn" data-on={value.members === n} onClick={() => set({ members: n })}>
                  {n} คน
                </button>
              ))}
            </div>
          </div>
        )}
        <div>
          <p className="l5g-qset-label flex items-center gap-1">
            <ListOrdered className="w-4 h-4" /> จำนวนคำถาม (ชุดนี้ใช้ได้ {usable} ข้อ)
          </p>
          <div className="l5g-chips">
            {counts.map((n) => (
              <button key={n} type="button" className="l5g-chipbtn" data-on={value.count === n || (value.count >= usable && n === 0)} onClick={() => set({ count: n })}>
                {n ? `${n} ข้อ` : `ทั้งหมด ${usable} ข้อ`}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="l5g-qset-label flex items-center gap-1">
            <Clock3 className="w-4 h-4" /> เวลาต่อข้อ
          </p>
          <div className="l5g-chips">
            {AR_TIMES.map((t) => (
              <button key={t} type="button" className="l5g-chipbtn" data-on={value.time === t} onClick={() => set({ time: t })}>
                {t ? `${t} วินาที` : 'ตามชุดคำถาม (อย่างน้อย 20 วิ)'}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="l5g-qset-label flex items-center gap-1">
            <Gauge className="w-4 h-4" /> ความยาก (ยานลอยไปมา / อุกกาบาตเร็ว / บอสดุ)
          </p>
          <div className="l5g-chips">
            {AR_LEVELS.map((l, i) => (
              <button key={i} type="button" className="l5g-chipbtn" data-on={value.level === i} onClick={() => set({ level: i })}>
                {l}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="l5g-qset-label flex items-center gap-1">
            <Flag className="w-4 h-4" /> บอส
          </p>
          <div className="l5g-chips">
            {[{ id: 'auto', name: 'ตามด่านในแผนที่' }, ...BOSSES].map((b) => (
              <button key={b.id} type="button" className="l5g-chipbtn" data-on={value.boss === b.id} onClick={() => set({ boss: b.id })}>
                {b.name}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="l5g-qset-label">เพลงประกอบ (กดปุ่มเล่นเพื่อฟังตัวอย่าง)</p>
          <MusicPicker value={value.music} mode={mode} onPick={(m) => onChange({ ...value, music: m })} />
        </div>
      </div>
    </>
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
  const [revealAnswer, setRA] = useState(true);
  const [music, setMusicSetting] = useState('auto');
  const [musicPlayers, setMP] = useState(true);
  const [duration, setDuration] = useState(0);
  const [goal, setGoal] = useState(0);
  const [teams, setTeams] = useState(0);
  const [reset, setReset] = useState(0);
  const [local, setLocal] = useState<ArSettings>(AR_DEFAULTS);
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
  const isLocal = !!info && playTypeOf(info) === 'local';

  const pick = (g: GameMode) => {
    setGame(g);
    const m = modeById(g);
    setDuration(m.defaultDuration || 0);
    setGoal(m.defaultGoal || 0);
    setTeams(0);
    setReset(m.defaultReset || 0);
  };

  const open = async () => {
    if (!game) return;
    if (isLocal) {
      gsfx.start();
      router.push(`/play/${game}?${arQuery(gameId, local)}`);
      return;
    }
    setBusy(true);
    setErr('');
    gsfx.tap();
    try {
      const r = await fetch('/api/live/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, game, mode, nickname: nick, settings: { shuffleQuestions, shuffleChoices, revealAnswer, music, musicPlayers, duration, goal, teams, reset }, background: lastBackground() }),
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
    <PaperModal title={step === 1 ? 'เลือกรูปแบบการเล่น' : isLocal ? 'ตั้งค่าเกม' : 'ตั้งค่าห้อง'} icon={<Rocket className="w-5 h-5" />} iconBg="#ffcf3f" onClose={onClose} busy={busy} width={step === 1 ? 860 : 580}>
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
      ) : isLocal && game ? (
        <>
          <LocalSetup mode={game} usable={content ? modeFit(content, game).usable : 0} value={local} onChange={setLocal} />
          <div className="l5g-math-foot">
            <button type="button" className="l5g-btn l5g-btn-ghost" onClick={() => setStep(1)}>
              <ArrowLeft className="w-4 h-4" /> ย้อนกลับ
            </button>
            <span className="flex-1" />
            <button type="button" className="l5g-btn l5g-btn-go" onClick={open}>
              <Play className="w-5 h-5" /> เริ่มเล่น
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
          {info?.teams && (
            <div className="mt-4">
              <p className="l5g-qset-label flex items-center gap-1">
                <Users className="w-4 h-4" /> แบ่งทีม
              </p>
              <div className="l5g-chips">
                {info.teams.map((t) => (
                  <button key={t} type="button" className="l5g-chipbtn" data-on={teams === t} onClick={() => (gsfx.tap(), setTeams(t))}>
                    {t ? `${t} ทีม` : 'ต่างคนต่างสี'}
                  </button>
                ))}
              </div>
            </div>
          )}
          {info?.resets && (
            <div className="mt-4">
              <p className="l5g-qset-label flex items-center gap-1">
                <RefreshCw className="w-4 h-4" /> ไข่ทุกไบโอมเกิดใหม่ทุก
              </p>
              <div className="l5g-chips">
                {info.resets.map((r) => (
                  <button key={r} type="button" className="l5g-chipbtn" data-on={reset === r} onClick={() => (gsfx.tap(), setReset(r))}>
                    {fmtDuration(r)}
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

          <div className="mt-4 grid gap-2">
            {game === 'quiz' && (
              <>
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
              </>
            )}
            <label className="l5g-switch">
              <input type="checkbox" checked={revealAnswer} onChange={(e) => setRA(e.target.checked)} />
              <span className="l5g-switch-ui" />
              <Eye className="w-4 h-4" /> เฉลยเมื่อตอบผิด
            </label>
          </div>

          {game && (
            <div className="mt-4">
              <p className="l5g-qset-label">เพลงประกอบ (กดปุ่มเล่นเพื่อฟังตัวอย่าง)</p>
              <MusicPicker value={music} mode={game} onPick={setMusicSetting} />
              <label className="l5g-switch mt-2">
                <input type="checkbox" checked={musicPlayers} onChange={(e) => setMP(e.target.checked)} />
                <span className="l5g-switch-ui" />
                เปิดเพลงในเครื่องผู้เล่นด้วย
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
