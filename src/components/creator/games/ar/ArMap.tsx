'use client';

/**
 * หน้าจอระหว่างด่านของสงครามอวกาศ AR: แผนที่จักรวาล / อัปเกรดยาน / ภารกิจ
 * ทุกตัวเลขมาจากข้อมูลที่เก็บในเครื่อง (save.ts) ไม่มีค่าสมมติ
 */
import React, { useState } from 'react';
import { Check, Coins, Flag, Lock, LogOut, Map as MapIcon, Play, Rocket, Settings2, Star, Target, Wrench } from 'lucide-react';
import { gsfx } from '@/lib/game-creator/gsound';
import { PLANETS, stageById, unlocked } from '@/lib/game-creator/ar/map';
import { bossById } from '@/lib/game-creator/ar/boss';
import { UPGRADES, UP_MAX, upCost } from '@/lib/game-creator/ar/upgrades';
import { ACHIEVEMENTS, dailyFor, done, M_TEXT, progress, stageQuests } from '@/lib/game-creator/ar/missions';
import type { ArSave } from '@/lib/game-creator/ar/save';
import { AR_LEVELS } from '@/lib/game-creator/arSettings';

type Tab = 'map' | 'ship' | 'mission';

function StarRow({ n }: { n: number }) {
  return (
    <span className="arm-stars">
      {[0, 1, 2].map((i) => (
        <Star key={i} className="w-3.5 h-3.5" data-on={i < n} strokeWidth={3} />
      ))}
    </span>
  );
}

export function ArMap({
  save,
  onSave,
  stageId,
  onPick,
  onPlay,
  onTeacher,
  onExit,
  setTitle,
  level,
  boss,
  teams,
}: {
  save: ArSave;
  onSave: (s: ArSave) => void;
  stageId: string;
  onPick: (id: string) => void;
  onPlay: () => void;
  onTeacher: () => void;
  onExit: () => void;
  /** ชื่อชุดคำถามที่ครูผูกกับด่าน (ไม่มี = ชุดที่เปิดเกมมา) */
  setTitle: (stageId: string) => string;
  /** ความยากที่ครูบังคับ (3 = ตามด่าน) */
  level: number;
  boss: string;
  teams: number;
}) {
  const [tab, setTab] = useState<Tab>('map');
  const stage = stageById(stageId);
  const lv = level === 3 ? stage.level : level;
  const bossDef = bossById(boss === 'auto' ? stage.boss : boss);
  const daily = dailyFor(save.day, save.custom);
  const claimable = daily.filter((m, i) => done(m, save.today) && !save.claimed.includes(i)).length + ACHIEVEMENTS.filter((a) => done(a, save.total) && !save.ach.includes(a.id)).length;

  const buy = (id: (typeof UPGRADES)[number]['id']) => {
    const lvl = save.ups[id];
    const cost = upCost(lvl);
    if (lvl >= UP_MAX || save.coins < cost) return gsfx.wrong();
    gsfx.cash();
    onSave({ ...save, coins: save.coins - cost, ups: { ...save.ups, [id]: lvl + 1 } });
  };
  const claimDaily = (i: number) => {
    const m = daily[i];
    if (!m || !done(m, save.today) || save.claimed.includes(i)) return;
    gsfx.coin();
    onSave({ ...save, coins: save.coins + m.reward, claimed: [...save.claimed, i] });
  };
  const claimAch = (id: string) => {
    const a = ACHIEVEMENTS.find((x) => x.id === id);
    if (!a || !done(a, save.total) || save.ach.includes(id)) return;
    gsfx.coin();
    onSave({ ...save, coins: save.coins + a.reward, ach: [...save.ach, id] });
  };

  return (
    <div className="ar-panel-wrap arm-wrap" onPointerDown={(e) => e.stopPropagation()}>
      <div className="arm">
        <div className="arm-top">
          <div className="arm-tabs" role="tablist">
            {(
              [
                ['map', 'แผนที่', MapIcon],
                ['ship', 'อัปเกรดยาน', Wrench],
                ['mission', 'ภารกิจ', Target],
              ] as const
            ).map(([id, name, Icon]) => (
              <button key={id} type="button" role="tab" aria-selected={tab === id} data-on={tab === id} onClick={() => (gsfx.tap(), setTab(id))}>
                <Icon className="w-4 h-4" /> {name}
                {id === 'mission' && claimable > 0 && <i className="arm-dot">{claimable}</i>}
              </button>
            ))}
          </div>
          <span className="arm-coins" title="เหรียญสะสมในเครื่องนี้">
            <Coins className="w-5 h-5" /> {save.coins.toLocaleString('th-TH')}
          </span>
        </div>

        {tab === 'map' && (
          <>
            <div className="arm-planets">
              {PLANETS.map((p, pi) => (
                <div key={p.id} className="arm-planet" style={{ ['--pc' as string]: p.color }}>
                  <div className="arm-ball" data-ring={p.ring} aria-hidden="true">
                    <i />
                  </div>
                  <b>
                    {pi + 1}. {p.name}
                  </b>
                  <div className="arm-stages">
                    {p.stages.map((s, si) => {
                      const open = unlocked(save.stars, s.id, save.openAll);
                      return (
                        <button key={s.id} type="button" className="arm-stage" data-on={s.id === stageId} disabled={!open} onClick={() => (gsfx.pick(), onPick(s.id))}>
                          {open ? <span>{si + 1}</span> : <Lock className="w-4 h-4" />}
                          <StarRow n={save.stars[s.id] || 0} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="arm-detail" style={{ ['--pc' as string]: PLANETS.find((p) => p.stages.includes(stage))?.color }}>
              <div>
                <b>{stage.name}</b>
                <span>
                  ความยาก {AR_LEVELS[lv]} · บอส {bossDef.name}
                </span>
                <span>ชุดคำถาม: {setTitle(stage.id)}</span>
                <ul>
                  {stageQuests(teams, true).map((q, i) => (
                    <li key={i}>
                      <Flag className="w-3.5 h-3.5" /> {q.text}
                      {q.coop && <em>ร่วมมือ</em>}
                    </li>
                  ))}
                </ul>
              </div>
              <button type="button" className="ar-btn ar-btn-go" onClick={() => (gsfx.start(), onPlay())}>
                <Play className="w-5 h-5" /> เริ่มด่านนี้
              </button>
            </div>
          </>
        )}

        {tab === 'ship' && (
          <div className="arm-ups">
            {UPGRADES.map((u) => {
              const lvl = save.ups[u.id];
              const cost = upCost(lvl);
              const max = lvl >= UP_MAX;
              return (
                <div key={u.id} className="arm-up" style={{ ['--uc' as string]: u.color }}>
                  <div className="arm-up-ic">
                    <Rocket className="w-6 h-6" />
                  </div>
                  <div className="arm-up-txt">
                    <b>{u.name}</b>
                    <small>{u.desc}</small>
                    <span className="arm-pips">
                      {Array.from({ length: UP_MAX }, (_, i) => (
                        <i key={i} data-on={i < lvl} />
                      ))}
                    </span>
                  </div>
                  <button type="button" className="ar-btn arm-buy" disabled={max || save.coins < cost} onClick={() => buy(u.id)}>
                    {max ? (
                      'เต็มแล้ว'
                    ) : (
                      <>
                        <Coins className="w-4 h-4" /> {cost}
                      </>
                    )}
                  </button>
                </div>
              );
            })}
            <p className="arm-note">เหรียญได้จากคะแนนที่ทำได้จริง ชนะบอส และรับรางวัลภารกิจ (เก็บในเครื่องนี้ ไม่มีขาย)</p>
          </div>
        )}

        {tab === 'mission' && (
          <div className="arm-missions">
            <h3>ภารกิจวันนี้ {save.custom ? '(ครูตั้ง)' : ''}</h3>
            {daily.map((m, i) => {
              const ok = done(m, save.today);
              const got = save.claimed.includes(i);
              return (
                <div key={i} className="arm-m" data-done={ok}>
                  <div>
                    <b>{M_TEXT[m.type](m.target)}</b>
                    <span className="arm-bar">
                      <i style={{ width: `${(progress(m, save.today) / m.target) * 100}%` }} />
                    </span>
                    <small>
                      {progress(m, save.today)}/{m.target}
                    </small>
                  </div>
                  <button type="button" className="ar-btn arm-buy" disabled={!ok || got} onClick={() => claimDaily(i)}>
                    {got ? <Check className="w-4 h-4" /> : <Coins className="w-4 h-4" />} {got ? 'รับแล้ว' : `+${m.reward}`}
                  </button>
                </div>
              );
            })}
            <h3>ภารกิจสะสม</h3>
            {ACHIEVEMENTS.map((a) => {
              const ok = done(a, save.total);
              const got = save.ach.includes(a.id);
              return (
                <div key={a.id} className="arm-m" data-done={ok}>
                  <div>
                    <b>{M_TEXT[a.type](a.target)}</b>
                    <span className="arm-bar">
                      <i style={{ width: `${(progress(a, save.total) / a.target) * 100}%` }} />
                    </span>
                    <small>
                      {progress(a, save.total)}/{a.target}
                    </small>
                  </div>
                  <button type="button" className="ar-btn arm-buy" disabled={!ok || got} onClick={() => claimAch(a.id)}>
                    {got ? <Check className="w-4 h-4" /> : <Coins className="w-4 h-4" />} {got ? 'รับแล้ว' : `+${a.reward}`}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div className="ar-panel-btns">
          <button type="button" className="ar-btn" onClick={() => (gsfx.tap(), onTeacher())}>
            <Settings2 className="w-5 h-5" /> แผงครู
          </button>
          <button type="button" className="ar-btn ar-btn-ghost" onClick={onExit}>
            <LogOut className="w-5 h-5" /> ออก
          </button>
        </div>
      </div>
    </div>
  );
}
