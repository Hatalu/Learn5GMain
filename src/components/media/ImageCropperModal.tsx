'use client';

import React, { useState, useRef } from 'react';
import {
  cropAndResizeToSquare,
  loadImageFromFile,
  validateImageFile,
} from '@/lib/utils/image';
import { Upload, X, Crop, Check, AlertCircle, Image as ImageIcon } from 'lucide-react';

interface ImageCropperModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImageCropped: (croppedBlob: Blob, previewUrl: string) => void;
}

export function ImageCropperModal({
  isOpen,
  onClose,
  onImageCropped,
}: ImageCropperModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sourceImg, setSourceImg] = useState<HTMLImageElement | null>(null);
  const [cropPreviewUrl, setCropPreviewUrl] = useState<string | null>(null);
  const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type and size
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setErrorMsg(validation.error || 'ไฟล์รูปภาพไม่ถูกต้อง');
      return;
    }

    try {
      setIsProcessing(true);
      setSelectedFile(file);
      const img = await loadImageFromFile(file);
      setSourceImg(img);

      // Automatically produce 1:1 600x600 square crop
      const result = await cropAndResizeToSquare(img, 600);
      setCroppedBlob(result.blob);
      setCropPreviewUrl(result.previewUrl);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการประมวลผลรูปภาพ';
      setErrorMsg(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirm = () => {
    if (croppedBlob && cropPreviewUrl) {
      onImageCropped(croppedBlob, cropPreviewUrl);
      onClose();
    }
  };

  const resetSelection = () => {
    setSelectedFile(null);
    setSourceImg(null);
    setCropPreviewUrl(null);
    setCroppedBlob(null);
    setErrorMsg(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <Crop className="w-5 h-5 text-indigo-500" />
            <h3 className="font-bold text-base text-gray-900 dark:text-white">
              อัปโหลดและปรับขนาด Icon (1:1 Square 600x600)
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

        {/* Body */}
        <div className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs sm:text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {!cropPreviewUrl ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-indigo-500 dark:hover:border-indigo-500 rounded-2xl p-8 sm:p-12 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-gray-50/50 dark:bg-gray-800/40"
            >
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3">
                <Upload className="w-6 h-6" />
              </div>
              <p className="font-semibold text-sm text-gray-900 dark:text-white mb-1">
                คลิกเพื่อเลือกไฟล์รูปภาพ Icon
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs">
                รองรับไฟล์ JPG, PNG, WEBP (ระบบจะ Crop สัดส่วน 1:1 และปรับเป็น 600x600 อัตโนมัติ)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                พรีวิวรูปภาพสัดส่วน 1:1 (ขนาดเป้าหมาย 600x600 px)
              </p>
              <div className="relative w-48 h-48 sm:w-56 sm:h-56 rounded-2xl overflow-hidden border-2 border-indigo-500 shadow-md">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={cropPreviewUrl}
                  alt="Crop Preview"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="mt-4 flex items-center gap-2">
                <button
                  type="button"
                  onClick={resetSelection}
                  className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  เลือกรูปภาพใหม่
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-2.5 bg-gray-50/50 dark:bg-gray-900/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            disabled={!croppedBlob || isProcessing}
            onClick={handleConfirm}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>ใช้รูปนี้</span>
          </button>
        </div>
      </div>
    </div>
  );
}
