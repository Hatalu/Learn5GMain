import { makeShape, makeWrite, type Item } from '@/lib/studio/doc';
import { arrow, at, blankRows, box, design, header, label, lineBetween, nameLine, page, table, txt, type Template } from './kit';

const W_LINES = (x: number, y: number, w: number, h: number) => at(makeWrite('lines', { gap: 40 }), x, y, w, h);

export const ORG_TEMPLATES: Template[] = [
  {
    id: 'org-venn',
    label: 'แผนภาพเวนน์',
    note: 'เปรียบเทียบ 2 สิ่ง ส่วนที่เหมือน/ต่าง',
    cat: 'org',
    sizeId: 'a4l',
    accent: '#2563eb',
    make: () =>
      design('a4l', [
        page([
          txt('แผนภาพเวนน์: เปรียบเทียบ .................. กับ ..................', 34, 40, 30, 1043, { bold: true, color: '#1e3a8a', font: 'kanit', align: 'center' }),
          nameLine(94, 700, 211),
          at(makeShape('circle', { fill: '#93c5fd', stroke: '#1d4ed8', sw: 3, opacity: 0.45 }), 110, 150, 580, 600),
          at(makeShape('circle', { fill: '#fda4af', stroke: '#be123c', sw: 3, opacity: 0.45 }), 433, 150, 580, 600),
          txt('สิ่งที่ 1', 28, 180, 230, 260, { bold: true, align: 'center', color: '#1d4ed8' }),
          txt('เหมือนกัน', 28, 431, 230, 260, { bold: true, align: 'center', color: '#6d28d9' }),
          txt('สิ่งที่ 2', 28, 683, 230, 260, { bold: true, align: 'center', color: '#be123c' }),
          W_LINES(180, 290, 240, 360),
          W_LINES(451, 290, 220, 360),
          W_LINES(703, 290, 240, 360),
        ]),
      ]),
  },
  {
    id: 'org-tchart',
    label: 'ตาราง T (ข้อดี/ข้อเสีย)',
    note: 'แบ่ง 2 ฝั่ง เขียนเปรียบเทียบ',
    cat: 'org',
    sizeId: 'a4p',
    accent: '#16a34a',
    make: () =>
      design('a4p', [
        page([
          ...header('แผนผังความคิด', 'เรื่อง .............................', '#dcfce7', '#15803d', 'thumb'),
          nameLine(170),
          box('#dcfce7', '', 40, 226, 345, 70),
          txt('ข้อดี', 30, 40, 238, 345, { bold: true, align: 'center', color: '#15803d', font: 'kanit' }),
          box('#fee2e2', '', 409, 226, 345, 70),
          txt('ข้อเสีย', 30, 409, 238, 345, { bold: true, align: 'center', color: '#b91c1c', font: 'kanit' }),
          lineBetween(40, 312, 754, 312, { stroke: '#2a2350', sw: 4 }),
          lineBetween(397, 312, 397, 1080, { stroke: '#2a2350', sw: 4 }),
          W_LINES(50, 330, 330, 740),
          W_LINES(414, 330, 330, 740),
        ]),
      ]),
  },
  {
    id: 'org-timeline',
    label: 'เส้นเวลา',
    note: 'แนวนอน 5 เหตุการณ์ เรียงลำดับ',
    cat: 'org',
    sizeId: 'a4l',
    accent: '#ea580c',
    make: () => {
      const items: Item[] = [txt('เส้นเวลา: ...............................................', 40, 40, 30, 1043, { bold: true, color: '#c2410c', font: 'kanit', align: 'center' }), nameLine(100, 700, 211), lineBetween(60, 440, 1063, 440, { stroke: '#ea580c', sw: 6, end: 'arrow' })];
      Array.from({ length: 5 }, (_, i) => {
        const cx = 140 + i * 210;
        const up = i % 2 === 0;
        items.push(at(makeShape('circle', { fill: '#ffffff', stroke: '#ea580c', sw: 5 }), cx - 18, 422, 36, 36));
        items.push(lineBetween(cx, up ? 420 : 460, cx, up ? 370 : 510, { stroke: '#fdba74', sw: 3 }));
        items.push(box('#fff7ed', '#fdba74', cx - 95, up ? 170 : 510, 190, 200));
        items.push(txt(`${i + 1}. ปี/วันที่ ......`, 20, cx - 85, up ? 180 : 520, 170, { bold: true, color: '#c2410c' }));
        items.push(W_LINES(cx - 85, up ? 220 : 560, 170, 140));
      });
      return design('a4l', [page(items)]);
    },
  },
  {
    id: 'org-steps',
    label: 'ลำดับขั้นตอน',
    note: '5 ขั้น เรียงลงพร้อมลูกศร',
    cat: 'org',
    sizeId: 'a4p',
    accent: '#7c3aed',
    make: () => {
      const items: Item[] = [...header('แผนผังความคิด', 'ขั้นตอนการ .....................', '#ede9fe', '#6d28d9', 'chick'), nameLine(170)];
      const c = ['#ede9fe', '#dbeafe', '#dcfce7', '#fef9c3', '#ffe4e6'];
      Array.from({ length: 5 }, (_, i) => {
        const y = 224 + i * 172;
        if (i) items.push(arrow(397, y - 32, 397, y - 4, '#6d28d9'));
        items.push(box(c[i], '#2a2350', 40, y, 714, 136));
        items.push(txt(`ขั้นที่ ${i + 1}`, 24, 60, y + 12, 140, { bold: true, color: '#6d28d9', font: 'kanit' }));
        items.push(W_LINES(200, y + 14, 534, 110));
      });
      return design('a4p', [page(items)]);
    },
  },
  {
    id: 'org-cause',
    label: 'เหตุและผล',
    note: '3 คู่ สาเหตุ → ผลที่เกิด',
    cat: 'org',
    sizeId: 'a4p',
    accent: '#dc2626',
    make: () => {
      const items: Item[] = [...header('แผนผังความคิด', 'เหตุและผล', '#fee2e2', '#b91c1c', 'alert'), nameLine(170), txt('สาเหตุ', 28, 40, 220, 300, { bold: true, align: 'center', color: '#b91c1c', font: 'kanit' }), txt('ผลที่เกิดขึ้น', 28, 454, 220, 300, { bold: true, align: 'center', color: '#1d4ed8', font: 'kanit' })];
      [0, 1, 2].forEach((i) => {
        const y = 280 + i * 270;
        items.push(box('#fef2f2', '#f87171', 40, y, 300, 230));
        items.push(W_LINES(60, y + 20, 260, 190));
        items.push(arrow(352, y + 115, 442, y + 115, '#2a2350'));
        items.push(box('#eff6ff', '#60a5fa', 454, y, 300, 230));
        items.push(W_LINES(474, y + 20, 260, 190));
      });
      return design('a4p', [page(items)]);
    },
  },
  {
    id: 'org-5w1h',
    label: '5W1H',
    note: 'ใคร อะไร ที่ไหน เมื่อไร ทำไม อย่างไร',
    cat: 'org',
    sizeId: 'a4p',
    accent: '#0891b2',
    make: () => {
      const items: Item[] = [...header('สรุปเรื่องที่อ่าน', '5W1H เรื่อง ....................', '#cffafe', '#0e7490', 'question'), nameLine(170)];
      [
        ['Who ใคร', '#fde68a'],
        ['What ทำอะไร', '#bbf7d0'],
        ['Where ที่ไหน', '#bfdbfe'],
        ['When เมื่อไร', '#fbcfe8'],
        ['Why ทำไม', '#ddd6fe'],
        ['How อย่างไร', '#fed7aa'],
      ].forEach(([t, c], i) => {
        const x = 40 + (i % 2) * 367;
        const y = 224 + Math.floor(i / 2) * 285;
        items.push(box('#ffffff', '#2a2350', x, y, 347, 265));
        items.push(box(c, '', x + 10, y + 10, 327, 56));
        items.push(txt(t, 26, x + 10, y + 18, 327, { bold: true, align: 'center', font: 'kanit' }));
        items.push(W_LINES(x + 20, y + 80, 307, 170));
      });
      return design('a4p', [page(items)]);
    },
  },
  {
    id: 'org-frayer',
    label: 'แผนภาพคำศัพท์ (Frayer)',
    note: 'คำกลาง + ความหมาย ลักษณะ ตัวอย่าง',
    cat: 'org',
    sizeId: 'a4p',
    accent: '#d97706',
    make: () => {
      const items: Item[] = [...header('แผนผังความคิด', 'แผนภาพคำศัพท์', '#fef3c7', '#b45309', 'bulb'), nameLine(170)];
      [
        ['ความหมาย', 40, 224],
        ['ลักษณะสำคัญ', 409, 224],
        ['ตัวอย่าง', 40, 664],
        ['ไม่ใช่ตัวอย่าง', 409, 664],
      ].forEach(([t, x, y]) => {
        items.push(box('#fffbeb', '#f59e0b', Number(x), Number(y), 345, 420));
        items.push(label(String(t), '#b45309', Number(y) + 14, Number(x) + 20, 305));
        items.push(W_LINES(Number(x) + 20, Number(y) + 60, 305, Number(y) < 600 ? 160 : 340));
      });
      items.push(at(makeShape('circle', { fill: '#fde68a', stroke: '#b45309', sw: 4 }), 247, 534, 300, 150));
      items.push(txt('คำศัพท์', 34, 257, 584, 280, { bold: true, align: 'center', color: '#92400e', font: 'kanit' }));
      return design('a4p', [page(items)]);
    },
  },
  {
    id: 'org-main-idea',
    label: 'ใจความสำคัญ',
    note: 'ใจความหลัก + รายละเอียด 3 ข้อ',
    cat: 'org',
    sizeId: 'a4p',
    accent: '#2563eb',
    make: () => {
      const items: Item[] = [...header('อ่านจับใจความ', 'ใจความสำคัญ', '#dbeafe', '#1d4ed8', 'bulb'), nameLine(170), box('#dbeafe', '#1d4ed8', 40, 224, 714, 200), label('ใจความสำคัญ', '#1d4ed8', 236, 60, 674), W_LINES(60, 280, 674, 130)];
      [0, 1, 2].forEach((i) => {
        const x = 40 + i * 245;
        items.push(lineBetween(397, 424, x + 112, 500, { stroke: '#1d4ed8', sw: 3 }));
        items.push(box('#eff6ff', '#93c5fd', x, 500, 224, 560));
        items.push(txt(`รายละเอียด ${i + 1}`, 22, x, 512, 224, { bold: true, align: 'center', color: '#1d4ed8' }));
        items.push(W_LINES(x + 16, 560, 192, 480));
      });
      return design('a4p', [page(items)]);
    },
  },
  {
    id: 'org-compare',
    label: 'ตารางเปรียบเทียบ',
    note: '3 สิ่ง x 5 หัวข้อ',
    cat: 'org',
    sizeId: 'a4l',
    accent: '#9333ea',
    make: () =>
      design('a4l', [
        page([
          ...header('แผนผังความคิด', 'ตารางเปรียบเทียบ', '#f3e8ff', '#7e22ce', 'm-chart', 1123),
          nameLine(166, 1043),
          table(blankRows(['หัวข้อ', 'สิ่งที่ 1 ..........', 'สิ่งที่ 2 ..........', 'สิ่งที่ 3 ..........'], 5, (i) => ['ลักษณะ', 'ขนาด', 'ที่อยู่/แหล่งที่พบ', 'ประโยชน์', 'อื่นๆ'][i]), 40, 214, 1043, 540, { head: '#f3e8ff', size: 22 }),
        ]),
      ]),
  },
];
