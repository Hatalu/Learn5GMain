'use client';

/**
 * คลังเกม 3D: ครูเลือกเกม > เลือกวิชา/ชั้น/เนื้อหา (หรือแก้คำถามเอง) > ลองเล่นในหน้า > บันทึกเป็นไฟล์เกม HTML ไปเปิดในห้องเรียน
 * ตัวอย่างในหน้าคือไฟล์เดียวกับที่บันทึก (iframe srcdoc) จึงเห็นผลตรงกันทุกตัวเลือก
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Check, Download, Expand, Library, Loader2, RotateCcw, Search, Sparkles, UserRound } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { sanitizeQuiz } from '@/lib/game-creator/quiz';
import { mediaPrefix } from '@/lib/game-creator/prefix';
import type { SetMeta } from '@/lib/game-creator/setBank';
import { GRADES, LANGS, LEVELS, SUBJECTS, gradeLabel, subjectOf } from '@/lib/aigame/options';
import { ACTS, AI_GAMES, actOf, gameById, type Act } from '@/lib/aigame/games';
import { AIMS, COUNT_OPTIONS, GFXS, LIVES, MOODS, PACES, TEAMS, TIMERS, cleanGameRecipe, defaultGameRecipe, quizToItems, topicLabel, topicsFor, type GItem, type GameRecipe, type Source } from '@/lib/aigame/recipe';
import { actItems, pickItems } from '@/lib/aigame/demoContent';
import { buildGameHtml, threeToScript } from '@/lib/aigame/build';
import { TEXT_HELP, TEXT_MAX, itemsToText, textToItems } from '@/lib/aigame/text';
import './aigame.css';

const BANK_SUBJECTS = new Set(['math', 'sci', 'eng', 'thai', 'social']);
const PAGE = 24;
/** จำนวนข้อสูงสุดที่ฝังในไฟล์เกม (ยิ่งมาก แต่ละรอบยิ่งไม่ซ้ำ) */
const POOL = 80;

/** three.js แบบสคริปต์ธรรมดา (โหลดครั้งเดียวต่อการเปิดหน้า) */
let threeCache: Promise<string> | null = null;
const loadThree = () =>
  (threeCache ??= fetch('/vendor/three.module.min.js')
    .then((r) => {
      if (!r.ok) throw new Error('three ' + r.status);
      return r.text();
    })
    .then(threeToScript)
    .catch((e) => {
      threeCache = null;
      throw e;
    }));

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

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" className="gl-chip" aria-pressed={on} onClick={onClick}>
      {on && <Check className="w-4 h-4 shrink-0" strokeWidth={3} />}
      {children}
    </button>
  );
}

function Row<T extends string | number>({ label, list, value, onPick }: { label: string; list: readonly { id: T; th: string; sub?: string }[]; value: T; onPick: (v: T) => void }) {
  return (
    <div className="gl-row">
      <p className="gl-label">{label}</p>
      <div className="gl-chips">
        {list.map((o) => (
          <Chip key={o.id} on={value === o.id} onClick={() => onPick(o.id)}>
            {o.th}
            {o.sub && <small>{o.sub}</small>}
          </Chip>
        ))}
      </div>
    </div>
  );
}

const fileName = (s: string) => s.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60) || 'game';

export function GameLibrary() {
  const router = useRouter();
  const params = useSearchParams();
  const { user } = useAuth();
  const [r, setR] = useState<GameRecipe>(() => cleanGameRecipe({ ...defaultGameRecipe(), game: params.get('g') || undefined }));
  const set = useCallback((p: Partial<GameRecipe>) => setR((x) => cleanGameRecipe({ ...x, ...p })), []);
  const [actF, setActF] = useState<Act | 'all'>('all');
  const game = gameById(r.game)!;
  const act = actOf(game.act);
  const builderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (params.get('g')) setTimeout(() => builderRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const chooseGame = (id: string) => {
    if (gameById(id)?.act !== game.act) {
      setPicked(null);
      setEdited(null);
    }
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
  const [toast, setToast] = useState('');

  const setSource = (s: Source) => {
    setPicked(null);
    setEdited(null);
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

  const takeSet = (id: string, title: string, res: { items: GItem[]; skipped: number }) => {
    if (!res.items.length) {
      setPicked(null);
      setToast('ชุดนี้ไม่มีข้อที่ใช้ได้ (เป็นรูปอย่างเดียวหรือพิมพ์ตอบ) ลองเลือกชุดอื่นนะ');
      return;
    }
    setEdited(null);
    setPicked({ id, title, ...res });
  };

  const pickBank = async (m: SetMeta) => {
    setLoadingSet(true);
    const { buildSet } = await import('@/lib/game-creator/setBank');
    const s = buildSet(m.id);
    setLoadingSet(false);
    if (s) takeSet(m.id, s.title, quizToItems(s.content));
  };

  const pickMine = async (m: MySet) => {
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

  /* ---------- เนื้อหาของเกม ---------- */
  const contentKey = [r.s, r.g, r.topic, r.custom, r.lv, game.act].join('|');
  const [bankItems, setBankItems] = useState<{ key: string; items: GItem[] } | null>(null);
  useEffect(() => {
    if (game.act !== 'pick' || picked) return;
    let live = true;
    const t = setTimeout(() => pickItems(r).then((items) => live && setBankItems({ key: contentKey, items })), 200);
    return () => {
      live = false;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentKey, picked]);

  const baseItems = useMemo<GItem[] | null>(() => {
    if (game.act !== 'pick') return actItems(r, game.act);
    if (picked) return picked.items;
    if (r.source !== 'auto') return null;
    return bankItems?.key === contentKey ? bankItems.items : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.act, contentKey, picked, bankItems, r.source]);

  // ครูแก้ข้อความเอง: ใช้ข้อความนั้นแทนจนกว่าจะกดใช้เนื้อหาจากระบบ (เปลี่ยนวิชา/ชั้น/เรื่อง/แหล่ง = ล้างที่แก้)
  const [edited, setEdited] = useState<string | null>(null);
  useEffect(() => setEdited(null), [contentKey]);
  const autoText = useMemo(() => (baseItems ? itemsToText(game.act, baseItems.slice(0, POOL)) : ''), [baseItems, game.act]);
  const parsed = useMemo(() => (edited !== null ? textToItems(game.act, edited) : null), [edited, game.act]);
  const items = useMemo(() => {
    // ทั้งคลังเข้าไฟล์เกม แต่ละรอบเกมสุ่มเล่น r.count ข้อ (CONFIG.perGame)
    return (parsed ? parsed.items : baseItems || []).slice(0, POOL);
  }, [parsed, baseItems]);

  /* ---------- ไฟล์เกม ---------- */
  const topic = picked && game.act === 'pick' ? picked.title : `${subjectOf(r.s).th} ${gradeLabel(r.g)} · ${topicLabel(r)}`;
  const [three, setThree] = useState<string | null>(null);
  const [threeErr, setThreeErr] = useState(false);
  useEffect(() => {
    loadThree()
      .then(setThree)
      .catch(() => setThreeErr(true));
  }, []);
  const html = useMemo(() => (three && items.length ? buildGameHtml({ recipe: r, items, topic, three }) : ''), [three, items, r, topic]);
  // หน่วงการรีโหลดตัวอย่าง ไม่ให้กระพริบตอนกดตัวเลือกติดกัน
  const [preview, setPreview] = useState({ html: '', n: 0 });
  useEffect(() => {
    const t = setTimeout(() => setPreview((p) => ({ html: three && items.length ? buildGameHtml({ recipe: r, items, topic, three, preview: true }) : '', n: p.n + 1 })), 350);
    return () => clearTimeout(t);
  }, [html]);
  const frameRef = useRef<HTMLIFrameElement>(null);

  const save = () => {
    if (!html) return;
    const a = document.createElement('a');
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
    a.href = url;
    a.download = fileName(`${game.name} - ${topic}`) + '.html';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    setToast('บันทึกไฟล์เกมแล้ว ดับเบิลคลิกไฟล์เพื่อเปิดเล่นด้วย Chrome หรือ Edge ได้เลย ไม่ต้องต่ออินเทอร์เน็ต');
  };
  const full = () => frameRef.current?.requestFullscreen?.().catch(() => {});

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const games = AI_GAMES.filter((g) => actF === 'all' || g.act === actF);
  const subj = subjectOf(r.s);
  const needSet = game.act === 'pick' && r.source !== 'auto' && !picked && edited === null;

  return (
    <div className="gl-page">
      <header className="gl-head">
        <span className="gl-badge">
          <Sparkles className="w-4 h-4" /> เกม 3D {AI_GAMES.length} เกม
        </span>
        <h1 className="font-display">คลังเกม</h1>
        <p>เลือกเกม ใส่วิชาและเนื้อหาของคุณครู ลองเล่นได้ทันที แล้วบันทึกเป็นไฟล์เกมไปเปิดบนจอห้องเรียน ไม่ต้องต่ออินเทอร์เน็ต</p>
        <ol className="gl-flow">
          <li>
            <b>1</b> เลือกเกม
          </li>
          <li>
            <b>2</b> ใส่เนื้อหา
          </li>
          <li>
            <b>3</b> บันทึกไฟล์ไปใช้สอน
          </li>
        </ol>
      </header>

      <section className="gl-gallery" aria-labelledby="gl-games">
        <div className="gl-acts" role="group" aria-label="สิ่งที่เด็กได้ฝึก">
          <h2 id="gl-games" className="sr-only">
            เลือกเกม
          </h2>
          <Chip on={actF === 'all'} onClick={() => setActF('all')}>
            ทุกเกม
          </Chip>
          {ACTS.map((a) => (
            <Chip key={a.id} on={actF === a.id} onClick={() => setActF(a.id)}>
              {a.th}
            </Chip>
          ))}
        </div>
        <div className="gl-grid">
          {games.map((g) => (
            <button key={g.id} type="button" className="gl-card" data-on={g.id === r.game || undefined} style={{ ['--c' as string]: g.color }} onClick={() => chooseGame(g.id)}>
              <span className="gl-thumb">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/aigame/${g.id}.webp`} alt="" width={480} height={300} loading="lazy" />
                <i className="gl-act" data-act={g.act}>
                  {actOf(g.act).th}
                </i>
                {g.skill && <i className="gl-skill">เกมทักษะ</i>}
                {g.id === r.game && (
                  <i className="gl-picked">
                    <Check className="w-3.5 h-3.5" strokeWidth={4} /> เลือกอยู่
                  </i>
                )}
              </span>
              <span className="gl-body">
                <b>{g.name}</b>
                <span>{g.pitch}</span>
                <small>{g.fit}</small>
              </span>
            </button>
          ))}
        </div>
      </section>

      <div ref={builderRef} id="builder" className="gl-builder">
        <div className="gl-left">
          <div className="gl-demo-head">
            <h2 className="font-display">{game.name}</h2>
            <button type="button" className="gl-ghost" onClick={full} disabled={!preview.html}>
              <Expand className="w-4 h-4" /> เต็มจอ
            </button>
          </div>
          <div className="gl-stage">
            {preview.html ? (
              <iframe ref={frameRef} key={preview.n} title={game.name} srcDoc={preview.html} sandbox="allow-scripts" allow="fullscreen" />
            ) : (
              <div className="gl-wait">
                {threeErr ? (
                  'โหลดตัวเกมไม่สำเร็จ ลองรีเฟรชหน้า'
                ) : needSet ? (
                  'เลือกชุดคำถามทางขวาก่อน'
                ) : (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" /> กำลังเตรียมเกม
                  </>
                )}
              </div>
            )}
          </div>
          <ol className="gl-how">
            {(r.aim && game.aim ? [game.how[0], game.aim, game.how[2]] : game.how).map((h, i) => (
              <li key={i}>
                <b>{i + 1}</b>
                {h}
              </li>
            ))}
          </ol>
        </div>

        <div className="gl-right">
          <section className="gl-step">
            <h3>
              <span>1</span> วิชาและชั้น
            </h3>
            <div className="gl-chips">
              {SUBJECTS.map((s) => (
                <Chip key={s.id} on={r.s === s.id} onClick={() => set({ s: s.id, topic: topicsFor(s.id, r.g)[0]?.id ?? '' })}>
                  {s.th}
                </Chip>
              ))}
            </div>
            <div className="gl-chips gl-grades">
              {GRADES.map((g) => (
                <Chip key={g} on={r.g === g} onClick={() => set({ g, topic: topicsFor(r.s, g).some((t) => t.id === r.topic) ? r.topic : topicsFor(r.s, g)[0]?.id ?? '' })}>
                  {gradeLabel(g)}
                </Chip>
              ))}
            </div>
          </section>

          <section className="gl-step">
            <h3>
              <span>2</span> เนื้อหาในเกม
            </h3>
            {game.act === 'pick' && (
              <div className="gl-src" role="tablist" aria-label="แหล่งคำถาม">
                {(
                  [
                    ['auto', 'ตามเรื่องที่เลือก', Sparkles],
                    ['bank', 'คลังชุดคำถาม', Library],
                    ['mine', 'ชุดคำถามของฉัน', UserRound],
                  ] as const
                ).map(([id, label, Icon]) => (
                  <button key={id} type="button" role="tab" aria-selected={r.source === id} className="gl-srcbtn" onClick={() => setSource(id)}>
                    <Icon className="w-4 h-4" /> {label}
                  </button>
                ))}
              </div>
            )}

            {(r.source === 'auto' || game.act !== 'pick') && (
              <>
                <p className="gl-label">เรื่อง</p>
                <div className="gl-chips">
                  {topicsFor(r.s, r.g).map((t) => (
                    <Chip key={t.id} on={r.topic === t.id} onClick={() => set({ topic: t.id, custom: '' })}>
                      {t.th}
                    </Chip>
                  ))}
                </div>
                <Row label="ความยาก" list={LEVELS} value={r.lv} onPick={(lv) => set({ lv })} />
              </>
            )}

            {r.source === 'bank' && game.act === 'pick' && (
              <div className="gl-sub">
                {!BANK_SUBJECTS.has(r.s) ? (
                  <p className="gl-note">คลังยังไม่มีวิชา{subj.th} ลองใช้เนื้อหาตามเรื่อง หรือพิมพ์คำถามเองด้านล่าง</p>
                ) : !bank ? (
                  <p className="gl-note">
                    <Loader2 className="w-4 h-4 animate-spin inline" /> กำลังโหลดคลัง...
                  </p>
                ) : (
                  <>
                    <label className="gl-search">
                      <Search className="w-4 h-4" />
                      <input value={bankQ} onChange={(e) => setBankQ(e.target.value)} placeholder={`ค้นหาชุด${subj.th} ${gradeLabel(r.g)}`} />
                    </label>
                    <div className="gl-sets">
                      {bankList.slice(0, bankN).map((m) => (
                        <button key={m.id} type="button" className="gl-set" data-on={picked?.id === m.id || undefined} onClick={() => pickBank(m)}>
                          <b>{m.title}</b>
                          <small>
                            {m.g2 && m.g2 !== m.g ? `${gradeLabel(m.g)}-${gradeLabel(m.g2)}` : gradeLabel(m.g)} · {m.count} ข้อ
                          </small>
                        </button>
                      ))}
                      {!bankList.length && <p className="gl-note">ไม่พบชุดที่ตรงกับคำค้น</p>}
                    </div>
                    {bankList.length > bankN && (
                      <button type="button" className="gl-ghost" onClick={() => setBankN((n) => n + PAGE)}>
                        แสดงเพิ่ม ({bankList.length - bankN})
                      </button>
                    )}
                  </>
                )}
              </div>
            )}

            {r.source === 'mine' && game.act === 'pick' && (
              <div className="gl-sub">
                {!user ? (
                  <p className="gl-note">
                    <Link href="/login?redirect=/ai-game" className="gl-link">
                      เข้าสู่ระบบ
                    </Link>{' '}
                    เพื่อใช้ชุดคำถามที่คุณครูสร้างไว้
                  </p>
                ) : !mine ? (
                  <p className="gl-note">
                    <Loader2 className="w-4 h-4 animate-spin inline" /> กำลังโหลด...
                  </p>
                ) : mine.length === 0 ? (
                  <p className="gl-note">
                    {mineErr || 'ยังไม่มีชุดคำถาม '}
                    {!mineErr && (
                      <Link href="/create" className="gl-link">
                        สร้างชุดคำถามแรก
                      </Link>
                    )}
                  </p>
                ) : (
                  <div className="gl-sets">
                    {mine.map((m) => (
                      <button key={m.id} type="button" className="gl-set" data-on={picked?.id === m.id || undefined} onClick={() => pickMine(m)}>
                        <b>{m.title || 'ไม่มีชื่อ'}</b>
                        <small>{m.question_count} ข้อ</small>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {loadingSet && (
              <p className="gl-note">
                <Loader2 className="w-4 h-4 animate-spin inline" /> กำลังเตรียมชุดคำถาม...
              </p>
            )}
            {picked && !loadingSet && (
              <p className="gl-picked-set" role="status">
                <Check className="w-4 h-4" strokeWidth={3} /> ใช้ชุด &quot;{picked.title}&quot; {picked.items.length} ข้อ
                {picked.skipped > 0 && <em> (ข้าม {picked.skipped} ข้อที่เป็นรูปหรือพิมพ์ตอบ)</em>}
              </p>
            )}

            <div className="gl-edit">
              <p className="gl-label">
                แก้หรือพิมพ์{act.unit === 'ข้อ' ? 'คำถาม' : 'เนื้อหา'}เอง <small>{TEXT_HELP[game.act]}</small>
              </p>
              <textarea
                className="gl-area"
                rows={7}
                maxLength={TEXT_MAX}
                value={edited ?? autoText}
                placeholder={TEXT_HELP[game.act]}
                onChange={(e) => setEdited(e.target.value)}
                spellCheck={false}
              />
              <div className="gl-edit-foot">
                <span>
                  คลัง {items.length} {act.unit} · เกมสุ่มเล่นรอบละ {Math.min(r.count, items.length)} {act.unit}
                  {parsed && parsed.bad.length > 0 && <em> · บรรทัด {parsed.bad.slice(0, 5).join(', ')} รูปแบบไม่ถูก (ข้ามไป)</em>}
                </span>
                {edited !== null && (
                  <button type="button" className="gl-ghost" onClick={() => setEdited(null)}>
                    <RotateCcw className="w-4 h-4" /> ใช้เนื้อหาจากระบบ
                  </button>
                )}
              </div>
            </div>
          </section>

          <section className="gl-step">
            <h3>
              <span>3</span> ตั้งค่าเกม
            </h3>
            <Row label={`จำนวน${act.unit}สูงสุด`} list={COUNT_OPTIONS.map((c) => ({ id: c, th: String(c) }))} value={r.count} onPick={(count) => set({ count })} />
            <Row label="ความเร็ว" list={PACES} value={r.pace} onPick={(pace) => set({ pace })} />
            <div className="gl-two">
              <Row label="เวลาต่อข้อ" list={TIMERS} value={r.timer} onPick={(timer) => set({ timer })} />
              <Row label="หัวใจ" list={LIVES} value={r.lives} onPick={(lives) => set({ lives: lives as GameRecipe['lives'] })} />
            </div>
            <Row label="ภาษาบนปุ่มในเกม" list={LANGS} value={r.lang} onPick={(lang) => set({ lang })} />
          </section>

          <section className="gl-step">
            <h3>
              <span>4</span> รูปแบบการเล่นและภาพ
            </h3>
            <Row label="ผู้เล่น" list={TEAMS} value={r.teams} onPick={(teams) => set({ teams })} />
            {game.aim && (
              <>
                <Row label="วิธีตอบ" list={AIMS} value={r.aim} onPick={(aim) => set({ aim })} />
                {r.aim === 1 && <p className="gl-note">{game.aim}</p>}
              </>
            )}
            <div className="gl-two">
              <Row label="คุณภาพภาพ" list={GFXS} value={r.gfx} onPick={(gfx) => set({ gfx })} />
              <Row label="บรรยากาศ" list={MOODS} value={r.mood} onPick={(mood) => set({ mood })} />
            </div>
          </section>

          <section className="gl-out" aria-live="polite">
            <button type="button" className="gl-go" disabled={!html} onClick={save}>
              <Download className="w-5 h-5" /> บันทึกไฟล์เกม
            </button>
            <p className="gl-hint">ได้ไฟล์ .html ไฟล์เดียว เปิดด้วย Chrome หรือ Edge ได้ทั้งคอมพิวเตอร์ โน้ตบุ๊ก แท็บเล็ต ไม่ต้องต่ออินเทอร์เน็ต</p>
            <ol className="gl-tips">
              <li>ต่อโปรเจกเตอร์หรือทีวี แล้วกดปุ่ม &quot;เต็มจอ&quot; ในเกม ให้ทั้งห้องช่วยกันตอบ</li>
              <li>ส่งไฟล์ให้นักเรียนทาง LINE, Google Classroom หรือแฟลชไดรฟ์ ให้เล่นทบทวนเองได้</li>
              <li>ในเกมกดปุ่มหยุดพักเพื่อปรับความเร็วได้ เด็กตอบผิดเกมจะให้คำใบ้และลองใหม่ ไม่ตกรอบ</li>
            </ol>
            <p className="gl-hint">
              อยากเปิดห้องให้นักเรียนเล่นแข่งกันจากมือถือแต่ละคน?{' '}
              <Link href="/create" className="gl-link">
                ใช้ระบบสร้างเกม
              </Link>
            </p>
          </section>
        </div>
      </div>

      {toast && (
        <div className="gl-toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
