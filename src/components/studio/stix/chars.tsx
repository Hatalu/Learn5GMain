import React from 'react';
import { C, D, E, O, P, R, cheeks, eyes, mk, star } from './kit';
import { tx } from './life';
import type { StickerDef } from '../stickers';

/* ------------------------------------------------------------ หัวสัตว์น่ารัก */

type Ear = 'cat' | 'round' | 'bunny' | 'floppy' | 'none' | 'small';
interface Head {
  c: string; // สีหัว
  ear: Ear;
  inner?: string; // สีในหู
  snout?: string; // ปาก/จมูกยื่น
  nose?: string;
  back?: React.ReactNode; // วาดก่อนหัว
  front?: React.ReactNode; // วาดทับหน้า
  noMouth?: boolean;
}
function head(h: Head) {
  const inner = h.inner ?? '#ffb3c8';
  const ears: Record<Ear, React.ReactNode> = {
    cat: (
      <>
        {P('M20 40 L18 8 L44 24 Z', h.c)}
        {P('M80 40 L82 8 L56 24 Z', h.c)}
        {P('M24 32 L23 16 L36 24 Z', inner, 0)}
        {P('M76 32 L77 16 L64 24 Z', inner, 0)}
      </>
    ),
    round: (
      <>
        {C(22, 24, 13, h.c)}
        {C(78, 24, 13, h.c)}
        {D(22, 24, 6, inner)}
        {D(78, 24, 6, inner)}
      </>
    ),
    small: (
      <>
        {C(26, 26, 8, h.c)}
        {C(74, 26, 8, h.c)}
      </>
    ),
    bunny: (
      <>
        {E(36, 18, 9, 22, h.c)}
        {E(64, 18, 9, 22, h.c)}
        <ellipse cx="36" cy="18" rx="4" ry="14" fill={inner} stroke="none" />
        <ellipse cx="64" cy="18" rx="4" ry="14" fill={inner} stroke="none" />
      </>
    ),
    floppy: null,
    none: null,
  };
  return (
    <>
      {h.back}
      {ears[h.ear]}
      {E(50, 56, 38, 34, h.c)}
      {h.ear === 'floppy' && (
        <>
          {P('M18 34 Q4 40 8 66 Q16 72 24 60 Z', inner === '#ffb3c8' ? '#a8744a' : inner)}
          {P('M82 34 Q96 40 92 66 Q84 72 76 60 Z', inner === '#ffb3c8' ? '#a8744a' : inner)}
        </>
      )}
      {h.snout && E(50, 68, 15, 11, h.snout)}
      {eyes(54, 14, 50, 4.5)}
      {cheeks(66, 25)}
      {h.nose !== '' && E(50, 63, 5, 3.5, h.nose ?? O, 0)}
      {!h.noMouth && P('M44 70 Q47 74 50 70 Q53 74 56 70', 'none', 3)}
      {h.front}
    </>
  );
}
const a = mk('animal');
const stripes = (col: string) => <path d="M50 23 V33 M37 25 L40 33 M63 25 L60 33" stroke={col} strokeWidth="4" strokeLinecap="round" />;

export const ANIMALS2: StickerDef[] = [
  a('an-cat', 'แมวเหมียว', 'สัตว์ cat แมว', head({ c: '#ffc27a', ear: 'cat', front: <path d="M14 60 H28 M14 68 H28 M72 60 H86 M72 68 H86" stroke={O} strokeWidth="2.5" /> })),
  a('an-dog', 'หมาน้อย', 'สัตว์ dog หมา สุนัข', head({ c: '#f2d3a8', ear: 'floppy', snout: '#fff' })),
  a('an-bear', 'หมีน้อย', 'สัตว์ bear หมี', head({ c: '#c8935f', ear: 'round', snout: '#f2d3a8', inner: '#a8744a' })),
  a('an-bunny', 'กระต่าย', 'สัตว์ rabbit bunny กระต่าย', head({ c: '#fff', ear: 'bunny' })),
  a('an-panda', 'แพนด้า', 'สัตว์ panda แพนด้า', head({ c: '#fff', ear: 'round', inner: O, front: <><ellipse cx="36" cy="54" rx="9" ry="11" fill={O} stroke="none" /><ellipse cx="64" cy="54" rx="9" ry="11" fill={O} stroke="none" />{D(37, 52, 2.5, '#fff')}{D(65, 52, 2.5, '#fff')}</> })),
  a('an-pig', 'หมูน้อย', 'สัตว์ pig หมู', head({ c: '#ffb3c8', ear: 'cat', inner: '#ff8fb0', nose: '', noMouth: true, front: <>{E(50, 68, 12, 8, '#ff8fb0')}{D(46, 68, 2)}{D(54, 68, 2)}</> })),
  a('an-frog', 'กบ', 'สัตว์ frog กบ', <>{C(30, 28, 15, '#8ee06a')}{C(70, 28, 15, '#8ee06a')}{E(50, 58, 40, 30, '#8ee06a')}{C(30, 28, 9, '#fff', 0)}{C(70, 28, 9, '#fff', 0)}{D(30, 28, 5)}{D(70, 28, 5)}{cheeks(64, 26)}{P('M34 66 Q50 78 66 66', 'none', 3.5)}</>),
  a('an-fox', 'จิ้งจอก', 'สัตว์ fox จิ้งจอก', head({ c: '#ff9a4a', ear: 'cat', inner: '#fff', front: <>{P('M20 62 Q36 58 50 76 Q64 58 80 62 Q72 88 50 90 Q28 88 20 62 Z', '#fff', 0)}{E(50, 64, 5, 3.5, O, 0)}</> })),
  a('an-mouse', 'หนูน้อย', 'สัตว์ mouse หนู', head({ c: '#c9cfe0', ear: 'round', inner: '#ffb3c8', front: <path d="M14 62 H30 M14 70 H30 M70 62 H86 M70 70 H86" stroke={O} strokeWidth="2.5" /> })),
  a('an-lion', 'สิงโต', 'สัตว์ lion สิงโต', head({ c: '#ffcf6a', ear: 'small', snout: '#fff2c8', back: <polygon points={star(14, 36, 50, 54, 48)} fill="#e98a3a" stroke={O} strokeWidth="4" strokeLinejoin="round" /> })),
  a('an-monkey', 'ลิง', 'สัตว์ monkey ลิง', head({ c: '#a8744a', ear: 'round', inner: '#f2d3a8', front: <>{P('M30 50 Q30 36 42 40 Q50 44 58 40 Q70 36 70 50 Q74 84 50 86 Q26 84 30 50 Z', '#f2d3a8', 0)}{eyes(54, 12, 50, 4.5)}{E(50, 66, 4, 3, O, 0)}{P('M42 74 Q50 80 58 74', 'none', 3)}</> })),
  a('an-owl', 'นกฮูก', 'สัตว์ owl นกฮูก นก', <>{P('M22 30 L16 8 L36 22 M78 30 L84 8 L64 22', '#a8744a')}{E(50, 56, 38, 38, '#a8744a')}{E(50, 70, 22, 20, '#f2d3a8', 0)}{C(34, 46, 13, '#fff')}{C(66, 46, 13, '#fff')}{D(34, 46, 6)}{D(66, 46, 6)}{P('M44 56 L50 66 L56 56 Z', '#ffc93c', 3)}</>),
  a('an-chick', 'ลูกเจี๊ยบ', 'สัตว์ chick ไก่ นก', <>{P('M44 14 Q46 4 52 12 Q56 4 58 16', 'none', 3)}{C(50, 54, 38, '#ffe27a')}{eyes(48, 13, 50, 4.5)}{cheeks(60, 24)}{P('M42 58 L50 66 L58 58 L50 54 Z', '#ffa53a', 3)}</>),
  a('an-penguin', 'เพนกวิน', 'สัตว์ penguin เพนกวิน', <>{E(50, 54, 38, 40, '#3a4a8a')}{P('M24 56 Q24 30 50 32 Q76 30 76 56 Q76 88 50 90 Q24 88 24 56 Z', '#fff', 0)}{eyes(48, 12, 50, 4.5)}{cheeks(58, 20)}{P('M44 56 L50 64 L56 56 Z', '#ffa53a', 3)}</>),
  a('an-koala', 'โคอาลา', 'สัตว์ koala โคอาลา', head({ c: '#b8bfd0', ear: 'round', inner: '#fff', nose: '', front: <>{E(50, 64, 8, 10, '#5a6488')}</>, noMouth: true })),
  a('an-cow', 'วัว', 'สัตว์ cow วัว ฟาร์ม', head({ c: '#fff', ear: 'small', snout: '#ffb3c8', nose: '', back: <>{P('M30 30 Q22 14 28 8 M70 30 Q78 14 72 8', 'none', 6)}</>, front: <>{D(44, 68, 2.5)}{D(56, 68, 2.5)}<path d="M66 30 Q78 34 76 44 Q66 46 64 36 Z" fill={O} stroke="none" /></> })),
  a('an-tiger', 'เสือ', 'สัตว์ tiger เสือ', head({ c: '#ffa53a', ear: 'round', inner: '#fff', snout: '#fff', front: stripes(O) })),
  a('an-elephant', 'ช้าง', 'สัตว์ elephant ช้าง ไทย', <>{E(18, 50, 16, 24, '#a8b4d8')}{E(82, 50, 16, 24, '#a8b4d8')}{E(50, 50, 32, 32, '#b8c4e8')}{P('M44 66 Q42 92 30 90 M56 66 Q56 96 30 94', 'none', 0)}{P('M42 62 Q40 88 28 88 Q24 92 30 94 Q48 96 56 64 Z', '#b8c4e8')}{eyes(48, 12, 50, 4)}{cheeks(58, 22)}</>),
  a('an-hamster', 'แฮมสเตอร์', 'สัตว์ hamster หนู', head({ c: '#ffcf8a', ear: 'small', inner: '#ffb3c8', front: <>{E(28, 70, 12, 10, '#fff', 0)}{E(72, 70, 12, 10, '#fff', 0)}</> })),
  a('an-unicorn', 'ยูนิคอร์น', 'สัตว์ unicorn ม้า', head({ c: '#fff', ear: 'cat', inner: '#ffb3c8', back: <>{P('M50 24 L44 0 L58 22', '#ffd84a')}{P('M20 40 Q10 20 30 18 Q40 10 50 20', '#c9a6ff')}</> })),
];

/* ------------------------------------------------------------ อารมณ์ */
const fe = mk('feel');
const blob = (c: string, kids: React.ReactNode) => (
  <>
    {P('M50 8 Q84 8 88 46 Q92 88 50 92 Q8 88 12 46 Q16 8 50 8 Z', c)}
    {kids}
  </>
);
const lid = (y: number) => P(`M28 ${y} Q36 ${y - 6} 44 ${y} M56 ${y} Q64 ${y - 6} 72 ${y}`, 'none', 3.5);

export const FEELINGS: StickerDef[] = [
  fe('em-happy', 'มีความสุข', 'อารมณ์ happy ดีใจ สุข', blob('#ffd84a', <>{eyes(44, 14, 50, 5)}{cheeks(56, 24)}{P('M36 60 Q50 74 64 60', 'none', 4)}</>)),
  fe('em-laugh', 'หัวเราะ', 'อารมณ์ laugh หัวเราะ ขำ', blob('#ffc93c', <>{lid(44)}{P('M30 56 H70 Q66 80 50 80 Q34 80 30 56 Z', '#ff6b81')}{cheeks(54, 30)}</>)),
  fe('em-sad', 'เศร้า', 'อารมณ์ sad เศร้า เสียใจ', blob('#9fc4ff', <>{eyes(46, 14, 50, 5)}{P('M38 70 Q50 60 62 70', 'none', 4)}{P('M30 36 L42 32 M70 36 L58 32', 'none', 3)}</>)),
  fe('em-cry', 'ร้องไห้', 'อารมณ์ cry ร้องไห้', blob('#9fc4ff', <>{lid(44)}{P('M30 50 Q26 66 30 76 M70 50 Q74 66 70 76', '#7cc6ff', 3)}{P('M38 72 Q50 62 62 72', 'none', 4)}</>)),
  fe('em-angry', 'โกรธ', 'อารมณ์ angry โกรธ', blob('#ff7a6b', <>{P('M28 34 L44 42 M72 34 L56 42', 'none', 4)}{eyes(48, 13, 50, 4.5)}{P('M38 70 Q50 62 62 70', 'none', 4)}</>)),
  fe('em-wow', 'ตกใจ ว้าว', 'อารมณ์ surprised wow ตกใจ ประหลาดใจ', blob('#ffe27a', <>{C(36, 42, 8, '#fff')}{C(64, 42, 8, '#fff')}{D(36, 42, 4)}{D(64, 42, 4)}{E(50, 68, 8, 10, O)}</>)),
  fe('em-love', 'ตาหัวใจ', 'อารมณ์ love รัก หัวใจ', blob('#ffb3d0', <>{P('M36 50 Q24 42 28 34 Q32 28 36 34 Q40 28 44 34 Q48 42 36 50 Z', '#ef3f5b', 2.5)}{P('M64 50 Q52 42 56 34 Q60 28 64 34 Q68 28 72 34 Q76 42 64 50 Z', '#ef3f5b', 2.5)}{P('M38 62 Q50 74 62 62', 'none', 4)}</>)),
  fe('em-cool', 'เท่ใส่แว่น', 'อารมณ์ cool เท่ แว่นดำ', blob('#7cc6ff', <>{P('M20 38 H80', 'none', 4)}{P('M24 38 H46 Q46 54 35 54 Q24 54 24 38 Z M54 38 H76 Q76 54 65 54 Q54 54 54 38 Z', O)}{P('M40 68 Q52 74 62 64', 'none', 4)}</>)),
  fe('em-sleepy', 'ง่วงนอน', 'อารมณ์ sleepy ง่วง นอน', blob('#c9a6ff', <>{P('M28 46 Q36 52 44 46 M56 46 Q64 52 72 46', 'none', 3.5)}{E(50, 68, 6, 5, O)}{tx(80, 26, 'Z', 18)}{tx(90, 12, 'z', 12)}</>)),
  fe('em-think', 'กำลังคิด', 'อารมณ์ thinking คิด สงสัย', blob('#ffd1a8', <>{eyes(44, 13, 50, 4.5)}{P('M30 32 L42 30 M58 26 L70 32', 'none', 3)}{P('M42 66 H60', 'none', 4)}{C(78, 70, 9, '#ffd1a8')}</>)),
  fe('em-wink', 'ขยิบตา', 'อารมณ์ wink ขยิบตา', blob('#8ee06a', <>{D(36, 44, 5)}{P('M58 44 Q64 38 72 44', 'none', 3.5)}{cheeks(56, 24)}{P('M38 62 Q50 72 62 62', 'none', 4)}</>)),
  fe('em-silly', 'แลบลิ้น', 'อารมณ์ silly ทะเล้น แลบลิ้น', blob('#ffa53a', <>{eyes(44, 14, 50, 5)}{P('M34 60 H66', 'none', 4)}{P('M44 60 V72 Q50 80 56 72 V60', '#ff6b81', 3)}</>)),
  fe('em-scared', 'กลัว', 'อารมณ์ scared กลัว', blob('#d9e4ff', <>{C(36, 42, 7, '#fff')}{C(64, 42, 7, '#fff')}{D(36, 43, 3)}{D(64, 43, 3)}{P('M34 68 L40 64 L46 68 L52 64 L58 68 L64 64', 'none', 3)}{P('M84 30 Q90 40 84 46', 'none', 3)}</>)),
  fe('em-proud', 'ภูมิใจ', 'อารมณ์ proud ภูมิใจ', blob('#ffd84a', <>{lid(44)}{cheeks(54, 24)}{P('M38 62 Q50 72 62 62', 'none', 4)}<polygon points={star(5, 5, 80, 20, 12)} fill="#ff8a2a" stroke={O} strokeWidth="3" /></>)),
  fe('em-shy', 'เขิน', 'อารมณ์ shy เขิน อาย', blob('#ffd1dd', <>{P('M30 44 Q36 40 42 44 M58 44 Q64 40 70 44', 'none', 3.5)}<ellipse cx="30" cy="56" rx="9" ry="5" fill="#ff7aa0" stroke="none" /><ellipse cx="70" cy="56" rx="9" ry="5" fill="#ff7aa0" stroke="none" />{P('M30 54 L36 58 M66 54 L72 58', 'none', 2)}{P('M44 66 Q50 70 56 66', 'none', 3.5)}</>)),
  fe('em-confused', 'งง', 'อารมณ์ confused งง', blob('#b8f0d0', <>{D(36, 44, 5)}{C(64, 44, 7, 'none', 3)}{P('M38 68 Q44 62 50 68 Q56 74 62 68', 'none', 3.5)}{tx(82, 28, '?', 24)}</>)),
  fe('em-excited', 'ตื่นเต้น', 'อารมณ์ excited ตื่นเต้น ดาว', blob('#ff9fd0', <><polygon points={star(5, 4, 36, 44, 10)} fill="#ffd84a" stroke={O} strokeWidth="2.5" /><polygon points={star(5, 4, 64, 44, 10)} fill="#ffd84a" stroke={O} strokeWidth="2.5" />{P('M34 60 H66 Q62 78 50 78 Q38 78 34 60 Z', '#fff')}</>)),
  fe('em-calm', 'สงบ', 'อารมณ์ calm สงบ ผ่อนคลาย สมาธิ', blob('#b8e6ff', <>{P('M28 46 Q36 52 44 46 M56 46 Q64 52 72 46', 'none', 3.5)}{P('M42 64 Q50 70 58 64', 'none', 3.5)}{cheeks(56, 24)}</>)),
  fe('em-sick', 'ไม่สบาย', 'อารมณ์ sick ป่วย ไม่สบาย', blob('#c8ecaa', <>{lid(42)}{R(36, 56, 28, 16, '#fff', 6)}{P('M40 64 H60', 'none', 2)}{R(64, 12, 8, 30, '#fff', 4, 3)}{D(68, 36, 4, '#ff5d73')}</>)),
  fe('em-fight', 'สู้ ๆ', 'อารมณ์ determined สู้ มุ่งมั่น ตั้งใจ', blob('#ff9a5a', <>{P('M28 34 L44 40 M72 34 L56 40', 'none', 4)}{eyes(46, 13, 50, 4.5)}{P('M38 62 Q50 70 62 62', 'none', 4)}{P('M80 66 Q92 60 90 76 Q88 86 76 82 Z', '#ff9a5a')}</>)),
];

/* ------------------------------------------------------------ ป้ายข้อความ / คำชม */
const lb = mk('label');
type Shape = 'bubble' | 'cloud' | 'ribbon' | 'burst' | 'tag' | 'pill';
const shapes: Record<Shape, (c: string) => React.ReactNode> = {
  bubble: (c) => P('M14 18 H86 Q94 18 94 26 V62 Q94 70 86 70 H40 L24 88 L28 70 H14 Q6 70 6 62 V26 Q6 18 14 18 Z', c),
  cloud: (c) => P('M18 72 Q4 70 6 56 Q4 42 18 40 Q16 22 36 24 Q46 10 62 18 Q80 12 86 30 Q98 36 94 52 Q98 70 80 72 Z', c),
  ribbon: (c) => (
    <>
      {P('M4 40 L14 50 L4 60 H18 V40 Z M96 40 L86 50 L96 60 H82 V40 Z', c)}
      {R(12, 30, 76, 34, c, 4)}
    </>
  ),
  burst: (c) => <polygon points={star(14, 38, 50, 50, 48)} fill={c} stroke={O} strokeWidth="4" strokeLinejoin="round" />,
  tag: (c) => (
    <>
      {P('M24 24 H90 V76 H24 L6 50 Z', c)}
      {C(17, 50, 3.5, '#fff', 2.5)}
    </>
  ),
  pill: (c) => R(4, 30, 92, 40, c, 20),
};
const words: [string, string, string, Shape, string, number][] = [
  ['lb-great', 'เก่งมาก', 'คำชม great เก่ง', 'burst', '#ffd84a', 17],
  ['lb-excellent', 'ยอดเยี่ยม', 'คำชม excellent ยอดเยี่ยม', 'ribbon', '#ff8fbf', 16],
  ['lb-fight', 'สู้ ๆ นะ', 'คำชม ให้กำลังใจ fighting สู้', 'bubble', '#ffc27a', 17],
  ['lb-try', 'พยายามดีมาก', 'คำชม ให้กำลังใจ good try พยายาม', 'cloud', '#bfe8ff', 13],
  ['lb-cando', 'ทำได้!', 'คำชม you can do it ทำได้', 'burst', '#8ee06a', 18],
  ['lb-wow', 'ว้าว!', 'คำชม wow ว้าว', 'bubble', '#c9a6ff', 22],
  ['lb-hello', 'สวัสดี', 'ทักทาย hello สวัสดี', 'cloud', '#fff', 18],
  ['lb-thanks', 'ขอบคุณ', 'ทักทาย thank you ขอบคุณ', 'pill', '#ffb3d0', 20],
  ['lb-goodjob', 'Good job!', 'คำชม อังกฤษ good job', 'burst', '#7cc6ff', 14],
  ['lb-awesome', 'Awesome!', 'คำชม อังกฤษ awesome', 'ribbon', '#ffd84a', 14],
  ['lb-wellldone', 'Well done', 'คำชม อังกฤษ well done', 'pill', '#8ee06a', 16],
  ['lb-keepgoing', 'Keep going', 'คำชม อังกฤษ keep going ให้กำลังใจ', 'bubble', '#ffc27a', 13],
  ['lb-hw', 'การบ้าน', 'ป้าย homework การบ้าน', 'tag', '#ff8a6b', 18],
  ['lb-important', 'สำคัญ!', 'ป้าย important สำคัญ', 'burst', '#ff5d73', 17],
  ['lb-remember', 'จำไว้นะ', 'ป้าย remember จำ', 'bubble', '#ffe27a', 17],
  ['lb-review', 'ทบทวน', 'ป้าย review ทบทวน', 'tag', '#7cc6ff', 19],
  ['lb-new', 'ใหม่!', 'ป้าย new ใหม่', 'burst', '#ffa53a', 22],
  ['lb-test', 'แบบทดสอบ', 'ป้าย test quiz สอบ', 'ribbon', '#b38cff', 15],
  ['lb-activity', 'กิจกรรม', 'ป้าย activity กิจกรรม', 'pill', '#5fc66a', 19],
  ['lb-question', 'คำถาม?', 'ป้าย question คำถาม', 'cloud', '#bfe8ff', 18],
  ['lb-answer', 'เฉลย', 'ป้าย answer เฉลย', 'tag', '#8ee06a', 20],
  ['lb-tip', 'เกร็ดความรู้', 'ป้าย tip รู้ไหม ความรู้', 'bubble', '#fff2b0', 13],
  ['lb-example', 'ตัวอย่าง', 'ป้าย example ตัวอย่าง', 'pill', '#ffd1a8', 19],
  ['lb-done', 'เสร็จแล้ว', 'ป้าย done เสร็จ', 'ribbon', '#5aa8ff', 16],
];
const textY: Record<Shape, number> = { bubble: 50, cloud: 54, ribbon: 53, burst: 56, tag: 56, pill: 56 };
const textX: Record<Shape, number> = { bubble: 50, cloud: 50, ribbon: 50, burst: 50, tag: 58, pill: 50 };
const room: Record<Shape, number> = { bubble: 78, cloud: 70, ribbon: 68, burst: 58, tag: 56, pill: 82 };
/** ย่อตัวอักษรให้พอดีป้าย: นับเฉพาะตัวที่กินที่ (สระบน/ล่าง วรรณยุกต์ไม่นับ) กว้างราว 0.72 เท่าของขนาดฟอนต์ */
const fit = (t: string, sh: Shape, max: number) => Math.min(max, room[sh] / (0.72 * t.replace(/[ัิ-ฺ็-๎]/g, '').length));
export const LABELS: StickerDef[] = words.map(([id, t, tags, sh, c, size]) => lb(id, t, tags, <>{shapes[sh](c)}{tx(textX[sh], textY[sh], t, Math.round(fit(t, sh, size + 4) * 10) / 10)}</>));

/* ------------------------------------------------------------ ตัวอักษร / ตัวเลข */
const TILE = ['#ff8fa0', '#ffc27a', '#ffe27a', '#a8e88a', '#9fd4ff', '#c9b0ff', '#ffb3e0'];
const tile = (i: number, t: string, size: number, y = 66) => (
  <>
    {R(8, 12, 84, 84, '#5a4a8a', 18)}
    {R(8, 8, 84, 80, TILE[i % TILE.length], 18)}
    <path d="M20 20 Q30 14 44 16" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity=".8" />
    {tx(50, y, t, size)}
  </>
);
const TH = 'ก ไก่,ข ไข่,ฃ ขวด,ค ควาย,ฅ คน,ฆ ระฆัง,ง งู,จ จาน,ฉ ฉิ่ง,ช ช้าง,ซ โซ่,ฌ เฌอ,ญ หญิง,ฎ ชฎา,ฏ ปฏัก,ฐ ฐาน,ฑ มณโฑ,ฒ ผู้เฒ่า,ณ เณร,ด เด็ก,ต เต่า,ถ ถุง,ท ทหาร,ธ ธง,น หนู,บ ใบไม้,ป ปลา,ผ ผึ้ง,ฝ ฝา,พ พาน,ฟ ฟัน,ภ สำเภา,ม ม้า,ย ยักษ์,ร เรือ,ล ลิง,ว แหวน,ศ ศาลา,ษ ฤๅษี,ส เสือ,ห หีบ,ฬ จุฬา,อ อ่าง,ฮ นกฮูก'.split(',');
const th = mk('thaiabc');
const en = mk('abc');
const num = mk('number');
const NUMW = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
const NUME = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
const THD = '๐๑๒๓๔๕๖๗๘๙';

export const LETTERS: StickerDef[] = [
  ...TH.map((x, i) => th(`th-${i + 1}`, x, `พยัญชนะ ตัวอักษรไทย อักษร ${x} thai alphabet`, tile(i, x.split(' ')[0], 54, 68))),
  ...Array.from({ length: 26 }, (_, i) => {
    const L = String.fromCharCode(65 + i);
    return en(`en-${L.toLowerCase()}`, `${L}${L.toLowerCase()}`, `ตัวอักษรอังกฤษ alphabet letter ${L} ${L.toLowerCase()}`, tile(i + 3, `${L}${L.toLowerCase()}`, 44, 66));
  }),
  ...NUMW.map((w, i) => num(`num-${i}`, `เลข ${i} ${w}`, `ตัวเลข number ${NUME[i]} ${THD[i]} ${w}`, tile(i + 1, String(i), 56, 70))),
];
