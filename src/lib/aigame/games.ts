/**
 * คลังแบบเกมสำหรับ "สร้างเกมด้วย AI": ครูเลือกเกม ปรับวิชา/ชั้น/เนื้อหา แล้วคัดลอก prompt ไปให้ Gemini (Canvas) สร้าง
 * ข้อมูลล้วน (ใช้ทั้งหน้าเว็บและ selftest) · id ห้ามเปลี่ยน (ลิงก์ ?g= อ้างถึง) เพิ่มต่อท้ายได้
 * ช่องภาษาไทย (name/pitch/how/fit) โชว์บนหน้าเว็บ · ช่องภาษาอังกฤษ (scene/core/...) ใช้ใน prompt เท่านั้น
 * ตัวเลขเวลาทุกตัวอยู่ใน cfg ที่เดียว (prompt คูณตามความเร็วที่ครูเลือกแล้วส่งเป็น CONFIG) ข้อความอ้างชื่อ CONFIG เท่านั้น ห้ามเขียนตัวเลขเวลาซ้ำ
 */

export type Dim = '2D' | '3D';

export interface AiGame {
  id: string;
  /** ชื่อเกม (ไทย) */
  name: string;
  /** ชื่อเกมภาษาอังกฤษ (ใช้เป็นชื่อในเกม) */
  en: string;
  dim: Dim;
  /** สีหลักของการ์ด */
  color: string;
  /** อธิบายเกมหนึ่งบรรทัด */
  pitch: string;
  /** วิธีเล่นสำหรับครู 3 ขั้น (สั้น) */
  how: [string, string, string];
  /** เหมาะกับ */
  fit: string;
  /** prompt: ฉาก/บรรยากาศ (EN) */
  scene: string;
  /** prompt: กลไกหลักทีละข้อ (EN) */
  core: string[];
  /** prompt: การควบคุม (EN) */
  controls: string[];
  /** prompt: ความยากเพิ่มขึ้นอย่างไร (EN) */
  progression: string[];
  /** prompt: ความรู้สึกของเกม (EN) */
  juice: string[];
  /** เวลาพื้นฐาน (วินาที ที่ความเร็ว "ปกติ") ชื่อ -> [ค่า, คำอธิบาย EN] */
  cfg: Record<string, [number, string]>;
  /** เกมไม่มีของเคลื่อนที่ (คำถามอยู่บนการ์ด) ไม่ต้องมีช่วงอ่านโจทย์ */
  noRead?: boolean;
  /** ความหมายของโหมดผู้เล่นสำหรับเกมนี้ (ถ้าต่างจากค่าปกติ) */
  modes?: Partial<Record<'solo' | 'duel' | 'class', string>>;
}

export const AI_GAMES: AiGame[] = [
  {
    id: 'balloon',
    name: 'ยิงลูกโป่งคำตอบ',
    en: 'Balloon Pop Party',
    dim: '2D',
    color: '#ff6b7a',
    pitch: 'ลูกโป่งคำตอบลอยขึ้นฟ้า แตะลูกที่ถูกให้แตกก่อนลอยหายไป',
    how: ['อ่านคำถามบนป้ายด้านบน', 'แตะลูกโป่งที่มีคำตอบถูก', 'ถูกต่อเนื่องได้คอมโบ ผิดได้คำใบ้'],
    fit: 'ทุกวิชา ป.1 ขึ้นไป · คำตอบสั้น',
    scene:
      'A sunny Thai temple-fair sky: soft blue gradient, two layers of slow drifting clouds (parallax), colorful bunting flags across the top, rolling green hills at the bottom. Balloons are glossy with a white highlight, a curved string and a soft shadow; every balloon has its own color and a big, readable answer label.',
    core: [
      'When PLAY starts, release one balloon per choice from just below the bottom edge, one after another every CONFIG.spawnGapSec seconds, spread evenly across the width so they never overlap.',
      'Each balloon floats from the bottom to the top of the play area in CONFIG.riseSec seconds with a gentle side-to-side sway.',
      'Tap the correct balloon: it pops into confetti and sparkles, points are added, then FEEDBACK, then the next question.',
      'Tap a wrong balloon: it deflates and drifts down slowly (no pop) and the hint appears. The question stays and the other balloons keep floating.',
      'A balloon that leaves the top re-enters from the bottom (endless loop), so the correct answer is always reachable. From the second loop on, the correct balloon glows softly.',
    ],
    controls: ['Tap or click a balloon.', 'Keyboard: number keys 1-4 match the small number badge on each balloon.'],
    progression: [
      'Every 3 correct answers in a row, balloons float 8% faster, never faster than CONFIG.maxSpeedUp times the base speed.',
      'After 2 wrong answers in a row, return to the base speed.',
    ],
    juice: ['Balloons squash and stretch a little while floating.', 'Soft bubble "pop" sound and a confetti burst on pop.', 'Combo counter (x2, x3) bounces in the HUD.'],
    cfg: {
      riseSec: [11, 'seconds for a balloon to float from the bottom to the top of the play area'],
      spawnGapSec: [0.7, 'seconds between releasing the balloons of one question'],
    },
  },
  {
    id: 'runner',
    name: 'วิ่งผ่านประตูคำตอบ',
    en: 'Answer Gate Run',
    dim: '3D',
    color: '#4fb3ff',
    pitch: 'วิ่งบนถนน 3 เลน เปลี่ยนเลนไปชนประตูที่มีคำตอบถูก',
    how: ['ดูคำถามที่ลอยเหนือถนน', 'ปัด/กดลูกศร เปลี่ยนเลนไปประตูที่ถูก', 'ผ่านประตูถูกได้เหรียญและวิ่งเร็วขึ้น'],
    fit: 'ทุกวิชา · ตัวเลือก 2-3 ข้อ · ชอบความเร็ว',
    scene:
      'A three-lane road floating over a sea of clouds, low-poly round trees and flower bushes on both sides, pastel morning light and soft distance fog. Third-person camera behind and slightly above a cute round runner character.',
    core: [
      'The character runs forward automatically and the world scrolls toward the camera.',
      'Each question: after READ, spawn ONE row of 3 gates (one per lane) far away. The row reaches the player in exactly CONFIG.gateTravelSec seconds. Each gate carries one choice on a big sign that faces the camera. With 4 choices drop one wrong choice; with 2 choices the middle lane is a hedge.',
      'Judge the answer only once: at the moment the row reaches the player, using the lane the player is in at that moment.',
      'Correct gate: it bursts into golden light, coins and points, FEEDBACK, then a coin trail for CONFIG.gapSec seconds before the next question.',
      'Wrong gate or hedge: the character stumbles and rolls, the hint appears, and after CONFIG.gapSec seconds the SAME question sends a new row of gates with the choices in new lanes.',
    ],
    controls: ['Phone/tablet: swipe left/right, or tap the left/right half of the screen.', 'Computer: arrow keys or A/D.', 'A lane change is a quick 0.18 s slide.'],
    progression: [
      'Every 3 correct answers in a row the run gets 5% faster, never faster than CONFIG.maxSpeedUp times the base speed.',
      'Longer questions automatically get a longer READ phase.',
    ],
    juice: ['The character leans into lane changes.', 'Dust particles under the feet.', 'Light camera shake on a wrong gate.', 'Coin chime on every coin.'],
    cfg: {
      gateTravelSec: [7, 'seconds for a row of gates to travel from the horizon to the player'],
      gapSec: [2.5, 'seconds of free running (coin trail) between two rows of gates'],
    },
  },
  {
    id: 'mole',
    name: 'ทุบตัวตุ่นคำตอบ',
    en: 'Whack-a-Mole Quiz',
    dim: '2D',
    color: '#3fd6a8',
    pitch: 'ตัวตุ่นถือป้ายคำตอบโผล่จากหลุม ทุบตัวที่ถือคำตอบถูก',
    how: ['อ่านคำถามบนป้ายด้านบน', 'รอตัวตุ่นโผล่ แล้วทุบตัวที่ถูก', 'ทุบผิด ตัวตุ่นแลบลิ้นแล้วมุดหนี'],
    fit: 'ป.1-ป.4 · คำศัพท์ จำนวน ข้อเท็จจริงสั้นๆ',
    scene:
      'A farm lawn with 6 holes (2 rows x 3), a wooden fence and flowers. Round, cute moles wearing hats of different colors, each holding up an answer sign.',
    core: [
      'During PLAY, moles pop up in waves of 2-3 random holes, each holding one choice. A mole stays up for CONFIG.upSec seconds, then ducks; the next wave comes CONFIG.hideSec seconds later.',
      'The correct choice appears in at least every second wave, and waves repeat until the question is answered correctly.',
      'Hit the correct mole: star eyes, sparkles, points, FEEDBACK, next question.',
      'Hit a wrong mole: it sticks out its tongue and ducks, the hint appears, and the same question continues.',
    ],
    controls: ['Tap or click a mole (the cursor is a rubber mallet).', 'Keyboard: keys 1-6 match the small number painted next to each hole.'],
    progression: [
      'Every 3 correct answers in a row, moles stay up 8% shorter, never shorter than CONFIG.upSec divided by CONFIG.maxSpeedUp.',
      'After 2 wrong answers in a row, return to the base timing.',
    ],
    juice: ['The mallet squashes and bounces on each hit.', 'Little dirt bits fly out of the hole.', 'A funny "bonk" sound.'],
    cfg: {
      upSec: [3.5, 'seconds a mole stays up'],
      hideSec: [0.9, 'seconds between two waves of moles'],
    },
  },
  {
    id: 'fishing',
    name: 'ตกปลาคำตอบ',
    en: 'Lucky Fishing',
    dim: '2D',
    color: '#22b8cf',
    pitch: 'ปลาว่ายพร้อมป้ายคำตอบ หย่อนเบ็ดลงไปตกตัวที่ถูก',
    how: ['อ่านคำถามบนเรือ', 'แตะปลาที่ถือคำตอบถูกเพื่อหย่อนเบ็ด', 'ตกได้ปลาใหญ่ = คะแนนมาก'],
    fit: 'ทุกวิชา · ทุกชั้น · บรรยากาศชิล',
    scene:
      'A clear sea seen in cross-section: a small boat on the surface, light rays shimmering through the water, swaying seaweed, rising bubbles and bright, friendly fish of several shapes.',
    core: [
      'The question is shown on a sign on the boat. One fish per choice swims in its own depth lane and crosses the screen in CONFIG.swimCrossSec seconds, turning around at the edges (fish never leave the screen). Each fish carries a big answer tag.',
      'Tap a fish: the hook drops to it in CONFIG.hookSec seconds. While the hook is moving, no other input is accepted.',
      'Correct fish: reel it up, show a fish card with its name and weight, add points by weight, FEEDBACK, next question.',
      'Wrong fish: it wriggles free and swims off, the hook returns, the hint appears, and the player tries again.',
      'About 1 question in 5 has a treasure chest on the seabed; answering that question correctly opens it for a fixed bonus (no random prizes).',
    ],
    controls: ['Tap or click a fish.', 'Keyboard: number keys 1-4 match the number on each answer tag.'],
    progression: [
      'Every 3 correct answers in a row fish swim 8% faster and turn more often, never faster than CONFIG.maxSpeedUp times the base speed.',
      'A small fish book collects every species caught in this session.',
    ],
    juice: ['The fishing line curves with simple physics.', 'Splash when a fish is pulled out of the water.', 'Bubble "blop" sounds.'],
    cfg: {
      swimCrossSec: [10, 'seconds for a fish to swim across the whole screen'],
      hookSec: [0.8, 'seconds for the hook to reach the tapped fish'],
    },
  },
  {
    id: 'memory',
    name: 'เปิดการ์ดจับคู่',
    en: 'Match & Flip',
    dim: '2D',
    color: '#9b6cf0',
    pitch: 'เปิดการ์ดคำถามกับการ์ดคำตอบให้เป็นคู่กันจนหมดกระดาน',
    how: ['เปิดการ์ดทีละ 2 ใบ', 'จับคู่คำถามกับคำตอบที่ถูก', 'ใช้จำนวนครั้งน้อยได้ดาวมาก'],
    fit: 'คำศัพท์-ความหมาย สูตร-ผลลัพธ์ ภาพ-ชื่อ',
    scene:
      'A wooden table in a magical library. Card backs show a star pattern; face-up cards are pastel with thick rounded borders and big text.',
    core: [
      'This game uses only each question and its correct answer (wrong choices are not used). Each stage takes some questions and makes pairs: a question card and its answer card, shuffled face down in a grid.',
      'Multi-answer questions: put all correct answers on the answer card, joined with ", ". Text-answer questions: use the first accepted answer.',
      'At the start of each stage show all cards face up for CONFIG.previewSec seconds, then flip them down.',
      'Flip 2 cards. A matching pair merges with a sparkle and gives points. A non-matching pair shakes a little, stays visible for CONFIG.mismatchSec seconds, then flips back. Input is locked while 2 cards are open.',
      'After 3 misses on the same card, gently blink its partner as a hint.',
    ],
    controls: ['Tap or click a card.', 'Keyboard: arrow keys to move, Enter to flip.'],
    progression: ['Stage 1 has 3 pairs; each stage adds 1 pair, up to 6 pairs.', 'At the end of each stage show 1-3 stars based on the number of flips.'],
    juice: ['Cards flip in 3D (rotateY).', 'Matched pairs fly into a collection box.', 'Glass chime on every match.'],
    cfg: {
      previewSec: [3, 'seconds all cards stay face up at the start of a stage'],
      mismatchSec: [1.3, 'seconds a non-matching pair stays visible before flipping back'],
    },
    noRead: true,
    modes: { duel: 'Two players on one device take turns; a player who finds a pair goes again. Separate scores and a clear turn banner.' },
  },
  {
    id: 'castle',
    name: 'ป้องกันปราสาท',
    en: 'Castle Guardians',
    dim: '2D',
    color: '#ff9a3d',
    pitch: 'สไลม์ขนมเดินเข้าหาปราสาท ตอบถูกเพื่อยิงปืนใหญ่ลูกกวาด',
    how: ['สไลม์เดินมาทางปราสาท', 'ตอบคำถามถูก = ปืนใหญ่ยิง', 'ปกป้องปราสาทให้ครบทุกระลอก'],
    fit: 'ป.3 ขึ้นไป · ฝึกความเร็วและความแม่นยำ',
    scene:
      'A candy meadow: a cake castle on the left, a winding path to the right, cute jelly slimes (not scary, nothing violent). The slimes turn into candy when hit.',
    core: [
      'Slimes come in waves and walk from the right end of the path toward the castle. A slime needs CONFIG.walkSec seconds to walk the whole path. Slimes do not move during READ.',
      'The question panel sits at the bottom with big answer buttons. Correct: the candy cannon fires at the slime closest to the castle; it bounces and turns into candy. FEEDBACK, next question.',
      'Wrong: the cannon puffs smoke, every slime freezes for CONFIG.freezeOnWrongSec seconds (thinking time), the hint appears, and the same question stays.',
      'A slime that reaches the castle makes it shake and bounces back to the start of the path (it is not removed).',
      'A new wave starts CONFIG.waveGapSec seconds after the previous wave is cleared. Between waves the player picks 1 of 2 upgrades (stronger shot, double shot, slower slimes).',
    ],
    controls: ['Tap or click the answer buttons in the question panel.', 'Keyboard: number keys 1-4.'],
    progression: [
      'Wave 1 has 3 slimes. Each wave adds 1 slime and walks 5% faster, never faster than CONFIG.maxSpeedUp times the base speed.',
      'If the player made many mistakes in a wave, the next wave walks at the base speed.',
    ],
    juice: ['Candy flies in an arc.', 'Slimes jiggle as they walk.', 'The castle shakes when touched.', 'A soft "poomf" when the cannon fires.'],
    cfg: {
      walkSec: [32, 'seconds for a slime to walk the whole path to the castle'],
      freezeOnWrongSec: [2, 'seconds all slimes freeze after a wrong answer'],
      waveGapSec: [4, 'seconds between the end of one wave and the next'],
    },
  },
  {
    id: 'tug',
    name: 'ชักเย่อทีมความรู้',
    en: 'Tug of Knowledge',
    dim: '2D',
    color: '#ffcf3f',
    pitch: 'สองทีมแข่งกันตอบ ตอบถูกดึงเชือกเข้าหาฝั่งตัวเอง เล่นหน้าห้องได้',
    how: ['แบ่งห้องเป็น 2 ทีม (ซ้าย/ขวา)', 'ทีมที่ตอบถูกได้ดึงเชือกเข้าหาตัว', 'ธงกลางเชือกเข้าเขตใครก่อนชนะ'],
    fit: 'เล่นทั้งห้องบนจอโปรเจกเตอร์ · ทบทวนก่อนสอบ',
    scene:
      'A school sports-day field: left team in blue, right team in pink, 3 round animal characters per side holding the rope, a red flag at the middle of the rope, a finish line on each side and a cheering crowd behind.',
    core: [
      'The question panel is in the center; each team has its own set of answer buttons on its side of the screen.',
      'The first team to tap the correct answer pulls the rope one step toward its side. FEEDBACK, next question.',
      'A team that taps a wrong answer has its buttons locked for CONFIG.lockOnWrongSec seconds; the other team can still answer.',
      'The first team to pull the flag across its finish line wins (5 steps by default; 3/5/7 can be chosen on the start screen): fireworks and a trophy, then a rematch button.',
    ],
    controls: ['Each team taps the buttons on its own side.', 'Keyboard: left team 1-4, right team 7-0.'],
    progression: ['The computer team (solo mode) has 3 skill levels chosen on the start screen.', 'Stars on the result screen are based on each team\'s accuracy.'],
    juice: ['Characters lean back and really pull.', 'Dust under their feet.', 'Cheering sound when a team pulls.'],
    cfg: {
      lockOnWrongSec: [2, 'seconds a team is locked out after a wrong answer'],
      cpuMinSec: [6, 'fastest time the computer team needs to answer (solo mode)'],
      cpuMaxSec: [12, 'slowest time the computer team needs to answer (solo mode)'],
    },
    modes: {
      solo: 'One player versus a computer team that answers correctly after a random delay between CONFIG.cpuMinSec and CONFIG.cpuMaxSec seconds.',
      duel: 'Two teams play at the same time on one screen, each on its own side.',
      class: 'Projector mode for the whole class split into two teams; two students (one per team) come up to tap, or the teacher taps for the team that answers first out loud. Text at least 40 px.',
    },
  },
  {
    id: 'space',
    name: 'ยานอวกาศบินลอดวงแหวน',
    en: 'Star Ring Pilot',
    dim: '3D',
    color: '#7c5cf0',
    pitch: 'ขับยานบินผ่านอวกาศ ลอดวงแหวนที่มีคำตอบถูก',
    how: ['ดูคำถามบนจอยาน', 'บังคับยานไปลอดวงแหวนคำตอบที่ถูก', 'เก็บดาวและเชื้อเพลิงระหว่างทาง'],
    fit: 'ป.3-ม.3 · วิทย์ คณิต อังกฤษ',
    scene:
      'Deep space fading from navy to purple, pastel planets in the distance, twinkling stars, a cute round spaceship with a clear cockpit and neon rings in several colors. The camera follows behind the ship.',
    core: [
      'The ship flies forward automatically; the player steers up/down/left/right inside a frame.',
      'Each question: after READ, spawn one set of rings (one per choice) far ahead, spread toward the corners of the view. The set reaches the ship in CONFIG.ringTravelSec seconds. Each ring has a big answer label in its center that faces the camera.',
      'Judge only once, when the ring set reaches the ship: the ring whose center is nearest the ship (within its radius) counts. Flying past all rings is a miss with no penalty, and the same set comes again.',
      'Correct ring: it bursts into particles, the ship gets a short speed boost, points, FEEDBACK, next question.',
      'Wrong ring: the ship does a spin, the hint appears, and after CONFIG.gapSec seconds the same question sends its rings again in new positions.',
    ],
    controls: ['Phone/tablet: drag a finger anywhere (floating joystick).', 'Computer: arrow keys / WASD, or move the mouse.'],
    progression: [
      'Every 3 correct answers in a row rings get a little smaller and 5% faster, never faster than CONFIG.maxSpeedUp times the base speed.',
      'Every 5 questions the ship reaches a new planet (new scene colors).',
    ],
    juice: ['Engine flame particles.', 'Speed lines during a boost.', 'The ship tilts toward the steering direction.'],
    cfg: {
      ringTravelSec: [8, 'seconds for a set of rings to travel from far away to the ship'],
      gapSec: [2.5, 'seconds of free flight between two sets of rings'],
    },
  },
];

export const gameById = (id: string | null | undefined) => AI_GAMES.find((g) => g.id === id) || null;
