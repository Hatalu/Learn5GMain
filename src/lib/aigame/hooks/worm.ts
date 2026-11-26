/**
 * หนอนน้อยกินตามลำดับ (เกมทักษะ เรียงลำดับ): หนอนเลื้อยไปข้างหน้าตลอด
 * แตะค้าง/ลากนิ้ว = หัวหนอนเลี้ยวเข้าหานิ้ว (เลี้ยวได้จำกัดต่อวินาที เหมือนสัตว์จริง) · ลูกศรซ้าย/ขวา = เลี้ยว
 * ชนรั้วแล้วเด้งกลับ กินผลไม้ลำดับถัดไป = ตัวยาวขึ้นหนึ่งปล้องพร้อมเลขลำดับ กินผิด = ผลไม้กระโดดหนี
 */
export const WORM = String.raw`
const WM = { head: null, segs: [], trail: [], ang: -Math.PI / 2, aim: null, keys: 0, fruits: [], eaten: 0, grow: [], cool: 0 };
const WM_W = 6.6, WM_H = 4.2, WM_GAP = 0.5;
function wmCam() { const p = K3.portrait(); K3.camera.position.set(0, p ? 19 : 13, p ? 9 : 7.5); K3.camera.lookAt(0, 0, 0.3); }
function wmSeg(color, scale) {
  const T = K3.THREE, g = K3.group(0, 0.32, 0);
  K3.outline(K3.part(new T.SphereGeometry(0.34, 16, 12), color, 0, 0, 0, g), 0.07);
  g.scale.setScalar(scale || 1);
  return g;
}
function wmFree(min) {
  for (let t = 0; t < 60; t++) {
    const x = (Math.random() * 2 - 1) * (WM_W - 0.8), z = (Math.random() * 2 - 1) * (WM_H - 0.8);
    const hp = WM.head.position;
    if (Math.hypot(x - hp.x, z - hp.z) < 2.2) continue;
    if (WM.fruits.some((f) => !f.eaten && Math.hypot(f.g.position.x - x, f.g.position.z - z) < min)) continue;
    return { x: x, z: z };
  }
  return { x: (Math.random() * 2 - 1) * 4, z: (Math.random() * 2 - 1) * 2.5 };
}
function wmEat(f) {
  WM.cool = 0.5;
  const res = answer(f.i);
  if (res === false) {
    // ผิด: ผลไม้กระโดดหนี หัวหนอนหันกลับ
    const p = wmFree(1.8); K3.arc(f.g, { x: p.x, y: 0.35, z: p.z }, 1.6, 0.6);
    WM.ang += Math.PI; FX.shake(4); return;
  }
  f.eaten = true; K3.unlabel(f.el); K3.remove(f.g);
  Sound.tone(600 + WM.eaten * 90, 0.12, 'triangle', 0.18);
  const s = wmSeg(f.color, 0.01); WM.segs.push(s); WM.grow.push(s); WM.eaten++;
  s.userData.el = K3.label(K3.group(0, 0.45, 0, s), String(WM.eaten), 'item'); s.userData.el.style.fontSize = '14px'; s.userData.el.style.padding = '0 8px';
  K3.run(0.35, (k) => s.scale.setScalar(Math.max(0.01, ease.outBack(k))));
  const c = K3.card(f.k); if (c) c.dataset.ok = '1';
}

const Hooks = {
  setup() {
    const T = K3.THREE;
    wmCam(); window.addEventListener('resize', wmCam);
    K3.ground('#a8e08a', 60);
    const field = K3.part(new T.BoxGeometry(WM_W * 2, 0.1, WM_H * 2), '#c9eea0', 0, 0, 0); field.castShadow = false;
    for (let i = -WM_W; i <= WM_W; i += 1.1) [-1, 1].forEach((s) => K3.part(new T.BoxGeometry(0.12, 0.6, 0.12), '#c48a4a', i, 0.3, s * (WM_H + 0.15)));
    for (let i = -WM_H; i <= WM_H; i += 1.1) [-1, 1].forEach((s) => K3.part(new T.BoxGeometry(0.12, 0.6, 0.12), '#c48a4a', s * (WM_W + 0.15), 0.3, i));
    [-1, 1].forEach((s) => { K3.part(new T.BoxGeometry(WM_W * 2 + 0.4, 0.08, 0.08), '#e0b07a', 0, 0.5, s * (WM_H + 0.15)); K3.part(new T.BoxGeometry(0.08, 0.08, WM_H * 2 + 0.4), '#e0b07a', s * (WM_W + 0.15), 0.5, 0); });
    for (let i = 0; i < 14; i++) { const f = K3.part(new T.SphereGeometry(0.1, 8, 6), ['#ff9ad5', '#ffffff', '#ffcd3c'][i % 3], (Math.random() * 2 - 1) * WM_W, 0.08, (Math.random() * 2 - 1) * WM_H); f.castShadow = false; }
    [[-9, -4], [9, -4], [-9, 4], [9, 5]].forEach((p, i) => K3.tree(p[0], p[1], i));
    const h = K3.group(0, 0.38, WM_H - 1.2);
    K3.outline(K3.part(new T.SphereGeometry(0.45, 20, 14), '#34c98e', 0, 0, 0, h), 0.07);
    [-1, 1].forEach((s) => {
      K3.outline(K3.part(new T.SphereGeometry(0.12, 10, 8), '#ffffff', s * 0.2, 0.22, 0.32, h), 0.1);
      K3.part(new T.SphereGeometry(0.06, 8, 6), INK, s * 0.2, 0.24, 0.42, h);
      K3.part(new T.CylinderGeometry(0.025, 0.025, 0.4, 6), INK, s * 0.15, 0.55, 0.05, h).rotation.z = -s * 0.3;
    });
    WM.head = h;
    for (let i = 0; i < 3; i++) WM.segs.push(wmSeg('#7fdcb0', 0.85));
    for (let i = 0; i < 400; i++) WM.trail.push({ x: h.position.x, z: h.position.z + i * 0.05 });
    // นำทาง: กดค้าง/ลากบนสนาม = หัวหันเข้าหาจุดนั้น
    const c = K3.renderer.domElement; let on = false;
    const at = (e) => { const g = K3.groundAt(e.clientX, e.clientY, 0); if (g) WM.aim = g; };
    c.addEventListener('pointerdown', (e) => { on = true; at(e); });
    c.addEventListener('pointermove', (e) => { if (on) at(e); });
    window.addEventListener('pointerup', () => { on = false; WM.aim = null; WM.keys = 0; });
    window.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft' || e.key === 'a') WM.keys = 1; if (e.key === 'ArrowRight' || e.key === 'd') WM.keys = -1; });
    window.addEventListener('keyup', (e) => { if (/Arrow(Left|Right)|^[ad]$/.test(e.key)) WM.keys = 0; });
    K3.pad(['l', 'r'], (d) => { WM.keys = d === 'l' ? 1 : -1; });
  },
  onStart() {},
  onRead() {},
  spawn(q) {
    const T = K3.THREE;
    q.choices.forEach((text, i) => {
      const color = ['#ff6f61', '#ffcd3c', '#ff9f43', '#ff6fae', '#3fb0f2', '#9be08a'][i % 6];
      const p = wmFree(2.2), g = K3.group(p.x, 0.35, p.z);
      K3.outline(K3.part(new T.SphereGeometry(0.33, 16, 12), color, 0, 0, 0, g), 0.07);
      K3.part(new T.CylinderGeometry(0.03, 0.03, 0.2, 6), '#6a4a2a', 0, 0.38, 0, g);
      K3.part(new T.SphereGeometry(0.1, 8, 6), '#4cc06a', 0.1, 0.45, 0, g).scale.set(1.6, 0.5, 1);
      const el = K3.label(K3.group(0, 0.5, 0, g), text); el.style.setProperty('--c', COLORS[i % COLORS.length]);
      WM.fruits.push({ g: g, el: el, i: i, k: i, text: text, color: color, eaten: false, bob: Math.random() * 6 });
      K3.pop(g, 1);
    });
    K3.cards(q.choices, () => {});
    say(WORDS.steerHint);
  },
  update(d, dt) {
    const h = WM.head, speed = (WM_W * 2) / CONFIG.crawlSec;
    if (G.state === 'play' || G.state === 'feedback') {
      // เลี้ยวเข้าหาเป้า ไม่เกิน 3.2 เรเดียน/วินาที
      let turn = WM.keys * 4.5 * d;
      if (WM.aim) {
        const want = Math.atan2(WM.aim.x - h.position.x, WM.aim.z - h.position.z);
        let df = want - WM.ang; while (df > Math.PI) df -= 6.283; while (df < -Math.PI) df += 6.283;
        turn = Math.max(-5 * d, Math.min(5 * d, df));
      }
      WM.ang += turn;
      h.position.x += Math.sin(WM.ang) * speed * d; h.position.z += Math.cos(WM.ang) * speed * d;
      // รั้ว: สะท้อนทิศ
      if (Math.abs(h.position.x) > WM_W - 0.4) { h.position.x = Math.sign(h.position.x) * (WM_W - 0.4); WM.ang = -WM.ang; Sound.tone(200, 0.06, 'sine', 0.08); }
      if (Math.abs(h.position.z) > WM_H - 0.4) { h.position.z = Math.sign(h.position.z) * (WM_H - 0.4); WM.ang = Math.PI - WM.ang; Sound.tone(200, 0.06, 'sine', 0.08); }
      h.rotation.y = WM.ang;
      const last = WM.trail[0];
      if (Math.hypot(h.position.x - last.x, h.position.z - last.z) > 0.05) { WM.trail.unshift({ x: h.position.x, z: h.position.z }); if (WM.trail.length > 600) WM.trail.pop(); }
    }
    // ปล้องตามรอยทางของหัว ห่างกันเท่าๆ กัน
    WM.segs.forEach((s, i) => {
      const t = WM.trail[Math.min(WM.trail.length - 1, Math.round(((i + 1) * WM_GAP) / 0.05))];
      s.position.x = t.x; s.position.z = t.z; s.position.y = 0.32 + Math.abs(Math.sin(G.t * 8 - i * 0.7)) * 0.06;
    });
    h.position.y = 0.38 + Math.abs(Math.sin(G.t * 8)) * 0.05;
    WM.cool -= dt;
    WM.fruits.forEach((f) => {
      if (f.eaten) return;
      f.g.rotation.y += dt; f.g.position.y = 0.35 + Math.sin(G.t * 2 + f.bob) * 0.05;
      if (G.state === 'play' && WM.cool <= 0 && Math.hypot(f.g.position.x - h.position.x, f.g.position.z - h.position.z) < 0.95) wmEat(f);
    });
  },
  draw(dt) { K3.render(dt); },
  onPartial() {},
  onCorrect() { K3.burst(WM.head, 0.6, 40); FX.text(innerWidth / 2, innerHeight * 0.45, WORDS.correct, '#34c98e'); },
  onWrong() {},
  clear() {
    WM.fruits.forEach((f) => { if (!f.eaten) { K3.unlabel(f.el); K3.remove(f.g); } }); WM.fruits = [];
    WM.grow.forEach((s) => { K3.unlabel(s.userData.el); K3.remove(s); }); WM.segs = WM.segs.filter((s) => WM.grow.indexOf(s) < 0); WM.grow = []; WM.eaten = 0;
    K3.clearCards();
  },
  onEnd() {},
};
`;
