/**
 * โครงหน้าใบงาน (หน่วยมิลลิเมตรบนกระดาษ A4) ใช้ร่วมกันทั้งกระดาษตัวอย่าง (PaperPreview) และ prompt
 * ตัวเลขทุกตัวที่ prompt บอก Gemini มาจากที่นี่ ภาพตัวอย่างจึงตรงกับสิ่งที่สั่งเสมอ
 */
import { CHARS, DECOS, SCENES, STYLES, THEMES, type Deco, type DecoPlace, type Motif } from './options';
import type { Recipe } from './recipe';

export interface Pal {
  /** สีหลัก */
  a: string;
  /** สีรอง */
  b: string;
  /** สีขอบกระดาษ */
  bg: string;
  /** สีเส้น */
  ink: string;
  /** สีเส้นเขียน/เส้นจาง */
  soft: string;
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Geo {
  W: number;
  H: number;
  /** ขอบกระดาษ (แถบสีรอบแผ่นขาว) */
  m: number;
  pal: Pal;
  bw: boolean;
  motif: Motif | '';
  head: Box;
  score: { cx: number; cy: number; r: number } | null;
  nameY: number | null;
  mascot: { cx: number; cy: number; rx: number; ry: number; bubble: Box } | null;
  body: Box;
  sticker: { cx: number; cy: number; r: number } | null;
  keyTag: Box | null;
  /** จุดวางไอคอนบนเส้นกรอบ (กรอบลายตามธีม) */
  border: { x: number; y: number }[];
  decos: { d: Deco; color: string; pts: { x: number; y: number }[] }[];
  /** ทรงหัวกระดาษ (id ใน HEADS) วาดในกรอบ head */
  headShape: string;
  /** ระยะที่ไอคอน/ชื่อบนหัวกระดาษขยับเข้าใน (ทรงที่มีปลายพับ/ม้วน) */
  headPad: number;
  /** ฉากตกแต่ง: แถบบน/ล่างของแผ่นขาว (null = ฉากนี้ไม่ใช้แถบนั้น) */
  scene: { id: string; en: string; top: Box | null; bottom: Box | null };
  /** ลายของแถบขอบกระดาษ (id ใน PATTERNS) */
  pattern: string;
  /** ตัวการ์ตูนเต็มตัว + กรอบคำพูด (แทน mascot หน้ากลม) */
  char: { id: string; en: string; box: Box; bubble: Box } | null;
  /** ใช้ของตกแต่งชุดใหม่อย่างน้อยหนึ่งอย่าง: กล่องมนขึ้น และ prompt สั่งให้ตกแต่งเต็มที่ */
  rich: boolean;
}

const r1 = (v: number) => Math.round(v * 10) / 10;

export function palOf(r: Pick<Recipe, 'th' | 'st'>): { pal: Pal; bw: boolean } {
  const theme = THEMES.find((x) => x.id === r.th) || THEMES[0];
  const bw = !!STYLES.find((x) => x.id === r.st)?.bw;
  return {
    bw,
    pal: bw ? { a: '#3a3a3a', b: '#d9d9d9', bg: '#f6f6f6', ink: '#2a2a2a', soft: '#9a9a9a' } : { a: theme.pal[0], b: theme.pal[1], bg: theme.pal[2], ink: '#2a2350', soft: '#b7aed8' },
  };
}

/** จุดวางของตกแต่งเสริมในแถบขอบกระดาษ */
export function decoPoints(place: DecoPlace, W: number, H: number, m: number): { x: number; y: number }[] {
  const c = m / 2;
  const row = (y: number) => Array.from({ length: 5 }, (_, i) => ({ x: r1(W * (0.18 + i * 0.16)), y }));
  switch (place) {
    case 'corners':
      return [
        { x: c + 4, y: c + 4 },
        { x: W - c - 4, y: c + 4 },
        { x: c + 4, y: H - c - 4 },
        { x: W - c - 4, y: H - c - 4 },
      ];
    case 'top':
      return row(c);
    case 'bottom':
      return row(H - c);
    case 'sides':
      return [0.3, 0.5, 0.7].flatMap((t) => [
        { x: c, y: r1(H * t) },
        { x: W - c, y: r1(H * t) },
      ]);
    default:
      return [
        { x: c + 2, y: r1(H * 0.12) },
        { x: W - c - 2, y: r1(H * 0.16) },
        { x: c, y: r1(H * 0.45) },
        { x: W - c, y: r1(H * 0.55) },
        { x: c + 2, y: r1(H * 0.82) },
        { x: W - c - 2, y: r1(H * 0.88) },
      ];
  }
}

export function geometry(r: Recipe): Geo {
  const theme = THEMES.find((x) => x.id === r.th) || THEMES[0];
  const { pal, bw } = palOf(r);
  const W = r.o === 'l' ? 297 : 210;
  const H = r.o === 'l' ? 210 : 297;
  const m = 10;
  const headH = 26;
  // ฉากตกแต่งกินแถบบน/ล่างของแผ่นขาว เนื้อหาทั้งหมดขยับเข้าใน (ไม่มีฉาก = ตำแหน่งเดิมทุกจุด)
  const scene = SCENES.find((x) => x.id === r.sc) || SCENES[0];
  const top = m + 6 + scene.top;
  const foot = H - m - scene.bot;
  const scoreR = 12;
  const head: Box = { x: m + 8, y: top, w: W - m * 2 - 16 - (r.score ? 28 : 0), h: headH };
  const nameRow = r.name ? 10 : 0;
  const after = top + headH + nameRow;
  // ตัวการ์ตูนเต็มตัวสูงกว่าหน้ากลมแบบเดิม แถวคำสั่งจึงสูงขึ้น
  const ch = r.mascot && r.ch ? CHARS.find((c) => c.id === r.ch) : undefined;
  const bodyTop = after + (ch ? 43 : r.mascot ? 20 : 8);
  const bodyBottom = foot - (r.sticker ? 22 : 10);

  const border: { x: number; y: number }[] = [];
  if (r.fr === 'theme' && theme.motif) {
    for (let x = 18; x < W - 10; x += 26) border.push({ x, y: m / 2 }, { x, y: H - m / 2 });
    for (let y = 30; y < H - 20; y += 26) border.push({ x: m / 2, y }, { x: W - m / 2, y });
  }

  const decos = (r.dz || [])
    .map((id) => DECOS.find((d) => d.id === id))
    .filter((d): d is Deco => !!d)
    .map((d) => ({ d, color: bw ? (d.color === 'b' ? pal.b : pal.a) : d.color === 'a' ? pal.a : d.color === 'b' ? pal.b : d.color, pts: decoPoints(d.place, W, H, m) }));

  return {
    W,
    H,
    m,
    pal,
    bw,
    motif: theme.motif,
    head,
    score: r.score ? { cx: W - m - 18, cy: top + headH / 2, r: scoreR } : null,
    nameY: r.name ? top + headH + 9 : null,
    mascot: r.mascot && !ch ? { cx: m + 18, cy: after + 11, rx: 8, ry: 7.4, bubble: { x: m + 30, y: after + 5, w: W - m * 2 - 40, h: 12 } } : null,
    body: { x: m + 10, y: bodyTop, w: W - m * 2 - 20, h: Math.max(30, bodyBottom - bodyTop) },
    sticker: r.sticker ? { cx: W - m - 16, cy: foot - 12, r: 9 } : null,
    keyTag: r.key ? { x: m + 8, y: foot - 18, w: 34, h: 11 } : null,
    border,
    decos,
    headShape: r.hd,
    headPad: r.hd === 'ribbon' || r.hd === 'scroll' ? 9 : r.hd === 'ticket' ? 5 : 0,
    scene: {
      id: scene.id,
      en: scene.en,
      top: scene.top ? { x: m + 4, y: m + 2, w: W - m * 2 - 8, h: scene.top + 2 } : null,
      bottom: scene.bot ? { x: m, y: foot, w: W - m * 2, h: scene.bot } : null,
    },
    pattern: r.pt,
    char: ch ? { id: ch.id, en: ch.en, box: { x: m + 6, y: after + 2, w: 26, h: 39 }, bubble: { x: m + 38, y: after + 11, w: W - m * 2 - 48, h: 19 } } : null,
    rich: r.hd !== 'bar' || scene.id !== 'none' || r.pt !== 'plain' || !!ch,
  };
}
