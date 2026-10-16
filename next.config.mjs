import path from 'path';

const isDev = process.env.NODE_ENV !== 'production';
const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

/**
 * Content-Security-Policy: อนุญาตเฉพาะแหล่งที่เว็บใช้จริง (กันสคริปต์แปลกปลอม/XSS และกันเว็บอื่นเอาไปฝัง)
 * - เกมเปิดใน iframe ได้เฉพาะ https (และ localhost ตอนพัฒนา)
 * - Cloudflare Turnstile ใช้กันบอท (ถ้าตั้งค่าไว้)
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''} https://challenges.cloudflare.com`,
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
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '**.placeholder.com',
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
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
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
