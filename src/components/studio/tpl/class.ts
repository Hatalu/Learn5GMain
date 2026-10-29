import { makeShape, type Item } from '@/lib/studio/doc';
import { at, blankRows, box, cutH, cutV, design, header, label, lines, nameLine, page, sticker, table, txt, type Template } from './kit';

const MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
const DAYS5 = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์'];

export const CLASS_TEMPLATES: Template[] = [
  {
    id: 'cls-name-tent',
    label: 'ป้ายชื่อตั้งโต๊ะ',
    note: 'แนวนอน พับครึ่งตั้งได้ อ่านได้ 2 ด้าน',
    cat: 'class',
    sizeId: 'a4l',
    accent: '#2563eb',
    make: () =>
      design('a4l', [
        page(
          [
            // ครึ่งบนกลับหัว เพื่อพับแล้วอ่านได้จากอีกฝั่ง
            { ...txt('ชื่อนักเรียน', 84, 40, 150, 1043, { bold: true, align: 'center', color: '#1d4ed8', font: 'kanit' }), rot: 180 },
            { ...txt('ชั้น ป. ...... / ......   เลขที่ ......', 30, 40, 70, 1043, { align: 'center', color: '#475569' }), rot: 180 },
            cutH(397, 1123),
            txt('พับตามรอยประ', 16, 40, 404, 1043, { align: 'center', color: '#94a3b8' }),
            txt('ชื่อนักเรียน', 84, 40, 500, 1043, { bold: true, align: 'center', color: '#1d4ed8', font: 'kanit' }),
            txt('ชั้น ป. ...... / ......   เลขที่ ......', 30, 40, 640, 1043, { align: 'center', color: '#475569' }),
          ],
          { border: { style: 'round', color: '#93c5fd', w: 4 } }
        ),
      ]),
  },
  {
    id: 'cls-rules',
    label: 'กติกาห้องเรียน',
    note: 'โปสเตอร์ 5 ข้อ ติดหน้าห้อง',
    cat: 'class',
    sizeId: 'a4p',
    accent: '#16a34a',
    make: () => {
      const items: Item[] = [txt('กติกาห้องเรียนของเรา', 52, 40, 50, 714, { bold: true, align: 'center', color: '#15803d', font: 'kanit' }), sticker('st-good', 40, 30, 90), sticker('heartface', 664, 30, 90)];
      ['ตั้งใจฟังเมื่อผู้อื่นพูด', 'ยกมือก่อนพูดทุกครั้ง', 'ช่วยเหลือและแบ่งปันเพื่อน', 'เก็บของให้เรียบร้อย', 'ทำงานให้เสร็จและส่งตรงเวลา'].forEach((r, i) => {
        const y = 200 + i * 178;
        items.push(box(['#dcfce7', '#fef9c3', '#dbeafe', '#fce7f3', '#ede9fe'][i], '#2a2350', 40, y, 714, 150));
        items.push(at(makeShape('circle', { fill: '#15803d', sw: 0 }), 64, y + 31, 88, 88));
        items.push(txt(String(i + 1), 48, 64, y + 40, 88, { bold: true, align: 'center', color: '#ffffff', font: 'kanit' }));
        items.push(txt(r, 36, 180, y + 48, 560, { bold: true, font: 'mitr' }));
      });
      return design('a4p', [page(items, { bg: { color: '#f0fdf4', color2: '#f0fdf4', angle: 180, pattern: 'dots', pcolor: '#bbf7d044' } })]);
    },
  },
  {
    id: 'cls-duty',
    label: 'เวรทำความสะอาด',
    note: 'แนวนอน จันทร์–ศุกร์ วันละ 5 คน',
    cat: 'class',
    sizeId: 'a4l',
    accent: '#0891b2',
    make: () =>
      design('a4l', [
        page([
          ...header('ห้องเรียนสะอาด', 'ตารางเวรทำความสะอาด', '#cffafe', '#0e7490', 'sparkle', 1123),
          txt('ชั้น ป. ...... / ......  ภาคเรียนที่ ......', 24, 40, 166, 1043),
          table([DAYS5, ...Array.from({ length: 5 }, () => DAYS5.map(() => ''))], 40, 214, 1043, 540, { head: '#cffafe', size: 24 }),
        ]),
      ]),
  },
  {
    id: 'cls-birthday',
    label: 'วันเกิดของเพื่อนๆ',
    note: 'แนวนอน 12 เดือน ติดบอร์ด',
    cat: 'class',
    sizeId: 'a4l',
    accent: '#ec4899',
    make: () => {
      const items: Item[] = [txt('สุขสันต์วันเกิดเพื่อนๆ ของเรา', 44, 40, 24, 1043, { bold: true, align: 'center', color: '#db2777', font: 'kanit' }), sticker('balloon', 40, 10, 90), sticker('gift', 993, 10, 90)];
      const colors = ['#fecaca', '#fed7aa', '#fde68a', '#d9f99d', '#bbf7d0', '#a5f3fc', '#bfdbfe', '#c7d2fe', '#ddd6fe', '#f5d0fe', '#fbcfe8', '#fecdd3'];
      MONTHS.forEach((m, i) => {
        const x = 40 + (i % 4) * 263;
        const y = 120 + Math.floor(i / 4) * 222;
        items.push(box('#ffffff', '#2a2350', x, y, 243, 204));
        items.push(box(colors[i], '', x + 8, y + 8, 227, 46));
        items.push(txt(m, 24, x + 8, y + 14, 227, { bold: true, align: 'center', font: 'kanit' }));
        items.push(lines(x + 16, y + 66, 211, 126, 32));
      });
      return design('a4l', [page(items, { bg: { color: '#fff7fb', color2: '#fff7fb', angle: 180, pattern: 'none', pcolor: '#ffffff' } })]);
    },
  },
  {
    id: 'cls-calendar',
    label: 'ปฏิทินกิจกรรม',
    note: 'แนวนอน ตาราง 1 เดือน',
    cat: 'class',
    sizeId: 'a4l',
    accent: '#f97316',
    make: () =>
      design('a4l', [
        page([
          txt('ปฏิทินกิจกรรม  เดือน ....................  พ.ศ. ..........', 40, 40, 30, 1043, { bold: true, align: 'center', color: '#c2410c', font: 'kanit' }),
          table([['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'], ...Array.from({ length: 6 }, () => Array(7).fill(''))], 40, 110, 1043, 640, { head: '#ffedd5', size: 20, align: 'left' }),
        ]),
      ]),
  },
  {
    id: 'cls-letter',
    label: 'จดหมายถึงผู้ปกครอง',
    note: 'พร้อมส่วนตอบกลับฉีกได้',
    cat: 'class',
    sizeId: 'a4p',
    accent: '#334155',
    make: () =>
      design('a4p', [
        page([
          txt('โรงเรียน ......................................................', 26, 40, 50, 714, { bold: true, align: 'center', font: 'kanit' }),
          txt('วันที่ ........ เดือน .................... พ.ศ. ..........', 20, 354, 110, 400, { align: 'right' }),
          txt('เรื่อง  ......................................................................', 22, 40, 160, 714, { bold: true }),
          txt('เรียน  ผู้ปกครองของ ............................................................', 22, 40, 204, 714),
          lines(40, 250, 714, 350),
          txt('ขอแสดงความนับถือ\n\n(.......................................)\nครูประจำชั้น', 20, 434, 620, 320, { align: 'center', lh: 1.5 }),
          cutH(810, 794),
          txt('ส่วนตอบกลับ (ตัดตามรอยประส่งคืนครู)', 22, 40, 830, 714, { bold: true, align: 'center' }),
          txt('ข้าพเจ้า ..................................... ผู้ปกครองของ ......................................\n(   )  รับทราบ          (   )  อนุญาต          (   )  ไม่อนุญาต', 20, 40, 880, 714, { lh: 1.9 }),
          txt('ลงชื่อ ........................................ ผู้ปกครอง', 20, 354, 1010, 400, { align: 'right' }),
        ]),
      ]),
  },
  {
    id: 'cls-homework',
    label: 'บันทึกการบ้าน',
    note: 'วันที่ วิชา งาน กำหนดส่ง ส่งแล้ว',
    cat: 'class',
    sizeId: 'a4p',
    accent: '#7c3aed',
    make: () =>
      design('a4p', [
        page([
          ...header('สมุดการบ้าน', 'บันทึกการบ้านของฉัน', '#ede9fe', '#6d28d9', 'note'),
          nameLine(170),
          table(blankRows(['วันที่', 'วิชา', 'งานที่ได้รับ', 'กำหนดส่ง', 'ส่งแล้ว'], 12), 40, 226, 714, 840, { head: '#ede9fe', size: 20 }),
        ]),
      ]),
  },
  {
    id: 'cls-attendance',
    label: 'ตรวจสอบการมาเรียน',
    note: 'แนวนอน 20 คน จันทร์–ศุกร์',
    cat: 'class',
    sizeId: 'a4l',
    accent: '#0284c7',
    make: () =>
      design('a4l', [
        page([
          txt('แบบตรวจสอบการมาเรียน  ชั้น ..........  สัปดาห์ที่ ......', 30, 40, 30, 1043, { bold: true, align: 'center', font: 'kanit' }),
          table(blankRows(['เลขที่', 'ชื่อ - สกุล', ...DAYS5, 'หมายเหตุ'], 20, (i) => String(i + 1)), 40, 96, 1043, 662, { head: '#e0f2fe', size: 16 }),
        ]),
      ]),
  },
  {
    id: 'cls-seating',
    label: 'ผังที่นั่ง',
    note: 'แนวนอน โต๊ะครู + 20 ที่นั่ง',
    cat: 'class',
    sizeId: 'a4l',
    accent: '#ca8a04',
    make: () => {
      const items: Item[] = [txt('ผังที่นั่งชั้น ป. ...... / ......', 40, 40, 24, 1043, { bold: true, align: 'center', color: '#a16207', font: 'kanit' }), box('#fde68a', '#2a2350', 411, 96, 300, 70), txt('โต๊ะครู / กระดาน', 24, 411, 112, 300, { bold: true, align: 'center' })];
      Array.from({ length: 20 }, (_, i) => {
        const x = 50 + (i % 5) * 210;
        const y = 200 + Math.floor(i / 5) * 148;
        items.push(box('#fffbeb', '#d97706', x, y, 180, 120));
        items.push(txt(`${i + 1}`, 18, x + 8, y + 6, 40, { bold: true, color: '#a16207' }));
        items.push(txt('..................', 22, x, y + 50, 180, { align: 'center' }));
      });
      return design('a4l', [page(items)]);
    },
  },
  {
    id: 'cls-roles',
    label: 'บทบาทในกลุ่ม',
    note: 'การ์ด 4 บทบาท ตัดแยกได้',
    cat: 'class',
    sizeId: 'a4p',
    accent: '#e11d48',
    make: () => {
      const roles: [string, string, string, string][] = [
        ['หัวหน้ากลุ่ม', 'แบ่งงาน ดูแลให้ทุกคนได้ช่วยกัน', 'crown', '#fee2e2'],
        ['เลขานุการ', 'จดบันทึกความคิดของกลุ่ม', 'pencil', '#dbeafe'],
        ['ผู้นำเสนอ', 'เล่าผลงานของกลุ่มให้เพื่อนฟัง', 'e-hello', '#dcfce7'],
        ['ผู้จับเวลา', 'ดูเวลา เตือนให้งานเสร็จทัน', 'clock', '#fef9c3'],
      ];
      const items: Item[] = [cutH(561, 794), cutV(397, 1123)];
      roles.forEach(([t, d, s, c], i) => {
        const x = (i % 2) * 397;
        const y = Math.floor(i / 2) * 561;
        items.push(box(c, '#2a2350', x + 30, y + 30, 337, 501));
        items.push(sticker(s, x + 128, y + 70, 140));
        items.push(txt(t, 40, x + 30, y + 240, 337, { bold: true, align: 'center', font: 'kanit' }));
        items.push(txt(d, 22, x + 50, y + 320, 297, { align: 'center', lh: 1.5 }));
        items.push(label('ชื่อ ....................', '#2a2350', y + 450, x + 50, 297));
      });
      return design('a4p', [page(items)]);
    },
  },
];
