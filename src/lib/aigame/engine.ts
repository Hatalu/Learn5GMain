/**
 * เครื่องยนต์เกมของ "คลังเกม": ทุกเกมเป็นไฟล์ HTML ไฟล์เดียว (ENGINE + ชุด 3D + Hooks ของเกม + CONFIG/WORDS/QUESTIONS ของครู)
 * ไฟล์เดียวกันใช้ทั้งตัวอย่างในหน้าเว็บ (iframe) และไฟล์ที่ครูกดบันทึกไปเปิดในห้องเรียน (เปิดได้แม้ไม่มีอินเทอร์เน็ต)
 * - ปุ่มทุกปุ่มผูกด้วย addEventListener ในสคริปต์
 * - เวลาทั้งหมดเดินในลูปเกม (หยุดตอนพัก + ปรับตามแถบความเร็ว) ไม่ใช้ setTimeout
 * - โจทย์อยู่ใน DOM (#qtext) ไม่วาดบน canvas: ภาษาไทยแสดงถูกเสมอ
 * - หน้าจอแสดง/ซ่อนด้วย body[data-state] + display:none (ของที่ซ่อนจะไม่บังการกด)
 * ห้ามใช้ backtick และ ${} ในโค้ดข้างใน (อยู่ใน String.raw)
 */

export const ENGINE_HTML = String.raw`<div id="app">
  <div id="world"></div>
  <div id="labels"></div>
  <canvas id="fx"></canvas>
  <header id="hud">
    <div class="hud-l"><div class="pill" id="score">0</div><div class="pill" id="progress"></div><div id="combo"></div></div>
    <div class="hud-r"><div id="hearts"><i></i><i></i><i></i></div><button id="btn-pause" aria-label="pause"><i></i><i></i></button></div>
    <div id="timebar"><i></i></div>
  </header>
  <div id="qcard"><div id="qtext"></div><button id="btn-ready" class="btn"></button></div>
  <div id="bubble"></div>
  <div id="cards"></div>
  <div id="pad"></div>
  <section id="screen-start" class="screen"><div class="panel">
    <p class="kick" id="s-topic"></p><h1 id="s-title"></h1><p class="how" id="s-how"></p>
    <button id="btn-start" class="btn big"></button>
    <div class="row"><button id="btn-sound" class="btn ghost"></button><button id="btn-full" class="btn ghost"></button></div>
  </div></section>
  <section id="screen-pause" class="screen"><div class="panel">
    <h2 id="p-title"></h2>
    <button id="btn-resume" class="btn big"></button>
    <div class="row"><button id="btn-restart" class="btn ghost"></button><button id="btn-sound2" class="btn ghost"></button></div>
    <label class="speed"><span id="l-speed"></span><input id="speed" type="range" min="0.5" max="1.5" step="0.1" value="1"></label>
  </div></section>
  <section id="screen-result" class="screen"><div class="panel">
    <div id="stars"><i></i><i></i><i></i></div>
    <p class="kick" id="r-title"></p>
    <p class="big-n" id="result-score"></p>
    <p id="result-count"></p>
    <ul id="missed"></ul>
    <button id="btn-again" class="btn big"></button>
  </div></section>
</div>`;

export const ENGINE_CSS = String.raw`html, body { margin: 0; height: 100%; overflow: hidden; background: #bfe9ff; }
body { font-family: Mali, 'Leelawadee UI', Tahoma, sans-serif; color: #2a2350; -webkit-tap-highlight-color: transparent; }
button { font: inherit; color: inherit; cursor: pointer; }
#app { position: fixed; inset: 0; overflow: hidden; touch-action: none; user-select: none; -webkit-user-select: none; }
#world { position: absolute; inset: 0; z-index: 1; }
#world canvas { display: block; width: 100%; height: 100%; }
#labels { position: absolute; inset: 0; z-index: 4; pointer-events: none; }
#labels > * { position: absolute; left: 0; top: 0; pointer-events: auto; }
.k3-fail { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; padding: 24px; text-align: center; font-size: 22px; }
#fx { position: absolute; inset: 0; width: 100%; height: 100%; z-index: 5; pointer-events: none; }
#hud { position: absolute; top: 0; left: 0; right: 0; z-index: 10; display: flex; justify-content: space-between; align-items: flex-start; padding: 10px 12px; pointer-events: none; }
#hud > * { pointer-events: auto; }
.hud-l, .hud-r { display: flex; gap: 8px; align-items: center; }
.pill { background: #fff; border: 3px solid #2a2350; border-radius: 999px; padding: 4px 14px; font-weight: 800; font-size: 18px; box-shadow: 0 4px 0 rgba(42,35,80,.25); min-width: 34px; text-align: center; }
#score { background: #ffd166; }
#combo { font-weight: 900; font-size: 22px; color: #ff5f8f; text-shadow: 0 2px 0 #fff; }
#hearts { display: flex; gap: 4px; }
#hearts i { width: 22px; height: 22px; background: #ff5f8f; border: 3px solid #2a2350; border-radius: 50%; box-sizing: border-box; transition: opacity .3s, transform .3s; }
#hearts[data-n="0"] i, #hearts[data-n="1"] i:nth-child(n+2), #hearts[data-n="2"] i:nth-child(3) { opacity: .2; transform: scale(.8); }
body[data-lives="0"] #hearts { display: none; }
#btn-pause { width: 46px; height: 46px; border-radius: 16px; border: 3px solid #2a2350; background: #fff; display: flex; gap: 5px; align-items: center; justify-content: center; box-shadow: 0 4px 0 rgba(42,35,80,.25); }
#btn-pause i { width: 6px; height: 18px; border-radius: 3px; background: #2a2350; }
#timebar { position: absolute; left: 12px; right: 12px; top: 64px; height: 8px; border-radius: 8px; background: rgba(255,255,255,.6); overflow: hidden; }
#timebar i { display: block; height: 100%; background: linear-gradient(90deg, #3fd6a8, #ffd166); }
#qcard { position: absolute; z-index: 12; left: 50%; transform: translateX(-50%); width: min(92vw, 760px); box-sizing: border-box; background: #fff; border: 4px solid #2a2350; border-radius: 26px; padding: 12px 20px; text-align: center; box-shadow: 0 8px 0 rgba(42,35,80,.2), 0 18px 40px rgba(42,35,80,.18); transition: top .45s cubic-bezier(.34,1.56,.64,1), font-size .45s; }
#qtext { font-weight: 800; font-size: clamp(18px, 3.4vw, 30px); line-height: 1.35; }
#btn-ready { margin-top: 12px; }
#bubble { position: absolute; z-index: 13; pointer-events: none; left: 50%; top: 150px; transform: translateX(-50%) scale(.6); opacity: 0; background: #2a2350; color: #fff; border-radius: 18px; padding: 8px 18px; font-weight: 800; font-size: clamp(15px, 2.6vw, 22px); max-width: 86vw; text-align: center; transition: opacity .25s, transform .3s cubic-bezier(.34,1.56,.64,1); }
#bubble[data-on="1"] { opacity: 1; transform: translateX(-50%) scale(1); }
#cards { position: absolute; z-index: 11; left: 0; right: 0; bottom: 12px; display: flex; gap: 10px; justify-content: center; padding: 0 10px; }
#cards:empty { display: none; }
.card { flex: 1 1 0; max-width: 230px; min-height: 58px; border: 4px solid #2a2350; border-radius: 20px; background: var(--c, #fff); font-weight: 800; font-size: clamp(14px, 2.4vw, 22px); padding: 6px 10px; box-shadow: 0 6px 0 rgba(42,35,80,.3); transition: transform .15s, box-shadow .15s, opacity .2s; display: flex; align-items: center; justify-content: center; gap: 8px; line-height: 1.2; }
.card b { flex: none; width: 26px; height: 26px; border-radius: 50%; background: #2a2350; color: #fff; font-size: 15px; display: inline-flex; align-items: center; justify-content: center; }
.card:active { transform: translateY(4px); box-shadow: 0 2px 0 rgba(42,35,80,.3); }
.card[data-on="1"] { transform: translateY(-6px); box-shadow: 0 0 0 4px #fff, 0 12px 0 rgba(42,35,80,.3); }
.card[data-off="1"] { opacity: .35; }
.card[data-ok="1"] { background: #9df0c8; }
#pad { position: absolute; z-index: 11; left: 0; right: 0; bottom: 92px; display: flex; justify-content: space-between; padding: 0 14px; pointer-events: none; }
#pad button { pointer-events: auto; width: 64px; height: 64px; border-radius: 50%; border: 4px solid #2a2350; background: rgba(255,255,255,.9); box-shadow: 0 5px 0 rgba(42,35,80,.3); position: relative; }
#pad button::after { content: ''; position: absolute; inset: 0; margin: auto; width: 0; height: 0; border: 12px solid transparent; }
#pad .l::after { border-right: 18px solid #2a2350; border-left: 0; }
#pad .r::after { border-left: 18px solid #2a2350; border-right: 0; }
#pad .u::after { border-bottom: 18px solid #2a2350; border-top: 0; }
#pad .d::after { border-top: 18px solid #2a2350; border-bottom: 0; }
#pad:empty { display: none; }
.k3-label { border: 3px solid #2a2350; border-radius: 14px; padding: 4px 12px; font-weight: 800; font-size: clamp(14px, 2.3vw, 21px); white-space: nowrap; max-width: 42vw; overflow: hidden; text-overflow: ellipsis; box-shadow: 0 4px 0 rgba(42,35,80,.25); background: var(--c, #fff); cursor: pointer; }
.k3-label[data-off="1"] { opacity: .35; }
.k3-label.item { background: #fff; font-size: clamp(16px, 2.8vw, 26px); pointer-events: none; }
.screen { position: absolute; inset: 0; z-index: 30; align-items: center; justify-content: center; background: rgba(42,35,80,.35); padding: 16px; box-sizing: border-box; }
.panel { background: #fff; border: 4px solid #2a2350; border-radius: 32px; padding: 26px 28px; width: min(92vw, 520px); max-height: 92vh; overflow: auto; box-sizing: border-box; text-align: center; box-shadow: 0 10px 0 rgba(42,35,80,.25); animation: pop .45s cubic-bezier(.34,1.56,.64,1); }
.panel h1 { margin: 6px 0 8px; font-size: clamp(28px, 6vw, 44px); line-height: 1.2; background: linear-gradient(90deg, #ff6b7a, #ff9f43, #2fc98f, #3ea6ff, #a77bff); -webkit-background-clip: text; background-clip: text; color: transparent; }
.panel h2 { margin: 0 0 14px; font-size: 30px; }
.kick { margin: 0; font-weight: 800; color: #8a6dff; font-size: 15px; }
.how { margin: 0 0 18px; font-size: 16px; line-height: 1.5; color: #4a4470; }
.row { display: flex; gap: 10px; justify-content: center; margin-top: 12px; flex-wrap: wrap; }
.btn { border: 4px solid #2a2350; border-radius: 999px; background: #fff; padding: 8px 22px; font-weight: 800; font-size: 17px; box-shadow: 0 5px 0 rgba(42,35,80,.3); transition: transform .12s, box-shadow .12s; }
.btn:active { transform: translateY(4px) scale(.97); box-shadow: 0 1px 0 rgba(42,35,80,.3); }
.btn.big { background: linear-gradient(180deg, #ffd166, #ffb347); font-size: 24px; padding: 12px 40px; animation: breathe 1.6s ease-in-out infinite; }
.btn.ghost { font-size: 15px; padding: 6px 16px; }
body[data-sound="0"] #btn-sound, body[data-sound="0"] #btn-sound2 { text-decoration: line-through; opacity: .6; }
.speed { display: flex; gap: 10px; align-items: center; justify-content: center; margin-top: 16px; font-weight: 700; }
#stars { display: flex; justify-content: center; gap: 8px; margin-bottom: 6px; }
#stars i { width: 54px; height: 54px; background: #e6e1f5; clip-path: polygon(50% 0, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%); }
#stars[data-stars="1"] i:nth-child(1), #stars[data-stars="2"] i:nth-child(-n+2), #stars[data-stars="3"] i { background: #ffc531; animation: pop .5s cubic-bezier(.34,1.56,.64,1) both; }
#stars i:nth-child(2) { animation-delay: .15s; } #stars i:nth-child(3) { animation-delay: .3s; }
.big-n { font-size: 46px; font-weight: 900; margin: 4px 0; color: #ff6b7a; }
#missed { text-align: left; font-size: 14px; color: #4a4470; padding-left: 18px; max-height: 26vh; overflow: auto; }
#missed:empty { display: none; }
@keyframes pop { from { transform: scale(.6); opacity: 0; } to { transform: scale(1); opacity: 1; } }
@keyframes breathe { 50% { transform: scale(1.05); } }
@media (prefers-reduced-motion: reduce) { .btn.big { animation: none; } }
.screen { display: none; }
body[data-state="start"] #screen-start, body[data-state="result"] #screen-result, body[data-paused="1"] #screen-pause { display: flex; }
body[data-state="start"] :is(#hud, #qcard, #cards, #pad, #bubble, #labels), body[data-state="result"] :is(#hud, #qcard, #cards, #pad, #bubble, #labels) { display: none; }
body[data-state="read"] #qcard { top: 36%; font-size: 1.3em; }
body[data-state="read"] :is(#cards, #pad, #labels) { visibility: hidden; }
body:not([data-state="read"]) #qcard { top: 78px; }
body:not([data-state="read"]) #btn-ready, #btn-ready[data-on="0"] { display: none; }
@media (max-height: 520px) { body:not([data-state="read"]) #qcard { top: 58px; padding: 6px 14px; } #timebar { top: 54px; } .card { min-height: 44px; } #pad { bottom: 70px; } #bubble { top: 120px; } }`;

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
  const W = WORDS;
  document.title = GAME.title;
  [['s-title', GAME.title], ['r-title', GAME.title], ['s-topic', GAME.topic], ['s-how', GAME.how], ['btn-start', W.start], ['btn-ready', W.ready],
   ['p-title', W.pause], ['btn-resume', W.resume], ['btn-restart', W.restart], ['btn-again', W.again], ['btn-sound', W.sound], ['btn-sound2', W.sound],
   ['btn-full', W.full], ['l-speed', W.speed]].forEach((p) => txt(p[0], p[1]));
  document.body.dataset.lives = String(CONFIG.lives || 0);
  document.body.dataset.sound = '1';
  on('btn-full', () => { const d = document.documentElement; if (document.fullscreenElement) document.exitFullscreen(); else if (d.requestFullscreen) d.requestFullscreen().catch(() => {}); });
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
  if (typeof fn !== 'function') fn = ease.outCubic;
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
  const fin = [];
  G.tweens = G.tweens.filter((w) => {
    w.t = Math.min(1, w.t + dt / w.sec);   // tweens use real time so menus still animate
    const k = safe(() => w.fn(w.t));
    for (const p in w.to) if (typeof w.from[p] === 'number') w.obj[p] = w.from[p] + (w.to[p] - w.from[p]) * (typeof k === 'number' ? k : w.t);
    if (w.t >= 1 && w.done) fin.push(w.done);
    return w.t < 1;
  });
  fin.forEach((f) => safe(f));   // after the list is saved, so a done() that starts a new tween keeps it
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
 * ชุดเครื่องมือ 3D ที่ทุกเกมในคลังใช้: ฉาก/แสง/เงา/หมอก วัสดุ toon + เส้นขอบเข้ม ป้ายข้อความ HTML ที่ตามวัตถุ การแตะเลือกวัตถุ
 * + ตัวละคร ต้นไม้ เมฆ ป้ายคำตอบด้านล่าง ปุ่มลูกศร และแอนิเมชันตามเวลา (K3.run)
 * three.js มาจาก window.__THREE (ฝังในไฟล์เกม) ถ้าไม่มีค่อย import('three')
 */
export const KIT3D_JS = String.raw`/* ================= 3D KIT ================= */
const COLORS = ['#ffb3c1', '#ffe08a', '#a8eccb', '#a9d8ff', '#d7c4ff', '#ffc9a3'];
const INK = '#2a2350';
const K3 = {
  THREE: null, scene: null, camera: null, renderer: null, sun: null, ray: null, ramp: null, ink: null, mats: {}, labels: [], runs: [],
  async init(sky) {
    try {
      const T = window.__THREE || (await import('three'));
      K3.THREE = T;
      const small = Math.min(innerWidth, innerHeight) < 500;
      const r = new T.WebGLRenderer({ antialias: (window.devicePixelRatio || 1) < 2, powerPreference: 'high-performance' });
      r.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.5 : 2));
      r.shadowMap.enabled = true; r.shadowMap.type = T.PCFSoftShadowMap;
      r.outputColorSpace = T.SRGBColorSpace;
      $('world').appendChild(r.domElement);
      K3.renderer = r;
      const s = new T.Scene();
      sky = sky || '#bfe9ff';
      s.background = new T.Color(sky);
      s.fog = new T.Fog(sky, 24, 70);
      document.body.style.background = sky;
      K3.scene = s;
      K3.camera = new T.PerspectiveCamera(48, 1, 0.1, 200);
      K3.camera.position.set(0, 9, 13); K3.camera.lookAt(0, 0, 0);
      s.add(new T.HemisphereLight('#ffffff', '#c9b8ff', 1.25));
      const sun = new T.DirectionalLight('#fff4dc', 1.7);
      sun.position.set(7, 14, 9); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
      Object.assign(sun.shadow.camera, { left: -18, right: 18, top: 18, bottom: -18, near: 1, far: 70 });
      sun.shadow.bias = -0.0006; sun.shadow.radius = 3;
      s.add(sun); s.add(sun.target); K3.sun = sun;
      const ramp = new T.DataTexture(new Uint8Array([110, 190, 255]), 3, 1, T.RedFormat);
      ramp.minFilter = T.NearestFilter; ramp.magFilter = T.NearestFilter; ramp.needsUpdate = true; K3.ramp = ramp;
      K3.ink = new T.MeshBasicMaterial({ color: INK, side: T.BackSide });
      K3.ray = new T.Raycaster();
      K3.resize(); window.addEventListener('resize', K3.resize);
      r.domElement.addEventListener('click', (e) => { const o = K3.pick(e, K3.pickables); if (o) K3.choose(o.userData.i); });
      return true;
    } catch (e) {
      console.warn('[3d]', e);
      const w = $('world'); if (w) { w.innerHTML = '<div class="k3-fail"></div>'; w.firstChild.textContent = WORDS.no3d; }
      return false;
    }
  },
  portrait() { return innerWidth < innerHeight * 1.1; },
  resize() { const w = innerWidth, h = innerHeight; K3.renderer.setSize(w, h); K3.camera.aspect = w / h; K3.camera.fov = K3.portrait() ? 64 : 48; K3.camera.updateProjectionMatrix(); },
  mat(color) { if (!K3.mats[color]) K3.mats[color] = new K3.THREE.MeshToonMaterial({ color: color, gradientMap: K3.ramp }); return K3.mats[color]; },
  part(geo, color, x, y, z, parent) {
    const m = new K3.THREE.Mesh(geo, K3.mat(color));
    m.position.set(x || 0, y || 0, z || 0); m.castShadow = true; m.receiveShadow = true;
    (parent || K3.scene).add(m); return m;
  },
  outline(mesh, w) { const o = new K3.THREE.Mesh(mesh.geometry, K3.ink); o.scale.setScalar(1 + (w || 0.06)); mesh.add(o); return o; },
  group(x, y, z, parent) { const g = new K3.THREE.Group(); g.position.set(x || 0, y || 0, z || 0); (parent || K3.scene).add(g); return g; },
  ground(color, size) { const m = new K3.THREE.Mesh(new K3.THREE.CircleGeometry(size || 40, 48), K3.mat(color || '#8edc6f')); m.rotation.x = -Math.PI / 2; m.receiveShadow = true; K3.scene.add(m); return m; },
  remove(obj) { if (obj && obj.parent) obj.parent.remove(obj); },
  /* cute round character: returns { g, body, head, eyes } */
  buddy(color, parent) {
    const T = K3.THREE, g = K3.group(0, 0, 0, parent);
    const body = K3.part(new T.SphereGeometry(0.62, 24, 18), color, 0, 0.62, 0, g); body.scale.set(1, 0.9, 0.95); K3.outline(body, 0.07);
    const head = K3.part(new T.SphereGeometry(0.58, 24, 18), '#ffe0c4', 0, 1.45, 0.05, g); K3.outline(head, 0.07);
    const eyes = [];
    [-1, 1].forEach((s) => {
      eyes.push(K3.part(new T.SphereGeometry(0.09, 12, 10), INK, 0.2 * s, 1.5, 0.55, g));
      K3.part(new T.SphereGeometry(0.03, 8, 6), '#ffffff', 0.2 * s + 0.03, 1.54, 0.63, g);
      const ch = K3.part(new T.SphereGeometry(0.08, 10, 8), '#ff9bb3', 0.33 * s, 1.36, 0.47, g); ch.scale.set(1.3, 0.7, 0.5);
      const f = K3.part(new T.SphereGeometry(0.2, 14, 10), INK, 0.25 * s, 0.1, 0.1, g); f.scale.set(1, 0.6, 1.3);
    });
    return { g: g, body: body, head: head, eyes: eyes };
  },
  tree(x, z, k, parent) {
    const T = K3.THREE, g = K3.group(x, 0, z, parent);
    K3.part(new T.CylinderGeometry(0.16, 0.22, 1.2, 8), '#a8743f', 0, 0.6, 0, g);
    K3.outline(K3.part(new T.SphereGeometry(0.9, 14, 10), k % 2 ? '#5fcf7a' : '#3fbf6a', 0, 1.65, 0, g), 0.05);
    return g;
  },
  bush(x, z, k, parent) { return K3.part(new K3.THREE.SphereGeometry(0.55, 12, 9), ['#ff9ad5', '#ffcf3f', '#7fd0ff'][k % 3], x, 0.4, z, parent); },
  cloud(x, y, z, sc) {
    const T = K3.THREE, g = K3.group(x, y, z);
    [0, 1, 2].forEach((k) => { const m = K3.part(new T.SphereGeometry(k === 1 ? 2 : 1.5, 12, 9), '#ffffff', k * 2 - 2, k === 1 ? 0.5 : 0, 0, g); m.castShadow = false; });
    g.scale.setScalar(sc || 1); return g;
  },
  /* HTML label that follows a 3D object every frame */
  label(obj, text, cls, dy) {
    const el = document.createElement('div'); el.className = 'k3-label ' + (cls || ''); el.textContent = text;
    $('labels').appendChild(el); K3.labels.push({ obj: obj, el: el, dy: dy || 0 }); return el;
  },
  unlabel(el) { K3.labels = K3.labels.filter((L) => L.el !== el); if (el && el.parentNode) el.parentNode.removeChild(el); },
  clearLabels() { K3.labels.forEach((L) => L.el.remove()); K3.labels = []; },
  toScreen(obj, dy) {
    const v = new K3.THREE.Vector3(); obj.getWorldPosition(v); v.y += dy || 0; v.project(K3.camera);
    return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight, z: v.z };
  },
  /* confetti at a 3D object */
  burst(obj, dy, n) { const p = K3.toScreen(obj, dy || 0); FX.burst(p.x, p.y, null, n || 26); return p; },
  pick(e, list) {
    const T = K3.THREE, p = new T.Vector2((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    K3.ray.setFromCamera(p, K3.camera);
    const hits = K3.ray.intersectObjects(list, true);
    for (const h of hits) { let o = h.object; while (o && list.indexOf(o) < 0) o = o.parent; if (o) return o; }
    return null;
  },
  /* tap-to-choose: K3.tappable(group, i) + K3.onPick = (i) => ... ; labels and cards call the same onPick */
  pickables: [], onPick: null,
  tappable(obj, i) { obj.userData.i = i; K3.pickables.push(obj); return obj; },
  choose(i) { if (K3.onPick && G.state === 'play' && !G.paused) safe(() => K3.onPick(i)); },
  choiceLabel(obj, text, i, dy) {
    const el = K3.label(obj, text, '', dy); el.style.setProperty('--c', COLORS[i % COLORS.length]);
    el.addEventListener('click', (e) => { e.stopPropagation(); K3.choose(i); }); return el;
  },
  choiceCards(list, ids) { K3.cards(list, (j) => K3.choose(ids ? ids[j] : j)); if (ids) ids.forEach((id, j) => K3.card(j).style.setProperty('--c', COLORS[id % COLORS.length])); },
  /* which choices to show: unanswered correct ones first, then wrong ones, at most max, in their original order */
  subset(q, max) {
    const ok = q.ordered ? [q.correct[G.picked.size]] : q.correct.filter((c) => !G.picked.has(c));
    const wrong = shuffle(q.choices.map((_, i) => i).filter((i) => q.correct.indexOf(i) < 0));
    return ok.slice(0, 1).concat(wrong).slice(0, max).sort((a, b) => a - b);
  },
  /* jump/throw along an arc in sec seconds */
  arc(obj, to, h, sec, done) {
    const f = { x: obj.position.x, y: obj.position.y, z: obj.position.z };
    return K3.run(sec, (k) => obj.position.set(f.x + (to.x - f.x) * k, f.y + (to.y - f.y) * k + Math.sin(k * Math.PI) * h, f.z + (to.z - f.z) * k), done);
  },
  wiggle(obj, sec) { const r = obj.rotation.z; K3.run(sec || 0.5, (k) => { obj.rotation.z = r + Math.sin(k * Math.PI * 6) * 0.3 * (1 - k); }); },
  pop(obj, s) { s = s || 1; obj.scale.setScalar(0.01); K3.run(0.45, (k) => obj.scale.setScalar(s * ease.outBack(k))); },
  /* time-based animation: K3.run(0.5, (k) => {...}, done). k goes 0..1, real time (menus still animate) */
  run(sec, step, done) { const r = { t: 0, sec: Math.max(0.01, sec), step: step, done: done }; K3.runs.push(r); return r; },
  /* bottom answer cards: K3.cards(['a','b'], (i) => ...) ; K3.cardOn(i) highlights one */
  cards(list, onTap) {
    const box = $('cards'); box.innerHTML = '';
    list.forEach((t, i) => {
      const b = document.createElement('button'); b.className = 'card'; b.style.setProperty('--c', COLORS[i % COLORS.length]);
      const n = document.createElement('b'); n.textContent = String(i + 1); b.appendChild(n);
      const s = document.createElement('span'); s.textContent = t; b.appendChild(s);
      b.addEventListener('click', (e) => { e.preventDefault(); safe(() => onTap(i)); });
      box.appendChild(b);
    });
    K3.onKey = onTap;
  },
  card(i) { return $('cards').children[i] || null; },
  cardOn(i) { Array.prototype.forEach.call($('cards').children, (c, k) => { c.dataset.on = k === i ? '1' : '0'; }); },
  clearCards() { $('cards').innerHTML = ''; K3.onKey = null; },
  /* on-screen arrow buttons: K3.pad(['l','r'], (dir) => ...) */
  pad(dirs, fn) {
    const box = $('pad'); box.innerHTML = '';
    dirs.forEach((d) => { const b = document.createElement('button'); b.className = d; b.setAttribute('aria-label', d); b.addEventListener('pointerdown', (e) => { e.preventDefault(); safe(() => fn(d)); }); box.appendChild(b); });
  },
  render(dt) {
    const fin = [];
    K3.runs = K3.runs.filter((r) => { r.t = Math.min(1, r.t + dt / r.sec); safe(() => r.step(r.t)); if (r.t >= 1 && r.done) fin.push(r.done); return r.t < 1; });
    fin.forEach((f) => safe(f));
    K3.labels.forEach((L) => {
      const s = K3.toScreen(L.obj, L.dy);
      let vis = s.z < 1, o = L.obj; while (o) { if (!o.visible) vis = false; o = o.parent; }
      L.el.style.display = vis ? '' : 'none';
      if (!vis) return;
      const hw = L.el.offsetWidth / 2 + 6, hh = L.el.offsetHeight + 6;
      const x = Math.min(innerWidth - hw, Math.max(hw, s.x)), y = Math.min(innerHeight - 6, Math.max(hh, s.y));
      L.el.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) translate(-50%, -100%)';
    });
    K3.renderer.render(K3.scene, K3.camera);
  },
};
window.addEventListener('keydown', (e) => {
  const n = Number(e.key);
  if (n >= 1 && n <= 9 && K3.onKey && G.state === 'play') { const c = K3.card(n - 1); if (c) c.click(); }
});
/* ================= END OF 3D KIT ================= */`;
