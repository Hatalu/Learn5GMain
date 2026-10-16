/**
 * รายการเพลงประกอบ (ข้อมูลล้วน ใช้ได้ทั้งเซิร์ฟเวอร์และเบราว์เซอร์)
 * - ตอนนี้ทุกเพลงสังเคราะห์สดด้วย Web Audio จากสูตรใน music.ts (ไม่ต้องโหลดไฟล์)
 * - ถ้ามีไฟล์จริง (เช่นจาก ElevenLabs Music) ใส่ที่ public/music/<id>.mp3 แล้วเพิ่ม id ใน public/music/manifest.json
 *   ระบบจะเล่นไฟล์แทนเพลงสังเคราะห์เอง (prompt ด้านล่างเตรียมไว้ใช้สั่งสร้างเพลง)
 */
import type { GameMode } from './game-creator/modes';

export interface TrackInfo {
  id: string;
  name: string;
  mood: string;
  genre: string;
  bpm: number;
  color: string;
  /** คำสั่งสร้างเพลงจริง (ภาษาอังกฤษ สำหรับ ElevenLabs Music) */
  prompt: string;
}

export const TRACKS: TrackInfo[] = [
  { id: 'home', name: 'บ้านสดใส', mood: 'อบอุ่น', genre: 'อะคูสติก', bpm: 96, color: '#ffb35c', prompt: 'Warm cheerful acoustic background loop for a kids learning website, ukulele, glockenspiel, soft claps, 96 bpm, gentle and friendly, instrumental, seamless loop' },
  { id: 'happy', name: 'สนุกสุดใจ', mood: 'สนุก', genre: 'ป๊อป', bpm: 120, color: '#ff7fae', prompt: 'Upbeat bright kids pop instrumental, bouncy synth bass, claps, catchy whistle-like lead, 120 bpm, happy quiz game music, seamless loop' },
  { id: 'chip', name: 'เกมตู้ 8 บิต', mood: 'ตื่นเต้น', genre: 'ชิปทูน', bpm: 140, color: '#9b6cf0', prompt: 'Energetic 8-bit chiptune video game loop, square wave lead, arpeggios, retro drums, 140 bpm, exciting arcade, instrumental' },
  { id: 'lofi', name: 'ชิลล์ยามบ่าย', mood: 'ผ่อนคลาย', genre: 'โลไฟ', bpm: 78, color: '#7ddc86', prompt: 'Relaxed lo-fi hip hop beat for kids studying, mellow electric piano chords, soft vinyl crackle, swing drums, 78 bpm, calm, instrumental loop' },
  { id: 'quest', name: 'ออกผจญภัย', mood: 'ฮึกเหิม', genre: 'ออร์เคสตรา', bpm: 104, color: '#4a7bf0', prompt: 'Heroic adventure orchestral loop for a children game, strings ostinato, brass melody, timpani, 104 bpm, brave and fun, instrumental' },
  { id: 'mystery', name: 'ป่าลึกลับ', mood: 'ลึกลับ', genre: 'แอมเบียนต์', bpm: 72, color: '#5a4f8a', prompt: 'Curious mysterious ambient loop for kids, soft marimba, airy pads, light percussion, 72 bpm, magical forest, not scary, instrumental' },
  { id: 'race', name: 'ซิ่งสายฟ้า', mood: 'เร่งเร้า', genre: 'อิเล็กทรอนิก', bpm: 150, color: '#29b6d8', prompt: 'Fast driving electronic racing game loop for kids, pulsing bass, bright synth stabs, energetic drums, 150 bpm, instrumental' },
  { id: 'musicbox', name: 'กล่องดนตรี', mood: 'น่ารัก', genre: 'กล่องดนตรี', bpm: 92, color: '#ffcf3f', prompt: 'Cute music box and celesta lullaby-style loop, playful and sweet, light pizzicato, 92 bpm, instrumental' },
  { id: 'funk', name: 'ฟังก์แฮปปี้', mood: 'สนุก', genre: 'ฟังก์', bpm: 108, color: '#ff9a3d', prompt: 'Happy funky groove for a kids cooking game, slap bass, wah guitar, horns, swing, 108 bpm, instrumental loop' },
  { id: 'thai', name: 'ลายไทยม่วนๆ', mood: 'สนุก', genre: 'ไทยร่วมสมัย', bpm: 126, color: '#3fd6a8', prompt: 'Fun Thai folk inspired loop, ranat ek xylophone, khaen-like reed, ching cymbals, upbeat drums, 126 bpm, playful for kids, instrumental' },
  { id: 'boss', name: 'ศึกบอส', mood: 'ระทึก', genre: 'ร็อก', bpm: 158, color: '#ff6b7a', prompt: 'Exciting rock boss battle loop for a kids action game, driving guitars, fast drums, heroic not scary, 158 bpm, instrumental' },
];

export const trackById = (id: unknown) => TRACKS.find((t) => t.id === id) || null;
export const isTrackId = (id: unknown): id is string => TRACKS.some((t) => t.id === id);

/** เพลงเริ่มต้นของแต่ละรูปแบบการเล่น */
export const MODE_MUSIC: Record<GameMode, string> = {
  quiz: 'happy',
  cafe: 'funk',
  tower: 'quest',
  racing: 'race',
  brawl: 'boss',
  fishing: 'lofi',
};

/** ค่าที่ตั้งในห้อง: 'auto' = ตามรูปแบบการเล่น, 'off' = ไม่มีเพลง, หรือ id เพลง */
export function roomTrack(setting: string | undefined, mode: GameMode): string | null {
  if (setting === 'off') return null;
  if (setting && isTrackId(setting)) return setting;
  return MODE_MUSIC[mode] || 'happy';
}

export function cleanMusicSetting(x: unknown): string {
  return x === 'off' || isTrackId(x) ? (x as string) : 'auto';
}
