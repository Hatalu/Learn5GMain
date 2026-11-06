/** ปริศนาประจำวัน: วันเดียวกัน + ระดับเดียวกัน = โจทย์เดียวกันทุกเครื่อง คำนวณในเครื่อง ไม่ต้องใช้เซิร์ฟเวอร์ */
import { seeded, shuffled } from './missions';
import type { SubjKey } from './logic';

export type PuzzleLevel = 1 | 2 | 3;
export const PUZZLE_LEVELS: { id: PuzzleLevel; label: string; sub: string }[] = [
  { id: 1, label: 'ระดับดาวน้อย', sub: 'ป.1-2' },
  { id: 2, label: 'ระดับดาวกลาง', sub: 'ป.3-4' },
  { id: 3, label: 'ระดับดาวใหญ่', sub: 'ป.5-6' },
];
export const PUZZLE_SECONDS = 60;
export const PUZZLE_COUNT = 5;

export interface PuzzleQ {
  kind: 'seq' | 'miss' | 'odd' | 'word' | 'fact';
  subj: SubjKey;
  tag: string;
  prompt: string;
  /** ตัวเลือก (word = ตัวอักษรสลับที่ให้เรียง) */
  choices: string[];
  answer: string;
  hint: string;
}

const int = (r: () => number, lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));

/** ตัวเลือกเลขใกล้เคียง 4 ตัว ไม่ซ้ำ ไม่ติดลบ */
function numChoices(r: () => number, ans: number): string[] {
  const set = new Set([ans]);
  const span = Math.max(3, Math.round(Math.abs(ans) * 0.25));
  let guard = 0;
  while (set.size < 4 && guard++ < 60) {
    const v = ans + int(r, -span, span);
    if (v >= 0 && v !== ans) set.add(v);
  }
  for (let v = ans + 1; set.size < 4; v++) set.add(v);
  return shuffled(Array.from(set).map(String), r);
}

export function makeSeq(r: () => number, lv: PuzzleLevel): PuzzleQ {
  let seq: number[];
  let hint: string;
  const type = int(r, 0, lv === 1 ? 1 : lv === 2 ? 2 : 3);
  if (type === 0) {
    const st = lv === 1 ? [2, 5, 10][int(r, 0, 2)] : lv === 2 ? int(r, 3, 12) : int(r, 6, 25);
    const a = int(r, 1, 9) * st;
    seq = [0, 1, 2, 3, 4].map((i) => a + i * st);
    hint = `เพิ่มทีละ ${st}`;
  } else if (type === 1) {
    const st = lv === 1 ? [1, 2][int(r, 0, 1)] : int(r, 2, 9);
    const end = int(r, 2, 20);
    seq = [4, 3, 2, 1, 0].map((i) => end + i * st);
    hint = `ลดทีละ ${st}`;
  } else if (type === 2) {
    const a = int(r, 1, lv === 2 ? 3 : 5);
    const k = lv === 2 ? 2 : int(r, 2, 3);
    seq = [0, 1, 2, 3, 4].map((i) => a * k ** i);
    hint = `คูณ ${k} ทุกครั้ง`;
  } else {
    let a = int(r, 1, 6);
    let d = int(r, 1, 3);
    seq = [];
    for (let i = 0; i < 5; i++) {
      seq.push(a);
      a += d;
      d += 1;
    }
    hint = 'ระยะห่างเพิ่มทีละ 1';
  }
  const ans = seq[4];
  return { kind: 'seq', subj: 'm', tag: 'ลำดับตัวเลข', prompt: `${seq.slice(0, 4).join(' , ')} , ?`, choices: numChoices(r, ans), answer: String(ans), hint };
}

export function makeMiss(r: () => number, lv: PuzzleLevel): PuzzleQ {
  let prompt: string;
  let ans: number;
  let hint: string;
  if (lv === 1) {
    ans = int(r, 2, 15);
    const a = int(r, 2, 20);
    if (r() < 0.5) {
      prompt = `${a} + ? = ${a + ans}`;
      hint = `ลองนับจาก ${a} ขึ้นไป`;
    } else {
      prompt = `${a + ans} - ? = ${a}`;
      hint = `ลองนับจาก ${a} ขึ้นไปให้ถึง ${a + ans}`;
    }
  } else if (lv === 2) {
    const a = int(r, 3, 12);
    ans = int(r, 2, 12);
    if (r() < 0.5) {
      prompt = `${a} x ? = ${a * ans}`;
      hint = `สูตรคูณแม่ ${a}`;
    } else {
      prompt = `${a * ans} / ? = ${a}`;
      hint = `${a} คูณอะไรได้ ${a * ans}`;
    }
  } else {
    const a = int(r, 3, 9);
    const b = int(r, 2, 15);
    ans = int(r, 2, 12);
    prompt = `${a} x ? + ${b} = ${a * ans + b}`;
    hint = `เอา ${b} ออกก่อน แล้วหารด้วย ${a}`;
  }
  return { kind: 'miss', subj: 'm', tag: 'เติมเลขที่หายไป', prompt, choices: numChoices(r, ans), answer: String(ans), hint };
}

const ODD_GROUPS: { name: string; words: string[] }[] = [
  { name: 'สัตว์', words: ['แมว', 'ช้าง', 'เป็ด', 'ปลา', 'เสือ', 'กระต่าย', 'ม้า'] },
  { name: 'ผลไม้', words: ['กล้วย', 'ส้ม', 'มะม่วง', 'องุ่น', 'แตงโม', 'เงาะ', 'ทุเรียน'] },
  { name: 'ยานพาหนะ', words: ['รถไฟ', 'เรือ', 'จักรยาน', 'เครื่องบิน', 'รถบัส', 'เฮลิคอปเตอร์'] },
  { name: 'เครื่องเขียน', words: ['ดินสอ', 'ยางลบ', 'ไม้บรรทัด', 'สมุด', 'ปากกา', 'กบเหลา'] },
  { name: 'ดาวเคราะห์', words: ['ดาวอังคาร', 'ดาวพุธ', 'ดาวศุกร์', 'ดาวเสาร์', 'ดาวพฤหัสบดี', 'โลก'] },
  { name: 'อวัยวะในร่างกาย', words: ['หัวใจ', 'ปอด', 'ตับ', 'สมอง', 'กระเพาะอาหาร', 'ไต'] },
  { name: 'รูปทรงเรขาคณิต', words: ['วงกลม', 'สามเหลี่ยม', 'สี่เหลี่ยม', 'ห้าเหลี่ยม', 'วงรี', 'หกเหลี่ยม'] },
  { name: 'เครื่องดนตรี', words: ['กลอง', 'กีตาร์', 'ระนาด', 'ขลุ่ย', 'เปียโน', 'ไวโอลิน'] },
  { name: 'อาชีพ', words: ['ครู', 'หมอ', 'ตำรวจ', 'ชาวนา', 'พยาบาล', 'นักบิน'] },
  { name: 'สี', words: ['แดง', 'เหลือง', 'เขียว', 'ฟ้า', 'ม่วง', 'ชมพู'] },
];

export function makeOdd(r: () => number): PuzzleQ {
  const g = shuffled(ODD_GROUPS, r);
  const main = shuffled(g[0].words, r).slice(0, 3);
  const odd = shuffled(g[1].words, r)[0];
  return { kind: 'odd', subj: 't', tag: 'ตัวไหนไม่เข้าพวก', prompt: 'คำไหนต่างจากพวก', choices: shuffled([...main, odd], r), answer: odd, hint: `อีก 3 คำคือ${g[0].name}` };
}

const WORDS: Record<PuzzleLevel, [string, string][]> = {
  1: [['CAT', 'แมว'], ['DOG', 'สุนัข'], ['SUN', 'ดวงอาทิตย์'], ['RED', 'สีแดง'], ['PEN', 'ปากกา'], ['BUS', 'รถบัส'], ['BED', 'เตียง'], ['EGG', 'ไข่'], ['HAT', 'หมวก'], ['MILK', 'นม'], ['FISH', 'ปลา'], ['BOOK', 'หนังสือ'], ['BIRD', 'นก'], ['TREE', 'ต้นไม้'], ['DUCK', 'เป็ด'], ['RICE', 'ข้าว'], ['MOON', 'ดวงจันทร์'], ['HAND', 'มือ']],
  2: [['APPLE', 'แอปเปิล'], ['HOUSE', 'บ้าน'], ['WATER', 'น้ำ'], ['TIGER', 'เสือ'], ['CHAIR', 'เก้าอี้'], ['TABLE', 'โต๊ะ'], ['GREEN', 'สีเขียว'], ['MOUSE', 'หนู'], ['SHIRT', 'เสื้อ'], ['TRAIN', 'รถไฟ'], ['MONKEY', 'ลิง'], ['SCHOOL', 'โรงเรียน'], ['FLOWER', 'ดอกไม้'], ['ORANGE', 'ส้ม'], ['RABBIT', 'กระต่าย'], ['FRIEND', 'เพื่อน'], ['SISTER', 'พี่สาว น้องสาว'], ['WINDOW', 'หน้าต่าง']],
  3: [['TEACHER', 'ครู'], ['KITCHEN', 'ห้องครัว'], ['PICTURE', 'รูปภาพ'], ['ELEPHANT', 'ช้าง'], ['MOUNTAIN', 'ภูเขา'], ['SANDWICH', 'แซนด์วิช'], ['HOSPITAL', 'โรงพยาบาล'], ['COMPUTER', 'คอมพิวเตอร์'], ['BIRTHDAY', 'วันเกิด'], ['SCIENCE', 'วิทยาศาสตร์'], ['HOLIDAY', 'วันหยุด'], ['WEATHER', 'อากาศ'], ['BUTTERFLY', 'ผีเสื้อ'], ['LIBRARY', 'ห้องสมุด'], ['VILLAGE', 'หมู่บ้าน'], ['ANIMALS', 'สัตว์หลายตัว'], ['PLANETS', 'ดาวเคราะห์'], ['RAINBOW', 'รุ้ง']],
};

export function makeWord(r: () => number, lv: PuzzleLevel): PuzzleQ {
  const [w, th] = WORDS[lv][int(r, 0, WORDS[lv].length - 1)];
  let tiles = shuffled(w.split(''), r);
  for (let i = 0; i < 5 && tiles.join('') === w; i++) tiles = shuffled(w.split(''), r);
  return { kind: 'word', subj: 'e', tag: 'เรียงคำอังกฤษ', prompt: `แปลว่า "${th}"`, choices: tiles, answer: w, hint: `ขึ้นต้นด้วย ${w[0]}` };
}

const FACTS: Record<PuzzleLevel, [string, string, string, string, string, string][]> = {
  1: [
    ['พืชต้องใช้อะไรเพื่อเติบโต', 'แสงแดดและน้ำ', 'ก้อนหิน', 'พลาสติก', 'ทราย', 'ลองนึกถึงตอนรดน้ำต้นไม้'],
    ['ใช้อวัยวะใดดมกลิ่น', 'จมูก', 'หู', 'ตา', 'มือ', 'อยู่กลางใบหน้า'],
    ['กลางคืนเราเห็นอะไรบนท้องฟ้า', 'ดวงจันทร์', 'รุ้ง', 'เมฆฝน', 'พระอาทิตย์', 'มีแสงนวล เปลี่ยนรูปร่างได้'],
    ['สัตว์ชนิดใดออกลูกเป็นไข่', 'ไก่', 'แมว', 'สุนัข', 'วัว', 'สัตว์มีปีก'],
    ['น้ำแข็งเมื่อโดนความร้อนจะเป็นอะไร', 'น้ำ', 'หิน', 'ไม้', 'ดิน', 'ลองนึกถึงน้ำแข็งในแก้ว'],
    ['ควรแปรงฟันวันละกี่ครั้ง', '2 ครั้ง', '1 สัปดาห์ครั้ง', '1 เดือนครั้ง', 'ไม่ต้องแปรง', 'เช้ากับก่อนนอน'],
    ['ผีเสื้อตอนเด็กคือตัวอะไร', 'หนอน', 'ลูกอ๊อด', 'ลูกเจี๊ยบ', 'ปลา', 'มันชอบกินใบไม้'],
    ['ฝนตกลงมาจากอะไร', 'เมฆ', 'ดวงดาว', 'ต้นไม้', 'ภูเขา', 'ลอยอยู่บนฟ้า'],
    ['ปลาหายใจด้วยอะไร', 'เหงือก', 'จมูก', 'หาง', 'ครีบ', 'อยู่ข้างหัวปลา'],
    ['หนึ่งสัปดาห์มีกี่วัน', '7 วัน', '5 วัน', '10 วัน', '12 วัน', 'นับจันทร์ถึงอาทิตย์'],
  ],
  2: [
    ['ดาวเคราะห์ใดอยู่ใกล้ดวงอาทิตย์ที่สุด', 'ดาวพุธ', 'โลก', 'ดาวอังคาร', 'ดาวเสาร์', 'ชื่อตรงกับวันหนึ่งในสัปดาห์'],
    ['พืชปล่อยก๊าซอะไรออกมาตอนสังเคราะห์แสง', 'ออกซิเจน', 'คาร์บอนไดออกไซด์', 'ไนโตรเจน', 'ฮีเลียม', 'ก๊าซที่เราใช้หายใจ'],
    ['แม่เหล็กดูดวัตถุใดได้', 'ตะปูเหล็ก', 'ยางลบ', 'แก้ว', 'กระดาษ', 'ทำจากเหล็ก'],
    ['น้ำเดือดที่อุณหภูมิกี่องศาเซลเซียส', '100', '50', '0', '200', 'เป็นเลขสามหลักที่กลมที่สุด'],
    ['สิ่งใดเป็นแหล่งพลังงานหลักของโลก', 'ดวงอาทิตย์', 'ดวงจันทร์', 'ลม', 'ก้อนเมฆ', 'มอบแสงและความร้อน'],
    ['ฟันของคนใช้ทำอะไรเป็นหลัก', 'บดเคี้ยวอาหาร', 'หายใจ', 'ได้ยินเสียง', 'มองเห็น', 'ทำงานตอนกินข้าว'],
    ['ไอน้ำควบแน่นจะกลายเป็นอะไร', 'หยดน้ำ', 'น้ำแข็งก้อนใหญ่', 'ก้อนหิน', 'อากาศ', 'เห็นได้ที่ข้างแก้วน้ำเย็น'],
    ['สัตว์ข้อใดเป็นสัตว์เลี้ยงลูกด้วยนม', 'วาฬ', 'ฉลาม', 'เต่าทะเล', 'จระเข้', 'อยู่ในทะเลแต่ขึ้นมาหายใจ'],
    ['อวัยวะใดสูบฉีดเลือด', 'หัวใจ', 'ปอด', 'ตับ', 'กระเพาะ', 'เต้นตลอดเวลา'],
    ['เงาเกิดเมื่อแสงโดนอะไร', 'วัตถุทึบแสง', 'กระจกใส', 'อากาศ', 'น้ำใส', 'แสงผ่านไปไม่ได้'],
  ],
  3: [
    ['แรงที่ดึงของตกลงพื้นคือแรงอะไร', 'แรงโน้มถ่วง', 'แรงเสียดทาน', 'แรงแม่เหล็ก', 'แรงลอยตัว', 'นิวตันกับลูกแอปเปิล'],
    ['ส่วนใดของพืชที่สังเคราะห์แสงมากที่สุด', 'ใบ', 'ราก', 'ดอก', 'เมล็ด', 'มีสีเขียว'],
    ['โลกหมุนรอบตัวเองครบ 1 รอบใช้เวลาเท่าใด', 'ประมาณ 1 วัน', '1 เดือน', '1 ปี', '1 ชั่วโมง', 'ทำให้เกิดกลางวันกลางคืน'],
    ['สารใดเป็นตัวนำไฟฟ้าที่ดี', 'ทองแดง', 'ยาง', 'แก้ว', 'ไม้แห้ง', 'ใช้ทำแกนสายไฟ'],
    ['เส้นเลือดฝอยที่ปอดแลกเปลี่ยนอะไร', 'ออกซิเจนและคาร์บอนไดออกไซด์', 'น้ำตาล', 'เกลือ', 'ไขมัน', 'เกี่ยวกับการหายใจ'],
    ['น้ำระเหยเป็นไอเพราะได้รับอะไร', 'ความร้อน', 'ความเย็น', 'เสียง', 'แม่เหล็ก', 'เกิดเร็วกลางแดด'],
    ['ดาวเคราะห์ที่ใหญ่ที่สุดในระบบสุริยะคือ', 'ดาวพฤหัสบดี', 'โลก', 'ดาวอังคาร', 'ดาวศุกร์', 'มีจุดแดงใหญ่'],
    ['ห่วงโซ่อาหารเริ่มต้นจากสิ่งใด', 'ผู้ผลิต เช่น พืช', 'ผู้ล่า', 'เสือ', 'มนุษย์', 'สร้างอาหารเองได้'],
    ['เสียงเดินทางผ่านอะไรไม่ได้', 'สุญญากาศ', 'น้ำ', 'อากาศ', 'เหล็ก', 'เช่นในอวกาศ'],
    ['หินเกิดจากลาวาเย็นตัวเรียกว่าอะไร', 'หินอัคนี', 'หินตะกอน', 'หินแปร', 'หินปูน', 'คำว่าอัคนีแปลว่าไฟ'],
  ],
};

export function makeFact(r: () => number, lv: PuzzleLevel): PuzzleQ {
  const [q, a, b, c, d, hint] = FACTS[lv][int(r, 0, FACTS[lv].length - 1)];
  return { kind: 'fact', subj: 's', tag: 'รู้รอบวิทย์', prompt: q, choices: shuffled([a, b, c, d], r), answer: a, hint };
}

/** โจทย์ของวันนั้น เรียงลำดับตามเมล็ดเดียวกัน */
export function dailyPuzzle(date: string, lv: PuzzleLevel): PuzzleQ[] {
  const r = seeded(`puzzle:${date}:${lv}`);
  return shuffled([makeSeq(r, lv), makeMiss(r, lv), makeOdd(r), makeWord(r, lv), makeFact(r, lv)], r);
}

/** โจทย์สุ่มสำหรับมินิเกมลูกโป่ง (ตัวเลือกสั้น ไม่มีเรียงคำ) */
export function balloonQ(r: () => number, lv: PuzzleLevel): PuzzleQ {
  const k = r();
  return k < 0.4 ? makeMiss(r, lv) : k < 0.75 ? makeSeq(r, lv) : makeOdd(r);
}

/** เลขของปริศนา: วันเริ่มต้น = ฉบับที่ 1 */
export function puzzleNumber(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return Math.floor((Date.UTC(y, m - 1, d) - Date.UTC(2026, 10, 1)) / 86400000) + 1;
}

/** คะแนน: ถูกครั้งแรก 100 ถูกครั้งที่สอง 50 + เวลาที่เหลือ */
export function puzzleScore(marks: string, secsUsed: number): number {
  let n = 0;
  for (const c of marks) n += c === '2' ? 100 : c === '1' ? 50 : 0;
  return n + Math.max(0, PUZZLE_SECONDS - Math.floor(secsUsed));
}

/** ข้อความแชร์: สี่เหลี่ยมเป็นอักขระธรรมดา ไม่ใช่อิโมจิ */
export function shareText(date: string, lv: PuzzleLevel, marks: string, secs: number): string {
  const row = marks.split('').map((c) => (c === '2' ? '■' : c === '1' ? '▣' : '□')).join('');
  const label = PUZZLE_LEVELS.find((l) => l.id === lv)!;
  return `ปริศนา 5G ฉบับที่ ${puzzleNumber(date)} (${label.sub})\n${row}  ${puzzleScore(marks, secs)} คะแนน\nใครเก่งกว่ามาท้ากัน learn5g-th.online/puzzle`;
}
