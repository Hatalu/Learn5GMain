import path from 'path';
import { createRequire } from 'module';

// ไฟล์ WASM ของ MediaPipe (เกม AR) คัดลอกจาก node_modules ไป public ทุกครั้งที่ next dev/build (ไม่ขึ้นกับคำสั่ง build ของ Vercel)
createRequire(import.meta.url)('./scripts/copy-mediapipe.cjs');

const isDev = process.env.NODE_ENV !== 'production';
const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseHost = (() => {
  try {
    return new URL(supabase).hostname;
  } catch {
    return '';
  }
})();

/**
 * Content-Security-Policy: อนุญาตเฉพาะแหล่งที่เว็บใช้จริง (กันสคริปต์แปลกปลอม/XSS และกันเว็บอื่นเอาไปฝัง)
 * - เกมเปิดใน iframe ได้เฉพาะ https (และ localhost ตอนพัฒนา)
 * - Cloudflare Turnstile ใช้กันบอท (ถ้าตั้งค่าไว้)
 */
const csp = [
  "default-src 'self'",
  // 'wasm-unsafe-eval' = ให้ MediaPipe (ตรวจท่าทางเกม AR) รัน WebAssembly ได้ (ไฟล์อยู่ในโดเมนเราเอง)
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${isDev ? " 'unsafe-eval'" : ''} https://challenges.cloudflare.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' ${supabase} ${supabase.replace('https://', 'wss://')} https://challenges.cloudflare.com${isDev ? ' ws://localhost:* http://localhost:*' : ''}`,
  `frame-src 'self' https:${isDev ? ' http://localhost:*' : ''}`,
  // คลิปในเกมที่สมาชิกสร้าง เก็บใน Supabase Storage
  `media-src 'self' blob: ${supabase}`,
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ['upgrade-insecure-requests']),
].join('; ');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // ย่อรูปผ่านเซิร์ฟเวอร์เราได้เฉพาะรูปจาก Supabase (ไม่เปิดให้ใช้เป็นตัวย่อรูปของเว็บอื่น)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        // เฉพาะโปรเจกต์ Supabase ของเรา (ไม่ใช่ทุกโปรเจกต์ใน supabase.co)
        hostname: supabaseHost || '**.supabase.co',
      },
    ],
  },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=(), payment=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          { key: 'Content-Security-Policy', value: csp },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
          { key: 'X-DNS-Prefetch-Control', value: 'off' },
        ],
      },
    ];
  },
  webpack: (config) => {
    config.resolve.alias['@'] = path.resolve(process.cwd(), 'src');
    return config;
  },
};

export default nextConfig;
