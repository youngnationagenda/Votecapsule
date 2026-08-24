// ============================================================
// VoteCapsule™ — Media Upload Service (S3 Presigned URLs)
// ============================================================
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuid } from 'uuid';

const UPLOAD_EXPIRY_SECONDS = 900;    // 15 minutes for upload
const GET_EXPIRY_SECONDS    = 3600;   // 1 hour for download

@Injectable()
export class MediaUploadService {
  private readonly logger = new Logger(MediaUploadService.name);
  private readonly s3:      S3Client;
  private readonly bucket:  string;

  constructor(private readonly config: ConfigService) {
    this.s3 = new S3Client({
      region: config.get<string>('AWS_REGION', 'us-east-1'),
    });
    this.bucket = config.get<string>('CAMPAIGN_MEDIA_BUCKET', 'votecapsule-campaign-assets');
  }

  /**
   * Generate an S3 key using the standard pattern:
   * {tenant_id}/{campaign_id}/{media_type}/{uuid}/{filename}
   */
  buildKey(tenantId: string, campaignId: string, mediaType: string, filename: string): string {
    const id = uuid();
    // Sanitise filename
    const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    return `${tenantId}/${campaignId}/${mediaType}/${id}/${safe}`;
  }

  buildThumbnailKey(storageKey: string): string {
    return storageKey.replace(/\/([^/]+)$/, '/thumb_$1');
  }

  buildPreviewKey(storageKey: string): string {
    return storageKey.replace(/\/([^/]+)$/, '/preview_$1');
  }

  /**
   * Return a presigned PUT URL for a new upload
   */
  async getUploadUrl(
    key: string,
    mimeType: string,
    fileSizeBytes: number,
  ): Promise<string> {
    const cmd = new PutObjectCommand({
      Bucket:        this.bucket,
      Key:           key,
      ContentType:   mimeType,
      ContentLength: fileSizeBytes,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return getSignedUrl(this.s3 as any, cmd as any, { expiresIn: UPLOAD_EXPIRY_SECONDS });
  }

  /**
   * Return a presigned GET URL for an existing object
   */
  async getSignedGetUrl(key: string, expiresIn = GET_EXPIRY_SECONDS): Promise<string> {
    const cmd = new GetObjectCommand({
      Bucket: this.bucket,
      Key:    key,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return getSignedUrl(this.s3 as any, cmd as any, { expiresIn });
  }
}
