import { blankBg, makeShape, makeWrite, type Item } from '@/lib/studio/doc';
import { at, badge, box, cutH, cutV, design, edu, header, lines, nameLine, page, sticker, table, txt, type Template, type TemplateCat } from './kit';

/** แม่แบบชุดที่ 3 (100+ แบบ, 4 พ.ย. 2026): ใช้สติกเกอร์ชุดใหม่ บัตรคำ จับคู่ บิงโก นับจำนวน จัดกลุ่ม ฝึกเขียน ก-ฮ / A-Z / 0-9 ตารางสะสมดาว เกียรติบัตร ป้ายชื่อ สไลด์ */

type W = [string, string, string]; // [สติกเกอร์, อังกฤษ, ไทย]
interface Theme {
  id: string;
  th: string;
  en: string;
  c: string; // สีเข้ม
  f: string; // สีอ่อน
  w: W[]; // 8 คำ
}
const T: Theme[] = [
  { id: 'fruit', th: 'ผลไม้และผัก', en: 'Fruits & Vegetables', c: '#e11d48', f: '#ffe4e6', w: [['f-watermelon', 'watermelon', 'แตงโม'], ['f-banana', 'banana', 'กล้วย'], ['f-strawberry', 'strawberry', 'สตรอว์เบอร์รี'], ['f-orange', 'orange', 'ส้ม'], ['f-grapes', 'grapes', 'องุ่น'], ['f-pineapple', 'pineapple', 'สับปะรด'], ['f-carrot', 'carrot', 'แครอท'], ['f-corn', 'corn', 'ข้าวโพด']] },
  { id: 'food', th: 'อาหารและเครื่องดื่ม', en: 'Food & Drinks', c: '#ea580c', f: '#ffedd5', w: [['f-pizza', 'pizza', 'พิซซ่า'], ['f-burger', 'burger', 'แฮมเบอร์เกอร์'], ['f-milk', 'milk', 'นม'], ['f-rice', 'rice', 'ข้าว'], ['f-noodle', 'noodles', 'ก๋วยเตี๋ยว'], ['f-egg', 'egg', 'ไข่'], ['f-bread', 'bread', 'ขนมปัง'], ['f-juice', 'juice', 'น้ำผลไม้']] },
  { id: 'pets', th: 'สัตว์น่ารัก', en: 'Cute Animals', c: '#b45309', f: '#fef3c7', w: [['an-cat', 'cat', 'แมว'], ['an-dog', 'dog', 'หมา'], ['an-bunny', 'rabbit', 'กระต่าย'], ['an-mouse', 'mouse', 'หนู'], ['an-pig', 'pig', 'หมู'], ['an-cow', 'cow', 'วัว'], ['an-chick', 'chick', 'ลูกไก่'], ['an-frog', 'frog', 'กบ']] },
  { id: 'wild', th: 'สัตว์ป่า', en: 'Wild Animals', c: '#15803d', f: '#dcfce7', w: [['an-lion', 'lion', 'สิงโต'], ['an-tiger', 'tiger', 'เสือ'], ['an-elephant', 'elephant', 'ช้าง'], ['an-monkey', 'monkey', 'ลิง'], ['an-bear', 'bear', 'หมี'], ['an-panda', 'panda', 'แพนด้า'], ['an-fox', 'fox', 'จิ้งจอก'], ['an-owl', 'owl', 'นกฮูก']] },
  { id: 'vehicle', th: 'ยานพาหนะ', en: 'Transportation', c: '#1d4ed8', f: '#dbeafe', w: [['v-car', 'car', 'รถยนต์'], ['v-bus', 'bus', 'รถบัส'], ['v-bike', 'bicycle', 'จักรยาน'], ['v-plane', 'airplane', 'เครื่องบิน'], ['v-ship', 'ship', 'เรือ'], ['v-train', 'train', 'รถไฟ'], ['v-heli', 'helicopter', 'เฮลิคอปเตอร์'], ['v-truck', 'truck', 'รถบรรทุก']] },
  { id: 'weather', th: 'สภาพอากาศ', en: 'Weather', c: '#0369a1', f: '#e0f2fe', w: [['w-sun', 'sunny', 'แดดออก'], ['w-cloud', 'cloudy', 'มีเมฆ'], ['w-rain', 'rainy', 'ฝนตก'], ['w-storm', 'stormy', 'พายุ'], ['w-snow', 'snowy', 'หิมะตก'], ['w-wind', 'windy', 'ลมแรง'], ['w-rainbow', 'rainbow', 'รุ้ง'], ['w-umbrella', 'umbrella', 'ร่ม']] },
  { id: 'space', th: 'อวกาศ', en: 'Space', c: '#4338ca', f: '#e0e7ff', w: [['sp-rocket', 'rocket', 'จรวด'], ['sp-planet', 'planet', 'ดาวเคราะห์'], ['sp-earth', 'Earth', 'โลก'], ['sp-astronaut', 'astronaut', 'นักบินอวกาศ'], ['sp-ufo', 'UFO', 'จานบิน'], ['sp-moonface', 'moon', 'ดวงจันทร์'], ['sp-comet', 'comet', 'ดาวหาง'], ['sp-telescope', 'telescope', 'กล้องโทรทรรศน์']] },
  { id: 'ocean', th: 'สัตว์ทะเล', en: 'Sea Animals', c: '#0e7490', f: '#cffafe', w: [['oc-fish', 'fish', 'ปลา'], ['oc-whale', 'whale', 'วาฬ'], ['oc-octopus', 'octopus', 'ปลาหมึก'], ['oc-crab', 'crab', 'ปู'], ['oc-turtle', 'turtle', 'เต่า'], ['oc-starfish', 'starfish', 'ปลาดาว'], ['oc-jelly', 'jellyfish', 'แมงกะพรุน'], ['oc-shark', 'shark', 'ฉลาม']] },
  { id: 'bugs', th: 'แมลงและสัตว์เล็ก', en: 'Bugs', c: '#4d7c0f', f: '#ecfccb', w: [['b-bee', 'bee', 'ผึ้ง'], ['b-ladybug', 'ladybug', 'เต่าทอง'], ['b-butterfly', 'butterfly', 'ผีเสื้อ'], ['b-ant', 'ant', 'มด'], ['b-snail', 'snail', 'หอยทาก'], ['b-caterpillar', 'caterpillar', 'หนอน'], ['b-dragonfly', 'dragonfly', 'แมลงปอ'], ['b-spider', 'spider', 'แมงมุม']] },
  { id: 'sport', th: 'กีฬา', en: 'Sports', c: '#c2410c', f: '#ffedd5', w: [['sg-soccer', 'football', 'ฟุตบอล'], ['sg-basket', 'basketball', 'บาสเกตบอล'], ['sg-tennis', 'tennis', 'เทนนิส'], ['sg-shuttle', 'badminton', 'แบดมินตัน'], ['sg-takraw', 'sepak takraw', 'ตะกร้อ'], ['sg-swim', 'swimming', 'ว่ายน้ำ'], ['sg-jumprope', 'jump rope', 'กระโดดเชือก'], ['sg-trophy', 'trophy', 'ถ้วยรางวัล']] },
  { id: 'music', th: 'เครื่องดนตรี', en: 'Musical Instruments', c: '#9333ea', f: '#f3e8ff', w: [['mu-guitar', 'guitar', 'กีตาร์'], ['mu-drum', 'drum', 'กลอง'], ['mu-piano', 'piano', 'เปียโน'], ['mu-violin', 'violin', 'ไวโอลิน'], ['mu-trumpet', 'trumpet', 'ทรัมเป็ต'], ['mu-xylo', 'xylophone', 'ระนาด'], ['mu-khim', 'flute', 'ขลุ่ย'], ['mu-mic', 'microphone', 'ไมโครโฟน']] },
  { id: 'home', th: 'บ้านและของใช้', en: 'At Home', c: '#be185d', f: '#fce7f3', w: [['h-house', 'house', 'บ้าน'], ['h-chair', 'chair', 'เก้าอี้'], ['h-bed', 'bed', 'เตียง'], ['h-lamp', 'lamp', 'โคมไฟ'], ['h-tv', 'television', 'โทรทัศน์'], ['h-clock', 'clock', 'นาฬิกา'], ['h-phone', 'phone', 'โทรศัพท์'], ['h-key', 'key', 'กุญแจ']] },
  { id: 'body', th: 'ร่างกายของเรา', en: 'My Body', c: '#db2777', f: '#fce7f3', w: [['bd-eye', 'eye', 'ตา'], ['bd-ear', 'ear', 'หู'], ['bd-hand', 'hand', 'มือ'], ['bd-tooth', 'tooth', 'ฟัน'], ['bd-brain', 'brain', 'สมอง'], ['bd-heart', 'heart', 'หัวใจ'], ['bd-bone', 'bone', 'กระดูก'], ['bd-lungs', 'lungs', 'ปอด']] },
  { id: 'feel', th: 'อารมณ์ความรู้สึก', en: 'Feelings', c: '#ca8a04', f: '#fef9c3', w: [['em-happy', 'happy', 'มีความสุข'], ['em-sad', 'sad', 'เศร้า'], ['em-angry', 'angry', 'โกรธ'], ['em-wow', 'surprised', 'ประหลาดใจ'], ['em-sleepy', 'sleepy', 'ง่วงนอน'], ['em-scared', 'scared', 'กลัว'], ['em-shy', 'shy', 'เขินอาย'], ['em-excited', 'excited', 'ตื่นเต้น']] },
];

const tpl = (id: string, cat: TemplateCat, label: string, note: string, sizeId: string, accent: string, make: Template['make']): Template => ({ id, cat, label, note, sizeId, accent, make });
const A4W = 794;
const A4H = 1123;
/** สลับลำดับแบบคงที่ (ไม่สุ่ม): ได้ผลเดิมทุกครั้ง */
const mix = <X,>(a: X[], k = 3) => a.map((_, i) => a[(i * k + 1) % a.length]);
/** ขนาดตัวอักษรให้คำยาวอยู่บรรทัดเดียว (นับเฉพาะตัวที่กินที่ ไม่นับสระบน/ล่าง วรรณยุกต์) */
const fitSz = (t: string, w: number, max: number, k = 0.62) => Math.min(max, Math.floor(w / (k * t.replace(/[ัิ-ฺ็-๎]/g, '').length)));

/* ---------------------------------------------------------------- 1) บัตรคำศัพท์ 8 ใบ (ตัดแยก) */
const vocabCards = (t: Theme) =>
  tpl(`s3-cards-${t.id}`, 'card', `บัตรคำศัพท์ ${t.th}`, `8 ใบ ภาพ + ${t.en} + คำไทย ตัดแยกได้`, 'a4p', t.c, () => {
    const items: Item[] = [];
    t.w.forEach(([st, en, th], i) => {
      const x = (i % 2) * 397;
      const y = Math.floor(i / 2) * 280;
      items.push(box(t.f, t.c, x + 18, y + 18, 361, 244), sticker(st, x + 34, y + 44, 150), txt(en, fitSz(en, 176, 34), x + 190, y + 80, 180, { bold: true, font: 'mali', color: t.c, align: 'center' }), txt(th, fitSz(th, 176, 26, 0.7), x + 190, y + 150, 180, { font: 'kanit', align: 'center' }));
    });
    items.push(cutV(397, A4H), cutH(280, A4W), cutH(560, A4W), cutH(840, A4W));
    return design('a4p', [page(items)]);
  });

/* ---------------------------------------------------------------- 2) จับคู่ภาพกับคำ */
const matchSheet = (t: Theme) =>
  tpl(`s3-match-${t.id}`, 'eng', `จับคู่ภาพกับคำ ${t.en}`, 'ลากเส้นจับคู่ภาพ 6 ภาพกับคำอังกฤษ', 'a4p', t.c, () => {
    const six = t.w.slice(0, 6);
    const words = mix(six.map((w) => w[1]), 5);
    const items: Item[] = [...header('Matching จับคู่ภาพกับคำ', t.en, t.f, t.c, six[0][0]), nameLine(170)];
    six.forEach(([st], i) => {
      const y = 240 + i * 140;
      items.push(sticker(st, 70, y, 110), at(makeShape('circle', { fill: t.c, sw: 0 }), 210, y + 45, 20, 20), at(makeShape('circle', { fill: t.c, sw: 0 }), 500, y + 45, 20, 20), txt(words[i], fitSz(words[i], 206, 32), 540, y + 30, 210, { bold: true, font: 'mali', color: t.c }));
    });
    return design('a4p', [page(items)]);
  });

/* ---------------------------------------------------------------- 3) บิงโกภาพ 3x3 */
const bingo = (t: Theme) =>
  tpl(`s3-bingo-${t.id}`, 'eng', `บิงโกภาพ ${t.en}`, 'ตาราง 3x3 ภาพ 8 ช่อง + ช่องฟรีกลาง ครูอ่านคำ เด็กกากบาท', 'a4p', t.c, () => {
    const order = mix(t.w, 3);
    const items: Item[] = [...header('BINGO', `${t.en} Bingo`, t.f, t.c, 'lb-wow'), nameLine(170)];
    for (let i = 0; i < 9; i++) {
      const x = 67 + (i % 3) * 225;
      const y = 240 + Math.floor(i / 3) * 255;
      items.push(box('#ffffff', t.c, x, y, 210, 240));
      if (i === 4) items.push(sticker('sp-starface', x + 35, y + 30, 140), txt('FREE', 30, x, y + 180, 210, { bold: true, font: 'mali', color: t.c, align: 'center' }));
      else {
        const [st, en] = order[i > 4 ? i - 1 : i];
        items.push(sticker(st, x + 45, y + 24, 120), txt(en, fitSz(en, 200, 26), x, y + 168, 210, { bold: true, font: 'mali', align: 'center' }));
      }
    }
    items.push(txt('ได้เรียง 3 ช่อง ตะโกนว่า BINGO!', 22, 40, 1030, 714, { align: 'center', color: t.c, bold: true }));
    return design('a4p', [page(items)]);
  });

/* ---------------------------------------------------------------- 4) นับจำนวนภาพ */
const countSheet = (t: Theme, n: number[]) =>
  tpl(`s3-count-${t.id}`, 'math', `นับจำนวน ${t.th}`, 'นับภาพแต่ละแถวแล้วเขียนตัวเลขในกล่อง', 'a4p', t.c, () => {
    const items: Item[] = [...header('คณิตศาสตร์', 'นับแล้วเขียนตัวเลข', t.f, t.c, 'num-5'), nameLine(170)];
    n.forEach((k, r) => {
      const y = 240 + r * 160;
      const st = t.w[r % 8][0];
      const s = k > 7 ? 54 : 70;
      for (let j = 0; j < k; j++) items.push(sticker(st, 40 + j * (s + 4), y + (70 - s) / 2 + 20, s));
      items.push(box('#ffffff', t.c, 640, y + 10, 114, 110));
    });
    return design('a4p', [page(items)]);
  });

/* ---------------------------------------------------------------- 5) จัดกลุ่ม 2-3 กลุ่ม */
const sortSheet = (id: string, cat: TemplateCat, title: string, groups: string[], bank: string[], c: string, f: string) =>
  tpl(`s3-sort-${id}`, cat, `จัดกลุ่ม: ${title}`, `ภาพ ${bank.length} ภาพ แบ่งเป็น ${groups.length} กลุ่ม`, 'a4p', c, () => {
    const items: Item[] = [...header('จัดกลุ่ม', title, f, c, bank[0]), nameLine(170), txt('ตัดภาพหรือวาดลงในกลุ่มที่ถูกต้อง', 22, 40, 220, 714, { bold: true, color: c })];
    bank.forEach((st, i) => items.push(box('#ffffff', '#cbd5e1', 40 + i * 89, 270, 80, 80, 'dash'), sticker(st, 46 + i * 89, 276, 68)));
    const gw = (714 - (groups.length - 1) * 16) / groups.length;
    groups.forEach((g, i) => {
      const x = 40 + i * (gw + 16);
      items.push(box(f, c, x, 390, gw, 680), txt(g, 26, x, 404, gw, { bold: true, font: 'kanit', align: 'center', color: c }));
    });
    return design('a4p', [page(items)]);
  });

/* ---------------------------------------------------------------- 6) ฝึกเขียน ก-ฮ (4 ตัว/หน้า) */
const TH = 'ก ไก่,ข ไข่,ฃ ขวด,ค ควาย,ฅ คน,ฆ ระฆัง,ง งู,จ จาน,ฉ ฉิ่ง,ช ช้าง,ซ โซ่,ฌ เฌอ,ญ หญิง,ฎ ชฎา,ฏ ปฏัก,ฐ ฐาน,ฑ มณโฑ,ฒ ผู้เฒ่า,ณ เณร,ด เด็ก,ต เต่า,ถ ถุง,ท ทหาร,ธ ธง,น หนู,บ ใบไม้,ป ปลา,ผ ผึ้ง,ฝ ฝา,พ พาน,ฟ ฟัน,ภ สำเภา,ม ม้า,ย ยักษ์,ร เรือ,ล ลิง,ว แหวน,ศ ศาลา,ษ ฤๅษี,ส เสือ,ห หีบ,ฬ จุฬา,อ อ่าง,ฮ นกฮูก'.split(',');
const traceThai = (k: number) => {
  const four = TH.slice(k * 4, k * 4 + 4);
  const first = four[0].split(' ')[0];
  const last = four[four.length - 1].split(' ')[0];
  return tpl(`s3-thai-${k + 1}`, 'thai', `ฝึกเขียน ${first}-${last}`, `คัดพยัญชนะ ${four.map((x) => x.split(' ')[0]).join(' ')} พร้อมชื่อเรียก`, 'a4p', '#be123c', () => {
    const items: Item[] = [...header('ภาษาไทย', `ฝึกเขียนพยัญชนะ ${first} - ${last}`, '#ffe4e6', '#be123c', 't-kokai'), nameLine(170)];
    four.forEach((x, i) => {
      const y = 230 + i * 215;
      items.push(sticker(`th-${k * 4 + i + 1}`, 40, y, 120), txt(x, 26, 30, y + 128, 140, { bold: true, font: 'kanit', align: 'center' }), at(makeWrite('dotted', { gap: 60 }), 190, y, 564, 180));
    });
    return design('a4p', [page(items)]);
  });
};

/* ---------------------------------------------------------------- 7) ฝึกเขียน A-Z (4 ตัว/หน้า) */
const traceAbc = (k: number) => {
  const L = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)).slice(k * 4, k * 4 + 4);
  return tpl(`s3-abc-${k + 1}`, 'eng', `ฝึกเขียน ${L[0]}-${L[L.length - 1]}`, `ตัวพิมพ์ใหญ่-เล็ก ${L.join(' ')} บนเส้น 4 เส้น`, 'a4p', '#1d4ed8', () => {
    const items: Item[] = [...header('English', `Letters ${L[0]} - ${L[L.length - 1]}`, '#dbeafe', '#1d4ed8', 'e-abc'), nameLine(170)];
    L.forEach((x, i) => {
      const y = 230 + i * 215;
      items.push(sticker(`en-${x.toLowerCase()}`, 40, y + 20, 130), at(makeWrite('four', { gap: 64 }), 190, y, 564, 192));
    });
    return design('a4p', [page(items)]);
  });
};

/* ---------------------------------------------------------------- 8) เลข 0-9 หน้าละตัว */
const NUMW = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
const NUME = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
const THD = '๐๑๒๓๔๕๖๗๘๙';
const numberSheet = (n: number) =>
  tpl(`s3-num-${n}`, 'math', `รู้จักเลข ${n}`, `เลขฮินดูอารบิก/ไทย/คำอ่าน กรอบสิบ นับภาพ ฝึกเขียน`, 'a4p', '#0f766e', () => {
    const t = T[n % T.length];
    const items: Item[] = [
      ...header('คณิตศาสตร์', `เลข ${n}  ${THD[n]}  ${NUMW[n]}`, '#ccfbf1', '#0f766e', `num-${n}`),
      nameLine(170),
      sticker(`num-${n}`, 40, 230, 200),
      txt(`${n}  =  ${THD[n]}`, 56, 270, 250, 300, { bold: true, font: 'prompt' }),
      txt(`อ่านว่า  ${NUMW[n]}  (${NUME[n]})`, 28, 270, 340, 480, { font: 'kanit' }),
      txt('ระบายกรอบสิบให้ครบจำนวน', 22, 40, 460, 714, { bold: true, color: '#0f766e' }),
      edu('tenframe', 40, 500, 420, 170, 0),
      txt('วงกลมภาพให้ครบจำนวน', 22, 40, 700, 714, { bold: true, color: '#0f766e' }),
      ...Array.from({ length: 10 }, (_, i) => sticker(t.w[0][0], 40 + i * 71, 740, 64)),
      txt('ฝึกเขียน', 22, 40, 830, 714, { bold: true, color: '#0f766e' }),
      at(makeWrite('four', { gap: 64 }), 40, 870, 714, 192),
    ];
    return design('a4p', [page(items)]);
  });

/* ---------------------------------------------------------------- 9) ตารางสะสมดาว */
const rewardChart = (id: string, title: string, st: string, mark: string, c: string, f: string) =>
  tpl(`s3-reward-${id}`, 'class', `ตารางสะสม ${title}`, '30 ช่อง ครบแล้วรับรางวัล', 'a4p', c, () => {
    const items: Item[] = [...header('ตารางสะสม', title, f, c, st), nameLine(170)];
    for (let i = 0; i < 30; i++) {
      const x = 52 + (i % 5) * 140;
      const y = 240 + Math.floor(i / 5) * 128;
      items.push(at(makeShape('circle', { fill: '#ffffff', stroke: c, sw: 3, dash: 'dash' }), x, y, 110, 110), txt(String(i + 1), 22, x, y + 38, 110, { align: 'center', color: '#94a3b8', bold: true }));
    }
    items.push(sticker(mark, 40, 1010, 80), txt('ครบ 30 ช่อง รับรางวัลพิเศษ!', 26, 130, 1030, 624, { bold: true, color: c, font: 'kanit' }));
    return design('a4p', [page(items)]);
  });

/* ---------------------------------------------------------------- 10) เกียรติบัตร (แนวนอน) */
const cert = (id: string, title: string, sub: string, st: string, c: string, f: string, border: 'double' | 'stars' | 'scallop' | 'ribbon' | 'flowers' | 'rainbow' | 'hearts' | 'leaves') =>
  tpl(`s3-cert-${id}`, 'decor', `เกียรติบัตร ${title}`, 'แนวนอน ใส่ชื่อ วันที่ และลายเซ็น', 'a4l', c, () =>
    design('a4l', [
      page(
        [
          sticker(st, 461, 50, 200),
          txt('เกียรติบัตรนี้ให้ไว้เพื่อแสดงว่า', 28, 160, 270, 803, { align: 'center', font: 'kanit' }),
          txt('ชื่อ ...........................................................', 34, 160, 330, 803, { align: 'center', bold: true }),
          txt(title, 48, 160, 410, 803, { align: 'center', bold: true, color: c, font: 'kanit' }),
          txt(sub, 24, 160, 490, 803, { align: 'center' }),
          txt('ให้ไว้ ณ วันที่ ...........................', 22, 160, 560, 803, { align: 'center' }),
          txt('ลงชื่อ ..................................\n(.........................................)\nครูประจำชั้น', 20, 361, 610, 400, { align: 'center', lh: 1.5 }),
        ],
        { bg: { ...blankBg(), color: '#ffffff', color2: f, angle: 180 }, border: { style: border, color: c, w: 4 } },
      ),
    ]),
  );

/* ---------------------------------------------------------------- 11) ป้ายชื่อ 8 ใบ */
const nameTags = (t: Theme) =>
  tpl(`s3-tags-${t.id}`, 'card', `ป้ายชื่อธีม${t.th}`, '8 ป้ายต่อหน้า ภาพต่างกัน ตัดแยกได้', 'a4p', t.c, () => {
    const items: Item[] = [];
    t.w.forEach(([st], i) => {
      const x = (i % 2) * 397;
      const y = Math.floor(i / 2) * 280;
      items.push(box(t.f, t.c, x + 22, y + 30, 353, 220), sticker(st, x + 36, y + 70, 120), txt('ชื่อ', 22, x + 170, y + 70, 190, { color: t.c, bold: true }), at(makeWrite('lines', { gap: 50 }), x + 170, y + 110, 190, 110));
    });
    items.push(cutV(397, A4H), cutH(280, A4W), cutH(560, A4W), cutH(840, A4W));
    return design('a4p', [page(items)]);
  });

/* ---------------------------------------------------------------- 12) อารมณ์ความรู้สึก */
const FEEL = T.find((x) => x.id === 'feel')!;
const feelCheck = tpl('s3-feel-today', 'class', 'วันนี้ฉันรู้สึก...', 'อารมณ์ 8 แบบ วงกลมความรู้สึก + เขียนเหตุผล', 'a4p', '#ca8a04', () => {
  const items: Item[] = [...header('เช็กอินความรู้สึก', 'วันนี้ฉันรู้สึก...', '#fef9c3', '#ca8a04', 'em-happy'), nameLine(170)];
  FEEL.w.forEach(([st, , th], i) => {
    const x = 40 + (i % 4) * 182;
    const y = 240 + Math.floor(i / 4) * 230;
    items.push(box('#ffffff', '#facc15', x, y, 168, 210), sticker(st, x + 24, y + 14, 120), txt(th, fitSz(th, 160, 24, 0.7), x, y + 150, 168, { align: 'center', bold: true, font: 'kanit' }));
  });
  items.push(txt('ฉันรู้สึกแบบนี้เพราะ', 24, 40, 730, 714, { bold: true, color: '#a16207' }), lines(40, 780, 714, 280));
  return design('a4p', [page(items)]);
});
const feelWeek = tpl('s3-feel-week', 'class', 'บันทึกอารมณ์ 1 สัปดาห์', 'ตาราง จันทร์-ศุกร์ วาดหน้า + เขียนสั้นๆ', 'a4p', '#ca8a04', () =>
  design('a4p', [
    page([
      ...header('เช็กอินความรู้สึก', 'อารมณ์ของฉันในสัปดาห์นี้', '#fef9c3', '#ca8a04', 'em-calm'),
      nameLine(170),
      ...FEEL.w.map(([st], i) => sticker(st, 40 + i * 90, 220, 76)),
      table([['วัน', 'หน้าของฉัน', 'เพราะ...'], ['จันทร์', '', ''], ['อังคาร', '', ''], ['พุธ', '', ''], ['พฤหัสบดี', '', ''], ['ศุกร์', '', '']], 40, 320, 714, 760, { head: '#fef08a', size: 22 }),
    ]),
  ]),
);
const feelCards = tpl('s3-feel-cards', 'card', 'การ์ดอารมณ์ 8 ใบ', 'ภาพอารมณ์ + คำไทย/อังกฤษ ใช้คุยเรื่องความรู้สึก', 'a4p', '#ca8a04', () => {
  const items: Item[] = [];
  FEEL.w.forEach(([st, en, th], i) => {
    const x = (i % 2) * 397;
    const y = Math.floor(i / 2) * 280;
    items.push(box('#fffbeb', '#facc15', x + 18, y + 18, 361, 244), sticker(st, x + 120, y + 30, 150), txt(`${th}  ${en}`, 26, x + 18, y + 196, 361, { align: 'center', bold: true, font: 'kanit' }));
  });
  items.push(cutV(397, A4H), cutH(280, A4W), cutH(560, A4W), cutH(840, A4W));
  return design('a4p', [page(items)]);
});

/* ---------------------------------------------------------------- 13) สไลด์เปิดบทเรียน 16:9 */
const slide = (t: Theme) =>
  tpl(`s3-slide-${t.id}`, 'slide', `สไลด์บทเรียน ${t.th}`, '3 หน้า: หน้าปก คำศัพท์ 4 ภาพ คำถามชวนคิด', 'slide', t.c, () => {
    const bg = { ...blankBg(), color: t.f, color2: '#ffffff', angle: 160 };
    const four = t.w.slice(0, 4);
    return design('slide', [
      page([at(makeShape('round', { fill: '#ffffff', stroke: t.c, sw: 4 }), 80, 120, 700, 480), txt(t.th, 72, 120, 210, 640, { bold: true, font: 'kanit', color: t.c }), txt(t.en, 44, 120, 330, 640, { font: 'mali' }), txt('บทเรียนวันนี้', 30, 120, 430, 640, { color: '#64748b' }), sticker(t.w[0][0], 840, 150, 340), sticker(t.w[1][0], 1040, 470, 180)], { bg }),
      page([txt(`คำศัพท์: ${t.en}`, 52, 60, 50, 1160, { bold: true, font: 'kanit', color: t.c, align: 'center' }), ...four.flatMap(([st, en, th], i) => [box('#ffffff', t.c, 60 + i * 295, 170, 275, 470), sticker(st, 97 + i * 295, 200, 200), txt(en, 36, 60 + i * 295, 430, 275, { bold: true, font: 'mali', align: 'center', color: t.c }), txt(th, 30, 60 + i * 295, 510, 275, { font: 'kanit', align: 'center' })])], { bg }),
      page([sticker('em-think', 80, 200, 300), at(makeShape('bubble', { fill: '#ffffff', stroke: t.c, sw: 4 }), 420, 110, 780, 460), txt('คำถามชวนคิด', 40, 480, 170, 660, { bold: true, font: 'kanit', color: t.c }), txt(`ถ้าเลือกได้ 1 อย่างจาก ${t.th}\nจะเลือกอะไร เพราะอะไร`, 36, 480, 260, 660, { lh: 1.5 })], { bg }),
    ]);
  });

/* ---------------------------------------------------------------- 14) แต่งประโยคจากภาพ */
const storySheet = (id: string, title: string, three: string[], c: string, f: string) =>
  tpl(`s3-story-${id}`, 'thai', `แต่งประโยคจากภาพ: ${title}`, 'ภาพ 3 ภาพ เขียนประโยคใต้ภาพ + แต่งเรื่องสั้น', 'a4p', c, () => {
    const items: Item[] = [...header('ภาษาไทย', `แต่งประโยค: ${title}`, f, c, 'pencil'), nameLine(170)];
    three.forEach((st, i) => {
      const y = 230 + i * 210;
      items.push(box(f, c, 40, y, 170, 170), sticker(st, 55, y + 15, 140), badge(i + 1, c, 230, y), lines(296, y, 458, 170, 56));
    });
    items.push(txt('นำ 3 ภาพมาแต่งเป็นเรื่องสั้น ตั้งชื่อเรื่องด้วยนะ', 22, 40, 870, 714, { bold: true, color: c }), lines(40, 910, 714, 180));
    return design('a4p', [page(items)]);
  });

/* ================================================================ รวม */
const byId = (id: string) => T.find((x) => x.id === id)!;
export const STIX_TEMPLATES: Template[] = [
  ...T.map(vocabCards),
  ...T.map(matchSheet),
  ...['fruit', 'pets', 'wild', 'vehicle', 'weather', 'ocean', 'bugs', 'home'].map((id) => bingo(byId(id))),
  countSheet(byId('fruit'), [3, 5, 2, 7, 4]),
  countSheet(byId('pets'), [6, 1, 8, 3, 5]),
  countSheet(byId('ocean'), [4, 9, 2, 6, 7]),
  countSheet(byId('bugs'), [5, 3, 10, 1, 8]),
  countSheet(byId('vehicle'), [2, 6, 4, 9, 3]),
  countSheet(byId('space'), [7, 2, 5, 8, 6]),
  countSheet(byId('sport'), [1, 4, 6, 3, 10]),
  countSheet(byId('food'), [8, 5, 7, 2, 9]),
  sortSheet('living', 'sci', 'สิ่งมีชีวิต / สิ่งไม่มีชีวิต', ['สิ่งมีชีวิต', 'สิ่งไม่มีชีวิต'], ['an-cat', 'h-chair', 'b-bee', 'v-car', 'oc-fish', 'h-clock', 'h-plant', 'h-phone'], '#15803d', '#dcfce7'),
  sortSheet('transport', 'sci', 'ทางบก ทางน้ำ ทางอากาศ', ['ทางบก', 'ทางน้ำ', 'ทางอากาศ'], ['v-car', 'v-ship', 'v-plane', 'v-train', 'v-sub', 'v-heli', 'v-bus', 'v-balloon'], '#1d4ed8', '#dbeafe'),
  sortSheet('vegfruit', 'sci', 'ผัก / ผลไม้', ['ผัก', 'ผลไม้'], ['f-carrot', 'f-banana', 'f-broccoli', 'f-grapes', 'f-corn', 'f-strawberry', 'f-orange', 'f-pineapple'], '#ea580c', '#ffedd5'),
  sortSheet('landsea', 'sci', 'สัตว์บก / สัตว์น้ำ', ['สัตว์บก', 'สัตว์น้ำ'], ['an-lion', 'oc-whale', 'an-cow', 'oc-crab', 'an-elephant', 'oc-octopus', 'an-dog', 'oc-fish'], '#0e7490', '#cffafe'),
  sortSheet('insect', 'sci', 'แมลง / ไม่ใช่แมลง (นับขา 6 ขา)', ['แมลง', 'ไม่ใช่แมลง'], ['b-bee', 'b-spider', 'b-ant', 'b-snail', 'b-ladybug', 'b-worm', 'b-butterfly', 'oc-crab'], '#4d7c0f', '#ecfccb'),
  sortSheet('healthy', 'sci', 'กินบ่อยได้ / ควรกินน้อย', ['กินบ่อยได้', 'ควรกินน้อย'], ['f-broccoli', 'f-donut', 'f-milk', 'f-lollipop', 'f-egg', 'f-burger', 'f-orange', 'f-cookie'], '#be123c', '#ffe4e6'),
  sortSheet('weather3', 'sci', 'ร้อน / ฝนตก / หนาว', ['อากาศร้อน', 'ฝนตก', 'อากาศหนาว'], ['w-sun', 'w-umbrella', 'w-snowman', 'w-thermo', 'w-rain', 'w-snow', 'f-icecream', 'w-storm'], '#0369a1', '#e0f2fe'),
  sortSheet('music', 'sheet', 'เครื่องตี / เครื่องเป่า / เครื่องสาย', ['ตี', 'เป่า', 'สาย (ดีด/สี)'], ['mu-drum', 'mu-trumpet', 'mu-guitar', 'mu-xylo', 'mu-khim', 'mu-violin', 'mu-tambourine', 'mu-piano'], '#9333ea', '#f3e8ff'),
  ...Array.from({ length: 11 }, (_, k) => traceThai(k)),
  ...Array.from({ length: 7 }, (_, k) => traceAbc(k)),
  ...Array.from({ length: 10 }, (_, n) => numberSheet(n)),
  rewardChart('star', 'ดาวเด็กดี', 'sp-starface', 'sg-trophy', '#ca8a04', '#fef9c3'),
  rewardChart('reading', 'นักอ่านตัวน้อย', 'book', 'lb-great', '#7c3aed', '#ede9fe'),
  rewardChart('homework', 'ส่งการบ้านครบ', 'lb-hw', 'lb-excellent', '#ea580c', '#ffedd5'),
  rewardChart('tooth', 'แปรงฟันทุกวัน', 'h-toothbrush', 'bd-tooth', '#0e7490', '#cffafe'),
  rewardChart('rocket', 'ภารกิจอวกาศ', 'sp-rocket', 'sp-astronaut', '#4338ca', '#e0e7ff'),
  rewardChart('ocean', 'นักสำรวจทะเล', 'oc-whale', 'oc-starfish', '#0369a1', '#e0f2fe'),
  rewardChart('garden', 'สวนผึ้งน้อย', 'b-bee', 'b-butterfly', '#4d7c0f', '#ecfccb'),
  rewardChart('kind', 'น้ำใจงาม', 'bd-heart', 'em-love', '#db2777', '#fce7f3'),
  cert('reader', 'นักอ่านยอดเยี่ยม', 'อ่านหนังสือครบตามเป้าหมายของห้องเรียน', 'book', '#7c3aed', '#f5f3ff', 'stars'),
  cert('math', 'นักคณิตศาสตร์ตัวน้อย', 'ตั้งใจฝึกคิดเลขจนเก่งขึ้นอย่างเห็นได้ชัด', 'num-1', '#0f766e', '#f0fdfa', 'double'),
  cert('sci', 'นักวิทยาศาสตร์ตัวน้อย', 'ช่างสังเกต ทดลองอย่างปลอดภัย และสรุปผลได้ดี', 'sp-rocket', '#1d4ed8', '#eff6ff', 'ribbon'),
  cert('eng', 'English Star', 'กล้าพูดภาษาอังกฤษและฝึกฝนสม่ำเสมอ', 'lb-goodjob', '#be185d', '#fdf2f8', 'hearts'),
  cert('sport', 'นักกีฬาดีเด่น', 'มีน้ำใจนักกีฬา ฝึกซ้อมอย่างตั้งใจ', 'sg-medalg', '#c2410c', '#fff7ed', 'scallop'),
  cert('kind', 'เด็กดีมีน้ำใจ', 'ช่วยเหลือเพื่อนและครูด้วยความเต็มใจ', 'bd-heart', '#db2777', '#fff1f2', 'flowers'),
  cert('green', 'รักษ์โลก', 'แยกขยะ ประหยัดน้ำไฟ ดูแลสิ่งแวดล้อม', 'h-recycle', '#15803d', '#f0fdf4', 'leaves'),
  cert('music', 'ดาวเด่นดนตรี', 'แสดงดนตรีได้อย่างมั่นใจและไพเราะ', 'mu-guitar', '#9333ea', '#faf5ff', 'rainbow'),
  ...['pets', 'ocean', 'space', 'bugs', 'vehicle', 'fruit'].map((id) => nameTags(byId(id))),
  feelCheck,
  feelWeek,
  feelCards,
  ...['fruit', 'wild', 'vehicle', 'weather', 'space', 'ocean', 'bugs', 'sport', 'music', 'body'].map((id) => slide(byId(id))),
  storySheet('farm', 'ฟาร์มของฉัน', ['an-cow', 'an-chick', 'v-tractor'], '#15803d', '#dcfce7'),
  storySheet('sea', 'วันไปทะเล', ['oc-crab', 'oc-shell', 'w-sun'], '#0369a1', '#e0f2fe'),
  storySheet('space', 'ผจญภัยในอวกาศ', ['sp-rocket', 'sp-alien', 'sp-planet'], '#4338ca', '#e0e7ff'),
  storySheet('rain', 'วันฝนตก', ['w-rain', 'w-umbrella', 'w-rainbow'], '#0e7490', '#cffafe'),
  storySheet('party', 'งานวันเกิด', ['fe-cake', 'fe-gift', 'fe-balloons'], '#db2777', '#fce7f3'),
  storySheet('krathong', 'วันลอยกระทง', ['fe-krathong', 'w-moon', 'oc-fish'], '#7c3aed', '#ede9fe'),
];
