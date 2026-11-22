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
  Lock,
  Sparkles,
  CheckSquare,
  Square,
  SlidersHorizontal,
} from 'lucide-react';
import { api } from '../../services/api';
import {
  PERMISSION_GROUPS,
  ALL_PERMISSION_KEYS,
  EMPTY_PERMISSIONS,
  ROLE_PRESETS,
  PermissionKey,
  hasPermission,
  normalizePermissionsForEdit,
  isMainAdmin,
  PermissionGroupDef,
} from '../../utils/permissions';
import { toPersianDigits } from '../../utils/persian';

interface UsersTabProps {
  currentUser: StaffUser;
}

const GROUP_COLOR_STYLES: Record<
  PermissionGroupDef['color'],
  { border: string; headerBg: string; titleText: string; badge: string }
> = {
  emerald: {
    border: 'border-emerald-200',
    headerBg: 'bg-emerald-50/80',
    titleText: 'text-emerald-900',
    badge: 'bg-emerald-100 text-emerald-800',
  },
  teal: {
    border: 'border-teal-200',
    headerBg: 'bg-teal-50/80',
    titleText: 'text-teal-900',
    badge: 'bg-teal-100 text-teal-800',
  },
  indigo: {
    border: 'border-indigo-200',
    headerBg: 'bg-indigo-50/80',
    titleText: 'text-indigo-900',
    badge: 'bg-indigo-100 text-indigo-800',
  },
  blue: {
    border: 'border-blue-200',
    headerBg: 'bg-blue-50/80',
    titleText: 'text-blue-900',
    badge: 'bg-blue-100 text-blue-800',
  },
  amber: {
    border: 'border-amber-200',
    headerBg: 'bg-amber-50/80',
    titleText: 'text-amber-900',
    badge: 'bg-amber-100 text-amber-800',
  },
  rose: {
    border: 'border-rose-200',
    headerBg: 'bg-rose-50/80',
    titleText: 'text-rose-900',
    badge: 'bg-rose-100 text-rose-800',
  },
  slate: {
    border: 'border-slate-200',
    headerBg: 'bg-slate-100/80',
    titleText: 'text-slate-900',
    badge: 'bg-slate-200 text-slate-800',
  },
};

interface PermissionsMatrixEditorProps {
  perms: UserPermissions;
  onChange: (next: UserPermissions) => void;
  onApplyPreset?: (roleTitle: string, nextPerms: UserPermissions) => void;
  canGrantSmsTemplates: boolean;
  isTargetMainAdmin?: boolean;
}

const PermissionsMatrixEditor: React.FC<PermissionsMatrixEditorProps> = ({
  perms,
  onChange,
  onApplyPreset,
  canGrantSmsTemplates,
  isTargetMainAdmin = false,
}) => {
  const activeCount = ALL_PERMISSION_KEYS.filter((k) => Boolean(perms[k])).length;

  const toggleKey = (key: PermissionKey, checked: boolean) => {
    if (isTargetMainAdmin) return;
    if (key === 'manageSmsTemplates' && !canGrantSmsTemplates) return;
    onChange({ ...perms, [key]: checked });
  };

  const toggleGroup = (group: PermissionGroupDef, selectAll: boolean) => {
    if (isTargetMainAdmin) return;
    const next = { ...perms };
    for (const item of group.items) {
      if (item.key === 'manageSmsTemplates' && !canGrantSmsTemplates) {
        next[item.key] = false;
        continue;
      }
      next[item.key] = selectAll;
    }
    onChange(next);
  };

  const toggleEverything = (selectAll: boolean) => {
    if (isTargetMainAdmin) return;
    const next = { ...EMPTY_PERMISSIONS };
    for (const k of ALL_PERMISSION_KEYS) {
      if (k === 'manageSmsTemplates' && !canGrantSmsTemplates) {
        next[k] = false;
      } else {
        next[k] = selectAll;
      }
    }
    onChange(next);
  };

  return (
    <div className="space-y-3.5">
      {/* Header + Global Quick Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
          <span className="font-extrabold text-slate-900 text-xs">
            تعیین ریزبه‌ریز سطوح دسترسی کاربر
          </span>
          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
            {toPersianDigits(activeCount)} از {toPersianDigits(ALL_PERMISSION_KEYS.length)} مجوز فعال
          </span>
        </div>

        {!isTargetMainAdmin && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => toggleEverything(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-semibold transition cursor-pointer"
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>انتخاب همه</span>
            </button>
            <button
              type="button"
              onClick={() => toggleEverything(false)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-[11px] font-semibold transition cursor-pointer"
            >
              <Square className="w-3.5 h-3.5" />
              <span>لغو همه</span>
            </button>
          </div>
        )}
      </div>

      {isTargetMainAdmin && (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-semibold flex items-center gap-2">
          <Lock className="w-4 h-4 text-amber-600 shrink-0" />
          <span>حساب کاربری مدیر کل اصلی (admin) همواره به تمامی بخش‌های سامانه دسترسی کامل دارد.</span>
        </div>
      )}

      {/* Role Presets */}
      {!isTargetMainAdmin && (
        <div className="space-y-1.5">
          <span className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            الگوهای آماده نقش (برای تنظیم سریع و سپس سفارشی‌سازی):
          </span>
          <div className="flex flex-wrap gap-1.5">
            {ROLE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  const safePerms: UserPermissions = {
                    ...preset.perms,
                    manageSmsTemplates: canGrantSmsTemplates
                      ? Boolean(preset.perms.manageSmsTemplates)
                      : false,
                  };
                  if (onApplyPreset) {
                    onApplyPreset(preset.roleTitle, safePerms);
                  } else {
                    onChange(safePerms);
                  }
                }}
                className="px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-emerald-50 hover:text-emerald-900 hover:border-emerald-300 text-slate-700 border border-slate-200 text-[11px] font-semibold transition cursor-pointer"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Grouped Granular Checkboxes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {PERMISSION_GROUPS.map((group) => {
          const style = GROUP_COLOR_STYLES[group.color];
          const groupEnabledCount = group.items.filter((i) => Boolean(perms[i.key])).length;
          const allInGroupSelected = groupEnabledCount === group.items.length;

          return (
            <div
              key={group.id}
              className={`rounded-2xl border ${style.border} bg-white overflow-hidden flex flex-col`}
            >
              <div
                className={`px-3.5 py-2.5 ${style.headerBg} border-b ${style.border} flex items-center justify-between gap-2`}
              >
                <div className="min-w-0">
                  <div className={`font-extrabold text-xs ${style.titleText} flex items-center gap-1.5`}>
                    <span className="truncate">{group.title}</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${style.badge}`}>
                      {toPersianDigits(groupEnabledCount)}/{toPersianDigits(group.items.length)}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{group.subtitle}</p>
                </div>

                {!isTargetMainAdmin && (
                  <button
                    type="button"
                    onClick={() => toggleGroup(group, !allInGroupSelected)}
                    className="shrink-0 px-2 py-1 rounded-lg bg-white/80 hover:bg-white border border-slate-200 text-[10px] font-bold text-slate-700 transition cursor-pointer"
                  >
                    {allInGroupSelected ? 'لغو بخش' : 'همه بخش'}
                  </button>
                )}
              </div>

              <div className="p-3 space-y-2.5 flex-1">
                {group.items.map((item) => {
                  const isLocked =
                    isTargetMainAdmin ||
                    (item.key === 'manageSmsTemplates' && !canGrantSmsTemplates);
                  const isChecked = isTargetMainAdmin ? true : Boolean(perms[item.key]);

                  return (
                    <label
                      key={item.key}
                      className={`flex items-start gap-2.5 p-2 rounded-xl border transition ${
                        isChecked
                          ? 'bg-emerald-50/40 border-emerald-200/80'
                          : 'bg-slate-50/40 border-transparent hover:bg-slate-50'
                      } ${isLocked ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={isLocked}
                        onChange={(e) => toggleKey(item.key, e.target.checked)}
                        className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[11px] font-bold text-slate-800 leading-snug">
                            {item.label}
                          </span>
                          {item.adminBadge && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 text-[9px] font-extrabold">
                              <Lock className="w-2.5 h-2.5" />
                              ویژه ادمین
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                          {item.description}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const UsersTab: React.FC<UsersTabProps> = ({ currentUser }) => {
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [passwordResets, setPasswordResets] = useState<PasswordResetRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');

  const canGrantSmsTemplates =
    isMainAdmin(currentUser) || hasPermission(currentUser, 'manageSmsTemplates');

  // Create User Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('کارشناس مددکاری');
  const [perms, setPerms] = useState<UserPermissions>(() => ({
    ...ROLE_PRESETS[0].perms,
  }));
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState('');

  // Edit User Modal State
  const [editingUser, setEditingUser] = useState<StaffUser | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [editPerms, setEditPerms] = useState<UserPermissions>({ ...EMPTY_PERMISSIONS });
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

  const openCreateModal = () => {
    setName('');
    setUsername('');
    setPhone('');
    setPassword('');
    setRole('کارشناس مددکاری');
    setPerms({ ...ROLE_PRESETS[0].perms, manageSmsTemplates: false });
    setCreateError('');
    setShowCreateModal(true);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    setSubmitting(true);
    try {
      const sanitizedPerms: UserPermissions = {
        ...EMPTY_PERMISSIONS,
        ...perms,
        manageSmsTemplates: canGrantSmsTemplates ? Boolean(perms.manageSmsTemplates) : false,
      };
      await api.createUser({
        name: name.trim(),
        username: username.trim(),
        phone: phone.trim() || null,
        password,
        role: role.trim(),
        perms: sanitizedPerms,
      });
      setShowCreateModal(false);
      loadData();
    } catch (err: any) {
      setCreateError(err.message || 'خطا در ثبت کاربر جدید');
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
    setEditPerms(normalizePermissionsForEdit(u.perms, u.username === 'admin'));
    setEditError('');
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditError('');
    setEditSubmitting(true);
    try {
      const sanitizedPerms: UserPermissions = {
        ...EMPTY_PERMISSIONS,
        ...editPerms,
        manageSmsTemplates:
          editingUser.username === 'admin'
            ? true
            : canGrantSmsTemplates
            ? Boolean(editPerms.manageSmsTemplates)
            : false,
      };

      const payload: any = {
        name: editName.trim(),
        phone: editPhone.trim() || null,
        role: editRole.trim(),
        isActive: editingUser.username === 'admin' ? true : editIsActive,
        perms: sanitizedPerms,
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
      setPageError(err.message || 'خطا در حذف کاربر');
    }
  };

  const handleResolveReset = async (id: number) => {
    try {
      await api.resolvePasswordReset(id, 'RESOLVED');
      loadData();
    } catch {
      setPageError('خطا در تعیین وضعیت درخواست');
    }
  };

  const renderUserPermSummary = (u: StaffUser) => {
    if (u.username === 'admin') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-700 text-white text-[10px] font-extrabold">
          <Shield className="w-3 h-3" />
          دسترسی کامل (مدیر کل سامانه)
        </span>
      );
    }

    const normalized = normalizePermissionsForEdit(u.perms, false);
    const totalActive = ALL_PERMISSION_KEYS.filter((k) => Boolean(normalized[k])).length;

    const activeGroupBadges = PERMISSION_GROUPS.map((g) => {
      const count = g.items.filter((item) => Boolean(normalized[item.key])).length;
      return { group: g, count, total: g.items.length };
    }).filter((x) => x.count > 0);

    return (
      <div className="space-y-1.5">
        <div className="text-[10px] font-bold text-slate-500">
          {toPersianDigits(totalActive)} از {toPersianDigits(ALL_PERMISSION_KEYS.length)} مجوز فعال
        </div>
        <div className="flex flex-wrap gap-1 max-w-md">
          {activeGroupBadges.length === 0 ? (
            <span className="text-[10px] text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
              بدون دسترسی فعال
            </span>
          ) : (
            activeGroupBadges.map(({ group, count, total }) => {
              const style = GROUP_COLOR_STYLES[group.color];
              return (
                <span
                  key={group.id}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold ${style.badge}`}
                  title={group.items
                    .filter((i) => Boolean(normalized[i.key]))
                    .map((i) => i.label)
                    .join(' • ')}
                >
                  {group.title} ({toPersianDigits(count)}/{toPersianDigits(total)})
                </span>
              );
            })
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
              مدیریت پرسنل و تعیین دقیق سطوح دسترسی (RBAC)
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              برای هر کاربر می‌توانید مجوزهای بخش متقاضیان، کانال‌های ارتباط با مددجو (زنگوله/پیامک مجاز/پوش)، فرم‌ساز، طرح‌ها، مالی و تنظیمات را به‌صورت ریزبه‌ریز تعیین کنید.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl shadow transition shrink-0 cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>تعریف کاربر جدید با دسترسی اختصاصی</span>
        </button>
      </div>

      {pageError && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
          {pageError}
        </div>
      )}

      {/* Users List Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-600" />
            فهرست پرسنل و کاربران دارای دسترسی
          </h4>
          <span className="text-xs text-slate-500">
            {loading ? '...' : `${toPersianDigits(users.length)} کاربر ثبت‌شده`}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">مشخصات کاربر</th>
                <th className="py-3.5 px-4">نام کاربری / موبایل</th>
                <th className="py-3.5 px-4">نقش سازمانی</th>
                <th className="py-3.5 px-4">خلاصه مجوزهای فعال</th>
                <th className="py-3.5 px-4 text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {users.map((u) => (
                <tr
                  key={u.id}
                  className={`hover:bg-slate-50/70 transition ${
                    u.isActive === false ? 'opacity-60' : ''
                  }`}
                >
                  <td className="py-3.5 px-4 font-bold text-slate-900">
                    <div>{u.name}</div>
                    {u.isActive === false && (
                      <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 text-[10px]">
                        غیرفعال
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 space-y-0.5">
                    <div className="font-mono text-emerald-800 dir-ltr text-right">
                      @{u.username}
                    </div>
                    {u.phone ? (
                      <div className="font-mono text-[11px] text-slate-500 flex items-center gap-1 justify-end dir-ltr">
                        <span>{u.phone}</span>
                        <Smartphone className="w-3 h-3 text-emerald-600" />
                      </div>
                    ) : (
                      <span className="text-[10px] text-amber-600">موبایل ثبت نشده</span>
                    )}
                  </td>

                  <td className="py-3.5 px-4">
                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-medium">
                      {u.role}
                    </span>
                  </td>

                  <td className="py-3.5 px-4">{renderUserPermSummary(u)}</td>

                  <td className="py-3.5 px-4 text-center">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEditModal(u)}
                        title="ویرایش کاربر و تنظیم دسترسی‌ها"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg text-[11px] font-bold transition cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>دسترسی‌ها / ویرایش</span>
                      </button>

                      {u.username !== 'admin' ? (
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(u)}
                          title="حذف دسترسی کاربر"
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-bold px-1">
                          مدیر اصلی
                        </span>
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
            {toPersianDigits(passwordResets.filter((r) => r.status === 'PENDING').length)} درخواست در انتظار
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
                    <td className="py-3 px-4 text-slate-500 font-mono">{r.requestDate}</td>
                    <td className="py-3 px-4 text-slate-600">{r.note || '—'}</td>
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
                          type="button"
                          onClick={() => handleResolveReset(r.id)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-semibold transition cursor-pointer"
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

      {/* Create New User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                    تعریف کاربر جدید با سطوح دسترسی اختصاصی
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    اطلاعات هویتی را وارد کرده و دقیقاً مجوزهای مورد نیاز را تیک بزنید.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    نام و نام خانوادگی <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: سرکار خانم کریمی"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    نام کاربری (انگلیسی) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: karimi"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white outline-none focus:ring-2 focus:ring-emerald-500 font-mono dir-ltr text-right"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    سمت / عنوان نقش <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: کارشناس ارشد مددکاری"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white outline-none focus:ring-2 focus:ring-emerald-500"
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
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white outline-none focus:ring-2 focus:ring-emerald-500 font-mono dir-ltr text-right"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    کلمه عبور اولیه <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="حداقل ۶ کاراکتر"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white outline-none focus:ring-2 focus:ring-emerald-500 font-mono dir-ltr text-right"
                  />
                </div>
              </div>

              <PermissionsMatrixEditor
                perms={perms}
                onChange={setPerms}
                onApplyPreset={(roleTitle, nextPerms) => {
                  setRole(roleTitle);
                  setPerms(nextPerms);
                }}
                canGrantSmsTemplates={canGrantSmsTemplates}
              />

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 text-xs text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl shadow inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{submitting ? 'در حال ثبت...' : 'ثبت کاربر با دسترسی‌های انتخابی'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                    ویرایش اطلاعات و دسترسی‌های کاربر: {editingUser.name} (@{editingUser.username})
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    تغییرات دسترسی بلافاصله پس از ذخیره روی نشست کاربر اعمال می‌شود.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
                {editError}
              </div>
            )}

            <form onSubmit={handleUpdateUser} className="space-y-5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    نام و نام خانوادگی
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    سمت / عنوان نقش
                  </label>
                  <input
                    type="text"
                    required
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    شماره موبایل (ورود پیامکی)
                  </label>
                  <input
                    type="tel"
                    placeholder="09123456789"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white outline-none focus:ring-2 focus:ring-emerald-500 font-mono dir-ltr text-right"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    تغییر رمز عبور (اختیاری)
                  </label>
                  <input
                    type="password"
                    placeholder="خالی = بدون تغییر"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white outline-none focus:ring-2 focus:ring-emerald-500 dir-ltr text-right"
                  />
                </div>

                {editingUser.username !== 'admin' && (
                  <div className="sm:col-span-2 lg:col-span-4 pt-1">
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editIsActive}
                        onChange={(e) => setEditIsActive(e.target.checked)}
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="font-bold text-slate-700">حساب کاربری فعال باشد (امکان ورود به پنل مدیریت)</span>
                    </label>
                  </div>
                )}
              </div>

              <PermissionsMatrixEditor
                perms={editPerms}
                onChange={setEditPerms}
                onApplyPreset={(roleTitle, nextPerms) => {
                  setEditRole(roleTitle);
                  setEditPerms(nextPerms);
                }}
                canGrantSmsTemplates={canGrantSmsTemplates}
                isTargetMainAdmin={editingUser.username === 'admin'}
              />

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2.5 text-xs text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl shadow inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{editSubmitting ? 'در حال ذخیره...' : 'ذخیره تغییرات و دسترسی‌ها'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
