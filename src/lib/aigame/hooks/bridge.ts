/**
 * สร้างสะพานเรียงลำดับ: แผ่นไม้แต่ละแผ่นคือหนึ่งขั้น ลอยในแม่น้ำ แตะตามลำดับ
 * แตะเลือก = แผ่นที่ถูกลอยไปต่อสะพาน · กะจังหวะ = แผ่นที่ถูกลอยแกว่งเหนือช่องว่าง แตะจอให้ปล่อยตอนตรงช่อง พลาดตกน้ำแล้วลอยกลับมา
 * ครบแล้วตัวละครเดินข้าม (ก้าวเด้งตามแผ่น)
 */
export const BRIDGE = String.raw`
const BR = { planks: [], laid: 0, n: 0, me: null, x0: -4.2, x1: 4.2, hang: null, t0: 0, busy: false, water: null };
const BR_Z = -0.4, BR_Y = 0.7;
function brCam() { const p = K3.portrait(); K3.camera.position.set(0, p ? 12 : 9.5, p ? 14 : 10.5); K3.camera.lookAt(0, 0, 0.8); }
function brSlotX(k) { return BR.x0 + (BR.x1 - BR.x0) * (k + 0.5) / BR.n; }
function brPick(i) {
  if (BR.busy || BR.hang) return;
  const p = BR.planks[i]; if (!p || p.laid) return;
  if (CONFIG.aim && i === G.q.correct[G.picked.size]) { brHang(p); return; }
  const res = answer(i);
  if (res === false) { K3.wiggle(p.g, 0.5); K3.burst(p.g, 0, 8); }
}
function brHang(p) {
  BR.busy = true; p.g.rotation.set(0, 0, 0); p.bobbing = false;
  K3.arc(p.g, { x: brSlotX(BR.laid), y: BR_Y + 2.2, z: BR_Z }, 1, 0.5, () => { BR.hang = p; BR.t0 = G.t; BR.busy = false; say(WORDS.holdHint); });
}
function brDrop() {
  const p = BR.hang; if (!p || G.state !== 'play') return;
  BR.hang = null; BR.busy = true;
  const x = p.g.position.x, slot = brSlotX(BR.laid), y0 = p.g.position.y, tf = Math.sqrt(2 * (y0 - BR_Y) / 20);
  if (Math.abs(x - slot) < 0.45) {
    K3.run(tf, (k) => { p.g.position.y = y0 - 10 * (k * tf) * (k * tf); p.g.position.x = x + (slot - x) * k; }, () => { BR.busy = false; answer(BR.planks.indexOf(p)); });
    return;
  }
  // พลาด: ตกน้ำ น้ำกระจาย แล้วลอยกลับมาให้ลองใหม่
  say(WORDS.miss); Sound.tone(220, 0.25, 'sine', 0.18, 90);
  K3.fling(p.g, { vy: 0, r: 0, floor: -0.15, bounce: 0.2, fric: 0.8, spin: [0, 0, (Math.random() - 0.5) * 3], life: 1, land: () => K3.burst(p.g, 0, 20), done: () => {
    p.g.rotation.set(0, 0, 0);
    K3.arc(p.g, { x: brSlotX(BR.laid), y: BR_Y + 2.2, z: BR_Z }, 0.6, 0.7, () => { BR.hang = p; BR.t0 = G.t; BR.busy = false; });
  } });
}
function brLay(i) {
  const p = BR.planks[i]; p.laid = true; p.bobbing = false;
  const k = BR.laid++;
  const c = K3.card(i); if (c) c.dataset.ok = '1';
  p.el.textContent = (k + 1) + '. ' + p.text;
  p.g.rotation.set(0, 0, 0);
  const w = (BR.x1 - BR.x0) / BR.n;
  const fin = () => {
    K3.run(0.25, (t) => p.g.scale.set(w / 1.7 * (1 + Math.sin(t * Math.PI) * 0.08), 1, 1));
    K3.burst(p.g, 0.2, 12); Sound.tone(520 + k * 80, 0.14, 'triangle', 0.2);
  };
  if (Math.abs(p.g.position.y - BR_Y) < 0.02) { p.g.position.x = brSlotX(k); fin(); }
  else K3.arc(p.g, { x: brSlotX(k), y: BR_Y, z: BR_Z }, 1.8, CONFIG.plankSec, fin);
}

const Hooks = {
  setup() {
    const T = K3.THREE;
    brCam(); window.addEventListener('resize', brCam);
    const water = K3.part(new T.PlaneGeometry(9, 40, 18, 40), '#4fb8ea', 0, -0.2, -4); water.rotation.x = -Math.PI / 2; water.castShadow = false; BR.water = water;
    [-1, 1].forEach((s) => {
      const bank = K3.part(new T.BoxGeometry(16, 1.4, 40), '#8edc6f', s * 12.4, 0, -4); bank.castShadow = false;
      K3.part(new T.BoxGeometry(0.6, 1.4, 40), '#a8743f', s * 4.6, -0.05, -4).castShadow = false;
      [[s * 7, -7], [s * 9, 1], [s * 6.5, 4]].forEach((p, i) => (i % 2 ? K3.bush(p[0], p[1], i) : K3.tree(p[0], p[1], i)));
      [-0.9, 0.9].forEach((dz) => K3.part(new T.BoxGeometry(0.3, 1.6, 0.3), '#a8743f', s * 4.6, 0.8, BR_Z + dz));
    });
    [[-12, 9, -30], [11, 11, -34]].forEach((p) => K3.cloud(p[0], p[1], p[2]));
    BR.me = K3.buddy('#ff9f43'); BR.me.g.scale.setScalar(0.7);
    BR.me.g.position.set(-5.6, BR_Y, BR_Z); BR.me.g.rotation.y = Math.PI / 2;
    K3.onPick = brPick;
    if (CONFIG.aim) {
      K3.renderer.domElement.addEventListener('pointerdown', () => { if (BR.hang) brDrop(); });
      window.addEventListener('keydown', (e) => { if (e.key === ' ' && BR.hang) { e.preventDefault(); brDrop(); } });
    }
  },
  onStart() {},
  onRead() {},
  spawn(q) {
    const T = K3.THREE;
    BR.n = q.choices.length; BR.laid = 0;
    BR.me.g.position.set(-5.6, BR_Y, BR_Z);
    q.choices.forEach((text, i) => {
      const x = -3 + (6 * i) / Math.max(1, BR.n - 1), z = 2.2 + (i % 2) * 1.2;
      const g = K3.group(x, 0, z);
      K3.outline(K3.part(new T.BoxGeometry(1.7, 0.22, 1.5), COLORS[i % COLORS.length], 0, 0, 0, g), 0.05);
      [-0.5, 0, 0.5].forEach((dx) => { K3.part(new T.BoxGeometry(0.04, 0.23, 1.5), '#a8743f', dx, 0, 0, g).castShadow = false; });
      K3.tappable(g, i);
      const el = K3.choiceLabel(K3.group(0, 0.4, 0, g), text, i);
      BR.planks.push({ g: g, el: el, text: text, laid: false, bob: Math.random() * 6, bobbing: true });
      K3.pop(g, 1);
    });
    K3.choiceCards(q.choices);
  },
  update(d, dt) {
    BR.planks.forEach((p) => { if (p.bobbing) { p.g.position.y = Math.sin(G.t * 2 + p.bob) * 0.06; p.g.rotation.z = Math.sin(G.t * 1.5 + p.bob) * 0.06; p.g.position.x += Math.sin(G.t * 0.7 + p.bob) * 0.002; } });
    if (BR.hang) {
      const w = 1.4 + BR.laid * 0.2, sx = brSlotX(BR.laid);
      BR.hang.g.position.x = sx + Math.sin((G.t - BR.t0) * w) * 2.2;
      BR.hang.g.rotation.z = Math.cos((G.t - BR.t0) * w) * 0.12;
    }
    const pos = BR.water.geometry.attributes.position;
    for (let i = 0; i < pos.count; i += 1) pos.setZ(i, Math.sin(pos.getX(i) * 1.3 + G.t * 2) * 0.04 + Math.cos(pos.getY(i) * 0.8 + G.t * 1.6) * 0.04);
    pos.needsUpdate = true;
  },
  draw(dt) { K3.render(dt); },
  onPartial(i) { brLay(i); },
  onCorrect(i) {
    brLay(i);
    const me = BR.me.g;
    after(CONFIG.plankSec + 0.1, () => {
      K3.run(1.2, (k) => { me.position.x = -5.6 + 11.2 * k; me.position.y = BR_Y + Math.abs(Math.sin(k * Math.PI * 8)) * 0.15; me.rotation.z = Math.sin(k * Math.PI * 8) * 0.08; }, () => K3.burst(me, 1.5, 40));
    });
  },
  onWrong() {},
  clear() { BR.planks.forEach((p) => { K3.stopBody(p.g); K3.unlabel(p.el); K3.remove(p.g); }); BR.planks = []; BR.hang = null; BR.busy = false; K3.pickables = []; K3.clearCards(); },
  onEnd() {},
};
`;
