import { blankBg, blankBorder, makeLine, makeShape, makeSticker, makeTable, makeText, makeWrite, SIZES, uid, type Design, type Item, type Page } from '@/lib/studio/doc';

/** แม่แบบเริ่มต้น: กดแล้วได้สื่อพร้อมแก้ต่อ (ทุกชิ้นแก้/ลบได้) */
export interface Template {
  id: string;
  label: string;
  note: string;
  sizeId: string;
  accent: string;
  make: () => Design;
}

const at = <T extends Item>(it: T, x: number, y: number, w?: number, h?: number): T => ({ ...it, x, y, w: w ?? it.w, h: h ?? it.h });
const page = (items: Item[], over: Partial<Page> = {}): Page => ({ id: uid(), bg: blankBg(), border: blankBorder(), items, ...over });
const design = (sizeId: string, pages: Page[]): Design => {
  const s = SIZES.find((x) => x.id === sizeId) ?? SIZES[0];
  return { v: 1, size: { id: s.id, w: s.w, h: s.h }, pages };
};
const nameLine = (y: number, w = 714) =>
  at(makeText({ text: 'ชื่อ ........................................................  ชั้น ...............  เลขที่ ...........', size: 20, align: 'left', font: 'sarabun' }), 40, y, w);

export const TEMPLATES: Template[] = [
  {
    id: 'worksheet',
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
    label: 'กระดาษตาราง',
    note: 'พื้นตารางสำหรับวาดหรือคณิต',
    sizeId: 'a4p',
    accent: '#475569',
    make: () =>
      design('a4p', [
        page([at(makeText({ text: 'แบบฝึกหัด', size: 36, bold: true, font: 'kanit', align: 'left' }), 50, 40, 400), nameLine(100), at(makeWrite('grid', { gap: 30, stroke: '#cbd5e1', sw: 1 }), 47, 160, 700, 900)]),
      ]),
  },
];
