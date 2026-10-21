'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { NightSky } from '@/components/fx/NightSky';
import { useRouter, useSearchParams } from 'next/navigation';
import { Check, Compass, Copy, Crown, DoorOpen, FileText, FolderHeart, Globe, Loader2, Lock, LogIn, MoreVertical, Pencil, Play, Plus, Rocket, Search, Sparkles, Trash2, Wand2 } from 'lucide-react';
import { Navbar } from '@/components/navbar/Navbar';
import { useAuth } from '@/context/AuthContext';
import { ShieldCheck } from 'lucide-react';
import { FREE_SET_LIMIT, creatorTier, setsUsed } from '@/lib/game-creator/quota';
import { TierCompare } from '@/components/creator/TierCompare';
import { UsageMeter } from '@/components/creator/UsageMeter';
import { createClient } from '@/lib/supabase/client';
import { MODES } from '@/lib/game-creator/modes';
import { ModeArt } from '@/components/creator/games/ModeArt';
import { cleanTitle, mediaPaths, sanitizeQuiz } from '@/lib/game-creator/quiz';
import { mediaPrefix, removeMedia } from '@/lib/game-creator/media';
import type { UserGameSummary } from '@/lib/game-creator/types';
import { gsfx } from '@/lib/game-creator/gsound';
import { ChoiceShape, choiceStyle } from '@/components/creator/ChoiceShape';
import { OpenGameModal } from '@/components/creator/OpenGameModal';
import { PaperModal } from '@/components/creator/PaperModal';
import '@/components/creator/creator.css';
import '@/components/creator/creator-pages.css';
import { JoinButton } from '@/components/membership/JoinButton';
import { OfferBanner } from '@/components/membership/Pricing';
import { SocialProof } from '@/components/membership/SocialProof';

type Tab = 'new' | 'discover' | 'library';
const GAME_COLS = 'id, owner_id, owner_name, title, template, question_count, play_count, cover_url, is_public, created_at, updated_at';
const PAGE = 24;
interface ActiveRoom {
  id: string;
  game_id: string | null;
  code: string;
  status: string;
}

const COVER_COLORS = ['#9b6cf0', '#4a7bf0', '#ff6b7a', '#3fd6a8', '#ff9a3d', '#4fb3ff'];
const hashIdx = (s: string, n: number) => Array.from(s).reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7) % n;

function GameCover({ game }: { game: UserGameSummary }) {
  const c = COVER_COLORS[hashIdx(game.id, COVER_COLORS.length)];
  if (game.cover_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={game.cover_url} alt="" className="l5g-gcover-img" loading="lazy" />;
  }
  return (
    <div className="l5g-gcover-art" style={{ background: `linear-gradient(135deg, ${c}, color-mix(in srgb, ${c} 55%, #fff))` }}>
      {[0, 1, 2, 3].map((i) => (
        <span key={i} className="l5g-gcover-shape" style={{ ['--i' as string]: i }}>
          <ChoiceShape i={(i + hashIdx(game.id, 6)) % 6} size={30} />
        </span>
      ))}
      <span className="l5g-gcover-q">?</span>
    </div>
  );
}

function CreateHub() {
  const { user, profile, isLoading, isDev } = useAuth();
  const tier = creatorTier(!!user, profile);
  const member = tier === 'member';
  const signedIn = tier !== 'guest';
  const router = useRouter();
  const sp = useSearchParams();
  const [tab, setTab] = useState<Tab>(sp.get('tab') === 'library' ? 'library' : sp.get('tab') === 'discover' ? 'discover' : 'new');
  const [games, setGames] = useState<UserGameSummary[] | null>(null);
  const [rooms, setRooms] = useState<ActiveRoom[]>([]);
  const [dbMissing, setDbMissing] = useState(false);
  /** หน้าต่างแจ้งว่าต้องสมัครสมาชิก: guest = ยังไม่ล็อกอิน / limit = บัญชีฟรีครบ 2 ชุด */
  const [gate, setGate] = useState<null | 'guest' | 'limit'>(sp.get('gate') === 'guest' ? 'guest' : sp.get('gate') === 'limit' ? 'limit' : null);
  const [q, setQ] = useState('');
  const [menu, setMenu] = useState<string | null>(null);
  const [openGame, setOpenGame] = useState<UserGameSummary | null>(null);
  const [rename, setRename] = useState<UserGameSummary | null>(null);
  const [renameVal, setRenameVal] = useState('');
  const [del, setDel] = useState<UserGameSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [dGames, setDGames] = useState<UserGameSummary[] | null>(null);
  const [dQ, setDQ] = useState('');
  const [dTerm, setDTerm] = useState('');
  const [dSort, setDSort] = useState<'new' | 'popular'>('new');
  const [dMore, setDMore] = useState(false);
  const [dLoading, setDLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [devAll, setDevAll] = useState(false);

  // บัญชีฟรี: นับชุดที่เคยสร้างทั้งหมด (ลบแล้วไม่คืนสิทธิ์)
  const [made, setMade] = useState<number | null>(null);
  const used = setsUsed(made, games?.length ?? 0);
  const atLimit = tier === 'free' && used >= FREE_SET_LIMIT;

  const load = useCallback(async () => {
    if (!signedIn || !user) return;
    const supabase = createClient();
    const { data, error } = await supabase
      .from('user_games')
      .select(GAME_COLS)
      .eq('owner_id', user.id)
      .order('updated_at', { ascending: false });
    if (error) {
      if (error.code === '42P01' || error.code === 'PGRST205') setDbMissing(true);
      setGames([]);
      return;
    }
    setGames((data || []) as UserGameSummary[]);
    const { data: me } = await supabase.from('profiles').select('games_created').eq('id', user.id).maybeSingle();
    setMade(typeof me?.games_created === 'number' ? me.games_created : null);
    const { data: r } = await supabase.from('game_rooms').select('id, game_id, code, status').neq('status', 'closed').order('created_at', { ascending: false });
    setRooms((r || []) as ActiveRoom[]);
  }, [signedIn, user]);

  useEffect(() => {
    load();
  }, [load]);

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
        .from('user_games')
        .select(GAME_COLS)
        .order(dSort === 'popular' ? 'play_count' : 'updated_at', { ascending: false })
        .range(from, from + PAGE - 1);
      const term = dTerm.replace(/[,()%*\\"]/g, ' ').replace(/\s+/g, ' ').trim();
      // Dev เปิดดูทั้งหมดได้ (รวม Private) เพื่อดูแล/ลบ
      if (!(isDev && devAll)) query = query.eq('is_public', true);
      if (term) query = query.or(`title.ilike."%${term}%",owner_name.ilike."%${term}%"`);
      const { data, error } = await query;
      setDLoading(false);
      if (error) {
        if (error.code === '42P01' || error.code === 'PGRST205' || error.code === '42703') setDbMissing(true);
        setDGames((old) => (from ? old : []));
        return;
      }
      const rows = (data || []) as UserGameSummary[];
      setDMore(rows.length === PAGE);
      setDGames((old) => (from && old ? [...old, ...rows] : rows));
    },
    [member, dTerm, dSort, isDev, devAll]
  );

  useEffect(() => {
    if (tab === 'discover') loadDiscover(0);
  }, [tab, loadDiscover]);

  const copyToLibrary = async (g: UserGameSummary) => {
    if (!user || busy) return;
    setBusy(true);
    const supabase = createClient();
    const { data: full } = await supabase.from('user_games').select('content').eq('id', g.id).maybeSingle();
    if (full) {
      const { error } = await supabase.from('user_games').insert({
        owner_id: user.id,
        title: cleanTitle(`${g.title} (สำเนา)`),
        template: g.template,
        content: full.content,
        question_count: g.question_count,
        cover_url: g.cover_url,
        is_public: false, // สำเนาเป็น Private ก่อน เจ้าของแก้เสร็จแล้วค่อยเปิด Public เอง
      });
      if (!error) {
        gsfx.join();
        setCopied(g.id);
        setTimeout(() => setCopied(null), 2800);
        load();
      }
    }
    setBusy(false);
  };

  const togglePublic = async (g: UserGameSummary) => {
    gsfx.tap();
    const next = !g.is_public;
    setGames((old) => (old ? old.map((x) => (x.id === g.id ? { ...x, is_public: next } : x)) : old));
    const { error } = await createClient().from('user_games').update({ is_public: next }).eq('id', g.id);
    if (error) load();
  };

  useEffect(() => {
    // React ผูกคลิกไว้ที่ document เหมือนกัน stopPropagation จึงกันไม่ได้: ปิดเมนูเฉพาะเมื่อคลิกนอกปุ่ม/เมนู
    const close = (e: MouseEvent) => {
      if (!(e.target as Element | null)?.closest?.('[data-menu-root]')) setMenu(null);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  const shown = useMemo(() => (games || []).filter((g) => !q.trim() || g.title.toLowerCase().includes(q.trim().toLowerCase())), [games, q]);

  const switchTab = (t: Tab) => {
    gsfx.tap();
    setTab(t);
    const u = new URL(window.location.href);
    if (t === 'new') u.searchParams.delete('tab');
    else u.searchParams.set('tab', t);
    window.history.replaceState(null, '', u.toString());
  };

  const duplicate = async (g: UserGameSummary) => {
    if (!user) return;
    if (atLimit) return setGate('limit');
    setBusy(true);
    const supabase = createClient();
    const { data: full } = await supabase.from('user_games').select('content').eq('id', g.id).maybeSingle();
    if (full) {
      const title = cleanTitle(`${g.title} (สำเนา)`);
      const { error } = await supabase.from('user_games').insert({
        owner_id: user.id,
        title,
        template: g.template,
        content: full.content,
        question_count: g.question_count,
        cover_url: g.cover_url,
        is_public: g.is_public,
      });
      if (!error) gsfx.join();
      else if (/free game limit/i.test(error.message || '')) setGate('limit');
    }
    setBusy(false);
    load();
  };

  const doRename = async () => {
    if (!rename) return;
    const t = cleanTitle(renameVal);
    if (!t) return;
    setBusy(true);
    await createClient().from('user_games').update({ title: t }).eq('id', rename.id);
    setBusy(false);
    setRename(null);
    load();
  };

  const doDelete = async () => {
    if (!del) return;
    setBusy(true);
    const supabase = createClient();
    const { data: all } = await supabase.from('user_games').select('id, content').eq('owner_id', user?.id || '');
    const prefix = mediaPrefix();
    const mine = (all || []).find((x) => x.id === del.id);
    const { error } = await supabase.from('user_games').delete().eq('id', del.id);
    if (!error && mine && !del.is_public) {
      // ลบไฟล์ที่ไม่มีเกมอื่นใช้แล้ว (เกม Public ไม่ลบไฟล์ เพราะคนอื่นอาจทำสำเนาไปใช้อยู่)
      const keep = new Set((all || []).filter((x) => x.id !== del.id).flatMap((x) => mediaPaths(sanitizeQuiz(x.content, prefix))));
      await removeMedia(mediaPaths(sanitizeQuiz(mine.content, prefix)).filter((p) => !keep.has(p)));
    }
    setBusy(false);
    setDel(null);
    load();
    if (tab === 'discover') loadDiscover(0);
  };

  const roomOf = (id: string) => rooms.find((r) => r.game_id === id);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="l5g-world flex-1">
        <NightSky />
        <span className="l5g-bg-cloud" style={{ top: '7%', animationDelay: '-20s' }} />
        <span className="l5g-bg-cloud" style={{ top: '40%', animationDelay: '-55s', ['--s' as string]: 0.7 }} />

        <section className="max-w-6xl mx-auto px-4 pt-6 sm:pt-10 pb-4 text-center relative">
          <span className="l5g-chip-head">
            <Wand2 className="w-4 h-4" /> ระบบสร้างเกม
          </span>
          <h1 className="l5g-hero-title">
            สร้างชุดคำถามของคุณเอง
            <br />
            <span>เล่นได้ 6 แบบ ทั้งห้องสนุก</span>
          </h1>
          <p className="l5g-hero-sub">ควิซ ร้านคาเฟ่ ป้อมปราการ วิ่งแข่ง ศึกมอนสเตอร์ ตกปลา ใช้ชุดคำถามเดียวกัน เปิดห้องด้วยเลข 6 หลัก</p>
        </section>

        {isLoading ? (
          <div className="max-w-md mx-auto px-4 pb-16">
            <div className="l5g-card l5g-card-pad text-center font-bold">กำลังโหลด…</div>
          </div>
        ) : (
          <>
            {/* แท็บ */}
            <div className="max-w-6xl mx-auto px-4">
              <div className="l5g-seg" role="tablist">
                <button type="button" role="tab" aria-selected={tab === 'new'} data-on={tab === 'new'} onClick={() => switchTab('new')}>
                  <Sparkles className="w-5 h-5" /> สร้างชุดคำถาม
                </button>
                <button type="button" role="tab" aria-selected={tab === 'discover'} data-on={tab === 'discover'} data-kind="discover" onClick={() => switchTab('discover')}>
                  <Compass className="w-5 h-5" /> Discover
                </button>
                <button type="button" role="tab" aria-selected={tab === 'library'} data-on={tab === 'library'} onClick={() => switchTab('library')}>
                  <FolderHeart className="w-5 h-5" /> คลังของฉัน
                  {games && games.length > 0 && <span className="l5g-seg-count">{games.length}</span>}
                </button>
              </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 mt-4 flex flex-col gap-3">
              <OfferBanner />
              <SocialProof />
              {tier === 'guest' ? (
                <div className="l5g-tierbar">
                  <Lock className="w-5 h-5 shrink-0" />
                  <span className="flex-1 min-w-[200px]">ยังไม่ได้เข้าสู่ระบบ ดูระบบได้ แต่ต้องสมัครสมาชิกก่อนจึงจะสร้างและเปิดใช้งานชุดคำถามได้</span>
                  <Link href="/signup?redirect=/create" className="l5g-btn l5g-btn-mint l5g-btn-sm">
                    สมัครบัญชีฟรี
                  </Link>
                  <Link href="/login?redirect=/create" className="l5g-btn l5g-btn-ghost l5g-btn-sm">
                    เข้าสู่ระบบ
                  </Link>
                </div>
              ) : (
                <>
                  {tier === 'free' && (
                    <div className="l5g-tierbar">
                      <Sparkles className="w-5 h-5 shrink-0" />
                      <span className="flex-1 min-w-[200px]">
                        บัญชีฟรี: สร้างชุดคำถามไปแล้ว <b>{games ? used : '-'}</b> / {FREE_SET_LIMIT} ชุด สร้างได้ {FREE_SET_LIMIT} ชุดตลอดอายุบัญชี ลบชุดเดิมแล้วสิทธิ์ไม่คืน
                      </span>
                      <JoinButton className="l5g-btn l5g-btn-go l5g-btn-sm">
                        <Crown className="w-4 h-4" /> สมัครสมาชิก
                      </JoinButton>
                    </div>
                  )}
                  <UsageMeter compact />
                </>
              )}
            </div>

            {dbMissing && (
              <div className="max-w-3xl mx-auto px-4 mt-4">
                <div className="l5g-card l5g-card-pad text-center font-bold">ระบบสร้างเกมยังไม่พร้อมใช้งาน (ผู้ดูแลต้องติดตั้งฐานข้อมูล migration 015 และ 016)</div>
              </div>
            )}

            {tab === 'new' ? (
              <section className="max-w-6xl mx-auto px-4 pt-6 pb-10">
                <div className="l5g-newset" data-tour="create-new">
                  <div className="l5g-newset-text">
                    <span className="l5g-sec-sub">ขั้นที่ 1</span>
                    <h2 className="font-display text-3xl mt-2">สร้างชุดคำถาม</h2>
                    <p className="font-semibold opacity-80 mt-1">ใส่คำถาม ตัวเลือก สูตรคณิต รูป และคลิปได้อิสระ ชุดเดียวเล่นได้ทุกรูปแบบ</p>
                    <button
                      type="button"
                      className="l5g-btn l5g-btn-go l5g-btn-xl mt-4"
                      disabled={dbMissing}
                      onClick={() => {
                        gsfx.pick();
                        if (tier === 'guest') return setGate('guest');
                        if (atLimit) return setGate('limit');
                        router.push('/create/edit');
                      }}
                    >
                      <Plus className="w-6 h-6" strokeWidth={3} /> สร้างชุดคำถามใหม่
                    </button>
                  </div>
                  <div className="l5g-newset-art" aria-hidden="true">
                    <ModeArt mode="quiz" />
                  </div>
                </div>

                <h2 className="l5g-sec-title mt-8">ขั้นที่ 2 เลือกรูปแบบการเล่นตอนเปิดห้อง</h2>
                <p className="l5g-sec-note">กด เปิดใช้งาน ที่ชุดคำถามในคลัง แล้วเลือกได้เลยว่าจะเล่นแบบไหน</p>
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 mt-4" data-tour="modes">
                  {MODES.map((m, i) => (
                    <article key={m.id} className="l5g-tcard" style={{ ['--a' as string]: m.color, ['--soft' as string]: m.soft, animationDelay: `${i * 80}ms` }}>
                      <div className="l5g-tcard-art">
                        <ModeArt mode={m.id} />
                      </div>
                      <div className="p-4 pt-3 flex flex-col flex-1">
                        <p className="text-xs font-extrabold tracking-wider" style={{ color: m.dark }}>
                          {m.genre}
                        </p>
                        <h3 className="font-display text-xl">{m.name}</h3>
                        <p className="text-sm font-semibold opacity-80 mt-1">{m.tagline}</p>
                        <ul className="mt-2 space-y-1 text-xs font-bold">
                          <li className="flex items-center gap-2">
                            <span className="l5g-dot" style={{ background: m.color }} />
                            ต้องมีอย่างน้อย {m.minQuestions} ข้อ
                          </li>
                          {m.noVideo && (
                            <li className="flex items-center gap-2">
                              <span className="l5g-dot" style={{ background: m.color }} />
                              ข้อที่มีคลิปจะถูกข้าม
                            </li>
                          )}
                          {m.endless && (
                            <li className="flex items-center gap-2">
                              <span className="l5g-dot" style={{ background: m.color }} />
                              คำถามวนซ้ำได้
                            </li>
                          )}
                        </ul>
                      </div>
                    </article>
                  ))}
                </div>

                {!member && (
                  <div className="mt-10">
                    <h2 className="l5g-sec-title">สมัครสมาชิก กับ ไม่สมัคร ต่างกันยังไง</h2>
                    <p className="l5g-sec-note">ทดลองสร้างและเปิดห้องด้วยบัญชีฟรีได้เลย ชอบแล้วค่อยสมัครสมาชิก ชุดคำถามที่สร้างไว้ไม่หาย</p>
                    <TierCompare className="mt-4 max-w-3xl" />
                    <div className="mt-4 flex flex-wrap gap-3">
                      {tier === 'guest' && (
                        <Link href="/signup?redirect=/create" className="l5g-btn l5g-btn-mint">
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
                  <p className="font-semibold opacity-80 mt-1">ชุดคำถามของคนอื่นดู ทำสำเนา และเปิดใช้งานได้เฉพาะสมาชิก</p>
                  <TierCompare className="mt-5 text-left" />
                  <div className="mt-5 flex flex-wrap justify-center gap-3">
                    <JoinButton className="l5g-btn l5g-btn-go">
                      <Crown className="w-5 h-5" /> สมัครสมาชิก
                    </JoinButton>
                    {tier === 'guest' && (
                      <Link href="/login?redirect=/create" className="l5g-btn l5g-btn-ghost">
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
                  <span className="l5g-sec-sub">ชุดคำถามที่สมาชิกเปิด Public</span>
                  <span className="flex-1" />
                  {isDev && (
                    <button type="button" className="l5g-chipbtn l5g-devchip" data-on={devAll} onClick={() => (gsfx.tap(), setDevAll(!devAll))} title="Dev: แสดงชุดคำถามทั้งหมดรวม Private">
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
                  <input value={dQ} onChange={(e) => setDQ(e.target.value)} placeholder="ค้นหาชื่อชุดคำถาม หรือชื่อผู้สร้าง" aria-label="ค้นหาใน Discover" />
                  {dQ && (
                    <button type="button" onClick={() => setDQ('')} aria-label="ล้างคำค้นหา">
                      &times;
                    </button>
                  )}
                </label>

                {dGames === null ? (
                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 mt-5">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="l5g-gcard l5g-skel" />
                    ))}
                  </div>
                ) : dGames.length === 0 ? (
                  <div className="l5g-card l5g-empty mt-5">
                    <div className="l5g-empty-art" aria-hidden="true">
                      {[0, 1, 2, 3].map((i) => (
                        <span key={i} style={{ background: choiceStyle(i).color, animationDelay: `${i * 0.2}s` }}>
                          <ChoiceShape i={i} size={22} />
                        </span>
                      ))}
                    </div>
                    <h3 className="font-display text-2xl">{dTerm ? 'ไม่พบชุดคำถามที่ค้นหา' : 'ยังไม่มีชุดคำถาม Public'}</h3>
                    <p className="font-semibold opacity-75">{dTerm ? 'ลองคำอื่น หรือชื่อผู้สร้าง' : 'สร้างชุดคำถามแล้วตั้งเป็น Public จะมาโชว์ที่นี่'}</p>
                  </div>
                ) : (
                  <>
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 mt-5">
                      {dGames.map((g, i) => {
                        const mine = g.owner_id === user?.id;
                        return (
                          <article key={g.id} className="l5g-gcard" style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}>
                            <div className="l5g-gcover">
                              <GameCover game={g} />
                              <span className="l5g-gcover-count">{g.question_count} ข้อ</span>
                              {g.play_count > 0 && (
                                <span className="l5g-gcover-live l5g-gcover-plays">
                                  <Play className="w-3 h-3" /> {g.play_count}
                                </span>
                              )}
                            </div>
                            <div className="p-4 flex flex-col gap-1 flex-1">
                              <h3 className="font-display text-lg leading-snug break-words">{g.title}</h3>
                              <p className="l5g-owner">
                                <span className="l5g-owner-dot">{(g.owner_name || '?').slice(0, 1).toUpperCase()}</span>
                                <span className="truncate">{mine ? 'ชุดคำถามของฉัน' : g.owner_name || 'สมาชิก'}</span>
                                {!g.is_public && <span className="l5g-privtag">Private</span>}
                              </p>
                              <div className="flex-1" />
                              <div className="flex gap-2 mt-3">
                                <button type="button" className="l5g-btn l5g-btn-go flex-1" disabled={!g.question_count} onClick={() => (gsfx.pick(), setOpenGame(g))}>
                                  <Rocket className="w-5 h-5" /> เปิดใช้งาน
                                </button>
                                {mine ? (
                                  <Link href={`/create/edit?id=${g.id}`} className="l5g-btn l5g-btn-ghost" aria-label="แก้ไขชุดคำถาม">
                                    <Pencil className="w-5 h-5" />
                                  </Link>
                                ) : (
                                  <button type="button" className="l5g-btn l5g-btn-ghost" disabled={busy || copied === g.id} onClick={() => copyToLibrary(g)} title="ทำสำเนาไปแก้ไขในคลังของฉัน">
                                    {copied === g.id ? <Check className="w-5 h-5" strokeWidth={4} /> : <Copy className="w-5 h-5" />}
                                    <span className="hidden min-[400px]:inline">{copied === g.id ? 'ได้แล้ว' : 'ทำสำเนา'}</span>
                                  </button>
                                )}
                                {isDev && !mine && (
                                  <button type="button" className="l5g-btn l5g-btn-coral" onClick={() => setDel(g)} title="Dev: ลบชุดคำถามนี้" aria-label="ลบชุดคำถามนี้">
                                    <Trash2 className="w-5 h-5" />
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
                        <button type="button" className="l5g-btn l5g-btn-violet" disabled={dLoading} onClick={() => loadDiscover(dGames.length)}>
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
                  <h2 className="l5g-sec-title">คลังชุดคำถามของฉัน</h2>
                  <span className="flex-1" />
                  {games && games.length > 3 && (
                    <label className="l5g-search">
                      <Search className="w-4 h-4" />
                      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาชื่อชุดคำถาม" aria-label="ค้นหาชื่อชุดคำถาม" />
                    </label>
                  )}
                  <button type="button" className="l5g-btn l5g-btn-violet l5g-btn-sm" onClick={() => switchTab('new')}>
                    <Plus className="w-4 h-4" strokeWidth={3} /> ชุดใหม่
                  </button>
                </div>

                {!signedIn ? (
                  <div className="l5g-card l5g-gate mt-5">
                    <div className="l5g-gate-art" aria-hidden="true">
                      <span className="l5g-gate-lock">
                        <Lock className="w-12 h-12" />
                      </span>
                    </div>
                    <h3 className="font-display text-2xl">ต้องสมัครสมาชิกก่อน</h3>
                    <p className="font-semibold opacity-80 mt-1">เข้าสู่ระบบหรือสมัครบัญชีฟรีเพื่อมีคลังชุดคำถามของตัวเอง</p>
                    <div className="mt-5 flex flex-wrap justify-center gap-3">
                      <Link href="/signup?redirect=/create?tab=library" className="l5g-btn l5g-btn-mint">
                        <Sparkles className="w-5 h-5" /> สมัครบัญชีฟรี
                      </Link>
                      <Link href="/login?redirect=/create" className="l5g-btn l5g-btn-ghost">
                        <LogIn className="w-5 h-5" /> เข้าสู่ระบบ
                      </Link>
                    </div>
                  </div>
                ) : games === null ? (
                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 mt-5">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="l5g-gcard l5g-skel" />
                    ))}
                  </div>
                ) : games.length === 0 ? (
                  <div className="l5g-card l5g-empty mt-5">
                    <div className="l5g-empty-art" aria-hidden="true">
                      {[0, 1, 2, 3].map((i) => (
                        <span key={i} style={{ background: choiceStyle(i).color, animationDelay: `${i * 0.2}s` }}>
                          <ChoiceShape i={i} size={22} />
                        </span>
                      ))}
                    </div>
                    <h3 className="font-display text-2xl">ยังไม่มีชุดคำถามในคลัง</h3>
                    <p className="font-semibold opacity-75">สร้างชุดคำถามแรก แล้วกดบันทึก จะมาอยู่ที่นี่</p>
                    <button type="button" className="l5g-btn l5g-btn-go mt-4" onClick={() => switchTab('new')}>
                      <Sparkles className="w-5 h-5" /> สร้างชุดคำถามแรก
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 mt-5">
                    {shown.map((g, i) => {
                      const live = roomOf(g.id);
                      return (
                        <article key={g.id} className="l5g-gcard" data-menu={menu === g.id} style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}>
                          <div className="l5g-gcover">
                            <GameCover game={g} />
                            <span className="l5g-gcover-count">{g.question_count} ข้อ</span>
                            <button type="button" className="l5g-vis-badge" data-public={g.is_public} onClick={() => togglePublic(g)} title={g.is_public ? 'Public: แตะเพื่อเปลี่ยนเป็น Private' : 'Private: แตะเพื่อเปลี่ยนเป็น Public'}>
                              {g.is_public ? <Globe className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                              {g.is_public ? 'Public' : 'Private'}
                            </button>
                            {live && (
                              <span className="l5g-gcover-live">
                                <i /> ห้อง {live.code}
                              </span>
                            )}
                          </div>
                          <div className="p-4 flex flex-col gap-1 flex-1">
                            <div className="flex items-start gap-2">
                              <h3 className="font-display text-lg leading-snug flex-1 min-w-0 break-words">{g.title}</h3>
                              <div className="relative" data-menu-root>
                                <button
                                  type="button"
                                  className="l5g-icon-btn"
                                  style={{ width: 34, height: 34, borderRadius: 11 }}
                                  aria-label="ตัวเลือกเพิ่มเติม"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setMenu(menu === g.id ? null : g.id);
                                  }}
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </button>
                                {menu === g.id && (
                                  <div className="l5g-menu" onClick={(e) => e.stopPropagation()}>
                                    <button type="button" onClick={() => (setMenu(null), setRename(g), setRenameVal(g.title))}>
                                      <Pencil className="w-4 h-4" /> เปลี่ยนชื่อ
                                    </button>
                                    <button type="button" disabled={busy} onClick={() => (setMenu(null), duplicate(g))}>
                                      <Copy className="w-4 h-4" /> ทำสำเนา
                                    </button>
                                    {g.question_count > 0 && (
                                      <button type="button" onClick={() => router.push(`/studio?fromSet=${g.id}`)}>
                                        <FileText className="w-4 h-4" /> ทำเป็นใบงาน (สร้างสื่อ)
                                      </button>
                                    )}
                                    <button type="button" className="l5g-menu-danger" onClick={() => (setMenu(null), setDel(g))}>
                                      <Trash2 className="w-4 h-4" /> ลบชุดคำถาม
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                            <p className="text-xs font-bold opacity-60">
                              แก้ไข {new Date(g.updated_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}
                              {g.play_count > 0 && ` · เปิดเล่น ${g.play_count} ครั้ง`}
                            </p>
                            <div className="flex-1" />
                            <div className="flex gap-2 mt-3">
                              {live ? (
                                <Link href={`/create/host?room=${live.id}`} className="l5g-btn l5g-btn-mint flex-1">
                                  <DoorOpen className="w-5 h-5" /> กลับเข้าห้อง
                                </Link>
                              ) : (
                                <button type="button" className="l5g-btn l5g-btn-go flex-1" disabled={!g.question_count} onClick={() => (gsfx.pick(), setOpenGame(g))}>
                                  <Rocket className="w-5 h-5" /> เปิดใช้งาน
                                </button>
                              )}
                              <Link href={`/create/edit?id=${g.id}`} className="l5g-btn l5g-btn-ghost" aria-label="แก้ไขชุดคำถาม">
                                <Pencil className="w-5 h-5" />
                                <span className="hidden min-[400px]:inline">แก้ไข</span>
                              </Link>
                              {g.question_count > 0 && (
                                <Link href={`/studio?fromSet=${g.id}`} className="l5g-btn l5g-btn-ghost" title="ทำเป็นใบงานพร้อมเฉลย ในระบบสร้างสื่อการสอน" aria-label="ทำเป็นใบงาน">
                                  <FileText className="w-5 h-5" />
                                </Link>
                              )}
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </main>

      {gate && (
        <PaperModal title="ต้องสมัครสมาชิกก่อน" icon={<Lock className="w-5 h-5" />} iconBg="#ff9a3d" onClose={() => setGate(null)} width={560}>
          <p className="font-semibold">
            {gate === 'guest'
              ? 'ยังไม่ได้เข้าสู่ระบบ สร้างและเปิดใช้งานชุดคำถามได้เมื่อมีบัญชี สมัครบัญชีฟรีเพื่อลองสร้างได้ 2 ชุดตลอดอายุบัญชี หรือสมัครสมาชิกเพื่อใช้ได้ไม่จำกัด'
              : `บัญชีฟรีสร้างชุดคำถามได้ ${FREE_SET_LIMIT} ชุดตลอดอายุบัญชี และคุณใช้สิทธิ์ครบแล้ว การลบชุดเดิมไม่คืนสิทธิ์ให้ ถ้าอยากสร้างเพิ่มต้องสมัครสมาชิก`}
          </p>
          <TierCompare className="mt-3" />
          <div className="l5g-math-foot">
            <span className="flex-1" />
            {gate === 'guest' ? (
              <>
                <Link href="/login?redirect=/create" className="l5g-btn l5g-btn-ghost">
                  <LogIn className="w-5 h-5" /> เข้าสู่ระบบ
                </Link>
                <Link href="/signup?redirect=/create" className="l5g-btn l5g-btn-mint">
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

      {openGame && profile && <OpenGameModal gameId={openGame.id} title={openGame.title} username={profile.username} onClose={() => setOpenGame(null)} />}

      {rename && (
        <PaperModal title="เปลี่ยนชื่อชุดคำถาม" icon={<Pencil className="w-5 h-5" />} onClose={() => setRename(null)} busy={busy}>
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
        <PaperModal title="ลบชุดคำถามนี้?" icon={<Trash2 className="w-5 h-5" />} iconBg="#ff6b7a" onClose={() => setDel(null)} busy={busy}>
          <p className="font-semibold">
            &quot;{del.title}&quot; จะถูกลบถาวร (ห้องที่เปิดเล่นอยู่ยังเล่นต่อได้จนปิดห้อง)
          </p>
          {tier === 'free' && !isDev && (
            <p className="mt-2 rounded-xl border-2 border-[#2a2350] bg-[#ffe1e5] px-3 py-2 text-sm font-bold">
              บัญชีฟรีสร้างได้ {FREE_SET_LIMIT} ชุดตลอดอายุบัญชี ลบชุดนี้แล้วสิทธิ์ที่ใช้ไปจะไม่คืนกลับมา และสร้างชุดใหม่แทนไม่ได้ ถ้าแค่อยากแก้ไข ให้กดแก้ไขชุดเดิมแทนการลบ
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

export default function CreatePage() {
  return (
    <Suspense fallback={null}>
      <CreateHub />
    </Suspense>
  );
}
