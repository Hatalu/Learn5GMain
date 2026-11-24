/**
 * เอียงโต๊ะลูกแก้ว (เกมทักษะ จัดกลุ่ม): หลุม = หมวด (ลำดับคงที่) ลูกแก้วถือป้ายของอยู่กลางโต๊ะ
 * ลากนิ้ว/เมาส์ (ทิศที่ลาก = ทิศที่โต๊ะเอียง) · ลูกศร · แท็บเล็ต/มือถือ = เอียงเครื่องจริง (deviceorientation)
 * ลูกแก้วเร่งตามความชันจริง (g sin θ) มีแรงเสียดทานกลิ้ง เด้งขอบโต๊ะ ผ่านหลุมช้าพอจึงตกลงหลุม เร็วไปจะกลิ้งข้าม
 */
export const TILT = String.raw`
const TL = { board: null, ball: null, body: null, label: null, holes: [], cats: '', v: { x: 0, z: 0 }, tx: 0, tz: 0, keys: { x: 0, z: 0 }, drag: null, dev: null, falling: false };
const TL_W = 4.7, TL_H = 3.1, TL_R = 0.38, TL_TOP = 0.15, TL_MAX = 0.22;
function tlCam() { const p = K3.portrait(); K3.camera.position.set(0, p ? 20 : 14.5, p ? 12 : 9.5); K3.camera.lookAt(0, 0, 0.5); }
const TL_POS = { 2: [[-3.5, 0], [3.5, 0]], 3: [[-3.5, -1.6], [3.5, -1.6], [0, 2.2]], 4: [[-3.6, -2.1], [3.6, -2.1], [-3.6, 2.1], [3.6, 2.1]] };
function tlHoles(cats) {
  const T = K3.THREE;
  TL.holes.forEach((h) => { K3.unlabel(h.el); K3.remove(h.g); }); TL.holes = [];
  const pos = TL_POS[cats.length] || TL_POS[4];
  cats.forEach((name, i) => {
    const c = COLORS[i % COLORS.length], g = K3.group(pos[i][0], TL_TOP + 0.01, pos[i][1], TL.board);
    const hole = K3.part(new T.CylinderGeometry(0.62, 0.62, 0.02, 28), '#1c2340', 0, 0, 0, g); hole.castShadow = false;
    const ring = K3.part(new T.TorusGeometry(0.66, 0.09, 8, 28), c, 0, 0.02, 0, g); ring.rotation.x = -Math.PI / 2;
    const el = K3.label(K3.group(0, 0.5, 0, g), name); el.style.setProperty('--c', c);
    TL.holes.push({ g: g, el: el, x: pos[i][0], z: pos[i][1] });
  });
  K3.cards(cats, () => {});
}
function tlReset() {
  TL.v.x = 0; TL.v.z = 0; TL.falling = false;
  TL.ball.position.set(0, TL_TOP + TL_R, 0); TL.ball.visible = true; K3.pop(TL.ball, 1);
}
function tlFall(i) {
  const h = TL.holes[i]; TL.falling = true; K3.cardOn(i);
  const f = { x: TL.ball.position.x, z: TL.ball.position.z };
  Sound.tone(300, 0.25, 'sine', 0.15, 120);
  K3.run(0.35, (k) => { TL.ball.position.set(f.x + (h.x - f.x) * k, TL_TOP + TL_R - k * 0.7, f.z + (h.z - f.z) * k); }, () => {
    const res = answer(i);
    if (res === false) {
      // ผิด: ลูกเด้งออกจากหลุมกลับมากลางโต๊ะ
      K3.wiggle(h.g, 0.5); FX.shake(4);
      K3.arc(TL.ball, { x: 0, y: TL_TOP + TL_R, z: 0 }, 1.6, 0.7, () => { TL.v.x = 0; TL.v.z = 0; TL.falling = false; K3.cardOn(-1); });
      return;
    }
    TL.ball.visible = false;
  });
}

const Hooks = {
  setup() {
    const T = K3.THREE;
    tlCam(); window.addEventListener('resize', tlCam);
    K3.ground('#ffd9c7', 60);
    K3.part(new T.CylinderGeometry(0.5, 0.8, 1.2, 16), '#c48a4a', 0, -0.6, 0);
    TL.board = K3.group(0, 0.1, 0);
    const top = K3.part(new T.BoxGeometry(TL_W * 2 + 0.6, 0.3, TL_H * 2 + 0.6), '#f6d8a8', 0, 0, 0, TL.board); top.castShadow = true;
    for (let z = -TL_H; z <= TL_H; z += 0.8) K3.part(new T.BoxGeometry(TL_W * 2, 0.01, 0.03), '#e4bd84', 0, TL_TOP + 0.005, z, TL.board).castShadow = false;
    [-1, 1].forEach((s) => {
      K3.outline(K3.part(new T.BoxGeometry(TL_W * 2 + 1, 0.5, 0.25), '#ff6f61', 0, 0.35, s * (TL_H + 0.4), TL.board), 0.04);
      K3.outline(K3.part(new T.BoxGeometry(0.25, 0.5, TL_H * 2 + 0.6), '#ff6f61', s * (TL_W + 0.4), 0.35, 0, TL.board), 0.04);
    });
    TL.ball = K3.group(0, 0, 0, TL.board);
    TL.body = K3.part(new T.SphereGeometry(TL_R, 24, 18), '#7fd0ff', 0, 0, 0, TL.ball); K3.outline(TL.body, 0.07);
    K3.part(new T.TorusGeometry(TL_R + 0.005, 0.04, 6, 24), '#ffffff', 0, 0, 0, TL.body).rotation.y = Math.PI / 2;
    K3.part(new T.SphereGeometry(TL_R * 0.3, 10, 8), '#ffffff', TL_R * 0.35, TL_R * 0.5, TL_R * 0.55, TL.ball);
    TL.label = K3.label(K3.group(0, 0.95, 0, TL.ball), '', 'item');
    // ลาก: ทิศที่ลากจากจุดกด = ทิศเอียง (ลากไกลขึ้น = ชันขึ้น)
    const c = K3.renderer.domElement;
    c.addEventListener('pointerdown', (e) => { TL.drag = { x: e.clientX, y: e.clientY, dx: 0, dy: 0 }; });
    c.addEventListener('pointermove', (e) => { if (TL.drag) { TL.drag.dx = e.clientX - TL.drag.x; TL.drag.dy = e.clientY - TL.drag.y; } });
    window.addEventListener('pointerup', () => { TL.drag = null; });
    const k = { ArrowLeft: ['x', -1], a: ['x', -1], ArrowRight: ['x', 1], d: ['x', 1], ArrowUp: ['z', -1], w: ['z', -1], ArrowDown: ['z', 1], s: ['z', 1] };
    window.addEventListener('keydown', (e) => { const m = k[e.key]; if (m) { e.preventDefault(); TL.keys[m[0]] = m[1]; } });
    window.addEventListener('keyup', (e) => { const m = k[e.key]; if (m) TL.keys[m[0]] = 0; });
    // เอียงเครื่องจริง (แท็บเล็ต/มือถือ) ถ้าเครื่องส่งค่ามา
    window.addEventListener('deviceorientation', (e) => { if (e.gamma === null || e.beta === null) return; TL.dev = { x: Math.max(-1, Math.min(1, e.gamma / 25)), z: Math.max(-1, Math.min(1, (e.beta - 35) / 25)) }; });
  },
  onStart() {},
  onRead() {},
  spawn(q) {
    const key = q.choices.join('|');
    if (key !== TL.cats) { TL.cats = key; tlHoles(q.choices); } else K3.cards(q.choices, () => {});
    TL.label.textContent = q.q;
    tlReset(); K3.cardOn(-1);
    say(WORDS.tiltHint);
  },
  update(d, dt) {
    // ทิศเอียงที่ต้องการ (-1..1)
    let ix = TL.keys.x, iz = TL.keys.z;
    if (TL.drag) { ix = Math.max(-1, Math.min(1, TL.drag.dx / 120)); iz = Math.max(-1, Math.min(1, TL.drag.dy / 120)); }
    else if (TL.dev && !ix && !iz) { ix = TL.dev.x; iz = TL.dev.z; }
    TL.tx += (ix * TL_MAX - TL.tx) * Math.min(1, dt * 6); TL.tz += (iz * TL_MAX - TL.tz) * Math.min(1, dt * 6);
    // โต๊ะเอียงให้เห็นพอรู้ทิศ (ครึ่งหนึ่งของมุมจริงที่ใช้คำนวณ) จะได้ไม่บังหลุม
    TL.board.rotation.z = -TL.tx * 0.45; TL.board.rotation.x = TL.tz * 0.45;
    if (TL.falling || !TL.ball.visible || G.state !== 'play' || d <= 0) return;
    // ลูกแก้วกลิ้ง: a = (5/7) g sin θ (ทรงกลมตันกลิ้งไม่ไถล) แรงเสียดทานกลิ้งเล็กน้อย
    const g = 9.8 * 5 / 7, b = TL.ball.position;
    TL.v.x += g * Math.sin(TL.tx) * d; TL.v.z += g * Math.sin(TL.tz) * d;
    const f = Math.pow(0.55, d); TL.v.x *= f; TL.v.z *= f;
    const ox = b.x, oz = b.z;
    b.x += TL.v.x * d; b.z += TL.v.z * d;
    if (Math.abs(b.x) > TL_W - TL_R) { b.x = Math.sign(b.x) * (TL_W - TL_R); TL.v.x *= -0.45; if (Math.abs(TL.v.x) > 0.5) Sound.tone(220, 0.05, 'sine', 0.08); }
    if (Math.abs(b.z) > TL_H - TL_R) { b.z = Math.sign(b.z) * (TL_H - TL_R); TL.v.z *= -0.45; if (Math.abs(TL.v.z) > 0.5) Sound.tone(220, 0.05, 'sine', 0.08); }
    const dx = b.x - ox, dz = b.z - oz, dd = Math.hypot(dx, dz);
    if (dd > 1e-5) TL.body.rotateOnWorldAxis(new K3.THREE.Vector3(dz / dd, 0, -dx / dd), dd / TL_R);
    // ตกหลุม: ศูนย์กลางลูกอยู่ในหลุม และไม่เร็วเกินไป
    const sp = Math.hypot(TL.v.x, TL.v.z);
    const i = TL.holes.findIndex((h) => Math.hypot(h.x - b.x, h.z - b.z) < 0.5);
    if (i >= 0 && sp < 6) tlFall(i);
  },
  draw(dt) { K3.render(dt); },
  onCorrect(i) {
    const h = TL.holes[i]; K3.burst(h.g, 0.5, 30); Sound.tone(700, 0.12, 'triangle', 0.15);
    const c = K3.card(i); if (c) c.dataset.ok = '1';
  },
  onWrong() {},
  onPartial() {},
  clear() { TL.label.textContent = ''; },
  onEnd() {},
};
`;
