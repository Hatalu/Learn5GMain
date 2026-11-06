/**
 * ขีดเส้นแดงคำสะกดผิด (ไทย) ในช่องพิมพ์ ใช้ CSS Custom Highlight API จึงไม่แตะ HTML ของเอกสารเลย
 * คลิกขวาที่คำที่ถูกขีด = เมนูแก้คำ / เพิ่มในพจนานุกรม / ข้ามคำนี้
 * เบราว์เซอร์ที่ไม่รองรับ Highlight API = ไม่ขีด (ไม่พัง)
 */
import { addUserWord, checkText, dictReady, loadDict, suggest, userWords, type Typo } from '@/lib/studio/thaiSpell';

const NAME = 'l5g-typo';
const KEY = 'l5g_spell';
const BLOCK = 'p,li,td,th,h1,h2,h3,h4,h5,h6,blockquote,figcaption,div';
const SKIP = '[contenteditable="false"],[data-tex],.katex,figure,[data-shape],svg,img';

const roots = new Map<HTMLElement, Range[]>();
const sessionIgnore = new Set<string>();
const cache = new Map<string, Typo[]>();

const supported = () => typeof CSS !== 'undefined' && 'highlights' in CSS && typeof Highlight !== 'undefined';

export function spellEnabled(): boolean {
  try {
    return localStorage.getItem(KEY) !== '0';
  } catch {
    return true;
  }
}
export function setSpellEnabled(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? '1' : '0');
  } catch {
    /* ไม่จำก็ได้ */
  }
  window.dispatchEvent(new Event('l5g-spell'));
}

function publish() {
  if (!supported()) return;
  const all: Range[] = [];
  for (const rs of roots.values()) all.push(...rs);
  if (all.length) CSS.highlights.set(NAME, new Highlight(...all));
  else CSS.highlights.delete(NAME);
}

type Chunk = { text: string; nodes: { node: Text; from: number }[] };

/** แบ่งข้อความในช่องพิมพ์เป็นก้อนตามย่อหน้า (ข้ามสมการ/รูป/กราฟ) เพื่อให้คำที่คาบหลาย span ยังตรวจรวมกันได้ */
function chunksOf(root: HTMLElement): Chunk[] {
  const out: Chunk[] = [];
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => ((n.parentElement as HTMLElement | null)?.closest(SKIP) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  let cur: Chunk | null = null;
  let curBlock: Element | null = null;
  for (let n = w.nextNode() as Text | null; n; n = w.nextNode() as Text | null) {
    const blk = n.parentElement?.closest(BLOCK) ?? root;
    if (!cur || blk !== curBlock) {
      cur = { text: '', nodes: [] };
      curBlock = blk;
      out.push(cur);
    }
    cur.nodes.push({ node: n, from: cur.text.length });
    cur.text += n.data;
  }
  return out;
}

function locate(c: Chunk, pos: number): { node: Text; off: number } | null {
  for (let i = c.nodes.length - 1; i >= 0; i--) {
    const x = c.nodes[i];
    if (pos >= x.from) return { node: x.node, off: Math.min(pos - x.from, x.node.length) };
  }
  return null;
}

function scan(root: HTMLElement) {
  if (!root.isConnected) return;
  if (!spellEnabled()) {
    roots.set(root, []);
    publish();
    return;
  }
  const ignore = new Set([...userWords(), ...sessionIgnore]);
  const ranges: Range[] = [];
  for (const c of chunksOf(root)) {
    if (!/[ก-๛]/.test(c.text)) continue;
    const key = (dictReady() ? 'd' : 'n') + c.text;
    let typos = cache.get(key);
    if (!typos) {
      typos = checkText(c.text);
      if (cache.size > 4000) cache.clear();
      cache.set(key, typos);
    }
    for (const t of typos) {
      if (ignore.has(t.word)) continue;
      const a = locate(c, t.start);
      const b = locate(c, t.end - 1);
      if (!a || !b) continue;
      const r = document.createRange();
      try {
        r.setStart(a.node, a.off);
        r.setEnd(b.node, Math.min(b.off + 1, b.node.length));
      } catch {
        continue;
      }
      (r as Range & { _t?: Typo })._t = t;
      ranges.push(r);
    }
  }
  roots.set(root, ranges);
  publish();
}

/* ------------------------------------------------------------------ เมนูคลิกขวา */

let menu: HTMLDivElement | null = null;
const closeMenu = () => {
  menu?.remove();
  menu = null;
};

function caretAt(x: number, y: number): { node: Node; off: number } | null {
  const d = document as Document & { caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null; caretRangeFromPoint?: (x: number, y: number) => Range | null };
  if (d.caretPositionFromPoint) {
    const p = d.caretPositionFromPoint(x, y);
    return p ? { node: p.offsetNode, off: p.offset } : null;
  }
  const r = d.caretRangeFromPoint?.(x, y);
  return r ? { node: r.startContainer, off: r.startOffset } : null;
}

function replaceWith(root: HTMLElement, r: Range, text: string) {
  root.focus({ preventScroll: true });
  const s = window.getSelection();
  s?.removeAllRanges();
  s?.addRange(r);
  document.execCommand('insertText', false, text);
}

function openMenu(root: HTMLElement, r: Range, t: Typo, x: number, y: number) {
  closeMenu();
  const m = document.createElement('div');
  m.className = 'st-spellmenu';
  m.setAttribute('role', 'menu');
  const head = document.createElement('p');
  head.className = 'st-spell-head';
  head.textContent = `${t.word} : ${t.why}`;
  m.append(head);
  const add = (label: string, fn: () => void, cls = '') => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    if (cls) b.className = cls;
    b.addEventListener('pointerdown', (e) => e.preventDefault());
    b.addEventListener('click', () => {
      closeMenu();
      fn();
    });
    m.append(b);
  };
  const sugg = [...(t.fix ? [t.fix] : []), ...suggest(t.word, 6)].filter((v, i, a) => v && a.indexOf(v) === i).slice(0, 6);
  if (sugg.length) for (const s of sugg) add(s, () => replaceWith(root, r.cloneRange(), s), 'st-spell-sug');
  else {
    const none = document.createElement('p');
    none.className = 'st-spell-none';
    none.textContent = 'ไม่มีคำแนะนำ';
    m.append(none);
  }
  add('ข้ามคำนี้', () => (sessionIgnore.add(t.word), rescanAll()));
  add('เพิ่มในพจนานุกรมของฉัน', () => (addUserWord(t.word), rescanAll()));
  document.body.append(m);
  const w = m.offsetWidth;
  const h = m.offsetHeight;
  m.style.left = `${Math.max(8, Math.min(x, innerWidth - w - 8))}px`;
  m.style.top = `${Math.max(8, Math.min(y, innerHeight - h - 8))}px`;
  menu = m;
}

function rescanAll() {
  for (const r of roots.keys()) scan(r);
}

/**
 * เริ่มตรวจในช่องพิมพ์ root (คืนฟังก์ชันเลิกตรวจ) ตรวจใหม่เมื่อเนื้อหาเปลี่ยน (หน่วงเล็กน้อย ไม่กวนการพิมพ์)
 */
export function attachSpell(root: HTMLElement): () => void {
  if (!supported()) return () => {};
  let timer = 0;
  const later = (ms = 450) => {
    clearTimeout(timer);
    timer = window.setTimeout(() => {
      const run = () => scan(root);
      if ('requestIdleCallback' in window) requestIdleCallback(run, { timeout: 1200 });
      else run();
    }, ms);
  };
  const mo = new MutationObserver(() => later());
  mo.observe(root, { childList: true, characterData: true, subtree: true });
  const onEnable = () => (spellEnabled() ? void loadDict().then(() => later(0)) : later(0));
  window.addEventListener('l5g-spell', onEnable);
  const onCtx = (e: MouseEvent) => {
    const list = roots.get(root);
    if (!list?.length || !spellEnabled()) return;
    const c = caretAt(e.clientX, e.clientY);
    if (!c) return;
    const hit = list.find((r) => {
      try {
        return r.comparePoint(c.node, c.off) === 0;
      } catch {
        return false;
      }
    });
    if (!hit) return;
    e.preventDefault();
    openMenu(root, hit, (hit as Range & { _t: Typo })._t, e.clientX, e.clientY);
  };
  root.addEventListener('contextmenu', onCtx);
  const onAway = (e: Event) => {
    if (menu && !(e.target as HTMLElement | null)?.closest?.('.st-spellmenu')) closeMenu();
  };
  document.addEventListener('pointerdown', onAway, true);
  const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && closeMenu();
  document.addEventListener('keydown', onEsc);
  if (spellEnabled()) void loadDict().then(() => later(0));
  later(300);
  return () => {
    clearTimeout(timer);
    mo.disconnect();
    window.removeEventListener('l5g-spell', onEnable);
    root.removeEventListener('contextmenu', onCtx);
    document.removeEventListener('pointerdown', onAway, true);
    document.removeEventListener('keydown', onEsc);
    roots.delete(root);
    publish();
  };
}
