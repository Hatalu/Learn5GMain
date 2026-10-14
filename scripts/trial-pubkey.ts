/**
 * พิมพ์กุญแจสาธารณะสำหรับฝังในเกม (ไฟล์ l5g-trial.js ตัวแปร PUBLIC_JWK)
 * รัน: npx tsx scripts/trial-pubkey.ts
 * ใช้ค่าจาก .env.local (TRIAL_SIGNING_SEED หรือ SUPABASE_SERVICE_ROLE_KEY) เหมือนที่เซิร์ฟเวอร์ใช้เซ็น
 */
import dotenv from 'dotenv';
import { trialPublicJwk } from '../src/lib/server/trial';

dotenv.config({ path: '.env.local' });
console.log(JSON.stringify(trialPublicJwk()));
