'use client';

/* eslint-disable @next/next/no-img-element */
import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Check, Compass, Copy, Crown, Eye, FileUp, FolderHeart, Globe, Loader2, Lock, LogIn, MoreVertical, Palette, Pencil, Plus, Search, ShieldCheck, Sparkles, Trash2, Wand2 } from 'lucide-react';
import { Navbar } from '@/components/navbar/Navbar';
import { NightSky } from '@/components/fx/NightSky';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { FREE_DESIGN_LIMIT, creatorTier, setsUsed } from '@/lib/game-creator/quota';
import { cleanTitle, sanitizeQuiz } from '@/lib/game-creator/quiz';
import { mediaPrefix } from '@/lib/game-creator/prefix';
import { quizPages } from '@/lib/studio/fromQuiz';
import { removeMedia } from '@/lib/game-creator/media';
import { gsfx } from '@/lib/game-creator/gsound';
import { blankDesign, designMediaPaths, sanitizeDesign, SIZES, type Design } from '@/lib/studio/doc';
import { TEMPLATES, TEMPLATE_CATS, type Template, type TemplateCat } from '@/components/studio/templates';
import { PageThumb } from '@/components/studio/render';
import { PaperModal } from '@/components/creator/PaperModal';
import { ImportDialog, type ImportHow } from '@/components/studio/ImportDialog';
import { checkImportFile, setPendingImport } from '@/components/studio/importFile';
import { TierCompare } from '@/components/creator/TierCompare';
import { UsageMeter } from '@/components/creator/UsageMeter';
import { JoinButton } from '@/components/membership/JoinButton';
import '@/components/creator/creator.css';
import '@/components/creator/creator-pages.css';
import '@/components/studio/studio-hub.css';

type Tab = 'new' | 'discover' | 'library';
interface DesignRow {
  id: string;
  owner_id: string;
  owner_name: string | null;
  title: string;
  thumb: string | null;
  page_count: number;
  is_public: boolean;
  copy_count: number;
  created_at: string;
  updated_at: string;
}
const COLS = 'id, owner_id, owner_name, title, thumb, page_count, is_public, copy_count, created_at, updated_at';
const PAGE = 24;
const missing = (code?: string) => code === '42P01' || code === 'PGRST205' || code === '42703';

function Cover({ d }: { d: DesignRow }) {
  if (d.thumb && d.thumb.startsWith('data:image/jpeg;base64,')) return <img src={d.thumb} alt="" className="sh-cover-img" loading="lazy" />;
  return (
    <div className="sh-cover-art" aria-hidden="true">
      <Palette className="w-10 h-10" />
    </div>
  );
}

/** แม่แบบทั้งหมด กรองตามหมวด/คำค้น (ทั้งหมด = แบ่งหัวข้อตามหมวด) */
function TemplateGallery({ disabled, creating, onPick }: { disabled: boolean; creating: string | null; onPick: (t: Template) => void }) {
  const [cat, setCat] = useState<TemplateCat | 'all'>('all');
  const [tq, setTq] = useState('');
  const previews = useMemo(() => new Map(TEMPLATES.map((t) => [t.id, t.make()])), []);
  const term = tq.trim().toLowerCase();
  const shown = TEMPLATES.filter((t) => (cat === 'all' || t.cat === cat) && (!term || `${t.label} ${t.note}`.toLowerCase().includes(term)));
  const groups = cat === 'all' && !term ? TEMPLATE_CATS.map((c) => ({ id: c.id, title: c.label, list: shown.filter((t) => t.cat === c.id) })) : [{ id: 'hit', title: '', list: shown }];
  const pick = (c: TemplateCat | 'all') => {
    gsfx.tap();
    setCat(c);
  };
  return (
    <>
      <div className="sh-tpl-bar">
        <div className="sh-cats" role="tablist" aria-label="หมวดแม่แบบ">
          <button type="button" role="tab" aria-selected={cat === 'all'} data-on={cat === 'all'} onClick={() => pick('all')}>
            ทั้งหมด <small>{TEMPLATES.length}</small>
          </button>
          {TEMPLATE_CATS.map((c) => (
            <button key={c.id} type="button" role="tab" aria-selected={cat === c.id} data-on={cat === c.id} onClick={() => pick(c.id)}>
              {c.label} <small>{TEMPLATES.filter((t) => t.cat === c.id).length}</small>
            </button>
          ))}
        </div>
        <label className="l5g-search">
          <Search className="w-4 h-4" />
          <input value={tq} onChange={(e) => setTq(e.target.value)} placeholder="ค้นหาแม่แบบ เช่น เศษส่วน, คัดลายมือ" aria-label="ค้นหาแม่แบบ" />
        </label>
      </div>
      {!shown.length && <p className="sh-tpl-empty">ไม่พบแม่แบบที่ตรงกับ &quot;{tq}&quot;</p>}
      {groups
        .filter((g) => g.list.length)
        .map((g) => (
          <section key={g.id}>
            {g.title && (
              <h3 className="sh-tpl-cat">
                {g.title} <small>{g.list.length} แบบ</small>
              </h3>
            )}
            <div className="grid gap-5 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 mt-4">
              {g.list.map((t, i) => {
                const d = previews.get(t.id)!;
                return (
                  <button key={t.id} type="button" className="sh-tpl" disabled={disabled} onClick={() => onPick(t)} style={{ ['--a' as string]: t.accent, animationDelay: `${Math.min(i, 8) * 60}ms` }}>
                    <span className="sh-tpl-art">
                      <span className="sh-tpl-page">
                        <PageThumb page={d.pages[0]} W={d.size.w} H={d.size.h} width={d.size.w > d.size.h ? 190 : 134} />
                      </span>
                      {d.pages.length > 1 && <span className="sh-tpl-pages">{d.pages.length} หน้า</span>}
                      {creating === `tpl-${t.id}` && (
                        <span className="sh-tpl-busy">
                          <Loader2 className="w-8 h-8 animate-spin" />
                        </span>
                      )}
                    </span>
                    <b>{t.label}</b>
                    <small>{t.note}</small>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
    </>
  );
}

function StudioHub() {
  const { user, profile, isLoading, isDev } = useAuth();
  const tier = creatorTier(!!user, profile);
  const member = tier === 'member';
  const signedIn = tier !== 'guest';
  const router = useRouter();
  const sp = useSearchParams();
  const [tab, setTab] = useState<Tab>(sp.get('tab') === 'library' ? 'library' : sp.get('tab') === 'discover' ? 'discover' : 'new');
  const [mine, setMine] = useState<DesignRow[] | null>(null);
  const [made, setMade] = useState<number | null>(null);
  const [dbMissing, setDbMissing] = useState(false);
  const [gate, setGate] = useState<null | 'guest' | 'limit'>(null);
  const [creating, setCreating] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  const [menu, setMenu] = useState<string | null>(null);
  const [rename, setRename] = useState<DesignRow | null>(null);
  const [renameVal, setRenameVal] = useState('');
  const [del, setDel] = useState<DesignRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [dRows, setDRows] = useState<DesignRow[] | null>(null);
  const [dQ, setDQ] = useState('');
  const [dTerm, setDTerm] = useState('');
  const [dSort, setDSort] = useState<'new' | 'popular'>('new');
  const [dMore, setDMore] = useState(false);
  const [dLoading, setDLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [devAll, setDevAll] = useState(false);

  const used = setsUsed(made, mine?.length ?? 0);
  const atLimit = tier === 'free' && used >= FREE_DESIGN_LIMIT;

  const load = useCallback(async () => {
    if (!signedIn || !user) return;
    const supabase = createClient();
    const { data, error } = await supabase.from('user_designs').select(COLS).eq('owner_id', user.id).order('updated_at', { ascending: false });
    if (error) {
      if (missing(error.code) || /user_designs/.test(error.message)) setDbMissing(true);
      setMine([]);
      return;
    }
    setMine((data || []) as DesignRow[]);
    const { data: me } = await supabase.from('profiles').select('designs_created').eq('id', user.id).maybeSingle();
    setMade(typeof me?.designs_created === 'number' ? me.designs_created : null);
  }, [signedIn, user]);

  useEffect(() => {
    load();
  }, [load]);

  /* ---------------- สร้างสื่อใหม่ ---------------- */
  const create = async (key: string, design: Design, title: string, pend?: { file: File; how: ImportHow }) => {
    gsfx.pick();
    if (tier === 'guest' || !user) return setGate('guest');
    if (atLimit) return setGate('limit');
    setCreating(key);
    setErr('');
    const { data, error } = await createClient()
      .from('user_designs')
      .insert({ owner_id: user.id, title: cleanTitle(title) || 'สื่อใหม่', content: design, page_count: design.pages.length, is_public: true })
      .select('id')
      .single();
    if (error || !data) {
      setCreating(null);
      if (/free design limit/i.test(error?.message || '')) return setGate('limit');
      if (missing(error?.code) || /user_designs/.test(error?.message || '')) return setDbMissing(true);
      return setErr('สร้างสื่อไม่สำเร็จ ลองใหม่อีกครั้ง');
    }
    // ไฟล์ที่นำเข้าส่งต่อให้ตัวแก้ไขแปลง (รูปในไฟล์อัปโหลดหลังสร้างสื่อสำเร็จแล้วเท่านั้น)
    if (pend) setPendingImport(pend);
    router.push(`/studio/edit?id=${data.id}`);
  };
  const [importDlg, setImportDlg] = useState(false);
  const startImport = async (file: File, how: ImportHow) => {
    setImportDlg(false);
    const bad = await checkImportFile(file);
    if (bad) return setErr(bad);
    const d = blankDesign();
    create('import', how === 'flow' ? { ...d, mode: 'word' } : d, file.name.replace(/\.[^.]+$/, '') || 'สื่อนำเข้า', { file, how });
  };

  /* ---------------- ทำใบงานจากชุดคำถาม (/studio?fromSet=<id> จากหน้าชุดคำถาม) ---------------- */
  const fromSet = useRef(sp.get('fromSet'));
  useEffect(() => {
    const sid = fromSet.current;
    if (!sid || isLoading || creating) return;
    if (!user) return setGate('guest');
    if (mine === null) return;
    fromSet.current = null;
    window.history.replaceState(null, '', '/studio');
    if (!/^[0-9a-f-]{36}$/i.test(sid)) return;
    (async () => {
      setCreating('set');
      const { data } = await createClient().from('user_games').select('title, content').eq('id', sid).maybeSingle();
      setCreating(null);
      if (!data) return setErr('เปิดชุดคำถามนี้ไม่ได้ อาจถูกลบหรือตั้งเป็น Private');
      const d = blankDesign();
      const pages = quizPages(data.title, sanitizeQuiz(data.content, mediaPrefix()), d.size.w, d.size.h, { answers: true, header: true });
      if (!pages.length) return setErr('ชุดคำถามนี้ยังไม่มีข้อคำถาม');
      create('set', { ...d, pages }, `ใบงาน ${data.title}`);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, user, mine]);

  /* ---------------- Discover ---------------- */
  useEffect(() => {
    const t = setTimeout(() => setDTerm(dQ), 300);
    return () => clearTimeout(t);
  }, [dQ]);

  const loadDiscover = useCallback(
    async (from: number) => {
      if (!member) return;
      setDLoading(true);
      let query = createClient()
        .from('user_designs')
        .select(COLS)
        .order(dSort === 'popular' ? 'copy_count' : 'created_at', { ascending: false })
        .range(from, from + PAGE - 1);
      const term = dTerm.replace(/[,()%*\\"]/g, ' ').replace(/\s+/g, ' ').trim();
      if (!(isDev && devAll)) query = query.eq('is_public', true);
      if (term) query = query.or(`title.ilike."%${term}%",owner_name.ilike."%${term}%"`);
      const { data, error } = await query;
      setDLoading(false);
      if (error) {
        if (missing(error.code)) setDbMissing(true);
        setDRows((old) => (from ? old : []));
        return;
      }
      const rows = (data || []) as DesignRow[];
      setDMore(rows.length === PAGE);
      setDRows((old) => (from && old ? [...old, ...rows] : rows));
    },
    [member, dTerm, dSort, isDev, devAll]
  );
  useEffect(() => {
    if (tab === 'discover') loadDiscover(0);
  }, [tab, loadDiscover]);

  const copyRow = async (d: DesignRow, toast = true) => {
    if (!user || busy) return;
    if (atLimit) return setGate('limit');
    setBusy(true);
    const supabase = createClient();
    const { data: full } = await supabase.from('user_designs').select('content, thumb').eq('id', d.id).maybeSingle();
    if (full) {
      const content = sanitizeDesign(full.content);
      const { error } = await supabase.from('user_designs').insert({
        owner_id: user.id,
        title: cleanTitle(`${d.title} (สำเนา)`),
        content,
        thumb: full.thumb,
        page_count: content.pages.length,
        is_public: d.owner_id === user.id ? d.is_public : false,
      });
      if (!error) {
        gsfx.join();
        if (d.owner_id !== user.id) supabase.rpc('design_copied', { p_id: d.id }).then(() => undefined);
        if (toast) {
          setCopied(d.id);
          setTimeout(() => setCopied(null), 2800);
        }
        load();
      } else if (/free design limit/i.test(error.message || '')) setGate('limit');
    }
    setBusy(false);
  };

  const togglePublic = async (d: DesignRow) => {
    gsfx.tap();
    const next = !d.is_public;
    setMine((old) => (old ? old.map((x) => (x.id === d.id ? { ...x, is_public: next } : x)) : old));
    const { error } = await createClient().from('user_designs').update({ is_public: next }).eq('id', d.id);
    if (error) load();
  };

  const doRename = async () => {
    if (!rename) return;
    const t = cleanTitle(renameVal);
    if (!t) return;
    setBusy(true);
    await createClient().from('user_designs').update({ title: t }).eq('id', rename.id);
    setBusy(false);
    setRename(null);
    load();
  };

  const doDelete = async () => {
    if (!del || !user) return;
    setBusy(true);
    const supabase = createClient();
    const mineRow = del.owner_id === user.id;
    const { data: all } = mineRow ? await supabase.from('user_designs').select('id, content').eq('owner_id', user.id) : { data: null };
    const { error } = await supabase.from('user_designs').delete().eq('id', del.id);
    if (!error && all && !del.is_public) {
      // ลบรูปที่ไม่มีสื่ออื่นของเราใช้แล้ว (สื่อ Public ไม่ลบรูป เพราะคนอื่นอาจทำสำเนาไปใช้อยู่)
      const keep = new Set(all.filter((x) => x.id !== del.id).flatMap((x) => designMediaPaths(sanitizeDesign(x.content))));
      const target = all.find((x) => x.id === del.id);
      if (target) await removeMedia(designMediaPaths(sanitizeDesign(target.content)).filter((p) => !keep.has(p) && p.startsWith(`${user.id}/`)));
    }
    setBusy(false);
    setDel(null);
    load();
    if (tab === 'discover') loadDiscover(0);
  };

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!(e.target as Element | null)?.closest?.('[data-menu-root]')) setMenu(null);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  const shown = useMemo(() => (mine || []).filter((g) => !q.trim() || g.title.toLowerCase().includes(q.trim().toLowerCase())), [mine, q]);

  const switchTab = (t: Tab) => {
    gsfx.tap();
    setTab(t);
    const u = new URL(window.location.href);
    if (t === 'new') u.searchParams.delete('tab');
    else u.searchParams.set('tab', t);
    window.history.replaceState(null, '', u.toString());
  };


  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="l5g-world flex-1">
        <NightSky />
        <span className="l5g-bg-cloud" style={{ top: '7%', animationDelay: '-20s' }} />
        <span className="l5g-bg-cloud" style={{ top: '40%', animationDelay: '-55s', ['--s' as string]: 0.7 }} />

        <section className="max-w-6xl mx-auto px-4 pt-6 sm:pt-10 pb-4 text-center relative">
          <span className="l5g-chip-head sh-chip">
            <Palette className="w-4 h-4" /> ระบบสร้างสื่อการสอน
          </span>
          <h1 className="l5g-hero-title">
            ออกแบบสื่อการสอนในแบบของคุณ
            <br />
            <span>ใบงาน ใบความรู้ ป้าย เกียรติบัตร</span>
          </h1>
          <p className="l5g-hero-sub">ลากวางได้อิสระ ฟอนต์ไทยสวย สติกเกอร์ รูปทรง ตาราง บรรทัดเขียน QR Code แล้วโหลดเป็นรูปหรือ PDF พร้อมพิมพ์</p>
        </section>

        {isLoading ? (
          <div className="max-w-md mx-auto px-4 pb-16">
            <div className="l5g-card l5g-card-pad text-center font-bold">กำลังโหลด…</div>
          </div>
        ) : (
          <>
            <div className="max-w-6xl mx-auto px-4">
              <div className="l5g-seg" role="tablist">
                <button type="button" role="tab" aria-selected={tab === 'new'} data-on={tab === 'new'} onClick={() => switchTab('new')}>
                  <Sparkles className="w-5 h-5" /> สร้างสื่อ
                </button>
                <button type="button" role="tab" aria-selected={tab === 'discover'} data-on={tab === 'discover'} data-kind="discover" onClick={() => switchTab('discover')}>
                  <Compass className="w-5 h-5" /> Discover
                </button>
                <button type="button" role="tab" aria-selected={tab === 'library'} data-on={tab === 'library'} onClick={() => switchTab('library')}>
                  <FolderHeart className="w-5 h-5" /> คลังของฉัน
                  {mine && mine.length > 0 && <span className="l5g-seg-count">{mine.length}</span>}
                </button>
              </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 mt-4 flex flex-col gap-3">
              {tier === 'guest' ? (
                <div className="l5g-tierbar">
                  <Lock className="w-5 h-5 shrink-0" />
                  <span className="flex-1 min-w-[200px]">ยังไม่ได้เข้าสู่ระบบ ดูระบบได้ แต่ต้องมีบัญชีก่อนจึงจะสร้างสื่อได้ (บัญชีฟรีสร้างได้ {FREE_DESIGN_LIMIT} สื่อ)</span>
                  <Link href="/signup?redirect=/studio" className="l5g-btn l5g-btn-mint l5g-btn-sm">
                    สมัครบัญชีฟรี
                  </Link>
                  <Link href="/login?redirect=/studio" className="l5g-btn l5g-btn-ghost l5g-btn-sm">
                    เข้าสู่ระบบ
                  </Link>
                </div>
              ) : (
                <>
                  {tier === 'free' && (
                    <div className="l5g-tierbar">
                      <Sparkles className="w-5 h-5 shrink-0" />
                      <span className="flex-1 min-w-[200px]">
                        บัญชีฟรี: สร้างสื่อไปแล้ว <b>{mine ? used : '-'}</b> / {FREE_DESIGN_LIMIT} สื่อ (ตลอดอายุบัญชี ลบแล้วสิทธิ์ไม่คืน) สมาชิกสร้างได้ไม่จำกัด
                      </span>
                      <JoinButton className="l5g-btn l5g-btn-go l5g-btn-sm">
                        <Crown className="w-4 h-4" /> สมัครสมาชิก
                      </JoinButton>
                    </div>
                  )}
                  <UsageMeter compact />
                </>
              )}
              {err && <div className="l5g-tierbar">{err}</div>}
              {creating === 'set' && (
                <div className="l5g-tierbar">
                  <Loader2 className="w-5 h-5 animate-spin" /> กำลังทำใบงานจากชุดคำถาม…
                </div>
              )}
            </div>

            {dbMissing && (
              <div className="max-w-3xl mx-auto px-4 mt-4">
                <div className="l5g-card l5g-card-pad text-center font-bold">ระบบสร้างสื่อยังไม่พร้อมใช้งาน (ผู้ดูแลต้องติดตั้งฐานข้อมูล migration 023)</div>
              </div>
            )}

            {tab === 'new' ? (
              <section className="max-w-6xl mx-auto px-4 pt-6 pb-12">
                <h2 className="l5g-sec-title">1. เลือกขนาดกระดาษ</h2>
                <p className="l5g-sec-note">เริ่มจากหน้าว่าง ค่าเริ่มต้นคือ A4 แนวตั้ง เปลี่ยนขนาดทีหลังได้ในตัวแก้ไข</p>
                <div className="sh-sizes mt-4" data-tour="studio-sizes">
                  {SIZES.map((s, i) => (
                    <button key={s.id} type="button" className="sh-size" data-main={i === 0} disabled={!!creating || dbMissing} onClick={() => create(`size-${s.id}`, blankDesign(s), 'สื่อใหม่')} style={{ animationDelay: `${i * 50}ms` }}>
                      <span className="sh-size-box">
                        <span className="sh-paper" style={{ aspectRatio: `${s.w} / ${s.h}`, [s.w >= s.h ? 'width' : 'height']: '100%' }}>
                          {creating === `size-${s.id}` ? <Loader2 className="w-6 h-6 animate-spin" /> : <Plus className="w-7 h-7" strokeWidth={3} />}
                        </span>
                      </span>
                      <b>{s.label}</b>
                      <small>{s.note}</small>
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  className="sh-import mt-6"
                  disabled={!!creating || dbMissing}
                  onClick={() => {
                    gsfx.tap();
                    if (tier === 'guest' || !user) return setGate('guest');
                    if (atLimit) return setGate('limit');
                    setImportDlg(true);
                  }}
                >
                  <span className="sh-import-ic">{creating === 'import' ? <Loader2 className="w-7 h-7 animate-spin" /> : <FileUp className="w-7 h-7" />}</span>
                  <span className="sh-import-tx">
                    <b>หรือนำเข้าไฟล์ Word / PDF ที่มีอยู่แล้ว</b>
                    <small>สมการใน Word และ MathType กลายเป็นสมการของเว็บ แก้ต่อได้ทันที · รองรับ .docx .pdf .txt .md .html</small>
                  </span>
                </button>

                <h2 className="l5g-sec-title mt-10">2. หรือเริ่มจากแม่แบบ</h2>
                <p className="l5g-sec-note">มีของจัดวางไว้ให้แล้ว แก้คำ เปลี่ยนสี ย้ายตำแหน่งได้ทุกชิ้น</p>
                <TemplateGallery disabled={!!creating || dbMissing} creating={creating} onPick={(t) => create(`tpl-${t.id}`, t.make(), t.label)} />

                <div className="sh-features mt-10">
                  {[
                    ['ฟอนต์ไทย 12 แบบ', 'หัวเรื่อง ลายมือ ตัวเขียนสวย อักษรศิลป์'],
                    ['สติกเกอร์และรูปทรง', 'กว่า 70 แบบ จัดหมวดชัดเจน'],
                    ['เครื่องมือใบงาน', 'บรรทัด 4 เส้น ตาราง กรอบคำตอบ เลขข้อ'],
                    ['โหลดได้ทันที', 'PDF พร้อมพิมพ์ หรือรูป PNG คมชัด'],
                  ].map(([a, b]) => (
                    <div key={a} className="sh-feat">
                      <Check className="w-5 h-5" strokeWidth={3} />
                      <div>
                        <b>{a}</b>
                        <small>{b}</small>
                      </div>
                    </div>
                  ))}
                </div>

                {!member && (
                  <div className="mt-10">
                    <h2 className="l5g-sec-title">สมัครสมาชิก กับ ไม่สมัคร ต่างกันยังไง</h2>
                    <TierCompare className="mt-4 max-w-3xl" />
                    <div className="mt-4 flex flex-wrap gap-3">
                      {tier === 'guest' && (
                        <Link href="/signup?redirect=/studio" className="l5g-btn l5g-btn-mint">
                          <Sparkles className="w-5 h-5" /> สมัครบัญชีฟรี
                        </Link>
                      )}
                      <JoinButton className="l5g-btn l5g-btn-go">
                        <Crown className="w-5 h-5" /> สมัครสมาชิก
                      </JoinButton>
                    </div>
                  </div>
                )}
              </section>
            ) : tab === 'discover' && !member ? (
              <section className="max-w-3xl mx-auto px-4 pt-6 pb-10">
                <div className="l5g-card l5g-gate">
                  <div className="l5g-gate-art" aria-hidden="true">
                    <span className="l5g-gate-lock">
                      <Lock className="w-12 h-12" />
                    </span>
                  </div>
                  <h2 className="font-display text-2xl sm:text-3xl">ต้องสมัครสมาชิกก่อน</h2>
                  <p className="font-semibold opacity-80 mt-1">สื่อของครูท่านอื่นเปิดดู ดาวน์โหลด และทำสำเนาไปแก้ได้เฉพาะสมาชิก</p>
                  <TierCompare className="mt-5 text-left" />
                  <div className="mt-5 flex flex-wrap justify-center gap-3">
                    <JoinButton className="l5g-btn l5g-btn-go">
                      <Crown className="w-5 h-5" /> สมัครสมาชิก
                    </JoinButton>
                    {tier === 'guest' && (
                      <Link href="/login?redirect=/studio" className="l5g-btn l5g-btn-ghost">
                        <LogIn className="w-5 h-5" /> เข้าสู่ระบบ
                      </Link>
                    )}
                  </div>
                </div>
              </section>
            ) : tab === 'discover' ? (
              <section className="max-w-6xl mx-auto px-4 pt-6 pb-10">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="l5g-sec-title">Discover</h2>
                  <span className="l5g-sec-sub">สื่อที่ครูเปิด Public</span>
                  <span className="flex-1" />
                  {isDev && (
                    <button type="button" className="l5g-chipbtn l5g-devchip" data-on={devAll} onClick={() => (gsfx.tap(), setDevAll(!devAll))} title="Dev: แสดงสื่อทั้งหมดรวม Private">
                      <ShieldCheck className="w-4 h-4 inline -mt-0.5" /> Dev: ทั้งหมด
                    </button>
                  )}
                  <div className="l5g-chips">
                    <button type="button" className="l5g-chipbtn" data-on={dSort === 'new'} onClick={() => (gsfx.tap(), setDSort('new'))}>
                      ใหม่ล่าสุด
                    </button>
                    <button type="button" className="l5g-chipbtn" data-on={dSort === 'popular'} onClick={() => (gsfx.tap(), setDSort('popular'))}>
                      ยอดนิยม
                    </button>
                  </div>
                </div>
                <label className="l5g-search l5g-search-wide mt-4">
                  <Search className="w-5 h-5" />
                  <input value={dQ} onChange={(e) => setDQ(e.target.value)} placeholder="ค้นหาชื่อสื่อ หรือชื่อครูผู้สร้าง" aria-label="ค้นหาใน Discover" />
                  {dQ && (
                    <button type="button" onClick={() => setDQ('')} aria-label="ล้างคำค้นหา">
                      &times;
                    </button>
                  )}
                </label>
                {dRows === null ? (
                  <div className="sh-grid mt-5">
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i} className="l5g-gcard l5g-skel" />
                    ))}
                  </div>
                ) : dRows.length === 0 ? (
                  <div className="l5g-card l5g-empty mt-5">
                    <h3 className="font-display text-2xl">{dTerm ? 'ไม่พบสื่อที่ค้นหา' : 'ยังไม่มีสื่อ Public'}</h3>
                    <p className="font-semibold opacity-75">{dTerm ? 'ลองคำอื่น หรือชื่อผู้สร้าง' : 'สร้างสื่อแล้วตั้งเป็น Public จะมาโชว์ที่นี่'}</p>
                  </div>
                ) : (
                  <>
                    <div className="sh-grid mt-5">
                      {dRows.map((d, i) => {
                        const own = d.owner_id === user?.id;
                        return (
                          <article key={d.id} className="l5g-gcard sh-card" style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}>
                            <Link href={`/studio/edit?id=${d.id}`} className="sh-cover" aria-label={`เปิด ${d.title}`}>
                              <Cover d={d} />
                              <span className="l5g-gcover-count">{d.page_count} หน้า</span>
                            </Link>
                            <div className="p-3 flex flex-col gap-1 flex-1">
                              <h3 className="font-display text-base leading-snug break-words line-clamp-2">{d.title}</h3>
                              <p className="l5g-owner">
                                <span className="l5g-owner-dot">{(d.owner_name || '?').slice(0, 1).toUpperCase()}</span>
                                <span className="truncate">{own ? 'สื่อของฉัน' : d.owner_name || 'สมาชิก'}</span>
                                {!d.is_public && <span className="l5g-privtag">Private</span>}
                              </p>
                              <div className="flex-1" />
                              <div className="flex gap-2 mt-2">
                                <Link href={`/studio/edit?id=${d.id}`} className="l5g-btn l5g-btn-ghost l5g-btn-sm flex-1">
                                  {own ? <Pencil className="w-4 h-4" /> : <Eye className="w-4 h-4" />} {own ? 'แก้ไข' : 'เปิดดู'}
                                </Link>
                                {!own && (
                                  <button type="button" className="l5g-btn l5g-btn-violet l5g-btn-sm" disabled={busy || copied === d.id} onClick={() => copyRow(d)} title="ทำสำเนาไปแก้ไขในคลังของฉัน">
                                    {copied === d.id ? <Check className="w-4 h-4" strokeWidth={4} /> : <Copy className="w-4 h-4" />}
                                    <span className="max-[420px]:hidden">{copied === d.id ? 'ได้แล้ว' : 'สำเนา'}</span>
                                  </button>
                                )}
                                {isDev && !own && (
                                  <button type="button" className="l5g-btn l5g-btn-coral l5g-btn-sm" onClick={() => setDel(d)} title="Dev: ลบสื่อนี้" aria-label="ลบสื่อนี้">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                    {dMore && (
                      <div className="flex justify-center mt-6">
                        <button type="button" className="l5g-btn l5g-btn-violet" disabled={dLoading} onClick={() => loadDiscover(dRows.length)}>
                          {dLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" strokeWidth={3} />} ดูเพิ่ม
                        </button>
                      </div>
                    )}
                  </>
                )}
              </section>
            ) : (
              <section className="max-w-6xl mx-auto px-4 pt-6 pb-10">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="l5g-sec-title">คลังสื่อของฉัน</h2>
                  <span className="flex-1" />
                  {mine && mine.length > 3 && (
                    <label className="l5g-search">
                      <Search className="w-4 h-4" />
                      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาชื่อสื่อ" aria-label="ค้นหาชื่อสื่อ" />
                    </label>
                  )}
                  <button type="button" className="l5g-btn l5g-btn-violet l5g-btn-sm" onClick={() => switchTab('new')}>
                    <Plus className="w-4 h-4" strokeWidth={3} /> สื่อใหม่
                  </button>
                </div>

                {!signedIn ? (
                  <div className="l5g-card l5g-gate mt-5">
                    <div className="l5g-gate-art" aria-hidden="true">
                      <span className="l5g-gate-lock">
                        <Lock className="w-12 h-12" />
                      </span>
                    </div>
                    <h3 className="font-display text-2xl">ต้องมีบัญชีก่อน</h3>
                    <p className="font-semibold opacity-80 mt-1">เข้าสู่ระบบหรือสมัครบัญชีฟรีเพื่อมีคลังสื่อของตัวเอง</p>
                    <div className="mt-5 flex flex-wrap justify-center gap-3">
                      <Link href="/signup?redirect=/studio" className="l5g-btn l5g-btn-mint">
                        <Sparkles className="w-5 h-5" /> สมัครบัญชีฟรี
                      </Link>
                      <Link href="/login?redirect=/studio" className="l5g-btn l5g-btn-ghost">
                        <LogIn className="w-5 h-5" /> เข้าสู่ระบบ
                      </Link>
                    </div>
                  </div>
                ) : mine === null ? (
                  <div className="sh-grid mt-5">
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i} className="l5g-gcard l5g-skel" />
                    ))}
                  </div>
                ) : mine.length === 0 ? (
                  <div className="l5g-card l5g-empty mt-5">
                    <span className="sh-empty-ic">
                      <Palette className="w-10 h-10" />
                    </span>
                    <h3 className="font-display text-2xl">ยังไม่มีสื่อในคลัง</h3>
                    <p className="font-semibold opacity-75">เลือกขนาดกระดาษหรือแม่แบบเพื่อสร้างสื่อชิ้นแรก</p>
                    <button type="button" className="l5g-btn l5g-btn-go mt-4" onClick={() => switchTab('new')}>
                      <Wand2 className="w-5 h-5" /> สร้างสื่อชิ้นแรก
                    </button>
                  </div>
                ) : (
                  <div className="sh-grid mt-5">
                    {shown.map((d, i) => (
                      <article key={d.id} className="l5g-gcard sh-card" data-menu={menu === d.id} style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}>
                        <Link href={`/studio/edit?id=${d.id}`} className="sh-cover" aria-label={`แก้ไข ${d.title}`}>
                          <Cover d={d} />
                          <span className="l5g-gcover-count">{d.page_count} หน้า</span>
                        </Link>
                        <button
                          type="button"
                          className="l5g-vis-badge"
                          data-public={d.is_public}
                          onClick={() => togglePublic(d)}
                          title={d.is_public ? 'Public: แตะเพื่อเปลี่ยนเป็น Private' : 'Private: แตะเพื่อเปลี่ยนเป็น Public'}
                        >
                          {d.is_public ? <Globe className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                          {d.is_public ? 'Public' : 'Private'}
                        </button>
                        <div className="p-3 flex flex-col gap-1 flex-1">
                          <div className="flex items-start gap-2">
                            <h3 className="font-display text-base leading-snug flex-1 min-w-0 break-words line-clamp-2">{d.title}</h3>
                            <div className="relative" data-menu-root>
                              <button
                                type="button"
                                className="l5g-icon-btn"
                                style={{ width: 32, height: 32, borderRadius: 10 }}
                                aria-label="ตัวเลือกเพิ่มเติม"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setMenu(menu === d.id ? null : d.id);
                                }}
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>
                              {menu === d.id && (
                                <div className="l5g-menu" onClick={(e) => e.stopPropagation()}>
                                  <button type="button" onClick={() => (setMenu(null), setRename(d), setRenameVal(d.title))}>
                                    <Pencil className="w-4 h-4" /> เปลี่ยนชื่อ
                                  </button>
                                  <button type="button" disabled={busy} onClick={() => (setMenu(null), copyRow(d, false))}>
                                    <Copy className="w-4 h-4" /> ทำสำเนา
                                  </button>
                                  <button type="button" className="l5g-menu-danger" onClick={() => (setMenu(null), setDel(d))}>
                                    <Trash2 className="w-4 h-4" /> ลบสื่อ
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                          <p className="text-xs font-bold opacity-60">แก้ไข {new Date(d.updated_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}</p>
                          <div className="flex-1" />
                          <Link href={`/studio/edit?id=${d.id}`} className="l5g-btn l5g-btn-go l5g-btn-sm mt-2">
                            <Pencil className="w-4 h-4" /> แก้ไข / ดาวน์โหลด
                          </Link>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </main>

      {gate && (
        <PaperModal title={gate === 'guest' ? 'ต้องมีบัญชีก่อน' : 'ต้องสมัครสมาชิกก่อน'} icon={<Lock className="w-5 h-5" />} iconBg="#ff9a3d" onClose={() => setGate(null)} width={560}>
          <p className="font-semibold">
            {gate === 'guest'
              ? `ยังไม่ได้เข้าสู่ระบบ สมัครบัญชีฟรีเพื่อลองสร้างสื่อได้ ${FREE_DESIGN_LIMIT} สื่อตลอดอายุบัญชี หรือสมัครสมาชิกเพื่อสร้างได้ไม่จำกัด`
              : `บัญชีฟรีสร้างสื่อได้ ${FREE_DESIGN_LIMIT} สื่อตลอดอายุบัญชี และคุณใช้สิทธิ์แล้ว การลบสื่อเดิมไม่คืนสิทธิ์ให้ ถ้าอยากสร้างเพิ่มต้องสมัครสมาชิก (แก้ไขสื่อเดิมได้ตามปกติ)`}
          </p>
          <TierCompare className="mt-3" />
          <div className="l5g-math-foot">
            <span className="flex-1" />
            {gate === 'guest' ? (
              <>
                <Link href="/login?redirect=/studio" className="l5g-btn l5g-btn-ghost">
                  <LogIn className="w-5 h-5" /> เข้าสู่ระบบ
                </Link>
                <Link href="/signup?redirect=/studio" className="l5g-btn l5g-btn-mint">
                  <Sparkles className="w-5 h-5" /> สมัครบัญชีฟรี
                </Link>
              </>
            ) : (
              <button
                type="button"
                className="l5g-btn l5g-btn-ghost"
                onClick={() => {
                  setGate(null);
                  switchTab('library');
                }}
              >
                <FolderHeart className="w-5 h-5" /> ไปที่คลังของฉัน
              </button>
            )}
            <JoinButton className="l5g-btn l5g-btn-go">
              <Crown className="w-5 h-5" /> สมัครสมาชิก
            </JoinButton>
          </div>
        </PaperModal>
      )}

      {importDlg && <ImportDialog onPick={startImport} onClose={() => setImportDlg(false)} />}
      {rename && (
        <PaperModal title="เปลี่ยนชื่อสื่อ" icon={<Pencil className="w-5 h-5" />} onClose={() => setRename(null)} busy={busy}>
          <input className="l5g-input" value={renameVal} maxLength={80} autoFocus onChange={(e) => setRenameVal(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && doRename()} />
          <div className="l5g-math-foot">
            <span className="flex-1" />
            <button type="button" className="l5g-btn l5g-btn-ghost" onClick={() => setRename(null)}>
              ยกเลิก
            </button>
            <button type="button" className="l5g-btn l5g-btn-go" disabled={busy || !cleanTitle(renameVal)} onClick={doRename}>
              บันทึก
            </button>
          </div>
        </PaperModal>
      )}

      {del && (
        <PaperModal title="ลบสื่อนี้?" icon={<Trash2 className="w-5 h-5" />} iconBg="#ff6b7a" onClose={() => setDel(null)} busy={busy}>
          <p className="font-semibold">&quot;{del.title}&quot; จะถูกลบถาวร</p>
          {tier === 'free' && !isDev && (
            <p className="mt-2 rounded-xl border-2 border-[#2a2350] bg-[#ffe1e5] px-3 py-2 text-sm font-bold">
              บัญชีฟรีสร้างได้ {FREE_DESIGN_LIMIT} สื่อตลอดอายุบัญชี ลบแล้วสิทธิ์ไม่คืนและสร้างใหม่แทนไม่ได้ ถ้าแค่อยากเริ่มใหม่ ให้เปิดสื่อเดิมแล้วลบของบนหน้าแทน
            </p>
          )}
          <div className="l5g-math-foot">
            <span className="flex-1" />
            <button type="button" className="l5g-btn l5g-btn-ghost" onClick={() => setDel(null)} disabled={busy}>
              ยกเลิก
            </button>
            <button type="button" className="l5g-btn l5g-btn-coral" onClick={doDelete} disabled={busy}>
              <Trash2 className="w-5 h-5" /> ลบเลย
            </button>
          </div>
        </PaperModal>
      )}
    </div>
  );
}

export default function StudioPage() {
  return (
    <Suspense fallback={null}>
      <StudioHub />
    </Suspense>
  );
}
