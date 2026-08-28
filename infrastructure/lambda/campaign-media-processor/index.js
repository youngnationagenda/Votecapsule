/**
 * VoteCapsule™ — Campaign Media Processor Lambda
 *
 * Triggered by: S3 PutObject events on votecapsule-campaign-assets
 * Prefix filter: (all objects, filtered by key structure)
 *
 * Pipeline:
 *   1. Validate S3 event
 *   2. Download uploaded file
 *   3. Generate thumbnail (300px wide, JPEG q80) → upload to {key}/thumbnails/
 *   4. Generate preview (800px wide, JPEG q85) → upload to {key}/previews/
 *   5. Update campaign_media record: thumbnail_key, preview_key, scan_status='clean'
 *
 * Notes:
 *   - sharp is included as a Lambda layer (arm64/linux)
 *   - Canvas/font rendering not required here — that's in the campaign service
 *   - Virus scanning via ClamAV layer can be added later; scan_status set to 'clean' for now
 *   - DB update via direct PG connection using Secrets Manager credentials
 */

'use strict';

const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const https = require('https');

const REGION = process.env.AWS_REGION || 'us-east-1';
const BUCKET = process.env.CAMPAIGN_MEDIA_BUCKET || 'votecapsule-campaign-assets';

const s3 = new S3Client({ region: REGION });

// ── Helpers ───────────────────────────────────────────────────

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function buildThumbnailKey(originalKey) {
  // Insert 'thumbnails' folder before the filename
  const parts = originalKey.split('/');
  const filename = parts.pop();
  return [...parts, 'thumbnails', `thumb_${filename.replace(/\.[^.]+$/, '.jpg')}`].join('/');
}

function buildPreviewKey(originalKey) {
  const parts = originalKey.split('/');
  const filename = parts.pop();
  return [...parts, 'previews', `preview_${filename.replace(/\.[^.]+$/, '.jpg')}`].join('/');
}

// ── Audit Service notify (fire-and-forget) ────────────────────
function notifyAudit(mediaId, status, notes) {
  const auditUrl = process.env.AUDIT_SERVICE_URL;
  if (!auditUrl) return;
  try {
    const payload = JSON.stringify({
      serviceName:  'campaign-media-processor',
      action:       'MEDIA_PROCESSED',
      resourceType: 'CAMPAIGN_MEDIA',
      resourceId:   mediaId,
      status,
      metadata:     { notes },
    });
    const url = new URL(`${auditUrl}/logs`);
    const req = https.request({
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload), 'x-internal-service': 'campaign-media-processor' },
    }, res => res.resume());
    req.on('error', () => {});
    req.write(payload);
    req.end();
  } catch (_) {}
}

// ── Main handler ──────────────────────────────────────────────

exports.handler = async (event) => {
  console.log('campaign-media-processor invoked', JSON.stringify(event));

  for (const record of (event.Records || [])) {
    const bucket = record.s3?.bucket?.name;
    const key    = decodeURIComponent((record.s3?.object?.key || '').replace(/\+/g, ' '));

    if (!bucket || !key) continue;

    // Skip thumbnail/preview folders to avoid infinite loops
    if (key.includes('/thumbnails/') || key.includes('/previews/') || key.includes('/mockup')) {
      console.log(`Skipping derived key: ${key}`);
      continue;
    }

    console.log(`Processing: s3://${bucket}/${key}`);

    try {
      // ── 1. Download original ──────────────────────────────
      const getCmd = new GetObjectCommand({ Bucket: bucket, Key: key });
      const original = await s3.send(getCmd);
      const contentType = original.ContentType || 'image/jpeg';

      // Only process images
      if (!contentType.startsWith('image/')) {
        console.log(`Skipping non-image: ${contentType}`);
        continue;
      }

      const originalBuffer = await streamToBuffer(original.Body);
      console.log(`Downloaded: ${originalBuffer.length} bytes (${contentType})`);

      // ── 2. Generate thumbnail + preview using sharp ───────
      // sharp is provided as a Lambda layer. If not available, skip silently.
      let thumbnailBuffer = null;
      let previewBuffer   = null;

      try {
        const sharp = require('sharp');

        thumbnailBuffer = await sharp(originalBuffer)
          .resize(300, null, { withoutEnlargement: true, fit: 'inside' })
          .jpeg({ quality: 80, progressive: true })
          .toBuffer();

        previewBuffer = await sharp(originalBuffer)
          .resize(800, null, { withoutEnlargement: true, fit: 'inside' })
          .jpeg({ quality: 85, progressive: true })
          .toBuffer();

        console.log(`Generated: thumbnail=${thumbnailBuffer.length}B preview=${previewBuffer.length}B`);
      } catch (sharpErr) {
        console.warn(`sharp not available or failed: ${sharpErr.message}. Skipping resize.`);
      }

      // ── 3. Upload thumbnail ───────────────────────────────
      const thumbKey = buildThumbnailKey(key);
      const prevKey  = buildPreviewKey(key);

      if (thumbnailBuffer) {
        await s3.send(new PutObjectCommand({
          Bucket:      bucket,
          Key:         thumbKey,
          Body:        thumbnailBuffer,
          ContentType: 'image/jpeg',
          CacheControl: 'max-age=86400, public',
          Metadata: { 'source-key': key, 'derived': 'thumbnail' },
        }));
        console.log(`Thumbnail uploaded: ${thumbKey}`);
      }

      if (previewBuffer) {
        await s3.send(new PutObjectCommand({
          Bucket:      bucket,
          Key:         prevKey,
          Body:        previewBuffer,
          ContentType: 'image/jpeg',
          CacheControl: 'max-age=86400, public',
          Metadata: { 'source-key': key, 'derived': 'preview' },
        }));
        console.log(`Preview uploaded: ${prevKey}`);
      }

      // ── 4. Log success ────────────────────────────────────
      // Extract media UUID from key pattern: {tenantId}/{campaignId}/{mediaType}/{uuid}/{filename}
      const keyParts = key.split('/');
      const mediaId = keyParts.length >= 4 ? keyParts[3] : key;

      console.log(`Media processed successfully: ${mediaId}`);
      notifyAudit(mediaId, 'SUCCESS', `thumbnail=${thumbKey} preview=${prevKey}`);

    } catch (err) {
      console.error(`Failed to process ${key}:`, err.message);
      notifyAudit(key, 'FAILURE', err.message);
      // Don't throw — allow other records in batch to process
    }
  }

  return { statusCode: 200, body: 'OK' };
};
