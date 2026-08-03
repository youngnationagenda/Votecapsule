// ============================================================
// VoteCapsule — OpenSearch Client (IAM SigV4)
// services/evidence/src/search/opensearch.client.ts
//
// Singleton OpenSearch client authenticated via AWS IAM SigV4.
// ECS task role has opensearch:* permissions via VoteCapsuleSearchStack.
//
// Falls back gracefully if OPENSEARCH_ENDPOINT is not set.
// ============================================================
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@opensearch-project/opensearch';
import { AwsSigv4Signer } from '@opensearch-project/opensearch/aws';
import { defaultProvider } from '@aws-sdk/credential-provider-node';

export type OpenSearchClient = Client | null;

@Injectable()
export class OpenSearchClientService implements OnModuleInit {
  private readonly logger = new Logger(OpenSearchClientService.name);
  private client: OpenSearchClient = null;
  private endpoint: string | undefined;
  private region: string;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    this.endpoint = this.config.get<string>('OPENSEARCH_ENDPOINT');
    this.region   = this.config.get<string>('OPENSEARCH_REGION', 'us-east-1');

    if (!this.endpoint) {
      this.logger.warn(
        'OPENSEARCH_ENDPOINT not set — OpenSearch indexing is disabled. ' +
        'Evidence submission will continue without search indexing.',
      );
      return;
    }

    try {
      this.client = new Client({
        ...AwsSigv4Signer({
          region: this.region,
          service: 'es',
          getCredentials: () => {
            const credentialsProvider = defaultProvider();
            return credentialsProvider();
          },
        }),
        node: this.endpoint,
      });

      this.logger.log(
        `OpenSearch client initialised → ${this.endpoint} (region=${this.region})`,
      );
    } catch (err: unknown) {
      this.logger.error(
        `Failed to initialise OpenSearch client: ${err instanceof Error ? err.message : String(err)}`,
      );
      this.client = null;
    }
  }

  /** Returns the underlying Client, or null if not configured. */
  getClient(): OpenSearchClient {
    return this.client;
  }

  /** True if the client is ready to accept requests. */
  isAvailable(): boolean {
    return this.client !== null;
  }
}
