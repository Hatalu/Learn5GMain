/** วิ่งผ่านประตูคำตอบ: วิ่งอัตโนมัติ 3 เลน แถวประตูวิ่งเข้าหา ตัดสินตอนแถวมาถึงตามเลนที่ยืน */
export const RUNNER = String.raw`
const LANE_X = [-2.1, 0, 2.1], PZ = 2.4, FAR = -60;
const R = { movers: [], me: null, lane: 1, rows: [], row: null, wait: 0, lean: 0, spin: 0, slots: [], coins: [], coinT: 0 };

function rnCam() {
  const p = K3.portrait();
  K3.camera.position.set(0, p ? 5 : 3.7, p ? 10.5 : 8.2); K3.camera.lookAt(0, 1, -8);
}
function rnLane(l) {
  if (l < 0 || l > 2) return;
  if (l !== R.lane) { R.lean = (l - R.lane) * 0.35; Sound.play('tap'); }
  R.lane = l;
  K3.cardOn(R.cardOf ? R.cardOf[l] : -1);
}
function rnSpawn(q) {
  const T = K3.THREE;
  // ตัวเลือกที่ใช้: ข้อที่ถูกที่ยังไม่ได้ตอบ 1 ตัว + ผิดไม่เกิน 2 ตัว
  const need = q.ordered ? [q.correct[G.picked.size]] : q.correct.filter((c) => !G.picked.has(c)).slice(0, 1);
  const wrong = shuffle(q.choices.map((_, i) => i).filter((i) => q.correct.indexOf(i) < 0)).slice(0, 2);
  const use = shuffle(need.concat(wrong));
  const slots = use.length === 2 ? [use[0], null, use[1]] : use.slice(0, 3);
  R.slots = slots;
  const g = K3.group(0, 0, FAR);
  const post = new T.CylinderGeometry(0.13, 0.13, 2.6, 10);
  const labels = [];
  slots.forEach((ci, k) => {
    const x = LANE_X[k];
    if (ci === null) { K3.outline(K3.part(new T.BoxGeometry(1.9, 1.1, 0.8), '#3fae5a', x, 0.55, 0, g), 0.04); return; }
    const c = COLORS[ci % COLORS.length];
    [-1, 1].forEach((s) => K3.part(post, c, x + s * 0.9, 1.3, 0, g));
    K3.outline(K3.part(new T.BoxGeometry(2.2, 0.36, 0.36), c, x, 2.65, 0, g), 0.05);
    const el = K3.label(K3.group(x, 2.9, 0, g), q.choices[ci]);
    el.style.setProperty('--c', c); el.style.opacity = '0'; el.style.transition = 'opacity .3s';
    el.addEventListener('click', () => rnLane(k));
    labels.push(el);
  });
  // การ์ดล่าง: ซ้าย กลาง ขวา ตามเลน
  const lanes = [0, 1, 2].filter((k) => slots[k] !== null);
  R.cardOf = {}; lanes.forEach((k, j) => { R.cardOf[k] = j; });
  K3.cards(lanes.map((k) => q.choices[slots[k]]), (j) => rnLane(lanes[j]));
  lanes.forEach((k, j) => K3.card(j).style.setProperty('--c', COLORS[slots[k] % COLORS.length]));
  if (slots[R.lane] === null) R.lane = lanes[0];
  rnLane(R.lane);
  R.row = { g: g, labels: labels, slots: slots, done: false };
  R.rows.push(R.row);
}
function rnDropRow(r) { r.labels.forEach((el) => K3.unlabel(el)); K3.remove(r.g); R.rows = R.rows.filter((x) => x !== r); if (R.row === r) R.row = null; }
function rnArrive(r) {
  r.done = true; R.row = null;
  r.labels.forEach((el) => { el.style.opacity = '0'; });
  const ci = r.slots[R.lane];
  R.wait = CONFIG.gapSec;
  if (ci === null) { rnBonk(); say(G.q.hint || WORDS.wrong); return; }
  const res = answer(ci);
  if (res === true && G.state === 'play') { Sound.play('pop'); K3.burst(R.me.g, 2.2, 16); }
  if (res === false) rnBonk();
}
function rnBonk() {
  FX.shake(8);
  K3.run(0.6, (k) => { R.me.g.position.z = PZ + Math.sin(k * Math.PI) * 1.2; R.me.g.rotation.z = Math.sin(k * Math.PI * 5) * 0.25 * (1 - k); });
}

const Hooks = {
  setup() {
    const T = K3.THREE;
    rnCam(); window.addEventListener('resize', rnCam);
    K3.scene.fog = new T.Fog('#ffe1f0', 26, 70);
    const grass = K3.part(new T.PlaneGeometry(80, 160), '#9be08a', 0, -0.02, -60); grass.rotation.x = -Math.PI / 2;
    K3.part(new T.BoxGeometry(6.8, 0.2, 160), '#66748f', 0, 0, -60).castShadow = false;
    [-3.5, 3.5].forEach((x) => K3.part(new T.BoxGeometry(0.3, 0.32, 160), '#ffffff', x, 0.08, -60));
    const dash = new T.BoxGeometry(0.14, 0.04, 1.6);
    for (let z = 6; z > -100; z -= 4) [-1.05, 1.05].forEach((x) => R.movers.push(K3.part(dash, '#ffffff', x, 0.12, z)));
    for (let z = 4, i = 0; z > -100; z -= 7, i++) [-1, 1].forEach((s) => {
      const x = s * (5.2 + (i % 3) * 0.9), zz = z - (s > 0 ? 3 : 0);
      R.movers.push((i + (s > 0 ? 1 : 0)) % 3 === 0 ? K3.bush(x, zz, i) : K3.tree(x, zz, i));
    });
    [[-10, 9, -40], [9, 11, -50], [0, 13, -70]].forEach((p) => K3.cloud(p[0], p[1], p[2]));
    R.me = K3.buddy('#ff6b7a'); R.me.g.position.set(0, 0, PZ); R.me.g.rotation.y = Math.PI; R.me.g.scale.setScalar(0.6);
    K3.sun.position.set(6, 14, 8);
    window.addEventListener('keydown', (e) => {
      if (G.state !== 'play' && G.state !== 'feedback') return;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') rnLane(R.lane - 1);
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') rnLane(R.lane + 1);
    });
    let sx = null;
    $('app').addEventListener('pointerdown', (e) => { sx = e.clientX; });
    $('app').addEventListener('pointerup', (e) => { if (sx !== null && Math.abs(e.clientX - sx) > 40) rnLane(R.lane + (e.clientX > sx ? 1 : -1)); sx = null; });
    K3.pad(['l', 'r'], (d) => rnLane(R.lane + (d === 'l' ? -1 : 1)));
  },
  onStart() { R.lane = 1; },
  onRead() {},
  spawn(q) { R.wait = 0; rnSpawn(q); },
  update(d, dt) {
    const speed = (PZ - FAR) / CONFIG.gateTravelSec;
    R.movers.forEach((m) => { m.position.z += speed * d; if (m.position.z > 9) m.position.z -= 106; });
    R.rows.slice().forEach((r) => {
      r.g.position.z += speed * d;
      const near = r.g.position.z > FAR * 0.5;
      if (!r.done) r.labels.forEach((el) => { el.style.opacity = near ? '1' : '0'; });
      if (!r.done && r.g.position.z >= PZ - 0.2) rnArrive(r);
      if (r.g.position.z > 12) rnDropRow(r);
    });
    if (G.state === 'play' && !R.row) { R.wait -= d; if (R.wait <= 0) rnSpawn(G.q); }
    // เหรียญระหว่างแถวประตู: เปลี่ยนเลนไปเก็บได้ (แค่ความสนุก ไม่นับคะแนนความรู้)
    R.coinT -= d;
    if (R.coinT <= 0 && G.state !== 'read') { R.coinT = 1.1; const T = K3.THREE, c = K3.part(new T.CylinderGeometry(0.28, 0.28, 0.08, 18), '#ffcd3c', LANE_X[Math.floor(Math.random() * 3)], 0.7, FAR * 0.6); c.rotation.z = Math.PI / 2; K3.outline(c, 0.08); R.coins.push(c); }
    R.coins = R.coins.filter((c) => {
      c.position.z += speed * d; c.rotation.y += dt * 4;
      if (Math.abs(c.position.z - PZ) < 0.5 && Math.abs(c.position.x - R.me.g.position.x) < 0.8) { const p = K3.toScreen(c, 0); FX.burst(p.x, p.y, ['#ffcd3c', '#fff1a8'], 10); Sound.tone(1200, 0.08, 'triangle', 0.12); K3.remove(c); return false; }
      if (c.position.z > 10) { K3.remove(c); return false; }
      return true;
    });
    // ตัวละคร: เลื่อนเลน + วิ่งเด้ง
    const me = R.me.g, tx = LANE_X[R.lane];
    me.position.x += (tx - me.position.x) * Math.min(1, dt * 12);
    R.lean *= Math.pow(0.02, dt);
    me.rotation.z = -R.lean;
    me.position.y = Math.abs(Math.sin(G.t * 11)) * 0.18;
    if (R.spin > 0) { R.spin = Math.max(0, R.spin - dt); me.rotation.y = Math.PI + (1 - R.spin / 0.5) * Math.PI * 2; }
  },
  draw(dt) { K3.render(dt); },
  onCorrect() {
    R.spin = 0.5;
    K3.burst(R.me.g, 2.4, 34); FX.text(innerWidth / 2, innerHeight * 0.55, '+100', '#ff5f8f');
    const c = K3.card(R.cardOf[R.lane]); if (c) c.dataset.ok = '1';
  },
  onWrong() {},
  onPartial() {},
  clear() { R.coins.forEach((c) => K3.remove(c)); R.coins = []; R.rows.slice().forEach(rnDropRow); R.slots = []; K3.clearCards(); },
  onEnd() {},
};
`;
