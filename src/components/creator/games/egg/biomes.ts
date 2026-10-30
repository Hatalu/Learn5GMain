/**
 * 10 ไบโอมของโหมด "ขโมยไข่บอสหลับ": สีพื้น ของตกแต่ง บอส และไข่ 11 ชนิด
 * ไข่เรียงตาม EGG_SLOTS_RARITY (ธรรมดา 5, หายาก 3, ตำนาน 2, ความลับ 1)
 */
export type PropKind = 'tree' | 'flower' | 'mushroom' | 'cactus' | 'rock' | 'ice' | 'lava' | 'reed' | 'candy' | 'coral' | 'crystal' | 'cloud';
export type BossPart = 'ears' | 'cap' | 'claws' | 'horns' | 'crown' | 'spikes' | 'wings' | 'tail' | 'shell' | 'fur';

export interface EggStyle {
  name: string;
  base: string;
  spot: string;
  /** spots = จุด / stripe = แถบ / zig = ฟันปลา / glow = เรืองแสง / star = ดาว */
  pattern: 'spots' | 'stripe' | 'zig' | 'glow' | 'star';
}

export interface Biome {
  id: string;
  name: string;
  ground: string;
  ground2: string;
  props: PropKind[];
  propColor: string;
  boss: { name: string; body: string; belly: string; parts: BossPart[]; scale: number };
  eggs: EggStyle[];
}

const E = (name: string, base: string, spot: string, pattern: EggStyle['pattern']): EggStyle => ({ name, base, spot, pattern });

export const BIOMES: Biome[] = [
  {
    id: 'meadow',
    name: 'ทุ่งดอกไม้',
    ground: '#8fdc6a',
    ground2: '#74c955',
    props: ['flower', 'tree'],
    propColor: '#ff7ab8',
    boss: { name: 'กระต่ายยักษ์ปุยปุย', body: '#f4ecff', belly: '#ffd1e6', parts: ['ears', 'tail'], scale: 1 },
    eggs: [
      E('ไข่ดอกเดซี่', '#fffbe8', '#ffd23f', 'spots'),
      E('ไข่ใบโคลเวอร์', '#c9f2a8', '#4fae3a', 'spots'),
      E('ไข่ผึ้งน้อย', '#ffe066', '#2a2350', 'stripe'),
      E('ไข่น้ำค้าง', '#d8f4ff', '#7cc9f0', 'spots'),
      E('ไข่ทานตะวัน', '#ffcf3f', '#a0601c', 'zig'),
      E('ไข่ผีเสื้อ', '#e2c8ff', '#9b6cf0', 'zig'),
      E('ไข่สายรุ้ง', '#ffd6e8', '#3d8bff', 'stripe'),
      E('ไข่น้ำผึ้ง', '#ffb31a', '#fff2b3', 'spots'),
      E('ไข่กระต่ายทอง', '#ffd700', '#fff6c2', 'glow'),
      E('ไข่ราชินีดอกไม้', '#ff7ab8', '#fff0f7', 'star'),
      E('ไข่จักรวาลดอกไม้', '#2b1a5c', '#ff7ab8', 'star'),
    ],
  },
  {
    id: 'mushroom',
    name: 'ป่าเห็ดยักษ์',
    ground: '#6fbf73',
    ground2: '#5aa860',
    props: ['mushroom', 'tree'],
    propColor: '#ff5d5d',
    boss: { name: 'ราชาเห็ดหลับใหล', body: '#fff1dc', belly: '#ffe2bd', parts: ['cap'], scale: 1.05 },
    eggs: [
      E('ไข่เห็ดแดง', '#ff6b6b', '#fff', 'spots'),
      E('ไข่เห็ดฟาง', '#e8cfa0', '#b58a4f', 'stripe'),
      E('ไข่มอสเขียว', '#7fcf6a', '#3f8a3a', 'spots'),
      E('ไข่ลูกโอ๊ก', '#c98a4b', '#7a4a1f', 'zig'),
      E('ไข่ใบไม้ร่วง', '#ffa64d', '#c25b1a', 'spots'),
      E('ไข่หิ่งห้อย', '#2f4a3a', '#d7ff6b', 'glow'),
      E('ไข่สปอร์ม่วง', '#b48cff', '#fff', 'spots'),
      E('ไข่รากไม้', '#9a6b3c', '#e8c48a', 'stripe'),
      E('ไข่เห็ดเรืองแสง', '#1d3b5c', '#4fffd2', 'glow'),
      E('ไข่ภูตป่า', '#9ef0b0', '#ff7ab8', 'star'),
      E('ไข่หัวใจป่า', '#0f2a1a', '#9cff5a', 'star'),
    ],
  },
  {
    id: 'desert',
    name: 'ทะเลทรายทองคำ',
    ground: '#f5d58a',
    ground2: '#ebc46f',
    props: ['cactus', 'rock'],
    propColor: '#4faa5a',
    boss: { name: 'แมงป่องทรายยักษ์', body: '#e0a24a', belly: '#f7d394', parts: ['claws', 'tail'], scale: 1.05 },
    eggs: [
      E('ไข่เม็ดทราย', '#f6e1a8', '#d2a75a', 'spots'),
      E('ไข่กระบองเพชร', '#7fcf6a', '#fff', 'stripe'),
      E('ไข่หินทราย', '#d9a36a', '#a86b3a', 'zig'),
      E('ไข่ลมร้อน', '#ffcf9a', '#ff8a3d', 'stripe'),
      E('ไข่โอเอซิส', '#9fe6ff', '#3fb8a0', 'spots'),
      E('ไข่ฟาโรห์', '#2a5cff', '#ffd23f', 'stripe'),
      E('ไข่พายุทราย', '#c99a5a', '#fff2cf', 'zig'),
      E('ไข่ด้วงทอง', '#3f9a7a', '#ffd23f', 'spots'),
      E('ไข่ปิรามิด', '#ffd23f', '#a0601c', 'zig'),
      E('ไข่สุริยะ', '#ff8a1a', '#fff6a0', 'glow'),
      E('ไข่มิราจ', '#ffe8f6', '#7cc9f0', 'star'),
    ],
  },
  {
    id: 'ice',
    name: 'ภูเขาน้ำแข็ง',
    ground: '#e4f6ff',
    ground2: '#cdeaf8',
    props: ['ice', 'tree'],
    propColor: '#9fdcff',
    boss: { name: 'เยติขนฟู', body: '#f8fbff', belly: '#cfe6ff', parts: ['horns', 'fur'], scale: 1.12 },
    eggs: [
      E('ไข่เกล็ดหิมะ', '#ffffff', '#9fdcff', 'star'),
      E('ไข่ก้อนน้ำแข็ง', '#cdeeff', '#7cc9f0', 'zig'),
      E('ไข่เพนกวิน', '#2a2350', '#ffffff', 'spots'),
      E('ไข่ลมหนาว', '#e2ecff', '#9bb4ff', 'stripe'),
      E('ไข่ตุ๊กตาหิมะ', '#ffffff', '#ff8a3d', 'spots'),
      E('ไข่แสงเหนือ', '#1a2a5c', '#5fffc8', 'stripe'),
      E('ไข่ไอซ์คริสตัล', '#bff0ff', '#ffffff', 'zig'),
      E('ไข่หมีขั้วโลก', '#f5f8ff', '#bcd0e6', 'spots'),
      E('ไข่มังกรหิมะ', '#7cc9f0', '#ffffff', 'glow'),
      E('ไข่เจ้าหญิงน้ำแข็ง', '#d9c8ff', '#ffffff', 'star'),
      E('ไข่ดวงดาวเยือกแข็ง', '#0b1a3a', '#bff0ff', 'star'),
    ],
  },
  {
    id: 'volcano',
    name: 'ภูเขาไฟลาวา',
    ground: '#5a4a5f',
    ground2: '#4a3b50',
    props: ['lava', 'rock'],
    propColor: '#ff6a1a',
    boss: { name: 'มังกรลาวาจอมงีบ', body: '#ff6b4a', belly: '#ffcf6b', parts: ['horns', 'wings', 'tail'], scale: 1.15 },
    eggs: [
      E('ไข่หินภูเขาไฟ', '#5a4a5f', '#ff8a3d', 'spots'),
      E('ไข่ถ่านแดง', '#3a2a2f', '#ff4a1a', 'zig'),
      E('ไข่เถ้าถ่าน', '#9a8a9a', '#5a4a5f', 'spots'),
      E('ไข่กำมะถัน', '#fff066', '#c2a51a', 'stripe'),
      E('ไข่ลาวาน้อย', '#ff6a1a', '#ffd23f', 'stripe'),
      E('ไข่ไฟฟีนิกซ์', '#ff4a1a', '#ffd23f', 'zig'),
      E('ไข่แมกมา', '#c2261a', '#ffb31a', 'glow'),
      E('ไข่ทับทิม', '#ff3d6b', '#ffd6e0', 'zig'),
      E('ไข่มังกรเพลิง', '#ff7a1a', '#fff2a0', 'glow'),
      E('ไข่หัวใจภูเขาไฟ', '#8a1a1a', '#ff8a3d', 'star'),
      E('ไข่ดาวตก', '#120a1a', '#ff8a3d', 'star'),
    ],
  },
  {
    id: 'swamp',
    name: 'หนองน้ำมหัศจรรย์',
    ground: '#7aa86a',
    ground2: '#628f55',
    props: ['reed', 'mushroom'],
    propColor: '#3f8a5a',
    boss: { name: 'ราชากบตาโต', body: '#5fc46a', belly: '#d8f5a0', parts: ['crown'], scale: 1.08 },
    eggs: [
      E('ไข่ลูกอ๊อด', '#9ad18a', '#2a2350', 'spots'),
      E('ไข่ใบบัว', '#5fbf6a', '#d8f5a0', 'stripe'),
      E('ไข่โคลนนุ่ม', '#8a6b4a', '#c9a57a', 'spots'),
      E('ไข่แมลงปอ', '#7cc9f0', '#3fb8a0', 'zig'),
      E('ไข่ดอกบัว', '#ffc2dc', '#ff7ab8', 'spots'),
      E('ไข่หมอกเขียว', '#b8e6b0', '#5f9a5a', 'stripe'),
      E('ไข่ปลาไหลไฟ', '#3a5a7a', '#ffef5a', 'zig'),
      E('ไข่เต่าโบราณ', '#6a8a4a', '#c9d98a', 'zig'),
      E('ไข่เจ้าชายกบ', '#5fc46a', '#ffd23f', 'glow'),
      E('ไข่แม่มดหนองน้ำ', '#5a3a7a', '#9cff5a', 'star'),
      E('ไข่แสงจันทร์หนองน้ำ', '#0f1f2a', '#e8f8ff', 'star'),
    ],
  },
  {
    id: 'candy',
    name: 'อาณาจักรลูกกวาด',
    ground: '#ffd1e6',
    ground2: '#ffbcdb',
    props: ['candy', 'flower'],
    propColor: '#ff4fa3',
    boss: { name: 'หมีเยลลี่ยักษ์', body: '#ff8fbf', belly: '#ffd6e8', parts: ['ears'], scale: 1.08 },
    eggs: [
      E('ไข่มาร์ชเมลโล', '#fff4fa', '#ffc2dc', 'spots'),
      E('ไข่ลูกอมมิ้นต์', '#c8fff0', '#3fd6a8', 'stripe'),
      E('ไข่ช็อกโกแลต', '#7a4a2f', '#c9845a', 'zig'),
      E('ไข่เยลลี่ส้ม', '#ffb36b', '#fff', 'spots'),
      E('ไข่โดนัท', '#ffd6a0', '#ff4fa3', 'spots'),
      E('ไข่สายไหม', '#ffd1f0', '#a8d8ff', 'stripe'),
      E('ไข่คุกกี้', '#d9a36a', '#5a3a1f', 'spots'),
      E('ไข่อมยิ้ม', '#ff7ab8', '#fff', 'zig'),
      E('ไข่เค้กราชินี', '#fff0f7', '#ffd23f', 'glow'),
      E('ไข่ไอศกรีมสายรุ้ง', '#ffe8f6', '#9b6cf0', 'star'),
      E('ไข่น้ำตาลจักรวาล', '#3a1a5c', '#ffd1f0', 'star'),
    ],
  },
  {
    id: 'coral',
    name: 'ชายหาดปะการัง',
    ground: '#ffe3a8',
    ground2: '#ffd68a',
    props: ['coral', 'rock'],
    propColor: '#ff7a6b',
    boss: { name: 'ปูยักษ์ก้ามทอง', body: '#ff6b5a', belly: '#ffc29a', parts: ['claws', 'shell'], scale: 1.05 },
    eggs: [
      E('ไข่เปลือกหอย', '#fff2e0', '#ffb38a', 'stripe'),
      E('ไข่ดาวทะเล', '#ff9a6b', '#fff', 'star'),
      E('ไข่ฟองคลื่น', '#d8f4ff', '#ffffff', 'spots'),
      E('ไข่ทรายชายหาด', '#ffe3a8', '#e0b36b', 'spots'),
      E('ไข่ปลาการ์ตูน', '#ff8a3d', '#ffffff', 'stripe'),
      E('ไข่เต่าทะเล', '#5fbf8a', '#c9f2a8', 'zig'),
      E('ไข่ปะการังชมพู', '#ff7ab8', '#ffd6e8', 'spots'),
      E('ไข่แมงกะพรุน', '#c8b8ff', '#ffffff', 'glow'),
      E('ไข่ไข่มุกยักษ์', '#fff8ff', '#e0d0ff', 'glow'),
      E('ไข่เงือกน้อย', '#3fd6c8', '#ff7ab8', 'star'),
      E('ไข่หัวใจมหาสมุทร', '#0a2a4a', '#5fd4ff', 'star'),
    ],
  },
  {
    id: 'crystal',
    name: 'ถ้ำคริสตัล',
    ground: '#6a5a9a',
    ground2: '#5a4a88',
    props: ['crystal', 'rock'],
    propColor: '#b48cff',
    boss: { name: 'โกเล็มคริสตัล', body: '#9a8acf', belly: '#d8ccff', parts: ['spikes'], scale: 1.15 },
    eggs: [
      E('ไข่ควอตซ์', '#f0e8ff', '#c8b8ff', 'zig'),
      E('ไข่อเมทิสต์', '#b48cff', '#ffffff', 'zig'),
      E('ไข่หินถ้ำ', '#8a80a8', '#5a5080', 'spots'),
      E('ไข่ค้างคาวน้อย', '#3a2a5a', '#c8b8ff', 'spots'),
      E('ไข่หยดน้ำถ้ำ', '#a8d8ff', '#ffffff', 'spots'),
      E('ไข่ไพลิน', '#3d6bff', '#a8c8ff', 'zig'),
      E('ไข่มรกต', '#25c48a', '#c8ffe6', 'zig'),
      E('ไข่เรืองแสงถ้ำ', '#1a1a3a', '#5fd4ff', 'glow'),
      E('ไข่เพชรยักษ์', '#e8fbff', '#9fdcff', 'glow'),
      E('ไข่ราชันคริสตัล', '#9b6cf0', '#ffd23f', 'star'),
      E('ไข่หลุมดำ', '#05030f', '#b48cff', 'star'),
    ],
  },
  {
    id: 'sky',
    name: 'อาณาจักรเมฆ',
    ground: '#f2f6ff',
    ground2: '#dfe8ff',
    props: ['cloud', 'flower'],
    propColor: '#ffffff',
    boss: { name: 'นกฮูกสายฟ้า', body: '#8a7acf', belly: '#e8e0ff', parts: ['wings', 'horns'], scale: 1.08 },
    eggs: [
      E('ไข่ปุยเมฆ', '#ffffff', '#dfe8ff', 'spots'),
      E('ไข่สายลม', '#e0f4ff', '#9fdcff', 'stripe'),
      E('ไข่ลูกเห็บ', '#e8f0ff', '#a8b8e0', 'spots'),
      E('ไข่ขนนก', '#fff8e0', '#ffcf6b', 'stripe'),
      E('ไข่ฟ้าใส', '#9fdcff', '#ffffff', 'spots'),
      E('ไข่ฟ้าแลบ', '#5a4aa8', '#ffef5a', 'zig'),
      E('ไข่รุ้งกินน้ำ', '#ffffff', '#ff7ab8', 'stripe'),
      E('ไข่พระอาทิตย์ตก', '#ffb36b', '#ff7ab8', 'stripe'),
      E('ไข่เทวดาน้อย', '#fffbe8', '#ffd700', 'glow'),
      E('ไข่ราชาพายุ', '#3a3a7a', '#ffef5a', 'star'),
      E('ไข่ดาวเหนือ', '#0a0a2a', '#ffffff', 'star'),
    ],
  },
];
