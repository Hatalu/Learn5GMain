/**
 * "เครื่องยนต์เกม" สำเร็จรูปที่แนบไปใน prompt: Gemini ต้องสร้างเกมบนโครงนี้ (ใส่แค่ Hooks + ภาพ)
 * แก้ปัญหาที่ครูเจอจริง: กด Start ไม่ได้ / ไม่มีโจทย์ขึ้น / ตอบแล้วไม่ไปข้อต่อไป / เกมเร็วเกิน
 * - ปุ่มทุกปุ่มผูกด้วย addEventListener ในสคริปต์ (ใช้ได้ทั้ง <script> ธรรมดาและ type="module")
 * - เวลาทั้งหมดเดินในลูปเกม (หยุดตอนพัก + ปรับตามแถบความเร็ว) ไม่ใช้ setTimeout
 * - โจทย์อยู่ใน DOM (#qtext) ไม่วาดบน canvas: ภาษาไทยแสดงถูกเสมอ
 * - หน้าจอแสดง/ซ่อนด้วย body[data-state] + display:none (ของที่ซ่อนจะไม่บังการกด)
 * ทดสอบการไหลของเกมจริงในเบราว์เซอร์แล้ว (scripts/aigame-engine-test.html)
 * ห้ามใช้ backtick และ ${} ในโค้ดข้างใน (อยู่ใน String.raw)
 */

export const ENGINE_HTML = String.raw`<div id="app">
  <div id="world"></div>                 <!-- the game scene: SVG/DOM sprites (2D) or the 3D renderer canvas -->
  <div id="labels"></div>                <!-- answer labels / signs (HTML text over the scene) -->
  <canvas id="fx"></canvas>              <!-- FX particles only, pointer-events: none -->
  <header id="hud">
    <div id="score">0</div><div id="progress"></div><div id="combo"></div><div id="hearts"></div>
    <div id="timebar"><i></i></div>
    <button id="btn-pause" aria-label="pause"></button>
  </header>
  <div id="qcard"><div id="qtext"></div><button id="btn-ready"></button></div>
  <div id="bubble"></div>                <!-- mascot speech bubble: hints and cheers -->
  <section id="screen-start" class="screen">  <!-- title, mascot, #btn-start, #btn-sound --> </section>
  <section id="screen-pause" class="screen">  <!-- #btn-resume, #btn-restart, #btn-sound2, <input id="speed" type="range" min="0.5" max="1.5" step="0.1" value="1"> --> </section>
  <section id="screen-result" class="screen"> <!-- #stars, #result-score, #result-count, #missed (list), #btn-again --> </section>
</div>`;

export const ENGINE_CSS = String.raw`html, body { margin: 0; height: 100%; overflow: hidden; }
#app { position: fixed; inset: 0; overflow: hidden; touch-action: none; user-select: none; -webkit-user-select: none; }
#world { position: absolute; inset: 0; z-index: 1; }
#labels { position: absolute; inset: 0; z-index: 4; pointer-events: none; }
#labels > * { position: absolute; left: 0; top: 0; pointer-events: auto; }
.k3-fail { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; padding: 24px; text-align: center; font-size: 22px; }
#fx { position: absolute; inset: 0; width: 100%; height: 100%; z-index: 5; pointer-events: none; }
#hud { position: absolute; top: 0; left: 0; right: 0; z-index: 10; }
#qcard { position: absolute; z-index: 12; left: 50%; transform: translateX(-50%); transition: all .35s cubic-bezier(.34,1.56,.64,1); }
#bubble { position: absolute; z-index: 13; pointer-events: none; }
.screen { position: absolute; inset: 0; z-index: 30; display: none; }
body[data-state="start"] #screen-start, body[data-state="result"] #screen-result, body[data-paused="1"] #screen-pause { display: flex; }
body[data-state="start"] #hud, body[data-state="start"] #qcard, body[data-state="result"] #hud, body[data-state="result"] #qcard { display: none; }
body[data-state="read"] #qcard { top: 42%; font-size: 1.35em; }   /* READ: question big in the middle */
body:not([data-state="read"]) #qcard { top: 64px; }                /* PLAY: question in the HUD area */
body:not([data-state="read"]) #btn-ready, #btn-ready[data-on="0"] { display: none; }`;

export const ENGINE_JS = String.raw`/* ================= STARTER ENGINE: keep this code, only add to it ================= */
const $ = (id) => document.getElementById(id);
function safe(fn) { try { return fn(); } catch (e) { console.warn('[game]', e); } }
/* null-safe DOM helpers: a missing element must never stop the game */
function txt(id, v) { const el = $(id); if (el) el.textContent = v; }
function attr(id, k, v) { const el = $(id); if (el) el.dataset[k] = v; }
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
};
const ease = {
  outBack: (t) => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2),
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  outElastic: (t) => (t === 0 || t === 1 ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI) / 3) + 1),
};
const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

const G = {
  state: 'boot', paused: false, t: 0, speed: 1, sound: true,
  idx: 0, order: [], q: null, token: 0, tries: 0, picked: new Set(),
  score: 0, combo: 0, wrongRow: 0, firstTry: 0, missed: [], hearts: CONFIG.lives, timeLeft: 0,
  waits: [], tweens: [],
};

/* boot() is called once at the very end of the script, after Hooks is defined */
function boot() {
  on('btn-start', startGame);
  on('btn-again', startGame);
  on('btn-ready', () => { if (G.state === 'read' && G.t >= 1) beginPlay(); });
  on('btn-pause', () => pause(true));
  on('btn-resume', () => pause(false));
  on('btn-restart', startGame);
  ['btn-sound', 'btn-sound2'].forEach((id) => on(id, () => { G.sound = !G.sound; document.body.dataset.sound = G.sound ? '1' : '0'; }));
  const sp = $('speed'); if (sp) sp.addEventListener('input', () => { G.speed = Number(sp.value) || 1; });
  document.addEventListener('visibilitychange', () => { if (document.hidden && (G.state === 'play' || G.state === 'read')) pause(true); });
  safe(FX.size); window.addEventListener('resize', () => safe(FX.size));
  safe(() => Hooks.setup());
  setState('start');
  requestAnimationFrame(frame);   // started exactly once
}

/* game-time timers: pause with the game, follow the speed slider, die when the state changes */
function after(sec, fn) { G.waits.push({ left: sec, fn: fn, tk: G.token, st: G.state }); }
/* tween any numeric props of an object: tween(sprite, { x: 100, scale: 1 }, 0.4, ease.outBack) */
function tween(obj, to, sec, fn, done) {
  const from = {}; for (const k in to) from[k] = obj[k];
  G.tweens = G.tweens.filter((w) => w.obj !== obj || !Object.keys(to).some((k) => k in w.to));
  G.tweens.push({ obj: obj, from: from, to: to, sec: sec, t: 0, fn: fn || ease.outCubic, done: done });
}

function setState(s) {
  G.state = s; G.t = 0; G.waits = [];
  document.body.dataset.state = s;
}
function pause(on) {
  if (G.state === 'start' || G.state === 'result' || G.state === 'boot') on = false;
  G.paused = on; document.body.dataset.paused = on ? '1' : '0';
}

/* normalize one question: shuffled choices (kept in place when CONFIG.keepOrder, e.g. sorting bins),
   correct = indexes into the shuffled choices; ordered = the correct choices must be hit in that order */
function prepare(raw) {
  const choices = raw.choices ? raw.choices.slice() : [];
  const correct = Array.isArray(raw.answers) ? raw.answers.slice() : [raw.answer];
  const idx = choices.map((_, i) => i);
  const perm = CONFIG.keepOrder ? idx : shuffle(idx);
  return {
    raw: raw, q: raw.q, hint: raw.hint || '', explain: raw.explain || '', ordered: !!raw.order,
    choices: perm.map((i) => choices[i]),
    correct: correct.map((c) => perm.indexOf(c)),
  };
}
/* the correct choice(s) as text: the remaining steps for an ordered question */
function answerText(q) { return q.ordered ? q.correct.slice(G.picked.size).map((c) => q.choices[c]).join(' > ') : q.correct.map((c) => q.choices[c]).join(', '); }
function readTime(q) { return Math.max(CONFIG.readMinSec || 0, q.q.length * (CONFIG.readPerCharSec || 0)); }

function startGame() {
  safe(Sound.init);
  pause(false);
  G.order = shuffle(QUESTIONS.map((_, i) => i));
  G.idx = 0; G.score = 0; G.combo = 0; G.wrongRow = 0; G.firstTry = 0; G.missed = []; G.hearts = CONFIG.lives;
  safe(() => Hooks.onStart());
  nextQuestion();
}
function nextQuestion() {
  safe(() => Hooks.clear());
  if (G.idx >= G.order.length) return endGame();
  G.token++; G.tries = 0; G.picked = new Set();
  G.q = prepare(QUESTIONS[G.order[G.idx]]);
  txt('qtext', G.q.q);
  txt('progress', (G.idx + 1) + ' / ' + G.order.length);
  say('');
  if (!CONFIG.readMinSec) return beginPlay();
  setState('read');
  attr('btn-ready', 'on', '0');
  after(1, () => attr('btn-ready', 'on', '1'));
  after(readTime(G.q), beginPlay);
  safe(() => Hooks.onRead(G.q));
}
function beginPlay() {
  setState('play');
  G.timeLeft = CONFIG.timerSec;
  safe(() => Hooks.spawn(G.q));
}

/* The game calls answer(i) ONCE when the player hits choice i. Returns true/false, or null if ignored. */
function answer(i) {
  if (G.state !== 'play' || G.paused || G.t < CONFIG.inputLockSec) return null;
  const q = G.q;
  const hit = q.ordered ? i === q.correct[G.picked.size] : q.correct.indexOf(i) >= 0 && !G.picked.has(i);
  if (hit) {
    G.picked.add(i);
    if (G.picked.size < q.correct.length) { safe(() => Hooks.onPartial(i)); Sound.play('pop'); return true; }
    const bonus = CONFIG.timerSec && G.timeLeft > 0 ? Math.round(50 * G.timeLeft / CONFIG.timerSec) : 0;
    G.score += 100 + G.combo * 20 + bonus; G.combo++; G.wrongRow = 0;
    if (G.tries === 0) G.firstTry++;
    if (CONFIG.lives && G.combo >= 2 && G.hearts === 0) G.hearts = CONFIG.lives;
    setState('feedback');
    say(q.explain || WORDS.correct);
    Sound.play('correct');
    safe(() => Hooks.onCorrect(i));
    after(CONFIG.feedbackCorrectSec + (q.explain ? 1 : 0), () => { G.idx++; nextQuestion(); });
    return true;
  }
  G.tries++; G.combo = 0; G.wrongRow++;
  if (G.tries === 1) G.missed.push(q);
  if (CONFIG.lives && G.hearts > 0) G.hearts--;
  setState('feedback');
  say(G.tries >= 2 ? WORDS.reveal + ' ' + answerText(q) : (q.hint || WORDS.wrong));
  Sound.play('wrong');
  safe(() => Hooks.onWrong(i, G.tries));
  after(CONFIG.feedbackWrongSec, () => setState('play'));   // same question, same objects, keep playing
  return false;
}

function endGame() {
  setState('result');
  const n = G.order.length, acc = n ? G.firstTry / n : 0;
  const stars = acc >= 0.9 ? 3 : acc >= 0.6 ? 2 : 1;
  attr('stars', 'stars', String(stars));
  txt('result-score', String(G.score));
  txt('result-count', G.firstTry + ' / ' + n);
  const ul = $('missed'); if (ul) ul.innerHTML = '';
  if (ul) G.missed.forEach((q) => { const li = document.createElement('li'); li.textContent = q.q + '  ->  ' + q.correct.map((c) => q.choices[c]).join(q.ordered ? ' > ' : ', '); ul.appendChild(li); });
  Sound.play('win');
  safe(() => Hooks.onEnd(stars));
}

function say(text) { txt('bubble', text); attr('bubble', 'on', text ? '1' : '0'); }

function hud() {
  txt('score', String(G.score));
  txt('combo', G.combo > 1 ? 'x' + G.combo : '');
  attr('hearts', 'n', String(G.hearts));
  const bar = $('timebar');
  if (!bar) return;
  bar.style.display = CONFIG.timerSec && G.state !== 'read' ? '' : 'none';
  if (CONFIG.timerSec) bar.firstElementChild.style.width = (100 * Math.max(0, G.timeLeft) / CONFIG.timerSec) + '%';
}

/* ONE loop for the whole page. dt is in seconds and clamped. */
let lastNow = 0;
function frame(now) {
  const raw = lastNow ? (now - lastNow) / 1000 : 0;
  lastNow = now;
  const dt = Math.min(raw, 0.1);              // movement step (a long pause or tab switch never teleports things)
  const live = !G.paused && G.state !== 'boot';
  const d = live ? dt * G.speed : 0;          // game time: frozen when paused, scaled by the speed slider
  const flow = live ? Math.min(raw, 0.5) * G.speed : 0;   // timers keep real pace even on a slow device
  if (live) {
    G.t += flow;
    const due = [];
    G.waits = G.waits.filter((w) => ((w.left -= flow) > 0 ? true : (due.push(w), false)));
    due.forEach((w) => { if (w.tk === G.token && w.st === G.state) safe(w.fn); });
    if (G.state === 'play' && CONFIG.timerSec && G.timeLeft > 0) {
      G.timeLeft -= flow;
      if (G.timeLeft <= 0) say(G.q.hint || WORDS.wrong);
    }
  }
  G.tweens = G.tweens.filter((w) => {
    w.t = Math.min(1, w.t + dt / w.sec);   // tweens use real time so menus still animate
    const k = w.fn(w.t);
    for (const p in w.to) w.obj[p] = w.from[p] + (w.to[p] - w.from[p]) * k;
    if (w.t >= 1 && w.done) safe(w.done);
    return w.t < 1;
  });
  safe(() => Hooks.update(d, dt));
  safe(() => Hooks.draw(dt));
  safe(() => FX.step(dt));
  safe(hud);
  requestAnimationFrame(frame);
}

/* tiny Web Audio synth; silent if audio is not allowed */
const Sound = {
  ctx: null,
  init() { if (!Sound.ctx) { const A = window.AudioContext || window.webkitAudioContext; if (A) Sound.ctx = new A(); } if (Sound.ctx && Sound.ctx.state === 'suspended') Sound.ctx.resume(); },
  tone(f, dur, type, vol, slide) {
    safe(() => {
      const c = Sound.ctx; if (!c || !G.sound) return;
      const o = c.createOscillator(), g = c.createGain(), t = c.currentTime;
      o.type = type || 'sine'; o.frequency.setValueAtTime(f, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
      g.gain.setValueAtTime(vol || 0.2, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur);
    });
  },
  play(name) {
    if (name === 'pop') Sound.tone(600, 0.12, 'sine', 0.25, 1200);
    if (name === 'correct') { Sound.tone(880, 0.15, 'triangle', 0.2); setTimeout(() => Sound.tone(1320, 0.25, 'triangle', 0.2), 110); }
    if (name === 'wrong') Sound.tone(300, 0.25, 'sine', 0.15, 200);
    if (name === 'tap') Sound.tone(500, 0.06, 'sine', 0.12);
    if (name === 'win') [523, 659, 784, 1047].forEach((f, k) => setTimeout(() => Sound.tone(f, 0.3, 'triangle', 0.18), k * 120));
  },
};

/* FX on the #fx canvas, in window pixels: FX.burst(x, y) confetti, FX.text(x, y, '+100') floating text, FX.shake(8) */
const FX = {
  parts: [], texts: [], ctx: null, dpr: 1, sk: 0, ska: 0,
  size() { const c = $('fx'); if (!c) return; FX.dpr = Math.min(window.devicePixelRatio || 1, 2); c.width = innerWidth * FX.dpr; c.height = innerHeight * FX.dpr; FX.ctx = c.getContext('2d'); },
  burst(x, y, colors, n) {
    colors = colors || ['#ffd166', '#ff6b7a', '#4fb3ff', '#3fd6a8', '#c9b8ff']; n = Math.min(n || 22, 40);
    for (let k = 0; k < n; k++) { const a = Math.random() * 6.283, s = 140 + Math.random() * 280; FX.parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 160, r: 3 + Math.random() * 5, c: colors[k % colors.length], life: 0.7 + Math.random() * 0.5, t: 0, rot: Math.random() * 6, star: k % 3 === 0 }); }
  },
  text(x, y, s, color) { FX.texts.push({ x: x, y: y, s: String(s), c: color || '#2a2350', t: 0 }); },
  shake(px) { if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return; FX.ska = px || 8; FX.sk = 0.28; },
  step(dt) {
    const g = FX.ctx; if (!g) return;
    g.setTransform(FX.dpr, 0, 0, FX.dpr, 0, 0); g.clearRect(0, 0, innerWidth, innerHeight);
    FX.parts = FX.parts.filter((p) => (p.t += dt) < p.life);
    FX.parts.forEach((p) => {
      p.vy += 620 * dt; p.vx *= 0.985; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += dt * 8;
      g.globalAlpha = 1 - p.t / p.life; g.fillStyle = p.c; g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.beginPath();
      if (p.star) { for (let k = 0; k < 8; k++) { const rr = k % 2 ? p.r * 0.45 : p.r * 1.5, a = k * 0.785; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } } else g.rect(-p.r, -p.r * 0.6, p.r * 2, p.r * 1.2);
      g.fill(); g.restore();
    });
    FX.texts = FX.texts.filter((m) => (m.t += dt) < 1);
    FX.texts.forEach((m) => {
      const k = m.t, sc = k < 0.15 ? 0.6 + k * 3 : 1.05;
      g.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1; g.font = '900 ' + Math.round(30 * sc) + 'px Mali, sans-serif'; g.textAlign = 'center';
      g.lineWidth = 6; g.strokeStyle = '#fff'; g.strokeText(m.s, m.x, m.y - k * 70); g.fillStyle = m.c; g.fillText(m.s, m.x, m.y - k * 70);
    });
    g.globalAlpha = 1;
    const w = $('world');
    if (w) { FX.sk = Math.max(0, FX.sk - dt); const a = FX.sk > 0 ? FX.ska * FX.sk / 0.28 : 0; w.style.transform = a ? 'translate(' + ((Math.random() - 0.5) * a) + 'px,' + ((Math.random() - 0.5) * a) + 'px)' : ''; }
  },
};

function on(id, fn) {
  const el = $(id);
  if (el) el.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); safe(() => Sound.init()); Sound.play('tap'); fn(); });
}

/* ================= END OF STARTER ENGINE ================= */`;

/**
 * ชุดเครื่องมือ 3D (เฉพาะเกม 3D): ฉาก/แสง/เงา/หมอก วัสดุ toon + เส้นขอบ ป้ายข้อความ HTML ที่ตามวัตถุ และการแตะเลือกวัตถุ
 * ทำให้เกม 3D ที่ Gemini สร้างหน้าตาสม่ำเสมอ (ของเล่นนุ่ม เส้นขอบเข้ม) และไม่ต้องเขียนส่วนยากเอง
 * ทดสอบกับ three r160 จาก CDN แล้ว (scripts/aigame-engine-test.ts 3d)
 */
export const KIT3D_JS = String.raw`/* ================= 3D KIT: keep this code, build the scene with it ================= */
const K3 = {
  THREE: null, scene: null, camera: null, renderer: null, sun: null, ray: null, ramp: null, ink: null, mats: {}, labels: [],
  /* call once: K3.init().then((ok) => { if (ok) boot(); }) */
  async init() {
    try {
      const T = await import('three');
      K3.THREE = T;
      const r = new T.WebGLRenderer({ antialias: (window.devicePixelRatio || 1) < 2 });
      r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      r.shadowMap.enabled = true; r.shadowMap.type = T.PCFSoftShadowMap;
      r.outputColorSpace = T.SRGBColorSpace;
      $('world').appendChild(r.domElement);
      K3.renderer = r;
      const s = new T.Scene();
      s.background = new T.Color('#bfe9ff');
      s.fog = new T.Fog('#bfe9ff', 22, 70);
      K3.scene = s;
      K3.camera = new T.PerspectiveCamera(48, 1, 0.1, 200);
      K3.camera.position.set(0, 9, 13); K3.camera.lookAt(0, 0, 0);
      s.add(new T.HemisphereLight('#ffffff', '#c9b8ff', 1.25));
      const sun = new T.DirectionalLight('#fff4dc', 1.7);
      sun.position.set(7, 14, 9); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
      Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 60 });
      sun.shadow.bias = -0.0006; sun.shadow.radius = 3;
      s.add(sun); K3.sun = sun;
      const ramp = new T.DataTexture(new Uint8Array([110, 190, 255]), 3, 1, T.RedFormat);
      ramp.minFilter = T.NearestFilter; ramp.magFilter = T.NearestFilter; ramp.needsUpdate = true; K3.ramp = ramp;
      K3.ink = new T.MeshBasicMaterial({ color: '#2a2350', side: T.BackSide });
      K3.ray = new T.Raycaster();
      K3.resize(); window.addEventListener('resize', K3.resize);
      return true;
    } catch (e) {
      console.warn('[3d]', e);
      const w = $('world'); if (w) { w.innerHTML = '<div class="k3-fail"></div>'; w.firstChild.textContent = WORDS.no3d; }
      return false;
    }
  },
  resize() { const w = innerWidth, h = innerHeight; K3.renderer.setSize(w, h); K3.camera.aspect = w / h; K3.camera.fov = w < h ? 62 : 48; K3.camera.updateProjectionMatrix(); },
  /* soft toy material (cached per color) */
  mat(color) { if (!K3.mats[color]) K3.mats[color] = new K3.THREE.MeshToonMaterial({ color: color, gradientMap: K3.ramp }); return K3.mats[color]; },
  /* one model part: K3.part(new K3.THREE.SphereGeometry(1, 24, 16), '#ff6b7a', x, y, z, parentGroup) */
  part(geo, color, x, y, z, parent) {
    const m = new K3.THREE.Mesh(geo, K3.mat(color));
    m.position.set(x || 0, y || 0, z || 0); m.castShadow = true; m.receiveShadow = true;
    (parent || K3.scene).add(m); return m;
  },
  /* thick dark outline (inverted hull) for centered primitives: K3.outline(mesh, 0.06) */
  outline(mesh, w) { const o = new K3.THREE.Mesh(mesh.geometry, K3.ink); o.scale.setScalar(1 + (w || 0.06)); mesh.add(o); return o; },
  group(x, y, z, parent) { const g = new K3.THREE.Group(); g.position.set(x || 0, y || 0, z || 0); (parent || K3.scene).add(g); return g; },
  /* big ground that receives soft shadows */
  ground(color, size) { const m = new K3.THREE.Mesh(new K3.THREE.CircleGeometry(size || 40, 48), K3.mat(color || '#8edc6f')); m.rotation.x = -Math.PI / 2; m.receiveShadow = true; K3.scene.add(m); return m; },
  /* HTML label that follows a 3D object every frame; returns the element (add your own class/listeners) */
  label(obj, text, cls, dy) {
    const el = document.createElement('div'); el.className = 'k3-label ' + (cls || ''); el.textContent = text;
    $('labels').appendChild(el); K3.labels.push({ obj: obj, el: el, dy: dy || 0 }); return el;
  },
  unlabel(el) { K3.labels = K3.labels.filter((L) => L.el !== el); if (el && el.parentNode) el.parentNode.removeChild(el); },
  clearLabels() { K3.labels.forEach((L) => L.el.remove()); K3.labels = []; },
  /* window pixel position of an object (plus dy world units up) */
  toScreen(obj, dy) {
    const v = new K3.THREE.Vector3(); obj.getWorldPosition(v); v.y += dy || 0; v.project(K3.camera);
    return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight, z: v.z };
  },
  /* tap picking: returns the item of list (meshes or groups) under the pointer, or null */
  pick(e, list) {
    const T = K3.THREE, p = new T.Vector2((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    K3.ray.setFromCamera(p, K3.camera);
    const hits = K3.ray.intersectObjects(list, true);
    for (const h of hits) { let o = h.object; while (o && list.indexOf(o) < 0) o = o.parent; if (o) return o; }
    return null;
  },
  /* call from Hooks.draw: places labels, then renders */
  render() {
    K3.labels.forEach((L) => {
      const s = K3.toScreen(L.obj, L.dy);
      L.el.style.display = s.z > 1 || !L.obj.visible ? 'none' : '';
      L.el.style.transform = 'translate(' + s.x.toFixed(1) + 'px,' + s.y.toFixed(1) + 'px) translate(-50%, -100%)';
    });
    K3.renderer.render(K3.scene, K3.camera);
  },
};
/* ================= END OF 3D KIT ================= */`;

/** ค่าเริ่มของ Hooks ที่ Gemini ต้องเติม (แสดงใน prompt) */
export const HOOKS_JS = String.raw`const Hooks = {
  setup() {},           // build the scene once: background layers, mascot, decorations
  onStart() {},         // a new game begins (reset the scene)
  onRead(q) {},         // READ phase: e.g. the mascot points at the question
  spawn(q) {},          // PLAY begins: create one answer object per q.choices[i] (correct ones: q.correct)
  update(dt, realDt) {},// move everything with dt (game seconds, 0 while paused); call answer(i) once when the player hits choice i
  draw(realDt) {},      // render a canvas or 3D scene here. DOM/SVG games update transforms in update() and can leave this empty
  onCorrect(i) {},      // celebrate on the hit object: burst, sparkles, floating score
  onWrong(i, tries) {}, // soft reaction on the wrong object (it stays or comes back)
  onPartial(i) {},      // multi-answer question: one of several correct choices was hit
  clear() {},           // remove every answer object of the finished question
  onEnd(stars) {},      // result screen celebration
};
boot();`;
