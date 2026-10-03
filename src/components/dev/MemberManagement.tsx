'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Profile, UserRole } from '@/types/database';
import { useToast } from '@/components/ui/Toast';
import {
  Users,
  UserPlus,
  KeyRound,
  Edit2,
  Trash2,
  Shield,
  User as UserIcon,
  Loader2,
  AlertTriangle,
  X,
  Check,
  Eye,
  EyeOff,
  Copy,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export function MemberManagement() {
  const { success, error, warning, info } = useToast();
  const [members, setMembers] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Password visibility set for table rows
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editMember, setEditMember] = useState<Profile | null>(null);
  const [resetPwMember, setResetPwMember] = useState<Profile | null>(null);
  const [deleteMember, setDeleteMember] = useState<Profile | null>(null);

  // Add Member Form State
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('member');
  const [newPremiumUntil, setNewPremiumUntil] = useState('');
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);

  // Edit Member Form State
  const [editUsername, setEditUsername] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('member');
  const [editPremiumUntil, setEditPremiumUntil] = useState('');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Reset Password State
  const [resetPasswordVal, setResetPasswordVal] = useState('');
  const [isSubmittingReset, setIsSubmittingReset] = useState(false);

  // Delete State
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);

  const fetchMembers = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/dev/members');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch members');
      setMembers(data.members || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error fetching members';
      error(msg);
    } finally {
      setIsLoading(false);
    }
  }, [error]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  // Toggle password visibility in table
  const togglePasswordVisibility = (userId: string) => {
    setVisiblePasswords((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  // Copy password to clipboard
  const copyPassword = (pwd: string) => {
    if (!pwd) return;
    navigator.clipboard.writeText(pwd);
    info('คัดลอกรหัสผ่านลงคลิปบอร์ดแล้ว');
  };

  // Format Premium Expiry Date (returns '-' if not set)
  const formatPremiumDate = (dateStr?: string | null) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '-';
      return d.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return '-';
    }
  };

  // Handle Add Member
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword) return;

    setIsSubmittingAdd(true);
    try {
      const res = await fetch('/api/dev/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newUsername.trim(),
          password: newPassword,
          role: newRole,
          premium_until: newPremiumUntil || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create member');

      success(`เพิ่มสมาชิก "${newUsername}" เรียบร้อยแล้ว`);
      setIsAddOpen(false);
      setNewUsername('');
      setNewPassword('');
      setNewRole('member');
      setNewPremiumUntil('');
      fetchMembers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error creating member';
      error(msg);
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  // Handle Edit Member
  const handleEditMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editMember || !editUsername.trim()) return;

    // Check last dev rule on UI before sending
    if (editMember.role === 'dev' && editRole === 'member') {
      const devCount = members.filter((m) => m.role === 'dev').length;
      if (devCount <= 1) {
        warning('ไม่สามารถลดสิทธิ์ Dev คนสุดท้ายได้ ระบบต้องมี Dev อย่างน้อย 1 คน');
        return;
      }
    }

    setIsSubmittingEdit(true);
    try {
      const res = await fetch('/api/dev/members', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: editMember.id,
          username: editUsername.trim(),
          role: editRole,
          premium_until: editPremiumUntil || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update member');

      success(`แก้ไขข้อมูลสมาชิก "${editUsername}" เรียบร้อยแล้ว`);
      setEditMember(null);
      fetchMembers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error updating member';
      error(msg);
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Handle Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPwMember || !resetPasswordVal) return;

    setIsSubmittingReset(true);
    try {
      const res = await fetch('/api/dev/members/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: resetPwMember.id,
          newPassword: resetPasswordVal,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset password');

      success(`รีเซ็ตรหัสผ่านสำหรับ "${resetPwMember.username}" สำเร็จ`);
      setResetPwMember(null);
      setResetPasswordVal('');
      fetchMembers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error resetting password';
      error(msg);
    } finally {
      setIsSubmittingReset(false);
    }
  };

  // Handle Delete Member
  const handleDeleteMember = async () => {
    if (!deleteMember) return;

    // Check last dev rule
    if (deleteMember.role === 'dev') {
      const devCount = members.filter((m) => m.role === 'dev').length;
      if (devCount <= 1) {
        warning('ไม่สามารถลบ Dev คนสุดท้ายของระบบได้');
        setDeleteMember(null);
        return;
      }
    }

    setIsSubmittingDelete(true);
    try {
      const res = await fetch(`/api/dev/members?userId=${deleteMember.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete member');

      success(`ลบสมาชิก "${deleteMember.username}" เรียบร้อยแล้ว`);
      setDeleteMember(null);
      fetchMembers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error deleting member';
      error(msg);
    } finally {
      setIsSubmittingDelete(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-gray-800">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-500" />
            <span>จัดการสมาชิก (Member Management)</span>
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            เก็บข้อมูล: Username, Password, Role (Member/Dev) และวันหมดอายุ Premium (ค่าเริ่มต้นเป็น -)
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 active:scale-95 transition-all"
        >
          <UserPlus className="w-4 h-4" />
          <span>+ เพิ่มสมาชิกใหม่</span>
        </button>
      </div>

      {/* Members Table */}
      {isLoading ? (
        <div className="p-12 flex flex-col items-center justify-center text-gray-400 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          <p className="text-xs">กำลังโหลดข้อมูลสมาชิก...</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/60 text-gray-600 dark:text-gray-400 uppercase tracking-wider font-semibold border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th className="py-3.5 px-4">1. ชื่อผู้ใช้ (Username)</th>
                <th className="py-3.5 px-4">2. รหัสผ่าน (Password)</th>
                <th className="py-3.5 px-4">3. สิทธิ์ (Role Member)</th>
                <th className="py-3.5 px-4">4. วันหมดอายุ Premium</th>
                <th className="py-3.5 px-4 text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {members.map((m) => {
                const isPasswordVisible = visiblePasswords.has(m.id);
                const displayPassword = m.password || '••••••';
                const premiumFormatted = formatPremiumDate(m.premium_until);
                const isPremiumActive =
                  m.premium_until && new Date(m.premium_until).getTime() > Date.now();

                return (
                  <tr
                    key={m.id}
                    className="hover:bg-gray-50/70 dark:hover:bg-gray-800/40 transition-colors"
                  >
                    {/* 1. Username */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 text-white flex items-center justify-center font-bold text-xs shrink-0">
                          {m.username.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {m.username}
                        </span>
                      </div>
                    </td>

                    {/* 2. Password (with view & copy) */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md">
                          {isPasswordVisible ? (m.password || '(ไม่มีข้อมูล)') : '••••••'}
                        </span>
                        {m.password && (
                          <>
                            <button
                              type="button"
                              onClick={() => togglePasswordVisibility(m.id)}
                              className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                              title={isPasswordVisible ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                            >
                              {isPasswordVisible ? (
                                <EyeOff className="w-3.5 h-3.5" />
                              ) : (
                                <Eye className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => copyPassword(m.password!)}
                              className="p-1 rounded text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                              title="คัดลอกรหัสผ่าน"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>

                    {/* 3. Role Member */}
                    <td className="py-3.5 px-4">
                      {m.role === 'dev' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                          <Shield className="w-3 h-3" />
                          <span>Dev</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                          <UserIcon className="w-3 h-3" />
                          <span>Role Member</span>
                        </span>
                      )}
                    </td>

                    {/* 4. วันหมดอายุ Premium (Default เป็น -) */}
                    <td className="py-3.5 px-4">
                      {premiumFormatted === '-' ? (
                        <span className="text-gray-400 dark:text-gray-500 font-medium text-xs">
                          -
                        </span>
                      ) : (
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border',
                            isPremiumActive
                              ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                              : 'bg-rose-50 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                          )}
                        >
                          <Calendar className="w-3 h-3" />
                          <span>{premiumFormatted}</span>
                          {!isPremiumActive && <span className="text-[10px]">(หมดอายุแล้ว)</span>}
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setEditMember(m);
                            setEditUsername(m.username);
                            setEditRole(m.role);
                            setEditPremiumUntil(
                              m.premium_until ? m.premium_until.split('T')[0] : ''
                            );
                          }}
                          className="p-1.5 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                          title="แก้ไขข้อมูลสมาชิก & วันหมดอายุ Premium"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setResetPwMember(m);
                            setResetPasswordVal('');
                          }}
                          className="p-1.5 rounded-lg text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
                          title="รีเซ็ตรหัสผ่าน"
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteMember(m)}
                          className="p-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          title="ลบสมาชิก"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal 1: Add Member */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-2xl p-6 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-500" />
                <span>เพิ่มสมาชิกใหม่</span>
              </h3>
              <button
                onClick={() => setIsAddOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddMember} className="mt-4 space-y-4">
              {/* 1. Username */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                  1. ชื่อผู้ใช้ (Username) *
                </label>
                <input
                  type="text"
                  required
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="เช่น student01 หรือ teacher01"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* 2. Password */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                  2. รหัสผ่าน (Password) *
                </label>
                <input
                  type="text"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="ความยาวอย่างน้อย 6 ตัวอักษร"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                  รหัสผ่านจะถูกบันทึกและแสดงในตารางเพื่อให้ Dev ตรวจสอบและส่งมอบให้ผู้เรียนได้
                </p>
              </div>

              {/* 3. Role Member */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                  3. สิทธิ์ (Role Member) *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewRole('member')}
                    className={cn(
                      'py-2 px-3 rounded-xl text-xs font-semibold border text-center transition-all',
                      newRole === 'member'
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                    )}
                  >
                    Role Member
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewRole('dev')}
                    className={cn(
                      'py-2 px-3 rounded-xl text-xs font-semibold border text-center transition-all',
                      newRole === 'dev'
                        ? 'bg-amber-600 border-amber-600 text-white'
                        : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                    )}
                  >
                    Dev
                  </button>
                </div>
              </div>

              {/* 4. วันหมดอายุ Premium */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    4. วันหมดอายุ Premium (ค่าเริ่มต้นคือ -)
                  </label>
                  {newPremiumUntil && (
                    <button
                      type="button"
                      onClick={() => setNewPremiumUntil('')}
                      className="text-[11px] text-rose-500 hover:underline"
                    >
                      ล้างเป็น (-)
                    </button>
                  )}
                </div>
                <input
                  type="date"
                  value={newPremiumUntil}
                  onChange={(e) => setNewPremiumUntil(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                  หากไม่ระบุวันที่ ระบบจะตั้งเป็นค่าเริ่มต้นคือ &quot;-&quot;
                </p>
              </div>

              <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs sm:text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdd}
                  className="px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 disabled:opacity-50"
                >
                  {isSubmittingAdd ? 'กำลังบันทึก...' : 'เพิ่มสมาชิก'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Edit Member */}
      {editMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-2xl p-6 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-indigo-500" />
                <span>แก้ไขข้อมูลสมาชิก</span>
              </h3>
              <button
                onClick={() => setEditMember(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditMember} className="mt-4 space-y-4">
              {/* 1. Username */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                  ชื่อผู้ใช้ *
                </label>
                <input
                  type="text"
                  required
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* 3. Role Member */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                  สิทธิ์ (Role) *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditRole('member')}
                    className={cn(
                      'py-2 px-3 rounded-xl text-xs font-semibold border text-center transition-all',
                      editRole === 'member'
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                    )}
                  >
                    Role Member
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditRole('dev')}
                    className={cn(
                      'py-2 px-3 rounded-xl text-xs font-semibold border text-center transition-all',
                      editRole === 'dev'
                        ? 'bg-amber-600 border-amber-600 text-white'
                        : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                    )}
                  >
                    Dev
                  </button>
                </div>
              </div>

              {/* 4. วันหมดอายุ Premium */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    วันหมดอายุ Premium
                  </label>
                  {editPremiumUntil && (
                    <button
                      type="button"
                      onClick={() => setEditPremiumUntil('')}
                      className="text-[11px] text-rose-500 hover:underline"
                    >
                      ล้างเป็น (-)
                    </button>
                  )}
                </div>
                <input
                  type="date"
                  value={editPremiumUntil}
                  onChange={(e) => setEditPremiumUntil(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditMember(null)}
                  className="px-4 py-2 rounded-xl text-xs sm:text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 disabled:opacity-50"
                >
                  {isSubmittingEdit ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Reset Password */}
      {resetPwMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-500" />
                <span>รีเซ็ตรหัสผ่าน</span>
              </h3>
              <button
                onClick={() => setResetPwMember(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="mt-4 space-y-4">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                กำหนดรหัสผ่านใหม่สำหรับสมาชิก: <span className="font-bold text-gray-900 dark:text-white">{resetPwMember.username}</span>
              </p>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                  รหัสผ่านใหม่ *
                </label>
                <input
                  type="text"
                  required
                  value={resetPasswordVal}
                  onChange={(e) => setResetPasswordVal(e.target.value)}
                  placeholder="ความยาวอย่างน้อย 6 ตัวอักษร"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setResetPwMember(null)}
                  className="px-4 py-2 rounded-xl text-xs sm:text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReset}
                  className="px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-600/20 disabled:opacity-50"
                >
                  {isSubmittingReset ? 'กำลังรีเซ็ต...' : 'เปลี่ยนรหัสผ่าน'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 4: Delete Member */}
      {deleteMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-2xl p-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1.5">
              คุณแน่ใจหรือไม่ว่าต้องการลบสมาชิกนี้?
            </h3>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
              ชื่อผู้ใช้: {deleteMember.username} ({deleteMember.role})
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
              การดำเนินการนี้จะลบบัญชีและสิทธิ์การเข้าใช้งานของผู้ใช้นี้ทันที
            </p>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteMember(null)}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={isSubmittingDelete}
                onClick={handleDeleteMember}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20 disabled:opacity-50"
              >
                {isSubmittingDelete ? 'กำลังลบ...' : 'ลบสมาชิก'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
