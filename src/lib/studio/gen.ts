/** ตัวสร้างใบงานอัตโนมัติ (ค้นหาคำ กระดาษคำตอบ สูตรคูณ) ไม่มี DOM ทดสอบได้ใน selftest */

const TH_FILL = 'กขคงจฉชซญดตถทธนบปผพฟภมยรลวศษสหอฮ'.split('');
const EN_FILL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

/** แยกคำเป็นช่องละ 1 ตัว (สระบน/ล่าง วรรณยุกต์ติดไปกับพยัญชนะ) */
export function cellsOf(word: string): string[] {
  const w = word.replace(/\s+/g, '').toUpperCase();
  const Seg = (Intl as unknown as { Segmenter?: new (l: string, o: { granularity: 'grapheme' }) => { segment: (s: string) => Iterable<{ segment: string }> } }).Segmenter;
  if (Seg) return Array.from(new Seg('th', { granularity: 'grapheme' }).segment(w), (x) => x.segment);
  return Array.from(w);
}

export interface WordSearch {
  grid: string[][];
  placed: string[];
  skipped: string[];
}

/** ตารางค้นหาคำ: วางคำแนวนอน แนวตั้ง แนวทแยง (โหมดยากกลับด้านได้) แล้วเติมตัวอักษรสุ่ม */
export function wordSearch(words: string[], size: number, hard = false, rand: () => number = Math.random): WordSearch {
  const n = Math.max(6, Math.min(16, Math.round(size)));
  const grid: string[][] = Array.from({ length: n }, () => Array(n).fill(''));
  const list = [...new Set(words.map((w) => w.trim()).filter(Boolean))].slice(0, 20);
  const dirs: [number, number][] = hard ? [[0, 1], [1, 0], [1, 1], [-1, 1], [0, -1], [-1, 0], [-1, -1], [1, -1]] : [[0, 1], [1, 0], [1, 1]];
  const placed: string[] = [];
  const skipped: string[] = [];
  const sorted = [...list].sort((a, b) => cellsOf(b).length - cellsOf(a).length);
  for (const w of sorted) {
    const cs = cellsOf(w);
    let ok = false;
    if (cs.length >= 2 && cs.length <= n) {
      for (let tries = 0; tries < 300 && !ok; tries++) {
        const [dr, dc] = dirs[Math.floor(rand() * dirs.length)];
        const r0 = Math.floor(rand() * n);
        const c0 = Math.floor(rand() * n);
        const r1 = r0 + dr * (cs.length - 1);
        const c1 = c0 + dc * (cs.length - 1);
        if (r1 < 0 || r1 >= n || c1 < 0 || c1 >= n) continue;
        if (cs.every((ch, k) => !grid[r0 + dr * k][c0 + dc * k] || grid[r0 + dr * k][c0 + dc * k] === ch)) {
          cs.forEach((ch, k) => (grid[r0 + dr * k][c0 + dc * k] = ch));
          ok = true;
        }
      }
    }
    (ok ? placed : skipped).push(w);
  }
  const thai = list.some((w) => /[฀-๿]/.test(w));
  const pool = thai ? TH_FILL : EN_FILL;
  for (const row of grid) for (let c = 0; c < n; c++) if (!row[c]) row[c] = pool[Math.floor(rand() * pool.length)];
  return { grid, placed: list.filter((w) => placed.includes(w)), skipped };
}

/** กระดาษคำตอบแบบฝน: แต่ละตารางไม่เกิน 20 ข้อ (เกินนั้นแยกเป็นหลายตาราง) */
export function answerSheet(count: number, choices: number, lang: 'th' | 'en'): string[][][] {
  const n = Math.max(1, Math.min(60, Math.round(count)));
  const k = Math.max(2, Math.min(5, Math.round(choices)));
  const heads = (lang === 'th' ? ['ก', 'ข', 'ค', 'ง', 'จ'] : ['A', 'B', 'C', 'D', 'E']).slice(0, k);
  const tables: string[][][] = [];
  for (let s = 0; s < n; s += 20) {
    const rows = [[lang === 'th' ? 'ข้อ' : 'No.', ...heads]];
    for (let q = s + 1; q <= Math.min(n, s + 20); q++) rows.push([String(q), ...heads.map(() => '○')]);
    tables.push(rows);
  }
  return tables;
}

/** สูตรคูณแม่ n (เว้นคำตอบให้เด็กเติมได้) */
export function timesTable(n: number, upTo = 12, withAnswer = false): string[][] {
  const m = Math.max(1, Math.min(25, Math.round(n)));
  return Array.from({ length: Math.max(1, Math.min(20, upTo)) }, (_, i) => [`${m} × ${i + 1} =`, withAnswer ? String(m * (i + 1)) : '']);
}

export interface Problem {
  a: number;
  b: number;
  sym: string;
  ans: number;
}
const between = (lo: number, hi: number, rand: () => number) => lo + Math.floor(rand() * (hi - lo + 1));

/** โจทย์เลขสุ่ม: ลบไม่ติดลบ หารลงตัวเสมอ คูณ/หารใช้ตัวคูณ/ตัวหาร 2-9 */
export function arithProblems(op: string, digits: number, count: number, rand: () => number = Math.random): Problem[] {
  const d = Math.max(1, Math.min(4, Math.round(digits)));
  const lo = d === 1 ? 1 : 10 ** (d - 1);
  const hi = 10 ** d - 1;
  const ops = op === 'mix' ? ['+', '-', 'x', '/'] : [op];
  return Array.from({ length: Math.max(1, Math.min(40, Math.round(count))) }, () => {
    const o = ops[Math.floor(rand() * ops.length)];
    if (o === '-') {
      const x = between(lo, hi, rand);
      const y = between(lo, hi, rand);
      return { a: Math.max(x, y), b: Math.min(x, y), sym: '−', ans: Math.abs(x - y) };
    }
    if (o === 'x') {
      const a = between(lo, hi, rand);
      const b = between(2, 9, rand);
      return { a, b, sym: '×', ans: a * b };
    }
    if (o === '/') {
      const b = between(2, 9, rand);
      const q = between(lo, hi, rand);
      return { a: b * q, b, sym: '÷', ans: q };
    }
    const a = between(lo, hi, rand);
    const b = between(lo, hi, rand);
    return { a, b, sym: '+', ans: a + b };
  });
}

/** สลับตัวอักษรของคำ (ไทยสลับทีละพยางค์ย่อยด้วย cellsOf) พยายามไม่ให้ซ้ำกับคำเดิม */
export function scrambleWord(word: string, rand: () => number = Math.random): string[] {
  const cs = cellsOf(word);
  for (let t = 0; t < 12; t++) {
    const a = [...cs];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    if (a.join('') !== cs.join('') || cs.length < 2) return a;
  }
  return [...cs].reverse();
}

/** พยัญชนะไทย 44 ตัว พร้อมชื่อเรียก */
export const THAI_CONSONANTS = 'ก ไก่,ข ไข่,ฃ ขวด,ค ควาย,ฅ คน,ฆ ระฆัง,ง งู,จ จาน,ฉ ฉิ่ง,ช ช้าง,ซ โซ่,ฌ เฌอ,ญ หญิง,ฎ ชฎา,ฏ ปฏัก,ฐ ฐาน,ฑ มณโฑ,ฒ ผู้เฒ่า,ณ เณร,ด เด็ก,ต เต่า,ถ ถุง,ท ทหาร,ธ ธง,น หนู,บ ใบไม้,ป ปลา,ผ ผึ้ง,ฝ ฝา,พ พาน,ฟ ฟัน,ภ สำเภา,ม ม้า,ย ยักษ์,ร เรือ,ล ลิง,ว แหวน,ศ ศาลา,ษ ฤๅษี,ส เสือ,ห หีบ,ฬ จุฬา,อ อ่าง,ฮ นกฮูก'.split(',');
export const ABC_WORDS = 'apple,ball,cat,dog,egg,fish,goat,hat,ice cream,jam,kite,lion,moon,nest,orange,pig,queen,rabbit,sun,tiger,umbrella,van,watch,xylophone,yo-yo,zebra'.split(',');
