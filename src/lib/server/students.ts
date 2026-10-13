import crypto from 'crypto';
import { SupabaseClient } from '@supabase/supabase-js';
import { Profile } from '@/types/database';
import { hashPin, randomCode, randomPin, studentEmail } from './security';

export const MAX_STUDENTS: Record<string, number> = {
  parent: 8,
  member: 8,
  teacher: 400,
  dev: 400,
};

export interface CreatedStudent {
  id: string;
  name: string;
  grade: string | null;
  code: string;
  pin: string;
}

/** สร้างบัญชีนักเรียน 1 คน (พร้อมย้อนกลับถ้าขั้นตอนใดล้มเหลว) */
export async function createStudent(
  admin: SupabaseClient,
  owner: Profile,
  input: { name: string; grade?: string; avatar?: string; classId?: string }
): Promise<CreatedStudent> {
  const pin = randomPin();
  let lastErr: unknown = null;

  for (let attempt = 0; attempt < 6; attempt++) {
    const code = randomCode(6);

    const { data: created, error: authErr } = await admin.auth.admin.createUser({
      email: studentEmail(code),
      // รหัสผ่านสุ่มที่ไม่มีใครรู้ นักเรียนเข้าด้วย รหัสนักเรียน+PIN ผ่านเซิร์ฟเวอร์เท่านั้น
      password: crypto.randomBytes(24).toString('base64url'),
      email_confirm: true,
      user_metadata: { role: 'student' },
    });
    if (authErr || !created.user) {
      lastErr = authErr;
      // อีเมลซ้ำ = รหัสชนกัน ลองสุ่มใหม่
      if (authErr && /already|registered|exists/i.test(authErr.message)) continue;
      throw authErr || new Error('create user failed');
    }
    const id = created.user.id;

    const { error: profErr } = await admin.from('profiles').insert({
      id,
      username: code,
      role: 'student',
      display_name: input.name,
      grade: input.grade ?? null,
      avatar: input.avatar || 'bear',
      owner_id: owner.id,
      // เด็กใช้สิทธิ์ Premium ตามผู้ปกครอง/ครูที่ดูแล
      premium_until: owner.premium_until ?? null,
      consent_at: new Date().toISOString(),
    });
    if (profErr) {
      await admin.auth.admin.deleteUser(id);
      throw profErr;
    }

    const { error: credErr } = await admin
      .from('student_credentials')
      .insert({ student_id: id, login_code: code, pin_hash: hashPin(pin) });
    if (credErr) {
      await admin.auth.admin.deleteUser(id);
      lastErr = credErr;
      continue;
    }

    await admin.from('student_stats').insert({ student_id: id });
    if (input.classId) {
      await admin.from('class_members').insert({ class_id: input.classId, student_id: id });
    }

    return { id, name: input.name, grade: input.grade ?? null, code, pin };
  }
  throw lastErr || new Error('could not allocate login code');
}
