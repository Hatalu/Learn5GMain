/**
 * ต่อตึกบล็อกเรียงลำดับ: บล็อกหนึ่งก้อนต่อหนึ่งขั้น แตะตามลำดับ
 * แตะเลือก = บล็อกที่ถูกลอยไปต่อบนตึก · กะจังหวะ = บล็อกที่ถูกห้อยจากเครนแกว่งไปมา แตะจอให้ปล่อยตอนตรงตึก
 * ปล่อยแล้วตกด้วยแรงโน้มถ่วงจริง เบี้ยวมากจะไถลตกโต๊ะแล้วกลับมาให้ลองใหม่ (ไม่เสียคะแนน)
 */
export const STACK = String.raw`
const SK_H = 0.85, SK_MAT = 0.1, SK_BASE = 0.3;
const SK = { blocks: [], tower: [], camY: 0, busy: false, hang: null, hook: null, arm: null, t0: 0 };
function skCam() {
  const p = K3.portrait(), y = SK.camY;
  K3.camera.position.set(0, (p ? 9.5 : 7.5) + y * 0.6, p ? 13 : 10.5); K3.camera.lookAt(0, 1 + y * 0.7, 0);
}
const skTop = () => SK_BASE + SK.tower.length * SK_H;
function skPick(i) {
  if (SK.busy || SK.hang) return;
  const b = SK.blocks[i]; if (!b || b.placed) return;
  const next = G.q.correct[G.picked.size];
  if (CONFIG.aim && i === next) { skHang(b); return; }
  const res = answer(i);
  if (res === false) { K3.arc(b.g, { x: b.home.x, y: b.home.y, z: b.home.z }, 0.6, 0.35); K3.wiggle(b.g, 0.5); }
}
/* กะจังหวะ: ยกบล็อกขึ้นเครน */
function skHang(b) {
  SK.busy = true; b.g.rotation.set(0, 0, 0);
  K3.arc(b.g, { x: 0, y: skTop() + 2.1, z: 0 }, 1, 0.5, () => { SK.hang = b; SK.t0 = G.t; SK.busy = false; SK.hook.visible = true; say(WORDS.holdHint); });
}
function skDrop() {
  const b = SK.hang; if (!b || G.state !== 'play') return;
  SK.hang = null; SK.busy = true; SK.hook.visible = false;
  const x = b.g.position.x, top = skTop(), land = top + SK_H / 2;
  // ตกแบบแรงโน้มถ่วง
  const y0 = b.g.position.y, tf = Math.sqrt(2 * (y0 - land) / 20);
  K3.run(tf, (k) => { b.g.position.y = y0 - 10 * (k * tf) * (k * tf); }, () => {
    b.g.position.y = land;
    if (Math.abs(x) < 0.55) {
      K3.run(0.2, (k) => { b.g.position.x = x * (1 - k); });
      const i = SK.blocks.indexOf(b); SK.busy = false; answer(i);
      return;
    }
    // เบี้ยว: เอียงแล้วไถลตกด้านที่ยื่นออก
    say(WORDS.miss); FX.shake(5); Sound.tone(140, 0.25, 'triangle', 0.15);
    const s = Math.sign(x);
    K3.fling(b.g, { vx: s * 2.5, vy: 1.5, vz: 1, r: SK_H / 2, floor: SK_MAT, bounce: 0.25, fric: 0.6, spin: [0, 0, -s * 4], life: 1.3, done: () => {
      b.g.rotation.set(0, 0, 0);
      K3.arc(b.g, { x: 0, y: skTop() + 2.1, z: 0 }, 1, 0.6, () => { SK.hang = b; SK.t0 = G.t; SK.busy = false; SK.hook.visible = true; });
    } });
  });
}
function skPlace(i) {
  const b = SK.blocks[i]; b.placed = true;
  const lvl = SK.tower.length; SK.tower.push(b);
  const card = K3.card(i); if (card) card.dataset.ok = '1';
  b.g.rotation.set(0, 0, 0);
  const done = () => {
    b.g.scale.set(1.12, 0.82, 1.12); K3.run(0.3, (k) => b.g.scale.set(1.12 - 0.12 * k, 0.82 + 0.18 * ease.outBack(k), 1.12 - 0.12 * k));
    K3.burst(b.g, 0.4, 14); Sound.tone(500 + lvl * 90, 0.15, 'triangle', 0.2);
    b.el.textContent = (lvl + 1) + '. ' + b.text; b.el.dataset.off = '0'; b.el.classList.add('item');
    SK.camY = Math.max(0, lvl - 1.5) * SK_H;
    // ตึกโยกเล็กน้อยแล้วนิ่ง
    K3.run(0.8, (k) => SK.tower.forEach((t, j) => { t.g.rotation.z = Math.sin(k * Math.PI * 3) * 0.03 * (1 - k) * (j / Math.max(1, SK.tower.length)); }));
  };
  if (Math.abs(b.g.position.y - (SK_BASE + SK_H / 2 + lvl * SK_H)) < 0.01) done();
  else K3.arc(b.g, { x: 0, y: SK_BASE + SK_H / 2 + lvl * SK_H, z: 0 }, 2.2, CONFIG.stackSec, done);
}

const Hooks = {
  setup() {
    const T = K3.THREE;
    skCam(); window.addEventListener('resize', skCam);
    K3.ground('#a8e08a', 60);
    const mat = K3.part(new T.CylinderGeometry(6.5, 6.5, 0.2, 48), '#ffe9b8', 0, 0, 0); mat.castShadow = false;
    K3.outline(K3.part(new T.CylinderGeometry(1.2, 1.3, SK_BASE - SK_MAT, 32), '#3fb0f2', 0, SK_MAT + (SK_BASE - SK_MAT) / 2, 0), 0.04);
    [[-8, -5], [8, -6], [-9, 2], [9, 3]].forEach((p, i) => K3.tree(p[0], p[1], i));
    [[-12, 8, -30], [10, 10, -34]].forEach((p) => K3.cloud(p[0], p[1], p[2]));
    // เครน (ใช้ในโหมดกะจังหวะ)
    const crane = K3.group(-4.5, 0, -2.5);
    K3.part(new T.BoxGeometry(0.35, 9, 0.35), '#ffcd3c', 0, 4.5, 0, crane);
    SK.arm = K3.part(new T.BoxGeometry(7, 0.3, 0.3), '#ffcd3c', 3.2, 9, 0, crane);
    crane.visible = !!CONFIG.aim;
    SK.hook = K3.part(new T.CylinderGeometry(0.03, 0.03, 1, 6), '#2a2350', 0, 0, 0); SK.hook.visible = false;
    K3.onPick = skPick;
    if (CONFIG.aim) {
      K3.renderer.domElement.addEventListener('pointerdown', () => { if (SK.hang) skDrop(); });
      window.addEventListener('keydown', (e) => { if (e.key === ' ' && SK.hang) { e.preventDefault(); skDrop(); } });
    }
  },
  onStart() {},
  onRead() {},
  spawn(q) {
    const T = K3.THREE;
    const n = q.choices.length;
    q.choices.forEach((text, i) => {
      const ang = (i - (n - 1) / 2) * Math.min(0.75, 2.6 / Math.max(1, n - 1));
      const x = Math.sin(ang) * 3.7, z = Math.cos(ang) * 3 + 0.4, y = SK_MAT + SK_H / 2;
      const g = K3.group(x, y, z);
      K3.outline(K3.part(new T.BoxGeometry(1.7, SK_H, 1.2), COLORS[i % COLORS.length], 0, 0, 0, g), 0.04);
      [-1, 1].forEach((s) => K3.part(new T.BoxGeometry(0.28, 0.28, 0.05), '#fff7c2', s * 0.45, 0.05, 0.61, g));
      g.rotation.y = (Math.random() - 0.5) * 0.3;
      K3.tappable(g, i);
      const el = K3.choiceLabel(K3.group(0, 0.7, 0, g), text, i);
      SK.blocks.push({ g: g, el: el, text: text, placed: false, home: { x: x, y: y, z: z } });
      K3.pop(g, 1);
    });
    K3.choiceCards(q.choices);
  },
  update(d, dt) {
    skCam();
    if (SK.hang) {
      // แกว่งเร็วขึ้นตามจำนวนชั้น
      const w = 1.6 + SK.tower.length * 0.25, x = Math.sin((G.t - SK.t0) * w) * 2.4, y = skTop() + 2.1;
      SK.hang.g.position.set(x, y, 0); SK.hang.g.rotation.z = -Math.cos((G.t - SK.t0) * w) * 0.15;
      SK.hook.position.set(x, y + (9 - y) / 2 + 0.4, 0); SK.hook.scale.y = 9 - y - 0.4;
    }
  },
  draw(dt) { K3.render(dt); },
  onPartial(i) { skPlace(i); },
  onCorrect(i) {
    skPlace(i);
    after(CONFIG.stackSec + 0.1, () => {
      SK.tower.forEach((b) => K3.run(0.4, (t) => b.g.scale.setScalar(1 + Math.sin(t * Math.PI) * 0.12)));
      const top = SK.tower[SK.tower.length - 1]; if (top) K3.burst(top.g, 1.2, 40);
      FX.text(innerWidth / 2, innerHeight * 0.45, WORDS.correct, '#ff6b7a');
    });
  },
  onWrong() {},
  clear() { SK.blocks.forEach((b) => { K3.stopBody(b.g); K3.unlabel(b.el); K3.remove(b.g); }); SK.blocks = []; SK.tower = []; SK.camY = 0; SK.hang = null; SK.busy = false; SK.hook.visible = false; K3.pickables = []; K3.clearCards(); },
  onEnd() {},
};
`;
