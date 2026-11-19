import 'dotenv/config';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

import { GhasedakSmsService } from './src/services/smsService.ts';
import { PushNotificationService } from './src/services/pushService.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();
const smsService = new GhasedakSmsService(prisma);
const pushService = new PushNotificationService(prisma);
const app = express();
function resolveServerPort(): number {
  const portArgIdx = process.argv.findIndex((arg) => arg === '--port' || arg === '-p');
  if (portArgIdx !== -1 && process.argv[portArgIdx + 1]) {
    const cliPort = parseInt(process.argv[portArgIdx + 1], 10);
    if (!Number.isNaN(cliPort) && cliPort > 0) return cliPort;
  }
  const envPort = process.env.PORT ? parseInt(process.env.PORT, 10) : NaN;
  const nginxPort = process.env.NGINX_PORT ? parseInt(process.env.NGINX_PORT, 10) : NaN;
  if (!Number.isNaN(envPort) && envPort > 0 && envPort !== nginxPort) {
    return envPort;
  }
  const defaultPort = process.env.DEFAULT_APP_PORT ? parseInt(process.env.DEFAULT_APP_PORT, 10) : 3000;
  return !Number.isNaN(defaultPort) && defaultPort > 0 ? defaultPort : 3000;
}

const PORT = resolveServerPort();
const AUTH_SECRET = process.env.AUTH_SECRET || 'kheirie-novinchoob-auth-secret-v1';

// --- Auth & Phone Helpers ---
function normalizeDigits(input: string): string {
  if (!input) return '';
  return String(input)
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
}

function normalizeIranMobile(phone: string): string {
  if (!phone) return '';
  let p = normalizeDigits(phone).trim().replace(/[\s\-\(\)\+]/g, '');
  if (p.startsWith('0098')) p = '0' + p.substring(4);
  else if (p.startsWith('98') && p.length >= 12) p = '0' + p.substring(2);
  else if (p.startsWith('9') && p.length === 10) p = '0' + p;
  return p;
}

function isValidIranMobile(phone: string): boolean {
  return /^09\d{9}$/.test(phone);
}

function maskPhone(phone: string): string {
  if (!phone || phone.length < 7) return phone;
  return `${phone.slice(0, 4)}***${phone.slice(-4)}`;
}

function hashPassword(plain: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(plain, salt, 64).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

function verifyPassword(plain: string, stored: string): { valid: boolean; needsUpgrade: boolean } {
  if (!stored) return { valid: false, needsUpgrade: false };
  if (stored.startsWith('scrypt$')) {
    const parts = stored.split('$');
    if (parts.length !== 3) return { valid: false, needsUpgrade: false };
    const [, salt, hashHex] = parts;
    const derived = crypto.scryptSync(plain, salt, 64);
    const storedBuf = Buffer.from(hashHex, 'hex');
    if (derived.length !== storedBuf.length) return { valid: false, needsUpgrade: false };
    return { valid: crypto.timingSafeEqual(derived, storedBuf), needsUpgrade: false };
  }
  // Legacy plaintext compatibility for existing DB records without deleting/breaking data
  return { valid: stored === plain, needsUpgrade: stored === plain };
}

function createAuthToken(userId: string, username: string): string {
  const exp = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
  const payload = Buffer.from(JSON.stringify({ userId, username, exp })).toString('base64url');
  const sig = crypto.createHmac('sha256', AUTH_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifyAuthToken(token: string): { userId: string; username: string; exp: number } | null {
  try {
    if (!token || !token.includes('.')) return null;
    const [payload, sig] = token.split('.');
    const expectedSig = crypto.createHmac('sha256', AUTH_SECRET).update(payload).digest('base64url');
    const sigBuf = Buffer.from(sig);
    const expectedBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return null;
    }
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!decoded?.userId || !decoded?.exp || Date.now() > decoded.exp) return null;
    return decoded;
  } catch {
    return null;
  }
}

function formatUserResponse(user: any) {
  let parsedPerms = {};
  try {
    parsedPerms = JSON.parse(user.perms || '{}');
  } catch {
    parsedPerms = {};
  }
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    phone: user.phone || null,
    role: user.role,
    perms: parsedPerms,
    isActive: user.isActive,
  };
}

async function findUserByNormalizedPhone(cleanPhone: string) {
  const exact = await prisma.user.findFirst({ where: { phone: cleanPhone } });
  if (exact) return exact;
  const withPhones = await prisma.user.findMany({ where: { phone: { not: null } } });
  return withPhones.find((u) => u.phone && normalizeIranMobile(u.phone) === cleanPhone) || null;
}

// --- Brute-force Rate Limiter for Password Login ---
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 5 * 60 * 1000;
const LOGIN_LOCK_MS = 2 * 60 * 1000;
const loginAttempts = new Map<string, { count: number; firstAttempt: number; lockUntil: number }>();

function getLoginThrottleKey(req: express.Request, identifier: string): string {
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'local';
  return `${ip}:${identifier.toLowerCase()}`;
}

function checkLoginLock(key: string): number {
  const rec = loginAttempts.get(key);
  if (!rec) return 0;
  if (rec.lockUntil > Date.now()) {
    return Math.ceil((rec.lockUntil - Date.now()) / 1000);
  }
  if (Date.now() - rec.firstAttempt > LOGIN_WINDOW_MS) {
    loginAttempts.delete(key);
  }
  return 0;
}

function recordFailedLogin(key: string): number {
  const now = Date.now();
  const prev = loginAttempts.get(key);
  if (!prev || now - prev.firstAttempt > LOGIN_WINDOW_MS) {
    loginAttempts.set(key, { count: 1, firstAttempt: now, lockUntil: 0 });
    return 0;
  }
  const nextCount = prev.count + 1;
  const lockUntil = nextCount >= LOGIN_MAX_ATTEMPTS ? now + LOGIN_LOCK_MS : 0;
  loginAttempts.set(key, { count: nextCount, firstAttempt: prev.firstAttempt, lockUntil });
  return lockUntil ? Math.ceil(LOGIN_LOCK_MS / 1000) : 0;
}

function clearFailedLogins(key: string) {
  loginAttempts.delete(key);
}

// --- Express Auth & RBAC Middlewares ---
interface AuthenticatedRequest extends express.Request {
  authUser?: ReturnType<typeof formatUserResponse>;
}

async function requireAuth(req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    const decoded = verifyAuthToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'نشست کاربری معتبر نیست یا منقضی شده است. لطفاً وارد شوید.' });
    }
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'کاربر یافت نشد یا حساب کاربری غیرفعال است.' });
    }
    req.authUser = formatUserResponse(user);
    next();
  } catch (error) {
    res.status(500).json({ error: 'خطا در احراز هویت نشست', details: String(error) });
  }
}

function requirePerm(...permKeys: string[]) {
  return (req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) => {
    const user = req.authUser;
    if (!user) {
      return res.status(401).json({ error: 'ابتدا باید وارد سامانه شوید.' });
    }
    if (user.username === 'admin') {
      return next();
    }
    const perms = (user.perms || {}) as Record<string, any>;
    const hasAccess = permKeys.some((key) => Boolean(perms[key]));
    if (!hasAccess) {
      return res.status(403).json({ error: 'شما مجوز دسترسی به این بخش یا عملیات را ندارید.' });
    }
    next();
  };
}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// --- API Endpoints ---

// 1. App Configuration
app.get('/api/config', async (_req, res) => {
  try {
    let config = await prisma.appConfig.findUnique({ where: { id: 1 } });
    if (!config) {
      config = await prisma.appConfig.create({
        data: {
          id: 1,
          instName: 'مؤسسه خیریه حضرت ام‌البنین (س)',
          automationTitle: 'سامانه اتوماسیون کادر خیریه حضرت ام‌البنین (س)',
        },
      });
    }
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch config', details: String(error) });
  }
});

app.put('/api/config', requireAuth, requirePerm('manageSettings'), async (req, res) => {
  try {
    const allowedFields = [
      'instName',
      'automationTitle',
      'logoDataUrl',
      'phone',
      'address',
      'notice',
      'loginTitle',
      'loginSubtitle',
      'loginWelcomeNote',
      'loginFooterText',
      'loginTheme',
      'loginBgDataUrl',
      'loginShowLogo',
      'loginAllowPassword',
      'loginAllowOtp',
      'loginShowBackLink',
      'publicFormConfig',
    ];
    const updateData: any = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) {
        updateData[key] = req.body[key];
      }
    }
    const config = await prisma.appConfig.upsert({
      where: { id: 1 },
      update: updateData,
      create: { id: 1, ...updateData },
    });
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update config', details: String(error) });
  }
});

// 2. Categories
app.get('/api/categories', async (_req, res) => {
  try {
    const needCats = await prisma.needCategory.findMany({ orderBy: { id: 'asc' } });
    const progCats = await prisma.programCategory.findMany({ orderBy: { id: 'asc' } });
    res.json({
      needCategories: needCats,
      programCategories: progCats,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch categories', details: String(error) });
  }
});

app.post('/api/categories/need', requireAuth, requirePerm('manageSettings'), async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'نام دسته الزامی است' });
    const cat = await prisma.needCategory.create({ data: { name: name.trim() } });
    res.json(cat);
  } catch (error) {
    res.status(400).json({ error: 'دسته‌بندی تکراری یا نامعتبر است', details: String(error) });
  }
});

app.delete('/api/categories/need/:id', requireAuth, requirePerm('manageSettings'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.needCategory.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete category', details: String(error) });
  }
});

app.post('/api/categories/program', requireAuth, requirePerm('manageSettings'), async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'نام دسته الزامی است' });
    const cat = await prisma.programCategory.create({ data: { name: name.trim() } });
    res.json(cat);
  } catch (error) {
    res.status(400).json({ error: 'دسته‌بندی تکراری یا نامعتبر است', details: String(error) });
  }
});

app.delete('/api/categories/program/:id', requireAuth, requirePerm('manageSettings'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.programCategory.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete category', details: String(error) });
  }
});

// 3. Authentication & Users
app.post('/api/auth/login', async (req, res) => {
  try {
    const rawIdentifier = normalizeDigits(String(req.body?.username || '')).trim();
    const password = String(req.body?.password || '');

    if (!rawIdentifier || !password) {
      return res.status(400).json({ error: 'نام کاربری و رمز عبور را وارد نمایید.' });
    }

    const throttleKey = getLoginThrottleKey(req, rawIdentifier);
    const lockedSec = checkLoginLock(throttleKey);
    if (lockedSec > 0) {
      return res.status(429).json({
        error: `تعداد تلاش‌های ناموفق بیش از حد مجاز است. لطفاً ${lockedSec} ثانیه دیگر مجدداً تلاش کنید.`,
        retryAfter: lockedSec,
      });
    }

    let user = await prisma.user.findUnique({ where: { username: rawIdentifier } });
    if (!user) {
      const possiblePhone = normalizeIranMobile(rawIdentifier);
      if (isValidIranMobile(possiblePhone)) {
        user = await findUserByNormalizedPhone(possiblePhone);
      }
    }

    if (!user) {
      const waitSec = recordFailedLogin(throttleKey);
      if (waitSec > 0) {
        return res.status(429).json({
          error: `تعداد تلاش‌های ناموفق بیش از حد مجاز است. حساب به مدت ${waitSec} ثانیه موقتاً قفل شد.`,
        });
      }
      return res.status(401).json({ error: 'نام کاربری یا رمز عبور اشتباه است.' });
    }

    const check = verifyPassword(password, user.password);
    if (!check.valid) {
      const waitSec = recordFailedLogin(throttleKey);
      if (waitSec > 0) {
        return res.status(429).json({
          error: `تعداد تلاش‌های ناموفق بیش از حد مجاز است. لطفاً ${waitSec} ثانیه دیگر تلاش کنید.`,
        });
      }
      return res.status(401).json({ error: 'نام کاربری یا رمز عبور اشتباه است.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'حساب کاربری شما غیرفعال شده است.' });
    }

    clearFailedLogins(throttleKey);

    // Upgrade legacy plaintext password transparently on login without breaking existing records
    if (check.needsUpgrade) {
      prisma.user
        .update({
          where: { id: user.id },
          data: { password: hashPassword(password) },
        })
        .catch((err) => console.error('Password hash upgrade error:', err));
    }

    smsService
      .handleTrigger({
        eventType: 'USER_LOGIN',
        data: user,
        currentUser: { id: user.id, username: user.username, name: user.name },
      })
      .catch((e) => console.error('SMS Trigger Error on Login:', e));

    const token = createAuthToken(user.id, user.username);
    res.json({
      user: formatUserResponse(user),
      token,
    });
  } catch (error) {
    res.status(500).json({ error: 'Login error', details: String(error) });
  }
});

// Verify active session token
app.get('/api/auth/me', requireAuth, async (req: AuthenticatedRequest, res) => {
  res.json({ user: req.authUser });
});

// Self-service password change for logged-in staff
app.post('/api/auth/change-password', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const currentPassword = String(req.body?.currentPassword || '');
    const newPassword = String(req.body?.newPassword || '');

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'رمز عبور فعلی و رمز عبور جدید الزامی است.' });
    }
    if (newPassword.length < 4) {
      return res.status(400).json({ error: 'رمز عبور جدید باید حداقل ۴ کاراکتر باشد.' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.authUser!.id } });
    if (!user) {
      return res.status(404).json({ error: 'کاربر یافت نشد.' });
    }

    const check = verifyPassword(currentPassword, user.password);
    if (!check.valid) {
      return res.status(400).json({ error: 'رمز عبور فعلی واردشده صحیح نیست.' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashPassword(newPassword) },
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'خطا در تغییر رمز عبور', details: String(error) });
  }
});

// Send OTP code to registered staff mobile number
app.post('/api/auth/otp/send', async (req, res) => {
  try {
    const cleanPhone = normalizeIranMobile(String(req.body?.phone || ''));
    if (!isValidIranMobile(cleanPhone)) {
      return res.status(400).json({ error: 'شماره موبایل واردشده معتبر نیست (مثال: 09123456789).' });
    }

    const user = await findUserByNormalizedPhone(cleanPhone);
    if (!user) {
      return res.status(404).json({
        error: 'کاربری با این شماره موبایل در سامانه ثبت نشده است. لطفاً از مدیر سیستم بخواهید شماره موبایل شما را در بخش کاربران ثبت کند.',
      });
    }
    if (!user.isActive) {
      return res.status(403).json({ error: 'حساب کاربری شما غیرفعال شده است.' });
    }

    // Cooldown check (60 seconds between OTP requests)
    const lastOtp = await prisma.otpCode.findFirst({
      where: { phone: cleanPhone, purpose: 'LOGIN', used: false },
      orderBy: { createdAt: 'desc' },
    });
    if (lastOtp) {
      const elapsedSec = Math.floor((Date.now() - lastOtp.createdAt.getTime()) / 1000);
      if (elapsedSec < 60 && lastOtp.expiresAt > new Date()) {
        const waitSec = 60 - elapsedSec;
        return res.status(429).json({
          error: `لطفاً ${waitSec} ثانیه دیگر برای درخواست مجدد کد صبر کنید.`,
          retryAfter: waitSec,
        });
      }
    }

    const smsConf = await prisma.smsConfig.findUnique({ where: { id: 1 } });
    if (!smsConf || !smsConf.isEnabled || !smsConf.apiKey?.trim()) {
      await prisma.smsLog.create({
        data: {
          ruleTitle: 'ورود با شماره موبایل (OTP)',
          eventType: 'USER_LOGIN_OTP',
          receptor: cleanPhone,
          message: 'تلاش برای ارسال کد تایید ورود با موبایل',
          status: 'FAILED',
          errorDetails: 'کلید API قاصدک تنظیم نشده یا سرویس پیامک غیرفعال است.',
        },
      });
      return res.status(503).json({
        error: 'سرویس پیامک قاصدک پیکربندی یا فعال نشده است. لطفاً از مدیر سیستم بخواهید کلید API قاصدک را در پنل مدیریت تنظیم کند.',
      });
    }

    const appConf = await prisma.appConfig.findUnique({ where: { id: 1 } });
    const instName = appConf?.instName || 'مؤسسه خیریه';

    // Generate cryptographically random 6-digit code
    const otpCode = String(crypto.randomInt(100000, 999999));
    const expiresAt = new Date(Date.now() + 120 * 1000); // 2 minutes validity

    // Invalidate previous unused OTPs for this phone
    await prisma.otpCode.updateMany({
      where: { phone: cleanPhone, purpose: 'LOGIN', used: false },
      data: { used: true },
    });

    const createdOtp = await prisma.otpCode.create({
      data: {
        phone: cleanPhone,
        code: otpCode,
        purpose: 'LOGIN',
        expiresAt,
      },
    });

    const messageText = `کد ورود شما به سامانه ${instName}: ${otpCode}\nاعتبار کد: ۲ دقیقه`;
    const usePattern = Boolean(smsConf.loginOtpTemplate && smsConf.loginOtpTemplate.trim());

    const sendRes = await smsService.sendGhasedak(
      smsConf.apiKey,
      smsConf.senderLine,
      cleanPhone,
      messageText,
      usePattern
        ? {
            templateType: 'OTP',
            templateName: smsConf.loginOtpTemplate.trim(),
            param1: otpCode,
          }
        : undefined
    );

    await prisma.smsLog.create({
      data: {
        ruleTitle: 'ورود با شماره موبایل (OTP)',
        eventType: 'USER_LOGIN_OTP',
        receptor: cleanPhone,
        message: usePattern
          ? `ارسال کد ورود با الگوی ${smsConf.loginOtpTemplate}`
          : `ارسال کد تایید یک‌بارمصرف ورود برای ${user.name}`,
        status: sendRes.success ? 'SUCCESS' : 'FAILED',
        providerMsgId: sendRes.messageId || null,
        cost: sendRes.cost || null,
        errorDetails: sendRes.error || null,
      },
    });

    if (!sendRes.success) {
      await prisma.otpCode.update({ where: { id: createdOtp.id }, data: { used: true } });
      return res.status(502).json({
        error: `خطا در ارسال پیامک کد تایید: ${sendRes.error || 'خطای ارتباط با پنل قاصدک'}`,
      });
    }

    res.json({
      success: true,
      expiresIn: 120,
      maskedPhone: maskPhone(cleanPhone),
    });
  } catch (error) {
    res.status(500).json({ error: 'خطا در ارسال کد تایید موبایل', details: String(error) });
  }
});

// Verify mobile OTP code and issue real session
app.post('/api/auth/otp/verify', async (req, res) => {
  try {
    const cleanPhone = normalizeIranMobile(String(req.body?.phone || ''));
    const cleanCode = normalizeDigits(String(req.body?.code || '')).trim();

    if (!isValidIranMobile(cleanPhone)) {
      return res.status(400).json({ error: 'شماره موبایل معتبر نیست.' });
    }
    if (!/^\d{4,8}$/.test(cleanCode)) {
      return res.status(400).json({ error: 'کد تایید واردشده معتبر نیست.' });
    }

    const otpRecord = await prisma.otpCode.findFirst({
      where: { phone: cleanPhone, purpose: 'LOGIN', used: false },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      return res.status(401).json({ error: 'کد تایید فعالی یافت نشد. لطفاً مجدداً درخواست کد دهید.' });
    }

    if (otpRecord.expiresAt < new Date()) {
      await prisma.otpCode.update({ where: { id: otpRecord.id }, data: { used: true } });
      return res.status(401).json({ error: 'اعتبار کد تایید به پایان رسیده است. لطفاً کد جدید دریافت کنید.' });
    }

    if (otpRecord.attempts >= 5) {
      await prisma.otpCode.update({ where: { id: otpRecord.id }, data: { used: true } });
      return res.status(429).json({ error: 'تعداد تلاش‌های ناموفق بیش از حد مجاز است. لطفاً کد جدید دریافت کنید.' });
    }

    if (otpRecord.code !== cleanCode) {
      await prisma.otpCode.update({
        where: { id: otpRecord.id },
        data: { attempts: { increment: 1 } },
      });
      return res.status(401).json({ error: 'کد تایید واردشده صحیح نیست.' });
    }

    const user = await findUserByNormalizedPhone(cleanPhone);
    if (!user || !user.isActive) {
      return res.status(403).json({ error: 'حساب کاربری یافت نشد یا غیرفعال است.' });
    }

    await prisma.otpCode.update({
      where: { id: otpRecord.id },
      data: { used: true },
    });

    clearFailedLogins(getLoginThrottleKey(req, user.username));
    clearFailedLogins(getLoginThrottleKey(req, cleanPhone));

    smsService
      .handleTrigger({
        eventType: 'USER_LOGIN',
        data: user,
        currentUser: { id: user.id, username: user.username, name: user.name },
      })
      .catch((e) => console.error('SMS Trigger Error on OTP Login:', e));

    const token = createAuthToken(user.id, user.username);
    res.json({
      user: formatUserResponse(user),
      token,
    });
  } catch (error) {
    res.status(500).json({ error: 'خطا در تایید کد ورود', details: String(error) });
  }
});

app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const rawUsername = String(req.body?.username || '').trim();
    const { note, requestDate } = req.body;
    let user = await prisma.user.findUnique({ where: { username: rawUsername } });
    if (!user) {
      const possiblePhone = normalizeIranMobile(rawUsername);
      if (isValidIranMobile(possiblePhone)) {
        user = await findUserByNormalizedPhone(possiblePhone);
      }
    }
    const record = await prisma.passwordReset.create({
      data: {
        username: user?.username || rawUsername,
        name: user?.name || 'ناشناس',
        note: note || 'درخواست بازنشانی کلمه عبور از صفحه ورود',
        requestDate: requestDate || new Date().toISOString().slice(0, 10),
      },
    });

    smsService
      .handleTrigger({
        eventType: 'PASSWORD_RESET',
        data: record,
      })
      .catch((e) => console.error('SMS Trigger Error on Forgot Password:', e));

    res.json(record);
  } catch (error) {
    res.status(500).json({ error: 'Failed to register reset request', details: String(error) });
  }
});

app.get('/api/auth/password-resets', requireAuth, requirePerm('manageSettings'), async (_req, res) => {
  try {
    const resets = await prisma.passwordReset.findMany({ orderBy: { id: 'desc' } });
    res.json(resets);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch password resets', details: String(error) });
  }
});

app.patch('/api/auth/password-resets/:id', requireAuth, requirePerm('manageSettings'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    const updated = await prisma.passwordReset.update({
      where: { id },
      data: { status },
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update reset request', details: String(error) });
  }
});

app.get('/api/users', requireAuth, requirePerm('manageSettings'), async (_req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        username: true,
        name: true,
        phone: true,
        role: true,
        perms: true,
        isActive: true,
        createdAt: true,
      },
    });
    const parsed = users.map((u) => ({
      ...u,
      perms: JSON.parse(u.perms || '{}'),
    }));
    res.json(parsed);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users', details: String(error) });
  }
});

app.post('/api/users', requireAuth, requirePerm('manageSettings'), async (req, res) => {
  try {
    const { username, password, name, phone, role, perms } = req.body;
    if (!username || !password || !name) {
      return res.status(400).json({ error: 'اطلاعات کاربری ناقص است' });
    }

    let cleanPhone: string | null = null;
    if (phone && String(phone).trim()) {
      cleanPhone = normalizeIranMobile(String(phone));
      if (!isValidIranMobile(cleanPhone)) {
        return res.status(400).json({ error: 'شماره موبایل واردشده معتبر نیست (مثال: 09123456789).' });
      }
      const existingPhoneUser = await findUserByNormalizedPhone(cleanPhone);
      if (existingPhoneUser) {
        return res.status(400).json({ error: 'این شماره موبایل قبلاً برای کاربر دیگری ثبت شده است.' });
      }
    }

    const user = await prisma.user.create({
      data: {
        username: String(username).trim(),
        password: hashPassword(String(password)),
        name: String(name).trim(),
        phone: cleanPhone,
        role: role || 'کارشناس',
        perms: JSON.stringify(perms || {}),
      },
    });
    res.json({
      id: user.id,
      username: user.username,
      name: user.name,
      phone: user.phone,
      role: user.role,
      perms: perms || {},
      isActive: user.isActive,
    });
  } catch (error) {
    res.status(400).json({ error: 'نام کاربری از قبل وجود دارد یا نامعتبر است', details: String(error) });
  }
});

app.put('/api/users/:id', requireAuth, requirePerm('manageSettings'), async (req, res) => {
  try {
    const { id } = req.params;
    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return res.status(404).json({ error: 'کاربر مورد نظر یافت نشد.' });
    }
    const { name, phone, role, perms, password, isActive } = req.body;
    if (targetUser.username === 'admin' && isActive === false) {
      return res.status(400).json({ error: 'غیرفعال کردن مدیرعامل اصلی مجاز نیست.' });
    }
    const updateData: any = {};
    if (name !== undefined) updateData.name = String(name).trim();
    if (role !== undefined) updateData.role = role;
    if (password && String(password).trim()) {
      updateData.password = hashPassword(String(password));
    }
    if (perms !== undefined) updateData.perms = JSON.stringify(perms);
    if (isActive !== undefined) updateData.isActive = targetUser.username === 'admin' ? true : Boolean(isActive);

    if (phone !== undefined) {
      if (phone === null || String(phone).trim() === '') {
        updateData.phone = null;
      } else {
        const cleanPhone = normalizeIranMobile(String(phone));
        if (!isValidIranMobile(cleanPhone)) {
          return res.status(400).json({ error: 'شماره موبایل واردشده معتبر نیست (مثال: 09123456789).' });
        }
        const existingPhoneUser = await findUserByNormalizedPhone(cleanPhone);
        if (existingPhoneUser && existingPhoneUser.id !== id) {
          return res.status(400).json({ error: 'این شماره موبایل قبلاً برای کاربر دیگری ثبت شده است.' });
        }
        updateData.phone = cleanPhone;
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
    });
    res.json({
      id: user.id,
      username: user.username,
      name: user.name,
      phone: user.phone,
      role: user.role,
      perms: JSON.parse(user.perms || '{}'),
      isActive: user.isActive,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user', details: String(error) });
  }
});

app.delete('/api/users/:id', requireAuth, requirePerm('manageSettings'), async (req, res) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({ where: { id } });
    if (user?.username === 'admin') {
      return res.status(400).json({ error: 'حذف کاربر مدیر عامل اصلی مجاز نیست.' });
    }
    await prisma.user.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user', details: String(error) });
  }
});

// 4. Beneficiary Requests
app.get('/api/requests', requireAuth, requirePerm('viewInbox', 'decideInbox', 'viewFin'), async (req, res) => {
  try {
    const { search, status, cat } = req.query;
    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = String(status);
    }
    if (cat && cat !== 'ALL') {
      where.cat = String(cat);
    }
    if (search && String(search).trim()) {
      const q = String(search).trim();
      where.OR = [
        { name: { contains: q } },
        { nid: { contains: q } },
        { phone: { contains: q } },
        { trackingCode: { contains: q } },
      ];
    }
    const requests = await prisma.beneficiaryRequest.findMany({
      where,
      orderBy: { id: 'desc' },
    });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch requests', details: String(error) });
  }
});

// Public single request tracking
app.get('/api/requests/track/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const request = await prisma.beneficiaryRequest.findFirst({
      where: {
        OR: [
          { trackingCode: code.trim() },
          { nid: code.trim() },
        ],
      },
      select: {
        trackingCode: true,
        name: true,
        cat: true,
        status: true,
        requestedAmount: true,
        approvedAmount: true,
        note: true,
        approvedDate: true,
        createdAt: true,
      },
    });
    if (!request) {
      return res.status(404).json({ error: 'درخواستی با این کد رهگیری یا کد ملی یافت نشد.' });
    }
    res.json(request);
  } catch (error) {
    res.status(500).json({ error: 'Failed to track request', details: String(error) });
  }
});

app.post('/api/requests', async (req, res) => {
  try {
    const {
      name,
      nid,
      phone,
      birthDate,
      guardian,
      dependents,
      housing,
      cat,
      requestedAmount,
      desc,
      address,
      customFields,
    } = req.body;

    if (!name || !nid || !phone || !cat) {
      return res.status(400).json({ error: 'اطلاعات هویتی و نوع درخواست الزامی است.' });
    }

    // Generate random 4-digit tracking number
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const trackingCode = `REQ-1405-${randomSuffix}`;

    let serializedCustomFields = '[]';
    if (Array.isArray(customFields)) {
      serializedCustomFields = JSON.stringify(customFields);
    } else if (typeof customFields === 'string' && customFields.trim()) {
      serializedCustomFields = customFields;
    }

    const newReq = await prisma.beneficiaryRequest.create({
      data: {
        trackingCode,
        name,
        nid,
        phone,
        birthDate: birthDate || '',
        guardian: guardian !== undefined && String(guardian).trim() !== '' ? String(guardian) : '-',
        dependents: parseInt(dependents) || 0,
        housing: housing !== undefined && String(housing).trim() !== '' ? String(housing) : '-',
        cat,
        requestedAmount: parseFloat(requestedAmount) || 0,
        approvedAmount: 0,
        desc: desc || '',
        address: address || '',
        customFields: serializedCustomFields,
        status: 'PENDING',
      },
    });

    // Fire SMS Triggers asynchronously
    smsService.handleTrigger({
      eventType: 'REQUEST_CREATED',
      data: newReq,
    }).catch(e => console.error('SMS Trigger Error:', e));

    res.json(newReq);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create request', details: String(error) });
  }
});

app.put('/api/requests/:id', requireAuth, requirePerm('decideInbox'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const {
      status,
      approvedAmount,
      note,
      approvedDate,
      approvedBy,
      name,
      phone,
      cat,
      requestedAmount,
      desc,
      address,
      dependents,
      housing,
      guardian,
    } = req.body;

    const data: any = {};
    if (status !== undefined) data.status = status;
    if (approvedAmount !== undefined) data.approvedAmount = parseFloat(approvedAmount) || 0;
    if (note !== undefined) data.note = note;
    if (approvedDate !== undefined) data.approvedDate = approvedDate;
    if (approvedBy !== undefined) data.approvedBy = approvedBy;
    if (name) data.name = name;
    if (phone) data.phone = phone;
    if (cat) data.cat = cat;
    if (requestedAmount !== undefined) data.requestedAmount = parseFloat(requestedAmount) || 0;
    if (desc !== undefined) data.desc = desc;
    if (address !== undefined) data.address = address;
    if (dependents !== undefined) data.dependents = parseInt(dependents) || 0;
    if (housing !== undefined) data.housing = housing;
    if (guardian !== undefined) data.guardian = guardian;

    const prevReq = await prisma.beneficiaryRequest.findUnique({ where: { id } });

    const updated = await prisma.beneficiaryRequest.update({
      where: { id },
      data,
    });

    if (prevReq) {
      const isStatusChanged = status && status !== prevReq.status;
      smsService.handleTrigger({
        eventType: isStatusChanged ? 'REQUEST_STATUS_CHANGED' : 'REQUEST_CREATED',
        data: updated,
        previousStatus: prevReq.status,
        currentUser: approvedBy ? { id: '', username: approvedBy, name: approvedBy } : undefined,
      }).catch(e => console.error('SMS Trigger Error on Update:', e));
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update request', details: String(error) });
  }
});

app.delete('/api/requests/:id', requireAuth, requirePerm('decideInbox'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.beneficiaryRequest.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete request', details: String(error) });
  }
});

// 5. Programs & Projects
app.get('/api/programs', requireAuth, requirePerm('viewProg', 'createProg', 'decideProg', 'viewFin'), async (_req, res) => {
  try {
    const programs = await prisma.program.findMany({
      include: {
        logs: {
          orderBy: { id: 'desc' },
        },
      },
      orderBy: { id: 'desc' },
    });
    res.json(programs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch programs', details: String(error) });
  }
});

app.post('/api/programs', requireAuth, requirePerm('createProg'), async (req, res) => {
  try {
    const {
      title,
      cat,
      requestedBudget,
      volunteers,
      roles,
      desc,
      startDate,
      endDate,
    } = req.body;

    if (!title || !cat) {
      return res.status(400).json({ error: 'عنوان و دسته‌بندی طرح الزامی است.' });
    }

    const program = await prisma.program.create({
      data: {
        title,
        cat,
        requestedBudget: parseFloat(requestedBudget) || 0,
        approvedBudget: 0,
        volunteers: parseInt(volunteers) || 0,
        roles: roles || '',
        desc: desc || '',
        startDate: startDate || '',
        endDate: endDate || '',
        status: 'PENDING',
        pipelineStage: 1,
        progressPercent: 0,
      },
    });

    res.json(program);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create program', details: String(error) });
  }
});

app.put('/api/programs/:id', requireAuth, requirePerm('decideProg'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const {
      status,
      approvedBudget,
      pipelineStage,
      progressPercent,
      approvedDate,
      approvedBy,
      title,
      cat,
      requestedBudget,
      volunteers,
      roles,
      desc,
      startDate,
      endDate,
    } = req.body;

    const data: any = {};
    if (status !== undefined) data.status = status;
    if (approvedBudget !== undefined) data.approvedBudget = parseFloat(approvedBudget) || 0;
    if (pipelineStage !== undefined) data.pipelineStage = parseInt(pipelineStage) || 1;
    if (progressPercent !== undefined) data.progressPercent = parseInt(progressPercent) || 0;
    if (approvedDate !== undefined) data.approvedDate = approvedDate;
    if (approvedBy !== undefined) data.approvedBy = approvedBy;
    if (title) data.title = title;
    if (cat) data.cat = cat;
    if (requestedBudget !== undefined) data.requestedBudget = parseFloat(requestedBudget) || 0;
    if (volunteers !== undefined) data.volunteers = parseInt(volunteers) || 0;
    if (roles !== undefined) data.roles = roles;
    if (desc !== undefined) data.desc = desc;
    if (startDate !== undefined) data.startDate = startDate;
    if (endDate !== undefined) data.endDate = endDate;

    const updated = await prisma.program.update({
      where: { id },
      data,
      include: { logs: { orderBy: { id: 'desc' } } },
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update program', details: String(error) });
  }
});

app.post('/api/programs/:id/logs', requireAuth, requirePerm('viewProg', 'createProg', 'decideProg'), async (req, res) => {
  try {
    const programId = parseInt(req.params.id);
    const { date, note } = req.body;
    if (!note) return res.status(400).json({ error: 'شرح گزارش پیشرفت الزامی است.' });

    const log = await prisma.programLog.create({
      data: {
        programId,
        date: date || new Date().toISOString().slice(0, 10),
        note,
      },
    });
    res.json(log);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add log', details: String(error) });
  }
});

app.delete('/api/programs/:id', requireAuth, requirePerm('decideProg'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.program.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete program', details: String(error) });
  }
});

// 6. Comprehensive Financial Statistics & Pipeline Summary
app.get('/api/finance/stats', requireAuth, requirePerm('viewFin'), async (_req, res) => {
  try {
    const requests = await prisma.beneficiaryRequest.findMany();
    const programs = await prisma.program.findMany();

    const totalReqCount = requests.length;
    const approvedReqs = requests.filter((r) => r.status === 'APPROVED');
    const pendingReqs = requests.filter((r) => r.status === 'PENDING');
    const needsInfoReqs = requests.filter((r) => r.status === 'NEEDS_INFO');
    const rejectedReqs = requests.filter((r) => r.status === 'REJECTED');

    const totalReqRequestedAmount = requests.reduce((sum, r) => sum + r.requestedAmount, 0);
    const totalReqApprovedAmount = approvedReqs.reduce((sum, r) => sum + r.approvedAmount, 0);

    const totalProgCount = programs.length;
    const approvedProgs = programs.filter((p) => p.status === 'APPROVED');
    const totalProgRequestedBudget = programs.reduce((sum, p) => sum + p.requestedBudget, 0);
    const totalProgApprovedBudget = approvedProgs.reduce((sum, p) => sum + p.approvedBudget, 0);

    // Grouping by Request Category
    const reqCategoryBreakdown: Record<string, { count: number; approvedCount: number; approvedAmount: number }> = {};
    for (const r of requests) {
      if (!reqCategoryBreakdown[r.cat]) {
        reqCategoryBreakdown[r.cat] = { count: 0, approvedCount: 0, approvedAmount: 0 };
      }
      reqCategoryBreakdown[r.cat].count += 1;
      if (r.status === 'APPROVED') {
        reqCategoryBreakdown[r.cat].approvedCount += 1;
        reqCategoryBreakdown[r.cat].approvedAmount += r.approvedAmount;
      }
    }

    // Grouping by Program Category
    const progCategoryBreakdown: Record<string, { count: number; approvedCount: number; approvedBudget: number }> = {};
    for (const p of programs) {
      if (!progCategoryBreakdown[p.cat]) {
        progCategoryBreakdown[p.cat] = { count: 0, approvedCount: 0, approvedBudget: 0 };
      }
      progCategoryBreakdown[p.cat].count += 1;
      if (p.status === 'APPROVED') {
        progCategoryBreakdown[p.cat].approvedCount += 1;
        progCategoryBreakdown[p.cat].approvedBudget += p.approvedBudget;
      }
    }

    res.json({
      summary: {
        totalReqCount,
        approvedReqCount: approvedReqs.length,
        pendingReqCount: pendingReqs.length,
        needsInfoReqCount: needsInfoReqs.length,
        rejectedReqCount: rejectedReqs.length,
        totalReqRequestedAmount,
        totalReqApprovedAmount,
        totalProgCount,
        approvedProgCount: approvedProgs.length,
        totalProgRequestedBudget,
        totalProgApprovedBudget,
        grandTotalApprovedExpenditure: totalReqApprovedAmount + totalProgApprovedBudget,
      },
      reqCategoryBreakdown,
      progCategoryBreakdown,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to calculate financial stats', details: String(error) });
  }
});

// 7. Database Backup & Restore
app.get('/api/backup', requireAuth, requirePerm('manageSettings'), async (_req, res) => {
  try {
    const config = await prisma.appConfig.findFirst();
    const needCategories = await prisma.needCategory.findMany();
    const programCategories = await prisma.programCategory.findMany();
    const requests = await prisma.beneficiaryRequest.findMany();
    const programs = await prisma.program.findMany({ include: { logs: true } });
    const users = await prisma.user.findMany();
    const passwordResets = await prisma.passwordReset.findMany();
    const entities = await prisma.entityDefinition.findMany();
    const customForms = await prisma.customForm.findMany();
    const customFormSubmissions = await prisma.customFormSubmission.findMany();

    const backupData = {
      timestamp: new Date().toISOString(),
      config,
      needCategories,
      programCategories,
      requests,
      programs,
      users,
      passwordResets,
      entities,
      customForms,
      customFormSubmissions,
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="charity-backup-${Date.now()}.json"`);
    res.send(JSON.stringify(backupData, null, 2));
  } catch (error) {
    res.status(500).json({ error: 'Failed to export backup', details: String(error) });
  }
});

app.post('/api/restore', requireAuth, requirePerm('manageSettings'), async (req, res) => {
  try {
    const data = req.body;
    if (!data || (!data.requests && !data.programs && !data.customForms && !data.entities)) {
      return res.status(400).json({ error: 'فایل پشتیبان نامعتبر است' });
    }

    if (data.config) {
      await prisma.appConfig.upsert({
        where: { id: 1 },
        update: {
          instName: data.config.instName,
          automationTitle: data.config.automationTitle,
          logoDataUrl: data.config.logoDataUrl,
          phone: data.config.phone,
          address: data.config.address,
          notice: data.config.notice,
          publicFormConfig: data.config.publicFormConfig ?? '',
        },
        create: {
          id: 1,
          instName: data.config.instName,
          automationTitle: data.config.automationTitle,
          logoDataUrl: data.config.logoDataUrl,
          phone: data.config.phone,
          address: data.config.address,
          notice: data.config.notice,
          publicFormConfig: data.config.publicFormConfig ?? '',
        },
      });
    }

    if (Array.isArray(data.needCategories)) {
      for (const nc of data.needCategories) {
        if (nc.name) {
          await prisma.needCategory.upsert({
            where: { name: nc.name },
            update: {},
            create: { name: nc.name },
          });
        }
      }
    }

    if (Array.isArray(data.programCategories)) {
      for (const pc of data.programCategories) {
        if (pc.name) {
          await prisma.programCategory.upsert({
            where: { name: pc.name },
            update: {},
            create: { name: pc.name },
          });
        }
      }
    }

    if (Array.isArray(data.requests)) {
      for (const r of data.requests) {
        const { id, createdAt, updatedAt, ...rest } = r;
        if (r.trackingCode) {
          await prisma.beneficiaryRequest.upsert({
            where: { trackingCode: r.trackingCode },
            update: rest,
            create: { ...rest, trackingCode: r.trackingCode },
          });
        }
      }
    }

    if (Array.isArray(data.entities)) {
      for (const ent of data.entities) {
        if (ent.id && ent.name) {
          await prisma.entityDefinition.upsert({
            where: { id: ent.id },
            update: {
              name: ent.name,
              singularLabel: ent.singularLabel ?? '',
              description: ent.description ?? '',
              fields: typeof ent.fields === 'string' ? ent.fields : JSON.stringify(ent.fields || []),
              catalogItems:
                typeof ent.catalogItems === 'string'
                  ? ent.catalogItems
                  : JSON.stringify(ent.catalogItems || []),
            },
            create: {
              id: ent.id,
              name: ent.name,
              singularLabel: ent.singularLabel ?? '',
              description: ent.description ?? '',
              fields: typeof ent.fields === 'string' ? ent.fields : JSON.stringify(ent.fields || []),
              catalogItems:
                typeof ent.catalogItems === 'string'
                  ? ent.catalogItems
                  : JSON.stringify(ent.catalogItems || []),
            },
          });
        }
      }
    }

    if (Array.isArray(data.customForms)) {
      for (const cf of data.customForms) {
        if (cf.slug && cf.title) {
          await prisma.customForm.upsert({
            where: { slug: cf.slug },
            update: {
              title: cf.title,
              description: cf.description ?? '',
              heroBadge: cf.heroBadge ?? 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
              theme: cf.theme ?? 'emerald',
              submitButtonText: cf.submitButtonText ?? 'ثبت نهایی اطلاعات',
              successMessage: cf.successMessage ?? 'اطلاعات شما با موفقیت ثبت شد.',
              isActive: cf.isActive !== false,
              showTracking: cf.showTracking !== false,
              fields: typeof cf.fields === 'string' ? cf.fields : JSON.stringify(cf.fields || []),
            },
            create: {
              id: cf.id || undefined,
              slug: cf.slug,
              title: cf.title,
              description: cf.description ?? '',
              heroBadge: cf.heroBadge ?? 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
              theme: cf.theme ?? 'emerald',
              submitButtonText: cf.submitButtonText ?? 'ثبت نهایی اطلاعات',
              successMessage: cf.successMessage ?? 'اطلاعات شما با موفقیت ثبت شد.',
              isActive: cf.isActive !== false,
              showTracking: cf.showTracking !== false,
              fields: typeof cf.fields === 'string' ? cf.fields : JSON.stringify(cf.fields || []),
            },
          });
        }
      }
    }

    res.json({ success: true, message: 'بازیابی اطلاعات با موفقیت انجام شد.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to restore backup', details: String(error) });
  }
});

// --- SMS Module Endpoints (Ghasedak) ---

// 1. Get / Update SMS Config
app.get('/api/sms/config', requireAuth, requirePerm('manageSettings'), async (_req, res) => {
  try {
    let conf = await prisma.smsConfig.findUnique({ where: { id: 1 } });
    if (!conf) {
      conf = await prisma.smsConfig.create({
        data: {
          id: 1,
          apiKey: '',
          senderLine: '',
          provider: 'GHASEDAK',
          loginOtpTemplate: '',
          isEnabled: true,
        },
      });
    }
    res.json(conf);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch SMS config', details: String(error) });
  }
});

app.put('/api/sms/config', requireAuth, requirePerm('manageSettings'), async (req, res) => {
  try {
    const { apiKey, senderLine, provider, loginOtpTemplate, isEnabled } = req.body;
    const conf = await prisma.smsConfig.upsert({
      where: { id: 1 },
      update: {
        apiKey: apiKey !== undefined ? apiKey : undefined,
        senderLine: senderLine !== undefined ? senderLine : undefined,
        provider: provider || 'GHASEDAK',
        loginOtpTemplate: loginOtpTemplate !== undefined ? loginOtpTemplate : undefined,
        isEnabled: isEnabled !== undefined ? isEnabled : true,
      },
      create: {
        id: 1,
        apiKey: apiKey || '',
        senderLine: senderLine || '',
        provider: provider || 'GHASEDAK',
        loginOtpTemplate: loginOtpTemplate || '',
        isEnabled: isEnabled !== undefined ? isEnabled : true,
      },
    });
    res.json(conf);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update SMS config', details: String(error) });
  }
});

// 2. Rules CRUD
app.get('/api/sms/rules', requireAuth, requirePerm('manageSettings'), async (_req, res) => {
  try {
    const count = await prisma.smsRule.count();
    if (count === 0) {
      // Seed initial practical charity rules
      await prisma.smsRule.createMany({
        data: [
          {
            title: 'پیامک ثبت درخواست به متقاضی',
            eventType: 'REQUEST_CREATED',
            triggerStatus: 'PENDING',
            userFilter: 'ALL',
            targetType: 'BENEFICIARY',
            templateType: 'SIMPLE',
            messageBody: 'سلام {name} عزیز، درخواست شما در {instName} با کد رهگیری {trackingCode} با موفقیت ثبت شد و در حال بررسی است.',
            isActive: true,
          },
          {
            title: 'اطلاع‌رسانی تأیید درخواست به متقاضی',
            eventType: 'REQUEST_STATUS_CHANGED',
            triggerStatus: 'APPROVED',
            userFilter: 'ALL',
            targetType: 'BENEFICIARY',
            templateType: 'SIMPLE',
            messageBody: 'متقاضی محترم {name}، درخواست شما با کد {trackingCode} در {instName} به مبلغ {amount} ریال تأیید شد.',
            isActive: true,
          },
          {
            title: 'اعلام نیاز به تکمیل مدارک به مددجو',
            eventType: 'REQUEST_STATUS_CHANGED',
            triggerStatus: 'NEEDS_INFO',
            userFilter: 'ALL',
            targetType: 'BENEFICIARY',
            templateType: 'SIMPLE',
            messageBody: 'متقاضی گرامی {name}، پرونده شما با کد رهگیری {trackingCode} جهت تکمیل مدارک بازگردانده شد: {note}',
            isActive: true,
          },
          {
            title: 'هشدار ثبت درخواست جدید به مدیریت',
            eventType: 'REQUEST_CREATED',
            triggerStatus: 'ALL',
            userFilter: 'ALL',
            targetType: 'ADMINS',
            templateType: 'SIMPLE',
            messageBody: 'درخواست مددجویی جدید توسط {name} ثبت شد (کد: {trackingCode}، دسته: {cat}). جهت بررسی وارد اتوماسیون شوید.',
            isActive: false,
          },
        ],
      });
    }
    const rules = await prisma.smsRule.findMany({ orderBy: { id: 'asc' } });
    res.json(rules);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch SMS rules', details: String(error) });
  }
});

app.post('/api/sms/rules', requireAuth, requirePerm('manageSettings'), async (req, res) => {
  try {
    const {
      title,
      eventType,
      triggerStatus,
      userFilter,
      targetType,
      customNumbers,
      templateType,
      templateName,
      templateParam1,
      templateParam2,
      templateParam3,
      messageBody,
      sendPush,
      isActive,
    } = req.body;

    if (!title || !eventType || !messageBody) {
      return res.status(400).json({ error: 'عنوان، نوع رویداد و متن پیام الزامی است.' });
    }

    const rule = await prisma.smsRule.create({
      data: {
        title,
        eventType,
        triggerStatus: triggerStatus || 'ALL',
        userFilter: userFilter || 'ALL',
        targetType: targetType || 'BENEFICIARY',
        customNumbers: customNumbers || '',
        templateType: templateType || 'SIMPLE',
        templateName: templateName || '',
        templateParam1: templateParam1 || '',
        templateParam2: templateParam2 || '',
        templateParam3: templateParam3 || '',
        messageBody,
        sendPush: sendPush !== undefined ? Boolean(sendPush) : false,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
    });
    res.json(rule);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create SMS rule', details: String(error) });
  }
});

app.put('/api/sms/rules/:id', requireAuth, requirePerm('manageSettings'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const {
      title,
      eventType,
      triggerStatus,
      userFilter,
      targetType,
      customNumbers,
      templateType,
      templateName,
      templateParam1,
      templateParam2,
      templateParam3,
      messageBody,
      sendPush,
      isActive,
    } = req.body;

    const data: any = {};
    if (title !== undefined) data.title = title;
    if (eventType !== undefined) data.eventType = eventType;
    if (triggerStatus !== undefined) data.triggerStatus = triggerStatus;
    if (userFilter !== undefined) data.userFilter = userFilter;
    if (targetType !== undefined) data.targetType = targetType;
    if (customNumbers !== undefined) data.customNumbers = customNumbers;
    if (templateType !== undefined) data.templateType = templateType;
    if (templateName !== undefined) data.templateName = templateName;
    if (templateParam1 !== undefined) data.templateParam1 = templateParam1;
    if (templateParam2 !== undefined) data.templateParam2 = templateParam2;
    if (templateParam3 !== undefined) data.templateParam3 = templateParam3;
    if (messageBody !== undefined) data.messageBody = messageBody;
    if (sendPush !== undefined) data.sendPush = Boolean(sendPush);
    if (isActive !== undefined) data.isActive = Boolean(isActive);

    const updated = await prisma.smsRule.update({
      where: { id },
      data,
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update SMS rule', details: String(error) });
  }
});

app.delete('/api/sms/rules/:id', requireAuth, requirePerm('manageSettings'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.smsRule.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete SMS rule', details: String(error) });
  }
});

// 3. SMS Logs
app.get('/api/sms/logs', requireAuth, requirePerm('manageSettings'), async (_req, res) => {
  try {
    const logs = await prisma.smsLog.findMany({
      orderBy: { id: 'desc' },
      take: 200,
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch SMS logs', details: String(error) });
  }
});

app.delete('/api/sms/logs', requireAuth, requirePerm('manageSettings'), async (_req, res) => {
  try {
    await prisma.smsLog.deleteMany({});
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear logs', details: String(error) });
  }
});

// 4. Test Manual SMS Sending
app.post('/api/sms/test', requireAuth, requirePerm('manageSettings'), async (req, res) => {
  try {
    const { receptor, message } = req.body;
    if (!receptor || !message) {
      return res.status(400).json({ error: 'شماره گیرنده و متن پیام الزامی است.' });
    }

    const conf = await prisma.smsConfig.findUnique({ where: { id: 1 } });
    let result: any;
    if (!conf?.apiKey || conf.apiKey.trim() === '') {
      result = {
        success: true,
        messageId: 'TEST-SIMULATED-' + Math.floor(1000 + Math.random() * 9000),
      };
    } else {
      result = await smsService.sendGhasedak(conf.apiKey, conf.senderLine, receptor, message);
    }

    await prisma.smsLog.create({
      data: {
        ruleTitle: 'ارسال آزمایشی دستی',
        eventType: 'MANUAL_TEST',
        receptor,
        message,
        status: result.success ? (conf?.apiKey ? 'SUCCESS' : 'SIMULATED') : 'FAILED',
        providerMsgId: result.messageId || null,
        errorDetails: result.error || null,
      },
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to test SMS', details: String(error) });
  }
});

// --- Web Push Notification Endpoints ---

// 1. Get VAPID Public Key for client subscription
app.get('/api/push/key', requireAuth, async (_req, res) => {
  try {
    const key = await pushService.getPublicKey();
    res.json({ publicKey: key });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get VAPID key', details: String(error) });
  }
});

// 2. Subscribe device
app.post('/api/push/subscribe', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { subscription, username } = req.body;
    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({ error: 'اطلاعات اشتراک ناقص است.' });
    }

    const { endpoint, keys } = subscription;
    const userAgent = req.headers['user-agent'] || '';
    const effectiveUsername = req.authUser?.username || username || 'admin';

    const saved = await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: {
        p256dh: keys.p256dh,
        auth: keys.auth,
        username: effectiveUsername,
        userAgent,
      },
      create: {
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        username: effectiveUsername,
        userAgent,
      },
    });

    res.json({ success: true, id: saved.id });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save subscription', details: String(error) });
  }
});

// 3. Unsubscribe device
app.post('/api/push/unsubscribe', requireAuth, async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (endpoint) {
      await prisma.pushSubscription.deleteMany({ where: { endpoint } });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to unsubscribe', details: String(error) });
  }
});

// 4. Test Push Notification
app.post('/api/push/test', requireAuth, requirePerm('manageSettings'), async (req, res) => {
  try {
    const { title, body, username } = req.body;
    const result = await pushService.sendNotification({
      title: title || 'تست اعلان مؤسسه خیریه',
      body: body || 'این یک اعلان آزمایشی پوش نوتیفیکیشن روی گوشی شماست.',
      username: username || undefined,
    });
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ error: 'Failed to test push notification', details: String(error) });
  }
});

// 5. Get registered push devices count
app.get('/api/push/devices', requireAuth, requirePerm('manageSettings'), async (_req, res) => {
  try {
    const devices = await prisma.pushSubscription.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        username: true,
        userAgent: true,
        createdAt: true,
      },
    });
    res.json(devices);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch devices', details: String(error) });
  }
});

// --- Entities & Custom Form Builder Endpoints ---
function safeJsonParseArray(raw: string | null | undefined): any[] {
  if (!raw || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function formatEntityRecord(ent: any) {
  return {
    id: ent.id,
    name: ent.name,
    singularLabel: ent.singularLabel || ent.name,
    description: ent.description || '',
    fields: safeJsonParseArray(ent.fields),
    catalogItems: safeJsonParseArray(ent.catalogItems),
    createdAt: ent.createdAt,
    updatedAt: ent.updatedAt,
  };
}

function formatCustomFormRecord(form: any) {
  return {
    id: form.id,
    slug: form.slug,
    title: form.title,
    description: form.description || '',
    heroBadge: form.heroBadge || 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
    theme: form.theme || 'emerald',
    submitButtonText: form.submitButtonText || 'ثبت نهایی اطلاعات',
    successMessage: form.successMessage || 'اطلاعات شما با موفقیت در سیستم ثبت گردید.',
    isActive: form.isActive !== false,
    showTracking: form.showTracking !== false,
    fields: safeJsonParseArray(form.fields),
    submissionsCount: form._count?.submissions ?? undefined,
    createdAt: form.createdAt,
    updatedAt: form.updatedAt,
  };
}

function sanitizeFormSlug(rawSlug: string): string {
  const cleaned = normalizeDigits(String(rawSlug || ''))
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-_]/g, '')
    .replace(/^-+|-+$/g, '');
  return cleaned || `form-${Date.now().toString(36)}`;
}

async function ensureDefaultEntities() {
  try {
    const count = await prisma.entityDefinition.count();
    if (count === 0) {
      await prisma.entityDefinition.create({
        data: {
          name: 'فرد تحت تکفل',
          singularLabel: 'فرد تحت تکفل',
          description: 'مشخصات هر یک از افراد تحت تکفل خانوار شامل جنسیت، سن و میزان تحصیلات',
          fields: JSON.stringify([
            {
              id: 'ef_gender',
              label: 'جنسیت',
              type: 'select',
              required: true,
              options: ['زن', 'مرد'],
            },
            {
              id: 'ef_age',
              label: 'سن (سال)',
              type: 'number',
              placeholder: 'مثال: ۱۲',
              required: true,
            },
            {
              id: 'ef_education',
              label: 'میزان تحصیلات',
              type: 'select',
              required: true,
              options: [
                'خردسال / پیش‌دبستانی',
                'بی‌سواد',
                'ابتدایی',
                'متوسطه اول (راهنمایی)',
                'متوسطه دوم / دبیرستان',
                'دیپلم',
                'کاردانی / دانشجو',
                'کارشناسی و بالاتر',
              ],
            },
          ]),
          catalogItems: JSON.stringify([]),
        },
      });
    }
  } catch (err) {
    console.error('Error seeding default entity:', err);
  }
}

// Entities CRUD
app.get('/api/entities', async (_req, res) => {
  try {
    const list = await prisma.entityDefinition.findMany({ orderBy: { createdAt: 'asc' } });
    res.json(list.map(formatEntityRecord));
  } catch (error) {
    res.status(500).json({ error: 'خطا در دریافت لیست موجودیت‌ها', details: String(error) });
  }
});

app.post('/api/entities', requireAuth, requirePerm('manageSettings'), async (req, res) => {
  try {
    const { name, singularLabel, description, fields, catalogItems } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'نام موجودیت الزامی است.' });
    }
    const created = await prisma.entityDefinition.create({
      data: {
        name: String(name).trim(),
        singularLabel: String(singularLabel || name).trim(),
        description: String(description || '').trim(),
        fields: JSON.stringify(Array.isArray(fields) ? fields : []),
        catalogItems: JSON.stringify(
          Array.isArray(catalogItems)
            ? catalogItems.map((i: any) => String(i).trim()).filter(Boolean)
            : []
        ),
      },
    });
    res.json(formatEntityRecord(created));
  } catch (error) {
    res.status(500).json({ error: 'خطا در ایجاد موجودیت', details: String(error) });
  }
});

app.put('/api/entities/:id', requireAuth, requirePerm('manageSettings'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, singularLabel, description, fields, catalogItems } = req.body;
    const data: any = {};
    if (name !== undefined) data.name = String(name).trim();
    if (singularLabel !== undefined) data.singularLabel = String(singularLabel).trim();
    if (description !== undefined) data.description = String(description).trim();
    if (fields !== undefined) data.fields = JSON.stringify(Array.isArray(fields) ? fields : []);
    if (catalogItems !== undefined) {
      data.catalogItems = JSON.stringify(
        Array.isArray(catalogItems)
          ? catalogItems.map((i: any) => String(i).trim()).filter(Boolean)
          : []
      );
    }
    const updated = await prisma.entityDefinition.update({
      where: { id },
      data,
    });
    res.json(formatEntityRecord(updated));
  } catch (error) {
    res.status(500).json({ error: 'خطا در به‌روزرسانی موجودیت', details: String(error) });
  }
});

app.delete('/api/entities/:id', requireAuth, requirePerm('manageSettings'), async (req, res) => {
  try {
    await prisma.entityDefinition.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'خطا در حذف موجودیت', details: String(error) });
  }
});

// Custom Forms CRUD & Public Submission
app.get('/api/forms', requireAuth, requirePerm('manageSettings'), async (_req, res) => {
  try {
    const forms = await prisma.customForm.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { submissions: true } } },
    });
    res.json(forms.map(formatCustomFormRecord));
  } catch (error) {
    res.status(500).json({ error: 'خطا در دریافت لیست فرم‌ها', details: String(error) });
  }
});

app.get('/api/forms/public/:slug', async (req, res) => {
  try {
    const slug = String(req.params.slug || '').trim().toLowerCase();
    const form = await prisma.customForm.findUnique({ where: { slug } });
    if (!form) {
      return res.status(404).json({ error: 'فرم مورد نظر یافت نشد.' });
    }
    if (!form.isActive) {
      return res.status(403).json({ error: 'این فرم در حال حاضر توسط مدیریت غیرفعال شده است.' });
    }
    res.json(formatCustomFormRecord(form));
  } catch (error) {
    res.status(500).json({ error: 'خطا در بارگذاری فرم', details: String(error) });
  }
});

app.post('/api/forms', requireAuth, requirePerm('manageSettings'), async (req, res) => {
  try {
    const {
      title,
      slug,
      description,
      heroBadge,
      theme,
      submitButtonText,
      successMessage,
      isActive,
      showTracking,
      fields,
    } = req.body;
    if (!title || !String(title).trim()) {
      return res.status(400).json({ error: 'عنوان فرم الزامی است.' });
    }
    let cleanSlug = sanitizeFormSlug(slug || '');
    const exists = await prisma.customForm.findUnique({ where: { slug: cleanSlug } });
    if (exists) {
      if (slug && String(slug).trim()) {
        return res.status(400).json({ error: 'این شناسه لینک (Slug) قبلاً برای فرم دیگری استفاده شده است.' });
      }
      cleanSlug = `${cleanSlug}-${Math.floor(100 + Math.random() * 900)}`;
    }

    const created = await prisma.customForm.create({
      data: {
        slug: cleanSlug,
        title: String(title).trim(),
        description: String(description || '').trim(),
        heroBadge: String(heroBadge ?? 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ').trim(),
        theme: String(theme || 'emerald'),
        submitButtonText: String(submitButtonText || 'ثبت نهایی اطلاعات').trim(),
        successMessage: String(successMessage || 'اطلاعات شما با موفقیت در سیستم ثبت گردید.').trim(),
        isActive: isActive !== false,
        showTracking: showTracking !== false,
        fields: JSON.stringify(Array.isArray(fields) ? fields : []),
      },
      include: { _count: { select: { submissions: true } } },
    });
    res.json(formatCustomFormRecord(created));
  } catch (error) {
    res.status(500).json({ error: 'خطا در ایجاد فرم جدید', details: String(error) });
  }
});

app.put('/api/forms/:id', requireAuth, requirePerm('manageSettings'), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      slug,
      description,
      heroBadge,
      theme,
      submitButtonText,
      successMessage,
      isActive,
      showTracking,
      fields,
    } = req.body;

    const data: any = {};
    if (title !== undefined) data.title = String(title).trim();
    if (description !== undefined) data.description = String(description).trim();
    if (heroBadge !== undefined) data.heroBadge = String(heroBadge).trim();
    if (theme !== undefined) data.theme = String(theme);
    if (submitButtonText !== undefined) data.submitButtonText = String(submitButtonText).trim();
    if (successMessage !== undefined) data.successMessage = String(successMessage).trim();
    if (isActive !== undefined) data.isActive = Boolean(isActive);
    if (showTracking !== undefined) data.showTracking = Boolean(showTracking);
    if (fields !== undefined) data.fields = JSON.stringify(Array.isArray(fields) ? fields : []);

    if (slug !== undefined && String(slug).trim()) {
      const cleanSlug = sanitizeFormSlug(String(slug));
      const conflict = await prisma.customForm.findUnique({ where: { slug: cleanSlug } });
      if (conflict && conflict.id !== id) {
        return res.status(400).json({ error: 'این شناسه لینک (Slug) قبلاً استفاده شده است.' });
      }
      data.slug = cleanSlug;
    }

    const updated = await prisma.customForm.update({
      where: { id },
      data,
      include: { _count: { select: { submissions: true } } },
    });
    res.json(formatCustomFormRecord(updated));
  } catch (error) {
    res.status(500).json({ error: 'خطا در ویرایش فرم', details: String(error) });
  }
});

app.delete('/api/forms/:id', requireAuth, requirePerm('manageSettings'), async (req, res) => {
  try {
    await prisma.customForm.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'خطا در حذف فرم', details: String(error) });
  }
});

app.post('/api/forms/public/:slug/submit', async (req, res) => {
  try {
    const slug = String(req.params.slug || '').trim().toLowerCase();
    const form = await prisma.customForm.findUnique({ where: { slug } });
    if (!form) {
      return res.status(404).json({ error: 'فرم مورد نظر یافت نشد.' });
    }
    if (!form.isActive) {
      return res.status(403).json({ error: 'امکان ثبت پاسخ برای این فرم غیرفعال است.' });
    }

    const submittedData = Array.isArray(req.body?.data) ? req.body.data : [];
    const shamsiYear = new Date().getFullYear() - 621;
    const count = await prisma.customFormSubmission.count();
    const trackingCode = `FRM-${shamsiYear}-${1001 + count + Math.floor(Math.random() * 90)}`;

    const created = await prisma.customFormSubmission.create({
      data: {
        trackingCode,
        formId: form.id,
        data: JSON.stringify(submittedData),
        status: 'NEW',
      },
    });

    res.json({
      id: created.id,
      trackingCode: created.trackingCode,
      formId: created.formId,
      data: submittedData,
      status: created.status,
      createdAt: created.createdAt,
    });
  } catch (error) {
    res.status(500).json({ error: 'خطا در ثبت اطلاعات فرم', details: String(error) });
  }
});

app.get('/api/forms/public/:slug/track/:code', async (req, res) => {
  try {
    const slug = String(req.params.slug || '').trim().toLowerCase();
    const code = normalizeDigits(String(req.params.code || '')).trim();
    const form = await prisma.customForm.findUnique({ where: { slug } });
    if (!form) {
      return res.status(404).json({ error: 'فرم مورد نظر یافت نشد.' });
    }
    const sub = await prisma.customFormSubmission.findFirst({
      where: {
        formId: form.id,
        trackingCode: code,
      },
      select: {
        trackingCode: true,
        status: true,
        note: true,
        createdAt: true,
      },
    });
    if (!sub) {
      return res.status(404).json({ error: 'رکوردی با این کد پیگیری در این فرم یافت نشد.' });
    }
    res.json(sub);
  } catch (error) {
    res.status(500).json({ error: 'خطا در پیگیری فرم', details: String(error) });
  }
});

app.get('/api/forms/:id/submissions', requireAuth, requirePerm('manageSettings'), async (req, res) => {
  try {
    const subs = await prisma.customFormSubmission.findMany({
      where: { formId: req.params.id },
      orderBy: { id: 'desc' },
    });
    res.json(
      subs.map((s) => ({
        ...s,
        data: safeJsonParseArray(s.data),
      }))
    );
  } catch (error) {
    res.status(500).json({ error: 'خطا در دریافت پاسخ‌های فرم', details: String(error) });
  }
});

app.patch('/api/forms/submissions/:submissionId', requireAuth, requirePerm('manageSettings'), async (req, res) => {
  try {
    const id = parseInt(req.params.submissionId);
    const { status, note } = req.body;
    const data: any = {};
    if (status) data.status = String(status);
    if (note !== undefined) data.note = note;
    const updated = await prisma.customFormSubmission.update({
      where: { id },
      data,
    });
    res.json({
      ...updated,
      data: safeJsonParseArray(updated.data),
    });
  } catch (error) {
    res.status(500).json({ error: 'خطا در به‌روزرسانی وضعیت پاسخ', details: String(error) });
  }
});

app.delete('/api/forms/submissions/:submissionId', requireAuth, requirePerm('manageSettings'), async (req, res) => {
  try {
    const id = parseInt(req.params.submissionId);
    await prisma.customFormSubmission.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'خطا در حذف پاسخ فرم', details: String(error) });
  }
});

// Vite Middleware or Static Production Serving
async function startServer() {
  await ensureDefaultEntities();
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false, watch: null },
      appType: 'spa',
    });
    // Serve a WebSocket-free /@vite/client stub so HMR-disabled iframe environments never hit WS connection errors
    app.get('/@vite/client', (_req, res) => {
      res.type('application/javascript').send(`
const sheetsMap = new Map();
const linkSheetsMap = new Map();
if ("document" in globalThis) {
  document.querySelectorAll("style[data-vite-dev-id]").forEach((el) => {
    sheetsMap.set(el.getAttribute("data-vite-dev-id"), el);
  });
  document.querySelectorAll('link[rel="stylesheet"][data-vite-dev-id]').forEach((el) => {
    linkSheetsMap.set(el.getAttribute("data-vite-dev-id"), el);
  });
}
export function updateStyle(id, content) {
  if (linkSheetsMap.has(id)) return;
  let style = sheetsMap.get(id);
  if (!style) {
    style = document.createElement("style");
    style.setAttribute("type", "text/css");
    style.setAttribute("data-vite-dev-id", id);
    style.textContent = content;
    document.head.appendChild(style);
  } else if (style.textContent !== content) {
    style.textContent = content;
  }
  sheetsMap.set(id, style);
}
export function removeStyle(id) {
  if (linkSheetsMap.has(id)) {
    document.querySelectorAll(\`link[rel="stylesheet"][data-vite-dev-id="\${CSS.escape(id)}"]\`).forEach((el) => el.remove());
    linkSheetsMap.delete(id);
  }
  const style = sheetsMap.get(id);
  if (style) {
    document.head.removeChild(style);
    sheetsMap.delete(id);
  }
}
export function createHotContext() {
  return {
    data: {},
    accept() {},
    acceptExports() {},
    dispose() {},
    prune() {},
    decline() {},
    invalidate() {},
    on() {},
    off() {},
    send() {},
  };
}
export function injectQuery(url, queryToInject) {
  if (url[0] !== "." && url[0] !== "/") return url;
  const pathname = url.replace(/[?#].*$/, "");
  const { search, hash } = new URL(url, "http://vite.dev");
  return \`\${pathname}?\${queryToInject}\${search ? "&" + search.slice(1) : ""}\${hash || ""}\`;
}
export class ErrorOverlay extends HTMLElement {}
if (globalThis.customElements && !globalThis.customElements.get("vite-error-overlay")) {
  globalThis.customElements.define("vite-error-overlay", ErrorOverlay);
}
`);
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT} (SQLite charity.db active)`);
  });
}

startServer();
