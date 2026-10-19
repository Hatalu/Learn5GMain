/**
 * สร้างไฟล์ PDF จากรูป JPEG หน้าละ 1 รูป (ไม่ต้องใช้ไลบรารีเพิ่ม)
 * แต่ละหน้าขนาด wPt x hPt (1 pt = 1/72 นิ้ว) รูปเต็มหน้า
 */

/** อ่านขนาดรูปจากหัวไฟล์ JPEG (SOF0-SOF15 ยกเว้น DHT/JPG/DAC) */
export function jpegSize(b: Uint8Array): { w: number; h: number } | null {
  if (b[0] !== 0xff || b[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) return null;
    const m = b[i + 1];
    const len = (b[i + 2] << 8) | b[i + 3];
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
      return { h: (b[i + 5] << 8) | b[i + 6], w: (b[i + 7] << 8) | b[i + 8] };
    }
    i += 2 + len;
  }
  return null;
}

export interface PdfPage {
  jpeg: Uint8Array;
  wPt: number;
  hPt: number;
}

export function buildPdf(pages: PdfPage[]): Uint8Array {
  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let pos = 0;
  const push = (c: Uint8Array | string) => {
    const u = typeof c === 'string' ? enc.encode(c) : c;
    chunks.push(u);
    pos += u.length;
  };
  const obj = (n: number, body: string | (Uint8Array | string)[]) => {
    offsets[n] = pos;
    push(`${n} 0 obj\n`);
    for (const part of Array.isArray(body) ? body : [body]) push(part);
    push('\nendobj\n');
  };
  const f = (n: number) => (Math.round(n * 100) / 100).toString();

  push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  // วัตถุ: 1 catalog, 2 pages, แล้วหน้าละ 3 วัตถุ (page, content, image)
  const kids = pages.map((_, i) => `${3 + i * 3} 0 R`).join(' ');
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  obj(2, `<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`);
  pages.forEach((p, i) => {
    const n = 3 + i * 3;
    const size = jpegSize(p.jpeg);
    if (!size) throw new Error('รูปหน้าที่ ' + (i + 1) + ' ไม่ใช่ JPEG');
    const draw = `q ${f(p.wPt)} 0 0 ${f(p.hPt)} 0 0 cm /Im0 Do Q`;
    obj(n, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${f(p.wPt)} ${f(p.hPt)}] /Resources << /XObject << /Im0 ${n + 2} 0 R >> >> /Contents ${n + 1} 0 R >>`);
    obj(n + 1, `<< /Length ${draw.length} >>\nstream\n${draw}\nendstream`);
    obj(n + 2, [
      `<< /Type /XObject /Subtype /Image /Width ${size.w} /Height ${size.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.jpeg.length} >>\nstream\n`,
      p.jpeg,
      '\nendstream',
    ]);
  });
  const count = 3 + pages.length * 3;
  const xref = pos;
  push(`xref\n0 ${count}\n0000000000 65535 f \n`);
  for (let n = 1; n < count; n++) push(`${String(offsets[n]).padStart(10, '0')} 00000 n \n`);
  push(`trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);

  const out = new Uint8Array(pos);
  let o = 0;
  for (const c of chunks) {
    out.set(c, o);
    o += c.length;
  }
  return out;
}
