/**
 * ชู้ตบาสคำตอบ: ห่วงแต่ละห่วงคือคำตอบ
 * แตะเลือก = ลูกลอยโค้งตามแรงโน้มถ่วงลงห่วงนั้น · เล็งเอง = ปัดขึ้น ทิศ = ซ้าย/ขวา ความยาวการปัด = แรง
 * ลงห่วงได้เมื่อแรงพอดีและตรงห่วง แรงไม่พอ/เกิน/เบี้ยว ลูกชนห่วงหรือกระดานแล้วเด้งตกพื้นด้วยฟิสิกส์
 */
export const HOOP = String.raw`
const HP = { ball: null, me: null, hoops: [], busy: false, hand: { x: 2.6, y: 1.5, z: 3.4 }, aimFrom: null };
const HP_R = 0.32, HP_G = 14;
function hpCam() { const p = K3.portrait(); K3.camera.position.set(0, p ? 5.5 : 4, p ? 13 : 10.5); K3.camera.lookAt(0, 2.2, -3); }
function hpBall() { K3.stopBody(HP.ball); HP.ball.position.set(HP.hand.x, HP.hand.y, HP.hand.z); HP.ball.visible = true; }
/* ยิงแบบฟิสิกส์จริง: ความเร็วต้นที่ทำให้ลูกไปถึงจุด to ใน sec วินาทีภายใต้แรงโน้มถ่วง */
function hpShoot(to, sec, done) {
  const b = HP.ball, f = { x: b.position.x, y: b.position.y, z: b.position.z };
  const vx = (to.x - f.x) / sec, vz = (to.z - f.z) / sec, vy = (to.y - f.y + 0.5 * HP_G * sec * sec) / sec;
  Sound.play('pop');
  K3.run(0.2, (k) => { HP.me.g.position.y = Math.sin(k * Math.PI) * 0.5; });
  K3.run(sec, (k) => {
    const t = k * sec;
    b.position.set(f.x + vx * t, f.y + vy * t - 0.5 * HP_G * t * t, f.z + vz * t);
    b.rotation.x -= 0.15;
  }, () => done({ vx: vx, vy: vy - HP_G * sec, vz: vz }));
}
function hpMiss(v, hitRim) {
  if (hitRim) { Sound.tone(420, 0.12, 'square', 0.08); FX.shake(3); }
  K3.fling(HP.ball, { vx: v.vx * 0.4 + (Math.random() - 0.5) * 3, vy: hitRim ? 4 : Math.min(2, -v.vy * 0.3), vz: 2.5, r: HP_R, floor: 0.05, bounce: 0.55, fric: 0.35, spin: [4, 0, 2], life: 1.6, land: () => Sound.tone(90, 0.08, 'sine', 0.12), done: () => { hpBall(); K3.pop(HP.ball, 1); HP.busy = false; K3.cardOn(-1); } });
}
function hpPick(i) {
  if (HP.busy) return;
  const h = HP.hoops.find((x) => x.i === i); if (!h) return;
  HP.busy = true; K3.cardOn(HP.hoops.indexOf(h));
  hpShoot({ x: h.x, y: h.y + 0.25, z: h.z + 0.25 }, CONFIG.shotSec, () => hpScore(h));
}
function hpScore(h) {
  const res = answer(h.i);
  if (res === false) { K3.wiggle(h.g, 0.4); hpMiss({ vx: 0, vy: -3, vz: 0 }, true); return; }
  const b = HP.ball, f = b.position.y;
  K3.run(0.4, (k) => { b.position.y = f - k * 1.3; }, () => { K3.fling(b, { vy: 0, vz: 1.2, r: HP_R, floor: 0.05, bounce: 0.6, fric: 0.3, life: 1.2, land: () => Sound.tone(90, 0.08, 'sine', 0.12) }); HP.busy = false; });
}
/* เล็งเอง: ปัดขึ้น dx = ทิศ, ความยาว = แรง (พอดีอยู่ช่วงกลาง) */
function hpFlick(p) {
  const len = Math.hypot(p.dx, p.dy);
  if (p.dy > -30 || len < 40) return;
  const power = Math.min(1.3, len / (innerHeight * 0.45));
  const ang = Math.atan2(p.dx, -p.dy);
  // เป้าจริงบนแนวห่วง: x ตามมุม ความสูงตามแรง
  const z = -4.25, dist = HP.hand.z - z;
  const x = HP.hand.x + Math.tan(ang) * dist * 1.1, y = 3.25 + (power - 0.75) * 4;
  const h = HP.hoops.slice().sort((a, c) => Math.abs(a.x - x) - Math.abs(c.x - x))[0];
  HP.busy = true;
  hpShoot({ x: x, y: y, z: z }, CONFIG.shotSec, (v) => {
    if (h && Math.abs(h.x - x) < 0.42 && Math.abs(y - (h.y + 0.25)) < 0.45) { K3.cardOn(HP.hoops.indexOf(h)); hpScore(h); return; }
    say(WORDS.miss);
    hpMiss(v, !!h && Math.abs(h.x - x) < 0.9);
  });
}

const Hooks = {
  setup() {
    const T = K3.THREE;
    hpCam(); window.addEventListener('resize', hpCam);
    K3.ground('#f4b183', 60);
    const court = K3.part(new T.BoxGeometry(16, 0.1, 14), '#e8a060', 0, 0, -1); court.castShadow = false;
    [[0, 3.5], [0, -3], [-6, -1], [6, -1]].forEach((p, k) => { K3.part(new T.BoxGeometry(k < 2 ? 14 : 0.08, 0.02, k < 2 ? 0.08 : 12), '#ffffff', p[0], 0.06, p[1]).castShadow = false; });
    const arc = K3.part(new T.TorusGeometry(3, 0.04, 6, 40, Math.PI), '#ffffff', 0, 0.06, -3); arc.rotation.x = -Math.PI / 2; arc.castShadow = false;
    K3.part(new T.BoxGeometry(18, 5, 0.4), '#2f3e66', 0, 2.5, -8.5);
    [-6, -2, 2, 6].forEach((x, k) => K3.part(new T.BoxGeometry(2.6, 0.5, 0.1), ['#ff6f61', '#ffcd3c', '#34c98e', '#3fb0f2'][k], x, 4.4, -8.25));
    [[-10, -4], [10, -4]].forEach((p, i) => K3.tree(p[0], p[1], i));
    HP.me = K3.buddy('#ff9f43'); HP.me.g.position.set(3.1, 0, 3.9); HP.me.g.rotation.y = Math.PI + 0.3; HP.me.g.scale.setScalar(0.75);
    const ball = K3.group(0, 0, 0);
    K3.outline(K3.part(new T.SphereGeometry(HP_R, 22, 16), '#ff8c2e', 0, 0, 0, ball), 0.07);
    K3.part(new T.TorusGeometry(HP_R + 0.005, 0.022, 6, 24), INK, 0, 0, 0, ball);
    K3.part(new T.TorusGeometry(HP_R + 0.005, 0.022, 6, 24), INK, 0, 0, 0, ball).rotation.y = Math.PI / 2;
    HP.ball = ball; hpBall();
    K3.onPick = hpPick; K3.aimGame = true;
    K3.drag({
      start() { HP.aimFrom = HP.busy ? null : K3.toScreen(HP.ball, 0); },
      move(p) { if (HP.aimFrom) { K3.aimLine(HP.aimFrom.x, HP.aimFrom.y, HP.aimFrom.x + p.dx, HP.aimFrom.y + p.dy); K3.power(Math.hypot(p.dx, p.dy) / (innerHeight * 0.6)); } },
      end(p) { K3.aimLine(null); K3.power(null); if (!HP.aimFrom || HP.busy) return; HP.aimFrom = null; hpFlick(p); },
      cancel() { K3.aimLine(null); K3.power(null); HP.aimFrom = null; },
    });
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
      const rim = K3.part(new T.TorusGeometry(0.48, 0.05, 8, 28), '#ff5f3a', 0, y, 0.25, g); rim.rotation.x = Math.PI / 2;
      const net = K3.part(new T.CylinderGeometry(0.46, 0.3, 0.55, 12, 2, true), '#ffffff', 0, y - 0.3, 0.25, g); net.material = new T.MeshBasicMaterial({ color: '#ffffff', wireframe: true });
      K3.tappable(g, ci);
      const el = K3.choiceLabel(K3.group(0, y + 0.45, -0.2, g), q.choices[ci], ci);
      HP.hoops.push({ g: g, el: el, x: x, y: y, z: z, i: ci, net: net });
      K3.pop(g, 1);
    });
    K3.choiceCards(ids.map((ci) => q.choices[ci]), ids);
    HP.busy = false; hpBall(); K3.cardOn(-1);
    if (CONFIG.aim) say(WORDS.aimHint);
  },
  update(d, dt) { if (!HP.busy) HP.ball.position.y = HP.hand.y + Math.abs(Math.sin(G.t * 4)) * 0.18; },
  draw(dt) { K3.render(dt); },
  onCorrect(i) {
    const h = HP.hoops.find((x) => x.i === i); if (!h) return;
    K3.run(0.6, (k) => h.net.scale.set(1, 1 + Math.sin(k * Math.PI * 3) * 0.35 * (1 - k), 1));
    K3.burst(h.g, h.y + 0.6, 36); FX.text(innerWidth / 2, innerHeight * 0.45, '+100', '#ff9f43'); Sound.tone(660, 0.1, 'triangle', 0.12);
    K3.run(0.5, (k) => { HP.me.g.position.y = Math.sin(k * Math.PI) * 0.7; });
    const c = K3.card(HP.hoops.indexOf(h)); if (c) c.dataset.ok = '1';
  },
  onWrong() {},
  onPartial() { after(0.9, () => { if (!HP.busy) hpBall(); }); },
  clear() { HP.hoops.forEach((h) => { K3.unlabel(h.el); K3.remove(h.g); }); HP.hoops = []; K3.pickables = []; K3.clearCards(); hpBall(); },
  onEnd() {},
};
`;
