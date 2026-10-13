import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  // If Supabase is not yet configured, allow accessing pages with warning
  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('your-project-id')) {
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Refresh auth session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // 1. Root redirect
  if (path === '/') {
    return NextResponse.redirect(new URL('/home', request.url));
  }

  // เส้นทางที่ต้องล็อกอิน + บทบาทที่อนุญาต (ตรวจซ้ำที่ API ทุกจุดอีกชั้น)
  const guarded: Array<[string, string[]]> = [
    ['/dev', ['dev']],
    ['/teacher', ['teacher', 'dev']],
    ['/parent', ['parent', 'member', 'dev']],
    ['/me', ['student']],
    ['/play', ['student', 'parent', 'teacher', 'member', 'dev']],
  ];
  const rule = guarded.find(([prefix]) => path === prefix || path.startsWith(prefix + '/'));

  const getRole = async (): Promise<string | null> => {
    if (!user) return null;
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    return profile?.role ?? null;
  };

  const homeFor = (role: string | null) =>
    role === 'student' ? '/me' : role === 'teacher' ? '/teacher' : '/home';

  // 2. ล็อกอินแล้วแต่เข้าหน้า login/สมัคร -> ส่งไปหน้าของบทบาทนั้น
  if (user && (path === '/login' || path === '/register' || path === '/kid')) {
    return NextResponse.redirect(new URL(homeFor(await getRole()), request.url));
  }

  if (rule) {
    // 3. ยังไม่ล็อกอิน
    if (!user) {
      const target = path.startsWith('/play') || path.startsWith('/me') ? '/kid' : '/login';
      const url = new URL(target, request.url);
      url.searchParams.set('redirect', path);
      return NextResponse.redirect(url);
    }
    // 4. ตรวจบทบาท
    const role = await getRole();
    if (!role || !rule[1].includes(role)) {
      const dest = path.startsWith('/dev') ? '/home?error=unauthorized_dev' : homeFor(role);
      return NextResponse.redirect(new URL(dest, request.url));
    }
  }

  return supabaseResponse;
}
