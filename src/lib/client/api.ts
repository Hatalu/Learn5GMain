/** เรียก API ของเราและคืนข้อความ error ภาษาไทยที่อ่านรู้เรื่อง */
export class ApiError extends Error {
  status: number;
  data: Record<string, unknown>;
  constructor(message: string, status: number, data: Record<string, unknown> = {}) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

export async function api<T = Record<string, unknown>>(
  url: string,
  init?: Omit<RequestInit, 'body'> & { body?: unknown }
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
      cache: 'no-store',
    });
  } catch {
    throw new ApiError('เชื่อมต่อไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่', 0);
  }
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new ApiError(typeof json.error === 'string' ? json.error : 'เกิดข้อผิดพลาด กรุณาลองใหม่', res.status, json);
  }
  return json as T;
}

export const errMsg = (e: unknown) => (e instanceof Error ? e.message : 'เกิดข้อผิดพลาด');
