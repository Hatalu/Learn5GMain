'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Lock,
  LogIn,
  Crown,
  FileText,
  Files,
  Eye,
  Loader2,
  Check,
  Maximize2,
  Minimize2,
  CalendarDays,
  ImageOff,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { hasMembership } from '@/lib/membership';
import { useMembership } from '@/components/membership/MembershipProvider';
import { SubjectTag } from '@/components/media/SubjectTag';
import { cn } from '@/lib/utils/cn';
import {
  DocumentItem,
  DownloadFormat,
  filesForFormat,
  formatBytes,
  formatsOf,
  previewFiles,
  previewUrl,
} from '@/lib/documents';
import { FileBadge } from './DocIcons';
import { useDocDownload } from './useDocDownload';

interface Props {
  doc: DocumentItem | null;
  /** เปิดมาพร้อมหน้าต่างเลือกไฟล์ดาวน์โหลด (กดปุ่มดาวน์โหลดจากการ์ด) */
  startDownload?: boolean;
  onClose: () => void;
  onViewed?: (id: string) => void;
  onDownloaded?: (id: string) => void;
}

export const DOC_TYPE_STYLE: Record<string, { grad: string; shadow: string }> = {
  เอกสาร: { grad: 'from-sky-400 to-indigo-500', shadow: 'shadow-[0_3px_0_0_rgba(55,48,163,0.5)]' },
  ใบงาน: { grad: 'from-pink-400 to-fuchsia-500', shadow: 'shadow-[0_3px_0_0_rgba(157,23,77,0.45)]' },
};

export function DocumentViewerModal(props: Props) {
  if (!props.doc) return null;
  return <Viewer key={props.doc.id} {...props} doc={props.doc} />;
}

function Viewer({ doc, startDownload, onClose, onViewed, onDownloaded }: Props & { doc: DocumentItem }) {
  const { user, profile } = useAuth();
  const isMember = Boolean(user) && hasMembership(profile);

  // หน้าทั้งหมดเรียงต่อกันทุกไฟล์ที่มีตัวอย่าง (เลขหน้าเดียวต่อเนื่อง)
  const pFiles = useMemo(() => previewFiles(doc.files), [doc.files]);
  const pages = useMemo(
    () => pFiles.flatMap((f, fi) => f.preview.map((p, i) => ({ src: previewUrl(p), fi, local: i + 1, of: f.preview.length }))),
    [pFiles]
  );
  const starts = useMemo(() => {
    const out: number[] = [];
    let n = 0;
    pFiles.forEach((f) => {
      out.push(n);
      n += f.preview.length;
    });
    return out;
  }, [pFiles]);

  const total = pages.length;
  const [page, setPage] = useState(0);
  const [dir, setDir] = useState(1);
  const [draft, setDraft] = useState('1');
  const [zoom, setZoom] = useState(false);
  const [loaded, setLoaded] = useState<Record<number, boolean>>({});
  const [chooser, setChooser] = useState(Boolean(startDownload));
  const stageRef = useRef<HTMLDivElement>(null);
  const thumbsRef = useRef<HTMLDivElement>(null);

  const go = useCallback(
    (n: number) => {
      if (!total) return;
      const next = Math.max(0, Math.min(total - 1, n));
      setPage((cur) => {
        setDir(next >= cur ? 1 : -1);
        return next;
      });
    },
    [total]
  );

  useEffect(() => {
    setDraft(String(page + 1));
    stageRef.current?.scrollTo({ top: 0 });
    // เลื่อนรูปย่อให้เห็นหน้าปัจจุบัน + โหลดหน้าถัดไปไว้ก่อน
    thumbsRef.current?.querySelector<HTMLElement>(`[data-thumb="${page}"]`)?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    [page + 1, page - 1].forEach((i) => {
      if (pages[i]) new Image().src = pages[i].src;
    });
  }, [page, pages]);

  // นับยอดเปิดดู 1 ครั้งต่อการเปิด
  useEffect(() => {
    fetch(`/api/documents/${doc.id}/view`, { method: 'POST' })
      .then((r) => r.json())
      .then((d) => d?.counted && onViewed?.(doc.id))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.id]);

  // คีย์บอร์ด + ล็อกการเลื่อนพื้นหลัง
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      if (e.key === 'Escape') {
        if (chooser) setChooser(false);
        else onClose();
      } else if (!chooser && (e.key === 'ArrowRight' || e.key === 'PageDown')) go(page + 1);
      else if (!chooser && (e.key === 'ArrowLeft' || e.key === 'PageUp')) go(page - 1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [chooser, go, onClose, page]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // ปัดซ้าย/ขวาบนจอสัมผัส
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') swipe.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const s = swipe.current;
    swipe.current = null;
    if (!s || zoom) return;
    const dx = e.clientX - s.x;
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(e.clientY - s.y) * 1.4) go(page + (dx < 0 ? 1 : -1));
  };

  const submitDraft = () => {
    const n = parseInt(draft, 10);
    if (Number.isFinite(n)) go(n - 1);
    else setDraft(String(page + 1));
  };

  const cur = pages[page];
  const fmt = formatsOf(doc.files);
  const pdfCount = doc.files.filter((f) => f.kind === 'pdf').length;
  const wordCount = doc.files.filter((f) => f.kind === 'word').length;
  const typeStyle = DOC_TYPE_STYLE[doc.doc_type] || DOC_TYPE_STYLE['เอกสาร'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-indigo-950/80 backdrop-blur-md animate-fade-in" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={doc.title}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-6xl h-[100dvh] sm:h-[min(92vh,940px)] flex flex-col lg:flex-row overflow-y-auto overscroll-contain lg:overflow-hidden bg-white dark:bg-gray-900 sm:rounded-[2rem] sm:border-[3px] border-indigo-200 dark:border-indigo-500/40 shadow-toy-lg"
      >
        {/* ---------- จอดูหน้าเอกสาร ---------- */}
        <section className="relative shrink-0 h-[68dvh] sm:h-[62vh] lg:h-auto lg:flex-1 lg:min-h-0 flex flex-col bg-gradient-to-br from-indigo-100 via-violet-50 to-sky-100 dark:from-[#1a1438] dark:via-[#161230] dark:to-[#10203a]">
          <div aria-hidden="true" className="absolute inset-0 opacity-50 dark:opacity-30 [background-image:radial-gradient(rgba(124,58,237,0.18)_1.2px,transparent_1.2px)] [background-size:18px_18px]" />

          {/* แถบบน: ไฟล์ที่มีตัวอย่าง + ปุ่มขยาย/ปิด (มือถือ) */}
          <div className="relative z-10 flex items-center gap-2 px-3 sm:px-4 pt-3 pb-2">
            <div className="flex-1 min-w-0 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {pFiles.length > 1 &&
                pFiles.map((f, fi) => {
                  const on = cur?.fi === fi;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => go(starts[fi])}
                      className={cn(
                        'btn-jelly shrink-0 inline-flex items-center gap-1.5 pl-1.5 pr-3 py-1 rounded-full border-2 text-xs font-bold max-w-[13rem]',
                        on
                          ? 'bg-white dark:bg-gray-900 border-indigo-400 text-indigo-700 dark:text-indigo-200 shadow-md'
                          : 'bg-white/60 dark:bg-gray-900/50 border-transparent text-gray-600 dark:text-gray-300 hover:bg-white/90'
                      )}
                      title={f.name}
                    >
                      <FileBadge kind={f.kind} className="w-4 h-5" />
                      <span className="truncate">ไฟล์ {fi + 1}</span>
                      <span className="text-[10px] font-semibold opacity-70">{f.preview.length} หน้า</span>
                    </button>
                  );
                })}
            </div>
            {total > 0 && (
              <button
                type="button"
                onClick={() => setZoom((z) => !z)}
                className="btn-jelly shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/85 dark:bg-gray-900/70 border-2 border-white dark:border-gray-700 text-xs font-bold text-indigo-700 dark:text-indigo-200 shadow-sm"
                aria-pressed={zoom}
              >
                {zoom ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{zoom ? 'พอดีจอ' : 'ขยายเต็มกว้าง'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="lg:hidden btn-jelly shrink-0 p-2 rounded-full bg-white/90 dark:bg-gray-900/80 text-gray-600 dark:text-gray-200 shadow-sm"
              aria-label="ปิดหน้าต่าง"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* หน้ากระดาษ */}
          <div
            ref={stageRef}
            className={cn('relative z-0 flex-1 min-h-0 px-3 sm:px-14 pb-3', zoom ? 'overflow-y-auto' : 'overflow-hidden flex items-center justify-center')}
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onContextMenu={(e) => e.preventDefault()}
          >
            {total === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center gap-3 text-indigo-900/70 dark:text-indigo-100/70">
                <span className="w-16 h-16 rounded-3xl bg-white/80 dark:bg-gray-900/60 flex items-center justify-center shadow-md">
                  <ImageOff className="w-8 h-8" />
                </span>
                <p className="font-bold">ไฟล์นี้ยังไม่มีหน้าตัวอย่าง</p>
                <p className="text-sm max-w-xs">ดูรายชื่อไฟล์ด้านข้าง แล้วดาวน์โหลดไปเปิดในเครื่องได้เลย</p>
              </div>
            ) : (
              <div
                key={page}
                className={cn('relative mx-auto animate-page-in select-none', zoom ? 'w-full max-w-4xl my-1' : 'h-full w-full flex items-center justify-center')}
                style={{ ['--page-from' as string]: `${dir * 26}px` }}
              >
                <div className={cn('relative bg-white rounded-lg shadow-[0_10px_30px_-8px_rgba(49,24,120,0.45)] ring-1 ring-black/5 overflow-hidden', !zoom && 'max-h-full')}>
                  {!loaded[page] && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white">
                      <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                    </div>
                  )}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={cur.src}
                    alt={`หน้า ${page + 1} จาก ${total}`}
                    draggable={false}
                    onLoad={() => setLoaded((l) => ({ ...l, [page]: true }))}
                    className={cn('block pointer-events-none', zoom ? 'w-full h-auto' : 'max-h-[calc(68dvh-8.75rem)] sm:max-h-[calc(62vh-8.75rem)] lg:max-h-[calc(min(92vh,940px)-9.5rem)] w-auto h-auto max-w-full')}
                    style={zoom ? undefined : { minHeight: loaded[page] ? undefined : '40vh', minWidth: loaded[page] ? undefined : '28vh' }}
                  />
                  {/* ป้ายโลโก้มุมหน้า (ลายน้ำหลักฝังอยู่ในรูปแล้ว) */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/logo.png" alt="" aria-hidden="true" draggable={false} className="pointer-events-none absolute right-2 bottom-2 w-9 h-9 rounded-lg opacity-30" />
                </div>
              </div>
            )}

            {total > 1 && !zoom && (
              <>
                <button
                  type="button"
                  onClick={() => go(page - 1)}
                  disabled={page === 0}
                  className="btn-jelly absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/95 dark:bg-gray-900/90 border-2 border-indigo-200 dark:border-indigo-700 text-indigo-600 dark:text-indigo-200 shadow-lg flex items-center justify-center disabled:opacity-30 disabled:pointer-events-none"
                  aria-label="หน้าก่อนหน้า"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  type="button"
                  onClick={() => go(page + 1)}
                  disabled={page >= total - 1}
                  className="btn-jelly absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/95 dark:bg-gray-900/90 border-2 border-indigo-200 dark:border-indigo-700 text-indigo-600 dark:text-indigo-200 shadow-lg flex items-center justify-center disabled:opacity-30 disabled:pointer-events-none"
                  aria-label="หน้าถัดไป"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
          </div>

          {/* แถบล่าง: เลขหน้า + รูปย่อ */}
          {total > 0 && (
            <div className="relative z-10 border-t-2 border-white/70 dark:border-white/10 bg-white/70 dark:bg-gray-900/60 backdrop-blur-md px-3 py-2.5 flex items-center gap-3">
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => go(page - 1)}
                  disabled={page === 0}
                  className="btn-jelly w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-200 flex items-center justify-center disabled:opacity-30"
                  aria-label="หน้าก่อนหน้า"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    submitDraft();
                  }}
                  className="flex items-center gap-1.5 text-sm font-bold text-gray-700 dark:text-gray-200"
                >
                  <span className="hidden sm:inline">หน้า</span>
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                    onBlur={submitDraft}
                    onFocus={(e) => e.target.select()}
                    inputMode="numeric"
                    aria-label="ไปที่หน้า"
                    className="w-12 h-9 rounded-xl border-2 border-indigo-200 dark:border-indigo-700 bg-white dark:bg-gray-800 text-center font-display text-base text-indigo-700 dark:text-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                  <span className="whitespace-nowrap">/ {total}</span>
                </form>
                <button
                  type="button"
                  onClick={() => go(page + 1)}
                  disabled={page >= total - 1}
                  className="btn-jelly w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-200 flex items-center justify-center disabled:opacity-30"
                  aria-label="หน้าถัดไป"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              <div ref={thumbsRef} className="hidden sm:flex flex-1 min-w-0 items-center gap-2 overflow-x-auto no-scrollbar py-1">
                {pages.map((p, i) => (
                  <button
                    key={i}
                    type="button"
                    data-thumb={i}
                    onClick={() => go(i)}
                    className={cn(
                      'relative shrink-0 h-14 w-10 rounded-md overflow-hidden bg-white border-2 transition-transform',
                      i === page ? 'border-indigo-500 scale-110 shadow-md' : 'border-transparent opacity-70 hover:opacity-100'
                    )}
                    aria-label={`ไปหน้า ${i + 1}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.src} alt="" loading="lazy" draggable={false} className="w-full h-full object-cover object-top" />
                    <span className="absolute bottom-0 inset-x-0 text-[9px] font-bold text-white bg-indigo-900/60 text-center leading-tight">{i + 1}</span>
                  </button>
                ))}
              </div>
              {pFiles.length > 1 && cur && (
                <span className="sm:hidden ml-auto text-xs font-semibold text-gray-500 dark:text-gray-400 truncate">
                  ไฟล์ {cur.fi + 1} หน้า {cur.local}/{cur.of}
                </span>
              )}
            </div>
          )}
        </section>

        {/* ---------- รายละเอียด ---------- */}
        <aside className="relative w-full lg:w-[360px] shrink-0 flex flex-col border-t-[3px] lg:border-t-0 lg:border-l-[3px] border-indigo-100 dark:border-indigo-900/60 bg-white dark:bg-gray-900">
          <button
            type="button"
            onClick={onClose}
            className="hidden lg:flex absolute top-4 right-4 z-10 btn-jelly p-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-gray-900 dark:hover:text-white"
            aria-label="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="lg:flex-1 lg:overflow-y-auto p-5 sm:p-6 space-y-4">
            <span className={cn('inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r text-white text-xs font-bold', typeStyle.grad, typeStyle.shadow)}>
              <FileText className="w-3.5 h-3.5" />
              {doc.doc_type}
            </span>
            <h2 className="font-display text-xl sm:text-2xl leading-snug text-gray-900 dark:text-white pr-10">{doc.title}</h2>
            <div className="flex flex-wrap items-center gap-1.5">
              <SubjectTag subject={doc.subject} size="sm" />
              {doc.grade_level.map((g) => (
                <span key={g} className="px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                  {g}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: Files, label: 'ไฟล์', value: doc.files.length },
                { icon: FileText, label: 'หน้า', value: doc.page_count || total },
                { icon: Download, label: 'ดาวน์โหลด', value: doc.download_count },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="rounded-2xl border-2 border-indigo-100 dark:border-indigo-900/60 bg-indigo-50/60 dark:bg-indigo-950/30 px-2 py-2.5 text-center">
                  <Icon className="w-4 h-4 mx-auto text-indigo-500" />
                  <p className="font-display text-lg leading-tight text-gray-900 dark:text-white mt-1">{value.toLocaleString('th-TH')}</p>
                  <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">{label}</p>
                </div>
              ))}
            </div>

            {doc.description && <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line">{doc.description}</p>}

            <div>
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">
                ไฟล์ในชุดนี้{pdfCount > 0 && ` · PDF ${pdfCount}`}
                {wordCount > 0 && ` · Word ${wordCount}`}
              </p>
              <ul className="space-y-1.5">
                {doc.files.map((f, i) => (
                  <li key={f.id || i} className="flex items-center gap-2.5 p-2 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800">
                    <FileBadge kind={f.kind} className="w-7 h-8" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate" title={f.name}>
                        {f.name}
                      </p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">
                        {formatBytes(f.size)}
                        {f.pages > 0 && ` · ${f.pages} หน้า`}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
              <span className="inline-flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" /> {doc.view_count.toLocaleString('th-TH')} ครั้ง
              </span>
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="w-3.5 h-3.5" />
                {new Date(doc.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}
              </span>
            </div>
          </div>

          <div className="sticky bottom-0 z-10 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm p-4 sm:p-5 border-t-2 border-dashed border-indigo-100 dark:border-indigo-900/60 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <button
              type="button"
              onClick={() => setChooser(true)}
              className="btn-jelly btn-primary-grad w-full py-3.5 rounded-2xl font-display text-lg flex items-center justify-center gap-2"
            >
              {isMember ? <Download className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
              <span>ดาวน์โหลด</span>
            </button>
            <p className="mt-2 text-center text-xs text-gray-500 dark:text-gray-400">
              {isMember ? 'เลือกได้ PDF / Word / Word + PDF' : 'ดาวน์โหลดได้เฉพาะสมาชิก ดูตัวอย่างได้ทุกคน'}
            </p>
          </div>
        </aside>

        {chooser && (
          <DownloadChooser
            doc={doc}
            isMember={isMember}
            loggedIn={Boolean(user)}
            available={fmt}
            onClose={() => setChooser(false)}
            onDownloaded={() => onDownloaded?.(doc.id)}
          />
        )}
      </div>
    </div>
  );
}

const OPTIONS: { id: DownloadFormat; title: string; note: string; tone: string; ring: string }[] = [
  { id: 'pdf', title: 'PDF', note: 'พร้อมพิมพ์ หน้าตาเหมือนต้นฉบับ', tone: 'from-rose-400 to-red-500', ring: 'hover:border-rose-300 dark:hover:border-rose-500/60' },
  { id: 'word', title: 'Word', note: 'แก้ไขเนื้อหาได้เอง', tone: 'from-sky-400 to-blue-600', ring: 'hover:border-sky-300 dark:hover:border-sky-500/60' },
  { id: 'both', title: 'Word + PDF', note: 'ได้ครบทั้งสองแบบ รวมเป็นไฟล์ .zip', tone: 'from-violet-500 to-fuchsia-500', ring: 'hover:border-violet-300 dark:hover:border-violet-500/60' },
];

function DownloadChooser({
  doc,
  isMember,
  loggedIn,
  available,
  onClose,
  onDownloaded,
}: {
  doc: DocumentItem;
  isMember: boolean;
  loggedIn: boolean;
  available: { pdf: boolean; word: boolean; both: boolean };
  onClose: () => void;
  onDownloaded: () => void;
}) {
  const { fromPrice } = useMembership();
  const { state, download, reset } = useDocDownload();
  const [picked, setPicked] = useState<DownloadFormat | null>(null);
  const busy = state.phase === 'asking' || state.phase === 'fetching' || state.phase === 'zipping';
  const locked = !isMember;

  const choose = async (f: DownloadFormat) => {
    if (busy || locked || !available[f]) return;
    setPicked(f);
    if (await download(doc.id, f)) onDownloaded();
  };

  return (
    <div className="fixed inset-0 z-30 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-indigo-950/55 backdrop-blur-sm animate-fade-in" onClick={() => !busy && onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="เลือกรูปแบบไฟล์ที่จะดาวน์โหลด"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full sm:max-w-md bg-white dark:bg-gray-900 rounded-t-[2rem] sm:rounded-[2rem] border-[3px] border-indigo-200 dark:border-indigo-500/40 shadow-toy-lg p-5 sm:p-6 animate-sheet-up sm:animate-pop-in"
      >
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="absolute top-4 right-4 btn-jelly p-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-gray-900 dark:hover:text-white disabled:opacity-40"
          aria-label="ปิด"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 pr-10">
          <span className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Download className="w-5 h-5" />
          </span>
          <div className="min-w-0">
            <p className="font-display text-lg leading-tight text-gray-900 dark:text-white">ดาวน์โหลดไฟล์</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{doc.title}</p>
          </div>
        </div>

        {locked && (
          <div className="mt-4 p-3.5 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/30 border-2 border-amber-200 dark:border-amber-800/60">
            <p className="text-sm font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
              <Lock className="w-4 h-4" /> ดาวน์โหลดได้เฉพาะสมาชิก
            </p>
            <p className="text-xs text-amber-800/90 dark:text-amber-300/90 mt-0.5">
              {loggedIn ? `สมัครสมาชิกเริ่ม ${fromPrice} บาท แล้วโหลดได้ทุกเอกสารและใบงาน` : 'เข้าสู่ระบบ แล้วสมัครสมาชิกเพื่อดาวน์โหลด'}
            </p>
          </div>
        )}

        <div className="mt-4 space-y-2.5">
          {OPTIONS.map((o) => {
            const files = filesForFormat(doc.files, o.id);
            const size = files.reduce((n, f) => n + f.size, 0);
            const ok = available[o.id];
            const active = picked === o.id && busy;
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => choose(o.id)}
                disabled={!ok || locked || busy}
                className={cn(
                  'group w-full flex items-center gap-3 p-3 rounded-2xl border-2 text-left transition-all',
                  ok && !locked
                    ? cn('btn-jelly bg-white dark:bg-gray-800/70 border-gray-200 dark:border-gray-700 shadow-[0_4px_0_0_rgba(95,47,212,0.12)]', o.ring)
                    : 'bg-gray-50 dark:bg-gray-800/30 border-gray-100 dark:border-gray-800 opacity-60 cursor-not-allowed',
                  active && 'border-indigo-400 ring-2 ring-indigo-300/50'
                )}
              >
                <span className={cn('relative w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center shrink-0 shadow-md', o.tone)}>
                  {o.id === 'both' ? (
                    <span className="relative w-8 h-8">
                      <FileBadge kind="word" className="absolute left-0 top-0 w-5 h-6" />
                      <FileBadge kind="pdf" className="absolute right-0 bottom-0 w-5 h-6" />
                    </span>
                  ) : (
                    <FileBadge kind={o.id === 'pdf' ? 'pdf' : 'word'} className="w-6 h-7" />
                  )}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block font-display text-base text-gray-900 dark:text-white">{o.title}</span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400">
                    {ok ? `${files.length} ไฟล์ · ${formatBytes(size)} · ${o.note}` : 'ไม่มีไฟล์รูปแบบนี้ในชุดนี้'}
                  </span>
                </span>
                <span className="shrink-0">
                  {active ? (
                    <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                  ) : locked ? (
                    <Lock className="w-4 h-4 text-gray-400" />
                  ) : ok ? (
                    <Download className="w-5 h-5 text-indigo-500 group-hover:translate-y-0.5 transition-transform" />
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-4 min-h-[1.5rem] text-center text-sm" aria-live="polite">
          {state.phase === 'asking' && <span className="text-gray-500 dark:text-gray-400">กำลังเตรียมไฟล์...</span>}
          {state.phase === 'fetching' && (
            <span className="text-gray-500 dark:text-gray-400">
              กำลังโหลดไฟล์ {state.done + 1} / {state.total}
            </span>
          )}
          {state.phase === 'zipping' && <span className="text-gray-500 dark:text-gray-400">กำลังรวมไฟล์เป็น .zip...</span>}
          {state.phase === 'done' && (
            <span className="inline-flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
              <Check className="w-4 h-4" /> เริ่มดาวน์โหลดแล้ว
            </span>
          )}
          {state.phase === 'error' && (
            <span className="text-rose-600 dark:text-rose-400 font-semibold">
              {state.message}{' '}
              <button type="button" onClick={reset} className="underline">
                ปิด
              </button>
            </span>
          )}
        </div>

        {locked && (
          <div className="mt-3">
            {loggedIn ? (
              <JoinCta fromPrice={fromPrice} />
            ) : (
              <Link href={`/login?redirect=${encodeURIComponent('/home?lib=docs')}`} className="btn-jelly btn-primary-grad w-full py-3 rounded-2xl font-bold flex items-center justify-center gap-2">
                <LogIn className="w-4 h-4" /> เข้าสู่ระบบ
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function JoinCta({ fromPrice }: { fromPrice: number }) {
  const { openCheckout } = useMembership();
  return (
    <button type="button" onClick={() => openCheckout()} className="btn-jelly w-full py-3 rounded-2xl font-bold flex items-center justify-center gap-2 bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-[0_4px_0_0_rgba(194,65,12,0.45)]">
      <Crown className="w-4 h-4" /> สมัครสมาชิก เริ่ม {fromPrice} บาท
    </button>
  );
}
