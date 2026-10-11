import type { Config } from "tailwindcss";

/**
 * Brand palette ("Cozy Twilight")
 * - indigo  -> Grape violet (สีหลักของแบรนด์ ตามโลโก้ 5G)
 * - violet  -> Bubblegum pink (ใช้คู่กับ indigo ในกราเดียนต์ปุ่ม/หัวข้อ)
 * - gray    -> Plum-tinted neutrals (พื้นหลัง/เส้น/ข้อความ ทั้งโหมดสว่างและมืด)
 * ทุกคอมโพเนนต์เดิมที่ใช้ indigo-*, violet-*, gray-* จะเปลี่ยนสีตามอัตโนมัติ
 */
const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        indigo: {
          50: "#f4f1ff",
          100: "#ebe5ff",
          200: "#d9ccff",
          300: "#bfa9ff",
          400: "#a285ff",
          500: "#8660fb",
          600: "#7140f0",
          700: "#5f2fd4",
          800: "#4e28ab",
          900: "#3f2388",
          950: "#271358",
        },
        violet: {
          50: "#fff0f8",
          100: "#ffe0f0",
          200: "#ffc2e2",
          300: "#ff94cc",
          400: "#ff62b3",
          500: "#f53d9b",
          600: "#df2182",
          700: "#bb1569",
          800: "#981458",
          900: "#7c154c",
          950: "#4a0630",
        },
        gray: {
          50: "#faf8ff",
          100: "#f3f0fc",
          200: "#e7e1f6",
          300: "#d1c9ea",
          400: "#9d94bd",
          500: "#7a7099",
          600: "#5c5279",
          700: "#433a60",
          800: "#2c2548",
          900: "#1e1838",
          950: "#120e26",
        },
        sun: {
          300: "#ffe08a",
          400: "#ffd25e",
          500: "#ffc53a",
          600: "#f5a50f",
        },
        mint: {
          400: "#52e3ad",
          500: "#2fd196",
          600: "#17b07a",
        },
        sky: {
          400: "#5ccbff",
          500: "#2eb4f5",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["var(--font-noto-sans-thai)", "sans-serif"],
        display: ["var(--font-mitr)", "var(--font-noto-sans-thai)", "sans-serif"],
      },
      boxShadow: {
        // เงาแบบ "ของเล่น" ให้การ์ด/ปุ่มดูหนานุ่ม
        toy: "0 4px 0 0 rgb(95 47 212 / 0.18), 0 12px 28px -8px rgb(95 47 212 / 0.28)",
        "toy-lg": "0 6px 0 0 rgb(95 47 212 / 0.2), 0 22px 44px -12px rgb(95 47 212 / 0.38)",
        glow: "0 0 0 4px rgb(134 96 251 / 0.25), 0 0 32px rgb(134 96 251 / 0.55)",
      },
      animation: {
        "fade-in": "fadeIn 0.25s ease-out forwards",
        "scale-up": "scaleUp 0.2s ease-out forwards",
        float: "float 6s ease-in-out infinite",
        "float-slow": "float 9s ease-in-out infinite",
        twinkle: "twinkle 3s ease-in-out infinite",
        wiggle: "wiggle 2.4s ease-in-out infinite",
        "pop-in": "popIn 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both",
        shimmer: "shimmer 3.5s linear infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleUp: {
          "0%": { transform: "scale(0.96)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0) rotate(0deg)" },
          "50%": { transform: "translateY(-14px) rotate(4deg)" },
        },
        twinkle: {
          "0%, 100%": { opacity: "0.25", transform: "scale(0.8)" },
          "50%": { opacity: "1", transform: "scale(1.15)" },
        },
        wiggle: {
          "0%, 100%": { transform: "rotate(-4deg)" },
          "50%": { transform: "rotate(4deg)" },
        },
        popIn: {
          "0%": { opacity: "0", transform: "scale(0.7) translateY(12px)" },
          "100%": { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "0% 50%" },
          "100%": { backgroundPosition: "200% 50%" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
