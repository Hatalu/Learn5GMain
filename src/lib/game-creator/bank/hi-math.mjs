// คณิตศาสตร์ ม.1–ม.6 — โจทย์สร้างอัตโนมัติ (ไม่ซ้ำ) รูปแบบเดียวกับ math.js
// gen(d, r): d = 1 เริ่มต้น | 2 ฝึกฝน | 3 ท้าทาย, r = seeded rng จาก util.js
// cat: num จำนวนและพีชคณิต | alg พีชคณิตและฟังก์ชัน | geo การวัดและเรขาคณิต | stat สถิติและความน่าจะเป็น
import { fmt, gcd, frac, wrongNums } from './util.mjs';

const Q = (q, a, w, hint) => ({ q, a: String(a), w: w.map(String), hint });
const N = (r, a, deltas) => wrongNums(r, a, deltas, { min: -1e9 });
const NP = (r, a, deltas) => wrongNums(r, a, deltas, { min: 1 });
const P = (n) => (n < 0 ? `(${n})` : `${n}`);
const term = (a, v) => (a === 1 ? v : a === -1 ? `-${v}` : `${a}${v}`);
const tail = (b) => (b > 0 ? ` + ${b}` : b < 0 ? ` - ${-b}` : '');
const lin = (a, b, v = 'x') => (a === 0 ? `${b}` : `${term(a, v)}${tail(b)}`);
const quad = (a, b, c) => `${term(a, 'x²')}${b ? (b > 0 ? ' + ' : ' - ') + term(Math.abs(b), 'x') : ''}${tail(c)}`;
const fac = (n) => (n <= 1 ? 1 : n * fac(n - 1));
const nPr = (n, k) => fac(n) / fac(n - k);
const nCr = (n, k) => nPr(n, k) / fac(k);
const pt = (x, y) => `(${x}, ${y})`;
const nz = (r, lo, hi) => { let v = 0; while (!v) v = r.int(lo, hi); return v; };
const TRIPLES = [[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [6, 8, 10], [9, 12, 15], [20, 21, 29], [12, 16, 20]];
// ตัวลวงเศษส่วน: แปรตัวเศษ/ตัวส่วนรอบคำตอบ
const fracW = (n, d) => [frac(n + 1, d), frac(Math.max(1, n - 1), d + 1), frac(d, n || 1), frac(n, d + 2), frac(n + 2, d + 1)];
const uniq = (a, list) => [...new Set(list.map(String))].filter((x) => x !== String(a)).slice(0, 3);

export const mathHi = {
  7: [
    {
      id: 'int7a', name: 'การบวกและการลบจำนวนเต็ม', cat: 'num',
      gen(d, r) {
        const R = d === 1 ? 9 : d === 2 ? 30 : 60;
        const a = nz(r, -R, R), b = nz(r, -R, R);
        if (d === 3) {
          const c = nz(r, -R, R), ans = a - b + c;
          return Q(`${a} - ${P(b)} + ${P(c)} = ?`, ans, N(r, ans, [2 * b, -2 * c, 1, -1, 10]), 'ลบจำนวนลบ = บวก');
        }
        const add = r() < 0.5, ans = add ? a + b : a - b;
        return Q(`${a} ${add ? '+' : '-'} ${P(b)} = ?`, ans, N(r, ans, [add ? -2 * b : 2 * b, -2 * a, 1, -1, 10]), 'ดูเครื่องหมายให้ดี');
      },
    },
    {
      id: 'int7b', name: 'การคูณและการหารจำนวนเต็ม', cat: 'num',
      gen(d, r) {
        const a = nz(r, -(d + 1) * 4, (d + 1) * 4), b = nz(r, -9, 9);
        if (r() < 0.5) {
          const ans = a * b;
          return Q(`${P(a)} × ${P(b)} = ?`, ans, uniq(ans, [-ans, ans + b, ans - a, ans + 1]), 'ลบ × ลบ = บวก');
        }
        const p = a * b;
        return Q(`${P(p)} ÷ ${P(b)} = ?`, a, uniq(a, [-a, a + 1, a - 1, b]), 'เครื่องหมายต่างกัน ผลเป็นลบ');
      },
    },
    {
      id: 'pow7', name: 'เลขยกกำลัง', cat: 'num',
      gen(d, r) {
        if (d === 1) {
          const a = r.int(2, 5), n = r.int(2, a > 3 ? 3 : 4), ans = a ** n;
          return Q(`${a} ยกกำลัง ${n} มีค่าเท่าไร`, ans, uniq(ans, [a * n, a ** (n - 1), a ** n + a, a + n]), `${a} คูณกัน ${n} ตัว`);
        }
        if (d === 2) {
          const a = r.int(2, 7), m = r.int(2, 9), n = r.int(2, 9);
          return Q(`$${a}^{${m}}\\times ${a}^{${n}}=${a}^{?}`, m + n, uniq(m + n, [m * n, Math.abs(m - n) || m + n + 2, m + n + 1]), 'ฐานเท่ากัน เลขชี้กำลังบวกกัน');
        }
        const a = r.int(2, 4), n = r.pick([2, 3, 4]), ans = (-a) ** n;
        return Q(`(-${a}) ยกกำลัง ${n} มีค่าเท่าไร`, ans, uniq(ans, [-ans, -a * n, a * n, ans + a, ans - a]), 'ลบยกกำลังคู่ได้บวก');
      },
    },
    {
      id: 'sci7', name: 'สัญกรณ์วิทยาศาสตร์', cat: 'num',
      gen(d, r) {
        if (d === 1) {
          const m = r.int(1, 9), k = r.int(3, 7);
          return Q(`${fmt(m * 10 ** k)} = ${m} × 10 ยกกำลังเท่าไร`, k, NP(r, k, [1, -1, 2, -2]), 'นับจำนวนศูนย์');
        }
        if (d === 2) {
          const m = r.int(1, 9), k = r.int(2, 5);
          return Q(`0.${'0'.repeat(k - 1)}${m} = ${m} × 10 ยกกำลังเท่าไร`, -k, uniq(-k, [k, -k + 1, -k - 1]), 'ทศนิยมเลื่อนไปทางขวา เลขชี้กำลังเป็นลบ');
        }
        const a = r.int(11, 99), k = r.int(3, 8), n = a * 10 ** (k - 1);
        return Q(`${fmt(n)} เขียนในรูป ${a / 10} × 10 ยกกำลังเท่าไร`, k, NP(r, k, [1, -1, 2]), 'ตัวหน้าต้องอยู่ระหว่าง 1 ถึง 10');
      },
    },
    {
      id: 'eq7', name: 'สมการเชิงเส้นตัวแปรเดียว', cat: 'alg',
      gen(d, r) {
        const x = d === 1 ? r.int(1, 20) : r.int(-9, 15);
        if (d === 1) {
          const a = r.int(2, 30);
          return Q(`x + ${a} = ${x + a} แล้ว x = ?`, x, N(r, x, [2 * a, 1, -1, a]), 'ย้าย ' + a + ' ไปลบอีกข้าง');
        }
        const a = r.int(2, 9), b = nz(r, -20, 20);
        if (d === 2) return Q(`${lin(a, b)} = ${a * x + b} แล้ว x = ?`, x, N(r, x, [1, -1, 2, -x * 2 || 3]), 'ย้าย b ก่อน แล้วหารด้วย a');
        const c = r.int(2, 5);
        return Q(`${c}(x${tail(b)}) = ${c * (x + b)} แล้ว x = ?`, x, N(r, x, [2 * b, b, 1, -1]), `หารด้วย ${c} ก่อน`);
      },
    },
    {
      id: 'ratio7', name: 'อัตราส่วนและสัดส่วน', cat: 'num',
      gen(d, r) {
        if (d === 1) {
          const a = r.int(1, 9), b = r.int(2, 9), k = r.int(2, 8);
          return Q(`${a} : ${b} = ${a * k} : ?`, b * k, NP(r, b * k, [b, -b, k, 1]), `คูณทั้งสองข้างด้วย ${k}`);
        }
        if (d === 2) {
          const a = r.int(1, 5), b = r.int(1, 5), u = r.int(2, 30) * 10, tot = (a + b) * u;
          return Q(`แบ่งเงิน ${fmt(tot)} บาท ตามอัตราส่วน ${a} : ${b} คนแรกได้กี่บาท`, a * u, NP(r, a * u, [u, -u, b * u - a * u || 2 * u]), `ทั้งหมด ${a + b} ส่วน`);
        }
        const s = r.pick([10000, 50000, 100000, 200000]), cm = r.int(2, 12), km = (cm * s) / 100000;
        return Q(`แผนที่มาตราส่วน 1 : ${fmt(s)} ระยะ ${cm} ซม. เท่ากับระยะจริงกี่กิโลเมตร`, fmt(km), uniq(fmt(km), [fmt(km * 10), fmt(km / 10), fmt(km + cm), fmt(km * 100)]), '1 กม. = 100,000 ซม.');
      },
    },
    {
      id: 'pct7', name: 'ร้อยละในชีวิตประจำวัน', cat: 'num',
      gen(d, r) {
        if (d === 1) {
          const p = r.pick([10, 20, 25, 50, 75, 5, 15]), n = r.int(1, 20) * 20, ans = (p * n) / 100;
          return Q(`ร้อยละ ${p} ของ ${n} เท่ากับเท่าไร`, ans, NP(r, ans, [ans, -ans / 2, 5, 10]), `${p}/100 × ${n}`);
        }
        if (d === 2) {
          const p = r.pick([10, 20, 25, 30, 40]), price = r.int(2, 30) * 100, pay = price * (1 - p / 100);
          return Q(`เสื้อราคา ${fmt(price)} บาท ลด ${p}% ต้องจ่ายกี่บาท`, pay, NP(r, pay, [(price * p) / 100 - pay, 100, -100, 50]), 'ราคาเต็ม ลบ ส่วนลด');
        }
        const b = r.int(2, 20) * 100, p = r.pick([10, 20, 25, 50]), s = b * (1 + p / 100);
        return Q(`ซื้อมา ${fmt(b)} บาท ขายไป ${fmt(s)} บาท ได้กำไรร้อยละเท่าไร`, p, NP(r, p, [5, -5, 10, p]), 'กำไร ÷ ทุน × 100');
      },
    },
    {
      id: 'graph7', name: 'กราฟและความสัมพันธ์เชิงเส้น', cat: 'alg',
      gen(d, r) {
        const a = nz(r, -5, 5), b = r.int(-9, 9), x = r.int(-5, 6);
        if (d === 3) {
          const y = a * x + b;
          return Q(`y = ${lin(a, b)} ถ้า y = ${y} แล้ว x เท่ากับเท่าไร`, x, N(r, x, [1, -1, 2, -2]), 'แทน y แล้วแก้สมการ');
        }
        const y = a * x + b;
        return Q(d === 1 ? `y = ${lin(a, b)} เมื่อ x = ${x} แล้ว y = ?` : `จุด (${x}, ?) อยู่บนเส้นตรง y = ${lin(a, b)}`, y, N(r, y, [a, -a, 1, b - y || 2]), 'แทนค่า x ลงในสมการ');
      },
    },
    {
      id: 'solid7', name: 'มิติสัมพันธ์ของรูปเรขาคณิตสามมิติ', cat: 'geo',
      gen(d, r) {
        const S = [['ลูกบาศก์', 6, 12, 8], ['ปริซึมสามเหลี่ยม', 5, 9, 6], ['ปริซึมห้าเหลี่ยม', 7, 15, 10], ['ปริซึมหกเหลี่ยม', 8, 18, 12], ['พีระมิดฐานสี่เหลี่ยม', 5, 8, 5], ['พีระมิดฐานสามเหลี่ยม', 4, 6, 4], ['พีระมิดฐานห้าเหลี่ยม', 6, 10, 6], ['พีระมิดฐานหกเหลี่ยม', 7, 12, 7]];
        const [n, f, e, v] = r.pick(S), k = d - 1, ans = [f, e, v][k];
        return Q(`${n} มี${['หน้า', 'สัน', 'จุดยอด'][k]}กี่${['หน้า', 'เส้น', 'จุด'][k]}`, ans, NP(r, ans, [1, -1, 2, -2, 3]), 'หน้า + จุดยอด - สัน = 2');
      },
    },
    {
      id: 'stat7', name: 'สถิติเบื้องต้น (ค่าเฉลี่ย มัธยฐาน ฐานนิยม)', cat: 'stat',
      gen(d, r) {
        if (d === 1) {
          const m = r.int(5, 40), xs = [m - 3, m + 1, m + 4, m - 2];
          return Q(`ค่าเฉลี่ยของ ${r.shuffle(xs).join(', ')} คือ`, m, NP(r, m, [1, -1, 2, 4]), 'รวมทั้งหมด หารด้วยจำนวนข้อมูล');
        }
        if (d === 2) {
          const xs = Array.from({ length: 5 }, () => r.int(1, 50)), s = xs.slice().sort((a, b) => a - b);
          return Q(`มัธยฐานของ ${xs.join(', ')} คือ`, s[2], uniq(s[2], [xs[2], s[1], s[3], Math.round(s.reduce((a, b) => a + b) / 5)]), 'เรียงก่อน แล้วดูตัวตรงกลาง');
        }
        const m = r.int(2, 20), xs = r.shuffle([m, m, m, m + 2, m + 2, m - 1, m + 5]);
        return Q(`ฐานนิยมของ ${xs.join(', ')} คือ`, m, uniq(m, [m + 2, m - 1, m + 5]), 'ค่าที่ซ้ำบ่อยที่สุด');
      },
    },
    {
      id: 'angle7', name: 'เส้นขนานและมุม', cat: 'geo',
      gen(d, r) {
        const x = r.int(25, 155);
        if (d === 1) return Q(`เส้นขนานสองเส้นถูกตัด มุมแย้งมุมหนึ่ง ${x}° อีกมุมหนึ่งกี่องศา`, x, uniq(x, [180 - x, 90 - x > 0 ? 90 - x : x + 10, x + 20]), 'มุมแย้งเท่ากัน');
        if (d === 2) return Q(`มุมภายในที่อยู่บนข้างเดียวกันของเส้นตัด มุมหนึ่ง ${x}° อีกมุมกี่องศา`, 180 - x, uniq(180 - x, [x, 360 - x, 90 + x > 180 ? x - 10 : 90 + x]), 'รวมกันได้ 180°');
        const a = r.int(30, 80), b = r.int(30, 80), c = 180 - a - b;
        return Q(`สามเหลี่ยมมีมุม ${a}° และ ${b}° มุมที่สามกี่องศา`, c, NP(r, c, [10, -10, 20, a - c || 5]), 'มุมในสามเหลี่ยมรวม 180°');
      },
    },
  ],
  8: [
    {
      id: 'pyth8', name: 'ทฤษฎีบทพีทาโกรัส', cat: 'geo',
      gen(d, r) {
        const [a, b, c] = r.pick(TRIPLES);
        if (d === 1) return Q(`สามเหลี่ยมมุมฉาก ด้านประกอบมุมฉากยาว ${a} และ ${b} ด้านตรงข้ามมุมฉากยาวเท่าไร`, c, NP(r, c, [a + b - c, 1, -1, 2]), 'c² = a² + b²');
        if (d === 2) return Q(`ด้านตรงข้ามมุมฉาก ${c} ด้านหนึ่ง ${a} อีกด้านยาวเท่าไร`, b, NP(r, b, [c - a - b || 3, 1, -1, 2]), 'b² = c² - a²');
        const k = r.int(2, 4);
        return Q(`บันไดยาว ${c * k} ม. พิงผนัง ปลายล่างห่างผนัง ${a * k} ม. ปลายบนสูงจากพื้นกี่เมตร`, b * k, NP(r, b * k, [k, -k, c * k - a * k - b * k || 2]), 'บันได คือด้านตรงข้ามมุมฉาก');
      },
    },
    {
      id: 'root8', name: 'รากที่สองและรากที่สาม', cat: 'num',
      gen(d, r) {
        if (d === 1) { const n = r.int(4, 20); return Q(`√${n * n} = ?`, n, NP(r, n, [1, -1, 2, n])); }
        if (d === 2) { const n = r.int(2, 10); return Q(`รากที่สามของ ${n ** 3} คือ`, n, NP(r, n, [1, -1, 2, n])); }
        const [a, b] = r.pick([[2, 8], [3, 12], [2, 18], [5, 20], [3, 27], [2, 32], [6, 24], [7, 28]]), ans = Math.sqrt(a * b);
        return Q(`√${a} × √${b} = ?`, ans, NP(r, ans, [1, -1, 2, ans]), 'รวมเป็นรากเดียวกันก่อน');
      },
    },
    {
      id: 'real8', name: 'ทศนิยมซ้ำและจำนวนจริง', cat: 'num',
      gen(d, r) {
        if (d === 1) {
          let n = r.int(2, 99);
          while (Number.isInteger(Math.sqrt(n))) n++;
          const sq = r.int(2, 12) ** 2;
          return Q('จำนวนใดเป็นจำนวนอตรรกยะ', `√${n}`, [`√${sq}`, frac(r.int(1, 9), r.int(2, 9)), `0.${r.int(1, 9)}${r.int(1, 9)}`], 'เขียนเป็นเศษส่วนไม่ได้');
        }
        if (d === 2) {
          const T = [['0.333...', '1/3'], ['0.666...', '2/3'], ['0.111...', '1/9'], ['0.444...', '4/9'], ['0.555...', '5/9'], ['0.777...', '7/9'], ['0.0909...', '1/11'], ['0.1666...', '1/6']];
          const [x, f] = r.pick(T);
          return Q(`${x} เท่ากับเศษส่วนใด`, f, uniq(f, T.map((t) => t[1]).filter((y) => y !== f).slice(0, 4).concat(['1/10'])).slice(0, 3), 'ทศนิยมซ้ำหนึ่งตัว ใช้ตัวส่วน 9');
        }
        let n = r.int(10, 99);
        while (Number.isInteger(Math.sqrt(n))) n++;
        const a = Math.floor(Math.sqrt(n));
        return Q(`√${n} อยู่ระหว่างจำนวนเต็มคู่ใด`, `${a} กับ ${a + 1}`, [`${a - 1} กับ ${a}`, `${a + 1} กับ ${a + 2}`, `${Math.floor(n / 2)} กับ ${Math.floor(n / 2) + 1}`], `${a}² = ${a * a}`);
      },
    },
    {
      id: 'law8', name: 'สมบัติของเลขยกกำลัง', cat: 'num',
      gen(d, r) {
        const a = r.int(2, 9), m = r.int(2, 8), n = r.int(2, 6);
        if (d === 1) return Q(`$${a}^{${m}}\\times ${a}^{${n}}=${a}^{?}`, m + n, uniq(m + n, [m * n, m + n + 1, Math.abs(m - n) || 1]), 'คูณ ฐานเท่ากัน ชี้กำลังบวกกัน');
        if (d === 2) return Q(`$(${a}^{${m}})^{${n}}=${a}^{?}`, m * n, uniq(m * n, [m + n, m * n + 1, m ** n > 200 ? m * n - 1 : m ** n, m * n + 2, m * n - 1]), 'ยกกำลังซ้อน ชี้กำลังคูณกัน');
        const b = r.int(2, 5), k = r.int(1, 3);
        return Q(`$${b}^{-${k}}=?`, frac(1, b ** k), uniq(frac(1, b ** k), [String(-b * k), String(-(b ** k)), frac(1, b * k), frac(k, b), frac(1, b ** k + 1), String(b ** k)]), 'ชี้กำลังลบ = กลับเศษเป็นส่วน');
      },
    },
    {
      id: 'poly8', name: 'พหุนาม (บวก ลบ คูณ)', cat: 'alg',
      gen(d, r) {
        if (d === 1) {
          const a = r.int(1, 9), b = nz(r, -9, 9), c = r.int(1, 9), e = nz(r, -9, 9);
          if (b + e === 0) return this.gen(d, r);
          return Q(`(${lin(a, b)}) + (${lin(c, e)}) = ?`, lin(a + c, b + e), uniq(lin(a + c, b + e), [lin(a + c, b - e), lin(a - c || a + c + 1, b + e), lin(a * c, b + e), lin(a + c + 1, b + e)]), 'รวมพจน์คล้าย');
        }
        if (d === 2) {
          const k = r.int(2, 9), b = nz(r, -9, 9);
          return Q(`${k}(${lin(1, b)}) = ?`, lin(k, k * b), uniq(lin(k, k * b), [lin(k, b), lin(1, k * b), lin(k, -k * b)]), 'กระจายเข้าไปทุกพจน์');
        }
        const p = nz(r, -7, 7), q = nz(r, -7, 7);
        if (p + q === 0) return this.gen(d, r);
        return Q(`(x${tail(p)})(x${tail(q)}) = ?`, quad(1, p + q, p * q), uniq(quad(1, p + q, p * q), [quad(1, p * q, p + q), quad(1, p - q || p + q + 1, p * q), quad(1, p + q, -p * q)]), 'FOIL: หน้า นอก ใน หลัง');
      },
    },
    {
      id: 'factor8', name: 'การแยกตัวประกอบพหุนามดีกรีสอง', cat: 'alg',
      gen(d, r) {
        const F = (p, q) => `(x${tail(p)})(x${tail(q)})`;
        if (d === 3) {
          const a = r.int(2, 12);
          return Q(`x² - ${a * a} แยกตัวประกอบได้เป็น`, `(x - ${a})(x + ${a})`, [`(x - ${a})(x - ${a})`, `(x + ${a})(x + ${a})`, `(x - ${a * a})(x + 1)`], 'ผลต่างกำลังสอง');
        }
        const p = d === 1 ? r.int(1, 9) : nz(r, -9, 9), q = d === 1 ? r.int(1, 9) : nz(r, -9, 9);
        if (p + q === 0 || p === q) return this.gen(d, r);
        return Q(`${quad(1, p + q, p * q)} แยกตัวประกอบได้เป็น`, F(p, q), uniq(F(p, q), [F(-p, -q), F(p * q, 1), F(p, -q), F(-p, q)]), `หาสองจำนวนคูณกันได้ ${p * q} บวกกันได้ ${p + q}`);
      },
    },
    {
      id: 'surf8', name: 'พื้นที่ผิวปริซึมและทรงกระบอก', cat: 'geo',
      gen(d, r) {
        if (d === 1) { const a = r.int(2, 12), ans = 6 * a * a; return Q(`ลูกบาศก์ยาวด้านละ ${a} ซม. มีพื้นที่ผิวกี่ตารางเซนติเมตร`, ans, NP(r, ans, [-2 * a * a, a * a, -ans + a ** 3 || 6]), 'มี 6 หน้า หน้าละ a²'); }
        if (d === 2) { const l = r.int(3, 12), w = r.int(2, 9), h = r.int(2, 9), ans = 2 * (l * w + l * h + w * h); return Q(`กล่องกว้าง ${w} ยาว ${l} สูง ${h} ซม. มีพื้นที่ผิวกี่ตารางเซนติเมตร`, ans, NP(r, ans, [-ans / 2, l * w * h - ans || 4, 2 * l * w, -2 * w * h]), '2(กว้าง×ยาว + ยาว×สูง + กว้าง×สูง)'); }
        const rr = r.pick([7, 14]), h = r.int(2, 10), ans = (2 * 22 * rr * h) / 7;
        return Q(`ทรงกระบอกรัศมี ${rr} สูง ${h} ซม. พื้นที่ผิวข้าง (π = 22/7) กี่ตร.ซม.`, ans, NP(r, ans, [ans / 2, -ans / 2, 22 * rr]), 'พื้นที่ผิวข้าง = 2πrh');
      },
    },
    {
      id: 'vol8', name: 'ปริมาตรปริซึมและทรงกระบอก', cat: 'geo',
      gen(d, r) {
        if (d === 1) { const l = r.int(2, 12), w = r.int(2, 9), h = r.int(2, 9), ans = l * w * h; return Q(`กล่องกว้าง ${w} ยาว ${l} สูง ${h} ซม. จุกี่ลูกบาศก์เซนติเมตร`, ans, NP(r, ans, [l * w, -l * h, l + w + h - ans || 5, w * h])); }
        if (d === 2) { const b = r.int(1, 6) * 2, t = r.int(2, 9), L = r.int(3, 15), ans = (b * t * L) / 2; return Q(`ปริซึมฐานสามเหลี่ยม ฐานยาว ${b} สูง ${t} ปริซึมยาว ${L} ซม. ปริมาตรเท่าไร`, ans, NP(r, ans, [ans, -ans / 2, L])); }
        const rr = r.pick([7, 14]), h = r.int(2, 10), ans = (22 * rr * rr * h) / 7;
        return Q(`ทรงกระบอกรัศมี ${rr} สูง ${h} ซม. ปริมาตร (π = 22/7) กี่ลบ.ซม.`, ans, NP(r, ans, [ans / 2, -ans / 2, ans]), 'ปริมาตร = πr²h');
      },
    },
    {
      id: 'trans8', name: 'การแปลงทางเรขาคณิต', cat: 'geo',
      gen(d, r) {
        const x = nz(r, -8, 8), y = nz(r, -8, 8);
        if (x === y || x === -y) return this.gen(d, r);
        if (d === 1) {
          const a = nz(r, -6, 6), b = nz(r, -6, 6);
          return Q(`เลื่อนจุด ${pt(x, y)} ไปทางขวา ${a} หน่วย และขึ้น ${b} หน่วย ได้จุดใด`.replace(`ขวา ${a}`, a < 0 ? `ซ้าย ${-a}` : `ขวา ${a}`).replace(`ขึ้น ${b}`, b < 0 ? `ลง ${-b}` : `ขึ้น ${b}`), pt(x + a, y + b), uniq(pt(x + a, y + b), [pt(x - a, y - b), pt(x + b, y + a), pt(x + a, y - b)]), 'ขวา/ขึ้น บวก ซ้าย/ลง ลบ');
        }
        if (d === 2) {
          const ax = r() < 0.5;
          const ans = ax ? pt(x, -y) : pt(-x, y);
          return Q(`สะท้อนจุด ${pt(x, y)} ข้ามแกน ${ax ? 'X' : 'Y'} ได้จุดใด`, ans, uniq(ans, [ax ? pt(-x, y) : pt(x, -y), pt(-x, -y), pt(y, x)]), ax ? 'ข้ามแกน X ค่า y เปลี่ยนเครื่องหมาย' : 'ข้ามแกน Y ค่า x เปลี่ยนเครื่องหมาย');
        }
        return Q(`หมุนจุด ${pt(x, y)} รอบจุดกำเนิด 180° ได้จุดใด`, pt(-x, -y), uniq(pt(-x, -y), [pt(-y, x), pt(x, -y), pt(-x, y)]), 'หมุน 180° เปลี่ยนเครื่องหมายทั้งคู่');
      },
    },
    {
      id: 'stat8', name: 'การวิเคราะห์ข้อมูล (พิสัย ค่าเฉลี่ยจากตาราง)', cat: 'stat',
      gen(d, r) {
        if (d === 1) {
          const xs = Array.from({ length: 6 }, () => r.int(5, 95)), ans = Math.max(...xs) - Math.min(...xs);
          return Q(`พิสัยของ ${xs.join(', ')} คือ`, ans, NP(r, ans, [1, -1, 10, -10, 5]), 'มากสุด ลบ น้อยสุด');
        }
        if (d === 2) {
          const v = [r.int(1, 4), r.int(5, 7), r.int(8, 10)], f = [r.int(1, 4), r.int(1, 4), r.int(1, 4)];
          const n = f[0] + f[1] + f[2], s = v[0] * f[0] + v[1] * f[1] + v[2] * f[2];
          if (s % n) return this.gen(d, r);
          return Q(`คะแนน ${v[0]} มี ${f[0]} คน, ${v[1]} มี ${f[1]} คน, ${v[2]} มี ${f[2]} คน ค่าเฉลี่ยเท่าไร`, s / n, NP(r, s / n, [1, -1, 2]), 'คะแนน × จำนวนคน แล้วหารด้วยจำนวนคนทั้งหมด');
        }
        const xs = Array.from({ length: 6 }, () => r.int(1, 30) * 2), s = xs.slice().sort((a, b) => a - b), ans = (s[2] + s[3]) / 2;
        return Q(`มัธยฐานของ ${xs.join(', ')} คือ`, ans, uniq(ans, [s[2], s[3], xs[2], ans + 1]), 'ข้อมูลคู่ เอาสองตัวกลางมาเฉลี่ย');
      },
    },
    {
      id: 'poly8b', name: 'มุมภายในรูปหลายเหลี่ยม', cat: 'geo',
      gen(d, r) {
        const n = r.pick([3, 4, 5, 6, 8, 9, 10, 12]);
        if (d === 1) { const ans = (n - 2) * 180; return Q(`รูป ${n} เหลี่ยม มุมภายในรวมกันกี่องศา`, ans, NP(r, ans, [180, -180, 360])); }
        if (d === 2) { const ans = ((n - 2) * 180) / n; return Q(`รูป ${n} เหลี่ยมด้านเท่ามุมเท่า แต่ละมุมภายในกี่องศา`, fmt(ans), uniq(fmt(ans), [fmt(360 / n), fmt(ans + 10), fmt((n * 180) / n)])); }
        return Q(`มุมภายนอกของรูปหลายเหลี่ยมด้านเท่ามุมเท่า มุมละ ${360 / n}° รูปนี้มีกี่ด้าน`, n, NP(r, n, [1, -1, 2, -2]), 'มุมภายนอกรวม 360°');
      },
    },
  ],
  9: [
    {
      id: 'ineq9', name: 'อสมการเชิงเส้นตัวแปรเดียว', cat: 'alg',
      gen(d, r) {
        const k = nz(r, -9, 12), ops = ['>', '<', '≥', '≤'], o = r.pick(ops), flip = { '>': '<', '<': '>', '≥': '≤', '≤': '≥' }[o];
        const inv = { '>': '<', '<': '>', '≥': '≤', '≤': '≥' };
        const opts = (op) => [`x ${inv[op]} ${k}`, `x ${op} ${-k}`, `x ${inv[op]} ${-k}`];
        if (d === 1) { const a = r.int(1, 20); return Q(`x + ${a} ${o} ${k + a} คำตอบคือ`, `x ${o} ${k}`, opts(o), `ลบ ${a} ทั้งสองข้าง`); }
        const a = r.int(2, 6), b = nz(r, -10, 10);
        if (d === 2) return Q(`${lin(a, b)} ${o} ${a * k + b} คำตอบคือ`, `x ${o} ${k}`, opts(o), 'ย้ายข้าง แล้วหารด้วยจำนวนบวก');
        return Q(`${lin(-a, b)} ${o} ${-a * k + b} คำตอบคือ`, `x ${flip} ${k}`, opts(flip), 'หารด้วยจำนวนลบ ต้องกลับเครื่องหมาย');
      },
    },
    {
      id: 'factor9', name: 'การแยกตัวประกอบพหุนาม (ขั้นสูง)', cat: 'alg',
      gen(d, r) {
        if (d === 1) {
          const a = r.int(2, 9), b = nz(r, -9, 9);
          if (gcd(a, Math.abs(b)) !== 1) return this.gen(d, r);
          return Q(`${quad(a, b, 0)} แยกตัวประกอบได้เป็น`, `x(${lin(a, b)})`, [`x(${lin(a, -b)})`, `${a}x(x${tail(b)})`, `x²(${lin(a, b)})`], 'ดึง x ออกมา');
        }
        if (d === 2) {
          const q = nz(r, -7, 7), s = nz(r, -7, 7);
          const B = 2 * s + q;
          if (!B) return this.gen(d, r);
          const F = (x, y) => `(2x${tail(x)})(x${tail(y)})`;
          return Q(`${quad(2, B, q * s)} แยกตัวประกอบได้เป็น`, F(q, s), uniq(F(q, s), [F(s, q), F(-q, -s), F(-q, s)]), 'ลองคูณกลับเพื่อตรวจ');
        }
        const a = r.int(2, 5), cube = r() < 0.5;
        return cube
          ? Q(`x³ - ${a ** 3} แยกตัวประกอบได้เป็น`, `(x - ${a})(x² + ${a}x + ${a * a})`, [`(x - ${a})(x² - ${a}x + ${a * a})`, `(x + ${a})(x² - ${a}x + ${a * a})`, `(x - ${a})(x + ${a})(x + ${a})`], 'ผลต่างกำลังสาม')
          : Q(`x³ + ${a ** 3} แยกตัวประกอบได้เป็น`, `(x + ${a})(x² - ${a}x + ${a * a})`, [`(x + ${a})(x² + ${a}x + ${a * a})`, `(x - ${a})(x² + ${a}x + ${a * a})`, `(x + ${a})(x + ${a})(x + ${a})`], 'ผลบวกกำลังสาม');
      },
    },
    {
      id: 'qeq9', name: 'สมการกำลังสองตัวแปรเดียว', cat: 'alg',
      gen(d, r) {
        const S = (p, q) => `x = ${Math.min(p, q)} หรือ x = ${Math.max(p, q)}`;
        if (d === 1) { const a = r.int(2, 12); return Q(`x² = ${a * a} คำตอบคือ`, `x = ${a} หรือ x = -${a}`, [`x = ${a} เท่านั้น`, `x = ${a * 2} หรือ x = -${a * 2}`, `x = ${a * a}`], 'ได้ทั้งบวกและลบ'); }
        const p = d === 2 ? r.int(1, 9) : nz(r, -9, 9), q = d === 2 ? r.int(1, 9) : nz(r, -9, 9);
        if (p === q || p === -q) return this.gen(d, r);
        return Q(`${quad(1, -(p + q), p * q)} = 0 คำตอบคือ`, S(p, q), uniq(S(p, q), [S(-p, -q), S(p, -q), S(-p, q)]), 'แยกตัวประกอบ แล้วให้แต่ละวงเล็บเป็น 0');
      },
    },
    {
      id: 'parab9', name: 'กราฟของฟังก์ชันกำลังสอง', cat: 'alg',
      gen(d, r) {
        const h = nz(r, -6, 6), k = nz(r, -9, 9), a = r.pick([1, 2, -1, -2, 3]);
        const f = `y = ${a === 1 ? '' : a === -1 ? '-' : a}(x${tail(-h)})²${tail(k)}`;
        if (d === 1) return Q(`จุดยอดของ ${f} คือ`, pt(h, k), uniq(pt(h, k), [pt(-h, k), pt(k, h), pt(h, -k)]), 'y = a(x - h)² + k จุดยอด (h, k)');
        if (d === 2) return Q(`${f} มีค่าใดต่อไปนี้`, `ค่า${a > 0 ? 'ต่ำ' : 'สูง'}สุด ${k}`, [`ค่า${a > 0 ? 'สูง' : 'ต่ำ'}สุด ${k}`, `ค่า${a > 0 ? 'ต่ำ' : 'สูง'}สุด ${h}`, `ค่า${a > 0 ? 'ต่ำ' : 'สูง'}สุด ${-k}`], 'a > 0 หงาย มีค่าต่ำสุด');
        const b = 2 * nz(r, -6, 6), c = r.int(-9, 9);
        return Q(`แกนสมมาตรของ y = ${quad(1, b, c)} คือ`, `x = ${-b / 2}`, uniq(`x = ${-b / 2}`, [`x = ${b / 2}`, `x = ${-b}`, `x = ${c}`]), 'x = -b/2a');
      },
    },
    {
      id: 'sys9', name: 'ระบบสมการเชิงเส้นสองตัวแปร', cat: 'alg',
      gen(d, r) {
        const x = r.int(-5, 15), y = r.int(-5, 15);
        if (d === 1) return Q(`x + y = ${x + y} และ x - y = ${x - y} แล้ว x = ?`, x, N(r, x, [y - x || 2, 1, -1, 2]), 'นำสองสมการมาบวกกัน');
        if (d === 2) {
          const a = r.int(2, 4), b = r.int(2, 4);
          return Q(`${lin(a, 0)} + ${term(1, 'y')} = ${a * x + y} และ x + ${term(b, 'y')} = ${x + b * y} แล้ว y = ?`, y, N(r, y, [x - y || 3, 1, -1]), 'กำจัดตัวแปรทีละตัว');
        }
        const pig = r.int(2, 15), chick = r.int(2, 20);
        return Q(`ไก่กับหมูรวม ${pig + chick} ตัว มีขารวม ${4 * pig + 2 * chick} ขา มีหมูกี่ตัว`, pig, NP(r, pig, [chick - pig || 2, 1, -1, 2]), 'ไก่ 2 ขา หมู 4 ขา');
      },
    },
    {
      id: 'sim9', name: 'รูปสามเหลี่ยมที่คล้ายกัน', cat: 'geo',
      gen(d, r) {
        if (d === 1) {
          const a = r.int(2, 9), b = r.int(2, 9), k = r.int(2, 5);
          return Q(`สามเหลี่ยมคล้ายกัน ด้าน ${a} สมนัยกับ ${a * k} ถ้าอีกด้านยาว ${b} ด้านสมนัยยาวเท่าไร`, b * k, NP(r, b * k, [k, -k, a, b]), `อัตราส่วน 1 : ${k}`);
        }
        if (d === 2) {
          const ph = r.pick([150, 160, 180]), ps = r.pick([1, 2, 3]) * 100, k = r.int(2, 8), ans = (ph * k) / 100;
          return Q(`คนสูง ${ph} ซม. มีเงายาว ${ps / 100} ม. ต้นไม้เงายาว ${(ps * k) / 100} ม. ต้นไม้สูงกี่เมตร`, fmt(ans), uniq(fmt(ans), [fmt(ans * 2), fmt(ans / 2), fmt(ans + 1)]), 'อัตราส่วนความสูงต่อเงาเท่ากัน');
        }
        const k = r.int(2, 5), A = r.int(2, 12);
        return Q(`สามเหลี่ยมคล้ายกัน อัตราส่วนด้าน 1 : ${k} รูปเล็กมีพื้นที่ ${A} ตร.หน่วย รูปใหญ่มีพื้นที่เท่าไร`, A * k * k, NP(r, A * k * k, [A * k - A * k * k, A, -A]), 'พื้นที่เป็นกำลังสองของอัตราส่วนด้าน');
      },
    },
    {
      id: 'trig9', name: 'อัตราส่วนตรีโกณมิติ', cat: 'geo',
      gen(d, r) {
        const k = r.int(1, 3), [a, b, c] = r.pick(TRIPLES).map((x) => x * k);
        const names = ['sin', 'cos', 'tan'], ans = [frac(a, c), frac(b, c), frac(a, b)][d - 1];
        return Q(`สามเหลี่ยมมุมฉาก ด้านตรงข้ามมุม A ยาว ${a} ด้านประชิดยาว ${b} ด้านตรงข้ามมุมฉากยาว ${c} ค่า ${names[d - 1]} A คือ`, ans, uniq(ans, [frac(a, c), frac(b, c), frac(a, b), frac(b, a), frac(c, a)]), 'sin = ข้าม/ฉาก cos = ชิด/ฉาก tan = ข้าม/ชิด');
      },
    },
    {
      id: 'circ9', name: 'วงกลม (มุมในวงกลม)', cat: 'geo',
      gen(d, r) {
        const x = r.int(15, 85);
        if (d === 1) return Q(`มุมที่จุดศูนย์กลาง ${2 * x}° มุมในส่วนโค้งเดียวกันกี่องศา`, x, NP(r, x, [x, 10, -10, 180 - 3 * x]), 'มุมในส่วนโค้งเป็นครึ่งหนึ่ง');
        if (d === 2) return Q(`มุมในส่วนโค้ง ${x}° มุมที่จุดศูนย์กลางที่รองรับส่วนโค้งเดียวกันกี่องศา`, 2 * x, NP(r, 2 * x, [-x, 10, 180 - 2 * x - 2 * x || 20]), 'มุมที่จุดศูนย์กลางเป็นสองเท่า');
        return Q(`สามเหลี่ยมแนบในครึ่งวงกลม มุมหนึ่ง ${x}° อีกมุมที่ไม่ใช่มุมฉากกี่องศา`, 90 - x, uniq(90 - x, [180 - x, x, 90 + x]), 'มุมในครึ่งวงกลม = 90°');
      },
    },
    {
      id: 'vol9', name: 'ปริมาตรพีระมิด กรวย และทรงกลม', cat: 'geo',
      gen(d, r) {
        if (d === 1) { const a = r.int(2, 10), h = r.int(1, 6) * 3, ans = (a * a * h) / 3; return Q(`พีระมิดฐานสี่เหลี่ยมจัตุรัสด้าน ${a} สูง ${h} ซม. ปริมาตรกี่ลบ.ซม.`, ans, NP(r, ans, [2 * ans, -ans / 3, a * a])); }
        if (d === 2) { const rr = r.int(2, 9), h = r.int(1, 5) * 3, k = (rr * rr * h) / 3; return Q(`กรวยรัศมี ${rr} สูง ${h} หน่วย ปริมาตรเท่าไร`, `${k}π`, uniq(`${k}π`, [`${k * 3}π`, `${rr * h}π`, `${2 * k}π`]), 'ปริมาตรกรวย = ⅓πr²h'); }
        const rr = r.pick([3, 6, 9, 12, 15]), k = (4 * rr ** 3) / 3;
        if (r() < 0.5) return Q(`ครึ่งทรงกลมรัศมี ${rr} หน่วย ปริมาตรเท่าไร`, `${k / 2}π`, uniq(`${k / 2}π`, [`${k}π`, `${2 * rr * rr}π`, `${rr ** 3}π`]), 'ครึ่งหนึ่งของ 4/3 πr³');
        return Q(`ทรงกลมรัศมี ${rr} หน่วย ปริมาตรเท่าไร`, `${k}π`, uniq(`${k}π`, [`${4 * rr * rr}π`, `${rr ** 3}π`, `${k * 2}π`]), 'ปริมาตรทรงกลม = 4/3 πr³');
      },
    },
    {
      id: 'prob9', name: 'ความน่าจะเป็น', cat: 'stat',
      gen(d, r) {
        if (d === 1) {
          const E = [['ได้แต้มคู่', 1, 2], ['ได้แต้มมากกว่า 4', 1, 3], ['ได้แต้ม 6', 1, 6], ['ได้แต้มเป็นจำนวนเฉพาะ', 1, 2], ['ได้แต้มน้อยกว่า 5', 2, 3], ['ได้แต้มหารด้วย 3 ลงตัว', 1, 3]];
          if (r() < 0.5) { const N = r.int(10, 30), ev = Math.floor(N / 2); return Q(`สุ่มบัตรเลข 1 ถึง ${N} หนึ่งใบ ความน่าจะเป็นที่ได้เลขคู่`, frac(ev, N), uniq(frac(ev, N), [frac(ev + 1, N), frac(1, N), frac(ev, N + 1), '1/3']), 'นับเลขคู่ ÷ บัตรทั้งหมด'); }
          const [e, n, m] = r.pick(E);
          return Q(`ทอดลูกเต๋า 1 ลูก ความน่าจะเป็นที่${e}`, frac(n, m), uniq(frac(n, m), ['1/6', '1/2', '1/3', '2/3', '5/6']), 'เหตุการณ์ที่สนใจ ÷ ผลทั้งหมด 6');
        }
        if (d === 2) {
          const a = r.int(1, 8), b = r.int(1, 8), c = r.int(1, 8), t = a + b + c;
          return Q(`ถุงมีลูกแก้วแดง ${a} ฟ้า ${b} เขียว ${c} ลูก หยิบ 1 ลูก ความน่าจะเป็นได้สีแดง`, frac(a, t), uniq(frac(a, t), [frac(b, t), frac(a, b + c), frac(c, t), frac(a + 1, t)]), 'จำนวนลูกแดง ÷ ลูกทั้งหมด');
        }
        const E = [['โยนเหรียญ 3 เหรียญ ได้หัวอย่างน้อย 1 เหรียญ', '7/8'], ['โยนเหรียญ 3 เหรียญ ได้หัว 2 เหรียญพอดี', '3/8'], ['ทอดลูกเต๋า 2 ลูก ผลรวมเป็น 10', '1/12'], ['ทอดลูกเต๋า 2 ลูก ผลรวมน้อยกว่า 4', '1/12'], ['โยนเหรียญ 2 เหรียญ ได้หัวทั้งคู่', '1/4'], ['โยนเหรียญ 2 เหรียญ ได้หัวอย่างน้อย 1 เหรียญ', '3/4'], ['โยนเหรียญ 2 เหรียญ ได้หัว 1 ก้อย 1', '1/2'], ['ทอดลูกเต๋า 2 ลูก ผลรวมเป็น 7', '1/6'], ['ทอดลูกเต๋า 2 ลูก ผลรวมเป็น 12', '1/36'], ['ทอดลูกเต๋า 2 ลูก ได้แต้มเหมือนกัน', '1/6'], ['โยนเหรียญ 3 เหรียญ ได้หัวทั้งหมด', '1/8']];
        const [e, a] = r.pick(E);
        return Q(`ความน่าจะเป็นที่${e}`, a, uniq(a, r.shuffle(['1/4', '1/2', '3/4', '1/6', '1/36', '1/8', '1/3', '3/8', '1/12'])), 'เขียนผลลัพธ์ทั้งหมดออกมาก่อน');
      },
    },
    {
      id: 'int9', name: 'ดอกเบี้ยเชิงเดี่ยว', cat: 'num',
      gen(d, r) {
        const p = r.int(1, 20) * 1000, rate = r.pick([2, 3, 4, 5, 10]), y = d === 1 ? 1 : r.int(2, 5), I = (p * rate * y) / 100;
        if (d === 3) return Q(`ฝาก ${fmt(p)} บาท ${y} ปี ได้ดอกเบี้ยเชิงเดี่ยว ${fmt(I)} บาท อัตราดอกเบี้ยร้อยละเท่าไรต่อปี`, rate, NP(r, rate, [1, -1, rate, 2]), 'ดอกเบี้ย = เงินต้น × อัตรา × เวลา / 100');
        if (d === 2) return Q(`ฝาก ${fmt(p)} บาท ดอกเบี้ยเชิงเดี่ยว ${rate}% ต่อปี ครบ ${y} ปี มีเงินรวมกี่บาท`, fmt(p + I), uniq(fmt(p + I), [fmt(I), fmt(p + I / y), fmt(p + I * 2)]), 'เงินต้น + ดอกเบี้ย');
        return Q(`ฝาก ${fmt(p)} บาท ดอกเบี้ย ${rate}% ต่อปี ครบ 1 ปีได้ดอกเบี้ยกี่บาท`, fmt(I), uniq(fmt(I), [fmt(I * 10), fmt(I / 10), fmt(p + I)]), `${rate}/100 × ${fmt(p)}`);
      },
    },
  ],
  10: [
    {
      id: 'set10', name: 'เซต', cat: 'alg',
      gen(d, r) {
        if (d === 1 && r() < 0.5) { const a = r.int(-5, 10), b = a + r.int(3, 15); return Q(`A = { x | x เป็นจำนวนเต็ม และ ${a} ≤ x ≤ ${b} } มีสมาชิกกี่ตัว`, b - a + 1, NP(r, b - a + 1, [-1, 1, -2]), 'นับรวมปลายทั้งสอง'); }
        if (d === 1) { const n = r.int(2, 6); return Q(`เซตที่มีสมาชิก ${n} ตัว มีสับเซตทั้งหมดกี่เซต`, 2 ** n, NP(r, 2 ** n, [-1, 1, -(2 ** n) + 2 * n || 3, 2 ** n])); }
        if (d === 2) { const a = r.int(5, 20), b = r.int(5, 20), c = r.int(1, Math.min(a, b) - 1); return Q(`n(A) = ${a}, n(B) = ${b}, n(A∩B) = ${c} แล้ว n(A∪B) = ?`, a + b - c, NP(r, a + b - c, [c, 2 * c, -c])); }
        const a = r.int(10, 25), b = r.int(10, 25), c = r.int(3, 9), T = a + b - c + r.int(2, 10);
        return Q(`นักเรียน ${T} คน ชอบคณิต ${a} ชอบวิทย์ ${b} ชอบทั้งสองวิชา ${c} คน มีกี่คนไม่ชอบทั้งสองวิชา`, T - (a + b - c), NP(r, T - (a + b - c), [c, -1, 1, 2]), 'วาดแผนภาพเวนน์');
      },
    },
    {
      id: 'logic10', name: 'ตรรกศาสตร์เบื้องต้น', cat: 'alg',
      gen(d, r) {
        const F = [['p ∧ q', (p, q) => p && q], ['p ∨ q', (p, q) => p || q], ['p → q', (p, q) => !p || q], ['p ⟷ q', (p, q) => p === q], ['~p', (p) => !p], ['~q', (p, q) => !q], ['~p ∧ q', (p, q) => !p && q], ['p ∧ ~q', (p, q) => p && !q], ['~p ∨ ~q', (p, q) => !p || !q], ['q → p', (p, q) => !q || p]];
        if (d < 3 && r() < 0.6) {
          const p = r() < 0.5, q = r() < 0.5, want = d === 1, tf = (b) => (b ? 'จริง' : 'เท็จ');
          const yes = r.shuffle(F.filter((f) => f[1](p, q) === want)), no = r.shuffle(F.filter((f) => f[1](p, q) !== want));
          return Q(`p เป็น${tf(p)} q เป็น${tf(q)} ประพจน์ใดมีค่าความจริงเป็น${tf(want)}`, yes[0][0], no.slice(0, 3).map((f) => f[0]), 'แทนค่าทีละตัว');
        }
        if (d === 1) { const n = r.int(2, 5); return Q(`ประพจน์ย่อย ${n} ตัว ตารางค่าความจริงมีกี่กรณี`, 2 ** n, NP(r, 2 ** n, [-(2 ** n) + 2 * n || 3, 2, 2 ** n])); }
        if (d === 2) {
          const T = [['p ∧ q', 'จริงเมื่อ p และ q จริงทั้งคู่'], ['p ∨ q', 'เท็จเมื่อ p และ q เท็จทั้งคู่'], ['p → q', 'เท็จเมื่อ p จริง แต่ q เท็จ'], ['p ⟷ q', 'จริงเมื่อ p และ q มีค่าเหมือนกัน']];
          const [f, a] = r.pick(T);
          return Q(`ข้อใดถูกต้องเกี่ยวกับ ${f}`, a, T.filter((t) => t[0] !== f).map((t) => t[1]), 'จำตารางค่าความจริงพื้นฐาน');
        }
        const E = [['p → q', '~p ∨ q', ['p ∨ ~q', '~p ∧ q', 'q → p']], ['~(p ∧ q)', '~p ∨ ~q', ['~p ∧ ~q', 'p ∨ q', '~p ∧ q']], ['~(p ∨ q)', '~p ∧ ~q', ['~p ∨ ~q', 'p ∧ q', '~p ∨ q']], ['p → q', '~q → ~p', ['q → p', '~p → ~q', 'p ∧ ~q']], ['~(p → q)', 'p ∧ ~q', ['~p ∧ q', '~p → ~q', 'p ∨ ~q']], ['p ⟷ q', '(p → q) ∧ (q → p)', ['(p → q) ∨ (q → p)', 'p ∧ q', '~p ∨ q']], ['p ∧ (q ∨ r)', '(p ∧ q) ∨ (p ∧ r)', ['(p ∨ q) ∧ r', 'p ∧ q ∧ r', '(p ∧ q) ∨ r']], ['p ∨ (q ∧ r)', '(p ∨ q) ∧ (p ∨ r)', ['(p ∧ q) ∨ r', 'p ∨ q ∨ r', '(p ∨ q) ∧ r']], ['~(~p ∨ q)', 'p ∧ ~q', ['~p ∧ q', 'p ∨ ~q', '~p ∨ q']], ['p → ~q', '~(p ∧ q)', ['~p → q', 'p ∧ ~q', '~p ∧ ~q']]];
        const [f, a, w] = r.pick(E);
        return Q(`ข้อใดสมมูลกับ ${f}`, a, w, 'ใช้กฎของเดอมอร์แกน');
      },
    },
    {
      id: 'abs10', name: 'ค่าสัมบูรณ์', cat: 'num',
      gen(d, r) {
        const a = nz(r, -15, 15), b = r.int(1, 12);
        if (d === 1) { const x = nz(r, -20, 20), y = nz(r, -20, 20), ans = Math.abs(x) - Math.abs(y); return Q(`|${x}| - |${y}| = ?`, ans, N(r, ans, [2 * Math.abs(y), -2 * Math.abs(x), x - y - ans || 3])); }
        const S = (p, q) => `x = ${Math.min(p, q)} หรือ x = ${Math.max(p, q)}`;
        if (d === 2) return Q(`|x ${a < 0 ? '+' : '-'} ${Math.abs(a)}| = ${b} คำตอบคือ`, S(a - b, a + b), uniq(S(a - b, a + b), [S(-a - b, -a + b), S(b - a, b + a), `x = ${a + b} เท่านั้น`]), 'ข้างในเป็นได้ทั้ง +b และ -b');
        return Q(`|x| < ${b} คำตอบคือ`, `-${b} < x < ${b}`, [`x < ${b}`, `x < -${b} หรือ x > ${b}`, `0 < x < ${b}`], 'ระยะจาก 0 น้อยกว่า ' + b);
      },
    },
    {
      id: 'rad10', name: 'รากที่ n และกรณฑ์', cat: 'num',
      gen(d, r) {
        if (d === 1) {
          const [n, a, b] = r.pick([[12, 2, 3], [18, 3, 2], [50, 5, 2], [75, 5, 3], [48, 4, 3], [72, 6, 2], [27, 3, 3], [20, 2, 5], [45, 3, 5], [98, 7, 2], [8, 2, 2], [32, 4, 2]]);
          return Q(`√${n} อยู่ในรูปอย่างง่ายคือ`, `${a}√${b}`, uniq(`${a}√${b}`, [`${b}√${a}`, `${a * a}√${b}`, `${a}√${b * 2}`, `${n / 2}√2`]), 'ดึงกำลังสองสมบูรณ์ออกมา');
        }
        if (d === 2) { const a = r.int(1, 9), c = r.int(1, 9), b = r.pick([2, 3, 5, 7]); return Q(`${a}√${b} + ${c}√${b} = ?`, `${a + c}√${b}`, uniq(`${a + c}√${b}`, [`${a + c}√${2 * b}`, `${a * c}√${b}`, `${a + c + 1}√${b}`]), 'รากเหมือนกัน บวกสัมประสิทธิ์'); }
        const [k, v, ans] = r.pick([[4, 16, 2], [3, -27, -3], [5, 32, 2], [4, 81, 3], [3, 64, 4], [3, 125, 5], [3, -8, -2], [4, 625, 5]]);
        return Q(`รากที่ ${k} ของ ${v} คือ`, ans, uniq(ans, [-ans, v / k, ans * 2, ans + 1]), `จำนวนใดยกกำลัง ${k} ได้ ${v}`);
      },
    },
    {
      id: 'func10', name: 'ฟังก์ชัน', cat: 'alg',
      gen(d, r) {
        const k = r.int(-5, 6);
        if (d === 1) { const a = nz(r, -6, 6), b = r.int(-9, 9), ans = a * k + b; return Q(`f(x) = ${lin(a, b)} แล้ว f(${k}) = ?`, ans, N(r, ans, [a, -a, 2 * b || 2, 1])); }
        if (d === 2) { const b = r.int(-6, 6), c = r.int(-9, 9), ans = k * k + b * k + c; return Q(`f(x) = ${quad(1, b, c)} แล้ว f(${k}) = ?`, ans, N(r, ans, [2 * k * k || 2, -2 * b * k || 3, 1, -1])); }
        const a = nz(r, -4, 4), b = r.int(-5, 5), c = nz(r, -4, 4), e = r.int(-5, 5), ans = a * (c * k + e) + b;
        return Q(`f(x) = ${lin(a, b)}, g(x) = ${lin(c, e)} แล้ว (f∘g)(${k}) = ?`, ans, N(r, ans, [c * (a * k + b) + e - ans || 4, 1, -1, a]), 'หา g ก่อน แล้วนำไปใส่ f');
      },
    },
    {
      id: 'exp10', name: 'ฟังก์ชันเอกซ์โพเนนเชียล', cat: 'alg',
      gen(d, r) {
        if (d === 1) { const b = r.pick([2, 3, 5]), n = r.int(2, b === 2 ? 7 : 4); return Q(`${b} ยกกำลัง x = ${b ** n} แล้ว x = ?`, n, NP(r, n, [1, -1, 2, n])); }
        if (d === 2) { const b = r.pick([2, 3]), n = r.int(2, 5), m = r.int(1, 3); return Q(`$${b}^{x+${m}}=${b ** (n + m)}$ แล้ว x = ?`, n, NP(r, n, [m, 1, -1, n + 2 * m])); }
        const [B, p] = r.pick([[4, 2], [8, 3], [9, 2], [27, 3], [16, 4]]), base = Math.round(B ** (1 / p)), q = r.int(1, 7);
        if (q % p === 0) return this.gen(d, r);
        return Q(`${B} ยกกำลัง x = ${base ** q} แล้ว x = ?`, frac(q, p), uniq(frac(q, p), [frac(p, q), String(q), frac(q, p + 1), frac(q + 1, p)]), `เขียน ${B} เป็น ${base} ยกกำลัง ${p}`);
      },
    },
    {
      id: 'dist10', name: 'ระยะทางและจุดกึ่งกลาง', cat: 'geo',
      gen(d, r) {
        const x1 = r.int(-8, 8), y1 = r.int(-8, 8);
        if (d === 1) { const x2 = x1 + 2 * nz(r, -5, 5), y2 = y1 + 2 * nz(r, -5, 5), m = pt((x1 + x2) / 2, (y1 + y2) / 2); return Q(`จุดกึ่งกลางของ ${pt(x1, y1)} และ ${pt(x2, y2)} คือ`, m, uniq(m, [pt(x2 - x1, y2 - y1), pt((x2 - x1) / 2, (y2 - y1) / 2), pt(x1 + x2, y1 + y2)]), 'เฉลี่ย x และเฉลี่ย y'); }
        if (d === 2) { const [a, b, c] = r.pick(TRIPLES.slice(0, 5)); return Q(`ระยะห่างระหว่าง ${pt(x1, y1)} และ ${pt(x1 + a, y1 + b)} คือ`, c, NP(r, c, [a + b - c, 1, -1, 2])); }
        const mx = r.int(-6, 6), my = r.int(-6, 6), ans = pt(2 * mx - x1, 2 * my - y1);
        return Q(`M ${pt(mx, my)} เป็นจุดกึ่งกลางของ A ${pt(x1, y1)} และ B จุด B คือ`, ans, uniq(ans, [pt((mx + x1) / 2, (my + y1) / 2), pt(mx - x1, my - y1), pt(2 * mx + x1, 2 * my + y1)]), 'B = 2M - A');
      },
    },
    {
      id: 'slope10', name: 'ความชันและสมการเส้นตรง', cat: 'alg',
      gen(d, r) {
        const sf = (n, m) => (m < 0 ? sf(-n, -m) : n < 0 ? '-' + frac(-n, m) : frac(n, m));
        if (d === 1) {
          const x1 = r.int(-5, 5), y1 = r.int(-5, 5), dx = nz(r, -6, 6), dy = nz(r, -6, 6), ans = sf(dy, dx);
          return Q(`ความชันของเส้นผ่าน ${pt(x1, y1)} และ ${pt(x1 + dx, y1 + dy)} คือ`, ans, uniq(ans, [sf(dx, dy), sf(-dy, dx), sf(dy + 1, dx)]), 'ผลต่าง y ÷ ผลต่าง x');
        }
        if (d === 2) { const a = nz(r, -6, 6), c = r.int(-9, 9); return Q(`เส้นตรง ${lin(a, 0)} + y = ${c} มีความชันเท่าไร`, -a, uniq(-a, [a, c, -c || 1, 1 - a, -a - 1]), 'จัดรูปเป็น y = mx + c'); }
        const n = nz(r, -5, 5), m = r.int(1, 5);
        if (Math.abs(n) === m) return this.gen(d, r);
        return Q(`เส้นตรงที่ตั้งฉากกับเส้นที่มีความชัน ${sf(n, m)} มีความชันเท่าไร`, sf(-m, n), uniq(sf(-m, n), [sf(m, n), sf(-n, m), sf(n, m)]), 'ความชันคูณกันได้ -1');
      },
    },
    {
      id: 'count10', name: 'หลักการนับเบื้องต้น', cat: 'stat',
      gen(d, r) {
        if (d === 1) { const a = r.int(2, 8), b = r.int(2, 6), c = r.int(2, 4); return Q(`มีเสื้อ ${a} ตัว กางเกง ${b} ตัว รองเท้า ${c} คู่ แต่งตัวได้กี่แบบ`, a * b * c, NP(r, a * b * c, [-(a * b * c) + a + b + c, a * b, -c])); }
        if (d === 2) { const n = r.int(4, 9), two = r() < 0.4, ans = two ? n * (n - 1) : n * (n - 1) * (n - 2); return Q(`ใช้เลขโดด ${n} ตัว (ไม่มี 0) สร้างจำนวน${two ? 'สอง' : 'สาม'}หลักที่เลขไม่ซ้ำกันได้กี่จำนวน`, ans, NP(r, ans, [n ** 3 - ans, -ans + 3 * n, 6])); }
        const n = r.int(3, 7); if (r() < 0.5) return Q(`จัดคน ${n} คนนั่งรอบโต๊ะกลมได้กี่วิธี`, fac(n - 1), NP(r, fac(n - 1), [fac(n) - fac(n - 1), n, fac(n - 1)]), '(n - 1)!'); return Q(`จัดคน ${n} คนยืนเรียงแถวเดียวได้กี่วิธี`, fac(n), NP(r, fac(n), [n * n - fac(n) || 2, -fac(n) + 2 * n, fac(n)]), 'n!');
      },
    },
    {
      id: 'intv10', name: 'จำนวนจริงและช่วง', cat: 'num',
      gen(d, r) {
        const a = r.int(-10, 5), b = a + r.int(3, 12);
        if (d === 1) return Q(`ช่วง [${a}, ${b}] มีจำนวนเต็มกี่จำนวน`, b - a + 1, NP(r, b - a + 1, [-1, -2, 1]), 'นับรวมปลายทั้งสองข้าง');
        if (d === 2) return Q(`ช่วง (${a}, ${b}) มีจำนวนเต็มกี่จำนวน`, b - a - 1, NP(r, b - a - 1, [1, 2, -1]), 'วงเล็บโค้งไม่รวมปลาย');
        const c = a + r.int(1, b - a - 1), e = b + r.int(1, 6);
        return Q(`[${a}, ${b}) ∩ (${c}, ${e}] เท่ากับช่วงใด`, `(${c}, ${b})`, [`[${c}, ${b}]`, `[${a}, ${e}]`, `(${a}, ${e})`], 'ส่วนที่ซ้อนทับกัน');
      },
    },
    {
      id: 'rem10', name: 'การหารพหุนามและทฤษฎีบทเศษเหลือ', cat: 'alg',
      gen(d, r) {
        const a = nz(r, -4, 4), b = r.int(-6, 6), c = r.int(-9, 9);
        if (d === 1) { const ans = a * a + b * a + c; return Q(`เศษจากการหาร ${quad(1, b, c)} ด้วย x ${a < 0 ? '+' : '-'} ${Math.abs(a)} คือ`, ans, N(r, ans, [2 * b * a || 2, -2 * a * a, 1, -1]), `แทน x = ${a}`); }
        if (d === 2) { const ans = a ** 3 + b * a + c; return Q(`เศษจากการหาร x³${b ? (b > 0 ? ' + ' : ' - ') + term(Math.abs(b), 'x') : ''}${tail(c)} ด้วย x ${a < 0 ? '+' : '-'} ${Math.abs(a)} คือ`, ans, N(r, ans, [-2 * a ** 3 || 2, 2 * b * a || 3, 1])); }
        const k = r.int(-5, 5), p = nz(r, -4, 4), q = -(p * p + k * p);
        return Q(`ถ้า x ${p < 0 ? '+' : '-'} ${Math.abs(p)} หาร ${quad(1, k, 0)} + c ลงตัว แล้ว c = ?`, q, N(r, q, [2 * p * p || 2, -2 * q || 3, 1]), 'ลงตัว แปลว่าเศษเป็น 0');
      },
    },
  ],
  11: [
    {
      id: 'trig11', name: 'ค่าของฟังก์ชันตรีโกณมิติ', cat: 'geo',
      gen(d, r) {
        const T1 = [['sin 30°', '1/2'], ['cos 60°', '1/2'], ['sin 90°', '1'], ['cos 0°', '1'], ['sin 0°', '0'], ['cos 90°', '0'], ['tan 45°', '1'], ['tan 0°', '0']];
        const T2 = [['sin 60°', '√3/2'], ['cos 30°', '√3/2'], ['sin 45°', '√2/2'], ['cos 45°', '√2/2'], ['tan 60°', '√3'], ['tan 30°', '√3/3'], ['sin 120°', '√3/2'], ['cos 150°', '-√3/2'], ['tan 135°', '-1'], ['cos 135°', '-√2/2'], ['sin 210°', '-1/2'], ['cos 120°', '-1/2']];
        const T3 = [['sin² 40° + cos² 40°', '1'], ['sin 30° + cos 60°', '1'], ['2 sin 30° cos 30°', '√3/2'], ['tan 45° + sin 90°', '2'], ['cos² 60°', '1/4'], ['sin 150°', '1/2'], ['cos 180°', '-1'], ['sin² 30°', '1/4'], ['tan 60° × tan 30°', '1'], ['cos 300°', '1/2']];
        const [f, a] = r.pick([T1, T2, T3][d - 1]);
        return Q(`${f} มีค่าเท่าไร`, a, uniq(a, r.shuffle(['0', '1', '1/2', '√3/2', '√2/2', '√3', '-1', '2', '1/4', '-1/2', '-√3/2'])), 'จำสามเหลี่ยม 30-60-90 และ 45-45-90');
      },
    },
    {
      id: 'rad11', name: 'เรเดียนและความยาวส่วนโค้ง', cat: 'geo',
      gen(d, r) {
        const T = [[180, 'π'], [90, 'π/2'], [60, 'π/3'], [45, 'π/4'], [30, 'π/6'], [120, '2π/3'], [135, '3π/4'], [150, '5π/6'], [270, '3π/2'], [360, '2π']];
        const [deg, rad] = r.pick(T);
        if (d === 1) return Q(`${deg}° เท่ากับกี่เรเดียน`, rad, uniq(rad, r.shuffle(T.map((t) => t[1]))), '180° = π เรเดียน');
        if (d === 2) return Q(`${rad} เรเดียน เท่ากับกี่องศา`, deg, uniq(deg, r.shuffle(T.map((t) => t[0]))), 'คูณด้วย 180/π');
        const [dg, rd, k] = r.pick([[60, 'π/3', 3], [90, 'π/2', 2], [30, 'π/6', 6], [45, 'π/4', 4], [180, 'π', 1]]), R = k * r.int(1, 4);
        const ans = `${R / k === 1 ? '' : R / k}π`;
        return Q(`วงกลมรัศมี ${R} หน่วย มุมที่จุดศูนย์กลาง ${dg}° ส่วนโค้งยาวเท่าไร`, ans, uniq(ans, [`${R}π`, `${(R / k) * 2}π`, `${R * dg}`]), 's = rθ (θ เป็นเรเดียน)');
      },
    },
    {
      id: 'log11', name: 'ลอการิทึม', cat: 'alg',
      gen(d, r) {
        if (d === 1) { const b = r.pick([2, 3, 5, 10]), n = r.int(1, b === 2 ? 6 : 3); return Q(`$\\log_{${b}}${b ** n}=?`, n, NP(r, n, [1, -1, b, 2]), 'b ยกกำลังเท่าไรได้ตัวนี้'); }
        if (d === 2) {
          const E = [['\\log 2+\\log 5', 1], ['\\log 1000', 3], ['\\log_{2}32-\\log_{2}4', 3], ['\\log_{3}9+\\log_{3}3', 3], ['\\log 0.01', -2], ['\\log_{2}1', 0], ['\\log 4+\\log 25', 2], ['\\log_{3}81', 4], ['\\log_{2}\\frac{1}{8}', -3], ['\\log_{5}25+\\log_{5}5', 3], ['\\log_{2}8\\times\\log_{3}9', 6], ['\\log 100-\\log 10', 1]];
          const [e, a] = r.pick(E);
          return Q(`$${e}=?`, a, uniq(a, [a + 1, a - 1, a * 2 || 5, 10]), 'log a + log b = log ab');
        }
        const b = r.pick([2, 3, 4, 5]), n = r.int(2, 4);
        return Q(`$\\log_{${b}}x=${n}$ แล้ว x = ?`, b ** n, NP(r, b ** n, [b, -b, b * n - b ** n || 3]), `x = ${b} ยกกำลัง ${n}`);
      },
    },
    {
      id: 'expeq11', name: 'สมการเอกซ์โพเนนเชียล', cat: 'alg',
      gen(d, r) {
        const b = r.pick([2, 3, 5]), n = r.int(1, b === 2 ? 5 : 3);
        if (d === 1) { const m = r.int(1, 3); return Q(`$${b}^{x+${m}}=${b ** (n + m)}$ แล้ว x = ?`, n, NP(r, n, [m, 1, -1, 2])); }
        if (d === 2) { const k = r.int(2, 3); return Q(`$${b}^{${k}x}=${b ** (k * n)}$ แล้ว x = ?`, n, NP(r, n, [k * n - n, 1, -1, 2])); }
        const m = r.int(1, 4);
        return Q(`$${b}^{x-${m}}=1$ แล้ว x = ?`, m, uniq(m, [0, 1 === m ? 2 : 1, -m, m + 1]), 'จำนวนใดยกกำลัง 0 ได้ 1');
      },
    },
    {
      id: 'vec11', name: 'เวกเตอร์', cat: 'geo',
      gen(d, r) {
        if (d === 1) { const [a0, b0, c] = r.pick(TRIPLES), a = r() < 0.5 ? -a0 : a0, b = r() < 0.5 ? -b0 : b0; return Q(`ขนาดของเวกเตอร์ (${a}, ${b}) คือ`, c, NP(r, c, [a0 + b0 - c, 1, -1, 2]), '√(a² + b²)'); }
        const a = r.int(-6, 6), b = r.int(-6, 6), c = r.int(-6, 6), e = r.int(-6, 6);
        if (d === 2) return Q(`(${a}, ${b}) + (${c}, ${e}) = ?`, pt(a + c, b + e), uniq(pt(a + c, b + e), [pt(a - c, b - e), pt(a * c, b * e), pt(a + e, b + c)]), 'บวกทีละส่วนประกอบ');
        const ans = a * c + b * e;
        return Q(`ผลคูณเชิงสเกลาร์ของ (${a}, ${b}) กับ (${c}, ${e}) คือ`, ans, N(r, ans, [a * e - b * c - ans || 3, 1, -1, 2]), 'a₁b₁ + a₂b₂');
      },
    },
    {
      id: 'cplx11', name: 'จำนวนเชิงซ้อน', cat: 'num',
      gen(d, r) {
        if (d === 1) { const n = r.int(5, 60), a = ['1', 'i', '-1', '-i'][n % 4]; return Q(`i ยกกำลัง ${n} เท่ากับเท่าไร`, a, ['1', 'i', '-1', '-i'].filter((x) => x !== a), 'i ยกกำลังวนทุก 4'); }
        const Z = (x, y) => `${x}${y < 0 ? ' - ' : ' + '}${Math.abs(y) === 1 ? '' : Math.abs(y)}i`;
        const a = nz(r, -9, 9), b = nz(r, -9, 9), c = nz(r, -9, 9), e = nz(r, -9, 9);
        if (d === 2) { if (!(b + e)) return this.gen(d, r); return Q(`(${Z(a, b)}) + (${Z(c, e)}) = ?`, Z(a + c, b + e), uniq(Z(a + c, b + e), [Z(a - c, b - e || 1), Z(a + e, b + c || 1), Z(a + c, -(b + e))]), 'บวกจริงกับจริง จินตภาพกับจินตภาพ'); }
        return Q(`(${Z(a, b)})(${Z(a, -b)}) = ?`, a * a + b * b, NP(r, a * a + b * b, [-2 * b * b, 2 * a * b || 2, 1]), 'คูณสังยุค = a² + b²');
      },
    },
    {
      id: 'aseq11', name: 'ลำดับเลขคณิต', cat: 'alg',
      gen(d, r) {
        const a = r.int(-10, 20), k = nz(r, -6, 9), n = d === 1 ? r.int(5, 10) : r.int(10, 40), an = a + (n - 1) * k;
        if (d === 3) return Q(`ลำดับเลขคณิต พจน์แรก ${a} พจน์ที่ ${n} คือ ${an} ผลต่างร่วมคือ`, k, N(r, k, [1, -1, 2, -2 * k]), 'aₙ = a₁ + (n-1)d');
        return Q(`${a}, ${a + k}, ${a + 2 * k}, ... พจน์ที่ ${n} คือ`, an, N(r, an, [k, -k, 2 * k]), 'aₙ = a₁ + (n-1)d');
      },
    },
    {
      id: 'gseq11', name: 'ลำดับเรขาคณิต', cat: 'alg',
      gen(d, r) {
        const a = r.int(1, 5), q = d === 3 ? r.pick([-2, -3, 2]) : r.pick([2, 3]), n = r.int(4, d === 1 ? 5 : 7), an = a * q ** (n - 1);
        return Q(`${a}, ${a * q}, ${a * q * q}, ... พจน์ที่ ${n} คือ`, an, N(r, an, [-2 * an, an * (q - 1), an / q - an, a * q * n - an || 2]), 'aₙ = a₁ rⁿ⁻¹');
      },
    },
    {
      id: 'series11', name: 'อนุกรมเลขคณิตและเรขาคณิต', cat: 'alg',
      gen(d, r) {
        if (d === 1) { const n = r.int(10, 100), s = (n * (n + 1)) / 2; return Q(`1 + 2 + 3 + ... + ${n} = ?`, fmt(s), uniq(fmt(s), [fmt(n * n), fmt(s + n), fmt(s - n)]), 'n(n+1)/2'); }
        if (d === 2) { const a = r.int(1, 9), k = r.int(2, 6), n = r.int(5, 20), s = (n * (2 * a + (n - 1) * k)) / 2; return Q(`ผลบวก ${n} พจน์แรกของ ${a} + ${a + k} + ${a + 2 * k} + ... เท่ากับ`, s, NP(r, s, [k * n, -a * n, (n * k) / 2 || 2]), 'Sₙ = n/2 (2a + (n-1)d)'); }
        const a = r.int(1, 3), q = r.pick([2, 3]), n = r.int(4, 6), s = (a * (q ** n - 1)) / (q - 1);
        return Q(`ผลบวก ${n} พจน์แรกของ ${a} + ${a * q} + ${a * q * q} + ... เท่ากับ`, s, NP(r, s, [a * q ** n - s, -a, a * q ** (n - 1) - s]), 'Sₙ = a(rⁿ - 1)/(r - 1)');
      },
    },
    {
      id: 'perm11', name: 'การเรียงสับเปลี่ยน', cat: 'stat',
      gen(d, r) {
        if (d === 1) { const n = r.int(4, 12), k = 2; return Q(`เลือกประธานและรองประธานจาก ${n} คนได้กี่วิธี`, nPr(n, k), NP(r, nPr(n, k), [nCr(n, k) - nPr(n, k), n, -n])); }
        if (d === 2) { const n = r.int(5, 10), k = r.int(2, 4); return Q(`P(${n}, ${k}) มีค่าเท่าไร`, nPr(n, k), NP(r, nPr(n, k), [nCr(n, k) - nPr(n, k), n, nPr(n, k)]), 'n!/(n-k)!'); }
        const [w, a] = r.pick([['BOOK', 12], ['APPLE', 60], ['LEVEL', 30], ['BANANA', 60], ['SCHOOL', 360], ['COFFEE', 180], ['PEPPER', 60], ['ELEPHANT', 20160], ['BALLOON', 1260], ['TOMATO', 180], ['LETTER', 180]]);
        return Q(`นำตัวอักษรในคำว่า ${w} มาเรียงได้กี่แบบ`, a, NP(r, a, [fac(w.length) - a, -a / 2, a]), 'หารด้วย factorial ของตัวที่ซ้ำ');
      },
    },
    {
      id: 'comb11', name: 'การจัดหมู่', cat: 'stat',
      gen(d, r) {
        if (d === 1) { const n = r.int(4, 16); return Q(`เลือกตัวแทน 2 คนจาก ${n} คนได้กี่วิธี`, nCr(n, 2), NP(r, nCr(n, 2), [nCr(n, 2), n, -1]), 'ไม่สนใจลำดับ'); }
        if (d === 2) { const n = r.int(5, 10), k = r.int(3, 4); return Q(`C(${n}, ${k}) มีค่าเท่าไร`, nCr(n, k), NP(r, nCr(n, k), [nPr(n, k) - nCr(n, k), n, 1]), 'n!/(k!(n-k)!)'); }
        const m = r.int(4, 7), w = r.int(3, 6), ans = nCr(m, 2) * nCr(w, 2);
        return Q(`ชาย ${m} คน หญิง ${w} คน เลือกชาย 2 หญิง 2 เป็นกรรมการได้กี่วิธี`, ans, NP(r, ans, [nCr(m + w, 4) - ans, nCr(m, 2) + nCr(w, 2) - ans, ans]), 'เลือกแยกกันแล้วคูณ');
      },
    },
  ],
  12: [
    {
      id: 'lim12', name: 'ลิมิตของฟังก์ชัน', cat: 'alg',
      gen(d, r) {
        const a = nz(r, -5, 6);
        if (d === 1) { const b = nz(r, -6, 6), c = r.int(-9, 9), ans = b * a + c; return Q(`$\\lim_{x\\to ${a}}(${lin(b, c)})=?`, ans, N(r, ans, [b, -c * 2 || 2, 1])); }
        if (d === 2) { const b = r.int(-6, 6), c = r.int(-9, 9), ans = a * a + b * a + c; return Q(`$\\lim_{x\\to ${a}}(${quad(1, b, c).replace(/²/g, '^2')})=?`, ans, N(r, ans, [2 * a, -2 * b * a || 3, 1])); }
        return Q(`$\\lim_{x\\to ${a}}\\frac{x^2-${a * a}}{x${tail(-a)}}=?`, 2 * a, uniq(2 * a, [a, 0, a * a, -2 * a]), 'แยกตัวประกอบแล้วตัดกัน');
      },
    },
    {
      id: 'der12', name: 'อนุพันธ์ของฟังก์ชัน', cat: 'alg',
      gen(d, r) {
        const k = r.int(-4, 5), a = nz(r, -5, 5);
        if (d === 1) { const ans = 2 * a * k; return Q(`f(x) = ${term(a, 'x²')} แล้ว f'(${k}) = ?`, ans, N(r, ans, [a * k * k - ans || 2, a, -a, 1]), "(xⁿ)' = nxⁿ⁻¹"); }
        if (d === 2) { const b = r.int(-6, 6), ans = 3 * a * k * k + b; return Q(`f(x) = ${term(a, 'x³')}${b ? (b > 0 ? ' + ' : ' - ') + term(Math.abs(b), 'x') : ''} แล้ว f'(${k}) = ?`, ans, N(r, ans, [a * k ** 3 - ans || 3, b || 2, 1])); }
        const b = 2 * nz(r, -6, 6), c = r.int(-9, 9);
        return Q(`f(x) = ${quad(1, b, c)} มีความชันเส้นสัมผัสเป็น 0 ที่ x เท่าใด`, -b / 2, N(r, -b / 2, [b, 1, -1]), "หา f'(x) = 0");
      },
    },
    {
      id: 'int12', name: 'ปริพันธ์จำกัดเขต', cat: 'alg',
      gen(d, r) {
        const k = r.int(1, 5);
        if (d === 1) { const a = 2 * r.int(1, 5), ans = (a * k * k) / 2; return Q(`$\\int_{0}^{${k}}${a}x\\,dx=?`, ans, NP(r, ans, [ans, a * k - ans || 2, 1]), 'ปริพันธ์ x คือ x²/2'); }
        if (d === 2 && r() < 0.5) { const j = r.int(1, 4); return Q(`$\\int_{0}^{${j}}4x^{3}\\,dx=?`, j ** 4, NP(r, j ** 4, [j ** 3 - j ** 4 || 2, 4, 1]), 'ปริพันธ์ 4x³ คือ x⁴'); }
        if (d === 2) { return Q(`$\\int_{0}^{${k}}3x^{2}\\,dx=?`, k ** 3, NP(r, k ** 3, [2 * k ** 3, 3 * k * k - k ** 3 || 2, 1]), 'ปริพันธ์ 3x² คือ x³'); }
        const a = r.int(0, 3), b = a + r.int(1, 4), c = r.int(-4, 5), ans = b * b - a * a + c * (b - a);
        return Q(`$\\int_{${a}}^{${b}}(2x${tail(c)})\\,dx=?`, ans, N(r, ans, [c * (b - a) || 2, -b * b + a * a || 3, 1]), 'F(b) - F(a)');
      },
    },
    {
      id: 'ext12', name: 'ค่าสูงสุดและต่ำสุดของฟังก์ชัน', cat: 'alg',
      gen(d, r) {
        const h = nz(r, -6, 6), c = r.int(-9, 15), m = c - h * h;
        if (d === 1) return Q(`f(x) = ${quad(1, -2 * h, c)} มีค่าต่ำสุดที่ x เท่าใด`, h, N(r, h, [-2 * h, 1, -1]), "f'(x) = 0");
        if (d === 2) return Q(`f(x) = ${quad(1, -2 * h, c)} มีค่าต่ำสุดเท่าไร`, m, N(r, m, [h * h * 2, -c + m || 3, 1]), 'หา x ก่อน แล้วแทนค่ากลับ');
        const L = 2 * r.int(5, 30), s = L / 2;
        return Q(`ลวดยาว ${L} ม. ล้อมเป็นสี่เหลี่ยมผืนผ้า ด้านกว้างกี่เมตรจึงได้พื้นที่มากที่สุด`, fmt(s / 2), uniq(fmt(s / 2), [fmt(s), fmt(L / 3), fmt(s / 2 + 1)]), 'สี่เหลี่ยมจัตุรัสให้พื้นที่มากที่สุด');
      },
    },
    {
      id: 'sd12', name: 'ความแปรปรวนและส่วนเบี่ยงเบนมาตรฐาน', cat: 'stat',
      gen(d, r) {
        const m = r.int(5, 50), k = r.int(1, 6), xs = r.shuffle([m - k, m - k, m + k, m + k]).join(', ');
        if (d === 1) return Q(`ค่าเฉลี่ยของ ${xs} คือ`, m, NP(r, m, [k, -k, 1]), 'รวม ÷ จำนวน');
        if (d === 2) return Q(`ความแปรปรวนของ ${xs} คือ`, k * k, NP(r, k * k, [k - k * k || 2, 2 * k * k, 1]), 'เฉลี่ยของ (x - x̄)²');
        return Q(`ส่วนเบี่ยงเบนมาตรฐานของ ${xs} คือ`, k, NP(r, k, [k * k - k || 2, 1, k]), 'รากที่สองของความแปรปรวน');
      },
    },
    {
      id: 'z12', name: 'ค่ามาตรฐาน (z-score)', cat: 'stat',
      gen(d, r) {
        const mu = r.int(4, 16) * 5, s = r.pick([2, 4, 5, 8, 10]), z = d === 1 ? r.int(1, 3) : r.pick([-2, -1.5, -0.5, 0.5, 1.5, 2.5]), x = mu + z * s;
        if (d === 3) return Q(`คะแนนเฉลี่ย ${mu} ส่วนเบี่ยงเบนมาตรฐาน ${s} คนที่มีค่ามาตรฐาน ${z} ได้คะแนนเท่าไร`, fmt(x), uniq(fmt(x), [fmt(mu - z * s), fmt(mu + z), fmt(x + s)]), 'x = μ + zσ');
        return Q(`คะแนนเฉลี่ย ${mu} ส่วนเบี่ยงเบนมาตรฐาน ${s} คนที่ได้ ${fmt(x)} มีค่ามาตรฐานเท่าไร`, fmt(z), uniq(fmt(z), [fmt(-z), fmt(z * 2), fmt(z + 1)]), 'z = (x - μ)/σ');
      },
    },
    {
      id: 'norm12', name: 'การแจกแจงปกติ', cat: 'stat',
      gen(d, r) {
        const mu = r.int(5, 15) * 5, s = r.pick([5, 10]);
        const E = [
          [`${mu - s} ถึง ${mu + s}`, '68%'], [`${mu - 2 * s} ถึง ${mu + 2 * s}`, '95%'], [`${mu - 3 * s} ถึง ${mu + 3 * s}`, '99.7%'],
          [`มากกว่า ${mu}`, '50%'], [`${mu} ถึง ${mu + s}`, '34%'], [`มากกว่า ${mu + s}`, '16%'], [`มากกว่า ${mu + 2 * s}`, '2.5%'],
        ];
        const [e, a] = r.pick(d === 1 ? E.slice(0, 3) : d === 2 ? E.slice(3, 5) : E.slice(5));
        return Q(`คะแนนแจกแจงปกติ เฉลี่ย ${mu} ส่วนเบี่ยงเบนมาตรฐาน ${s} คนที่ได้คะแนน${e} มีประมาณร้อยละเท่าไร`, a, uniq(a, ['68%', '95%', '50%', '34%', '16%', '2.5%']), 'กฎ 68-95-99.7');
      },
    },
    {
      id: 'comp12', name: 'ดอกเบี้ยทบต้น', cat: 'num',
      gen(d, r) {
        const [P0, rate, n] = r.pick([[10000, 10, 2], [10000, 10, 3], [20000, 10, 2], [10000, 5, 2], [40000, 5, 2], [1000, 10, 3], [50000, 10, 2], [30000, 10, 2], [5000, 10, 2], [20000, 5, 2], [100000, 10, 2], [8000, 5, 2], [2000, 10, 3]]);
        const A = Math.round(P0 * (1 + rate / 100) ** n), simple = P0 + (P0 * rate * n) / 100;
        if (d === 3) return Q(`ฝาก ${fmt(P0)} บาท ดอกเบี้ยทบต้น ${rate}% ต่อปี ${n} ปี ได้ดอกเบี้ยรวมกี่บาท`, fmt(A - P0), uniq(fmt(A - P0), [fmt(simple - P0), fmt(A), fmt((P0 * rate) / 100)]), 'เงินรวม - เงินต้น');
        if (d === 2) return Q(`ดอกเบี้ยทบต้นกับเชิงเดี่ยว ${rate}% ต่อปี ฝาก ${fmt(P0)} บาท ${n} ปี ต่างกันกี่บาท`, fmt(A - simple), uniq(fmt(A - simple), [fmt((P0 * rate) / 100), fmt(A - P0), '0']), 'ทบต้นได้มากกว่าเพราะดอกเบี้ยออกดอกเบี้ย');
        return Q(`ฝาก ${fmt(P0)} บาท ดอกเบี้ยทบต้น ${rate}% ต่อปี ครบ ${n} ปี มีเงินรวมกี่บาท`, fmt(A), uniq(fmt(A), [fmt(simple), fmt(A + (P0 * rate) / 100), fmt(P0)]), 'P(1 + r)ⁿ');
      },
    },
    {
      id: 'mat12', name: 'เมทริกซ์และดีเทอร์มิแนนต์', cat: 'alg',
      gen(d, r) {
        const R = d === 1 ? [1, 9] : [-9, 9];
        const [a, b, c, e] = [0, 0, 0, 0].map(() => r.int(R[0], R[1])), det = a * e - b * c;
        const M = `\\begin{bmatrix}${a}&${b}\\\\${c}&${e}\\end{bmatrix}`;
        if (d === 3) { const k = r.int(2, 3); return Q(`$\\det A=${det || 5}$ ถ้า A เป็นเมทริกซ์ 2×2 แล้ว det(${k}A) = ?`, k * k * (det || 5), uniq(k * k * (det || 5), [k * (det || 5), k ** 3 * (det || 5), (det || 5) + k]), 'det(kA) = kⁿ det A'); }
        return Q(`$\\det${M}=?`, det, N(r, det, [2 * b * c || 2, a * e + b * c - det || 3, 1]), 'ad - bc');
      },
    },
    {
      id: 'probu12', name: 'ความน่าจะเป็นของเหตุการณ์ร่วม', cat: 'stat',
      gen(d, r) {
        if (d === 1) {
          const a = r.int(2, 6) / 10, b = r.int(2, 6) / 10, c = r.int(1, Math.min(a, b) * 10 - 1) / 10, ans = Math.round((a + b - c) * 10) / 10;
          return Q(`P(A) = ${a}, P(B) = ${b}, P(A∩B) = ${c} แล้ว P(A∪B) = ?`, fmt(ans), uniq(fmt(ans), [fmt(a + b), fmt(Math.round(a * b * 100) / 100), fmt(ans + 0.1)]), 'P(A) + P(B) - P(A∩B)');
        }
        if (d === 2) { const a = r.int(1, 9) / 10, b = r.int(1, 9) / 10, ans = Math.round(a * b * 100) / 100; return Q(`A และ B เป็นอิสระต่อกัน P(A) = ${a}, P(B) = ${b} แล้ว P(A∩B) = ?`, fmt(ans), uniq(fmt(ans), [fmt(Math.round((a + b) * 10) / 10), fmt(Math.abs(a - b) || 0.5), fmt(ans + 0.1)]), 'อิสระ = คูณกัน'); }
        const red = r.int(2, 6), blue = r.int(2, 6), t = red + blue;
        return Q(`ถุงมีแดง ${red} น้ำเงิน ${blue} หยิบ 2 ลูกไม่ใส่คืน ความน่าจะเป็นได้แดงทั้งคู่`, frac(red * (red - 1), t * (t - 1)), uniq(frac(red * (red - 1), t * (t - 1)), [frac(red * red, t * t), frac(red, t), frac(red - 1, t - 1), frac(2 * red, t * (t - 1))]), 'ลูกที่สองเหลือน้อยลง 1');
      },
    },
    {
      id: 'binom12', name: 'ทฤษฎีบททวินาม', cat: 'alg',
      gen(d, r) {
        const n = r.int(4, 7), k = r.int(1, n - 1);
        if (d === 1) return Q(`สัมประสิทธิ์ของ x ยกกำลัง ${k} ในการกระจาย (x + 1) ยกกำลัง ${n} คือ`, nCr(n, k), NP(r, nCr(n, k), [1, -1, n, k]), 'C(n, k)');
        if (d === 2) { const ans = nCr(n, k) * 2 ** (n - k); return Q(`สัมประสิทธิ์ของ x ยกกำลัง ${k} ในการกระจาย (x + 2) ยกกำลัง ${n} คือ`, ans, NP(r, ans, [nCr(n, k) - ans, ans, n])); }
        const m = r.int(3, 10);
        if (r() < 0.5) return Q(`ผลบวกสัมประสิทธิ์ทุกพจน์ของ (x + 1) ยกกำลัง ${m} คือ`, 2 ** m, NP(r, 2 ** m, [-1, 1, m * m - 2 ** m || 3, 2 ** m]), 'แทน x = 1');
        return Q(`การกระจาย (a + b) ยกกำลัง ${m} มีกี่พจน์`, m + 1, NP(r, m + 1, [-1, 1, m]), 'มี n + 1 พจน์');
      },
    },
  ],
};
