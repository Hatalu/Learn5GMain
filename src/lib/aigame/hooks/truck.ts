/** รถส่งของเข้าบ้าน (จัดกลุ่ม): บ้าน = หมวด (ลำดับคงที่) รถขนกล่องของทีละชิ้น แตะบ้านให้รถขับไปส่ง */
export const TRUCK = String.raw`
const TK = { truck: null, box: null, label: null, houses: [], cats: '', busy: false, homeX: 0, wheels: [] };
const TK_Z = 1.6;
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
    const roof = K3.part(new T.BoxGeometry(2.7, 0.3, 2.2), '#6c5ce7', 0, 1.85, 0, g); roof.rotation.z = 0; K3.outline(roof, 0.04);
    K3.part(new T.BoxGeometry(0.8, 1.1, 0.1), INK, 0, 0.55, 0.92, g);
    [-1, 1].forEach((s) => K3.part(new T.BoxGeometry(0.45, 0.45, 0.06), '#fff7c2', s * 0.75, 1.05, 0.92, g));
    const box = K3.part(new T.BoxGeometry(1.2, 0.08, 0.6), '#ffffff', 0, 0.04, 1.6, g); box.castShadow = false;
    K3.tappable(g, i);
    const el = K3.choiceLabel(K3.group(0, 2.6, 0, g), name, i);
    TK.houses.push({ g: g, el: el, x: x, stock: [] });
  });
  K3.choiceCards(cats);
}
function tkLoad() {
  TK.truck.position.set(TK.homeX, 0, TK_Z); TK.truck.rotation.y = 0;
  TK.box.visible = true; TK.box.position.set(-0.5, 1.25, 0); K3.pop(TK.box, 1);
}
function tkDrive(x, sec, done) {
  const f = TK.truck.position.x, dist = Math.abs(x - f);
  K3.run(sec, (k) => {
    const e = ease.inOutSine(k);
    TK.truck.position.x = f + (x - f) * e;
    TK.truck.position.y = Math.abs(Math.sin(k * Math.PI * 6)) * 0.05;
  }, done);
}
function tkPick(i) {
  if (TK.busy) return;
  const h = TK.houses[i]; if (!h) return;
  TK.busy = true; K3.cardOn(i);
  Sound.tone(220, 0.25, 'square', 0.06);
  tkDrive(h.x, CONFIG.driveSec, () => {
    const res = answer(i);
    if (res !== false) { TK.busy = false; return; }
    K3.wiggle(h.g, 0.5);
    K3.run(0.3, (k) => { TK.truck.position.z = TK_Z + Math.sin(k * Math.PI) * 0.4; }, () => tkDrive(TK.homeX, 0.8, () => { TK.busy = false; K3.cardOn(-1); }));
  });
}

const Hooks = {
  setup() {
    const T = K3.THREE;
    tkCam(); window.addEventListener('resize', tkCam);
    K3.ground('#a6e08b', 60);
    const road = K3.part(new T.BoxGeometry(30, 0.1, 2.6), '#5b5f7a', 0, 0.02, TK_Z); road.castShadow = false;
    for (let x = -14; x <= 14; x += 2) K3.part(new T.BoxGeometry(1, 0.02, 0.12), '#ffffff', x, 0.08, TK_Z).castShadow = false;
    [[-12, -5], [12, -5], [-13, 5], [13, 6], [-6, 6.5], [7, 7]].forEach((p, i) => (i % 2 ? K3.tree(p[0], p[1], i) : K3.bush(p[0], p[1], i)));
    [[-12, 9, -30], [11, 11, -34]].forEach((p) => K3.cloud(p[0], p[1], p[2]));
    const tr = K3.group(0, 0, TK_Z);
    K3.outline(K3.part(new T.BoxGeometry(1.1, 1, 1.2), '#ff6b7a', 0, 0.75, 0.75, tr), 0.05);
    K3.part(new T.BoxGeometry(0.9, 0.4, 0.05), '#bfe9ff', 0, 0.95, 1.36, tr);
    K3.outline(K3.part(new T.BoxGeometry(1.2, 0.3, 1.8), '#ffd166', 0, 0.45, -0.5, tr), 0.05);
    const wg = new T.CylinderGeometry(0.28, 0.28, 0.2, 16);
    [[-0.62, 0.8], [0.62, 0.8], [-0.62, -0.8], [0.62, -0.8]].forEach((p) => { const w = K3.part(wg, INK, p[0], 0.28, p[1], tr); w.rotation.z = Math.PI / 2; TK.wheels.push(w); });
    tr.rotation.y = 0; TK.truck = tr;
    // รถหันไปทางขวา/ซ้ายตามถนน: ให้ด้านยาวขนานถนน
    tr.children.forEach((c) => { const x = c.position.x; c.position.x = c.position.z; c.position.z = -x; c.rotation.y += Math.PI / 2; });
    const box = K3.group(0, 0, 0, tr);
    K3.outline(K3.part(new T.BoxGeometry(0.9, 0.7, 0.9), '#e0b07a', 0, 0, 0, box), 0.05);
    K3.part(new T.BoxGeometry(0.92, 0.12, 0.2), '#c48a4a', 0, 0.2, 0, box);
    TK.box = box;
    TK.label = K3.label(K3.group(0, 1.1, 0, box), '', 'item');
    tkLoad();
    K3.onPick = tkPick;
  },
  onStart() { TK.busy = false; },
  onRead() {},
  spawn(q) {
    const key = q.choices.join('|');
    if (key !== TK.cats) { TK.cats = key; tkHouses(q.choices); } else K3.choiceCards(q.choices);
    TK.label.textContent = q.q;
    TK.busy = false; K3.cardOn(-1);
    tkLoad();
  },
  update(d, dt) { if (!TK.busy) TK.truck.position.y = Math.abs(Math.sin(G.t * 9)) * 0.02; },
  draw(dt) { K3.render(dt); },
  onCorrect(i) {
    const h = TK.houses[i], b = TK.box;
    const wp = new K3.THREE.Vector3(); b.getWorldPosition(wp);
    K3.run(0.45, (k) => { b.position.y = 1.25 + Math.sin(k * Math.PI) * 1.2; b.position.z = -k * 3.4; b.scale.setScalar(1 - k * 0.7); }, () => { b.visible = false; b.scale.setScalar(1); });
    K3.burst(h.g, 2, 28); K3.wiggle(h.g, 0.4);
    const c = K3.card(i); if (c) c.dataset.ok = '1';
  },
  onWrong() {},
  onPartial() {},
  clear() { TK.label.textContent = ''; },
  onEnd() {},
};
`;
