'use client';

/** สรุปผลด่าน: คะแนนความรู้/การเล่น/ทีม ถูก-ผิด เวลา ภารกิจ รายบุคคล รายทีม (ตัวเลขจากเกมจริงทั้งหมด) */
import React from 'react';
import { ChevronRight, Coins, Flag, LogOut, Map as MapIcon, RotateCcw, Star, Trophy } from 'lucide-react';
import { Confetti } from '../../live/PlayerSession';
import { gsfx } from '@/lib/game-creator/gsound';
import { ranks } from '@/lib/game-creator/ar/teams';

export interface TeamStat {
  know: number;
  play: number;
  correct: number;
  wrong: number;
  first: number;
  perfect: number;
  helps: number;
  dodge: number;
  hits: number;
  meteors: number;
  bossDmg: number;
  bestAnswer: number;
  bestShoot: number;
  supers: number;
  powers: number;
}
export const emptyTeamStat = (): TeamStat => ({ know: 0, play: 0, correct: 0, wrong: 0, first: 0, perfect: 0, helps: 0, dodge: 0, hits: 0, meteors: 0, bossDmg: 0, bestAnswer: 0, bestShoot: 0, supers: 0, powers: 0 });

export interface MemberStat {
  team: number;
  member: number;
  know: number;
  play: number;
  correct: number;
  wrong: number;
  turns: number;
}

export interface RunResult {
  teams: { name: string; color: string; s: TeamStat }[];
  members: MemberStat[];
  total: number;
  playMs: number;
  quests: { text: string; ok: boolean }[];
  dailyDone: number;
  boss: { name: string; defeated: boolean; left: number } | null;
  coins: number;
  stars: number;
  stageName: string;
  /** null = ทดลองเล่นในหน้าแก้ไข (ไม่บันทึก) */
  saved: boolean | null;
}

const fmtTime = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`;

export function ArResult({ r, onNext, onAgain, onMap, onExit }: { r: RunResult; onNext: (() => void) | null; onAgain: () => void; onMap: () => void; onExit: () => void }) {
  const multi = r.teams.length > 1;
  const rk = ranks(r.teams.map((t) => t.s.know + t.s.play));
  const top = rk[0];
  const tie = multi && rk.length > 1 && rk[1].score === top.score;
  const questsOk = r.quests.filter((q) => q.ok).length;
  return (
    <div className="ar-panel-wrap" onPointerDown={(e) => e.stopPropagation()}>
      {r.stars > 0 && <Confetti />}
      <div className="ar-panel ar-result arr">
        <p className="ar-kicker">
          <Trophy className="w-5 h-5" /> {r.stageName}
        </p>
        <span className="ar-stars">
          {[0, 1, 2].map((i) => (
            <Star key={i} className="w-9 h-9" data-on={i < r.stars} strokeWidth={2.5} />
          ))}
        </span>
        {multi && <h2 className="ar-winner">{tie ? 'เสมอกัน!' : `${r.teams[top.team].name} ชนะ!`}</h2>}
        {r.boss && <p className="arr-boss">{r.boss.defeated ? `ล้ม ${r.boss.name} สำเร็จ!` : `${r.boss.name} หนีไปได้ (พลังเหลือ ${r.boss.left}%)`}</p>}

        <div className="arr-teams">
          {rk.map(({ team, rank }) => {
            const t = r.teams[team];
            const s = t.s;
            return (
              <div key={team} className="ar-result-col" data-win={multi && rank === 1 && !tie} style={{ ['--tc' as string]: t.color }}>
                {multi && (
                  <em>
                    อันดับ {rank} · {t.name}
                  </em>
                )}
                <b className="ar-result-total">{(s.know + s.play).toLocaleString('th-TH')}</b>
                <dl>
                  <dt>คะแนนความรู้</dt>
                  <dd>{s.know.toLocaleString('th-TH')}</dd>
                  <dt>คะแนนการเล่น</dt>
                  <dd>{s.play.toLocaleString('th-TH')}</dd>
                  <dt>ตอบถูก / ผิด</dt>
                  <dd>
                    {s.correct} / {s.wrong}
                  </dd>
                  <dt>ถูกตั้งแต่ครั้งแรก</dt>
                  <dd>{s.first} ข้อ</dd>
                  <dt>คอมโบตอบ / ยิง สูงสุด</dt>
                  <dd>
                    x{s.bestAnswer} / x{s.bestShoot}
                  </dd>
                  <dt>Perfect / Super</dt>
                  <dd>
                    {s.perfect} / {s.supers}
                  </dd>
                  <dt>ยิงอุกกาบาต / ดาเมจบอส</dt>
                  <dd>
                    {s.meteors} / {s.bossDmg}
                  </dd>
                  <dt>หลบได้ / โดนโจมตี</dt>
                  <dd>
                    {s.dodge} / {s.hits}
                  </dd>
                  <dt>ไอเทมที่ได้ / ช่วยเพื่อน</dt>
                  <dd>
                    {s.powers} / {s.helps}
                  </dd>
                </dl>
              </div>
            );
          })}
        </div>

        {r.members.length > 1 && (
          <div className="arr-members">
            <p className="art-label">ผลรายบุคคล (ตามลำดับผู้ควบคุมยาน)</p>
            <table>
              <thead>
                <tr>
                  <th>ผู้เล่น</th>
                  <th>ตา</th>
                  <th>ถูก</th>
                  <th>ผิด</th>
                  <th>ความรู้</th>
                  <th>การเล่น</th>
                </tr>
              </thead>
              <tbody>
                {r.members.map((m) => (
                  <tr key={`${m.team}-${m.member}`} style={{ ['--tc' as string]: r.teams[m.team]?.color }}>
                    <td>
                      <i className="arr-dot" /> {multi ? `${r.teams[m.team]?.name} ` : ''}คนที่ {m.member + 1}
                    </td>
                    <td>{m.turns}</td>
                    <td>{m.correct}</td>
                    <td>{m.wrong}</td>
                    <td>{m.know}</td>
                    <td>{m.play}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="arr-quests">
          <p className="art-label">
            <Flag className="w-4 h-4" /> ภารกิจสำเร็จ {questsOk + r.dailyDone} ภารกิจ
          </p>
          {r.quests.map((q, i) => (
            <span key={i} data-ok={q.ok}>
              {q.text}
            </span>
          ))}
          {r.dailyDone > 0 && <span data-ok="true">ภารกิจประจำวันสำเร็จเพิ่ม {r.dailyDone} (รับรางวัลที่แท็บภารกิจ)</span>}
        </div>

        <p className="ar-result-time">
          เวลาเล่น {fmtTime(r.playMs)} นาที · {r.total} ข้อ · <Coins className="w-4 h-4 inline" /> +{r.coins} เหรียญ {r.saved === null ? '(ทดลองเล่น ไม่บันทึก)' : r.saved ? '(บันทึกในเครื่องนี้)' : '(เครื่องนี้บันทึกไม่ได้)'}
        </p>
        <div className="ar-panel-btns">
          {onNext && (
            <button type="button" className="ar-btn ar-btn-go" onClick={() => (gsfx.start(), onNext())}>
              ด่านต่อไป <ChevronRight className="w-5 h-5" />
            </button>
          )}
          <button type="button" className={onNext ? 'ar-btn' : 'ar-btn ar-btn-go'} onClick={() => (gsfx.start(), onAgain())}>
            <RotateCcw className="w-5 h-5" /> เล่นอีกครั้ง
          </button>
          <button type="button" className="ar-btn" onClick={() => (gsfx.tap(), onMap())}>
            <MapIcon className="w-5 h-5" /> แผนที่
          </button>
          <button type="button" className="ar-btn ar-btn-ghost" onClick={onExit}>
            <LogOut className="w-5 h-5" /> ออก
          </button>
        </div>
      </div>
    </div>
  );
}
