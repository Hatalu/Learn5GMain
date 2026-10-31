'use client';

/**
 * แผงครู (ควบคุมบนเครื่องเดียวกับที่เล่น): เริ่ม/หยุด/รอบใหม่/จบ, ตั้งค่าเกม, เปิดปิดท่าทาง, คะแนนสด,
 * ผูกชุดคำถามกับแต่ละด่าน, ตั้งภารกิจประจำวันเอง
 * เปิดแผงระหว่างเล่น = เกมหยุดเวลาไว้ก่อน
 */
import React, { useEffect, useState } from 'react';
import { Gauge, Pause, Play, Plus, RotateCcw, Square, Trash2, Trophy, Unlock, X } from 'lucide-react';
import { gsfx } from '@/lib/game-creator/gsound';
import { createClient } from '@/lib/supabase/client';
import { AR_COUNTS, AR_LEVELS, AR_MEMBERS, AR_TEAMS, AR_TIMES, type ArSettings } from '@/lib/game-creator/arSettings';
import { BOSSES } from '@/lib/game-creator/ar/boss';
import { MOTIONS, SENS } from '@/lib/game-creator/ar/gestures';
import { PLANETS } from '@/lib/game-creator/ar/map';
import { M_NAME, M_TYPES, dailyFor, type MissionDef } from '@/lib/game-creator/ar/missions';
import { ranks } from '@/lib/game-creator/ar/teams';
import type { ArSave } from '@/lib/game-creator/ar/save';

export interface BoardRow {
  name: string;
  color: string;
  know: number;
  play: number;
  correct: number;
  wrong: number;
}

type Tab = 'ctrl' | 'motion' | 'sets' | 'mission';

function Chips<T extends string | number>({ items, value, onPick }: { items: { v: T; name: string }[]; value: T; onPick: (v: T) => void }) {
  return (
    <div className="art-chips">
      {items.map((it) => (
        <button key={String(it.v)} type="button" className="ar-chip" data-on={value === it.v} onClick={() => (gsfx.tap(), onPick(it.v))}>
          {it.name}
        </button>
      ))}
    </div>
  );
}

export function ArTeacher({
  cfg,
  setCfg,
  running,
  paused,
  onStart,
  onPause,
  onRestart,
  onEnd,
  onClose,
  board,
  save,
  onSave,
}: {
  cfg: ArSettings;
  setCfg: (c: ArSettings) => void;
  /** กำลังอยู่ในด่าน */
  running: boolean;
  paused: boolean;
  onStart: () => void;
  onPause: (p: boolean) => void;
  onRestart: () => void;
  onEnd: () => void;
  onClose: () => void;
  board: BoardRow[];
  save: ArSave;
  onSave: (s: ArSave) => void;
}) {
  const [tab, setTab] = useState<Tab>('ctrl');
  const [sets, setSets] = useState<{ id: string; title: string }[] | null>(null);
  const [setsErr, setSetsErr] = useState('');
  const set = (p: Partial<ArSettings>) => setCfg({ ...cfg, ...p });
  const later = running ? ' (มีผลรอบถัดไป)' : '';

  useEffect(() => {
    if (tab !== 'sets' || sets) return;
    const sb = createClient();
    sb.auth.getUser().then(async ({ data }) => {
      const uid = data.user?.id;
      if (!uid) return setSetsErr('เข้าสู่ระบบด้วยบัญชีครูก่อน จึงจะเลือกชุดคำถามของตัวเองได้');
      const { data: rows, error } = await sb.from('user_games').select('id, title').eq('owner_id', uid).order('updated_at', { ascending: false }).limit(200);
      if (error) return setSetsErr('โหลดรายการชุดคำถามไม่สำเร็จ ลองใหม่อีกครั้ง');
      setSets((rows || []) as { id: string; title: string }[]);
    });
  }, [tab, sets]);

  const custom = save.custom || dailyFor(save.day, null);
  const setCustom = (list: MissionDef[] | null) => onSave({ ...save, custom: list && list.length ? list : null, claimed: [] });
  const total = board.map((b) => b.know + b.play);

  return (
    <div className="ar-panel-wrap art-wrap" onPointerDown={(e) => e.stopPropagation()}>
      <div className="ar-panel art">
        <div className="art-head">
          <b>แผงครู</b>
          <button type="button" className="art-x" onClick={() => (gsfx.tap(), onClose())} aria-label="ปิดแผงครู">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="arm-tabs art-tabs" role="tablist">
          {(
            [
              ['ctrl', 'ควบคุม/ตั้งค่า'],
              ['motion', 'ท่าทาง'],
              ['sets', 'ชุดคำถามต่อด่าน'],
              ['mission', 'ภารกิจประจำวัน'],
            ] as const
          ).map(([id, name]) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} data-on={tab === id} onClick={() => (gsfx.tap(), setTab(id))}>
              {name}
            </button>
          ))}
        </div>

        {tab === 'ctrl' && (
          <div className="art-body">
            <div className="art-actions">
              {!running && (
                <button type="button" className="ar-btn ar-btn-go" onClick={onStart}>
                  <Play className="w-5 h-5" /> เริ่มเกม (ด่านที่เลือก)
                </button>
              )}
              {running && (
                <>
                  <button type="button" className="ar-btn" onClick={() => onPause(!paused)}>
                    {paused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />} {paused ? 'เล่นต่อ' : 'หยุดเกม'}
                  </button>
                  <button type="button" className="ar-btn" onClick={onRestart}>
                    <RotateCcw className="w-5 h-5" /> เริ่มรอบใหม่
                  </button>
                  <button type="button" className="ar-btn" onClick={onEnd}>
                    <Square className="w-5 h-5" /> จบรอบ ดูผล
                  </button>
                </>
              )}
            </div>
            {running && board.length > 0 && (
              <div className="art-board">
                <p className="art-label">
                  <Trophy className="w-4 h-4" /> คะแนนสด
                </p>
                {ranks(total).map((r) => {
                  const b = board[r.team];
                  return (
                    <div key={r.team} className="art-row" style={{ ['--tc' as string]: b.color }}>
                      <span className="art-rank">{r.rank}</span>
                      <b>{b.name}</b>
                      <span>ความรู้ {b.know}</span>
                      <span>การเล่น {b.play}</span>
                      <span>
                        ถูก {b.correct} / ผิด {b.wrong}
                      </span>
                      <em>{r.score.toLocaleString('th-TH')}</em>
                    </div>
                  );
                })}
              </div>
            )}
            <p className="art-label">จำนวนทีม{later}</p>
            <Chips items={AR_TEAMS.map((t) => ({ v: t, name: t === 0 ? 'เดี่ยว' : t === 2 ? '2 ทีม จอแบ่ง' : `${t} ทีม ผลัดกัน` }))} value={cfg.teams} onPick={(t) => set({ teams: t })} />
            {cfg.teams > 0 && (
              <>
                <p className="art-label">สมาชิกต่อทีม{later}</p>
                <Chips items={AR_MEMBERS.map((m) => ({ v: m, name: `${m} คน` }))} value={cfg.members} onPick={(m) => set({ members: m })} />
              </>
            )}
            <p className="art-label">จำนวนคำถาม{later}</p>
            <Chips items={AR_COUNTS.map((n) => ({ v: n, name: n ? `${n} ข้อ` : 'ทั้งชุด' }))} value={cfg.count} onPick={(n) => set({ count: n })} />
            <p className="art-label">เวลาต่อข้อ (ข้อถัดไป)</p>
            <Chips items={AR_TIMES.map((t) => ({ v: t, name: t ? `${t} วิ` : 'ตามชุด' }))} value={cfg.time} onPick={(t) => set({ time: t })} />
            <p className="art-label">ความยาก{later}</p>
            <Chips items={AR_LEVELS.map((name, v) => ({ v, name }))} value={cfg.level} onPick={(v) => set({ level: v })} />
            <p className="art-label">บอส{later}</p>
            <Chips items={[{ v: 'auto', name: 'ตามด่าน' }, ...BOSSES.map((b) => ({ v: b.id as string, name: b.name }))]} value={cfg.boss} onPick={(b) => set({ boss: b })} />
          </div>
        )}

        {tab === 'motion' && (
          <div className="art-body">
            <p className="art-note">ปิดท่าไหน บอสจะไม่ใช้การโจมตีที่ต้องใช้ท่านั้น (เล่นแบบแตะจอใช้ปุ่มแทนท่าทางเสมอ)</p>
            {MOTIONS.map((m) => {
              const on = (cfg.motions & m.bit) !== 0;
              return (
                <label key={m.id} className="art-toggle">
                  <input type="checkbox" checked={on} onChange={() => (gsfx.tap(), set({ motions: on ? cfg.motions & ~m.bit : cfg.motions | m.bit }))} />
                  <span>
                    <b>{m.name}</b>
                    <small>{m.how}</small>
                  </span>
                </label>
              );
            })}
            {(cfg.motions & 2) !== 0 && <p className="art-warn">เปิดกระโดดแล้ว: ให้เด็กยืนห่างกันและห่างโต๊ะ/ผนัง พื้นไม่ลื่น</p>}
            <p className="art-label">
              <Gauge className="w-4 h-4" /> ความไวการตรวจท่า
            </p>
            <Chips items={SENS.map((s, v) => ({ v, name: s.name }))} value={cfg.sens} onPick={(v) => set({ sens: v })} />
          </div>
        )}

        {tab === 'sets' && (
          <div className="art-body">
            <p className="art-note">ด่านที่ไม่ได้เลือก = ใช้ชุดคำถามที่เปิดเกมนี้มา (บันทึกในเครื่องนี้)</p>
            <label className="art-toggle">
              <input type="checkbox" checked={save.openAll} onChange={() => (gsfx.tap(), onSave({ ...save, openAll: !save.openAll }))} />
              <span>
                <b>
                  <Unlock className="w-4 h-4 inline" /> ปลดล็อกทุกด่าน
                </b>
                <small>ให้ครูเลือกด่านไหนก็ได้ ไม่ต้องเล่นตามลำดับ</small>
              </span>
            </label>
            {setsErr && <p className="ar-err">{setsErr}</p>}
            {!sets && !setsErr && <p className="art-note">กำลังโหลดชุดคำถามของคุณ…</p>}
            {sets &&
              PLANETS.map((p) => (
                <div key={p.id} className="art-planet">
                  <b style={{ color: p.color }}>{p.name}</b>
                  {p.stages.map((s) => (
                    <label key={s.id} className="art-set">
                      <span>{s.name}</span>
                      <select
                        value={save.sets[s.id] || ''}
                        onChange={(e) => {
                          const next = { ...save.sets };
                          if (e.target.value) next[s.id] = e.target.value;
                          else delete next[s.id];
                          onSave({ ...save, sets: next });
                        }}
                      >
                        <option value="">ชุดที่เปิดเกมมา</option>
                        {sets.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.title}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
              ))}
          </div>
        )}

        {tab === 'mission' && (
          <div className="art-body">
            <p className="art-note">{save.custom ? 'ใช้ภารกิจที่ครูตั้ง (ทุกวันจนกว่าจะกลับไปใช้แบบสุ่ม)' : 'ตอนนี้สุ่มภารกิจตามวัน แก้ข้างล่างเพื่อตั้งเอง'}</p>
            {custom.map((m, i) => (
              <div key={i} className="art-mrow">
                <select value={m.type} onChange={(e) => setCustom(custom.map((x, j) => (j === i ? { ...x, type: e.target.value as MissionDef['type'] } : x)))}>
                  {M_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {M_NAME[t]}
                    </option>
                  ))}
                </select>
                <label>
                  เป้า
                  <input type="number" min={1} max={500} value={m.target} onChange={(e) => setCustom(custom.map((x, j) => (j === i ? { ...x, target: Math.max(1, Math.min(500, Math.floor(Number(e.target.value) || 1))) } : x)))} />
                </label>
                <label>
                  เหรียญ
                  <input type="number" min={5} max={200} value={m.reward} onChange={(e) => setCustom(custom.map((x, j) => (j === i ? { ...x, reward: Math.max(5, Math.min(200, Math.floor(Number(e.target.value) || 5))) } : x)))} />
                </label>
                <button type="button" className="art-x" aria-label="ลบภารกิจ" onClick={() => setCustom(custom.filter((_, j) => j !== i))}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            <div className="ar-panel-btns">
              {custom.length < 5 && (
                <button type="button" className="ar-btn" onClick={() => setCustom([...custom, { type: 'correct', target: 5, reward: 15 }])}>
                  <Plus className="w-4 h-4" /> เพิ่มภารกิจ
                </button>
              )}
              {save.custom && (
                <button type="button" className="ar-btn ar-btn-ghost" onClick={() => setCustom(null)}>
                  <RotateCcw className="w-4 h-4" /> กลับไปสุ่มตามวัน
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
