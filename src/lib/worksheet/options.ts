/**
 * ตู้แต่งตัวใบงาน AI: รายการตัวเลือกทั้งหมด (ข้อมูลล้วน ใช้ได้ทั้งเว็บและเซิร์ฟเวอร์)
 * ทุก id ห้ามเปลี่ยน (สูตรที่ครูบันทึก/ส่งประกวดอ้างถึง) เพิ่มต่อท้ายได้
 */

export type SubjectId = 'math' | 'eng' | 'sci' | 'thai' | 'social' | 'chinese' | 'japanese' | 'health' | 'pe';

export interface Topic {
  id: string;
  th: string;
  en: string;
  /** ชั้นที่เหมาะ 1-12 (ป.1 = 1, ม.1 = 7) */
  g: [number, number];
}

export interface Subject {
  id: SubjectId;
  th: string;
  en: string;
  color: string;
  topics: Topic[];
}

const t = (id: string, th: string, en: string, a: number, b: number): Topic => ({ id, th, en, g: [a, b] });

export const SUBJECTS: Subject[] = [
  {
    id: 'math',
    th: 'คณิตศาสตร์',
    en: 'Mathematics',
    color: '#7c5cf0',
    topics: [
      t('count', 'นับจำนวน 1-100', 'counting numbers 1-100', 1, 2),
      t('addsub', 'การบวกและการลบ', 'addition and subtraction', 1, 3),
      t('placev', 'ค่าประจำหลัก', 'place value', 1, 4),
      t('mult', 'สูตรคูณและการคูณ', 'multiplication tables', 2, 4),
      t('div', 'การหาร', 'division', 3, 5),
      t('frac', 'เศษส่วน', 'fractions', 3, 6),
      t('dec', 'ทศนิยม', 'decimals', 4, 6),
      t('pct', 'ร้อยละ', 'percentages', 5, 7),
      t('time', 'การบอกเวลา', 'telling time on a clock', 1, 3),
      t('money', 'เงินและการซื้อขาย', 'money and shopping', 1, 4),
      t('measure', 'การวัดความยาว น้ำหนัก ปริมาตร', 'measuring length, weight and volume', 2, 5),
      t('shape2d', 'รูปเรขาคณิตสองมิติ', '2D shapes', 1, 4),
      t('shape3d', 'รูปเรขาคณิตสามมิติ', '3D shapes', 3, 6),
      t('angle', 'มุมและการวัดมุม', 'angles and measuring angles', 4, 7),
      t('area', 'พื้นที่และความยาวรอบรูป', 'area and perimeter', 4, 7),
      t('data', 'แผนภูมิและการอ่านข้อมูล', 'reading charts and data', 2, 7),
      t('pattern', 'แบบรูปและความสัมพันธ์', 'number patterns', 1, 5),
      t('eqn', 'สมการอย่างง่าย', 'simple equations', 5, 8),
      t('integer', 'จำนวนเต็มบวกและลบ', 'positive and negative integers', 7, 8),
      t('ratio', 'อัตราส่วนและสัดส่วน', 'ratio and proportion', 6, 9),
      t('linear', 'กราฟเส้นตรงและฟังก์ชัน', 'linear graphs and functions', 8, 11),
      t('pyth', 'ทฤษฎีบทพีทาโกรัส', 'Pythagorean theorem', 8, 9),
      t('prob', 'ความน่าจะเป็น', 'probability', 7, 12),
      t('stat', 'สถิติเบื้องต้น', 'basic statistics', 7, 12),
    ],
  },
  {
    id: 'eng',
    th: 'ภาษาอังกฤษ',
    en: 'English',
    color: '#e8456b',
    topics: [
      t('abc', 'ตัวอักษร A-Z', 'the alphabet A-Z', 1, 2),
      t('phonics', 'เสียงตัวอักษร (Phonics)', 'phonics sounds', 1, 3),
      t('animals', 'คำศัพท์สัตว์', 'animal vocabulary', 1, 3),
      t('family', 'ครอบครัว', 'family members', 1, 3),
      t('colors', 'สีและรูปร่าง', 'colors and shapes', 1, 2),
      t('body', 'อวัยวะในร่างกาย', 'parts of the body', 1, 3),
      t('food', 'อาหารและเครื่องดื่ม', 'food and drinks', 1, 4),
      t('school', 'ของใช้ในห้องเรียน', 'classroom objects', 1, 3),
      t('daily', 'กิจวัตรประจำวัน', 'daily routines', 2, 5),
      t('weather', 'สภาพอากาศและฤดูกาล', 'weather and seasons', 2, 5),
      t('places', 'สถานที่ในเมือง', 'places in town', 3, 6),
      t('jobs', 'อาชีพ', 'jobs and occupations', 3, 6),
      t('verbs', 'คำกริยาและ Present Simple', 'verbs and present simple tense', 3, 7),
      t('past', 'Past Simple', 'past simple tense', 5, 8),
      t('prep', 'คำบุพบท in on under', 'prepositions of place', 2, 6),
      t('compare', 'การเปรียบเทียบ (-er, -est)', 'comparative and superlative adjectives', 5, 8),
      t('reading', 'อ่านจับใจความเรื่องสั้น', 'short story reading comprehension', 3, 12),
      t('writing', 'เขียนประโยคบรรยาย', 'writing descriptive sentences', 4, 12),
    ],
  },
  {
    id: 'sci',
    th: 'วิทยาศาสตร์',
    en: 'Science',
    color: '#1ea97c',
    topics: [
      t('living', 'สิ่งมีชีวิตและไม่มีชีวิต', 'living and non-living things', 1, 2),
      t('plants', 'ส่วนประกอบของพืช', 'parts of a plant', 1, 4),
      t('animalsci', 'การจำแนกสัตว์', 'classifying animals', 2, 5),
      t('lifecycle', 'วัฏจักรชีวิต', 'life cycles', 2, 5),
      t('senses', 'ประสาทสัมผัสทั้งห้า', 'the five senses', 1, 2),
      t('matter', 'สถานะของสสาร', 'states of matter', 3, 6),
      t('water', 'วัฏจักรน้ำ', 'the water cycle', 3, 6),
      t('weathersci', 'ลมฟ้าอากาศ', 'weather and climate', 2, 6),
      t('solar', 'ระบบสุริยะ', 'the solar system', 4, 7),
      t('moon', 'ดวงจันทร์และข้างขึ้นข้างแรม', 'moon phases', 4, 6),
      t('force', 'แรงและการเคลื่อนที่', 'forces and motion', 3, 9),
      t('light', 'แสงและเงา', 'light and shadows', 2, 8),
      t('sound', 'เสียง', 'sound and vibration', 3, 8),
      t('electric', 'วงจรไฟฟ้าอย่างง่าย', 'simple electric circuits', 5, 9),
      t('foodchain', 'ห่วงโซ่อาหาร', 'food chains', 3, 7),
      t('humanbody', 'ระบบร่างกายมนุษย์', 'human body systems', 4, 10),
      t('cell', 'เซลล์', 'cells', 7, 10),
      t('mixture', 'สารผสมและการแยกสาร', 'mixtures and separating substances', 5, 9),
      t('earth', 'หินและโลกของเรา', 'rocks and the Earth', 4, 9),
      t('lab', 'การทดลองและอุปกรณ์', 'science experiment and lab tools', 3, 12),
    ],
  },
  {
    id: 'thai',
    th: 'ภาษาไทย',
    en: 'Thai language',
    color: '#f08a24',
    topics: [
      t('consonant', 'พยัญชนะ ก-ฮ', 'Thai consonants', 1, 2),
      t('vowel', 'สระ', 'Thai vowels', 1, 2),
      t('tone', 'วรรณยุกต์', 'Thai tone marks', 1, 3),
      t('spell', 'การผันคำและสะกดคำ', 'Thai spelling', 1, 4),
      t('matra', 'มาตราตัวสะกด', 'Thai final consonant groups', 2, 4),
      t('words', 'ชนิดของคำ', 'Thai parts of speech', 4, 7),
      t('sentence', 'การแต่งประโยค', 'building Thai sentences', 2, 6),
      t('readth', 'อ่านจับใจความ', 'Thai reading comprehension', 2, 12),
      t('proverb', 'สำนวนสุภาษิต', 'Thai proverbs and idioms', 4, 9),
      t('poem', 'คำคล้องจองและกลอน', 'Thai rhymes and poems', 2, 8),
      t('letter', 'การเขียนจดหมายและเรียงความ', 'letter and essay writing', 5, 12),
      t('handwrite', 'คัดลายมือ', 'Thai handwriting practice', 1, 6),
    ],
  },
  {
    id: 'social',
    th: 'สังคมศึกษา',
    en: 'Social studies',
    color: '#3b82f6',
    topics: [
      t('myself', 'ตัวเรา ครอบครัว โรงเรียน', 'me, my family and my school', 1, 2),
      t('duty', 'หน้าที่พลเมืองดี', 'good citizenship', 1, 6),
      t('religion', 'ศาสนาและวันสำคัญ', 'religions and important days', 1, 6),
      t('thaifest', 'ประเพณีไทย', 'Thai traditions and festivals', 1, 6),
      t('map', 'แผนที่และทิศ', 'maps and directions', 2, 7),
      t('regions', 'ภาคต่างๆ ของไทย', 'regions of Thailand', 3, 7),
      t('history', 'ประวัติศาสตร์ไทย', 'Thai history', 4, 12),
      t('asean', 'อาเซียน', 'ASEAN countries', 4, 9),
      t('economy', 'การออมและเศรษฐกิจพอเพียง', 'saving money and sufficiency economy', 3, 9),
      t('environment', 'สิ่งแวดล้อมและทรัพยากร', 'environment and natural resources', 2, 9),
      t('world', 'ทวีปและประเทศ', 'continents and countries', 5, 10),
      t('law', 'กฎหมายในชีวิตประจำวัน', 'everyday laws and rules', 6, 12),
    ],
  },
  {
    id: 'chinese',
    th: 'ภาษาจีน',
    en: 'Chinese (Mandarin)',
    color: '#d6342c',
    topics: [
      t('cn-num', 'ตัวเลข 1-10', 'numbers 1-10 in Chinese', 1, 6),
      t('cn-greet', 'คำทักทาย', 'Chinese greetings', 1, 6),
      t('cn-pinyin', 'พินอินและวรรณยุกต์', 'pinyin and the four tones', 1, 9),
      t('cn-stroke', 'ลำดับขีดอักษรจีน', 'Chinese character stroke order', 1, 12),
      t('cn-family', 'ครอบครัว', 'family words in Chinese', 1, 6),
      t('cn-color', 'สี', 'colors in Chinese', 1, 6),
      t('cn-animal', 'สัตว์ 12 นักษัตร', 'the 12 zodiac animals', 1, 9),
      t('cn-food', 'อาหาร', 'food words in Chinese', 2, 9),
      t('cn-body', 'อวัยวะ', 'body parts in Chinese', 1, 6),
      t('cn-day', 'วัน เดือน เวลา', 'days, months and time in Chinese', 3, 12),
      t('cn-fest', 'เทศกาลจีน', 'Chinese festivals', 1, 12),
    ],
  },
  {
    id: 'japanese',
    th: 'ภาษาญี่ปุ่น',
    en: 'Japanese',
    color: '#c2185b',
    topics: [
      t('jp-hira', 'ฮิรางานะ', 'hiragana', 1, 12),
      t('jp-kata', 'คาตากานะ', 'katakana', 2, 12),
      t('jp-greet', 'คำทักทาย', 'Japanese greetings', 1, 9),
      t('jp-num', 'ตัวเลข', 'numbers in Japanese', 1, 9),
      t('jp-family', 'ครอบครัว', 'family words in Japanese', 2, 9),
      t('jp-food', 'อาหารญี่ปุ่น', 'Japanese food words', 1, 9),
      t('jp-color', 'สี', 'colors in Japanese', 1, 6),
      t('jp-kanji', 'คันจิพื้นฐาน', 'basic kanji', 4, 12),
      t('jp-self', 'แนะนำตัวเอง', 'self-introduction in Japanese', 3, 12),
      t('jp-culture', 'วัฒนธรรมญี่ปุ่น', 'Japanese culture', 1, 12),
    ],
  },
  {
    id: 'health',
    th: 'สุขศึกษา',
    en: 'Health education',
    color: '#0ea5a4',
    topics: [
      t('food5', 'อาหารหลัก 5 หมู่', 'the five food groups', 1, 6),
      t('hygiene', 'การล้างมือและสุขอนามัย', 'handwashing and hygiene', 1, 4),
      t('teeth', 'การดูแลฟัน', 'taking care of teeth', 1, 4),
      t('organ', 'อวัยวะภายใน', 'internal organs', 3, 7),
      t('safety', 'ความปลอดภัยในชีวิต', 'personal safety', 1, 9),
      t('firstaid', 'การปฐมพยาบาลเบื้องต้น', 'basic first aid', 4, 12),
      t('emotion', 'อารมณ์และความรู้สึก', 'emotions and feelings', 1, 9),
      t('sleep', 'การนอนและออกกำลังกาย', 'sleep and healthy habits', 1, 9),
      t('disease', 'โรคติดต่อและการป้องกัน', 'preventing infectious diseases', 4, 12),
      t('grow', 'การเจริญเติบโต', 'growth and development', 3, 9),
      t('drug', 'สิ่งเสพติดและโทษ', 'saying no to harmful substances', 5, 12),
    ],
  },
  {
    id: 'pe',
    th: 'พลศึกษา',
    en: 'Physical education',
    color: '#ea580c',
    topics: [
      t('warmup', 'การอบอุ่นร่างกาย', 'warm-up exercises', 1, 12),
      t('stretch', 'การยืดเหยียด', 'stretching', 1, 12),
      t('move', 'การเคลื่อนไหวพื้นฐาน', 'basic movement skills', 1, 4),
      t('ball', 'ทักษะการใช้ลูกบอล', 'ball skills', 2, 9),
      t('football', 'ฟุตบอล', 'football basics', 3, 12),
      t('basket', 'บาสเกตบอล', 'basketball basics', 4, 12),
      t('volley', 'วอลเลย์บอล', 'volleyball basics', 5, 12),
      t('thaigame', 'การละเล่นพื้นบ้านไทย', 'traditional Thai games', 1, 9),
      t('fitness', 'สมรรถภาพทางกาย', 'physical fitness tests', 3, 12),
      t('rules', 'กติกาและน้ำใจนักกีฬา', 'rules and sportsmanship', 2, 12),
      t('athletic', 'กรีฑา วิ่ง กระโดด', 'running and jumping', 2, 12),
    ],
  },
];

export const subjectOf = (id: string) => SUBJECTS.find((s) => s.id === id) || SUBJECTS[0];

/* ---------------------------------------------------------------- กิจกรรม */

export interface Activity {
  id: string;
  th: string;
  /** คำอธิบายภาษาอังกฤษสำหรับ prompt */
  en: string;
  /** เฉพาะบางวิชา (ไม่ใส่ = ทุกวิชา) */
  only?: SubjectId[];
}

export const ACTIVITIES: Activity[] = [
  { id: 'fill', th: 'เติมคำในช่องว่าง', en: 'fill-in-the-blank questions with clear answer lines' },
  { id: 'match', th: 'จับคู่โยงเส้น', en: 'matching activity: two columns with dots to draw lines between pairs' },
  { id: 'circle', th: 'วงกลมคำตอบ', en: 'circle-the-correct-answer questions with 3 choices each' },
  { id: 'color', th: 'ระบายสีตามคำตอบ', en: 'color-by-answer picture: solve each item, then color the matching area' },
  { id: 'maze', th: 'เขาวงกต', en: 'a maze where the child follows the correct answers to reach the goal' },
  { id: 'wordsearch', th: 'ค้นหาคำ', en: 'a word search grid with a word list beside it' },
  { id: 'crossword', th: 'อักษรไขว้', en: 'a small crossword puzzle with numbered clues' },
  { id: 'trace', th: 'ลากเส้นประ / คัดลายมือ', en: 'tracing practice with dotted letters and writing lines' },
  { id: 'sequence', th: 'เรียงลำดับภาพ', en: 'sequencing: picture boxes to number in the right order' },
  { id: 'mindmap', th: 'แผนผังความคิด', en: 'a mind map with a central bubble and branches to fill in' },
  { id: 'comic', th: 'การ์ตูนช่อง', en: 'a 4-panel comic strip with empty speech bubbles to complete' },
  { id: 'reading', th: 'อ่านแล้วตอบคำถาม', en: 'a short reading passage followed by comprehension questions' },
  { id: 'table', th: 'ตารางบันทึก', en: 'a table to complete with headers and empty cells' },
  { id: 'cutpaste', th: 'ตัดแปะ', en: 'cut-and-paste: pictures at the bottom with dashed cut lines and boxes to paste into' },
  { id: 'tf', th: 'ถูกหรือผิด', en: 'true or false statements with tick boxes' },
  { id: 'draw', th: 'วาดภาพตามโจทย์', en: 'draw-and-label boxes with short prompts' },
  { id: 'tian', th: 'ตารางคัดอักษรจีน 田', en: 'Chinese character practice grid (tian zi ge squares with a cross guide) with pinyin above each character and stroke order', only: ['chinese'] },
  { id: 'kana', th: 'ช่องคัดฮิรางานะ/คาตากานะ', en: 'Japanese kana practice grid with large guide squares, stroke order numbers and romaji', only: ['japanese'] },
  { id: 'plate', th: 'จานอาหาร 5 หมู่', en: 'a healthy plate diagram split into the five food groups for children to fill or draw', only: ['health'] },
  { id: 'exercise', th: 'การ์ดท่าออกกำลังกาย + ช่องติ๊ก', en: 'exercise cards with simple figure illustrations, rep counts and checkboxes for each day', only: ['pe'] },
  { id: 'lablog', th: 'ใบบันทึกการทดลอง', en: 'a science experiment log: question, hypothesis, materials, steps, observation table and conclusion', only: ['sci'] },
  { id: 'numline', th: 'เส้นจำนวน', en: 'number line exercises with hops to draw', only: ['math'] },
];

export const activitiesFor = (s: SubjectId) => ACTIVITIES.filter((a) => !a.only || a.only.includes(s));

/* ---------------------------------------------------------------- ธีม (เหมือนชุดแต่งตัว) */

export interface Theme {
  id: string;
  th: string;
  en: string;
  /** สีหลัก/รอง/พื้น ของตัวอย่างกระดาษ */
  pal: [string, string, string];
}

export const THEMES: Theme[] = [
  { id: 'space', th: 'อวกาศ', en: 'outer space with planets, rockets and stars', pal: ['#5b4bd6', '#ffcf3f', '#eef0ff'] },
  { id: 'ocean', th: 'ใต้ทะเล', en: 'under the sea with fish, bubbles and coral', pal: ['#1f8fd6', '#3fd6c0', '#e8f7ff'] },
  { id: 'forest', th: 'ป่ามหัศจรรย์', en: 'a magical forest with trees, mushrooms and friendly animals', pal: ['#2f9e52', '#f2b134', '#effaea'] },
  { id: 'dino', th: 'ไดโนเสาร์', en: 'cute dinosaurs and volcanoes', pal: ['#4f9d2f', '#f08a24', '#f3fbe6'] },
  { id: 'sweets', th: 'ขนมหวาน', en: 'candy land with cupcakes, donuts and ice cream', pal: ['#e8456b', '#ffb3cf', '#fff0f5'] },
  { id: 'farm', th: 'ฟาร์มสัตว์', en: 'a sunny farm with cows, chickens and a red barn', pal: ['#c0392b', '#f4d35e', '#fff9e8'] },
  { id: 'city', th: 'เมืองและยานพาหนะ', en: 'a busy city with cars, buses and buildings', pal: ['#2d6cdf', '#ff9f1c', '#eef4ff'] },
  { id: 'school', th: 'ห้องเรียนแสนสนุก', en: 'a cheerful classroom with pencils, books and a blackboard', pal: ['#7c5cf0', '#3fd6a8', '#f4f0ff'] },
  { id: 'songkran', th: 'สงกรานต์', en: 'Thai Songkran water festival with water bowls and flowers', pal: ['#1aa3d9', '#ffd166', '#eaf8ff'] },
  { id: 'loykrathong', th: 'ลอยกระทง', en: 'Thai Loy Krathong festival with floating krathong and the full moon', pal: ['#3a3f9e', '#ffd166', '#eef0ff'] },
  { id: 'thai', th: 'ลายไทยร่วมสมัย', en: 'modern Thai pattern borders and elephants', pal: ['#b8860b', '#c0392b', '#fff8e6'] },
  { id: 'robot', th: 'หุ่นยนต์และเทคโนโลยี', en: 'friendly robots and gears', pal: ['#4a5568', '#3fd6c0', '#f1f5f9'] },
  { id: 'garden', th: 'สวนดอกไม้', en: 'a spring garden with flowers, bees and butterflies', pal: ['#d6457f', '#8bc34a', '#fff3f8'] },
  { id: 'winter', th: 'หิมะและฤดูหนาว', en: 'a cozy winter scene with snowflakes and penguins', pal: ['#3b82f6', '#a5d8ff', '#f0f8ff'] },
  { id: 'sports', th: 'กีฬาสี', en: 'a school sports day with flags, balls and medals', pal: ['#e11d48', '#2563eb', '#fff5f5'] },
  { id: 'plain', th: 'เรียบๆ เน้นเนื้อหา', en: 'a clean minimal look with a simple border', pal: ['#2a2350', '#7c5cf0', '#ffffff'] },
];

/* ---------------------------------------------------------------- สไตล์ภาพ */

export interface ArtStyle {
  id: string;
  th: string;
  en: string;
  bw?: boolean;
}

export const STYLES: ArtStyle[] = [
  { id: 'cartoon', th: 'การ์ตูนเส้นหนา', en: 'cute cartoon illustrations with thick clean outlines and bright flat colors' },
  { id: 'pastel', th: 'พาสเทลน่ารัก', en: 'soft pastel kawaii illustrations' },
  { id: 'water', th: 'สีน้ำ', en: 'gentle watercolor illustrations' },
  { id: 'doodle', th: 'ดูเดิลวาดมือ', en: 'hand-drawn doodle style' },
  { id: 'flat', th: 'Flat vector', en: 'modern flat vector illustrations' },
  { id: 'crayon', th: 'สีเทียน', en: 'crayon-textured children book illustrations' },
  { id: 'bw', th: 'ขาวดำ พร้อมระบาย', en: 'black and white line art only, no fill, ready for children to color in, ink-saving', bw: true },
  { id: 'minimal', th: 'มินิมอล ประหยัดหมึก', en: 'minimal line icons with very little color, ink-saving', bw: true },
];

/* ---------------------------------------------------------------- กรอบ */

export const FRAMES = [
  { id: 'round', th: 'มุมมน', en: 'a rounded rectangle border' },
  { id: 'theme', th: 'ลายตามธีม', en: 'a decorative border made of small theme illustrations' },
  { id: 'dash', th: 'เส้นประ', en: 'a dashed line border' },
  { id: 'none', th: 'ไม่มีกรอบ', en: 'no page border' },
] as const;

/* ---------------------------------------------------------------- ค่าอื่นๆ */

export const GRADES = Array.from({ length: 12 }, (_, i) => i + 1);
export const gradeLabel = (g: number) => (g <= 6 ? `ป.${g}` : `ม.${g - 6}`);
export const gradeEn = (g: number) => (g <= 6 ? `grade ${g} (primary school, age ${g + 5}-${g + 6})` : `grade ${g} (secondary school, age ${g + 5}-${g + 6})`);

export const LEVELS = [
  { id: 'easy', th: 'ง่าย', en: 'easy, confidence-building' },
  { id: 'mid', th: 'ปานกลาง', en: 'medium difficulty' },
  { id: 'hard', th: 'ท้าทาย', en: 'challenging, includes a bonus thinking question' },
] as const;

export const LANGS = [
  { id: 'th', th: 'ไทย', en: 'Thai' },
  { id: 'en', th: 'อังกฤษ', en: 'English' },
  { id: 'bi', th: 'สองภาษา', en: 'bilingual Thai and English' },
] as const;

export const COUNT_MIN = 3;
export const COUNT_MAX = 20;
export const NOTE_MAX = 120;
export const CUSTOM_MAX = 60;
