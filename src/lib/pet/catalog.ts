/** รายการของในห้องเลี้ยงปุ๋ง: ชุด ห้อง อาหาร ซีซัน (ข้อมูลล้วน ภาพอยู่ components/pet) */

export type WearSlot = 'hat' | 'face' | 'body' | 'back';
export type RoomSlot = 'wall' | 'floor' | 'rug' | 'sofa' | 'tv' | 'lamp' | 'pic' | 'toy' | 'fest';
export type Slot = WearSlot | RoomSlot;

export interface PetItem {
  id: string;
  label: string;
  slot: Slot;
  price: number;
  /** เลเวลขั้นต่ำที่ซื้อได้ */
  lv?: number;
  /** ได้จากซีซันเท่านั้น ซื้อไม่ได้ */
  season?: number;
  /** สติกเกอร์ของ Studio ที่ใช้เป็นภาพ */
  sticker?: string;
}

const wear = (slot: WearSlot, rows: [string, string, number, number?][]): PetItem[] =>
  rows.map(([id, label, price, lv]) => ({ id, label, slot, price, lv }));
const room = (slot: RoomSlot, rows: [string, string, number, number?, string?][]): PetItem[] =>
  rows.map(([id, label, price, lv, sticker]) => ({ id, label, slot, price, lv, sticker }));

/** ของ 4 ชิ้นเดิมปลดด้วยเงื่อนไขเดิม (unlockedHats) ราคา 0 ซื้อไม่ได้ */
export const LEGACY_WEAR: Record<string, WearSlot> = { cap: 'hat', crown: 'hat', glasses: 'face', cape: 'back' };

export const ITEMS: PetItem[] = [
  { id: 'cap', label: 'หมวกนักผจญภัย', slot: 'hat', price: 0 },
  { id: 'crown', label: 'มงกุฎดาว', slot: 'hat', price: 0 },
  { id: 'glasses', label: 'แว่นนักคิด', slot: 'face', price: 0 },
  { id: 'cape', label: 'ผ้าคลุมฮีโร่', slot: 'back', price: 0 },

  ...wear('hat', [
    ['h-bow', 'โบว์น่ารัก', 8],
    ['h-flower', 'ดอกไม้บนหัว', 10],
    ['h-beanie', 'หมวกไหมพรม', 15],
    ['h-straw', 'หมวกฟาง', 18, 2],
    ['h-cat', 'หูแมว', 20, 2],
    ['h-headset', 'หูฟังดีเจ', 25, 3],
    ['h-chef', 'หมวกเชฟ', 30, 3],
    ['h-grad', 'หมวกบัณฑิต', 45, 5],
    ['h-wizard', 'หมวกพ่อมด', 55, 6],
    ['h-astro', 'หมวกนักบินอวกาศ', 80, 8],
  ]),
  ...wear('face', [
    ['g-round', 'แว่นกลม', 8],
    ['g-sun', 'แว่นกันแดด', 15, 2],
    ['g-star', 'แว่นดาว', 22, 3],
    ['g-stache', 'หนวดเท่', 12],
    ['g-mask', 'หน้ากากฮีโร่', 35, 4],
  ]),
  ...wear('body', [
    ['b-tee', 'เสื้อยืด', 10],
    ['b-stripe', 'เสื้อลายทาง', 14],
    ['b-overall', 'เอี๊ยมยีนส์', 20, 2],
    ['b-uniform', 'ชุดนักเรียน', 24, 2],
    ['b-sport', 'ชุดกีฬา', 26, 3],
    ['b-pajama', 'ชุดนอนดาว', 28, 3],
    ['b-dress', 'กระโปรงบาน', 32, 3],
    ['b-suit', 'สูทผูกโบว์', 40, 4],
    ['b-lab', 'เสื้อกาวน์นักวิทย์', 45, 5],
    ['b-hero', 'ชุดฮีโร่', 70, 7],
  ]),
  ...wear('back', [
    ['k-bag', 'กระเป๋าเป้', 15],
    ['k-butter', 'ปีกผีเสื้อ', 30, 3],
    ['k-angel', 'ปีกนางฟ้า', 45, 5],
    ['k-dragon', 'ปีกมังกร', 60, 6],
    ['k-jet', 'จรวดติดหลัง', 90, 9],
  ]),

  ...room('wall', [
    ['wa-sky', 'ผนังฟ้าใส', 0],
    ['wa-mint', 'ผนังมิ้นต์จุด', 10],
    ['wa-peach', 'ผนังพีชลายทาง', 12],
    ['wa-grape', 'ผนังม่วงดาว', 18, 2],
    ['wa-sun', 'ผนังเหลืองหัวใจ', 18, 2],
    ['wa-brick', 'ผนังอิฐ', 28, 3],
    ['wa-forest', 'ผนังป่าไม้', 36, 4],
    ['wa-space', 'ผนังอวกาศ', 60, 6],
  ]),
  ...room('floor', [
    ['fl-wood', 'พื้นไม้', 0],
    ['fl-check', 'พื้นตาราง', 10],
    ['fl-cream', 'พื้นครีม', 12],
    ['fl-grass', 'พื้นหญ้า', 22, 2],
    ['fl-cloud', 'พื้นเมฆ', 40, 5],
  ]),
  ...room('rug', [
    ['ru-round', 'พรมวงกลม', 0],
    ['ru-star', 'พรมดาว', 16],
    ['ru-rainbow', 'พรมสายรุ้ง', 26, 3],
    ['ru-flower', 'พรมดอกไม้', 26, 3],
    ['ru-math', 'พรมตัวเลข', 34, 4],
  ]),
  ...room('sofa', [
    ['so-orange', 'เก้าอี้สีส้ม', 0],
    ['so-blue', 'โซฟาฟ้า', 25, 2],
    ['so-bean', 'บีนแบ็ก', 30, 3],
    ['so-bed', 'เตียงนุ่ม', 50, 4],
    ['so-cloud', 'โซฟาเมฆ', 70, 7],
  ]),
  ...room('tv', [
    ['tv-old', 'ทีวีสีเขียว', 0],
    ['tv-shelf', 'ชั้นหนังสือ', 25, 2],
    ['tv-desk', 'โต๊ะเรียน', 30, 3, 'h-desk'],
    ['tv-pc', 'คอมพิวเตอร์', 45, 4, 'h-computer'],
    ['tv-piano', 'เปียโน', 60, 6, 'mu-piano'],
  ]),
  ...room('lamp', [
    ['la-ball', 'โคมกลม', 0],
    ['la-star', 'โคมดาว', 16, 2],
    ['la-moon', 'โคมจันทร์', 24, 3],
    ['la-chand', 'โคมระย้า', 50, 6],
  ]),
  ...room('pic', [
    ['pi-sun', 'ภาพพระอาทิตย์', 0, 1, 'w-sun'],
    ['pi-rainbow', 'ภาพสายรุ้ง', 10, 1, 'w-rainbow'],
    ['pi-butter', 'ภาพผีเสื้อ', 12, 2, 'b-butterfly'],
    ['pi-whale', 'ภาพวาฬ', 14, 2, 'oc-whale'],
    ['pi-earth', 'ภาพโลก', 18, 3, 'sp-earth'],
    ['pi-planet', 'ภาพดาวเสาร์', 24, 4, 'sp-planet'],
    ['pi-trophy', 'ภาพถ้วยรางวัล', 40, 6, 'sg-trophy'],
  ]),
  ...room('toy', [
    ['to-ball', 'ลูกฟุตบอล', 8, 1, 'sg-soccer'],
    ['to-car', 'รถของเล่น', 12, 1, 'v-car'],
    ['to-takraw', 'ลูกตะกร้อ', 12, 1, 'sg-takraw'],
    ['to-turtle', 'ตุ๊กตาเต่า', 16, 2, 'oc-turtle'],
    ['to-guitar', 'กีตาร์', 20, 2, 'mu-guitar'],
    ['to-drum', 'กลอง', 22, 3, 'mu-drum'],
    ['to-gift', 'กล่องของขวัญ', 26, 3, 'fe-gift'],
    ['to-rocket', 'จรวดจำลอง', 40, 5, 'sp-rocket'],
    ['to-ufo', 'จานบินจำลอง', 50, 6, 'sp-ufo'],
  ]),
];

/* ------------------------------ อาหาร ------------------------------ */

export interface Food {
  id: string; // id สติกเกอร์
  label: string;
  price: number;
  food: number;
  /** ผักผลไม้ดีต่อร่างกาย: ได้แรงเพิ่ม */
  good?: boolean;
  /** ขนมหวาน: สนุกขึ้นแต่อิ่มน้อย */
  sweet?: boolean;
}
const FD = (id: string, label: string, price: number, food: number, tag?: 'good' | 'sweet'): Food => ({
  id,
  label,
  price,
  food,
  good: tag === 'good',
  sweet: tag === 'sweet',
});
export const FOODS: Food[] = [
  FD('w-drop', 'น้ำเปล่า', 0, 6, 'good'),
  FD('f-banana', 'กล้วย', 1, 12, 'good'),
  FD('f-orange', 'ส้ม', 1, 12, 'good'),
  FD('f-carrot', 'แครอท', 1, 12, 'good'),
  FD('f-broccoli', 'บรอกโคลี', 1, 14, 'good'),
  FD('f-watermelon', 'แตงโม', 2, 16, 'good'),
  FD('f-grapes', 'องุ่น', 2, 16, 'good'),
  FD('f-corn', 'ข้าวโพด', 2, 18, 'good'),
  FD('f-egg', 'ไข่ดาว', 2, 22),
  FD('f-milk', 'นมกล่อง', 2, 20, 'good'),
  FD('f-bread', 'ขนมปัง', 2, 22),
  FD('f-rice', 'ข้าวสวย', 3, 32),
  FD('f-noodle', 'ก๋วยเตี๋ยว', 4, 42),
  FD('f-sticky', 'ข้าวเหนียวมะม่วง', 5, 42),
  FD('f-pizza', 'พิซซ่า', 6, 52),
  FD('f-burger', 'แฮมเบอร์เกอร์', 6, 52),
  FD('f-lollipop', 'อมยิ้ม', 1, 5, 'sweet'),
  FD('f-cookie', 'คุกกี้', 2, 8, 'sweet'),
  FD('f-donut', 'โดนัท', 3, 12, 'sweet'),
  FD('f-icecream', 'ไอศกรีม', 3, 12, 'sweet'),
  FD('f-cupcake', 'คัพเค้ก', 3, 14, 'sweet'),
];

/* ------------------------------ ซีซันรายเดือน ------------------------------ */

export interface Season {
  month: number;
  name: string;
  line: string;
  /** สีธงและแบนเนอร์ */
  c1: string;
  c2: string;
  /** ของตกแต่งในห้อง (ได้ที่ 15 แต้ม) */
  decor: { id: string; label: string; sticker: string };
  /** ชุดพิเศษ (ได้ที่ 40 แต้ม) */
  wear: { id: string; label: string; slot: WearSlot };
}

export const SEASONS: Season[] = [
  { month: 1, name: 'เทศกาลวันเด็ก', line: 'วันนี้เป็นวันของเธอ', c1: '#ff7ab8', c2: '#7c5cff', decor: { id: 's1-d', label: 'ลูกโป่งวันเด็ก', sticker: 'fe-balloons' }, wear: { id: 's1-w', label: 'เสื้อดาววันเด็ก', slot: 'body' } },
  { month: 2, name: 'ตรุษจีนสีแดง', line: 'ซินเจียยู่อี่', c1: '#e8402f', c2: '#ffc53a', decor: { id: 's2-d', label: 'โคมจีน', sticker: 'fe-lantern' }, wear: { id: 's2-w', label: 'ชุดจีนสีแดง', slot: 'body' } },
  { month: 3, name: 'ปิดเทอมซัมเมอร์', line: 'ไปทะเลกัน', c1: '#2eb4f5', c2: '#ffd84a', decor: { id: 's3-d', label: 'ปลาดาวจากทะเล', sticker: 'oc-starfish' }, wear: { id: 's3-w', label: 'ห่วงยางเป็ด', slot: 'body' } },
  { month: 4, name: 'สงกรานต์สาดสุข', line: 'เย็นชื่นใจ', c1: '#22b8cf', c2: '#ff7ab8', decor: { id: 's4-d', label: 'ขันน้ำสงกรานต์', sticker: 'fe-water' }, wear: { id: 's4-w', label: 'เสื้อลายดอก', slot: 'body' } },
  { month: 5, name: 'เดือนปลูกต้นไม้', line: 'ฝนแรกมาแล้ว', c1: '#3fae5a', c2: '#ffc53a', decor: { id: 's5-d', label: 'ต้นไม้ของฉัน', sticker: 'h-plant' }, wear: { id: 's5-w', label: 'หมวกงอบ', slot: 'hat' } },
  { month: 6, name: 'เปิดเทอมใหม่', line: 'เพื่อนใหม่ เรื่องใหม่', c1: '#3f6fe8', c2: '#ff9f43', decor: { id: 's6-d', label: 'กระดานเรียน', sticker: 'h-school' }, wear: { id: 's6-w', label: 'เป้เปิดเทอม', slot: 'back' } },
  { month: 7, name: 'ฤดูฝนฉ่ำ', line: 'พกร่มด้วยนะ', c1: '#5a8dee', c2: '#7bd389', decor: { id: 's7-d', label: 'ร่มคันโปรด', sticker: 'w-umbrella' }, wear: { id: 's7-w', label: 'เสื้อกันฝน', slot: 'body' } },
  { month: 8, name: 'เดือนแห่งแม่', line: 'กอดแม่กันนะ', c1: '#5ab0ff', c2: '#e8f7ff', decor: { id: 's8-d', label: 'พานดอกไม้', sticker: 'fe-wai' }, wear: { id: 's8-w', label: 'พวงมาลัยมะลิ', slot: 'body' } },
  { month: 9, name: 'มหกรรมวิทยาศาสตร์', line: 'ทดลองกันเถอะ', c1: '#22b8a6', c2: '#7c5cff', decor: { id: 's9-d', label: 'กล้องดูดาว', sticker: 'sp-telescope' }, wear: { id: 's9-w', label: 'แว่นนักทดลอง', slot: 'face' } },
  { month: 10, name: 'คืนฟักทองแสนสนุก', line: 'ไม่น่ากลัวเลย', c1: '#ff8a2a', c2: '#7c3fb0', decor: { id: 's10-d', label: 'ฟักทองยิ้ม', sticker: 'fe-pumpkin' }, wear: { id: 's10-w', label: 'หมวกฟักทอง', slot: 'hat' } },
  { month: 11, name: 'ลอยกระทง', line: 'คืนเดือนเพ็ญ', c1: '#f5b83d', c2: '#3b4fc4', decor: { id: 's11-d', label: 'กระทงใบตอง', sticker: 'fe-krathong' }, wear: { id: 's11-w', label: 'ชุดไทย', slot: 'body' } },
  { month: 12, name: 'ฉลองปีใหม่', line: 'ของขวัญรออยู่', c1: '#e8402f', c2: '#2f9e5a', decor: { id: 's12-d', label: 'ต้นคริสต์มาส', sticker: 'fe-tree' }, wear: { id: 's12-w', label: 'หมวกซานต้า', slot: 'hat' } },
];

for (const s of SEASONS) {
  ITEMS.push({ id: s.decor.id, label: s.decor.label, slot: 'fest', price: 0, season: s.month, sticker: s.decor.sticker });
  ITEMS.push({ id: s.wear.id, label: s.wear.label, slot: s.wear.slot, price: 0, season: s.month });
}

/** แต้มซีซันที่ต้องใช้รับรางวัลแต่ละขั้น: ของแต่งห้อง / ชุด / ดาว */
export const SEASON_STEPS = [15, 40, 80] as const;
export const SEASON_STAR_PRIZE = 30;

export const seasonOfMonth = (month: number): Season => SEASONS[Math.max(0, Math.min(11, month - 1))];

const byId = new Map(ITEMS.map((i) => [i.id, i]));
export const itemById = (id: string) => byId.get(id);
export const foodById = (id: string) => FOODS.find((f) => f.id === id);

export const WEAR_SLOTS: { id: WearSlot; label: string }[] = [
  { id: 'hat', label: 'หมวก' },
  { id: 'face', label: 'ใบหน้า' },
  { id: 'body', label: 'เสื้อผ้า' },
  { id: 'back', label: 'ด้านหลัง' },
];
export const ROOM_SLOTS: { id: RoomSlot; label: string }[] = [
  { id: 'wall', label: 'ผนัง' },
  { id: 'floor', label: 'พื้น' },
  { id: 'rug', label: 'พรม' },
  { id: 'sofa', label: 'ที่นั่ง' },
  { id: 'tv', label: 'มุมโปรด' },
  { id: 'lamp', label: 'โคมไฟ' },
  { id: 'pic', label: 'ภาพผนัง' },
  { id: 'toy', label: 'ของเล่น' },
  { id: 'fest', label: 'ของเทศกาล' },
];
