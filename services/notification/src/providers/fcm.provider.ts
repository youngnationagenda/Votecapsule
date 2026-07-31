// ============================================================
// VoteCapsule — Firebase Cloud Messaging Provider
// Project: vote-capsule (GCP)
// Service account: votecapsule-notification@vote-capsule.iam.gserviceaccount.com
// ============================================================
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService }      from '@nestjs/config';
import * as admin             from 'firebase-admin';
import { ServiceAccount }     from 'firebase-admin';

export interface FcmSendResult {
  success:    boolean;
  messageId?: string;
  error?:     string;
}

@Injectable()
export class FcmProvider {
  private readonly logger = new Logger(FcmProvider.name);
  private app: admin.app.App | null = null;

  constructor(private readonly config: ConfigService) {
    this.initializeFirebase();
  }

  private initializeFirebase(): void {
    const keyPath = this.config.get<string>('FIREBASE_SERVICE_ACCOUNT_PATH');

    if (!keyPath) {
      this.logger.warn(
        'FIREBASE_SERVICE_ACCOUNT_PATH not configured — FCM push notifications disabled',
      );
      return;
    }

    try {
      // Avoid re-initialising if already running (e.g. hot-reload in dev)
      if (admin.apps.length > 0) {
        this.app = admin.apps[0] ?? null;
        this.logger.log('Firebase Admin SDK already initialised — reusing app');
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const serviceAccount = require(keyPath) as ServiceAccount;

      this.app = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId:  'vote-capsule',
      });

      this.logger.log('Firebase Admin SDK initialised for project: vote-capsule');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to initialise Firebase Admin SDK: ${msg}`);
    }
  }

  /**
   * Send a push notification to a single FCM device token.
   */
  async sendToDevice(
    deviceToken: string,
    title:       string,
    body:        string,
    data?:       Record<string, string>,
  ): Promise<FcmSendResult> {
    if (!this.app) {
      return { success: false, error: 'FCM not configured' };
    }

    try {
      const messageId = await admin.messaging(this.app).send({
        token: deviceToken,
        notification: { title, body },
        data: data ?? {},
        android: {
          priority: 'high',
          notification: {
            sound:       'default',
            channelId:   'votecapsule_alerts',
            clickAction: 'FLUTTER_NOTIFICATION_CLICK',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      });

      this.logger.log(`FCM sent to ${deviceToken.slice(0, 12)}… → messageId: ${messageId}`);
      return { success: true, messageId };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`FCM send failed for token ${deviceToken.slice(0, 12)}…: ${msg}`);
      return { success: false, error: msg };
    }
  }

  /**
   * Send to multiple tokens (batch — up to 500 per FCM spec).
   */
  async sendMulticast(
    tokens: string[],
    title:  string,
    body:   string,
    data?:  Record<string, string>,
  ): Promise<{ successCount: number; failureCount: number }> {
    if (!this.app || tokens.length === 0) {
      return { successCount: 0, failureCount: tokens.length };
    }

    const batchSize   = 500;
    let successCount  = 0;
    let failureCount  = 0;

    for (let i = 0; i < tokens.length; i += batchSize) {
      const batch = tokens.slice(i, i + batchSize);

      const response = await admin.messaging(this.app).sendEachForMulticast({
        tokens: batch,
        notification: { title, body },
        data: data ?? {},
        android: { priority: 'high' },
      });

      successCount += response.successCount;
      failureCount += response.failureCount;

      response.responses.forEach((r, idx) => {
        if (!r.success) {
          this.logger.warn(
            `FCM multicast failure for token ${batch[idx]?.slice(0, 12)}…: ${r.error?.message}`,
          );
        }
      });
    }

    this.logger.log(`FCM multicast: ${successCount} sent, ${failureCount} failed`);
    return { successCount, failureCount };
  }
}
