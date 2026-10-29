import { makeWrite, type Item } from '@/lib/studio/doc';
import { at, box, design, header, label, lines, nameLine, page, sticker, table, txt, type Template } from './kit';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

/** หน้าคัดตัวอักษร: แถวละ 4 ตัว แบบตัวอย่าง + บรรทัด 4 เส้น */
const tracePage = (rows: string[], title: string) => {
  const items: Item[] = [...header('English Writing', title, '#e0f2fe', '#0369a1', 'e-aa'), nameLine(170)];
  rows.forEach((t, i) => {
    const y = 226 + i * 216;
    items.push(txt(t, 40, 40, y, 714, { font: 'mali', color: '#0369a1' }));
    items.push(at(makeWrite('four', { gap: 40, stroke: '#7dd3fc' }), 40, y + 62, 714, 140));
  });
  return page(items);
};

export const ENG_TEMPLATES: Template[] = [
  {
    id: 'en-alphabet',
    label: 'Alphabet Chart',
    note: 'ตัวอักษร A–Z ติดผนัง',
    cat: 'eng',
    sizeId: 'a4p',
    accent: '#2563eb',
    make: () => {
      const cells = LETTERS.map((l) => `${l}${l.toLowerCase()}`);
      const rows = Array.from({ length: 7 }, (_, r) => Array.from({ length: 4 }, (_, c) => cells[r * 4 + c] ?? ''));
      return design('a4p', [
        page(
          [
            txt('The Alphabet', 56, 40, 36, 714, { bold: true, color: '#1d4ed8', font: 'kanit', align: 'center' }),
            table(rows, 40, 150, 714, 920, { head: '#ffffff', size: 52, font: 'mali', stroke: '#93c5fd', color: '#1e3a8a' }),
          ],
          { bg: { color: '#eff6ff', color2: '#eff6ff', angle: 180, pattern: 'none', pcolor: '#ffffff' }, border: { style: 'bubbles', color: '#60a5fa', w: 3 } }
        ),
      ]);
    },
  },
  {
    id: 'en-trace',
    label: 'คัดตัวอักษร A–Z',
    note: '2 หน้า บรรทัด 4 เส้น',
    cat: 'eng',
    sizeId: 'a4p',
    accent: '#0369a1',
    make: () =>
      design('a4p', [
        tracePage(['Aa  Bb  Cc  Dd', 'Ee  Ff  Gg  Hh', 'Ii  Jj  Kk  Ll', 'Mm  Nn  Oo  Pp'], 'ABC Writing (1)'),
        tracePage(['Qq  Rr  Ss  Tt', 'Uu  Vv  Ww  Xx', 'Yy  Zz', 'My name is'], 'ABC Writing (2)'),
      ]),
  },
  {
    id: 'en-numbers',
    label: 'Numbers 1–20',
    note: 'เขียนคำอ่านตัวเลขภาษาอังกฤษ',
    cat: 'eng',
    sizeId: 'a4p',
    accent: '#16a34a',
    make: () =>
      design('a4p', [
        page([
          ...header('English', 'Numbers 1–20', '#dcfce7', '#15803d', 'm-123'),
          nameLine(170),
          table([['Number', 'Word', 'Number', 'Word'], ['1', 'one', '11', 'eleven'], ...Array.from({ length: 9 }, (_, i) => [String(i + 2), '', String(i + 12), ''])], 40, 226, 714, 820, { head: '#dcfce7', size: 26 }),
        ]),
      ]),
  },
  {
    id: 'en-about-me',
    label: 'All About Me',
    note: 'กรอบวาดรูปตัวเอง + ประโยคแนะนำตัว',
    cat: 'eng',
    sizeId: 'a4p',
    accent: '#f59e0b',
    make: () => {
      const items: Item[] = [
        txt('All About Me', 56, 40, 36, 714, { bold: true, color: '#d97706', font: 'kanit', align: 'center' }),
        box('#fffbeb', '#fbbf24', 237, 140, 320, 360, 'dash'),
        txt('Draw yourself', 24, 237, 300, 320, { align: 'center', color: '#d97706' }),
      ];
      ['My name is', 'I am .......... years old.', 'I like', 'My favorite color is', 'My best friend is', 'I can'].forEach((s, i) =>
        items.push(txt(s.includes('...') ? s : `${s} ...........................................................`, 28, 60, 540 + i * 88, 694, { font: 'mali' }))
      );
      return design('a4p', [page(items, { border: { style: 'stars', color: '#fbbf24', w: 3 } })]);
    },
  },
  {
    id: 'en-family',
    label: 'My Family',
    note: 'วาดครอบครัว + This is my ...',
    cat: 'eng',
    sizeId: 'a4p',
    accent: '#e11d48',
    make: () => {
      const items: Item[] = [...header('English', 'My Family', '#ffe4e6', '#be123c', 'heartface'), nameLine(170), box('#fff1f2', '#fda4af', 40, 220, 714, 440, 'dash'), txt('Draw your family', 24, 40, 420, 714, { align: 'center', color: '#e11d48' })];
      [0, 1, 2, 3].forEach((i) => items.push(txt('This is my ................................  He / She is ................................', 24, 40, 700 + i * 90, 714, { font: 'mali' })));
      return design('a4p', [page(items)]);
    },
  },
  {
    id: 'en-picture-dict',
    label: 'Picture Dictionary',
    note: '6 ภาพ เขียนคำศัพท์ใต้ภาพ',
    cat: 'eng',
    sizeId: 'a4p',
    accent: '#7c3aed',
    make: () => {
      const items: Item[] = [...header('English', 'Picture Dictionary', '#ede9fe', '#6d28d9', 'e-dict'), nameLine(170)];
      ['apple', 'cat', 'sun', 'tree', 'fish', 'book'].forEach((s, i) => {
        const x = 40 + (i % 2) * 367;
        const y = 226 + Math.floor(i / 2) * 285;
        items.push(box('#faf5ff', '#c4b5fd', x, y, 347, 265));
        items.push(sticker(s, x + 113, y + 16, 120));
        items.push(txt('word: ....................................', 24, x + 20, y + 160, 307, { font: 'mali' }));
        items.push(txt('แปลว่า ...............................', 22, x + 20, y + 208, 307));
      });
      return design('a4p', [page(items)]);
    },
  },
  {
    id: 'en-spelling',
    label: 'Spelling Test',
    note: '20 คำ ช่องคะแนน',
    cat: 'eng',
    sizeId: 'a4p',
    accent: '#0891b2',
    make: () => {
      const items: Item[] = [...header('English', 'Spelling Test', '#cffafe', '#0e7490', 'e-abc'), nameLine(170), txt('Score ........ / 20', 24, 40, 214, 714, { bold: true, color: '#0e7490' })];
      Array.from({ length: 20 }, (_, i) => items.push(txt(`${i + 1}.  ...................................`, 26, i < 10 ? 50 : 420, 280 + (i % 10) * 80, 330, { font: 'mali' })));
      return design('a4p', [page(items)]);
    },
  },
  {
    id: 'en-days-months',
    label: 'Days & Months',
    note: 'แนวนอน วันในสัปดาห์ + 12 เดือน',
    cat: 'eng',
    sizeId: 'a4l',
    accent: '#ea580c',
    make: () => {
      const days = ['Sunday อาทิตย์', 'Monday จันทร์', 'Tuesday อังคาร', 'Wednesday พุธ', 'Thursday พฤหัสบดี', 'Friday ศุกร์', 'Saturday เสาร์'];
      const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const items: Item[] = [
        txt('Days & Months', 52, 40, 30, 1043, { bold: true, color: '#c2410c', font: 'kanit', align: 'center' }),
        box('#fff7ed', '#fdba74', 40, 130, 400, 620),
        label('Days of the Week', '#c2410c', 146, 60, 360),
        box('#fefce8', '#fde047', 470, 130, 613, 620),
        label('Months of the Year', '#a16207', 146, 490, 573),
      ];
      days.forEach((d, i) => items.push(txt(`${i + 1}. ${d}`, 26, 70, 210 + i * 76, 360, { font: 'mali' })));
      months.forEach((m, i) => items.push(txt(`${i + 1}. ${m}`, 26, i < 6 ? 510 : 800, 210 + (i % 6) * 88, 270, { font: 'mali' })));
      return design('a4l', [page(items)]);
    },
  },
  {
    id: 'en-qa',
    label: 'Questions & Answers',
    note: 'ถาม-ตอบ ประโยคพื้นฐาน 6 ข้อ',
    cat: 'eng',
    sizeId: 'a4p',
    accent: '#059669',
    make: () => {
      const items: Item[] = [...header('English', 'Questions & Answers', '#d1fae5', '#047857', 'e-qa'), nameLine(170)];
      ['What is your name?', 'How old are you?', 'What color do you like?', 'What animal do you like?', 'What is your favorite food?', 'How are you today?'].forEach((q, i) => {
        const y = 226 + i * 142;
        items.push(txt(`${i + 1}.  ${q}`, 26, 40, y, 714, { bold: true, color: '#047857', font: 'mali' }));
        items.push(txt('Answer: ..................................................................................', 24, 70, y + 56, 684, { font: 'mali' }));
      });
      return design('a4p', [page(items)]);
    },
  },
];
