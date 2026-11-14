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
    pitch: 'เป่าลูกดอกใส่ลูกโป่งคำตอบที่ลอยตามลม เลือกลูกที่ถูกก่อนลมพัดหนี',
    how: ['อ่านคำถามบนป้ายด้านบน', 'แตะลูกโป่งที่ถูก ตัวละครจะเป่าลูกดอกไป', 'ระวังลมพัด ลูกโป่งจะลอยเฉไป'],
    fit: 'ทุกวิชา ป.1 ขึ้นไป · คำตอบสั้น',
    scene:
      'A sunny Thai temple-fair sky: soft blue gradient, two layers of slow drifting clouds (parallax), colorful bunting flags across the top, rolling green hills at the bottom. Balloons are glossy with a white highlight, a curved string and a soft shadow; every balloon has its own color and a big, readable answer label.',
    core: [
      'Answer action: the mascot stands at the bottom with a toy blowpipe. Tapping a balloon makes the mascot turn toward it, puff its cheeks (anticipation) and blow a dart that flies in a smooth arc and homes in on that balloon in CONFIG.dartSec seconds. Call answer(i) on impact, not on tap, so the dart always hits the balloon the child chose. Only one dart can be in the air at a time.',
      'When PLAY starts, release one balloon per choice, one every CONFIG.spawnGapSec seconds, spread across the width. Balloons start already visible in the lower third of the play area (they pop in with a quick bounce), never below the screen, so the child can answer right away. Each balloon floats from bottom to top in CONFIG.riseSec seconds, bobbing and swaying, and softly pushes away from its neighbours so labels never overlap.',
      'Wind: every CONFIG.windEverySec seconds a gust blows left or right for about 2 seconds: wind streaks sweep across the sky, the bunting flaps, balloons tilt and drift sideways, then ease back to their lanes. Wind never pushes a balloon off screen.',
      'Correct balloon: the dart pops it into confetti and ribbon pieces, a small gift box drops with the points, the mascot jumps for joy, FEEDBACK, next question.',
      'Wrong balloon: the dart bounces off with a rubbery boing, the balloon wobbles and shrinks a little but keeps floating, and the hint appears. The question continues.',
      'A balloon that leaves the top re-enters from the bottom, so the correct answer is always reachable. From its second loop the correct balloon glows softly.',
      'Between questions a golden star balloon sometimes drifts by for 2 seconds; tapping it gives a small bonus (it is never an answer).',
    ],
    controls: ['Tap or click a balloon.', 'Keyboard: number keys 1-4 match the small number badge on each balloon.'],
    progression: [
      'Every 3 correct answers in a row, balloons float 8% faster and gusts come a little more often, never faster than CONFIG.maxSpeedUp times the base speed.',
      'After 2 wrong answers in a row, return to the base speed and calmer wind.',
    ],
    juice: [
      'Balloons squash and stretch while bobbing; strings wave with the wind.',
      'A dart trail with tiny sparkles; a soft bubble pop and a confetti burst.',
      'The combo counter (x2, x3) bounces in the HUD; the mascot celebrates bigger at x3.',
    ],
    cfg: {
      riseSec: [11, 'seconds for a balloon to float from the bottom to the top of the play area'],
      spawnGapSec: [0.7, 'seconds between releasing the balloons of one question'],
      dartSec: [0.45, 'seconds for a dart to fly from the mascot to the tapped balloon'],
      windEverySec: [6, 'seconds between wind gusts'],
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
      'The character runs forward automatically and the world scrolls toward the camera: trees, flowers and clouds slide past with parallax.',
      'Each question: after READ, spawn ONE row of 3 gates (one per lane) far away. The row reaches the player in exactly CONFIG.gateTravelSec seconds. Each gate is a decorated arch with one choice on a big sign that faces the camera and swings gently. With 4 choices drop one wrong choice; with 2 choices the middle lane is a hedge.',
      'Judge the answer only once: at the moment the row reaches the player, using the lane the player is in at that moment.',
      'A bar at the bottom of the screen shows the three lane answers as big cards (left, middle, right, matching the lanes) and highlights the current lane of the player, so the choices are always readable even while the gates are far away.',
      'Correct gate: confetti cannons fire from the arch, the character does a happy spin, a short speed boost with speed lines, coins and points, FEEDBACK.',
      'Wrong gate or hedge: the arch is a soft cushion; the character bounces back, wobbles and keeps running, the hint appears, and after CONFIG.gapSec seconds the SAME question sends a new row with the choices in new lanes.',
      'Between gate rows (CONFIG.gapSec seconds): a trail of coins to collect by changing lanes and one small log to hop over. Bumping the log only makes the character stumble for a moment; it never costs points.',
    ],
    controls: [
      'Phone/tablet: swipe left/right to change lane and swipe up to jump, or use the on-screen left/right/jump buttons.',
      'Computer: arrow keys or A/D to change lane, Up/W/Space to jump.',
      'A lane change is a quick 0.18 s slide with a lean; a jump is a 0.6 s arc.',
    ],
    progression: [
      'Every 3 correct answers in a row the run gets 5% faster, never faster than CONFIG.maxSpeedUp times the base speed.',
      'After 3 correct in a row a coin magnet appears for the next coin trail.',
    ],
    juice: [
      'The character leans into lane changes and squashes on landing.',
      'Dust puffs under the feet; coin sparkle and chime.',
      'Gentle camera shake on a cushion bounce; the camera FOV widens slightly during the boost.',
    ],
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
      'During PLAY, moles pop up in waves of 2-3 random holes, each holding one choice sign. A mole first peeks (eyes only, 0.3 s), then pops up with a bounce and stays up for CONFIG.upSec seconds, then ducks; the next wave comes CONFIG.hideSec seconds later.',
      'The correct choice appears in at least every second wave, and waves repeat until the question is answered correctly.',
      'Answer action: a big rubber mallet follows the pointer; tapping a mole swings it down with a squash. Call answer(i) on the hit.',
      'Correct mole: its hat flies off, it spins with dizzy stars, flowers burst from the hole, points float up, FEEDBACK, next question.',
      'Wrong mole: it pops back up, sticks out its tongue and ducks; the hint appears; the same question continues.',
      'Between questions a golden mole sometimes pops up for 1.5 seconds; hitting it gives a small bonus (it is never an answer). A butterfly or bird wanders across the lawn now and then.',
    ],
    controls: ['Tap or click a mole (the cursor is a rubber mallet).', 'Keyboard: keys 1-6 match the small number painted next to each hole.'],
    progression: [
      'Every 3 correct answers in a row, moles stay up 8% shorter, never shorter than CONFIG.upSec divided by CONFIG.maxSpeedUp.',
      'After 2 wrong answers in a row, return to the base timing.',
    ],
    juice: [
      'The mallet squashes and bounces on each hit and glows during a combo.',
      'Little dirt bits and grass blades fly out of the hole.',
      'Funny bonk and boing sounds; the fence and flowers sway in the breeze.',
    ],
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
      'The question is shown on a sign on the boat. One fish per choice swims in its own depth lane, crossing the screen in CONFIG.swimCrossSec seconds and turning around at the edges (fish never leave the screen). Each fish carries a big answer tag.',
      'Answer action: tap a fish; the mascot casts the line and the hook drops to it in CONFIG.hookSec seconds, the bobber dips twice (nibble), then the player taps 3 times quickly (or presses Space) to reel in while a reel meter fills. The meter can never fail; it only adds excitement. Call answer(i) when the fish reaches the surface.',
      'Correct fish: it leaps out of the water with a splash, a fish card shows its name and weight, points by weight, FEEDBACK, next question.',
      'Wrong fish: it shakes its tag, slips off the hook and swims away giggling; the hook returns; the hint appears; try again.',
      'The sea is alive: a friendly turtle or crab passes by now and then, seaweed sways, bubbles rise and light rays shimmer.',
      'About 1 question in 5 has a treasure chest on the seabed; answering that question correctly opens it for a fixed bonus (no random prizes).',
    ],
    controls: ['Tap or click a fish.', 'Keyboard: number keys 1-4 match the number on each answer tag.'],
    progression: [
      'Every 3 correct answers in a row fish swim 8% faster and turn more often, never faster than CONFIG.maxSpeedUp times the base speed.',
      'A small fish book collects every species caught in this session.',
    ],
    juice: [
      'The fishing line curves with simple physics; the rod bends while reeling.',
      'Splash and droplets when a fish is pulled out.',
      'Bubble blop sounds and a reel click sound.',
    ],
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
    pitch: 'จำตำแหน่งการ์ดคำตอบที่คว่ำอยู่ แล้วเปิดใบที่ตอบคำถามบนจอได้ถูก',
    how: ['ดูการ์ดคำตอบทุกใบก่อนคว่ำ', 'อ่านคำถาม แล้วเปิดการ์ดที่เป็นคำตอบ', 'จำตำแหน่งได้ ยิ่งเปิดถูกเร็ว'],
    fit: 'คำศัพท์-ความหมาย สูตร-ผลลัพธ์ ภาพ-ชื่อ',
    scene:
      'A wooden table in a magical library. Card backs show a star pattern; face-up cards are pastel with thick rounded borders and big text.',
    core: [
      'Find-the-answer memory: the table holds a grid of face-down answer cards. Each stage takes the next few questions (stage 1: 4, then 2 more per stage, up to 8) and deals one card per question showing its correct answer (multi-answer: all correct answers joined with commas; text-answer: the first accepted answer). The grid stays on the table for every question of the stage; clear() removes only the matched card.',
      'At the start of each stage the cards are dealt in with a fan animation, shown face up for CONFIG.previewSec seconds, then flipped down one by one in a wave.',
      'The engine shows the current question in the question card. The player flips ONE card (3D rotateY flip). If it holds the answer to this question, call answer() with the correct choice index: the card lifts, sparkles and flies into a magic book. Otherwise call answer() with a wrong choice index: the card stays face up for CONFIG.mismatchSec seconds, shakes a little and flips back.',
      'From stage 3, once per stage, two face-down cards visibly swap places (a playful twist that is easy to follow).',
      'After 2 wrong flips on the same question, the right card gently glows.',
    ],
    controls: ['Tap or click a card.', 'Keyboard: arrow keys to move, Enter to flip.'],
    progression: ['Each stage has more cards (see above).', 'At the end of each stage a short celebration shows 1-3 stars based on wrong flips.'],
    juice: ['Cards flip in 3D (rotateY) with a little hop; face-up cards bob gently.', 'Matched cards fly into the magic book, which glows and turns a page.', 'Glass chime on every match; soft whoosh on every flip.'],
    cfg: {
      previewSec: [4, 'seconds all cards stay face up at the start of a stage'],
      mismatchSec: [1.3, 'seconds a wrong card stays face up before flipping back'],
    },
    modes: { duel: 'Two players on one device take turns question by question; separate scores and a clear turn banner.' },
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
      'Slimes come in waves and walk from the right end of the path toward the castle. A slime needs CONFIG.walkSec seconds to walk the whole path. Slimes do not move during READ. Small slimes hop quickly and big ones wobble slowly; they look different but never scary.',
      'The question panel sits at the bottom with big answer buttons. Correct: the candy cannon on the tower turns toward the slime closest to the castle and fires a candy that flies in an arc; the slime bounces and turns into candy that rains down. FEEDBACK, next question.',
      'Wrong: the cannon puffs smoke and coughs, every slime freezes for CONFIG.freezeOnWrongSec seconds (thinking time), the hint appears, and the same question stays.',
      'A slime that reaches the castle makes it shake and bounces back to the start of the path (it is not removed).',
      'A new wave starts CONFIG.waveGapSec seconds after the previous wave is cleared. Between waves the player picks 1 of 2 upgrades shown as cards (stronger shot, double shot, slower slimes), each with a visible change on the cannon.',
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
      'The first team to tap the correct answer does a power pull: the characters lean back, the rope stretches, dust flies and the flag moves one step toward that team. 3 correct in a row for one team = a super pull of 2 steps with a flash. FEEDBACK, next question.',
      'A team that taps a wrong answer slips comically and has its buttons locked for CONFIG.lockOnWrongSec seconds; the other team can still answer.',
      'The crowd reacts with waves, jumps and banners for the leading team. The flag wobbles with tension while nobody has answered.',
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
      'The ship flies forward automatically through a starfield with parallax; the player steers up/down/left/right inside a frame.',
      'Each question: after READ, spawn one set of rings (one per choice) far ahead, spread toward the corners of the view. The set reaches the ship in CONFIG.ringTravelSec seconds. Each ring spins slowly and has a big answer label in its center that faces the camera.',
      'Judge only once, when the ring set reaches the ship: the ring whose center is nearest the ship (within its radius) counts. Flying past all rings is a miss with no penalty, and the same set comes again.',
      'Correct ring: it bursts into particles, the ship warps through a short tunnel of light (speed boost), points, FEEDBACK, next question.',
      'Wrong ring: it fizzles, the ship does a barrel roll, the hint appears, and after CONFIG.gapSec seconds the same question sends its rings again in new positions.',
      'Between ring sets (CONFIG.gapSec seconds): cute smiling asteroids drift by to dodge (a bump only makes the ship wobble) and star bits to collect for bonus points.',
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
