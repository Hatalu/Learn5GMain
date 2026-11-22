/** บอลกลิ้งกลับบ้าน (จัดกลุ่ม): บ้าน = หมวด (choices ลำดับคงที่) บอลถือป้ายของ แตะบ้านให้บอลกลิ้งเข้าไป */
export const ROLL = String.raw`
const RL = { houses: [], cats: '', ball: null, face: null, label: null, busy: false, home: { x: 0, y: 0.55, z: 3.6 }, counts: [] };
function rlCam() { const p = K3.portrait(); K3.camera.position.set(0, p ? 11 : 8.5, p ? 12.5 : 10); K3.camera.lookAt(0, 0, -0.6); }
function rlHouses(cats) {
  const T = K3.THREE;
  RL.houses.forEach((h) => { K3.unlabel(h.el); K3.remove(h.g); });
  RL.houses = []; K3.pickables = []; RL.counts = cats.map(() => 0);
  const n = cats.length, span = Math.min(9, 3.2 * n);
  cats.forEach((name, i) => {
    const x = n === 1 ? 0 : -span / 2 + (span * i) / (n - 1), c = COLORS[i % COLORS.length];
    const g = K3.group(x, 0, -3.6);
    K3.outline(K3.part(new T.BoxGeometry(2, 1.6, 1.6), c, 0, 0.8, 0, g), 0.04);
    const roof = K3.part(new T.ConeGeometry(1.6, 1.1, 4), '#ff6b7a', 0, 2.15, 0, g); roof.rotation.y = Math.PI / 4; K3.outline(roof, 0.04);
    const door = K3.part(new T.BoxGeometry(0.7, 1, 0.1), INK, 0, 0.5, 0.82, g);
    const flag = K3.part(new T.BoxGeometry(0.5, 0.3, 0.05), '#ffd166', 0.3, 2.4, 0, g);
    K3.tappable(g, i);
    const el = K3.choiceLabel(K3.group(0, 3.1, 0, g), name, i);
    RL.houses.push({ g: g, door: door, flag: flag, el: el, x: x });
  });
  K3.choiceCards(cats);
}
function rlBall() {
  RL.ball.position.set(RL.home.x, RL.home.y, RL.home.z); RL.ball.visible = true;
  K3.pop(RL.ball, 1);
}
function rlPick(i) {
  if (RL.busy) return;
  const h = RL.houses[i]; if (!h) return;
  RL.busy = true; K3.cardOn(i);
  const b = RL.ball, f = { x: b.position.x, z: b.position.z }, to = { x: h.x, z: -2.6 };
  const dist = Math.hypot(to.x - f.x, to.z - f.z);
  K3.run(CONFIG.rollSec, (k) => {
    const e = ease.inOutSine(k);
    b.position.x = f.x + (to.x - f.x) * e; b.position.z = f.z + (to.z - f.z) * e;
    b.position.y = RL.home.y + Math.abs(Math.sin(k * Math.PI * 2)) * 0.25;
    RL.body.rotation.x = -e * dist / 0.55;
  }, () => {
    const res = answer(i);
    if (res !== false) { RL.busy = false; return; }
    // ผิด: ชนประตูแล้วกลิ้งกลับ
    K3.wiggle(h.g, 0.5);
    const g = { x: b.position.x, z: b.position.z };
    K3.run(0.7, (k) => { b.position.x = g.x + (RL.home.x - g.x) * ease.outCubic(k); b.position.z = g.z + (RL.home.z - g.z) * ease.outCubic(k); b.rotation.z = Math.sin(k * 18) * 0.2 * (1 - k); }, () => { RL.busy = false; K3.cardOn(-1); });
  });
}

const Hooks = {
  setup() {
    const T = K3.THREE;
    rlCam(); window.addEventListener('resize', rlCam);
    K3.ground('#b7e48f', 60);
    const board = K3.part(new T.BoxGeometry(12, 0.3, 9), '#f2d3a2', 0, 0.02, 0); board.castShadow = false;
    [[-6.1, 0, 0.2, 9], [6.1, 0, 0.2, 9]].forEach((w) => K3.part(new T.BoxGeometry(w[2], 0.6, w[3]), '#e0b07a', w[0], 0.3, 0));
    K3.part(new T.BoxGeometry(12.4, 0.6, 0.2), '#e0b07a', 0, 0.3, 4.5);
    K3.part(new T.CylinderGeometry(0.9, 1, 0.2, 24), '#ffffff', RL.home.x, 0.2, RL.home.z);
    [[-8, -2], [8, -1], [-8.5, 3], [8.5, 3.5]].forEach((p, i) => K3.tree(p[0], p[1], i));
    const ball = K3.group(0, 0, 0);
    const body = K3.part(new T.SphereGeometry(0.55, 28, 20), '#ff8a5c', 0, 0, 0, ball); K3.outline(body, 0.06);
    K3.part(new T.TorusGeometry(0.56, 0.07, 8, 28), '#ffffff', 0, 0, 0, body).rotation.y = Math.PI / 2;
    [-1, 1].forEach((s) => K3.part(new T.SphereGeometry(0.07, 10, 8), INK, s * 0.18, 0.12, 0.5, ball));
    RL.ball = ball; RL.body = body;
    RL.label = K3.label(K3.group(0, 1.25, 0, ball), '', 'item');
    rlBall();
    K3.onPick = rlPick;
  },
  onStart() { RL.busy = false; },
  onRead() {},
  spawn(q) {
    const key = q.choices.join('|');
    if (key !== RL.cats) { RL.cats = key; rlHouses(q.choices); } else K3.choiceCards(q.choices);
    RL.label.textContent = q.q;
    RL.busy = false; K3.cardOn(-1);
    rlBall();
  },
  update(d, dt) {
    RL.houses.forEach((h, i) => { h.flag.position.y = 2.4 + Math.min(RL.counts[i], 6) * 0.12; });
    if (!RL.busy && RL.ball.visible) { RL.ball.scale.y = 1 + Math.sin(G.t * 4) * 0.04; }
  },
  draw(dt) { K3.render(dt); },
  onCorrect(i) {
    const h = RL.houses[i]; RL.counts[i]++;
    K3.run(0.35, (k) => RL.ball.scale.setScalar(1 - k * 0.9), () => { RL.ball.visible = false; });
    K3.burst(h.g, 2.2, 28); K3.wiggle(h.g, 0.4);
    const c = K3.card(i); if (c) c.dataset.ok = '1';
  },
  onWrong() {},
  onPartial() {},
  clear() { RL.label.textContent = ''; },
  onEnd() {},
};
`;
