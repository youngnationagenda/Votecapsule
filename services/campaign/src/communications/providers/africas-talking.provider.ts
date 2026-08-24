// ============================================================
// VoteCapsule™ — Africa's Talking SMS Provider
// ============================================================
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface AtSendResult {
  recipientCount: number;
  successCount:   number;
  failedCount:    number;
  messageIds:     string[];
  rawResponse:    unknown;
}

@Injectable()
export class AfricasTalkingProvider {
  private readonly logger = new Logger(AfricasTalkingProvider.name);
  private sms: any;
  private readonly defaultSenderId: string;

  constructor(private readonly config: ConfigService) {
    const apiKey   = config.get<string>('AT_API_KEY',    '');
    const username = config.get<string>('AT_USERNAME',   'sandbox');
    this.defaultSenderId = config.get<string>('AT_SENDER_ID', 'VOTECAP');

    if (!apiKey) {
      this.logger.warn('AT_API_KEY not set — SMS sending will be a no-op in this environment');
      return;
    }

    // Dynamic import to avoid crash when package not installed in dev
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const AfricasTalking = require('africastalking');
      const at = AfricasTalking({ apiKey, username });
      this.sms = at.SMS;
      this.logger.log(`Africa's Talking SMS provider initialised (username: ${username})`);
    } catch (err) {
      this.logger.error('Failed to initialise Africa\'s Talking — is the package installed?', err);
    }
  }

  /**
   * Send SMS in chunks of 100 (AT API limit per request)
   */
  async send(
    recipients: string[],
    message: string,
    senderId?: string,
  ): Promise<AtSendResult> {
    if (!this.sms) {
      this.logger.warn(`[MOCK] Would send SMS to ${recipients.length} recipients: "${message.substring(0, 60)}..."`);
      return {
        recipientCount: recipients.length,
        successCount:   recipients.length,
        failedCount:    0,
        messageIds:     recipients.map((_, i) => `mock-${Date.now()}-${i}`),
        rawResponse:    { mock: true },
      };
    }

    const CHUNK_SIZE = 100;
    let successCount = 0;
    let failedCount  = 0;
    const messageIds: string[] = [];
    const rawResponses: unknown[] = [];

    for (let i = 0; i < recipients.length; i += CHUNK_SIZE) {
      const chunk = recipients.slice(i, i + CHUNK_SIZE);
      try {
        const res = await this.sms.send({
          to:      chunk,
          message,
          from:    senderId ?? this.defaultSenderId,
        });
        rawResponses.push(res);

        // Parse AT response
        const recipients = res?.SMSMessageData?.Recipients ?? [];
        for (const r of recipients) {
          if (r.status === 'Success') {
            successCount++;
            if (r.messageId) messageIds.push(r.messageId);
          } else {
            failedCount++;
            this.logger.warn(`SMS failed for ${r.number}: ${r.status}`);
          }
        }
      } catch (err) {
        this.logger.error(`SMS chunk send failed (${i}–${i + CHUNK_SIZE})`, err);
        failedCount += chunk.length;
      }
    }

    return { recipientCount: recipients.length, successCount, failedCount, messageIds, rawResponse: rawResponses };
  }
}
