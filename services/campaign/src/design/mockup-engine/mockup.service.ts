// ============================================================
// VoteCapsule™ — Mockup Engine Service
// Composites candidate photo + template zones using Sharp
// Background removal via @imgly/background-removal-node
// ============================================================
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';

@Injectable()
export class MockupService {
  private readonly logger = new Logger(MockupService.name);
  private readonly s3:     S3Client;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService) {
    this.s3 = new S3Client({
      region: config.get<string>('AWS_REGION', 'us-east-1'),
    });
    this.bucket = config.get<string>('CAMPAIGN_MEDIA_BUCKET', 'votecapsule-campaign-assets');
  }

  /**
   * Download an S3 object into a Buffer
   */
  private async downloadFromS3(key: string): Promise<Buffer> {
    const cmd = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    const res = await this.s3.send(cmd);
    const stream = res.Body as Readable;
    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on('data', (c: Buffer) => chunks.push(c));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }

  /**
   * Upload a Buffer to S3
   */
  private async uploadToS3(key: string, buf: Buffer, contentType: string): Promise<void> {
    await this.s3.send(
      new PutObjectCommand({
        Bucket:      this.bucket,
        Key:         key,
        Body:        buf,
        ContentType: contentType,
      }),
    );
  }

  /**
   * Remove background from image buffer using @imgly/background-removal-node
   * Returns Buffer with transparent PNG
   */
  private async removeBackground(imageBuffer: Buffer): Promise<Buffer> {
    try {
      // Dynamic import — only loaded when feature is used
      // Package: @imgly/background-removal-node
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { removeBackground } = await import('@imgly/background-removal-node');
      const blob   = new Blob([imageBuffer]);
      const result = await removeBackground(blob);
      const ab     = await result.arrayBuffer();
      return Buffer.from(ab);
    } catch (err) {
      this.logger.warn('Background removal failed — using original image', err);
      return imageBuffer;
    }
  }

  /**
   * Full composite generation pipeline
   * Returns { previewKey, highresKey } of the generated S3 objects
   */
  async generateMockup(opts: {
    tenantId:          string;
    campaignId:        string;
    designRequestId:   string;
    baseImageKey:      string;
    candidatePhotoKey: string | null;
    candidateName:     string | null;
    candidateSlogan:   string | null;
    primaryColour:     string | null;
    secondaryColour:   string | null;
    zones:             Record<string, unknown>[];
    canvasWidth:       number;
    canvasHeight:      number;
  }): Promise<{ previewKey: string; highresKey: string }> {
    // Dynamic import of sharp (heavy native module)
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const sharp = (await import('sharp')).default;

    const baseBuffer = await this.downloadFromS3(opts.baseImageKey);

    // Resize base to canvas dimensions
    let composite = sharp(baseBuffer).resize(opts.canvasWidth, opts.canvasHeight);

    // Photo zone compositing
    if (opts.candidatePhotoKey) {
      try {
        const rawPhoto = await this.downloadFromS3(opts.candidatePhotoKey);
        const noBg     = await this.removeBackground(rawPhoto);

        // Find photo zone from zones metadata
        const photoZone = opts.zones.find((z: any) => z.type === 'photo') as any;
        if (photoZone) {
          const resizedPhoto = await sharp(noBg)
            .resize(photoZone.width, photoZone.height, { fit: 'contain' })
            .toBuffer();

          const baseImg = await composite.toBuffer();
          composite = sharp(baseImg).composite([{
            input: resizedPhoto,
            left:  photoZone.x,
            top:   photoZone.y,
          }]);
        }
      } catch (err) {
        this.logger.warn(`Photo composite failed for design ${opts.designRequestId}`, err);
      }
    }

    // Generate preview (800px wide JPEG)
    const previewBuf = await composite
      .clone()
      .resize(800, null, { fit: 'inside' })
      .jpeg({ quality: 85 })
      .toBuffer();

    // Generate high-res (2000px wide PNG)
    const highresBuf = await composite
      .clone()
      .resize(2000, null, { fit: 'inside' })
      .png()
      .toBuffer();

    const base = `${opts.tenantId}/${opts.campaignId}/designs/${opts.designRequestId}`;
    const previewKey = `${base}/preview.jpg`;
    const highresKey = `${base}/highres.png`;

    await Promise.all([
      this.uploadToS3(previewKey, previewBuf, 'image/jpeg'),
      this.uploadToS3(highresKey, highresBuf, 'image/png'),
    ]);

    this.logger.log(`Mockup generated for design ${opts.designRequestId}`);
    return { previewKey, highresKey };
  }

  async getSignedUrl(key: string): Promise<string> {
    const cmd = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return getSignedUrl(this.s3 as any, cmd as any, { expiresIn: 3600 });
  }
}
