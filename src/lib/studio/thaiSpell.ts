/**
 * ตรวจคำผิดภาษาไทย (ฝั่งเครื่อง ไม่ส่งข้อความออกไปไหน)
 * 1) กฎสะกด: อักขระซ้อนผิดลำดับ (วรรณยุกต์ซ้ำ สระซ้ำ เ+เ ขึ้นต้นด้วยสระ/วรรณยุกต์) = ผิดแน่ แก้ให้ได้เลย
 * 2) พจนานุกรม: ตัดคำด้วย DP ให้เหลือส่วนที่ไม่รู้จักน้อยที่สุด ส่วนที่ไม่รู้จัก = สงสัยว่าสะกดผิด
 * พจนานุกรม = PyThaiNLP words_th.txt (CC0) โหลดตอนเปิดตรวจครั้งแรก
 * ข้อจำกัด: คำที่สะกดผิดแต่บังเอิญเป็นคำอื่นที่มีจริง (เช่น เรือง/เรื่อง) ตรวจไม่ได้ ชื่อเฉพาะ/ทับศัพท์อาจถูกขีด (กด "เพิ่มในพจนานุกรม")
 */

export type Typo = { start: number; end: number; word: string; kind: 'rule' | 'dict'; why: string; fix?: string };

const TH = /[ก-๛]/;
const isCons = (c: string) => c >= 'ก' && c <= 'ฮ';
const isLeadVowel = (c: string) => c >= 'เ' && c <= 'ไ';
const isUpper = (c: string) => c === 'ั' || (c >= 'ิ' && c <= 'ื') || c === '็' || c === 'ํ';
const isLower = (c: string) => c === 'ุ' || c === 'ู' || c === 'ฺ';
const isTone = (c: string) => c >= '่' && c <= '๋';
const isKill = (c: string) => c === '์'; // ์ การันต์ วางหลังสระบน/ล่างได้
const isFollow = (c: string) => c === 'ะ' || c === 'า' || c === 'ำ' || c === 'ๅ';
const isMark = (c: string) => isUpper(c) || isLower(c) || isTone(c) || isKill(c);

type Rule = { i: number; len: number; why: string; fix: string };

/** กฎสะกด ตรวจก้อนอักษรไทยที่ต่อกัน คืนข้อผิดแรกที่พบ (ตำแหน่งคู่อักขระที่ผิด + ตัวแก้ที่แนะนำ) */
export function ruleCheck(run: string): Rule | null {
  for (let i = 0; i < run.length; i++) {
    const c = run[i];
    const p = i ? run[i - 1] : '';
    if (i === 0 && (isMark(c) || isFollow(c))) return { i, len: 1, why: 'ขึ้นต้นคำด้วยสระ/วรรณยุกต์ที่ต้องมีพยัญชนะนำ', fix: '' };
    if (!p) continue;
    if (c === 'เ' && p === 'เ') return { i: i - 1, len: 2, why: 'เ สองตัวติดกัน (ตั้งใจพิมพ์ แ?)', fix: 'แ' };
    if (c === p && (isLeadVowel(c) || isFollow(c) || isUpper(c) || isLower(c) || isTone(c) || isKill(c))) return { i: i - 1, len: 2, why: 'พิมพ์ซ้ำ', fix: c };
    if (isTone(c) && isTone(p)) return { i: i - 1, len: 2, why: 'วรรณยุกต์ซ้อนกัน', fix: p };
    if ((isUpper(c) && isUpper(p)) || (isLower(c) && isLower(p))) return { i: i - 1, len: 2, why: 'สระซ้อนกัน', fix: p };
    // วรรณยุกต์ต้องอยู่นอกสุด (ก่้ → ก้) ยกเว้นก่อนการันต์
    if ((isUpper(c) || isLower(c)) && isTone(p)) return { i: i - 1, len: 2, why: 'ลำดับสระกับวรรณยุกต์สลับกัน', fix: c + p };
    // สระหน้า (เ แ โ ใ ไ) ต้องตามด้วยพยัญชนะ
    if (isLeadVowel(p) && !isCons(c)) return { i: i - 1, len: 2, why: 'สระหน้าต้องตามด้วยพยัญชนะ', fix: p };
    // สระ/วรรณยุกต์ต้องไม่ตามสระตาม/สระหน้า (ะ า ำ ๅ)
    if (isMark(c) && isFollow(p)) return { i: i - 1, len: 2, why: 'วรรณยุกต์/สระวางผิดตำแหน่ง', fix: p };
    if (isFollow(c) && isFollow(p) && !(p === 'า' && c === 'ะ')) return { i: i - 1, len: 2, why: 'สระซ้อนกัน', fix: p };
  }
  return null;
}

/** พจนานุกรมโหลดครั้งเดียว */
let dict: Set<string> | null = null;
let maxLen = 1;
let words: string[] = [];
let loading: Promise<boolean> | null = null;

export function buildDict(list: string[]) {
  const s = new Set<string>();
  words = [];
  maxLen = 1;
  for (const w0 of list) {
    const w = w0.trim();
    if (!w || /\s/.test(w)) continue;
    if (!TH.test(w) || /[^ก-๛]/.test(w)) continue; // เฉพาะคำไทยล้วน
    if (w.length < 2) continue; // ตัวอักษรเดี่ยวไม่นับเป็นคำ (กันตัดคำมั่ว)
    if (!s.has(w)) {
      s.add(w);
      words.push(w);
      if (w.length > maxLen) maxLen = w.length;
    }
  }
  dict = s;
}

export const dictReady = () => !!dict;

export function loadDict(url = '/dict/th-words.txt'): Promise<boolean> {
  if (dict) return Promise.resolve(true);
  loading ??= fetch(url)
    .then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))))
    .then((t) => (buildDict(t.split('\n')), true))
    .catch(() => ((loading = null), false));
  return loading;
}

/** ตัวเลขไทย ๆ ฯ ไม่ตรวจ */
const SKIP = /^[๐-๙ฯๆ]+$/;

/** ตัดคำด้วย DP: คืนช่วงที่ไม่รู้จัก [เริ่ม, จบ) พร้อมขอบเขตคำข้างเคียง */
function unknownSpans(run: string, extra: Set<string>): { a: number; b: number; lo: number }[] {
  const n = run.length;
  const INF = 1e9;
  const K = 1000; // ตัวที่ไม่รู้จักหนักกว่าจำนวนคำเสมอ
  const cost = new Array<number>(n + 1).fill(INF);
  const prev = new Array<number>(n + 1).fill(-1);
  const kind = new Array<number>(n + 1).fill(0); // 1 = คำในพจนานุกรม
  cost[0] = 0;
  for (let i = 0; i < n; i++) {
    if (cost[i] >= INF) continue;
    const c1 = cost[i] + K;
    if (c1 < cost[i + 1]) (cost[i + 1] = c1), (prev[i + 1] = i), (kind[i + 1] = 0);
    const lim = Math.min(n, i + maxLen);
    for (let j = i + 2; j <= lim; j++) {
      const w = run.slice(i, j);
      if (dict!.has(w) || extra.has(w)) {
        const c = cost[i] + 1;
        if (c < cost[j]) (cost[j] = c), (prev[j] = i), (kind[j] = 1);
      }
    }
  }
  // เดินย้อน เก็บคำ/ตัวที่ไม่รู้จักตามลำดับจากท้ายไปต้น
  const parts: { a: number; b: number; known: boolean }[] = [];
  for (let e = n; e > 0; e = prev[e]) parts.push({ a: prev[e], b: e, known: kind[e] === 1 });
  parts.reverse();
  const out: { a: number; b: number; lo: number }[] = [];
  let lastKnownStart = -1;
  for (const p of parts) {
    if (p.known) {
      lastKnownStart = p.a;
      continue;
    }
    const last = out[out.length - 1];
    if (last && last.b === p.a) last.b = p.b;
    else out.push({ a: p.a, b: p.b, lo: lastKnownStart >= 0 && lastKnownStart < p.a && parts.some((q) => q.known && q.b === p.a) ? lastKnownStart : p.a });
  }
  return out;
}

/** ตรวจข้อความ คืนตำแหน่งคำที่น่าจะผิด (ต้องโหลดพจนานุกรมก่อนถึงจะตรวจส่วนพจนานุกรม) */
export function checkText(text: string, ignore: Set<string> = new Set()): Typo[] {
  const out: Typo[] = [];
  const re = /[ก-๛]+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const run = m[0];
    const base = m.index;
    if (SKIP.test(run)) continue;
    const r = ruleCheck(run);
    if (r) {
      const a = Math.max(0, r.i - 1);
      const b = Math.min(run.length, r.i + r.len + 1);
      const word = run.slice(a, b);
      if (!ignore.has(word)) out.push({ start: base + a, end: base + b, word, kind: 'rule', why: r.why, fix: run.slice(a, r.i) + r.fix + run.slice(r.i + r.len, b) });
      continue;
    }
    if (!dict) continue;
    for (const sp of unknownSpans(run, ignore)) {
      let a = sp.a;
      const b = sp.b;
      const part = run.slice(a, b);
      if (!/[ก-ฮ]/.test(part)) continue; // ไม่มีพยัญชนะเลย = เศษตัวติดคำ
      if (part.length < 2) continue;
      // ทับศัพท์ลงท้ายการันต์ (เรนจ์ ฟอนต์ ไมค์) ไม่ขีด เว้นแต่มีคำใกล้เคียงในพจนานุกรม (สาตร์ ~ ศาสตร์ = พิมพ์ผิดแน่)
      if (part.length <= 2 && part.endsWith("์") && !suggest(run.slice(sp.lo < a ? sp.lo : a, b), 1).length) continue;
      // ส่วนที่ไม่รู้จักสั้นมาก มักเป็นพยางค์ท้าย/กลางของคำเดียวที่สะกดผิด: ขยายให้ครอบคำที่ติดอยู่ด้วย
      if (part.length <= 3 && sp.lo < a) a = sp.lo;
      const word = run.slice(a, b);
      if (ignore.has(word)) continue;
      out.push({ start: base + a, end: base + b, word, kind: 'dict', why: 'ไม่พบในพจนานุกรม' });
    }
  }
  return out;
}

/** อักษรที่เสียง/รูปคล้ายกัน สลับกันบ่อยเวลาสะกดผิด (แทนที่กันได้ราคาถูก) */
const LIKE = ['สศษซ', 'ทธฑฒถ', 'ณน', 'ฬล', 'รฤ', 'พภผ', 'คฅข', 'จช', 'ญย', 'ตฎฏ', 'ดฎ', 'ฏฎ', 'ใไ', '่้๊๋', 'เแ', 'โเ', 'ัะ', 'ิี', 'ึื', 'ุู', 'บป', 'ฟฝ', 'หฮ', 'อว', 'ยอ'];
const likeCost = (x: string, y: string) => (x === y ? 0 : LIKE.some((g) => g.includes(x) && g.includes(y)) ? 0.4 : 1);
const insCost = (x: string) => (x === '์' || x === '่' || x === '้' || x === '๊' || x === '๋' ? 0.7 : 1);

/** ระยะแก้ไขถ่วงน้ำหนักของ a กับ b ถ้าเกิน max คืน max+1 (ตัดทางไว) */
function editDist(a: string, b: string, max: number): number {
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > max + 0.5) return max + 1;
  let prevRow: number[] = [0];
  for (let j = 1; j <= lb; j++) prevRow.push(prevRow[j - 1] + insCost(b[j - 1]));
  for (let i = 1; i <= la; i++) {
    const cur = [prevRow[0] + insCost(a[i - 1])];
    let rowMin = cur[0];
    for (let j = 1; j <= lb; j++) {
      const v = Math.min(prevRow[j] + insCost(a[i - 1]), cur[j - 1] + insCost(b[j - 1]), prevRow[j - 1] + likeCost(a[i - 1], b[j - 1]));
      cur.push(v);
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    prevRow = cur;
  }
  return prevRow[lb];
}

/** คำแนะนำ: คำในพจนานุกรมที่ใกล้ที่สุด (แก้ไม่เกิน 2 อักขระ) เรียงจากใกล้ไปไกล */
export function suggest(word: string, limit = 6): string[] {
  if (!dict) return [];
  const scored: [number, string, number][] = [];
  const max = word.length <= 4 ? 1 : 2;
  for (let k = 0; k < words.length; k++) {
    const w = words[k];
    if (w === word || Math.abs(w.length - word.length) > 2) continue;
    const d = editDist(w, word, max);
    if (d <= max) scored.push([d, w, k]);
  }
  // ใกล้กว่าก่อน เท่ากันเรียงตามความถี่ในคลังข้อความจริง (ไฟล์พจนานุกรมเรียงจากคำที่พบบ่อยไปน้อย)
  scored.sort((x, y) => x[0] - y[0] || x[2] - y[2]);
  return scored.slice(0, limit).map((x) => x[1]);
}

/** พจนานุกรมผู้ใช้ที่เพิ่มเอง (เก็บในเครื่อง) */
const KEY = 'l5g_thai_user_dict';
export function userWords(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) || '[]') as string[]);
  } catch {
    return new Set();
  }
}
export function addUserWord(w: string) {
  try {
    const s = userWords();
    s.add(w);
    localStorage.setItem(KEY, JSON.stringify([...s].slice(-2000)));
  } catch {
    /* โหมดส่วนตัว: เก็บไม่ได้ก็แค่ไม่จำ */
  }
}
