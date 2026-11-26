/**
 * ตกปลาคำตอบ (เกมทักษะ): ปลาแต่ละตัวถือป้ายคำตอบว่ายวนในบึง
 * 1 เหวี่ยง: ลากเล็งแล้วปล่อย ทุ่นลอยโค้งไปตกจุดนั้น ปลาที่อยู่ใกล้ที่สุด (ในระยะ) ว่ายมากินเบ็ด
 * 2 ดึง: กดค้าง = กรอสาย (ปลาเข้าใกล้) แต่สายตึงขึ้น ปลาดิ้นเป็นจังหวะ ปล่อยมือ = สายหย่อน สายตึงเกิน = ขาด ปลาหนี
 * ดึงขึ้นมาได้ = ตอบปลาตัวนั้น
 */
export const FISH = String.raw`
const FS = { me: null, rod: null, tip: null, bob: null, line: null, fish: [], phase: 'idle', aimFrom: null, hooked: null, tension: 0, prog: 0, hold: false, pull: 0, pullT: 0, biteT: 0, castTo: null };
const FS_POND = 6.2, FS_DOCK = { x: 0, z: 5.4 };
function fsCam() { const p = K3.portrait(); K3.camera.position.set(0, p ? 16 : 12.5, p ? 15 : 12.5); K3.camera.lookAt(0, 0, 1.4); }
function fsMakeFish(color) {
  const T = K3.THREE, g = K3.group(0, 0, 0), b = K3.group(0, 0, 0, g);
  const body = K3.part(new T.SphereGeometry(0.42, 18, 12), color, 0, 0, 0, b); body.scale.set(0.7, 0.6, 1.3); K3.outline(body, 0.06);
  const tail = K3.part(new T.ConeGeometry(0.3, 0.45, 3), color, 0, 0, -0.65, b); tail.rotation.x = Math.PI / 2; tail.scale.set(1, 1, 0.3);
  [-1, 1].forEach((s) => K3.part(new T.SphereGeometry(0.06, 8, 6), INK, s * 0.2, 0.1, 0.38, b));
  return { g: g, b: b, tail: tail };
}
function fsLine() {
  const T = K3.THREE, a = new T.Vector3(), c = new T.Vector3();
  FS.tip.getWorldPosition(a);
  (FS.hooked ? FS.hooked.g : FS.bob).getWorldPosition(c);
  const pos = FS.line.geometry.attributes.position;
  // สายหย่อนโค้งลงตรงกลางเมื่อไม่ตึง
  for (let i = 0; i <= 10; i++) {
    const k = i / 10, sag = (1 - Math.min(1, FS.tension)) * 0.9 * Math.sin(k * Math.PI);
    pos.setXYZ(i, a.x + (c.x - a.x) * k, a.y + (c.y - a.y) * k - sag, a.z + (c.z - a.z) * k);
  }
  pos.needsUpdate = true;
  FS.line.visible = FS.phase !== 'idle';
}
function fsBobHome() { FS.bob.visible = false; FS.phase = 'idle'; FS.hooked = null; FS.tension = 0; FS.prog = 0; K3.power(null); }
function fsCast(x, z) {
  const r = Math.hypot(x, z); if (r > FS_POND - 0.4) { x *= (FS_POND - 0.4) / r; z *= (FS_POND - 0.4) / r; }
  FS.phase = 'cast'; FS.bob.visible = true;
  const tip = new K3.THREE.Vector3(); FS.tip.getWorldPosition(tip);
  FS.bob.position.copy(tip);
  K3.run(0.25, (k) => { FS.rod.rotation.x = -0.9 + k * 1.4; });
  Sound.tone(900, 0.2, 'sine', 0.1, 300);
  K3.arc(FS.bob, { x: x, y: 0.05, z: z }, 2, 0.7, () => {
    K3.run(0.3, (k) => { FS.rod.rotation.x = 0.5 - k * 1.1; });
    Sound.tone(260, 0.12, 'sine', 0.15, 120); K3.burst(FS.bob, 0, 8);
    // ปลาที่ใกล้ที่สุดในระยะว่ายมากิน
    const near = FS.fish.map((f) => ({ f: f, d: Math.hypot(f.g.position.x - x, f.g.position.z - z) })).filter((o) => o.d < 3.2).sort((a, b) => a.d - b.d)[0];
    if (!near) { FS.phase = 'wait'; after(1.4, () => { say(WORDS.miss); fsBobHome(); }); return; }
    FS.phase = 'bite'; FS.hooked = near.f; FS.biteT = CONFIG.biteSec;
  });
}
function fsLand() {
  const f = FS.hooked; FS.phase = 'land';
  K3.power(null);
  K3.arc(f.g, { x: FS_DOCK.x + 0.8, y: 1.2, z: FS_DOCK.z - 0.4 }, 1.5, 0.5, () => {
    const res = answer(f.i);
    if (res === false) {
      // ปลาผิด: ปล่อยคืนบึง
      K3.arc(f.g, { x: (Math.random() - 0.5) * 6, y: 0.05, z: -1 - Math.random() * 3 }, 2, 0.7, () => { K3.burst(f.g, 0, 14); f.ang = Math.random() * 6.28; });
      fsBobHome();
      return;
    }
    K3.burst(f.g, 0.4, 36); f.caught = true; f.g.visible = false; f.el.style.display = 'none';
    fsBobHome();
  });
}

const Hooks = {
  setup() {
    const T = K3.THREE;
    fsCam(); window.addEventListener('resize', fsCam);
    K3.ground('#8edc6f', 60);
    const water = K3.part(new T.CircleGeometry(FS_POND, 48), '#4fb8ea', 0, 0.01, 0); water.rotation.x = -Math.PI / 2; water.castShadow = false;
    const rim = K3.part(new T.TorusGeometry(FS_POND, 0.25, 8, 48), '#c9b48a', 0, 0.02, 0); rim.rotation.x = -Math.PI / 2;
    for (let i = 0; i < 7; i++) { const a = i * 0.9 + 0.3; K3.part(new T.CylinderGeometry(0.5, 0.5, 0.05, 16), '#4cc06a', Math.cos(a) * 4.8, 0.04, Math.sin(a) * 4.2 - 0.5).castShadow = false; }
    [[-8, -3], [8, -4], [-7, 4], [8, 3]].forEach((p, i) => K3.tree(p[0], p[1], i));
    K3.part(new T.BoxGeometry(2.4, 0.2, 2.6), '#c48a4a', FS_DOCK.x, 0.25, FS_DOCK.z + 0.6);
    FS.me = K3.buddy('#3fb0f2'); FS.me.g.position.set(FS_DOCK.x, 0.35, FS_DOCK.z + 0.6); FS.me.g.rotation.y = Math.PI; FS.me.g.scale.setScalar(0.75);
    FS.rod = K3.group(0.55, 1.1, 0, FS.me.g);
    K3.part(new T.CylinderGeometry(0.035, 0.05, 2.6, 8), '#8a5a2b', 0, 1.2, 0, FS.rod);
    FS.tip = K3.group(0, 2.5, 0, FS.rod); FS.rod.rotation.x = -0.6;
    FS.bob = K3.group(0, 0, 0);
    K3.part(new T.SphereGeometry(0.16, 12, 10), '#ff6f61', 0, 0.08, 0, FS.bob); K3.part(new T.SphereGeometry(0.16, 12, 10), '#ffffff', 0, -0.05, 0, FS.bob);
    FS.bob.visible = false;
    const lg = new T.BufferGeometry(); lg.setAttribute('position', new T.BufferAttribute(new Float32Array(33), 3));
    FS.line = new T.Line(lg, new T.LineBasicMaterial({ color: '#2a2350' })); FS.line.frustumCulled = false; K3.scene.add(FS.line);
    K3.drag({
      start() { if (FS.phase === 'idle') FS.aimFrom = K3.toScreen(FS.me.g, 1.2); else if (FS.phase === 'reel') FS.hold = true; },
      move(p) { if (FS.aimFrom) K3.aimLine(FS.aimFrom.x, FS.aimFrom.y, p.x, p.y); },
      end(p) {
        FS.hold = false; K3.aimLine(null);
        if (!FS.aimFrom || FS.phase !== 'idle') { FS.aimFrom = null; return; }
        FS.aimFrom = null;
        const g = K3.groundAt(p.x, p.y, 0); if (g && Math.hypot(p.dx, p.dy) > 20) fsCast(g.x, g.z);
      },
      cancel() { FS.hold = false; FS.aimFrom = null; K3.aimLine(null); },
    });
    window.addEventListener('keydown', (e) => { if (e.key === ' ') { e.preventDefault(); if (FS.phase === 'reel') FS.hold = true; } });
    window.addEventListener('keyup', (e) => { if (e.key === ' ') FS.hold = false; });
  },
  onStart() {},
  onRead() {},
  spawn(q) {
    const ids = shuffle(K3.subset(q, 4));
    ids.forEach((ci, k) => {
      const f = fsMakeFish(['#ff9f43', '#ff6fae', '#ffcd3c', '#34c98e'][k % 4]);
      f.i = ci; f.ang = (k / ids.length) * 6.28 + Math.random(); f.rad = 2 + (k % 2) * 1.8; f.sp = 0.35 + Math.random() * 0.2;
      f.g.position.set(Math.cos(f.ang) * f.rad, 0.05, Math.sin(f.ang) * f.rad);
      f.el = K3.label(K3.group(0, 0.7, 0, f.g), q.choices[ci]); f.el.style.setProperty('--c', COLORS[ci % COLORS.length]);
      FS.fish.push(f); K3.pop(f.g, 1);
    });
    K3.cards(ids.map((ci) => q.choices[ci]), () => {});
    ids.forEach((ci, k) => K3.card(k).style.setProperty('--c', COLORS[ci % COLORS.length]));
    fsBobHome(); say(WORDS.castHint);
  },
  update(d, dt) {
    FS.fish.forEach((f) => {
      if (f.caught || f === FS.hooked && FS.phase !== 'bite') return;
      if (FS.phase === 'bite' && f === FS.hooked) {
        // ว่ายเข้าหาทุ่น
        const dx = FS.bob.position.x - f.g.position.x, dz = FS.bob.position.z - f.g.position.z, dd = Math.hypot(dx, dz);
        f.g.rotation.y = Math.atan2(dx, dz);
        if (dd > 0.15) { f.g.position.x += dx / dd * 1.6 * d; f.g.position.z += dz / dd * 1.6 * d; }
        FS.biteT -= d;
        if (FS.biteT <= 0) { FS.phase = 'reel'; FS.prog = 0; FS.tension = 0.3; FS.pullT = 0.6; Sound.tone(300, 0.2, 'square', 0.12); FX.shake(5); say(WORDS.reelHint); }
        return;
      }
      f.ang += f.sp * d;
      const x = Math.cos(f.ang) * f.rad, z = Math.sin(f.ang) * f.rad * 0.8 - 0.4;
      f.g.rotation.y = Math.atan2(x - f.g.position.x, z - f.g.position.z);
      f.g.position.x = x; f.g.position.z = z;
      f.tail.rotation.y = Math.sin(G.t * 9 + f.ang) * 0.4;
      f.g.position.y = 0.05 + Math.sin(G.t * 2 + f.ang) * 0.04;
    });
    if (FS.phase === 'reel' && d > 0) {
      const f = FS.hooked;
      // ปลาดิ้นเป็นจังหวะ: ช่วงดิ้นดึงสายแรง
      FS.pullT -= d; if (FS.pullT <= 0) { FS.pull = FS.pull > 0 ? 0 : 1; FS.pullT = FS.pull ? 0.5 + Math.random() * 0.4 : 0.8 + Math.random() * 0.8; }
      if (FS.hold) { FS.prog += 0.5 * d; FS.tension += (0.22 + FS.pull * 0.6) * d; } else { FS.prog = Math.max(0, FS.prog - 0.03 * d); FS.tension = Math.max(0, FS.tension - 1.2 * d); }
      K3.power(FS.tension);
      const pb = document.getElementById('power'); if (pb) pb.firstChild.style.background = FS.tension > 0.8 ? '#ff4d5e' : '';
      const sx = FS.bob.position.x, sz = FS.bob.position.z;
      f.g.position.x = sx + (FS_DOCK.x - sx) * FS.prog * 0.85 + (FS.pull ? Math.sin(G.t * 25) * 0.25 : 0);
      f.g.position.z = sz + (FS_DOCK.z - 0.8 - sz) * FS.prog * 0.85;
      f.b.rotation.z = FS.pull ? Math.sin(G.t * 30) * 0.5 : 0;
      FS.rod.rotation.x = -0.3 - FS.tension * 0.5;
      if (FS.tension >= 1) {
        // สายขาด
        say(WORDS.snap); FX.shake(6); Sound.tone(180, 0.3, 'sawtooth', 0.12);
        K3.arc(f.g, { x: f.g.position.x, y: 0.05, z: f.g.position.z - 1.5 }, 0.8, 0.5, () => { f.ang = Math.atan2(f.g.position.z + 0.4, f.g.position.x); });
        fsBobHome();
      } else if (FS.prog >= 1) fsLand();
    }
    if (FS.phase === 'idle') FS.rod.rotation.x += (-0.6 - FS.rod.rotation.x) * Math.min(1, dt * 4);
    if (FS.bob.visible && FS.phase !== 'cast') FS.bob.position.y = 0.05 + Math.sin(G.t * 4) * 0.03 - (FS.phase === 'bite' && FS.biteT < 0.4 ? 0.12 : 0);
    fsLine();
  },
  draw(dt) { K3.render(dt); },
  onCorrect() { FX.text(innerWidth / 2, innerHeight * 0.45, '+100', '#2fb5c9'); K3.run(0.5, (k) => { FS.me.g.position.y = 0.35 + Math.sin(k * Math.PI) * 0.6; }); },
  onWrong() {},
  onPartial() {},
  clear() { FS.fish.forEach((f) => { K3.unlabel(f.el); K3.remove(f.g); }); FS.fish = []; K3.clearCards(); fsBobHome(); },
  onEnd() {},
};
`;
