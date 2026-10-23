/**
 * เชื่อมระบบชุดคำถามกับระบบสร้างสื่อ: แปลงชุดคำถาม (user_games.content) เป็นหน้าใบงานปรนัยที่แก้ไขต่อได้
 * ไม่มี DOM (ทดสอบได้ใน selftest) ความสูงข้อความเป็นค่าประมาณแบบเผื่อไว้ ตัวแก้ไขจะปรับความสูงจริงให้เองตอนเปิด
 */
import { richToPlain } from '@/lib/game-creator/quiz';
import type { QuizContent, QuizQuestion } from '@/lib/game-creator/types';
import { blankPage, cleanSrc, makeDeco, makeImage, makeText, MAX_PAGES, type Item, type Page } from './doc';

const M = 56;
const HEADS_TH = ['ก', 'ข', 'ค', 'ง', 'จ', 'ฉ'];
const at = <T extends Item>(it: T, x: number, y: number, w: number): T => ({ ...it, x, y, w });

/** ความสูงโดยประมาณของข้อความ (ภาษาไทยกว้างราว 0.5 เท่าของขนาดตัวอักษร) */
const textH = (s: string, w: number, size: number, lh = 1.4) =>
  s.split('\n').reduce((n, line) => n + Math.max(1, Math.ceil((line.length * size * 0.52) / Math.max(40, w))), 0) * size * lh + 6;

const plain = (q: QuizQuestion['text']) => richToPlain(q, 600);

export interface QuizSheetOpts {
  /** เพิ่มหน้าเฉลยท้ายใบงาน */
  answers: boolean;
  /** ใส่หัวใบงาน (ชื่อ ช่องชื่อ-ชั้น) ที่หน้าแรก */
  header: boolean;
}

/** เฉลย เช่น "ข" หรือ "ก, ค" (ตอบได้หลายข้อ) */
export function answerOf(q: QuizQuestion): string {
  if (q.kind === 'text') return q.answers?.[0] || '-';
  return q.choices.map((c, i) => (c.correct ? HEADS_TH[i] : '')).filter(Boolean).join(', ') || '-';
}

/** หน้าใบงานจากชุดคำถาม (ข้อที่ไม่มีโจทย์และไม่มีตัวเลือกจะถูกข้าม) */
export function quizPages(title: string, quiz: QuizContent, W: number, H: number, opts: QuizSheetOpts): Page[] {
  const qs = quiz.questions.filter((q) => plain(q.text) || q.media || q.choices.some((c) => plain(c.text)));
  if (!qs.length) return [];
  const pages: Page[] = [];
  let items: Item[] = [];
  let y = M;
  const flush = () => {
    if (items.length) pages.push({ ...blankPage(), items });
    items = [];
    y = M;
  };
  const tw = W - 2 * M;

  if (opts.header) {
    items.push(at(makeText({ text: title || 'ใบงาน', size: 34, bold: true, font: 'kanit', color: '#7c5cf0', align: 'left' }), M, y, tw));
    y += textH(title || 'ใบงาน', tw, 34, 1.35) + 4;
    items.push(at(makeText({ text: 'ชื่อ ..............................................  ชั้น ...........  เลขที่ ........', size: 18, align: 'left' }), M, y, tw));
    y += 40;
    items.push({ ...at(makeDeco('d-ornament', '#7c5cf0', '#ffd166'), M, y, tw), h: 30 });
    y += 44;
    items.push(at(makeText({ text: 'จงเลือกคำตอบที่ถูกต้องที่สุด', size: 20, bold: true, align: 'left', color: '#5b5285' }), M, y, tw));
    y += 40;
  }

  qs.forEach((q, n) => {
    const block: Item[] = [];
    let by = 0;
    const qText = `${n + 1}. ${plain(q.text) || '(ดูรูป)'}${q.multi ? '  (ตอบได้มากกว่า 1 ข้อ)' : ''}`;
    block.push(at(makeText({ text: qText, size: 20, bold: true, align: 'left', lh: 1.4 }), M, by, tw));
    by += textH(qText, tw, 20) + 4;
    const qImg = q.media?.kind === 'image' ? cleanSrc(q.media.url) : '';
    if (qImg) {
      const k = Math.min(1, 150 / (q.media!.h || 150), (tw * 0.5) / (q.media!.w || 200));
      const w = Math.max(60, Math.round((q.media!.w || 200) * k));
      const h = Math.max(60, Math.round((q.media!.h || 150) * k));
      block.push({ ...makeImage(qImg, w, h), x: M + 30, y: by });
      by += h + 8;
    }
    // ข้อพิมพ์คำตอบ: เส้นให้เขียนคำตอบแทนตัวเลือก
    if (q.kind === 'text') {
      block.push(at(makeText({ text: 'ตอบ ............................................................', size: 18, align: 'left', lh: 1.5 }), M + 30, by, tw - 30));
      by += 36;
    }
    const opts2 = q.choices.map((c, i) => {
      const t = plain(c.text);
      const img = c.media?.kind === 'image' ? cleanSrc(c.media.url) : '';
      return { label: `${HEADS_TH[i] ?? i + 1}. ${t || (img ? '' : '...')}`, img, media: c.media };
    });
    // ตัวเลือกสั้นและไม่มีรูป: 2 คอลัมน์ ประหยัดที่
    const two = opts2.every((o) => !o.img && o.label.length <= 34);
    const cw = two ? (tw - 30) / 2 : tw - 30;
    opts2.forEach((o, i) => {
      const col = two ? i % 2 : 0;
      const cx = M + 30 + col * cw;
      const oh = Math.max(textH(o.label, cw - 10, 18, 1.5), o.img ? 90 : 0);
      if (o.img) {
        const k = Math.min(1, 84 / (o.media!.h || 84), 140 / (o.media!.w || 140));
        const w = Math.max(40, Math.round((o.media!.w || 140) * k));
        const h = Math.max(40, Math.round((o.media!.h || 84) * k));
        block.push(at(makeText({ text: o.label, size: 18, align: 'left', lh: 1.5 }), cx, by, 44));
        block.push({ ...makeImage(o.img, w, h), x: cx + 46, y: by });
      } else block.push(at(makeText({ text: o.label, size: 18, align: 'left', lh: 1.5 }), cx, by, cw - 10));
      if (!two || col === 1 || i === opts2.length - 1) by += oh + 2;
    });
    by += 18;
    if (y + by > H - M && items.length) flush();
    for (const it of block) items.push({ ...it, y: it.y + y });
    y += by;
  });
  flush();

  if (opts.answers && qs.length) {
    const cols = 5;
    const lines: string[] = [];
    for (let i = 0; i < qs.length; i += cols)
      lines.push(
        qs
          .slice(i, i + cols)
          .map((q, k) => `${i + k + 1}. ${answerOf(q)}`)
          .join('        ')
      );
    pages.push({
      ...blankPage(),
      items: [
        at(makeText({ text: `เฉลย ${title || 'ใบงาน'}`, size: 32, bold: true, font: 'kanit', color: '#e8456b', align: 'left' }), M, M, tw),
        { ...at(makeDeco('d-dots', '#e8456b'), M, M + 56, tw), h: 24 },
        at(makeText({ text: lines.join('\n'), size: 20, align: 'left', lh: 1.9 }), M, M + 96, tw),
      ],
    });
  }
  return pages.slice(0, MAX_PAGES);
}
