/** คัดลอกทันทีในจังหวะคลิก (ไม่รอ Promise) ต้องเรียกก่อน window.open คืน false ถ้าเบราว์เซอร์ไม่ยอม */
export function copyNow(text: string): boolean {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;';
  document.body.appendChild(ta);
  ta.select();
  ta.setSelectionRange(0, text.length);
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  ta.remove();
  return ok;
}
