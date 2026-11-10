<div align="center">

# 🌿 سامانه جامع مؤسسه خیریه حضرت ام‌البنین (س)
### Hazrat Umm al-Banin Charity Management & Automation System

[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Web Push](https://img.shields.io/badge/Web_Push-VAPID-FF6B6B?style=for-the-badge&logo=pwa&logoColor=white)](https://w3c.github.io/push-api/)

<p align="center">
  <b>یک پلتفرم یکپارچه، مدرن و سریع برای مدیریت شفاف امور مددجویان، پروژه‌ها، امور مالی و اتوماسیون ارتباطات خیریه</b>
  <br />
  <i>An integrated, modern, and high-performance platform for charity operations, beneficiary affairs, project tracking, financials, and multi-channel notifications.</i>
</p>

[English](#-english) • [فارسی](#-فارسی)

---

</div>

<a name="-english"></a>
## 🌐 English

### 📖 About The Project

**Hazrat Umm al-Banin Charity Management System** is a full-stack, enterprise-grade web application built to streamline and digitize charitable organizations' daily operations. From intake and review of beneficiary requests to real-time financial tracking, event scheduling, dynamic SMS workflows, and instant **Web Push Notifications**, this system offers an intuitive, accessible, and RTL-optimized interface for both the public and administrators.

---

### ✨ Key Features

- **🏛️ Public Beneficiary Portal:**
  - Online aid request submission with category selection and document attachments.
  - Live status tracking with a unique tracking code (`کد رهگیری`).
  - Public showcase of ongoing charitable initiatives, campaigns, and donation channels.

- **📋 Beneficiary & Case Management:**
  - Multi-stage request lifecycle (Pending, In Review, Approved, Rejected, Fulfilled).
  - Detailed case files, social work assessment notes, and aid allocation records.

- **💰 Financial Automation & Ledger:**
  - Inflows, outflows, and cash register balancing.
  - Expense categorization, donor receipts, and financial reporting with real-time analytics.

- **📅 Executive Calendar & Logistics:**
  - Scheduling aid distribution drives (food packages, stationery, medical aids).
  - Event management with Persian Solar Hijri (Jalali) calendar support.

- **🔔 Multi-Channel Notification Engine:**
  - **Web Push Notifications:** Real-time push alerts via Service Worker and VAPID keys on browsers and mobile devices.
  - **SMS Dispatching:** Automated SMS rules for request state transitions and emergency announcements.
  - Device management panel with instant test notification triggers.

- **👥 Role-Based Access Control (RBAC):**
  - Granular permissions for Super Admin, Financial Officers, Social Workers, and Logistics Staff.

---

### 🛠️ Tech Stack

| Domain | Technologies |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Tailwind CSS 4, Motion (Framer Motion), Lucide Icons |
| **Typography** | Vazirmatn (Fontsource Persian Typography) |
| **Backend** | Express 4, Node.js, `tsx` runtime |
| **Database & ORM** | Prisma ORM, SQLite (`charity.db`) |
| **Notifications** | Web Push (VAPID / Service Worker), SMS Gateway Integration |
| **Tooling & Build** | Vite 6, npm / bun |

---

### 🚀 Getting Started

#### Prerequisites
- **Node.js**: `v20.x` or higher
- **npm** or **bun**

#### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Alireza-Ghavabesh/Novinchoob-kheirie.git
   cd Novinchoob-kheirie
   ```

2. **Install dependencies:**
   ```bash
   npm install --legacy-peer-deps
   ```

3. **Generate Prisma Client:**
   ```bash
   npx prisma generate
   ```

4. **Environment Configuration:**
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

5. **Start Development Server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

#### Production Build
```bash
npm run build
npm start
```

---

<br />

<a name="-فارسی"></a>
## 🇮🇷 فارسی

### 📖 درباره سامانه

**سامانه جامع مؤسسه خیریه حضرت ام‌البنین (س)** یک پلتفرم تحت وب کامل و یکپارچه است که با هدف هوشمندسازی، شفافیت و تسهیل فرایندهای اجرایی و حمایتی مؤسسات خیریه طراحی و توسعه داده شده است. این سامانه امکان ثبت و پیگیری درخواست‌های نیازمندان، پایش پروژه‌ها، مدیریت دقیق تراکنش‌های مالی، زمان‌بندی توزیع ارزاق و اطلاع‌رسانی دوطرفه از طریق پیامک و **پوش‌نوتیفیکیشن وب** را در محیطی کاملاً فارسی و راست‌چین فراهم می‌کند.

---

### ✨ قابلیت‌ها و امکانات برجسته

- **🏛️ پورتال عمومی مراجعین و خیرین:**
  - فرم نیازسنجی آنلاین برای ثبت درخواست‌های امدادی و درمانی همراه با پیوست مدارک.
  - پیگیری لحظه‌ای وضعیت پرونده و مساعدت‌ها با استفاده از کد رهگیری اختصاصی.
  - صفحه نمایش طرح‌ها، پروژه‌ها و حساب‌های خیریه برای مشارکت‌های مردمی.

- **📋 مدیریت جامع پرونده‌های مددجویی:**
  - گردش کار پیشرفته درخواست‌ها (در انتظار بررسی، ارجاع به کارشناس، تأیید، رد و مختومه).
  - ثبت گزارشات مددکاری میدانی، سوابق کمک‌های اعطا شده و بایگانی اسناد.

- **💰 اتوماسیون مالی و حسابداری صندوق:**
  - ثبت دریافت‌ها، کمک‌های نقدی و غیرنقدی و هزینه‌کردهای اختصاصی هر طرح.
  - گزارش‌های تراز صندوق، دسته‌بندی سرفصل‌های هزینه و شفافیت مالی.

- **📅 تقویم اجرایی و توزیع ارزاق:**
  - زمان‌بندی کمپین‌های فصلی (بسته‌های معیشتی، نوشت‌افزار، عیدانه، قربانی).
  - پشتیبانی کامل از تاریخ و تقویم شمسی جلالی.

- **🔔 مرکز اعلان‌های هوشمند و یکپارچه:**
  - **پوش نوتیفیکیشن وب (Web Push):** ارسال نوتیفیکیشن مستقیم به مرورگر کامپیوتر و گوشی‌های موبایل هوشمند بر پایه Service Worker و استانداردهای رمزنگاری VAPID.
  - **سیستم پیامک خودکار:** موتور تعریف قوانین شرطی برای ارسال پیامک به مددجو یا مسئول پرونده در زمان تغییر وضعیت یا مناسبت‌ها.
  - تب اختصاصی مدیریت دستگاه‌های متصل‌شده و ابزار تست ارسال اعلان.

- **👥 سیستم کنترل دسترسی و کاربران:**
  - نقش‌های کاربری چندگانه (مدیر ارشد، مسئول مددکاری، امور مالی، انبارداری و تدارکات).

---

### 📁 ساختار پوشه‌ها و معماری پروژه

```text
├── prisma/
│   ├── schema.prisma       # ساختار مدل‌های پایگاه‌داده (داده‌ها، اشتراک‌های پوش و پیامک)
│   └── seed.ts             # داده‌های پیش‌فرض و اولیه سامانه
├── public/
│   ├── sw.js               # Service Worker مدیریت اعلان‌های پوش و رویدادهای کلاینت
│   └── favicon.ico
├── src/
│   ├── components/         # کامپوننت‌های رابط کاربری
│   │   ├── admin/          # پنل‌های مدیریتی (مددکاری، مالی، پیامک، تقویم و ...)
│   │   ├── Header.tsx      # سربرگ واکنش‌گرا و ناوبری
│   │   ├── LoginView.tsx   # ورود اعضا و پرسنل
│   │   └── PublicView.tsx  # نمای پورتال عمومی مراجعین
│   ├── services/
│   │   ├── api.ts          # کلاینت ارتباط با APIهای سرور
│   │   ├── pushService.ts  # سرویس مدیریت و ارسال Web Push با VAPID
│   │   └── smsService.ts   # سرویس مدیریت پیامک و اتوماسیون ارسال
│   ├── types/              # تعاریف داده‌ای TypeScript
│   └── utils/              # توابع کمکی تبدیل تاریخ و اعداد فارسی
├── server.ts               # سرور اصلی Express و API Routes
├── vite.config.ts          # تنظیمات Vite
└── package.json            # اسکریپت‌ها و وابستگی‌ها
```

---

### 💻 دستورات مفید (Scripts)

| دستور | توضیح |
| :--- | :--- |
| `npm run dev` | اجرای همزمان سرور Express و محیط توسعه Vite |
| `npm run build` | ساخت بسته کامپایل‌شده نهایی برای تولید (Production) |
| `npm run lint` | بررسی صحت تایپ‌های TypeScript بدون خطا (`tsc --noEmit`) |
| `npx prisma studio` | محیط وب بصری برای مشاهده و ویرایش جداول پایگاه‌داده SQLite |

---

### 📄 مجوز (License)

توسعه‌یافته برای مؤسسه خیریه حضرت ام‌البنین (س). کلیه حقوق محفوظ است.
*Developed for Hazrat Umm al-Banin Charity Organization. All rights reserved.*
