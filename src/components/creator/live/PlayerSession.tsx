'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Crown, Hourglass, Loader2, LogOut, Shirt, Trophy, Users } from 'lucide-react';
import { Avatar } from '../Avatar';
import { PaperModal } from '../PaperModal';
import { QuizRunner } from '../quiz/QuizRunner';
import { CafeGame } from '../games/CafeGame';
import { TowerGame } from '../games/TowerGame';
import { RaceGame } from '../games/RaceGame';
import { BrawlGame } from '../games/BrawlGame';
import { FishGame } from '../games/FishGame';
import { TurfGame } from '../games/TurfGame';
import { TreasureGame } from '../games/TreasureGame';
import { EggGame } from '../games/egg/LazyEggGame';
import { LookPicker } from './LookPicker';
import { Medal, PodiumShow, type ShowEntry } from './PodiumShow';
import { LiveError, liveEngine, playerApi, subscribeRoom, type LiveOutcome, type PlayerCreds, type PlayerStateRes, type PodiumEntry, type RosterEntry } from '@/lib/game-creator/live-client';
import { modeById, type GameMode } from '@/lib/game-creator/modes';
import { cleanGear, type Gear } from '@/lib/game-creator/gear';
import type { RoomBackground } from '@/lib/game-creator/types';
import { gsfx } from '@/lib/game-creator/gsound';
import { releaseMusic, setMusic } from '@/lib/music';
import { roomTrack } from '@/lib/music-tracks';

export { Medal };

export function Confetti() {
  const bits = useMemo(() => Array.from({ length: 40 }, (_, i) => ({ x: Math.random() * 100, d: Math.random() * 1.6, r: Math.random() * 360, c: ['#ff6b7a', '#4a7bf0', '#ffcf3f', '#3fd6a8', '#9b6cf0'][i % 5] })), []);
  return (
    <div className="l5g-confetti" aria-hidden="true">
      {bits.map((b, i) => (
        <i key={i} style={{ left: `${b.x}%`, animationDelay: `${b.d}s`, background: b.c, transform: `rotate(${b.r}deg)` }} />
      ))}
    </div>
  );
}

/** ค่าที่โชว์บนแท่นรับรางวัลตามรูปแบบการเล่น */
export function podiumValue(game: GameMode, p: { score: number; progress: number }, goal: number) {
  if (game === 'racing') return `${p.progress}/${goal}`;
  return p.score.toLocaleString('th-TH');
}

export const toShow = (game: GameMode, list: PodiumEntry[], goal: number): ShowEntry[] =>
  list.map((p) => ({ id: p.id, nickname: p.nickname, avatar: p.avatar, gear: p.gear, value: podiumValue(game, p, goal) }));

/** เพื่อนๆ ในห้องรอ (เห็นทุกคน รวมเจ้าของห้องถ้าเล่นด้วย) */
function Mates({ roster, meId }: { roster: RosterEntry[]; meId: string }) {
  const others = roster.filter((r) => r.id !== meId).sort((a, b) => Number(b.isHost) - Number(a.isHost));
  return (
    <div className="l5g-mates">
      <p className="l5g-mates-head">
        <Users className="w-4 h-4" /> ในห้องตอนนี้ {roster.length || 1} คน
      </p>
      {others.length === 0 ? (
        <p className="l5g-mates-empty">ยังไม่มีเพื่อนเข้ามา ชวนเพื่อนใส่เลขห้องเดียวกันนะ</p>
      ) : (
        <div className="l5g-mates-list">
          {others.map((r, i) => (
            <span key={r.id} className="l5g-mate" data-host={r.isHost} style={{ animationDelay: `${Math.min(i, 20) * 40}ms` }}>
              <span className="l5g-mate-av">
                <Avatar id={r.avatar} gear={r.gear} size={52} />
                {r.isHost && <Crown className="l5g-mate-crown" />}
              </span>
              <b>{r.nickname}</b>
              {r.isHost && <em>เจ้าของห้อง</em>}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * หน้าจอของผู้เล่นหนึ่งคนในห้อง (ใช้ทั้งหน้า /play และเจ้าของห้องที่เลือก "เล่นเกมนี้ด้วย")
 */
export function PlayerSession({
  creds,
  onExit,
  onBackground,
  onLook,
  hostMode = false,
  muted = false,
}: {
  creds: PlayerCreds;
  onExit: (reason: 'left' | 'kicked' | 'gone' | 'closed') => void;
  onBackground?: (bg: RoomBackground) => void;
  onLook?: (avatar: number, gear: Gear) => void;
  hostMode?: boolean;
  /** ปิดเสียงในเครื่องนี้ (เพลงด้วย) */
  muted?: boolean;
}) {
  const [st, setSt] = useState<PlayerStateRes | null>(null);
  const [err, setErr] = useState('');
  const [live, setLive] = useState(false);
  const [running, setRunning] = useState(false);
  const [final, setFinal] = useState<number | null>(null);
  const [show, setShow] = useState(false);
  const [dress, setDress] = useState<{ avatar: number; gear: Gear } | null>(null);
  const [dressBusy, setDressBusy] = useState(false);
  // callback จากผู้เรียกเก็บไว้ใน ref: ผู้เรียกส่งฟังก์ชันใหม่ทุกครั้งที่ render ก็ไม่ทำให้ขอสถานะ/ต่อ Realtime ใหม่ซ้ำๆ
  const cbs = useRef({ onExit, onBackground });
  cbs.current = { onExit, onBackground };
  const stRef = useRef<PlayerStateRes | null>(null);
  const runningRef = useRef(false);
  runningRef.current = running;
  /** นาฬิกาเซิร์ฟเวอร์ - นาฬิกาเครื่องนี้ (ใช้คำนวณเวลาจบเกม) */
  const clockOffset = useRef(0);
  const raceRefreshAt = useRef(0);
  const c = useMemo(() => ({ playerId: creds.playerId, token: creds.token }), [creds.playerId, creds.token]);

  const put = useCallback((s: PlayerStateRes) => {
    stRef.current = s;
    setSt(s);
  }, []);

  const apply = useCallback(
    (s: PlayerStateRes) => {
      const prev = stRef.current;
      if (s.serverNow) clockOffset.current = s.serverNow - Date.now();
      put(s);
      cbs.current.onBackground?.(s.room.background);
      if (prev && prev.room.status !== s.room.status) {
        if (s.room.status === 'playing') gsfx.start();
        // จบเกม: คัตซีนประกาศผล (เจ้าของห้องดูบนจอหลักแทน)
        if (s.room.status === 'ended') {
          if (!hostMode && s.podium?.length) setShow(true);
          else gsfx.fanfare();
        }
      }
      if (s.room.status !== 'ended') setShow(false);
      if (s.room.status === 'closed') cbs.current.onExit('closed');
    },
    [put, hostMode]
  );

  const handleErr = useCallback(
    (e: unknown) => {
      if (e instanceof LiveError) {
        if (e.kicked) return cbs.current.onExit('kicked');
        if (e.gone) return cbs.current.onExit('gone');
        setErr(e.message);
      }
    },
    []
  );

  const refresh = useCallback(async () => {
    try {
      const s = await playerApi.state(c);
      setErr('');
      apply(s);
    } catch (e) {
      handleErr(e);
    }
  }, [c, apply, handleErr]);

  /** ระหว่างตอบคำถามใช้ peek (ไม่ไปเริ่มจับเวลาข้อถัดไปก่อนเวลา) */
  const peek = useCallback(async () => {
    try {
      const p = await playerApi.peek(c);
      const cur = stRef.current;
      cbs.current.onBackground?.(p.background);
      if (cur && cur.room.game === 'racing' && (p.progress !== cur.me.progress || p.slipAt !== cur.me.slipAt)) {
        put({ ...cur, me: { ...cur.me, progress: p.progress, slipAt: p.slipAt } });
      }
      if (!cur || p.status !== cur.room.status || p.round !== cur.room.round) {
        if (runningRef.current && p.status === 'playing' && cur && p.round === cur.room.round) return;
        setRunning(false);
        await refresh();
      }
    } catch (e) {
      handleErr(e);
    }
  }, [c, refresh, handleErr, put]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // สัญญาณทันทีจาก Realtime
  useEffect(() => {
    return subscribeRoom(
      creds.roomId,
      (e) => {
        const cur = stRef.current;
        if (e.event === 'kick' && e.payload.playerId === creds.playerId) cbs.current.onExit('kicked');
        else if (e.event === 'kick' && cur && cur.room.status === 'lobby') put({ ...cur, roster: (cur.roster || []).filter((r) => r.id !== e.payload.playerId) });
        else if (e.event === 'join' && cur && cur.room.status === 'lobby') {
          // มีคนเข้า/ออก/แต่งตัวใหม่: อัปเดตรายชื่อจากสัญญาณเลย (ไม่ต้องถามเซิร์ฟเวอร์)
          const pl = e.payload.player as RosterEntry | undefined;
          const left = e.payload.left as string | undefined;
          let roster = cur.roster || [];
          if (left) roster = roster.filter((r) => r.id !== left);
          if (pl && typeof pl.id === 'string') {
            const entry = { ...pl, gear: cleanGear(pl.gear) };
            const isNew = !roster.some((r) => r.id === pl.id);
            roster = isNew ? [...roster, entry] : roster.map((r) => (r.id === pl.id ? entry : r));
            if (isNew && pl.id !== creds.playerId) gsfx.join();
          }
          put({ ...cur, roster });
        } else if (e.event === 'music' && cur) {
          put({ ...cur, room: { ...cur.room, music: String(e.payload.music || 'auto'), musicPlayers: e.payload.musicPlayers !== false } });
        } else if (e.event === 'bg' && e.payload.background) cbs.current.onBackground?.(e.payload.background as RoomBackground);
        else if ((e.event === 'race' || e.event === 'banana') && cur?.room.game === 'racing') {
          // ขยับคู่แข่งทันทีจากสัญญาณ (ไม่ต้องรอถามเซิร์ฟเวอร์)
          const pid = e.payload.id;
          if (e.event === 'race' && typeof pid === 'string' && typeof e.payload.progress === 'number' && pid !== creds.playerId && cur.rivals.some((r) => r.id === pid)) {
            put({ ...cur, rivals: cur.rivals.map((r) => (r.id === pid ? { ...r, progress: e.payload.progress as number, finished: !!e.payload.finished } : r)) });
          }
          // อันดับ/คู่แข่งชุดใหม่: ขอสถานะ (ไม่เอาคำถาม) แต่ไม่ถี่เกินไป
          const now = Date.now();
          if (e.event === 'banana' || now - raceRefreshAt.current > 3000) {
            raceRefreshAt.current = now;
            playerApi
              .state(c, false)
              .then((s) => {
                if (s.room.status === stRef.current?.room.status) put(s);
                else apply(s);
              })
              .catch(() => null);
          }
        } else if (e.event === 'status') {
          if (e.payload.status !== 'playing') setRunning(false);
          refresh();
        }
      },
      setLive
    );
  }, [creds.roomId, creds.playerId, refresh, c, apply, put]);

  // ถามสถานะเป็นระยะ (ถี่ขึ้นถ้า Realtime ใช้ไม่ได้)
  const status = st?.room.status;
  const game = st?.room.game || 'quiz';
  const finished = game === 'quiz' ? !!st?.me.finished : false;
  useEffect(() => {
    if (!status) return;
    const racing = game === 'racing' && status === 'playing';
    const ms = racing ? (live ? 5000 : 2500) : live ? (status === 'playing' && finished ? 6000 : 15000) : status === 'playing' && !finished ? 8000 : 3500;
    const iv = setInterval(() => (runningRef.current ? peek() : refresh()), ms);
    return () => clearInterval(iv);
  }, [status, finished, live, peek, refresh, game]);

  useEffect(() => {
    if (status === 'playing' && !finished) setRunning(true);
    if (status !== 'playing') setRunning(false);
  }, [status, finished]);

  // เพลงของห้อง (เจ้าของห้องที่เล่นด้วยได้ยินจากจอหลักอยู่แล้ว)
  const musicId = st ? roomTrack(st.room.music, st.room.game) : null;
  const musicOn = !hostMode && !muted && !!st && st.room.musicPlayers !== false && (st.room.status === 'lobby' || st.room.status === 'playing');
  useEffect(() => {
    if (hostMode) return;
    setMusic('room', musicOn ? musicId : null);
  }, [hostMode, musicOn, musicId]);
  useEffect(() => () => (hostMode ? undefined : releaseMusic('room')), [hostMode]);

  const engine = useMemo(
    () =>
      liveEngine(
        c,
        (s) => {
          if (s.serverNow) clockOffset.current = s.serverNow - Date.now();
          put(s);
          cbs.current.onBackground?.(s.room.background);
        },
        (o: LiveOutcome) => {
          // Racing: อัปเดตระยะทาง ไอเท็ม และคู่แข่งทันทีหลังตอบ
          const cur = stRef.current;
          if (!cur || cur.room.game !== 'racing') return;
          put({
            ...cur,
            me: { ...cur.me, progress: o.progress ?? cur.me.progress, power: o.power ?? null, rank: o.rank ?? cur.me.rank, players: o.players ?? cur.me.players, finished: !!o.finished || cur.me.finished },
            rivals: o.rivals ?? cur.rivals,
          });
        }
      ),
    [c, put]
  );

  const sync = useCallback(
    (score: number, stats: Record<string, number>) => {
      playerApi.sync(c, score, stats).catch(() => null);
    },
    [c]
  );

  const usePower = useCallback(async () => {
    const r = await playerApi.power(c);
    const cur = stRef.current;
    if (cur && r.ok) put({ ...cur, me: { ...cur.me, power: null, progress: r.progress ?? cur.me.progress } });
    return r;
  }, [c, put]);

  const leave = useCallback(async () => {
    gsfx.tap();
    await playerApi.leave(c);
    cbs.current.onExit('left');
  }, [c]);

  const saveLook = async () => {
    if (!dress) return;
    setDressBusy(true);
    try {
      const r = await playerApi.look(c, dress.avatar, dress.gear);
      const cur = stRef.current;
      if (cur) {
        put({
          ...cur,
          me: { ...cur.me, avatar: r.avatar, gear: r.gear },
          roster: (cur.roster || []).map((x) => (x.id === cur.me.id ? { ...x, avatar: r.avatar, gear: r.gear } : x)),
        });
      }
      onLook?.(r.avatar, r.gear);
      gsfx.sparkleish();
      setDress(null);
    } catch (e) {
      handleErr(e);
      setDress(null);
    } finally {
      setDressBusy(false);
    }
  };

  if (!st) {
    return (
      <div className="l5g-run-center">
        {err ? (
          <div className="l5g-card l5g-card-pad text-center">
            <p className="font-bold">{err}</p>
            <button type="button" className="l5g-btn l5g-btn-go mt-3" onClick={refresh}>
              ลองใหม่
            </button>
          </div>
        ) : (
          <Loader2 className="w-10 h-10 animate-spin text-white drop-shadow" />
        )}
      </div>
    );
  }

  const me = st.me;
  const myGear = cleanGear(me.gear);

  if (st.room.status === 'playing' && running && st.room.game !== 'quiz') {
    const deadline = st.room.duration && st.room.startedAt ? new Date(st.room.startedAt).getTime() + st.room.duration * 1000 - clockOffset.current : null;
    const props = { engine, deadline, goal: st.room.goal || 15, sync, me: { nickname: me.nickname, avatar: me.avatar, gear: myGear }, onLeave: hostMode ? undefined : leave };
    if (st.room.game === 'cafe') return <CafeGame key={st.room.round} {...props} />;
    if (st.room.game === 'tower') return <TowerGame key={st.room.round} {...props} />;
    if (st.room.game === 'brawl') return <BrawlGame key={st.room.round} {...props} />;
    if (st.room.game === 'fishing') return <FishGame key={st.room.round} {...props} />;
    if (st.room.game === 'turf' || st.room.game === 'treasure' || st.room.game === 'egg') {
      // โลกเดียวกัน: รายชื่อทุกคน (เรียงตามเวลาเข้า) ใช้แบ่งทีม/สีให้ตรงกันทุกเครื่อง
      const world = {
        roomId: st.room.id,
        myId: me.id,
        players: (st.roster || []).map((r) => ({ id: r.id, nickname: r.nickname, avatar: r.avatar, gear: cleanGear(r.gear) })),
        teams: st.room.teams || 0,
        round: st.room.round,
        now: () => Date.now() + clockOffset.current,
      };
      const Game = st.room.game === 'turf' ? TurfGame : st.room.game === 'egg' ? EggGame : TreasureGame;
      return <Game key={st.room.round} {...props} world={world} startScore={me.score} />;
    }
    return (
      <RaceGame
        key={st.room.round}
        {...props}
        live={{ myId: me.id, progress: me.progress, rivals: st.rivals, power: me.power, slipAt: me.slipAt, rank: me.rank, players: me.players, usePower }}
      />
    );
  }

  if (st.room.status === 'playing' && running) {
    return (
      <QuizRunner
        key={`${st.room.round}`}
        engine={engine}
        score={me.score}
        streak={me.streak}
        countdown={me.pos === 0 && me.answered === 0}
        onFinished={({ score }) => {
          setFinal(score);
          setRunning(false);
          gsfx.fanfare();
          refresh();
        }}
      />
    );
  }

  if (st.room.status === 'lobby') {
    return (
      <div className="l5g-run-center l5g-lobby-me">
        <div className="l5g-me-avatar">
          <Avatar id={me.avatar} gear={myGear} size={132} />
        </div>
        <p className="l5g-me-name">{me.nickname}</p>
        <button type="button" className="l5g-btn l5g-btn-violet l5g-btn-sm l5g-dress-btn" onClick={() => (gsfx.tap(), setDress({ avatar: me.avatar, gear: myGear }))}>
          <Shirt className="w-4 h-4" /> แต่งตัว
        </button>
        <div className="l5g-card l5g-wait">
          <Hourglass className="w-6 h-6 l5g-spin-slow" />
          <div>
            <b>{hostMode ? 'กด "เริ่มเกม" เมื่อพร้อม' : 'เข้าห้องแล้ว รอเจ้าของห้องเริ่มเกมนะ'}</b>
            <p className="text-sm font-semibold opacity-70">{st.room.title}</p>
          </div>
        </div>
        <div className="l5g-modechip" style={{ ['--mc' as string]: modeById(st.room.game).color }}>
          เกม: <b>{modeById(st.room.game).name}</b>
        </div>
        <Mates roster={st.roster || []} meId={me.id} />
        {!hostMode && (
          <button type="button" className="l5g-btn l5g-btn-ghost l5g-btn-sm mt-2" onClick={leave}>
            <LogOut className="w-4 h-4" /> ออกจากห้อง
          </button>
        )}

        {dress && (
          <PaperModal title="แต่งตัวละคร" icon={<Shirt className="w-5 h-5" />} iconBg="#9b6cf0" onClose={() => setDress(null)} busy={dressBusy} width={520}>
            <LookPicker avatar={dress.avatar} gear={dress.gear} onChange={(a, g) => setDress({ avatar: a, gear: g })} />
            <div className="l5g-math-foot">
              <span className="flex-1" />
              <button type="button" className="l5g-btn l5g-btn-ghost" onClick={() => setDress(null)} disabled={dressBusy}>
                ยกเลิก
              </button>
              <button type="button" className="l5g-btn l5g-btn-go" onClick={saveLook} disabled={dressBusy}>
                {dressBusy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Shirt className="w-5 h-5" />} ใส่ชุดนี้
              </button>
            </div>
          </PaperModal>
        )}
      </div>
    );
  }

  if (st.room.status === 'ended') {
    const top = me.rank > 0 && me.rank <= 3;
    return (
      <>
        {show && (
          <PodiumShow
            key={st.room.round}
            top={toShow(st.room.game, st.podium || [], st.room.goal)}
            meId={me.id}
            label={modeById(st.room.game).scoreLabel}
            doneText="ดูผลของฉัน"
            onDone={() => setShow(false)}
          />
        )}
        <div className="l5g-run-center l5g-result">
          {top && !show && <Confetti />}
          <p className="l5g-result-label">{top ? 'สุดยอดมาก!' : 'เก่งมาก!'}</p>
          <div className="l5g-result-medal">
            <Medal rank={me.rank || 1} size={120} />
          </div>
          <div className="l5g-card l5g-result-card">
            <div className="flex items-center gap-3">
              <Avatar id={me.avatar} gear={myGear} size={56} mood="wow" />
              <div className="min-w-0">
                <p className="font-display text-xl truncate">{me.nickname}</p>
                <p className="font-bold opacity-75">
                  อันดับ {me.rank} จาก {me.players} คน
                </p>
              </div>
            </div>
            <div className="l5g-result-stats">
              <span>
                <b>{(st.room.game === 'racing' ? me.progress : me.score).toLocaleString('th-TH')}</b>
                {modeById(st.room.game).scoreLabel}
              </span>
              <span>
                <b>{st.room.total ? `${me.correct}/${st.room.total}` : me.correct}</b>
                ข้อที่ถูก
              </span>
            </div>
          </div>
          {(st.podium || []).length > 0 && !show && (
            <button type="button" className="l5g-btn l5g-btn-blue l5g-btn-sm mt-1" onClick={() => (gsfx.tap(), setShow(true))}>
              <Trophy className="w-4 h-4" /> ดูประกาศผลอีกครั้ง
            </button>
          )}
          {!hostMode && (
            <div className="l5g-result-acts">
              <p className="text-white font-bold drop-shadow">รอเจ้าของห้องเริ่มรอบใหม่ หรือออกได้เลย</p>
              <button type="button" className="l5g-btn l5g-btn-coral" onClick={leave}>
                <LogOut className="w-5 h-5" /> ออกจากห้อง
              </button>
            </div>
          )}
        </div>
      </>
    );
  }

  // เล่นครบแล้ว รอเพื่อน
  return (
    <div className="l5g-run-center l5g-result">
      <div className="l5g-me-avatar">
        <Avatar id={me.avatar} gear={myGear} size={120} mood="happy" />
      </div>
      <div className="l5g-card l5g-result-card">
        <p className="font-display text-2xl text-center">ทำครบทุกข้อแล้ว!</p>
        <div className="l5g-result-stats">
          <span>
            <b>{(final ?? me.score).toLocaleString('th-TH')}</b>คะแนน
          </span>
          <span>
            <b>
              {me.correct}/{st.room.total}
            </b>
            ข้อที่ถูก
          </span>
          {me.rank > 0 && (
            <span>
              <b>
                <Trophy className="w-5 h-5 inline -mt-1" /> {me.rank}
              </b>
              อันดับตอนนี้
            </span>
          )}
        </div>
        <p className="text-center font-semibold opacity-70 mt-3">รอเพื่อนๆ ทำให้เสร็จ แล้วจะประกาศผล</p>
      </div>
      {!hostMode && (
        <button type="button" className="l5g-btn l5g-btn-ghost mt-3" onClick={leave}>
          <LogOut className="w-5 h-5" /> ออกจากห้อง
        </button>
      )}
    </div>
  );
}
