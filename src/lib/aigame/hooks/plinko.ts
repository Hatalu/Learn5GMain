/**
 * ปล่อยลูกแก้วลงช่องคำตอบ (เกมทักษะ): เครื่องปล่อยแกว่งซ้ายขวา แตะ/เว้นวรรคเพื่อปล่อย
 * ลูกแก้วตกด้วยแรงโน้มถ่วง ชนหมุดสะท้อนตามแนวตั้งฉาก (มีการสูญเสียพลังงาน) ผนังกั้นช่อง แล้วนอนนิ่งในช่องไหนตอบช่องนั้น
 * ฟิสิกส์ 2 มิติบนกระดาน (แกน x, y) แบ่งขั้นย่อยทุกเฟรม ลูกไม่ทะลุหมุด
 */
export const PLINKO = String.raw`
const PK = { ball: null, dropper: null, pegs: [], slots: [], ids: [], ball2: null, v: null, busy: false, t0: 0, W: 4.5, last: 0 };
const PK_R = 0.27, PK_PR = 0.13, PK_TOP = 8.1, PK_SLOT = 1.25, PK_G = 16;
function pkCam() { const p = K3.portrait(); K3.camera.position.set(0, 5.3, p ? 21 : 17); K3.camera.lookAt(0, 5.4, 0); }
const pkSlotW = () => (PK.W * 2) / PK.ids.length;
function pkDrop() {
  if (PK.busy || G.state !== 'play' || G.paused || !PK.ids.length) return;
  PK.busy = true; PK.v = { x: (Math.random() - 0.5) * 0.3, y: 0 };
  PK.ball.position.set(PK.dropper.position.x, PK_TOP - 0.5, 0.25);
  Sound.tone(500, 0.08, 'sine', 0.15);
}
function pkReset() { PK.v = null; PK.busy = false; PK.ball.position.set(PK.dropper.position.x, PK_TOP - 0.5, 0.25); }
/* ลูกหยุดแล้ว: ช่องไหน */
function pkLand() {
  const k = Math.max(0, Math.min(PK.ids.length - 1, Math.floor((PK.ball.position.x + PK.W) / pkSlotW())));
  PK.v = null;
  const s = PK.slots[k];
  K3.cardOn(k);
  const res = answer(PK.ids[k]);
  if (res === false) { K3.wiggle(s.g, 0.5); after(0.9, () => { K3.pop(PK.ball, 1); pkReset(); K3.cardOn(-1); }); return; }
  if (res === true && G.state === 'play') after(0.6, pkReset);
}
function pkStep(h) {
  const b = PK.ball.position, v = PK.v;
  v.y -= PK_G * h;
  b.x += v.x * h; b.y += v.y * h;
  // หมุด: ดันออก + สะท้อนความเร็วตามแนวตั้งฉาก (e = 0.5) + สุ่มเล็กน้อยกันค้างบนหัวหมุด
  for (const p of PK.pegs) {
    const dx = b.x - p.x, dy = b.y - p.y, d = Math.hypot(dx, dy), m = PK_R + PK_PR;
    if (d < m && d > 1e-4) {
      const nx = dx / d, ny = dy / d; b.x = p.x + nx * m; b.y = p.y + ny * m;
      const vn = v.x * nx + v.y * ny;
      if (vn < 0) { v.x -= 1.3 * vn * nx; v.y -= 1.3 * vn * ny; v.x += (Math.random() - 0.5) * 0.2; v.x *= 0.8; if (performance.now() - PK.last > 60) { PK.last = performance.now(); Sound.tone(700 + b.y * 60, 0.05, 'triangle', 0.08); } }
    }
  }
  // ผนังข้าง
  if (Math.abs(b.x) > PK.W - PK_R) { b.x = Math.sign(b.x) * (PK.W - PK_R); v.x *= -0.5; }
  // ผนังกั้นช่อง (เฉพาะช่วงล่าง)
  if (b.y < PK_SLOT + PK_R) for (let k = 1; k < PK.ids.length; k++) {
    const wx = -PK.W + k * pkSlotW();
    if (Math.abs(b.x - wx) < PK_R + 0.06) { b.x = wx + Math.sign(b.x - wx || 1) * (PK_R + 0.06); v.x *= -0.4; }
  }
  // พื้นช่อง
  if (b.y < PK_R + 0.1) { b.y = PK_R + 0.1; if (Math.abs(v.y) > 1.2) v.y *= -0.3; else v.y = 0; v.x *= 0.92; }
  PK.ball.rotation.z -= v.x * h / PK_R;
  // กันค้าง: ช้ามากแต่ยังไม่ถึงพื้น เกิน 0.4 วิ = เขี่ยเข้ากลางกระดาน
  if (b.y > PK_R + 0.3 && Math.hypot(v.x, v.y) < 0.6) { PK.still = (PK.still || 0) + h; if (PK.still > 0.4) { v.x = -Math.sign(b.x || 1) * 1.5; v.y = 1; PK.still = 0; } } else PK.still = 0;
}

const Hooks = {
  setup() {
    const T = K3.THREE;
    pkCam(); window.addEventListener('resize', pkCam);
    K3.ground('#ffd9a8', 60);
    const board = K3.part(new T.BoxGeometry(PK.W * 2 + 0.8, 9.4, 0.3), '#2f3e66', 0, 4.55, -0.25); board.castShadow = false;
    K3.part(new T.BoxGeometry(PK.W * 2 + 0.4, 9, 0.05), '#ffffff', 0, 4.55, -0.08).castShadow = false;
    [-1, 1].forEach((s) => K3.outline(K3.part(new T.BoxGeometry(0.3, 9.4, 0.7), '#ffcd3c', s * (PK.W + 0.2), 4.55, 0.1), 0.04));
    K3.outline(K3.part(new T.BoxGeometry(PK.W * 2 + 0.7, 0.3, 0.7), '#ffcd3c', 0, -0.05, 0.1), 0.04);
    // หมุดสลับแถว
    const pg = new T.CylinderGeometry(PK_PR, PK_PR, 0.55, 12);
    for (let r = 0; r < 4; r++) {
      const y = 6.6 - r * 1.25, off = r % 2 ? 0.7 : 0;
      for (let x = -PK.W + 1.05 + off; x < PK.W - 0.95; x += 1.4) {
        const m = K3.part(pg, ['#ff6f61', '#34c98e', '#3fb0f2'][r % 3], x, y, 0.2); m.rotation.x = Math.PI / 2;
        PK.pegs.push({ x: x, y: y });
      }
    }
    PK.dropper = K3.group(0, PK_TOP, 0.25);
    K3.outline(K3.part(new T.CylinderGeometry(0.5, 0.3, 0.6, 18), '#ff6f61', 0, 0.2, 0, PK.dropper), 0.06);
    K3.part(new T.BoxGeometry(PK.W * 2, 0.1, 0.1), '#8a90a8', 0, PK_TOP + 0.55, 0.25);
    PK.ball = K3.group(0, 0, 0);
    K3.outline(K3.part(new T.SphereGeometry(PK_R, 22, 16), '#7fd0ff', 0, 0, 0, PK.ball), 0.08);
    K3.part(new T.SphereGeometry(PK_R * 0.35, 10, 8), '#ffffff', PK_R * 0.4, PK_R * 0.4, PK_R * 0.6, PK.ball);
    pkReset();
    const go = (e) => { if (e && e.target && e.target.closest && e.target.closest('button')) return; pkDrop(); };
    K3.renderer.domElement.addEventListener('pointerdown', go);
    window.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'ArrowDown') { e.preventDefault(); pkDrop(); } });
  },
  onStart() {},
  onRead() {},
  spawn(q) {
    const T = K3.THREE;
    PK.ids = shuffle(K3.subset(q, 4));
    const w = pkSlotW();
    PK.ids.forEach((ci, k) => {
      const x = -PK.W + w * (k + 0.5), g = K3.group(x, 0, 0);
      const floor = K3.part(new T.BoxGeometry(w - 0.12, 0.12, 0.6), COLORS[ci % COLORS.length], 0, 0.06, 0.1, g); floor.castShadow = false;
      if (k > 0) K3.part(new T.BoxGeometry(0.1, PK_SLOT, 0.6), '#ffcd3c', -w / 2, PK_SLOT / 2, 0.1, g);
      const el = K3.label(K3.group(0, 0.95, 0.4, g), q.choices[ci]); el.style.setProperty('--c', COLORS[ci % COLORS.length]); el.classList.add('slot');
      PK.slots.push({ g: g, el: el });
    });
    K3.cards(PK.ids.map((ci) => q.choices[ci]), () => {});
    PK.ids.forEach((ci, k) => K3.card(k).style.setProperty('--c', COLORS[ci % COLORS.length]));
    PK.t0 = G.t; pkReset();
    say(WORDS.holdHint);
  },
  update(d, dt) {
    if (!PK.busy) {
      // แกว่งแบบลูกตุ้ม: ช้าตรงขอบ เร็วตรงกลาง
      PK.dropper.position.x = Math.sin((G.t - PK.t0) * 6.283 / CONFIG.swaySec) * (PK.W - 0.6);
      PK.ball.position.x = PK.dropper.position.x;
    }
    if (PK.v && d > 0) {
      const n = 6; for (let i = 0; i < n; i++) pkStep(Math.min(d, 0.05) / n);
      if (PK.ball.position.y < PK_R + 0.12 && Math.abs(PK.v.x) < 0.25 && Math.abs(PK.v.y) < 0.3) pkLand();
    }
  },
  draw(dt) { K3.render(dt); },
  onCorrect() {
    const k = Math.max(0, Math.min(PK.ids.length - 1, Math.floor((PK.ball.position.x + PK.W) / pkSlotW())));
    K3.burst(PK.slots[k].g, 1, 40); FX.text(innerWidth / 2, innerHeight * 0.45, '+100', '#ff9f43');
    const c = K3.card(k); if (c) c.dataset.ok = '1';
  },
  onWrong() {},
  onPartial() {},
  clear() { PK.slots.forEach((s) => { K3.unlabel(s.el); K3.remove(s.g); }); PK.slots = []; PK.ids = []; K3.clearCards(); PK.v = null; PK.busy = false; },
  onEnd() {},
};
`;
