export const SMS_CANCELLATION_FOOTER = 'لغو 11';

/**
 * Ensures every SMS text ends on a new line with "لغو 11" to prevent
 * carrier / Ghasedak line blocking, without duplicating it if already present.
 */
export function appendSmsCancellationFooter(message: string): string {
  const normalized = String(message ?? '').replace(/\r\n/g, '\n').trimEnd();
  if (!normalized) return '';

  // Match an existing standalone final line like "لغو 11" or "لغو۱۱"
  const alreadyHasFooterLine = /(?:^|\n)\s*لغو\s*[1۱]{2}\s*$/u.test(normalized);
  if (alreadyHasFooterLine) {
    return normalized.replace(/(?:^|\n)\s*لغو\s*[1۱]{2}\s*$/u, (match) =>
      match.startsWith('\n') ? `\n${SMS_CANCELLATION_FOOTER}` : SMS_CANCELLATION_FOOTER
    );
  }

  return `${normalized}\n${SMS_CANCELLATION_FOOTER}`;
}
