/**
 * Human Shape Builder: คลังภารกิจ "ใช้ร่างกายสร้างรูป" + ท่าทาง + ตัวเลือกภารกิจตามจำนวนคน
 * - ท่าทางทุกท่าอยู่ใน POSES (allowlist): ยืน นั่ง คุกเข่า นอนราบบนพื้น ไม่มีปีน/ยก/ซ้อนตัว
 * - รูปเรขาคณิต ตัวเลข ตัวอักษร สร้างจากเส้น (segments) แล้วกระจายคนตามความยาวเส้น: ใช้กี่คนก็ได้ตั้งแต่ min ถึง max
 * - สิ่งของ/สัตว์/สร้างสรรค์/แนวคิด วางตำแหน่งเอง: min คนแรกคือหลัก คนที่เกินเป็นบทบาทเสริม
 * - เพิ่มภารกิจใหม่: ใส่ใน MISSIONS (รูปจากเส้นใช้ lineMission, วางเองใช้ handMission)
 */

/* ------------------------------ ท่าทาง ------------------------------ */

/** มุมแขน/ขา (องศา, 0 = ชี้ลง, + = หมุนตามเข็มนาฬิกาบนจอ) แขน: [ต้นแขน, ปลายแขนเทียบต้นแขน] dy = ตัวต่ำลง (นั่ง/คุกเข่า) */
export interface PoseDef {
  name: string;
  la: [number, number];
  ra: [number, number];
  ll: number;
  rl: number;
  dy: number;
}

export const POSES = {
  stand: { name: 'ยืนตรง', la: [8, 0], ra: [-8, 0], ll: 4, rl: -4, dy: 0 },
  reach: { name: 'ยกแขนตรงขึ้นฟ้า', la: [164, 0], ra: [-164, 0], ll: 3, rl: -3, dy: 0 },
  up: { name: 'ชูแขนเป็นตัว V', la: [145, 0], ra: [-145, 0], ll: 4, rl: -4, dy: 0 },
  out: { name: 'กางแขนออกข้าง', la: [90, 0], ra: [-90, 0], ll: 4, rl: -4, dy: 0 },
  left: { name: 'กางแขนซ้ายข้างเดียว', la: [90, 0], ra: [-8, 0], ll: 4, rl: -4, dy: 0 },
  right: { name: 'กางแขนขวาข้างเดียว', la: [8, 0], ra: [-90, 0], ll: 4, rl: -4, dy: 0 },
  angle: { name: 'แขนหนึ่งชูขึ้น แขนหนึ่งกางออก', la: [166, 0], ra: [-90, 0], ll: 4, rl: -4, dy: 0 },
  peak: { name: 'ประกบมือเหนือหัว', la: [196, 0], ra: [-196, 0], ll: 4, rl: -4, dy: 0 },
  tri: { name: 'ประกบมือเหนือหัว กางขา', la: [196, 0], ra: [-196, 0], ll: 26, rl: -26, dy: 3 },
  star: { name: 'กางแขนกางขาเป็นดาว', la: [128, 0], ra: [-128, 0], ll: 26, rl: -26, dy: 3 },
  hoop: { name: 'โค้งแขนเป็นวงเหนือหัว', la: [150, 62], ra: [-150, -62], ll: 4, rl: -4, dy: 0 },
  robot: { name: 'งอศอกตั้งฉากแบบหุ่นยนต์', la: [90, 90], ra: [-90, -90], ll: 10, rl: -10, dy: 0 },
  ears: { name: 'มือแตะหัวเป็นหู', la: [150, 72], ra: [-150, -72], ll: 4, rl: -4, dy: 0 },
  wing: { name: 'กางแขนโบกเป็นปีก', la: [108, -18], ra: [-108, 18], ll: 4, rl: -4, dy: 0 },
  trunk: { name: 'ห้อยแขนแกว่งด้านหน้า', la: [-14, 8], ra: [-150, -72], ll: 4, rl: -4, dy: 0 },
  wave: { name: 'โบกมือ', la: [8, 0], ra: [-150, -30], ll: 4, rl: -4, dy: 0 },
  rain: { name: 'แขนพลิ้วลงเป็นสายฝน', la: [40, -20], ra: [-40, 20], ll: 4, rl: -4, dy: 0 },
  sit: { name: 'นั่งขัดสมาธิบนพื้น', la: [24, 0], ra: [-24, 0], ll: 78, rl: -78, dy: 16 },
  curl: { name: 'นั่งกอดเข่าเป็นก้อนกลม', la: [40, -80], ra: [-40, 80], ll: 58, rl: -58, dy: 16 },
  kneel: { name: 'คุกเข่าบนพื้น ชูแขน', la: [160, 0], ra: [-160, 0], ll: 62, rl: -62, dy: 12 },
  lie: { name: 'นอนราบบนพื้น แขนแนบตัว', la: [6, 0], ra: [-6, 0], ll: 2, rl: -2, dy: 0 },
  lieUp: { name: 'นอนราบ ยืดแขนเหนือหัว', la: [168, 0], ra: [-168, 0], ll: 2, rl: -2, dy: 0 },
} satisfies Record<string, PoseDef>;

export type Pose = keyof typeof POSES;
export const POSE_IDS = Object.keys(POSES) as Pose[];
/** ท่าที่ต้องนอน/นั่งบนพื้น (มุมมองจากด้านบน) */
export const FLOOR_POSES: Pose[] = ['lie', 'lieUp', 'sit', 'curl'];

/** ตำแหน่ง/ท่าของสมาชิกหนึ่งคนในภาพสาธิต (หน่วยของเวที: เด็ก 1 คนสูง ~66) */
export interface Fig {
  x: number;
  y: number;
  /** หมุนตัว (องศา) มุมมองด้านบน = ทิศที่นอน, ด้านหน้า = เอนตัวเล็กน้อย */
  r: number;
  pose: Pose;
  role: string;
}

/* ------------------------------ ภารกิจ ------------------------------ */

export type Cat = 'geo' | 'num' | 'obj' | 'ani' | 'cre' | 'con';
export const CATS: { id: Cat; name: string; color: string }[] = [
  { id: 'geo', name: 'รูปทรงเรขาคณิต', color: '#4a7bf0' },
  { id: 'num', name: 'ตัวเลขและตัวอักษร', color: '#ff8a2f' },
  { id: 'obj', name: 'สร้างสิ่งของ', color: '#25c48a' },
  { id: 'ani', name: 'สร้างสัตว์', color: '#ff6bb8' },
  { id: 'cre', name: 'สร้างสรรค์อิสระ', color: '#9b6cf0' },
  { id: 'con', name: 'แนวคิดจากบทเรียน', color: '#e0a800' },
];
export const catBit = (c: Cat) => 1 << CATS.findIndex((x) => x.id === c);
export const ALL_CATS = (1 << CATS.length) - 1;
export const LEVELS = ['ง่าย', 'กลาง', 'ยาก'];

export interface Mission {
  id: string;
  name: string;
  cat: Cat;
  /** 0 ง่าย / 1 กลาง / 2 ยาก */
  level: number;
  /** จำนวนคนน้อยสุด/มากสุดที่ภาพสาธิตรองรับ (คนที่เกิน max เป็นผู้ช่วย) */
  min: number;
  max: number;
  /** top = นอนบนพื้นมองจากด้านบน / front = ยืนมองจากด้านหน้า */
  view: 'top' | 'front';
  /** คำที่เชื่อมกับเนื้อหาบทเรียน (รูปแบบ C) */
  keys: string[];
  tip: string;
  build: (n: number) => Fig[];
  /** เส้นรูปเป้าหมาย (โชว์ตอนรวมเป็นรูป) */
  outline: (n: number) => [number, number][][];
}

/* ---------- รูปจากเส้น: กระจายคนตามความยาว นอนราบตามแนวเส้น ---------- */

type Seg = [[number, number], [number, number]];
/** ระยะต่อคนตามแนวเส้น (เด็กนอนยาว ~64 เหลือช่องว่างหัว-เท้า) */
export const SLOT = 72;

const segLen = (s: Seg) => Math.hypot(s[1][0] - s[0][0], s[1][1] - s[0][1]);

/** แบ่ง n คนให้แต่ละเส้นตามความยาว (อย่างน้อยเส้นละ 1 คน) */
export function allocate(lens: number[], n: number): number[] {
  const k = lens.map(() => 1);
  const total = lens.reduce((a, b) => a + b, 0);
  for (let left = n - lens.length; left > 0; left--) {
    // ให้คนถัดไปกับเส้นที่ "ยาวต่อคน" มากที่สุด
    let best = 0;
    for (let i = 1; i < lens.length; i++) if (lens[i] / (k[i] + 1) > lens[best] / (k[best] + 1)) best = i;
    k[best]++;
  }
  void total;
  return k;
}

const MIN_GAP = 36;
function place(segs: Seg[], k: number[], scale: number): [number, number][] {
  const out: [number, number][] = [];
  segs.forEach((s, si) => {
    for (let i = 0; i < k[si]; i++) {
      const t = (i + 0.5) / k[si];
      out.push([(s[0][0] + (s[1][0] - s[0][0]) * t) * scale, (s[0][1] + (s[1][1] - s[0][1]) * t) * scale]);
    }
  });
  return out;
}

function layoutSegs(segs: Seg[], n: number, pose: Pose, roleOf: (seg: number, i: number) => string) {
  const lens = segs.map(segLen);
  const k = allocate(lens, n);
  let scale = Math.max(...lens.map((l, i) => (SLOT * k[i]) / l));
  // มุมแหลม (N V W) ทำให้คนเส้นข้างกันชิดเกิน: ขยายรูปจนห่างพอ
  for (let tries = 0; tries < 20; tries++) {
    const pts = place(segs, k, scale);
    if (pts.every((a, i) => pts.every((b, j) => j <= i || Math.hypot(a[0] - b[0], a[1] - b[1]) >= MIN_GAP))) break;
    scale *= 1.12;
  }
  const figs: Fig[] = [];
  segs.forEach((s, si) => {
    const [ax, ay] = [s[0][0] * scale, s[0][1] * scale];
    const [bx, by] = [s[1][0] * scale, s[1][1] * scale];
    // หัวชี้ไปทางต้นเส้น: แกนตัว (0,1) หมุนให้ชี้จาก a ไป b
    const r = (Math.atan2(by - ay, bx - ax) * 180) / Math.PI - 90;
    for (let i = 0; i < k[si]; i++) {
      const t = (i + 0.5) / k[si];
      figs.push({ x: ax + (bx - ax) * t, y: ay + (by - ay) * t, r: Math.round(r), pose, role: roleOf(si, i) });
    }
  });
  return { figs, scale };
}

function lineMission(o: Omit<Mission, 'build' | 'outline' | 'view' | 'min'> & { segs: Seg[]; part?: string[]; pose?: Pose }): Mission {
  const pose = o.pose || 'lie';
  return {
    ...o,
    view: 'top',
    min: o.segs.length,
    build: (n) =>
      layoutSegs(o.segs, Math.max(o.segs.length, Math.min(o.max, n)), pose, (si) => `${o.part?.[si] || `เส้นที่ ${si + 1}`}: ${POSES[pose].name}`).figs,
    outline: (n) => {
      const { scale } = layoutSegs(o.segs, Math.max(o.segs.length, Math.min(o.max, n)), pose, () => '');
      return o.segs.map((s) => s.map(([x, y]) => [x * scale, y * scale] as [number, number]));
    },
  };
}

/** n เหลี่ยมด้านเท่า (จุดยอดชี้ขึ้น) */
function polygon(sides: number, rot = -90): Seg[] {
  const p = Array.from({ length: sides }, (_, i) => {
    const a = ((rot + (360 * i) / sides) * Math.PI) / 180;
    return [Math.cos(a), Math.sin(a)] as [number, number];
  });
  return p.map((a, i) => [a, p[(i + 1) % sides]] as Seg);
}

/** รัศมีจากจุดกลาง (ไม่ไขว้ทับกันตรงกลาง: เว้นช่อง gap) */
function rays(k: number, rot = -90, gap = 0.18, len = 1): Seg[] {
  return Array.from({ length: k }, (_, i) => {
    const a = ((rot + (360 * i) / k) * Math.PI) / 180;
    const c = Math.cos(a);
    const s = Math.sin(a);
    return [
      [c * gap, s * gap],
      [c * (gap + len), s * (gap + len)],
    ] as Seg;
  });
}

const sh = (segs: Seg[], dx: number): Seg[] => segs.map((s) => s.map(([x, y]) => [x + dx, y]) as Seg);

/* ---------- ตัวเลข/ตัวอักษรแบบเส้นตรง (หน่วย: กว้าง 1 สูง 2) เว้นช่องตรงจุดต่อกลางเส้นไม่ให้นอนทับกัน ---------- */

const A_: Seg = [[0, 0], [1, 0]];
const D_: Seg = [[0, 2], [1, 2]];
const LF: Seg = [[0, 0], [0, 2]];
const RF: Seg = [[1, 0], [1, 2]];
const UL: Seg = [[0, 0], [0, 1]];
const UR: Seg = [[1, 0], [1, 1]];
const LL: Seg = [[0, 1], [0, 2]];
const LR: Seg = [[1, 1], [1, 2]];
const G_: Seg = [[0, 1], [1, 1]];
const Gin: Seg = [[0.2, 1], [0.8, 1]];

export const GLYPHS: Record<string, Seg[]> = {
  '0': [A_, RF, D_, LF],
  '1': [[[0.5, 0], [0.5, 2]]],
  '2': [A_, UR, G_, LL, D_],
  '3': [A_, RF, Gin, D_],
  '4': [UL, G_, RF],
  '5': [A_, UL, G_, LR, D_],
  '6': [A_, LF, D_, LR, Gin],
  '7': [A_, RF],
  '8': [A_, RF, D_, LF, Gin],
  '9': [A_, UL, Gin, RF],
  A: [[[0, 2], [0.5, 0]], [[0.5, 0], [1, 2]], [[0.32, 1.2], [0.68, 1.2]]],
  B: [LF, [[0, 0], [0.75, 0]], [[0.75, 0], [0.75, 1]], Gin, [[0.85, 1], [1, 2]], D_],
  C: [A_, LF, D_],
  D: [LF, [[0, 0], [1, 0.7]], [[1, 0.7], [1, 1.3]], [[1, 1.3], [0, 2]]],
  E: [A_, LF, Gin, D_],
  F: [A_, LF, Gin],
  G: [A_, LF, D_, LR, [[0.45, 1], [0.9, 1]]],
  H: [LF, RF, Gin],
  I: [[[0.5, 0], [0.5, 2]]],
  J: [RF, D_, [[0, 1.3], [0, 2]]],
  K: [LF, [[1, 0], [0.2, 0.95]], [[0.2, 1.05], [1, 2]]],
  L: [LF, D_],
  M: [LF, [[0, 0], [0.5, 1]], [[0.5, 1], [1, 0]], RF],
  N: [LF, [[0, 0], [1, 2]], RF],
  O: [A_, RF, D_, LF],
  P: [LF, A_, UR, Gin],
  Q: [A_, RF, D_, LF, [[0.65, 1.55], [1.25, 2.3]]],
  R: [LF, A_, UR, Gin, [[0.35, 1.1], [1, 2]]],
  S: [A_, UL, G_, LR, D_],
  T: [[[-0.1, 0], [1.1, 0]], [[0.5, 0.3], [0.5, 2]]],
  U: [LF, D_, RF],
  V: [[[0, 0], [0.48, 2]], [[1, 0], [0.52, 2]]],
  W: [[[0, 0], [0.25, 2]], [[0.25, 2], [0.5, 0.8]], [[0.5, 0.8], [0.75, 2]], [[0.75, 2], [1, 0]]],
  X: rays(4, -45, 0.2, 1).map((s) => s.map(([x, y]) => [x + 0.5, y + 1]) as Seg),
  Y: [[[0, 0], [0.48, 0.9]], [[1, 0], [0.52, 0.9]], [[0.5, 1.15], [0.5, 2]]],
  Z: [A_, [[1, 0], [0, 2]], D_],
};

const glyphLevel = (segs: number) => (segs <= 2 ? 0 : segs <= 4 ? 1 : 2);

/* ---------- วางตำแหน่งเอง (ด้านหน้า หรือด้านบน) ---------- */

type F = [number, number, Pose, string, number?];
const fig = ([x, y, pose, role, r = 0]: F): Fig => ({ x, y, r, pose, role });

function handMission(o: Omit<Mission, 'build' | 'outline' | 'min' | 'max'> & { base: F[]; add?: F[]; line?: [number, number][][] }): Mission {
  const base = o.base.map(fig);
  const add = (o.add || []).map(fig);
  return {
    ...o,
    min: base.length,
    max: base.length + add.length,
    build: (n) => [...base, ...add.slice(0, Math.max(0, n - base.length))],
    outline: () => o.line || [],
  };
}

/** แถวหน้ากระดาน: ท่าสลับกันตามลำดับ (ใช้กับเครื่องจักร/สมมาตร) */
function rowMission(o: Omit<Mission, 'build' | 'outline' | 'view'> & { cycle: [Pose, string][] }): Mission {
  return {
    ...o,
    view: 'front',
    build: (n) => {
      const k = Math.max(o.min, Math.min(o.max, n));
      return Array.from({ length: k }, (_, i) => {
        const [pose, role] = o.cycle[i % o.cycle.length];
        return { x: (i - (k - 1) / 2) * 50, y: 0, r: 0, pose, role };
      });
    },
    outline: () => [],
  };
}

/** วงล้อม: n คนนอนต่อกันเป็นวง (ยิ่งคนมาก ยิ่งกลม) */
function ringFigs(n: number, minR = 0, pose: Pose = 'lieUp', role = 'ส่วนโค้งของวง: นอนราบ ยืดแขนต่อกับเพื่อน'): Fig[] {
  const r = Math.max(minR, (n * SLOT) / (2 * Math.PI), 60);
  return Array.from({ length: n }, (_, i) => {
    const a = (2 * Math.PI * i) / n - Math.PI / 2;
    return { x: Math.cos(a) * r, y: Math.sin(a) * r, r: Math.round((a * 180) / Math.PI), pose, role };
  });
}
const ringLine = (r: number): [number, number][] => Array.from({ length: 41 }, (_, i) => [Math.cos((i / 40) * 2 * Math.PI) * r, Math.sin((i / 40) * 2 * Math.PI) * r]);

const CLOCK_R = 150;

export const MISSIONS: Mission[] = [
  /* ---------------- รูปทรงเรขาคณิต ---------------- */
  handMission({ id: 'g-star1', name: 'ดาวห้าแฉก (คนเดียว)', cat: 'geo', level: 0, view: 'front', keys: ['ดาว', 'star', 'ห้าแฉก'], tip: 'หัว 2 แขน 2 ขา = 5 แฉก', base: [[0, 0, 'star', 'ดาว: กางแขนกางขาให้กว้าง']] }),
  handMission({ id: 'g-tri1', name: 'สามเหลี่ยม (คนเดียว)', cat: 'geo', level: 0, view: 'front', keys: ['สามเหลี่ยม', 'triangle'], tip: 'มือเป็นยอด ขาเป็นฐาน', base: [[0, 0, 'tri', 'สามเหลี่ยม: ประกบมือเหนือหัว กางขา']], line: [[[-18, 36], [0, -50], [18, 36], [-18, 36]]] }),
  handMission({ id: 'g-circ1', name: 'วงกลมด้วยแขน (คนเดียว)', cat: 'geo', level: 0, view: 'front', keys: ['วงกลม', 'circle'], tip: 'โค้งแขนให้กลมเหนือหัว', base: [[0, 0, 'hoop', 'วงกลม: โค้งแขนเป็นวงเหนือหัว']], line: [ringLine(14).map(([x, y]) => [x, y - 36] as [number, number])] }),
  lineMission({ id: 'g-tri', name: 'สามเหลี่ยม', cat: 'geo', level: 0, max: 9, keys: ['สามเหลี่ยม', 'triangle', 'มุม'], tip: 'นอนต่อกันให้ครบ 3 ด้าน', segs: polygon(3), part: ['ด้านที่ 1', 'ด้านที่ 2', 'ด้านที่ 3'] }),
  lineMission({ id: 'g-sq', name: 'สี่เหลี่ยมจัตุรัส', cat: 'geo', level: 1, max: 12, keys: ['สี่เหลี่ยม', 'จัตุรัส', 'square'], tip: 'ทุกด้านยาวเท่ากัน', segs: [[[0, 0], [1, 0]], [[1, 0], [1, 1]], [[1, 1], [0, 1]], [[0, 1], [0, 0]]], part: ['ด้านบน', 'ด้านขวา', 'ด้านล่าง', 'ด้านซ้าย'] }),
  lineMission({ id: 'g-rect', name: 'สี่เหลี่ยมผืนผ้า', cat: 'geo', level: 2, max: 14, keys: ['ผืนผ้า', 'rectangle', 'สี่เหลี่ยม'], tip: 'ด้านยาว 2 คน ด้านสั้น 1 คน', segs: [[[0, 0], [2, 0]], [[2, 0], [2, 1]], [[2, 1], [0, 1]], [[0, 1], [0, 0]]], part: ['ด้านยาวบน', 'ด้านสั้นขวา', 'ด้านยาวล่าง', 'ด้านสั้นซ้าย'] }),
  lineMission({ id: 'g-dia', name: 'สี่เหลี่ยมขนมเปียกปูน', cat: 'geo', level: 1, max: 12, keys: ['ขนมเปียกปูน', 'rhombus', 'สี่เหลี่ยม'], tip: 'นอนเฉียงให้เป็นรูปข้าวหลามตัด', segs: polygon(4) }),
  lineMission({ id: 'g-pent', name: 'ห้าเหลี่ยม', cat: 'geo', level: 1, max: 15, keys: ['ห้าเหลี่ยม', 'pentagon'], tip: 'นับด้านให้ครบ 5 ด้าน', segs: polygon(5) }),
  lineMission({ id: 'g-hex', name: 'หกเหลี่ยม (รังผึ้ง)', cat: 'geo', level: 2, max: 18, keys: ['หกเหลี่ยม', 'hexagon', 'รังผึ้ง'], tip: 'เหมือนช่องรังผึ้ง 6 ด้าน', segs: polygon(6, 0) }),
  {
    id: 'g-ring',
    name: 'วงกลมใหญ่',
    cat: 'geo',
    level: 1,
    min: 6,
    max: 40,
    view: 'top',
    keys: ['วงกลม', 'circle', 'วง'],
    tip: 'ยิ่งคนมาก วงยิ่งกลม (จับมือหรือไม่ก็ได้)',
    build: (n) => ringFigs(Math.max(6, Math.min(40, n))),
    outline: (n) => [ringLine(Math.max((Math.max(6, Math.min(40, n)) * SLOT) / (2 * Math.PI), 60))],
  },
  lineMission({ id: 'g-starT', name: 'ดาวแฉก (ทีม)', cat: 'geo', level: 1, max: 10, keys: ['ดาว', 'star', 'แฉก'], tip: 'หัวหันเข้ากลาง เว้นช่องตรงกลาง ไม่นอนทับกัน', segs: rays(5, -90, 0.3), pose: 'lieUp', part: ['แฉกบน', 'แฉกขวา', 'แฉกขวาล่าง', 'แฉกซ้ายล่าง', 'แฉกซ้าย'] }),
  rowMission({ id: 'g-free', name: 'รูปทรงอิสระ', cat: 'geo', level: 1, min: 2, max: 12, keys: ['รูปทรง', 'shape'], tip: 'ช่วยกันคิดรูปทรงใหม่ แล้วตั้งชื่อให้รูปนั้น', cycle: [['up', 'คิดท่าเอง: ส่วนยอด'], ['out', 'คิดท่าเอง: ส่วนกว้าง'], ['kneel', 'คิดท่าเอง: ส่วนกลาง'], ['sit', 'คิดท่าเอง: ส่วนฐาน']] }),

  /* ---------------- ตัวเลขและตัวอักษร: คนเดียว ---------------- */
  handMission({ id: 'n-I1', name: 'ตัว I (คนเดียว)', cat: 'num', level: 0, view: 'front', keys: ['i'], tip: 'ยืดตัวให้ตรงที่สุด', base: [[0, 0, 'reach', 'ตัว I: ยกแขนตรงขึ้นฟ้า ยืนตัวตรง']] }),
  handMission({ id: 'n-T1', name: 'ตัว T (คนเดียว)', cat: 'num', level: 0, view: 'front', keys: ['t'], tip: 'แขนตรงเป็นเส้นบนของตัว T', base: [[0, 0, 'out', 'ตัว T: กางแขนออกข้างตรงๆ']], line: [[[-30, -12], [30, -12]], [[0, -12], [0, 34]]] }),
  handMission({ id: 'n-Y1', name: 'ตัว Y (คนเดียว)', cat: 'num', level: 0, view: 'front', keys: ['y'], tip: 'ชูแขนเป็นตัว V บนตัวตรง', base: [[0, 0, 'up', 'ตัว Y: ชูแขนเป็นตัว V']] }),
  handMission({ id: 'n-X1', name: 'ตัว X (คนเดียว)', cat: 'num', level: 0, view: 'front', keys: ['x'], tip: 'แขนขากางเฉียงเป็นกากบาท', base: [[0, 0, 'star', 'ตัว X: กางแขนกางขาเฉียง']] }),
  handMission({ id: 'n-1s', name: 'เลข 1 (คนเดียว)', cat: 'num', level: 0, view: 'front', keys: ['1', 'หนึ่ง', 'one'], tip: 'ยืนตรง ยกแขนแนบหู', base: [[0, 0, 'reach', 'เลข 1: ยืนตรง ยกแขนตรงขึ้น']] }),
  handMission({ id: 'n-plus1', name: 'เครื่องหมายบวก (คนเดียว)', cat: 'num', level: 0, view: 'front', keys: ['บวก', '+', 'plus', 'เพิ่ม'], tip: 'ตัวเป็นเส้นตั้ง แขนเป็นเส้นนอน', base: [[0, 0, 'out', 'บวก: ยืนตรง กางแขนออกข้าง']], line: [[[-30, -12], [30, -12]], [[0, -40], [0, 34]]] }),
  handMission({ id: 'n-times1', name: 'เครื่องหมายคูณ (คนเดียว)', cat: 'num', level: 0, view: 'front', keys: ['คูณ', '×', 'times'], tip: 'แขนขาเฉียงเป็นกากบาท', base: [[0, 0, 'star', 'คูณ: กางแขนกางขาเฉียง']] }),
  /* ---------------- ตัวเลขและตัวอักษร: ทีม (นอนบนพื้น) ---------------- */
  ...Object.entries(GLYPHS).map(([g, segs]) =>
    lineMission({
      id: `n-${g}`,
      name: /\d/.test(g) ? `เลข ${g}` : `ตัวอักษร ${g}`,
      cat: 'num',
      level: glyphLevel(segs.length),
      max: segs.length * 3,
      keys: [g.toLowerCase()],
      tip: segs.length === 1 ? 'นอนเรียงต่อกันเป็นเส้นตรง' : 'นอนให้ปลายเส้นชนกันพอดี ไม่นอนทับเพื่อน',
      segs,
    })
  ),
  ...['10', '11', '12', '17', '20'].map((num) => {
    const segs = [...GLYPHS[num[0]], ...sh(GLYPHS[num[1]], 1.7)];
    return lineMission({ id: `n-${num}`, name: `เลขสองหลัก ${num}`, cat: 'num', level: segs.length <= 4 ? 1 : 2, max: segs.length * 3, keys: [num], tip: 'แบ่งกลุ่มละหลัก หลักสิบอยู่ซ้าย หลักหน่วยอยู่ขวา', segs });
  }),
  lineMission({ id: 'n-plus', name: 'เครื่องหมายบวก (ทีม)', cat: 'num', level: 1, max: 8, keys: ['บวก', '+', 'plus', 'เพิ่ม'], tip: 'หัวหันเข้ากลาง เว้นช่องตรงกลาง', segs: rays(4, -90, 0.2), part: ['แขนบน', 'แขนขวา', 'แขนล่าง', 'แขนซ้าย'] }),
  lineMission({ id: 'n-times', name: 'เครื่องหมายคูณ (ทีม)', cat: 'num', level: 1, max: 8, keys: ['คูณ', '×', 'times'], tip: 'นอนเฉียงหัวเข้ากลาง ไม่นอนไขว้ทับกัน', segs: rays(4, -45, 0.2) }),
  lineMission({ id: 'n-minus', name: 'เครื่องหมายลบ', cat: 'num', level: 0, max: 4, keys: ['ลบ', '-', 'minus', 'ลด'], tip: 'นอนเรียงเป็นเส้นนอนเส้นเดียว', segs: [[[0, 0], [1, 0]]] }),
  lineMission({ id: 'n-eq', name: 'เครื่องหมายเท่ากับ', cat: 'num', level: 0, max: 6, keys: ['เท่ากับ', '=', 'equal', 'เท่ากัน'], tip: 'สองเส้นขนานกัน ห่างกันเล็กน้อย', segs: [[[0, 0], [1, 0]], [[0, 0.9], [1, 0.9]]], part: ['เส้นบน', 'เส้นล่าง'] }),
  handMission({
    id: 'n-div',
    name: 'เครื่องหมายหาร',
    cat: 'num',
    level: 1,
    view: 'top',
    keys: ['หาร', '÷', 'divide', 'แบ่ง'],
    tip: 'คนนั่งกอดเข่าเป็นจุด อยู่บนและล่างเส้น',
    base: [[0, 0, 'lie', 'เส้นกลาง: นอนราบแนวนอน', -90], [0, -80, 'curl', 'จุดบน: นั่งกอดเข่า'], [0, 80, 'curl', 'จุดล่าง: นั่งกอดเข่า']],
    add: [[-72, 0, 'lie', 'ต่อเส้นกลางฝั่งซ้าย', -90], [72, 0, 'lie', 'ต่อเส้นกลางฝั่งขวา', -90]],
  }),

  /* ---------------- สร้างสิ่งของ ---------------- */
  handMission({ id: 'o-tree1', name: 'ต้นไม้ (คนเดียว)', cat: 'obj', level: 0, view: 'front', keys: ['ต้นไม้', 'tree', 'พืช'], tip: 'ลำตัวเป็นลำต้น แขนเป็นกิ่ง', base: [[0, 0, 'up', 'ต้นไม้: ยืนตรง ชูแขนเป็นกิ่ง']] }),
  handMission({ id: 'o-plane1', name: 'เครื่องบิน (คนเดียว)', cat: 'obj', level: 0, view: 'front', keys: ['เครื่องบิน', 'plane', 'บิน'], tip: 'แขนเป็นปีก เอียงตัวนิดเดียว', base: [[0, 0, 'out', 'เครื่องบิน: กางแขนเป็นปีก เอียงตัวเล็กน้อย', -8]] }),
  handMission({ id: 'o-clock1', name: 'นาฬิกาบอก 3 โมง (คนเดียว)', cat: 'obj', level: 0, view: 'front', keys: ['นาฬิกา', 'clock', 'เวลา'], tip: 'แขนเป็นเข็มยาวกับเข็มสั้น', base: [[0, 0, 'angle', 'เข็มนาฬิกา: แขนหนึ่งชูขึ้น แขนหนึ่งกางออก']], line: [ringLine(44).map(([x, y]) => [x, y - 12] as [number, number])] }),
  handMission({
    id: 'o-tree',
    name: 'ต้นไม้ใหญ่',
    cat: 'obj',
    level: 0,
    view: 'front',
    keys: ['ต้นไม้', 'tree', 'พืช', 'ป่า'],
    tip: 'คนกลางเป็นลำต้น คนข้างเป็นกิ่งใบ',
    base: [[0, 0, 'reach', 'ลำต้น: ยืนตรงกลาง ยกแขนตรงขึ้น'], [-48, 0, 'up', 'กิ่งซ้าย: ชูแขนเป็นตัว V', -10], [48, 0, 'up', 'กิ่งขวา: ชูแขนเป็นตัว V', 10]],
    add: [[-96, 0, 'curl', 'พุ่มไม้ซ้าย: นั่งกอดเข่า'], [96, 0, 'curl', 'ผลไม้หล่น: นั่งกอดเข่า']],
  }),
  handMission({
    id: 'o-house',
    name: 'บ้าน',
    cat: 'obj',
    level: 1,
    view: 'front',
    keys: ['บ้าน', 'house', 'home', 'ที่อยู่อาศัย'],
    tip: 'มือสองคนบนหลังคาจะแตะกันหรือไม่ก็ได้',
    base: [[-42, 0, 'reach', 'หลังคาซ้าย: เอนตัวเข้ากลาง ยกแขนขึ้น', 14], [42, 0, 'reach', 'หลังคาขวา: เอนตัวเข้ากลาง ยกแขนขึ้น', -14], [0, 0, 'stand', 'ประตูบ้าน: ยืนตรงกลาง แขนแนบตัว']],
    add: [[-92, 0, 'right', 'ผนังซ้าย: ยืนตรง กางแขนเข้าหาบ้าน'], [92, 0, 'left', 'ผนังขวา: ยืนตรง กางแขนเข้าหาบ้าน']],
    line: [[[-110, -4], [0, -78], [110, -4]], [[-100, -4], [-100, 34], [100, 34], [100, -4]]],
  }),
  handMission({
    id: 'o-car',
    name: 'รถยนต์',
    cat: 'obj',
    level: 1,
    view: 'front',
    keys: ['รถ', 'car', 'ยานพาหนะ', 'ล้อ'],
    tip: 'ล้อนั่งกอดเข่า ตัวรถยืนกางแขน',
    base: [[-52, 0, 'curl', 'ล้อหน้า: นั่งกอดเข่าเป็นวงกลม'], [52, 0, 'curl', 'ล้อหลัง: นั่งกอดเข่าเป็นวงกลม'], [0, 0, 'out', 'หลังคารถ: ยืนกลาง กางแขน']],
    add: [[-100, 0, 'left', 'ไฟหน้า: ยื่นแขนไปข้างหน้า'], [100, 0, 'wave', 'คนขับ: โบกมือทักทาย']],
    line: [[[-110, 34], [-110, 4], [-60, 4], [-34, -30], [34, -30], [60, 4], [110, 4], [110, 34]]],
  }),
  handMission({
    id: 'o-plane',
    name: 'เครื่องบินลำใหญ่',
    cat: 'obj',
    level: 1,
    view: 'top',
    keys: ['เครื่องบิน', 'plane', 'บิน', 'สนามบิน'],
    tip: 'ปีกหันหัวเข้าหาลำตัว เว้นช่องไม่นอนทับ',
    base: [[0, 0, 'lieUp', 'ลำตัวเครื่องบิน: นอนราบ ยืดแขนเป็นหัวเครื่อง', 180], [-80, -6, 'lieUp', 'ปีกซ้าย: นอนแนวนอน หัวหันเข้าลำตัว', 90], [80, -6, 'lieUp', 'ปีกขวา: นอนแนวนอน หัวหันเข้าลำตัว', -90]],
    add: [[-44, 78, 'lie', 'หางซ้าย: นอนเฉียง', 60], [44, 78, 'lie', 'หางขวา: นอนเฉียง', -60], [-152, -6, 'lieUp', 'ปลายปีกซ้าย', 90], [152, -6, 'lieUp', 'ปลายปีกขวา', -90]],
  }),
  handMission({
    id: 'o-bridge',
    name: 'สะพาน',
    cat: 'obj',
    level: 1,
    view: 'front',
    keys: ['สะพาน', 'bridge', 'ข้าม'],
    tip: 'ไม่ปีน ไม่พาดตัวบนเพื่อน ใช้แขนทำเป็นโค้งสะพาน',
    base: [[-62, 0, 'reach', 'เสาซ้าย: ยืนมั่นคง เอนตัวเข้ากลาง ยกแขนเป็นโค้ง', 14], [62, 0, 'reach', 'เสาขวา: ยืนมั่นคง เอนตัวเข้ากลาง ยกแขนเป็นโค้ง', -14]],
    add: [[0, 0, 'out', 'พื้นสะพาน: ยืนกลาง กางแขนเป็นทางเดิน'], [-124, 0, 'wing', 'แม่น้ำซ้าย: ยืนโบกแขนเป็นคลื่น'], [124, 0, 'wing', 'แม่น้ำขวา: ยืนโบกแขนเป็นคลื่น'], [-174, 0, 'wave', 'คนเดินข้ามสะพาน: โบกมือ']],
    line: [[[-80, 34], [-72, -14], [-38, -50], [0, -58], [38, -50], [72, -14], [80, 34]]],
  }),
  handMission({
    id: 'o-tower',
    name: 'หอคอย',
    cat: 'obj',
    level: 2,
    view: 'front',
    keys: ['หอคอย', 'tower', 'ตึก', 'สูง'],
    tip: 'สูงต่ำด้วยท่ายืน คุกเข่า นั่ง ไม่ซ้อนตัวกัน',
    base: [[0, 0, 'reach', 'ยอดหอคอย: ยืนกลาง ยกแขนตรงขึ้น'], [-46, 0, 'kneel', 'ชั้นกลางซ้าย: คุกเข่า ชูแขน'], [46, 0, 'kneel', 'ชั้นกลางขวา: คุกเข่า ชูแขน']],
    add: [[-92, 0, 'curl', 'ฐานซ้าย: นั่งกอดเข่า'], [92, 0, 'curl', 'ฐานขวา: นั่งกอดเข่า']],
    line: [[[-116, 34], [-60, -20], [0, -64], [60, -20], [116, 34]]],
  }),
  handMission({
    id: 'o-boat',
    name: 'เรือใบ',
    cat: 'obj',
    level: 1,
    view: 'front',
    keys: ['เรือ', 'boat', 'ship', 'ทะเล', 'น้ำ'],
    tip: 'คนกลางเป็นเสากระโดง คนข้างนั่งเป็นลำเรือ',
    base: [[0, 0, 'reach', 'เสากระโดง: ยืนตรงกลาง ยกแขนขึ้น'], [-48, 0, 'sit', 'หัวเรือ: นั่งขัดสมาธิ'], [48, 0, 'sit', 'ท้ายเรือ: นั่งขัดสมาธิ']],
    add: [[96, 0, 'left', 'ใบเรือ: ยืน กางแขนเข้าหาเสา'], [-96, 0, 'wing', 'คลื่นทะเล: โบกแขน']],
    line: [[[-80, 22], [80, 22], [56, 40], [-56, 40], [-80, 22]]],
  }),
  {
    id: 'o-clock',
    name: 'นาฬิกาใหญ่',
    cat: 'obj',
    level: 2,
    min: 6,
    max: 16,
    view: 'top',
    keys: ['นาฬิกา', 'clock', 'เวลา', 'ชั่วโมง', 'นาที'],
    tip: 'เข็มยาวกับเข็มสั้นหัวหันเข้ากลาง ไม่นอนทับกัน',
    build: (n) => {
      const k = Math.max(6, Math.min(16, n));
      return [
        { x: 0, y: -44, r: 180, pose: 'lieUp', role: 'เข็มยาว: นอนชี้เลข 12' },
        { x: 42, y: 0, r: 90, pose: 'lie', role: 'เข็มสั้น: นอนชี้เลข 3' },
        ...ringFigs(k - 2, CLOCK_R, 'lie', 'ขอบนาฬิกา: นอนต่อกันเป็นวง'),
      ];
    },
    outline: () => [ringLine(CLOCK_R)],
  },

  /* ---------------- สร้างสัตว์ ---------------- */
  handMission({ id: 'a-bird1', name: 'นก (คนเดียว)', cat: 'ani', level: 0, view: 'front', keys: ['นก', 'bird', 'บิน', 'ปีก'], tip: 'โบกแขนช้าๆ เหมือนกระพือปีก', base: [[0, 0, 'wing', 'นก: กางแขนโบกเป็นปีก']] }),
  handMission({ id: 'a-cat1', name: 'แมว (คนเดียว)', cat: 'ani', level: 0, view: 'front', keys: ['แมว', 'cat'], tip: 'มือแตะหัวเป็นหูแมว', base: [[0, 0, 'ears', 'แมว: มือแตะหัวเป็นหู']] }),
  handMission({ id: 'a-ele1', name: 'ช้าง (คนเดียว)', cat: 'ani', level: 0, view: 'front', keys: ['ช้าง', 'elephant'], tip: 'แขนหนึ่งเป็นงวง แขนหนึ่งเป็นหู', base: [[0, 0, 'trunk', 'ช้าง: ห้อยแขนแกว่งเป็นงวง']] }),
  handMission({ id: 'a-bfly1', name: 'ผีเสื้อ (คนเดียว)', cat: 'ani', level: 0, view: 'front', keys: ['ผีเสื้อ', 'butterfly', 'แมลง'], tip: 'ชูแขนและกางขาเป็นปีก 4 ข้าง', base: [[0, 0, 'star', 'ผีเสื้อ: กางแขนกางขาเป็นปีก']] }),
  handMission({
    id: 'a-cat',
    name: 'แมวนั่ง',
    cat: 'ani',
    level: 0,
    view: 'front',
    keys: ['แมว', 'cat'],
    tip: 'หัวแมวยืน ตัวแมวนั่ง',
    base: [[-26, 0, 'ears', 'หัวแมว: มือแตะหัวเป็นหู'], [26, 0, 'sit', 'ตัวแมว: นั่งขัดสมาธิ']],
    add: [[76, 0, 'wave', 'หางแมว: โบกแขนช้าๆ']],
  }),
  handMission({
    id: 'a-dog',
    name: 'สุนัข',
    cat: 'ani',
    level: 1,
    view: 'front',
    keys: ['สุนัข', 'หมา', 'dog'],
    tip: 'คุกเข่าได้ ไม่ต้องคลาน',
    base: [[-28, 0, 'ears', 'หัวสุนัข: มือแตะหัวเป็นหูตั้ง'], [28, 0, 'kneel', 'ตัวสุนัข: คุกเข่า ชูแขน']],
    add: [[80, 0, 'wave', 'หางสุนัข: ส่ายแขนไปมา'], [-80, 0, 'curl', 'กระดูกของเล่น: นั่งกอดเข่า']],
  }),
  handMission({
    id: 'a-ele',
    name: 'ช้างตัวใหญ่',
    cat: 'ani',
    level: 1,
    view: 'front',
    keys: ['ช้าง', 'elephant'],
    tip: 'คนหน้าทำงวง คนข้างทำหูใหญ่',
    base: [[0, 0, 'trunk', 'งวงช้าง: ห้อยแขนแกว่งด้านหน้า'], [-48, 0, 'wing', 'หูซ้าย: กางแขนโบก'], [48, 0, 'wing', 'หูขวา: กางแขนโบก']],
    add: [[96, 0, 'right', 'หางช้าง: กางแขนข้างเดียว'], [-96, 0, 'curl', 'ลูกช้าง: นั่งกอดเข่า']],
  }),
  lineMission({ id: 'a-fish', name: 'ปลา', cat: 'ani', level: 1, max: 9, keys: ['ปลา', 'fish', 'ทะเล', 'น้ำ'], tip: 'ตัวปลานอนแนวนอน หางเป็นรูปตัว V', segs: [[[-1, 0], [0.25, 0]], [[0.45, -0.08], [1.1, -0.6]], [[0.45, 0.08], [1.1, 0.6]]], part: ['ตัวปลา', 'หางบน', 'หางล่าง'] }),
  handMission({
    id: 'a-bfly',
    name: 'ผีเสื้อคู่',
    cat: 'ani',
    level: 1,
    view: 'front',
    keys: ['ผีเสื้อ', 'butterfly', 'แมลง'],
    tip: 'ยืนหันหลังชนกันได้ ไม่ต้องจับกัน',
    base: [[-24, 0, 'up', 'ปีกซ้ายบน: ชูแขนเป็นตัว V', -10], [24, 0, 'up', 'ปีกขวาบน: ชูแขนเป็นตัว V', 10]],
    add: [[-72, 0, 'curl', 'ปีกซ้ายล่าง: นั่งกอดเข่า'], [72, 0, 'curl', 'ปีกขวาล่าง: นั่งกอดเข่า']],
  }),
  handMission({
    id: 'a-bird',
    name: 'ฝูงนก',
    cat: 'ani',
    level: 0,
    view: 'front',
    keys: ['นก', 'bird', 'บิน', 'ปีก'],
    tip: 'บินเป็นรูปตัว V ตามหัวหน้าฝูง',
    base: [[0, 0, 'wing', 'หัวหน้าฝูง: กางแขนโบก'], [-50, 0, 'wing', 'นกซ้าย: โบกแขนตาม'], [50, 0, 'wing', 'นกขวา: โบกแขนตาม']],
    add: [[-100, 0, 'wing', 'นกท้ายซ้าย'], [100, 0, 'wing', 'นกท้ายขวา']],
  }),
  handMission({
    id: 'a-dino',
    name: 'ไดโนเสาร์คอยาว',
    cat: 'ani',
    level: 2,
    view: 'front',
    keys: ['ไดโนเสาร์', 'dinosaur', 'ดึกดำบรรพ์'],
    tip: 'สูงจากหัวไล่ต่ำลงไปถึงหาง',
    base: [[-60, 0, 'reach', 'หัวและคอ: ยกแขนตรงขึ้น เอนตัวเล็กน้อย', -10], [-12, 0, 'stand', 'ลำตัว: ยืนตรง'], [36, 0, 'kneel', 'หลัง: คุกเข่า ชูแขน']],
    add: [[84, 0, 'sit', 'โคนหาง: นั่งขัดสมาธิ'], [132, 0, 'curl', 'ปลายหาง: นั่งกอดเข่า'], [-110, 0, 'curl', 'ไข่ไดโนเสาร์: นั่งกอดเข่า']],
    line: [[[-70, -40], [-40, -30], [0, -10], [60, 8], [150, 30]]],
  }),

  /* ---------------- สร้างสรรค์อิสระ ---------------- */
  handMission({ id: 'c-robot1', name: 'หุ่นยนต์ (คนเดียว)', cat: 'cre', level: 0, view: 'front', keys: ['หุ่นยนต์', 'robot', 'เครื่องจักร'], tip: 'ขยับแขนทีละจังหวะแบบหุ่นยนต์', base: [[0, 0, 'robot', 'หุ่นยนต์: งอศอกตั้งฉาก']] }),
  handMission({ id: 'c-rocket1', name: 'จรวด (คนเดียว)', cat: 'cre', level: 0, view: 'front', keys: ['จรวด', 'rocket', 'อวกาศ'], tip: 'มือประกบเป็นหัวจรวด', base: [[0, 0, 'peak', 'จรวด: ประกบมือเหนือหัว']] }),
  handMission({
    id: 'c-robot',
    name: 'หุ่นยนต์ยักษ์',
    cat: 'cre',
    level: 1,
    view: 'front',
    keys: ['หุ่นยนต์', 'robot', 'เครื่องจักร'],
    tip: 'ทุกคนขยับพร้อมกันเป็นจังหวะ',
    base: [[0, 0, 'robot', 'หัวและตัวหุ่นยนต์: งอศอกตั้งฉาก'], [-48, 0, 'left', 'แขนซ้ายหุ่นยนต์: กางแขนออก'], [48, 0, 'right', 'แขนขวาหุ่นยนต์: กางแขนออก']],
    add: [[-96, 0, 'kneel', 'ขาซ้าย: คุกเข่า ชูแขน'], [96, 0, 'kneel', 'ขาขวา: คุกเข่า ชูแขน']],
  }),
  handMission({
    id: 'c-ship',
    name: 'ยานอวกาศ',
    cat: 'cre',
    level: 1,
    view: 'front',
    keys: ['ยาน', 'อวกาศ', 'จรวด', 'rocket', 'space'],
    tip: 'คนกลางเป็นหัวยาน คนข้างเป็นปีก',
    base: [[0, 0, 'peak', 'หัวยาน: ประกบมือเหนือหัว'], [-48, 0, 'left', 'ปีกซ้าย: กางแขนออก', -8], [48, 0, 'right', 'ปีกขวา: กางแขนออก', 8]],
    add: [[-96, 0, 'curl', 'ไฟเครื่องยนต์ซ้าย: นั่งกอดเข่า'], [96, 0, 'curl', 'ไฟเครื่องยนต์ขวา: นั่งกอดเข่า']],
  }),
  rowMission({
    id: 'c-solar',
    name: 'ดวงอาทิตย์และระบบสุริยะ',
    cat: 'cre',
    level: 1,
    min: 3,
    max: 9,
    keys: ['ระบบสุริยะ', 'ดาวเคราะห์', 'ดวงอาทิตย์', 'planet', 'โลก', 'อวกาศ'],
    tip: 'ดวงอาทิตย์อยู่กลาง ดาวเคราะห์ค่อยๆ เดินวนรอบ',
    cycle: [['hoop', 'ดาวเคราะห์: โค้งแขนเป็นวงกลม'], ['star', 'ดวงอาทิตย์: กางแขนกางขาเป็นแสง'], ['curl', 'ดาวเคราะห์ดวงเล็ก: นั่งกอดเข่า']],
  }),
  rowMission({ id: 'c-machine', name: 'เครื่องจักรมหัศจรรย์', cat: 'cre', level: 1, min: 2, max: 8, keys: ['เครื่องจักร', 'machine', 'หุ่นยนต์', 'พลังงาน'], tip: 'แต่ละคนทำท่าซ้ำเป็นจังหวะต่อกัน', cycle: [['robot', 'เฟืองหมุน: งอศอกขยับขึ้นลง'], ['wave', 'คันโยก: โบกแขนขึ้นลง'], ['kneel', 'ลูกสูบ: คุกเข่า ชูแขนขึ้นลง'], ['out', 'สายพาน: กางแขนหมุนช้าๆ']] }),
  rowMission({ id: 'c-creature', name: 'สิ่งมีชีวิตในจินตนาการ', cat: 'cre', level: 2, min: 2, max: 6, keys: ['สิ่งมีชีวิต', 'จินตนาการ', 'สัตว์ประหลาด'], tip: 'ตั้งชื่อสัตว์ใหม่ แล้วบอกว่ามันกินอะไร', cycle: [['ears', 'หัว: มือแตะหัวเป็นหู'], ['wing', 'ปีก: กางแขนโบก'], ['trunk', 'งวง: ห้อยแขนแกว่ง'], ['star', 'หนามบนหลัง: กางแขนกางขา'], ['curl', 'หาง: นั่งกอดเข่า']] }),

  /* ---------------- แนวคิดจากบทเรียน ---------------- */
  handMission({ id: 'k-angle1', name: 'มุมฉาก (คนเดียว)', cat: 'con', level: 0, view: 'front', keys: ['มุมฉาก', 'มุม', '90', 'องศา', 'angle'], tip: 'แขนสองข้างทำมุม 90 องศา', base: [[0, 0, 'angle', 'มุมฉาก: แขนหนึ่งชูขึ้น แขนหนึ่งกางออก']], line: [[[0, -46], [0, -11], [34, -11]]] }),
  handMission({ id: 'k-grow', name: 'ต้นไม้เจริญเติบโต', cat: 'con', level: 0, view: 'front', keys: ['พืช', 'เมล็ด', 'เจริญเติบโต', 'ต้นกล้า', 'ต้นไม้'], tip: 'ไล่จากเมล็ด ต้นกล้า จนเป็นต้นไม้', base: [[-50, 0, 'curl', 'เมล็ด: นั่งกอดเข่า'], [0, 0, 'kneel', 'ต้นกล้า: คุกเข่า ชูแขน'], [50, 0, 'up', 'ต้นไม้โต: ยืนชูแขนเป็นกิ่ง']] }),
  handMission({
    id: 'k-water',
    name: 'วัฏจักรน้ำ',
    cat: 'con',
    level: 1,
    view: 'front',
    keys: ['น้ำ', 'ระเหย', 'ฝน', 'เมฆ', 'วัฏจักร', 'ไอน้ำ', 'ควบแน่น'],
    tip: 'เรียงตามลำดับ แล้วเล่าเรื่องการเดินทางของน้ำ',
    base: [[-75, 0, 'star', 'ดวงอาทิตย์: กางแขนกางขาเป็นแสง'], [-25, 0, 'up', 'ไอน้ำระเหย: ชูแขนลอยขึ้น'], [25, 0, 'hoop', 'เมฆ: โค้งแขนเป็นก้อนเมฆ'], [75, 0, 'rain', 'ฝนตก: แขนพลิ้วลงเป็นสายฝน']],
    add: [[125, 0, 'curl', 'แหล่งน้ำ: นั่งกอดเข่า'], [-125, 0, 'sit', 'ทะเล: นั่งขัดสมาธิ']],
  }),
  handMission({
    id: 'k-food',
    name: 'ห่วงโซ่อาหาร',
    cat: 'con',
    level: 1,
    view: 'front',
    keys: ['ห่วงโซ่', 'อาหาร', 'ผู้ผลิต', 'ผู้บริโภค', 'สัตว์กินพืช'],
    tip: 'เรียงจากผู้ผลิตไปผู้บริโภค',
    base: [[-50, 0, 'up', 'พืช (ผู้ผลิต): ชูแขนเป็นกิ่ง'], [0, 0, 'ears', 'กระต่าย (กินพืช): มือแตะหัวเป็นหู'], [50, 0, 'robot', 'เสือ (กินสัตว์): ยกแขนทำกรงเล็บ']],
    add: [[100, 0, 'curl', 'ผู้ย่อยสลาย: นั่งกอดเข่า'], [-100, 0, 'star', 'ดวงอาทิตย์: กางแขนกางขา']],
  }),
  handMission({
    id: 'k-day',
    name: 'กลางวันและกลางคืน',
    cat: 'con',
    level: 1,
    view: 'front',
    keys: ['กลางวัน', 'กลางคืน', 'โลก', 'หมุน', 'ดวงอาทิตย์', 'ดวงจันทร์'],
    tip: 'โลกหมุนรอบตัวเองช้าๆ ฝั่งที่หันหาดวงอาทิตย์คือกลางวัน',
    base: [[-60, 0, 'star', 'ดวงอาทิตย์: กางแขนกางขา'], [20, 0, 'hoop', 'โลก: โค้งแขนเป็นวง หมุนตัวช้าๆ']],
    add: [[80, 0, 'curl', 'ดวงจันทร์: นั่งกอดเข่า']],
  }),
  rowMission({ id: 'k-sym', name: 'สมมาตร (กระจกเงา)', cat: 'con', level: 1, min: 2, max: 8, keys: ['สมมาตร', 'กระจก', 'symmetry', 'เท่ากัน'], tip: 'จับคู่กัน คนขวาทำท่าเหมือนเงาในกระจกของคนซ้าย', cycle: [['left', 'ต้นแบบ: กางแขนซ้าย'], ['right', 'เงากระจก: กางแขนขวาให้ตรงกัน']] }),
  lineMission({ id: 'k-par', name: 'เส้นขนาน', cat: 'con', level: 0, max: 8, keys: ['ขนาน', 'parallel', 'เส้นตรง'], tip: 'สองเส้นห่างเท่ากันตลอดแนว', segs: [[[0, 0], [1, 0]], [[0, 1], [1, 1]]], part: ['เส้นบน', 'เส้นล่าง'] }),
  lineMission({ id: 'k-right', name: 'มุมฉาก (ทีม)', cat: 'con', level: 0, max: 6, keys: ['มุมฉาก', 'มุม', '90', 'องศา', 'angle'], tip: 'เส้นตั้งกับเส้นนอนชนกันพอดี', segs: [LF, D_], part: ['แขนมุมเส้นตั้ง', 'แขนมุมเส้นนอน'] }),
];

export const missionById = (id: string) => MISSIONS.find((m) => m.id === id);

/* ------------------------------ เลือกภารกิจให้พอดีกับจำนวนคน ------------------------------ */

export const fits = (m: Mission, n: number) => m.min <= n;
/** จำนวนคนที่ภาพสาธิตใช้จริง */
export const useCount = (m: Mission, n: number, want?: number) => Math.max(m.min, Math.min(m.max, n, want ?? n));

export function missionPool(n: number, cats: number) {
  const mask = cats & ALL_CATS || ALL_CATS;
  return MISSIONS.filter((m) => fits(m, n) && mask & catBit(m.cat) && !m.id.startsWith('ans-'));
}

/** สุ่มภารกิจ: ระดับที่เลือกก่อน ถ้าไม่มีลดระดับลง ถ้ายังไม่มีเอาทุกหมวด (ไม่มีวันเกินจำนวนคน) */
export function pickMission(n: number, cats: number, level: number, rnd: () => number = Math.random, avoid: string[] = []): Mission {
  const people = Math.max(1, Math.floor(n) || 1);
  const pools = [missionPool(people, cats), missionPool(people, ALL_CATS)];
  // ทีมหลายคน: ใช้ภารกิจกลุ่มที่ทุกคนได้ร่วมก่อน แล้วค่อยภารกิจกลุ่มทั่วไป ท่าคนเดียวเป็นทางสุดท้าย
  const tiers: ((m: Mission) => boolean)[] = people >= 2 ? [(m) => m.min >= 2 && m.max >= people, (m) => m.min >= 2, () => true] : [() => true];
  for (const pool of pools) {
    for (let lv = level; lv >= 0; lv--)
      for (const tier of tiers) {
        const atLv = pool.filter((m) => m.level === lv && tier(m));
        const fresh = atLv.filter((m) => !avoid.includes(m.id));
        const list = fresh.length ? fresh : atLv;
        if (list.length) return list[Math.floor(rnd() * list.length) % list.length];
      }
    const any = pool.filter((m) => !avoid.includes(m.id));
    if (any.length) return any[Math.floor(rnd() * any.length) % any.length];
    if (pool.length) return pool[0];
  }
  return MISSIONS[0];
}

/** รูปแบบ C: หาภารกิจที่เชื่อมกับคำถาม (คำสำคัญในโจทย์/เฉลย) ไม่เจอ = หมวดแนวคิด */
export function missionForText(text: string, answer: string, n: number, cats: number, level: number, rnd: () => number = Math.random): Mission {
  const t = `${text} ${answer}`.toLowerCase();
  const pool = missionPool(n, ALL_CATS);
  const scored = pool
    .map((m) => ({ m, s: m.keys.filter((k) => (k.length === 1 ? false : t.includes(k.toLowerCase()))).length }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s);
  if (scored.length) {
    const top = scored.filter((x) => x.s === scored[0].s);
    const lv = top.filter((x) => x.m.level <= level);
    const byLv = lv.length ? lv : top;
    // ทีมหลายคน: เลือกแบบกลุ่มก่อน (เช่น ช้างตัวใหญ่ แทน ช้างคนเดียว)
    const group = n >= 2 ? byLv.filter((x) => x.m.min >= 2) : [];
    const list = group.length ? group : byLv;
    return list[Math.floor(rnd() * list.length) % list.length].m;
  }
  // เฉลยเป็นตัวเลข/ตัวอักษรตัวเดียว: สร้างตัวนั้นเลย
  const one = answer.trim().toUpperCase();
  if (/^[0-9A-Z]$/.test(one)) {
    const g = pool.find((m) => m.id === `n-${one}`) || pool.find((m) => m.keys.includes(one.toLowerCase()) && m.view === 'front');
    if (g) return g;
  }
  return pickMission(n, catBit('con'), level, rnd);
}

/* ------------------------------ รูปแบบ B: ตอบด้วยร่างกาย ------------------------------ */

/** ท่ารหัสคำตอบ (คนเดียวก็ทำได้) ตัวเลือกที่ 1..6 */
export const ANSWER_POSES: { pose: Pose; name: string }[] = [
  { pose: 'reach', name: 'เลข 1: ยกแขนตรงขึ้น' },
  { pose: 'out', name: 'ตัว T: กางแขนออกข้าง' },
  { pose: 'ears', name: 'มือแตะหัว' },
  { pose: 'star', name: 'ดาว: กางแขนกางขา' },
  { pose: 'angle', name: 'มุมฉาก: แขนขึ้นหนึ่ง กางหนึ่ง' },
  { pose: 'peak', name: 'จรวด: ประกบมือเหนือหัว' },
];

/** ภารกิจแทนตัวเลือกที่ i (0-based): ทีมใหญ่พอ = นอนเป็นตัวเลข, ไม่พอ = ท่ารหัส */
export function answerMissions(choices: number, n: number): Mission[] {
  const k = Math.max(1, Math.min(6, choices));
  const digits = Array.from({ length: k }, (_, i) => missionById(`n-${i + 1}`)!);
  if (n >= Math.max(...digits.map((d) => d.min))) return digits;
  return ANSWER_POSES.slice(0, k).map((a, i) => ({
    id: `ans-${i + 1}`,
    name: `คำตอบที่ ${i + 1}`,
    cat: 'num' as Cat,
    level: 0,
    min: 1,
    max: 6,
    view: 'front' as const,
    keys: [],
    tip: 'ทุกคนในทีมทำท่าเดียวกันพร้อมกัน',
    build: (m: number) => {
      const c = Math.max(1, Math.min(6, m));
      return Array.from({ length: c }, (_, j) => ({ x: (j - (c - 1) / 2) * 50, y: 0, r: 0, pose: a.pose, role: a.name }));
    },
    outline: () => [],
  }));
}

/* ------------------------------ ความปลอดภัย (ใช้ทั้งในเกมและ selftest) ------------------------------ */

const HALF = 28;
/** แกนลำตัว (หัวถึงเท้า) ของเด็กที่นอน */
export function bodyAxis(f: Fig): [[number, number], [number, number]] {
  const a = (f.r * Math.PI) / 180;
  const dx = -Math.sin(a) * HALF;
  const dy = Math.cos(a) * HALF;
  return [
    [f.x - dx, f.y - dy],
    [f.x + dx, f.y + dy],
  ];
}

function cross(p: [number, number], q: [number, number], r: [number, number]) {
  return (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
}
export function segmentsCross(a: [[number, number], [number, number]], b: [[number, number], [number, number]]) {
  const d1 = cross(b[0], b[1], a[0]);
  const d2 = cross(b[0], b[1], a[1]);
  const d3 = cross(a[0], a[1], b[0]);
  const d4 = cross(a[0], a[1], b[1]);
  return d1 * d2 < 0 && d3 * d4 < 0;
}

/** ปัญหาความปลอดภัยของภาพสาธิต (ว่าง = ปลอดภัย): ไม่ซ้อนตัว ไม่ยืนบนกัน ไม่นอนไขว้ทับกัน */
export function safetyIssues(m: Mission, figs: Fig[]): string[] {
  const out: string[] = [];
  figs.forEach((f, i) => {
    if (!(f.pose in POSES)) out.push(`${m.id}#${i}: ท่า ${f.pose} ไม่อยู่ในรายการท่าปลอดภัย`);
    if (m.view === 'front' && Math.abs(f.r) > 20) out.push(`${m.id}#${i}: เอนตัวเกิน 20 องศา`);
    if (m.view === 'front' && f.y !== 0) out.push(`${m.id}#${i}: ด้านหน้าทุกคนต้องอยู่บนพื้น`);
    for (let j = i + 1; j < figs.length; j++) {
      const g = figs[j];
      const d = Math.hypot(f.x - g.x, f.y - g.y);
      if (m.view === 'front' ? Math.abs(f.x - g.x) < 30 : d < 30) out.push(`${m.id}#${i}-${j}: ยืน/นอนชิดกันเกินไป (${Math.round(d)})`);
      if (m.view === 'top' && segmentsCross(bodyAxis(f), bodyAxis(g))) out.push(`${m.id}#${i}-${j}: นอนไขว้ทับกัน`);
    }
  });
  return out;
}
