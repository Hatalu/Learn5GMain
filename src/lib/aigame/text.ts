/**
 * เนื้อหาเกมแบบข้อความ ให้ครูแก้เองได้ทีละบรรทัด (คั่นด้วย | )
 * เลือกตอบ: คำถาม | คำตอบที่ถูก | ตัวลวง | ตัวลวง
 * จัดกลุ่ม: บรรทัดแรก หมวด: ก | ข | ค  แล้วบรรทัดละ ของ | ชื่อหมวด
 * เรียงลำดับ: โจทย์ | ขั้นที่ 1 | ขั้นที่ 2 | ...
 * ฟังก์ชันล้วน (selftest เรียกได้)
 */
import type { Act } from './games';
import { stripEmoji, type GItem } from './recipe';

export const TEXT_MAX = 12000;
const MAX_ITEMS = 80;
const cell = (s: string) => stripEmoji(s).replace(/\s+/g, ' ').trim().slice(0, 120);
const split = (line: string) => line.split('|').map(cell).filter(Boolean);

export const TEXT_HELP: Record<Act, string> = {
  pick: 'บรรทัดละ 1 ข้อ: คำถาม | คำตอบที่ถูก | ตัวลวง | ตัวลวง',
  sort: 'บรรทัดแรก หมวด: ชื่อหมวด | ชื่อหมวด  แล้วบรรทัดละ 1 ชิ้น: ของ | ชื่อหมวด',
  order: 'บรรทัดละ 1 ชุด: โจทย์ | ขั้นที่ 1 | ขั้นที่ 2 | ขั้นที่ 3',
};

export function itemsToText(act: Act, items: GItem[]): string {
  if (act === 'sort') {
    const cats = items[0]?.choices ?? [];
    return ['หมวด: ' + cats.join(' | '), ...items.map((it) => `${it.q} | ${cats[it.correct[0]] ?? ''}`)].join('\n');
  }
  if (act === 'order') return items.map((it) => [it.q, ...it.correct.map((c) => it.choices[c])].join(' | ')).join('\n');
  return items.map((it) => [it.q, ...it.correct.map((c) => it.choices[c]), ...it.choices.filter((_, i) => !it.correct.includes(i))].join(' | ')).join('\n');
}

/** แปลงข้อความกลับเป็นข้อ คืนรายการบรรทัดที่ใช้ไม่ได้ด้วย (เลขบรรทัดเริ่มที่ 1) */
export function textToItems(act: Act, text: string): { items: GItem[]; bad: number[] } {
  const lines = text.slice(0, TEXT_MAX).split(/\r?\n/);
  const items: GItem[] = [];
  const bad: number[] = [];
  let cats: string[] = [];
  lines.forEach((raw, n) => {
    if (!raw.trim() || items.length >= MAX_ITEMS) return;
    if (act === 'sort') {
      const head = raw.match(/^\s*หมวด\s*[:：]\s*(.*)$/);
      if (head) {
        cats = [...new Set(split(head[1]))].slice(0, 4);
        if (cats.length < 2) bad.push(n + 1);
        return;
      }
      const [q, cat] = split(raw);
      const k = cats.indexOf(cat ?? '');
      if (!q || k < 0) return void bad.push(n + 1);
      items.push({ q, choices: cats, correct: [k] });
      return;
    }
    const parts = split(raw);
    if (act === 'order') {
      const steps = [...new Set(parts.slice(1))].slice(0, 6);
      if (steps.length < 2) return void bad.push(n + 1);
      items.push({ q: parts[0], choices: steps, correct: steps.map((_, i) => i), ordered: true });
      return;
    }
    const choices = [...new Set(parts.slice(1))].slice(0, 4);
    if (choices.length < 2) return void bad.push(n + 1);
    items.push({ q: parts[0], choices, correct: [0] });
  });
  return { items, bad };
}
