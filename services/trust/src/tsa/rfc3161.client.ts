// ============================================================
// VoteCapsule — RFC 3161 Timestamp Authority Client
// services/trust/src/tsa/rfc3161.client.ts
//
// Submits Merkle roots to an RFC 3161 Timestamp Authority.
// Returns a CMS SignedData token (legal-weight proof of time).
//
// Dev/MVP: FreeTSA.org (free, no auth required)
// Production: DigiCert / Sectigo (configurable via TSA_URL)
// ============================================================
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as https from 'https';
import * as http from 'http';

export interface TsaTimestampResult {
  token: string;          // Base64-encoded CMS SignedData
  tsaUrl: string;         // Which TSA was used
  signingTime: string;    // Parsed signing time from response
  status: 'success' | 'partial' | 'failed';
  errorMessage?: string;
}

@Injectable()
export class Rfc3161ClientService {
  private readonly logger = new Logger(Rfc3161ClientService.name);
  private readonly tsaUrl: string;

  constructor(private readonly config: ConfigService) {
    this.tsaUrl = config.get('TSA_URL', 'https://freetsa.org/tsr');
    this.logger.log(`RFC 3161 TSA configured — URL: ${this.tsaUrl}`);
  }

  /**
   * Request a timestamp token for a given Merkle root hash.
   *
   * RFC 3161 flow:
   * 1. Create a TimeStampReq (DER-encoded ASN.1)
   * 2. POST to TSA URL with Content-Type: application/timestamp-query
   * 3. Receive TimeStampResp with CMS SignedData token
   *
   * The token proves that the hash existed at a specific point in time,
   * signed by the TSA's certificate (legal weight under eIDAS/ESIGN).
   */
  async requestTimestamp(merkleRootHex: string): Promise<TsaTimestampResult> {
    try {
      // Build RFC 3161 TimeStampReq
      const tsReq = this.buildTimestampRequest(merkleRootHex);

      // Send to TSA
      const tsResp = await this.sendTsaRequest(tsReq);

      // Parse response
      const token = tsResp.toString('base64');
      const signingTime = new Date().toISOString(); // Approximate — actual is in the token

      this.logger.log(
        `RFC 3161 timestamp obtained — TSA: ${this.tsaUrl}, hash: ${merkleRootHex.substring(0, 16)}...`
      );

      return {
        token,
        tsaUrl: this.tsaUrl,
        signingTime,
        status: 'success',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`RFC 3161 timestamp failed: ${errorMessage}`);

      return {
        token: '',
        tsaUrl: this.tsaUrl,
        signingTime: '',
        status: 'failed',
        errorMessage,
      };
    }
  }

  /**
   * Build an RFC 3161 TimeStampReq.
   *
   * ASN.1 structure (simplified — DER encoding):
   * TimeStampReq ::= SEQUENCE {
   *   version       INTEGER { v1(1) },
   *   messageImprint MessageImprint,
   *   certReq       BOOLEAN DEFAULT FALSE
   * }
   * MessageImprint ::= SEQUENCE {
   *   hashAlgorithm AlgorithmIdentifier (SHA-256 OID: 2.16.840.1.101.3.4.2.1),
   *   hashedMessage OCTET STRING
   * }
   */
  private buildTimestampRequest(hashHex: string): Buffer {
    const hashBytes = Buffer.from(hashHex, 'hex');

    // SHA-256 OID: 2.16.840.1.101.3.4.2.1
    const sha256Oid = Buffer.from([
      0x30, 0x0d, // SEQUENCE (AlgorithmIdentifier)
      0x06, 0x09, // OID tag + length
      0x60, 0x86, 0x48, 0x01, 0x65, 0x03, 0x04, 0x02, 0x01, // SHA-256 OID
      0x05, 0x00, // NULL (parameters)
    ]);

    // MessageImprint = SEQUENCE { hashAlgorithm, hashedMessage }
    const hashedMessageTlv = Buffer.concat([
      Buffer.from([0x04, hashBytes.length]), // OCTET STRING tag + length
      hashBytes,
    ]);

    const messageImprintContent = Buffer.concat([sha256Oid, hashedMessageTlv]);
    const messageImprint = Buffer.concat([
      Buffer.from([0x30]), // SEQUENCE tag
      this.derLength(messageImprintContent.length),
      messageImprintContent,
    ]);

    // Version = INTEGER 1
    const version = Buffer.from([0x02, 0x01, 0x01]);

    // certReq = BOOLEAN TRUE (request certs in response)
    const certReq = Buffer.from([0x01, 0x01, 0xff]);

    // Nonce (random, prevents replay)
    const nonce = crypto.randomBytes(8);
    const nonceTlv = Buffer.concat([
      Buffer.from([0x02, nonce.length]), // INTEGER tag + length
      nonce,
    ]);

    // TimeStampReq = SEQUENCE { version, messageImprint, nonce, certReq }
    const reqContent = Buffer.concat([version, messageImprint, nonceTlv, certReq]);
    const tsReq = Buffer.concat([
      Buffer.from([0x30]), // SEQUENCE tag
      this.derLength(reqContent.length),
      reqContent,
    ]);

    return tsReq;
  }

  /**
   * Send the TimeStampReq to the TSA via HTTP POST.
   */
  private sendTsaRequest(tsReq: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const url = new URL(this.tsaUrl);
      const isHttps = url.protocol === 'https:';
      const httpModule = isHttps ? https : http;

      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/timestamp-query',
          'Content-Length': tsReq.length,
        },
      };

      const req = httpModule.request(options, (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => {
          const body = Buffer.concat(chunks);
          if (res.statusCode === 200) {
            resolve(body);
          } else {
            reject(new Error(`TSA returned HTTP ${res.statusCode}`));
          }
        });
      });

      req.on('error', (e) => reject(e));
      req.setTimeout(15000, () => {
        req.destroy();
        reject(new Error('TSA request timeout (15s)'));
      });

      req.write(tsReq);
      req.end();
    });
  }

  /**
   * DER length encoding (handles lengths > 127).
   */
  private derLength(len: number): Buffer {
    if (len < 0x80) {
      return Buffer.from([len]);
    } else if (len < 0x100) {
      return Buffer.from([0x81, len]);
    } else {
      return Buffer.from([0x82, (len >> 8) & 0xff, len & 0xff]);
    }
  }

  /**
   * Check if the TSA client is configured.
   */
  isReady(): boolean {
    return !!this.tsaUrl;
  }

  getTsaUrl(): string {
    return this.tsaUrl;
  }
}
