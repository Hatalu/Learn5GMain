import { makeWrite, type Item } from '@/lib/studio/doc';
import { arrow, at, blankRows, box, design, edu, header, label, lineBetween, lines, nameLine, page, sticker, table, txt, type Template } from './kit';

export const SCI_TEMPLATES: Template[] = [
  {
    id: 'sci-life-cycle',
    label: 'วัฏจักรชีวิต',
    note: '4 ขั้น เรียงเป็นวงพร้อมลูกศร',
    cat: 'sci',
    sizeId: 'a4p',
    accent: '#16a34a',
    make: () => {
      const items: Item[] = [...header('วิทยาศาสตร์', 'วัฏจักรชีวิตของ ............', '#dcfce7', '#15803d', 's-sprout'), nameLine(170)];
      const pos: [number, number][] = [
        [267, 230],
        [494, 520],
        [267, 810],
        [40, 520],
      ];
      // ลูกศรวาดก่อนกล่อง: วิ่งจากกลางกล่องหนึ่งไปอีกกล่องแบบตามเข็มนาฬิกา
      [
        [530, 330, 580, 510],
        [600, 730, 530, 820],
        [260, 900, 200, 730],
        [180, 510, 260, 330],
      ].forEach(([a, b, c, d]) => items.push(arrow(a, b, c, d, '#16a34a')));
      pos.forEach(([x, y], i) => {
        items.push(box(['#fef9c3', '#dcfce7', '#dbeafe', '#fce7f3'][i], '#2a2350', x, y, 260, 200));
        items.push(txt(`ขั้นที่ ${i + 1}`, 22, x + 16, y + 10, 228, { bold: true, color: '#15803d' }));
        items.push(at(makeWrite('lines', { gap: 40 }), x + 16, y + 110, 228, 80));
      });
      items.push(txt('วาดภาพในแต่ละขั้น แล้วเขียนอธิบายสั้นๆ', 20, 300, 610, 194, { align: 'center', color: '#475569', italic: true }));
      return design('a4p', [page(items)]);
    },
  },
  {
    id: 'sci-observe',
    label: 'บันทึกการสังเกต',
    note: 'วันที่ อากาศ ภาพวาด สิ่งที่เห็น',
    cat: 'sci',
    sizeId: 'a4p',
    accent: '#0284c7',
    make: () =>
      design('a4p', [
        page([
          ...header('นักวิทยาศาสตร์น้อย', 'บันทึกการสังเกต', '#e0f2fe', '#0369a1', 'magnifier'),
          txt('วันที่ ..................  เวลา ..........  สถานที่ ..............................', 22, 40, 170, 714),
          box('#f0f9ff', '#7dd3fc', 40, 222, 714, 400, 'dash'),
          txt('วาดภาพสิ่งที่สังเกต', 22, 40, 400, 714, { align: 'center', color: '#0284c7' }),
          label('สิ่งที่ฉันสังเกตเห็น', '#0369a1', 640),
          lines(40, 680, 714, 180),
          label('สิ่งที่ฉันสงสัย', '#0369a1', 880),
          lines(40, 920, 714, 136),
        ]),
      ]),
  },
  {
    id: 'sci-classify',
    label: 'จำแนกสิ่งของ',
    note: 'กล่องคำ + 2 กลุ่มให้เขียนแยก',
    cat: 'sci',
    sizeId: 'a4p',
    accent: '#9333ea',
    make: () =>
      design('a4p', [
        page([
          ...header('วิทยาศาสตร์', 'จำแนกสิ่งของ', '#f3e8ff', '#7e22ce', 's-micro'),
          nameLine(170),
          box('#faf5ff', '#c084fc', 40, 222, 714, 140, 'dash'),
          txt('แมว   ก้อนหิน   ต้นมะม่วง   ดินสอ   ปลา   รถยนต์\nเห็ด   ขวดน้ำ   นก   เก้าอี้   ดอกกุหลาบ   ลูกบอล', 24, 60, 246, 674, { align: 'center', lh: 1.8 }),
          box('#dcfce7', '#16a34a', 40, 390, 345, 70),
          txt('สิ่งมีชีวิต', 28, 40, 402, 345, { bold: true, align: 'center', color: '#15803d', font: 'kanit' }),
          box('#ffffff', '#16a34a', 40, 470, 345, 600),
          lines(60, 500, 305, 550),
          box('#fee2e2', '#dc2626', 409, 390, 345, 70),
          txt('สิ่งไม่มีชีวิต', 28, 409, 402, 345, { bold: true, align: 'center', color: '#b91c1c', font: 'kanit' }),
          box('#ffffff', '#dc2626', 409, 470, 345, 600),
          lines(429, 500, 305, 550),
        ]),
      ]),
  },
  {
    id: 'sci-plant',
    label: 'การเจริญเติบโตของพืช',
    note: 'ตารางวัดความสูง + กราฟ',
    cat: 'sci',
    sizeId: 'a4p',
    accent: '#65a30d',
    make: () =>
      design('a4p', [
        page([
          ...header('วิทยาศาสตร์', 'บันทึกการเจริญเติบโตของพืช', '#ecfccb', '#4d7c0f', 's-sprout'),
          txt('ชื่อพืช ............................  วันที่เริ่มปลูก ..................', 22, 40, 170, 714),
          table(blankRows(['วันที่', 'ความสูง (ซม.)', 'สิ่งที่สังเกตเห็น'], 7), 40, 220, 714, 400, { head: '#ecfccb', size: 22 }),
          label('กราฟความสูงของพืช', '#4d7c0f', 650),
          at(makeWrite('grid', { gap: 30, stroke: '#d9f99d', sw: 1 }), 40, 696, 714, 390),
        ]),
      ]),
  },
  {
    id: 'sci-label',
    label: 'ส่วนประกอบ (ติดป้ายชื่อ)',
    note: 'ภาพกลาง + เส้นชี้ 6 ส่วน',
    cat: 'sci',
    sizeId: 'a4p',
    accent: '#0d9488',
    make: () => {
      const items: Item[] = [...header('วิทยาศาสตร์', 'ส่วนประกอบของ ............', '#ccfbf1', '#0f766e', 's-micro'), nameLine(170), box('#f0fdfa', '#5eead4', 237, 240, 320, 480, 'dash'), txt('วาดหรือวางภาพตรงนี้', 22, 237, 460, 320, { align: 'center', color: '#0d9488' })];
      [300, 460, 620].forEach((y) => {
        items.push(txt('...................', 22, 40, y - 16, 170));
        items.push(lineBetween(200, y, 280, y, { stroke: '#0f766e', end: 'dot', sw: 2 }));
        items.push(txt('...................', 22, 600, y - 16, 170));
        items.push(lineBetween(594, y, 514, y, { stroke: '#0f766e', end: 'dot', sw: 2 }));
      });
      items.push(label('หน้าที่ของแต่ละส่วน', '#0f766e', 760));
      items.push(lines(40, 800, 714, 270));
      return design('a4p', [page(items)]);
    },
  },
  {
    id: 'sci-moon',
    label: 'ข้างขึ้นข้างแรม',
    note: 'ดวงจันทร์ 8 ช่วง บันทึกวันที่',
    cat: 'sci',
    sizeId: 'a4p',
    accent: '#4f46e5',
    make: () => {
      const items: Item[] = [...header('วิทยาศาสตร์', 'บันทึกรูปร่างดวงจันทร์', '#e0e7ff', '#4338ca', 'moonface'), nameLine(170)];
      Array.from({ length: 8 }, (_, i) => {
        const x = 40 + (i % 4) * 182;
        const y = 240 + Math.floor(i / 4) * 400;
        items.push(box('#1e1b4b', '', x, y, 166, 230));
        items.push({ ...edu('moon', x + 8, y + 10, 150, 180, i), labels: false });
        items.push(txt('คืนวันที่ ........\nข้างขึ้น / แรม ...... ค่ำ', 20, x, y + 244, 166, { lh: 1.6 }));
      });
      return design('a4p', [page(items)]);
    },
  },
  {
    id: 'sci-temp',
    label: 'อ่านเทอร์โมมิเตอร์',
    note: '3 อัน + ตารางอุณหภูมิ 5 วัน',
    cat: 'sci',
    sizeId: 'a4p',
    accent: '#dc2626',
    make: () => {
      const items: Item[] = [...header('วิทยาศาสตร์', 'อ่านค่าอุณหภูมิ', '#fee2e2', '#b91c1c', 's-thermo'), nameLine(170)];
      [25, 37, 12].forEach((t, i) => {
        const x = 110 + i * 240;
        items.push(edu('thermo', x, 220, 100, 327, t));
        items.push(txt(`${i + 1}.  ........ °C`, 24, x - 40, 560, 180, { align: 'center', bold: true }));
      });
      items.push(table(blankRows(['วัน', 'เช้า (°C)', 'บ่าย (°C)'], 5, (i) => ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์'][i]), 40, 630, 714, 400, { head: '#fee2e2', size: 22 }));
      return design('a4p', [page(items)]);
    },
  },
  {
    id: 'sci-food-chain',
    label: 'โซ่อาหาร',
    note: 'แนวนอน 4 กล่องเชื่อมลูกศร',
    cat: 'sci',
    sizeId: 'a4l',
    accent: '#15803d',
    make: () => {
      const items: Item[] = [txt('โซ่อาหาร', 52, 40, 36, 1043, { bold: true, color: '#15803d', font: 'kanit', align: 'center' }), nameLine(116, 700, 211)];
      const names = ['ผู้ผลิต', 'ผู้บริโภคลำดับที่ 1', 'ผู้บริโภคลำดับที่ 2', 'ผู้บริโภคลำดับที่ 3'];
      names.forEach((n, i) => {
        const x = 40 + i * 268;
        if (i) items.push(arrow(x - 44, 330, x - 6, 330, '#15803d'));
        items.push(box(['#dcfce7', '#fef9c3', '#ffedd5', '#fee2e2'][i], '#2a2350', x, 190, 220, 280));
        items.push(txt(n, 22, x, 202, 220, { bold: true, align: 'center' }));
        items.push(txt('...................', 22, x, 420, 220, { align: 'center' }));
      });
      items.push(label('ถ้าผู้ผลิตหายไป จะเกิดอะไรขึ้น', '#15803d', 510, 40, 1043));
      items.push(lines(40, 556, 1043, 180));
      items.push(sticker('leaf', 990, 30, 90));
      return design('a4l', [page(items)]);
    },
  },
  {
    id: 'sci-weather',
    label: 'บันทึกสภาพอากาศ',
    note: 'แนวนอน 7 วัน',
    cat: 'sci',
    sizeId: 'a4l',
    accent: '#0ea5e9',
    make: () =>
      design('a4l', [
        page([
          ...header('วิทยาศาสตร์', 'บันทึกสภาพอากาศ 1 สัปดาห์', '#e0f2fe', '#0369a1', 'cloudy', 1123),
          sticker('sun', 760, 40, 80),
          nameLine(166, 1043),
          table(blankRows(['วัน', 'สภาพอากาศ (วาด)', 'อุณหภูมิ', 'ลม', 'หมายเหตุ'], 7, (i) => ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'][i]), 40, 214, 1043, 540, { head: '#e0f2fe', size: 20 }),
        ]),
      ]),
  },
];
