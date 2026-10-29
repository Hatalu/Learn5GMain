import { makeEdu, makeLine, makeMath, makeShape, makeSticker, makeTable, makeText, makeWrite, blankBg, type Item } from '@/lib/studio/doc';
import { at, badge, design, header, label, lines, nameLine, page, type Template } from './tpl/kit';
import { MATH_TEMPLATES } from './tpl/math';
import { THAI_TEMPLATES } from './tpl/thai';
import { ENG_TEMPLATES } from './tpl/eng';
import { SCI_TEMPLATES } from './tpl/sci';
import { ORG_TEMPLATES } from './tpl/org';
import { TEST_TEMPLATES } from './tpl/test';
import { CLASS_TEMPLATES } from './tpl/class';
import { DECOR_TEMPLATES } from './tpl/decor';

export { TEMPLATE_CATS, type Template, type TemplateCat } from './tpl/kit';

const BASE: Template[] = [
  {
    id: 'worksheet',
    cat: 'sheet',
    label: 'ใบงาน',
    note: 'หัวเรื่อง ช่องชื่อ คำถาม และบรรทัดเขียนตอบ',
    sizeId: 'a4p',
    accent: '#7c5cf0',
    make: () =>
      design('a4p', [
        page(
          [
            at(makeShape('round', { fill: '#ede7ff', sw: 0 }), 40, 36, 714, 120),
            at(makeText({ text: 'ใบงานที่ 1', size: 22, color: '#7c5cf0', bold: true, font: 'kanit' }), 60, 50, 674),
            at(makeText({ text: 'เรื่อง ..................................', size: 40, bold: true, font: 'kanit' }), 60, 84, 674),
            at(makeSticker('pencil'), 660, 24, 96, 96),
            nameLine(184),
            at(makeText({ text: 'คำชี้แจง: อ่านคำถามแล้วเขียนคำตอบลงในบรรทัด', size: 20, align: 'left', italic: true, color: '#5b5285' }), 40, 232, 714),
            at(makeText({ text: '1', size: 22, bold: true, color: '#ffffff', bg: '#7c5cf0' }), 40, 290, 52),
            at(makeText({ text: 'คำถามข้อที่ 1', size: 24, align: 'left' }), 104, 292, 650),
            at(makeWrite('lines', { gap: 46 }), 104, 336, 650, 140),
            at(makeText({ text: '2', size: 22, bold: true, color: '#ffffff', bg: '#ff6b7a' }), 40, 510, 52),
            at(makeText({ text: 'คำถามข้อที่ 2', size: 24, align: 'left' }), 104, 512, 650),
            at(makeWrite('lines', { gap: 46 }), 104, 556, 650, 140),
            at(makeText({ text: '3', size: 22, bold: true, color: '#ffffff', bg: '#2f9e6e' }), 40, 730, 52),
            at(makeText({ text: 'วาดภาพหรือเขียนอธิบายในกรอบ', size: 24, align: 'left' }), 104, 732, 650),
            at(makeWrite('box', { stroke: '#9b8fd0', sw: 2.5 }), 104, 778, 650, 280),
          ],
          { border: { style: 'round', color: '#c4b5fd', w: 3 } }
        ),
      ]),
  },
  {
    id: 'knowledge',
    cat: 'sheet',
    label: 'ใบความรู้',
    note: 'หัวเรื่องเด่น กล่องเนื้อหา และจุดสำคัญ',
    sizeId: 'a4p',
    accent: '#2a73d9',
    make: () =>
      design('a4p', [
        page(
          [
            at(makeShape('rect', { fill: '#2a73d9', sw: 0 }), 0, 0, 794, 190),
            at(makeShape('cloud', { fill: '#ffffff', sw: 0, opacity: 0.25 }), 560, 40, 220, 140),
            at(makeText({ text: 'ใบความรู้', size: 26, color: '#ffe066', bold: true, font: 'kanit', align: 'left' }), 50, 40, 600),
            at(makeText({ text: 'ชื่อเรื่องที่จะสอน', size: 48, color: '#ffffff', bold: true, font: 'kanit', align: 'left', shadow: true }), 50, 82, 640),
            at(makeShape('round', { fill: '#eef6ff', stroke: '#2a73d9', sw: 3 }), 40, 230, 714, 330),
            at(makeText({ text: 'เนื้อหาหลัก', size: 28, color: '#2a73d9', bold: true, align: 'left', font: 'kanit' }), 70, 254, 660),
            at(makeText({ text: 'พิมพ์เนื้อหาที่ต้องการอธิบายตรงนี้ ใช้ประโยคสั้น ๆ อ่านง่าย\nเว้นบรรทัดระหว่างย่อหน้าให้ตาไม่ล้า', size: 22, align: 'left', lh: 1.6 }), 70, 304, 660),
            at(makeSticker('bulb'), 40, 600, 90, 90),
            at(makeText({ text: 'จุดสำคัญที่ต้องจำ', size: 28, color: '#e07a12', bold: true, align: 'left', font: 'kanit' }), 140, 624, 600),
            at(makeShape('round', { fill: '#fff4e0', stroke: '#ffb347', sw: 3, dash: 'dash' }), 40, 700, 714, 220),
            at(makeText({ text: '1. ...............................................\n2. ...............................................\n3. ...............................................', size: 22, align: 'left', lh: 1.9 }), 70, 726, 660),
            at(makeText({ text: 'ลองคิดดู: ...........................................................', size: 22, align: 'left', color: '#2a73d9', bold: true }), 40, 960, 714),
          ],
          {}
        ),
      ]),
  },
  {
    id: 'certificate',
    cat: 'decor',
    label: 'เกียรติบัตร',
    note: 'แนวนอน กรอบสวย พร้อมช่องชื่อและลายเซ็น',
    sizeId: 'a4l',
    accent: '#e0a100',
    make: () =>
      design('a4l', [
        page(
          [
            at(makeSticker('ribbon'), 506, 44, 110, 110),
            at(makeText({ text: 'เกียรติบัตร', size: 64, color: '#b7791f', font: 'charm', bold: true, stroke: '#fff3c4', strokeW: 3 }), 161, 160, 800),
            at(makeText({ text: 'มอบให้ไว้เพื่อแสดงว่า', size: 24, color: '#5b5285' }), 261, 262, 600),
            at(makeText({ text: 'ชื่อนักเรียน', size: 48, color: '#2a2350', font: 'charm', bold: true }), 161, 306, 800),
            at(makeLine({ stroke: '#d4a017', sw: 2 }), 261, 380, 600, 20),
            at(makeText({ text: 'ได้รับรางวัล ..................................................\nประจำภาคเรียนที่ ...... ปีการศึกษา ..........', size: 24, color: '#2a2350', lh: 1.7 }), 211, 420, 700),
            at(makeLine({ stroke: '#2a2350', sw: 1.5, dash: 'dot' }), 160, 640, 260, 20),
            at(makeText({ text: '(ครูประจำชั้น)', size: 20, color: '#5b5285' }), 160, 666, 260),
            at(makeLine({ stroke: '#2a2350', sw: 1.5, dash: 'dot' }), 703, 640, 260, 20),
            at(makeText({ text: '(ผู้อำนวยการ)', size: 20, color: '#5b5285' }), 703, 666, 260),
            at(makeSticker('st-excellent'), 500, 560, 122, 122),
          ],
          { bg: { ...blankBg(), color: '#fffbea', color2: '#fff3d1', angle: 160 }, border: { style: 'corner', color: '#d4a017', w: 5 } }
        ),
      ]),
  },
  {
    id: 'flashcards',
    cat: 'card',
    label: 'แฟลชการ์ดคำศัพท์',
    note: 'การ์ด A6 คำศัพท์ + ภาพ 2 ใบ',
    sizeId: 'a6p',
    accent: '#ff6b7a',
    make: () =>
      design(
        'a6p',
        [
          ['apple', 'Apple', 'แอปเปิล', '#ffe4e8', '#ff6b7a'],
          ['cat', 'Cat', 'แมว', '#fff1dc', '#ff9a3d'],
        ].map(([st, en, th, bg, c]) =>
          page(
            [
              at(makeSticker(st), 98, 70, 200, 200),
              at(makeText({ text: en, size: 64, bold: true, color: c, font: 'kanit' }), 28, 300, 340),
              at(makeText({ text: th, size: 34, color: '#2a2350', font: 'mitr' }), 28, 396, 340),
            ],
            { bg: { ...blankBg(), color: bg }, border: { style: 'round', color: c, w: 6 } }
          )
        )
      ),
  },
  {
    id: 'poster',
    cat: 'decor',
    label: 'โปสเตอร์ประกาศ',
    note: 'หัวใหญ่ เด่นไกล ติดบอร์ดได้',
    sizeId: 'a4p',
    accent: '#16a34a',
    make: () =>
      design('a4p', [
        page(
          [
            at(makeShape('burst', { fill: '#ffe066', sw: 0 }), 520, 40, 230, 230),
            at(makeText({ text: 'ใหม่!', size: 52, bold: true, color: '#e8456b', font: 'chonburi', rot: 12 }), 545, 120, 180),
            at(makeText({ text: 'กิจกรรม\nวันวิทยาศาสตร์', size: 72, bold: true, color: '#ffffff', font: 'kanit', align: 'left', stroke: '#14532d', strokeW: 4, lh: 1.15 }), 50, 270, 700),
            at(makeShape('round', { fill: '#ffffff', sw: 0, opacity: 0.92 }), 50, 540, 694, 330),
            at(makeText({ text: 'วันที่ ....................\nเวลา ....................\nสถานที่ ....................', size: 30, align: 'left', lh: 1.8, font: 'prompt' }), 90, 580, 620),
            at(makeSticker('rocket'), 600, 760, 140, 140),
            at(makeText({ text: 'ชวนเพื่อน ๆ มาร่วมสนุกกันนะ', size: 30, color: '#ffffff', bold: true, font: 'itim' }), 50, 950, 694),
          ],
          { bg: { color: '#22c55e', color2: '#0ea5e9', angle: 160, pattern: 'dots', pcolor: '#ffffff33' } }
        ),
      ]),
  },
  {
    id: 'timetable',
    cat: 'class',
    label: 'ตารางเรียน',
    note: 'ตาราง 6 x 6 แก้ช่องได้ทันที',
    sizeId: 'a4l',
    accent: '#0ea5e9',
    make: () => {
      const t = makeTable(6, 6, { head: '#cfeaff', size: 20 });
      t.cells[0] = ['วัน / คาบ', '1', '2', '3', '4', '5'];
      ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์'].forEach((d, i) => (t.cells[i + 1][0] = d));
      return design('a4l', [
        page(
          [
            at(makeText({ text: 'ตารางเรียน', size: 52, bold: true, color: '#0369a1', font: 'kanit' }), 261, 40, 600),
            at(makeText({ text: 'ชั้น ...........  ภาคเรียนที่ ......  ปีการศึกษา ..........', size: 22, color: '#334155' }), 211, 116, 700),
            at(t, 60, 180, 1003, 540),
            at(makeSticker('clock'), 960, 30, 110, 110),
            at(makeSticker('book'), 50, 40, 100, 100),
          ],
          { bg: { ...blankBg(), color: '#f0f9ff' }, border: { style: 'round', color: '#7cc6ff', w: 4 } }
        ),
      ]);
    },
  },
  {
    id: 'match',
    cat: 'sheet',
    label: 'ใบงานจับคู่',
    note: 'โยงเส้นจับคู่ภาพกับคำ',
    sizeId: 'a4p',
    accent: '#ff9a3d',
    make: () => {
      const rows: [string, string][] = [
        ['sun', 'ดวงจันทร์'],
        ['moonface', 'ต้นไม้'],
        ['tree', 'ดวงอาทิตย์'],
        ['fish', 'ปลา'],
      ];
      const items: Item[] = [
        at(makeText({ text: 'โยงเส้นจับคู่ภาพกับคำให้ถูกต้อง', size: 36, bold: true, color: '#e07a12', font: 'kanit' }), 40, 50, 714),
        nameLine(120),
      ];
      rows.forEach(([st, word], i) => {
        const y = 200 + i * 220;
        items.push(at(makeSticker(st), 90, y, 150, 150));
        items.push(at(makeShape('circle', { fill: '#2a2350', sw: 0 }), 290, y + 66, 18, 18));
        items.push(at(makeShape('circle', { fill: '#2a2350', sw: 0 }), 480, y + 66, 18, 18));
        items.push(at(makeText({ text: word, size: 32, bg: '#fff1dc', font: 'mitr' }), 520, y + 48, 220));
      });
      return design('a4p', [page(items, { border: { style: 'dash', color: '#ffb347', w: 3 } })]);
    },
  },
  {
    id: 'blank-grid',
    cat: 'sheet',
    label: 'กระดาษตาราง',
    note: 'พื้นตารางสำหรับวาดหรือคณิต',
    sizeId: 'a4p',
    accent: '#475569',
    make: () =>
      design('a4p', [
        page([at(makeText({ text: 'แบบฝึกหัด', size: 36, bold: true, font: 'kanit', align: 'left' }), 50, 40, 400), nameLine(100), at(makeWrite('grid', { gap: 30, stroke: '#cbd5e1', sw: 1 }), 47, 160, 700, 900)]),
      ]),
  },
  {
    id: 'quiz-mc',
    cat: 'test',
    label: 'แบบทดสอบปรนัย',
    note: '5 ข้อ ตัวเลือก ก ข ค ง',
    sizeId: 'a4p',
    accent: '#2563eb',
    make: () => {
      const items: Item[] = [
        ...header('แบบทดสอบ', 'วิชา .............. เรื่อง ..............', '#dbeafe', '#2563eb', 'question'),
        nameLine(170),
        at(makeText({ text: 'คำชี้แจง: เลือกคำตอบที่ถูกที่สุดเพียงข้อเดียว แล้วกากบาท (X) ทับตัวอักษร', size: 20, align: 'left', italic: true, color: '#475569' }), 40, 214, 714),
      ];
      for (let i = 0; i < 5; i++) {
        const y = 272 + i * 164;
        items.push(badge(i + 1, '#2563eb', 40, y));
        items.push(at(makeText({ text: `คำถามข้อที่ ${i + 1} ..........................................................`, size: 24, align: 'left' }), 104, y + 2, 650));
        items.push(at(makeText({ text: 'ก. ............................          ข. ............................\nค. ............................          ง. ............................', size: 22, align: 'left', lh: 1.7, color: '#334155' }), 124, y + 48, 630));
      }
      return design('a4p', [page(items, { border: { style: 'line', color: '#93c5fd', w: 2 } })]);
    },
  },
  {
    id: 'fill-blank',
    cat: 'sheet',
    label: 'เติมคำในช่องว่าง',
    note: 'กล่องคำที่กำหนด + 8 ประโยค',
    sizeId: 'a4p',
    accent: '#db2777',
    make: () => {
      const items: Item[] = [
        ...header('ใบงาน', 'เติมคำลงในช่องว่าง', '#fce7f3', '#db2777', 'pencil'),
        nameLine(170),
        at(makeShape('round', { fill: '#fdf2f8', stroke: '#f472b6', sw: 3, dash: 'dash' }), 40, 224, 714, 130),
        at(makeText({ text: 'คำที่กำหนดให้', size: 24, bold: true, color: '#db2777', font: 'kanit' }), 60, 236, 674),
        at(makeText({ text: 'คำที่ 1      คำที่ 2      คำที่ 3      คำที่ 4\nคำที่ 5      คำที่ 6      คำที่ 7      คำที่ 8', size: 24, lh: 1.6 }), 60, 278, 674),
      ];
      for (let i = 0; i < 8; i++)
        items.push(at(makeText({ text: `${i + 1}.  ประโยคที่ ${i + 1} ......................... ____________________ .........................`, size: 24, align: 'left' }), 40, 392 + i * 86, 714));
      return design('a4p', [page(items, { border: { style: 'hearts', color: '#f9a8d4', w: 3 } })]);
    },
  },
  {
    id: 'math-drill',
    cat: 'math',
    label: 'คิดเลขเร็ว',
    note: 'โจทย์บวกลบ 20 ข้อ จับเวลาได้',
    sizeId: 'a4p',
    accent: '#f59e0b',
    make: () => {
      const items: Item[] = [
        ...header('คณิตคิดเร็ว', 'บวก ลบ 20 ข้อ', '#fef3c7', '#d97706', 'm-calc'),
        nameLine(170),
        at(makeText({ text: 'เวลา ........ นาที          ได้ ........ / 20 คะแนน', size: 22, align: 'left', bold: true, color: '#b45309' }), 40, 214, 714),
      ];
      for (let i = 0; i < 20; i++) {
        const a = 10 + ((i * 37) % 80);
        const b = 1 + ((i * 13) % 9);
        const op = i % 2 ? '-' : '+';
        items.push(at(makeText({ text: `${i + 1}.   ${a} ${op} ${b} = ________`, size: 28, align: 'left', font: 'prompt' }), i < 10 ? 60 : 430, 280 + (i % 10) * 80, 330));
      }
      // เส้นคั่นคอลัมน์: เส้นแนวนอนยาว 800 หมุน 90 องศารอบจุดกลาง (405, 670)
      items.push({ ...at(makeLine({ stroke: '#fcd34d', sw: 2, dash: 'dash' }), 5, 660, 800, 20), rot: 90 });
      return design('a4p', [page(items, { border: { style: 'stars', color: '#fbbf24', w: 3 } })]);
    },
  },
  {
    id: 'handwriting',
    cat: 'thai',
    label: 'คัดลายมือ',
    note: 'แบบตัวอย่าง + บรรทัด 4 เส้น',
    sizeId: 'a4p',
    accent: '#0891b2',
    make: () => {
      const rows = ['ก ไก่     ข ไข่     ฃ ขวด     ค ควาย', 'ฅ คน     ฆ ระฆัง     ง งู     จ จาน', 'Aa   Bb   Cc   Dd   Ee   Ff', 'โรงเรียน   คุณครู   เพื่อน   ห้องเรียน', 'เขียนชื่อของตัวเอง'];
      const items: Item[] = [...header('ฝึกเขียน', 'คัดลายมือ', '#cffafe', '#0891b2', 'pencil'), nameLine(170)];
      rows.forEach((t, i) => {
        const y = 230 + i * 172;
        items.push(at(makeText({ text: t, size: 32, align: 'left', font: 'sarabun', color: '#0e7490' }), 40, y, 714));
        items.push(at(makeWrite('four', { gap: 36, stroke: '#67e8f9' }), 40, y + 50, 714, 112));
      });
      return design('a4p', [page(items)]);
    },
  },
  {
    id: 'vocab',
    cat: 'eng',
    label: 'ตารางคำศัพท์',
    note: 'คำศัพท์ คำอ่าน ความหมาย 10 คำ',
    sizeId: 'a4p',
    accent: '#7c3aed',
    make: () => {
      const t = makeTable(11, 4, { head: '#ede9fe', size: 22 });
      t.cells[0] = ['ที่', 'คำศัพท์', 'คำอ่าน', 'ความหมาย'];
      for (let i = 1; i <= 10; i++) t.cells[i][0] = String(i);
      return design('a4p', [
        page([...header('Vocabulary', 'คำศัพท์น่ารู้', '#ede9fe', '#7c3aed', 'e-abc'), nameLine(170), at(t, 40, 230, 714, 792)], { border: { style: 'round', color: '#c4b5fd', w: 3 } }),
      ]);
    },
  },
  {
    id: 'true-false',
    cat: 'test',
    label: 'ถูกหรือผิด',
    note: '10 ข้อ ช่องเขียน ถ / ผ',
    sizeId: 'a4p',
    accent: '#16a34a',
    make: () => {
      const items: Item[] = [
        ...header('ใบงาน', 'ถูกหรือผิด', '#dcfce7', '#16a34a', 'check'),
        nameLine(170),
        at(makeText({ text: 'คำชี้แจง: เขียน ถ ในช่องถ้าข้อความถูก เขียน ผ ถ้าข้อความผิด', size: 20, align: 'left', italic: true, color: '#475569' }), 40, 214, 714),
      ];
      for (let i = 0; i < 10; i++) {
        const y = 272 + i * 82;
        items.push(at(makeShape('round', { fill: '#ffffff', stroke: '#16a34a', sw: 2.5 }), 40, y, 56, 50));
        items.push(at(makeText({ text: `${i + 1}.  ข้อความที่ ${i + 1} ...................................................................`, size: 24, align: 'left' }), 112, y + 4, 642));
      }
      return design('a4p', [page(items, { border: { style: 'leaves', color: '#86efac', w: 3 } })]);
    },
  },
  {
    id: 'reading',
    cat: 'thai',
    label: 'อ่านจับใจความ',
    note: 'กล่องเรื่องสั้น + คำถาม 3 ข้อ',
    sizeId: 'a4p',
    accent: '#ea580c',
    make: () => {
      const items: Item[] = [
        ...header('อ่านแล้วตอบ', 'อ่านจับใจความ', '#ffedd5', '#ea580c', 'book'),
        nameLine(170),
        at(makeShape('round', { fill: '#fff7ed', stroke: '#fb923c', sw: 3 }), 40, 222, 714, 330),
        at(makeText({ text: 'เรื่อง ..............................', size: 28, bold: true, color: '#c2410c', font: 'kanit' }), 60, 238, 674),
        at(makeText({ text: 'พิมพ์หรือวางเรื่องที่ให้นักเรียนอ่านตรงนี้ ความยาวประมาณ 5–8 บรรทัด ใช้คำที่เหมาะกับระดับชั้น\nแล้วตั้งคำถามด้านล่างให้นักเรียนตอบจากเรื่องที่อ่าน', size: 22, align: 'left', lh: 1.7 }), 64, 290, 666),
      ];
      ['เรื่องนี้มีใครบ้าง', 'เกิดอะไรขึ้นในเรื่อง', 'นักเรียนได้ข้อคิดอะไรจากเรื่องนี้'].forEach((q, i) => {
        const y = 586 + i * 168;
        items.push(badge(i + 1, '#ea580c', 40, y));
        items.push(at(makeText({ text: q, size: 24, align: 'left' }), 104, y + 2, 650));
        items.push(lines(104, y + 46, 650, 100, 46));
      });
      return design('a4p', [page(items)]);
    },
  },
  {
    id: 'experiment',
    cat: 'sci',
    label: 'บันทึกการทดลอง',
    note: 'ปัญหา สมมติฐาน อุปกรณ์ ผล สรุป',
    sizeId: 'a4p',
    accent: '#0d9488',
    make: () => {
      const t = makeTable(4, 3, { head: '#ccfbf1', size: 20, stroke: '#0f766e' });
      t.cells[0] = ['ครั้งที่', 'สิ่งที่สังเกตเห็น', 'ผลที่ได้'];
      [1, 2, 3].forEach((n) => (t.cells[n][0] = String(n)));
      const c = '#0f766e';
      return design('a4p', [
        page(
          [
            ...header('วิทยาศาสตร์', 'บันทึกการทดลอง', '#ccfbf1', c, 's-beaker'),
            at(makeText({ text: 'กลุ่มที่ ..........  สมาชิก ..............................................................', size: 20, align: 'left' }), 40, 170, 714),
            label('ปัญหา / สิ่งที่อยากรู้', c, 218),
            lines(40, 258, 714, 90),
            label('สมมติฐาน', c, 360),
            lines(40, 400, 714, 46),
            label('อุปกรณ์', c, 458),
            lines(40, 498, 714, 90),
            label('ผลการทดลอง', c, 600),
            at(t, 40, 642, 714, 208),
            label('สรุปผล', c, 868),
            lines(40, 908, 714, 136),
          ],
          { border: { style: 'line', color: '#5eead4', w: 2 } }
        ),
      ]);
    },
  },
  {
    id: 'mindmap',
    cat: 'org',
    label: 'แผนผังความคิด',
    note: 'หัวข้อกลาง + 6 กิ่ง แนวนอน',
    sizeId: 'a4l',
    accent: '#e11d48',
    make: () => {
      const cx = 561;
      const cy = 450;
      const colors = ['#fde68a', '#bbf7d0', '#bfdbfe', '#fbcfe8', '#ddd6fe', '#fed7aa'];
      const nodes = [0, 60, 120, 180, 240, 300].map((deg) => [cx + 400 * Math.cos((deg * Math.PI) / 180), cy + 230 * Math.sin((deg * Math.PI) / 180)]);
      const items: Item[] = [
        at(makeText({ text: 'แผนผังความคิด', size: 44, bold: true, color: '#e11d48', font: 'kanit' }), 261, 30, 600),
        at(makeText({ text: 'ชื่อ ............................................  ชั้น ...........  เลขที่ ...........', size: 20 }), 211, 98, 700),
      ];
      // เส้นวาดก่อน กล่องจะทับปลายเส้นพอดี
      nodes.forEach(([x, y]) => {
        const len = Math.hypot(x - cx, y - cy);
        const ln = at(makeLine({ stroke: '#94a3b8', sw: 3 }), (x + cx) / 2 - len / 2, (y + cy) / 2 - 10, len, 20);
        ln.rot = (Math.atan2(y - cy, x - cx) * 180) / Math.PI;
        items.push(ln);
      });
      nodes.forEach(([x, y], i) => {
        items.push(at(makeShape('round', { fill: colors[i], stroke: '#2a2350', sw: 2 }), x - 110, y - 55, 220, 110));
        items.push(at(makeText({ text: `หัวข้อย่อย ${i + 1}`, size: 24 }), x - 100, y - 20, 200));
      });
      items.push(at(makeShape('circle', { fill: '#ffe4e6', stroke: '#e11d48', sw: 4 }), cx - 140, cy - 85, 280, 170));
      items.push(at(makeText({ text: 'หัวข้อหลัก', size: 34, bold: true, color: '#be123c', font: 'kanit' }), cx - 130, cy - 26, 260));
      return design('a4l', [page(items, { bg: { ...blankBg(), color: '#fffafa' } })]);
    },
  },
  {
    id: 'kwl',
    cat: 'org',
    label: 'ตาราง K-W-L',
    note: 'รู้แล้ว อยากรู้ ได้เรียนรู้',
    sizeId: 'a4l',
    accent: '#2563eb',
    make: () => {
      const cols: [string, string, string][] = [
        ['K  รู้อะไรแล้ว', '#2563eb', '#eff6ff'],
        ['W  อยากรู้อะไร', '#f59e0b', '#fffbeb'],
        ['L  ได้เรียนรู้อะไร', '#16a34a', '#f0fdf4'],
      ];
      const items: Item[] = [
        at(makeText({ text: 'ตาราง K-W-L  เรื่อง ............................', size: 40, bold: true, color: '#1e3a8a', font: 'kanit' }), 111, 34, 900),
        at(makeText({ text: 'ชื่อ ............................................  ชั้น ...........  เลขที่ ...........', size: 20 }), 211, 104, 700),
      ];
      cols.forEach(([t, c, bg], i) => {
        const x = 40 + i * 356;
        items.push(at(makeShape('round', { fill: c, sw: 0 }), x, 160, 330, 70));
        items.push(at(makeText({ text: t, size: 28, bold: true, color: '#ffffff', font: 'kanit' }), x + 10, 174, 310));
        items.push(at(makeShape('round', { fill: bg, stroke: c, sw: 3 }), x, 244, 330, 510));
        items.push(lines(x + 20, 266, 290, 470));
      });
      return design('a4l', [page(items)]);
    },
  },
  {
    id: 'rubric',
    cat: 'test',
    label: 'แบบประเมินผลงาน',
    note: 'เกณฑ์ 4 ระดับ 5 หัวข้อ',
    sizeId: 'a4l',
    accent: '#9333ea',
    make: () => {
      const t = makeTable(6, 6, { head: '#f3e8ff', size: 20, stroke: '#6b21a8' });
      t.cells[0] = ['เกณฑ์การประเมิน', '4 ดีมาก', '3 ดี', '2 พอใช้', '1 ปรับปรุง', 'คะแนน'];
      ['ความถูกต้อง', 'ความสวยงาม', 'ความคิดสร้างสรรค์', 'การทำงานร่วมกัน', 'ส่งงานตรงเวลา'].forEach((r, i) => (t.cells[i + 1][0] = r));
      return design('a4l', [
        page(
          [
            at(makeText({ text: 'แบบประเมินผลงาน', size: 48, bold: true, color: '#7e22ce', font: 'kanit' }), 211, 34, 700),
            at(makeText({ text: 'ชื่อผลงาน ..............................  ผู้จัดทำ ..............................  ชั้น ..........', size: 22 }), 111, 108, 900),
            at(t, 60, 170, 1003, 480),
            at(makeText({ text: 'รวม ........ / 20 คะแนน', size: 26, bold: true, color: '#7e22ce', align: 'left' }), 60, 672, 400),
            at(makeText({ text: 'ลงชื่อ ................................ ผู้ประเมิน', size: 22, align: 'right' }), 603, 676, 460),
            at(makeSticker('st-good'), 980, 24, 110, 110),
          ],
          { border: { style: 'double', color: '#c084fc', w: 3 } }
        ),
      ]);
    },
  },
  {
    id: 'clock-time',
    cat: 'math',
    label: 'ใบงานบอกเวลา',
    note: 'หน้าปัดนาฬิกา 6 เรือน',
    sizeId: 'a4p',
    accent: '#0284c7',
    make: () => {
      const times = [[3, 0], [7, 30], [9, 15], [12, 45], [5, 10], [10, 50]];
      const items: Item[] = [...header('คณิตศาสตร์', 'บอกเวลาจากหน้าปัด', '#e0f2fe', '#0284c7', 'clock'), nameLine(170)];
      times.forEach(([h, m], i) => {
        const x = i % 2 ? 437 : 60;
        const y = 236 + Math.floor(i / 2) * 290;
        items.push(at({ ...makeEdu('clock'), a: h, b: m }, x + 48, y, 200, 200));
        items.push(at(makeText({ text: `${i + 1}.  เวลา ........ นาฬิกา ........ นาที`, size: 22, align: 'left' }), x, y + 214, 300));
      });
      return design('a4p', [page(items, { border: { style: 'dots', color: '#7dd3fc', w: 3 } })]);
    },
  },
  {
    id: 'fraction',
    cat: 'math',
    label: 'ระบายเศษส่วน',
    note: 'วงกลมแบ่งส่วน ระบายตามที่กำหนด',
    sizeId: 'a4p',
    accent: '#db2777',
    make: () => {
      const fr = [[1, 2], [2, 3], [3, 4], [2, 5], [5, 6], [3, 8]];
      const items: Item[] = [
        ...header('คณิตศาสตร์', 'ระบายสีตามเศษส่วน', '#fce7f3', '#db2777', 'm-shapes'),
        nameLine(170),
      ];
      fr.forEach(([n, d], i) => {
        const x = i % 2 ? 437 : 60;
        const y = 236 + Math.floor(i / 2) * 260;
        items.push(at({ ...makeEdu('pie'), a: d, b: 0 }, x, y, 200, 200));
        items.push(at(makeMath(`\\frac{${n}}{${d}}`, 100, 110, 48), x + 220, y + 44));
      });
      items.push(at(makeText({ text: 'ลองคิดดู: เศษส่วนใดมีค่ามากที่สุด ..............................', size: 24, align: 'left', bold: true, color: '#be185d' }), 40, 1030, 714));
      return design('a4p', [page(items, { border: { style: 'scallop', color: '#f9a8d4', w: 3 } })]);
    },
  },
  {
    id: 'star-chart',
    cat: 'class',
    label: 'ตารางสะสมดาว',
    note: 'บันทึกความดีรายวัน 8 คน',
    sizeId: 'a4l',
    accent: '#f59e0b',
    make: () => {
      const t = makeTable(9, 7, { head: '#fef3c7', size: 20, stroke: '#b45309' });
      t.cells[0] = ['ชื่อ', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'รวมดาว'];
      return design('a4l', [
        page(
          [
            at(makeSticker('trophy'), 40, 26, 110, 110),
            at(makeText({ text: 'ตารางสะสมดาว', size: 52, bold: true, color: '#d97706', font: 'kanit' }), 261, 36, 600),
            at(makeText({ text: 'สัปดาห์ที่ ......  ชั้น ..........', size: 22, color: '#78350f' }), 361, 112, 400),
            at(makeShape('star', { fill: '#fde047', stroke: '#d97706', sw: 2 }), 990, 34, 90, 90),
            at(t, 50, 168, 1023, 558),
          ],
          { bg: { ...blankBg(), color: '#fffdf5' }, border: { style: 'stars', color: '#fbbf24', w: 3 } }
        ),
      ]);
    },
  },
  {
    id: 'exit-ticket',
    cat: 'test',
    label: 'บัตรทบทวนท้ายคาบ',
    note: 'A5 สรุปสิ่งที่เรียน + ระดับความเข้าใจ',
    sizeId: 'a5p',
    accent: '#14b8a6',
    make: () =>
      design('a5p', [
        page(
          [
            at(makeShape('round', { fill: '#ccfbf1', sw: 0 }), 30, 30, 499, 96),
            at(makeText({ text: 'บัตรทบทวนท้ายคาบ', size: 32, bold: true, color: '#0f766e', font: 'kanit' }), 40, 56, 479),
            at(makeText({ text: 'ชื่อ ...................................  เลขที่ ........', size: 18, align: 'left' }), 30, 146, 499),
            label('วันนี้ฉันได้เรียนรู้', '#0f766e', 192, 30, 499),
            lines(30, 232, 499, 136),
            label('สิ่งที่ยังสงสัย', '#0f766e', 384, 30, 499),
            lines(30, 424, 499, 92),
            label('ฉันเข้าใจบทเรียนนี้ระดับไหน (ระบายดาว)', '#0f766e', 540, 30, 499),
            ...[0, 1, 2, 3, 4].map((i) => at(makeShape('star', { fill: '#ffffff', stroke: '#f59e0b', sw: 3 }), 52 + i * 96, 594, 72, 72)),
            at(makeText({ text: 'น้อย                                           มาก', size: 18, color: '#64748b' }), 30, 676, 499),
          ],
          { border: { style: 'round', color: '#5eead4', w: 3 } }
        ),
      ]),
  },
];

export const TEMPLATES: Template[] = [...BASE, ...MATH_TEMPLATES, ...THAI_TEMPLATES, ...ENG_TEMPLATES, ...SCI_TEMPLATES, ...ORG_TEMPLATES, ...TEST_TEMPLATES, ...CLASS_TEMPLATES, ...DECOR_TEMPLATES];
