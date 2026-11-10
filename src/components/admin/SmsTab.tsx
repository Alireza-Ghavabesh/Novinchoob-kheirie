import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  Plus,
  Trash2,
  Edit2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Key,
  Sliders,
  History,
  Info,
  RefreshCw,
  Power,
  Check,
  UserCheck,
} from 'lucide-react';
import { SmsConfig, SmsRule, SmsLog, SmsEventType, SmsTargetType, StaffUser } from '../../types';
import { api } from '../../services/api';

interface SmsTabProps {
  currentUser: StaffUser;
}

export const SmsTab: React.FC<SmsTabProps> = ({ currentUser }) => {
  const [subTab, setSubTab] = useState<'rules' | 'config' | 'logs' | 'test'>('rules');
  const [config, setConfig] = useState<SmsConfig>({
    id: 1,
    apiKey: '',
    senderLine: '',
    provider: 'GHASEDAK',
    isEnabled: true,
  });
  const [rules, setRules] = useState<SmsRule[]>([]);
  const [logs, setLogs] = useState<SmsLog[]>([]);
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Form state for rule creation/editing
  const [isEditingRule, setIsEditingRule] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<number | null>(null);
  const [ruleFormData, setRuleFormData] = useState<{
    title: string;
    eventType: SmsEventType;
    triggerStatus: string;
    userFilter: string;
    targetType: SmsTargetType;
    customNumbers: string;
    templateType: 'SIMPLE' | 'OTP';
    templateName: string;
    templateParam1: string;
    templateParam2: string;
    templateParam3: string;
    messageBody: string;
    isActive: boolean;
  }>({
    title: '',
    eventType: 'REQUEST_CREATED',
    triggerStatus: 'PENDING',
    userFilter: 'ALL',
    targetType: 'BENEFICIARY',
    customNumbers: '',
    templateType: 'SIMPLE',
    templateName: '',
    templateParam1: '',
    templateParam2: '',
    templateParam3: '',
    messageBody: '',
    isActive: true,
  });

  // Test SMS State
  const [testReceptor, setTestReceptor] = useState('');
  const [testMessage, setTestMessage] = useState('سلام، این یک پیامک آزمایشی از سامانه مؤسسه خیریه است.');
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [cfg, rls, lgs, usrs] = await Promise.all([
        api.getSmsConfig(),
        api.getSmsRules(),
        api.getSmsLogs(),
        api.getUsers().catch(() => []),
      ]);
      setConfig(cfg);
      setRules(rls);
      setLogs(lgs);
      setUsers(usrs);
    } catch (err: any) {
      console.error(err);
      notify('خطا در بارگذاری اطلاعات پنل پیامک', 'error');
    } finally {
      setLoading(false);
    }
  };

  const notify = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMsg({ text, type });
    setTimeout(() => setStatusMsg(null), 4000);
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = await api.updateSmsConfig(config);
      setConfig(updated);
      notify('تنظیمات سرویس پیامک قاصدک با موفقیت ذخیره شد.');
    } catch (err: any) {
      notify(err.message || 'خطا در ذخیره تنظیمات', 'error');
    }
  };

  const handleToggleGlobalEnable = async () => {
    try {
      const newEnabled = !config.isEnabled;
      const updated = await api.updateSmsConfig({ isEnabled: newEnabled });
      setConfig(updated);
      notify(newEnabled ? 'ارسال خودکار پیامک فعال شد.' : 'ارسال خودکار پیامک موقتاً متوقف شد.');
    } catch (err: any) {
      notify(err.message || 'خطا در تغییر وضعیت', 'error');
    }
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleFormData.title.trim()) {
      notify('عنوان شرط را وارد نمایید.', 'error');
      return;
    }
    if (!ruleFormData.messageBody.trim()) {
      notify('متن پیام یا قالب پیامک الزامی است.', 'error');
      return;
    }

    try {
      if (editingRuleId) {
        await api.updateSmsRule(editingRuleId, ruleFormData);
        notify('شرط ارسال با موفقیت ویرایش شد.');
      } else {
        await api.createSmsRule(ruleFormData);
        notify('شرط جدید ارسال پیامک با موفقیت افزوده شد.');
      }
      setIsEditingRule(false);
      setEditingRuleId(null);
      const rls = await api.getSmsRules();
      setRules(rls);
    } catch (err: any) {
      notify(err.message || 'خطا در ذخیره شرط', 'error');
    }
  };

  const handleToggleRuleActive = async (rule: SmsRule) => {
    try {
      await api.updateSmsRule(rule.id, { isActive: !rule.isActive });
      setRules(prev => prev.map(r => r.id === rule.id ? { ...r, isActive: !r.isActive } : r));
      notify(`شرط «${rule.title}» ${!rule.isActive ? 'فعال' : 'غیرفعال'} شد.`);
    } catch (err: any) {
      notify(err.message || 'خطا در تغییر وضعیت شرط', 'error');
    }
  };

  const handleDeleteRule = async (id: number) => {
    if (!window.confirm('آیا از حذف این شرط ارسال پیامک اطمینان دارید؟')) return;
    try {
      await api.deleteSmsRule(id);
      setRules(prev => prev.filter(r => r.id !== id));
      notify('شرط ارسال با موفقیت حذف شد.');
    } catch (err: any) {
      notify(err.message || 'خطا در حذف شرط', 'error');
    }
  };

  const handleEditRuleClick = (rule: SmsRule) => {
    setEditingRuleId(rule.id);
    setRuleFormData({
      title: rule.title,
      eventType: rule.eventType,
      triggerStatus: rule.triggerStatus || 'ALL',
      userFilter: rule.userFilter || 'ALL',
      targetType: rule.targetType,
      customNumbers: rule.customNumbers || '',
      templateType: rule.templateType || 'SIMPLE',
      templateName: rule.templateName || '',
      templateParam1: rule.templateParam1 || '',
      templateParam2: rule.templateParam2 || '',
      templateParam3: rule.templateParam3 || '',
      messageBody: rule.messageBody,
      isActive: rule.isActive,
    });
    setIsEditingRule(true);
  };

  const handleNewRuleClick = () => {
    setEditingRuleId(null);
    setRuleFormData({
      title: '',
      eventType: 'REQUEST_CREATED',
      triggerStatus: 'PENDING',
      userFilter: 'ALL',
      targetType: 'BENEFICIARY',
      customNumbers: '',
      templateType: 'SIMPLE',
      templateName: '',
      templateParam1: '',
      templateParam2: '',
      templateParam3: '',
      messageBody: 'سلام {name} عزیز، درخواست شما در {instName} با کد {trackingCode} دریافت شد.',
      isActive: true,
    });
    setIsEditingRule(true);
  };

  const handleSendTestSms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testReceptor) {
      notify('شماره موبایل گیرنده را وارد نمایید.', 'error');
      return;
    }
    try {
      setTestSending(true);
      setTestResult(null);
      const res = await api.testSms(testReceptor, testMessage);
      setTestResult(res);
      notify('درخواست ارسال تست با موفقیت پردازش شد.');
      const lgs = await api.getSmsLogs();
      setLogs(lgs);
    } catch (err: any) {
      notify(err.message || 'خطا در ارسال پیامک تست', 'error');
      setTestResult({ success: false, error: err.message });
    } finally {
      setTestSending(false);
    }
  };

  const handleClearLogs = async () => {
    if (!window.confirm('آیا گزارشات تاریخچه ارسال پیامک پاک شوند؟')) return;
    try {
      await api.clearSmsLogs();
      setLogs([]);
      notify('تاریخچه ارسال پیامک پاک شد.');
    } catch (err: any) {
      notify(err.message || 'خطا در پاکسازی', 'error');
    }
  };

  const insertPlaceholder = (ph: string) => {
    setRuleFormData(prev => ({
      ...prev,
      messageBody: prev.messageBody + ' ' + ph,
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header & Global Status */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center border border-amber-500/20">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">سامانه هوشمند ارسال پیامک (قاصدک)</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              تنظیم شروط خودکار ارسال پیامک، پیامک‌های اعتبارسنجی (OTP/الگو) و پایش گزارشات ارسال
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleGlobalEnable}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition ${
              config.isEnabled
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
            }`}
          >
            <Power className="w-4 h-4" />
            وضعیت کلی: {config.isEnabled ? 'فعال و خودکار' : 'غیرفعال (متوقف)'}
          </button>

          <button
            onClick={fetchInitialData}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
            title="بروزرسانی داده‌ها"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Status Alert Notification */}
      {statusMsg && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center gap-2 animate-in fade-in duration-200 ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {statusMsg.type === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
          <span className="font-medium">{statusMsg.text}</span>
        </div>
      )}

      {/* Sub navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setSubTab('rules')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition ${
            subTab === 'rules'
              ? 'bg-slate-900 text-white shadow'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Sliders className="w-4 h-4" />
          شروط و قوانین ارسال ({rules.length})
        </button>

        <button
          onClick={() => setSubTab('config')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition ${
            subTab === 'config'
              ? 'bg-slate-900 text-white shadow'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Key className="w-4 h-4" />
          تنظیمات اتصال قاصدک (API Key)
        </button>

        <button
          onClick={() => setSubTab('test')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition ${
            subTab === 'test'
              ? 'bg-slate-900 text-white shadow'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Send className="w-4 h-4" />
          تست ارسال دستی
        </button>

        <button
          onClick={() => setSubTab('logs')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition ${
            subTab === 'logs'
              ? 'bg-slate-900 text-white shadow'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <History className="w-4 h-4" />
          تاریخچه و گزارشات ارسال ({logs.length})
        </button>
      </div>

      {/* 1. RULES TAB */}
      {subTab === 'rules' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800">قوانین و شروط ماشه‌ای پیامک</h3>
              <p className="text-xs text-slate-500">
                سیستم با هر تغییر در درخواست مددجو یا طرح، شروط زیر را بررسی و پیامک مناسب را برای افراد هدف ارسال می‌کند.
              </p>
            </div>
            {!isEditingRule && (
              <button
                onClick={handleNewRuleClick}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow transition"
              >
                <Plus className="w-4 h-4" />
                تعریف شرط جدید
              </button>
            )}
          </div>

          {/* Add / Edit Form Modal / Box */}
          {isEditingRule && (
            <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm p-5 space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-emerald-600" />
                  {editingRuleId ? 'ویرایش شرط ارسال پیامک' : 'افزودن شرط جدید'}
                </h4>
                <button
                  onClick={() => setIsEditingRule(false)}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  انصراف
                </button>
              </div>

              <form onSubmit={handleSaveRule} className="space-y-4 text-xs">
                {/* Title */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">عنوان شرط:</label>
                  <input
                    type="text"
                    required
                    value={ruleFormData.title}
                    onChange={e => setRuleFormData({ ...ruleFormData, title: e.target.value })}
                    placeholder="مثال: اطلاع‌رسانی تأیید درخواست به مددجو"
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                {/* Event Type & Status Trigger */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      رویداد ماشه (چه اتفاقی افتاد؟):
                    </label>
                    <select
                      value={ruleFormData.eventType}
                      onChange={e => setRuleFormData({ ...ruleFormData, eventType: e.target.value as SmsEventType })}
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-emerald-500 bg-white"
                    >
                      <option value="REQUEST_CREATED">ثبت درخواست جدید مددجو</option>
                      <option value="REQUEST_STATUS_CHANGED">تغییر وضعیت درخواست مددجو</option>
                      <option value="PROGRAM_CREATED">ثبت طرح خیریه جدید</option>
                      <option value="PROGRAM_STATUS_CHANGED">تغییر وضعیت طرح خیریه</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      شرط وضعیت هدف:
                    </label>
                    <select
                      value={ruleFormData.triggerStatus}
                      onChange={e => setRuleFormData({ ...ruleFormData, triggerStatus: e.target.value })}
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-emerald-500 bg-white"
                    >
                      <option value="ALL">همه وضعیت‌ها (بدون فیلتر)</option>
                      <option value="PENDING">در انتظار بررسی (PENDING)</option>
                      <option value="APPROVED">تأیید و مصوب شد (APPROVED)</option>
                      <option value="NEEDS_INFO">نیازمند تکمیل مدارک (NEEDS_INFO)</option>
                      <option value="REJECTED">رد درخواست (REJECTED)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      فیلتر کاربر اعمال‌کننده:
                    </label>
                    <select
                      value={ruleFormData.userFilter}
                      onChange={e => setRuleFormData({ ...ruleFormData, userFilter: e.target.value })}
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-emerald-500 bg-white"
                    >
                      <option value="ALL">هر کاربری (همه مددکاران و مدیران)</option>
                      {users.map(u => (
                        <option key={u.id} value={u.username}>
                          فقط کاربر: {u.name} ({u.username})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Target Type & Custom Numbers */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      پیامک برای چه کسی ارسال شود؟ (گیرنده هدف):
                    </label>
                    <select
                      value={ruleFormData.targetType}
                      onChange={e => setRuleFormData({ ...ruleFormData, targetType: e.target.value as SmsTargetType })}
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-emerald-500 bg-white"
                    >
                      <option value="BENEFICIARY">شماره موبایل متقاضی / مددجو (از روی فرم درخواست)</option>
                      <option value="ADMINS">مدیران و مؤسسه (شماره تلفن مؤسسه + شماره‌های خاص)</option>
                      <option value="SPECIFIC_NUMBERS">شماره‌های اختصاصی مشخص</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      شماره‌های خاص / پشتیبان (اختیاری):
                    </label>
                    <input
                      type="text"
                      value={ruleFormData.customNumbers}
                      onChange={e => setRuleFormData({ ...ruleFormData, customNumbers: e.target.value })}
                      placeholder="09121234567, 09351234567 (با کاما جدا کنید)"
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Template Type & OTP Pattern Settings */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700">نوع ارسال پیامک قاصدک:</span>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="templateType"
                          value="SIMPLE"
                          checked={ruleFormData.templateType === 'SIMPLE'}
                          onChange={() => setRuleFormData({ ...ruleFormData, templateType: 'SIMPLE' })}
                        />
                        <span>متن ساده (Simple SMS)</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="templateType"
                          value="OTP"
                          checked={ruleFormData.templateType === 'OTP'}
                          onChange={() => setRuleFormData({ ...ruleFormData, templateType: 'OTP' })}
                        />
                        <span>الگو / قالب اعتبارسنجی قاصدک (OTP Pattern - بدون مسدودی بلک‌لیست)</span>
                      </label>
                    </div>
                  </div>

                  {ruleFormData.templateType === 'OTP' && (
                    <div className="pt-2 border-t border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-2">
                      <div>
                        <label className="block font-medium text-[11px] text-slate-600 mb-0.5">نام قالب قاصدک:</label>
                        <input
                          type="text"
                          value={ruleFormData.templateName}
                          onChange={e => setRuleFormData({ ...ruleFormData, templateName: e.target.value })}
                          placeholder="مثال: charityVerify"
                          className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-xs bg-white"
                        />
                      </div>
                      <div>
                        <label className="block font-medium text-[11px] text-slate-600 mb-0.5">پارامتر ۱ (param1):</label>
                        <input
                          type="text"
                          value={ruleFormData.templateParam1}
                          onChange={e => setRuleFormData({ ...ruleFormData, templateParam1: e.target.value })}
                          placeholder="{trackingCode}"
                          className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-xs bg-white"
                        />
                      </div>
                      <div>
                        <label className="block font-medium text-[11px] text-slate-600 mb-0.5">پارامتر ۲ (param2):</label>
                        <input
                          type="text"
                          value={ruleFormData.templateParam2}
                          onChange={e => setRuleFormData({ ...ruleFormData, templateParam2: e.target.value })}
                          placeholder="{name}"
                          className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-xs bg-white"
                        />
                      </div>
                      <div>
                        <label className="block font-medium text-[11px] text-slate-600 mb-0.5">پارامتر ۳ (param3):</label>
                        <input
                          type="text"
                          value={ruleFormData.templateParam3}
                          onChange={e => setRuleFormData({ ...ruleFormData, templateParam3: e.target.value })}
                          placeholder="{amount}"
                          className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-xs bg-white"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Message Body & Placeholders */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-700">متن پیامک:</label>
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="text-[11px] text-slate-500">درج خودکار متغیر:</span>
                      {['{name}', '{trackingCode}', '{status}', '{amount}', '{cat}', '{note}', '{instName}', '{date}'].map(ph => (
                        <button
                          key={ph}
                          type="button"
                          onClick={() => insertPlaceholder(ph)}
                          className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-1.5 py-0.5 rounded text-[10px] font-mono transition"
                        >
                          {ph}
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea
                    rows={3}
                    required
                    value={ruleFormData.messageBody}
                    onChange={e => setRuleFormData({ ...ruleFormData, messageBody: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl p-3 text-xs focus:ring-2 focus:ring-emerald-500"
                    placeholder="سلام {name} عزیز، درخواست شما در {instName} با کد رهگیری {trackingCode} ثبت گردید."
                  />
                </div>

                {/* Submit Buttons */}
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingRule(false)}
                    className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 transition"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow transition flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    ذخیره شرط
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Rules List Cards */}
          <div className="grid grid-cols-1 gap-3">
            {rules.map((rule) => {
              const eventLabels: Record<string, string> = {
                REQUEST_CREATED: 'ثبت درخواست جدید',
                REQUEST_STATUS_CHANGED: 'تغییر وضعیت درخواست',
                PROGRAM_CREATED: 'ثبت طرح جدید',
                PROGRAM_STATUS_CHANGED: 'تغییر وضعیت طرح',
              };

              const targetLabels: Record<string, string> = {
                BENEFICIARY: 'مددجو / متقاضی',
                ADMINS: 'مدیریت و مؤسسه',
                SPECIFIC_NUMBERS: 'شماره‌های خاص',
              };

              return (
                <div
                  key={rule.id}
                  className={`bg-white rounded-2xl border p-4 shadow-sm transition flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    rule.isActive ? 'border-slate-200' : 'border-slate-200 bg-slate-50/70 opacity-75'
                  }`}
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-bold text-slate-900 text-sm">{rule.title}</h4>
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md text-[11px] font-medium">
                        رویداد: {eventLabels[rule.eventType] || rule.eventType}
                      </span>
                      {rule.triggerStatus && rule.triggerStatus !== 'ALL' && (
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md text-[11px] font-medium">
                          وضعیت: {rule.triggerStatus}
                        </span>
                      )}
                      <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md text-[11px] font-medium">
                        گیرنده: {targetLabels[rule.targetType] || rule.targetType}
                      </span>
                      {rule.userFilter && rule.userFilter !== 'ALL' && (
                        <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md text-[11px] font-medium flex items-center gap-1">
                          <UserCheck className="w-3 h-3" /> کاربر: {rule.userFilter}
                        </span>
                      )}
                      {rule.templateType === 'OTP' && (
                        <span className="bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-md text-[10px] font-semibold">
                          قالب OTP: {rule.templateName}
                        </span>
                      )}
                    </div>

                    <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 text-xs text-slate-700 font-sans leading-relaxed">
                      {rule.messageBody}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end md:self-center">
                    <button
                      onClick={() => handleToggleRuleActive(rule)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                        rule.isActive
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                          : 'bg-slate-200 text-slate-600 border-slate-300 hover:bg-slate-300'
                      }`}
                    >
                      {rule.isActive ? 'فعال' : 'غیرفعال'}
                    </button>

                    <button
                      onClick={() => handleEditRuleClick(rule)}
                      className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl border border-slate-200 transition"
                      title="ویرایش"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDeleteRule(rule.id)}
                      className="p-2 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-xl border border-slate-200 transition"
                      title="حذف"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}

            {rules.length === 0 && (
              <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-slate-300">
                <MessageSquare className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs text-slate-500 font-medium">هیچ شرط ارسالی تعریف نشده است.</p>
                <button
                  onClick={handleNewRuleClick}
                  className="mt-3 text-xs text-emerald-600 font-bold hover:underline"
                >
                  تعریف اولین شرط
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. CONFIG TAB (GHASEDAK API KEY) */}
      {subTab === 'config' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 max-w-2xl mx-auto space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">تنظیمات اتصال به سرویس پیامک قاصدک (Ghasedak)</h3>
              <p className="text-xs text-slate-500">
                بر اساس مستندات وب‌سرویس REST قاصدک (`api.ghasedak.me/v2`)
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveConfig} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                کلید دسترسی قاصدک (API Key):
              </label>
              <input
                type="text"
                value={config.apiKey}
                onChange={e => setConfig({ ...config, apiKey: e.target.value })}
                placeholder="مثال: 5f1c9d8a3b2e7a1234567890abcdef..."
                className="w-full border border-slate-300 rounded-xl px-3 py-2.5 font-mono text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                این کلید را می‌توانید از پنل کاربری قاصدک در بخش «تنظیمات وب‌سرویس / کلیدهای API» دریافت کنید. در صورت خالی بودن، ارسال‌ها در حالت شبیه‌سازی (Simulated) در لاگ ثبت می‌شوند.
              </p>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                شماره خط اختصاصی یا خدماتی فرستنده (اختیاری):
              </label>
              <input
                type="text"
                value={config.senderLine}
                onChange={e => setConfig({ ...config, senderLine: e.target.value })}
                placeholder="مثال: 3000500600 یا 1000..."
                className="w-full border border-slate-300 rounded-xl px-3 py-2.5 font-mono text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                در صورتی که خالی باشد، خط پیش‌فرض پنل قاصدک شما برای ارسال متن ساده استفاده خواهد شد.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-slate-100">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.isEnabled}
                  onChange={e => setConfig({ ...config, isEnabled: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <span className="font-semibold text-slate-800">ارسال خودکار پیامک‌ها فعال باشد</span>
              </label>

              <button
                type="submit"
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow transition"
              >
                ذخیره تنظیمات
              </button>
            </div>
          </form>

          {/* Doc Help Box */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 space-y-2">
            <h5 className="font-bold flex items-center gap-1.5 text-amber-800">
              <Info className="w-4 h-4" />
              راهنمای سرویس قاصدک:
            </h5>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-amber-800/90 leading-relaxed">
              <li>برای جلوگیری از بلاک شدن پیامک در گوشی‌های دارای مسدودی پیامک‌های تبلیغاتی (Blacklist)، از قابلیت <strong>الگو / OTP قاصدک</strong> استفاده کنید.</li>
              <li>در صورت استفاده از خطوط اختصاصی معمولی، گیرندگانی که پیامک تبلیغاتی را مسدود کرده باشند پیام را دریافت نخواهند کرد.</li>
              <li>برای اجرای محلی بدون اینترنت، نیازی به وارد کردن کلید نیست؛ سیستم تمام رویدادها را ثبت کرده و وضعیت را شبیه‌سازی می‌کند.</li>
            </ul>
          </div>
        </div>
      )}

      {/* 3. TEST SMS TAB */}
      {subTab === 'test' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 max-w-xl mx-auto space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Send className="w-5 h-5 text-emerald-600" />
              ارسال پیامک آزمایشی دستی
            </h3>
            <p className="text-xs text-slate-500">
              جهت اطمینان از صحت کلید API قاصدک و فعال بودن خط فرستنده یک پیامک تستی بفرستید.
            </p>
          </div>

          <form onSubmit={handleSendTestSms} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">شماره موبایل گیرنده:</label>
              <input
                type="text"
                required
                value={testReceptor}
                onChange={e => setTestReceptor(e.target.value)}
                placeholder="09123456789"
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">متن پیامک آزمایشی:</label>
              <textarea
                rows={3}
                required
                value={testMessage}
                onChange={e => setTestMessage(e.target.value)}
                className="w-full border border-slate-300 rounded-xl p-3 text-xs focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={testSending}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {testSending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  در حال ارسال...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  ارسال پیامک تست
                </>
              )}
            </button>
          </form>

          {testResult && (
            <div className={`p-3 rounded-xl border text-xs ${
              testResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              <div className="font-bold mb-1 flex items-center gap-1.5">
                {testResult.success ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4 text-rose-600" />}
                {testResult.success ? 'ارسال موفق' : 'خطا در ارسال'}
              </div>
              <pre className="text-[10px] font-mono whitespace-pre-wrap mt-1 opacity-90">
                {JSON.stringify(testResult, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* 4. LOGS TAB */}
      {subTab === 'logs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800">گزارشات و تاریخچه ارسال پیامک‌ها</h3>
              <p className="text-xs text-slate-500">لیست آخرین پیامک‌های ارسال شده به همراه وضعیت و شناسه پیگیری قاصدک</p>
            </div>
            {logs.length > 0 && (
              <button
                onClick={handleClearLogs}
                className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                پاکسازی تاریخچه
              </button>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="p-3">زمان</th>
                    <th className="p-3">شرط / عنوان</th>
                    <th className="p-3">گیرنده</th>
                    <th className="p-3">متن پیامک</th>
                    <th className="p-3">وضعیت</th>
                    <th className="p-3">کد پیگیری</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition">
                      <td className="p-3 text-[11px] text-slate-400 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString('fa-IR')}
                      </td>
                      <td className="p-3 font-medium text-slate-900 whitespace-nowrap">
                        {log.ruleTitle || log.eventType}
                      </td>
                      <td className="p-3 font-mono text-xs whitespace-nowrap">
                        {log.receptor}
                      </td>
                      <td className="p-3 max-w-xs md:max-w-md truncate" title={log.message}>
                        {log.message}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        {log.status === 'SUCCESS' && (
                          <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-[10px] font-bold">
                            ارسال شد
                          </span>
                        )}
                        {log.status === 'SIMULATED' && (
                          <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full text-[10px] font-bold">
                            شبیه‌سازی شده
                          </span>
                        )}
                        {log.status === 'FAILED' && (
                          <span className="bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full text-[10px] font-bold" title={log.errorDetails || ''}>
                            خطا در ارسال
                          </span>
                        )}
                      </td>
                      <td className="p-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {log.providerMsgId || '-'}
                      </td>
                    </tr>
                  ))}

                  {logs.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-400 text-xs">
                        هنوز هیچ پیامکی ارسال یا ثبت نشده است.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
