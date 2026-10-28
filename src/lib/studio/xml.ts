/**
 * ตัวแยก XML อย่างง่ายสำหรับไฟล์ Office (docx) ไม่ใช้ DOM จึงทดสอบใน selftest และใช้ได้ทั้งเว็บและแอป
 * เก็บแท็กพร้อม namespace (เช่น w:p, m:f) ข้อความอยู่ใน text ของแท็กที่ห่อมันโดยตรง
 */
export interface XNode {
  tag: string;
  attrs: Record<string, string>;
  kids: XNode[];
  text: string;
}

export const xdecode = (s: string) =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(+d))
    .replace(/&amp;/g, '&');

export function parseXml(xml: string): XNode {
  const root: XNode = { tag: '#root', attrs: {}, kids: [], text: '' };
  const stack = [root];
  const re = /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!\[CDATA\[([\s\S]*?)\]\]>|<(\/?)([a-zA-Z_][\w:.-]*)((?:\s+[^\s=>/]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>|([^<]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    const top = stack[stack.length - 1];
    if (m[1] !== undefined) {
      top.text += m[1];
      continue;
    }
    if (m[6] !== undefined) {
      top.text += xdecode(m[6]);
      continue;
    }
    if (!m[3]) continue;
    if (m[2]) {
      // ปิดแท็ก: ถอยจนเจอแท็กชื่อเดียวกัน (กันไฟล์ที่ซ้อนผิด)
      for (let i = stack.length - 1; i > 0; i--) {
        if (stack[i].tag === m[3]) {
          stack.length = i;
          break;
        }
      }
      continue;
    }
    const attrs: Record<string, string> = {};
    m[4].replace(/([^\s=]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g, (_, k: string, a?: string, b?: string) => ((attrs[k] = xdecode(a ?? b ?? '')), ''));
    const n: XNode = { tag: m[3], attrs, kids: [], text: '' };
    top.kids.push(n);
    if (!m[5]) stack.push(n);
  }
  return root;
}

/** ลูกตัวแรกที่ชื่อตรง (ไม่ลงลึก) */
export const kid = (n: XNode | undefined, tag: string) => n?.kids.find((k) => k.tag === tag);
export const kidsOf = (n: XNode | undefined, tag: string) => (n ? n.kids.filter((k) => k.tag === tag) : []);
/** หาลูกหลานตัวแรกที่ชื่อตรง */
export function find(n: XNode | undefined, tag: string): XNode | undefined {
  if (!n) return undefined;
  for (const k of n.kids) {
    if (k.tag === tag) return k;
    const f = find(k, tag);
    if (f) return f;
  }
  return undefined;
}
export function findAll(n: XNode | undefined, tag: string, out: XNode[] = []): XNode[] {
  if (!n) return out;
  for (const k of n.kids) {
    if (k.tag === tag) out.push(k);
    findAll(k, tag, out);
  }
  return out;
}
/** ค่า val ของลูก เช่น <w:jc w:val="center"/> */
export const val = (n: XNode | undefined, tag: string, attr = '') => {
  const k = kid(n, tag);
  if (!k) return undefined;
  if (attr) return k.attrs[attr];
  const key = Object.keys(k.attrs).find((a) => a === 'w:val' || a === 'm:val' || a.endsWith(':val'));
  return key ? k.attrs[key] : '';
};
