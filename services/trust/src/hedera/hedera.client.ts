// ============================================================
// VoteCapsule — Hedera Consensus Service Client
// services/trust/src/hedera/hedera.client.ts
//
// Submits Merkle roots to Hedera Consensus Service (HCS).
// Hedera Testnet for dev/MVP, Mainnet for production.
// Switch via HEDERA_NETWORK env var.
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
  private readonly operatorKey: string;

  constructor(private readonly config: ConfigService) {
    this.network = config.get('HEDERA_NETWORK', 'testnet');
    this.operatorId = config.get('HEDERA_OPERATOR_ID', '');
    this.operatorKey = config.get('HEDERA_OPERATOR_KEY', '');
  }

  async onModuleInit() {
    // Initialize Hedera client
    if (this.network === 'mainnet') {
      this.client = Client.forMainnet();
    } else {
      this.client = Client.forTestnet();
    }

    if (this.operatorId && this.operatorKey) {
      this.client.setOperator(
        AccountId.fromString(this.operatorId),
        PrivateKey.fromStringED25519(this.operatorKey),
      );
    }

    // Initialize topic
    const topicIdStr = this.config.get('HEDERA_TOPIC_ID', '');
    if (topicIdStr) {
      this.topicId = TopicId.fromString(topicIdStr);
      this.logger.log(`Hedera HCS ready — network: ${this.network}, topic: ${topicIdStr}`);
    } else {
      this.logger.warn(
        'HEDERA_TOPIC_ID not set — will create topic on first anchor. ' +
        'Set HEDERA_TOPIC_ID in .env for subsequent runs.'
      );
    }
  }

  /**
   * Submit a Merkle root to Hedera Consensus Service.
   * Returns the transaction ID and consensus timestamp.
   */
  async submitMerkleRoot(
    merkleRoot: string,
    batchId: string,
    leafCount: number,
  ): Promise<HederaAnchorResult> {
    // Ensure topic exists
    if (!this.topicId) {
      await this.createTopic();
    }

    // Build message payload
    const message = JSON.stringify({
      type: 'VOTECAPSULE_TRUST_ANCHOR',
      version: '1.0',
      merkleRoot,
      batchId,
      leafCount,
      anchoredAt: new Date().toISOString(),
    });

    // Submit to HCS
    const submitTx = new TopicMessageSubmitTransaction()
      .setTopicId(this.topicId)
      .setMessage(message);

    const txResponse = await submitTx.execute(this.client);
    const receipt = await txResponse.getReceipt(this.client);
    const record = await txResponse.getRecord(this.client);

    const transactionId = txResponse.transactionId.toString();
    const consensusTimestamp = record.consensusTimestamp?.toString() ?? new Date().toISOString();
    const sequenceNumber = Number(receipt.topicSequenceNumber ?? 0);

    const explorerUrl = this.network === 'mainnet'
      ? `https://hashscan.io/mainnet/transaction/${transactionId}`
      : `https://hashscan.io/testnet/transaction/${transactionId}`;

    this.logger.log(
      `Hedera anchor submitted — tx: ${transactionId}, topic: ${this.topicId.toString()}, seq: ${sequenceNumber}`
    );

    return {
      transactionId,
      consensusTimestamp,
      topicId: this.topicId.toString(),
      topicSequenceNumber: sequenceNumber,
      explorerUrl,
    };
  }

  /**
   * Create a new HCS topic for VoteCapsule trust anchoring.
   * This is called once on first use if HEDERA_TOPIC_ID is not configured.
   */
  private async createTopic(): Promise<void> {
    this.logger.log('Creating Hedera Consensus Service topic...');

    const createTx = new TopicCreateTransaction()
      .setTopicMemo('VoteCapsule Trust Anchor - Election Evidence Integrity');

    if (this.operatorKey) {
      createTx.setSubmitKey(PrivateKey.fromStringED25519(this.operatorKey));
    }

    const txResponse = await createTx.execute(this.client);
    const receipt = await txResponse.getReceipt(this.client);

    this.topicId = receipt.topicId!;
    this.logger.log(
      `Hedera topic created: ${this.topicId.toString()} — ` +
      `ADD THIS TO .env: HEDERA_TOPIC_ID=${this.topicId.toString()}`
    );
  }

  /**
   * Check if the Hedera client is configured and ready.
   */
  isReady(): boolean {
    return !!(this.operatorId && this.operatorKey);
  }

  getNetwork(): string {
    return this.network;
  }
}
