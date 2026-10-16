'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { MediaItem } from '@/types/database';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import {
  X,
  ExternalLink,
  Eye,
  Heart,
  Crown,
  Sparkles,
  Lock,
  Unlock,
  LogIn,
  Layers,
  Calendar,
  MessageCircle,
  Copy,
  Check,
  Play,
} from 'lucide-react';
import { FacebookIcon } from '@/components/icons/FacebookIcon';
import { cn } from '@/lib/utils/cn';
import { SubjectTag } from '@/components/media/SubjectTag';
import { useCompanion } from '@/components/companion/CompanionProvider';
import { useTrial } from '@/components/trial/TrialProvider';
import { CONTACT_PAGE_URL, hasMembership } from '@/lib/membership';

interface MediaDetailModalProps {
  media: MediaItem | null;
  isOpen: boolean;
  onClose: () => void;
  isFavorite: boolean;
  onToggleFavorite: (mediaId: string, currentFav: boolean) => void;
  onMediaOpened?: (mediaId: string) => void;
}

export function MediaDetailModal({
  media,
  isOpen,
  onClose,
  isFavorite,
  onToggleFavorite,
  onMediaOpened,
}: MediaDetailModalProps) {
  const { user, profile, isDev } = useAuth();
  const { dailyUnlockedId } = useCompanion();
  const { openTrial, openPlay } = useTrial();
  const { success, error } = useToast();
  const [copiedPage, setCopiedPage] = useState(false);
  const [hasClickedRecently, setHasClickedRecently] = useState(false);
  const [localViews, setLocalViews] = useState(media?.view_count || 0);

  // Sync local views when media changes
  React.useEffect(() => {
    if (media) {
      setLocalViews(media.view_count);
      setHasClickedRecently(false);
    }
  }, [media]);

  // ปิดด้วย Esc + ล็อก scroll พื้นหลังระหว่างเปิด popup
  React.useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen || !media) return null;

  // เกมประจำวันที่แอดมินตั้งให้ "เปิดให้ทุกคนเล่นเฉพาะวันนั้น" (โปรโมต) ทุกคนเล่นได้
  const isDailyFree = dailyUnlockedId === media.id;

  // ทุกสื่อสำหรับสมาชิก: ต้องล็อกอิน + สิทธิ์สมาชิกยังไม่หมดอายุ (Dev เล่นได้เสมอ)
  const isMemberActive = Boolean(user) && hasMembership(profile);
  const canAccess = isDailyFree || isMemberActive;

  const handleOpenMedia = async () => {
    if (!canAccess) {
      if (!user) {
        error('คุณยังไม่ได้เข้าสู่ระบบ กรุณาเข้าสู่ระบบก่อนใช้งานสื่อ');
      } else {
        error('ต้องเป็นสมาชิกก่อน สมัครออนไลน์ได้เลย เริ่ม 39 บาท (หรือกดทดลองเล่นได้เลย)');
      }
      return;
    }

    // (ดาว/สติกเกอร์ของคู่หูจะให้ตอนปิดเกม ดู TrialProvider)

    // Debounce view count increment
    if (!hasClickedRecently) {
      setHasClickedRecently(true);
      setLocalViews((v) => v + 1);

      // นับยอดวิวเบื้องหลัง ไม่ต้องรอ (เกมเปิดทันที)
      fetch(`/api/media/${media.id}/view`, { method: 'POST' })
        .then(() => onMediaOpened?.(media.id))
        .catch((err) => console.error('Failed to increment view count:', err));

      setTimeout(() => {
        setHasClickedRecently(false);
      }, 5000);
    }

    // เปิดเกมบนหน้าเดิมเหมือนทดลองเล่น (ไม่ต้องใส่รหัส ระบบล็อกอินเกมให้เอง ไม่มีนาฬิกา)
    // เกมของเว็บอื่นที่ฝังไม่ได้จะเปิดแท็บใหม่ให้เองในโมดัล
    // ปิดป๊อปอัปรายละเอียดก่อน เพื่อให้หน้าฉลองรางวัลของคู่หูขึ้นเด่นเมื่อกลับมา
    onClose();
    openPlay(media);
  };

  const handleCopyPage = () => {
    navigator.clipboard.writeText('สื่อการสอน 5G');
    setCopiedPage(true);
    success('คัดลอกชื่อเพจ "สื่อการสอน 5G" แล้ว');
    setTimeout(() => setCopiedPage(false), 2500);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-indigo-950/70 backdrop-blur-md animate-fade-in overflow-y-auto"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={media.title}
        className="relative w-full max-w-2xl bg-white dark:bg-gray-900 rounded-[2rem] p-5 sm:p-7 shadow-toy-lg border-2 border-indigo-200 dark:border-indigo-900 animate-pop-in my-auto overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors z-20"
          aria-label="ปิดหน้าต่าง"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header & Content Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 sm:gap-6 items-start">
          {/* Left Column: Image Thumbnail */}
          <div className="sm:col-span-5 flex flex-col gap-3">
            <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200/80 dark:border-gray-800 shadow-md">
              <Image
                src={media.icon_url}
                alt={media.title}
                fill
                sizes="(max-width: 640px) 100vw, 300px"
                className="object-cover"
              />

              {/* ป้ายสถานะ */}
              {(isDailyFree || !canAccess) && (
                <div className="absolute top-3 left-3">
                  {isDailyFree ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500 text-white shadow-md shadow-emerald-500/30">
                      <Unlock className="w-3.5 h-3.5" />
                      <span>ฟรีวันนี้</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/30">
                      <Lock className="w-3.5 h-3.5" />
                      <span>สำหรับสมาชิก</span>
                    </span>
                  )}
                </div>
              )}

              {/* View Count Tag */}
              <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-white text-xs font-medium flex items-center gap-1.5 shadow-sm">
                <Eye className="w-3.5 h-3.5 opacity-90" />
                <span>{localViews.toLocaleString('th-TH')} ครั้ง</span>
              </div>
            </div>

            {/* Favorite Button (Full Width in Left Col) */}
            <button
              onClick={() => {
                if (!user) return;
                onToggleFavorite(media.id, isFavorite);
              }}
              disabled={!user}
              className={cn(
                !user && 'opacity-50 cursor-not-allowed',
                'w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 border transition-all duration-200 shadow-sm active:scale-98',
                isFavorite
                  ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400'
                  : 'bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              )}
            >
              <Heart className={cn('w-4 h-4 transition-transform active:scale-75', isFavorite && 'fill-current text-rose-500')} />
              <span>{!user ? 'เข้าสู่ระบบเพื่อกดถูกใจ' : isFavorite ? 'ถูกใจแล้ว' : 'ถูกใจเกมนี้'}</span>
            </button>
          </div>

          {/* Right Column: Information & Actions */}
          <div className="sm:col-span-7 flex flex-col justify-between h-full space-y-4">
            <div>
              {/* Badges Row: Subject, Grade, Type */}
              <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                <SubjectTag subject={media.subject} size="md" />

                {media.grade_level?.map((grade) => (
                  <span
                    key={grade}
                    className="px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200/60 dark:border-gray-700/60"
                  >
                    {grade}
                  </span>
                ))}

                <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60 flex items-center gap-1">
                  <Layers className="w-3 h-3" />
                  <span>{media.media_type}</span>
                </span>
              </div>

              {/* Title */}
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white leading-snug">
                {media.title}
              </h2>

              {/* Description */}
              <div className="mt-3 p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800/80">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                  {media.description || 'ไม่มีคำอธิบายเพิ่มเติมสำหรับสื่อการสอนนี้'}
                </p>
              </div>

              {/* Metadata row */}
              <div className="mt-3 flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>
                    เผยแพร่: {new Date(media.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </span>
                </div>
              </div>
            </div>

            {/* Access Permission & Action Button Area */}
            <div className="pt-2 border-t border-gray-100 dark:border-gray-800 space-y-3">
              {/* Case 1: เกมประจำวันที่เปิดให้ทุกคน */}
              {isDailyFree ? (
                <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 flex items-start gap-2.5">
                  <Unlock className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                      แจกเล่นฟรีวันนี้ (เกมประจำวัน)
                    </p>
                    <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                      วันนี้เล่นได้เลยไม่ต้องเข้าสู่ระบบ พรุ่งนี้กลับเป็นสื่อสำหรับสมาชิกตามเดิม
                    </p>
                  </div>
                </div>
              ) : !user ? null /* ยังไม่ได้ล็อกอิน: ไม่มีกล่องข้อความ ใช้ปุ่มด้านล่างแทน */ : !isMemberActive ? (
                /* Case 3: ล็อกอินแล้วแต่ยังไม่มีสิทธิ์/สิทธิ์หมดอายุ */
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href="/membership"
                      onClick={onClose}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold shadow-sm active:scale-95 transition-all"
                    >
                      <Crown className="w-3.5 h-3.5" />
                      <span>ดูแพลนสมาชิก</span>
                    </Link>
                    <a
                      href={CONTACT_PAGE_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm active:scale-95 transition-all"
                    >
                      <FacebookIcon className="w-3.5 h-3.5" />
                      <span>ติดต่อเพจ Facebook สื่อการสอน 5G</span>
                    </a>
                    <button
                      onClick={handleCopyPage}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-gray-800 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 text-xs font-semibold shadow-sm active:scale-95 transition-all"
                    >
                      {copiedPage ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedPage ? 'คัดลอกแล้ว!' : 'คัดลอกชื่อเพจ'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Case 4: สมาชิกที่สิทธิ์ยังไม่หมดอายุ หรือ Dev */
                <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-indigo-900 dark:text-indigo-200">
                      {isDev ? 'สิทธิ์ผู้พัฒนา (Dev Access)' : 'สิทธิ์สมาชิกพร้อมใช้งาน'}
                    </p>
                    <p className="text-xs text-indigo-700 dark:text-indigo-400 mt-0.5">
                      {isDev
                        ? 'คุณสามารถเปิดใช้งานสื่อได้ทุกรายการ'
                        : `วันหมดอายุ: ${new Date(profile!.premium_until!).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}`}
                    </p>
                  </div>
                </div>
              )}

              {/* MAIN ACTION BUTTON: "ใช้งานสื่อ" */}
              {canAccess ? (
                <button
                  onClick={handleOpenMedia}
                  className="btn-primary-grad w-full py-4 px-6 rounded-2xl font-display font-medium text-base sm:text-lg flex items-center justify-center gap-2 group"
                >
                  <span>เล่นเลย!</span>
                  <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </button>
              ) : !user ? (
                <Link
                  href="/login"
                  className="btn-primary-grad w-full py-4 px-6 rounded-2xl font-display font-medium text-base sm:text-lg flex items-center justify-center gap-2"
                >
                  <LogIn className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>เข้าสู่ระบบเพื่อใช้งานสื่อ</span>
                </Link>
              ) : (
                <button
                  onClick={handleOpenMedia}
                  className="w-full py-3.5 px-6 rounded-2xl bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-bold text-sm sm:text-base border border-gray-300 dark:border-gray-700 flex items-center justify-center gap-2 cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-750 transition-colors"
                >
                  <Lock className="w-4 h-4 text-amber-500" />
                  <span>ต้องเป็นสมาชิกก่อน</span>
                </button>
              )}

              {/* ทดลองเล่น: ทุกเกม ทุกคน (ไม่ต้องสมัคร) จอทดลองเปิดบนหน้านี้ มีเวลา 5 นาที */}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  openTrial(media);
                }}
                className="btn-jelly w-full py-3 px-5 rounded-2xl border-2 border-sun-500/60 bg-sun-400/20 text-amber-900 dark:text-sun-300 font-bold flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>ทดลองเล่น 5 นาที</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
