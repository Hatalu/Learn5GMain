'use client';

/* eslint-disable @next/next/no-img-element */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  BookOpen,
  Bookmark,
  Check,
  ClipboardCopy,
  Dices,
  ExternalLink,
  FileImage,
  Gem,
  GraduationCap,
  Heart,
  ImagePlus,
  LayoutTemplate,
  Loader2,
  Palette,
  PenLine,
  Send,
  Shirt,
  Sparkles,
  Trash2,
  Trophy,
  Type,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { gsfx } from '@/lib/game-creator/gsound';
import { uploadImage } from '@/lib/game-creator/media';
import { PaperModal } from '@/components/creator/PaperModal';
import { COUNT_MAX, COUNT_MIN, FRAMES, GRADES, LANGS, LEVELS, NOTE_MAX, STYLES, SUBJECTS, THEMES, activitiesFor, gradeLabel, subjectOf } from '@/lib/worksheet/options';
import { PRESETS, buildPrompt, cleanRecipe, decodeRecipe, defaultRecipe, presetRecipe, randomRecipe, titleOf, type Recipe } from '@/lib/worksheet/recipe';
import { MAX_ENTRIES, leftText, type Contest, type Phase } from '@/lib/worksheet/contest';
import { PaperPreview } from './PaperPreview';
import './worksheet.css';

type TabId = 'subject' | 'topic' | 'act' | 'theme' | 'style' | 'page' | 'extra';
const TABS: { id: TabId; th: string; icon: React.ReactNode }[] = [
  { id: 'subject', th: 'วิชา/ชั้น', icon: <GraduationCap className="w-5 h-5" /> },
  { id: 'topic', th: 'หัวข้อ', icon: <BookOpen className="w-5 h-5" /> },
  { id: 'act', th: 'กิจกรรม', icon: <PenLine className="w-5 h-5" /> },
  { id: 'theme', th: 'ธีม', icon: <Shirt className="w-5 h-5" /> },
  { id: 'style', th: 'สไตล์ภาพ', icon: <Palette className="w-5 h-5" /> },
  { id: 'page', th: 'จัดหน้า', icon: <LayoutTemplate className="w-5 h-5" /> },
  { id: 'extra', th: 'ของตกแต่ง', icon: <Gem className="w-5 h-5" /> },
];

const SAVE_KEY = 'l5g_ws_saved';
const DRAFT_KEY = 'l5g_ws_draft';
const GEMINI = 'https://gemini.google.com/app';
type Saved = { id: string; name: string; r: Recipe };

function readSaved(): Saved[] {
  try {
    const a = JSON.parse(localStorage.getItem(SAVE_KEY) || '[]');
    return Array.isArray(a) ? a.slice(0, 12).map((x) => ({ id: String(x.id), name: String(x.name).slice(0, 40), r: cleanRecipe(x.r) })) : [];
  } catch {
    return [];
  }
}

/** คัดลอกทันทีในจังหวะคลิก (ไม่รอ Promise) คืน false ถ้าเบราว์เซอร์ไม่ยอม */
function copyNow(text: string): boolean {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;';
  document.body.appendChild(ta);
  ta.select();
  ta.setSelectionRange(0, text.length);
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  ta.remove();
  return ok;
}

function Chip({ on, onClick, children, color, title }: { on: boolean; onClick: () => void; children: React.ReactNode; color?: string; title?: string }) {
  return (
    <button type="button" className="ws-chip" aria-pressed={on} onClick={onClick} title={title} style={color ? ({ '--ws-on': color } as React.CSSProperties) : undefined}>
      {on && <Check className="w-4 h-4 shrink-0" strokeWidth={3.5} />}
      {children}
    </button>
  );
}

function Toggle({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={onClick} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-2xl border-[3px] border-[#2a2350] bg-white text-left font-bold text-[#2a2350] shadow-[0_3px_0_#2a2350] active:translate-y-0.5 active:shadow-none transition-transform">
      <span className="flex-1">{label}</span>
      <span className={`relative w-11 h-6 rounded-full border-2 border-[#2a2350] transition-colors ${on ? 'bg-[#3fd6a8]' : 'bg-gray-200'}`}>
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white border-2 border-[#2a2350] transition-all ${on ? 'left-[1.3rem]' : 'left-0.5'}`} />
      </span>
    </button>
  );
}

const H = ({ children }: { children: React.ReactNode }) => <p className="mt-4 first:mt-0 mb-2 text-sm font-extrabold text-[#5b5280]">{children}</p>;

export function WorksheetBuilder() {
  const { user, profile, isLoading } = useAuth();
  const router = useRouter();
  const sp = useSearchParams();
  const [r, setR] = useState<Recipe>(defaultRecipe);
  const [tab, setTab] = useState<TabId>('subject');
  const [bump, setBump] = useState(0);
  const [roll, setRoll] = useState(0);
  const [toast, setToast] = useState('');
  const [showPrompt, setShowPrompt] = useState(false);
  const [saved, setSaved] = useState<Saved[]>([]);
  const [contest, setContest] = useState<{ c: Contest; phase: Phase } | null>(null);
  const [send, setSend] = useState<null | 'studio' | 'contest'>(null);
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const [geminiLink, setGeminiLink] = useState(false);
  const loaded = useRef(false);
  const signedIn = !!user && !!profile && !String(profile.username || '').startsWith('trial_');

  // สูตรจากลิงก์ (?r= จาก "ใช้สูตรนี้" ในแกลเลอรี)
  useEffect(() => {
    const enc = sp.get('r');
    let got = enc ? decodeRecipe(enc) : null;
    if (!got) {
      try {
        const d = localStorage.getItem(DRAFT_KEY);
        if (d) got = cleanRecipe(JSON.parse(d));
      } catch {
        /* ไม่มีร่าง */
      }
    } else setToast('โหลดสูตรของเพื่อนครูแล้ว แต่งต่อได้เลย');
    if (got) setR(got);
    loaded.current = true;
    setSaved(readSaved());
    if (sp.get('send') === '1') setTimeout(() => document.getElementById('ws-step3')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 400);
    fetch('/api/contest?brief=1')
      .then((x) => x.json())
      .then((j) => j.contest && setContest({ c: j.contest, phase: j.phase }))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  // จำสูตรล่าสุดไว้ในเครื่อง (ไปสมัคร/ล็อกอินแล้วกลับมาแต่งต่อได้)
  useEffect(() => {
    if (!loaded.current) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(r));
    } catch {
      /* โหมดส่วนตัว */
    }
  }, [r]);

  const prompt = useMemo(() => buildPrompt(r), [r]);
  const subj = subjectOf(r.s);
  const topics = useMemo(() => {
    const fit = subj.topics.filter((t) => r.g >= t.g[0] && r.g <= t.g[1]);
    const rest = subj.topics.filter((t) => !fit.includes(t));
    return { fit, rest };
  }, [subj, r.g]);

  const set = (patch: Partial<Recipe>) => {
    gsfx.pick();
    setR((old) => cleanRecipe({ ...old, ...patch }));
    setBump((b) => b + 1);
  };

  const pickSubject = (s: Recipe['s']) => {
    const sj = subjectOf(s);
    const fit = sj.topics.find((t) => r.g >= t.g[0] && r.g <= t.g[1]) || sj.topics[0];
    const acts = activitiesFor(s);
    set({ s, tp: fit.id, a: acts.some((a) => a.id === r.a) ? r.a : acts[0].id, lang: s === 'eng' ? 'bi' : r.lang === 'bi' ? 'th' : r.lang });
  };

  const dice = () => {
    gsfx.whoosh();
    setRoll((n) => n + 1);
    setR(randomRecipe(Math.random));
    setBump((b) => b + 1);
  };

  const copy = async (open: boolean) => {
    gsfx.tap();
    // คัดลอกแบบทันที (execCommand) ก่อนเปิดแท็บใหม่: clipboard API ตรวจโฟกัสทีหลัง แท็บใหม่แย่งโฟกัสไปก่อนจะคัดลอกไม่ติด
    if (copyNow(prompt)) {
      if (open) window.open(GEMINI, '_blank', 'noopener');
      gsfx.correct();
      setToast(open ? 'คัดลอกแล้ว กด Ctrl+V (หรือแตะค้างแล้ววาง) ในช่องของ Gemini' : 'คัดลอก prompt แล้ว');
      return;
    }
    try {
      // เบราว์เซอร์ที่ไม่มี execCommand: ใช้ clipboard API แล้วให้กดเปิด Gemini เอง (ไม่เปิดอัตโนมัติ)
      await navigator.clipboard.writeText(prompt);
      gsfx.correct();
      setToast('คัดลอกแล้ว กดลิงก์ "เปิด Gemini" ใต้ปุ่มได้เลย');
      if (open) setGeminiLink(true);
    } catch {
      if (open) setGeminiLink(true);
      setShowPrompt(true);
      setTimeout(() => {
        promptRef.current?.focus();
        promptRef.current?.select();
      }, 50);
      setToast('คัดลอกอัตโนมัติไม่ได้ ข้อความถูกเลือกไว้แล้ว กดคัดลอกเองได้เลย');
    }
  };

  const saveRecipe = () => {
    const name = titleOf(r);
    const next = [{ id: String(Date.now()), name, r }, ...saved.filter((s) => s.name !== name)].slice(0, 12);
    setSaved(next);
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(next));
    } catch {
      /* โหมดส่วนตัว */
    }
    gsfx.correct();
    setToast('บันทึกแล้ว ดูได้ที่ "สูตรของฉัน" ด้านบน');
    document.getElementById('ws-saved')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
  const dropSaved = (id: string) => {
    const next = saved.filter((s) => s.id !== id);
    setSaved(next);
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(next));
    } catch {
      /* โหมดส่วนตัว */
    }
  };

  const open = contest?.phase === 'open';

  return (
    <div className="relative z-[1] max-w-7xl mx-auto px-3 sm:px-6 pb-24">
      {/* หัวหน้า */}
      <div className="flex flex-wrap items-end gap-3 pt-4 pb-5">
        <div className="flex-1 min-w-[16rem]">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border-2 border-[#2a2350] bg-[#ffe08a] text-[#2a2350] text-xs font-extrabold">
            <Sparkles className="w-3.5 h-3.5" /> ใช้ Gemini วาดให้ ฟรี
          </span>
          <h1 className="mt-2 font-display text-3xl sm:text-4xl text-[#2a2350] dark:text-white leading-tight">ตู้แต่งตัวใบงาน AI</h1>
          <p className="mt-1 text-sm sm:text-base font-semibold text-[#5b5280] dark:text-gray-300">แต่งใบงานเหมือนแต่งตัวละคร แล้วให้ Gemini วาดภาพให้</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={dice} data-roll={roll % 2 ? '1' : '0'} key={roll} className="ws-btn ws-dice bg-[#ffd166] text-[#2a2350]">
            <Dices className="w-5 h-5" /> สุ่มชุด
          </button>
          <button type="button" onClick={saveRecipe} className="ws-btn bg-[#a8f0d4] text-[#2a2350]">
            <Bookmark className="w-5 h-5" /> <span className="max-sm:hidden">บันทึกสูตร</span>
          </button>
          <Link href="/contest" className="ws-btn bg-[#ff8fab] text-[#2a2350]">
            <Trophy className="w-5 h-5" /> <span className="max-sm:hidden">กิจกรรมประกวด</span>
          </Link>
        </div>
      </div>

      {open && contest && (
        <Link href="/contest" className="mb-5 flex items-center gap-3 px-4 py-3 rounded-2xl border-[3px] border-[#2a2350] bg-gradient-to-r from-[#ffe08a] to-[#ffb3cf] text-[#2a2350] shadow-[0_4px_0_#2a2350] font-bold hover:-translate-y-0.5 transition-transform">
          <Trophy className="w-6 h-6 shrink-0" />
          <span className="flex-1 min-w-0">
            {contest.c.title} <span className="font-semibold opacity-80">· เหลือ {leftText(new Date(contest.c.ends_at).getTime() - Date.now())}</span>
          </span>
          <span className="max-sm:hidden text-sm underline">ดูผลงาน</span>
        </Link>
      )}

      {/* สูตรที่บันทึกไว้ในเครื่องนี้ */}
      <div id="ws-saved" className="mb-4 scroll-mt-24">
        <p className="mb-2 text-sm font-extrabold text-[#5b5280] dark:text-gray-300 flex items-center gap-1.5">
          <Bookmark className="w-4 h-4" /> สูตรของฉัน ({saved.length})
        </p>
        {saved.length ? (
          <div className="ws-tabs">
            {saved.map((s) => (
              <span key={s.id} className="ws-chip flex-none !pr-1.5 !bg-[#e8fff6]">
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5"
                  onClick={() => {
                    gsfx.pick();
                    setR(s.r);
                    setBump((b) => b + 1);
                  }}
                >
                  {s.name}
                </button>
                <button type="button" onClick={() => dropSaved(s.id)} aria-label={`ลบสูตร ${s.name}`} className="ml-1 p-1 rounded-lg hover:bg-[#ffd6de]">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm font-semibold text-[#5b5280] dark:text-gray-400">ยังไม่มี กดปุ่ม &quot;บันทึกสูตร&quot; ด้านบนเพื่อเก็บชุดที่แต่งไว้ใช้ครั้งหน้า</p>
        )}
      </div>

      {/* ชุดสำเร็จรูป */}
      <div className="mb-5">
        <p className="mb-2 text-sm font-extrabold text-[#5b5280] dark:text-gray-300">ชุดสำเร็จรูป</p>
        <div className="ws-tabs">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              className="ws-chip flex-none"
              onClick={() => {
                gsfx.pick();
                setR(presetRecipe(p));
                setBump((b) => b + 1);
              }}
            >
              <span className="w-3 h-3 rounded-full border-2 border-[#2a2350]" style={{ background: subjectOf(p.r.s || 'math').color }} />
              {p.th}
            </button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-5 items-start">
        {/* ซ้าย: กระดาษตัวอย่าง */}
        <div className="lg:sticky lg:top-20">
          <div className="ws-card p-4 sm:p-5 bg-[linear-gradient(160deg,#eef0ff,#fff3f8)]">
            <div className="flex items-center gap-2 mb-3">
              <span className="px-2.5 py-0.5 rounded-full border-2 border-[#2a2350] text-xs font-extrabold text-white" style={{ background: subj.color }}>
                {subj.th}
              </span>
              <span className="px-2.5 py-0.5 rounded-full border-2 border-[#2a2350] bg-white text-xs font-extrabold">{gradeLabel(r.g)}</span>
              <span className="ml-auto text-xs font-bold text-[#5b5280]">ภาพโครงคร่าวๆ</span>
            </div>
            <div className="flex justify-center">
              <PaperPreview key={`p${bump}`} r={r} className="ws-paper block w-auto max-w-full h-[min(62vh,40rem)] lg:h-[calc(100vh-15rem)] max-h-[44rem]" />
            </div>
            <p className="mt-3 text-center font-display text-lg leading-snug">{titleOf(r)}</p>
          </div>
        </div>

        {/* ขวา: ตู้เสื้อผ้า */}
        <div className="ws-card p-3 sm:p-5">
          <div className="ws-tabs ws-tabs-wrap" role="tablist" aria-label="ตู้ตัวเลือก">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                className="ws-tab"
                onClick={() => {
                  gsfx.tap();
                  setTab(t.id);
                }}
              >
                {t.icon}
                {t.th}
              </button>
            ))}
          </div>

          <div role="tabpanel" className="pt-2 min-h-[16rem]">
            {tab === 'subject' && (
              <>
                <H>วิชา</H>
                <div className="flex flex-wrap gap-2">
                  {SUBJECTS.map((s) => (
                    <Chip key={s.id} on={r.s === s.id} color={s.color} onClick={() => pickSubject(s.id)}>
                      {s.th}
                    </Chip>
                  ))}
                </div>
                <H>ระดับชั้น</H>
                <div className="flex flex-wrap gap-2">
                  {GRADES.map((g) => (
                    <Chip key={g} on={r.g === g} onClick={() => set({ g, big: g <= 2 ? true : r.big })}>
                      {gradeLabel(g)}
                    </Chip>
                  ))}
                </div>
              </>
            )}

            {tab === 'topic' && (
              <>
                <H>เหมาะกับ {gradeLabel(r.g)}</H>
                <div className="flex flex-wrap gap-2">
                  {topics.fit.map((t) => (
                    <Chip key={t.id} on={r.tp === t.id} color={subj.color} onClick={() => set({ tp: t.id })}>
                      {t.th}
                    </Chip>
                  ))}
                  {!topics.fit.length && <p className="text-sm text-[#5b5280]">ไม่มีหัวข้อที่ตรงชั้นนี้ เลือกจากด้านล่างหรือพิมพ์เอง</p>}
                </div>
                {!!topics.rest.length && (
                  <>
                    <H>หัวข้ออื่นของวิชานี้</H>
                    <div className="flex flex-wrap gap-2">
                      {topics.rest.map((t) => (
                        <Chip key={t.id} on={r.tp === t.id} color={subj.color} onClick={() => set({ tp: t.id })}>
                          {t.th}
                        </Chip>
                      ))}
                    </div>
                  </>
                )}
                <H>หรือพิมพ์หัวข้อเอง</H>
                <input
                  value={r.cu}
                  maxLength={60}
                  onChange={(e) => setR((o) => ({ ...o, cu: e.target.value, tp: e.target.value.trim() ? 'custom' : o.tp === 'custom' ? subj.topics[0].id : o.tp }))}
                  onBlur={() => setR((o) => cleanRecipe(o))}
                  placeholder="เช่น การบวกเลขสองหลักแบบมีทด"
                  className="w-full px-4 py-3 rounded-2xl border-[3px] border-[#2a2350] font-semibold outline-none focus:ring-4 ring-[#c9b8ff] !bg-white !text-[#2a2350] placeholder:text-[#9a90c0]"
                />
              </>
            )}

            {tab === 'act' && (
              <>
                <H>รูปแบบกิจกรรม</H>
                <div className="grid sm:grid-cols-2 gap-2">
                  {activitiesFor(r.s).map((a) => (
                    <Chip key={a.id} on={r.a === a.id} onClick={() => set({ a: a.id })}>
                      {a.only && <span className="px-1.5 rounded-md bg-[#ffe08a] text-[#2a2350] text-[10px] font-black">{subj.th}</span>}
                      {a.th}
                    </Chip>
                  ))}
                </div>
                <H>จำนวนข้อ: {r.n}</H>
                <input type="range" min={COUNT_MIN} max={COUNT_MAX} value={r.n} onChange={(e) => set({ n: Number(e.target.value) })} className="w-full accent-[#7c5cf0]" aria-label="จำนวนข้อ" />
                <H>ความยาก</H>
                <div className="flex flex-wrap gap-2">
                  {LEVELS.map((l) => (
                    <Chip key={l.id} on={r.lv === l.id} onClick={() => set({ lv: l.id })}>
                      {l.th}
                    </Chip>
                  ))}
                </div>
              </>
            )}

            {tab === 'theme' && (
              <>
                <H>ธีม (ชุดของใบงาน)</H>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {THEMES.map((t) => (
                    <button key={t.id} type="button" className="ws-chip !flex-col !items-stretch !gap-1.5" aria-pressed={r.th === t.id} onClick={() => set({ th: t.id })}>
                      <span className="flex h-6 rounded-lg overflow-hidden border-2 border-[#2a2350]">
                        {t.pal.map((c) => (
                          <span key={c} className="flex-1" style={{ background: c }} />
                        ))}
                      </span>
                      <span className="flex items-center gap-1">
                        {r.th === t.id && <Check className="w-4 h-4" strokeWidth={3.5} />}
                        {t.th}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}

            {tab === 'style' && (
              <>
                <H>สไตล์ภาพ</H>
                <div className="grid sm:grid-cols-2 gap-2">
                  {STYLES.map((s) => (
                    <Chip key={s.id} on={r.st === s.id} onClick={() => set({ st: s.id })}>
                      {s.th}
                      {s.bw && <span className="px-1.5 rounded-md bg-[#d9f7ea] text-[#2a2350] text-[10px] font-black">ประหยัดหมึก</span>}
                    </Chip>
                  ))}
                </div>
                <H>กรอบกระดาษ</H>
                <div className="flex flex-wrap gap-2">
                  {FRAMES.map((f) => (
                    <Chip key={f.id} on={r.fr === f.id} onClick={() => set({ fr: f.id })}>
                      {f.th}
                    </Chip>
                  ))}
                </div>
              </>
            )}

            {tab === 'page' && (
              <>
                <H>แนวกระดาษ A4</H>
                <div className="flex flex-wrap gap-2">
                  <Chip on={r.o === 'p'} onClick={() => set({ o: 'p' })}>
                    แนวตั้ง
                  </Chip>
                  <Chip on={r.o === 'l'} onClick={() => set({ o: 'l' })}>
                    แนวนอน
                  </Chip>
                </div>
                {r.s !== 'chinese' && r.s !== 'japanese' && (
                  <>
                    <H>ภาษาบนใบงาน</H>
                    <div className="flex flex-wrap gap-2">
                      {LANGS.map((l) => (
                        <Chip key={l.id} on={r.lang === l.id} onClick={() => set({ lang: l.id })}>
                          {l.th}
                        </Chip>
                      ))}
                    </div>
                  </>
                )}
                <H>ตัวหนังสือบนภาพ</H>
                <div className="grid sm:grid-cols-2 gap-2">
                  <Chip on={r.txt === 'blank'} onClick={() => set({ txt: 'blank' })} title="AI มักเขียนภาษาไทยเพี้ยน เว้นช่องแล้วไปพิมพ์ใน Studio จะได้ตัวหนังสือถูกต้อง">
                    เว้นช่องให้ฉันพิมพ์เอง
                    <span className="px-1.5 rounded-md bg-[#d9f7ea] text-[#2a2350] text-[10px] font-black">แนะนำ</span>
                  </Chip>
                  <Chip on={r.txt === 'ai'} onClick={() => set({ txt: 'ai' })}>
                    ให้ AI เขียนข้อความ
                  </Chip>
                </div>
                {r.txt === 'ai' && <p className="mt-2 text-xs font-semibold text-[#b4235a]">AI วาดตัวหนังสือไทยผิดได้ ตรวจทุกคำก่อนใช้นะ</p>}
                <div className="mt-4">
                  <Toggle on={r.big} label="ตัวหนังสือใหญ่ (ป.ต้น)" onClick={() => set({ big: !r.big })} />
                </div>
              </>
            )}

            {tab === 'extra' && (
              <>
                <div className="grid sm:grid-cols-2 gap-2">
                  <Toggle on={r.name} label="ช่องชื่อ ชั้น เลขที่" onClick={() => set({ name: !r.name })} />
                  <Toggle on={r.score} label="ช่องคะแนน" onClick={() => set({ score: !r.score })} />
                  <Toggle on={r.mascot} label="มาสคอตชี้คำสั่ง" onClick={() => set({ mascot: !r.mascot })} />
                  <Toggle on={r.sticker} label="มุมสติกเกอร์รางวัล" onClick={() => set({ sticker: !r.sticker })} />
                  <Toggle on={r.key} label="ทำหน้าเฉลยด้วย" onClick={() => set({ key: !r.key })} />
                </div>
                <H>ชื่อใบงาน (ไม่ใส่ = ตั้งจากหัวข้อ)</H>
                <input
                  value={r.title}
                  maxLength={40}
                  onChange={(e) => setR((o) => ({ ...o, title: e.target.value }))}
                  onBlur={() => setR((o) => cleanRecipe(o))}
                  placeholder={titleOf({ ...r, title: '' })}
                  className="w-full px-4 py-3 rounded-2xl border-[3px] border-[#2a2350] font-semibold outline-none focus:ring-4 ring-[#c9b8ff] !bg-white !text-[#2a2350] placeholder:text-[#9a90c0]"
                />
                <H>อยากบอก AI เพิ่ม ({r.note.length}/{NOTE_MAX})</H>
                <textarea
                  value={r.note}
                  maxLength={NOTE_MAX}
                  rows={2}
                  onChange={(e) => setR((o) => ({ ...o, note: e.target.value }))}
                  onBlur={() => setR((o) => cleanRecipe(o))}
                  placeholder="เช่น ใส่แมวสีส้มเป็นตัวละครหลัก"
                  className="w-full px-4 py-3 rounded-2xl border-[3px] border-[#2a2350] font-semibold outline-none focus:ring-4 ring-[#c9b8ff] !bg-white !text-[#2a2350] placeholder:text-[#9a90c0] resize-none"
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* ขั้น 2: prompt */}
      <section className="mt-6 ws-card p-4 sm:p-6 bg-[linear-gradient(115deg,#c9b8ff,#ffc2e2)]">
        <div className="flex flex-wrap items-center gap-3">
          <span className="w-10 h-10 rounded-full border-[3px] border-[#2a2350] bg-white flex items-center justify-center font-display text-lg">2</span>
          <div className="flex-1 min-w-[12rem]">
            <h2 className="font-display text-xl sm:text-2xl">ส่งให้ Gemini วาด</h2>
            <p className="text-sm font-semibold opacity-80">กดปุ่มเดียว คัดลอกแล้วเปิด Gemini ให้ จากนั้นวาง (Ctrl+V) แล้วกดส่ง</p>
          </div>
        </div>
        <div className="mt-4 grid sm:grid-cols-3 gap-2">
          <button type="button" onClick={() => copy(true)} className="ws-btn bg-[#2a2350] text-white sm:col-span-1 !shadow-[0_4px_0_#000]">
            <ExternalLink className="w-5 h-5" /> คัดลอกแล้วเข้า Gemini
          </button>
          <button type="button" onClick={() => copy(false)} className="ws-btn bg-white text-[#2a2350]">
            <ClipboardCopy className="w-5 h-5" /> คัดลอก
          </button>
          <button type="button" onClick={() => setSend('studio')} className="ws-btn bg-[#a8f0d4] text-[#2a2350]">
            <Type className="w-5 h-5" /> นำเข้า Studio
          </button>
        </div>
        {geminiLink && (
          <a href={GEMINI} target="_blank" rel="noopener noreferrer" className="mt-3 mr-4 inline-flex items-center gap-1 text-sm font-black underline">
            <ExternalLink className="w-4 h-4" /> เปิด Gemini
          </a>
        )}
        <button type="button" onClick={() => setShowPrompt((s) => !s)} className="mt-3 text-sm font-bold underline">
          {showPrompt ? 'ซ่อน prompt' : 'ดู / แก้ prompt'}
        </button>
        {showPrompt && (
          <textarea
            ref={promptRef}
            readOnly
            value={prompt}
            rows={9}
            className="mt-2 w-full px-4 py-3 rounded-2xl border-[3px] border-[#2a2350] bg-white font-mono text-xs sm:text-sm leading-relaxed"
            aria-label="prompt สำหรับ Gemini"
          />
        )}
      </section>

      {/* ขั้น 3: ใช้ภาพ */}
      <section id="ws-step3" className="mt-6 ws-card p-4 sm:p-6 bg-[linear-gradient(115deg,#a8f0d4,#fff3c4)]">
        <div className="flex flex-wrap items-center gap-3">
          <span className="w-10 h-10 rounded-full border-[3px] border-[#2a2350] bg-white flex items-center justify-center font-display text-lg">3</span>
          <div className="flex-1 min-w-[12rem]">
            <h2 className="font-display text-xl sm:text-2xl">ได้ภาพจาก Gemini แล้ว</h2>
            <p className="text-sm font-semibold opacity-80">ดาวน์โหลดภาพมาก่อน แล้วเลือกว่าจะทำอะไรต่อ</p>
          </div>
        </div>
        <div className="mt-4 grid sm:grid-cols-2 gap-3">
          <button type="button" onClick={() => setSend('studio')} className="ws-btn bg-white text-[#2a2350] !justify-start !py-4">
            <Type className="w-7 h-7 shrink-0 text-[#7c5cf0]" />
            <span className="text-left">
              ใส่ข้อความไทยใน Studio
              <span className="block text-xs font-semibold opacity-75">ใช้ภาพเป็นพื้นหลัง แล้วพิมพ์คำสั่ง/โจทย์ทับ ตัวหนังสือถูกแน่นอน</span>
            </span>
          </button>
          <button type="button" onClick={() => setSend('contest')} className="ws-btn bg-white text-[#2a2350] !justify-start !py-4">
            <Trophy className="w-7 h-7 shrink-0 text-[#e8456b]" />
            <span className="text-left">
              ส่งเข้าประกวด
              <span className="block text-xs font-semibold opacity-75">{open ? `ให้ครูทั่วประเทศกดใจ ลุ้นสมาชิกฟรี (คนละ ${MAX_ENTRIES} ผลงาน)` : 'ตอนนี้ยังไม่มีกิจกรรมที่เปิดรับ'}</span>
            </span>
          </button>
        </div>
      </section>

      {send && (
        <SendDialog
          kind={send}
          recipe={r}
          signedIn={signedIn}
          loading={isLoading}
          userId={user?.id || ''}
          contestOpen={open}
          onClose={() => setSend(null)}
          onDone={(msg, url) => {
            setSend(null);
            if (url) router.push(url);
            else if (msg) setToast(msg);
          }}
        />
      )}

      {toast && (
        <div className="ws-toast px-5 py-3 rounded-2xl border-[3px] border-[#2a2350] bg-white text-[#2a2350] font-bold shadow-[0_4px_0_#2a2350] max-w-[92vw] text-center" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- อัปโหลดภาพ: ไป Studio / ส่งประกวด */

function SendDialog({
  kind,
  recipe,
  signedIn,
  loading,
  userId,
  contestOpen,
  onClose,
  onDone,
}: {
  kind: 'studio' | 'contest';
  recipe: Recipe;
  signedIn: boolean;
  loading: boolean;
  userId: string;
  contestOpen: boolean;
  onClose: () => void;
  onDone: (msg: string, url?: string) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [title, setTitle] = useState(titleOf(recipe));
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!file) return;
    const u = URL.createObjectURL(file);
    setPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  const heading = kind === 'studio' ? 'ใส่ข้อความไทยใน Studio' : 'ส่งผลงานเข้าประกวด';

  if (!loading && !signedIn)
    return (
      <PaperModal title={heading} icon={<ImagePlus className="w-5 h-5" />} onClose={onClose}>
        <p className="font-semibold text-[#2a2350]">สมัครบัญชีฟรีก่อน แล้วค่อยอัปโหลดภาพนะ (สูตรที่แต่งไว้จำไว้ในเครื่องนี้แล้ว กลับมาแต่งต่อได้)</p>
        <div className="mt-4 flex gap-2">
          <Link href="/signup?redirect=/worksheet" className="ws-btn bg-[#ffd166] text-[#2a2350] flex-1">
            สมัครฟรี
          </Link>
          <Link href="/login?redirect=/worksheet" className="ws-btn bg-white text-[#2a2350] flex-1">
            เข้าสู่ระบบ
          </Link>
        </div>
      </PaperModal>
    );

  if (kind === 'contest' && !contestOpen)
    return (
      <PaperModal title={heading} icon={<Trophy className="w-5 h-5" />} onClose={onClose}>
        <p className="font-semibold text-[#2a2350]">ตอนนี้ยังไม่มีกิจกรรมที่เปิดรับผลงาน ติดตามประกาศรอบใหม่ได้ที่หน้ากิจกรรม</p>
        <Link href="/contest" className="mt-4 ws-btn bg-[#ff8fab] text-[#2a2350] w-full">
          <Heart className="w-5 h-5" /> ไปหน้ากิจกรรม
        </Link>
      </PaperModal>
    );

  const go = async () => {
    if (!file) return setErr('เลือกภาพก่อนนะ');
    if (kind === 'contest' && !consent) return setErr('ติ๊กยอมรับกติกาก่อนนะ');
    setBusy(true);
    setErr('');
    try {
      const m = await uploadImage(userId, file, 1800);
      if (kind === 'studio') {
        onDone('', `/studio?fromImage=${encodeURIComponent(m.url)}&o=${(m.w || 1) > (m.h || 1) ? 'l' : 'p'}`);
        return;
      }
      const res = await fetch('/api/contest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'submit', title, recipe, image: m.url, consent }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || 'ส่งไม่สำเร็จ');
      gsfx.fanfare();
      onDone('ส่งผลงานแล้ว รอทีมงานตรวจไม่เกิน 1 วันก็ขึ้นแกลเลอรี', '/contest?sent=1');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'ไม่สำเร็จ ลองใหม่นะ');
      setBusy(false);
    }
  };

  return (
    <PaperModal title={heading} icon={kind === 'studio' ? <Type className="w-5 h-5" /> : <Trophy className="w-5 h-5" />} onClose={onClose} busy={busy}>
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) setFile(f);
          e.target.value = '';
        }}
      />
      <button type="button" onClick={() => input.current?.click()} className="w-full rounded-2xl border-[3px] border-dashed border-[#2a2350] bg-[#f6f3ff] p-4 flex flex-col items-center gap-2 text-[#2a2350] font-bold hover:bg-[#efe9ff]">
        {preview ? <img src={preview} alt="ภาพใบงานที่เลือก" className="max-h-64 rounded-xl border-2 border-[#2a2350]" /> : <FileImage className="w-10 h-10 text-[#7c5cf0]" />}
        {preview ? 'เปลี่ยนภาพ' : 'เลือกภาพใบงานที่ดาวน์โหลดจาก Gemini'}
      </button>
      {kind === 'contest' && (
        <>
          <label className="block mt-4 text-sm font-extrabold text-[#5b5280]">ชื่อผลงาน</label>
          <input value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full px-4 py-3 rounded-2xl border-[3px] border-[#2a2350] font-semibold text-[#2a2350]" />
          <label className="mt-4 flex items-start gap-3 text-sm font-semibold text-[#2a2350] cursor-pointer">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 w-5 h-5 accent-[#7c5cf0]" />
            <span>
              ฉันออกแบบใบงานนี้เอง ไม่มีตัวละครหรือโลโก้ที่มีลิขสิทธิ์ ยอมรับ
              <Link href="/contest#rules" target="_blank" className="underline mx-1">
                กติกา
              </Link>
              และอนุญาตให้เว็บนำภาพไปประชาสัมพันธ์กิจกรรม (ผลงานยังเป็นของครู)
            </span>
          </label>
        </>
      )}
      {err && <p className="mt-3 text-sm font-bold text-rose-600">{err}</p>}
      <button type="button" onClick={go} disabled={busy || !file} className="mt-4 w-full ws-btn bg-[#ffd166] text-[#2a2350]">
        {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : kind === 'studio' ? <Type className="w-5 h-5" /> : <Send className="w-5 h-5" />}
        {busy ? 'กำลังอัปโหลด...' : kind === 'studio' ? 'เปิดใน Studio' : 'ส่งผลงาน'}
      </button>
      <p className="mt-2 text-xs text-center text-[#5b5280]">ภาพนับรวมในพื้นที่อัปโหลดของบัญชี</p>
    </PaperModal>
  );
}

