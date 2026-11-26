/**
 * เครื่องบินกระดาษ (เกมทักษะ): มองด้านข้าง โลกเลื่อนไปทางซ้าย
 * กดค้าง = แรงยกพาเชิดขึ้น ปล่อย = แรงโน้มถ่วงพาร่อนลง (มีความเฉื่อย จึงต้องกดเป็นจังหวะ)
 * เสาวงแหวนคำตอบเรียงแนวตั้งวิ่งเข้าหา ลอดวงไหนตอบวงนั้น พลาดทุกวง = เสาชุดเดิมวนมาใหม่
 */
export const PLANE = String.raw`
const PL = { plane: null, vy: 0, hold: false, gates: [], gate: null, wait: 0, clouds: [], hills: [], ids: [] };
const PL_X = -4, PL_FAR = 15, PL_LO = 0.8, PL_HI = 7.2;
function plCam() { const p = K3.portrait(); K3.camera.position.set(p ? -1 : 0, 4.6, p ? 19 : 14); K3.camera.lookAt(p ? -1 : 0, 4.6, 0); }
function plSpawn(q) {
  const T = K3.THREE, ids = shuffle(K3.subset(q, 4)), n = ids.length;
  PL.ids = ids;
  const g = K3.group(PL_FAR, 0, 0), rings = [];
  K3.part(new T.CylinderGeometry(0.12, 0.12, PL_HI + 0.6, 8), '#c9ced9', 0, (PL_HI + 0.6) / 2, -0.4, g);
  ids.forEach((ci, k) => {
    const y = PL_LO + 0.4 + (k + 0.5) * ((PL_HI - PL_LO - 0.8) / n), c = COLORS[ci % COLORS.length];
    const ring = K3.part(new T.TorusGeometry(0.72, 0.13, 10, 32), c, 0, y, 0, g); ring.rotation.y = Math.PI / 2 - 0.75; K3.outline(ring, 0.05);
    const el = K3.label(K3.group(0.9, y + 0.15, 0, g), q.choices[ci]); el.style.setProperty('--c', c); el.style.opacity = '0'; el.style.transition = 'opacity .3s';
    rings.push({ y: y, ci: ci, el: el, m: ring });
  });
  K3.cards(ids.map((ci) => q.choices[ci]), () => {});
  ids.forEach((ci, k) => K3.card(k).style.setProperty('--c', COLORS[ci % COLORS.length]));
  PL.gate = { g: g, rings: rings, done: false };
  PL.gates.push(PL.gate);
}
function plDrop(gt) { gt.rings.forEach((r) => K3.unlabel(r.el)); K3.remove(gt.g); PL.gates = PL.gates.filter((x) => x !== gt); if (PL.gate === gt) PL.gate = null; }
function plPass(gt) {
  gt.done = true; PL.gate = null; PL.wait = 0.8;
  gt.rings.forEach((r) => { r.el.style.opacity = '0'; });
  const y = PL.plane.position.y, hit = gt.rings.slice().sort((a, b) => Math.abs(a.y - y) - Math.abs(b.y - y)).find((r) => Math.abs(r.y - y) < 1);
  if (!hit) { say(G.q.hint || WORDS.miss); Sound.tone(220, 0.2, 'sine', 0.1); return; }
  const k = PL.ids.indexOf(hit.ci); K3.cardOn(k);
  const res = answer(hit.ci);
  if (res === false) { K3.wiggle(hit.m, 0.5); FX.shake(5); PL.vy = -3; }
  else { K3.run(0.4, (t) => hit.m.scale.setScalar(1 + t * 0.8)); K3.burst(PL.plane, 0, 30); }
}

const Hooks = {
  setup() {
    const T = K3.THREE;
    plCam(); window.addEventListener('resize', plCam);
    const gr = K3.part(new T.BoxGeometry(80, 0.5, 12), '#8edc6f', 0, -0.25, -2); gr.castShadow = false;
    for (let i = 0; i < 9; i++) { const h = K3.part(new T.SphereGeometry(3 + (i % 3), 16, 10), i % 2 ? '#7fd06a' : '#9be08a', -24 + i * 6.5, -1.2, -8 - (i % 2) * 3); h.scale.y = 0.7; h.castShadow = false; PL.hills.push(h); }
    for (let i = 0; i < 6; i++) PL.clouds.push(K3.cloud(-20 + i * 8, 7 + (i % 3) * 1.6, -10 - (i % 2) * 4, 0.6 + (i % 3) * 0.2));
    // เครื่องบินกระดาษ: ลำตัวพับเป็นปีกสองข้าง
    const p = K3.group(PL_X, 4, 0), sh = new T.Shape();
    sh.moveTo(0, 0); sh.lineTo(-1.4, 0.55); sh.lineTo(-1.1, 0); sh.lineTo(-1.4, -0.55); sh.lineTo(0, 0);
    const wing = new T.ShapeGeometry(sh), wm = new T.MeshToonMaterial({ color: '#ffffff', gradientMap: K3.ramp, side: T.DoubleSide });
    [-1, 1].forEach((s) => { const w = new T.Mesh(wing, wm); w.rotation.x = Math.PI / 2 + s * 0.28; w.castShadow = true; p.add(w); });
    const keel = new T.Mesh(new T.ShapeGeometry(sh), new T.MeshToonMaterial({ color: '#ffd6a5', gradientMap: K3.ramp, side: T.DoubleSide })); keel.scale.set(1, 0.4, 1); keel.position.y = -0.08; p.add(keel);
    K3.part(new T.BoxGeometry(1.3, 0.02, 0.02), '#ff6f61', -0.65, 0.02, 0, p).castShadow = false;
    PL.plane = p;
    const down = (e) => { if (e && e.target && e.target.closest && e.target.closest('button')) return; PL.hold = true; };
    K3.renderer.domElement.addEventListener('pointerdown', down);
    window.addEventListener('pointerup', () => { PL.hold = false; });
    window.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w') { e.preventDefault(); PL.hold = true; } });
    window.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w') PL.hold = false; });
  },
  onStart() { PL.plane.position.y = 4; PL.vy = 0; },
  onRead() {},
  spawn(q) { PL.wait = 0; plSpawn(q); say(WORDS.flyHint); },
  update(d, dt) {
    const speed = (PL_FAR - PL_X) / CONFIG.gateSec;
    // แรงยก/แรงโน้มถ่วง + แรงต้านอากาศ (ความเร็วแนวตั้งมีเพดาน)
    // ง่าย (ผู้ใช้สั่ง 26 พ.ย. 2026): กดค้าง = ขึ้นทันทีด้วยความเร็วคงที่ ปล่อย = ร่อนลงช้าๆ ไม่ต้องกดรัว
    const want = G.state === 'read' ? 0 : PL.hold ? 4.5 : -2;
    PL.vy += (want - PL.vy) * Math.min(1, d * 8);
    // ช่วยเล็งเบาๆ: ใกล้วงแหวนไหน ค่อยๆ ดูดเข้ากลางวงนั้น
    if (PL.gate && !PL.hold && PL.gate.g.position.x < PL_X + 6) {
      const ny = PL.gate.rings.slice().sort((a, b) => Math.abs(a.y - PL.plane.position.y) - Math.abs(b.y - PL.plane.position.y))[0];
      if (ny && Math.abs(ny.y - PL.plane.position.y) < 1.1) PL.vy += (ny.y - PL.plane.position.y) * 6 * d;
    }
    const p = PL.plane;
    p.position.y = Math.max(PL_LO, Math.min(PL_HI, p.position.y + PL.vy * d));
    if (p.position.y <= PL_LO || p.position.y >= PL_HI) PL.vy *= 0.3;
    p.rotation.z += (PL.vy * 0.09 - p.rotation.z) * Math.min(1, dt * 8);
    p.rotation.x = Math.sin(G.t * 3) * 0.08;
    PL.clouds.forEach((c) => { c.position.x -= speed * 0.35 * d; if (c.position.x < -26) c.position.x += 48; });
    PL.hills.forEach((h) => { h.position.x -= speed * 0.15 * d; if (h.position.x < -28) h.position.x += 58; });
    PL.gates.slice().forEach((gt) => {
      gt.g.position.x -= speed * d;
      if (!gt.done) gt.rings.forEach((r) => { r.el.style.opacity = gt.g.position.x < PL_FAR - 3 ? '1' : '0'; });
      if (!gt.done && gt.g.position.x <= PL_X) plPass(gt);
      if (gt.g.position.x < -16) plDrop(gt);
    });
    if (G.state === 'play' && !PL.gate) { PL.wait -= d; if (PL.wait <= 0) plSpawn(G.q); }
  },
  draw(dt) { K3.render(dt); },
  onCorrect() { FX.text(innerWidth / 2, innerHeight * 0.45, '+100', '#3fb0f2'); const c = K3.card(PL.ids.indexOf(G.q.correct[0])); if (c) c.dataset.ok = '1'; },
  onWrong() {},
  onPartial() {},
  clear() { PL.gates.slice().forEach(plDrop); K3.clearCards(); },
  onEnd() {},
};
`;
