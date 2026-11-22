/** โบว์ลิ่งคำตอบ: กลุ่มพินแต่ละกลุ่มคือคำตอบ แตะกลุ่มที่ถูก ลูกโบว์ลิ่งกลิ้งไปชน */
export const BOWL = String.raw`
const BW = { ball: null, groups: [], busy: false, start: { x: 0, y: 0.4, z: 3.4 } };
function bwCam() { const p = K3.portrait(); K3.camera.position.set(0, p ? 8.5 : 6.2, p ? 12.5 : 9.6); K3.camera.lookAt(0, 0, -1.6); }
function bwBall() { BW.ball.position.set(BW.start.x, BW.start.y, BW.start.z); BW.ball.visible = true; }
function bwPick(i) {
  if (BW.busy) return;
  const grp = BW.groups.find((x) => x.i === i); if (!grp) return;
  BW.busy = true; K3.cardOn(BW.groups.indexOf(grp));
  const b = BW.ball, f = { x: b.position.x, z: b.position.z }, to = { x: grp.x, z: -2.6 };
  K3.run(CONFIG.rollSec, (k) => {
    const e = k * k * (3 - 2 * k);
    b.position.x = f.x + (to.x - f.x) * e; b.position.z = f.z + (to.z - f.z) * e; b.rotation.x -= 0.25;
  }, () => {
    const res = answer(i);
    if (res === false) {
      grp.pins.forEach((p) => K3.wiggle(p, 0.5)); FX.shake(5);
      K3.run(0.8, (k) => { b.position.z = to.z + k * 3; b.position.x = to.x + (to.x > 0 ? 1 : -1) * k * 1.5; b.position.y = 0.4 - k * 0.6; }, () => { bwBall(); K3.pop(b, 1); BW.busy = false; K3.cardOn(-1); });
    } else BW.busy = false;
  });
}

const Hooks = {
  setup() {
    const T = K3.THREE;
    bwCam(); window.addEventListener('resize', bwCam);
    K3.ground('#f6c9a8', 60);
    const lane = K3.part(new T.BoxGeometry(11, 0.2, 16), '#f3d19c', 0, 0, -1); lane.castShadow = false;
    for (let x = -5; x <= 5; x += 1.1) K3.part(new T.BoxGeometry(0.04, 0.02, 16), '#e2b97f', x, 0.11, -1).castShadow = false;
    [-5.8, 5.8].forEach((x) => K3.part(new T.BoxGeometry(0.6, 0.15, 16), '#c9a0ff', x, 0.05, -1));
    K3.part(new T.BoxGeometry(12, 3, 0.4), '#a77bff', 0, 1.5, -7.4);
    [-1, 1].forEach((s) => K3.part(new T.BoxGeometry(0.3, 2.5, 0.3), '#ffd166', s * 6.2, 1.25, -8));
    const ball = K3.group(0, 0, 0);
    K3.outline(K3.part(new T.SphereGeometry(0.42, 26, 18), '#4f6bff', 0, 0, 0, ball), 0.06);
    [[0.12, 0.2], [-0.1, 0.22], [0.02, 0.32]].forEach((h) => K3.part(new T.SphereGeometry(0.06, 8, 6), INK, h[0], h[1], 0.34, ball));
    BW.ball = ball; bwBall();
    K3.onPick = bwPick;
  },
  onStart() {},
  onRead() {},
  spawn(q) {
    const T = K3.THREE;
    const ids = K3.subset(q, 4), n = ids.length, span = Math.min(8.4, 2.9 * (n - 1));
    const pinG = new T.CylinderGeometry(0.13, 0.2, 0.9, 12), head = new T.SphereGeometry(0.16, 12, 10);
    ids.forEach((ci, k) => {
      const x = n === 1 ? 0 : -span / 2 + (span * k) / (n - 1);
      const g = K3.group(x, 0.1, -3.6), pins = [];
      [[0, 0.5], [-0.35, -0.1], [0.35, -0.1], [-0.7, -0.7], [0, -0.7], [0.7, -0.7]].forEach((p) => {
        const pin = K3.group(p[0], 0, p[1], g);
        K3.outline(K3.part(pinG, '#ffffff', 0, 0.45, 0, pin), 0.06);
        K3.part(head, '#ffffff', 0, 0.98, 0, pin);
        K3.part(new T.CylinderGeometry(0.17, 0.17, 0.08, 12), COLORS[ci % COLORS.length], 0, 0.62, 0, pin);
        pins.push(pin);
      });
      K3.tappable(g, ci);
      const el = K3.choiceLabel(K3.group(0, 1.7, -0.2, g), q.choices[ci], ci);
      BW.groups.push({ g: g, pins: pins, el: el, x: x, i: ci });
      K3.pop(g, 1);
    });
    K3.choiceCards(ids.map((ci) => q.choices[ci]), ids);
    BW.busy = false; bwBall(); K3.cardOn(-1);
  },
  update(d, dt) {},
  draw(dt) { K3.render(dt); },
  onCorrect(i) {
    const grp = BW.groups.find((x) => x.i === i); if (!grp) return;
    BW.ball.visible = false;
    grp.pins.forEach((p, k) => {
      const dx = (Math.random() - 0.5) * 3, dz = -1 - Math.random() * 2, rz = (Math.random() - 0.5) * 3;
      const f = { x: p.position.x, z: p.position.z };
      K3.run(0.9, (t) => { p.position.x = f.x + dx * t; p.position.z = f.z + dz * t; p.position.y = Math.sin(t * Math.PI) * 1.2; p.rotation.z = rz * t; p.rotation.x = -1.4 * t; });
    });
    K3.burst(grp.g, 1, 40); FX.text(innerWidth / 2, innerHeight * 0.45, 'STRIKE!', '#ff6b7a'); FX.shake(6);
    const c = K3.card(BW.groups.indexOf(grp)); if (c) c.dataset.ok = '1';
  },
  onWrong() {},
  onPartial(i) { const grp = BW.groups.find((x) => x.i === i); if (grp) { K3.burst(grp.g, 1, 16); grp.g.visible = false; grp.el.dataset.off = '1'; } bwBall(); },
  clear() { BW.groups.forEach((x) => { K3.unlabel(x.el); K3.remove(x.g); }); BW.groups = []; K3.pickables = []; K3.clearCards(); },
  onEnd() {},
};
`;
