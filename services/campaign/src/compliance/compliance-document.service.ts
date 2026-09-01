// ============================================================
// VoteCapsule™ — Compliance Document Service
// Handles upload, download, list and delete of IEBC compliance
// documents stored in S3 (vc-campaign-media bucket).
// ============================================================
import {
  Injectable, Logger, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { CampaignComplianceDocument } from './entities/campaign-compliance-document.entity';

// ── Valid doc codes ──────────────────────────────────────────
// Candidate portal (12) + party-only extras (3)
const CANDIDATE_DOC_CODES = new Set([
  'ecf1', 'ecf2', 'id_copies', 'bank_statement', 'bank_opening',
  'ecf5', 'ecf6_prelim', 'ecf6_final', 'ecf7', 'auditor_report',
  'receipts', 'ecf8',
]);

const PARTY_EXTRA_CODES = new Set([
  'ecf3', 'ecf4', 'expenditure_committee',
]);

const ALL_VALID_CODES = new Set([...CANDIDATE_DOC_CODES, ...PARTY_EXTRA_CODES]);

// Required doc codes for compliance score check 7
const CANDIDATE_REQUIRED_CODES = [
  'ecf1', 'ecf2', 'id_copies', 'bank_statement', 'bank_opening',
  'ecf5', 'ecf6_prelim', 'ecf6_final', 'receipts',
];
const PARTY_REQUIRED_CODES = [
  'ecf1', 'ecf2', 'ecf3', 'id_copies', 'bank_statement', 'bank_opening',
  'expenditure_committee', 'ecf5', 'ecf6_prelim', 'ecf6_final', 'receipts',
];

const GET_EXPIRY_SECONDS = 3600; // 1 hour

@Injectable()
export class ComplianceDocumentService {
  private readonly logger = new Logger(ComplianceDocumentService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly cdnBase: string;

  constructor(
    @InjectRepository(CampaignComplianceDocument)
    private readonly repo: Repository<CampaignComplianceDocument>,
    private readonly config: ConfigService,
  ) {
    this.s3 = new S3Client({
      region: config.get<string>('AWS_REGION', 'us-east-1'),
    });
    this.bucket  = config.get<string>('CAMPAIGN_MEDIA_BUCKET', 'votecapsule-campaign-assets');
    this.cdnBase = config.get<string>(
      'CAMPAIGN_CDN_BASE_URL',
      'https://d2gcmpnwkpjbrb.cloudfront.net',
    );
  }

  // ── Validate doc code ────────────────────────────────────────

  validateDocCode(docCode: string): void {
    if (!ALL_VALID_CODES.has(docCode)) {
      throw new BadRequestException(
        `Invalid docCode "${docCode}". Valid codes: ${[...ALL_VALID_CODES].join(', ')}`,
      );
    }
  }

  // ── List all compliance documents for a campaign ─────────────

  async listDocuments(campaignId: string, tenantId: string): Promise<any[]> {
    const docs = await this.repo.find({
      where: { campaignId, tenantId },
      order: { createdAt: 'ASC' },
    });

    // Attach signed GET URLs for each document
    return Promise.all(
      docs.map(async (d) => {
        let url = '';
        try {
          url = await this.getSignedUrl(d.s3Key);
        } catch {
          // Return CDN URL as fallback
          url = `${this.cdnBase}/${d.s3Key}`;
        }
        return {
          id:           d.id,
          docCode:      d.docCode,
          fileName:     d.fileName,
          contentType:  d.contentType,
          fileSizeBytes: d.fileSizeBytes,
          status:       d.status,
          uploadedAt:   d.createdAt,
          url,
        };
      }),
    );
  }

  // ── Upload a compliance document (multipart) ─────────────────

  async uploadDocument(
    campaignId:   string,
    tenantId:     string,
    userId:       string,
    docCode:      string,
    fileName:     string,
    contentType:  string,
    buffer:       Buffer,
  ): Promise<any> {
    this.validateDocCode(docCode);

    const timestamp = Date.now();
    const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const s3Key = `campaigns/${campaignId}/compliance/${docCode}/${timestamp}_${safeFileName}`;

    // Upload to S3
    await this.s3.send(new PutObjectCommand({
      Bucket:      this.bucket,
      Key:         s3Key,
      Body:        buffer,
      ContentType: contentType,
    }));

    this.logger.log(`Compliance doc uploaded: s3://${this.bucket}/${s3Key}`);

    // Upsert DB record (UNIQUE campaign_id + doc_code → replace on conflict)
    const existing = await this.repo.findOne({ where: { campaignId, tenantId, docCode } });
    if (existing) {
      // Delete old S3 object (best-effort)
      try {
        await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: existing.s3Key }));
      } catch { /* ignore */ }

      existing.fileName      = fileName;
      existing.s3Key         = s3Key;
      existing.contentType   = contentType;
      existing.fileSizeBytes = buffer.length;
      existing.uploadedBy    = userId;
      existing.status        = 'pending';
      existing.reviewerNotes = null;
      await this.repo.save(existing);

      const url = await this.getSignedUrl(s3Key);
      return { id: existing.id, docCode, fileName, uploadedAt: existing.updatedAt, url, status: 'pending' };
    }

    const doc = this.repo.create({
      campaignId,
      tenantId,
      docCode,
      fileName,
      s3Key,
      contentType,
      fileSizeBytes: buffer.length,
      uploadedBy:    userId,
      status:        'pending',
    });
    const saved = await this.repo.save(doc);

    const url = await this.getSignedUrl(s3Key);
    return {
      id:         saved.id,
      docCode,
      fileName,
      uploadedAt: saved.createdAt,
      url,
      status:     'pending',
    };
  }

  // ── Get signed download URL for a specific doc code ──────────

  async getDocumentUrl(
    campaignId: string,
    tenantId:   string,
    docCode:    string,
  ): Promise<{ url: string; fileName: string; contentType: string | null }> {
    this.validateDocCode(docCode);

    const doc = await this.repo.findOne({ where: { campaignId, tenantId, docCode } });
    if (!doc) throw new NotFoundException(`Document with code "${docCode}" not found`);

    const url = await this.getSignedUrl(doc.s3Key);
    return { url, fileName: doc.fileName, contentType: doc.contentType };
  }

  // ── Delete a compliance document ─────────────────────────────

  async deleteDocument(
    campaignId: string,
    tenantId:   string,
    docCode:    string,
  ): Promise<void> {
    this.validateDocCode(docCode);

    const doc = await this.repo.findOne({ where: { campaignId, tenantId, docCode } });
    if (!doc) throw new NotFoundException(`Document with code "${docCode}" not found`);

    // Delete S3 object (best-effort)
    try {
      await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: doc.s3Key }));
    } catch (err: any) {
      this.logger.warn(`Failed to delete S3 object ${doc.s3Key}: ${err?.message}`);
    }

    await this.repo.remove(doc);
    this.logger.log(`Compliance doc deleted: ${docCode} for campaign ${campaignId}`);
  }

  // ── Compute document compliance score contribution (check 7) ─
  // Returns partial points (out of 14) based on required docs uploaded.
  // Candidate needs 9 required docs; party needs 11.

  async computeDocScore(
    campaignId: string,
    tenantId:   string,
    isParty:    boolean = false,
  ): Promise<{ points: number; uploaded: number; required: number; pct: number }> {
    const requiredCodes = isParty ? PARTY_REQUIRED_CODES : CANDIDATE_REQUIRED_CODES;
    const docs = await this.repo.find({
      where: { campaignId, tenantId },
      select: ['docCode'],
    });

    const uploadedSet = new Set(docs.map((d) => d.docCode));
    const uploadedRequired = requiredCodes.filter((c) => uploadedSet.has(c)).length;
    const pct = uploadedRequired / requiredCodes.length;
    const points = Math.round(pct * 14);

    return {
      points,
      uploaded: uploadedRequired,
      required: requiredCodes.length,
      pct: Math.round(pct * 100),
    };
  }

  // ── Review a compliance document (authority portal) ──────────
  // Sets status to 'verified' | 'rejected' | 'pending'.
  // Returns updated document with new signed URL.

  async reviewDocument(
    campaignId:    string,
    tenantId:      string,
    docCode:       string,
    status:        string,
    notes:         string | null,
    reviewedBy:    string,
  ): Promise<any> {
    this.validateDocCode(docCode);

    const doc = await this.repo.findOne({ where: { campaignId, tenantId, docCode } });
    if (!doc) throw new NotFoundException(`Document with code "${docCode}" not found`);

    doc.status        = status;
    doc.reviewerNotes = notes;
    await this.repo.save(doc);

    this.logger.log(`Compliance doc ${docCode} → ${status} for campaign ${campaignId} by ${reviewedBy}`);

    let url = '';
    try { url = await this.getSignedUrl(doc.s3Key); } catch { /* ignore */ }

    return {
      id:            doc.id,
      docCode:       doc.docCode,
      fileName:      doc.fileName,
      status:        doc.status,
      reviewerNotes: doc.reviewerNotes,
      uploadedAt:    doc.createdAt,
      url,
    };
  }

  // ── List ALL documents for a tenant (authority reviewer view) ─
  // Paginated list across all campaigns for the tenant, filtered by status.
  // Returns: { data: [...], total, page, limit }

  async listAllDocumentsForTenant(
    tenantId: string,
    status:   string,
    page:     number,
    limit:    number,
  ): Promise<{ data: any[]; total: number; page: number; limit: number }> {
    const pageNum  = Math.max(1, page);
    const pageSize = Math.min(Math.max(1, limit), 200);
    const offset   = (pageNum - 1) * pageSize;

    // Build WHERE clause — allow 'all' to return everything
    const where: any = { tenantId };
    if (status !== 'all') where.status = status;

    const [docs, total] = await this.repo.findAndCount({
      where,
      order:  { createdAt: 'DESC' },
      take:   pageSize,
      skip:   offset,
    });

    // Attach signed URLs (best-effort)
    const data = await Promise.all(
      docs.map(async (d) => {
        let url = '';
        try { url = await this.getSignedUrl(d.s3Key); } catch { /* ignore */ }
        return {
          id:            d.id,
          campaignId:    d.campaignId,
          tenantId:      d.tenantId,
          docCode:       d.docCode,
          fileName:      d.fileName,
          contentType:   d.contentType,
          fileSizeBytes: d.fileSizeBytes,
          status:        d.status,
          reviewerNotes: d.reviewerNotes,
          uploadedAt:    d.createdAt,
          updatedAt:     d.updatedAt,
          url,
        };
      }),
    );

    return { data, total, page: pageNum, limit: pageSize };
  }

  // ── Internal: generate a presigned S3 GET URL ────────────────

  private async getSignedUrl(s3Key: string): Promise<string> {
    const cmd = new GetObjectCommand({ Bucket: this.bucket, Key: s3Key });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return getSignedUrl(this.s3 as any, cmd as any, { expiresIn: GET_EXPIRY_SECONDS });
  }
}
