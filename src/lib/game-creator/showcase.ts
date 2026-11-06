/** ผลงานครูบนหน้าแรก: เลือกเฉพาะคอลัมน์ที่เปิดเผยได้ ห้ามส่ง content (มีเฉลย) และชื่อเจ้าของ */
export interface ShowcaseItem {
  id: string;
  title: string;
  question_count: number;
  cover_url: string | null;
}

export const SHOWCASE_MAX = 8;
/** ของน้อยกว่านี้ไม่โชว์ทั้งส่วน */
export const SHOWCASE_MIN = 3;
const MIN_QUESTIONS = 5;
const JUNK = /^(test|ทดสอบ|ลอง|untitled|ไม่มีชื่อ|asdf)/i;

export function showcaseRows(rows: Record<string, unknown>[]): ShowcaseItem[] {
  const seen = new Set<string>();
  const out: ShowcaseItem[] = [];
  for (const r of rows) {
    const title = String(r.title ?? '').trim();
    const key = title.toLowerCase();
    const n = Number(r.question_count) || 0;
    if (!title || n < MIN_QUESTIONS || JUNK.test(title) || seen.has(key)) continue;
    seen.add(key);
    out.push({ id: String(r.id), title, question_count: n, cover_url: typeof r.cover_url === 'string' ? r.cover_url : null });
    if (out.length === SHOWCASE_MAX) break;
  }
  return out.length >= SHOWCASE_MIN ? out : [];
}
