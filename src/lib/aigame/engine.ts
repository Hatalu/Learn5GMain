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
  <canvas id="fx"></canvas>              <!-- particles only, pointer-events: none -->
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

/* normalize one question: shuffled choices, correct = list of indexes into the shuffled choices */
function prepare(raw) {
  const choices = raw.choices ? raw.choices.slice() : [];
  let correct = Array.isArray(raw.answers) ? raw.answers.slice() : [raw.answer];
  const perm = shuffle(choices.map((_, i) => i));
  return {
    raw: raw, q: raw.q, hint: raw.hint || '', explain: raw.explain || '',
    choices: perm.map((i) => choices[i]),
    correct: correct.map((c) => perm.indexOf(c)),
  };
}
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
  if (q.correct.indexOf(i) >= 0 && !G.picked.has(i)) {
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
  say(G.tries >= 2 ? WORDS.reveal + ' ' + q.correct.map((c) => q.choices[c]).join(', ') : (q.hint || WORDS.wrong));
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
  if (ul) G.missed.forEach((q) => { const li = document.createElement('li'); li.textContent = q.q + '  ->  ' + q.correct.map((c) => q.choices[c]).join(', '); ul.appendChild(li); });
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

function on(id, fn) {
  const el = $(id);
  if (el) el.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); safe(() => Sound.init()); Sound.play('tap'); fn(); });
}

/* ================= END OF STARTER ENGINE ================= */`;

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
