/**
 * สร้างหน้าทดสอบเครื่องยนต์เกม (engine.ts) แบบเกมปุ่มง่ายๆ: npx tsx scripts/aigame-engine-test.ts <ไฟล์ปลายทาง.html>
 * ใช้ script type="module" เพื่อยืนยันว่าไม่ต้องพึ่งตัวแปร global / onclick ใน HTML
 */
import { writeFileSync } from 'fs';
import { ENGINE_CSS, ENGINE_HTML, ENGINE_JS } from '../src/lib/aigame/engine';

const out = process.argv[2] || 'engine-test.html';
const html = `<!doctype html><html><head><meta charset="utf-8"><style>${ENGINE_CSS}
.screen{align-items:center;justify-content:center;flex-direction:column;background:#fff8}
#world button{font-size:20px;margin:6px}
#world{display:flex;align-items:center;justify-content:center;flex-wrap:wrap;padding-top:160px}
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
];
const WORDS = { correct: 'ok', wrong: 'no', reveal: 'answer:' };
${ENGINE_JS}
window.__log = [];
const Hooks = {
  setup() {}, onStart() { __log.push('start'); }, onRead() { __log.push('read'); },
  spawn(q) { __log.push('spawn:' + q.q); $('world').innerHTML = ''; q.choices.forEach((c, i) => { const b = document.createElement('button'); b.textContent = c; b.dataset.ok = q.correct.includes(i) ? '1' : '0'; b.addEventListener('pointerdown', () => __log.push('ans:' + answer(i))); $('world').appendChild(b); }); },
  update() {}, draw() {}, onCorrect() {}, onWrong() {}, onPartial() {}, clear() { $('world').innerHTML = ''; }, onEnd(s) { __log.push('end:' + s); },
};
window.__G = G;
boot();
</script></body></html>`;
writeFileSync(out, html);
console.log('wrote', out);
