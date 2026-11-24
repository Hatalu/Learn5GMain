/**
 * โบว์ลิ่งคำตอบ: กลุ่มพินแต่ละกลุ่มคือคำตอบ
 * แตะเลือก = ลูกกลิ้งไปกลุ่มนั้น · เล็งเอง = ลากจากลูกไปทางที่จะโยน ปล่อยแล้วลูกกลิ้งตามแนว ชนกลุ่มไหนนับกลุ่มนั้น
 * ลูกกลิ้งบนผิวเลน (ศูนย์กลาง = ผิว + รัศมี) หมุนตามระยะทางจริง พินล้มด้วยฟิสิกส์ ลูกผิดตกร่องข้างเลน
 */
export const BOWL = String.raw`
const BW = { ball: null, spinner: null, groups: [], busy: false, aimFrom: null };
const BW_TOP = 0.1, BW_R = 0.42, BW_PZ = -3.6, BW_START = { x: 0, z: 3.4 }, BW_GUTTER = 5.75;
function bwCam() { const p = K3.portrait(); K3.camera.position.set(0, p ? 8.5 : 6.2, p ? 12.5 : 9.6); K3.camera.lookAt(0, 0, -1.6); }
function bwBall() {
  K3.stopBody(BW.ball);
  BW.ball.position.set(BW_START.x, BW_TOP + BW_R, BW_START.z); BW.ball.visible = true; BW.spinner.rotation.set(0, 0, 0);
  K3.pop(BW.ball, 1);
}
/* ลูกกลิ้งจากจุดปัจจุบันไป (x, z) ใน sec วินาที หมุนตามระยะทาง (มุม = ระยะ / รัศมี) */
function bwRoll(x, z, sec, done) {
  const b = BW.ball, f = { x: b.position.x, z: b.position.z };
  let last = 0;
  K3.run(sec, (k) => {
    const e = k * (2 - k);
    b.position.x = f.x + (x - f.x) * e; b.position.z = f.z + (z - f.z) * e;
    const d = Math.hypot(x - f.x, z - f.z) * (e - last); last = e;
    BW.spinner.rotation.x -= d / BW_R;
    Sound.tone(70 + Math.random() * 20, 0.05, 'sine', 0.03);
  }, done);
}
function bwHit(grp) {
  const res = answer(grp.i);
  if (res !== false) { BW.busy = false; return; }
  // พินผิดแค่สั่น ลูกเด้งออกไปตกร่อง
  grp.pins.forEach((p) => K3.wiggle(p, 0.6)); FX.shake(5); Sound.tone(160, 0.2, 'triangle', 0.15);
  bwGutter(grp.x >= 0 ? 1 : -1);
}
function bwGutter(side) {
  const b = BW.ball, f = { x: b.position.x, z: b.position.z };
  K3.run(0.9, (k) => {
    b.position.x = f.x + (side * BW_GUTTER - f.x) * Math.min(1, k * 1.6);
    b.position.z = f.z - k * 3;
    b.position.y = BW_TOP + BW_R - Math.min(1, k * 1.6) * 0.2;
    BW.spinner.rotation.x -= 0.2;
  }, () => { bwBall(); BW.busy = false; K3.cardOn(-1); });
}
function bwPick(i) {
  if (BW.busy) return;
  const grp = BW.groups.find((x) => x.i === i); if (!grp) return;
  BW.busy = true; K3.cardOn(BW.groups.indexOf(grp));
  bwRoll(grp.x, BW_PZ + 0.9, CONFIG.rollSec, () => bwHit(grp));
}
/* เล็งเอง: ลูกวิ่งตรงตามทิศที่ลาก ถึงแนวพินแล้วดูว่าตรงกลุ่มไหน */
function bwThrow(tx, tz) {
  const b = BW.ball, dz = tz - b.position.z;
  if (dz > -0.5) return;
  const zHit = BW_PZ + 0.9, x = b.position.x + (tx - b.position.x) * (zHit - b.position.z) / dz;
  BW.busy = true;
  const grp = BW.groups.filter((g) => Math.abs(g.x - x) < 1.15).sort((a, c) => Math.abs(a.x - x) - Math.abs(c.x - x))[0];
  if (Math.abs(x) > BW_GUTTER - 0.4 || !grp) {
    const gx = Math.max(-BW_GUTTER, Math.min(BW_GUTTER, x));
    bwRoll(gx, zHit + 1.5, CONFIG.rollSec, () => { say(WORDS.miss); bwGutter(gx >= 0 ? 1 : -1); });
    return;
  }
  K3.cardOn(BW.groups.indexOf(grp));
  bwRoll(x, zHit, CONFIG.rollSec, () => bwHit(grp));
}

const Hooks = {
  setup() {
    const T = K3.THREE;
    bwCam(); window.addEventListener('resize', bwCam);
    K3.ground('#f2c9a6', 60);
    const lane = K3.part(new T.BoxGeometry(10.6, 0.2, 16), '#f6d8a8', 0, 0, -1); lane.castShadow = false;
    for (let x = -5; x <= 5; x += 1.1) K3.part(new T.BoxGeometry(0.04, 0.02, 16), '#e4bd84', x, 0.11, -1).castShadow = false;
    [-1, 1].forEach((s) => {
      K3.part(new T.BoxGeometry(0.9, 0.06, 16), '#c3cbdb', s * BW_GUTTER, -0.08, -1).castShadow = false;
      K3.part(new T.BoxGeometry(0.3, 0.5, 16), '#5b6b8f', s * 6.3, 0.25, -1);
    });
    for (let k = 0; k < 7; k++) K3.part(new T.ConeGeometry(0.12, 0.3, 3), '#ff6f61', -1.8 + k * 0.6, 0.12, 1.6).rotation.x = -Math.PI / 2;
    K3.part(new T.BoxGeometry(13, 3, 0.4), '#2f3e66', 0, 1.5, -7.4);
    K3.part(new T.BoxGeometry(13, 0.3, 0.5), '#ffcd3c', 0, 3.05, -7.3);
    const ball = K3.group(0, 0, 0), spin = K3.group(0, 0, 0, ball);
    K3.outline(K3.part(new T.SphereGeometry(BW_R, 28, 20), '#3f7cf2', 0, 0, 0, spin), 0.06);
    K3.part(new T.TorusGeometry(BW_R * 0.98, 0.04, 8, 30), '#ffffff', 0, 0, 0, spin).rotation.y = Math.PI / 2;
    [[0.12, 0.2], [-0.1, 0.22], [0.02, 0.33]].forEach((h) => K3.part(new T.SphereGeometry(0.06, 8, 6), INK, h[0], h[1], BW_R - 0.05, spin));
    BW.ball = ball; BW.spinner = spin; bwBall();
    K3.onPick = bwPick; K3.aimGame = true;
    K3.drag({
      start(p) { if (BW.busy) return false; BW.aimFrom = K3.toScreen(BW.ball, 0); },
      move(p) { if (BW.aimFrom && !BW.busy) K3.aimLine(BW.aimFrom.x, BW.aimFrom.y, p.x, p.y); },
      end(p) {
        K3.aimLine(null); if (!BW.aimFrom || BW.busy) return; BW.aimFrom = null;
        const g = K3.groundAt(p.x, p.y, BW_TOP); if (g && Math.hypot(p.dx, p.dy) > 25) bwThrow(g.x, g.z);
      },
      cancel() { K3.aimLine(null); BW.aimFrom = null; },
    });
  },
  onStart() {},
  onRead() {},
  spawn(q) {
    const T = K3.THREE;
    const ids = K3.subset(q, 4), n = ids.length, span = Math.min(8.4, 2.9 * (n - 1));
    const pinG = new T.CylinderGeometry(0.12, 0.19, 0.9, 14), head = new T.SphereGeometry(0.15, 14, 10);
    ids.forEach((ci, k) => {
      const x = n === 1 ? 0 : -span / 2 + (span * k) / (n - 1);
      const g = K3.group(x, BW_TOP, BW_PZ), pins = [];
      [[0, 0.5], [-0.33, -0.1], [0.33, -0.1], [-0.66, -0.7], [0, -0.7], [0.66, -0.7]].forEach((p) => {
        const pin = K3.group(p[0], 0, p[1], g);
        K3.outline(K3.part(pinG, '#ffffff', 0, 0.45, 0, pin), 0.06);
        K3.part(head, '#ffffff', 0, 0.97, 0, pin);
        K3.part(new T.CylinderGeometry(0.16, 0.16, 0.08, 14), COLORS[ci % COLORS.length], 0, 0.62, 0, pin);
        pins.push(pin);
      });
      K3.tappable(g, ci);
      const el = K3.choiceLabel(K3.group(0, 1.7, -0.2, g), q.choices[ci], ci);
      BW.groups.push({ g: g, pins: pins, el: el, x: x, i: ci });
      K3.pop(g, 1);
    });
    K3.choiceCards(ids.map((ci) => q.choices[ci]), ids);
    BW.busy = false; bwBall(); K3.cardOn(-1);
    if (CONFIG.aim) say(WORDS.aimHint);
  },
  update(d, dt) {},
  draw(dt) { K3.render(dt); },
  onCorrect(i) {
    const grp = BW.groups.find((x) => x.i === i); if (!grp) return;
    const bx = BW.ball.position.x;
    bwRoll(bx, BW_PZ - 3, 0.5, () => { BW.ball.visible = false; });
    grp.pins.forEach((p) => {
      const off = p.position.x;
      K3.fling(p, { vx: off * 4 + (Math.random() - 0.5) * 3, vy: 3 + Math.random() * 3, vz: -3 - Math.random() * 4, r: 0, floor: 0, bounce: 0.3, fric: 0.5, spin: [-6 - Math.random() * 6, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 10], life: 2.2 });
    });
    K3.burst(grp.g, 1, 40); FX.text(innerWidth / 2, innerHeight * 0.45, 'STRIKE!', '#ff6b7a'); FX.shake(7);
    Sound.tone(180, 0.3, 'sawtooth', 0.08);
    const c = K3.card(BW.groups.indexOf(grp)); if (c) c.dataset.ok = '1';
  },
  onWrong() {},
  onPartial(i) {
    const grp = BW.groups.find((x) => x.i === i);
    if (grp) { K3.burst(grp.g, 1, 16); grp.pins.forEach((p) => K3.fling(p, { vy: 3, vz: -4, spin: [-8, 0, 3], life: 1.4, done: () => { p.visible = false; } })); grp.el.dataset.off = '1'; K3.pickables = K3.pickables.filter((o) => o !== grp.g); }
    after(0.5, bwBall);
  },
  clear() { BW.groups.forEach((x) => { x.pins.forEach((p) => K3.stopBody(p)); K3.unlabel(x.el); K3.remove(x.g); }); BW.groups = []; K3.pickables = []; K3.clearCards(); },
  onEnd() {},
};
`;
