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

export type ThemeCat = 'nature' | 'animal' | 'space' | 'food' | 'fest' | 'fantasy' | 'city' | 'season' | 'school' | 'simple';

export const THEME_CATS: { id: ThemeCat; th: string }[] = [
  { id: 'nature', th: 'ธรรมชาติ' },
  { id: 'animal', th: 'สัตว์' },
  { id: 'space', th: 'อวกาศ/วิทย์' },
  { id: 'food', th: 'อาหาร/ขนม' },
  { id: 'fest', th: 'เทศกาลไทย' },
  { id: 'fantasy', th: 'แฟนตาซี' },
  { id: 'city', th: 'เมือง/ยานพาหนะ' },
  { id: 'season', th: 'ฤดูกาล' },
  { id: 'school', th: 'โรงเรียน/กีฬา' },
  { id: 'simple', th: 'เรียบง่าย' },
];

/** รูปไอคอนเล็กที่ใช้ตกแต่ง (วาดเองใน PaperPreview + คำบรรยายใน prompt) */
export const MOTIFS = [
  'star', 'fish', 'tree', 'tri', 'donut', 'flower', 'block', 'pencil', 'drop', 'moon', 'diamond', 'gear', 'snow', 'flag',
  'heart', 'cloud', 'leaf', 'sun', 'balloon', 'note', 'crown', 'bolt', 'paw', 'bow', 'apple', 'planet', 'shell', 'lantern',
] as const;
export type Motif = (typeof MOTIFS)[number];

/** คำบรรยายภาษาอังกฤษของแต่ละไอคอน (ตรงกับรูปที่ PaperPreview วาด) */
export const MOTIF_EN: Record<Motif, string> = {
  star: 'five-point star',
  fish: 'round little fish with a tail',
  tree: 'round green tree with a brown trunk',
  tri: 'simple triangle mountain',
  donut: 'round donut with a hole',
  flower: 'five-petal flower',
  block: 'small building with two windows',
  pencil: 'tilted pencil',
  drop: 'water droplet',
  moon: 'crescent moon',
  diamond: 'diamond (rhombus) shape',
  gear: 'gear wheel',
  snow: 'six-line snowflake',
  flag: 'small triangle flag on a pole',
  heart: 'heart',
  cloud: 'puffy cloud',
  leaf: 'single leaf with a center vein',
  sun: 'sun with eight short rays',
  balloon: 'oval balloon with a string',
  note: 'music note',
  crown: 'three-point crown',
  bolt: 'lightning bolt',
  paw: 'paw print with four toes',
  bow: 'ribbon bow',
  apple: 'apple with a leaf',
  planet: 'planet with a tilted ring',
  shell: 'fan-shaped seashell',
  lantern: 'round paper lantern',
};

export interface Theme {
  id: string;
  th: string;
  en: string;
  cat: ThemeCat;
  motif: Motif | '';
  /** สีหลัก/รอง/พื้น ของตัวอย่างกระดาษ */
  pal: [string, string, string];
}

const T = (id: string, th: string, en: string, cat: ThemeCat, motif: Motif | '', pal: [string, string, string]): Theme => ({ id, th, en, cat, motif, pal });

export const THEMES: Theme[] = [
  T('space', 'อวกาศ', 'outer space with planets, rockets and stars', 'space', 'star', ['#5b4bd6', '#ffcf3f', '#eef0ff']),
  T('ocean', 'ใต้ทะเล', 'under the sea with fish, bubbles and coral', 'nature', 'fish', ['#1f8fd6', '#3fd6c0', '#e8f7ff']),
  T('forest', 'ป่ามหัศจรรย์', 'a magical forest with trees, mushrooms and friendly animals', 'nature', 'tree', ['#2f9e52', '#f2b134', '#effaea']),
  T('dino', 'ไดโนเสาร์', 'cute dinosaurs and volcanoes', 'animal', 'tri', ['#4f9d2f', '#f08a24', '#f3fbe6']),
  T('sweets', 'ขนมหวาน', 'candy land with cupcakes, donuts and ice cream', 'food', 'donut', ['#e8456b', '#ffb3cf', '#fff0f5']),
  T('farm', 'ฟาร์มสัตว์', 'a sunny farm with cows, chickens and a red barn', 'animal', 'flower', ['#c0392b', '#f4d35e', '#fff9e8']),
  T('city', 'เมืองและยานพาหนะ', 'a busy city with cars, buses and buildings', 'city', 'block', ['#2d6cdf', '#ff9f1c', '#eef4ff']),
  T('school', 'ห้องเรียนแสนสนุก', 'a cheerful classroom with pencils, books and a blackboard', 'school', 'pencil', ['#7c5cf0', '#3fd6a8', '#f4f0ff']),
  T('songkran', 'สงกรานต์', 'Thai Songkran water festival with water bowls and flowers', 'fest', 'drop', ['#1aa3d9', '#ffd166', '#eaf8ff']),
  T('loykrathong', 'ลอยกระทง', 'Thai Loy Krathong festival with floating krathong and the full moon', 'fest', 'moon', ['#3a3f9e', '#ffd166', '#eef0ff']),
  T('thai', 'ลายไทยร่วมสมัย', 'modern Thai pattern borders and elephants', 'fest', 'diamond', ['#b8860b', '#c0392b', '#fff8e6']),
  T('robot', 'หุ่นยนต์และเทคโนโลยี', 'friendly robots and gears', 'space', 'gear', ['#4a5568', '#3fd6c0', '#f1f5f9']),
  T('garden', 'สวนดอกไม้', 'a spring garden with flowers, bees and butterflies', 'nature', 'flower', ['#d6457f', '#8bc34a', '#fff3f8']),
  T('winter', 'หิมะและฤดูหนาว', 'a cozy winter scene with snowflakes and penguins', 'season', 'snow', ['#3b82f6', '#a5d8ff', '#f0f8ff']),
  T('sports', 'กีฬาสี', 'a school sports day with flags, balls and medals', 'school', 'flag', ['#e11d48', '#2563eb', '#fff5f5']),
  T('plain', 'เรียบๆ เน้นเนื้อหา', 'a clean minimal look with a simple border', 'simple', '', ['#2a2350', '#7c5cf0', '#ffffff']),
  // ---- เพิ่ม 11 พ.ย. 2026 (ต่อท้ายเท่านั้น)
  T('rainforest', 'ป่าดิบชื้น', 'a lush rainforest with big leaves, vines and parrots', 'nature', 'leaf', ['#15803d', '#facc15', '#ecfdf3']),
  T('beach', 'ชายหาด', 'a sunny beach with sand, seashells and palm trees', 'nature', 'shell', ['#0ea5e9', '#fbbf24', '#fff7e0']),
  T('mountain', 'ภูเขาและทุ่งหญ้า', 'green hills and mountains with wild flowers', 'nature', 'tri', ['#16a34a', '#a3e635', '#f0fdf4']),
  T('rainbow', 'สายรุ้งและเมฆ', 'a soft rainbow sky with fluffy clouds', 'nature', 'cloud', ['#8b5cf6', '#f472b6', '#f5f3ff']),
  T('desert', 'ทะเลทราย', 'a warm desert with cacti, camels and the sun', 'nature', 'sun', ['#d97706', '#f87171', '#fff7ed']),
  T('river', 'แม่น้ำและนาข้าว', 'a Thai rice field by a river with water buffalo', 'nature', 'drop', ['#0891b2', '#84cc16', '#ecfeff']),
  T('pond', 'บึงบัว', 'a lotus pond with frogs and dragonflies', 'nature', 'flower', ['#db2777', '#22c55e', '#fdf2f8']),
  T('cats', 'แมวเหมียว', 'playful kittens with yarn balls', 'animal', 'paw', ['#f97316', '#fde68a', '#fff7ed']),
  T('dogs', 'น้องหมา', 'happy puppies with bones and balls', 'animal', 'paw', ['#a16207', '#60a5fa', '#fefce8']),
  T('bunny', 'กระต่ายน้อย', 'cute bunnies with carrots', 'animal', 'heart', ['#ec4899', '#fb923c', '#fdf2f8']),
  T('panda', 'แพนด้ากับไผ่', 'pandas eating bamboo', 'animal', 'leaf', ['#1f2937', '#4ade80', '#f8fafc']),
  T('bees', 'ผึ้งน้อยกับรังผึ้ง', 'busy bees and honeycomb', 'animal', 'flower', ['#ca8a04', '#fde047', '#fefce8']),
  T('birds', 'นกน้อยร้องเพลง', 'little songbirds on branches with music notes', 'animal', 'note', ['#0284c7', '#f97316', '#f0f9ff']),
  T('zoo', 'สวนสัตว์', 'a friendly zoo with lions, giraffes and elephants', 'animal', 'paw', ['#ea580c', '#65a30d', '#fff7ed']),
  T('penguin', 'เพนกวินขั้วโลก', 'penguins on ice with snow', 'animal', 'snow', ['#1e3a8a', '#38bdf8', '#eff6ff']),
  T('bugs', 'แมลงตัวจิ๋ว', 'friendly ladybugs, ants and caterpillars on leaves', 'animal', 'leaf', ['#dc2626', '#16a34a', '#fef2f2']),
  T('planets', 'ระบบสุริยะ', 'the solar system with colorful planets', 'space', 'planet', ['#4338ca', '#f59e0b', '#eef2ff']),
  T('rocket', 'จรวดผจญภัย', 'rockets, astronauts and twinkling stars', 'space', 'star', ['#1d4ed8', '#f43f5e', '#eff6ff']),
  T('lab', 'ห้องทดลองวิทยาศาสตร์', 'a science lab with flasks, bubbles and lightning sparks', 'space', 'bolt', ['#0d9488', '#a855f7', '#f0fdfa']),
  T('math', 'ตัวเลขและรูปทรง', 'floating numbers and geometric shapes', 'school', 'diamond', ['#7c3aed', '#06b6d4', '#f5f3ff']),
  T('fruit', 'ผลไม้สดใส', 'fresh fruits like apples, oranges and watermelon', 'food', 'apple', ['#dc2626', '#22c55e', '#fff1f2']),
  T('bakery', 'ร้านเบเกอรี่', 'a cozy bakery with bread, cookies and cakes', 'food', 'donut', ['#b45309', '#f9a8d4', '#fffbeb']),
  T('thaifood', 'อาหารไทย', 'Thai street food like pad thai and mango sticky rice', 'food', 'leaf', ['#ea580c', '#16a34a', '#fff7ed']),
  T('icecream', 'ไอศกรีม', 'ice cream cones and popsicles', 'food', 'heart', ['#f472b6', '#38bdf8', '#fdf2f8']),
  T('veggie', 'ผักน่ารัก', 'smiling vegetables like carrots and broccoli', 'food', 'leaf', ['#16a34a', '#f97316', '#f0fdf4']),
  T('newyear', 'ปีใหม่', 'New Year party with balloons and fireworks', 'fest', 'balloon', ['#7c3aed', '#facc15', '#f5f3ff']),
  T('childday', 'วันเด็ก', 'Thai Children Day with balloons, toys and gifts', 'fest', 'balloon', ['#f43f5e', '#22d3ee', '#fff1f2']),
  T('teacherday', 'วันครู', 'Thai Teacher Day with flowers and books', 'fest', 'flower', ['#9333ea', '#fbbf24', '#faf5ff']),
  T('motherday', 'วันแม่', 'Thai Mother Day with jasmine flowers', 'fest', 'flower', ['#2563eb', '#f1f5f9', '#eff6ff']),
  T('chinesenewyear', 'ตรุษจีน', 'Chinese New Year with red lanterns and gold coins', 'fest', 'lantern', ['#dc2626', '#facc15', '#fff1f2']),
  T('halloween', 'ฮาโลวีนน่ารัก', 'cute non-scary Halloween with pumpkins and bats', 'fest', 'moon', ['#ea580c', '#7c3aed', '#fff7ed']),
  T('christmas', 'คริสต์มาส', 'Christmas with pine trees, gifts and stars', 'fest', 'tree', ['#15803d', '#dc2626', '#f0fdf4']),
  T('castle', 'ปราสาทเจ้าหญิง', 'a fairy tale castle with crowns and flags', 'fantasy', 'crown', ['#a21caf', '#fbbf24', '#fdf4ff']),
  T('unicorn', 'ยูนิคอร์นสายรุ้ง', 'unicorns with rainbows and clouds', 'fantasy', 'cloud', ['#c026d3', '#67e8f9', '#fdf4ff']),
  T('dragon', 'มังกรใจดี', 'a friendly cartoon dragon with gems', 'fantasy', 'diamond', ['#059669', '#f59e0b', '#ecfdf5']),
  T('pirate', 'โจรสลัดล่าสมบัติ', 'a pirate treasure hunt with maps and ships', 'fantasy', 'flag', ['#92400e', '#0ea5e9', '#fffbeb']),
  T('magic', 'โรงเรียนเวทมนตร์', 'a magic school with wands, sparkles and books', 'fantasy', 'star', ['#6d28d9', '#fde047', '#f5f3ff']),
  T('superhero', 'ซูเปอร์ฮีโร่', 'original superhero kids with capes and lightning', 'fantasy', 'bolt', ['#dc2626', '#2563eb', '#fef2f2']),
  T('train', 'รถไฟ', 'a toy train on tracks through the countryside', 'city', 'block', ['#b91c1c', '#0ea5e9', '#fef2f2']),
  T('airport', 'สนามบินและเครื่องบิน', 'airplanes and clouds in the sky', 'city', 'cloud', ['#0369a1', '#f97316', '#f0f9ff']),
  T('market', 'ตลาดนัดไทย', 'a Thai market with stalls and baskets', 'city', 'flag', ['#ea580c', '#0d9488', '#fff7ed']),
  T('construction', 'งานก่อสร้าง', 'diggers, cranes and traffic cones', 'city', 'tri', ['#ca8a04', '#334155', '#fefce8']),
  T('spring', 'ฤดูใบไม้ผลิ', 'spring with blossoms and butterflies', 'season', 'flower', ['#ec4899', '#a3e635', '#fdf2f8']),
  T('summer', 'ฤดูร้อน', 'a hot sunny summer with sunglasses and ice', 'season', 'sun', ['#f59e0b', '#06b6d4', '#fffbeb']),
  T('rainy', 'ฤดูฝน', 'a rainy day with umbrellas, puddles and frogs', 'season', 'drop', ['#2563eb', '#84cc16', '#eff6ff']),
  T('fall', 'ใบไม้ร่วง', 'autumn with orange leaves and acorns', 'season', 'leaf', ['#c2410c', '#eab308', '#fff7ed']),
  T('music', 'ดนตรีแสนสนุก', 'musical instruments and notes', 'school', 'note', ['#be185d', '#0ea5e9', '#fdf2f8']),
  T('library', 'ห้องสมุด', 'a cozy library with bookshelves and reading kids', 'school', 'pencil', ['#7c2d12', '#facc15', '#fffbeb']),
  T('art', 'ศิลปะและสีสัน', 'paint brushes, palettes and splashes', 'school', 'drop', ['#db2777', '#3b82f6', '#fdf2f8']),
  T('football', 'ฟุตบอล', 'a green football field with balls and goals', 'school', 'flag', ['#15803d', '#1f2937', '#f0fdf4']),
  T('grid', 'ตารางกราฟ', 'a clean graph-paper style', 'simple', '', ['#1e40af', '#93c5fd', '#ffffff']),
  T('notebook', 'สมุดเส้นบรรทัด', 'a lined notebook paper look', 'simple', '', ['#be123c', '#93c5fd', '#ffffff']),
  T('kraft', 'กระดาษคราฟท์', 'a warm kraft paper look', 'simple', 'leaf', ['#78350f', '#d6a76c', '#fdf6ec']),
  T('pastelmin', 'พาสเทลมินิมอล', 'a minimal pastel look with soft round shapes', 'simple', 'heart', ['#a78bfa', '#fbcfe8', '#faf5ff']),
];

/* ---------------------------------------------------------------- ของตกแต่งเสริม (เลือกได้หลายชิ้น) */

export type DecoPlace = 'corners' | 'top' | 'bottom' | 'sides' | 'scatter';
export const DECO_PLACES: { id: DecoPlace; th: string; en: string }[] = [
  { id: 'corners', th: 'มุมกระดาษ', en: 'one in each of the 4 corners of the page margin' },
  { id: 'top', th: 'ขอบบน', en: 'a row of 5 evenly spaced along the top margin' },
  { id: 'bottom', th: 'ขอบล่าง', en: 'a row of 5 evenly spaced along the bottom margin' },
  { id: 'sides', th: 'ด้านข้าง', en: '3 on the left margin and 3 on the right margin, evenly spaced' },
  { id: 'scatter', th: 'กระจาย', en: '6 scattered in the page margin (top-left, top-right, middle-left, middle-right, bottom-left, bottom-right)' },
];

export interface Deco {
  id: string;
  th: string;
  motif: Motif;
  place: DecoPlace;
  /** สี: a = สีหลักของธีม, b = สีรอง, หรือ #hex */
  color: string;
}

const D = (id: string, th: string, motif: Motif, place: DecoPlace, color: string): Deco => ({ id, th, motif, place, color });

export const DECOS: Deco[] = [
  D('d-heart-c', 'หัวใจมุมกระดาษ', 'heart', 'corners', '#f43f5e'),
  D('d-star-c', 'ดาวมุมกระดาษ', 'star', 'corners', '#facc15'),
  D('d-bow-c', 'โบว์มุมกระดาษ', 'bow', 'corners', '#ec4899'),
  D('d-crown-c', 'มงกุฎมุมกระดาษ', 'crown', 'corners', '#f59e0b'),
  D('d-flower-c', 'ดอกไม้มุมกระดาษ', 'flower', 'corners', 'b'),
  D('d-leaf-c', 'ใบไม้มุมกระดาษ', 'leaf', 'corners', '#22c55e'),
  D('d-cloud-t', 'เมฆลอยขอบบน', 'cloud', 'top', '#e0f2fe'),
  D('d-flag-t', 'ธงราวขอบบน', 'flag', 'top', 'a'),
  D('d-balloon-t', 'ลูกโป่งขอบบน', 'balloon', 'top', '#f472b6'),
  D('d-sun-t', 'พระอาทิตย์ขอบบน', 'sun', 'top', '#fbbf24'),
  D('d-lantern-t', 'โคมไฟขอบบน', 'lantern', 'top', '#ef4444'),
  D('d-note-t', 'ตัวโน้ตขอบบน', 'note', 'top', 'a'),
  D('d-star-t', 'ดาวเรียงขอบบน', 'star', 'top', 'b'),
  D('d-tree-b', 'ต้นไม้ขอบล่าง', 'tree', 'bottom', '#16a34a'),
  D('d-flower-b', 'ดอกไม้ขอบล่าง', 'flower', 'bottom', '#f472b6'),
  D('d-paw-b', 'รอยเท้าขอบล่าง', 'paw', 'bottom', 'a'),
  D('d-fish-b', 'ปลาว่ายขอบล่าง', 'fish', 'bottom', '#38bdf8'),
  D('d-shell-b', 'เปลือกหอยขอบล่าง', 'shell', 'bottom', '#fdba74'),
  D('d-apple-b', 'แอปเปิลขอบล่าง', 'apple', 'bottom', '#ef4444'),
  D('d-tri-b', 'ภูเขาขอบล่าง', 'tri', 'bottom', '#22c55e'),
  D('d-drop-s', 'หยดน้ำด้านข้าง', 'drop', 'sides', '#38bdf8'),
  D('d-pencil-s', 'ดินสอด้านข้าง', 'pencil', 'sides', '#fbbf24'),
  D('d-gear-s', 'เฟืองด้านข้าง', 'gear', 'sides', 'a'),
  D('d-diamond-s', 'เพชรด้านข้าง', 'diamond', 'sides', 'b'),
  D('d-bolt-s', 'สายฟ้าด้านข้าง', 'bolt', 'sides', '#facc15'),
  D('d-snow-x', 'เกล็ดหิมะกระจาย', 'snow', 'scatter', '#60a5fa'),
  D('d-heart-x', 'หัวใจกระจาย', 'heart', 'scatter', '#fb7185'),
  D('d-star-x', 'ดาวกระจาย', 'star', 'scatter', '#facc15'),
  D('d-planet-x', 'ดาวเคราะห์กระจาย', 'planet', 'scatter', 'a'),
  D('d-donut-x', 'โดนัทกระจาย', 'donut', 'scatter', '#f9a8d4'),
  D('d-moon-x', 'พระจันทร์กระจาย', 'moon', 'scatter', '#fde047'),
  D('d-leaf-x', 'ใบไม้ปลิว', 'leaf', 'scatter', '#f97316'),
  D('d-note-x', 'ตัวโน้ตกระจาย', 'note', 'scatter', 'b'),
];
export const MAX_DECOS = 3;

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
