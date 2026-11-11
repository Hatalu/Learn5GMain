'use client';

/* eslint-disable @next/next/no-img-element */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Award, Clock, Crown, Download, Heart, Loader2, Medal, Sparkles, Trash2, Trophy, Wand2, X } from 'lucide-react';
import { gsfx } from '@/lib/game-creator/gsound';
import { SUBJECTS, subjectOf } from '@/lib/worksheet/options';
import { encodeRecipe, recipeChips, type Recipe } from '@/lib/worksheet/recipe';
import { MAX_ENTRIES, PLACE_LABEL, leftText, type Contest, type Phase } from '@/lib/worksheet/contest';
import { PaperModal } from '@/components/creator/PaperModal';
import './worksheet.css';

interface Entry {
  id: string;
  title: string;
  subject: string;
  owner_name: string;
  image_url: string;
  like_count: number;
  created_at: string;
  recipe: Recipe;
  mine: boolean;
}

interface Data {
  contest: Contest | null;
  phase?: Phase;
  entries?: Entry[];
  more?: boolean;
  top?: Entry[];
  liked?: string[];
  mine?: Entry[];
  mineStatus?: Record<string, string>;
  canLike?: boolean;
  signedIn?: boolean;
  missing?: boolean;
}

const STATUS: Record<string, [string, string]> = {
  pending: ['รอทีมงานตรวจ', '#ffe08a'],
  approved: ['ขึ้นแกลเลอรีแล้ว', '#a8f0d4'],
  rejected: ['ไม่ผ่านการตรวจ', '#ffc2cf'],
};

const PHASE_TEXT: Record<Phase, string> = { soon: 'กำลังจะเริ่ม', open: 'เปิดรับผลงานและกดใจ', ended: 'ปิดกิจกรรมแล้ว รอประกาศผล', awarded: 'ประกาศผลแล้ว' };

const fmt = (iso: string) => new Date(iso).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const fmtDay = (iso: string) => new Date(iso).toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok', day: 'numeric', month: 'long', year: 'numeric' });

export function ContestGallery() {
  const sp = useSearchParams();
  const [data, setData] = useState<Data | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<'top' | 'new'>('top');
  const [subject, setSubject] = useState('');
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<Entry | null>(null);
  const [cert, setCert] = useState<{ name: string; label: string; title: string } | null>(null);
  const [toast, setToast] = useState(sp.get('sent') ? 'ส่งผลงานแล้ว รอทีมงานตรวจก่อนขึ้นแกลเลอรีนะ' : '');
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(
    async (from = 0) => {
      setBusy(true);
      try {
        const q = new URLSearchParams({ sort, from: String(from) });
        if (subject) q.set('subject', subject);
        const r = await fetch(`/api/contest?${q}`, { cache: 'no-store' });
        const j = (await r.json()) as Data & { error?: string };
        if (!r.ok) throw new Error(j.error || 'โหลดไม่สำเร็จ');
        if (from === 0) setData(j);
        else setData((d) => (d ? { ...d, more: j.more } : j));
        setEntries((old) => (from ? [...old, ...(j.entries || [])] : j.entries || []));
        setLiked((old) => new Set([...(from ? old : []), ...(j.liked || [])]));
      } catch (e) {
        setToast(e instanceof Error ? e.message : 'โหลดไม่สำเร็จ');
        if (from === 0) setData((d) => d || { contest: null });
      } finally {
        setBusy(false);
      }
    },
    [sort, subject]
  );

  useEffect(() => {
    load(0);
  }, [load]);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const c = data?.contest || null;
  const phase = data?.phase;

  const like = async (e: Entry) => {
    if (!data?.signedIn) return setToast('เข้าสู่ระบบก่อนนะ แล้วกดใจได้เลย');
    if (e.mine) return setToast('กดใจผลงานตัวเองไม่ได้นะ');
    if (phase !== 'open') return setToast('ตอนนี้ไม่ได้อยู่ในช่วงกดใจ');
    if (!data.canLike) return setToast('กิจกรรมนี้นับใจจากบัญชีที่สมัครก่อนเริ่มกิจกรรม');
    const on = !liked.has(e.id);
    gsfx.pick();
    const bump = (d: number) => {
      const fix = (list?: Entry[]) => list?.map((x) => (x.id === e.id ? { ...x, like_count: Math.max(0, x.like_count + d) } : x));
      setEntries((l) => fix(l) || l);
      setData((dd) => (dd ? { ...dd, top: fix(dd.top) } : dd));
      setView((v) => (v && v.id === e.id ? { ...v, like_count: Math.max(0, v.like_count + d) } : v));
    };
    setLiked((s) => {
      const n = new Set(s);
      if (on) n.add(e.id);
      else n.delete(e.id);
      return n;
    });
    bump(on ? 1 : -1);
    try {
      const r = await fetch('/api/contest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'like', entry: e.id, on }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || 'กดใจไม่สำเร็จ');
    } catch (err) {
      setLiked((s) => {
        const n = new Set(s);
        if (on) n.delete(e.id);
        else n.add(e.id);
        return n;
      });
      bump(on ? -1 : 1);
      setToast(err instanceof Error ? err.message : 'กดใจไม่สำเร็จ');
    }
  };

  const removeMine = async (id: string) => {
    if (!confirm('ลบผลงานนี้? ใจที่ได้จะหายไปด้วย')) return;
    const r = await fetch('/api/contest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', entry: id }) });
    if (r.ok) load(0);
    else setToast('ลบไม่สำเร็จ');
  };

  if (!data)
    return (
      <div className="py-32 text-center text-[#2a2350]">
        <Loader2 className="w-8 h-8 animate-spin inline" />
      </div>
    );

  if (!c)
    return (
      <div className="relative z-[1] max-w-2xl mx-auto px-4 py-16">
        <div className="ws-card p-8 text-center">
          <Trophy className="w-14 h-14 mx-auto text-[#e8456b]" />
          <h1 className="mt-3 font-display text-3xl">กิจกรรมประกวดใบงาน</h1>
          <p className="mt-2 font-semibold text-[#5b5280]">ตอนนี้ยังไม่มีกิจกรรม ระหว่างรอ ลองแต่งใบงานกับ Gemini เก็บไว้ก่อนได้เลย</p>
          <Link href="/worksheet" className="mt-5 ws-btn bg-[#ffd166] text-[#2a2350]">
            <Wand2 className="w-5 h-5" /> ไปตู้แต่งตัวใบงาน
          </Link>
        </div>
      </div>
    );

  const winners = c.winners || [];
  const mine = data.mine || [];
  const ended = phase === 'ended' || phase === 'awarded';
  const cardOf = (e: Entry, rank?: number) => (
    <article key={e.id} className="ws-card overflow-hidden flex flex-col !rounded-[1.4rem]">
      <button type="button" onClick={() => setView(e)} className="relative block aspect-[210/297] bg-[#f6f3ff] overflow-hidden" aria-label={`ดูผลงาน ${e.title}`}>
        <img src={e.image_url} alt={e.title} loading="lazy" className="w-full h-full object-cover object-top hover:scale-[1.03] transition-transform duration-300" />
        {rank !== undefined && rank < 3 && (
          <span className="absolute top-2 left-2 w-9 h-9 rounded-full border-[3px] border-[#2a2350] flex items-center justify-center font-display text-lg" style={{ background: ['#ffd166', '#e4e4f0', '#f4b183'][rank] }}>
            {rank + 1}
          </span>
        )}
      </button>
      <div className="p-3 flex-1 flex flex-col gap-1.5">
        <h3 className="font-display text-base leading-snug line-clamp-2">{e.title}</h3>
        <p className="text-xs font-semibold text-[#5b5280] truncate">
          โดย ครู{e.owner_name} · <span style={{ color: subjectOf(e.subject).color }}>{subjectOf(e.subject).th}</span>
        </p>
        <div className="mt-auto flex items-center gap-2 pt-1">
          <button type="button" onClick={() => like(e)} data-on={liked.has(e.id)} className="ws-heart inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-[3px] border-[#2a2350] font-black text-sm shadow-[0_3px_0_#2a2350] active:translate-y-0.5 active:shadow-none" style={{ background: liked.has(e.id) ? '#ff8fab' : '#fff' }} aria-pressed={liked.has(e.id)} aria-label={`ถูกใจ ${e.title}`}>
            <Heart className="w-4 h-4" fill={liked.has(e.id) ? '#e8456b' : 'none'} strokeWidth={2.6} />
            {e.like_count}
          </button>
          <Link href={`/worksheet?r=${encodeRecipe(e.recipe)}`} className="ml-auto inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border-2 border-[#2a2350] bg-[#ede7ff] text-xs font-black hover:-translate-y-0.5 transition-transform" title="เปิดตู้แต่งตัวด้วยตัวเลือกชุดเดียวกัน">
            <Wand2 className="w-3.5 h-3.5" /> ใช้สูตรนี้
          </Link>
        </div>
      </div>
    </article>
  );

  return (
    <div className="relative z-[1] max-w-7xl mx-auto px-3 sm:px-6 pb-24 text-[#2a2350]">
      {/* หัวกิจกรรม */}
      <section className="mt-4 ws-card p-5 sm:p-8 bg-[linear-gradient(115deg,#ffe08a,#ffb3cf_55%,#c9b8ff)] relative overflow-hidden">
        <Sparkles className="absolute right-6 top-6 w-10 h-10 text-white/70" aria-hidden="true" />
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border-2 border-[#2a2350] bg-white text-xs font-extrabold">
          <Clock className="w-3.5 h-3.5" /> {phase && PHASE_TEXT[phase]}
        </span>
        <h1 className="mt-3 font-display text-3xl sm:text-5xl leading-tight">{c.title}</h1>
        <p className="mt-2 font-bold opacity-85">
          {fmt(c.starts_at)} ถึง {fmt(c.ends_at)}
          {phase === 'open' && <span className="ml-2 px-2 py-0.5 rounded-lg bg-white/70">เหลือ {leftText(new Date(c.ends_at).getTime() - now)}</span>}
          {phase === 'soon' && <span className="ml-2 px-2 py-0.5 rounded-lg bg-white/70">เริ่มในอีก {leftText(new Date(c.starts_at).getTime() - now)}</span>}
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3 max-w-xl">
          {c.prize_days.map((d, i) =>
            d > 0 ? (
              <div key={i} className="rounded-2xl border-[3px] border-[#2a2350] bg-white px-2 py-3 text-center shadow-[0_3px_0_#2a2350]">
                {i === 0 ? <Crown className="w-7 h-7 mx-auto text-[#f2a900]" /> : <Medal className="w-7 h-7 mx-auto" style={{ color: i === 1 ? '#8a8fa8' : '#c97a3d' }} />}
                <p className="text-[11px] sm:text-xs font-extrabold mt-1">อันดับ {i + 1}</p>
                <p className="font-display text-lg sm:text-2xl leading-none mt-0.5">{d} วัน</p>
              </div>
            ) : null
          )}
        </div>
        <p className="mt-3 text-sm font-bold opacity-85">
          รางวัลเป็นสมาชิกฟรี{c.join_days > 0 ? ` · ทุกผลงานที่ผ่านการตรวจรับ ${c.join_days} วัน` : ''}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/worksheet" className="ws-btn bg-white text-[#2a2350]">
            <Wand2 className="w-5 h-5" /> ออกแบบใบงาน
          </Link>
          {phase === 'open' && (
            <Link href="/worksheet?send=1" className="ws-btn bg-[#2a2350] text-white !shadow-[0_4px_0_#000]">
              <Trophy className="w-5 h-5" /> ส่งผลงาน
            </Link>
          )}
          <a href="#rules" className="ws-btn bg-[#a8f0d4] text-[#2a2350]">
            กติกา
          </a>
        </div>
      </section>

      {/* ประกาศผล */}
      {phase === 'awarded' && winners.length > 0 && (
        <section className="mt-6 ws-card p-5 sm:p-6 bg-[linear-gradient(160deg,#fff3c4,#fff)]">
          <h2 className="font-display text-2xl flex items-center gap-2">
            <Award className="w-7 h-7 text-[#f2a900]" /> ประกาศผล
          </h2>
          <div className="mt-3 grid sm:grid-cols-3 gap-3">
            {winners.map((w) => (
              <div key={w.entry} className="rounded-2xl border-[3px] border-[#2a2350] bg-white p-4 shadow-[0_3px_0_#2a2350]">
                <p className="text-xs font-black text-[#e8456b]">{PLACE_LABEL[w.rank - 1]}</p>
                <p className="font-display text-xl mt-1">ครู{w.name}</p>
                <p className="text-sm font-bold text-[#5b5280]">
                  {w.likes} ใจ · สมาชิกฟรี {w.days} วัน
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ผลงานของฉัน */}
      {mine.length > 0 && (
        <section className="mt-6 ws-card p-4 sm:p-6">
          <h2 className="font-display text-xl">
            ผลงานของฉัน ({mine.length}/{MAX_ENTRIES})
          </h2>
          <div className="mt-3 grid gap-3">
            {mine.map((e) => {
              const st = STATUS[data.mineStatus?.[e.id] || 'pending'];
              const win = winners.find((w) => w.entry === e.id);
              const approved = data.mineStatus?.[e.id] === 'approved';
              return (
                <div key={e.id} className="flex items-center gap-3 p-2 rounded-2xl border-2 border-[#e4ddfa]">
                  <img src={e.image_url} alt="" className="w-14 h-20 object-cover object-top rounded-lg border-2 border-[#2a2350]" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate">{e.title}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-xs font-bold">
                      <span className="px-2 py-0.5 rounded-full border-2 border-[#2a2350]" style={{ background: st[1] }}>
                        {st[0]}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Heart className="w-3.5 h-3.5" fill="#e8456b" stroke="#e8456b" /> {e.like_count}
                      </span>
                    </p>
                  </div>
                  {ended && approved && (
                    <button type="button" onClick={() => setCert({ name: e.owner_name, label: win ? PLACE_LABEL[win.rank - 1] : 'ผู้ร่วมกิจกรรม', title: e.title })} className="ws-btn !px-3 !py-2 bg-[#ffd166] text-[#2a2350] text-sm">
                      <Award className="w-4 h-4" /> <span className="max-sm:hidden">เกียรติบัตร</span>
                    </button>
                  )}
                  {!ended && (
                    <button type="button" onClick={() => removeMine(e.id)} aria-label={`ลบผลงาน ${e.title}`} className="p-2 rounded-xl border-2 border-[#2a2350] bg-white hover:bg-[#ffd6de]">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* อันดับ */}
      {!!data.top?.length && (
        <section className="mt-6">
          <h2 className="font-display text-2xl text-[#2a2350] dark:text-white flex items-center gap-2">
            <Trophy className="w-6 h-6 text-[#f2a900]" /> อันดับตอนนี้
          </h2>
          <div className="mt-3 flex gap-3 overflow-x-auto pb-3 snap-x">
            {data.top.map((e, i) => (
              <div key={e.id} className="snap-start shrink-0 w-40 sm:w-48">
                {cardOf(e, i)}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* แกลเลอรี */}
      <section className="mt-6">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-display text-2xl text-[#2a2350] dark:text-white mr-auto">ผลงานทั้งหมด</h2>
          <div className="flex gap-1.5">
            <button type="button" className="ws-chip" aria-pressed={sort === 'top'} onClick={() => setSort('top')}>
              ใจมากสุด
            </button>
            <button type="button" className="ws-chip" aria-pressed={sort === 'new'} onClick={() => setSort('new')}>
              ใหม่สุด
            </button>
          </div>
        </div>
        <div className="ws-tabs mt-2">
          <button type="button" className="ws-chip flex-none" aria-pressed={!subject} onClick={() => setSubject('')}>
            ทุกวิชา
          </button>
          {SUBJECTS.map((s) => (
            <button key={s.id} type="button" className="ws-chip flex-none" aria-pressed={subject === s.id} style={{ '--ws-on': s.color } as React.CSSProperties} onClick={() => setSubject(s.id)}>
              {s.th}
            </button>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">{entries.map((e) => cardOf(e))}</div>
        {!busy && !entries.length && (
          <div className="mt-3 ws-card p-8 text-center font-semibold text-[#5b5280]">
            ยังไม่มีผลงานในหมวดนี้ {phase === 'open' && 'เป็นคนแรกเลยไหม'}
          </div>
        )}
        {busy && (
          <div className="py-6 text-center text-[#2a2350] dark:text-white">
            <Loader2 className="w-6 h-6 animate-spin inline" />
          </div>
        )}
        {data.more && !busy && (
          <button type="button" onClick={() => load(entries.length)} className="mt-4 w-full ws-btn bg-white text-[#2a2350]">
            แสดงเพิ่ม
          </button>
        )}
      </section>

      {/* กติกา */}
      <section id="rules" className="mt-8 ws-card p-5 sm:p-7 scroll-mt-24">
        <h2 className="font-display text-2xl">กติกา</h2>
        <ol className="mt-3 list-decimal pl-5 space-y-1.5 font-semibold text-[#3d3566] text-sm sm:text-base">
          <li>
            ระยะเวลา {fmtDay(c.starts_at)} ถึง {fmt(c.ends_at)} ส่งผลงานและกดใจได้ภายในช่วงนี้เท่านั้น
          </li>
          <li>ผู้ร่วมกิจกรรมต้องมีบัญชีของเว็บ (สมัครฟรี ไม่ต้องซื้ออะไรเพื่อร่วมกิจกรรม) ส่งได้คนละ {MAX_ENTRIES} ผลงาน</li>
          <li>ผลงานต้องออกแบบด้วยตัวเอง ห้ามใช้ตัวละคร โลโก้ หรือภาพที่มีลิขสิทธิ์ของผู้อื่น และต้องเหมาะสมกับเด็ก</li>
          <li>ทุกผลงานผ่านการตรวจของทีมงานก่อนขึ้นแกลเลอรี</li>
          <li>1 บัญชีกดใจได้ 1 ครั้งต่อ 1 ผลงาน กดใจผลงานตัวเองไม่ได้{!c.count_new && ' และนับเฉพาะบัญชีที่สมัครก่อนเริ่มกิจกรรม'}</li>
          <li>อันดับตัดสินจากจำนวนใจเมื่อหมดเวลา ใจเท่ากัน ผลงานที่ส่งก่อนได้อันดับดีกว่า 1 คนได้รางวัลเดียว</li>
          <li>ทีมงานตัดสิทธิ์ผลงานหรือยอดใจที่ผิดปกติ (เช่น สร้างบัญชีปลอมกดใจ) ได้ คำตัดสินของทีมงานถือเป็นที่สิ้นสุด</li>
          <li>ผลงานยังเป็นของครูผู้ออกแบบ ครูอนุญาตให้เว็บนำภาพไปประชาสัมพันธ์กิจกรรมได้</li>
          <li>รางวัลเป็นวันสมาชิกฟรี เพิ่มเข้าบัญชีอัตโนมัติเมื่อประกาศผล แลกเป็นเงินสดไม่ได้</li>
        </ol>
      </section>

      {/* ดูผลงานใหญ่ */}
      {view && (
        <div className="fixed inset-0 z-[70] bg-[#1b1438]/80 flex items-center justify-center p-3" onClick={() => setView(null)} role="dialog" aria-modal="true" aria-label={view.title}>
          <div className="ws-card max-w-4xl w-full max-h-[94vh] overflow-y-auto grid md:grid-cols-[1.2fr_1fr]" onClick={(e) => e.stopPropagation()}>
            <img src={view.image_url} alt={view.title} className="w-full h-auto md:max-h-[90vh] object-contain bg-[#f6f3ff] md:rounded-l-[1.4rem]" />
            <div className="p-5 flex flex-col gap-3">
              <button type="button" onClick={() => setView(null)} className="self-end p-2 rounded-xl border-2 border-[#2a2350]" aria-label="ปิด">
                <X className="w-5 h-5" />
              </button>
              <h3 className="font-display text-2xl leading-snug">{view.title}</h3>
              <p className="font-bold text-[#5b5280]">โดย ครู{view.owner_name}</p>
              <div className="flex flex-wrap gap-1.5">
                {recipeChips(view.recipe).map((t) => (
                  <span key={t} className="px-2.5 py-1 rounded-full border-2 border-[#2a2350] bg-[#f6f3ff] text-xs font-bold">
                    {t}
                  </span>
                ))}
              </div>
              <button type="button" onClick={() => like(view)} data-on={liked.has(view.id)} className="ws-heart ws-btn mt-2" style={{ background: liked.has(view.id) ? '#ff8fab' : '#fff' }} aria-pressed={liked.has(view.id)}>
                <Heart className="w-5 h-5" fill={liked.has(view.id) ? '#e8456b' : 'none'} /> {liked.has(view.id) ? 'ถูกใจแล้ว' : 'ถูกใจ'} ({view.like_count})
              </button>
              <Link href={`/worksheet?r=${encodeRecipe(view.recipe)}`} className="ws-btn bg-[#ffd166] text-[#2a2350]">
                <Wand2 className="w-5 h-5" /> ใช้สูตรนี้ทำใบงานของฉัน
              </Link>
            </div>
          </div>
        </div>
      )}

      {cert && c && (
        <PaperModal title="เกียรติบัตร" icon={<Award className="w-5 h-5" />} onClose={() => setCert(null)} width={760}>
          <CertDownload cert={cert} contest={c} />
        </PaperModal>
      )}

      {toast && (
        <div className="ws-toast px-5 py-3 rounded-2xl border-[3px] border-[#2a2350] bg-white text-[#2a2350] font-bold shadow-[0_4px_0_#2a2350] max-w-[92vw] text-center" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}

/** เกียรติบัตร + ปุ่มดาวน์โหลดเป็นรูป PNG (html-to-image ในเครื่อง ขนาด A4 แนวนอน 300dpi โดยประมาณ) */
function CertDownload({ cert, contest }: { cert: { name: string; label: string; title: string }; contest: Contest }) {
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const save = async () => {
    if (!ref.current) return;
    setBusy(true);
    setErr('');
    try {
      const { toPng } = await import('html-to-image');
      const w = ref.current.offsetWidth || 700;
      const url = await toPng(ref.current, { pixelRatio: Math.min(5, 3508 / w), backgroundColor: '#ffffff', cacheBust: true });
      const a = document.createElement('a');
      a.href = url;
      a.download = `เกียรติบัตร-${cert.name}.png`;
      a.click();
    } catch {
      setErr('สร้างรูปไม่สำเร็จ ลองใหม่อีกครั้ง');
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <div ref={ref}>
        <Certificate name={cert.name} label={cert.label} work={cert.title} contest={contest.title} date={fmtDay(contest.ends_at)} />
      </div>
      {err && <p className="mt-2 text-sm font-bold text-rose-600">{err}</p>}
      <button type="button" onClick={save} disabled={busy} className="mt-4 w-full ws-btn bg-[#ffd166] text-[#2a2350]">
        {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />} ดาวน์โหลดเกียรติบัตร (PNG)
      </button>
    </>
  );
}

/** เกียรติบัตร A4 แนวนอน */
function Certificate({ name, label, work, contest, date }: { name: string; label: string; work: string; contest: string; date: string }) {
  return (
    <div className="ws-cert relative aspect-[297/210] w-full bg-white text-[#2a2350] overflow-hidden" style={{ border: '10px solid #7c5cf0', outline: '4px solid #ffd166', outlineOffset: '-22px' }}>
      <svg viewBox="0 0 297 210" className="absolute inset-0 w-full h-full" aria-hidden="true">
        {[...Array(9)].map((_, i) => (
          <circle key={i} cx={20 + i * 32} cy={i % 2 ? 196 : 14} r={i % 2 ? 6 : 4} fill={['#ffb3cf', '#a8f0d4', '#ffe08a'][i % 3]} />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-[10%]">
        <Award className="w-[8%] h-auto text-[#f2a900]" />
        <p className="font-display text-[clamp(1.2rem,4.4vw,2.6rem)] leading-tight mt-1">เกียรติบัตร</p>
        <p className="text-[clamp(0.7rem,1.6vw,1rem)] font-semibold mt-1">มอบให้เพื่อแสดงว่า</p>
        <p className="font-display text-[clamp(1.1rem,3.6vw,2.2rem)] text-[#7c5cf0] mt-1">ครู{name}</p>
        <p className="text-[clamp(0.75rem,1.8vw,1.15rem)] font-extrabold mt-1">ได้รับรางวัล {label}</p>
        <p className="text-[clamp(0.65rem,1.4vw,0.95rem)] font-semibold mt-1">
          ผลงาน &quot;{work}&quot; ในกิจกรรม {contest}
        </p>
        <p className="text-[clamp(0.6rem,1.3vw,0.9rem)] font-semibold mt-3 opacity-80">ให้ไว้ ณ วันที่ {date} · Learn5G</p>
      </div>
    </div>
  );
}
