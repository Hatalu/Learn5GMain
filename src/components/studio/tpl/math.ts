import { makeMath, makeShape, type Item } from '@/lib/studio/doc';
import { at, blankRows, box, design, drillItems, edu, header, lines, nameLine, page, table, txt, type Template } from './kit';

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

/** แบบฝึกคิดเลข 20 ข้อ: ตัวเลขคิดจากสูตรตายตัว แม่แบบจึงได้โจทย์ชุดเดิมทุกครั้ง */
const drill = (id: string, label: string, note: string, accent: string, fill: string, gen: (i: number) => string): Template => ({
  id,
  label,
  note,
  cat: 'math',
  sizeId: 'a4p',
  accent,
  make: () =>
    design('a4p', [
      page(
        [
          ...header('คณิตคิดเร็ว', label, fill, accent, 'm-calc'),
          nameLine(170),
          txt('เวลา ........ นาที          ได้ ........ / 20 คะแนน', 22, 40, 214, 714, { bold: true, color: accent }),
          ...drillItems(range(20).map(gen)),
        ],
        { border: { style: 'round', color: accent, w: 3 } }
      ),
    ]),
});

const timesTable = (id: string, from: number): Template => ({
  id,
  label: `สูตรคูณแม่ ${from}–${from + 3}`,
  note: 'เติมผลคูณ 4 แม่ แม่ละ 12 บรรทัด',
  cat: 'math',
  sizeId: 'a4p',
  accent: '#0ea5e9',
  make: () => {
    const items: Item[] = [...header('ท่องสูตรคูณ', `สูตรคูณแม่ ${from}–${from + 3}`, '#e0f2fe', '#0369a1', 'm-times'), nameLine(170)];
    range(4).forEach((c) => {
      const m = from + c;
      const x = 40 + c * 182;
      items.push(box(c % 2 ? '#f0f9ff' : '#ffffff', '#7dd3fc', x, 222, 168, 860));
      items.push(txt(`แม่ ${m}`, 26, x, 236, 168, { bold: true, color: '#0369a1', font: 'kanit', align: 'center' }));
      range(12).forEach((r) => items.push(txt(`${m} × ${r + 1} = ____`, 22, x + 16, 300 + r * 64, 150, { font: 'prompt' })));
    });
    return design('a4p', [page(items)]);
  },
});

export const MATH_TEMPLATES: Template[] = [
  drill('drill-add2', 'บวกเลขสองหลัก', '20 ข้อ จับเวลาได้', '#16a34a', '#dcfce7', (i) => `${11 + ((i * 29) % 70)} + ${10 + ((i * 17) % 40)}`),
  drill('drill-sub2', 'ลบเลขสองหลัก', '20 ข้อ ตัวตั้งมากกว่าตัวลบเสมอ', '#dc2626', '#fee2e2', (i) => `${50 + ((i * 23) % 49)} − ${10 + ((i * 13) % 40)}`),
  drill('drill-mul', 'คูณเลข', 'สูตรคูณคละแม่ 20 ข้อ', '#7c3aed', '#ede9fe', (i) => `${2 + ((i * 7) % 11)} × ${2 + ((i * 5) % 8)}`),
  drill('drill-div', 'หารลงตัว', '20 ข้อ หารลงตัวทุกข้อ', '#ea580c', '#ffedd5', (i) => {
    const b = 2 + ((i * 3) % 8);
    return `${b * (2 + ((i * 7) % 9))} ÷ ${b}`;
  }),
  timesTable('times-2', 2),
  timesTable('times-6', 6),
  {
    id: 'vertical',
    label: 'บวกลบแนวตั้ง',
    note: '12 ข้อ ตั้งหลักให้ตรง',
    cat: 'math',
    sizeId: 'a4p',
    accent: '#2563eb',
    make: () => {
      const items: Item[] = [...header('คณิตศาสตร์', 'บวกลบแนวตั้ง', '#dbeafe', '#1d4ed8', 'm-plus'), nameLine(170)];
      range(12).forEach((i) => {
        const x = 40 + (i % 4) * 182;
        const y = 226 + Math.floor(i / 4) * 280;
        const a = 120 + ((i * 137) % 800);
        const b = 15 + ((i * 59) % (i % 2 ? a - 20 : 400));
        items.push(box('#f8fafc', '#93c5fd', x, y, 166, 260));
        items.push(txt(`${i + 1}.`, 20, x + 10, y + 8, 60, { bold: true, color: '#1d4ed8' }));
        items.push(txt(`${a}\n${i % 2 ? '−' : '+'}   ${b}\n______`, 34, x + 10, y + 40, 130, { font: 'prompt', lh: 1.25, align: 'right' }));
      });
      return design('a4p', [page(items)]);
    },
  },
  {
    id: 'word-problem',
    label: 'โจทย์ปัญหา',
    note: '2 ข้อ แยก ให้มา / ถาม / วิธีทำ / ตอบ',
    cat: 'math',
    sizeId: 'a4p',
    accent: '#ca8a04',
    make: () => {
      const items: Item[] = [...header('คณิตศาสตร์', 'โจทย์ปัญหา', '#fef9c3', '#a16207', 'question'), nameLine(170)];
      [214, 660].forEach((y, i) => {
        items.push(box('#fefce8', '#facc15', 40, y, 714, 80));
        items.push(txt(`โจทย์ข้อ ${i + 1}: พิมพ์โจทย์ตรงนี้ ...............................................................`, 22, 60, y + 22, 680));
        [
          ['สิ่งที่โจทย์ให้มา', 96, 46],
          ['สิ่งที่โจทย์ถาม', 182, 46],
          ['วิธีทำ', 268, 92],
        ].forEach(([t, dy, h]) => {
          items.push(txt(String(t), 22, 40, y + Number(dy), 714, { bold: true, color: '#a16207' }));
          items.push(lines(40, y + Number(dy) + 34, 714, Number(h)));
        });
        items.push(txt('ตอบ ..................................................................', 22, 40, y + 400, 714, { bold: true }));
      });
      return design('a4p', [page(items)]);
    },
  },
  {
    id: 'tenframe',
    label: 'นับจำนวนกรอบสิบ',
    note: 'ป.1 นับจุดแล้วเขียนตัวเลข',
    cat: 'math',
    sizeId: 'a4p',
    accent: '#ff6b7a',
    make: () => {
      const items: Item[] = [...header('ป.1 คณิตศาสตร์', 'นับแล้วเขียนตัวเลข', '#ffe4e8', '#e11d48', 'm-123'), nameLine(170)];
      [3, 7, 5, 9, 6, 8].forEach((n, i) => {
        const y = 230 + i * 140;
        items.push(edu('tenframe', 40, y + 6, 320, 120, n));
        items.push(txt('มีทั้งหมด ........... ตัว', 26, 400, y + 46, 354));
      });
      return design('a4p', [page(items, { border: { style: 'dots', color: '#fda4af', w: 3 } })]);
    },
  },
  {
    id: 'money',
    label: 'นับเงิน',
    note: 'เหรียญและธนบัตร 4 ชุด',
    cat: 'math',
    sizeId: 'a4p',
    accent: '#ca8a04',
    make: () => {
      const items: Item[] = [...header('คณิตศาสตร์', 'นับเงินรวมกันได้เท่าไร', '#fef3c7', '#b45309', 'gift'), nameLine(170)];
      [37, 85, 126, 254].forEach((n, i) => {
        const y = 226 + i * 216;
        items.push(edu('money', 40, y, 440, 203, n));
        items.push(txt(`${i + 1}.  รวม ........... บาท`, 26, 500, y + 80, 254, { bold: true }));
      });
      return design('a4p', [page(items)]);
    },
  },
  {
    id: 'place-value',
    label: 'หลักและค่าประจำหลัก',
    note: 'บล็อกฐานสิบ 4 ข้อ',
    cat: 'math',
    sizeId: 'a4p',
    accent: '#0284c7',
    make: () => {
      const items: Item[] = [...header('คณิตศาสตร์', 'หลักและค่าประจำหลัก', '#e0f2fe', '#0369a1', 'm-cube'), nameLine(170)];
      [124, 253, 341, 205].forEach((n, i) => {
        const y = 226 + i * 216;
        items.push({ ...edu('blocks', 40, y, 380, 198, n), labels: false });
        items.push(txt('หลักร้อย ........\nหลักสิบ ........\nหลักหน่วย ........\nอ่านว่า ..............................', 22, 440, y + 6, 314, { lh: 1.6 }));
      });
      return design('a4p', [page(items)]);
    },
  },
  {
    id: 'numberline',
    label: 'เส้นจำนวน',
    note: 'นับเพิ่มทีละเท่าๆ กัน 5 เส้น',
    cat: 'math',
    sizeId: 'a4p',
    accent: '#7c5cf0',
    make: () => {
      const items: Item[] = [...header('คณิตศาสตร์', 'เส้นจำนวน', '#ede9fe', '#6d28d9', 'ruler'), nameLine(170)];
      [
        [0, 10, 1],
        [0, 20, 2],
        [10, 20, 1],
        [0, 50, 5],
        [0, 100, 10],
      ].forEach(([a, b, c], i) => {
        const y = 230 + i * 170;
        items.push(txt(`${i + 1}.  นับทีละ ${c} ตั้งแต่ ${a} ถึง ${b}  แล้วตอบ: ${a} + ${c * 3} = ........`, 22, 40, y, 714));
        items.push(edu('numberline', 77, y + 46, 640, 90, a, b, c));
      });
      return design('a4p', [page(items)]);
    },
  },
  {
    id: 'protractor',
    label: 'วัดมุม',
    note: 'ไม้โปรแทรกเตอร์ 4 มุม',
    cat: 'math',
    sizeId: 'a4p',
    accent: '#059669',
    make: () => {
      const items: Item[] = [...header('คณิตศาสตร์', 'อ่านขนาดของมุม', '#d1fae5', '#047857', 'm-protractor'), nameLine(170)];
      [30, 75, 110, 145].forEach((d, i) => {
        const x = i % 2 ? 414 : 40;
        const y = 240 + Math.floor(i / 2) * 400;
        items.push(edu('protractor', x, y, 340, 186, d, 0, 1));
        items.push(txt(`${i + 1}.  มุมนี้มีขนาด ........ องศา\nเป็นมุม ......................`, 22, x, y + 210, 340, { lh: 1.7 }));
      });
      return design('a4p', [page(items)]);
    },
  },
  {
    id: 'dice-add',
    label: 'ทอยลูกเต๋าบวกเลข',
    note: '8 ข้อ ป.1–2',
    cat: 'math',
    sizeId: 'a4p',
    accent: '#f97316',
    make: () => {
      const items: Item[] = [...header('ป.1 คณิตศาสตร์', 'บวกแต้มลูกเต๋า', '#ffedd5', '#c2410c', 'm-plus'), nameLine(170)];
      range(8).forEach((i) => {
        const y = 226 + i * 106;
        items.push(txt(`${i + 1}.`, 24, 40, y + 20, 50, { bold: true }));
        items.push(edu('dice', 100, y, 80, 80, 1 + ((i * 5) % 6)));
        items.push(txt('+', 40, 196, y + 6, 40, { bold: true }));
        items.push(edu('dice', 246, y, 80, 80, 1 + ((i * 3 + 2) % 6)));
        items.push(txt('=  ..........', 32, 350, y + 14, 300, { font: 'prompt' }));
      });
      return design('a4p', [page(items, { border: { style: 'zigzag', color: '#fdba74', w: 3 } })]);
    },
  },
  {
    id: 'number-bond',
    label: 'แยกจำนวน',
    note: 'แผนภาพจำนวน 6 ข้อ',
    cat: 'math',
    sizeId: 'a4p',
    accent: '#d97706',
    make: () => {
      const items: Item[] = [...header('ป.1 คณิตศาสตร์', 'แยกจำนวน', '#fef3c7', '#b45309', 'm-123'), nameLine(170)];
      [
        [10, 6],
        [8, 3],
        [9, 4],
        [7, 2],
        [12, 5],
        [15, 9],
      ].forEach(([a, b], i) => {
        const x = i % 2 ? 437 : 77;
        const y = 236 + Math.floor(i / 2) * 280;
        items.push(edu('bond', x, y, 280, 224, a, b, i % 3 === 2 ? 1 : 3 - (i % 2)));
      });
      return design('a4p', [page(items)]);
    },
  },
  {
    id: 'hundred',
    label: 'ตาราง 100 ช่อง',
    note: 'ระบายสีตามเงื่อนไข',
    cat: 'math',
    sizeId: 'a4p',
    accent: '#eab308',
    make: () =>
      design('a4p', [
        page([
          ...header('คณิตศาสตร์', 'ตาราง 100 ช่อง', '#fef9c3', '#a16207', 'm-123'),
          nameLine(170),
          txt('ระบายสีเหลืองจำนวนที่นับทีละ 5 และวงกลมจำนวนที่นับทีละ 10', 22, 40, 214, 714, { bold: true, color: '#a16207' }),
          edu('hundred', 97, 270, 600, 600, 0),
          txt('จำนวนที่ถูกระบายและวงกลมพร้อมกันคือ ...........................................', 22, 40, 900, 714),
        ]),
      ]),
  },
  {
    id: 'coord',
    label: 'ระนาบพิกัด',
    note: 'ป.6 อ่าน/จุดพิกัด',
    cat: 'math',
    sizeId: 'a4p',
    accent: '#6d28d9',
    make: () =>
      design('a4p', [
        page([
          ...header('ป.6 คณิตศาสตร์', 'จุดบนระนาบพิกัด', '#ede9fe', '#6d28d9', 'm-chart'),
          nameLine(170),
          edu('coord', 187, 220, 420, 420, 5),
          table(blankRows(['จุด', 'พิกัด (x, y)', 'จุด', 'พิกัด (x, y)'], 4, (i) => 'ABCD'[i]), 40, 670, 714, 300, { head: '#ede9fe', size: 22 }),
          txt('ลากเส้นต่อจุด A B C D จะได้รูป ...........................', 22, 40, 1000, 714),
        ]),
      ]),
  },
  {
    id: 'geometry',
    label: 'รูปเรขาคณิต',
    note: '6 รูป บอกชื่อ ด้าน มุม',
    cat: 'math',
    sizeId: 'a4p',
    accent: '#db2777',
    make: () => {
      const items: Item[] = [...header('คณิตศาสตร์', 'รูปเรขาคณิตสองมิติ', '#fce7f3', '#be185d', 'm-shapes'), nameLine(170)];
      const fills = ['#fecaca', '#fde68a', '#bbf7d0', '#bfdbfe', '#ddd6fe', '#fbcfe8'];
      ['triangle', 'rect', 'circle', 'pentagon', 'hexagon', 'diamond'].forEach((s, i) => {
        const x = i % 2 ? 414 : 40;
        const y = 226 + Math.floor(i / 2) * 285;
        items.push(at(makeShape(s, { fill: fills[i], stroke: '#2a2350', sw: 3 }), x + 10, y + 20, 140, 140));
        items.push(txt('ชื่อรูป ................\nด้าน ........ ด้าน\nมุม ........ มุม', 22, x + 166, y + 30, 174, { lh: 1.8 }));
      });
      return design('a4p', [page(items)]);
    },
  },
  {
    id: 'fraction-compare',
    label: 'เปรียบเทียบเศษส่วน',
    note: 'แถบเศษส่วน เติม > < =',
    cat: 'math',
    sizeId: 'a4p',
    accent: '#0891b2',
    make: () => {
      const items: Item[] = [...header('คณิตศาสตร์', 'เปรียบเทียบเศษส่วน', '#cffafe', '#0e7490', 'm-equal'), nameLine(170)];
      [
        [1, 2, 1, 4],
        [2, 3, 3, 4],
        [3, 5, 6, 10],
        [5, 8, 3, 4],
      ].forEach(([a, b, c, d], i) => {
        const y = 240 + i * 205;
        items.push(edu('bar', 40, y, 300, 44, b, a));
        items.push(at(makeMath(`\\frac{${a}}{${b}}`, 80, 90, 36), 150, y + 60));
        items.push(at(makeShape('circle', { fill: '#ffffff', stroke: '#0e7490', sw: 3 }), 362, y + 20, 70, 70));
        items.push(edu('bar', 454, y, 300, 44, d, c));
        items.push(at(makeMath(`\\frac{${c}}{${d}}`, 80, 90, 36), 564, y + 60));
      });
      return design('a4p', [page(items)]);
    },
  },
  {
    id: 'magic-square',
    label: 'ตารางมหัศจรรย์',
    note: 'เติมเลขให้ผลรวมทุกแถวเท่ากัน',
    cat: 'math',
    sizeId: 'a4p',
    accent: '#9333ea',
    make: () => {
      const puzzles = [
        ['8', '', '6', '', '5', '', '4', '', '2'],
        ['', '1', '', '3', '', '7', '', '9', ''],
        ['2', '', '', '', '5', '', '', '', '8'],
        ['', '', '', '', '', '', '', '', ''],
      ];
      const items: Item[] = [
        ...header('คณิตคิดสนุก', 'ตารางมหัศจรรย์', '#f3e8ff', '#7e22ce', 'sparkle'),
        nameLine(170),
        txt('ใช้เลข 1–9 ครั้งละตัว ให้ผลบวกทุกแถว ทุกหลัก และแนวทแยงได้ 15', 22, 40, 214, 714, { bold: true, color: '#7e22ce' }),
      ];
      puzzles.forEach((p, i) => {
        const x = i % 2 ? 434 : 60;
        const y = 280 + Math.floor(i / 2) * 400;
        items.push(txt(i === 3 ? 'ลองสร้างเอง' : `ข้อ ${i + 1}`, 24, x, y, 300, { bold: true }));
        items.push(table([p.slice(0, 3), p.slice(3, 6), p.slice(6)], x, y + 44, 300, 300, { head: '#ffffff', size: 40, font: 'prompt', stroke: '#7e22ce' }));
      });
      return design('a4p', [page(items)]);
    },
  },
];
