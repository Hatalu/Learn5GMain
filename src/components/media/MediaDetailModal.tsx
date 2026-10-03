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
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

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

  if (!isOpen || !media) return null;

  const isFree = (media.access_tier || 'premium') === 'free';

  // Check premium status for logged in member
  const checkPremiumActive = (): boolean => {
    if (isDev) return true;
    if (!profile?.premium_until || profile.premium_until === '-' || profile.premium_until.trim() === '') {
      return false;
    }
    const expireDate = new Date(profile.premium_until);
    if (isNaN(expireDate.getTime())) return false;
    return expireDate.getTime() > Date.now();
  };

  const isPremiumActive = checkPremiumActive();

  // Can user open the media?
  // 1. Free media: ANYONE can open (even guests)
  // 2. Premium media: requires login AND (isDev OR isPremiumActive)
  const canAccess = isFree || (Boolean(user) && (isDev || isPremiumActive));

  const handleOpenMedia = async () => {
    if (!canAccess) {
      if (!user) {
        error('คุณยังไม่ได้เข้าสู่ระบบ กรุณาเข้าสู่ระบบก่อนใช้งานสื่อ');
      } else {
        error('ต้องเป็นสมาชิก Premium ก่อน ติดต่อได้ทางเพจ สื่อการสอน 5G');
      }
      return;
    }

    // Debounce view count increment
    if (!hasClickedRecently) {
      setHasClickedRecently(true);
      setLocalViews((v) => v + 1);

      try {
        await fetch(`/api/media/${media.id}/view`, { method: 'POST' });
        if (onMediaOpened) onMediaOpened(media.id);
      } catch (err) {
        console.error('Failed to increment view count:', err);
      }

      setTimeout(() => {
        setHasClickedRecently(false);
      }, 5000);
    }

    // Open game URL in new tab
    window.open(media.game_url, '_blank', 'noopener,noreferrer');
  };

  const handleCopyPage = () => {
    navigator.clipboard.writeText('สื่อการสอน 5G');
    setCopiedPage(true);
    success('คัดลอกชื่อเพจ "สื่อการสอน 5G" แล้ว');
    setTimeout(() => setCopiedPage(false), 2500);
  };

  const getSubjectBadge = (subject: string) => {
    switch (subject) {
      case 'คณิตศาสตร์':
        return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';
      case 'วิทยาศาสตร์':
        return 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30';
      case 'ภาษาอังกฤษ':
        return 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30';
      default:
        return 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30';
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md animate-fade-in overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-white dark:bg-gray-900 rounded-3xl p-5 sm:p-7 shadow-2xl border border-gray-200 dark:border-gray-800 animate-scale-up my-auto overflow-hidden"
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

              {/* Tier Overlay Badge */}
              <div className="absolute top-3 left-3">
                {isFree ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500 text-white shadow-md shadow-emerald-500/30">
                    <Unlock className="w-3.5 h-3.5" />
                    <span>FREE</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/30">
                    <Crown className="w-3.5 h-3.5" />
                    <span>PREMIUM</span>
                  </span>
                )}
              </div>

              {/* View Count Tag */}
              <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-white text-xs font-medium flex items-center gap-1.5 shadow-sm">
                <Eye className="w-3.5 h-3.5 opacity-90" />
                <span>{localViews.toLocaleString('th-TH')} ครั้ง</span>
              </div>
            </div>

            {/* Favorite Button (Full Width in Left Col) */}
            <button
              onClick={() => {
                if (!user) {
                  error('คุณยังไม่ได้เข้าสู่ระบบ กรุณาเข้าสู่ระบบเพื่อบันทึกรายการโปรด');
                  return;
                }
                onToggleFavorite(media.id, isFavorite);
              }}
              className={cn(
                'w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 border transition-all duration-200 shadow-sm active:scale-98',
                isFavorite
                  ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400'
                  : 'bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              )}
            >
              <Heart
                className={cn(
                  'w-4 h-4 transition-transform active:scale-75',
                  isFavorite && 'fill-current text-rose-500'
                )}
              />
              <span>{isFavorite ? 'อยู่ในรายการโปรดแล้ว' : 'เพิ่มในรายการโปรด'}</span>
            </button>
          </div>

          {/* Right Column: Information & Actions */}
          <div className="sm:col-span-7 flex flex-col justify-between h-full space-y-4">
            <div>
              {/* Badges Row: Subject, Grade, Type */}
              <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                <span
                  className={cn(
                    'px-2.5 py-0.5 rounded-md text-xs font-semibold border',
                    getSubjectBadge(media.subject)
                  )}
                >
                  {media.subject}
                </span>

                {media.grade_level?.map((grade) => (
                  <span
                    key={grade}
                    className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200/60 dark:border-gray-700/60"
                  >
                    {grade}
                  </span>
                ))}

                <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60 flex items-center gap-1">
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
              <div className="mt-3 flex items-center gap-4 text-[11px] text-gray-400 dark:text-gray-500">
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
              {/* Case 1: Free Media */}
              {isFree ? (
                <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 flex items-start gap-2.5">
                  <Unlock className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                      สื่อฟรีสำหรับทุกคน (Free Access)
                    </p>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                      คุณสามารถเปิดใช้งานสื่อการสอนนี้ได้ทันที ไม่จำเป็นต้องเข้าสู่ระบบ
                    </p>
                  </div>
                </div>
              ) : !user ? (
                /* Case 2: Premium Media - User NOT logged in */
                <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60">
                  <div className="flex items-start gap-2.5">
                    <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
                        ยังไม่ได้เข้าสู่ระบบ
                      </p>
                      <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5 leading-relaxed">
                        สื่อนี้เป็นสื่อระดับ Premium กรุณาเข้าสู่ระบบด้วยบัญชีสมาชิกเพื่อเปิดเข้าใช้งาน
                      </p>
                    </div>
                  </div>
                  <div className="mt-2.5 pt-2 border-t border-amber-200/60 dark:border-amber-900/60 flex items-center justify-between">
                    <span className="text-[11px] text-amber-700 dark:text-amber-400">
                      มีบัญชีสมาชิกอยู่แล้ว?
                    </span>
                    <Link
                      href="/login"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>ไปที่หน้าเข้าสู่ระบบ</span>
                    </Link>
                  </div>
                </div>
              ) : !isDev && !isPremiumActive ? (
                /* Case 3: Premium Media - Logged in Member but Premium Expired or '-' */
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/50 dark:to-orange-950/40 border border-amber-300 dark:border-amber-800/80">
                  <div className="flex items-start gap-2.5">
                    <Crown className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0 animate-bounce" />
                    <div>
                      <p className="text-xs sm:text-sm font-bold text-amber-900 dark:text-amber-200">
                        ต้องเป็นสมาชิก Premium ก่อน ติดต่อได้ทางเพจ สื่อการสอน 5G
                      </p>
                      <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-1 leading-relaxed">
                        บัญชีของคุณยังไม่มีสิทธิ์ Premium หรือหมดอายุแล้ว หากต้องการเปิดใช้งานสื่อนี้ กรุณาติดต่อแอดมินทางเพจเฟซบุ๊ก
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={handleCopyPage}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-sm active:scale-95 transition-all"
                    >
                      {copiedPage ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedPage ? 'คัดลอกชื่อเพจแล้ว!' : 'คัดลอกชื่อเพจ: สื่อการสอน 5G'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Case 4: Premium Media - User has active Premium or is Dev */
                <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-indigo-900 dark:text-indigo-200">
                      {isDev ? 'สิทธิ์ผู้พัฒนา (Dev Access)' : 'สิทธิ์สมาชิก Premium พร้อมใช้งาน'}
                    </p>
                    <p className="text-[11px] text-indigo-700 dark:text-indigo-400 mt-0.5">
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
                  className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-sm sm:text-base shadow-lg shadow-indigo-600/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group"
                >
                  <span>ใช้งานสื่อ</span>
                  <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </button>
              ) : !user ? (
                <Link
                  href="/login"
                  className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-sm sm:text-base shadow-lg shadow-indigo-600/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
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
                  <span>ต้องเป็นสมาชิก Premium ก่อน</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
