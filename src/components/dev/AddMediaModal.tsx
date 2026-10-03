'use client';

import React, { useState } from 'react';
import {
  ALL_GRADES,
  ALL_MEDIA_TYPES,
  ALL_SUBJECTS,
  AccessTier,
  GradeLevel,
  MediaType,
  Subject,
} from '@/types/database';
import { mediaSchema } from '@/lib/validations/media';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { ImageCropperModal } from '@/components/media/ImageCropperModal';
import { generateSafeStoragePath } from '@/lib/utils/image';
import { X, Upload, Plus, Loader2, Sparkles, Check, Crown, Unlock } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface AddMediaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddMediaModal({ isOpen, onClose, onSuccess }: AddMediaModalProps) {
  const { user } = useAuth();
  const { success, error } = useToast();
  const supabase = createClient();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState<Subject>('คณิตศาสตร์');
  const [gradeLevel, setGradeLevel] = useState<GradeLevel[]>(['ป.1']);
  const [mediaType, setMediaType] = useState<MediaType>('เกม');
  const [accessTier, setAccessTier] = useState<AccessTier>('premium');
  const [gameUrl, setGameUrl] = useState('');
  const [iconUrl, setIconUrl] = useState('');
  const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null);

  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const toggleGrade = (grade: GradeLevel) => {
    if (gradeLevel.includes(grade)) {
      if (gradeLevel.length > 1) {
        setGradeLevel(gradeLevel.filter((g) => g !== grade));
      }
    } else {
      setGradeLevel([...gradeLevel, grade]);
    }
  };

  const handleImageCropped = (blob: Blob, previewUrl: string) => {
    setCroppedBlob(blob);
    setIconUrl(previewUrl);
    setFieldErrors((prev) => ({ ...prev, icon_url: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    // Pre-validation
    const parseResult = mediaSchema.safeParse({
      title,
      description,
      subject,
      grade_level: gradeLevel,
      media_type: mediaType,
      access_tier: accessTier,
      game_url: gameUrl,
      icon_url: iconUrl || (croppedBlob ? 'has_blob' : ''),
    });

    if (!parseResult.success) {
      const errors: Record<string, string> = {};
      parseResult.error.issues.forEach((err) => {
        const path = err.path[0] as string;
        errors[path] = err.message;
      });
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      let finalIconUrl = iconUrl;

      // 1. Upload cropped image to Supabase Storage if user picked a new file
      if (croppedBlob) {
        const filePath = generateSafeStoragePath('icon.webp', 'icon');
        const { error: uploadError } = await supabase.storage
          .from('media-icons')
          .upload(filePath, croppedBlob, {
            contentType: 'image/webp',
            upsert: false,
          });

        if (uploadError) {
          throw new Error(`ไม่สามารถอัปโหลดรูปภาพได้: ${uploadError.message}`);
        }

        const { data: publicUrlData } = supabase.storage
          .from('media-icons')
          .getPublicUrl(filePath);

        finalIconUrl = publicUrlData.publicUrl;
      }

      // 2. Insert record into Supabase media table
      const { error: insertError } = await supabase.from('media').insert({
        title: title.trim(),
        description: description.trim() || null,
        icon_url: finalIconUrl,
        subject,
        grade_level: gradeLevel,
        media_type: mediaType,
        access_tier: accessTier,
        game_url: gameUrl.trim(),
        created_by: user?.id || null,
      });

      if (insertError) {
        throw new Error(insertError.message);
      }

      success('เพิ่มสื่อการสอนใหม่เรียบร้อยแล้ว');
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการเพิ่มสื่อ';
      error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
        <div className="relative w-full max-w-xl my-8 bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Plus className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-base sm:text-lg text-gray-900 dark:text-white">
                เพิ่มสื่อการสอนใหม่
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              aria-label="ปิดหน้าต่าง"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            {/* 1. Icon Upload */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                รูป Icon ของสื่อ (สัดส่วน 1:1) *
              </label>
              <div className="flex items-center gap-4">
                <div className="relative w-20 h-20 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700 overflow-hidden bg-gray-50 dark:bg-gray-800 flex items-center justify-center shrink-0">
                  {iconUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={iconUrl} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <Upload className="w-6 h-6 text-gray-400" />
                  )}
                </div>
                <div className="flex-1">
                  <button
                    type="button"
                    onClick={() => setIsCropperOpen(true)}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition-colors flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{iconUrl ? 'เปลี่ยนรูปภาพ (Crop 1:1)' : 'อัปโหลดรูปภาพ (Crop 1:1)'}</span>
                  </button>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                    รองรับ JPG, PNG, WEBP ปรับขนาดเป็น 600x600 อัตโนมัติ
                  </p>
                  {fieldErrors.icon_url && (
                    <p className="text-xs text-rose-500 mt-1">{fieldErrors.icon_url}</p>
                  )}
                </div>
              </div>
            </div>

            {/* 2. Title */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                ชื่อสื่อการสอน *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="เช่น เกมคณิตศาสตร์: ผจญภัยดินแดนตัวเลข"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {fieldErrors.title && (
                <p className="text-xs text-rose-500 mt-1">{fieldErrors.title}</p>
              )}
            </div>

            {/* 3. Description */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                คำอธิบายสื่อ (ไม่บังคับ)
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="รายละเอียดเพิ่มเติมเกี่ยวกับสื่อหรือกติกาเกม..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {fieldErrors.description && (
                <p className="text-xs text-rose-500 mt-1">{fieldErrors.description}</p>
              )}
            </div>

            {/* 3.1 Access Tier: Free vs Premium */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                ประเภทการเข้าถึง (สิทธิ์การใช้งาน) *
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setAccessTier('premium')}
                  className={cn(
                    'py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold border flex items-center justify-center gap-2 transition-all',
                    accessTier === 'premium'
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-amber-500 shadow-md shadow-amber-500/25 ring-2 ring-amber-400/50'
                      : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-750'
                  )}
                >
                  <Crown className="w-4 h-4 text-amber-200" />
                  <span>พรีเมียม (Premium - ค่าเริ่มต้น)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAccessTier('free')}
                  className={cn(
                    'py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold border flex items-center justify-center gap-2 transition-all',
                    accessTier === 'free'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/25 ring-2 ring-emerald-400/50'
                      : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-750'
                  )}
                >
                  <Unlock className="w-4 h-4 text-emerald-200" />
                  <span>ฟรี (Free - ใช้งานได้ทุกคน)</span>
                </button>
              </div>
            </div>

            {/* 4. Subject */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                วิชา *
              </label>
              <div className="grid grid-cols-3 gap-2">
                {ALL_SUBJECTS.map((sub) => (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => setSubject(sub)}
                    className={cn(
                      'py-2 px-2.5 rounded-xl text-xs font-semibold border text-center transition-all',
                      subject === sub
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                        : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                    )}
                  >
                    {sub}
                  </button>
                ))}
              </div>
            </div>

            {/* 5. Grade Levels (Multi-select) */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                ระดับชั้น (เลือกได้มากกว่า 1 ชั้น) *
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                {ALL_GRADES.map((grade) => {
                  const isChecked = gradeLevel.includes(grade);
                  return (
                    <button
                      key={grade}
                      type="button"
                      onClick={() => toggleGrade(grade)}
                      className={cn(
                        'py-1.5 px-2 rounded-xl text-xs font-medium border text-center transition-all',
                        isChecked
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                          : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                      )}
                    >
                      {grade}
                    </button>
                  );
                })}
              </div>
              {fieldErrors.grade_level && (
                <p className="text-xs text-rose-500 mt-1">{fieldErrors.grade_level}</p>
              )}
            </div>

            {/* 6. Media Type */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                ประเภทสื่อ *
              </label>
              <select
                value={mediaType}
                onChange={(e) => setMediaType(e.target.value as MediaType)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {ALL_MEDIA_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* 7. Game URL */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                Link เว็บไซต์เกม / สื่อ *
              </label>
              <input
                type="url"
                required
                value={gameUrl}
                onChange={(e) => setGameUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {fieldErrors.game_url && (
                <p className="text-xs text-rose-500 mt-1">{fieldErrors.game_url}</p>
              )}
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>กำลังบันทึก...</span>
                  </>
                ) : (
                  <span>+ เพิ่มสื่อ</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Image Cropper Modal */}
      <ImageCropperModal
        isOpen={isCropperOpen}
        onClose={() => setIsCropperOpen(false)}
        onImageCropped={handleImageCropped}
      />
    </>
  );
}
