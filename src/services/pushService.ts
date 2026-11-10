import * as webpush from 'web-push';
import { PrismaClient } from '@prisma/client';

export class PushNotificationService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.initKeys();
  }

  // Ensure VAPID keys exist, or generate automatically
  private async initKeys() {
    try {
      let config = await this.prisma.pushConfig.findUnique({ where: { id: 1 } });
      if (!config || !config.publicKey || !config.privateKey) {
        const vapidKeys = webpush.generateVAPIDKeys();
        config = await this.prisma.pushConfig.upsert({
          where: { id: 1 },
          update: {
            publicKey: vapidKeys.publicKey,
            privateKey: vapidKeys.privateKey,
          },
          create: {
            id: 1,
            publicKey: vapidKeys.publicKey,
            privateKey: vapidKeys.privateKey,
            contactEmail: 'mailto:admin@charity.local',
            isEnabled: true,
          },
        });
      }

      webpush.setVapidDetails(
        config.contactEmail || 'mailto:admin@charity.local',
        config.publicKey,
        config.privateKey
      );
    } catch (err) {
      console.error('Failed to init VAPID keys:', err);
    }
  }

  public async getPublicKey(): Promise<string> {
    let config = await this.prisma.pushConfig.findUnique({ where: { id: 1 } });
    if (!config || !config.publicKey) {
      await this.initKeys();
      config = await this.prisma.pushConfig.findUnique({ where: { id: 1 } });
    }
    return config?.publicKey || '';
  }

  /**
   * Broadcast push notification to subscribed user(s) or all
   */
  public async sendNotification(payload: {
    title: string;
    body: string;
    url?: string;
    username?: string;
  }): Promise<{ sentCount: number; failedCount: number }> {
    try {
      const config = await this.prisma.pushConfig.findUnique({ where: { id: 1 } });
      if (!config || !config.isEnabled) {
        return { sentCount: 0, failedCount: 0 };
      }

      // Re-apply VAPID details
      webpush.setVapidDetails(
        config.contactEmail || 'mailto:admin@charity.local',
        config.publicKey,
        config.privateKey
      );

      const where: any = {};
      if (payload.username && payload.username !== 'ALL') {
        where.username = payload.username;
      }

      const subscriptions = await this.prisma.pushSubscription.findMany({ where });
      if (subscriptions.length === 0) {
        return { sentCount: 0, failedCount: 0 };
      }

      const notificationString = JSON.stringify({
        title: payload.title,
        body: payload.body,
        url: payload.url || '/',
        tag: 'charity-alert-' + Date.now(),
      });

      let sentCount = 0;
      let failedCount = 0;

      await Promise.all(
        subscriptions.map(async (sub) => {
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          };

          try {
            await webpush.sendNotification(pushSubscription, notificationString, {
              TTL: 60 * 60 * 24, // 24 hours
              urgency: 'high',
            });
            sentCount++;
          } catch (err: any) {
            failedCount++;
            // If subscription has expired or unsubscribed, remove from DB
            if (err.statusCode === 404 || err.statusCode === 410) {
              await this.prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
            }
          }
        })
      );

      return { sentCount, failedCount };
    } catch (err) {
      console.error('Error sending push notification:', err);
      return { sentCount: 0, failedCount: 0 };
    }
  }
}
