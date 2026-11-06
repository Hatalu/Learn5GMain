/** คู่หูให้เลือก: ปลดล็อกจากตัวนับภารกิจสะสม (total) ท่าทางอยู่ pet.css */
import type { PetEv } from './missions';
import type { PetState } from './logic';

export type ActionId = 'hop' | 'jump' | 'spin' | 'dance' | 'wave' | 'shake' | 'flip' | 'stretch' | 'bow' | 'wiggle' | 'stomp' | 'tiptoe';
export const ACTIONS: { id: ActionId; label: string }[] = [
  { id: 'hop', label: 'กระโดดเบาๆ' },
  { id: 'jump', label: 'กระโดดสูง' },
  { id: 'spin', label: 'หมุนตัว' },
  { id: 'dance', label: 'เต้น' },
  { id: 'wave', label: 'โบกมือ' },
  { id: 'shake', label: 'ส่ายหัว' },
  { id: 'flip', label: 'ตีลังกา' },
  { id: 'stretch', label: 'บิดขี้เกียจ' },
  { id: 'bow', label: 'โค้ง' },
  { id: 'wiggle', label: 'ส่ายก้น' },
  { id: 'stomp', label: 'กระทืบเท้า' },
  { id: 'tiptoe', label: 'เขย่งเท้า' },
];
/** ท่าเล่นเองตอนอยู่เฉยๆ */
export const IDLE_ACTIONS: ActionId[] = ['hop', 'wiggle', 'stretch', 'wave', 'tiptoe'];

export interface Species {
  id: string;
  label: string;
  body: string;
  dark: string;
  light: string;
  ears: 'round' | 'cat' | 'fox' | 'flop' | 'long' | 'koala' | 'panda' | 'mouse' | 'pig' | 'cow' | 'sheep' | 'elephant' | 'monkey' | 'lion' | 'frog' | 'tuft' | 'owl' | 'dino' | 'dragon' | 'unicorn' | 'none';
  tail: 'none' | 'long' | 'bushy' | 'puff' | 'curl' | 'stripe' | 'tuft' | 'dino' | 'arrow' | 'shell' | 'wings' | 'wool';
  nose: 'none' | 'cat' | 'dog' | 'snout' | 'beak' | 'bill' | 'trunk' | 'monkey' | 'bear';
  mark?: 'stripes' | 'patches' | 'eyes' | 'belly' | 'spots' | 'mask';
  /** ท่าประจำตัว */
  move: ActionId;
  /** ปลดล็อกเมื่อ total[ev] >= need (ไม่มี = มีตั้งแต่แรก) */
  ev?: PetEv;
  need?: number;
}

const S = (id: string, label: string, body: string, dark: string, light: string, ears: Species['ears'], tail: Species['tail'], nose: Species['nose'], move: ActionId, ev: PetEv, need: number, mark?: Species['mark']): Species => ({ id, label, body, dark, light, ears, tail, nose, move, ev, need, mark });

export const PUNG = 'pung';
export const SPECIES: Species[] = [
  { id: PUNG, label: 'ปุ๋ง', body: '', dark: '', light: '', ears: 'round', tail: 'none', nose: 'none', move: 'dance' },
  S('cat', 'แมวเหมียว', '#f7b267', '#c9792b', '#ffe3c2', 'cat', 'long', 'cat', 'stretch', 'feed', 3),
  S('dog', 'น้องหมา', '#d9a273', '#94633a', '#f6e1cc', 'flop', 'curl', 'dog', 'wiggle', 'pet', 10),
  S('rabbit', 'กระต่าย', '#f5eef3', '#b8a4b3', '#ffd6e6', 'long', 'puff', 'cat', 'hop', 'veg', 3),
  S('hamster', 'แฮมสเตอร์', '#f3c98b', '#b98a45', '#fff1d6', 'mouse', 'none', 'cat', 'tiptoe', 'correct', 5),
  S('duck', 'เป็ดน้อย', '#ffe066', '#d9a81e', '#fff5bf', 'tuft', 'wings', 'bill', 'wiggle', 'wash', 2),
  S('chick', 'ลูกเจี๊ยบ', '#ffd23f', '#d39a10', '#fff0a8', 'tuft', 'wings', 'beak', 'hop', 'game', 2),
  S('frog', 'กบเขียว', '#7bd661', '#3f9e33', '#d7f7c4', 'frog', 'none', 'none', 'jump', 'puzzle', 1),
  S('pig', 'หมูน้อย', '#ffb3c7', '#d9708f', '#ffe0e8', 'pig', 'curl', 'snout', 'stomp', 'feed', 15),
  S('sheep', 'แกะปุยนุ่น', '#f4f1ea', '#a9a294', '#ffffff', 'sheep', 'wool', 'bear', 'bow', 'sleep', 3),
  S('bear', 'หมีน้ำตาล', '#a9754f', '#6d4528', '#e2c3a4', 'round', 'none', 'bear', 'stomp', 'visit', 3),
  S('koala', 'โคอาลา', '#a8b0bd', '#6b7380', '#e6e9ee', 'koala', 'none', 'dog', 'stretch', 'sleep', 8),
  S('cow', 'วัวนม', '#fbfaf6', '#6b6459', '#ffd6e0', 'cow', 'long', 'snout', 'bow', 'veg', 10, 'patches'),
  S('monkey', 'ลิงจ๋อ', '#a5714a', '#6a4326', '#f3d4b2', 'monkey', 'curl', 'monkey', 'flip', 'game', 8),
  S('turtle', 'เต่าใจดี', '#8fd694', '#4b9c55', '#eaf7c8', 'none', 'shell', 'none', 'tiptoe', 'puzzle', 3, 'spots'),
  S('penguin', 'เพนกวิน', '#4a5578', '#2a3250', '#ffffff', 'none', 'wings', 'beak', 'wiggle', 'wash', 8, 'belly'),
  S('fox', 'จิ้งจอก', '#ff9147', '#c75c17', '#fff0e0', 'fox', 'bushy', 'cat', 'spin', 'correct', 30),
  S('panda', 'แพนด้า', '#fafafa', '#2f2f3a', '#ffffff', 'panda', 'puff', 'dog', 'flip', 'correct', 60, 'eyes'),
  S('owl', 'นกฮูก', '#a98467', '#6c4d36', '#efe0c8', 'owl', 'wings', 'beak', 'shake', 'puzzle', 7, 'eyes'),
  S('tiger', 'เสือน้อย', '#ffa63d', '#b96a10', '#fff0d0', 'round', 'stripe', 'cat', 'stomp', 'game', 25, 'stripes'),
  S('raccoon', 'แรคคูน', '#9aa0ad', '#555b68', '#e8eaef', 'cat', 'stripe', 'dog', 'tiptoe', 'pet', 60, 'mask'),
  S('elephant', 'ช้างน้อย', '#a9b8d0', '#66768f', '#ffd6e0', 'elephant', 'long', 'trunk', 'stomp', 'buy', 5),
  S('lion', 'สิงโต', '#ffc85c', '#c98a1c', '#fff0c4', 'lion', 'tuft', 'cat', 'jump', 'correct', 120),
  S('dino', 'ไดโนเสาร์', '#6fcf97', '#2f8f5f', '#d8f5e2', 'dino', 'dino', 'none', 'stomp', 'visit', 10),
  S('unicorn', 'ยูนิคอร์น', '#fbeeff', '#b38ad6', '#ffd9f0', 'unicorn', 'bushy', 'none', 'spin', 'puzzle', 20),
  S('dragon', 'มังกรน้อย', '#8e7bff', '#5238c9', '#ffe08a', 'dragon', 'arrow', 'none', 'flip', 'correct', 300, 'belly'),
];

const byId = new Map(SPECIES.map((s) => [s.id, s]));
export const speciesById = (id?: string) => (id ? byId.get(id) : undefined);

export const speciesOpen = (pet: Pick<PetState, 'total'>, s: Species) => !s.ev || (pet.total[s.ev] || 0) >= (s.need || 0);
export const openSpeciesCount = (pet: Pick<PetState, 'total'>) => SPECIES.filter((s) => speciesOpen(pet, s)).length;

const HOW: Partial<Record<PetEv, string>> = {
  feed: 'ป้อนอาหาร', pet: 'ลูบหัว', veg: 'กินผักผลไม้', correct: 'ตอบถูก', wash: 'อาบน้ำ', game: 'เล่นมินิเกม', puzzle: 'เล่นปริศนา', sleep: 'พาเข้านอน', visit: 'มาเยี่ยม', buy: 'ซื้อของ',
};
const UNIT: Partial<Record<PetEv, string>> = { correct: 'ข้อ', puzzle: 'วัน', visit: 'วัน', buy: 'ชิ้น', veg: 'ครั้ง' };
export const unlockText = (s: Species) => (s.ev ? `${HOW[s.ev]} ${s.need} ${UNIT[s.ev] || 'ครั้ง'}` : '');
