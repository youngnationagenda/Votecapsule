// ============================================================
// VoteCapsule — Amazon SNS SMS Provider
// Used for SMS alerts to supervisors / critical escalations.
// ============================================================
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService }      from '@nestjs/config';
import {
  SNSClient,
  PublishCommand,
} from '@aws-sdk/client-sns';

export interface SnsSmsResult {
  success:   boolean;
  messageId?: string;
  error?:    string;
}

@Injectable()
export class SnsProvider {
  private readonly logger = new Logger(SnsProvider.name);
  private readonly client: SNSClient;

  constructor(private readonly config: ConfigService) {
    this.client = new SNSClient({
      region: this.config.get<string>('AWS_REGION', 'us-east-1'),
    });
  }

  /**
   * Send an SMS to a single phone number via Amazon SNS.
   * Phone number must be in E.164 format, e.g. +254712345678
   */
  async sendSms(
    phoneNumber: string,
    message:     string,
  ): Promise<SnsSmsResult> {
    try {
      const resp = await this.client.send(
        new PublishCommand({
          PhoneNumber: phoneNumber,
          Message:     message,
          MessageAttributes: {
            'AWS.SNS.SMS.SMSType': {
              DataType:    'String',
              StringValue: 'Transactional', // highest deliverability
            },
            'AWS.SNS.SMS.SenderID': {
              DataType:    'String',
              StringValue: 'VOTECAP',       // max 11 alphanumeric chars
            },
          },
        }),
      );

      const messageId = resp.MessageId ?? 'unknown';
      this.logger.log(`SNS SMS sent to ${phoneNumber} — MessageId: ${messageId}`);
      return { success: true, messageId };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`SNS SMS failed to ${phoneNumber}: ${msg}`);
      return { success: false, error: msg };
    }
  }
}
