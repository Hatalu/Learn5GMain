'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Profile, UserRole } from '@/types/database';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  role: UserRole | null;
  isDev: boolean;
  isTeacher: boolean;
  /** ผู้ปกครอง (รวมสมาชิกเดิมที่ยังเป็น role = member) */
  isParent: boolean;
  isStudent: boolean;
  isLoading: boolean;
  /** เข้าสู่ระบบด้วยอีเมล (ผู้ใหญ่) หรือชื่อผู้ใช้เดิม */
  signIn: (identifier: string, password: string) => Promise<{ success: boolean; error?: string }>;
  /** นักเรียนเข้าด้วยรหัสนักเรียน + PIN */
  signInKid: (code: string, pin: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }
      return data as Profile;
    } catch (err) {
      console.error('Exception fetching profile:', err);
      return null;
    }
  }, [supabase]);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const p = await fetchProfile(user.id);
    if (p) setProfile(p);
  }, [user, fetchProfile]);

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && mounted) {
          setUser(session.user);
          const p = await fetchProfile(session.user.id);
          if (mounted && p) {
            setProfile(p);
          }
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    initAuth();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        const p = await fetchProfile(session.user.id);
        if (p) setProfile(p);
      } else {
        setUser(null);
        setProfile(null);
      }
      setIsLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, fetchProfile]);

  const signIn = async (identifier: string, password: string) => {
    try {
      const clean = identifier.trim().toLowerCase();
      // มี @ = อีเมลจริง (ผู้ปกครอง/ครู) ไม่มี = ชื่อผู้ใช้แบบเดิม
      const email = clean.includes('@') ? clean : `${clean}@internal.mediahub.local`;

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        return {
          success: false,
          error:
            error.message.includes('Invalid login credentials')
              ? 'อีเมล/ชื่อผู้ใช้ หรือรหัสผ่านไม่ถูกต้อง'
              : 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ กรุณาลองใหม่อีกครั้ง',
        };
      }

      if (data.user) {
        setUser(data.user);
        const p = await fetchProfile(data.user.id);
        if (p) setProfile(p);
      }

      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดไม่คาดคิด';
      return { success: false, error: msg };
    }
  };

  const signInKid = async (code: string, pin: string) => {
    try {
      const res = await fetch('/api/auth/kid-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, pin }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.tokenHash) {
        return { success: false, error: json.error || 'เข้าสู่ระบบไม่สำเร็จ ลองใหม่อีกครั้งนะ' };
      }

      const { data, error } = await supabase.auth.verifyOtp({ token_hash: json.tokenHash, type: 'magiclink' });
      if (error || !data.user) {
        return { success: false, error: 'เข้าสู่ระบบไม่สำเร็จ ลองใหม่อีกครั้งนะ' };
      }
      setUser(data.user);
      const p = await fetchProfile(data.user.id);
      if (p) setProfile(p);
      return { success: true };
    } catch {
      return { success: false, error: 'เชื่อมต่อไม่ได้ ลองใหม่อีกครั้งนะ' };
    }
  };

  const signOut = async () => {
    const wasStudent = profile?.role === 'student';
    try {
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
    } catch (err) {
      console.error('Error signing out:', err);
    }
    router.push(wasStudent ? '/kid' : '/login');
  };

  const role = profile?.role ?? null;
  const isDev = role === 'dev';

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role,
        isDev,
        isTeacher: role === 'teacher',
        isParent: role === 'parent' || role === 'member',
        isStudent: role === 'student',
        isLoading,
        signIn,
        signInKid,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
