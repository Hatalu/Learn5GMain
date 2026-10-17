'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ExternalLink, Loader2, Maximize2, Minimize2, PlayCircle, X } from 'lucide-react';
import { Buddy } from '@/components/companion/Buddy';
import { MediaItem } from '@/types/database';
import { youTubeEmbedUrl, youTubeId, youTubeStart, youTubeWatchUrl } from '@/lib/youtube';
import { cn } from '@/lib/utils/cn';

type FsDoc = Document & { webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => Promise<void> | void };
type FsEl = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };
const fsElement = () => (document as FsDoc).fullscreenElement || (document as FsDoc).webkitFullscreenElement || null;

/**
 * จอดูวิดีโอ: หน้าตาเดียวกับจอเล่นเกม แต่ข้างในเป็นคลิป YouTube ที่ Dev ใส่ลิงก์ไว้
 * ทุกคนดูได้ ไม่ต้องล็อกอิน/เป็นสมาชิก เปิดแล้วเล่นทันที
 */
export function VideoModal({ media, onClose }: { media: MediaItem; onClose: () => void }) {
  const id = youTubeId(media.game_url);
  const start = youTubeStart(media.game_url);
  const [loaded, setLoaded] = useState(false);

  /** เต็มจอ: Fullscreen API ถ้าได้ ไม่งั้นขยายเต็มหน้าต่าง (iPhone) */
  const [max, setMax] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const fsExitAt = useRef(0);

  // นับยอดวิว 1 ครั้งต่อการเปิด (เซิร์ฟเวอร์กันปั่นยอดเอง)
  useEffect(() => {
    if (!id) return;
    fetch(`/api/media/${media.id}/view`, { method: 'POST' }).catch(() => null);
  }, [id, media.id]);

  const exitFs = useCallback(() => {
    const d = document as FsDoc;
    if (!fsElement()) return;
    try {
      const r = d.exitFullscreen ? d.exitFullscreen() : d.webkitExitFullscreen?.();
      if (r && typeof (r as Promise<void>).catch === 'function') (r as Promise<void>).catch(() => null);
    } catch {
      /* ไม่เป็นไร */
    }
  }, []);

  const toggleMax = async () => {
    if (max) {
      exitFs();
      setMax(false);
      return;
    }
    setMax(true);
    const el = boxRef.current as FsEl | null;
    if (!el) return;
    try {
      if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' });
      else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
    } catch {
      /* เต็มจอจริงไม่ได้: ขยายเต็มหน้าต่างแทน */
    }
  };

  useEffect(() => {
    const onFs = () => {
      if (!fsElement()) {
        fsExitAt.current = Date.now();
        setMax(false);
      }
    };
    document.addEventListener('fullscreenchange', onFs);
    document.addEventListener('webkitfullscreenchange', onFs);
    return () => {
      document.removeEventListener('fullscreenchange', onFs);
      document.removeEventListener('webkitfullscreenchange', onFs);
      exitFs();
    };
  }, [exitFs]);

  const close = useCallback(() => {
    exitFs();
    onClose();
  }, [exitFs, onClose]);

  // Esc: เต็มจออยู่ = ย่อก่อน ไม่งั้นปิด + ล็อก scroll พื้นหลัง
  const maxRef = useRef(max);
  maxRef.current = max;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (fsElement() || Date.now() - fsExitAt.current < 600) return;
      if (maxRef.current) {
        setMax(false);
        return;
      }
      onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const btn = 'btn-jelly inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-sm font-semibold';

  return (
    <div
      className={cn('fixed inset-0 z-[70] flex items-center justify-center bg-indigo-950/80 backdrop-blur-md animate-fade-in', max ? 'p-0' : 'p-2 sm:p-5')}
      onMouseDown={close}
    >
      <div
        ref={boxRef}
        role="dialog"
        aria-modal="true"
        aria-label={`ดูวิดีโอ ${media.title}`}
        onMouseDown={(e) => e.stopPropagation()}
        className={cn(
          'relative flex flex-col overflow-hidden bg-gray-950 shadow-toy-lg',
          max ? 'w-screen h-[100dvh] rounded-none border-0' : 'w-[min(98vw,1280px)] h-[min(94vh,860px)] rounded-[1.5rem] sm:rounded-[2rem] border-2 border-rose-300/60 dark:border-rose-700/70 animate-pop-in'
        )}
      >
        {/* แถบหัว */}
        <div className="shrink-0 flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-2.5 bg-gray-900 text-white border-b border-white/10">
          <span className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 text-white text-sm font-bold shadow-[0_2px_0_0_rgba(136,19,55,0.6)]">
            <PlayCircle className="w-4 h-4" /> <span className="hidden min-[400px]:inline">กำลังดู</span>
          </span>
          <p className="flex-1 min-w-0 truncate font-display text-sm sm:text-base">{media.title}</p>
          {id && (
            <a
              href={youTubeWatchUrl(id, start)}
              target="_blank"
              rel="noopener noreferrer"
              className={btn}
              aria-label="เปิดคลิปนี้ใน YouTube"
              title="เปิดใน YouTube"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="hidden md:inline">YouTube</span>
            </a>
          )}
          <button type="button" onClick={toggleMax} aria-label={max ? 'ย่อจอวิดีโอ' : 'ขยายเต็มจอ'} title={max ? 'ย่อจอวิดีโอ' : 'ขยายเต็มจอ'} className={btn}>
            {max ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            <span className="hidden sm:inline">{max ? 'ย่อจอ' : 'เต็มจอ'}</span>
          </button>
          <button type="button" onClick={close} aria-label="ปิดวิดีโอ" className={btn}>
            <X className="w-4 h-4" /> <span className="hidden sm:inline">ปิด</span>
          </button>
        </div>

        {/* จอวิดีโอ (YouTube จัดขอบดำให้เองทั้งคลิปแนวนอนและ Shorts) */}
        <div className="relative flex-1 min-h-0 bg-black">
          {id ? (
            <iframe
              src={youTubeEmbedUrl(id, start)}
              title={media.title}
              onLoad={() => setLoaded(true)}
              className={cn('absolute inset-0 w-full h-full border-0 transition-opacity duration-500', loaded ? 'opacity-100' : 'opacity-0')}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-white">
              <div className="max-w-sm">
                <p className="font-display text-xl mb-2">เปิดวิดีโอไม่ได้</p>
                <p className="text-white/80 mb-5">ลิงก์คลิปของสื่อนี้ไม่ถูกต้อง แจ้งทีมงานผ่านเพจได้เลย</p>
                <button onClick={close} className="btn-primary-grad btn-jelly px-6 py-3 rounded-2xl font-display">
                  ปิด
                </button>
              </div>
            </div>
          )}

          {id && !loaded && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 text-white bg-gray-950">
              <Buddy stage={1} size={84} animate={false} />
              <p className="inline-flex items-center gap-2 font-display">
                <Loader2 className="w-5 h-5 animate-spin" /> กำลังเปิดวิดีโอ...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
