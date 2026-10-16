/** พื้นหลังของห้องเล่นสด (ครูเปลี่ยนได้ระหว่างเล่น ผู้เล่นทุกคนเห็นตาม) */
import type { RoomBackground } from './types';

export type Deco = 'clouds' | 'stars' | 'bubbles' | 'dots' | 'leaves' | 'chalk' | 'confetti' | 'none';

export interface BgPreset {
  id: string;
  name: string;
  css: string;
  deco: Deco;
  /** ข้อความบนพื้นหลังควรเป็นสีเข้ม (พื้นสว่าง) หรือสีขาว */
  dark: boolean;
}

export const BG_PRESETS: BgPreset[] = [
  { id: 'sky', name: 'ฟ้าใส', css: 'linear-gradient(180deg,#4fb3ff 0%,#9ad8ff 55%,#d9f1ff 100%)', deco: 'clouds', dark: true },
  { id: 'grape', name: 'องุ่น', css: 'linear-gradient(160deg,#5b2bd6 0%,#8b4cf0 50%,#d64fb4 100%)', deco: 'dots', dark: false },
  { id: 'space', name: 'อวกาศ', css: 'radial-gradient(120% 90% at 50% 0%,#3a2a8a 0%,#16123a 55%,#0a0820 100%)', deco: 'stars', dark: false },
  { id: 'ocean', name: 'ใต้ทะเล', css: 'linear-gradient(180deg,#1fc8db 0%,#1a8ccf 55%,#16509e 100%)', deco: 'bubbles', dark: false },
  { id: 'sunset', name: 'พระอาทิตย์ตก', css: 'linear-gradient(180deg,#ff8a5c 0%,#ffb35c 45%,#ffd98a 100%)', deco: 'clouds', dark: true },
  { id: 'forest', name: 'ป่าใหญ่', css: 'linear-gradient(180deg,#7ad37a 0%,#3fa96b 60%,#1f7a55 100%)', deco: 'leaves', dark: false },
  { id: 'candy', name: 'ลูกกวาด', css: 'linear-gradient(135deg,#ffc2e2 0%,#ffe08a 50%,#a8f0d8 100%)', deco: 'confetti', dark: true },
  { id: 'chalk', name: 'กระดานดำ', css: 'radial-gradient(130% 100% at 50% 0%,#2f6b4f 0%,#1f4c39 70%,#173a2c 100%)', deco: 'chalk', dark: false },
];

export const DEFAULT_BG: RoomBackground = { kind: 'preset', id: 'sky' };

export const COLOR_SWATCHES = ['#4fb3ff', '#7140f0', '#f53d9b', '#ff6b7a', '#ff9a3d', '#ffcf3f', '#3fd6a8', '#2a2350'];

export const bgPreset = (id: string) => BG_PRESETS.find((b) => b.id === id) || BG_PRESETS[0];

/** ความสว่างของสี (0-1) ใช้ตัดสินสีตัวอักษร */
export function luminance(hex: string): number {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return 0.5;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

export function cleanBackground(input: unknown, mediaPrefix: string): RoomBackground {
  if (!input || typeof input !== 'object') return DEFAULT_BG;
  const b = input as Record<string, unknown>;
  if (b.kind === 'preset' && typeof b.id === 'string' && BG_PRESETS.some((p) => p.id === b.id)) return { kind: 'preset', id: b.id };
  if (b.kind === 'color' && typeof b.value === 'string' && /^#[0-9a-f]{6}$/i.test(b.value)) return { kind: 'color', value: b.value.toLowerCase() };
  if (b.kind === 'image' && typeof b.url === 'string' && mediaPrefix && b.url.startsWith(mediaPrefix) && b.url.length < 600 && /^[0-9a-f-]{36}\/[A-Za-z0-9_.-]{1,120}$/.test(b.url.slice(mediaPrefix.length)))
    return { kind: 'image', url: b.url };
  return DEFAULT_BG;
}
