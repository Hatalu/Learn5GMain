/**
 * บอลกลิ้งกลับบ้าน (จัดกลุ่ม): บ้าน = หมวด (choices ลำดับคงที่) บอลถือป้ายของ
 * แตะเลือก = บอลกลิ้งเข้าบ้านนั้น · เล็งเอง = ลากจากบอลแล้วปล่อยเหมือนดีดลูกแก้ว บอลกลิ้งด้วยแรงเสียดทาน เด้งขอบโต๊ะ เข้าประตูบ้านไหนนับบ้านนั้น
 * บอลวางบนผิวโต๊ะจริง หมุนรอบแกนตั้งฉากกับทิศที่กลิ้ง (มุม = ระยะ / รัศมี)
 */
export const ROLL = String.raw`
const RL_R = 0.55, RL_TOP = 0.17, RL_DOOR = -2.75, RL_WALL = 5.5;
const RL = { houses: [], cats: '', ball: null, body: null, label: null, busy: false, home: { x: 0, z: 3.4 }, counts: [], v: null, aimFrom: null };
function rlCam() { const p = K3.portrait(); K3.camera.position.set(0, p ? 11 : 8.5, p ? 12.5 : 10); K3.camera.lookAt(0, 0, -0.6); }
function rlHouses(cats) {
  const T = K3.THREE;
  RL.houses.forEach((h) => { K3.unlabel(h.el); K3.remove(h.g); });
  RL.houses = []; K3.pickables = []; RL.counts = cats.map(() => 0);
  const n = cats.length, span = Math.min(9, 3.2 * n);
  cats.forEach((name, i) => {
    const x = n === 1 ? 0 : -span / 2 + (span * i) / (n - 1), c = COLORS[i % COLORS.length];
    const g = K3.group(x, RL_TOP, -3.6);
    K3.outline(K3.part(new T.BoxGeometry(2, 1.6, 1.6), c, 0, 0.8, 0, g), 0.04);
    const roof = K3.part(new T.ConeGeometry(1.6, 1.1, 4), '#ff6f61', 0, 2.15, 0, g); roof.rotation.y = Math.PI / 4; K3.outline(roof, 0.04);
    const door = K3.part(new T.BoxGeometry(0.9, 1.1, 0.1), INK, 0, 0.55, 0.82, g);
    [-1, 1].forEach((s) => K3.part(new T.BoxGeometry(0.35, 0.35, 0.06), '#fff7c2', s * 0.65, 1.1, 0.82, g));
    K3.part(new T.CylinderGeometry(0.03, 0.03, 1, 6), '#8a6a3a', 0.6, 2.6, 0, g);
    const flag = K3.part(new T.BoxGeometry(0.5, 0.3, 0.05), '#ffcd3c', 0.85, 2.4, 0, g);
    K3.tappable(g, i);
    const el = K3.choiceLabel(K3.group(0, 3.1, 0, g), name, i);
    RL.houses.push({ g: g, door: door, flag: flag, el: el, x: x });
  });
  K3.choiceCards(cats);
}
function rlBall() {
  RL.v = null;
  RL.ball.position.set(RL.home.x, RL_TOP + RL_R, RL.home.z); RL.ball.visible = true; RL.ball.scale.setScalar(1);
  K3.pop(RL.ball, 1);
}
/* หมุนลูกตามระยะทางที่เคลื่อน: แกนหมุนตั้งฉากกับทิศ (dx, dz) */
const RL_AX = { v: null };
function rlSpin(dx, dz) {
  const d = Math.hypot(dx, dz); if (d < 1e-5) return;
  const T = K3.THREE; RL_AX.v = RL_AX.v || new T.Vector3();
  RL_AX.v.set(dz / d, 0, -dx / d);
  RL.body.rotateOnWorldAxis(RL_AX.v, d / RL_R);
}
function rlBack() {
  const b = RL.ball, g = { x: b.position.x, z: b.position.z };
  RL.v = null;
  let px = g.x, pz = g.z;
  K3.run(0.8, (k) => {
    const e = ease.outCubic(k), x = g.x + (RL.home.x - g.x) * e, z = g.z + (RL.home.z - g.z) * e;
    rlSpin(x - px, z - pz); px = x; pz = z; b.position.x = x; b.position.z = z;
  }, () => { RL.busy = false; K3.cardOn(-1); });
}
function rlAtDoor(i) {
  const h = RL.houses[i];
  const res = answer(i);
  if (res !== false) { RL.busy = false; return; }
  K3.wiggle(h.g, 0.5); FX.shake(4); Sound.tone(150, 0.2, 'triangle', 0.15);
  rlBack();
}
function rlPick(i) {
  if (RL.busy) return;
  const h = RL.houses[i]; if (!h) return;
  RL.busy = true; K3.cardOn(i);
  const b = RL.ball, f = { x: b.position.x, z: b.position.z }, to = { x: h.x, z: RL_DOOR };
  let px = f.x, pz = f.z;
  K3.run(CONFIG.rollSec, (k) => {
    const e = ease.inOutSine(k), x = f.x + (to.x - f.x) * e, z = f.z + (to.z - f.z) * e;
    rlSpin(x - px, z - pz); px = x; pz = z; b.position.x = x; b.position.z = z;
  }, () => rlAtDoor(i));
}

const Hooks = {
  setup() {
    const T = K3.THREE;
    rlCam(); window.addEventListener('resize', rlCam);
    K3.ground('#b7e48f', 60);
    const board = K3.part(new T.BoxGeometry(12, 0.3, 9), '#f2d3a2', 0, 0.02, 0); board.castShadow = false;
    for (let z = -4; z <= 4; z += 0.9) K3.part(new T.BoxGeometry(12, 0.01, 0.03), '#e5c08c', 0, RL_TOP + 0.005, z).castShadow = false;
    [-6.1, 6.1].forEach((x) => K3.part(new T.BoxGeometry(0.2, 0.6, 9), '#e0b07a', x, 0.3, 0));
    K3.part(new T.BoxGeometry(12.4, 0.6, 0.2), '#e0b07a', 0, 0.3, 4.5);
    K3.part(new T.CylinderGeometry(0.9, 1, 0.06, 24), '#ffffff', RL.home.x, RL_TOP + 0.03, RL.home.z);
    [[-8, -2], [8, -1], [-8.5, 3], [8.5, 3.5]].forEach((p, i) => K3.tree(p[0], p[1], i));
    const ball = K3.group(0, 0, 0);
    const body = K3.part(new T.SphereGeometry(RL_R, 28, 20), '#ff8a5c', 0, 0, 0, ball); K3.outline(body, 0.06);
    K3.part(new T.TorusGeometry(RL_R + 0.01, 0.06, 8, 28), '#ffffff', 0, 0, 0, body).rotation.y = Math.PI / 2;
    K3.part(new T.TorusGeometry(RL_R + 0.01, 0.06, 8, 28), '#ffcd3c', 0, 0, 0, body);
    RL.ball = ball; RL.body = body;
    RL.label = K3.label(K3.group(0, 1.3, 0, ball), '', 'item');
    rlBall();
    K3.onPick = rlPick; K3.aimGame = true;
    K3.drag({
      start() { RL.aimFrom = RL.busy ? null : K3.toScreen(RL.ball, 0); },
      move(p) { if (RL.aimFrom) { K3.aimLine(RL.aimFrom.x, RL.aimFrom.y, RL.aimFrom.x - p.dx, RL.aimFrom.y - p.dy); K3.power(Math.hypot(p.dx, p.dy) / (innerHeight * 0.4)); } },
      end(p) {
        K3.aimLine(null); K3.power(null); if (!RL.aimFrom || RL.busy) return;
        const a = RL.aimFrom; RL.aimFrom = null;
        // ดีดแบบหนังสติ๊ก: ลากถอยหลัง ลูกพุ่งไปทางตรงข้าม แรง = ความยาวที่ลาก
        const g0 = K3.groundAt(a.x, a.y, RL_TOP + RL_R), g1 = K3.groundAt(a.x - p.dx, a.y - p.dy, RL_TOP + RL_R);
        if (!g0 || !g1 || Math.hypot(p.dx, p.dy) < 25) return;
        const dx = g1.x - g0.x, dz = g1.z - g0.z, len = Math.hypot(dx, dz) || 1, sp = 4 + Math.min(1, Math.hypot(p.dx, p.dy) / (innerHeight * 0.4)) * 9;
        RL.v = { x: dx / len * sp, z: dz / len * sp }; RL.busy = true;
      },
      cancel() { K3.aimLine(null); K3.power(null); RL.aimFrom = null; },
    });
  },
  onStart() { RL.busy = false; },
  onRead() {},
  spawn(q) {
    const key = q.choices.join('|');
    if (key !== RL.cats) { RL.cats = key; rlHouses(q.choices); } else K3.choiceCards(q.choices);
    RL.label.textContent = q.q;
    RL.busy = false; K3.cardOn(-1);
    rlBall();
    if (CONFIG.aim) say(WORDS.aimHint);
  },
  update(d, dt) {
    RL.houses.forEach((h, i) => { h.flag.position.y += (2.4 + Math.min(RL.counts[i], 6) * 0.14 - h.flag.position.y) * Math.min(1, dt * 4); h.flag.rotation.y = Math.sin(G.t * 3 + i) * 0.3; });
    // ลูกที่ถูกดีด: กลิ้งด้วยแรงเสียดทาน เด้งขอบซ้ายขวา/ล่าง ถึงแนวประตูแล้วดูว่าเข้าบ้านไหน
    if (RL.v && d > 0) {
      const b = RL.ball, f = Math.pow(0.45, d);
      const nx = b.position.x + RL.v.x * d, nz = b.position.z + RL.v.z * d;
      rlSpin(nx - b.position.x, nz - b.position.z); b.position.x = nx; b.position.z = nz;
      RL.v.x *= f; RL.v.z *= f;
      if (Math.abs(b.position.x) > RL_WALL) { b.position.x = Math.sign(b.position.x) * RL_WALL; RL.v.x *= -0.6; Sound.tone(200, 0.06, 'sine', 0.1); }
      if (b.position.z > 4.0) { b.position.z = 4.0; RL.v.z *= -0.6; }
      if (b.position.z <= RL_DOOR) {
        const i = RL.houses.findIndex((h) => Math.abs(h.x - b.position.x) < 0.75);
        if (i >= 0) { RL.v = null; K3.cardOn(i); rlAtDoor(i); }
        else { b.position.z = RL_DOOR; RL.v.z *= -0.5; Sound.tone(180, 0.08, 'sine', 0.1); }
      } else if (Math.hypot(RL.v.x, RL.v.z) < 0.35) { say(WORDS.miss); rlBack(); }
    }
    if (!RL.busy && RL.ball.visible) RL.ball.scale.y = 1 + Math.sin(G.t * 4) * 0.03;
  },
  draw(dt) { K3.render(dt); },
  onCorrect(i) {
    const h = RL.houses[i]; RL.counts[i]++;
    const b = RL.ball, f = b.position.z;
    K3.run(0.4, (k) => { b.position.z = f - k * 0.9; b.scale.setScalar(1 - k * 0.85); }, () => { b.visible = false; });
    K3.burst(h.g, 2.2, 28); K3.wiggle(h.g, 0.4); Sound.tone(700, 0.12, 'triangle', 0.15);
    const c = K3.card(i); if (c) c.dataset.ok = '1';
  },
  onWrong() {},
  onPartial() {},
  clear() { RL.label.textContent = ''; RL.v = null; },
  onEnd() {},
};
`;
