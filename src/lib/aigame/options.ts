/**
 * วิชา เรื่อง ระดับชั้น ความยาก ภาษา ของคลังเกม (ข้อมูลล้วน) · id ห้ามเปลี่ยน เพิ่มต่อท้ายได้
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

