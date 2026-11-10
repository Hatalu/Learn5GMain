/** ป้ายเครื่องแบบหยาบจาก user-agent เช่น "มือถือ · Chrome" (ไม่เก็บ user-agent เต็ม เพื่อไม่ให้ระบุตัวเครื่องได้) */
export function deviceLabel(ua: string): string {
  const kind = /ipad|tablet|playbook|silk/i.test(ua) || (/android/i.test(ua) && !/mobile/i.test(ua))
    ? 'แท็บเล็ต'
    : /mobi|iphone|ipod|android/i.test(ua)
      ? 'มือถือ'
      : 'คอม';
  const browser = /edg\//i.test(ua)
    ? 'Edge'
    : /fban|fbav|fb_iab/i.test(ua)
      ? 'Facebook'
      : /line\//i.test(ua)
        ? 'LINE'
        : /samsungbrowser/i.test(ua)
          ? 'Samsung'
          : /firefox|fxios/i.test(ua)
            ? 'Firefox'
            : /chrome|crios/i.test(ua)
              ? 'Chrome'
              : /safari/i.test(ua)
                ? 'Safari'
                : 'อื่นๆ';
  return `${kind} · ${browser}`;
}

/** เก็บเฉพาะ path ภายในเว็บ ไม่เกิน 120 ตัว ไม่เอา query (อาจมีโค้ด/เลขห้อง) */
export function cleanVisitPath(p: unknown): string | null {
  if (typeof p !== 'string' || !p.startsWith('/') || p.startsWith('//')) return null;
  return p.split(/[?#]/)[0].slice(0, 120);
}
