'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  CheckCircle2,
  Clapperboard,
  Copy,
  Globe,
  Lock,
  FolderHeart,
  GripVertical,
  ImagePlus,
  Loader2,
  Play,
  Plus,
  Rocket,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { MediaRef, PointsMode, QuizChoice, QuizContent, QuizQuestion, Rich } from '@/lib/game-creator/types';
import {
  LIMITS,
  TIME_OPTIONS,
  choiceFilled,
  cleanTitle,
  emptyQuiz,
  newChoice,
  newQuestion,
  playableQuiz,
  quizCover,
  quizIssues,
  richToPlain,
  sanitizeQuiz,
  timeLabel,
  uid,
} from '@/lib/game-creator/quiz';
import { mediaPrefix, probeVideo, uploadImage, type VideoProbe } from '@/lib/game-creator/media';
import { gsfx } from '@/lib/game-creator/gsound';
import { RichInput, type RichInputHandle } from '../math/RichInput';
import { MediaView } from '../MediaView';
import { ChoiceShape, choiceStyle } from '../ChoiceShape';
import { VideoTrimModal } from '../VideoTrimModal';
import { PaperModal } from '../PaperModal';
import { RoomBackdrop } from '../RoomBackdrop';
import { QuizRunner, type QuizEngine } from './QuizRunner';
import { CafeGame } from '../games/CafeGame';
import { TowerGame } from '../games/TowerGame';
import { RaceGame } from '../games/RaceGame';
import { BrawlGame } from '../games/BrawlGame';
import { releaseMusic, setMusic } from '@/lib/music';
import { MODE_MUSIC } from '@/lib/music-tracks';
import { FishGame } from '../games/FishGame';
import { ModePicker, ModeSteps } from '../OpenGameModal';
import { modeById, modeQuiz, type GameMode } from '@/lib/game-creator/modes';
import { localEngine } from './localEngine';
import { OpenGameModal } from '../OpenGameModal';

type Target = { q: string; c?: string };
const tKey = (t: Target) => (t.c ? `c:${t.c}` : `q:${t.q}`);
const DRAFT = (id: string | null) => `l5g_draft_${id || 'new'}`;

interface Props {
  gameId: string | null;
  userId: string;
  username: string;
}

function FxButton({ onClick, small }: { onClick: () => void; small?: boolean }) {
  return (
    <button type="button" className={`l5g-tool l5g-tool-fx ${small ? 'l5g-tool-sm' : ''}`} onMouseDown={(e) => e.preventDefault()} onClick={onClick} title="ใส่สูตรคณิตศาสตร์">
      <span className="l5g-fx-text">f(x)</span>
      {!small && <span>สูตร</span>}
    </button>
  );
}

export function QuizEditor({ gameId: initialId, userId, username }: Props) {
  const router = useRouter();
  const [gameId, setGameId] = useState<string | null>(initialId);
  const [title, setTitle] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [content, setContent] = useState<QuizContent>(() => emptyQuiz());
  const [sel, setSel] = useState(0);
  const [loading, setLoading] = useState(!!initialId);
  const [loadErr, setLoadErr] = useState('');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState('');
  const [askTitle, setAskTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [mediaErr, setMediaErr] = useState('');
  const [video, setVideo] = useState<{ file: File; probe: VideoProbe; target: Target } | null>(null);
  const [preview, setPreview] = useState<{ content: QuizContent; key: number; mode: GameMode; engine: QuizEngine; deadline: number | null } | null>(null);
  const [pickPreview, setPickPreview] = useState(false);
  const [pickMode, setPickMode] = useState<GameMode | null>(null);
  const [leave, setLeave] = useState(false);
  const [openRoom, setOpenRoom] = useState(false);
  const [draftOffer, setDraftOffer] = useState<{ title: string; content: QuizContent } | null>(null);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [previewDone, setPreviewDone] = useState<number | null>(null);
  // ทดลองเล่น: เปิดเพลงของรูปแบบนั้น
  const previewMode = preview?.mode;
  useEffect(() => {
    if (previewMode) setMusic('room', MODE_MUSIC[previewMode]);
    else releaseMusic('room');
  }, [previewMode]);
  useEffect(() => () => releaseMusic('room'), []);
  const imgInput = useRef<HTMLInputElement>(null);
  const vidInput = useRef<HTMLInputElement>(null);
  const pickTarget = useRef<Target | null>(null);
  const qInput = useRef<RichInputHandle>(null);
  const cInputs = useRef<Record<string, RichInputHandle | null>>({});
  const listRef = useRef<HTMLDivElement>(null);
  const prefix = mediaPrefix();

  /* ---------------- โหลด ---------------- */
  useEffect(() => {
    let alive = true;
    const readDraft = () => {
      try {
        const raw = localStorage.getItem(DRAFT(initialId));
        return raw ? (JSON.parse(raw) as { title: string; content: unknown; at: number }) : null;
      } catch {
        return null;
      }
    };
    if (!initialId) {
      const d = readDraft();
      if (d) setDraftOffer({ title: cleanTitle(d.title), content: sanitizeQuiz(d.content, prefix) });
      return;
    }
    (async () => {
      const { data, error } = await createClient().from('user_games').select('id, title, content, updated_at, is_public').eq('id', initialId).maybeSingle();
      if (!alive) return;
      if (error || !data) {
        setLoadErr('ไม่พบเกมนี้ในคลังของคุณ');
        setLoading(false);
        return;
      }
      setTitle(data.title);
      setIsPublic(data.is_public !== false);
      const c = sanitizeQuiz(data.content, prefix);
      setContent(c.questions.length ? c : emptyQuiz());
      const d = readDraft();
      if (d && d.at > new Date(data.updated_at).getTime() + 1000) setDraftOffer({ title: cleanTitle(d.title), content: sanitizeQuiz(d.content, prefix) });
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [initialId, prefix]);

  // สำรองงานที่ยังไม่บันทึกไว้ในเครื่อง
  useEffect(() => {
    if (!dirty) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT(gameId), JSON.stringify({ title, content, at: Date.now() }));
      } catch {
        /* เต็ม/ปิดไว้ */
      }
    }, 700);
    return () => clearTimeout(t);
  }, [dirty, title, content, gameId]);

  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  /* ---------------- แก้ไขเนื้อหา ---------------- */
  const qs = content.questions;
  const cur = qs[Math.min(sel, qs.length - 1)];
  const issues = useMemo(() => quizIssues(content), [content]);
  const issueQs = useMemo(() => new Set(issues.map((i) => i.q)), [issues]);
  const playableCount = useMemo(() => playableQuiz(content).questions.length, [content]);

  const update = useCallback((fn: (c: QuizContent) => QuizContent) => {
    setContent((c) => fn(c));
    setDirty(true);
    setSaved(false);
  }, []);

  const patchQ = useCallback(
    (qid: string, p: Partial<QuizQuestion>) => update((c) => ({ ...c, questions: c.questions.map((q) => (q.id === qid ? { ...q, ...p } : q)) })),
    [update]
  );
  const patchC = useCallback(
    (qid: string, cid: string, p: Partial<QuizChoice>) =>
      update((c) => ({ ...c, questions: c.questions.map((q) => (q.id === qid ? { ...q, choices: q.choices.map((x) => (x.id === cid ? { ...x, ...p } : x)) } : q)) })),
    [update]
  );

  const addQuestion = () => {
    if (qs.length >= LIMITS.questions) return;
    gsfx.pick();
    const nq = newQuestion();
    if (cur) {
      nq.time = cur.time;
      nq.points = cur.points;
    }
    update((c) => {
      const arr = c.questions.slice();
      arr.splice(sel + 1, 0, nq);
      return { ...c, questions: arr };
    });
    setSel(sel + 1);
    setTimeout(() => {
      listRef.current?.querySelector(`[data-qi="${sel + 1}"]`)?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
      qInput.current?.focus();
    }, 80);
  };

  const duplicateQ = () => {
    if (!cur || qs.length >= LIMITS.questions) return;
    gsfx.pick();
    const copy: QuizQuestion = JSON.parse(JSON.stringify(cur));
    copy.id = uid();
    copy.choices = copy.choices.map((c) => ({ ...c, id: uid() }));
    update((c) => {
      const arr = c.questions.slice();
      arr.splice(sel + 1, 0, copy);
      return { ...c, questions: arr };
    });
    setSel(sel + 1);
  };

  const removeQ = () => {
    if (!cur) return;
    gsfx.whoosh();
    update((c) => {
      const arr = c.questions.filter((q) => q.id !== cur.id);
      return { ...c, questions: arr.length ? arr : [newQuestion()] };
    });
    setSel(Math.max(0, sel - 1));
  };

  const moveQ = (from: number, to: number) => {
    if (to < 0 || to >= qs.length || from === to) return;
    gsfx.tap();
    update((c) => {
      const arr = c.questions.slice();
      const [it] = arr.splice(from, 1);
      arr.splice(to, 0, it);
      return { ...c, questions: arr };
    });
    setSel(to);
  };

  const addChoice = () => {
    if (!cur || cur.choices.length >= LIMITS.choicesMax) return;
    gsfx.tap();
    const nc = newChoice();
    patchQ(cur.id, { choices: [...cur.choices, nc] });
    setTimeout(() => cInputs.current[nc.id]?.focus(), 60);
  };
  const removeChoice = (cid: string) => {
    if (!cur || cur.choices.length <= LIMITS.choicesMin) return;
    gsfx.whoosh();
    patchQ(cur.id, { choices: cur.choices.filter((c) => c.id !== cid) });
  };
  const toggleCorrect = (cid: string) => {
    if (!cur) return;
    gsfx.pick();
    const choices = cur.choices.map((c) => (c.id === cid ? { ...c, correct: cur.multi ? !c.correct : true } : cur.multi ? c : { ...c, correct: false }));
    patchQ(cur.id, { choices });
  };
  const setMulti = (multi: boolean) => {
    if (!cur) return;
    gsfx.tap();
    let choices = cur.choices;
    if (!multi) {
      const first = choices.findIndex((c) => c.correct);
      choices = choices.map((c, i) => ({ ...c, correct: i === (first < 0 ? 0 : first) }));
    }
    patchQ(cur.id, { multi, choices });
  };
  const makeTrueFalse = () => {
    if (!cur) return;
    gsfx.pick();
    patchQ(cur.id, { multi: false, choices: [newChoice(true, 'ถูก'), newChoice(false, 'ผิด')] });
  };
  const timeAll = () => {
    if (!cur) return;
    gsfx.streak();
    update((c) => ({ ...c, questions: c.questions.map((q) => ({ ...q, time: cur.time })) }));
  };

  /* ---------------- รูป/คลิป ---------------- */
  const setMedia = (t: Target, m: MediaRef | null) => {
    if (t.c) patchC(t.q, t.c, { media: m });
    else patchQ(t.q, { media: m });
  };

  const doUploadImage = async (t: Target, f: File) => {
    setMediaErr('');
    setUploading(tKey(t));
    try {
      const m = await uploadImage(userId, f);
      setMedia(t, m);
      gsfx.join();
    } catch (e) {
      setMediaErr(e instanceof Error ? e.message : 'อัปโหลดไม่สำเร็จ');
    } finally {
      setUploading(null);
    }
  };

  const pickImage = (t: Target) => {
    pickTarget.current = t;
    imgInput.current?.click();
  };
  const pickVideo = (t: Target) => {
    pickTarget.current = t;
    vidInput.current?.click();
  };

  const onImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    const t = pickTarget.current;
    if (f && t) doUploadImage(t, f);
  };
  const onVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    const t = pickTarget.current;
    if (!f || !t) return;
    setMediaErr('');
    try {
      const probe = await probeVideo(f);
      setVideo({ file: f, probe, target: t });
    } catch (err) {
      setMediaErr(err instanceof Error ? err.message : 'เปิดคลิปไม่ได้');
    }
  };
  const closeVideo = () => {
    if (video) URL.revokeObjectURL(video.probe.url);
    setVideo(null);
  };

  /* ---------------- บันทึก ---------------- */
  const save = async (withTitle?: string) => {
    const t = cleanTitle(withTitle ?? title);
    if (!t) {
      setTitleDraft('');
      setAskTitle(true);
      return;
    }
    setSaving(true);
    setSaveErr('');
    const clean = sanitizeQuiz(content, prefix);
    const row = {
      title: t,
      template: 'quiz',
      content: clean,
      question_count: playableQuiz(clean).questions.length,
      cover_url: quizCover(clean),
      is_public: isPublic,
    };
    const supabase = createClient();
    let id = gameId;
    let error: { message: string; code?: string } | null = null;
    if (id) {
      const r = await supabase.from('user_games').update(row).eq('id', id).select('id').maybeSingle();
      error = r.error;
      if (!r.error && !r.data) error = { message: 'not found' };
    } else {
      const r = await supabase.from('user_games').insert({ ...row, owner_id: userId }).select('id').single();
      error = r.error;
      if (r.data) id = r.data.id;
    }
    setSaving(false);
    if (error || !id) {
      const m = error?.message || '';
      setSaveErr(
        /quota/i.test(m)
          ? 'คลังเต็มแล้ว (สูงสุด 300 เกม) ลบเกมเก่าก่อนนะ'
          : /row-level|permission|policy/i.test(m)
            ? 'บันทึกได้เฉพาะสมาชิกที่สิทธิ์ยังไม่หมดอายุ'
            : /too long|check constraint|octet/i.test(m)
              ? 'เกมนี้ใหญ่เกินไป ลองลดจำนวนคำถาม'
              : 'บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง'
      );
      return;
    }
    try {
      localStorage.removeItem(DRAFT(gameId));
      localStorage.removeItem(DRAFT(null));
    } catch {
      /* ignore */
    }
    setTitle(t);
    setContent(clean);
    setDirty(false);
    setSaved(true);
    gsfx.correct();
    if (!gameId) {
      setGameId(id);
      window.history.replaceState(null, '', `/create/edit?id=${id}`);
    }
    setAskTitle(false);
  };

  const startPreview = (c: QuizContent, mode: GameMode) => {
    const m = modeById(mode);
    const playContent = modeQuiz(c, mode);
    gsfx.start();
    setPreview({
      content: playContent,
      key: Date.now(),
      mode,
      engine: localEngine(playContent, { endless: m.endless }),
      // ทดลองเล่นแบบสั้น 2 นาที
      deadline: m.durations ? Date.now() + 120000 : null,
    });
  };

  const back = () => {
    if (dirty) setLeave(true);
    else router.push('/create?tab=library');
  };

  /* ---------------- แสดงผล ---------------- */
  if (loading) {
    return (
      <div className="l5g-edit-loading">
        <Loader2 className="w-10 h-10 animate-spin" />
      </div>
    );
  }
  if (loadErr) {
    return (
      <div className="max-w-md mx-auto px-4 py-16">
        <div className="l5g-card l5g-card-pad text-center">
          <p className="font-bold text-lg">{loadErr}</p>
          <Link href="/create?tab=library" className="l5g-btn l5g-btn-go mt-4">
            กลับไปคลังเกม
          </Link>
        </div>
      </div>
    );
  }

  const qIssues = issues.filter((i) => i.q === sel);
  const uploadingQ = cur && uploading === `q:${cur.id}`;

  return (
    <div className="l5g-editor">
      <input ref={imgInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={onImage} />
      <input ref={vidInput} type="file" accept="video/mp4,video/webm,video/quicktime,video/*" hidden onChange={onVideo} />

      {/* ---------- แถบบน ---------- */}
      <header className="l5g-ebar">
        <button type="button" className="l5g-icon-btn" onClick={back} aria-label="กลับไปคลังเกม">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="l5g-ebar-title">
          <span className="l5g-ebar-tpl">ชุดคำถาม</span>
          <input
            className="l5g-title-input"
            value={title}
            maxLength={LIMITS.title}
            placeholder="ตั้งชื่อชุดคำถาม…"
            aria-label="ชื่อชุดคำถาม"
            onChange={(e) => {
              setTitle(e.target.value);
              setDirty(true);
              setSaved(false);
            }}
          />
        </div>
        <span className="l5g-ebar-status" data-state={saving ? 'saving' : dirty ? 'dirty' : saved || gameId ? 'saved' : 'new'}>
          {saving ? 'กำลังบันทึก' : dirty ? 'ยังไม่บันทึก' : gameId ? 'บันทึกแล้ว' : 'เกมใหม่'}
        </span>
        <button
          type="button"
          className="l5g-btn l5g-btn-mint l5g-btn-sm"
          onClick={() => {
            if (!playableCount) {
              setSaveErr('ยังไม่มีคำถามที่พร้อมเล่น ใส่โจทย์ ตัวเลือก และคำตอบที่ถูกก่อน');
              return;
            }
            gsfx.start();
            setPickMode(null);
            setPickPreview(true);
          }}
        >
          <Play className="w-4 h-4" /> <span className="hidden sm:inline">ทดลองเล่น</span>
        </button>
        <button type="button" className="l5g-btn l5g-btn-go l5g-btn-sm" onClick={() => save()} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} บันทึก
        </button>
      </header>

      {(saveErr || draftOffer) && (
        <div className="l5g-ebar-msgs">
          {saveErr && (
            <div className="l5g-note l5g-note-err">
              <AlertTriangle className="w-4 h-4" /> {saveErr}
              <button type="button" onClick={() => setSaveErr('')} aria-label="ปิด">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          {draftOffer && (
            <div className="l5g-note">
              มีงานที่ยังไม่ได้บันทึกค้างอยู่ในเครื่องนี้
              <button
                type="button"
                className="l5g-btn l5g-btn-sm l5g-btn-go"
                onClick={() => {
                  if (draftOffer.title) setTitle(draftOffer.title);
                  if (draftOffer.content.questions.length) setContent(draftOffer.content);
                  setSel(0);
                  setDirty(true);
                  setDraftOffer(null);
                }}
              >
                กู้คืน
              </button>
              <button
                type="button"
                className="l5g-btn l5g-btn-sm l5g-btn-ghost"
                onClick={() => {
                  try {
                    localStorage.removeItem(DRAFT(gameId));
                  } catch {
                    /* ignore */
                  }
                  setDraftOffer(null);
                }}
              >
                ทิ้ง
              </button>
            </div>
          )}
        </div>
      )}

      <div className="l5g-egrid">
        {/* ---------- รายการคำถาม ---------- */}
        <aside className="l5g-qlist-wrap">
          <div className="l5g-qlist-head">
            <b>คำถาม</b>
            <span>
              {qs.length}/{LIMITS.questions}
            </span>
          </div>
          <div className="l5g-qlist" ref={listRef}>
            {qs.map((q, i) => (
              <button
                key={q.id}
                type="button"
                data-qi={i}
                className="l5g-qitem"
                data-on={i === sel}
                data-drop={dragFrom !== null && dragFrom !== i}
                draggable
                onDragStart={(e) => {
                  setDragFrom(i);
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragFrom !== null) moveQ(dragFrom, i);
                  setDragFrom(null);
                }}
                onDragEnd={() => setDragFrom(null)}
                onClick={() => {
                  gsfx.tap();
                  setSel(i);
                }}
              >
                <span className="l5g-qitem-num">{i + 1}</span>
                <span className="l5g-qitem-body">
                  {q.media && (
                    <span className="l5g-qitem-thumb">
                      {q.media.kind === 'image' ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={q.media.url} alt="" />
                      ) : (
                        <Clapperboard className="w-4 h-4" />
                      )}
                    </span>
                  )}
                  <span className="l5g-qitem-text">{richToPlain(q.text, 60) || (q.media ? 'โจทย์เป็นสื่อ' : 'คำถามว่าง')}</span>
                </span>
                {issueQs.has(i) ? <span className="l5g-qitem-warn" title="ยังไม่ครบ" /> : <CheckCircle2 className="l5g-qitem-ok w-4 h-4" />}
                <GripVertical className="l5g-qitem-grip w-4 h-4" />
              </button>
            ))}
            <button type="button" className="l5g-qadd" onClick={addQuestion} disabled={qs.length >= LIMITS.questions}>
              <Plus className="w-5 h-5" strokeWidth={3} /> เพิ่มคำถาม
            </button>
          </div>
        </aside>

        {/* ---------- ตัวแก้ไขคำถาม ---------- */}
        {cur && (
          <section className="l5g-qedit" key={cur.id}>
            <div className="l5g-card l5g-qedit-card">
              <div className="l5g-qedit-head">
                <span className="l5g-qbadge">ข้อ {sel + 1}</span>
                <span className="flex-1" />
                <FxButton onClick={() => qInput.current?.openMath()} />
                <button type="button" className="l5g-tool" onClick={() => pickImage({ q: cur.id })} disabled={!!uploading}>
                  <ImagePlus className="w-5 h-5" />
                  <span>รูปภาพ</span>
                </button>
                <button type="button" className="l5g-tool" onClick={() => pickVideo({ q: cur.id })} disabled={!!uploading}>
                  <Clapperboard className="w-5 h-5" />
                  <span>คลิป 5 วิ</span>
                </button>
              </div>

              <RichInput
                ref={qInput}
                value={cur.text}
                onChange={(r: Rich) => patchQ(cur.id, { text: r })}
                placeholder="พิมพ์คำถามที่นี่ เช่น 3/4 + 1/4 เท่ากับเท่าไร"
                maxChars={LIMITS.questionChars}
                className="l5g-qinput"
                ariaLabel="โจทย์"
                onPasteImage={(f) => doUploadImage({ q: cur.id }, f)}
              />

              {(cur.media || uploadingQ) && (
                <div className="l5g-qmedia-edit">
                  {uploadingQ ? (
                    <div className="l5g-uploading">
                      <Loader2 className="w-6 h-6 animate-spin" /> กำลังอัปโหลด
                    </div>
                  ) : (
                    cur.media && (
                      <>
                        <MediaView media={cur.media} />
                        <button type="button" className="l5g-media-x" onClick={() => setMedia({ q: cur.id }, null)} aria-label="เอารูป/คลิปออก">
                          <X className="w-4 h-4" strokeWidth={3} />
                        </button>
                        {cur.media.kind === 'video' && <span className="l5g-media-tag">คลิป {Math.round(((cur.media.end ?? 5) - (cur.media.start ?? 0)) * 10) / 10} วิ</span>}
                      </>
                    )
                  )}
                </div>
              )}
              {mediaErr && (
                <p className="l5g-err mt-2 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" /> {mediaErr}
                </p>
              )}
            </div>

            {/* ตัวเลือก */}
            <div className="l5g-choice-head">
              <b>ตัวเลือก</b>
              <span className="text-sm font-semibold opacity-80">{cur.multi ? 'แตะวงกลมเพื่อเลือกข้อที่ถูก (ได้หลายข้อ)' : 'แตะวงกลมเพื่อเลือกข้อที่ถูก'}</span>
            </div>
            <div className="l5g-cedit-grid">
              {cur.choices.map((c, i) => {
                const st = choiceStyle(i);
                const up = uploading === `c:${c.id}`;
                return (
                  <div key={c.id} className="l5g-cedit" data-correct={c.correct} data-empty={!choiceFilled(c)} style={{ ['--c' as string]: st.color, ['--cd' as string]: st.dark }}>
                    <div className="l5g-cedit-top">
                      <span className="l5g-cedit-shape">
                        <ChoiceShape i={i} size={22} />
                      </span>
                      <button
                        type="button"
                        className="l5g-correct"
                        data-on={c.correct}
                        onClick={() => toggleCorrect(c.id)}
                        aria-pressed={c.correct}
                        aria-label={c.correct ? 'ข้อนี้ถูก' : 'ตั้งเป็นข้อที่ถูก'}
                        title={c.correct ? 'ข้อนี้ถูก' : 'ตั้งเป็นข้อที่ถูก'}
                      >
                        <Check className="w-5 h-5" strokeWidth={4} />
                      </button>
                      <span className="l5g-correct-label">{c.correct ? 'คำตอบที่ถูก' : ''}</span>
                      <span className="flex-1" />
                      <FxButton small onClick={() => cInputs.current[c.id]?.openMath()} />
                      <button type="button" className="l5g-tool l5g-tool-sm" onClick={() => pickImage({ q: cur.id, c: c.id })} disabled={!!uploading} title="ใส่รูป">
                        <ImagePlus className="w-4 h-4" />
                      </button>
                      <button type="button" className="l5g-tool l5g-tool-sm" onClick={() => pickVideo({ q: cur.id, c: c.id })} disabled={!!uploading} title="ใส่คลิป 5 วินาที">
                        <Clapperboard className="w-4 h-4" />
                      </button>
                      <button type="button" className="l5g-tool l5g-tool-sm l5g-tool-del" onClick={() => removeChoice(c.id)} disabled={cur.choices.length <= LIMITS.choicesMin} title="ลบตัวเลือก">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    {(c.media || up) && (
                      <div className="l5g-cedit-media">
                        {up ? (
                          <div className="l5g-uploading">
                            <Loader2 className="w-5 h-5 animate-spin" />
                          </div>
                        ) : (
                          c.media && (
                            <>
                              <MediaView media={c.media} controls={false} />
                              <button type="button" className="l5g-media-x" onClick={() => setMedia({ q: cur.id, c: c.id }, null)} aria-label="เอาออก">
                                <X className="w-3.5 h-3.5" strokeWidth={3} />
                              </button>
                            </>
                          )
                        )}
                      </div>
                    )}
                    <RichInput
                      ref={(h) => {
                        cInputs.current[c.id] = h;
                      }}
                      value={c.text}
                      onChange={(r: Rich) => patchC(cur.id, c.id, { text: r })}
                      placeholder={`ตัวเลือกที่ ${i + 1}${i < 2 ? '' : ' (ไม่บังคับ)'}`}
                      maxChars={LIMITS.choiceChars}
                      className="l5g-cinput"
                      ariaLabel={`ตัวเลือกที่ ${i + 1}`}
                      onPasteImage={(f) => doUploadImage({ q: cur.id, c: c.id }, f)}
                    />
                  </div>
                );
              })}
              {cur.choices.length < LIMITS.choicesMax && (
                <button type="button" className="l5g-cadd" onClick={addChoice}>
                  <Plus className="w-6 h-6" strokeWidth={3} />
                  เพิ่มตัวเลือก
                </button>
              )}
            </div>

            {qIssues.length > 0 && (
              <div className="l5g-issues">
                {qIssues.map((x, i) => (
                  <span key={i}>
                    <AlertTriangle className="w-4 h-4" /> {x.msg}
                  </span>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ---------- ตั้งค่าข้อนี้ ---------- */}
        {cur && (
          <aside className="l5g-qset">
            <div className="l5g-card l5g-qset-card">
              <h3 className="l5g-qset-title">ตั้งค่าข้อ {sel + 1}</h3>

              <p className="l5g-qset-label">แบบคำตอบ</p>
              <div className="l5g-chips">
                <button type="button" className="l5g-chipbtn" data-on={!cur.multi} onClick={() => setMulti(false)}>
                  ตอบข้อเดียว
                </button>
                <button type="button" className="l5g-chipbtn" data-on={cur.multi} onClick={() => setMulti(true)}>
                  ตอบได้หลายข้อ
                </button>
                <button type="button" className="l5g-chipbtn" onClick={makeTrueFalse}>
                  ถูก / ผิด
                </button>
              </div>

              <p className="l5g-qset-label">เวลา</p>
              <div className="l5g-chips">
                {TIME_OPTIONS.map((t) => (
                  <button key={t} type="button" className="l5g-chipbtn" data-on={cur.time === t} onClick={() => (gsfx.tap(), patchQ(cur.id, { time: t }))}>
                    {t ? (t >= 60 ? `${t / 60} นาที` : `${t} วิ`) : 'ไม่จำกัด'}
                  </button>
                ))}
              </div>
              {qs.length > 1 && (
                <button type="button" className="l5g-linkbtn" onClick={timeAll}>
                  ใช้ {timeLabel(cur.time)} กับทุกข้อ
                </button>
              )}

              <p className="l5g-qset-label">คะแนน</p>
              <div className="l5g-chips">
                {([0, 1, 2] as PointsMode[]).map((p) => (
                  <button key={p} type="button" className="l5g-chipbtn" data-on={cur.points === p} onClick={() => (gsfx.tap(), patchQ(cur.id, { points: p }))}>
                    {p === 0 ? 'ไม่คิด' : p === 1 ? 'ปกติ' : 'x2'}
                  </button>
                ))}
              </div>

              <div className="l5g-qset-actions">
                <button type="button" className="l5g-tool" onClick={() => moveQ(sel, sel - 1)} disabled={sel === 0} title="เลื่อนขึ้น">
                  <ArrowUp className="w-4 h-4" />
                </button>
                <button type="button" className="l5g-tool" onClick={() => moveQ(sel, sel + 1)} disabled={sel >= qs.length - 1} title="เลื่อนลง">
                  <ArrowDown className="w-4 h-4" />
                </button>
                <button type="button" className="l5g-tool" onClick={duplicateQ} disabled={qs.length >= LIMITS.questions} title="ทำซ้ำข้อนี้">
                  <Copy className="w-4 h-4" />
                  <span>ทำซ้ำ</span>
                </button>
                <button type="button" className="l5g-tool l5g-tool-del" onClick={removeQ} title="ลบข้อนี้">
                  <Trash2 className="w-4 h-4" />
                  <span>ลบ</span>
                </button>
              </div>
              <button
                type="button"
                className="l5g-btn l5g-btn-mint l5g-btn-sm w-full mt-3"
                disabled={!playableQuiz({ v: 1, questions: [cur] }).questions.length}
                onClick={() => {
                  gsfx.start();
                  startPreview({ v: 1, questions: [cur] }, 'quiz');
                }}
              >
                <Play className="w-4 h-4" /> ทดลองข้อนี้
              </button>
            </div>

            <div className="l5g-card l5g-qset-card">
              <h3 className="l5g-qset-title">การมองเห็น</h3>
              <div className="l5g-vis" role="radiogroup" aria-label="การมองเห็นเกม">
                <button type="button" role="radio" aria-checked={isPublic} data-on={isPublic} data-kind="public" onClick={() => (gsfx.tap(), setIsPublic(true), setDirty(true), setSaved(false))}>
                  <Globe className="w-5 h-5" />
                  <b>Public</b>
                  <span>แสดงใน Discover</span>
                </button>
                <button type="button" role="radio" aria-checked={!isPublic} data-on={!isPublic} data-kind="private" onClick={() => (gsfx.tap(), setIsPublic(false), setDirty(true), setSaved(false))}>
                  <Lock className="w-5 h-5" />
                  <b>Private</b>
                  <span>เห็นเฉพาะฉัน</span>
                </button>
              </div>
            </div>

            <div className="l5g-card l5g-qset-card l5g-summary">
              <p>
                พร้อมเล่น <b>{playableCount}</b> / {qs.length} ข้อ
              </p>
              {issues.length > 0 ? <p className="text-sm opacity-75">ข้อที่มีจุดเหลืองยังไม่ครบ จะไม่ถูกนำไปเล่น</p> : <p className="text-sm opacity-75">ทุกข้อพร้อมแล้ว</p>}
            </div>
          </aside>
        )}
      </div>

      {/* ---------- หน้าต่างต่างๆ ---------- */}
      {video && (
        <VideoTrimModal
          file={video.file}
          probe={video.probe}
          userId={userId}
          onCancel={closeVideo}
          onDone={(m) => {
            setMedia(video.target, m);
            gsfx.join();
            closeVideo();
          }}
        />
      )}

      {askTitle && (
        <PaperModal title="ตั้งชื่อชุดคำถาม" icon={<Save className="w-5 h-5" />} iconBg="#ffcf3f" onClose={() => setAskTitle(false)} busy={saving}>
          <p className="font-semibold opacity-80 mb-2">ชื่อนี้จะขึ้นในคลังและหน้าห้องเล่น</p>
          <input
            className="l5g-input"
            value={titleDraft}
            maxLength={LIMITS.title}
            autoFocus
            placeholder="เช่น เศษส่วนน่ารู้ ป.4"
            onChange={(e) => setTitleDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && cleanTitle(titleDraft) && save(titleDraft)}
          />
          {saveErr && <p className="l5g-err mt-2">{saveErr}</p>}
          <div className="l5g-math-foot">
            <span className="flex-1" />
            <button type="button" className="l5g-btn l5g-btn-ghost" onClick={() => setAskTitle(false)} disabled={saving}>
              ยกเลิก
            </button>
            <button type="button" className="l5g-btn l5g-btn-go" disabled={saving || !cleanTitle(titleDraft)} onClick={() => save(titleDraft)}>
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} บันทึกลงคลัง
            </button>
          </div>
        </PaperModal>
      )}

      {saved && !dirty && gameId && (
        <PaperModal title="บันทึกลงคลังแล้ว" icon={<FolderHeart className="w-5 h-5" />} iconBg="#3fd6a8" onClose={() => setSaved(false)}>
          <p className="font-semibold">&quot;{title}&quot; อยู่ในคลังของคุณแล้ว ({playableCount} ข้อพร้อมเล่น)</p>
          <div className="l5g-math-foot">
            <button type="button" className="l5g-btn l5g-btn-ghost" onClick={() => setSaved(false)}>
              แก้ไขต่อ
            </button>
            <span className="flex-1" />
            <Link href="/create?tab=library" className="l5g-btn l5g-btn-violet">
              <FolderHeart className="w-5 h-5" /> ไปที่คลัง
            </Link>
            <button type="button" className="l5g-btn l5g-btn-go" disabled={!playableCount} onClick={() => (setSaved(false), setOpenRoom(true))}>
              <Rocket className="w-5 h-5" /> เปิดใช้งาน
            </button>
          </div>
        </PaperModal>
      )}

      {openRoom && gameId && <OpenGameModal gameId={gameId} title={title} username={username} onClose={() => setOpenRoom(false)} />}

      {leave && (
        <PaperModal title="ยังไม่ได้บันทึก" icon={<AlertTriangle className="w-5 h-5" />} iconBg="#ff9a3d" onClose={() => setLeave(false)}>
          <p className="font-semibold">ออกตอนนี้งานที่แก้ไว้จะหาย (ยังกู้คืนได้จากเครื่องนี้ภายหลัง)</p>
          <div className="l5g-math-foot">
            <button
              type="button"
              className="l5g-btn l5g-btn-ghost"
              onClick={() => {
                setDirty(false);
                router.push('/create?tab=library');
              }}
            >
              ออกเลย
            </button>
            <span className="flex-1" />
            <button
              type="button"
              className="l5g-btn l5g-btn-go"
              onClick={() => {
                setLeave(false);
                save();
              }}
            >
              <Save className="w-5 h-5" /> บันทึก
            </button>
          </div>
        </PaperModal>
      )}

      {preview && (
        <div className="l5g-preview">
          <RoomBackdrop bg={{ kind: 'preset', id: 'sky' }} />
          <div className="l5g-preview-bar">
            <span className="l5g-pill">ทดลองเล่น {modeById(preview.mode).name} (ไม่บันทึกคะแนน)</span>
            <span className="flex-1" />
            <button type="button" className="l5g-btn l5g-btn-sm l5g-btn-ghost" onClick={() => setPreview(null)}>
              <X className="w-4 h-4" /> ปิด
            </button>
          </div>
          <div className="l5g-preview-body" data-game={preview.mode}>
            {preview.mode === 'cafe' ? (
              <CafeGame key={preview.key} engine={preview.engine} deadline={preview.deadline} goal={0} me={{ nickname: 'ทดลอง', avatar: 0 }} preview />
            ) : preview.mode === 'tower' ? (
              <TowerGame key={preview.key} engine={preview.engine} deadline={preview.deadline} goal={0} me={{ nickname: 'ทดลอง', avatar: 0 }} preview />
            ) : preview.mode === 'brawl' ? (
              <BrawlGame key={preview.key} engine={preview.engine} deadline={preview.deadline} goal={0} me={{ nickname: 'ทดลอง', avatar: 5 }} preview />
            ) : preview.mode === 'fishing' ? (
              <FishGame key={preview.key} engine={preview.engine} deadline={preview.deadline} goal={0} me={{ nickname: 'ทดลอง', avatar: 7 }} preview />
            ) : preview.mode === 'racing' ? (
              <RaceGame key={preview.key} engine={preview.engine} deadline={null} goal={10} me={{ nickname: 'ฉัน', avatar: 0 }} preview />
            ) : (
            <QuizRunner
              key={preview.key}
              engine={preview.engine}
              countdown={preview.content.questions.length > 1}
              onFinished={({ score }) => {
                setPreview(null);
                setTimeout(() => setSaveErr(''), 0);
                gsfx.fanfare();
                setPreviewDone(score);
              }}
            />
            )}
          </div>
        </div>
      )}

      {pickPreview && (
        <PaperModal title="ทดลองเล่นแบบไหนดี" icon={<Play className="w-5 h-5" />} iconBg="#3fd6a8" onClose={() => setPickPreview(false)} width={860}>
          <p className="font-semibold opacity-75 -mt-1 mb-3 text-sm">ลองเล่นในเครื่องนี้ ไม่ต้องเปิดห้อง (โหมดจับเวลาทดลอง 2 นาที วิ่งแข่งกับบอท)</p>
          <ModePicker content={content} value={pickMode} onPick={setPickMode} />
          {pickMode && <ModeSteps mode={pickMode} />}
          <div className="l5g-math-foot">
            <span className="flex-1" />
            <button type="button" className="l5g-btn l5g-btn-ghost" onClick={() => setPickPreview(false)}>
              ยกเลิก
            </button>
            <button
              type="button"
              className="l5g-btn l5g-btn-go"
              disabled={!pickMode}
              onClick={() => {
                if (!pickMode) return;
                setPickPreview(false);
                startPreview(content, pickMode);
              }}
            >
              <Play className="w-5 h-5" /> เริ่มทดลองเล่น
            </button>
          </div>
        </PaperModal>
      )}

      {previewDone !== null && (
        <PaperModal title="ทดลองเล่นจบแล้ว" icon={<Check className="w-5 h-5" strokeWidth={3} />} iconBg="#3fd6a8" onClose={() => setPreviewDone(null)}>
          <p className="font-semibold">
            ได้ <b className="text-2xl font-display">{previewDone.toLocaleString('th-TH')}</b> คะแนน
          </p>
          <p className="text-sm font-semibold opacity-70 mt-1">คะแนนจริงตอนเล่นในห้องจะคิดจากความเร็วและการตอบถูกติดกันแบบนี้</p>
          <div className="l5g-math-foot">
            <span className="flex-1" />
            <button type="button" className="l5g-btn l5g-btn-go" onClick={() => setPreviewDone(null)}>
              กลับไปแก้ไข
            </button>
          </div>
        </PaperModal>
      )}

    </div>
  );
}
