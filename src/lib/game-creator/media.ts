'use client';

/**
 * อัปโหลดรูป/คลิปของเกมที่ผู้ใช้สร้าง ไปที่ Supabase Storage (bucket game-media โฟลเดอร์ <user id>/)
 * - รูป: ย่อด้านยาวไม่เกิน 1400px แปลงเป็น webp (gif เก็บตามเดิมเพื่อให้ยังขยับได้)
 * - คลิป: เล่นได้ไม่เกิน 5 วินาที ถ้าคลิปยาวกว่านั้น ผู้ใช้เลือกช่วง แล้วตัดในเครื่องด้วย MediaRecorder
 *   (เบราว์เซอร์ที่ตัดไม่ได้ จะอัปโหลดไฟล์เดิมพร้อมเก็บช่วงเวลา แล้วตัวเล่นบังคับเล่นแค่ช่วงนั้น)
 */
import { createClient } from '@/lib/supabase/client';
import type { MediaRef } from './types';
import { VIDEO_MAX_SECONDS } from './quiz';
import { MEDIA_BUCKET, mediaPrefix } from './prefix';

export { MEDIA_BUCKET, mediaPrefix };
export const IMAGE_MAX_MB = 12;
export const VIDEO_PICK_MAX_MB = 200;
export const VIDEO_UPLOAD_MAX_MB = 25;

/** ผู้ใช้เห็นเลขพื้นที่ที่ใช้ไปแล้วเปลี่ยนทันทีหลังอัปโหลด/ล้างไฟล์ (ตัวแสดงพื้นที่ใน QuizEditor ฟังเหตุการณ์นี้) */
export const USAGE_EVENT = 'l5g:usage-changed';

/**
 * อัปโหลดผ่านลิงก์ที่เซิร์ฟเวอร์ออกให้ (เซิร์ฟเวอร์ตรวจโควต้า MB ต่อบัญชีก่อน) ลงโฟลเดอร์ <user id>/ ของตัวเอง
 * ตัวแปร _userId ไม่ได้ใช้แล้ว เก็บไว้ให้ผู้เรียกเดิมไม่ต้องแก้
 */
async function upload(_userId: string, blob: Blob, ext: string, contentType: string): Promise<{ url: string; path: string }> {
  void ext;
  let res: Response;
  try {
    res = await fetch('/api/creator/upload-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contentType, size: blob.size }),
    });
  } catch {
    throw new Error('เชื่อมต่อไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองใหม่');
  }
  const j = (await res.json().catch(() => ({}))) as { error?: string; path?: string; token?: string };
  if (!res.ok || !j.path || !j.token) throw new Error(j.error || 'อัปโหลดไม่สำเร็จ ลองใหม่อีกครั้ง');
  const { error } = await createClient().storage.from(MEDIA_BUCKET).uploadToSignedUrl(j.path, j.token, blob, { contentType, cacheControl: '31536000' });
  if (error) {
    const m = String(error.message || '');
    if (/bucket not found/i.test(m)) throw new Error('ยังไม่ได้สร้างที่เก็บไฟล์ (รัน migration 015 ก่อน)');
    if (/exceeded|too large|413/i.test(m)) throw new Error('ไฟล์ใหญ่เกินไป');
    throw new Error('อัปโหลดไม่สำเร็จ ลองใหม่อีกครั้ง');
  }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(USAGE_EVENT));
  return { url: mediaPrefix() + j.path, path: j.path };
}

export async function removeMedia(paths: string[]) {
  if (!paths.length) return;
  try {
    await createClient().storage.from(MEDIA_BUCKET).remove(paths);
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(USAGE_EVENT));
  } catch {
    /* ลบไม่ได้ก็ไม่เป็นไร */
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error('เปิดรูปนี้ไม่ได้'));
    img.src = src;
  });
}

export async function uploadImage(userId: string, file: File, maxSide = 1400): Promise<MediaRef> {
  if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) throw new Error('รองรับรูป JPG PNG WEBP หรือ GIF');
  if (file.size > IMAGE_MAX_MB * 1024 * 1024) throw new Error(`รูปต้องไม่เกิน ${IMAGE_MAX_MB}MB`);
  const src = URL.createObjectURL(file);
  try {
    const img = await loadImage(src);
    const w0 = img.naturalWidth;
    const h0 = img.naturalHeight;
    if (file.type === 'image/gif') {
      if (file.size > 5 * 1024 * 1024) throw new Error('GIF ต้องไม่เกิน 5MB');
      const r = await upload(userId, file, 'gif', 'image/gif');
      return { kind: 'image', ...r, w: w0, h: h0 };
    }
    const s = Math.min(1, maxSide / Math.max(w0, h0));
    const w = Math.max(1, Math.round(w0 * s));
    const h = Math.max(1, Math.round(h0 * s));
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    if (!ctx) throw new Error('เบราว์เซอร์นี้ย่อรูปไม่ได้');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/webp', 0.86));
    // Safari เก่าบางรุ่นแปลง webp ไม่ได้ จะได้ png กลับมา
    const out = blob || (await new Promise<Blob | null>((r) => c.toBlob(r, 'image/png')));
    if (!out) throw new Error('ย่อรูปไม่สำเร็จ');
    const isWebp = out.type === 'image/webp';
    const r = await upload(userId, out, isWebp ? 'webp' : 'png', isWebp ? 'image/webp' : 'image/png');
    return { kind: 'image', ...r, w, h };
  } finally {
    URL.revokeObjectURL(src);
  }
}

export interface VideoProbe {
  url: string;
  duration: number;
  w: number;
  h: number;
}

export function probeVideo(file: File): Promise<VideoProbe> {
  return new Promise((res, rej) => {
    if (!/^video\//.test(file.type)) return rej(new Error('รองรับไฟล์วิดีโอ MP4 WEBM หรือ MOV'));
    if (file.size > VIDEO_PICK_MAX_MB * 1024 * 1024) return rej(new Error(`คลิปต้องไม่เกิน ${VIDEO_PICK_MAX_MB}MB`));
    const url = URL.createObjectURL(file);
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.muted = true;
    v.onloadedmetadata = () => res({ url, duration: isFinite(v.duration) ? v.duration : 0, w: v.videoWidth, h: v.videoHeight });
    v.onerror = () => {
      URL.revokeObjectURL(url);
      rej(new Error('เปิดคลิปนี้ไม่ได้ ลองไฟล์ MP4'));
    };
    v.src = url;
  });
}

type CapVideo = HTMLVideoElement & { captureStream?: () => MediaStream; mozCaptureStream?: () => MediaStream };

export function canTrimVideo(): boolean {
  if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') return false;
  const p = HTMLVideoElement.prototype as CapVideo;
  return typeof p.captureStream === 'function' || typeof p.mozCaptureStream === 'function';
}

/**
 * ตัดคลิปช่วง [start, start+dur] ด้วยการเล่นจริงแล้วอัดใหม่ (ใช้ video element ที่แสดงอยู่บนจอ)
 * คืน null ถ้าเบราว์เซอร์ทำไม่ได้
 */
export async function recordSegment(v: HTMLVideoElement, start: number, dur: number, onProgress?: (p: number) => void): Promise<Blob | null> {
  const cv = v as CapVideo;
  const cap = cv.captureStream ? cv.captureStream.bind(cv) : cv.mozCaptureStream ? cv.mozCaptureStream.bind(cv) : null;
  if (!cap || typeof MediaRecorder === 'undefined') return null;
  const mime = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'].find((m) => MediaRecorder.isTypeSupported(m));
  if (!mime) return null;

  v.pause();
  v.loop = false;
  await new Promise<void>((r) => {
    const done = () => {
      v.removeEventListener('seeked', done);
      r();
    };
    v.addEventListener('seeked', done);
    v.currentTime = start;
    setTimeout(done, 1500);
  });

  let stream: MediaStream;
  try {
    stream = cap();
  } catch {
    return null;
  }
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 2_200_000, audioBitsPerSecond: 96_000 });
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => e.data && e.data.size && chunks.push(e.data);
  const stopped = new Promise<void>((r) => (rec.onstop = () => r()));
  try {
    await v.play();
  } catch {
    v.muted = true;
    try {
      await v.play();
    } catch {
      return null;
    }
  }
  rec.start(200);
  const end = start + dur;
  await new Promise<void>((r) => {
    const t0 = performance.now();
    const tick = () => {
      const p = Math.min(1, (v.currentTime - start) / dur);
      onProgress?.(p);
      if (v.currentTime >= end - 0.03 || v.ended || performance.now() - t0 > dur * 1000 + 2500) return r();
      requestAnimationFrame(tick);
    };
    // rAF หยุดเมื่อแท็บถูกซ่อน ใช้ setTimeout สำรอง
    const safety = setTimeout(r, dur * 1000 + 3000);
    tick();
    stopped.then(() => clearTimeout(safety));
  });
  v.pause();
  if (rec.state !== 'inactive') rec.stop();
  await stopped;
  stream.getTracks().forEach((t) => t.stop());
  const blob = new Blob(chunks, { type: mime.split(';')[0] });
  return blob.size > 1000 ? blob : null;
}

export async function uploadVideo(userId: string, blob: Blob, meta: { w: number; h: number; start: number; end: number }): Promise<MediaRef> {
  if (blob.size > VIDEO_UPLOAD_MAX_MB * 1024 * 1024) throw new Error(`คลิปใหญ่เกิน ${VIDEO_UPLOAD_MAX_MB}MB ลองคลิปที่สั้นหรือเล็กกว่านี้`);
  const type = blob.type || 'video/mp4';
  const ext = type.includes('webm') ? 'webm' : type.includes('quicktime') ? 'mov' : 'mp4';
  const r = await upload(userId, blob, ext, type.includes('quicktime') ? 'video/quicktime' : type.split(';')[0]);
  const len = Math.min(VIDEO_MAX_SECONDS, Math.max(0.2, meta.end - meta.start));
  return { kind: 'video', ...r, w: meta.w || undefined, h: meta.h || undefined, start: meta.start, end: meta.start + len };
}

/** อัปโหลดรูปพื้นหลังห้อง (ย่อใหญ่ขึ้นเพื่อจอโปรเจกเตอร์) */
export async function uploadBackground(userId: string, file: File): Promise<string> {
  const m = await uploadImage(userId, file, 2200);
  return m.url;
}
