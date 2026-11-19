import React, { useState, useEffect } from 'react';
import { StaffUser, UserPermissions, PasswordResetRecord } from '../../types';
import {
  UserPlus,
  KeyRound,
  Trash2,
  Shield,
  Smartphone,
  Edit2,
  X,
  Check,
} from 'lucide-react';
import { api } from '../../services/api';

interface UsersTabProps {
  currentUser: StaffUser;
}

export const UsersTab: React.FC<UsersTabProps> = ({ currentUser }) => {
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [passwordResets, setPasswordResets] = useState<PasswordResetRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // New User Form State
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('کارشناس مددکاری');
  const [perms, setPerms] = useState<UserPermissions>({
    viewInbox: true,
    decideInbox: false,
    viewProg: true,
    createProg: false,
    decideProg: false,
    viewFin: false,
    manageSettings: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Edit User Modal State
  const [editingUser, setEditingUser] = useState<StaffUser | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [editPerms, setEditPerms] = useState<UserPermissions>({});
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [uList, rList] = await Promise.all([
        api.getUsers(),
        api.getPasswordResets(),
      ]);
      setUsers(uList);
      setPasswordResets(rList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.createUser({
        name,
        username: username.trim(),
        phone: phone.trim() || null,
        password,
        role,
        perms,
      });
      // Reset
      setName('');
      setUsername('');
      setPhone('');
      setPassword('');
      setRole('کارشناس مددکاری');
      setPerms({
        viewInbox: true,
        decideInbox: false,
        viewProg: true,
        createProg: false,
        decideProg: false,
        viewFin: false,
        manageSettings: false,
      });
      loadData();
    } catch (err: any) {
      setError(err.message || 'خطا در ثبت کاربر جدید');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (u: StaffUser) => {
    setEditingUser(u);
    setEditName(u.name);
    setEditPhone(u.phone || '');
    setEditRole(u.role);
    setEditPassword('');
    setEditIsActive(u.isActive !== false);
    setEditPerms({ ...(u.perms || {}) });
    setEditError('');
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditError('');
    setEditSubmitting(true);
    try {
      const payload: any = {
        name: editName,
        phone: editPhone.trim() || null,
        role: editRole,
        isActive: editingUser.username === 'admin' ? true : editIsActive,
        perms: editPerms,
      };
      if (editPassword.trim()) {
        payload.password = editPassword.trim();
      }
      await api.updateUser(editingUser.id, payload);
      setEditingUser(null);
      loadData();
    } catch (err: any) {
      setEditError(err.message || 'خطا در به‌روزرسانی اطلاعات کاربر');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDeleteUser = async (user: StaffUser) => {
    if (user.username === 'admin') {
      return;
    }
    if (!window.confirm(`آیا از حذف دسترسی کاربر «${user.name}» اطمینان دارید؟`)) return;
    try {
      await api.deleteUser(user.id);
      loadData();
    } catch (err: any) {
      setError(err.message || 'خطا در حذف کاربر');
    }
  };

  const handleResolveReset = async (id: number) => {
    try {
      await api.resolvePasswordReset(id, 'RESOLVED');
      loadData();
    } catch {
      setError('خطا در تعیین وضعیت درخواست');
    }
  };

  return (
    <div className="space-y-8">
      {/* Grid: Create User Form on Left, Users List on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Add User Form (1 Col) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <UserPlus className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-sm text-slate-900">
              تعریف کاربر جدید با سطوح دسترسی اختصاصی
            </h3>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                نام و نام خانوادگی
              </label>
              <input
                type="text"
                required
                placeholder="مثال: سرکار خانم کریمی"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                نام کاربری (انگلیسی)
              </label>
              <input
                type="text"
                required
                placeholder="مثال: karimi"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-emerald-500 font-mono dir-ltr text-right"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                شماره موبایل (جهت ورود پیامکی)
              </label>
              <input
                type="tel"
                placeholder="09123456789"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-emerald-500 font-mono dir-ltr text-right"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                کلمه عبور اولیه
              </label>
              <input
                type="password"
                required
                placeholder="حداقل ۶ کاراکتر"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-emerald-500 font-mono dir-ltr text-right"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                سمت / عنوان نقش
              </label>
              <input
                type="text"
                required
                placeholder="مثال: کارشناس ارشد مددکاری"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Granular Permission Checkboxes */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <span className="font-bold text-slate-800 block">مجوزها و سطوح دسترسی:</span>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={perms.viewInbox}
                  onChange={(e) => setPerms({ ...perms, viewInbox: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-slate-700">مشاهده کارتابل نیازمندان (viewInbox)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={perms.decideInbox}
                  onChange={(e) => setPerms({ ...perms, decideInbox: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-slate-700 font-semibold text-emerald-800">
                  تصمیم‌گیری و تصویب مبالغ نیازمندان (decideInbox)
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={perms.viewProg}
                  onChange={(e) => setPerms({ ...perms, viewProg: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-slate-700">مشاهده طرح‌ها و پروژه‌ها (viewProg)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={perms.createProg}
                  onChange={(e) => setPerms({ ...perms, createProg: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-slate-700">تعریف و ایجاد طرح‌های جدید (createProg)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={perms.decideProg}
                  onChange={(e) => setPerms({ ...perms, decideProg: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-slate-700 font-semibold text-emerald-800">
                  تصویب بودجه طرح‌ها و مراحل پایپ‌لاین (decideProg)
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={perms.viewFin}
                  onChange={(e) => setPerms({ ...perms, viewFin: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-slate-700">مشاهده گزارشات مالی و تعهدات (viewFin)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={perms.manageSettings}
                  onChange={(e) => setPerms({ ...perms, manageSettings: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-slate-700">مدیریت تنظیمات و دسته‌ها (manageSettings)</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow transition mt-2"
            >
              {submitting ? 'در حال ثبت...' : 'ثبت کاربر در اتوماسیون'}
            </button>
          </form>
        </div>

        {/* Users List Table (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-600" />
                فهرست پرسنل و کاربران دارای دسترسی
              </h4>
              <span className="text-xs text-slate-500">
                {loading ? '...' : `${users.length} کاربر ثبت‌شده`}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">مشخصات کاربر</th>
                    <th className="py-3 px-4">نام کاربری / موبایل</th>
                    <th className="py-3 px-4">نقش سازمانی</th>
                    <th className="py-3 px-4">مجوزهای فعال</th>
                    <th className="py-3 px-4 text-center">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {users.map((u) => (
                    <tr key={u.id} className={`hover:bg-slate-50/70 transition ${u.isActive === false ? 'opacity-60' : ''}`}>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        <div>{u.name}</div>
                        {u.isActive === false && (
                          <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 text-[10px]">
                            غیرفعال
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 space-y-0.5">
                        <div className="font-mono text-emerald-800 dir-ltr text-right">@{u.username}</div>
                        {u.phone ? (
                          <div className="font-mono text-[11px] text-slate-500 flex items-center gap-1 justify-end dir-ltr">
                            <span>{u.phone}</span>
                            <Smartphone className="w-3 h-3 text-emerald-600" />
                          </div>
                        ) : (
                          <span className="text-[10px] text-amber-600">موبایل ثبت نشده</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <span className="inline-block px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-medium">
                          {u.role}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {u.perms.viewInbox && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800">
                              نیازمندان
                            </span>
                          )}
                          {u.perms.decideInbox && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-700 text-white font-bold">
                              تصویب مبلغ
                            </span>
                          )}
                          {u.perms.viewProg && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-100 text-blue-800">
                              طرح‌ها
                            </span>
                          )}
                          {u.perms.createProg && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-teal-100 text-teal-800">
                              ثبت طرح
                            </span>
                          )}
                          {u.perms.decideProg && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-teal-700 text-white font-bold">
                              تصویب طرح
                            </span>
                          )}
                          {u.perms.viewFin && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-100 text-amber-800">
                              مالی
                            </span>
                          )}
                          {u.perms.manageSettings && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-100 text-purple-800">
                              تنظیمات
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => openEditModal(u)}
                            title="ویرایش کاربر و شماره موبایل"
                            className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {u.username !== 'admin' ? (
                            <button
                              onClick={() => handleDeleteUser(u)}
                              title="حذف دسترسی کاربر"
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-bold px-1">مدیر اصلی</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Password Reset Requests Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-600" />
                درخواست‌های بازیابی رمز عبور پرسنل
              </h4>
              <span className="text-xs text-slate-500">
                {passwordResets.filter((r) => r.status === 'PENDING').length} درخواست در انتظار
              </span>
            </div>

            {passwordResets.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                هیچ درخواست بازیابی رمزی ثبت نشده است.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">نام کاربری</th>
                      <th className="py-3 px-4">تاریخ درخواست</th>
                      <th className="py-3 px-4">توضیحات</th>
                      <th className="py-3 px-4">وضعیت</th>
                      <th className="py-3 px-4 text-center">اقدام</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {passwordResets.map((r) => (
                      <tr key={r.id}>
                        <td className="py-3 px-4 font-mono font-bold text-slate-800">
                          {r.username}
                        </td>
                        <td className="py-3 px-4 text-slate-500 font-mono">
                          {r.requestDate}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {r.note || '—'}
                        </td>
                        <td className="py-3 px-4">
                          {r.status === 'PENDING' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                              در انتظار بررسی
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              حل شده
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {r.status === 'PENDING' && (
                            <button
                              onClick={() => handleResolveReset(r.id)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-semibold transition"
                            >
                              علامت‌گذاری به عنوان حل‌شده
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-sm text-slate-900">
                  ویرایش کاربر: {editingUser.name} (@{editingUser.username})
                </h3>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
                {editError}
              </div>
            )}

            <form onSubmit={handleUpdateUser} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">نام و نام خانوادگی</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">سمت / عنوان نقش</label>
                  <input
                    type="text"
                    required
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    شماره موبایل (جهت ورود پیامکی)
                  </label>
                  <input
                    type="tel"
                    placeholder="09123456789"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-emerald-500 font-mono dir-ltr text-right"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    تغییر رمز عبور (اختیاری)
                  </label>
                  <input
                    type="password"
                    placeholder="در صورت عدم تغییر خالی بگذارید"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-emerald-500 dir-ltr text-right"
                  />
                </div>
              </div>

              {editingUser.username !== 'admin' && (
                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={editIsActive}
                    onChange={(e) => setEditIsActive(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="font-semibold text-slate-700">حساب کاربری فعال باشد</span>
                </label>
              )}

              <div className="pt-2 border-t border-slate-100 space-y-2">
                <span className="font-bold text-slate-800 block">مجوزها و سطوح دسترسی:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { key: 'viewInbox', label: 'مشاهده کارتابل نیازمندان' },
                    { key: 'decideInbox', label: 'تصویب مبالغ نیازمندان' },
                    { key: 'viewProg', label: 'مشاهده طرح‌ها و پروژه‌ها' },
                    { key: 'createProg', label: 'ثبت طرح‌های جدید' },
                    { key: 'decideProg', label: 'تصویب بودجه طرح‌ها' },
                    { key: 'viewFin', label: 'مشاهده گزارشات مالی' },
                    { key: 'manageSettings', label: 'مدیریت تنظیمات و سیستم' },
                  ].map((item) => (
                    <label key={item.key} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean((editPerms as any)[item.key])}
                        onChange={(e) =>
                          setEditPerms({ ...editPerms, [item.key]: e.target.checked })
                        }
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-slate-700">{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow inline-flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  {editSubmitting ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
