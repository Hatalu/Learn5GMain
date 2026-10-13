# 🎓 สื่อการสอน 5G
### ศูนย์รวมสื่อการสอนและเกมการศึกษา ระดับประถมศึกษา (5G นวัตกรรม)

เว็บแอปพลิเคชันศูนย์รวมสื่อการสอนและเกมการศึกษาที่ทันสมัย สวยงาม ใช้งานง่าย ออกแบบด้วยแนวคิด **Netflix-style UI for Education** รองรับการใช้งานของครู นักเรียน และผู้ดูแลระบบ (Dev) อย่างเต็มรูปแบบ

---

## 🌟 ฟีเจอร์หลัก (Key Features)

### 1. ระบบผู้ใช้งาน 2 บทบาท (Role-Based Access Control)
* **Member (สมาชิกทั่วไป / นักเรียน / ครู):**
  * เข้าสู่ระบบด้วย **Username + Password**
  * ค้นหาและดูคลังสื่อการสอนทั้งหมด
  * กรองสื่อตาม **วิชา** (คณิตศาสตร์, วิทยาศาสตร์, ภาษาอังกฤษ)
  * กรองสื่อตาม **ระดับชั้น** (ป.1 - ป.6) สามารถเลือกได้หลายระดับชั้นพร้อมกัน
  * กรองสื่อตาม **ประเภทสื่อ** (เกม, แบบฝึกหัด, แบบทดสอบ, สื่อ Interactive, วิดีโอ, อื่น ๆ)
  * เรียงลำดับสื่อ: **สื่อล่าสุด, สื่อยอดนิยม, A-Z**
  * กดเข้าสู่สื่อเพื่อเปิดเว็บไซต์เกม/สื่อในแท็บใหม่ (`target="_blank" rel="noopener noreferrer"`)
  * ระบบนับยอดเข้าชมสื่อ (**View Count**) แบบ Atomic อัตโนมัติ
  * เพิ่มและลบสื่อใน **รายการโปรด (Favorites)** ส่วนตัว
  * ป้องกันการเข้าถึงหน้า Dev และ API หลังบ้านอย่างเข้มงวด

* **Dev (ผู้ดูแลระบบ / ผู้พัฒนา):**
  * มีสิทธิ์ทั้งหมดของ Member
  * มีปุ่ม **"Dev แดชบอร์ด"** ที่แถบเมนูด้านบน
  * **ภาพรวมระบบ (Overview Stat Cards):** แสดงจำนวนสื่อทั้งหมด, สมาชิกทั้งหมด, ยอดเข้าชมทั้งหมด และรายการโปรดทั้งหมด
  * **จัดการสื่อการสอน (Media CRUD):**
    * เพิ่มสื่อการสอนใหม่ พร้อมระบบ **Crop รูป Icon เป็นสัดส่วน 1:1 (ขนาด 600x600 px)** และอัปโหลดขึ้น **Supabase Storage**
    * แก้ไขข้อมูลสื่อและเปลี่ยนรูปภาพได้
    * ลบสื่อการสอนพร้อมหน้าต่างยืนยันความปลอดภัย (**Confirmation Modal**) และล้างไฟล์ใน Storage
  * **จัดการสมาชิก (Member Management):**
    * จัดเก็บและแสดงข้อมูล 4 ส่วนสำคัญ:
      1. **Username** (ชื่อผู้ใช้)
      2. **รหัสผ่าน** (ไม่เก็บแบบอ่านได้ — ตั้งใหม่ได้ด้วยปุ่มกุญแจ)
      3. **Role Member** (สิทธิ์สมาชิกทั่วไป หรือ Dev)
      4. **วันหมดอายุ Premium** (ค่าเริ่มต้นจะเป็น `-` หรือกำหนดวันหมดอายุได้)
    * เพิ่มสมาชิกใหม่, แก้ไขชื่อผู้ใช้/สิทธิ์/วันหมดอายุ, รีเซ็ตรหัสผ่าน, ลบสมาชิก
    * **ระบบคุ้มครองความปลอดภัย:** ป้องกันการลบหรือลดสิทธิ์ Dev คนสุดท้ายของระบบ

### 2. ดีไซน์และประสบการณ์ใช้งาน (UI/UX)
* **Netflix-Style Content Rails:** แถบเลื่อนสื่อการสอนแนวนอน "สื่อใหม่ล่าสุด" พร้อมปุ่มเลื่อนซ้าย-ขวา และการรูดสัมผัสบนมือถือ
* **Responsive Design:**
  * **Desktop:** เมนูตัวกรอง Sidebar ด้านซ้าย และตารางการ์ดสื่อทางด้านขวา
  * **Mobile & Tablet:** เมนูกรองแปลงเป็น **Drawer / Bottom Sheet** ที่เปิดปิดได้สะดวก
* **Light / Dark Mode:** รองรับทั้งโหมดสว่างและโหมดมืด พร้อมสลับได้ทันทีผ่านปุ่ม Theme Toggle
* **Typography:** ใช้ฟอนต์ **Noto Sans Thai** ที่อ่านง่าย สบายตา และรองรับภาษาไทยอย่างสมบูรณ์แบบ
* **Interactive Feedback:** แจ้งเตือนสถานะการทำงานด้วย **Toast Notifications** ทุกครั้งที่มีการเพิ่ม แก้ไข ลบ หรือกด Favorite

---

## 🎓 ระบบผู้ปกครอง / คุณครู / นักเรียน (ใหม่)

| บทบาท | เข้าสู่ระบบอย่างไร | ทำอะไรได้ |
|---|---|---|
| **นักเรียน** | `/kid` รหัสนักเรียน 6 ตัว + PIN 4 หลัก (ไม่ต้องมีอีเมล) | ห้องผจญภัย: แผนที่ด่าน, ภารกิจประจำวัน, ดาว/ตรา/สติกเกอร์, ตัวละครคู่หูที่โตและแต่งตัวได้ |
| **ผู้ปกครอง** | `/register` (อีเมล + รหัสผ่าน) | สร้างบัญชีลูก, ดูรายงานรายสัปดาห์/เดือน, จำกัดเวลาเล่น, รีเซ็ต PIN, พิมพ์บัตร, ขอ Premium |
| **คุณครู** | `/register` | สร้างห้อง, วางรายชื่อทั้งห้องแล้วพิมพ์บัตร+QR, มอบหมายเกม, รายงานทั้งห้อง, เปิดสอนหน้าชั้น, พิมพ์แผนการสอน |
| **Dev (แอดมิน)** | `/login` | จัดการสื่อ (เพิ่มเป้าหมาย/ตัวชี้วัดหลักสูตรได้), สมาชิก, อนุมัติคำขอ Premium |

**ติดตั้งระบบใหม่:** รันไฟล์ `supabase/migrations/004_learning_platform.sql` ใน Supabase SQL Editor 1 ครั้ง (รันซ้ำได้ปลอดภัย) แล้วตั้งค่า `PLAY_TOKEN_SECRET` และ `NEXT_PUBLIC_SITE_URL` ใน `.env.local` (ดู `.env.example`)
**เชื่อมเกมกับระบบดาว/รายงาน:** ดู [docs/GAME_SDK.md](docs/GAME_SDK.md)
**ทดสอบตรรกะสำคัญ:** `npm run selftest`

### ความปลอดภัย
- ไม่เก็บรหัสผ่านที่อ่านได้ (คอลัมน์ `profiles.password` ถูกลบ) PIN เด็กเก็บเป็น scrypt hash ในตารางที่เบราว์เซอร์อ่านไม่ได้
- ตารางใหม่ทั้งหมดเปิด RLS แบบ "ไม่มี policy" ทุกการอ่าน/เขียนผ่าน API ฝั่งเซิร์ฟเวอร์ที่ตรวจบทบาทและความเป็นเจ้าของทุกครั้ง
- `profiles` อ่านได้เฉพาะแถวตัวเอง และแก้จากเบราว์เซอร์ไม่ได้ (สมาชิกให้ Premium ตัวเองไม่ได้)
- เด็กใส่ PIN ผิด 5 ครั้งล็อก 15 นาที + จำกัดความถี่ต่อ IP; ทุก API ที่เปลี่ยนข้อมูลตรวจ Origin กัน CSRF
- โทเคนเล่นเกมเซ็น HMAC อายุ 4 ชั่วโมง ผูกนักเรียน+เกม+รอบเล่น; ค่าผลลัพธ์ถูกตรวจช่วงค่า
- ส่วนหัวความปลอดภัย (X-Frame-Options, nosniff, HSTS ฯลฯ), ลบบัญชีพร้อมข้อมูลเด็กได้ (ยืนยันรหัสผ่าน), หน้านโยบายความเป็นส่วนตัวที่ `/privacy` (ฉบับร่าง ควรให้ผู้เชี่ยวชาญกฎหมายตรวจก่อนเปิดจริง)

**ข้อจำกัดที่ควรรู้:** (1) ยังไม่มีระบบชำระเงินอัตโนมัติ ผู้ใช้ขอ Premium แล้วแอดมินอนุมัติ (2) ไม่มีส่งอีเมล/LINE รายงานรายสัปดาห์อัตโนมัติ (ดู/พิมพ์รายงานในเว็บได้) (3) URL เกมของสื่อ Premium ยังเป็นข้อมูลสาธารณะใน DB เพราะเกมโฮสต์บน github.io การกั้นเข้มต้องย้ายเกมไปโฮสต์ที่ตรวจสิทธิ์ได้ (4) ผลคะแนนมาจากเกมฝั่งเบราว์เซอร์ เป็นการรายงานด้วยตัวเอง

---

## 🛠 Tech Stack

* **Frontend:** Next.js 14 (App Router), React 18, TypeScript
* **Styling:** Tailwind CSS, PostCSS, Lucide React Icons
* **Theme:** `next-themes` (Dark/Light mode)
* **Validation:** Zod v4 (Type-safe schema validation)
* **Backend & Database:** Supabase (PostgreSQL, Supabase Auth, Supabase Storage, Row Level Security)

---

## 🔒 สถาปัตยกรรมความปลอดภัย (Security & RLS)

1. **ไม่มีการเก็บ Plaintext Password ในฐานข้อมูล:**
   * การ Login ด้วย Username ถูกแปลงเป็น Secure Internal Email Mapping (`<username>@internal.mediahub.local`) ส่งผ่าน Supabase Auth ที่เข้ารหัสด้วยมาตรฐานสากล (bcrypt)
2. **Row Level Security (RLS) บนฐานข้อมูล:**
   * ตาราง `media`: สมาชิกทั่วไปอ่านได้เท่านั้น เฉพาะผู้ใช้ที่มีสิทธิ์ `role = 'dev'` เท่านั้นที่สามารถ Insert, Update หรือ Delete ได้
   * ตาราง `profiles`: สมาชิกทั่วไปอ่านได้ เฉพาะ Dev เท่านั้นที่จัดการเพิ่ม/ลบสมาชิกได้
   * ตาราง `favorites`: ผู้ใช้แต่ละคนสามารถอ่าน เขียน และลบได้เฉพาะข้อมูลของตนเอง (`auth.uid() = user_id`)
   * ตาราง `storage.objects`: บักเก็ต `media-icons` อนุญาตให้อ่านได้สาธารณะ แต่การอัปโหลด แก้ไข หรือลบไฟล์ ต้องเป็น Dev เท่านั้น
3. **Server-Side Authorization:**
   * Middleware และ Route Handlers (`/api/dev/*`) ตรวจสอบ Role ของผู้ใช้จากฐานข้อมูลจริงทุกครั้ง ไม่พึ่งพาเพียงการซ่อนปุ่มบน UI

---

## 🔐 บัญชี Dev เริ่มต้น

รหัสผ่านของบัญชี Dev **ไม่ถูกเขียนไว้ในโค้ดหรือเอกสารอีกต่อไป** ให้ตั้งเองในไฟล์ `.env.local` (`SEED_DEV_USERNAME` / `SEED_DEV_PASSWORD` อย่างน้อย 10 ตัวอักษร) แล้วรัน `npm run seed`
หากเคยใช้รหัสผ่านเริ่มต้นเดิมที่เคยอยู่ในเอกสารนี้ **ให้เปลี่ยนรหัสผ่านทันที** (ที่หน้า Dev > จัดการสมาชิก > ปุ่มกุญแจ)


---

## 🚀 ขั้นตอนการติดตั้งและรันระบบ (Setup Guide)

### 1. ติดตั้ง Dependencies
```bash
npm install
```

### 2. การตั้งค่า Supabase
1. เข้าไปที่ [Supabase Dashboard](https://supabase.com/dashboard) แล้วกด **New Project**
2. ไปที่เมนู **SQL Editor** ใน Supabase
3. คัดลอกโค้ดจากไฟล์ `supabase/migrations/001_initial_schema.sql` ไปวางแล้วกด **Run** (จะสร้างตาราง `profiles`, `media`, `favorites`, ฟังก์ชัน Atomic View Count, บักเก็ต `media-icons` และ RLS Policies ทั้งหมดโดยอัตโนมัติ)
4. (ตัวเลือก) คัดลอกโค้ดจากไฟล์ `supabase/seed.sql` ไปวางใน SQL Editor แล้วกด **Run** เพื่อสร้างบัญชี Dev `Hatalu001` และข้อมูล Demo Media ทันที

### 3. ตั้งค่า Environment Variables
สร้างไฟล์ `.env.local` ที่ Root Directory (หรือคัดลอกมาจาก `.env.example`):
```env
# Supabase Project URL (จาก Project Settings -> API)
NEXT_PUBLIC_SUPABASE_URL="https://your-project-id.supabase.co"

# Supabase Public Anon Key (ปลอดภัยสำหรับ Client-side)
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key-here"

# Supabase Service Role Key (ใช้เฉพาะบน Server สำหรับจัดการสมาชิก)
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here"

# ข้อมูลสำหรับ Seed Script
SEED_DEV_USERNAME="Hatalu001"
SEED_DEV_PASSWORD="ตั้งรหัสผ่านที่เดายากอย่างน้อย 10 ตัวอักษร"
```

### 4. รัน Seed Script ผ่านคำสั่ง Terminal (หากไม่ได้รัน seed.sql)
```bash
npm run seed
```
ระบบจะเชื่อมต่อ Supabase Admin API เพื่อสร้างบัญชี Dev `Hatalu001`, สร้าง Storage Bucket `media-icons` และใส่ข้อมูลสื่อการสอนตัวอย่าง (Demo Data) 3 รายการ

### 5. เริ่มต้นรัน Development Server
```bash
npm run dev
```
เปิดเบราว์เซอร์แล้วเข้าสู่: **`http://localhost:3000`**

### 6. ทดสอบการ Build สำหรับ Production
```bash
npm run build
npm run start
```

---

## 📁 โครงสร้างโปรเจกต์ (Project Architecture)

```
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── api/                      # Backend API Route Handlers
│   │   │   ├── dev/members/          # จัดการสมาชิก (CRUD, Reset Password)
│   │   │   ├── dev/stats/            # สรุปสถิติภาพรวมสำหรับ Dev
│   │   │   └── media/[id]/view/      # นับยอดวิวแบบ Atomic
│   │   ├── dev/                      # หน้า Dev Dashboard & Management
│   │   ├── home/                     # หน้าหลักคลังสื่อ (Netflix Rails + Grid + Filters)
│   │   ├── login/                    # หน้าจอเข้าสู่ระบบ
│   │   ├── globals.css               # สไตล์ Tailwind และ Custom Scrollbar
│   │   ├── layout.tsx                # Root Layout (Noto Sans Thai, Providers)
│   │   ├── page.tsx                  # Root redirect (ไป /home หรือ /login)
│   │   └── providers.tsx             # ThemeProvider, AuthProvider, ToastProvider
│   ├── components/
│   │   ├── dev/                      # Modals เพิ่ม/แก้ไข/ลบสื่อ, จัดการสมาชิก, StatCards
│   │   ├── media/                    # MediaCard, MediaRail, FilterSidebar, MobileDrawer, ImageCropper
│   │   ├── navbar/                   # Navbar, ThemeToggle, UserMenu
│   │   └── ui/                       # Toast Provider, Modals, Skeleton
│   ├── context/
│   │   └── AuthContext.tsx           # ระบบจัดการสถานะผู้ใช้, Role, Session
│   ├── lib/
│   │   ├── supabase/                 # Supabase Clients (Browser, Server, Admin, Middleware)
│   │   ├── utils/                    # Helper functions (cn, 1:1 Canvas Cropping)
│   │   └── validations/              # Zod validation schemas (Media, Member)
│   ├── types/
│   │   └── database.ts               # TypeScript Interfaces และ Constants
│   └── middleware.ts                 # Next.js Edge Middleware สำหรับ Route Guard
├── supabase/
│   ├── migrations/
│   │   └── 001_initial_schema.sql    # สคริปต์สร้าง Database Schema, Storage, RLS ทั้งหมด
│   └── seed.sql                      # สคริปต์ SQL สำหรับสร้างบัญชี Dev และ Demo Media
├── scripts/
│   └── seed.ts                       # สคริปต์ TypeScript Seeder ผ่าน Supabase Admin SDK
├── .env.example                      # แม่แบบ Environment Variables
└── package.json
```

---

## 🧪 ขั้นตอนการทดสอบฟังก์ชันสำคัญ (Testing Flow)

1. **หน้า Login:**
   * เปิด `http://localhost:3000` ระบบจะนำทางไปยัง `/login`
   * ทดสอบกรอกชื่อผู้ใช้และรหัสผ่านผิด ระบบจะแสดงข้อความแจ้งเตือนสีแดง
   * มีข้อความระบุชัดเจน: *"ลืมรหัสผ่าน? กรุณาติดต่อแอดมินผ่านเพจ"*
   * กรอกชื่อผู้ใช้และรหัสผ่านที่ตั้งไว้ใน .env.local ตอน seed เพื่อเข้าสู่ระบบ Dev
2. **หน้า Home:**
   * ระบบแสดงแถบ **"สื่อใหม่ล่าสุด"** แบบ Netflix Horizontal Rail
   * ทดสอบคลิกเลือกตัวกรอง **วิชา** (เช่น คณิตศาสตร์), **ระดับชั้น** (เช่น ป.3, ป.4) และ **ประเภทสื่อ**
   * ทดสอบปุ่ม **"ล้างตัวกรอง"**
   * ทดสอบเปลี่ยนการเรียงลำดับ: **สื่อล่าสุด, สื่อยอดนิยม, A-Z**
   * ทดสอบกดปุ่มหัวใจ (Favorite) เพื่อบันทึกเป็นรายการโปรด
   * ทดสอบกด **"เข้าสู่สื่อ"** จะเปิดหน้าต่างใหม่ใน New Tab และยอดวิวจะเพิ่มขึ้น
3. **หน้า Dev Dashboard:**
   * ที่มุมขวาบนของ Navbar จะมีปุ่ม **"Dev แดชบอร์ด"** (มองเห็นเฉพาะ Dev เท่านั้น)
   * แสดงการ์ดสถิติ 4 ช่อง
   * แถบ **"จัดการสื่อ"**: ทดสอบกด **"+ เพิ่มสื่อการสอน"** เพื่ออัปโหลดรูปภาพ (ระบบ Crop 1:1 ขนาด 600x600 อัตโนมัติ), ทดสอบปุ่มแก้ไข และปุ่มลบสื่อ (มี Confirmation Popup)
   * แถบ **"จัดการสมาชิก"**: ทดสอบเพิ่มสมาชิก Member ใหม่, แก้ไขสิทธิ์, รีเซ็ตรหัสผ่าน และทดสอบความปลอดภัย (ไม่สามารถลบ Dev คนสุดท้ายได้)
4. **ความปลอดภัยของ Member:**
   * เข้าสู่ระบบด้วยบัญชี Member ทั่วไป
   * ปุ่ม "Dev แดชบอร์ด" จะไม่ปรากฏ
   * หาก Member พิมพ์ URL `/dev` ในช่อง Address Bar โดยตรง ระบบจะปฏิเสธและ Redirect กลับมาที่หน้า `/home` ทันที
