/**
 * สร้างหน้าทดสอบเครื่องยนต์เกม (engine.ts) แบบเกมปุ่มง่ายๆ: npx tsx scripts/aigame-engine-test.ts <ไฟล์ปลายทาง.html> [3d]
 * ใช้ script type="module" เพื่อยืนยันว่าไม่ต้องพึ่งตัวแปร global / onclick ใน HTML
 * ข้อ 2 = หลายคำตอบ, ข้อ 4 = เรียงลำดับ (order) · ใส่ 3d = ใช้ชุด 3D (K3) กับ three r160 จาก CDN (ต้องเปิดผ่าน http ไม่ใช่ file://)
 * ตรวจผลใน console: window.__log, window.__G
 */
import { writeFileSync } from 'fs';
import { ENGINE_CSS, ENGINE_HTML, ENGINE_JS, KIT3D_JS } from '../src/lib/aigame/engine';

const out = process.argv[2] || 'engine-test.html';
const is3d = process.argv[3] === '3d';

const hooks2d = `const Hooks = {
  setup() { const o = { a: 0 }; tween(o, { a: 1 }, 0.05, ease.outCubic, () => tween(o, { a: 2 }, 0.05, ease.outCubic, () => __log.push('chain:' + o.a))); },
  onStart() { __log.push('start'); }, onRead() { __log.push('read'); },
  spawn(q) { __log.push('spawn:' + q.q); $('world').innerHTML = ''; q.choices.forEach((c, i) => { const b = document.createElement('button'); b.textContent = c; b.dataset.i = i; b.addEventListener('pointerdown', (e) => { __log.push('ans:' + answer(i)); FX.burst(e.clientX, e.clientY); FX.text(e.clientX, e.clientY, '+100'); }); $('world').appendChild(b); }); },
  update() {}, draw() {}, onCorrect() {}, onWrong() {}, onPartial() {}, clear() { $('world').innerHTML = ''; }, onEnd(s) { __log.push('end:' + s); },
};
window.__G = G;
boot();`;

const hooks3d = `let boxes = [];
const Hooks = {
  setup() { K3.ground('#8edc6f', 30); },
  onStart() { __log.push('start'); }, onRead() { __log.push('read'); },
  spawn(q) {
    __log.push('spawn:' + q.q);
    boxes = q.choices.map((c, i) => {
      const m = K3.part(new K3.THREE.BoxGeometry(1.6, 1.6, 1.6), ['#ff6b7a', '#4fb3ff', '#ffcf3f', '#3fd6a8'][i % 4], (i - (q.choices.length - 1) / 2) * 2.6, 0.8, 0);
      K3.outline(m); m.userData.i = i;
      const el = K3.label(m, c, 'plate', 1.4); el.dataset.i = i;
      el.addEventListener('pointerdown', () => __log.push('ans:' + answer(i)));
      return m;
    });
  },
  update(dt) { boxes.forEach((b, k) => { b.rotation.y += dt * (0.5 + k * 0.2); }); },
  draw() { K3.render(); },
  onCorrect() {}, onWrong() {}, onPartial() {},
  clear() { boxes.forEach((b) => K3.scene.remove(b)); boxes = []; K3.clearLabels(); },
  onEnd(s) { __log.push('end:' + s); },
};
$('world').addEventListener('pointerdown', (e) => { const o = K3.pick(e, boxes); __log.push('pick:' + (o ? o.userData.i : 'none')); if (o) __log.push('ans:' + answer(o.userData.i)); });
window.__G = G; window.__K3 = K3; window.__boxes = () => boxes;
K3.init().then((ok) => { __log.push('k3:' + ok); if (ok) boot(); });`;

const html = `<!doctype html><html><head><meta charset="utf-8">
<script>/* ?raf = แผงเบราว์เซอร์ที่ซ่อนอยู่ไม่เรียก rAF: ใช้ setTimeout แทน */ if (location.search.indexOf('raf') >= 0) window.requestAnimationFrame = (f) => setTimeout(() => f(performance.now()), 16);</script>
${is3d ? '<script type="importmap">{"imports": {"three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js"}}</script>' : ''}
<style>${ENGINE_CSS}
.screen{align-items:center;justify-content:center;flex-direction:column;background:#fff8}
#world button{font-size:20px;margin:6px}
${is3d ? '.plate{background:#fff;border:3px solid #2a2350;border-radius:12px;padding:4px 10px;font:700 20px sans-serif}' : '#world{display:flex;align-items:center;justify-content:center;flex-wrap:wrap;padding-top:160px}'}
</style></head><body>
${ENGINE_HTML.replace('<!-- title, mascot, #btn-start, #btn-sound -->', '<button id="btn-start">start</button>')
  .replace(/<!-- #btn-resume.*?-->/, '<button id="btn-resume">resume</button><button id="btn-restart">restart</button><input id="speed" type="range" min="0.5" max="1.5" step="0.1" value="1">')
  .replace(/<!-- #stars.*?-->/, '<div id="stars"></div><div id="result-score"></div><div id="result-count"></div><ul id="missed"></ul><button id="btn-again">again</button>')}
<script type="module">
const CONFIG = { readMinSec: 0.6, readPerCharSec: 0, inputLockSec: 0.2, feedbackCorrectSec: 0.3, feedbackWrongSec: 0.3, timerSec: 0, lives: 3 };
const QUESTIONS = [
  { q: 'one', choices: ['a', 'b', 'c'], answer: 1, hint: 'h1' },
  { q: 'two', choices: ['x', 'y'], answers: [0, 1], hint: 'h2' },
  { q: 'three', choices: ['p', 'q'], answer: 0, hint: 'h3' },
  { q: 'four', choices: ['s1', 's2', 's3'], answers: [0, 1, 2], order: true, hint: 'h4' },
];
const WORDS = { correct: 'ok', wrong: 'no', reveal: 'answer:', no3d: 'no 3d' };
window.__log = [];
${ENGINE_JS}
${is3d ? KIT3D_JS : ''}
${is3d ? hooks3d : hooks2d}
</script></body></html>`;
writeFileSync(out, html);
console.log('wrote', out);
