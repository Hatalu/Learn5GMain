/**
 * สร้างข้อความ QR พร้อมเพย์ (มาตรฐาน EMVCo / Thai QR Payment) แบบระบุยอดเงิน
 * รองรับ: เบอร์มือถือ 10 หลัก, เลขบัตรประชาชน/ผู้เสียภาษี 13 หลัก, e-Wallet ID 15 หลัก
 */

const tlv = (id: string, value: string) => id + String(value.length).padStart(2, '0') + value;

export function crc16(s: string): string {
  let crc = 0xffff;
  for (let i = 0; i < s.length; i++) {
    crc ^= s.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export type PromptPayKind = 'phone' | 'national_id' | 'ewallet';

/** ตรวจรูปแบบเลขพร้อมเพย์ คืนชนิด หรือ null ถ้าไม่ถูกต้อง */
export function promptPayKind(id: string): PromptPayKind | null {
  const d = (id || '').replace(/\D/g, '');
  if (/^0\d{9}$/.test(d)) return 'phone';
  if (/^\d{13}$/.test(d)) return 'national_id';
  if (/^\d{15}$/.test(d)) return 'ewallet';
  return null;
}

export function promptPayPayload(id: string, amount: number): string {
  const d = (id || '').replace(/\D/g, '');
  const kind = promptPayKind(d);
  if (!kind) throw new Error('เลขพร้อมเพย์ไม่ถูกต้อง');
  if (!(amount > 0) || amount > 1_000_000) throw new Error('ยอดเงินไม่ถูกต้อง');
  const target =
    kind === 'phone' ? tlv('01', ('66' + d.slice(1)).padStart(13, '0')) : kind === 'national_id' ? tlv('02', d) : tlv('03', d);
  const body =
    tlv('00', '01') +
    tlv('01', '12') + // QR ใช้ครั้งเดียว (ระบุยอด)
    tlv('29', tlv('00', 'A000000677010111') + target) +
    tlv('58', 'TH') +
    tlv('53', '764') +
    tlv('54', amount.toFixed(2)) +
    '6304';
  return body + crc16(body);
}

/** แสดงเลขพร้อมเพย์แบบปิดบางส่วน เช่น 081-xxx-5678 */
export function maskPromptPay(id: string): string {
  const d = (id || '').replace(/\D/g, '');
  if (d.length <= 4) return d;
  return d.slice(0, 3) + '-xxx-' + d.slice(-4);
}
