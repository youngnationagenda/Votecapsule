/**
 * Vote Capsule™ — Storage Stack
 * S3 buckets with Object Lock (WORM) for evidence vault
 */

import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export class VoteCapsuleStorageStack extends cdk.Stack {
  public readonly evidenceVault: s3.Bucket;
  public readonly assetsBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props);

    // Evidence Vault — WORM (Write Once, Read Many) with Object Lock
    // Approved evidence capsules cannot be deleted or overwritten
    this.evidenceVault = new s3.Bucket(this, 'EvidenceVault', {
      bucketName: `vote-capsule-evidence-vault-${this.account}`,
      objectLockEnabled: true,
      objectLockDefaultRetention: s3.ObjectLockRetention.governance(
        cdk.Duration.days(3650), // 10 years retention
      ),
      encryption: s3.BucketEncryption.S3_MANAGED,
      versioned: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      lifecycleRules: [
        {
          id: 'ArchiveApprovedEvidence',
          transitions: [
            {
              storageClass: s3.StorageClass.INFREQUENT_ACCESS,
              transitionAfter: cdk.Duration.days(90),
            },
            {
              storageClass: s3.StorageClass.GLACIER,
              transitionAfter: cdk.Duration.days(365),
            },
          ],
        },
      ],
    });

    // Assets bucket — logos, avatars, non-sensitive
    this.assetsBucket = new s3.Bucket(this, 'AssetsBucket', {
      bucketName: `vote-capsule-assets-${this.account}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT],
          allowedOrigins: [
            'https://admin.votecapsule.co.ke',
            'https://*.votecapsule.co.ke',
            'https://votecapsule.yna.co.ke',
            'https://*.votecapsule.yna.co.ke',
            'http://localhost:3000',
          ],
          allowedHeaders: ['*'],
        },
      ],
    });

    new cdk.CfnOutput(this, 'EvidenceVaultBucket', {
      value: this.evidenceVault.bucketName,
      exportName: 'VoteCapsule-EvidenceVaultBucket',
    });
  }
}
