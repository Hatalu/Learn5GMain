/** สร้างสะพานเรียงลำดับ: แผ่นไม้แต่ละแผ่นคือหนึ่งขั้น ลอยในแม่น้ำ แตะตามลำดับ แผ่นที่ถูกลอยไปต่อสะพาน ครบแล้วเดินข้าม */
export const BRIDGE = String.raw`
const BR = { planks: [], laid: 0, n: 0, me: null, water: null, x0: -4.2, x1: 4.2 };
const BR_Z = -0.4;
function brCam() { const p = K3.portrait(); K3.camera.position.set(0, p ? 12 : 9.5, p ? 14 : 10.5); K3.camera.lookAt(0, 0, 0.8); }
function brSlotX(k) { return BR.x0 + (BR.x1 - BR.x0) * (k + 0.5) / BR.n; }
function brPick(i) {
  const p = BR.planks[i]; if (!p || p.laid) return;
  const res = answer(i);
  if (res === false) { K3.wiggle(p.g, 0.5); K3.burst(p.g, 0, 8); }
}
function brLay(i) {
  const p = BR.planks[i]; p.laid = true;
  const k = BR.laid++;
  const c = K3.card(i); if (c) c.dataset.ok = '1';
  p.el.textContent = (k + 1) + '. ' + p.text;
  p.g.rotation.set(0, 0, 0);
  const w = (BR.x1 - BR.x0) / BR.n;
  K3.arc(p.g, { x: brSlotX(k), y: 0.7, z: BR_Z }, 1.8, CONFIG.plankSec, () => {
    K3.run(0.25, (t) => p.g.scale.set(w / 1.7 * (1 + Math.sin(t * Math.PI) * 0.1), 1, 1));
    K3.burst(p.g, 0.2, 12); Sound.tone(520 + k * 80, 0.14, 'triangle', 0.2);
  });
}

const Hooks = {
  setup() {
    const T = K3.THREE;
    brCam(); window.addEventListener('resize', brCam);
    const water = K3.part(new T.PlaneGeometry(9, 40), '#4fb8ea', 0, -0.2, -4); water.rotation.x = -Math.PI / 2; water.castShadow = false; BR.water = water;
    [-1, 1].forEach((s) => {
      const bank = K3.part(new T.BoxGeometry(16, 1.4, 40), '#8edc6f', s * 12.4, 0, -4); bank.castShadow = false;
      [[s * 7, -7], [s * 9, 1], [s * 6.5, 4]].forEach((p, i) => (i % 2 ? K3.bush(p[0], p[1], i) : K3.tree(p[0], p[1], i)));
      K3.part(new T.BoxGeometry(0.3, 1.6, 0.3), '#a8743f', s * 4.6, 0.8, BR_Z - 0.9);
      K3.part(new T.BoxGeometry(0.3, 1.6, 0.3), '#a8743f', s * 4.6, 0.8, BR_Z + 0.9);
    });
    [[-12, 9, -30], [11, 11, -34]].forEach((p) => K3.cloud(p[0], p[1], p[2]));
    BR.me = K3.buddy('#a77bff'); BR.me.g.scale.setScalar(0.7);
    BR.me.g.position.set(-5.6, 0.7, BR_Z); BR.me.g.rotation.y = Math.PI / 2;
    K3.onPick = brPick;
  },
  onStart() {},
  onRead() {},
  spawn(q) {
    const T = K3.THREE;
    BR.n = q.choices.length; BR.laid = 0;
    BR.me.g.position.set(-5.6, 0.7, BR_Z);
    q.choices.forEach((text, i) => {
      const x = -3 + (6 * i) / Math.max(1, BR.n - 1), z = 2.2 + (i % 2) * 1.2;
      const g = K3.group(x, 0, z);
      K3.outline(K3.part(new T.BoxGeometry(1.7, 0.22, 1.5), COLORS[i % COLORS.length], 0, 0, 0, g), 0.05);
      [-0.5, 0, 0.5].forEach((dx) => K3.part(new T.BoxGeometry(0.04, 0.23, 1.5), '#a8743f', dx, 0, 0, g).castShadow = false);
      K3.tappable(g, i);
      const el = K3.choiceLabel(K3.group(0, 0.4, 0, g), text, i);
      BR.planks.push({ g: g, el: el, text: text, laid: false, bob: Math.random() * 6 });
      K3.pop(g, 1);
    });
    K3.choiceCards(q.choices);
  },
  update(d, dt) {
    BR.planks.forEach((p) => { if (!p.laid) { p.g.position.y = Math.sin(G.t * 2 + p.bob) * 0.06; p.g.rotation.z = Math.sin(G.t * 1.5 + p.bob) * 0.06; } });
  },
  draw(dt) { K3.render(dt); },
  onPartial(i) { brLay(i); },
  onCorrect(i) {
    brLay(i);
    const me = BR.me.g;
    after(CONFIG.plankSec + 0.1, () => {
      K3.run(1.2, (k) => { me.position.x = -5.6 + 11.2 * k; me.position.y = 0.7 + Math.abs(Math.sin(k * Math.PI * 8)) * 0.15; }, () => K3.burst(me, 1.5, 40));
    });
  },
  onWrong() {},
  clear() { BR.planks.forEach((p) => { K3.unlabel(p.el); K3.remove(p.g); }); BR.planks = []; K3.pickables = []; K3.clearCards(); },
  onEnd() {},
};
`;
