/** ห้อง 4 ห้องของคู่หู: ตำแหน่งของแต่ละช่อง + ของแต่งที่เพิ่มจากห้องนั่งเล่น (ข้อมูลล้วน ภาพอยู่ components/pet/roomShapes) */

export type RoomId = 'living' | 'dining' | 'bath' | 'bed';
export type RoomSlot =
  | 'wall' | 'floor' | 'rug' | 'sofa' | 'tv' | 'lamp' | 'pic' | 'toy' | 'fest'
  | 'b_wall' | 'b_floor' | 'b_tub' | 'b_sink' | 'b_mirror' | 'b_towel' | 'b_mat' | 'b_toy' | 'b_deco'
  | 'n_wall' | 'n_floor' | 'n_bed' | 'n_stand' | 'n_curtain' | 'n_lamp' | 'n_pic' | 'n_rug' | 'n_toy'
  | 'd_wall' | 'd_floor' | 'd_table' | 'd_fridge' | 'd_stove' | 'd_shelf' | 'd_lamp' | 'd_mat' | 'd_dish';

export interface SlotDef {
  id: RoomSlot;
  label: string;
  /** x y w h ในฉาก 800x600 ไม่มี = ผนัง/พื้น */
  box?: [number, number, number, number];
  /** กรอบรูปรอบภาพ */
  frame?: boolean;
  /** โคมห้อยจากเพดาน */
  cord?: boolean;
  /** วาดทับคู่หู: คู่หูอยู่ในอ่าง/หลังโต๊ะ/บนเตียง */
  front?: boolean;
}

export interface RoomDef {
  id: RoomId;
  label: string;
  wall: RoomSlot;
  floor: RoomSlot;
  /** ลำดับวาด: ตัวหลังทับตัวหน้า */
  slots: SlotDef[];
  starter: Partial<Record<RoomSlot, string>>;
}

export const ROOMS: RoomDef[] = [
  {
    id: 'living', label: 'นั่งเล่น', wall: 'wall', floor: 'floor',
    starter: { wall: 'wa-sky', floor: 'fl-wood', rug: 'ru-round', sofa: 'so-orange', lamp: 'la-ball', pic: 'pi-sun', tv: 'tv-old' },
    slots: [
      { id: 'wall', label: 'ผนัง' }, { id: 'floor', label: 'พื้น' },
      { id: 'pic', label: 'ภาพผนัง', box: [458, 96, 80, 80], frame: true },
      { id: 'lamp', label: 'โคมไฟ', box: [340, 0, 120, 108], cord: true },
      { id: 'sofa', label: 'ที่นั่ง', box: [203, 285, 150, 136] },
      { id: 'tv', label: 'มุมโปรด', box: [452, 268, 145, 158] },
      { id: 'rug', label: 'พรม', box: [255, 450, 290, 118] },
      { id: 'toy', label: 'ของเล่น', box: [212, 442, 82, 82] },
      { id: 'fest', label: 'ของเทศกาล', box: [508, 426, 88, 88] },
    ],
  },
  {
    id: 'dining', label: 'ห้องกินข้าว', wall: 'd_wall', floor: 'd_floor',
    starter: { d_wall: 'dw-1', d_floor: 'df-1', d_table: 'dt-rect-0', d_fridge: 'dr-classic-0', d_stove: 'ds-oven-0', d_shelf: 'dh-1', d_lamp: 'dl-ball-0' },
    slots: [
      { id: 'd_wall', label: 'ผนัง' }, { id: 'd_floor', label: 'พื้น' },
      { id: 'd_shelf', label: 'ชั้นวาง', box: [322, 112, 258, 70] },
      { id: 'd_lamp', label: 'โคมไฟ', box: [244, 0, 84, 84], cord: true },
      { id: 'd_fridge', label: 'ตู้เย็น', box: [205, 195, 86, 230] },
      { id: 'd_stove', label: 'เตา', box: [508, 262, 88, 165] },
      { id: 'd_table', label: 'โต๊ะ', box: [262, 342, 276, 88], front: true },
      { id: 'd_dish', label: 'บนโต๊ะ', box: [270, 288, 70, 70], front: true },
      { id: 'd_mat', label: 'พรม', box: [275, 458, 250, 96] },
    ],
  },
  {
    id: 'bath', label: 'ห้องน้ำ', wall: 'b_wall', floor: 'b_floor',
    starter: { b_wall: 'bw-1', b_floor: 'bf-1', b_tub: 'bt-round-0', b_sink: 'bs-ped-0', b_mirror: 'bm-round-0', b_towel: 'bo-bar-0', b_mat: 'ba-oval-0' },
    slots: [
      { id: 'b_wall', label: 'ผนัง' }, { id: 'b_floor', label: 'พื้น' },
      { id: 'b_mirror', label: 'กระจก', box: [208, 120, 80, 110] },
      { id: 'b_towel', label: 'ผ้าเช็ดตัว', box: [505, 150, 90, 110] },
      { id: 'b_sink', label: 'อ่างล้างหน้า', box: [205, 276, 84, 140] },
      { id: 'b_tub', label: 'อ่างอาบน้ำ', box: [262, 300, 276, 128], front: true },
      { id: 'b_mat', label: 'พรมเช็ดเท้า', box: [290, 452, 220, 100] },
      { id: 'b_toy', label: 'ของเล่นน้ำ', box: [215, 450, 74, 74] },
      { id: 'b_deco', label: 'ของใช้', box: [515, 440, 78, 78] },
    ],
  },
  {
    id: 'bed', label: 'ห้องนอน', wall: 'n_wall', floor: 'n_floor',
    starter: { n_wall: 'nw-1', n_floor: 'nf-1', n_bed: 'nb-classic-0', n_stand: 'ns-plain-0', n_curtain: 'nc-0', n_lamp: 'nl-ball-0', n_rug: 'nr-oval-0' },
    slots: [
      { id: 'n_wall', label: 'ผนัง' }, { id: 'n_floor', label: 'พื้น' },
      { id: 'n_curtain', label: 'ผ้าม่าน', box: [290, 92, 170, 136] },
      { id: 'n_pic', label: 'ภาพผนัง', box: [502, 140, 76, 76], frame: true },
      { id: 'n_lamp', label: 'โคมไฟ', box: [222, 0, 90, 90], cord: true },
      { id: 'n_stand', label: 'โต๊ะข้างเตียง', box: [205, 336, 62, 88] },
      { id: 'n_bed', label: 'เตียง', box: [262, 270, 276, 160], front: true },
      { id: 'n_toy', label: 'ของรัก', box: [532, 348, 62, 76] },
      { id: 'n_rug', label: 'พรม', box: [275, 452, 250, 100] },
    ],
  },
];

export const roomById = (id: RoomId) => ROOMS.find((r) => r.id === id)!;
/** ทุกช่องของทุกห้อง */
export const ROOM_SLOTS: SlotDef[] = ROOMS.flatMap((r) => r.slots);
export const isRoomSlot = (s: string): s is RoomSlot => ROOM_SLOTS.some((x) => x.id === s);
/** ผนังกับพื้นเอาออกไม่ได้ */
export const isRequiredSlot = (s: RoomSlot) => ROOMS.some((r) => r.wall === s || r.floor === s);

export interface RoomItem {
  id: string;
  label: string;
  slot: RoomSlot;
  price: number;
  lv?: number;
  sticker?: string;
  /** [ชื่อภาพใน roomShapes, สี 1, สี 2] */
  art?: [string, string, string?];
}

const COLORS: [string, string, string][] = [
  ['ฟ้า', '#8fd3f4', '#5ab0ff'], ['ชมพู', '#ffb3cf', '#ff7ab8'], ['เขียว', '#a8e6b0', '#5fc66a'],
  ['เหลือง', '#ffe58f', '#ffc53a'], ['ม่วง', '#cdbdff', '#8660fb'], ['ส้ม', '#ffc99a', '#ff9147'],
  ['ขาว', '#ffffff', '#d7dcea'], ['แดง', '#ff9a9a', '#ef5d5d'],
];

/** รูปทรงที่ใช้ร่วมหลายห้อง (พรม โคม) ที่เหลือชื่อภาพ = <prefix>-<shape> */
const SHARED_SHAPES = ['oval', 'rect', 'flower', 'cloud', 'ball', 'bell', 'star'];

/** ราคาไต่ตามลำดับ ชิ้นแรกของห้องฟรีเมื่อ free */
const priceAt = (i: number, base: number, step: number) => base + i * step;
const lvAt = (i: number) => 1 + Math.floor(i / 2);

/** ของรูปทรงเดียวกันหลายสี: id = <prefix>-<shape>-<ลำดับ> */
function shapes(slot: RoomSlot, prefix: string, list: [string, string][], picks: number[], base: number, step: number, freeFirst = true): RoomItem[] {
  const out: RoomItem[] = [];
  list.forEach(([shape, label], s) => {
    picks.forEach((c, i) => {
      const [name, c1, c2] = COLORS[c];
      const n = s * picks.length + i;
      out.push({
        id: `${prefix}-${shape}-${i}`,
        label: `${label}${name}`,
        slot,
        price: freeFirst && n === 0 ? 0 : priceAt(n, base, step),
        lv: lvAt(n),
        art: [SHARED_SHAPES.includes(shape) ? shape : `${prefix}-${shape}`, c1, c2],
      });
    });
  });
  return out;
}

const WP: [string, string, string, string][] = [
  ['tile', 'กระเบื้องฟ้า', '#cfeefb', '#a6dcf2'], ['tile', 'กระเบื้องชมพู', '#ffe0ea', '#ffc2d6'], ['tile', 'กระเบื้องเขียว', '#d6f5df', '#ade8bd'],
  ['scale', 'ลายเกล็ดปลา', '#bfe8f7', '#8fd3f4'], ['wave', 'ลายคลื่น', '#d9f3ff', '#a9dff7'], ['dots', 'จุดฟองสบู่', '#e2f7ff', '#ffffff'],
  ['diag', 'ลายเพชรม่วง', '#e4dcff', '#cdbdff'], ['check', 'ตารางเหลือง', '#fff3c4', '#ffe58f'], ['stripe', 'ลายทางส้ม', '#ffe6d0', '#ffd2ad'],
  ['star', 'ดาวกลางคืน', '#3a3a86', '#ffe08a'], ['heart', 'หัวใจหวาน', '#ffe5ee', '#ffc2d6'], ['brick', 'อิฐขาว', '#f4efe7', '#e0d8ca'],
];
const FL: [string, string, string, string][] = [
  ['tile', 'พื้นกระเบื้องครีม', '#f5ead6', '#e6d6b8'], ['check', 'พื้นหมากรุก', '#ffffff', '#c9d3e8'], ['plank', 'พื้นไม้อ่อน', '#e8c08f', '#cfa06c'],
  ['plank', 'พื้นไม้เข้ม', '#b98354', '#94633a'], ['tile', 'พื้นกระเบื้องฟ้า', '#cfe7f7', '#a9cfe8'], ['dots', 'พื้นหินกรวด', '#d8d4cc', '#bdb7ab'],
  ['check', 'พื้นตารางเขียว', '#e0f5da', '#b6e3aa'], ['diag', 'พื้นลายเพชร', '#f0e6ff', '#d7c6ff'],
];
const surfaces = (slot: RoomSlot, prefix: string, rows: [string, string, string, string][], base: number, step: number): RoomItem[] =>
  rows.map(([kind, label, a, b], i) => ({ id: `${prefix}-${i + 1}`, label, slot, price: i === 0 ? 0 : priceAt(i, base, step), lv: lvAt(i), art: [kind, a, b] }));

/** เริ่มลายคนละแบบต่อห้อง ของตั้งต้นจะได้ไม่เหมือนกัน */
const turn = <T,>(a: T[], n: number): T[] => [...a.slice(n), ...a.slice(0, n)];

const stickers = (slot: RoomSlot, prefix: string, rows: [string, string][], base: number, step: number): RoomItem[] =>
  rows.map(([sticker, label], i) => ({ id: `${prefix}-${i + 1}`, label, slot, price: priceAt(i, base, step), lv: lvAt(i), sticker }));

const SHELF: [string, string][] = [
  ['f-banana|f-orange|f-grapes', 'ชั้นผลไม้'], ['f-carrot|f-broccoli|f-corn', 'ชั้นผัก'], ['f-milk|f-juice|f-egg', 'ชั้นอาหารเช้า'], ['f-donut|f-cookie|f-cupcake', 'ชั้นขนม'],
  ['f-bread|f-rice|f-noodle', 'ชั้นของคาว'], ['f-icecream|f-lollipop|f-cherry', 'ชั้นของหวาน'], ['h-plant|h-clock|h-plant', 'ชั้นต้นไม้'], ['fe-cake|fe-gift|fe-balloons', 'ชั้นปาร์ตี้'],
];

export const ROOM_ITEMS: RoomItem[] = [
  /* ห้องกินข้าว */
  ...surfaces('d_wall', 'dw', turn(WP, 7), 8, 4),
  ...surfaces('d_floor', 'df', FL, 8, 5),
  ...shapes('d_table', 'dt', [['rect', 'โต๊ะยาว'], ['round', 'โต๊ะกลม'], ['low', 'โต๊ะญี่ปุ่น'], ['pic', 'โต๊ะปิกนิก']], [6, 5, 2], 12, 5),
  ...shapes('d_fridge', 'dr', [['classic', 'ตู้เย็น'], ['retro', 'ตู้เย็นย้อนยุค'], ['double', 'ตู้เย็นสองบาน']], [6, 0, 1], 15, 6),
  ...shapes('d_stove', 'ds', [['oven', 'เตาอบ'], ['grill', 'เตาย่าง'], ['pot', 'เตาหม้อซุป']], [6, 7, 3], 14, 6),
  ...SHELF.map(([list, label], i): RoomItem => ({ id: `dh-${i + 1}`, label, slot: 'd_shelf', price: i === 0 ? 0 : priceAt(i, 10, 5), lv: lvAt(i), art: ['shelf', '#c98a52', list] })),
  ...shapes('d_lamp', 'dl', [['ball', 'โคมกลม'], ['bell', 'โคมระฆัง'], ['star', 'โคมดาว']], [3, 1, 0], 8, 4),
  ...shapes('d_mat', 'dm', [['oval', 'พรมรี'], ['rect', 'พรมผืนยาว'], ['flower', 'พรมดอกไม้'], ['cloud', 'พรมเมฆ']], [3, 2], 8, 4, false),
  ...stickers('d_dish', 'dd', [['fe-cake', 'เค้กวันเกิด'], ['f-pizza', 'พิซซ่าถาด'], ['f-rice', 'ข้าวสวยร้อนๆ'], ['f-noodle', 'ก๋วยเตี๋ยวชาม'], ['f-sticky', 'ข้าวเหนียวมะม่วง'], ['f-burger', 'แฮมเบอร์เกอร์'], ['f-cupcake', 'คัพเค้ก'], ['f-juice', 'น้ำผลไม้']], 6, 3),

  /* ห้องน้ำ */
  ...surfaces('b_wall', 'bw', WP, 8, 4),
  ...surfaces('b_floor', 'bf', turn(FL, 1), 8, 5),
  ...shapes('b_tub', 'bt', [['round', 'อ่างโค้ง'], ['claw', 'อ่างขาสิงห์'], ['square', 'อ่างเหลี่ยม'], ['wood', 'อ่างถังไม้']], [6, 1, 0], 15, 6),
  ...shapes('b_sink', 'bs', [['ped', 'อ่างล้างหน้าเสา'], ['bowl', 'อ่างล้างหน้าชาม'], ['cab', 'อ่างล้างหน้าตู้']], [6, 2, 4], 10, 5),
  ...shapes('b_mirror', 'bm', [['round', 'กระจกกลมกรอบ'], ['oval', 'กระจกรีกรอบ'], ['arch', 'กระจกโค้งกรอบ'], ['star', 'กระจกดาวกรอบ']], [3, 1], 8, 5),
  ...shapes('b_towel', 'bo', [['bar', 'ราวผ้าเช็ดตัว'], ['ring', 'ห่วงผ้าเช็ดตัว'], ['hook', 'ตะขอผ้าเช็ดตัว']], [0, 1, 3], 6, 3),
  ...shapes('b_mat', 'ba', [['oval', 'พรมรี'], ['rect', 'พรมผืนยาว'], ['flower', 'พรมดอกไม้'], ['cloud', 'พรมเมฆ']], [0, 1], 6, 4),
  ...stickers('b_toy', 'bg', [['oc-fish', 'ปลาลอยน้ำ'], ['oc-crab', 'ปูของเล่น'], ['oc-octopus', 'ปลาหมึกยาง'], ['oc-turtle', 'เต่าลอยน้ำ'], ['oc-whale', 'วาฬพ่นน้ำ'], ['oc-dolphin', 'โลมายาง'], ['oc-jelly', 'แมงกะพรุน'], ['v-sub', 'เรือดำน้ำ']], 6, 3),
  ...stickers('b_deco', 'be', [['h-soap', 'สบู่ฟอง'], ['h-toothbrush', 'แปรงสีฟัน'], ['oc-shell', 'เปลือกหอย'], ['oc-coral', 'ปะการัง'], ['bd-tooth', 'ฟันยิ้ม'], ['h-plant', 'ต้นไม้เล็ก'], ['w-drop', 'หยดน้ำยิ้ม'], ['oc-starfish', 'ปลาดาว']], 6, 3),

  /* ห้องนอน */
  ...surfaces('n_wall', 'nw', turn(WP, 6), 8, 4),
  ...surfaces('n_floor', 'nf', turn(FL, 2), 8, 5),
  ...shapes('n_bed', 'nb', [['classic', 'เตียงไม้ผ้าห่ม'], ['round', 'เตียงกลมผ้าห่ม'], ['canopy', 'เตียงมุ้งผ้าห่ม'], ['car', 'เตียงรถแข่ง']], [0, 1, 4], 18, 7),
  ...shapes('n_stand', 'ns', [['plain', 'โต๊ะข้างเตียง'], ['lamp', 'โต๊ะมีโคม'], ['books', 'โต๊ะมีหนังสือ']], [5, 2, 0], 8, 4),
  ...[6, 0, 1, 2, 3, 4, 5, 7].map((c, i): RoomItem => ({ id: `nc-${i}`, label: `ผ้าม่าน${COLORS[c][0]}`, slot: 'n_curtain', price: i === 0 ? 0 : priceAt(i, 6, 3), lv: lvAt(i), art: ['curtain', COLORS[c][1], COLORS[c][2]] })),
  ...shapes('n_lamp', 'nl', [['ball', 'โคมกลม'], ['bell', 'โคมระฆัง'], ['star', 'โคมดาว']], [3, 4, 1], 8, 4),
  ...stickers('n_pic', 'np', [['w-moon', 'ภาพจันทร์เสี้ยว'], ['sp-stars', 'ภาพดาวระยิบ'], ['sp-astronaut', 'ภาพนักบินอวกาศ'], ['w-rainbow', 'ภาพสายรุ้ง'], ['b-firefly', 'ภาพหิ่งห้อย'], ['w-cloud', 'ภาพเมฆ'], ['sp-moonface', 'ภาพจันทร์ยิ้ม'], ['sp-comet', 'ภาพดาวหาง']], 6, 3),
  ...shapes('n_rug', 'nr', [['oval', 'พรมรี'], ['rect', 'พรมผืนยาว'], ['flower', 'พรมดอกไม้'], ['cloud', 'พรมเมฆ']], [4, 1], 8, 4),
  ...stickers('n_toy', 'ng', [['h-clock', 'นาฬิกาปลุก'], ['oc-seahorse', 'ตุ๊กตาม้าน้ำ'], ['b-ladybug', 'ตุ๊กตาเต่าทอง'], ['b-snail', 'ตุ๊กตาหอยทาก'], ['oc-pufferfish', 'ตุ๊กตาปลาปักเป้า'], ['fe-party', 'หมวกปาร์ตี้'], ['mu-headphone', 'หูฟัง'], ['mu-note', 'โน้ตดนตรี']], 6, 3),
];
