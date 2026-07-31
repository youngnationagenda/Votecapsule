// ============================================================
// VoteCapsule — Amazon SES Email Provider
// ============================================================
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService }      from '@nestjs/config';
import {
  SESClient,
  SendEmailCommand,
  SendEmailCommandInput,
} from '@aws-sdk/client-ses';

export interface SesEmailResult {
  success:   boolean;
  messageId?: string;
  error?:    string;
}

@Injectable()
export class SesProvider {
  private readonly logger = new Logger(SesProvider.name);
  private readonly client: SESClient;
  private readonly fromAddress: string;

  constructor(private readonly config: ConfigService) {
    this.client = new SESClient({
      region: this.config.get<string>('AWS_REGION', 'us-east-1'),
    });

    this.fromAddress = this.config.get<string>(
      'SES_FROM_ADDRESS',
      'noreply@votecapsule.yna.co.ke',
    );
  }

  /**
   * Send a plain-text + optional HTML email via Amazon SES.
   */
  async sendEmail(opts: {
    to:          string | string[];
    subject:     string;
    textBody:    string;
    htmlBody?:   string;
    replyTo?:    string;
  }): Promise<SesEmailResult> {
    const toAddresses = Array.isArray(opts.to) ? opts.to : [opts.to];

    const input: SendEmailCommandInput = {
      Source:      this.fromAddress,
      Destination: { ToAddresses: toAddresses },
      Message: {
        Subject: { Data: opts.subject, Charset: 'UTF-8' },
        Body: {
          Text: { Data: opts.textBody, Charset: 'UTF-8' },
          ...(opts.htmlBody && {
            Html: { Data: opts.htmlBody, Charset: 'UTF-8' },
          }),
        },
      },
      ...(opts.replyTo && { ReplyToAddresses: [opts.replyTo] }),
    };

    try {
      const resp = await this.client.send(new SendEmailCommand(input));
      const messageId = resp.MessageId ?? 'unknown';
      this.logger.log(`SES email sent to ${toAddresses.join(',')} — MessageId: ${messageId}`);
      return { success: true, messageId };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`SES send failed to ${toAddresses.join(',')}: ${msg}`);
      return { success: false, error: msg };
    }
  }
}
