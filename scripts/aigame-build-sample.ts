/** สร้างไฟล์เกมตัวอย่างทุกเกมไว้ทดสอบในเบราว์เซอร์: npx tsx scripts/aigame-build-sample.ts <โฟลเดอร์ปลายทาง> */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { buildGameHtml, threeToScript } from '../src/lib/aigame/build';
import { AI_GAMES } from '../src/lib/aigame/games';
import { HOOKS } from '../src/lib/aigame/hooks';
import { cleanGameRecipe } from '../src/lib/aigame/recipe';
import { SAMPLES, SORT_SAMPLES, ORDER_SAMPLES } from '../src/lib/aigame/samples';

const out = process.argv[2] || 'aigame-out';
mkdirSync(out, { recursive: true });
const three = threeToScript(readFileSync(join(__dirname, '../node_modules/three/build/three.module.min.js'), 'utf8'));
// ไฟล์ปกติ <id>.html, โหมดเล็งเอง a-<id>.html, 2 ทีม + กลางคืน t-<id>.html, ยามเย็น + ลื่น s-<id>.html
const variants: [string, object][] = [['', {}], ['a-', { aim: 1 }], ['t-', { teams: 2, mood: 2 }], ['s-', { mood: 1, gfx: 0 }]];
for (const g of AI_GAMES) {
  if (!HOOKS[g.id]) continue;
  const items = g.act === 'sort' ? SORT_SAMPLES.sci : g.act === 'order' ? ORDER_SAMPLES.sci : SAMPLES.math;
  for (const [pre, opt] of variants) {
    if (pre === 'a-' && !g.aim) continue;
    const html = buildGameHtml({ recipe: cleanGameRecipe({ game: g.id, pace: 'fast', count: 5, ...opt }), items, topic: 'ตัวอย่าง', three });
    writeFileSync(join(out, pre + g.id + '.html'), html);
  }
  console.log(g.id);
}
