/** ต่อตึกบล็อกเรียงลำดับ: บล็อกหนึ่งก้อนต่อหนึ่งขั้น แตะตามลำดับ บล็อกที่ถูกลอยไปต่อบนตึก */
export const STACK = String.raw`
const SK = { blocks: [], tower: [], camY: 0, busy: false };
const SK_H = 0.85;
function skCam() {
  const p = K3.portrait(), y = SK.camY;
  K3.camera.position.set(0, (p ? 9.5 : 7.5) + y * 0.6, p ? 13 : 10.5); K3.camera.lookAt(0, 1 + y * 0.7, 0);
}
function skPick(i) {
  if (SK.busy) return;
  const b = SK.blocks[i]; if (!b || b.placed) return;
  SK.busy = true;
  const res = answer(i);
  SK.busy = false;
  if (res === false) { K3.arc(b.g, { x: b.g.position.x, y: b.g.position.y, z: b.g.position.z }, 0.6, 0.35); K3.wiggle(b.g, 0.5); }
}
function skPlace(i) {
  const b = SK.blocks[i]; b.placed = true; b.el.dataset.off = '1';
  const lvl = SK.tower.length; SK.tower.push(b);
  const card = K3.card(i); if (card) card.dataset.ok = '1';
  b.g.rotation.set(0, 0, 0);
  K3.arc(b.g, { x: 0, y: 0.25 + SK_H / 2 + lvl * SK_H, z: 0 }, 2.2, CONFIG.stackSec, () => {
    b.g.scale.set(1.15, 0.8, 1.15); K3.run(0.3, (k) => b.g.scale.set(1.15 - 0.15 * k, 0.8 + 0.2 * ease.outBack(k), 1.15 - 0.15 * k));
    K3.burst(b.g, 0.4, 14); Sound.tone(500 + lvl * 90, 0.15, 'triangle', 0.2);
    b.el.textContent = (lvl + 1) + '. ' + b.text; b.el.dataset.off = '0'; b.el.classList.add('item');
    SK.camY = Math.max(0, lvl - 1.5) * SK_H;
  });
}

const Hooks = {
  setup() {
    const T = K3.THREE;
    skCam(); window.addEventListener('resize', skCam);
    K3.ground('#a8e08a', 60);
    const mat = K3.part(new T.CylinderGeometry(6.5, 6.5, 0.2, 48), '#ffe9b8', 0, 0, 0); mat.castShadow = false;
    K3.outline(K3.part(new T.CylinderGeometry(1.2, 1.3, 0.3, 32), '#a77bff', 0, 0.15, 0), 0.04);
    [[-8, -5], [8, -6], [-9, 2], [9, 3]].forEach((p, i) => K3.tree(p[0], p[1], i));
    [[-12, 8, -30], [10, 10, -34]].forEach((p) => K3.cloud(p[0], p[1], p[2]));
    K3.onPick = skPick;
  },
  onStart() {},
  onRead() {},
  spawn(q) {
    const T = K3.THREE;
    const n = q.choices.length;
    q.choices.forEach((text, i) => {
      const ang = Math.PI + (i - (n - 1) / 2) * (Math.PI * 0.95 / Math.max(1, n - 1)) * 1.4;
      const x = Math.sin(ang) * 3.6, z = -Math.cos(ang) * 3.1 + 0.6;
      const g = K3.group(x, 0.25 + SK_H / 2, z);
      K3.outline(K3.part(new T.BoxGeometry(1.7, SK_H, 1.2), COLORS[i % COLORS.length], 0, 0, 0, g), 0.04);
      [-1, 1].forEach((s) => K3.part(new T.BoxGeometry(0.28, 0.28, 0.05), '#fff7c2', s * 0.45, 0.05, 0.61, g));
      g.rotation.y = (Math.random() - 0.5) * 0.4;
      K3.tappable(g, i);
      const el = K3.choiceLabel(K3.group(0, 0.7, 0, g), text, i);
      SK.blocks.push({ g: g, el: el, text: text, placed: false });
      K3.pop(g, 1);
    });
    K3.choiceCards(q.choices);
  },
  update(d, dt) { skCam(); },
  draw(dt) { K3.render(dt); },
  onPartial(i) { skPlace(i); },
  onCorrect(i) {
    skPlace(i);
    after(CONFIG.stackSec + 0.1, () => {
      SK.tower.forEach((b, k) => K3.run(0.4, (t) => b.g.scale.setScalar(1 + Math.sin(t * Math.PI) * 0.12)));
      const top = SK.tower[SK.tower.length - 1]; if (top) K3.burst(top.g, 1.2, 40);
      FX.text(innerWidth / 2, innerHeight * 0.45, WORDS.correct, '#ff6b7a');
    });
  },
  onWrong() {},
  clear() { SK.blocks.forEach((b) => { K3.unlabel(b.el); K3.remove(b.g); }); SK.blocks = []; SK.tower = []; SK.camY = 0; K3.pickables = []; K3.clearCards(); },
  onEnd() {},
};
`;
