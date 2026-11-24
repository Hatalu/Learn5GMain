/**
 * ประกอบไฟล์เกม HTML ไฟล์เดียว: ใช้ทั้งตัวอย่างในหน้าเว็บ (iframe srcdoc) และไฟล์ที่ครูบันทึกไปใช้ในห้องเรียน
 * three.js ฝังในไฟล์ (แปลง ES module เป็นสคริปต์ธรรมดา) จึงเปิดจากไฟล์ในเครื่องได้แม้ไม่มีอินเทอร์เน็ต
 * ฟังก์ชันล้วน ไม่แตะ DOM (selftest เรียกได้)
 */
import { ENGINE_CSS, ENGINE_HTML, ENGINE_JS, KIT3D_JS } from './engine';
import { HOOKS } from './hooks';
import { gameById, type AiGame } from './games';
import { PACES, wordsBlock, type GameRecipe, type GItem } from './recipe';

/** แปลง three.module.min.js เป็นสคริปต์ธรรมดาที่ตั้ง window.__THREE (ไม่ต้องใช้ import / ไม่ต้องมีเซิร์ฟเวอร์) */
export function threeToScript(mod: string): string {
  const m = mod.match(/export\s*\{([^}]*)\}\s*;?\s*$/);
  if (!m) throw new Error('three: export list not found');
  const pairs = m[1]
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const [local, name] = p.split(/\s+as\s+/);
      return `${name || local}:${local}`;
    });
  return `window.__THREE=(function(){${mod.slice(0, m.index)}\nreturn{${pairs.join(',')}};})();`;
}

/** ข้อความที่ฝังใน <script>: กัน </script> และ <!-- ในเนื้อหาของครูไม่ให้ตัดสคริปต์ */
const UNSAFE = new RegExp('[<' + String.fromCharCode(0x2028, 0x2029) + ']', 'g');
export const jsonForScript = (v: unknown) => JSON.stringify(v).replace(UNSAFE, (c) => String.fromCharCode(92) + 'u' + c.charCodeAt(0).toString(16).padStart(4, '0'));

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** ความยาวเกม (จำนวนข้อสูงสุดที่ใส่ในไฟล์) */
export interface BuildOpts {
  recipe: GameRecipe;
  items: GItem[];
  /** หัวเรื่องบนหน้าเริ่มเกม */
  topic: string;
  /** สคริปต์ three.js จาก threeToScript */
  three: string;
  /** ตัวอย่างในหน้าเว็บ: ไม่โหลดฟอนต์จาก Google (CSP ของเว็บไม่อนุญาต) */
  preview?: boolean;
}

const FEEDBACK = { pick: 1.5, sort: 0.9, order: 2.4 } as const;

export function configOf(r: GameRecipe, game: AiGame): Record<string, number> {
  const p = PACES.find((x) => x.id === r.pace)!;
  const c: Record<string, number> = {
    readMinSec: game.noRead ? 0 : p.read,
    readPerCharSec: game.noRead ? 0 : p.perChar,
    inputLockSec: 0.4,
    keepOrder: game.act === 'sort' ? 1 : 0,
    feedbackCorrectSec: FEEDBACK[game.act],
    feedbackWrongSec: 1,
    maxSpeedUp: p.up,
    timerSec: r.timer,
    lives: r.lives === 'on' ? 3 : 0,
    perGame: r.count,
    teams: r.teams,
    aim: game.skill ? 1 : game.aim ? r.aim : 0,
    gfx: r.gfx,
    mood: r.mood,
  };
  for (const [k, v] of Object.entries(game.cfg)) c[k] = Math.round(v * p.f * 100) / 100;
  return c;
}

/** ข้อในรูปแบบของ engine (q / choices / answer(s) / order) */
export function questionsOf(items: GItem[]) {
  return items
    .filter((it) => it.choices.length >= 2 && it.correct.length)
    .map((it) => {
      const o: Record<string, unknown> = { q: it.q, choices: it.choices };
      if (it.ordered) {
        o.answers = it.correct;
        o.order = true;
      } else if (it.correct.length > 1) o.answers = it.correct;
      else o.answer = it.correct[0];
      return o;
    });
}

export function buildGameHtml({ recipe, items, topic, three, preview }: BuildOpts): string {
  const game = gameById(recipe.game)!;
  const hooks = HOOKS[game.id];
  if (!hooks) throw new Error('no hooks for ' + game.id);
  const meta = { title: recipe.lang === 'en' ? game.en : game.name, topic, how: recipe.lang === 'en' ? game.howEn : game.how.join(' · ') };
  return [
    '<!DOCTYPE html>',
    `<html lang="${recipe.lang === 'en' ? 'en' : 'th'}"><head><meta charset="utf-8">`,
    '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">',
    `<title>${esc(meta.title)}</title>`,
    preview ? '' : '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Mali:wght@500;700&display=swap" media="print" onload="this.media=&quot;all&quot;">',
    `<style>${ENGINE_CSS}</style>`,
    '</head><body data-state="boot">',
    ENGINE_HTML,
    `<script>${three}</script>`,
    '<script>',
    '/* Learn5G คลังเกม: แก้คำถามได้ที่ QUESTIONS, ปรับเวลาได้ที่ CONFIG (ตัวเลขมาก = ช้าลง) */',
    `const CONFIG = ${jsonForScript(configOf(recipe, game))};`,
    wordsBlock(recipe.lang),
    `const GAME = ${jsonForScript(meta)};`,
    `const QUESTIONS = ${jsonForScript(questionsOf(items))};`,
    ENGINE_JS,
    KIT3D_JS,
    hooks,
    `K3.init(${jsonForScript(game.sky)}).then((ok) => { if (ok) boot(); });`,
    '</script>',
    '</body></html>',
  ].join('\n');
}
