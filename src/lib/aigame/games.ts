/**
 * คลังเกม 3D: ครูเลือกเกม ปรับวิชา/ชั้น/เนื้อหา แล้วบันทึกเป็นไฟล์เกม HTML ไปเปิดในห้องเรียน
 * ข้อมูลล้วน (ใช้ทั้งหน้าเว็บและ selftest) · id ห้ามเปลี่ยน (ลิงก์ ?g= อ้างถึง) เพิ่มต่อท้ายได้
 * ตัวเกมจริงอยู่ hooks/<id>.ts (โค้ดที่ฝังในไฟล์เกม) · cfg = เวลาพื้นฐาน (วินาที ที่ความเร็ว "ปกติ") คูณตามความเร็วที่ครูเลือก
 */

/**
 * การกระทำการเรียนรู้ = สิ่งที่เด็กทำกับความรู้ในเกม (กลไกเกมต้องเป็นการกระทำเดียวกับบทเรียน)
 * pick = ระบุ/จำ/คำนวณแล้วเลือกคำตอบ · sort = แยกของเข้าหมวด · order = เรียงขั้นตอน/ลำดับ
 */
export type Act = 'pick' | 'sort' | 'order';

export const ACTS: { id: Act; th: string; sub: string; unit: string }[] = [
  { id: 'pick', th: 'เลือกคำตอบ', sub: 'จำ คำนวณ ตีความ แล้วเลือกคำตอบที่ถูก', unit: 'ข้อ' },
  { id: 'sort', th: 'จัดกลุ่ม', sub: 'แยกของเข้าหมวด เช่น วัสดุ ชนิดคำ คู่-คี่', unit: 'ชิ้น' },
  { id: 'order', th: 'เรียงลำดับ', sub: 'เรียงขั้นตอน วัฏจักร ตัวเลข เหตุการณ์', unit: 'ชุด' },
];
export const actOf = (id: Act) => ACTS.find((a) => a.id === id)!;

export interface AiGame {
  id: string;
  /** ชื่อเกม (ไทย) */
  name: string;
  /** ชื่อเกมภาษาอังกฤษ (หน้าเริ่มเกมเมื่อเลือกภาษาอังกฤษ) */
  en: string;
  act: Act;
  /** สีหลักของการ์ด */
  color: string;
  /** สีท้องฟ้า/พื้นหลังฉาก */
  sky: string;
  /** อธิบายเกมหนึ่งบรรทัด */
  pitch: string;
  /** วิธีเล่น 3 ขั้น (สั้น) */
  how: [string, string, string];
  /** วิธีเล่นภาษาอังกฤษ (หน้าเริ่มเกม) */
  howEn: string;
  /** เหมาะกับ */
  fit: string;
  /** เวลาพื้นฐาน (วินาที) */
  cfg: Record<string, number>;
  /** ไม่มีช่วงอ่านโจทย์ก่อนเล่น (โจทย์สั้น เล่นต่อเนื่อง) */
  noRead?: boolean;
  /** มีโหมดเล็ง/กะจังหวะเอง: คำอธิบายวิธีเล่นในโหมดนั้น */
  aim?: string;
  /** เกมทักษะล้วน: วิธีตอบคือตัวเกมเอง ไม่มีโหมดแตะเลือก (CONFIG.aim = 1 เสมอ) */
  skill?: boolean;
}

export const AI_GAMES: AiGame[] = [
  {
    id: 'runner',
    name: 'วิ่งผ่านประตูคำตอบ',
    en: 'Answer Gate Run',
    act: 'pick',
    color: '#4fb3ff',
    sky: '#ffe1f0',
    pitch: 'วิ่งบนถนน 3 เลน เปลี่ยนเลนไปชนประตูที่มีคำตอบถูก',
    how: ['อ่านคำถาม', 'แตะการ์ดหรือกดลูกศร เปลี่ยนเลนไปประตูที่ถูก', 'ผ่านประตูถูกได้คะแนน'],
    howEn: 'Read the question, switch lanes with the arrows or the cards, run through the right gate.',
    fit: 'ทุกวิชา · ชอบความเร็ว',
    cfg: { gateTravelSec: 7, gapSec: 1.2 },
  },
  {
    id: 'space',
    name: 'ยานอวกาศบินลอดวงแหวน',
    en: 'Star Ring Pilot',
    act: 'pick',
    color: '#7c5cf0',
    sky: '#1d1846',
    pitch: 'ขับยานบินผ่านอวกาศ ลอดวงแหวนที่มีคำตอบถูก',
    how: ['อ่านคำถามบนจอยาน', 'แตะการ์ดหรือกดลูกศร บังคับยานไปวงแหวนที่ถูก', 'ลอดวงแหวนถูกได้คะแนน'],
    howEn: 'Read the question and steer the ship through the ring with the right answer.',
    fit: 'ป.3 ขึ้นไป · วิทย์ คณิต อังกฤษ',
    cfg: { ringTravelSec: 7.5, gapSec: 1.2 },
  },
  {
    id: 'roll',
    aim: 'ลากถอยหลังจากบอลแล้วปล่อยเหมือนดีดลูกแก้ว บอลกลิ้งเด้งขอบโต๊ะ เข้าประตูบ้านไหนนับบ้านนั้น',
    name: 'บอลกลิ้งกลับบ้าน',
    en: 'Roll Home Sort',
    act: 'sort',
    color: '#ff8a5c',
    sky: '#d9f3ff',
    pitch: 'บอลนุ่มถือป้ายของ แตะบ้านหมวดที่ถูกให้บอลกลิ้งเข้าบ้าน',
    how: ['ดูของที่บอลถืออยู่', 'แตะบ้านหมวดที่ถูก บอลจะกลิ้งเข้าไป', 'เข้าผิดบ้าน บอลเด้งกลับมาให้ลองใหม่'],
    howEn: 'Look at the item on the ball and tap the house it belongs to.',
    fit: 'จัดกลุ่ม · ป.1-ป.4',
    cfg: { rollSec: 1.1 },
    noRead: true,
  },
  {
    id: 'stack',
    aim: 'แตะบล็อกที่ถูก บล็อกจะห้อยเครนแกว่งไปมา แตะจอให้ปล่อยตอนตรงตึก',
    name: 'ต่อตึกบล็อกเรียงลำดับ',
    en: 'Block Tower Order',
    act: 'order',
    color: '#ffb547',
    sky: '#ffeccf',
    pitch: 'บล็อกแต่ละก้อนคือหนึ่งขั้น แตะตามลำดับให้ต่อเป็นตึก',
    how: ['อ่านโจทย์ว่าให้เรียงอะไร', 'แตะบล็อกที่เป็นลำดับต่อไป', 'ต่อครบ ตึกเปิดไฟฉลอง'],
    howEn: 'Read what to put in order and tap the blocks in the right order to build the tower.',
    fit: 'เรียงลำดับ · ขั้นตอน เหตุการณ์ น้อยไปมาก',
    cfg: { stackSec: 0.8 },
  },
  {
    id: 'bowl',
    aim: 'ลากจากลูกโบว์ลิ่งไปทางพินที่จะโยน แล้วปล่อย ลูกกลิ้งตรงตามแนว พลาดตกร่อง',
    name: 'โบว์ลิ่งคำตอบ',
    en: 'Answer Bowling',
    act: 'pick',
    color: '#ff6b7a',
    sky: '#ffe9d6',
    pitch: 'กลิ้งลูกโบว์ลิ่งไปชนพินที่มีคำตอบถูก ล้มกระจายทั้งแถว',
    how: ['อ่านคำถาม', 'แตะพินหรือการ์ดคำตอบที่ถูก', 'ลูกโบว์ลิ่งกลิ้งไปชน สไตรก์!'],
    howEn: 'Read the question and tap the pin with the right answer to bowl a strike.',
    fit: 'ทุกวิชา · ป.1 ขึ้นไป',
    cfg: { rollSec: 1.3 },
  },
  {
    id: 'frog',
    aim: 'กดค้างที่ใบบัวที่จะไป ยิ่งค้างนานยิ่งกระโดดไกล ไม่ถึงใบ = ตกน้ำ',
    name: 'กบกระโดดใบบัว',
    en: 'Lily Pad Hop',
    act: 'pick',
    color: '#3fc56a',
    sky: '#d6f5ff',
    pitch: 'พากบกระโดดข้ามบึงบัว เลือกใบบัวที่มีคำตอบถูกเพื่อไปต่อ',
    how: ['อ่านคำถาม', 'แตะใบบัวคำตอบที่ถูก กบจะกระโดดไป', 'ใบบัวผิดจะจมน้ำ กบว่ายกลับมาลองใหม่'],
    howEn: 'Read the question and tap the lily pad with the right answer to hop forward.',
    fit: 'ทุกวิชา · ป.1-ป.4',
    cfg: { hopSec: 0.8 },
  },
  {
    id: 'hoop',
    aim: 'ปัดขึ้นจากลูกบาส เอียงซ้าย/ขวาเพื่อเลือกห่วง ปัดยาว = แรง ต้องพอดีจึงลงห่วง',
    name: 'ชู้ตบาสคำตอบ',
    en: 'Hoop Shot Quiz',
    act: 'pick',
    color: '#ff9f43',
    sky: '#ffd9b3',
    pitch: 'ห่วงบาสแต่ละห่วงคือคำตอบ ชู้ตลูกลงห่วงที่ถูก',
    how: ['อ่านคำถาม', 'แตะห่วงหรือการ์ดคำตอบที่ถูก', 'ลูกบาสลอยโค้งลงห่วง ได้คะแนน'],
    howEn: 'Read the question and tap the hoop with the right answer to shoot.',
    fit: 'ทุกวิชา · ป.3 ขึ้นไป',
    cfg: { shotSec: 1.1 },
  },
  {
    id: 'truck',
    aim: 'ขับรถเองด้วยลูกศรซ้าย/ขวา จอดหน้าบ้านที่ถูกแล้วกดลูกศรขึ้นเพื่อส่ง',
    name: 'รถส่งของเข้าบ้าน',
    en: 'Delivery Sort',
    act: 'sort',
    color: '#2fb5c9',
    sky: '#e3f7e8',
    pitch: 'รถบรรทุกขนกล่องของมาทีละชิ้น ส่งเข้าบ้านหมวดที่ถูก',
    how: ['ดูของในกล่องบนรถ', 'แตะบ้านหมวดที่ถูก รถจะขับไปส่ง', 'ส่งผิดบ้าน รถถอยกลับให้ลองใหม่'],
    howEn: 'Look at the box on the truck and tap the house it belongs to.',
    fit: 'จัดกลุ่ม · ทุกวิชา',
    cfg: { driveSec: 1.2 },
    noRead: true,
  },
  {
    id: 'bridge',
    aim: 'แตะแผ่นไม้ที่ถูก แผ่นจะแกว่งเหนือช่องว่าง แตะจอให้ปล่อยตอนตรงช่อง',
    name: 'สร้างสะพานเรียงลำดับ',
    en: 'Bridge Builder',
    act: 'order',
    color: '#a77bff',
    sky: '#cdeeff',
    pitch: 'แผ่นไม้ลอยในแม่น้ำคือแต่ละขั้น แตะตามลำดับให้สะพานต่อจนข้ามฝั่ง',
    how: ['อ่านโจทย์ว่าให้เรียงอะไร', 'แตะแผ่นไม้ที่เป็นลำดับต่อไป', 'สะพานครบ ตัวละครเดินข้ามแม่น้ำ'],
    howEn: 'Read what to put in order and tap the planks in order to build the bridge.',
    fit: 'เรียงลำดับ · วัฏจักร ขั้นตอน ประโยค',
    cfg: { plankSec: 0.8 },
  },
  {
    id: 'plinko',
    skill: true,
    name: 'ปล่อยลูกแก้วลงช่องคำตอบ',
    en: 'Answer Drop',
    act: 'pick',
    color: '#ff9f43',
    sky: '#fff1d6',
    pitch: 'เครื่องปล่อยลูกแก้วแกว่งไปมา กะจังหวะปล่อยให้ลูกเด้งผ่านหมุดลงช่องคำตอบที่ถูก',
    how: ['อ่านคำถาม ดูช่องคำตอบด้านล่าง', 'แตะจอตอนเครื่องปล่อยอยู่ตรงที่ต้องการ', 'ลูกแก้วเด้งผ่านหมุดลงช่องไหน ตอบช่องนั้น'],
    howEn: 'Tap to drop the marble when the dropper is above the right slot. It bounces down through the pegs.',
    fit: 'ทุกวิชา · ชอบลุ้น',
    cfg: { swaySec: 4.6 },
  },
  {
    id: 'fish',
    skill: true,
    name: 'ตกปลาคำตอบ',
    en: 'Answer Fishing',
    act: 'pick',
    color: '#2fb5c9',
    sky: '#d8f4ff',
    pitch: 'เหวี่ยงเบ็ดไปหาปลาคำตอบที่ถูก แล้วค่อยๆ กดค้างดึงสาย อย่าให้สายตึงจนขาด',
    how: ['อ่านคำถาม ดูป้ายบนตัวปลา', 'ลากเล็งแล้วปล่อย เหวี่ยงทุ่นไปใกล้ปลาที่ถูก', 'ปลากินเบ็ดแล้วกดค้างดึง ปล่อยเมื่อสายตึงแดง'],
    howEn: 'Drag to aim and cast near the right fish, then hold to reel. Let go when the line gets too tight.',
    fit: 'ทุกวิชา · ฝึกใจเย็น',
    cfg: { biteSec: 1 },
  },
  {
    id: 'plane',
    skill: true,
    name: 'เครื่องบินกระดาษ',
    en: 'Paper Plane',
    act: 'pick',
    color: '#3fb0f2',
    sky: '#cdeeff',
    pitch: 'กดค้างให้เครื่องบินเชิดขึ้น ปล่อยให้ร่อนลง บังคับให้บินลอดวงแหวนคำตอบที่ถูก',
    how: ['อ่านคำถาม', 'กดค้าง = บินขึ้น ปล่อย = ร่อนลง', 'บินลอดวงแหวนคำตอบที่ถูกก่อนถึงตัว'],
    howEn: 'Hold to climb, let go to glide down. Fly through the ring with the right answer.',
    fit: 'ทุกวิชา · ป.2 ขึ้นไป',
    cfg: { gateSec: 6.5 },
  },
  {
    id: 'worm',
    skill: true,
    name: 'หนอนน้อยกินตามลำดับ',
    en: 'Hungry Worm Order',
    act: 'order',
    color: '#34c98e',
    sky: '#e6f9d6',
    pitch: 'บังคับหนอนเลื้อยไปกินผลไม้ทีละลูกตามลำดับที่ถูก ตัวหนอนยาวขึ้นเป็นลำดับให้เห็น',
    how: ['อ่านโจทย์ว่าให้เรียงอะไร', 'แตะค้างหรือลากนิ้วนำทาง หนอนเลื้อยตาม (หรือกดลูกศร)', 'กินผลไม้ตามลำดับ ตัวหนอนจะยาวขึ้นทีละปล้อง'],
    howEn: 'Guide the worm with your finger or arrow keys and eat the fruits in the right order.',
    fit: 'เรียงลำดับ · ขั้นตอน ตัวเลข วัฏจักร',
    cfg: { crawlSec: 6 },
  },
  {
    id: 'tilt',
    skill: true,
    name: 'เอียงโต๊ะลูกแก้ว',
    en: 'Tilt Table Sort',
    act: 'sort',
    color: '#ff6f61',
    sky: '#ffe6dc',
    pitch: 'เอียงโต๊ะให้ลูกแก้วที่ถือป้ายของกลิ้งลงหลุมหมวดที่ถูก ใช้แท็บเล็ตเอียงเครื่องจริงได้',
    how: ['ดูของบนลูกแก้ว', 'ลากนิ้วหรือกดลูกศรเพื่อเอียงโต๊ะ (แท็บเล็ตเอียงเครื่องได้)', 'พาลูกแก้วลงหลุมหมวดที่ถูก'],
    howEn: 'Drag or use the arrow keys (or tilt your tablet) to roll the marble into the right hole.',
    fit: 'จัดกลุ่ม · ทุกวิชา',
    cfg: { tiltSec: 1 },
    noRead: true,
  },
];

export const gameById = (id: string | null | undefined) => AI_GAMES.find((g) => g.id === id) || null;
