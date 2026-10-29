import { blankBg, makeLine, makeShape, type Item } from '@/lib/studio/doc';
import { at, box, cutH, cutV, design, lines, page, sticker, txt, type Template } from './kit';

const bg = (color: string, color2 = color, angle = 180, pattern: 'none' | 'dots' | 'stripes' | 'checks' = 'none', pcolor = '#ffffff33') => ({ ...blankBg(), color, color2, angle, pattern, pcolor });

export const DECOR_TEMPLATES: Template[] = [
  /* ---------------- ป้าย / เกียรติบัตร ---------------- */
  {
    id: 'dc-cert-good',
    label: 'เกียรติบัตรเด็กดี',
    note: 'แนวนอน แถบสีด้านซ้าย เหรียญรางวัล',
    cat: 'decor',
    sizeId: 'a4l',
    accent: '#2563eb',
    make: () =>
      design('a4l', [
        page([
          at(makeShape('rect', { fill: '#1d4ed8', sw: 0 }), 0, 0, 300, 794),
          sticker('medal', 60, 240, 180),
          txt('เด็กดี\nประจำสัปดาห์', 40, 20, 460, 260, { bold: true, align: 'center', color: '#ffffff', font: 'kanit', lh: 1.2 }),
          txt('เกียรติบัตรนี้มอบให้แก่', 30, 340, 120, 743, { align: 'center', color: '#475569' }),
          txt('ชื่อนักเรียน', 60, 340, 200, 743, { bold: true, align: 'center', color: '#1e3a8a', font: 'charm' }),
          at(makeLine({ stroke: '#93c5fd', sw: 2 }), 440, 300, 543, 20),
          txt('เป็นผู้มีความประพฤติดี มีน้ำใจ ช่วยเหลือเพื่อนและคุณครู\nขอให้เป็นคนดีของครอบครัวและสังคมตลอดไป', 26, 340, 350, 743, { align: 'center', lh: 1.7 }),
          txt('ให้ไว้ ณ วันที่ ........ เดือน .................... พ.ศ. ..........', 22, 340, 500, 743, { align: 'center', color: '#475569' }),
          at(makeLine({ stroke: '#2a2350', sw: 1.5, dash: 'dot' }), 560, 640, 300, 20),
          txt('(ครูประจำชั้น)', 20, 560, 666, 300, { align: 'center', color: '#475569' }),
        ], { bg: bg('#ffffff', '#eff6ff', 120), border: { style: 'double', color: '#1d4ed8', w: 3 } }),
      ]),
  },
  {
    id: 'dc-welcome',
    label: 'ป้ายยินดีต้อนรับ',
    note: 'แนวนอน ติดหน้าห้องเรียน',
    cat: 'decor',
    sizeId: 'a4l',
    accent: '#f59e0b',
    make: () =>
      design('a4l', [
        page([
          sticker('sun', 60, 50, 150),
          sticker('rainbow', 900, 40, 170),
          txt('ยินดีต้อนรับ', 110, 40, 230, 1043, { bold: true, align: 'center', color: '#ffffff', font: 'chonburi', stroke: '#b45309', strokeW: 6 }),
          txt('สู่ห้องเรียน ป. ...... / ......', 56, 40, 420, 1043, { bold: true, align: 'center', color: '#78350f', font: 'kanit' }),
          txt('ครูประจำชั้น ...................................', 32, 40, 560, 1043, { align: 'center', color: '#78350f' }),
          sticker('bear', 60, 600, 150),
          sticker('bunny', 913, 600, 150),
        ], { bg: bg('#fde68a', '#fdba74', 160, 'dots'), border: { style: 'scallop', color: '#ffffff', w: 4 } }),
      ]),
  },
  {
    id: 'dc-corner',
    label: 'ป้ายมุมการเรียนรู้',
    note: 'แนวนอน เช่น มุมหนังสือ มุมวิทย์',
    cat: 'decor',
    sizeId: 'a4l',
    accent: '#16a34a',
    make: () =>
      design('a4l', [
        page([
          box('#ffffff', '#15803d', 80, 120, 963, 554),
          sticker('book', 120, 170, 220),
          txt('มุมหนังสือ', 100, 360, 210, 640, { bold: true, color: '#15803d', font: 'kanit' }),
          txt('อ่านวันละนิด ความรู้เพิ่มขึ้นทุกวัน', 34, 360, 380, 640, { color: '#334155', font: 'mitr' }),
          txt('กติกา: หยิบแล้วเก็บเข้าที่  อ่านเงียบๆ  ดูแลหนังสือ', 24, 120, 560, 883, { color: '#15803d', bold: true, align: 'center' }),
        ], { bg: bg('#bbf7d0', '#86efac', 160, 'stripes'), border: { style: 'leaves', color: '#15803d', w: 3 } }),
      ]),
  },
  {
    id: 'dc-door',
    label: 'ป้ายหน้าห้อง',
    note: 'ชั้น ครูประจำชั้น จำนวนนักเรียน',
    cat: 'decor',
    sizeId: 'a4p',
    accent: '#7c3aed',
    make: () =>
      design('a4p', [
        page([
          sticker('st-excellent', 297, 70, 200),
          txt('ห้องเรียน', 56, 40, 300, 714, { bold: true, align: 'center', color: '#ffffff', font: 'kanit' }),
          txt('ป. ...... / ......', 110, 40, 390, 714, { bold: true, align: 'center', color: '#ffffff', font: 'chonburi', stroke: '#4c1d95', strokeW: 5 }),
          box('#ffffff', '', 80, 640, 634, 330),
          txt('ครูประจำชั้น\n..........................................\n..........................................\nนักเรียน ...... คน', 30, 80, 670, 634, { align: 'center', lh: 1.7, color: '#4c1d95' }),
        ], { bg: bg('#8b5cf6', '#ec4899', 160, 'dots'), border: { style: 'stars', color: '#ffffff', w: 3 } }),
      ]),
  },

  /* ---------------- บัตรคำ / การ์ด ---------------- */
  {
    id: 'cd-praise',
    label: 'บัตรคำชม',
    note: '6 ใบต่อหน้า ตัดแจกนักเรียน',
    cat: 'card',
    sizeId: 'a4p',
    accent: '#f59e0b',
    make: () => {
      const cards: [string, string, string][] = [
        ['เก่งมาก!', 'st-great', '#fef3c7'],
        ['ตั้งใจดีมาก', 'st-good', '#dcfce7'],
        ['ยอดเยี่ยม!', 'st-excellent', '#dbeafe'],
        ['พยายามได้ดี', 'st-try', '#fce7f3'],
        ['เรียบร้อยมาก', 'st-neat', '#ede9fe'],
        ['มีน้ำใจ', 'heartface', '#ffe4e6'],
      ];
      const items: Item[] = [cutV(397, 1123), cutH(374, 794), cutH(748, 794)];
      cards.forEach(([t, s, c], i) => {
        const x = (i % 2) * 397;
        const y = Math.floor(i / 2) * 374;
        items.push(box(c, '#2a2350', x + 24, y + 24, 349, 326));
        items.push(sticker(s, x + 138, y + 44, 120));
        items.push(txt(t, 40, x + 24, y + 176, 349, { bold: true, align: 'center', font: 'kanit' }));
        items.push(txt('ถึง ..........................', 22, x + 44, y + 260, 309, { align: 'center' }));
      });
      return design('a4p', [page(items)]);
    },
  },
  {
    id: 'cd-bookmark',
    label: 'ที่คั่นหนังสือ',
    note: '4 แผ่นต่อหน้า ตัดตามเส้น',
    cat: 'card',
    sizeId: 'a4p',
    accent: '#0d9488',
    make: () => {
      const looks: [string, string, string][] = [
        ['#ccfbf1', 'book', 'อ่านทุกวัน'],
        ['#fde68a', 'sparkle', 'ความรู้ไม่มีที่สิ้นสุด'],
        ['#fbcfe8', 'owl', 'หนังสือคือเพื่อน'],
        ['#bfdbfe', 'rocket', 'อ่านแล้วไปได้ไกล'],
      ];
      const items: Item[] = [cutV(198, 1123), cutV(397, 1123), cutV(595, 1123)];
      looks.forEach(([c, s, t], i) => {
        const x = i * 198.5;
        items.push(box(c, '#2a2350', x + 20, 30, 158, 1063));
        items.push(sticker(s, x + 39, 80, 120));
        items.push(txt(t, 30, x + 30, 260, 138, { bold: true, align: 'center', font: 'kanit', lh: 1.3 }));
        items.push(at(makeShape('circle', { fill: '#ffffff', stroke: '#2a2350', sw: 2 }), x + 87, 1020, 24, 24));
        items.push(txt('ชื่อเจ้าของ\n..............', 18, x + 30, 880, 138, { align: 'center' }));
      });
      return design('a4p', [page(items)]);
    },
  },
  {
    id: 'cd-words',
    label: 'บัตรคำใหญ่',
    note: 'แนวนอน 4 คำต่อหน้า ใช้สอนอ่าน',
    cat: 'card',
    sizeId: 'a4l',
    accent: '#dc2626',
    make: () => {
      const items: Item[] = [cutV(561, 794), cutH(397, 1123)];
      ['บ้าน', 'โรงเรียน', 'คุณครู', 'เพื่อน'].forEach((w, i) => {
        const x = (i % 2) * 561;
        const y = Math.floor(i / 2) * 397;
        items.push(box('#ffffff', '#dc2626', x + 24, y + 24, 513, 349));
        items.push(txt(w, 96, x + 24, y + 130, 513, { bold: true, align: 'center', font: 'sarabun', color: '#2a2350' }));
      });
      return design('a4l', [page(items)]);
    },
  },
  {
    id: 'cd-numbers',
    label: 'บัตรตัวเลข 0–9',
    note: '12 ใบ รวมเครื่องหมาย + และ =',
    cat: 'card',
    sizeId: 'a4p',
    accent: '#2563eb',
    make: () => {
      const items: Item[] = [cutV(265, 1123), cutV(529, 1123), cutH(281, 794), cutH(562, 794), cutH(843, 794)];
      const colors = ['#fecaca', '#fed7aa', '#fde68a', '#bbf7d0', '#a5f3fc', '#bfdbfe', '#ddd6fe', '#fbcfe8'];
      ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '+', '='].forEach((n, i) => {
        const x = (i % 3) * 264.7;
        const y = Math.floor(i / 3) * 280.75;
        items.push(box(colors[i % colors.length], '#2a2350', x + 16, y + 16, 232, 248));
        items.push(txt(n, 150, x + 16, y + 20, 232, { bold: true, align: 'center', font: 'prompt' }));
      });
      return design('a4p', [page(items)]);
    },
  },
  {
    id: 'cd-thanks',
    label: 'การ์ดขอบคุณคุณครู',
    note: 'A5 เขียนข้อความถึงคุณครู',
    cat: 'card',
    sizeId: 'a5p',
    accent: '#db2777',
    make: () =>
      design('a5p', [
        page([
          sticker('heartface', 210, 40, 140),
          txt('ขอบคุณครับ/ค่ะ\nคุณครู', 44, 30, 200, 499, { bold: true, align: 'center', color: '#be185d', font: 'charm', lh: 1.2 }),
          txt('ถึง คุณครู ........................................', 22, 40, 360, 479),
          lines(40, 410, 479, 230, 44),
          txt('จาก ........................................', 22, 40, 680, 479, { align: 'right' }),
        ], { bg: bg('#fff1f2', '#fce7f3', 180), border: { style: 'hearts', color: '#f9a8d4', w: 3 } }),
      ]),
  },

  /* ---------------- สไลด์ ---------------- */
  {
    id: 'sl-lesson',
    label: 'สไลด์เปิดบทเรียน',
    note: '3 หน้า: ปก จุดประสงค์ เนื้อหา',
    cat: 'slide',
    sizeId: 'slide',
    accent: '#6d28d9',
    make: () =>
      design('slide', [
        page([
          sticker('rocket', 1020, 400, 220),
          txt('บทที่ 1', 40, 100, 180, 900, { bold: true, color: '#fde68a', font: 'kanit' }),
          txt('ชื่อบทเรียน', 96, 100, 250, 1000, { bold: true, color: '#ffffff', font: 'kanit' }),
          txt('วิชา .................  ชั้น ป. ......', 34, 100, 420, 900, { color: '#e9d5ff' }),
        ], { bg: bg('#6d28d9', '#db2777', 120) }),
        page([
          txt('จุดประสงค์การเรียนรู้', 56, 80, 60, 1120, { bold: true, color: '#6d28d9', font: 'kanit' }),
          sticker('bulb', 1080, 40, 130),
          ...[0, 1, 2].map((i) => txt(`${i + 1}.  นักเรียนสามารถ ..................................................................`, 36, 100, 220 + i * 120, 1080, { font: 'prompt' })),
        ], { bg: bg('#faf5ff') }),
        page([
          txt('หัวข้อ', 56, 80, 60, 1120, { bold: true, color: '#6d28d9', font: 'kanit' }),
          box('#f3e8ff', '', 80, 170, 700, 470),
          txt('เนื้อหาที่ต้องการอธิบาย\nใช้ประโยคสั้นๆ อ่านง่ายจากหลังห้อง', 34, 110, 200, 640, { lh: 1.6 }),
          box('#ffffff', '#c4b5fd', 820, 170, 380, 470, 'dash'),
          txt('วางรูปตรงนี้', 28, 820, 380, 380, { align: 'center', color: '#7c3aed' }),
        ], { bg: bg('#ffffff') }),
      ]),
  },
  {
    id: 'sl-quiz',
    label: 'สไลด์คำถาม 4 ตัวเลือก',
    note: 'ฉายหน้าห้อง ตัวเลือก 4 สี',
    cat: 'slide',
    sizeId: 'slide',
    accent: '#2563eb',
    make: () => {
      const items: Item[] = [box('#ffffff', '', 60, 40, 1160, 220), txt('คำถาม: ...................................................................?', 48, 100, 110, 1080, { bold: true, align: 'center', font: 'kanit' })];
      [
        ['ก', '#ef4444'],
        ['ข', '#3b82f6'],
        ['ค', '#eab308'],
        ['ง', '#22c55e'],
      ].forEach(([k, c], i) => {
        const x = 60 + (i % 2) * 590;
        const y = 300 + Math.floor(i / 2) * 200;
        items.push(box(c, '', x, y, 570, 180));
        items.push(txt(`${k}.  ตัวเลือก`, 44, x + 40, y + 60, 490, { bold: true, color: '#ffffff', font: 'kanit' }));
      });
      return design('slide', [page(items, { bg: bg('#1e1b4b', '#312e81', 160) })]);
    },
  },
  {
    id: 'sl-think',
    label: 'สไลด์คำถามชวนคิด',
    note: 'กล่องความคิด + มาสคอต',
    cat: 'slide',
    sizeId: 'slide',
    accent: '#0891b2',
    make: () =>
      design('slide', [
        page([
          at(makeShape('think', { fill: '#ffffff', stroke: '#0e7490', sw: 4 }), 260, 60, 900, 480),
          txt('ถ้า ............................\nจะเกิดอะไรขึ้น?', 56, 360, 200, 700, { bold: true, align: 'center', font: 'kanit', color: '#0e7490', lh: 1.3 }),
          sticker('owl', 60, 450, 220),
          txt('ลองคิด แล้วคุยกับเพื่อนข้างๆ 1 นาที', 30, 300, 620, 920, { align: 'center', color: '#ffffff', bold: true }),
        ], { bg: bg('#22d3ee', '#0891b2', 160, 'dots') }),
      ]),
  },
];
