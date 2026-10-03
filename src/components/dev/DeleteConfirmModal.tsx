'use client';

import React, { useState } from 'react';
import { MediaItem } from '@/types/database';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/Toast';
import { Trash2, AlertTriangle, Loader2, X } from 'lucide-react';

interface DeleteConfirmModalProps {
  media: MediaItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function DeleteConfirmModal({
  media,
  isOpen,
  onClose,
  onSuccess,
}: DeleteConfirmModalProps) {
  const { success, error } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const supabase = createClient();

  if (!isOpen || !media) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      // 1. Delete from database
      const { error: dbError } = await supabase
        .from('media')
        .delete()
        .eq('id', media.id);

      if (dbError) throw dbError;

      // 2. Attempt to clean up storage if icon URL belongs to media-icons bucket
      if (media.icon_url && media.icon_url.includes('/media-icons/')) {
        const parts = media.icon_url.split('/media-icons/');
        if (parts.length > 1) {
          const filePath = parts[1].split('?')[0];
          await supabase.storage.from('media-icons').remove([filePath]);
        }
      }

      success(`ลบสื่อการสอน "${media.title}" เรียบร้อยแล้ว`);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการลบสื่อ';
      error(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden p-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          aria-label="ปิดหน้าต่าง"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-4">
            <AlertTriangle className="w-7 h-7" />
          </div>

          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
            คุณแน่ใจหรือไม่ว่าต้องการลบสื่อการสอนนี้?
          </h3>

          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-800/80 p-3 rounded-xl border border-gray-200 dark:border-gray-700 w-full mb-3 text-center truncate">
            {media.title}
          </p>

          <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
            การดำเนินการนี้ไม่สามารถยกเลิกได้ สื่อจะถูกลบออกจากระบบทันที
          </p>

          <div className="flex items-center gap-3 w-full">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={handleDelete}
              className="flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>กำลังลบ...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>ลบสื่อ</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
