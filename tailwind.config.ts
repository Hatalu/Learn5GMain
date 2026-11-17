import type { Config } from "tailwindcss";

// เทากลาง (เหมือน neutral ของ Tailwind) ใช้แทนทุกสีตกแต่ง: ทั้งเว็บเป็นขาว-ดำ
const N = {
  50: "#fafafa",
  100: "#f5f5f5",
  200: "#e5e5e5",
  300: "#d4d4d4",
  400: "#a3a3a3",
  500: "#737373",
  600: "#525252",
  700: "#404040",
  800: "#262626",
  900: "#171717",
  950: "#0a0a0a",
};
// ม่วงของพาเลต Digital Luxury (#9d5cff หลัก, #cfa8ff อ่อน) ผู้ใช้สั่ง 17 พ.ย. 2026
const P = {
  50: "#f7f1ff",
  100: "#efe3ff",
  200: "#e2ccff",
  300: "#cfa8ff",
  400: "#b781ff",
  500: "#9d5cff",
  600: "#8a3ff5",
  700: "#7329d6",
  800: "#5d22ac",
  900: "#4a1d87",
  950: "#2e0f5c",
};
/** สีโทนม่วง = ม่วงแบรนด์ สีตกแต่งอื่นเป็นเทา (แดง/เขียว ยังคงไว้สำหรับแจ้งผิด/ถูก) */
const MONO = {
  ...Object.fromEntries(["gray", "pink", "sky", "blue", "cyan", "teal", "orange", "amber", "yellow", "lime", "sun", "mint", "slate", "zinc", "stone"].map((k) => [k, N])),
  ...Object.fromEntries(["indigo", "violet", "purple", "fuchsia"].map((k) => [k, P])),
};

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
        ...MONO,
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["var(--font-noto-sans-thai)", "sans-serif"],
        display: ["var(--font-display)", "var(--font-noto-sans-thai)", "sans-serif"],
      },
      boxShadow: {
        // เงาแบบ "ของเล่น" ให้การ์ด/ปุ่มดูหนานุ่ม
        toy: "0 1px 2px rgb(0 0 0 / 0.04)",
        "toy-lg": "0 8px 30px -12px rgb(0 0 0 / 0.18)",
        glow: "0 0 0 3px rgb(0 0 0 / 0.08)",
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
        kenburns: "kenburns 18s ease-in-out infinite alternate",
        "sheet-up": "sheetUp 0.42s cubic-bezier(0.22, 1.2, 0.36, 1) both",
        "page-in": "pageIn 0.35s cubic-bezier(0.22, 1, 0.36, 1) both",
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
        sheetUp: {
          "0%": { transform: "translateY(100%)" },
          "100%": { transform: "translateY(0)" },
        },
        pageIn: {
          "0%": { opacity: "0", transform: "translateX(var(--page-from, 24px)) scale(0.98)" },
          "100%": { opacity: "1", transform: "none" },
        },
        kenburns: {
          "0%": { transform: "scale(1.25) translate(0, 0)" },
          "100%": { transform: "scale(1.45) translate(-4%, -3%)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
