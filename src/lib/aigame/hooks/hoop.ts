/** ชู้ตบาสคำตอบ: ห่วงแต่ละห่วงคือคำตอบ แตะห่วงที่ถูก ลูกบาสลอยโค้งลงห่วง */
export const HOOP = String.raw`
const HP = { ball: null, me: null, hoops: [], busy: false, hand: { x: 2.6, y: 1.5, z: 3.4 } };
function hpCam() { const p = K3.portrait(); K3.camera.position.set(0, p ? 5.5 : 4, p ? 13 : 10.5); K3.camera.lookAt(0, 2.2, -3); }
function hpBall() { HP.ball.position.set(HP.hand.x, HP.hand.y, HP.hand.z); HP.ball.visible = true; }
function hpPick(i) {
  if (HP.busy) return;
  const h = HP.hoops.find((x) => x.i === i); if (!h) return;
  HP.busy = true; K3.cardOn(HP.hoops.indexOf(h));
  const me = HP.me.g; K3.run(0.2, (k) => { me.position.y = Math.sin(k * Math.PI) * 0.5; });
  const rim = { x: h.x, y: h.y + 0.35, z: h.z + 0.55 };
  Sound.play('pop');
  K3.arc(HP.ball, rim, 2.6, CONFIG.shotSec, () => {
    const res = answer(i);
    if (res === false) {
      // ชนห่วงเด้งออก
      K3.wiggle(h.g, 0.4); FX.shake(4);
      const f = { x: HP.ball.position.x, y: HP.ball.position.y, z: HP.ball.position.z }, dir = h.x >= 0 ? 1 : -1;
      K3.run(0.8, (k) => HP.ball.position.set(f.x + dir * k * 2, f.y + Math.sin(k * Math.PI) * 1 - k * f.y, f.z + k * 2), () => { hpBall(); K3.pop(HP.ball, 1); HP.busy = false; K3.cardOn(-1); });
    } else {
      const f = HP.ball.position.y;
      K3.run(0.35, (k) => { HP.ball.position.y = f - k * 1.2; }, () => { HP.busy = false; });
    }
  });
}

const Hooks = {
  setup() {
    const T = K3.THREE;
    hpCam(); window.addEventListener('resize', hpCam);
    K3.ground('#f4b183', 60);
    const court = K3.part(new T.BoxGeometry(16, 0.1, 14), '#e8a060', 0, 0, -1); court.castShadow = false;
    [[0, 3.5], [0, -3], [-6, -1], [6, -1]].forEach((p, k) => { const l = K3.part(new T.BoxGeometry(k < 2 ? 14 : 0.08, 0.02, k < 2 ? 0.08 : 12), '#ffffff', p[0], 0.06, p[1]); l.castShadow = false; });
    K3.part(new T.BoxGeometry(18, 5, 0.4), '#7c5cf0', 0, 2.5, -8.5);
    [[-10, -4], [10, -4]].forEach((p, i) => K3.tree(p[0], p[1], i));
    HP.me = K3.buddy('#ff9f43'); HP.me.g.position.set(3.1, 0, 3.9); HP.me.g.rotation.y = Math.PI + 0.3; HP.me.g.scale.setScalar(0.75);
    const ball = K3.group(0, 0, 0);
    K3.outline(K3.part(new T.SphereGeometry(0.32, 22, 16), '#ff8c2e', 0, 0, 0, ball), 0.07);
    K3.part(new T.TorusGeometry(0.325, 0.025, 6, 24), INK, 0, 0, 0, ball);
    K3.part(new T.TorusGeometry(0.325, 0.025, 6, 24), INK, 0, 0, 0, ball).rotation.y = Math.PI / 2;
    HP.ball = ball; hpBall();
    K3.onPick = hpPick;
  },
  onStart() {},
  onRead() {},
  spawn(q) {
    const T = K3.THREE;
    const ids = shuffle(K3.subset(q, 4)), n = ids.length, span = Math.min(9.5, 3.2 * (n - 1));
    ids.forEach((ci, k) => {
      const x = n === 1 ? 0 : -span / 2 + (span * k) / (n - 1), y = 3 + (k % 2) * 0.5, z = -4.5;
      const c = COLORS[ci % COLORS.length], g = K3.group(x, 0, z);
      K3.part(new T.CylinderGeometry(0.1, 0.12, y, 10), '#8a8fa8', 0, y / 2, -0.4, g);
      K3.outline(K3.part(new T.BoxGeometry(1.9, 1.25, 0.12), c, 0, y + 0.55, -0.35, g), 0.04);
      K3.part(new T.BoxGeometry(0.7, 0.5, 0.04), '#ffffff', 0, y + 0.35, -0.27, g);
      const rim = K3.part(new T.TorusGeometry(0.48, 0.05, 8, 28), '#ff5f3a', 0, y, 0.25, g); rim.rotation.x = Math.PI / 2;
      const net = K3.part(new T.CylinderGeometry(0.46, 0.3, 0.55, 12, 1, true), '#ffffff', 0, y - 0.3, 0.25, g); net.material = new T.MeshBasicMaterial({ color: '#ffffff', wireframe: true });
      K3.tappable(g, ci);
      const el = K3.choiceLabel(K3.group(0, y + 0.45, -0.2, g), q.choices[ci], ci);
      HP.hoops.push({ g: g, el: el, x: x, y: y, z: z, i: ci, net: net });
      K3.pop(g, 1);
    });
    K3.choiceCards(ids.map((ci) => q.choices[ci]), ids);
    HP.busy = false; hpBall(); K3.cardOn(-1);
  },
  update(d, dt) { if (!HP.busy) HP.ball.position.y = HP.hand.y + Math.abs(Math.sin(G.t * 4)) * 0.15; },
  draw(dt) { K3.render(dt); },
  onCorrect(i) {
    const h = HP.hoops.find((x) => x.i === i); if (!h) return;
    K3.run(0.5, (k) => h.net.scale.set(1, 1 + Math.sin(k * Math.PI * 3) * 0.3 * (1 - k), 1));
    K3.burst(h.g, h.y + 0.6, 36); FX.text(innerWidth / 2, innerHeight * 0.45, '+100', '#ff9f43');
    K3.run(0.5, (k) => { HP.me.g.position.y = Math.sin(k * Math.PI) * 0.7; });
    const c = K3.card(HP.hoops.indexOf(h)); if (c) c.dataset.ok = '1';
  },
  onWrong() {},
  onPartial() { after(0.5, hpBall); },
  clear() { HP.hoops.forEach((h) => { K3.unlabel(h.el); K3.remove(h.g); }); HP.hoops = []; K3.pickables = []; K3.clearCards(); },
  onEnd() {},
};
`;
