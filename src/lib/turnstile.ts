'use client';

/**
 * ขอโทเคน Cloudflare Turnstile แบบมองไม่เห็น (ผู้ใช้ไม่ต้องทำอะไร)
 * ถ้ายังไม่ได้ตั้ง NEXT_PUBLIC_TURNSTILE_SITE_KEY คืน null และเซิร์ฟเวอร์จะข้ามการตรวจ
 */
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';

interface TurnstileApi {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  remove: (id: string) => void;
}
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let loading: Promise<void> | null = null;
function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => {
        loading = null;
        reject(new Error('turnstile'));
      };
      document.head.appendChild(s);
    });
  }
  return loading;
}

export async function getTurnstileToken(action: string): Promise<string | null> {
  if (!SITE_KEY || typeof window === 'undefined') return null;
  try {
    await loadScript();
  } catch {
    return null;
  }
  return new Promise((resolve) => {
    const host = document.createElement('div');
    host.style.cssText = 'position:fixed;left:-9999px;top:0;';
    document.body.appendChild(host);
    let id = '';
    const done = (tok: string | null) => {
      try {
        if (id) window.turnstile?.remove(id);
      } catch {
        /* ว่าง */
      }
      host.remove();
      resolve(tok);
    };
    const timer = setTimeout(() => done(null), 15000);
    try {
      id = window.turnstile!.render(host, {
        sitekey: SITE_KEY,
        action,
        size: 'invisible',
        callback: (t: string) => {
          clearTimeout(timer);
          done(t);
        },
        'error-callback': () => {
          clearTimeout(timer);
          done(null);
        },
      });
    } catch {
      clearTimeout(timer);
      done(null);
    }
  });
}
