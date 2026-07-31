/**
 * Vote Capsule™ — QLDB Trust Ledger Stack
 *
 * Provisions the Amazon QLDB ledger named 'vote-capsule-trust'.
 *
 * This is the CORE of the Vote Capsule trust layer.
 * QLDB provides:
 * - Immutable, append-only journal
 * - Cryptographic digest for tamper detection
 * - SQL-like queries via PartiQL
 *
 * Mode: PERMISSIONED (we control all access via IAM)
 * NOT STANDARD mode — we do not use ledger sharing.
 *
 * IMPORTANT: This is NOT a blockchain.
 * This is an AWS-managed immutable ledger database.
 */

import * as cdk from 'aws-cdk-lib';
import * as qldb from 'aws-cdk-lib/aws-qldb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

export class VoteCapsuleQldbStack extends cdk.Stack {
  public readonly ledger: qldb.CfnLedger;
  public readonly ledgerName: string = 'vote-capsule-trust';

  constructor(scope: Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props);

    // ============================================================
    // QLDB Ledger — vote-capsule-trust
    // ============================================================
    this.ledger = new qldb.CfnLedger(this, 'VoteCapsuleTrustLedger', {
      name: this.ledgerName,

      // PERMISSIONED mode — all access controlled by IAM policies
      // This is the correct mode for a private enterprise ledger
      permissionsMode: 'PERMISSIONED',

      // Deletion protection — prevent accidental deletion in production
      deletionProtection: true,

      tags: [
        { key: 'Name', value: this.ledgerName },
        { key: 'Purpose', value: 'EvidenceCapsuleTrustAnchoring' },
        { key: 'Project', value: 'VoteCapsule' },
        { key: 'ManagedBy', value: 'CDK' },
        { key: 'CriticalData', value: 'true' },
      ],
    });

    // ============================================================
    // IAM Role for Trust Service (write access)
    // ============================================================
    const trustServiceRole = new iam.Role(this, 'TrustServiceRole', {
      roleName: 'vote-capsule-trust-service-role',
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      description: 'IAM role for Vote Capsule Trust Service — QLDB write access',
    });

    // Least-privilege: Trust Service can only write to this specific ledger
    trustServiceRole.addToPolicy(
      new iam.PolicyStatement({
        sid: 'QldbTrustLedgerWrite',
        effect: iam.Effect.ALLOW,
        actions: [
          'qldb:SendCommand',          // Required for all QLDB operations
          'qldb:GetDigest',             // Get current ledger digest
          'qldb:GetRevision',           // Get document revision
          'qldb:GetBlock',              // Get journal block
          'qldb:ListJournalS3Exports',  // List journal exports
        ],
        resources: [
          `arn:aws:qldb:${this.region}:${this.account}:ledger/${this.ledgerName}`,
        ],
      }),
    );

    // ============================================================
    // IAM Role for Public Verification API (read-only)
    // ============================================================
    const verificationRole = new iam.Role(this, 'VerificationApiRole', {
      roleName: 'vote-capsule-verification-api-role',
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      description: 'IAM role for Vote Capsule Public Verification API — QLDB read-only',
    });

    verificationRole.addToPolicy(
      new iam.PolicyStatement({
        sid: 'QldbVerificationReadOnly',
        effect: iam.Effect.ALLOW,
        actions: [
          'qldb:SendCommand',    // Required for PartiQL SELECT queries
          'qldb:GetDigest',      // For public digest verification
          'qldb:GetRevision',    // For document verification
        ],
        resources: [
          `arn:aws:qldb:${this.region}:${this.account}:ledger/${this.ledgerName}`,
        ],
        conditions: {
          'StringEquals': {
            'qldb:Statement': 'SELECT', // Restrict to SELECT only
          },
        },
      }),
    );

    // ============================================================
    // CloudWatch Log Group for QLDB operations
    // ============================================================
    new logs.LogGroup(this, 'QldbOperationsLog', {
      logGroupName: '/vote-capsule/qldb/trust-ledger',
      retention: logs.RetentionDays.TWO_YEARS,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // ============================================================
    // Outputs
    // ============================================================
    new cdk.CfnOutput(this, 'LedgerName', {
      value: this.ledgerName,
      description: 'QLDB Trust Ledger Name',
      exportName: 'VoteCapsule-QldbLedgerName',
    });

    new cdk.CfnOutput(this, 'LedgerArn', {
      value: `arn:aws:qldb:${this.region}:${this.account}:ledger/${this.ledgerName}`,
      description: 'QLDB Trust Ledger ARN',
      exportName: 'VoteCapsule-QldbLedgerArn',
    });

    new cdk.CfnOutput(this, 'TrustServiceRoleArn', {
      value: trustServiceRole.roleArn,
      description: 'IAM Role ARN for Trust Service (QLDB write access)',
      exportName: 'VoteCapsule-TrustServiceRoleArn',
    });
  }
}
