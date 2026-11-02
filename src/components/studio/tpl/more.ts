import { makeShape, makeText, makeWrite, type Item } from '@/lib/studio/doc';
import { arrow, at, badge, blankRows, box, cutH, cutV, design, edu, header, label, lineBetween, lines, nameLine, page, sticker, table, txt, type Template, type TemplateCat } from './kit';

/** แม่แบบชุดที่ 2 (50 แบบ) ครบทุกหมวด */

/** ใบงาน A4 ทั่วไป: หัว + ชื่อ + เนื้อ */
const sheet = (id: string, cat: TemplateCat, lbl: string, note: string, accent: string, tag: string, title: string, fill: string, st: string, body: () => Item[], pageOver = {}): Template => ({
  id,
  cat,
  label: lbl,
  note,
  sizeId: 'a4p',
  accent,
  make: () => design('a4p', [page([...header(tag, title, fill, accent, st), nameLine(170), ...body()], pageOver)]),
});

/** ข้อคำถาม + บรรทัดตอบ เรียงลงมา */
const qa = (qs: string[], y0: number, step: number, color: string, gap = 40): Item[] =>
  qs.flatMap((q, i) => [badge(i + 1, color, 40, y0 + i * step), txt(q, 22, 104, y0 + i * step + 4, 650), lines(104, y0 + i * step + 46, 650, step - 70, gap)]);

/* ================================================================== คณิตศาสตร์ */
const MATH: Template[] = [
  {
    id: 'x-times-table',
    cat: 'math',
    label: 'ตารางสูตรคูณ 2-12',
    note: 'ตาราง 12x12 เว้นให้เติมคำตอบ',
    sizeId: 'a4p',
    accent: '#7c3aed',
    make: () => {
      const n = [...Array(12)].map((_, i) => String(i + 1));
      const rows = [['x', ...n], ...n.map((r) => [r, ...n.map(() => '')])];
      return design('a4p', [page([...header('คณิตศาสตร์', 'ตารางสูตรคูณ', '#ede9fe', '#7c3aed', 'm-times'), nameLine(170), table(rows, 40, 230, 714, 760), txt('เติมผลคูณในช่องว่าง ช่องไหนทำได้แล้วระบายสีให้สวย', 20, 40, 1010, 714, { align: 'center', color: '#6d28d9', italic: true })])]);
    },
  },
  {
    id: 'x-clocks',
    cat: 'math',
    label: 'อ่านนาฬิกา 6 เรือน',
    note: 'หน้าปัด 6 เรือน เขียนเวลาใต้ภาพ',
    sizeId: 'a4p',
    accent: '#f59e0b',
    make: () => {
      const t: [number, number][] = [[3, 0], [7, 30], [10, 15], [1, 45], [6, 5], [11, 50]];
      const items: Item[] = [...header('คณิตศาสตร์', 'นาฬิกาบอกเวลาเท่าไร', '#fef3c7', '#d97706', 'clock'), nameLine(170)];
      t.forEach(([h, m], i) => {
        const x = 60 + (i % 2) * 370;
        const y = 230 + Math.floor(i / 2) * 290;
        items.push(edu('clock', x + 50, y, 220, 220, h, m), txt('......... นาฬิกา ......... นาที', 20, x, y + 232, 320, { align: 'center' }));
      });
      return design('a4p', [page(items)]);
    },
  },
  {
    id: 'x-compare',
    cat: 'math',
    label: 'เปรียบเทียบจำนวน',
    note: 'เติม > < = ใน 15 ข้อ',
    sizeId: 'a4p',
    accent: '#0ea5e9',
    make: () => {
      const p: [number, number][] = [[25, 52], [108, 98], [340, 340], [999, 1000], [47, 74], [560, 506], [12, 21], [700, 699], [85, 85], [1203, 1230], [66, 61], [430, 403], [9, 19], [250, 205], [77, 77]];
      return design('a4p', [
        page([
          ...header('คณิตศาสตร์', 'มากกว่า น้อยกว่า เท่ากับ', '#e0f2fe', '#0284c7', 'm-equal'),
          nameLine(170),
          txt('เติมเครื่องหมาย  >   <   =  ลงในวงกลม', 22, 40, 220, 714, { bold: true, color: '#0369a1' }),
          ...p.flatMap(([a, b], i) => {
            const x = 40 + (i % 3) * 245;
            const y = 290 + Math.floor(i / 3) * 150;
            return [txt(String(a), 32, x, y, 90, { align: 'right', font: 'prompt' }), at(makeShape('circle', { fill: '#ffffff', stroke: '#0ea5e9', sw: 3 }), x + 100, y - 6, 60, 60), txt(String(b), 32, x + 170, y, 90, { font: 'prompt' })];
          }),
        ]),
      ]);
    },
  },
  {
    id: 'x-pattern',
    cat: 'math',
    label: 'แบบรูปและความสัมพันธ์',
    note: 'ต่อแบบรูปตัวเลขและรูปทรง',
    sizeId: 'a4p',
    accent: '#ec4899',
    make: () => {
      const seq = ['2, 4, 6, 8, ___, ___', '5, 10, 15, ___, ___, 30', '1, 4, 7, 10, ___, ___', '50, 45, 40, ___, ___, 25', '1, 2, 4, 8, ___, ___', '3, 6, 9, ___, 15, ___'];
      const items: Item[] = [...header('คณิตศาสตร์', 'แบบรูปและความสัมพันธ์', '#fce7f3', '#db2777', 'm-123'), nameLine(170), label('ตอนที่ 1 เติมจำนวนที่หายไป', '#db2777', 220)];
      seq.forEach((s, i) => items.push(badge(i + 1, '#ec4899', 40, 270 + i * 66), txt(s, 28, 104, 272 + i * 66, 650, { font: 'prompt' })));
      items.push(label('ตอนที่ 2 วาดรูปถัดไป', '#db2777', 680));
      const shapes = ['circle', 'star', 'rect', 'circle', 'star'];
      shapes.forEach((s, i) => items.push(at(makeShape(s, { fill: ['#fbcfe8', '#fde68a', '#bae6fd'][i % 3], stroke: '#2a2350', sw: 2.5 }), 60 + i * 120, 740, 90, 90)));
      items.push(box('#ffffff', '#ec4899', 660, 730, 100, 110, 'dash'));
      items.push(label('อธิบายกฎของแบบรูป', '#db2777', 880), lines(40, 920, 714, 140));
      return design('a4p', [page(items)]);
    },
  },
  {
    id: 'x-bargraph',
    cat: 'math',
    label: 'สร้างแผนภูมิแท่ง',
    note: 'ตารางข้อมูล + ตารางกราฟเปล่า',
    sizeId: 'a4p',
    accent: '#16a34a',
    make: () =>
      design('a4p', [
        page([
          ...header('คณิตศาสตร์', 'ผลไม้ที่เพื่อนชอบ', '#dcfce7', '#15803d', 'm-chart'),
          nameLine(170),
          table([['ผลไม้', 'กล้วย', 'มะม่วง', 'ส้ม', 'แตงโม', 'องุ่น'], ['จำนวนคน', '6', '9', '4', '7', '3']], 40, 220, 714, 110),
          txt('วาดแผนภูมิแท่งจากตาราง (1 ช่อง = 1 คน)', 22, 40, 350, 714, { bold: true, color: '#15803d' }),
          at(makeWrite('grid', { gap: 40, stroke: '#86efac' }), 100, 400, 640, 400),
          lineBetween(100, 400, 100, 800, { stroke: '#2a2350', sw: 3 }),
          lineBetween(100, 800, 740, 800, { stroke: '#2a2350', sw: 3 }),
          ...qa(['ผลไม้ที่คนชอบมากที่สุดคือ', 'ชอบมะม่วงมากกว่าชอบส้มกี่คน'], 830, 130, '#16a34a'),
        ]),
      ]),
  },
  {
    id: 'x-balance',
    cat: 'math',
    label: 'ตาชั่งหาค่าที่หายไป',
    note: 'สมการบนตาชั่ง 4 ข้อ',
    sizeId: 'a4p',
    accent: '#d97706',
    make: () => {
      const eq: [number, number, string][] = [[12, 12, '7 + ___ = 12'], [20, 20, '___ - 5 = 15'], [18, 18, '3 x ___ = 18'], [9, 9, '___ ÷ 4 = 9']];
      const items: Item[] = [...header('คณิตศาสตร์', 'ทำให้ตาชั่งเท่ากัน', '#fef3c7', '#b45309', 'm-equal'), nameLine(170)];
      eq.forEach(([a, b, s], i) => {
        const x = 40 + (i % 2) * 370;
        const y = 230 + Math.floor(i / 2) * 420;
        items.push(box('#fffbeb', '#f59e0b', x, y, 345, 390), edu('balance', x + 22, y + 20, 300, 186, a, b), txt(s, 32, x, y + 230, 345, { align: 'center', font: 'prompt', bold: true }), txt('ตัวที่หายไป = ............', 28, x, y + 300, 345, { align: 'center' }));
      });
      return design('a4p', [page(items)]);
    },
  },
  {
    id: 'x-shop',
    cat: 'math',
    label: 'ร้านค้าเงินทอน',
    note: 'ราคาสินค้า ซื้อ จ่าย ทอน',
    sizeId: 'a4p',
    accent: '#0d9488',
    make: () => {
      const goods: [string, string, number][] = [['apple', 'แอปเปิล', 12], ['book', 'สมุด', 25], ['pencil', 'ดินสอ', 8], ['balloon', 'ลูกโป่ง', 15], ['gift', 'กล่องของขวัญ', 40], ['ruler', 'ไม้บรรทัด', 10]];
      const items: Item[] = [...header('คณิตศาสตร์', 'ร้านค้าแสนสนุก', '#ccfbf1', '#0f766e', 'm-calc'), nameLine(170)];
      goods.forEach(([st, n, p], i) => {
        const x = 40 + (i % 3) * 245;
        const y = 220 + Math.floor(i / 3) * 190;
        items.push(box('#f0fdfa', '#14b8a6', x, y, 225, 170), sticker(st, x + 72, y + 8, 80), txt(`${n}  ${p} บาท`, 22, x, y + 112, 225, { align: 'center', bold: true }));
      });
      items.push(table([['ซื้ออะไรบ้าง', 'ราคารวม', 'จ่ายเงิน', 'ได้เงินทอน'], ['', '', '50 บาท', ''], ['', '', '100 บาท', ''], ['', '', '20 บาท', '']], 40, 620, 714, 300));
      items.push(txt('เลือกซื้อของเอง แล้วคิดราคารวมและเงินทอน', 20, 40, 950, 714, { align: 'center', color: '#0f766e', italic: true }));
      return design('a4p', [page(items)]);
    },
  },
  {
    id: 'x-long-division',
    cat: 'math',
    label: 'หารยาว',
    note: '6 ข้อ มีพื้นที่ทดเลขแบบตาราง',
    sizeId: 'a4p',
    accent: '#4f46e5',
    make: () => {
      const p = ['156 ÷ 4', '252 ÷ 6', '738 ÷ 9', '415 ÷ 5', '984 ÷ 8', '1,236 ÷ 3'];
      const items: Item[] = [...header('คณิตศาสตร์', 'หารยาว', '#e0e7ff', '#4338ca', 'm-divide'), nameLine(170)];
      p.forEach((s, i) => {
        const x = 40 + (i % 2) * 370;
        const y = 220 + Math.floor(i / 2) * 290;
        items.push(badge(i + 1, '#4f46e5', x, y), txt(s, 30, x + 62, y + 2, 280, { font: 'prompt', bold: true }), at(makeWrite('grid', { gap: 30 }), x, y + 60, 340, 210));
      });
      return design('a4p', [page(items)]);
    },
  },
];

/* ================================================================== ภาษาไทย */
const THAI: Template[] = [
  sheet('x-th-class', 'thai', 'อักษรสูง กลาง ต่ำ', 'ตาราง 3 หมู่ ให้คัดแยกพยัญชนะ', '#c2410c', 'ภาษาไทย', 'ไตรยางศ์ อักษร 3 หมู่', '#ffedd5', 't-kokai', () => [
    box('#fff7ed', '#fb923c', 40, 220, 714, 120, 'dash'),
    txt('ก  ข  ค  จ  ฉ  ช  ด  ต  ถ  ท  บ  ป  ผ  พ  ฝ  ฟ  ม  ย  ร  ล  ว  ส  ห  อ  ฮ', 26, 60, 252, 674, { align: 'center', font: 'sarabun' }),
    table(blankRows(['อักษรสูง', 'อักษรกลาง', 'อักษรต่ำ'], 8), 40, 370, 714, 600),
    txt('จำง่าย: อักษรกลาง "ไก่จิกเด็กตายบนปากโอ่ง"', 22, 40, 1000, 714, { align: 'center', color: '#c2410c', bold: true }),
  ]),
  sheet('x-th-final', 'thai', 'มาตราตัวสะกด', '8 มาตรา เขียนคำตัวอย่าง', '#b91c1c', 'ภาษาไทย', 'มาตราตัวสะกด 8 มาตรา', '#fee2e2', 't-book', () => [
    table([['มาตรา', 'ตัวสะกด', 'คำตัวอย่าง'], ['แม่กก', 'ก ข ค ฆ', ''], ['แม่กด', 'ด จ ช ซ ฎ ฏ ฐ ฑ ฒ ต ถ ท ธ ศ ษ ส', ''], ['แม่กบ', 'บ ป พ ฟ ภ', ''], ['แม่กง', 'ง', ''], ['แม่กน', 'น ญ ณ ร ล ฬ', ''], ['แม่กม', 'ม', ''], ['แม่เกย', 'ย', ''], ['แม่เกอว', 'ว', '']], 40, 220, 714, 700),
    txt('เขียนคำที่มีตัวสะกดในมาตรานั้นอย่างน้อย 3 คำ', 20, 40, 950, 714, { align: 'center', italic: true, color: '#b91c1c' }),
  ]),
  sheet('x-th-cluster', 'thai', 'คำควบกล้ำ', 'แท้ / ไม่แท้ แยกลงตาราง', '#7c3aed', 'ภาษาไทย', 'คำควบกล้ำ', '#ede9fe', 't-vowel', () => [
    box('#faf5ff', '#a78bfa', 40, 220, 714, 110, 'dash'),
    txt('กลอง  ทราย  ปลา  จริง  ขวด  สร้าง  ครู  ไซร้  พริก  เศร้า', 26, 60, 252, 674, { align: 'center' }),
    box('#dcfce7', '#16a34a', 40, 360, 345, 60),
    txt('ควบแท้', 26, 40, 370, 345, { align: 'center', bold: true, color: '#15803d' }),
    lines(60, 440, 305, 360),
    box('#fee2e2', '#dc2626', 409, 360, 345, 60),
    txt('ควบไม่แท้', 26, 409, 370, 345, { align: 'center', bold: true, color: '#b91c1c' }),
    lines(429, 440, 305, 360),
    label('แต่งประโยคจากคำควบกล้ำ 1 ประโยค', '#7c3aed', 840),
    lines(40, 880, 714, 140),
  ]),
  sheet('x-th-letter', 'thai', 'เขียนจดหมาย', 'รูปแบบจดหมายส่วนตัว', '#0369a1', 'ภาษาไทย', 'จดหมายถึงเพื่อน', '#e0f2fe', 'note', () => [
    txt('ที่อยู่ผู้เขียน .......................................\n.................................................', 20, 420, 220, 334, { lh: 1.7 }),
    txt('วันที่ ...... เดือน .................. พ.ศ. ..........', 20, 300, 300, 454, { align: 'right' }),
    txt('คำขึ้นต้น ...................................', 22, 40, 360, 714),
    lines(40, 410, 714, 460),
    txt('คำลงท้าย ...................................\nลงชื่อ .......................................', 22, 420, 900, 334, { lh: 1.8 }),
  ]),
  sheet('x-th-idiom', 'thai', 'สำนวน สุภาษิต', 'ความหมาย + วาดภาพประกอบ', '#a16207', 'ภาษาไทย', 'สำนวนไทยน่ารู้', '#fef9c3', 'bulb', () =>
    ['น้ำขึ้นให้รีบตัก', 'ช้าๆ ได้พร้าเล่มงาม', 'กระต่ายตื่นตูม'].flatMap((s, i) => {
      const y = 220 + i * 290;
      return [box('#fefce8', '#eab308', 40, y, 714, 270), txt(s, 30, 60, y + 14, 420, { bold: true, font: 'kanit', color: '#a16207' }), txt('ความหมาย', 20, 60, y + 70, 400, { color: '#64748b' }), lines(60, y + 104, 400, 150), box('#ffffff', '#facc15', 490, y + 20, 244, 230, 'dash'), txt('วาดภาพ', 18, 490, y + 120, 244, { align: 'center', color: '#ca8a04' })];
    })
  ),
];

/* ================================================================== ภาษาอังกฤษ */
const ENG: Template[] = [
  sheet('x-en-phonics', 'eng', 'Phonics Sounds', 'เสียงต้นคำ วาดภาพ + เขียนคำ', '#2563eb', 'English', 'Beginning Sounds', '#dbeafe', 'e-abc', () =>
    ['b', 'c', 'd', 'f', 'm', 's'].flatMap((l, i) => {
      const x = 40 + (i % 2) * 370;
      const y = 220 + Math.floor(i / 2) * 290;
      return [box('#eff6ff', '#60a5fa', x, y, 345, 270), txt(`${l.toUpperCase()}${l}`, 54, x + 14, y + 6, 130, { bold: true, font: 'chakra', color: '#1d4ed8' }), box('#ffffff', '#93c5fd', x + 160, y + 14, 170, 150, 'dash'), at(makeWrite('four', { gap: 56 }), x + 14, y + 180, 316, 70)];
    })
  ),
  sheet('x-en-sight', 'eng', 'Sight Words', 'อ่าน คัด และแต่งประโยค', '#059669', 'English', 'Sight Words', '#d1fae5', 'e-dict', () =>
    ['the', 'and', 'see', 'like', 'can'].flatMap((w, i) => {
      const y = 220 + i * 170;
      return [box('#ecfdf5', '#34d399', 40, y, 160, 150), txt(w, 40, 40, y + 44, 160, { align: 'center', bold: true, font: 'chakra', color: '#047857' }), at(makeWrite('four', { gap: 50 }), 220, y + 4, 534, 60), txt('Sentence: ......................................................', 20, 220, y + 90, 534)];
    })
  ),
  sheet('x-en-sentence', 'eng', 'Sentence Builder', 'Who + Does + What + Where', '#9333ea', 'English', 'Build a Sentence', '#f3e8ff', 'e-qa', () => [
    ...['Who?', 'Does what?', 'What?', 'Where?'].flatMap((h, i) => [box(['#fce7f3', '#dbeafe', '#dcfce7', '#fef9c3'][i], '#2a2350', 40 + i * 182, 220, 168, 70), txt(h, 22, 40 + i * 182, 238, 168, { align: 'center', bold: true })]),
    ...[0, 1, 2, 3].flatMap((i) => [box('#ffffff', '#c4b5fd', 40 + i * 182, 300, 168, 260, 'dash'), lines(52 + i * 182, 330, 144, 210)]),
    label('Write 3 sentences', '#9333ea', 600),
    ...[0, 1, 2].flatMap((i) => [badge(i + 1, '#9333ea', 40, 650 + i * 130), at(makeWrite('four', { gap: 56 }), 104, 646 + i * 130, 650, 90)]),
  ]),
  sheet('x-en-opposite', 'eng', 'Opposites', 'คำตรงข้าม จับคู่ + วาดภาพ', '#e11d48', 'English', 'Opposites', '#ffe4e6', 'e-goodjob', () =>
    [['big', 'small'], ['hot', 'cold'], ['happy', 'sad'], ['up', 'down'], ['fast', 'slow']].flatMap(([a, b], i) => {
      const y = 220 + i * 170;
      return [box('#fff1f2', '#fb7185', 40, y, 340, 150), txt(a, 32, 40, y + 8, 340, { align: 'center', bold: true, font: 'chakra' }), box('#ffffff', '#fda4af', 140, y + 56, 140, 84, 'dash'), arrow(390, y + 75, 404, y + 75, '#e11d48'), box('#fff1f2', '#fb7185', 414, y, 340, 150), txt(b, 32, 414, y + 8, 340, { align: 'center', bold: true, font: 'chakra' }), box('#ffffff', '#fda4af', 514, y + 56, 140, 84, 'dash')];
    })
  ),
  sheet('x-en-colors', 'eng', 'Colors & Shapes', 'ระบายสีตามคำสั่ง', '#ea580c', 'English', 'Colors and Shapes', '#ffedd5', 'rainbow', () => [
    ...[['circle', 'red circle'], ['star', 'yellow star'], ['rect', 'blue square'], ['cloud', 'white cloud'], ['burst', 'orange sun'], ['round', 'green rectangle']].flatMap(([s, t], i) => {
      const x = 40 + (i % 3) * 245;
      const y = 230 + Math.floor(i / 3) * 300;
      return [at(makeShape(s, { fill: '#ffffff', stroke: '#2a2350', sw: 3 }), x + 42, y, 140, s === 'round' ? 100 : 140), txt(`Color the ${t}.`, 20, x, y + 170, 225, { align: 'center', font: 'chakra' })];
    }),
    label('My favorite color is ...', '#ea580c', 860),
    at(makeWrite('four', { gap: 56 }), 40, 900, 714, 120),
  ]),
];

/* ================================================================== วิทยาศาสตร์ */
const SCI: Template[] = [
  sheet('x-sci-matter', 'sci', 'สถานะของสสาร', 'ของแข็ง ของเหลว แก๊ส', '#0891b2', 'วิทยาศาสตร์', 'สถานะของสสาร', '#cffafe', 's-beaker', () => [
    ...['ของแข็ง', 'ของเหลว', 'แก๊ส'].flatMap((h, i) => [box(['#e0f2fe', '#ccfbf1', '#f1f5f9'][i], '#2a2350', 40 + i * 245, 220, 225, 70), txt(h, 26, 40 + i * 245, 236, 225, { align: 'center', bold: true, font: 'kanit' }), box('#ffffff', '#67e8f9', 40 + i * 245, 300, 225, 220, 'dash'), txt('วาดการเรียงอนุภาค', 18, 40 + i * 245, 400, 225, { align: 'center', color: '#0891b2' }), lines(52 + i * 245, 540, 200, 150)]),
    label('ตัวอย่างสิ่งของในชีวิตประจำวัน', '#0891b2', 730),
    table(blankRows(['ของแข็ง', 'ของเหลว', 'แก๊ส'], 4), 40, 776, 714, 280),
  ]),
  sheet('x-sci-circuit', 'sci', 'วงจรไฟฟ้าอย่างง่าย', 'วาดวงจร + สัญลักษณ์', '#ca8a04', 'วิทยาศาสตร์', 'วงจรไฟฟ้าอย่างง่าย', '#fef9c3', 'bulb', () => [
    box('#fffbeb', '#f59e0b', 40, 220, 714, 380, 'dash'),
    txt('วาดวงจรไฟฟ้าที่ทำให้หลอดไฟสว่าง', 22, 40, 390, 714, { align: 'center', color: '#b45309' }),
    table([['ส่วนประกอบ', 'หน้าที่'], ['ถ่านไฟฉาย', ''], ['สายไฟ', ''], ['หลอดไฟ', ''], ['สวิตช์', '']], 40, 630, 714, 280),
    txt('ถ้าเปิดสวิตช์ หลอดไฟจะ ....................................................', 22, 40, 940, 714),
  ]),
  {
    id: 'x-sci-solar',
    cat: 'sci',
    label: 'ระบบสุริยะ',
    note: 'วงโคจร 8 ดาวเคราะห์ ติดป้ายชื่อ',
    sizeId: 'a4l',
    accent: '#4338ca',
    make: () => {
      const items: Item[] = [at(makeText({ text: 'ระบบสุริยะของเรา', size: 40, bold: true, font: 'kanit', color: '#ffffff' }), 40, 30, 1043), at(makeShape('circle', { fill: '#fbbf24', stroke: '#f59e0b', sw: 4 }), 20, 297, 200, 200)];
      [1, 2, 3, 4, 5, 6, 7, 8].forEach((k, i) => {
        const x = 235 + i * 106;
        const r = [26, 34, 36, 30, 66, 58, 44, 42][i];
        items.push(at(makeShape('circle', { fill: ['#a8a29e', '#fcd34d', '#60a5fa', '#f87171', '#fdba74', '#fde68a', '#67e8f9', '#818cf8'][i], stroke: '#ffffff', sw: 2 }), x + 40 - r / 2, 397 - r / 2, r, r), txt(`${k}. ..........`, 16, x, 470, 100, { align: 'center', color: '#e0e7ff' }));
      });
      items.push(txt('เขียนชื่อดาวเคราะห์ใต้ภาพ เรียงจากใกล้ดวงอาทิตย์ที่สุด', 22, 40, 700, 1043, { align: 'center', color: '#c7d2fe' }));
      return design('a4l', [page(items, { bg: { color: '#1e1b4b', color2: '#312e81', angle: 180, pattern: 'dots', pcolor: '#ffffff40' } })]);
    },
  },
  sheet('x-sci-water', 'sci', 'วัฏจักรน้ำ', 'ระเหย ควบแน่น หยาดน้ำฟ้า', '#0284c7', 'วิทยาศาสตร์', 'วัฏจักรน้ำ', '#e0f2fe', 'water', () => [
    sticker('sun', 600, 230, 120),
    at(makeShape('cloud', { fill: '#ffffff', stroke: '#2a2350', sw: 3 }), 280, 230, 240, 130),
    at(makeShape('round', { fill: '#7dd3fc', sw: 0 }), 40, 700, 714, 160),
    arrow(150, 690, 280, 380, '#0284c7'),
    arrow(520, 300, 600, 300, '#0284c7'),
    arrow(640, 400, 640, 690, '#0284c7'),
    ...[[90, 500], [420, 390], [590, 520]].flatMap(([x, y], i) => [box('#ffffff', '#38bdf8', x, y, 170, 60), txt(`${i + 1}. ...........`, 20, x, y + 14, 170, { align: 'center' })]),
    label('อธิบายวัฏจักรน้ำด้วยคำพูดของตัวเอง', '#0284c7', 880),
    lines(40, 920, 714, 140),
  ]),
  sheet('x-sci-method', 'sci', 'ทักษะกระบวนการ', 'ปัญหา สมมติฐาน ทดลอง สรุป', '#be185d', 'วิทยาศาสตร์', 'นักวิทยาศาสตร์ตัวน้อย', '#fce7f3', 's-tube', () =>
    ['ปัญหา: ฉันอยากรู้ว่า...', 'สมมติฐาน: ฉันคิดว่า...', 'วิธีทดลอง', 'ผลการทดลอง', 'สรุปผล'].flatMap((h, i) => [label(h, '#be185d', 220 + i * 170), box('#fdf2f8', '#f9a8d4', 40, 260 + i * 170, 714, 116), lines(60, 270 + i * 170, 674, 96)])
  ),
  sheet('x-sci-magnet', 'sci', 'แม่เหล็กดูดอะไรได้บ้าง', 'ทำนาย + ทดลองจริง', '#dc2626', 'วิทยาศาสตร์', 'แม่เหล็กดูดอะไรได้บ้าง', '#fee2e2', 's-magnet', () => [
    edu('magnet', 237, 220, 320, 110, 1),
    table([['สิ่งของ', 'ทำนาย (ดูด / ไม่ดูด)', 'ผลจริง'], ['คลิปหนีบกระดาษ', '', ''], ['ยางลบ', '', ''], ['ช้อนเหล็ก', '', ''], ['ดินสอไม้', '', ''], ['เหรียญ', '', ''], ['ตะปู', '', ''], ['', '', '']], 40, 360, 714, 520),
    txt('สิ่งที่แม่เหล็กดูดได้ส่วนใหญ่ทำจาก ................................', 22, 40, 910, 714),
  ]),
];

/* ================================================================== ใบงานทั่วไป */
const SHEET: Template[] = [
  sheet('x-diary', 'sheet', 'บันทึกประจำวัน', 'วันนี้ฉัน... อารมณ์ วาดภาพ', '#f97316', 'บันทึกของฉัน', 'วันนี้ของฉัน', '#ffedd5', 'heartface', () => [
    txt('วัน ............ ที่ ...... เดือน .................. ', 22, 40, 220, 714),
    txt('วันนี้ฉันรู้สึก (วงกลม)', 22, 40, 270, 714, { bold: true, color: '#c2410c' }),
    ...[0, 1, 2, 3].map((i) => sticker(['heartface', 'sun', 'cloudy', 'sparkle'][i], 300 + i * 110, 254, 80)),
    box('#fff7ed', '#fdba74', 40, 360, 714, 330, 'dash'),
    txt('วาดภาพเรื่องที่ประทับใจ', 22, 40, 510, 714, { align: 'center', color: '#ea580c' }),
    lines(40, 720, 714, 330),
  ]),
  sheet('x-coloring', 'sheet', 'ใบงานวาดภาพระบายสี', 'กรอบวาดใหญ่ + คำสั่ง', '#7c3aed', 'ศิลปะ', 'วาดภาพระบายสี', '#ede9fe', 'rainbow', () => [
    txt('หัวข้อ: ..............................................', 24, 40, 220, 714, { bold: true }),
    box('#ffffff', '#8b5cf6', 40, 270, 714, 680),
    txt('ภาพนี้คือ ....................................................', 22, 40, 980, 714),
  ], { border: { style: 'stars', color: '#c4b5fd', w: 4 } }),
  sheet('x-group', 'sheet', 'ใบงานกลุ่ม', 'สมาชิก บทบาท ผลงาน', '#0d9488', 'งานกลุ่ม', 'ใบงานกลุ่ม', '#ccfbf1', 'blocks', () => [
    table([['เลขที่', 'ชื่อสมาชิก', 'หน้าที่'], ...[1, 2, 3, 4, 5].map((n) => [String(n), '', ''])], 40, 220, 714, 300),
    label('ภารกิจของกลุ่ม', '#0d9488', 550),
    lines(40, 590, 714, 120),
    label('ผลงาน / คำตอบของกลุ่ม', '#0d9488', 730),
    box('#f0fdfa', '#5eead4', 40, 770, 714, 290, 'dash'),
  ]),
  sheet('x-summary', 'sheet', 'สรุปบทเรียน 1 หน้า', 'คำสำคัญ ภาพ สรุป คำถาม', '#2563eb', 'สรุปบทเรียน', 'เรื่อง ..........................', '#dbeafe', 'book', () => [
    box('#eff6ff', '#60a5fa', 40, 220, 345, 380),
    txt('คำสำคัญ', 24, 60, 234, 305, { bold: true, color: '#1d4ed8' }),
    lines(60, 280, 305, 300),
    box('#ffffff', '#60a5fa', 409, 220, 345, 380, 'dash'),
    txt('ภาพช่วยจำ', 24, 429, 234, 305, { bold: true, color: '#1d4ed8' }),
    label('สรุปด้วยคำพูดของฉัน', '#1d4ed8', 630),
    lines(40, 670, 714, 200),
    label('คำถามที่ยังสงสัย', '#1d4ed8', 890),
    lines(40, 930, 714, 130),
  ]),
];

/* ================================================================== แบบทดสอบ/ประเมิน */
const TEST: Template[] = [
  sheet('x-prepost', 'test', 'ทดสอบก่อน-หลังเรียน', '10 ข้อ ตาราง 2 ครั้ง เทียบคะแนน', '#4f46e5', 'แบบทดสอบ', 'ก่อนเรียน / หลังเรียน', '#e0e7ff', 'check', () => [
    table([['ข้อ', 'ก่อนเรียน', 'หลังเรียน'], ...[...Array(10)].map((_, i) => [String(i + 1), 'ก  ข  ค  ง', 'ก  ข  ค  ง'])], 40, 220, 714, 640),
    table([['', 'ก่อนเรียน', 'หลังเรียน', 'พัฒนาขึ้น'], ['คะแนน (เต็ม 10)', '', '', '']], 40, 890, 714, 110),
  ]),
  sheet('x-survey', 'test', 'แบบสอบถามความพึงพอใจ', 'ระดับ 1-5 พร้อมข้อเสนอแนะ', '#0891b2', 'แบบสอบถาม', 'ความพึงพอใจต่อกิจกรรม', '#cffafe', 'thumb', () => [
    table([['รายการ', '5', '4', '3', '2', '1'], ['กิจกรรมสนุก น่าสนใจ', '', '', '', '', ''], ['เข้าใจบทเรียนมากขึ้น', '', '', '', '', ''], ['มีเวลาทำกิจกรรมพอ', '', '', '', '', ''], ['อยากเรียนแบบนี้อีก', '', '', '', '', ''], ['ครูอธิบายชัดเจน', '', '', '', '', '']], 40, 220, 714, 440),
    txt('5 = มากที่สุด   1 = น้อยที่สุด', 18, 40, 670, 714, { color: '#64748b' }),
    label('ข้อเสนอแนะ', '#0891b2', 720),
    lines(40, 760, 714, 280),
  ]),
  sheet('x-rubric4', 'test', 'เกณฑ์ประเมิน 4 ระดับ', 'Rubric ดีมาก ดี พอใช้ ปรับปรุง', '#16a34a', 'เกณฑ์การประเมิน', 'Rubric ชิ้นงาน', '#dcfce7', 'medal', () => [
    table([['ประเด็น', 'ดีมาก (4)', 'ดี (3)', 'พอใช้ (2)', 'ปรับปรุง (1)'], ['เนื้อหาถูกต้อง', '', '', '', ''], ['ความคิดสร้างสรรค์', '', '', '', ''], ['ความเป็นระเบียบ', '', '', '', ''], ['ส่งตรงเวลา', '', '', '', '']], 40, 220, 714, 600),
    txt('คะแนนรวม ........ / 16     ผู้ประเมิน ..............................', 22, 40, 860, 714),
  ]),
  sheet('x-order', 'test', 'เรียงลำดับเหตุการณ์', 'ตัดภาพ/ข้อความแล้วเรียง 1-6', '#db2777', 'แบบทดสอบ', 'เรียงลำดับให้ถูก', '#fce7f3', 'question', () =>
    [0, 1, 2, 3, 4, 5].flatMap((i) => {
      const x = 40 + (i % 2) * 370;
      const y = 220 + Math.floor(i / 2) * 280;
      return [box('#fdf2f8', '#f9a8d4', x, y, 345, 260), at(makeShape('circle', { fill: '#ffffff', stroke: '#db2777', sw: 3 }), x + 12, y + 12, 56, 56), box('#ffffff', '#fbcfe8', x + 80, y + 14, 250, 150, 'dash'), lines(x + 14, y + 180, 316, 70)];
    })
  ),
];

/* ================================================================== แผนผังความคิด */
const ORG: Template[] = [
  {
    id: 'x-fishbone',
    cat: 'org',
    label: 'แผนภาพก้างปลา',
    note: 'ปัญหา + สาเหตุ 4 ด้าน',
    sizeId: 'a4l',
    accent: '#0284c7',
    make: () => {
      const items: Item[] = [at(makeText({ text: 'แผนภาพก้างปลา: หาสาเหตุของปัญหา', size: 34, bold: true, font: 'kanit', color: '#0369a1' }), 40, 24, 1043), lineBetween(80, 420, 880, 420, { stroke: '#0369a1', sw: 6 }), box('#e0f2fe', '#0284c7', 890, 340, 200, 160), txt('ปัญหา', 22, 890, 352, 200, { align: 'center', bold: true }), lines(905, 390, 170, 100, 34)];
      [[260, 'ด้านคน'], [560, 'ด้านวิธีการ']].forEach(([x, t]) => items.push(lineBetween(Number(x) - 120, 140, Number(x) + 60, 420, { stroke: '#0369a1', sw: 4 }), box('#ffffff', '#38bdf8', Number(x) - 220, 90, 200, 50), txt(String(t), 20, Number(x) - 220, 100, 200, { align: 'center', bold: true }), lines(Number(x) - 90, 170, 150, 200, 36)));
      [[260, 'ด้านสิ่งของ'], [560, 'ด้านสถานที่']].forEach(([x, t]) => items.push(lineBetween(Number(x) - 120, 700, Number(x) + 60, 420, { stroke: '#0369a1', sw: 4 }), box('#ffffff', '#38bdf8', Number(x) - 220, 700, 200, 50), txt(String(t), 20, Number(x) - 220, 710, 200, { align: 'center', bold: true }), lines(Number(x) - 90, 460, 150, 200, 36)));
      return design('a4l', [page(items)]);
    },
  },
  {
    id: 'x-cycle',
    cat: 'org',
    label: 'แผนภาพวงจร 6 ขั้น',
    note: 'วงกลม 6 ช่องต่อกันเป็นวง',
    sizeId: 'a4p',
    accent: '#9333ea',
    make: () => {
      const items: Item[] = [...header('แผนผังความคิด', 'แผนภาพวงจร', '#f3e8ff', '#7e22ce', 'sparkle'), nameLine(170), at(makeShape('circle', { fill: '#faf5ff', stroke: '#c084fc', sw: 3, dash: 'dash' }), 237, 450, 320, 320), txt('เรื่อง\n...............', 24, 237, 570, 320, { align: 'center', bold: true })];
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
        const cx = 397 + Math.cos(a) * 280;
        const cy = 610 + Math.sin(a) * 300;
        items.push(at(makeShape('circle', { fill: ['#fce7f3', '#fef9c3', '#dcfce7', '#dbeafe', '#ede9fe', '#ffedd5'][i], stroke: '#2a2350', sw: 2.5 }), cx - 95, cy - 95, 190, 190), txt(`${i + 1}`, 24, cx - 95, cy - 70, 190, { align: 'center', bold: true, color: '#7e22ce' }), lines(cx - 70, cy - 30, 140, 90, 30));
      }
      return design('a4p', [page(items)]);
    },
  },
  {
    id: 'x-tree',
    cat: 'org',
    label: 'แผนผังต้นไม้',
    note: 'หัวข้อหลัก 3 กิ่ง กิ่งละ 2 ย่อย',
    sizeId: 'a4l',
    accent: '#15803d',
    make: () => {
      const items: Item[] = [box('#dcfce7', '#16a34a', 411, 40, 300, 90), txt('หัวข้อหลัก', 28, 411, 64, 300, { align: 'center', bold: true, font: 'kanit' })];
      [0, 1, 2].forEach((i) => {
        const x = 70 + i * 345;
        items.push(lineBetween(561, 130, x + 140, 260, { stroke: '#16a34a', sw: 4 }), box('#f0fdf4', '#22c55e', x, 260, 280, 80), lines(x + 20, 270, 240, 60, 30));
        [0, 1].forEach((j) => {
          const sx = x - 20 + j * 170;
          items.push(lineBetween(x + 140, 340, sx + 75, 470, { stroke: '#86efac', sw: 3 }), box('#ffffff', '#86efac', sx, 470, 150, 240, 'dash'), lines(sx + 12, 484, 126, 210, 34));
        });
      });
      return design('a4l', [page(items)]);
    },
  },
  {
    id: 'x-pyramid',
    cat: 'org',
    label: 'พีระมิดลำดับความสำคัญ',
    note: '4 ชั้น จากสำคัญมากไปน้อย',
    sizeId: 'a4p',
    accent: '#ea580c',
    make: () => {
      const items: Item[] = [...header('แผนผังความคิด', 'พีระมิดความสำคัญ', '#ffedd5', '#c2410c', 'crown'), nameLine(170)];
      [0, 1, 2, 3].forEach((i) => {
        const w = 240 + i * 160;
        items.push(box(['#fed7aa', '#fdba74', '#fb923c', '#f97316'][i], '#2a2350', 397 - w / 2, 240 + i * 200, w, 180), lines(397 - w / 2 + 30, 270 + i * 200, w - 60, 120, 38));
      });
      items.push(txt('สำคัญมากที่สุดอยู่บนยอด', 20, 40, 1060, 714, { align: 'center', italic: true, color: '#c2410c' }));
      return design('a4p', [page(items)]);
    },
  },
];

/* ================================================================== จัดการชั้นเรียน */
const CLASS: Template[] = [
  sheet('x-contract', 'class', 'ข้อตกลงการเรียน', 'สัญญาร่วมกันของห้อง + ลงชื่อ', '#7c3aed', 'ห้องเรียนของเรา', 'ข้อตกลงร่วมกัน', '#ede9fe', 'ribbon', () => [
    ...[0, 1, 2, 3, 4].flatMap((i) => [sticker('check', 40, 230 + i * 110, 70), lines(130, 240 + i * 110, 624, 60)]),
    label('ลงชื่อนักเรียนทุกคน', '#7c3aed', 800),
    box('#faf5ff', '#c4b5fd', 40, 840, 714, 220, 'dash'),
  ]),
  sheet('x-weekgoal', 'class', 'เป้าหมายรายสัปดาห์', 'จ.-ศ. ทำได้ ระบายดาว', '#0891b2', 'เป้าหมายของฉัน', 'สัปดาห์นี้ฉันจะ...', '#cffafe', 'rocket', () => [
    lines(40, 220, 714, 100),
    table([['เป้าหมาย', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.'], ['', '', '', '', '', ''], ['', '', '', '', '', ''], ['', '', '', '', '', '']], 40, 350, 714, 360),
    label('สิ่งที่ภูมิใจในสัปดาห์นี้', '#0891b2', 740),
    lines(40, 780, 714, 160),
    ...[0, 1, 2, 3, 4].map((i) => at(makeShape('star', { fill: '#ffffff', stroke: '#f59e0b', sw: 3 }), 200 + i * 84, 970, 70, 70)),
  ]),
  {
    id: 'x-noise',
    cat: 'class',
    label: 'ป้ายระดับเสียงในห้อง',
    note: 'แนวตั้ง 4 ระดับ เงียบถึงดัง',
    sizeId: 'a4p',
    accent: '#16a34a',
    make: () =>
      design('a4p', [
        page([
          at(makeText({ text: 'ระดับเสียงในห้องเรียน', size: 46, bold: true, font: 'kanit', color: '#2a2350' }), 40, 40, 714),
          ...[['#ef4444', '4  เสียงดัง', 'นำเสนอหน้าห้อง'], ['#f59e0b', '3  เสียงปกติ', 'ทำงานกลุ่ม'], ['#22c55e', '2  เสียงกระซิบ', 'ทำงานคู่'], ['#3b82f6', '1  เงียบ', 'ทำงานคนเดียว']].flatMap(([c, t, n], i) => [box(c, '#2a2350', 60, 160 + i * 230, 674, 200), txt(t, 44, 90, 190 + i * 230, 614, { bold: true, font: 'kanit', color: '#ffffff' }), txt(n, 28, 90, 262 + i * 230, 614, { color: '#ffffff' })]),
        ]),
      ]),
  },
  sheet('x-borrow', 'class', 'บันทึกการยืมหนังสือ', 'ตารางยืม-คืน มุมหนังสือ', '#b45309', 'มุมหนังสือ', 'บันทึกการยืม-คืน', '#fef3c7', 'book', () => [table(blankRows(['วันที่', 'ชื่อผู้ยืม', 'ชื่อหนังสือ', 'วันคืน', 'ลายเซ็น'], 14), 40, 220, 714, 840)]),
];

/* ================================================================== บัตรคำ/การ์ด */
const cards4 = (render: (x: number, y: number, i: number) => Item[]): Item[] => [cutV(397, 1123), cutH(561, 794), ...[0, 1, 2, 3].flatMap((i) => render((i % 2) * 397, Math.floor(i / 2) * 561, i))];
const CARD: Template[] = [
  {
    id: 'x-picword',
    cat: 'card',
    label: 'บัตรภาพคู่คำ 4 ใบ',
    note: 'กรอบภาพ + คำ ตัดแยกได้',
    sizeId: 'a4p',
    accent: '#e11d48',
    make: () => design('a4p', [page(cards4((x, y, i) => [box(['#ffe4e6', '#dbeafe', '#dcfce7', '#fef9c3'][i], '#2a2350', x + 24, y + 24, 349, 513), box('#ffffff', '#94a3b8', x + 54, y + 54, 289, 300, 'dash'), txt('คำ', 48, x + 24, y + 400, 349, { align: 'center', bold: true, font: 'kanit' })]))]),
  },
  {
    id: 'x-qcards',
    cat: 'card',
    label: 'การ์ดคำถามเกม 8 ใบ',
    note: 'ด้านหน้ามีเลขข้อ ใส่คำถามได้',
    sizeId: 'a4p',
    accent: '#7c3aed',
    make: () => {
      const items: Item[] = [cutV(397, 1123), ...[1, 2, 3].map((k) => cutH(k * 281, 794))];
      for (let i = 0; i < 8; i++) {
        const x = (i % 2) * 397;
        const y = Math.floor(i / 2) * 281;
        items.push(box('#f5f3ff', '#a78bfa', x + 18, y + 18, 361, 245), at(makeShape('circle', { fill: '#7c3aed', sw: 0 }), x + 34, y + 34, 56, 56), txt(String(i + 1), 26, x + 34, y + 44, 56, { align: 'center', bold: true, color: '#ffffff' }), txt('คำถาม ..........................', 22, x + 34, y + 110, 330), txt('ตอบ: .......................', 18, x + 34, y + 200, 330, { color: '#64748b' }));
      }
      return design('a4p', [page(items)]);
    },
  },
  {
    id: 'x-mathcards',
    cat: 'card',
    label: 'บัตรโจทย์เลข 8 ใบ',
    note: 'บวก ลบ คูณ หาร ตัดเล่นเกม',
    sizeId: 'a4p',
    accent: '#0d9488',
    make: () => {
      const p = ['8 + 7', '15 - 9', '6 x 4', '36 ÷ 6', '23 + 19', '50 - 27', '9 x 8', '72 ÷ 9'];
      const items: Item[] = [cutV(397, 1123), ...[1, 2, 3].map((k) => cutH(k * 281, 794))];
      p.forEach((s, i) => {
        const x = (i % 2) * 397;
        const y = Math.floor(i / 2) * 281;
        items.push(box(['#ccfbf1', '#fef3c7'][i % 2], '#2a2350', x + 18, y + 18, 361, 245), txt(`${s} = ?`, 54, x + 18, y + 96, 361, { align: 'center', bold: true, font: 'prompt' }));
      });
      return design('a4p', [page(items)]);
    },
  },
  {
    id: 'x-verbcards',
    cat: 'card',
    label: 'Verb Cards',
    note: 'คำกริยา 4 ใบ พร้อมช่องวาดภาพ',
    sizeId: 'a4p',
    accent: '#2563eb',
    make: () => {
      const v = ['run', 'eat', 'read', 'swim'];
      return design('a4p', [page(cards4((x, y, i) => [box('#eff6ff', '#60a5fa', x + 24, y + 24, 349, 513), box('#ffffff', '#93c5fd', x + 54, y + 54, 289, 280, 'dash'), txt(v[i], 56, x + 24, y + 380, 349, { align: 'center', bold: true, font: 'chakra', color: '#1d4ed8' }), txt('I can ________.', 22, x + 24, y + 470, 349, { align: 'center', font: 'chakra' })]))]);
    },
  },
];

/* ================================================================== ป้าย/เกียรติบัตร */
const DECOR: Template[] = [
  {
    id: 'x-dayboard',
    cat: 'decor',
    label: 'ป้ายวันสำคัญ',
    note: 'แนวนอน หัวข้อใหญ่ + กล่องความรู้',
    sizeId: 'a4l',
    accent: '#dc2626',
    make: () =>
      design('a4l', [
        page(
          [
            at(makeShape('burst', { fill: '#fde047', sw: 0, opacity: 0.6 }), 880, 20, 220, 220),
            at(makeText({ text: 'วันสำคัญ', size: 30, bold: true, font: 'kanit', color: '#dc2626', align: 'left' }), 60, 50, 700),
            at(makeText({ text: 'วัน .........................', size: 72, bold: true, font: 'kanit', align: 'left', shadow: true }), 60, 96, 900),
            txt('ตรงกับวันที่ ......................', 28, 60, 210, 900, { color: '#475569' }),
            ...[0, 1, 2].flatMap((i) => [box(['#fee2e2', '#fef9c3', '#dbeafe'][i], '#2a2350', 60 + i * 340, 300, 320, 420), txt(['ความเป็นมา', 'กิจกรรม', 'สิ่งที่ควรทำ'][i], 28, 60 + i * 340, 320, 320, { align: 'center', bold: true, font: 'kanit' }), lines(80 + i * 340, 380, 280, 310)]),
          ],
          { border: { style: 'ribbon', color: '#f87171', w: 5 } }
        ),
      ]),
  },
  {
    id: 'x-reader-cert',
    cat: 'decor',
    label: 'เกียรติบัตรยอดนักอ่าน',
    note: 'แนวนอน กรอบหนังสือ ช่องจำนวนเล่ม',
    sizeId: 'a4l',
    accent: '#0d9488',
    make: () =>
      design('a4l', [
        page(
          [
            sticker('book', 80, 70, 140),
            sticker('trophy', 903, 70, 140),
            at(makeText({ text: 'เกียรติบัตรยอดนักอ่าน', size: 60, bold: true, font: 'kanit', color: '#0f766e' }), 60, 110, 1003),
            txt('มอบให้ไว้เพื่อแสดงว่า', 28, 60, 250, 1003, { align: 'center' }),
            txt('................................................................', 40, 60, 320, 1003, { align: 'center', bold: true }),
            txt('อ่านหนังสือครบ ........ เล่ม  ขอให้รักการอ่านตลอดไป', 28, 60, 420, 1003, { align: 'center' }),
            txt('ให้ไว้ ณ วันที่ ........ เดือน .................. พ.ศ. ..........', 22, 60, 500, 1003, { align: 'center', color: '#475569' }),
            txt('........................................\nครูประจำชั้น', 22, 640, 590, 400, { align: 'center' }),
          ],
          { border: { style: 'double', color: '#14b8a6', w: 6 }, bg: { color: '#f0fdfa', color2: '#ffffff', angle: 180, pattern: 'none', pcolor: '#ffffff' } }
        ),
      ]),
  },
  {
    id: 'x-star-work',
    cat: 'decor',
    label: 'ป้ายผลงานเด่น',
    note: 'กรอบติดผลงาน + ชื่อเจ้าของ',
    sizeId: 'a4p',
    accent: '#f59e0b',
    make: () =>
      design('a4p', [
        page(
          [
            at(makeText({ text: 'ผลงานเด่นประจำสัปดาห์', size: 44, bold: true, font: 'kanit', color: '#b45309' }), 40, 50, 714),
            box('#ffffff', '#f59e0b', 80, 160, 634, 700, 'dash'),
            txt('ติดผลงานตรงนี้', 26, 80, 490, 634, { align: 'center', color: '#d97706' }),
            sticker('medal', 610, 120, 130),
            txt('เจ้าของผลงาน ..........................................', 26, 40, 900, 714, { align: 'center' }),
            txt('เพราะ ......................................................', 24, 40, 960, 714, { align: 'center' }),
          ],
          { border: { style: 'stars', color: '#fbbf24', w: 5 }, bg: { color: '#fffbeb', color2: '#fef3c7', angle: 180, pattern: 'none', pcolor: '#ffffff' } }
        ),
      ]),
  },
];

/* ================================================================== สไลด์ */
const SLIDE: Template[] = [
  {
    id: 'x-slide-recap',
    cat: 'slide',
    label: 'สไลด์สรุปบทเรียน',
    note: '3 ข้อสำคัญที่ได้เรียน',
    sizeId: 'slide',
    accent: '#2563eb',
    make: () =>
      design('slide', [
        page(
          [
            at(makeText({ text: 'วันนี้เราได้เรียนรู้อะไร', size: 54, bold: true, font: 'kanit', color: '#ffffff' }), 60, 50, 1160),
            ...[0, 1, 2].flatMap((i) => [box('#ffffff', '', 60 + i * 395, 200, 370, 440), at(makeShape('circle', { fill: ['#f59e0b', '#ec4899', '#22c55e'][i], sw: 0 }), 205 + i * 395, 230, 80, 80), txt(String(i + 1), 40, 205 + i * 395, 244, 80, { align: 'center', bold: true, color: '#ffffff' }), txt('ข้อสำคัญ', 30, 80 + i * 395, 340, 330, { align: 'center', bold: true }), txt('อธิบายสั้นๆ', 24, 80 + i * 395, 400, 330, { align: 'center', color: '#475569' })]),
          ],
          { bg: { color: '#2563eb', color2: '#7c3aed', angle: 135, pattern: 'dots', pcolor: '#ffffff22' } }
        ),
      ]),
  },
  {
    id: 'x-slide-compare',
    cat: 'slide',
    label: 'สไลด์เปรียบเทียบ',
    note: 'สองฝั่ง เหมือน/ต่าง',
    sizeId: 'slide',
    accent: '#0d9488',
    make: () =>
      design('slide', [
        page([
          at(makeText({ text: 'เปรียบเทียบ', size: 50, bold: true, font: 'kanit', color: '#0f766e' }), 60, 30, 1160),
          box('#ccfbf1', '#14b8a6', 60, 130, 560, 540),
          txt('สิ่งที่ 1', 34, 60, 150, 560, { align: 'center', bold: true }),
          txt('• ...........\n• ...........\n• ...........', 28, 100, 230, 480, { lh: 1.9 }),
          box('#fef3c7', '#f59e0b', 660, 130, 560, 540),
          txt('สิ่งที่ 2', 34, 660, 150, 560, { align: 'center', bold: true }),
          txt('• ...........\n• ...........\n• ...........', 28, 700, 230, 480, { lh: 1.9 }),
          at(makeShape('circle', { fill: '#ffffff', stroke: '#2a2350', sw: 3 }), 590, 340, 100, 100),
          txt('VS', 34, 590, 366, 100, { align: 'center', bold: true, font: 'chakra' }),
        ]),
      ]),
  },
  {
    id: 'x-slide-word',
    cat: 'slide',
    label: 'สไลด์คำศัพท์วันนี้',
    note: 'คำ ความหมาย ตัวอย่างประโยค',
    sizeId: 'slide',
    accent: '#db2777',
    make: () =>
      design('slide', [
        page(
          [
            txt('คำศัพท์วันนี้', 32, 60, 40, 600, { bold: true, color: '#db2777', font: 'kanit' }),
            at(makeText({ text: 'Word', size: 110, bold: true, font: 'chakra', color: '#2a2350' }), 60, 110, 760),
            txt('/ คำอ่าน /', 30, 60, 290, 760, { color: '#64748b' }),
            box('#fdf2f8', '#f9a8d4', 60, 370, 760, 140),
            txt('ความหมาย: ............................', 30, 90, 410, 700),
            box('#ffffff', '#f9a8d4', 60, 540, 760, 120, 'dash'),
            txt('ตัวอย่างประโยค: ............................', 26, 90, 578, 700),
            box('#ffffff', '#db2777', 870, 110, 350, 550, 'dash'),
            txt('ภาพประกอบ', 26, 870, 370, 350, { align: 'center', color: '#db2777' }),
          ],
          { bg: { color: '#fff1f7', color2: '#ffffff', angle: 180, pattern: 'none', pcolor: '#ffffff' } }
        ),
      ]),
  },
];

export const MORE_TEMPLATES: Template[] = [...MATH, ...THAI, ...ENG, ...SCI, ...SHEET, ...TEST, ...ORG, ...CLASS, ...CARD, ...DECOR, ...SLIDE];
