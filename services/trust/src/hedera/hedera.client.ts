// ============================================================
// VoteCapsule — Hedera Consensus Service Client
// services/trust/src/hedera/hedera.client.ts
//
// Submits Merkle roots to Hedera Consensus Service (HCS).
//
// Operator account: 0.0.4426239
//   EVM address   : 0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266
//   Key type      : ECDSA_SECP256K1 (Hardhat Account #0)
//   Network       : Hedera Testnet (HEDERA_NETWORK=testnet)
//   HCS Topic     : 0.0.9871113
//
// The client auto-detects ED25519 vs ECDSA based on the DER prefix
// of the HEDERA_OPERATOR_KEY env var:
//   • 302e…  = ED25519
//   • 3030…  = ECDSA secp256k1  ← current VoteCapsule operator key
//
// Switch to mainnet by setting HEDERA_NETWORK=mainnet and supplying
// a funded mainnet operator account.
// ============================================================
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Client,
  TopicCreateTransaction,
  TopicMessageSubmitTransaction,
  TopicId,
  AccountId,
  PrivateKey,
} from '@hashgraph/sdk';

export interface HederaAnchorResult {
  transactionId: string;
  consensusTimestamp: string;
  topicId: string;
  topicSequenceNumber: number;
  explorerUrl: string;
}

@Injectable()
export class HederaClientService implements OnModuleInit {
  private readonly logger = new Logger(HederaClientService.name);
  private client: Client;
  private topicId: TopicId;
  private readonly network: string;
  private readonly operatorId: string;
  private readonly operatorKeyStr: string;

  constructor(private readonly config: ConfigService) {
    this.network       = config.get<string>('HEDERA_NETWORK', 'testnet');
    this.operatorId    = config.get<string>('HEDERA_OPERATOR_ID', '');
    this.operatorKeyStr = config.get<string>('HEDERA_OPERATOR_KEY', '');
  }

  async onModuleInit() {
    // Build Hedera client for the configured network
    this.client = this.network === 'mainnet'
      ? Client.forMainnet()
      : Client.forTestnet();

    if (this.operatorId && this.operatorKeyStr) {
      const operatorKey = this.parsePrivateKey(this.operatorKeyStr);
      this.client.setOperator(
        AccountId.fromString(this.operatorId),
        operatorKey,
      );
      this.logger.log(
        `Hedera operator set: ${this.operatorId} ` +
        `(${this.keyType(this.operatorKeyStr)}) on ${this.network}`,
      );
    } else {
      this.logger.warn(
        'HEDERA_OPERATOR_ID or HEDERA_OPERATOR_KEY not set — ' +
        'Hedera anchoring disabled.',
      );
    }

    // Wire up HCS topic
    const topicIdStr = this.config.get<string>('HEDERA_TOPIC_ID', '');
    if (topicIdStr && topicIdStr !== 'AUTO_CREATED_ON_FIRST_RUN') {
      this.topicId = TopicId.fromString(topicIdStr);
      this.logger.log(
        `Hedera HCS ready — network: ${this.network}, ` +
        `topic: ${topicIdStr}, ` +
        `HashScan: https://hashscan.io/${this.network}/topic/${topicIdStr}`,
      );
    } else {
      this.logger.warn(
        'HEDERA_TOPIC_ID not configured — ' +
        'topic will be auto-created on first anchor call.',
      );
    }
  }

  // ── Public API ────────────────────────────────────────────

  /**
   * Submit a Merkle root to Hedera Consensus Service.
   * Returns the transaction ID and consensus timestamp.
   */
  async submitMerkleRoot(
    merkleRoot: string,
    batchId: string,
    leafCount: number,
  ): Promise<HederaAnchorResult> {
    if (!this.topicId) {
      await this.createTopic();
    }

    const message = JSON.stringify({
      type: 'VOTECAPSULE_TRUST_ANCHOR',
      version: '1.0',
      merkleRoot,
      batchId,
      leafCount,
      anchoredAt: new Date().toISOString(),
    });

    const submitTx = new TopicMessageSubmitTransaction()
      .setTopicId(this.topicId)
      .setMessage(message);

    const txResponse = await submitTx.execute(this.client);
    const receipt    = await txResponse.getReceipt(this.client);
    const record     = await txResponse.getRecord(this.client);

    const transactionId      = txResponse.transactionId.toString();
    const consensusTimestamp = record.consensusTimestamp?.toString() ?? new Date().toISOString();
    const sequenceNumber     = Number(receipt.topicSequenceNumber ?? 0);

    const explorerUrl = this.network === 'mainnet'
      ? `https://hashscan.io/mainnet/transaction/${transactionId}`
      : `https://hashscan.io/testnet/transaction/${transactionId}`;

    this.logger.log(
      `Hedera anchor submitted — tx: ${transactionId}, ` +
      `topic: ${this.topicId.toString()}, seq: ${sequenceNumber}`,
    );

    return {
      transactionId,
      consensusTimestamp,
      topicId: this.topicId.toString(),
      topicSequenceNumber: sequenceNumber,
      explorerUrl,
    };
  }

  isReady(): boolean {
    return !!(this.operatorId && this.operatorKeyStr);
  }

  getNetwork(): string {
    return this.network;
  }

  getTopicId(): string {
    return this.topicId?.toString() ?? '';
  }

  getOperatorId(): string {
    return this.operatorId;
  }

  getEvmAddress(): string {
    return this.config.get<string>('HEDERA_EVM_ADDRESS', '');
  }

  // ── Private helpers ───────────────────────────────────────

  /**
   * Parse a private key string — supports both ED25519 and ECDSA (secp256k1).
   *
   * DER prefixes:
   *   302e…  — ED25519 (OID 1.3.101.112)
   *   3030…  — ECDSA secp256k1 (OID 1.3.132.0.10)
   */
  private parsePrivateKey(keyStr: string): PrivateKey {
    const trimmed = keyStr.trim();

    // Detect key type from DER prefix
    if (trimmed.startsWith('302e') || trimmed.startsWith('302a')) {
      // ED25519
      return PrivateKey.fromStringED25519(trimmed);
    } else if (trimmed.startsWith('3030') || trimmed.startsWith('302d')) {
      // ECDSA secp256k1
      return PrivateKey.fromStringECDSA(trimmed);
    } else if (trimmed.length === 64) {
      // Raw 32-byte hex — try ECDSA first (most common for EVM accounts)
      try {
        return PrivateKey.fromStringECDSA(trimmed);
      } catch {
        return PrivateKey.fromStringED25519(trimmed);
      }
    }

    // Fallback: let the SDK decide
    return PrivateKey.fromString(trimmed);
  }

  private keyType(keyStr: string): string {
    const t = keyStr.trim();
    if (t.startsWith('302e') || t.startsWith('302a')) return 'ED25519';
    if (t.startsWith('3030') || t.startsWith('302d')) return 'ECDSA_SECP256K1';
    if (t.length === 64) return 'raw-hex';
    return 'unknown';
  }

  /**
   * Create a new HCS topic on first use.
   * Sets HEDERA_TOPIC_ID in memory — log the value to persist it.
   */
  private async createTopic(): Promise<void> {
    this.logger.log('Creating Hedera Consensus Service topic...');

    const createTx = new TopicCreateTransaction()
      .setTopicMemo('VoteCapsule\u2122 Trust Anchor - Election Evidence Integrity');

    const txResponse = await createTx.execute(this.client);
    const receipt    = await txResponse.getReceipt(this.client);

    this.topicId = receipt.topicId!;

    this.logger.warn(
      `New HCS topic created: ${this.topicId.toString()} — ` +
      `PERSIST THIS: HEDERA_TOPIC_ID=${this.topicId.toString()}`,
    );
  }
}
