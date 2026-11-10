import 'dotenv/config';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import { fileURLToPath } from 'url';

import { GhasedakSmsService } from './src/services/smsService.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();
const smsService = new GhasedakSmsService(prisma);
const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

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

app.put('/api/config', async (req, res) => {
  try {
    const { instName, automationTitle, logoDataUrl, phone, address, notice } = req.body;
    const config = await prisma.appConfig.upsert({
      where: { id: 1 },
      update: { instName, automationTitle, logoDataUrl, phone, address, notice },
      create: { id: 1, instName, automationTitle, logoDataUrl, phone, address, notice },
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

app.post('/api/categories/need', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'نام دسته الزامی است' });
    const cat = await prisma.needCategory.create({ data: { name: name.trim() } });
    res.json(cat);
  } catch (error) {
    res.status(400).json({ error: 'دسته‌بندی تکراری یا نامعتبر است', details: String(error) });
  }
});

app.delete('/api/categories/need/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.needCategory.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete category', details: String(error) });
  }
});

app.post('/api/categories/program', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'نام دسته الزامی است' });
    const cat = await prisma.programCategory.create({ data: { name: name.trim() } });
    res.json(cat);
  } catch (error) {
    res.status(400).json({ error: 'دسته‌بندی تکراری یا نامعتبر است', details: String(error) });
  }
});

app.delete('/api/categories/program/:id', async (req, res) => {
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
    const { username, password } = req.body;
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'نام کاربری یا رمز عبور اشتباه است.' });
    }
    if (!user.isActive) {
      return res.status(403).json({ error: 'حساب کاربری شما غیرفعال شده است.' });
    }

    let parsedPerms = {};
    try {
      parsedPerms = JSON.parse(user.perms);
    } catch {
      parsedPerms = {};
    }

    res.json({
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        perms: parsedPerms,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Login error', details: String(error) });
  }
});

app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { username, note, requestDate } = req.body;
    const user = await prisma.user.findUnique({ where: { username } });
    const record = await prisma.passwordReset.create({
      data: {
        username,
        name: user?.name || 'ناشناس',
        note: note || 'درخواست بازنشانی کلمه عبور از صفحه ورود',
        requestDate: requestDate || new Date().toISOString().slice(0, 10),
      },
    });
    res.json(record);
  } catch (error) {
    res.status(500).json({ error: 'Failed to register reset request', details: String(error) });
  }
});

app.get('/api/auth/password-resets', async (_req, res) => {
  try {
    const resets = await prisma.passwordReset.findMany({ orderBy: { id: 'desc' } });
    res.json(resets);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch password resets', details: String(error) });
  }
});

app.patch('/api/auth/password-resets/:id', async (req, res) => {
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

app.get('/api/users', async (_req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        username: true,
        name: true,
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

app.post('/api/users', async (req, res) => {
  try {
    const { username, password, name, role, perms } = req.body;
    if (!username || !password || !name) {
      return res.status(400).json({ error: 'اطلاعات کاربری ناقص است' });
    }
    const user = await prisma.user.create({
      data: {
        username,
        password,
        name,
        role: role || 'کارشناس',
        perms: JSON.stringify(perms || {}),
      },
    });
    res.json({
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      perms: perms || {},
    });
  } catch (error) {
    res.status(400).json({ error: 'نام کاربری از قبل وجود دارد یا نامعتبر است', details: String(error) });
  }
});

app.put('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, role, perms, password, isActive } = req.body;
    const updateData: any = {};
    if (name) updateData.name = name;
    if (role) updateData.role = role;
    if (password) updateData.password = password;
    if (perms !== undefined) updateData.perms = JSON.stringify(perms);
    if (isActive !== undefined) updateData.isActive = isActive;

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
    });
    res.json({
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      perms: JSON.parse(user.perms || '{}'),
      isActive: user.isActive,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user', details: String(error) });
  }
});

app.delete('/api/users/:id', async (req, res) => {
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
app.get('/api/requests', async (req, res) => {
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
    } = req.body;

    if (!name || !nid || !phone || !cat) {
      return res.status(400).json({ error: 'اطلاعات هویتی و نوع درخواست الزامی است.' });
    }

    // Generate random 4-digit tracking number
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const trackingCode = `REQ-1405-${randomSuffix}`;

    const newReq = await prisma.beneficiaryRequest.create({
      data: {
        trackingCode,
        name,
        nid,
        phone,
        birthDate: birthDate || '',
        guardian: guardian || 'سرپرست خانوار',
        dependents: parseInt(dependents) || 0,
        housing: housing || 'استیجاری',
        cat,
        requestedAmount: parseFloat(requestedAmount) || 0,
        approvedAmount: 0,
        desc: desc || '',
        address: address || '',
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

app.put('/api/requests/:id', async (req, res) => {
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

app.delete('/api/requests/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.beneficiaryRequest.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete request', details: String(error) });
  }
});

// 5. Programs & Projects
app.get('/api/programs', async (_req, res) => {
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

app.post('/api/programs', async (req, res) => {
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

app.put('/api/programs/:id', async (req, res) => {
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

app.post('/api/programs/:id/logs', async (req, res) => {
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

app.delete('/api/programs/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.program.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete program', details: String(error) });
  }
});

// 6. Comprehensive Financial Statistics & Pipeline Summary
app.get('/api/finance/stats', async (_req, res) => {
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
app.get('/api/backup', async (_req, res) => {
  try {
    const config = await prisma.appConfig.findFirst();
    const needCategories = await prisma.needCategory.findMany();
    const programCategories = await prisma.programCategory.findMany();
    const requests = await prisma.beneficiaryRequest.findMany();
    const programs = await prisma.program.findMany({ include: { logs: true } });
    const users = await prisma.user.findMany();
    const passwordResets = await prisma.passwordReset.findMany();

    const backupData = {
      timestamp: new Date().toISOString(),
      config,
      needCategories,
      programCategories,
      requests,
      programs,
      users,
      passwordResets,
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="charity-backup-${Date.now()}.json"`);
    res.send(JSON.stringify(backupData, null, 2));
  } catch (error) {
    res.status(500).json({ error: 'Failed to export backup', details: String(error) });
  }
});

app.post('/api/restore', async (req, res) => {
  try {
    const data = req.body;
    if (!data || (!data.requests && !data.programs)) {
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
        },
        create: {
          id: 1,
          instName: data.config.instName,
          automationTitle: data.config.automationTitle,
          logoDataUrl: data.config.logoDataUrl,
          phone: data.config.phone,
          address: data.config.address,
          notice: data.config.notice,
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

    res.json({ success: true, message: 'بازیابی اطلاعات با موفقیت انجام شد.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to restore backup', details: String(error) });
  }
});

// --- SMS Module Endpoints (Ghasedak) ---

// 1. Get / Update SMS Config
app.get('/api/sms/config', async (_req, res) => {
  try {
    let conf = await prisma.smsConfig.findUnique({ where: { id: 1 } });
    if (!conf) {
      conf = await prisma.smsConfig.create({
        data: {
          id: 1,
          apiKey: '',
          senderLine: '',
          provider: 'GHASEDAK',
          isEnabled: true,
        },
      });
    }
    res.json(conf);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch SMS config', details: String(error) });
  }
});

app.put('/api/sms/config', async (req, res) => {
  try {
    const { apiKey, senderLine, provider, isEnabled } = req.body;
    const conf = await prisma.smsConfig.upsert({
      where: { id: 1 },
      update: {
        apiKey: apiKey !== undefined ? apiKey : undefined,
        senderLine: senderLine !== undefined ? senderLine : undefined,
        provider: provider || 'GHASEDAK',
        isEnabled: isEnabled !== undefined ? isEnabled : true,
      },
      create: {
        id: 1,
        apiKey: apiKey || '',
        senderLine: senderLine || '',
        provider: provider || 'GHASEDAK',
        isEnabled: isEnabled !== undefined ? isEnabled : true,
      },
    });
    res.json(conf);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update SMS config', details: String(error) });
  }
});

// 2. Rules CRUD
app.get('/api/sms/rules', async (_req, res) => {
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

app.post('/api/sms/rules', async (req, res) => {
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
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
    });
    res.json(rule);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create SMS rule', details: String(error) });
  }
});

app.put('/api/sms/rules/:id', async (req, res) => {
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

app.delete('/api/sms/rules/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.smsRule.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete SMS rule', details: String(error) });
  }
});

// 3. SMS Logs
app.get('/api/sms/logs', async (_req, res) => {
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

app.delete('/api/sms/logs', async (_req, res) => {
  try {
    await prisma.smsLog.deleteMany({});
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear logs', details: String(error) });
  }
});

// 4. Test Manual SMS Sending
app.post('/api/sms/test', async (req, res) => {
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

// Vite Middleware or Static Production Serving
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: process.env.DISABLE_HMR !== 'true' },
      appType: 'spa',
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
