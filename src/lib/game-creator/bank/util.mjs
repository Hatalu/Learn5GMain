// Shared helpers for question generators (seeded, deterministic).

export function rng(seed = Date.now()) {
  let a = (seed >>> 0) || 1;
  const r = () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  r.int = (lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
  r.pick = (arr) => arr[Math.floor(r() * arr.length)];
  r.shuffle = (arr) => {
    const b = arr.slice();
    for (let i = b.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [b[i], b[j]] = [b[j], b[i]];
    }
    return b;
  };
  return r;
}

export const fmt = (n) => Number(n).toLocaleString('en-US', { maximumFractionDigits: 3 });

export function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; }
export function lcm(a, b) { return a / gcd(a, b) * b; }

// "a/b" simplified; whole numbers come back plain.
export function frac(n, d) {
  const g = gcd(n, d);
  n /= g; d /= g;
  return d === 1 ? String(n) : `${n}/${d}`;
}
export function mixed(n, d) {
  const g = gcd(n, d); n /= g; d /= g;
  if (d === 1) return String(n);
  const w = Math.floor(n / d), r = n % d;
  return w ? `${w} ${r}/${d}` : `${r}/${d}`;
}

// Unique wrong numeric answers near the right one.
export function wrongNums(r, ans, deltas, { min = 0, count = 3, format = fmt } = {}) {
  const out = new Set();
  const pool = r.shuffle(deltas);
  for (const d of pool) {
    const v = Math.round((ans + d) * 1000) / 1000;
    if (v !== ans && v >= min) out.add(format(v));
    if (out.size >= count) break;
  }
  let k = 1;
  while (out.size < count) { const v = ans + k * (k % 2 ? 1 : -1) * 7 + 11; if (v >= min && v !== ans) out.add(format(v)); k++; }
  return [...out];
}

// Normalize to a playable question: shuffled choices + answer index.
export function toPlayable(q, r, nChoices = 3) {
  const wrong = r.shuffle([...new Set(q.w.map(String))].filter((x) => x !== q.a)).slice(0, nChoices - 1);
  const choices = r.shuffle([q.a, ...wrong]);
  return { ...q, choices, answer: choices.indexOf(q.a) };
}
