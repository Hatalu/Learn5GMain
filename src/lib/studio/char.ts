/**
 * ตัวละครแต่งเองของ Studio (แนวแต่งตัว The Sims แบบการ์ตูน): ข้อมูลล้วน ไม่มี JSX
 * ใช้ทั้งตอนวาด (components/studio/CharArt.tsx) และตอนกรองข้อมูล (doc.ts) ทุกค่าต้องอยู่ในรายการนี้เท่านั้น
 */

export interface Opt {
  id: string;
  label: string;
}
const o = (pairs: [string, string][]): Opt[] => pairs.map(([id, label]) => ({ id, label }));

/** ชนิดตัวละคร: คน หรือสัตว์ (ใช้ตัว เสื้อผ้า เครื่องประดับ และท่าทางชุดเดียวกัน) fur = สีขนหลัก fur2 = สีรอง (ปาก/หูด้านใน/แผงคอ/ลาย) */
export const SPECIES: (Opt & { fur: string; fur2: string })[] = [
  { id: 'human', label: 'คน', fur: '#ffd1aa', fur2: '#ffffff' },
  { id: 'cat', label: 'แมว', fur: '#f6b35e', fur2: '#fff3e0' },
  { id: 'dog', label: 'หมา', fur: '#c98a5a', fur2: '#fff3e0' },
  { id: 'rabbit', label: 'กระต่าย', fur: '#f4f1f6', fur2: '#ffc2d6' },
  { id: 'bear', label: 'หมี', fur: '#a46a3f', fur2: '#e8c39e' },
  { id: 'panda', label: 'แพนด้า', fur: '#ffffff', fur2: '#2a2350' },
  { id: 'fox', label: 'จิ้งจอก', fur: '#f28c38', fur2: '#ffffff' },
  { id: 'pig', label: 'หมู', fur: '#ffc4cf', fur2: '#ff8fab' },
  { id: 'mouse', label: 'หนู', fur: '#b9b6c8', fur2: '#ffc2d6' },
  { id: 'lion', label: 'สิงโต', fur: '#f2b450', fur2: '#b85a1f' },
  { id: 'tiger', label: 'เสือ', fur: '#f59a3a', fur2: '#2a2350' },
  { id: 'monkey', label: 'ลิง', fur: '#a8693d', fur2: '#f3cfa6' },
  { id: 'frog', label: 'กบ', fur: '#7ed37a', fur2: '#ffffff' },
  { id: 'koala', label: 'โคอาล่า', fur: '#a9a9b8', fur2: '#ffffff' },
  { id: 'elephant', label: 'ช้าง', fur: '#a9b4c8', fur2: '#ffc2d6' },
  { id: 'chick', label: 'ลูกเจี๊ยบ', fur: '#ffd84d', fur2: '#ff9a3d' },
  { id: 'penguin', label: 'เพนกวิน', fur: '#2f3557', fur2: '#ffffff' },
];

export const FACES = o([
  ['round', 'กลม'],
  ['oval', 'รี'],
  ['chubby', 'แก้มป่อง'],
]);
export const EYES = o([
  ['dot', 'ตาจุด'],
  ['big', 'ตาโต'],
  ['sparkle', 'ตาวิ้ง'],
  ['happy', 'ยิ้มตาปิด'],
  ['wink', 'ขยิบตา'],
  ['sleepy', 'ง่วง'],
  ['surprised', 'ตกใจ'],
  ['closed', 'หลับตา'],
]);
export const BROWS = o([
  ['none', 'ไม่มี'],
  ['soft', 'ปกติ'],
  ['up', 'เลิกคิ้ว'],
  ['angry', 'มุ่งมั่น'],
  ['worried', 'กังวล'],
]);
export const MOUTHS = o([
  ['smile', 'ยิ้ม'],
  ['grin', 'ยิ้มกว้าง'],
  ['open', 'อ้าปาก'],
  ['small', 'ยิ้มน้อย'],
  ['tongue', 'แลบลิ้น'],
  ['flat', 'เฉย'],
  ['sad', 'เศร้า'],
  ['cat', 'ปากแมว'],
]);
export const HAIRS = o([
  ['short', 'สั้น'],
  ['spiky', 'ตั้งชี้'],
  ['side', 'แสกข้าง'],
  ['bowl', 'ทรงกะลา'],
  ['curly', 'หยิก'],
  ['bob', 'บ๊อบ'],
  ['long', 'ยาวตรง'],
  ['ponytail', 'หางม้า'],
  ['twintails', 'แกละสองข้าง'],
  ['bun', 'มวยผม'],
  ['braids', 'ถักเปีย'],
  ['bald', 'ไม่มีผม'],
]);
export const TOPS = o([
  ['tshirt', 'เสื้อยืด'],
  ['school', 'เสื้อนักเรียน'],
  ['hoodie', 'ฮู้ด'],
  ['sweater', 'สเวตเตอร์ลาย'],
  ['labcoat', 'เสื้อกาวน์'],
  ['dress', 'ชุดกระโปรง'],
  ['overall', 'เอี๊ยม'],
  ['teacher', 'เสื้อครู'],
]);
export const BOTTOMS = o([
  ['pants', 'ขายาว'],
  ['shorts', 'ขาสั้น'],
  ['skirt', 'กระโปรง'],
  ['pleated', 'กระโปรงจีบ'],
]);
export const SHOES = o([
  ['sneakers', 'ผ้าใบ'],
  ['shoes', 'คัทชู'],
  ['boots', 'บูท'],
  ['sandals', 'รองเท้าแตะ'],
]);
export const ACCS = o([
  ['glasses', 'แว่นกลม'],
  ['squares', 'แว่นเหลี่ยม'],
  ['sunglasses', 'แว่นกันแดด'],
  ['cap', 'หมวกแก๊ป'],
  ['beanie', 'หมวกไหมพรม'],
  ['gradcap', 'หมวกรับปริญญา'],
  ['crown', 'มงกุฎ'],
  ['bow', 'โบว์ผม'],
  ['flower', 'ดอกไม้ทัดหู'],
  ['headband', 'ที่คาดผม'],
  ['headphones', 'หูฟัง'],
  ['backpack', 'กระเป๋าเป้'],
  ['book', 'ถือหนังสือ'],
  ['pencil', 'ถือดินสอ'],
  ['flask', 'ถือขวดทดลอง'],
  ['star', 'ถือไม้กายสิทธิ์'],
  ['ball', 'ถือลูกบอล'],
]);
/** ของในมือ: ใส่ได้ทีละ 1 ชิ้น */
export const HELD = ['book', 'pencil', 'flask', 'star', 'ball'];
/** หมวก/มงกุฎ: ใส่ได้ทีละ 1 ชิ้น */
export const HATS = ['cap', 'beanie', 'gradcap', 'crown'];
export const GLASSES = ['glasses', 'squares', 'sunglasses'];
export const LEGS = o([
  ['stand', 'ยืนตรง'],
  ['wide', 'ยืนกางขา'],
  ['jump', 'กระโดด'],
  ['step', 'ก้าวเดิน'],
]);

/** มุมแขน: sh = มุมไหล่ (0 = ห้อยลง, 90 = กางออกด้านข้าง, 180 = ชูขึ้น) el = งอศอก (+ ยกขึ้น/ออก, - พับเข้าตัว) */
export interface Arm {
  sh: number;
  el: number;
}
export const POSES: { id: string; label: string; l: Arm; r: Arm; legs: string }[] = [
  { id: 'stand', label: 'ยืนปกติ', l: { sh: 14, el: 0 }, r: { sh: 14, el: 0 }, legs: 'stand' },
  { id: 'wave', label: 'โบกมือ', l: { sh: 14, el: 0 }, r: { sh: 125, el: 35 }, legs: 'stand' },
  { id: 'cheer', label: 'ชูมือดีใจ', l: { sh: 150, el: 10 }, r: { sh: 150, el: 10 }, legs: 'jump' },
  { id: 'point', label: 'ชี้', l: { sh: 14, el: 0 }, r: { sh: 92, el: 0 }, legs: 'stand' },
  { id: 'think', label: 'คิด', l: { sh: 30, el: -95 }, r: { sh: 22, el: -150 }, legs: 'stand' },
  { id: 'hold', label: 'ถือของ', l: { sh: 22, el: -70 }, r: { sh: 22, el: -70 }, legs: 'stand' },
  { id: 'hips', label: 'เท้าเอว', l: { sh: 42, el: -105 }, r: { sh: 42, el: -105 }, legs: 'wide' },
  { id: 'teach', label: 'อธิบาย', l: { sh: 30, el: -70 }, r: { sh: 70, el: 50 }, legs: 'step' },
  { id: 'run', label: 'วิ่ง', l: { sh: 60, el: 70 }, r: { sh: 30, el: -80 }, legs: 'step' },
  { id: 'hi', label: 'ทักทายสองมือ', l: { sh: 120, el: 40 }, r: { sh: 120, el: 40 }, legs: 'stand' },
];

export interface CharLook {
  species: string;
  /** สีผิว (คน) หรือสีขนหลัก (สัตว์) */
  skin: string;
  fur2: string;
  face: string;
  eyes: string;
  brows: string;
  mouth: string;
  blush: boolean;
  hair: string;
  hairColor: string;
  top: string;
  topColor: string;
  topColor2: string;
  bottom: string;
  bottomColor: string;
  shoes: string;
  shoesColor: string;
  accs: string[];
  accColor: string;
  l: Arm;
  r: Arm;
  legs: string;
}

export const SKINS = ['#ffe0c7', '#ffd1aa', '#f5c08f', '#e3a576', '#c98a5a', '#a86b42', '#7d4b2c', '#ffd9d9'];
export const HAIR_COLORS = ['#2b1d16', '#4a2e1f', '#7a4a2a', '#b07a3c', '#e8c372', '#d9532b', '#8a8a8a', '#f2f2f2', '#ff8fb8', '#7c5cf0', '#3b82f6', '#22a06b'];
export const CLOTH_COLORS = ['#ffffff', '#2a2350', '#1e3a8a', '#3b82f6', '#7cc6ff', '#22a06b', '#6ee7b7', '#ffd166', '#ff9a3d', '#ff6b7a', '#ff8fb8', '#a78bfa', '#7c5cf0', '#b07a4f', '#475569', '#e8456b'];

export const DEFAULT_LOOK: CharLook = {
  species: 'human',
  skin: SKINS[1],
  fur2: '#ffffff',
  face: 'round',
  eyes: 'big',
  brows: 'soft',
  mouth: 'smile',
  blush: true,
  hair: 'short',
  hairColor: HAIR_COLORS[1],
  top: 'school',
  topColor: '#ffffff',
  topColor2: '#1e3a8a',
  bottom: 'shorts',
  bottomColor: '#1e3a8a',
  shoes: 'sneakers',
  shoesColor: '#2a2350',
  accs: [],
  accColor: '#ff6b7a',
  l: { ...POSES[0].l },
  r: { ...POSES[0].r },
  legs: 'stand',
};

const HEX = /^#[0-9a-fA-F]{6}$/;
const pick = (v: unknown, list: Opt[], d: string) => (typeof v === 'string' && list.some((x) => x.id === v) ? v : d);
const col = (v: unknown, d: string) => (typeof v === 'string' && HEX.test(v) ? v : d);
const ang = (v: unknown, d: number, min: number, max: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : d);
const arm = (v: unknown, d: Arm): Arm => {
  const r = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  return { sh: ang(r.sh, d.sh, -30, 180), el: ang(r.el, d.el, -160, 160) };
};

/** กฎใส่ของ: หมวก 1 ใบ แว่น 1 อัน ของในมือ 1 ชิ้น */
export function toggleAcc(list: string[], id: string): string[] {
  if (list.includes(id)) return list.filter((x) => x !== id);
  const group = [HATS, GLASSES, HELD].find((g) => g.includes(id));
  return [...list.filter((x) => !group?.includes(x)), id].slice(-6);
}

export function cleanLook(raw: unknown): CharLook {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const d = DEFAULT_LOOK;
  let accs: string[] = [];
  if (Array.isArray(r.accs)) for (const a of r.accs.slice(0, 8)) if (typeof a === 'string' && ACCS.some((x) => x.id === a) && !accs.includes(a)) accs = toggleAcc(accs, a);
  return {
    species: pick(r.species, SPECIES, d.species),
    skin: col(r.skin, d.skin),
    fur2: col(r.fur2, d.fur2),
    face: pick(r.face, FACES, d.face),
    eyes: pick(r.eyes, EYES, d.eyes),
    brows: pick(r.brows, BROWS, d.brows),
    mouth: pick(r.mouth, MOUTHS, d.mouth),
    blush: r.blush !== false,
    hair: pick(r.hair, HAIRS, d.hair),
    hairColor: col(r.hairColor, d.hairColor),
    top: pick(r.top, TOPS, d.top),
    topColor: col(r.topColor, d.topColor),
    topColor2: col(r.topColor2, d.topColor2),
    bottom: pick(r.bottom, BOTTOMS, d.bottom),
    bottomColor: col(r.bottomColor, d.bottomColor),
    shoes: pick(r.shoes, SHOES, d.shoes),
    shoesColor: col(r.shoesColor, d.shoesColor),
    accs,
    accColor: col(r.accColor, d.accColor),
    l: arm(r.l, d.l),
    r: arm(r.r, d.r),
    legs: pick(r.legs, LEGS, d.legs),
  };
}

/** เปลี่ยนชนิดตัวละคร: ใช้สีขนตั้งต้นของชนิดนั้น สัตว์เริ่มแบบไม่มีผม (เพิ่มผมเองได้) */
export function withSpecies(look: CharLook, id: string): CharLook {
  const sp = SPECIES.find((x) => x.id === id) ?? SPECIES[0];
  const human = sp.id === 'human';
  return cleanLook({
    ...look,
    species: sp.id,
    skin: human ? (look.species === 'human' ? look.skin : SKINS[1]) : sp.fur,
    fur2: sp.fur2,
    hair: human ? (look.hair === 'bald' ? 'short' : look.hair) : 'bald',
  });
}

const rnd = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
function randomHuman(): CharLook {
  const pose = rnd(POSES);
  const top = rnd(TOPS).id;
  return cleanLook({
    skin: rnd(SKINS),
    face: rnd(FACES).id,
    eyes: rnd(EYES).id,
    brows: rnd(BROWS).id,
    mouth: rnd(MOUTHS.filter((m) => m.id !== 'sad')).id,
    blush: Math.random() > 0.3,
    hair: rnd(HAIRS.filter((h) => h.id !== 'bald')).id,
    hairColor: rnd(HAIR_COLORS),
    top,
    topColor: rnd(CLOTH_COLORS),
    topColor2: rnd(CLOTH_COLORS),
    bottom: rnd(BOTTOMS).id,
    bottomColor: rnd(CLOTH_COLORS),
    shoes: rnd(SHOES).id,
    shoesColor: rnd(CLOTH_COLORS),
    accs: Math.random() > 0.5 ? [rnd(ACCS).id] : [],
    accColor: rnd(CLOTH_COLORS),
    l: pose.l,
    r: pose.r,
    legs: pose.legs,
  });
}
export function randomLook(): CharLook {
  const base = randomHuman();
  return Math.random() < 0.45 ? withSpecies(base, rnd(SPECIES.slice(1)).id) : base;
}

/** ตัวละครสำเร็จรูป (กดใส่ได้ทันที แล้วค่อยแต่งต่อ) */
export const CHAR_PRESETS: { id: string; label: string; look: CharLook }[] = [
  { id: 'boy', label: 'นักเรียนชาย', look: cleanLook({ ...DEFAULT_LOOK }) },
  { id: 'girl', label: 'นักเรียนหญิง', look: cleanLook({ ...DEFAULT_LOOK, hair: 'twintails', hairColor: '#2b1d16', bottom: 'pleated', bottomColor: '#1e3a8a', shoes: 'shoes', accColor: '#e8456b', eyes: 'sparkle', l: POSES[1].l, r: POSES[1].r }) },
  { id: 'teacherF', label: 'คุณครู (หญิง)', look: cleanLook({ ...DEFAULT_LOOK, hair: 'bob', hairColor: '#4a2e1f', top: 'teacher', topColor: '#fef3c7', topColor2: '#7c5cf0', bottom: 'skirt', bottomColor: '#475569', shoes: 'shoes', accs: ['glasses'], mouth: 'smile', l: POSES[7].l, r: POSES[7].r, legs: 'step' }) },
  { id: 'teacherM', label: 'คุณครู (ชาย)', look: cleanLook({ ...DEFAULT_LOOK, hair: 'side', hairColor: '#2b1d16', top: 'teacher', topColor: '#7cc6ff', topColor2: '#1e3a8a', bottom: 'pants', bottomColor: '#2a2350', shoes: 'shoes', accs: ['squares', 'book'], l: POSES[5].l, r: POSES[5].r }) },
  { id: 'scientist', label: 'นักวิทยาศาสตร์', look: cleanLook({ ...DEFAULT_LOOK, hair: 'curly', hairColor: '#7a4a2a', top: 'labcoat', topColor2: '#7cc6ff', bottom: 'pants', bottomColor: '#475569', accs: ['glasses', 'flask'], accColor: '#6ee7b7', mouth: 'grin', l: POSES[3].l, r: POSES[5].r }) },
  { id: 'grad', label: 'บัณฑิต', look: cleanLook({ ...DEFAULT_LOOK, hair: 'long', hairColor: '#2b1d16', top: 'dress', topColor: '#2a2350', topColor2: '#ffd166', accs: ['gradcap'], accColor: '#ffd166', eyes: 'happy', mouth: 'grin', l: POSES[2].l, r: POSES[2].r, legs: 'jump' }) },
  { id: 'sport', label: 'นักกีฬา', look: cleanLook({ ...DEFAULT_LOOK, hair: 'spiky', hairColor: '#2b1d16', top: 'tshirt', topColor: '#ff6b7a', bottom: 'shorts', bottomColor: '#2a2350', shoes: 'sneakers', shoesColor: '#ffffff', accs: ['cap', 'ball'], accColor: '#ff9a3d', brows: 'angry', mouth: 'grin', l: POSES[8].l, r: POSES[8].r, legs: 'step' }) },
  { id: 'reader', label: 'หนอนหนังสือ', look: cleanLook({ ...DEFAULT_LOOK, hair: 'bun', hairColor: '#b07a3c', top: 'sweater', topColor: '#a78bfa', topColor2: '#ffffff', bottom: 'pants', bottomColor: '#1e3a8a', accs: ['glasses', 'book'], accColor: '#ff8fb8', eyes: 'dot', l: POSES[5].l, r: POSES[5].r }) },
];

const pet = (id: string, over: Partial<CharLook>) => cleanLook({ ...withSpecies(DEFAULT_LOOK, id), ...over });
/** สัตว์สำเร็จรูป */
export const ANIMAL_PRESETS: { id: string; label: string; look: CharLook }[] = [
  { id: 'catStudent', label: 'น้องแมวนักเรียน', look: pet('cat', { eyes: 'sparkle', bottom: 'pleated', shoes: 'shoes', accs: ['bow'], accColor: '#ff6b7a', l: POSES[1].l, r: POSES[1].r }) },
  { id: 'dogTeacher', label: 'คุณครูหมา', look: pet('dog', { top: 'teacher', topColor: '#7cc6ff', topColor2: '#1e3a8a', bottom: 'pants', bottomColor: '#2a2350', shoes: 'shoes', accs: ['squares', 'book'], accColor: '#ff9a3d', l: POSES[7].l, r: POSES[7].r, legs: 'step' }) },
  { id: 'rabbitReader', label: 'กระต่ายนักอ่าน', look: pet('rabbit', { top: 'sweater', topColor: '#ff8fb8', topColor2: '#ffffff', bottom: 'skirt', bottomColor: '#a78bfa', accs: ['book'], accColor: '#7c5cf0', eyes: 'happy', l: POSES[5].l, r: POSES[5].r }) },
  { id: 'bearScientist', label: 'หมีนักวิทยาศาสตร์', look: pet('bear', { top: 'labcoat', topColor2: '#6ee7b7', bottom: 'pants', bottomColor: '#475569', accs: ['glasses', 'flask'], accColor: '#6ee7b7', mouth: 'grin', l: POSES[3].l, r: POSES[5].r }) },
  { id: 'pandaSport', label: 'แพนด้านักกีฬา', look: pet('panda', { top: 'tshirt', topColor: '#22a06b', bottom: 'shorts', bottomColor: '#2a2350', shoesColor: '#ffffff', accs: ['headband', 'ball'], accColor: '#ff6b7a', brows: 'angry', mouth: 'grin', l: POSES[8].l, r: POSES[8].r, legs: 'step' }) },
  { id: 'foxGrad', label: 'จิ้งจอกบัณฑิต', look: pet('fox', { top: 'dress', topColor: '#2a2350', topColor2: '#ffd166', accs: ['gradcap'], accColor: '#ffd166', eyes: 'happy', mouth: 'grin', l: POSES[2].l, r: POSES[2].r, legs: 'jump' }) },
  { id: 'frogExplorer', label: 'กบนักสำรวจ', look: pet('frog', { top: 'overall', topColor2: '#ffd166', bottomColor: '#3b82f6', shoes: 'boots', shoesColor: '#ff9a3d', accs: ['flask'], accColor: '#7cc6ff', mouth: 'open', l: POSES[1].l, r: POSES[1].r }) },
  { id: 'chickKid', label: 'ลูกเจี๊ยบตัวน้อย', look: pet('chick', { top: 'tshirt', topColor: '#7cc6ff', bottom: 'shorts', bottomColor: '#ff6b7a', accs: ['backpack'], accColor: '#7c5cf0', eyes: 'sparkle', l: POSES[9].l, r: POSES[9].r }) },
  { id: 'lionKing', label: 'สิงโตจ้าวป่า', look: pet('lion', { top: 'hoodie', topColor: '#e8456b', bottom: 'pants', bottomColor: '#2a2350', accs: ['crown'], mouth: 'grin', brows: 'up', l: POSES[6].l, r: POSES[6].r, legs: 'wide' }) },
  { id: 'elephantArtist', label: 'ช้างนักวาด', look: pet('elephant', { top: 'overall', topColor2: '#ffffff', bottomColor: '#7c5cf0', accs: ['beanie', 'pencil'], accColor: '#ff6b7a', l: POSES[3].l, r: POSES[3].r }) },
  { id: 'monkeyFun', label: 'ลิงจอมซน', look: pet('monkey', { top: 'tshirt', topColor: '#ffd166', bottom: 'shorts', bottomColor: '#22a06b', accs: ['cap', 'star'], accColor: '#ff9a3d', mouth: 'tongue', eyes: 'wink', l: POSES[2].l, r: POSES[2].r, legs: 'jump' }) },
  { id: 'penguinCool', label: 'เพนกวินเท่ๆ', look: pet('penguin', { top: 'hoodie', topColor: '#7cc6ff', bottom: 'pants', bottomColor: '#2a2350', shoesColor: '#ff9a3d', accs: ['sunglasses', 'headphones'], accColor: '#ff6b7a', l: POSES[0].l, r: POSES[0].r }) },
];
