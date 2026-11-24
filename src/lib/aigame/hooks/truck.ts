/**
 * รถส่งของเข้าบ้าน (จัดกลุ่ม): บ้าน = หมวด (ลำดับคงที่) รถขนกล่องของทีละชิ้น
 * แตะเลือก = รถขับไปส่งบ้านนั้น · เล็งเอง = ขับรถเองด้วยลูกศรซ้าย/ขวา (มีความเร่ง/เบรก) แล้วกดปุ่มขึ้นหรือแตะรถเพื่อส่งกล่อง
 * ล้อหมุนตามระยะทาง ตัวรถเอียงตอนเร่ง/เบรก กล่องลอยโค้งเข้าประตู
 */
export const TRUCK = String.raw`
const TK = { truck: null, box: null, label: null, houses: [], cats: '', busy: false, wheels: [], v: 0, steer: 0, lastX: 0 };
const TK_Z = 1.6, TK_WR = 0.28;
function tkCam() { const p = K3.portrait(); K3.camera.position.set(0, p ? 10 : 7.5, p ? 14 : 11); K3.camera.lookAt(0, 0.8, -1.2); }
function tkHouses(cats) {
  const T = K3.THREE;
  TK.houses.forEach((h) => { K3.unlabel(h.el); K3.remove(h.g); });
  TK.houses = []; K3.pickables = [];
  const n = cats.length, span = Math.min(10, 3.4 * (n - 1));
  cats.forEach((name, i) => {
    const x = n === 1 ? 0 : -span / 2 + (span * i) / (n - 1), c = COLORS[i % COLORS.length];
    const g = K3.group(x, 0, -2.6);
    K3.outline(K3.part(new T.BoxGeometry(2.3, 1.7, 1.8), c, 0, 0.85, 0, g), 0.04);
    const roof = K3.part(new T.ConeGeometry(1.95, 1, 4), '#ff6f61', 0, 2.2, 0, g); roof.rotation.y = Math.PI / 4; roof.scale.set(1, 1, 0.8); K3.outline(roof, 0.04);
    K3.part(new T.BoxGeometry(0.8, 1.1, 0.1), INK, 0, 0.55, 0.92, g);
    [-1, 1].forEach((s) => K3.part(new T.BoxGeometry(0.45, 0.45, 0.06), '#fff7c2', s * 0.75, 1.05, 0.92, g));
    K3.part(new T.BoxGeometry(1.2, 0.04, 0.9), '#ffffff', 0, 0.03, 1.45, g).castShadow = false;
    K3.tappable(g, i);
    const el = K3.choiceLabel(K3.group(0, 2.9, 0, g), name, i);
    TK.houses.push({ g: g, el: el, x: x });
  });
  K3.choiceCards(cats);
}
function tkLoad() {
  TK.v = 0; TK.truck.position.set(0, 0, TK_Z); TK.lastX = 0; TK.truck.rotation.set(0, 0, 0);
  TK.box.visible = true; TK.box.position.set(-0.55, 1.15, 0); TK.box.scale.setScalar(1); K3.pop(TK.box, 1);
}
function tkWheels(dx) { TK.wheels.forEach((w) => { w.rotation.y -= dx / TK_WR; }); }
function tkDrive(x, sec, done) {
  const f = TK.truck.position.x; let px = f;
  Sound.tone(110, 0.3, 'sawtooth', 0.04);
  K3.run(sec, (k) => {
    const e = ease.inOutSine(k), nx = f + (x - f) * e;
    tkWheels(nx - px); px = nx; TK.truck.position.x = nx;
    TK.truck.rotation.z = -Math.sin(k * Math.PI) * 0.04 * Math.sign(x - f);
  }, done);
}
function tkDeliver(i) {
  const h = TK.houses[i];
  const res = answer(i);
  if (res !== false) { TK.busy = false; return; }
  K3.wiggle(h.g, 0.5); FX.shake(4); Sound.tone(160, 0.2, 'triangle', 0.14);
  K3.run(0.3, (k) => { TK.truck.position.z = TK_Z + Math.sin(k * Math.PI) * 0.4; }, () => {
    if (CONFIG.aim) { TK.busy = false; K3.cardOn(-1); return; }
    tkDrive(0, 0.8, () => { TK.busy = false; K3.cardOn(-1); });
  });
}
function tkPick(i) {
  if (TK.busy) return;
  const h = TK.houses[i]; if (!h) return;
  TK.busy = true; K3.cardOn(i);
  tkDrive(h.x, CONFIG.driveSec, () => tkDeliver(i));
}
/* เล็งเอง: ส่งกล่องตรงที่รถจอดอยู่ */
function tkDrop() {
  if (TK.busy || G.state !== 'play' || !CONFIG.aim) return;
  const x = TK.truck.position.x;
  const i = TK.houses.findIndex((h) => Math.abs(h.x - x) < 0.9);
  if (i < 0) { say(WORDS.miss); K3.wiggle(TK.box, 0.4); return; }
  TK.busy = true; TK.v = 0; K3.cardOn(i);
  tkDeliver(i);
}

const Hooks = {
  setup() {
    const T = K3.THREE;
    tkCam(); window.addEventListener('resize', tkCam);
    K3.ground('#a6e08b', 60);
    const road = K3.part(new T.BoxGeometry(30, 0.1, 2.6), '#5b6378', 0, 0.02, TK_Z); road.castShadow = false;
    [-1, 1].forEach((s) => K3.part(new T.BoxGeometry(30, 0.12, 0.15), '#e6e9f0', 0, 0.03, TK_Z + s * 1.3).castShadow = false);
    for (let x = -14; x <= 14; x += 2) K3.part(new T.BoxGeometry(1, 0.02, 0.12), '#ffffff', x, 0.08, TK_Z).castShadow = false;
    [[-12, -5], [12, -5], [-13, 5], [13, 6], [-6, 6.5], [7, 7]].forEach((p, i) => (i % 2 ? K3.tree(p[0], p[1], i) : K3.bush(p[0], p[1], i)));
    [[-12, 9, -30], [11, 11, -34]].forEach((p) => K3.cloud(p[0], p[1], p[2]));
    // รถหันไปทาง +x: ห้องคนขับอยู่ด้านขวา กระบะอยู่ด้านซ้าย
    const tr = K3.group(0, 0, TK_Z);
    K3.outline(K3.part(new T.BoxGeometry(1.1, 1, 1.2), '#ff6f61', 0.75, 0.78, 0, tr), 0.05);
    K3.part(new T.BoxGeometry(0.05, 0.42, 0.95), '#bfe9ff', 1.31, 0.98, 0, tr);
    K3.part(new T.BoxGeometry(0.5, 0.4, 0.06), '#bfe9ff', 0.8, 0.98, 0.61, tr);
    K3.outline(K3.part(new T.BoxGeometry(1.8, 0.3, 1.2), '#ffcd3c', -0.5, 0.48, 0, tr), 0.05);
    [-1, 1].forEach((s) => K3.part(new T.BoxGeometry(1.8, 0.25, 0.06), '#f0b72c', -0.5, 0.75, s * 0.6, tr));
    const wg = new T.CylinderGeometry(TK_WR, TK_WR, 0.2, 18);
    [[0.8, 0.62], [0.8, -0.62], [-0.8, 0.62], [-0.8, -0.62]].forEach((p) => {
      const w = K3.part(wg, INK, p[0], TK_WR, p[1], tr); w.rotation.x = Math.PI / 2;
      K3.part(new T.CylinderGeometry(0.12, 0.12, 0.22, 10), '#d9dde8', 0, 0, 0, w);
      TK.wheels.push(w);
    });
    TK.truck = tr;
    const box = K3.group(0, 0, 0, tr);
    K3.outline(K3.part(new T.BoxGeometry(0.9, 0.7, 0.9), '#e0b07a', 0, 0, 0, box), 0.05);
    K3.part(new T.BoxGeometry(0.92, 0.12, 0.2), '#c48a4a', 0, 0.2, 0, box);
    TK.box = box;
    TK.label = K3.label(K3.group(0, 1.1, 0, box), '', 'item');
    tkLoad();
    K3.onPick = tkPick; K3.aimGame = true;
    if (CONFIG.aim) {
      K3.pad(['l', 'u', 'r'], (d) => { if (d === 'u') tkDrop(); else TK.steer = d === 'l' ? -1 : 1; });
      window.addEventListener('pointerup', () => { TK.steer = 0; });
      window.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft' || e.key === 'a') TK.steer = -1; if (e.key === 'ArrowRight' || e.key === 'd') TK.steer = 1; if (e.key === 'ArrowUp' || e.key === ' ' || e.key === 'w') { e.preventDefault(); tkDrop(); } });
      window.addEventListener('keyup', (e) => { if (/Arrow(Left|Right)|^[ad]$/.test(e.key)) TK.steer = 0; });
      K3.renderer.domElement.addEventListener('click', (e) => { if (K3.pick(e, [TK.truck])) tkDrop(); });
    }
  },
  onStart() { TK.busy = false; },
  onRead() {},
  spawn(q) {
    const key = q.choices.join('|');
    if (key !== TK.cats) { TK.cats = key; tkHouses(q.choices); } else K3.choiceCards(q.choices);
    TK.label.textContent = q.q;
    TK.busy = false; K3.cardOn(-1);
    tkLoad();
    if (CONFIG.aim) say(WORDS.driveHint);
  },
  update(d, dt) {
    const tr = TK.truck;
    if (CONFIG.aim && !TK.busy && G.state === 'play') {
      // ความเร่ง/เบรกแบบรถจริง: ปล่อยปุ่มแล้วไหลต่อก่อนหยุด
      TK.v += TK.steer * 14 * d; TK.v *= Math.pow(TK.steer ? 0.6 : 0.08, d);
      TK.v = Math.max(-7, Math.min(7, TK.v));
      const lim = Math.max(3, ...TK.houses.map((h) => Math.abs(h.x))) + 1.2;
      const nx = Math.max(-lim, Math.min(lim, tr.position.x + TK.v * d));
      if (Math.abs(nx) >= lim) TK.v = 0;
      tkWheels(nx - tr.position.x); tr.position.x = nx;
      tr.rotation.z += ((-TK.steer * 0.05) - tr.rotation.z) * Math.min(1, dt * 6);
      const near = TK.houses.findIndex((h) => Math.abs(h.x - nx) < 0.9); K3.cardOn(near);
    }
    if (!TK.busy && Math.abs(TK.v) < 0.1) tr.position.y = Math.abs(Math.sin(G.t * 9)) * 0.015;
  },
  draw(dt) { K3.render(dt); },
  onCorrect(i) {
    const h = TK.houses[i], b = TK.box, f = { x: b.position.x, y: b.position.y, z: b.position.z };
    K3.run(0.55, (k) => { b.position.set(f.x + (0.6 - f.x) * k, f.y + Math.sin(k * Math.PI) * 1.4 - k * 0.6, f.z - k * 3.6); b.rotation.x = -k * 1.5; b.scale.setScalar(1 - k * 0.6); }, () => { b.visible = false; b.rotation.set(0, 0, 0); });
    K3.burst(h.g, 2, 28); K3.wiggle(h.g, 0.4); Sound.tone(700, 0.12, 'triangle', 0.15);
    const c = K3.card(i); if (c) c.dataset.ok = '1';
  },
  onWrong() {},
  onPartial() {},
  clear() { TK.label.textContent = ''; },
  onEnd() {},
};
`;
