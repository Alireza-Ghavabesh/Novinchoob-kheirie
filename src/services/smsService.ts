import { PrismaClient } from '@prisma/client';
import { PushNotificationService } from './pushService.ts';
import { appendSmsCancellationFooter } from '../utils/smsFormat.ts';

export interface TriggerContext {
  eventType: 'REQUEST_CREATED' | 'REQUEST_STATUS_CHANGED' | 'PROGRAM_CREATED' | 'PROGRAM_STATUS_CHANGED' | 'USER_LOGIN' | 'PASSWORD_RESET';
  data: any; // BeneficiaryRequest | Program | User | PasswordReset
  previousStatus?: string;
  currentUser?: { id: string; username: string; name: string };
}

export class GhasedakSmsService {
  private prisma: PrismaClient;
  private pushService: PushNotificationService;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.pushService = new PushNotificationService(prisma);
  }

  // Helper to format Persian and international numbers to standard 11-digit or E.164
  private normalizePhone(phone: string): string {
    if (!phone) return '';
    let p = phone.trim();
    // Convert Persian / Arabic numerals to English
    p = p.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
    p = p.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
    p = p.replace(/[\s\-\(\)\+]/g, '');
    if (p.startsWith('0098')) {
      p = '0' + p.substring(4);
    } else if (p.startsWith('98')) {
      p = '0' + p.substring(2);
    }
    return p;
  }

  // Replace template variables like {name}, {trackingCode}, {status}, {amount}, {instName}
  private formatMessage(template: string, ctx: TriggerContext, instName: string): string {
    let msg = template;
    const d = ctx.data || {};

    const statusTranslations: Record<string, string> = {
      PENDING: 'در انتظار بررسی',
      APPROVED: 'تأیید و تصویب شد',
      NEEDS_INFO: 'نیازمند تکمیل مدارک',
      NEEDS_REVISION: 'نیازمند بازنگری',
      REJECTED: 'رد درخواست',
      RESOLVED: 'رسیدگی شد',
    };

    const statusText = statusTranslations[d.status] || d.status || 'نامشخص';
    const amountText = (d.approvedAmount || d.requestedAmount || d.approvedBudget || d.requestedBudget || 0).toLocaleString('fa-IR');

    const replacements: Record<string, string> = {
      '{name}': d.name || d.title || d.username || '',
      '{trackingCode}': d.trackingCode || '',
      '{status}': statusText,
      '{amount}': amountText,
      '{cat}': d.cat || '',
      '{phone}': d.phone || '',
      '{nid}': d.nid || '',
      '{note}': d.note || '',
      '{approvedBy}': d.approvedBy || '',
      '{instName}': instName || 'مؤسسه خیریه',
      '{date}': new Date().toLocaleDateString('fa-IR'),
      '{time}': new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
    };

    for (const [key, val] of Object.entries(replacements)) {
      msg = msg.split(key).join(val);
    }
    return msg;
  }

  private parseGhasedakResponse(
    response: Response,
    resData: any,
    modeLabel: 'OTP' | 'SIMPLE'
  ): { success: boolean; messageId?: string; cost?: number; error?: string; timedOut?: boolean } {
    const resultField = resData?.result;
    const resultStr = typeof resultField === 'string' ? resultField.trim().toLowerCase() : '';
    const resultObj = resultField && typeof resultField === 'object' ? resultField : null;

    const rawMsgId = Array.isArray(resData?.messageids)
      ? resData.messageids[0]
      : resData?.messageids ??
        (Array.isArray(resData?.items) ? resData.items[0] : resData?.items) ??
        resData?.data?.messageId ??
        resData?.data?.messageid ??
        resData?.messageId ??
        resData?.messageid;

    const hasValidMessageId =
      rawMsgId !== undefined &&
      rawMsgId !== null &&
      String(rawMsgId).trim() !== '' &&
      String(rawMsgId) !== '0';

    const statusCodeNum =
      resultObj?.code !== undefined
        ? Number(resultObj.code)
        : resData?.statusCode !== undefined
        ? Number(resData.statusCode)
        : resData?.status !== undefined && !isNaN(Number(resData.status))
        ? Number(resData.status)
        : undefined;

    const hasExplicitError =
      resultStr === 'error' ||
      resultStr === 'fail' ||
      resultStr === 'failed' ||
      resData?.isSuccess === false ||
      (statusCodeNum !== undefined && Number.isFinite(statusCodeNum) && statusCodeNum !== 200);

    const hasExplicitSuccess =
      resultStr === 'success' ||
      resultStr === 'ok' ||
      resData?.isSuccess === true ||
      statusCodeNum === 200 ||
      String(resultObj?.status || '').toLowerCase() === 'success' ||
      String(resultObj?.message || '').toLowerCase() === 'success';

    // If HTTP 200 OK and no explicit error flag was returned by Ghasedak, treat as success
    // so valid SMS deliveries are never wrongly invalidated due to response shape changes.
    if (response.ok && !hasExplicitError && (hasExplicitSuccess || hasValidMessageId || resData !== null)) {
      return {
        success: true,
        messageId: hasValidMessageId
          ? String(rawMsgId)
          : String(resultObj?.message || (modeLabel === 'OTP' ? 'OTP_SENT' : 'SMS_SENT')),
        cost: typeof resData?.cost === 'number' ? resData.cost : undefined,
      };
    }

    const errCode = statusCodeNum || response.status;
    const errDetail =
      resultObj?.message ||
      resData?.message ||
      resData?.error ||
      (typeof resultField === 'string' && resultField ? resultField : '') ||
      JSON.stringify(resData);

    const prefix = modeLabel === 'OTP' ? 'خطای وب‌سرویس OTP قاصدک' : 'خطای پیامک قاصدک';
    return {
      success: false,
      error: `${prefix} (${errCode}): ${errDetail}`,
    };
  }

  /**
   * Send single SMS via Ghasedak REST API
   * Supports Simple SMS API: https://api.ghasedaksms.com/v2/sms/send/simple
   * Supports OTP / Pattern API: https://api.ghasedaksms.com/v2/verification/send/simple
   */
  public async sendGhasedak(
    apiKey: string,
    senderLine: string,
    receptor: string,
    message: string,
    rule?: {
      templateType: 'SIMPLE' | 'OTP';
      templateName?: string | null;
      param1?: string | null;
      param2?: string | null;
      param3?: string | null;
    }
  ): Promise<{ success: boolean; messageId?: string; cost?: number; error?: string; timedOut?: boolean }> {
    const cleanApiKey = (apiKey || '').trim();
    const cleanSenderLine = (senderLine || '').trim();
    const cleanTemplateName = (rule?.templateName || '').trim();

    if (!cleanApiKey || cleanApiKey === 'DEMO_KEY') {
      return { success: false, error: 'توکن / کلید API قاصدک (apikey) تنظیم نشده است.' };
    }

    const cleanReceptor = this.normalizePhone(receptor);
    if (!cleanReceptor || cleanReceptor.length < 10) {
      return { success: false, error: `شماره گیرنده نامعتبر است: ${receptor}` };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
      if (rule?.templateType === 'OTP' && cleanTemplateName) {
        // Send via Ghasedak OTP / Template Verification API
        const params = new URLSearchParams();
        params.append('receptor', cleanReceptor);
        params.append('template', cleanTemplateName);
        params.append('type', '1'); // 1 = text
        if (rule.param1) params.append('param1', rule.param1);
        if (rule.param2) params.append('param2', rule.param2);
        if (rule.param3) params.append('param3', rule.param3);

        const response = await fetch('https://api.ghasedaksms.com/v2/verification/send/simple', {
          method: 'POST',
          headers: {
            'apikey': cleanApiKey,
            'Content-Type': 'application/x-www-form-urlencoded',
            'cache-control': 'no-cache',
          },
          body: params.toString(),
          signal: controller.signal,
        });

        const resData = await response.json().catch(() => ({}));
        return this.parseGhasedakResponse(response, resData, 'OTP');
      } else {
        // Send via Simple SMS API
        const finalMessage = appendSmsCancellationFooter(message);
        const params = new URLSearchParams();
        params.append('message', finalMessage);
        params.append('receptor', cleanReceptor);
        if (cleanSenderLine) {
          params.append('linenumber', cleanSenderLine);
        }

        const response = await fetch('https://api.ghasedaksms.com/v2/sms/send/simple', {
          method: 'POST',
          headers: {
            'apikey': cleanApiKey,
            'Content-Type': 'application/x-www-form-urlencoded',
            'cache-control': 'no-cache',
          },
          body: params.toString(),
          signal: controller.signal,
        });

        const resData = await response.json().catch(() => ({}));
        return this.parseGhasedakResponse(response, resData, 'SIMPLE');
      }
    } catch (err: any) {
      const isAbort = err?.name === 'AbortError' || /abort|timeout/i.test(String(err?.message || err));
      return {
        success: false,
        timedOut: isAbort,
        error: isAbort
          ? 'زمان انتظار پاسخ از سرور پیامک به پایان رسید.'
          : err?.message || String(err),
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Main Trigger Evaluator:
   * Finds matching active rules and sends SMS to designated recipients
   */
  public async handleTrigger(ctx: TriggerContext): Promise<void> {
    try {
      const config = await this.prisma.smsConfig.findUnique({ where: { id: 1 } });
      if (!config || !config.isEnabled) {
        return; // SMS module disabled globally
      }

      const appConfig = await this.prisma.appConfig.findUnique({ where: { id: 1 } });
      const instName = appConfig?.instName || 'مؤسسه خیریه';

      // Find matching rules
      const rules = await this.prisma.smsRule.findMany({
        where: {
          isActive: true,
          eventType: ctx.eventType,
        },
      });

      if (!rules || rules.length === 0) return;

      for (const rule of rules) {
        // 1. Condition: Trigger Status filter
        if (rule.triggerStatus && rule.triggerStatus !== 'ALL') {
          const currentStatus = ctx.data?.status;
          if (currentStatus !== rule.triggerStatus) {
            continue; // Status doesn't match
          }
        }

        // 2. Condition: User filter (e.g. only if triggered by/for specific user)
        if (rule.userFilter && rule.userFilter !== 'ALL') {
          const actingUser = ctx.currentUser?.username || ctx.data?.approvedBy || ctx.data?.username;
          if (actingUser !== rule.userFilter) {
            continue; // User filter doesn't match
          }
        }

        // 3. Determine Receptors based on targetType
        const recipients: string[] = [];

        if (rule.targetType === 'BENEFICIARY') {
          if (ctx.data?.phone) {
            recipients.push(ctx.data.phone);
          }
        } else if (rule.targetType === 'ADMINS') {
          // Get all admin users phone if present or institution phone
          if (appConfig?.phone) {
            recipients.push(appConfig.phone);
          }
          if (rule.customNumbers) {
            const list = rule.customNumbers.split(/[,;\n]/).map(s => s.trim()).filter(Boolean);
            recipients.push(...list);
          }
        } else if (rule.targetType === 'SPECIFIC_NUMBERS') {
          if (rule.customNumbers) {
            const list = rule.customNumbers.split(/[,;\n]/).map(s => s.trim()).filter(Boolean);
            recipients.push(...list);
          }
        }

        // De-duplicate phone numbers
        const uniqueRecipients = Array.from(new Set(recipients.filter(Boolean)));
        if (uniqueRecipients.length === 0) continue;

        // Render message content and append cancellation footer on a new line for SMS
        const rawRenderedMessage = this.formatMessage(rule.messageBody, ctx, instName);
        const isOtpPattern = rule.templateType === 'OTP' && Boolean(rule.templateName?.trim());
        const renderedMessage = isOtpPattern
          ? rawRenderedMessage
          : appendSmsCancellationFooter(rawRenderedMessage);

        // Map template parameters if OTP
        const param1 = rule.templateParam1 ? this.formatMessage(rule.templateParam1, ctx, instName) : undefined;
        const param2 = rule.templateParam2 ? this.formatMessage(rule.templateParam2, ctx, instName) : undefined;
        const param3 = rule.templateParam3 ? this.formatMessage(rule.templateParam3, ctx, instName) : undefined;

        for (const phone of uniqueRecipients) {
          // Send SMS or simulate if API key is not yet set
          let result: { success: boolean; messageId?: string; cost?: number; error?: string };

          if (!config.apiKey || config.apiKey.trim() === '' || config.apiKey === 'DEMO_KEY') {
            // Simulated mode for offline/local testing
            result = {
              success: true,
              messageId: 'SIMULATED-' + Math.floor(100000 + Math.random() * 900000),
            };
          } else {
            result = await this.sendGhasedak(
              config.apiKey,
              config.senderLine,
              phone,
              renderedMessage,
              {
                templateType: rule.templateType as any,
                templateName: rule.templateName,
                param1,
                param2,
                param3,
              }
            );
          }

          // Record in SmsLog
          await this.prisma.smsLog.create({
            data: {
              ruleTitle: rule.title,
              eventType: ctx.eventType,
              receptor: phone,
              message: renderedMessage,
              status: result.success ? (config.apiKey ? 'SUCCESS' : 'SIMULATED') : 'FAILED',
              providerMsgId: result.messageId || null,
              cost: result.cost || null,
              errorDetails: result.error || null,
            },
          });
        }

        // If rule has sendPush enabled, also send Web Push Notification to registered devices
        if (rule.sendPush) {
          this.pushService.sendNotification({
            title: rule.title || `${instName} - پیام جدید`,
            body: rawRenderedMessage,
            url: ctx.data?.trackingCode ? `/` : '/',
            username: rule.userFilter !== 'ALL' ? (rule.userFilter || undefined) : undefined,
          }).catch(e => console.error('Push Notification dispatch error:', e));
        }
      }
    } catch (error) {
      console.error('Error in GhasedakSmsService.handleTrigger:', error);
    }
  }
}
