import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Charity Database...');

  // 1. AppConfig
  await prisma.appConfig.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      instName: 'مؤسسه خیریه حضرت ام‌البنین (س)',
      automationTitle: 'سامانه اتوماسیون کادر خیریه حضرت ام‌البنین (س)',
      phone: '021-55667788',
      address: 'تهران، منطقه ۱۷، خیابان ابوذر، نبش خیابان شهید فتحی، پلاک ۲۴',
      notice: 'تمامی پرونده‌های متقاضیان در کمیسیون مددکاری مؤسسه خیریه حضرت ام‌البنین (س) بررسی و مبالغ مصوب مستقیماً به حساب سرپرستان واریز می‌گردد.',
      logoDataUrl: null,
    },
  });

  // 2. Need Categories
  const needCats = [
    'درمان و هزینه‌های پزشکی و جراحی',
    'ودیعه و اجاره‌بهای مسکن',
    'بسته‌های معیشتی و سبد غذایی',
    'کمک‌هزینه تحصیلی و دانشگاهی',
    'تأمین جهیزیه و ملزومات اساسی زندگی',
    'اشتغال‌زایی و توانمندسازی خانوار',
    'تعمیرات و بهسازی مسکن محرومین',
  ];
  for (const cat of needCats) {
    await prisma.needCategory.upsert({
      where: { name: cat },
      update: {},
      create: { name: cat },
    });
  }

  // 3. Program Categories
  const progCats = [
    'عمرانی و مدرسه‌سازی',
    'پویش‌های فصلی و اطعام',
    'کاروان‌های سلامت و درمان رایگان',
    'توانمندسازی و کارآفرینی',
    'فرهنگی و آموزش عمومی',
    'توزیع اقلام و ملزومات فصلی',
  ];
  for (const cat of progCats) {
    await prisma.programCategory.upsert({
      where: { name: cat },
      update: {},
      create: { name: cat },
    });
  }

  // 4. Users
  const defaultUsers = [
    {
      id: 'u-admin',
      username: 'admin',
      password: '123',
      name: 'مدیر عامل مؤسسه',
      role: 'مدیر ارشد عالی',
      perms: JSON.stringify({
        viewInbox: true,
        decideInbox: true,
        viewProg: true,
        createProg: true,
        decideProg: true,
        viewFin: true,
        manageSettings: true,
      }),
    },
    {
      id: 'u-madadkar',
      username: 'madadkar',
      password: '123',
      name: 'سرکار خانم عباسی',
      role: 'مسئول واحد مددکاری و پذیرش',
      perms: JSON.stringify({
        viewInbox: true,
        decideInbox: true,
        viewProg: true,
        createProg: false,
        decideProg: false,
        viewFin: false,
        manageSettings: false,
      }),
    },
    {
      id: 'u-mali',
      username: 'mali',
      password: '123',
      name: 'جناب آقای حسینی',
      role: 'مدیر امور مالی و اعتبارات',
      perms: JSON.stringify({
        viewInbox: true,
        decideInbox: false,
        viewProg: true,
        createProg: false,
        decideProg: false,
        viewFin: true,
        manageSettings: false,
      }),
    },
    {
      id: 'u-omrani',
      username: 'omrani',
      password: '123',
      name: 'مهندس رضایی',
      role: 'مدیر طرح‌ها و عملیات عمرانی',
      perms: JSON.stringify({
        viewInbox: false,
        decideInbox: false,
        viewProg: true,
        createProg: true,
        decideProg: true,
        viewFin: false,
        manageSettings: false,
      }),
    },
  ];

  for (const u of defaultUsers) {
    await prisma.user.upsert({
      where: { username: u.username },
      update: {},
      create: u,
    });
  }

  // 5. Beneficiary Requests
  const countReqs = await prisma.beneficiaryRequest.count();
  if (countReqs === 0) {
    const initialRequests = [
      {
        trackingCode: 'REQ-1405-1001',
        name: 'فاطمه حسینی',
        nid: '0081239874',
        phone: '09123334455',
        birthDate: '1360/03/15',
        guardian: 'زن سرپرست خانوار',
        dependents: 3,
        housing: 'استیجاری',
        cat: 'درمان و هزینه‌های پزشکی و جراحی',
        requestedAmount: 22000000,
        approvedAmount: 20000000,
        desc: 'هزینه عمل جراحی دیسک کمر به دلیل عدم توانایی انجام کار و معوقات سنگین بیمارستان.',
        address: 'تهران، منطقه ۱۷، خیابان ابوذر، کوچه لاله پنجم',
        status: 'APPROVED',
        note: 'تایید کمیسیون درمان و پرداخت وجه مستقیم به حساب مرکز درمانی',
        approvedDate: '1405/08/10',
        approvedBy: 'مدیر عامل',
      },
      {
        trackingCode: 'REQ-1405-1002',
        name: 'علی‌اصغر مرادی',
        nid: '0054321987',
        phone: '09351112233',
        birthDate: '1354/07/20',
        guardian: 'سرپرست مرد - ازکارافتاده',
        dependents: 4,
        housing: 'استیجاری',
        cat: 'ودیعه و اجاره‌بهای مسکن',
        requestedAmount: 45000000,
        approvedAmount: 40000000,
        desc: 'اخطار تخلیه مسکن استیجاری به دلیل ناتوانی در پرداخت ۶ ماه اجاره‌بها.',
        address: 'تهران، خیابان فداییان اسلام، کوچه بهار، پلاک ۱۸',
        status: 'APPROVED',
        note: 'کمک بلاعوض به صورت حواله به حساب مالک مسکن',
        approvedDate: '1405/08/08',
        approvedBy: 'مدیر عامل',
      },
      {
        trackingCode: 'REQ-1405-1003',
        name: 'زهرا صادقی',
        nid: '0440987654',
        phone: '09198887766',
        birthDate: '1368/02/10',
        guardian: 'زن سرپرست خانوار',
        dependents: 2,
        housing: 'استیجاری',
        cat: 'کمک‌هزینه تحصیلی و دانشگاهی',
        requestedAmount: 12000000,
        approvedAmount: 0,
        desc: 'شهریه دانشگاه دختر ارشد خانواده و ثبت‌نام مقطع کنکور پسر دوم.',
        address: 'تهران، نسیم‌شهر، خیابان امام خمینی، فرعی سوم',
        status: 'PENDING',
        note: null,
      },
      {
        trackingCode: 'REQ-1405-1004',
        name: 'حسین اکبری',
        nid: '0076543210',
        phone: '09124445566',
        birthDate: '1349/11/05',
        guardian: 'سرپرست مرد - کارگر فصلی',
        dependents: 5,
        housing: 'استیجاری',
        cat: 'بسته‌های معیشتی و سبد غذایی',
        requestedAmount: 8000000,
        approvedAmount: 8000000,
        desc: 'نیاز به سبد ارزاق ماهانه پروتئینی، برنج، روغن و مواد شوینده.',
        address: 'تهران، شهرری، خیابان فداییان اسلام، بن‌بست نور',
        status: 'APPROVED',
        note: 'تحویل ۲ کارتن اقلام اساسی و کارت خرید معیشتی',
        approvedDate: '1405/08/02',
        approvedBy: 'مسئول واحد مددکاری',
      },
      {
        trackingCode: 'REQ-1405-1005',
        name: 'مریم سعادتی',
        nid: '0061234567',
        phone: '09367778899',
        birthDate: '1374/09/12',
        guardian: 'تحت تکفل پدربزرگ',
        dependents: 1,
        housing: 'سکونت با اقوام',
        cat: 'تأمین جهیزیه و ملزومات اساسی زندگی',
        requestedAmount: 35000000,
        approvedAmount: 0,
        desc: 'تأمین اقلام ضروری جهیزیه (یخچال، اجاق گاز و تخته فرش).',
        address: 'تهران، اسلامشهر، شهرک قائمیه، پلاک ۱۲',
        status: 'NEEDS_INFO',
        note: 'لطفاً تصویر عقدنامه رسمی و فاکتور پیش‌خرید اقلام را به واحد پذیرش ارائه فرمایید.',
      },
      {
        trackingCode: 'REQ-1405-1006',
        name: 'مهدی کاظمی',
        nid: '0039876543',
        phone: '09125556677',
        birthDate: '1358/04/18',
        guardian: 'سرپرست مرد',
        dependents: 3,
        housing: 'استیجاری',
        cat: 'اشتغال‌زایی و توانمندسازی خانوار',
        requestedAmount: 60000000,
        approvedAmount: 0,
        desc: 'خرید دستگاه جوشکاری و ابزار فنی جهت راه‌اندازی کارگاه سیار کسب درآمد.',
        address: 'تهران، عبدل‌آباد، خیابان شکوفه، کوچه دهم',
        status: 'PENDING',
        note: null,
      },
    ];

    for (const r of initialRequests) {
      await prisma.beneficiaryRequest.create({ data: r });
    }
  }

  // 6. Programs
  const countProgs = await prisma.program.count();
  if (countProgs === 0) {
    const p1 = await prisma.program.create({
      data: {
        title: 'احداث و تجهیز مدرسه ۲ کلاسه روستای امید',
        cat: 'عمرانی و مدرسه‌سازی',
        requestedBudget: 280000000,
        approvedBudget: 260000000,
        volunteers: 8,
        roles: '۲ مهندس ناظر و سازه، ۴ بنا و استادکار، ۲ مددکار اجتماعی',
        desc: 'تکمیل سقف، سیم‌کشی، عایق‌کاری و تجهیز نیمکت‌ها و سیستم گرمایشی استاندارد جهت جلوگیری از ترک تحصیل ۵۰ دانش‌آموز.',
        startDate: '1405/08/05',
        endDate: '1405/08/28',
        status: 'APPROVED',
        pipelineStage: 2, // ۱: تدوین، ۲: تصویب، ۳: اجرا، ۴: تکمیل
        progressPercent: 45,
        approvedDate: '1405/08/04',
        approvedBy: 'مدیر عامل',
        logs: {
          create: [
            { date: '1405/08/04', note: 'تصویب بودجه در هیئت امنا و تایید نقشه‌های فنی' },
            { date: '1405/08/06', note: 'بودجه اولیه ابلاغ شد و مصالح پایه و سیمان بارگیری و تخلیه گردید.' },
            { date: '1405/08/11', note: 'سقف‌گذاری کلاس اول انجام شد و تیم برق‌کاری مستقر شدند.' },
          ],
        },
      },
    });

    const p2 = await prisma.program.create({
      data: {
        title: 'پویش بزرگ توزیع ۱۰۰۰ بسته معیشتی و اطعام فصلی',
        cat: 'پویش‌های فصلی و اطعام',
        requestedBudget: 150000000,
        approvedBudget: 150000000,
        volunteers: 25,
        roles: '۱۰ نیروی بسته‌بندی، ۱۲ راننده توزیع محله‌ای، ۳ هماهنگ‌کننده انبار',
        desc: 'خرید عمده مواد غذایی، بسته‌بندی بر اساس لیست پرونده‌های نیازمندان شناسایی‌شده و توزیع محرمانه در مناطق هدف.',
        startDate: '1405/08/12',
        endDate: '1405/08/18',
        status: 'APPROVED',
        pipelineStage: 3,
        progressPercent: 80,
        approvedDate: '1405/08/10',
        approvedBy: 'مدیر عامل',
        logs: {
          create: [
            { date: '1405/08/10', note: 'تامین اعتبار کامل از سوی خیرین حامی انجام شد.' },
            { date: '1405/08/13', note: '۸۰۰ بسته آماده‌سازی و در مناطق کپرنشین و حاشیه توزیع شد.' },
          ],
        },
      },
    });

    const p3 = await prisma.program.create({
      data: {
        title: 'کاروان سلامت جهادی و ویزیت تخصصی دندانپزشکی',
        cat: 'کاروان‌های سلامت و درمان رایگان',
        requestedBudget: 85000000,
        approvedBudget: 0,
        volunteers: 14,
        roles: '۴ دندانپزشک، ۲ پزشک عمومی، ۴ پرستار و بهیار، ۴ دارویار',
        desc: 'استقرار یونیت‌های سیار در مدرسه منطقه محروم جهت ارائه خدمات رایگان کشیدن، ترمیم، جرم‌گیری و داروی رایگان.',
        startDate: '1405/08/22',
        endDate: '1405/08/25',
        status: 'PENDING',
        pipelineStage: 1,
        progressPercent: 20,
        logs: {
          create: [
            { date: '1405/08/08', note: 'پروپوزال اولیه تدوین و جهت اخذ مجوز دانشگاه علوم پزشکی ارسال شد.' },
          ],
        },
      },
    });

    const p4 = await prisma.program.create({
      data: {
        title: 'کارگاه تولیدی و خیاطی اشتغال بانوان سرپرست خانوار',
        cat: 'توانمندسازی و کارآفرینی',
        requestedBudget: 190000000,
        approvedBudget: 190000000,
        volunteers: 6,
        roles: '۲ مربی چرخ‌کاری صنعتی، ۱ سرپرست فروش، ۳ دستیار اداری',
        desc: 'تجهیز ۱۰ چرخ خیاطی صنعتی راسته‌دوز و سردوز برای ایجاد درآمد پایدار برای ۲۰ بانوی سرپرست خانوار.',
        startDate: '1405/07/01',
        endDate: '1405/07/30',
        status: 'APPROVED',
        pipelineStage: 4,
        progressPercent: 100,
        approvedDate: '1405/07/02',
        approvedBy: 'مدیر عامل',
        logs: {
          create: [
            { date: '1405/07/03', note: 'دستگاه‌های صنعتی خریداری و در سالن خیریه نصب شد.' },
            { date: '1405/07/28', note: 'دوره آموزشی پایان یافت و اولین قرارداد دوخت لباس کار منعقد شد.' },
          ],
        },
      },
    });
  }

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
