/** กบกระโดดใบบัว: ใบบัวแต่ละใบคือคำตอบ แตะใบที่ถูก กบกระโดดไป ใบผิดจมน้ำ กบว่ายกลับ */
export const FROG = String.raw`
const FG = { frog: null, pads: [], busy: false, home: { x: 0, y: 0.25, z: 3.2 }, water: null };
function fgCam() { const p = K3.portrait(); K3.camera.position.set(0, p ? 9 : 7, p ? 12 : 9.5); K3.camera.lookAt(0, 0, -1); }
function fgMakeFrog() {
  const T = K3.THREE, g = K3.group(0, 0, 0);
  const body = K3.part(new T.SphereGeometry(0.6, 24, 18), '#5ccf6a', 0, 0.45, 0, g); body.scale.set(1.15, 0.8, 1); K3.outline(body, 0.06);
  K3.part(new T.SphereGeometry(0.42, 20, 14), '#c8f5b0', 0, 0.35, 0.3, g).scale.set(1, 0.7, 0.6);
  [-1, 1].forEach((s) => {
    const eye = K3.part(new T.SphereGeometry(0.2, 16, 12), '#ffffff', s * 0.28, 0.95, 0.15, g); K3.outline(eye, 0.08);
    K3.part(new T.SphereGeometry(0.09, 10, 8), INK, s * 0.28, 0.97, 0.33, g);
    const leg = K3.part(new T.SphereGeometry(0.25, 12, 10), '#45b858', s * 0.55, 0.15, -0.1, g); leg.scale.set(1, 0.6, 1.4);
  });
  return g;
}
function fgHome() { FG.frog.position.set(FG.home.x, FG.home.y, FG.home.z); FG.frog.rotation.set(0, Math.PI, 0); }
function fgPick(i) {
  if (FG.busy) return;
  const pad = FG.pads.find((p) => p.i === i); if (!pad) return;
  FG.busy = true; K3.cardOn(FG.pads.indexOf(pad));
  const fr = FG.frog; fr.rotation.y = Math.atan2(pad.x - fr.position.x, pad.z - fr.position.z);
  fr.scale.set(1.15, 0.75, 1.15);
  K3.run(0.15, (k) => fr.scale.set(1.15 - 0.15 * k, 0.75 + 0.25 * k, 1.15 - 0.15 * k), () => {
    Sound.play('pop');
    K3.arc(fr, { x: pad.x, y: FG.home.y, z: pad.z }, 2.2, CONFIG.hopSec, () => {
      const res = answer(i);
      if (res !== false) { FG.busy = false; return; }
      // ผิด: ใบบัวจม กบตกน้ำแล้วว่ายกลับ
      K3.burst(pad.g, 0, 18); FX.shake(4);
      K3.run(0.5, (k) => { pad.g.position.y = -0.6 * k; fr.position.y = FG.home.y - 0.5 * k; }, () => {
        const f = { x: fr.position.x, z: fr.position.z };
        K3.run(1, (k) => { fr.position.x = f.x + (FG.home.x - f.x) * k; fr.position.z = f.z + (FG.home.z - f.z) * k; fr.rotation.z = Math.sin(k * 20) * 0.15; }, () => {
          fgHome(); FG.busy = false; K3.cardOn(-1);
          K3.run(0.4, (k) => { pad.g.position.y = -0.6 * (1 - k); });
        });
      });
    });
  });
}

const Hooks = {
  setup() {
    const T = K3.THREE;
    fgCam(); window.addEventListener('resize', fgCam);
    const water = K3.part(new T.PlaneGeometry(60, 50, 1, 1), '#5ec7f0', 0, -0.05, -6); water.rotation.x = -Math.PI / 2; water.castShadow = false; FG.water = water;
    const bank = K3.part(new T.BoxGeometry(60, 0.6, 8), '#8edc6f', 0, 0, 9); bank.castShadow = false;
    K3.part(new T.CylinderGeometry(1.1, 1.1, 0.12, 28), '#3fae5a', FG.home.x, 0.1, FG.home.z);
    for (let i = 0; i < 10; i++) {
      const x = (Math.random() - 0.5) * 22, z = -8 - Math.random() * 10;
      K3.part(new T.CylinderGeometry(0.6 + Math.random() * 0.6, 0.6, 0.08, 20), '#4cc06a', x, 0.02, z).castShadow = false;
    }
    [[-9, 6], [9, 6], [-11, 8]].forEach((p, i) => K3.tree(p[0], p[1], i));
    [[-6, 0.4, -12], [7, 0.4, -14]].forEach((p) => { const r = K3.part(new T.CylinderGeometry(0.06, 0.06, 2.4, 6), '#7a5a2a', p[0], 1.2, p[2]); K3.part(new T.CapsuleGeometry(0.16, 0.5, 4, 8), '#8b5a2b', p[0], 2.4, p[2]); });
    [[-12, 9, -30], [12, 11, -34]].forEach((p) => K3.cloud(p[0], p[1], p[2]));
    FG.frog = fgMakeFrog(); fgHome();
    K3.onPick = fgPick;
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
  },
  update(d, dt) {
    FG.pads.forEach((p, k) => { if (!FG.busy) p.g.position.y = Math.sin(G.t * 2 + k) * 0.04; });
    if (!FG.busy) FG.frog.scale.y = 1 + Math.sin(G.t * 3) * 0.03;
  },
  draw(dt) { K3.render(dt); },
  onCorrect(i) {
    const pad = FG.pads.find((p) => p.i === i); if (pad) { K3.burst(pad.g, 1, 34); const c = K3.card(FG.pads.indexOf(pad)); if (c) c.dataset.ok = '1'; }
    FX.text(innerWidth / 2, innerHeight * 0.45, '+100', '#3fae5a');
    K3.run(0.5, (k) => { FG.frog.position.y = FG.home.y + Math.sin(k * Math.PI * 2) * 0.4 * (1 - k); });
  },
  onWrong() {},
  onPartial() { after(0.4, () => { fgHome(); }); },
  clear() { FG.pads.forEach((p) => { K3.unlabel(p.el); K3.remove(p.g); }); FG.pads = []; K3.pickables = []; K3.clearCards(); fgHome(); },
  onEnd() {},
};
`;
