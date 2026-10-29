import { type Item } from '@/lib/studio/doc';
import { badge, blankRows, box, design, header, lines, nameLine, page, table, txt, type Template } from './kit';

export const TEST_TEMPLATES: Template[] = [
  {
    id: 'test-match',
    label: 'แบบทดสอบจับคู่',
    note: 'คอลัมน์ ก/ข 8 ข้อ เขียนตัวอักษรในวงเล็บ',
    cat: 'test',
    sizeId: 'a4p',
    accent: '#0d9488',
    make: () => {
      const items: Item[] = [
        ...header('แบบทดสอบ', 'จับคู่ให้ถูกต้อง', '#ccfbf1', '#0f766e', 'check'),
        nameLine(170),
        txt('นำตัวอักษรหน้าข้อความด้านขวา มาเติมในวงเล็บหน้าข้อความด้านซ้าย', 20, 40, 214, 714, { italic: true, color: '#475569' }),
        txt('ข้อความ', 24, 40, 260, 400, { bold: true, color: '#0f766e' }),
        txt('คำตอบ', 24, 470, 260, 284, { bold: true, color: '#0f766e' }),
      ];
      'กขคงจฉชซ'.split('').forEach((k, i) => {
        const y = 310 + i * 96;
        items.push(txt(`(      )  ${i + 1}. ข้อความที่ ${i + 1} ....................`, 22, 40, y, 410));
        items.push(txt(`${k}.  คำตอบ ......................`, 22, 470, y, 284));
      });
      return design('a4p', [page(items, { border: { style: 'line', color: '#5eead4', w: 2 } })]);
    },
  },
  {
    id: 'test-essay',
    label: 'แบบทดสอบอัตนัย',
    note: '3 ข้อ บรรทัดเขียนตอบ + ช่องคะแนน',
    cat: 'test',
    sizeId: 'a4p',
    accent: '#1d4ed8',
    make: () => {
      const items: Item[] = [...header('แบบทดสอบอัตนัย', 'วิชา .............. เรื่อง ..............', '#dbeafe', '#1d4ed8', 'pencil'), nameLine(170)];
      [0, 1, 2].forEach((i) => {
        const y = 222 + i * 290;
        items.push(badge(i + 1, '#1d4ed8', 40, y));
        items.push(txt(`คำถามข้อที่ ${i + 1} ........................................................`, 24, 104, y + 2, 520));
        items.push(box('#ffffff', '#1d4ed8', 644, y - 4, 110, 48));
        items.push(txt('..... คะแนน', 18, 644, y + 8, 110, { align: 'center' }));
        items.push(lines(104, y + 56, 650, 210, 44));
      });
      items.push(txt('รวม ........ คะแนน', 26, 40, 1086 - 40, 714, { bold: true, align: 'right', color: '#1d4ed8' }));
      return design('a4p', [page(items)]);
    },
  },
  {
    id: 'test-answer-sheet',
    label: 'กระดาษคำตอบ 40 ข้อ',
    note: 'ก ข ค ง สองคอลัมน์',
    cat: 'test',
    sizeId: 'a4p',
    accent: '#475569',
    make: () => {
      const half = (from: number) => [['ข้อ', 'ก', 'ข', 'ค', 'ง'], ...Array.from({ length: 20 }, (_, i) => [String(from + i), '', '', '', ''])];
      return design('a4p', [
        page([
          txt('กระดาษคำตอบ', 40, 40, 30, 714, { bold: true, align: 'center', font: 'kanit' }),
          txt('วิชา ...........................  ชุดที่ ........  คะแนน ........ / 40', 22, 40, 96, 714, { align: 'center' }),
          nameLine(136),
          txt('ทำเครื่องหมาย X ในช่องคำตอบที่ถูกที่สุด', 20, 40, 176, 714, { italic: true, color: '#475569' }),
          table(half(1), 40, 220, 340, 860, { head: '#e2e8f0', size: 20 }),
          table(half(21), 414, 220, 340, 860, { head: '#e2e8f0', size: 20 }),
        ]),
      ]);
    },
  },
  {
    id: 'test-self',
    label: 'แบบประเมินตนเอง',
    note: 'ทำได้ดี / พอทำได้ / ต้องฝึกอีก',
    cat: 'test',
    sizeId: 'a4p',
    accent: '#16a34a',
    make: () =>
      design('a4p', [
        page([
          ...header('ประเมินตนเอง', 'วันนี้ฉันทำได้แค่ไหน', '#dcfce7', '#15803d', 'thumb'),
          nameLine(170),
          table(
            [
              ['รายการ', 'ทำได้ดี', 'พอทำได้', 'ต้องฝึกอีก'],
              ['ฉันตั้งใจฟังครู', '', '', ''],
              ['ฉันทำงานเสร็จตามเวลา', '', '', ''],
              ['ฉันช่วยเหลือเพื่อน', '', '', ''],
              ['ฉันกล้าถามเมื่อไม่เข้าใจ', '', '', ''],
              ['ฉันเก็บของเรียบร้อย', '', '', ''],
              ['ฉันอธิบายสิ่งที่เรียนได้', '', '', ''],
            ],
            40,
            226,
            714,
            560,
            { head: '#dcfce7', size: 22 }
          ),
          txt('สิ่งที่ฉันอยากพัฒนา', 26, 40, 820, 714, { bold: true, color: '#15803d', font: 'kanit' }),
          lines(40, 864, 714, 180),
        ]),
      ]),
  },
  {
    id: 'test-gradebook',
    label: 'แบบบันทึกคะแนน',
    note: 'แนวนอน 15 คน งาน/สอบ/รวม',
    cat: 'test',
    sizeId: 'a4l',
    accent: '#334155',
    make: () =>
      design('a4l', [
        page([
          txt('แบบบันทึกคะแนน  วิชา ....................  ชั้น ..........  ภาคเรียนที่ ......', 30, 40, 36, 1043, { bold: true, align: 'center', font: 'kanit' }),
          table(blankRows(['เลขที่', 'ชื่อ - สกุล', 'งาน 1', 'งาน 2', 'งาน 3', 'สอบ', 'รวม', 'หมายเหตุ'], 15, (i) => String(i + 1)), 40, 110, 1043, 640, { head: '#e2e8f0', size: 18 }),
        ]),
      ]),
  },
  {
    id: 'test-peer',
    label: 'ประเมินการทำงานกลุ่ม',
    note: 'คะแนนสมาชิก 6 คน 3 ด้าน',
    cat: 'test',
    sizeId: 'a4l',
    accent: '#c026d3',
    make: () =>
      design('a4l', [
        page([
          ...header('ประเมินกลุ่ม', 'แบบประเมินการทำงานกลุ่ม', '#fae8ff', '#a21caf', 'thumb', 1123),
          txt('กลุ่มที่ ........  ชื่อผลงาน ..................................................', 22, 40, 166, 1043),
          table(blankRows(['ชื่อสมาชิก', 'ความร่วมมือ (3)', 'ความรับผิดชอบ (3)', 'แสดงความคิดเห็น (3)', 'รวม (9)'], 6), 40, 214, 1043, 440, { head: '#fae8ff', size: 20 }),
          txt('เกณฑ์: 3 = ดีมาก   2 = ดี   1 = ควรปรับปรุง', 22, 40, 690, 1043, { color: '#a21caf', bold: true }),
        ]),
      ]),
  },
];
