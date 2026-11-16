/** หน้าที่ขอไว้ก่อนมาเข้าสู่ระบบ/สมัคร (?redirect=/create) รับเฉพาะ path ภายในเว็บเรา */
export function redirectTarget(fallback = '/'): string {
  if (typeof window === 'undefined') return fallback;
  const r = new URLSearchParams(window.location.search).get('redirect');
  return r && r.startsWith('/') && !r.startsWith('//') ? r : fallback;
}
