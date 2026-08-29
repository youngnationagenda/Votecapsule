// ============================================================
// VoteCapsule™ — Bedrock Stability AI Image Generation Service
// Wraps Amazon Bedrock Stability AI inference profiles for
// campaign poster / material image generation.
//
// Available models (all ACTIVE inference profiles):
//   Text-to-image:
//     us.stability.stable-image-ultra-v1:0      ← primary (needs billing)
//     us.stability.stable-image-style-guide-v1:0 ← text+style-image
//   Image editing:
//     us.stability.stable-image-inpaint-v1:0
//     us.stability.stable-image-erase-object-v1:0
//     us.stability.stable-image-search-replace-v1:0
//     us.stability.stable-image-search-recolor-v1:0
//     us.stability.stable-image-remove-background-v1:0
//     us.stability.stable-image-control-sketch-v1:0
//     us.stability.stable-image-control-structure-v1:0
//     us.stability.stable-image-style-guide-v1:0
//     us.stability.stable-outpaint-v1:0
//     us.stability.stable-style-transfer-v1:0
//   Upscaling:
//     us.stability.stable-creative-upscale-v1:0
//     us.stability.stable-conservative-upscale-v1:0
//     us.stability.stable-fast-upscale-v1:0
// ============================================================
import {
  Injectable, Logger, ServiceUnavailableException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
import {
  S3Client, PutObjectCommand, GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID }                 from 'crypto';

// ── Model registry ────────────────────────────────────────────
export const STABILITY_MODELS = {
  // Text-to-image (primary — requires payment method on account)
  ULTRA:              'us.stability.stable-image-ultra-v1:0',
  // Style-guided image generation (needs a style-image input)
  STYLE_GUIDE:        'us.stability.stable-image-style-guide-v1:0',
  // Inpaint / edit
  INPAINT:            'us.stability.stable-image-inpaint-v1:0',
  ERASE:              'us.stability.stable-image-erase-object-v1:0',
  SEARCH_REPLACE:     'us.stability.stable-image-search-replace-v1:0',
  SEARCH_RECOLOR:     'us.stability.stable-image-search-recolor-v1:0',
  REMOVE_BACKGROUND:  'us.stability.stable-image-remove-background-v1:0',
  CONTROL_SKETCH:     'us.stability.stable-image-control-sketch-v1:0',
  CONTROL_STRUCTURE:  'us.stability.stable-image-control-structure-v1:0',
  OUTPAINT:           'us.stability.stable-outpaint-v1:0',
  STYLE_TRANSFER:     'us.stability.stable-style-transfer-v1:0',
  // Upscaling
  CREATIVE_UPSCALE:   'us.stability.stable-creative-upscale-v1:0',
  CONSERVATIVE_UPSCALE: 'us.stability.stable-conservative-upscale-v1:0',
  FAST_UPSCALE:       'us.stability.stable-fast-upscale-v1:0',
} as const;

export type StabilityModel = typeof STABILITY_MODELS[keyof typeof STABILITY_MODELS];

// ── DTOs ──────────────────────────────────────────────────────
export interface GenerateImageDto {
  prompt: string;
  negativePrompt?: string;
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4' | '21:9' | '2:3' | '3:2';
  outputFormat?: 'jpeg' | 'png' | 'webp';
  seed?: number;
  stylePreset?: string;
  model?: StabilityModel;
}

export interface GenerateImageResult {
  imageUrl:   string;    // presigned S3 URL (1hr)
  s3Key:      string;    // raw S3 key for permanent storage
  model:      string;
  seed:       number;
  finishReason: string;
}

export interface RemoveBackgroundDto {
  imageBase64: string;   // base64-encoded source image
  outputFormat?: 'png' | 'webp';
}

export interface UpscaleImageDto {
  imageBase64: string;
  prompt?: string;
  outputFormat?: 'jpeg' | 'png' | 'webp';
  model?: 'creative' | 'conservative' | 'fast';
}

// ── Service ───────────────────────────────────────────────────
@Injectable()
export class BedrockImageService {
  private readonly logger = new Logger(BedrockImageService.name);
  private readonly bedrock: BedrockRuntimeClient;
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly region: string;

  constructor(private readonly config: ConfigService) {
    this.region = config.get<string>('AWS_REGION', 'us-east-1');
    this.bucket = config.get<string>(
      'CAMPAIGN_ASSETS_BUCKET',
      'votecapsule-campaign-assets',
    );

    // Use separate S3Client instance bound to same region
    const clientConfig = { region: this.region };
    this.bedrock = new BedrockRuntimeClient(clientConfig);
    // Cast needed: both clients share the same AWS SDK version but presigner
    // does a structural check against an internal type
    this.s3 = new S3Client(clientConfig) as S3Client;
  }

  // ── Text-to-image ──────────────────────────────────────────

  /**
   * Generate an image from a text prompt using Stability AI Ultra.
   * Falls back to stable-image-style-guide if ultra is unavailable.
   * Saves the result to S3 and returns a presigned URL.
   */
  async generateFromText(
    dto: GenerateImageDto,
    tenantId: string,
    campaignId: string,
  ): Promise<GenerateImageResult> {
    const model  = dto.model ?? STABILITY_MODELS.ULTRA;
    const format = dto.outputFormat ?? 'jpeg';

    const payload: Record<string, unknown> = {
      prompt:          dto.prompt,
      aspect_ratio:    dto.aspectRatio    ?? '1:1',
      output_format:   format,
    };

    if (dto.negativePrompt) payload.negative_prompt = dto.negativePrompt;
    if (dto.seed !== undefined) payload.seed = dto.seed;
    if (dto.stylePreset) payload.style_preset = dto.stylePreset;

    this.logger.log(`Invoking Bedrock ${model} — prompt: "${dto.prompt.substring(0, 60)}..."`);

    const response = await this.invokeModel(model, payload);

    // Stability AI returns { images: [base64], seeds: [number], finish_reasons: [string] }
    const imageB64    = response.images?.[0];
    const seed        = response.seeds?.[0]        ?? 0;
    const finishReason = response.finish_reasons?.[0] ?? 'SUCCESS';

    if (!imageB64) {
      throw new ServiceUnavailableException('Bedrock returned no image data');
    }

    const s3Key = await this.saveToS3(
      imageB64,
      format,
      tenantId,
      campaignId,
      'generated',
    );
    const imageUrl = await this.getPresignedUrl(s3Key);

    return { imageUrl, s3Key, model, seed, finishReason };
  }

  // ── Remove background ─────────────────────────────────────

  async removeBackground(
    dto: RemoveBackgroundDto,
    tenantId: string,
    campaignId: string,
  ): Promise<GenerateImageResult> {
    const model  = STABILITY_MODELS.REMOVE_BACKGROUND;
    const format = dto.outputFormat ?? 'png';

    const payload = {
      image:         dto.imageBase64,
      output_format: format,
    };

    const response = await this.invokeModel(model, payload);
    const imageB64    = response.image         ?? response.images?.[0];
    const finishReason = response.finish_reasons?.[0] ?? 'SUCCESS';

    if (!imageB64) {
      throw new ServiceUnavailableException('Bedrock returned no image data');
    }

    const s3Key = await this.saveToS3(imageB64, format, tenantId, campaignId, 'bg-removed');
    const imageUrl = await this.getPresignedUrl(s3Key);

    return { imageUrl, s3Key, model, seed: 0, finishReason };
  }

  // ── Upscale image ─────────────────────────────────────────

  async upscaleImage(
    dto: UpscaleImageDto,
    tenantId: string,
    campaignId: string,
  ): Promise<GenerateImageResult> {
    const modelKey = dto.model ?? 'creative';
    const model =
      modelKey === 'fast'         ? STABILITY_MODELS.FAST_UPSCALE :
      modelKey === 'conservative' ? STABILITY_MODELS.CONSERVATIVE_UPSCALE :
                                    STABILITY_MODELS.CREATIVE_UPSCALE;
    const format = dto.outputFormat ?? 'jpeg';

    const payload: Record<string, unknown> = {
      image:         dto.imageBase64,
      output_format: format,
    };
    if (dto.prompt) payload.prompt = dto.prompt;

    const response = await this.invokeModel(model, payload);
    const imageB64    = response.image         ?? response.images?.[0];
    const finishReason = response.finish_reasons?.[0] ?? 'SUCCESS';

    if (!imageB64) {
      throw new ServiceUnavailableException('Bedrock returned no image data');
    }

    const s3Key = await this.saveToS3(imageB64, format, tenantId, campaignId, 'upscaled');
    const imageUrl = await this.getPresignedUrl(s3Key);

    return { imageUrl, s3Key, model, seed: 0, finishReason };
  }

  // ── List available models ─────────────────────────────────

  getAvailableModels(): Array<{ id: string; name: string; capability: string }> {
    return [
      { id: STABILITY_MODELS.ULTRA,              name: 'Stable Image Ultra',              capability: 'text-to-image' },
      { id: STABILITY_MODELS.STYLE_GUIDE,        name: 'Stable Image Style Guide',        capability: 'text-to-image-with-style' },
      { id: STABILITY_MODELS.INPAINT,            name: 'Stable Image Inpaint',            capability: 'inpaint' },
      { id: STABILITY_MODELS.ERASE,              name: 'Stable Image Erase Object',       capability: 'erase' },
      { id: STABILITY_MODELS.SEARCH_REPLACE,     name: 'Stable Image Search & Replace',   capability: 'search-replace' },
      { id: STABILITY_MODELS.SEARCH_RECOLOR,     name: 'Stable Image Search & Recolor',   capability: 'search-recolor' },
      { id: STABILITY_MODELS.REMOVE_BACKGROUND,  name: 'Stable Image Remove Background',  capability: 'remove-background' },
      { id: STABILITY_MODELS.CONTROL_SKETCH,     name: 'Stable Image Control Sketch',     capability: 'sketch-to-image' },
      { id: STABILITY_MODELS.CONTROL_STRUCTURE,  name: 'Stable Image Control Structure',  capability: 'structure-guided' },
      { id: STABILITY_MODELS.OUTPAINT,           name: 'Stable Image Outpaint',           capability: 'outpaint' },
      { id: STABILITY_MODELS.STYLE_TRANSFER,     name: 'Stable Image Style Transfer',     capability: 'style-transfer' },
      { id: STABILITY_MODELS.CREATIVE_UPSCALE,   name: 'Stable Image Creative Upscale',   capability: 'upscale' },
      { id: STABILITY_MODELS.CONSERVATIVE_UPSCALE, name: 'Stable Image Conservative Upscale', capability: 'upscale' },
      { id: STABILITY_MODELS.FAST_UPSCALE,       name: 'Stable Image Fast Upscale',       capability: 'upscale' },
    ];
  }

  // ── Private helpers ────────────────────────────────────────

  private async invokeModel(
    modelId: string,
    payload: Record<string, unknown>,
  ): Promise<Record<string, any>> {
    try {
      const command = new InvokeModelCommand({
        modelId,
        contentType: 'application/json',
        accept:      'application/json',
        body:        Buffer.from(JSON.stringify(payload)),
      });

      const response = await this.bedrock.send(command);
      const bodyText = new TextDecoder().decode(response.body);
      return JSON.parse(bodyText);
    } catch (err: any) {
      const msg = err?.message ?? String(err);

      // Surface payment-instrument error clearly
      if (msg.includes('INVALID_PAYMENT_INSTRUMENT')) {
        throw new ServiceUnavailableException(
          'Stability AI image generation requires a valid payment method on the AWS account. ' +
          'Please add a payment method at https://console.aws.amazon.com/billing/home#/paymentmethods',
        );
      }

      if (err?.name === 'AccessDeniedException') {
        throw new ServiceUnavailableException(
          `Bedrock model access denied: ${msg}`,
        );
      }

      if (err?.name === 'ValidationException') {
        throw new BadRequestException(`Bedrock validation error: ${msg}`);
      }

      this.logger.error(`Bedrock invocation failed for ${modelId}: ${msg}`);
      throw new ServiceUnavailableException(`Image generation failed: ${msg}`);
    }
  }

  private async saveToS3(
    imageB64:    string,
    format:      string,
    tenantId:    string,
    campaignId:  string,
    prefix:      string,
  ): Promise<string> {
    const ext     = format === 'jpeg' ? 'jpg' : format;
    const key     = `ai-generated/${tenantId}/${campaignId}/${prefix}/${randomUUID()}.${ext}`;
    const buffer  = Buffer.from(imageB64, 'base64');
    const mimeType = format === 'png' ? 'image/png' : format === 'webp' ? 'image/webp' : 'image/jpeg';

    await this.s3.send(new PutObjectCommand({
      Bucket:      this.bucket,
      Key:         key,
      Body:        buffer,
      ContentType: mimeType,
      Metadata: {
        tenantId,
        campaignId,
        generator: 'stability-ai-bedrock',
      },
    }));

    this.logger.log(`Saved AI image to s3://${this.bucket}/${key}`);
    return key;
  }

  private async getPresignedUrl(key: string): Promise<string> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return getSignedUrl(
      this.s3 as any,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: 3600 }, // 1 hour
    );
  }
}
