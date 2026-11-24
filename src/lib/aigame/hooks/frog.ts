/**
 * กบกระโดดใบบัว: ใบบัวแต่ละใบคือคำตอบ
 * แตะเลือก = กบกระโดดไปใบนั้น · เล็งเอง = กดค้างที่ใบบัวที่จะไป (ยิ่งค้างนานยิ่งกระโดดไกล) ปล่อยแล้วกระโดด ลงไม่ถึงใบ = ตกน้ำ
 * กบย่อตัวก่อนกระโดด ยืดตัวกลางอากาศ ใบบัวยุบเมื่อกบลง ใบผิดจมพร้อมน้ำกระจาย
 */
export const FROG = String.raw`
const FG = { frog: null, body: null, pads: [], busy: false, home: { x: 0, y: 0.25, z: 3.2 }, charge: -1, aimAt: null, ripples: [] };
function fgCam() { const p = K3.portrait(); K3.camera.position.set(0, p ? 9 : 7, p ? 12 : 9.5); K3.camera.lookAt(0, 0, -1); }
function fgMakeFrog() {
  const T = K3.THREE, g = K3.group(0, 0, 0), b = K3.group(0, 0, 0, g);
  const body = K3.part(new T.SphereGeometry(0.6, 24, 18), '#5ccf6a', 0, 0.45, 0, b); body.scale.set(1.15, 0.8, 1); K3.outline(body, 0.06);
  K3.part(new T.SphereGeometry(0.42, 20, 14), '#c8f5b0', 0, 0.35, 0.3, b).scale.set(1, 0.7, 0.6);
  [-1, 1].forEach((s) => {
    const eye = K3.part(new T.SphereGeometry(0.2, 16, 12), '#ffffff', s * 0.28, 0.95, 0.15, b); K3.outline(eye, 0.08);
    K3.part(new T.SphereGeometry(0.09, 10, 8), INK, s * 0.28, 0.97, 0.33, b);
    const leg = K3.part(new T.SphereGeometry(0.25, 12, 10), '#45b858', s * 0.55, 0.15, -0.1, b); leg.scale.set(1, 0.6, 1.4);
  });
  FG.body = b;
  return g;
}
function fgHome() { const f = FG.frog; K3.stopBody(f); f.position.set(FG.home.x, FG.home.y, FG.home.z); f.rotation.set(0, Math.PI, 0); FG.body.scale.set(1, 1, 1); }
function fgRipple(x, z) {
  const T = K3.THREE, r = K3.part(new T.TorusGeometry(0.5, 0.04, 6, 32), '#e9fbff', x, 0.02, z); r.rotation.x = -Math.PI / 2; r.castShadow = false;
  K3.run(0.9, (k) => { r.scale.setScalar(1 + k * 2.2); r.material.opacity = 1 - k; }, () => K3.remove(r));
  r.material = new T.MeshBasicMaterial({ color: '#e9fbff', transparent: true });
}
/* กระโดดไปจุด (x, z): ย่อตัว > ลอยโค้ง ยืดตัว > ลง แล้วเรียก done */
function fgJump(x, z, done) {
  const fr = FG.frog, b = FG.body;
  fr.rotation.y = Math.atan2(x - fr.position.x, z - fr.position.z);
  K3.run(0.14, (k) => b.scale.set(1 + 0.15 * k, 1 - 0.3 * k, 1 + 0.15 * k), () => {
    Sound.tone(500, 0.12, 'sine', 0.2, 900);
    const dist = Math.hypot(x - fr.position.x, z - fr.position.z);
    K3.arc(fr, { x: x, y: FG.home.y, z: z }, 1.2 + dist * 0.25, CONFIG.hopSec, () => { b.scale.set(1.2, 0.75, 1.2); K3.run(0.25, (k) => b.scale.set(1.2 - 0.2 * k, 0.75 + 0.25 * ease.outBack(k), 1.2 - 0.2 * k)); done(); });
    K3.run(CONFIG.hopSec, (k) => { const s = Math.sin(k * Math.PI); b.scale.set(1 - 0.1 * s, 1 + 0.25 * s, 1 - 0.1 * s); });
  });
}
function fgSplash(pad) {
  const fr = FG.frog;
  K3.burst(fr, 0, 22); FX.shake(4); fgRipple(fr.position.x, fr.position.z); Sound.tone(220, 0.25, 'sine', 0.18, 90);
  K3.run(0.5, (k) => { if (pad) pad.g.position.y = -0.6 * k; fr.position.y = FG.home.y - 0.55 * k; }, () => {
    const f = { x: fr.position.x, z: fr.position.z };
    fr.rotation.y = Math.atan2(FG.home.x - f.x, FG.home.z - f.z);
    K3.run(1, (k) => { fr.position.x = f.x + (FG.home.x - f.x) * k; fr.position.z = f.z + (FG.home.z - f.z) * k; fr.rotation.z = Math.sin(k * 20) * 0.15; if (Math.random() < 0.05) fgRipple(fr.position.x, fr.position.z); }, () => {
      fgHome(); FG.busy = false; K3.cardOn(-1);
      if (pad) K3.run(0.4, (k) => { pad.g.position.y = -0.6 * (1 - k); });
    });
  });
}
function fgLand(pad) {
  K3.run(0.3, (k) => { pad.g.position.y = -Math.sin(k * Math.PI) * 0.12; });
  fgRipple(pad.x, pad.z);
  const res = answer(pad.i);
  if (res === false) { fgSplash(pad); return; }
  FG.busy = false;
}
function fgPick(i) {
  if (FG.busy) return;
  const pad = FG.pads.find((p) => p.i === i); if (!pad) return;
  FG.busy = true; K3.cardOn(FG.pads.indexOf(pad));
  fgJump(pad.x, pad.z, () => fgLand(pad));
}

const Hooks = {
  setup() {
    const T = K3.THREE;
    fgCam(); window.addEventListener('resize', fgCam);
    const water = K3.part(new T.PlaneGeometry(60, 50, 1, 1), '#5ec7f0', 0, -0.05, -6); water.rotation.x = -Math.PI / 2; water.castShadow = false;
    const bank = K3.part(new T.BoxGeometry(60, 0.6, 8), '#8edc6f', 0, 0, 9); bank.castShadow = false;
    K3.part(new T.CylinderGeometry(1.1, 1.1, 0.12, 28), '#3fae5a', FG.home.x, 0.1, FG.home.z);
    for (let i = 0; i < 10; i++) {
      const x = (Math.random() - 0.5) * 22, z = -8 - Math.random() * 10;
      K3.part(new T.CylinderGeometry(0.6 + Math.random() * 0.6, 0.6, 0.08, 20), '#4cc06a', x, 0.02, z).castShadow = false;
    }
    [[-9, 6], [9, 6], [-11, 8]].forEach((p, i) => K3.tree(p[0], p[1], i));
    [[-6, -12], [7, -14], [-7.5, -10]].forEach((p) => { K3.part(new T.CylinderGeometry(0.06, 0.06, 2.4, 6), '#6a8a3a', p[0], 1.2, p[1]); K3.part(new T.CapsuleGeometry(0.16, 0.5, 4, 8), '#8b5a2b', p[0], 2.4, p[1]); });
    [[-12, 9, -30], [12, 11, -34]].forEach((p) => K3.cloud(p[0], p[1], p[2]));
    FG.frog = fgMakeFrog(); fgHome();
    K3.onPick = fgPick; K3.aimGame = true;
    K3.drag({
      start(p) { if (FG.busy) return; FG.charge = 0; FG.aimAt = p; },
      move(p) { FG.aimAt = p; },
      end(p) {
        K3.power(null); K3.aimLine(null);
        if (FG.charge < 0 || FG.busy) { FG.charge = -1; return; }
        const c = Math.min(1, FG.charge), fr = FG.frog; FG.charge = -1;
        const g = K3.groundAt(p.x, p.y, 0); if (!g) return;
        const dx = g.x - fr.position.x, dz = g.z - fr.position.z, len = Math.hypot(dx, dz) || 1;
        const dist = 1 + c * 7.5, x = fr.position.x + dx / len * dist, z = fr.position.z + dz / len * dist;
        FG.busy = true;
        const pad = FG.pads.find((q) => Math.hypot(q.x - x, q.z - z) < 1.15);
        fgJump(x, z, () => { if (pad) { K3.cardOn(FG.pads.indexOf(pad)); fgLand(pad); } else { say(WORDS.miss); fgSplash(null); } });
      },
      cancel() { FG.charge = -1; K3.power(null); K3.aimLine(null); },
    });
  },
  onStart() {},
  onRead() {},
  spawn(q) {
    const T = K3.THREE;
    const ids = shuffle(K3.subset(q, 4)), n = ids.length, span = Math.min(9, 3.1 * (n - 1));
    ids.forEach((ci, k) => {
      const x = n === 1 ? 0 : -span / 2 + (span * k) / (n - 1), z = -2.2 - (k % 2) * 0.9;
      const g = K3.group(x, 0, z);
      const leaf = K3.part(new T.CylinderGeometry(1.15, 1.15, 0.12, 28, 1, false, 0.35, Math.PI * 2 - 0.35), '#4cc06a', 0, 0.06, 0, g); K3.outline(leaf, 0.04);
      K3.part(new T.SphereGeometry(0.22, 12, 10), COLORS[ci % COLORS.length], 0.5, 0.2, 0.3, g);
      K3.tappable(g, ci);
      const el = K3.choiceLabel(K3.group(0, 0.6, 0, g), q.choices[ci], ci);
      FG.pads.push({ g: g, el: el, x: x, z: z, i: ci });
      K3.pop(g, 1);
    });
    K3.choiceCards(ids.map((ci) => q.choices[ci]), ids);
    FG.busy = false; K3.cardOn(-1);
    if (CONFIG.aim) say(WORDS.chargeHint);
  },
  update(d, dt) {
    FG.pads.forEach((p, k) => { if (!FG.busy) p.g.position.y = Math.sin(G.t * 2 + k) * 0.04; });
    if (FG.charge >= 0) {
      FG.charge += dt / 1.2; K3.power(Math.min(1, FG.charge));
      FG.body.scale.set(1 + 0.12 * Math.min(1, FG.charge), 1 - 0.25 * Math.min(1, FG.charge), 1);
      const s = K3.toScreen(FG.frog, 0.5); if (FG.aimAt) K3.aimLine(s.x, s.y, FG.aimAt.x, FG.aimAt.y);
    } else if (!FG.busy) FG.body.scale.y = 1 + Math.sin(G.t * 3) * 0.03;
  },
  draw(dt) { K3.render(dt); },
  onCorrect(i) {
    const pad = FG.pads.find((p) => p.i === i); if (pad) { K3.burst(pad.g, 1, 34); const c = K3.card(FG.pads.indexOf(pad)); if (c) c.dataset.ok = '1'; }
    FX.text(innerWidth / 2, innerHeight * 0.45, '+100', '#3fae5a');
    K3.run(0.5, (k) => { FG.frog.position.y = FG.home.y + Math.sin(k * Math.PI * 2) * 0.4 * (1 - k); });
  },
  onWrong() {},
  onPartial() { after(0.5, () => { if (!FG.busy) fgJump(FG.home.x, FG.home.z, fgHome); }); },
  clear() { FG.pads.forEach((p) => { K3.unlabel(p.el); K3.remove(p.g); }); FG.pads = []; K3.pickables = []; K3.clearCards(); fgHome(); },
  onEnd() {},
};
`;
