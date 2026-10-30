/**
 * คัดลอกไฟล์ WASM ของ MediaPipe (ตรวจท่าทางเกม AR) จาก node_modules ไป public/mediapipe/wasm
 * เว็บโหลดจากโดเมนตัวเอง (CSP connect-src 'self', โรงเรียนที่บล็อก CDN ก็เล่นได้) และไม่ต้องเก็บไฟล์ 13MB ใน git
 * รันอัตโนมัติจาก next.config.mjs ทุกครั้งที่ next dev/build
 */
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'node_modules', '@mediapipe', 'tasks-vision', 'wasm');
const dst = path.join(__dirname, '..', 'public', 'mediapipe', 'wasm');
const FILES = ['vision_wasm_internal.js', 'vision_wasm_internal.wasm', 'vision_wasm_nosimd_internal.js', 'vision_wasm_nosimd_internal.wasm'];

fs.mkdirSync(dst, { recursive: true });
for (const f of FILES) {
  const a = path.join(src, f);
  const b = path.join(dst, f);
  if (!fs.existsSync(a)) throw new Error('ไม่พบ ' + a + ' (ลอง npm install)');
  const sa = fs.statSync(a);
  if (fs.existsSync(b) && fs.statSync(b).size === sa.size) continue;
  fs.copyFileSync(a, b);
}
console.log('mediapipe wasm ready');
