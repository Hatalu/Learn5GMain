'use client';

/**
 * สร้างเกมด้วย AI: ครูเลือกเกม > ปรับวิชา/ชั้น/เนื้อหา (หรือใช้ชุดคำถาม) > คัดลอก prompt ไปให้ Gemini Canvas สร้างเกม
 * มีเกมตัวอย่างเล่นได้จริงในหน้า ใช้คำถามที่เลือกอยู่
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Check, ChevronRight, ClipboardCopy, Eye, EyeOff, ExternalLink, Library, Loader2, Search, Sparkles, UserRound, Wand2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { gsfx } from '@/lib/game-creator/gsound';
import { sanitizeQuiz } from '@/lib/game-creator/quiz';
import { mediaPrefix } from '@/lib/game-creator/prefix';
import type { SetMeta } from '@/lib/game-creator/setBank';
import { GRADES, LANGS, LEVELS, SUBJECTS, gradeLabel, subjectOf } from '@/lib/worksheet/options';
import { AI_GAMES, gameById, type Dim } from '@/lib/aigame/games';
import {
  ARTS,
  COUNT_OPTIONS,
  EXTRAS,
  EXTRA_MAX,
  FIXES,
  HEROES,
  LIVES,
  MODES,
  NOTE_MAX,
  PACES,
  TIMERS,
  buildGamePrompt,
  cleanGameRecipe,
  defaultGameRecipe,
  quizToItems,
  topicLabel,
  topicsFor,
  type GItem,
  type GameRecipe,
  type Source,
} from '@/lib/aigame/prompt';
import { SAMPLES } from '@/lib/aigame/samples';
import { copyNow } from '@/lib/utils/copyNow';
import { GameArt } from './GameArt';
import './aigame.css';

const GameDemo = dynamic(() => import('./GameDemo'), { ssr: false, loading: () => <div className="ag-demo-load"><Loader2 className="w-6 h-6 animate-spin" /></div> });

const GEMINI = 'https://gemini.google.com/app';
const BANK_SUBJECTS = new Set(['math', 'sci', 'eng', 'thai', 'social']);
const PAGE = 24;

interface PickedSet {
  id: string;
  title: string;
  items: GItem[];
  skipped: number;
}
interface MySet {
  id: string;
  title: string;
  question_count: number;
}

function Chip({ on, onClick, children, color }: { on: boolean; onClick: () => void; children: React.ReactNode; color?: string }) {
  return (
    <button type="button" className="ws-chip" aria-pressed={on} onClick={onClick} style={color ? ({ '--ws-on': color } as React.CSSProperties) : undefined}>
      {on && <Check className="w-4 h-4 shrink-0" strokeWidth={3.5} />}
      {children}
    </button>
  );
}

/** แถวตัวเลือกแบบเลือกได้ 1 อย่าง (มีคำอธิบายเล็กใต้ชื่อได้) */
function Pick<T extends string | number>({ label, list, value, onPick }: { label: string; list: readonly { id: T; th: string; sub?: string }[]; value: T; onPick: (v: T) => void }) {
  return (
    <div className="ag-optrow">
      <p className="ag-flabel">{label}</p>
      <div className="ag-chips">
        {list.map((o) => (
          <Chip key={o.id} on={value === o.id} onClick={() => onPick(o.id)}>
            {o.th}
            {o.sub && <small className="ag-csub">{o.sub}</small>}
          </Chip>
        ))}
      </div>
    </div>
  );
}

function Step({ n, title, children, hint }: { n: number; title: string; children: React.ReactNode; hint?: string }) {
  return (
    <section className="ag-step">
      <h3>
        <span className="ag-stepn">{n}</span> {title}
      </h3>
      {hint && <p className="ag-hint">{hint}</p>}
      {children}
    </section>
  );
}

export function AiGameBuilder() {
  const router = useRouter();
  const params = useSearchParams();
  const { user } = useAuth();
  const [r, setR] = useState<GameRecipe>(() => cleanGameRecipe({ ...defaultGameRecipe(), game: params.get('g') || undefined }));
  const set = useCallback((p: Partial<GameRecipe>) => setR((x) => cleanGameRecipe({ ...x, ...p })), []);
  const [dim, setDim] = useState<Dim | 'all'>('all');
  const game = gameById(r.game)!;
  const builderRef = useRef<HTMLDivElement>(null);

  // เปิดจากลิงก์ ?g= (เช่นจากหน้าแรก) ให้เลื่อนไปที่ส่วนปรับเกมเลย
  useEffect(() => {
    if (params.get('g')) setTimeout(() => builderRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const chooseGame = (id: string) => {
    gsfx.pick();
    set({ game: id });
    router.replace(`/ai-game?g=${id}`, { scroll: false });
    setTimeout(() => builderRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  };

  /* ---------- ชุดคำถาม ---------- */
  const [picked, setPicked] = useState<PickedSet | null>(null);
  const [loadingSet, setLoadingSet] = useState(false);
  const [bank, setBank] = useState<SetMeta[] | null>(null);
  const [bankQ, setBankQ] = useState('');
  const [bankN, setBankN] = useState(PAGE);
  const [mine, setMine] = useState<MySet[] | null>(null);
  const [mineErr, setMineErr] = useState('');

  const setSource = (s: Source) => {
    gsfx.tap();
    setPicked(null);
    set({ source: s });
  };

  useEffect(() => {
    if (r.source !== 'bank' || bank) return;
    import('@/lib/game-creator/setBank').then((m) => setBank(m.allSets()));
  }, [r.source, bank]);

  useEffect(() => {
    if (r.source !== 'mine' || !user || mine) return;
    createClient()
      .from('user_games')
      .select('id, title, question_count')
      .eq('owner_id', user.id)
      .order('updated_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) setMineErr('โหลดชุดคำถามไม่สำเร็จ ลองรีเฟรชหน้าอีกครั้ง');
        setMine((data || []) as MySet[]);
      });
  }, [r.source, user, mine]);

  // เปลี่ยนวิชา/ชั้นแล้ว ชุดจากคลังที่เลือกไว้อาจไม่ตรง: ล้างออก
  useEffect(() => {
    if (r.source === 'bank') setPicked(null);
    setBankN(PAGE);
  }, [r.s, r.g, r.source]);

  const bankList = useMemo(() => {
    if (!bank || !BANK_SUBJECTS.has(r.s)) return [];
    const q = bankQ.trim().toLowerCase();
    const subj = bank.filter((m) => m.subject === r.s);
    const fit = subj.filter((m) => r.g >= m.g && r.g <= (m.g2 || m.g));
    const base = fit.length ? fit : subj;
    return q ? base.filter((m) => (m.title + ' ' + m.note).toLowerCase().includes(q)) : base;
  }, [bank, r.s, r.g, bankQ]);

  const pickBank = async (m: SetMeta) => {
    gsfx.pick();
    setLoadingSet(true);
    const { buildSet } = await import('@/lib/game-creator/setBank');
    const s = buildSet(m.id);
    setLoadingSet(false);
    if (!s) return;
    takeSet(m.id, s.title, quizToItems(s.content));
  };

  // ชุดที่ไม่มีข้อใช้ได้เลย (รูปอย่างเดียว/โหลดไม่สำเร็จ) ไม่นับว่าเลือก: กันไม่ให้ prompt แอบเปลี่ยนเป็นให้ AI แต่งเอง
  const takeSet = (id: string, title: string, r: { items: GItem[]; skipped: number }) => {
    if (!r.items.length) {
      setPicked(null);
      setToast('ชุดนี้ไม่มีข้อที่ใช้ได้ (เป็นรูปอย่างเดียวหรือไม่มีคำตอบ) ลองเลือกชุดอื่นนะ');
      return;
    }
    setPicked({ id, title, ...r });
  };

  const pickMine = async (m: MySet) => {
    gsfx.pick();
    setLoadingSet(true);
    const { data, error } = await createClient().from('user_games').select('content').eq('id', m.id).eq('owner_id', user!.id).maybeSingle();
    setLoadingSet(false);
    if (error || !data) {
      setPicked(null);
      setToast('โหลดชุดคำถามไม่สำเร็จ ลองใหม่อีกครั้ง');
      return;
    }
    takeSet(m.id, m.title, quizToItems(sanitizeQuiz(data.content, mediaPrefix())));
  };

  /* ---------- prompt ---------- */
  const needSet = r.source !== 'ai' && !picked;
  const prompt = useMemo(() => (needSet ? '' : buildGamePrompt(r, picked ? { items: picked.items, setTitle: picked.title, skipped: picked.skipped } : {})), [r, picked, needSet]);
  const demoItems = picked?.items.length ? picked.items : SAMPLES[r.s];

  const [toast, setToast] = useState('');
  const [show, setShow] = useState(false);
  const [geminiLink, setGeminiLink] = useState(false);
  const promptRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 4200);
    return () => clearTimeout(t);
  }, [toast]);

  const copy = async (open: boolean) => {
    if (!prompt) return;
    gsfx.tap();
    // คัดลอกแบบทันทีก่อนเปิดแท็บใหม่ (แท็บใหม่แย่งโฟกัสแล้ว clipboard API จะไม่ยอม)
    if (copyNow(prompt)) {
      if (open) window.open(GEMINI, '_blank', 'noopener');
      gsfx.correct();
      setToast(open ? 'คัดลอกแล้ว ใน Gemini เลือก Canvas แล้วกด Ctrl+V (หรือแตะค้างแล้ววาง)' : 'คัดลอก prompt แล้ว');
      return;
    }
    try {
      await navigator.clipboard.writeText(prompt);
      gsfx.correct();
      setToast('คัดลอกแล้ว กดลิงก์ "เปิด Gemini" ใต้ปุ่มได้เลย');
      if (open) setGeminiLink(true);
    } catch {
      if (open) setGeminiLink(true);
      setShow(true);
      setTimeout(() => {
        promptRef.current?.focus();
        promptRef.current?.select();
      }, 50);
      setToast('คัดลอกอัตโนมัติไม่ได้ ข้อความถูกเลือกไว้แล้ว กดคัดลอกเองได้เลย');
    }
  };

  const copyText = async (text: string, ok: string) => {
    gsfx.tap();
    try {
      if (!copyNow(text)) await navigator.clipboard.writeText(text);
      gsfx.correct();
      setToast(ok);
    } catch {
      setToast('คัดลอกอัตโนมัติไม่ได้ ลองกดอีกครั้ง');
    }
  };

  const games = AI_GAMES.filter((g) => dim === 'all' || g.dim === dim);
  const subj = subjectOf(r.s);

  return (
    <div className="ag-page">
      {/* ---------- หัวหน้า ---------- */}
      <header className="ag-head">
        <span className="ag-badge">
          <Sparkles className="w-4 h-4" /> ระบบใหม่สำหรับคุณครู
        </span>
        <h1 className="font-display">สร้างเกมของตัวเองด้วย AI</h1>
        <p>เลือกเกมที่ชอบ ปรับเป็นวิชาและเนื้อหาของคุณครู แล้วคัดลอก prompt ไปให้ Gemini สร้างเกมที่เล่นได้จริง</p>
        <ol className="ag-flow">
          <li>
            <b>1</b> เลือกเกม
          </li>
          <li>
            <b>2</b> ปรับวิชา ชั้น เนื้อหา ลูกเล่น
          </li>
          <li>
            <b>3</b> คัดลอก prompt ไป Gemini Canvas
          </li>
        </ol>
      </header>

      {/* ---------- คลังเกม ---------- */}
      <section className="ag-gallery" aria-labelledby="ag-games">
        <div className="ag-row">
          <h2 id="ag-games" className="font-display">
            เลือกเกม <small>{AI_GAMES.length} เกม</small>
          </h2>
          <div className="ag-dims" role="group" aria-label="กรองตามมิติ">
            {(['all', '2D', '3D'] as const).map((d) => (
              <Chip key={d} on={dim === d} onClick={() => setDim(d)}>
                {d === 'all' ? 'ทั้งหมด' : d}
              </Chip>
            ))}
          </div>
        </div>
        <div className="ag-grid">
          {games.map((g) => (
            <button key={g.id} type="button" className="ag-gcard" data-on={g.id === r.game || undefined} style={{ ['--c' as string]: g.color }} onClick={() => chooseGame(g.id)}>
              <span className="ag-gart">
                <GameArt id={g.id} />
                <i className="ag-dim">{g.dim}</i>
                {g.id === r.game && (
                  <i className="ag-picked">
                    <Check className="w-3.5 h-3.5" strokeWidth={4} /> เลือกอยู่
                  </i>
                )}
              </span>
              <span className="ag-gbody">
                <b>{g.name}</b>
                <span>{g.pitch}</span>
                <small>{g.fit}</small>
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* ---------- ปรับเกม ---------- */}
      <div ref={builderRef} id="builder" className="ag-builder">
        <div className="ag-left">
          <div className="ag-demo-head">
            <span className="ag-dim ag-dim-inline">{game.dim}</span>
            <h2 className="font-display">{game.name}</h2>
            <span className="ag-tag">เกมตัวอย่าง เล่นได้เลย</span>
          </div>
          <GameDemo key={game.id} game={game.id} items={demoItems} />
          <p className="ag-note">
            {picked ? `ตัวอย่างใช้คำถามจากชุด "${picked.title}"` : `ตัวอย่างใช้คำถามตัวอย่างวิชา${subj.th}`} · เกมจริงที่ Gemini สร้างจะละเอียดกว่านี้{game.dim === '3D' ? ' และเป็น 3D ด้วย three.js' : ''}
          </p>
          <ol className="ag-how">
            {game.how.map((h, i) => (
              <li key={i}>
                <b>{i + 1}</b>
                {h}
              </li>
            ))}
          </ol>
        </div>

        <div className="ag-right">
          <Step n={1} title="วิชา">
            <div className="ag-chips">
              {SUBJECTS.map((s) => (
                <Chip key={s.id} on={r.s === s.id} color={s.color} onClick={() => set({ s: s.id, topic: topicsFor(s.id, r.g)[0]?.id ?? '' })}>
                  {s.th}
                </Chip>
              ))}
            </div>
          </Step>

          <Step n={2} title="ระดับชั้น">
            <div className="ag-chips ag-grades">
              {GRADES.map((g) => (
                <Chip key={g} on={r.g === g} onClick={() => set({ g, topic: topicsFor(r.s, g).some((t) => t.id === r.topic) ? r.topic : topicsFor(r.s, g)[0]?.id ?? '' })}>
                  {gradeLabel(g)}
                </Chip>
              ))}
            </div>
          </Step>

          <Step n={3} title="คำถามในเกม">
            <div className="ag-src" role="tablist" aria-label="แหล่งคำถาม">
              {(
                [
                  ['ai', 'ให้ AI แต่งคำถาม', Wand2],
                  ['bank', 'คลังชุดคำถามของเว็บ', Library],
                  ['mine', 'ชุดคำถามของฉัน', UserRound],
                ] as const
              ).map(([id, label, Icon]) => (
                <button key={id} type="button" role="tab" aria-selected={r.source === id} className="ag-srcbtn" onClick={() => setSource(id)}>
                  <Icon className="w-4 h-4" /> {label}
                </button>
              ))}
            </div>

            {r.source === 'ai' && (
              <div className="ag-sub">
                <p className="ag-flabel">เรื่อง</p>
                <div className="ag-chips">
                  {topicsFor(r.s, r.g).map((t) => (
                    <Chip key={t.id} on={!r.custom && r.topic === t.id} color={subj.color} onClick={() => set({ topic: t.id, custom: '' })}>
                      {t.th}
                    </Chip>
                  ))}
                </div>
                <input className="ag-input" value={r.custom} maxLength={60} placeholder="หรือพิมพ์เรื่องเอง เช่น การบวกเลขสองหลักมีทด" onChange={(e) => set({ custom: e.target.value })} />
                <div className="ag-two">
                  <div>
                    <p className="ag-flabel">จำนวนข้อ</p>
                    <div className="ag-chips">
                      {COUNT_OPTIONS.map((c) => (
                        <Chip key={c} on={r.count === c} onClick={() => set({ count: c })}>
                          {c} ข้อ
                        </Chip>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="ag-flabel">ความยาก</p>
                    <div className="ag-chips">
                      {LEVELS.map((l) => (
                        <Chip key={l.id} on={r.lv === l.id} onClick={() => set({ lv: l.id })}>
                          {l.th}
                        </Chip>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {r.source === 'bank' && (
              <div className="ag-sub">
                {!BANK_SUBJECTS.has(r.s) ? (
                  <p className="ag-empty-note">คลังของเว็บยังไม่มีวิชา{subj.th} ลองให้ AI แต่งคำถาม หรือใช้ชุดคำถามของคุณครูเอง</p>
                ) : !bank ? (
                  <p className="ag-empty-note">
                    <Loader2 className="w-4 h-4 animate-spin inline" /> กำลังโหลดคลัง...
                  </p>
                ) : (
                  <>
                    <label className="ag-search">
                      <Search className="w-4 h-4" />
                      <input value={bankQ} onChange={(e) => setBankQ(e.target.value)} placeholder={`ค้นหาชุด${subj.th} ${gradeLabel(r.g)}`} />
                    </label>
                    <div className="ag-sets">
                      {bankList.slice(0, bankN).map((m) => (
                        <button key={m.id} type="button" className="ag-set" data-on={picked?.id === m.id || undefined} onClick={() => pickBank(m)}>
                          <b>{m.title}</b>
                          <small>
                            {m.g2 && m.g2 !== m.g ? `${gradeLabel(m.g)}-${gradeLabel(m.g2)}` : gradeLabel(m.g)} · {m.count} ข้อ{m.level ? ` · ${LEVELS[m.level - 1].th}` : ''}
                          </small>
                          <span>{m.sample}</span>
                        </button>
                      ))}
                      {!bankList.length && <p className="ag-empty-note">ไม่พบชุดที่ตรงกับคำค้น</p>}
                    </div>
                    {bankList.length > bankN && (
                      <button type="button" className="ag-more" onClick={() => setBankN((n) => n + PAGE)}>
                        แสดงเพิ่ม ({bankList.length - bankN})
                      </button>
                    )}
                  </>
                )}
              </div>
            )}

            {r.source === 'mine' && (
              <div className="ag-sub">
                {!user ? (
                  <p className="ag-empty-note">
                    <Link href="/login?redirect=/ai-game" className="ag-link">
                      เข้าสู่ระบบ
                    </Link>{' '}
                    เพื่อใช้ชุดคำถามที่คุณครูสร้างไว้ในระบบสร้างเกม
                  </p>
                ) : !mine ? (
                  <p className="ag-empty-note">
                    <Loader2 className="w-4 h-4 animate-spin inline" /> กำลังโหลด...
                  </p>
                ) : mine.length === 0 ? (
                  <p className="ag-empty-note">
                    {mineErr || 'ยังไม่มีชุดคำถาม '}
                    {!mineErr && (
                      <Link href="/create" className="ag-link">
                        สร้างชุดคำถามแรก
                      </Link>
                    )}
                  </p>
                ) : (
                  <div className="ag-sets">
                    {mine.map((m) => (
                      <button key={m.id} type="button" className="ag-set" data-on={picked?.id === m.id || undefined} onClick={() => pickMine(m)}>
                        <b>{m.title || 'ไม่มีชื่อ'}</b>
                        <small>{m.question_count} ข้อ</small>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {r.source !== 'ai' && (loadingSet || picked) && (
              <p className="ag-pickedset" role="status">
                {loadingSet ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> กำลังเตรียมชุดคำถาม...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" strokeWidth={3.5} /> ใช้ชุด &quot;{picked!.title}&quot; {picked!.items.length} ข้อ
                    {picked!.skipped > 0 && <em> (ข้าม {picked!.skipped} ข้อที่เป็นรูปอย่างเดียว)</em>}
                  </>
                )}
              </p>
            )}
          </Step>

          <Step n={4} title="ลูกเล่นเกม" hint="ปรับให้เข้ากับห้องเรียนของคุณครู ค่าเริ่มต้นใช้ได้เลย">
            <Pick label="ความเร็วเกม" list={PACES} value={r.pace} onPick={(pace) => set({ pace })} />
            <div className="ag-two">
              {!game.noRead && <Pick label="เวลาต่อข้อ" list={TIMERS} value={r.timer} onPick={(timer) => set({ timer })} />}
              <Pick label="หัวใจ" list={LIVES} value={r.lives} onPick={(lives) => set({ lives: lives as GameRecipe['lives'] })} />
            </div>
            <Pick label="ผู้เล่น" list={MODES} value={r.mode} onPick={(mode) => set({ mode })} />
            <Pick label="สไตล์ภาพ" list={ARTS} value={r.art} onPick={(art) => set({ art })} />
            <Pick label="ตัวละครหลัก" list={HEROES} value={r.hero} onPick={(hero) => set({ hero })} />
            <div className="ag-optrow">
              <p className="ag-flabel">
                ลูกเล่นเสริม <small>เลือกได้ไม่เกิน {EXTRA_MAX} อย่าง ({r.extras.length}/{EXTRA_MAX}) · ยิ่งน้อย เกมยิ่งเสถียร</small>
              </p>
              <div className="ag-chips">
                {EXTRAS.map((x) => {
                  const on = r.extras.includes(x.id);
                  return (
                    <Chip
                      key={x.id}
                      on={on}
                      onClick={() => {
                        if (!on && r.extras.length >= EXTRA_MAX) return setToast(`เลือกลูกเล่นเสริมได้ไม่เกิน ${EXTRA_MAX} อย่าง เอาอันเดิมออกก่อนนะ`);
                        set({ extras: on ? r.extras.filter((e) => e !== x.id) : [...r.extras, x.id] });
                      }}
                    >
                      {x.th}
                    </Chip>
                  );
                })}
              </div>
            </div>
          </Step>

          <Step n={5} title="ภาษาในเกมและสิ่งที่อยากเพิ่ม" hint="ไม่บังคับ">
            <div className="ag-chips">
              {LANGS.map((l) => (
                <Chip key={l.id} on={r.lang === l.id} onClick={() => set({ lang: l.id })}>
                  {l.th}
                </Chip>
              ))}
            </div>
            <textarea className="ag-input ag-area" rows={2} maxLength={NOTE_MAX} value={r.note} placeholder="เช่น ให้ตัวละครเป็นช้างไทย, ใช้กับนักเรียนที่อ่านช้า, เพิ่มโหมดแข่งเป็นทีม" onChange={(e) => set({ note: e.target.value })} />
          </Step>

          {/* ---------- ผลลัพธ์ ---------- */}
          <section className="ag-out" aria-live="polite">
            <div className="ag-sum">
              <b>{game.name}</b>
              <span>
                {subj.th} · {gradeLabel(r.g)} · {r.source === 'ai' ? `${topicLabel(r)} · AI แต่ง ${r.count} ข้อ` : picked ? `ชุด "${picked.title}"` : 'ยังไม่ได้เลือกชุดคำถาม'}
              </span>
            </div>
            <button type="button" className="ag-go" disabled={!prompt} onClick={() => copy(true)}>
              <ClipboardCopy className="w-5 h-5" /> คัดลอก prompt แล้วเปิด Gemini
            </button>
            <div className="ag-outrow">
              <button type="button" className="ag-ghost" disabled={!prompt} onClick={() => copy(false)}>
                <ClipboardCopy className="w-4 h-4" /> คัดลอกอย่างเดียว
              </button>
              <button type="button" className="ag-ghost" disabled={!prompt} onClick={() => setShow((v) => !v)}>
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />} {show ? 'ซ่อน prompt' : 'ดู prompt'}
              </button>
            </div>
            {geminiLink && (
              <a href={GEMINI} target="_blank" rel="noopener noreferrer" className="ag-link ag-glink">
                เปิด Gemini <ExternalLink className="w-4 h-4" />
              </a>
            )}
            {needSet && <p className="ag-hint">เลือกชุดคำถามในขั้นที่ 3 ก่อน</p>}
            {show && prompt && <textarea ref={promptRef} className="ag-prompt" readOnly value={prompt} rows={14} />}
            <p className="ag-hint">prompt เป็นภาษาอังกฤษเพื่อให้ Gemini ทำตามได้แม่นที่สุด ส่วนข้อความในเกมจะเป็นภาษาที่เลือกในขั้นที่ 5</p>
            <ol className="ag-tips">
              <li>ใน Gemini เลือกเครื่องมือ Canvas ก่อนวาง prompt (เกมจะเปิดเล่นได้ในหน้าเดียวกัน)</li>
              <li>ได้เกมแล้วลองเล่นในหน้าตัวอย่างของ Canvas ถ้าต้องการให้นักเรียนเล่น ใช้ปุ่มแชร์ของ Gemini</li>
              <li>อยากปรับความเร็วเอง ให้แก้ตัวเลขใน CONFIG บนสุดของโค้ด (ตัวเลขมาก = ช้าลง) หรือใช้แถบความเร็วในเมนูหยุดพักของเกม</li>
            </ol>
            <div className="ag-fixes">
              <p className="ag-flabel">
                เกมที่ได้ยังมีปัญหา? <small>กดคัดลอกคำสั่งแก้ แล้ววางต่อในแชต Gemini เดิม</small>
              </p>
              <div className="ag-chips">
                {FIXES.map((f) => (
                  <button key={f.id} type="button" className="ws-chip" onClick={() => copyText(f.en, `คัดลอกคำสั่ง "${f.th}" แล้ว วางต่อในแชต Gemini เดิมได้เลย`)}>
                    <ClipboardCopy className="w-4 h-4 shrink-0" /> {f.th}
                  </button>
                ))}
              </div>
            </div>
            <p className="ag-hint">
              อยากเปิดเป็นห้องเกมเล่นสดทั้งห้องแทน?{' '}
              <Link href="/create" className="ag-link">
                ใช้ระบบสร้างชุดคำถาม <ChevronRight className="w-3.5 h-3.5 inline" />
              </Link>
            </p>
          </section>
        </div>
      </div>

      {toast && (
        <div className="ag-toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
