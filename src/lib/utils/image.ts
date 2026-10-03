/**
 * Image processing utilities for 1:1 cropping, resizing to 600x600, and validation
 */

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
}

export function validateImageFile(file: File): ImageValidationResult {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'รองรับเฉพาะไฟล์รูปภาพ JPG, PNG หรือ WEBP เท่านั้น',
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: 'ขนาดไฟล์ต้องไม่เกิน 10MB',
    };
  }

  return { valid: true };
}

/**
 * Loads an image file into an HTMLImageElement
 */
export function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('ไม่สามารถโหลดรูปภาพได้'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('เกิดข้อผิดพลาดในการอ่านไฟล์'));
    reader.readAsDataURL(file);
  });
}

/**
 * Crops the image to a 1:1 center square and resizes to 600x600 target size.
 * Returns a Blob formatted as image/webp (or png if webp not supported) and an object URL.
 */
export async function cropAndResizeToSquare(
  imageSource: HTMLImageElement,
  targetSize: number = 600
): Promise<{ blob: Blob; previewUrl: string }> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = targetSize;
    canvas.height = targetSize;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Cannot create canvas 2D context'));
      return;
    }

    const naturalWidth = imageSource.naturalWidth;
    const naturalHeight = imageSource.naturalHeight;

    // Center crop coordinates
    const minDim = Math.min(naturalWidth, naturalHeight);
    const sx = (naturalWidth - minDim) / 2;
    const sy = (naturalHeight - minDim) / 2;

    // High quality canvas smoothing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Draw center square crop resized to targetSize x targetSize
    ctx.drawImage(imageSource, sx, sy, minDim, minDim, 0, 0, targetSize, targetSize);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Canvas to Blob failed'));
          return;
        }
        const previewUrl = URL.createObjectURL(blob);
        resolve({ blob, previewUrl });
      },
      'image/webp',
      0.9
    );
  });
}

/**
 * Generate a safe unique filename for Supabase Storage
 */
export function generateSafeStoragePath(originalFilename: string, prefix = 'media'): string {
  const extension = originalFilename.split('.').pop()?.toLowerCase() || 'webp';
  const cleanExt = ['jpg', 'jpeg', 'png', 'webp'].includes(extension) ? extension : 'webp';
  const uniqueId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
  return `${prefix}_${Date.now()}_${uniqueId}.${cleanExt}`;
}
