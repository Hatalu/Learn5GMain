/** ยานอวกาศบินลอดวงแหวน: ชุดวงแหวน (หนึ่งวงต่อคำตอบ) บินเข้าหา ยานต้องอยู่ที่วงที่ถูกตอนวงมาถึง */
export const SPACE = String.raw`
const SP = { ship: null, flame: null, stars: null, planets: [], set: null, sets: [], slot: -1, ids: [], pos: [], wait: 0, roll: 0, tx: 0, ty: 0.3 };
const SP_FAR = -64;
function spCam() { const p = K3.portrait(); K3.camera.position.set(0, p ? 1.6 : 1.3, p ? 9.5 : 7.2); K3.camera.lookAt(0, 0.4, -10); }
const SP_SLOTS = {
  2: [[-2.3, 0.4], [2.3, 0.4]],
  3: [[-2.7, 0], [0, 2], [2.7, 0]],
  4: [[-2.4, 1.7], [2.4, 1.7], [-2.4, -1.1], [2.4, -1.1]],
};
function spGo(k) {
  if (k < 0 || k >= SP.pos.length) return;
  if (k !== SP.slot) Sound.play('tap');
  SP.slot = k; SP.tx = SP.pos[k][0]; SP.ty = SP.pos[k][1];
  K3.cardOn(k);
}
function spDir(dx, dy) {
  // วงที่ใกล้ที่สุดในทิศที่กด
  let best = -1, bd = 1e9;
  SP.pos.forEach((p, k) => {
    const vx = p[0] - SP.tx, vy = p[1] - SP.ty;
    if (vx * dx + vy * dy <= 0.3) return;
    const d = vx * vx + vy * vy; if (d < bd) { bd = d; best = k; }
  });
  if (best >= 0) spGo(best);
}
function spSpawn(q) {
  const T = K3.THREE;
  const ids = shuffle(K3.subset(q, 4));
  SP.ids = ids; SP.pos = SP_SLOTS[ids.length] || SP_SLOTS[4];
  const g = K3.group(0, 0, SP_FAR), labels = [];
  ids.forEach((ci, k) => {
    const c = COLORS[ci % COLORS.length];
    const ring = K3.part(new T.TorusGeometry(1.05, 0.16, 12, 36), c, SP.pos[k][0], SP.pos[k][1], 0, g);
    ring.material = new T.MeshToonMaterial({ color: c, gradientMap: K3.ramp, emissive: c, emissiveIntensity: 0.35 });
    K3.outline(ring, 0.05);
    const el = K3.label(K3.group(SP.pos[k][0], SP.pos[k][1] + 1.35, 0, g), q.choices[ci]);
    el.style.setProperty('--c', c); el.style.opacity = '0'; el.style.transition = 'opacity .3s';
    el.addEventListener('click', () => spGo(k));
    labels.push(el);
  });
  K3.cards(ids.map((ci) => q.choices[ci]), (k) => spGo(k));
  ids.forEach((ci, k) => K3.card(k).style.setProperty('--c', COLORS[ci % COLORS.length]));
  SP.slot = -1; K3.cardOn(-1);
  SP.set = { g: g, labels: labels, done: false };
  SP.sets.push(SP.set);
}
function spDrop(s) { s.labels.forEach((el) => K3.unlabel(el)); K3.remove(s.g); SP.sets = SP.sets.filter((x) => x !== s); if (SP.set === s) SP.set = null; }
function spArrive(s) {
  s.done = true; SP.set = null; SP.wait = CONFIG.gapSec;
  s.labels.forEach((el) => { el.style.opacity = '0'; });
  const near = SP.slot >= 0 && Math.hypot(SP.ship.position.x - SP.pos[SP.slot][0], SP.ship.position.y - SP.pos[SP.slot][1]) < 1.3;
  if (!near) { say(G.q.hint || WORDS.wrong); SP.roll = 0.8; return; }
  const res = answer(SP.ids[SP.slot]);
  if (res === true && G.state === 'play') Sound.play('pop');
  if (res === false) { SP.roll = 0.8; FX.shake(6); }
}

const Hooks = {
  setup() {
    const T = K3.THREE;
    spCam(); window.addEventListener('resize', spCam);
    K3.scene.fog = new T.Fog('#1d1846', 30, 80);
    const n = 700, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { pos[i * 3] = (Math.random() - 0.5) * 70; pos[i * 3 + 1] = (Math.random() - 0.5) * 40; pos[i * 3 + 2] = -Math.random() * 100 + 10; }
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3));
    SP.stars = new T.Points(geo, new T.PointsMaterial({ color: '#ffffff', size: 0.16 })); K3.scene.add(SP.stars);
    [[-14, 6, -60, 5, '#ff9ad5'], [16, -4, -70, 7, '#7fd0ff'], [10, 10, -90, 4, '#ffd166']].forEach((p) => {
      const m = K3.part(new T.SphereGeometry(p[3], 24, 18), p[4], p[0], p[1], p[2]); m.castShadow = false; SP.planets.push(m);
    });
    const ship = K3.group(0, 0.3, 0);
    const body = K3.part(new T.SphereGeometry(0.62, 24, 18), '#ffffff', 0, 0, 0, ship); body.scale.set(1, 0.7, 1.5); K3.outline(body, 0.06);
    const dome = K3.part(new T.SphereGeometry(0.36, 20, 14), '#7fd0ff', 0, 0.3, -0.25, ship); K3.outline(dome, 0.06);
    [-1, 1].forEach((s) => { const w = K3.part(new T.BoxGeometry(0.9, 0.1, 0.5), '#ff6b7a', s * 0.75, -0.05, 0.25, ship); w.rotation.z = s * 0.2; K3.outline(w, 0.08); });
    SP.flame = K3.part(new T.ConeGeometry(0.22, 0.7, 12), '#ffb347', 0, 0, 1.15, ship); SP.flame.rotation.x = Math.PI / 2; SP.flame.castShadow = false;
    ship.scale.setScalar(0.8); SP.ship = ship;
    K3.sun.position.set(4, 10, 8);
    window.addEventListener('keydown', (e) => {
      if (G.state !== 'play' && G.state !== 'feedback') return;
      const m = { ArrowLeft: [-1, 0], a: [-1, 0], ArrowRight: [1, 0], d: [1, 0], ArrowUp: [0, 1], w: [0, 1], ArrowDown: [0, -1], s: [0, -1] }[e.key];
      if (m) { e.preventDefault(); spDir(m[0], m[1]); }
    });
    K3.pad(['l', 'u', 'd', 'r'], (d) => spDir(d === 'l' ? -1 : d === 'r' ? 1 : 0, d === 'u' ? 1 : d === 'd' ? -1 : 0));
    // แตะตรงไหนบนจอ ยานบินไปวงแหวนที่ใกล้จุดนั้นทันที (ไม่ต้องกดหลายครั้ง)
    K3.renderer.domElement.addEventListener('pointerdown', (e) => {
      if (!SP.pos.length || (G.state !== 'play' && G.state !== 'feedback')) return;
      let best = -1, bd = 1e9;
      SP.pos.forEach((q, k) => { const v = new K3.THREE.Vector3(q[0], q[1], SP.ship.position.z - 6).project(K3.camera); const x = (v.x + 1) / 2 * innerWidth, y = (1 - v.y) / 2 * innerHeight, dd = Math.hypot(x - e.clientX, y - e.clientY); if (dd < bd) { bd = dd; best = k; } });
      if (best >= 0) spGo(best);
    });
  },
  onStart() {},
  onRead() {},
  spawn(q) { SP.wait = 0; spSpawn(q); },
  update(d, dt) {
    const speed = -SP_FAR / CONFIG.ringTravelSec;
    const p = SP.stars.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) { let z = p.getZ(i) + speed * 1.4 * d; if (z > 12) z -= 100; p.setZ(i, z); }
    p.needsUpdate = true;
    SP.planets.forEach((m) => { m.rotation.y += dt * 0.1; });
    SP.sets.slice().forEach((s) => {
      s.g.position.z += speed * d;
      s.g.children.forEach((c) => { c.rotation.z += dt * 0.6; });
      if (!s.done) s.labels.forEach((el) => { el.style.opacity = s.g.position.z > SP_FAR * 0.55 ? '1' : '0'; });
      if (!s.done && s.g.position.z >= -0.1) spArrive(s);
      if (s.g.position.z > 10) spDrop(s);
    });
    if (G.state === 'play' && !SP.set) { SP.wait -= d; if (SP.wait <= 0) spSpawn(G.q); }
    const sh = SP.ship, k = Math.min(1, dt * 5);
    const vx = SP.tx - sh.position.x;
    sh.position.x += vx * k; sh.position.y += (SP.ty - sh.position.y) * k;
    sh.rotation.z = -vx * 0.25;
    if (SP.roll > 0) { SP.roll = Math.max(0, SP.roll - dt); sh.rotation.z += (1 - SP.roll / 0.8) * Math.PI * 2; }
    sh.position.y += Math.sin(G.t * 3) * 0.004;
    SP.flame.scale.set(1, 0.8 + Math.random() * 0.5, 1);
  },
  draw(dt) { K3.render(dt); },
  onCorrect() { K3.burst(SP.ship, 0.5, 36); FX.text(innerWidth / 2, innerHeight * 0.55, '+100', '#ffd166'); const c = K3.card(SP.slot); if (c) c.dataset.ok = '1'; },
  onWrong() {},
  onPartial() {},
  clear() { SP.sets.slice().forEach(spDrop); SP.pos = []; K3.clearCards(); SP.tx = 0; SP.ty = 0.3; },
  onEnd() {},
};
`;
