export const SMS_CANCELLATION_FOOTER = 'لغو 11';

const WEB_OTP_LINE_REGEX = /^@[a-z0-9.-]+\s+#\S+$/i;

/**
 * Normalizes a user-entered app domain or URL (e.g. "https://App.Charity.ir:443/login")
 * into a clean WebOTP-compliant hostname ("app.charity.ir").
 */
export function normalizeAppDomain(raw?: string | null): string {
  if (!raw) return '';
  let d = String(raw).trim();
  // Convert Persian / Arabic digits if any
  d = d.replace(/[۰-۹]/g, (c) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c)));
  d = d.replace(/[٠-٩]/g, (c) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(c)));
  // Remove leading @ or protocol
  d = d.replace(/^@+/, '');
  d = d.replace(/^https?:\/\//i, '');
  // Strip path, query, fragment
  d = d.split(/[/?#]/)[0] || '';
  // Strip port (only for non-IPv6 host:port)
  if (!d.startsWith('[')) {
    d = d.replace(/:\d+$/, '');
  }
  // Remove whitespace and leading/trailing dots
  d = d.replace(/\s+/g, '').replace(/^\.+|\.+$/g, '').toLowerCase();
  return d;
}

/**
 * Checks whether a normalized domain is valid for WebOTP (must be a real domain name,
 * not a raw IP address or localhost without TLD).
 */
export function isWebOtpValidDomain(raw?: string | null): boolean {
  const domain = normalizeAppDomain(raw);
  if (!domain) return false;
  // Reject IPv4
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(domain)) return false;
  // Reject IPv6
  if (domain.includes(':')) return false;
  // Standard domain format with at least one dot and valid TLD
  return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i.test(domain);
}

/**
 * Ensures every SMS text ends on a new line with "لغو 11" to prevent
 * carrier / Ghasedak line blocking, without duplicating it if already present.
 * Preserves a WebOTP origin-bound final line ("@domain.com #123456") at the very end
 * as required by the WebOTP specification.
 */
export function appendSmsCancellationFooter(message: string): string {
  const normalized = String(message ?? '').replace(/\r\n/g, '\n').trimEnd();
  if (!normalized) return '';

  const lines = normalized.split('\n');
  const lastLine = (lines[lines.length - 1] || '').trim();
  let webOtpLine: string | null = null;
  let body = normalized;

  if (WEB_OTP_LINE_REGEX.test(lastLine)) {
    webOtpLine = lastLine;
    body = lines.slice(0, -1).join('\n').trimEnd();
  }

  let bodyWithFooter: string;
  if (!body) {
    bodyWithFooter = SMS_CANCELLATION_FOOTER;
  } else {
    const alreadyHasFooterLine = /(?:^|\n)\s*لغو\s*[1۱]{2}\s*$/u.test(body);
    if (alreadyHasFooterLine) {
      bodyWithFooter = body.replace(/(?:^|\n)\s*لغو\s*[1۱]{2}\s*$/u, (match) =>
        match.startsWith('\n') ? `\n${SMS_CANCELLATION_FOOTER}` : SMS_CANCELLATION_FOOTER
      );
    } else {
      bodyWithFooter = `${body}\n${SMS_CANCELLATION_FOOTER}`;
    }
  }

  return webOtpLine ? `${bodyWithFooter}\n${webOtpLine}` : bodyWithFooter;
}

/**
 * Builds the complete OTP SMS body with:
 * 1) Custom or default Persian text containing the code
 * 2) Mandatory "لغو 11" line for Iranian SMS operators
 * 3) Optional WebOTP origin-bound final line "@domain #code" for one-tap mobile auto-fill
 */
export function buildOtpSmsMessage(options: {
  code: string;
  instName: string;
  customTemplate?: string | null;
  audience?: 'STAFF' | 'BENEFICIARY';
  appDomain?: string | null;
}): string {
  const code = String(options.code || '').trim();
  const instName = String(options.instName || 'مؤسسه خیریه').trim();
  const custom = String(options.customTemplate || '').trim();

  let baseText: string;
  if (custom) {
    baseText = custom
      .replace(/\{code\}/g, code)
      .replace(/\{instName\}/g, instName);
    if (!baseText.includes(code) && code) {
      baseText = `${baseText}\nکد تایید: ${code}`;
    }
  } else if (options.audience === 'BENEFICIARY') {
    baseText = `مددجوی گرامی، کد تایید ورود به پروفایل در ${instName}: ${code}\nاعتبار کد: ۲ دقیقه`;
  } else {
    baseText = `کد ورود شما به سامانه ${instName}: ${code}\nاعتبار کد: ۲ دقیقه`;
  }

  const withFooter = appendSmsCancellationFooter(baseText);
  const cleanDomain = normalizeAppDomain(options.appDomain);
  if (cleanDomain && isWebOtpValidDomain(cleanDomain) && code) {
    return `${withFooter}\n@${cleanDomain} #${code}`;
  }
  return withFooter;
}
