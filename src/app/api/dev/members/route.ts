import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  createMemberAccount,
  deleteMember,
  getAdminClient,
  updateMember,
} from '@/lib/supabase/admin';
import { createMemberSchema, editMemberSchema } from '@/lib/validations/member';

/**
 * Server-side helper to verify that requester is authenticated and has role = 'dev'
 */
async function verifyDev() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { authorized: false, status: 401, error: 'กรุณาเข้าสู่ระบบ' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'dev') {
    return { authorized: false, status: 403, error: 'คุณไม่มีสิทธิ์เข้าถึงส่วนนี้ (สำหรับ Dev เท่านั้น)' };
  }

  return { authorized: true, user };
}

// GET /api/dev/members - List all members
export async function GET() {
  const check = await verifyDev();
  if (!check.authorized) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

  try {
    const admin = getAdminClient();
    const { data: members, error } = await admin
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ members });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการดึงข้อมูลสมาชิก';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST /api/dev/members - Create a new member
export async function POST(req: NextRequest) {
  const check = await verifyDev();
  if (!check.authorized) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

  try {
    const body = await req.json();
    const validated = createMemberSchema.parse(body);

    const newMember = await createMemberAccount(
      validated.username,
      validated.password,
      validated.role,
      validated.premium_until
    );

    return NextResponse.json({ member: newMember }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการสร้างสมาชิก';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

// PUT /api/dev/members - Edit member (username, role, premium_until)
export async function PUT(req: NextRequest) {
  const check = await verifyDev();
  if (!check.authorized) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

  try {
    const body = await req.json();
    const { userId, username, role, premium_until } = body;

    if (!userId) {
      return NextResponse.json({ error: 'ไม่พบ ID สมาชิก' }, { status: 400 });
    }

    const validated = editMemberSchema.parse({ username, role, premium_until });
    const updated = await updateMember(
      userId,
      validated.username,
      validated.role,
      validated.premium_until
    );

    return NextResponse.json({ member: updated });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการแก้ไขข้อมูลสมาชิก';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

// DELETE /api/dev/members - Delete member
export async function DELETE(req: NextRequest) {
  const check = await verifyDev();
  if (!check.authorized) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'ไม่พบ ID สมาชิก' }, { status: 400 });
    }

    await deleteMember(userId);
    return NextResponse.json({ success: true, message: 'ลบสมาชิกเรียบร้อยแล้ว' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการลบสมาชิก';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
