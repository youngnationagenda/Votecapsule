#!/usr/bin/env node
/**
 * Vote Capsule™ AWS CDK Application
 *
 * Provisions all AWS infrastructure for the platform.
 * Each stack is independently deployable.
 *
 * Priority: Deploy VoteCapsuleQldbStack first — trust ledger needed before Phase 3.
 *
 * Usage:
 *   pnpm deploy:qldb          — Deploy QLDB trust ledger (DO THIS FIRST)
 *   pnpm deploy:all            — Deploy all stacks
 *   pnpm cdk diff              — Preview changes
 */

import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { VoteCapsuleNetworkStack } from '../lib/stacks/network.stack';
import { VoteCapsuleDatabaseStack } from '../lib/stacks/database.stack';
import { VoteCapsuleStorageStack } from '../lib/stacks/storage.stack';
import { VoteCapsuleQldbStack } from '../lib/stacks/qldb.stack';
import { VoteCapsuleAuthStack } from '../lib/stacks/auth.stack';
import { VoteCapsuleApiStack } from '../lib/stacks/api.stack';
import { VoteCapsuleComputeStack } from '../lib/stacks/compute.stack';
import { VoteCapsuleCacheStack } from '../lib/stacks/cache.stack';
import { VoteCapsuleHostingStack } from '../lib/stacks/hosting.stack';

const app = new cdk.App();

const env: cdk.Environment = {
  account: process.env['CDK_DEFAULT_ACCOUNT'] ?? '683541453923',
  region: process.env['CDK_DEFAULT_REGION'] ?? 'us-east-1',
};

const commonProps = { env };

// ============================================================
// Stack instantiation — deploy in this order
// ============================================================

// 1. Network — VPC, subnets, security groups
const networkStack = new VoteCapsuleNetworkStack(app, 'VoteCapsuleNetworkStack', {
  ...commonProps,
  description: 'Vote Capsule™ — VPC, subnets, security groups',
});

// 2. Auth — Cognito User Pool
const authStack = new VoteCapsuleAuthStack(app, 'VoteCapsuleAuthStack', {
  ...commonProps,
  description: 'Vote Capsule™ — Amazon Cognito User Pool and App Client',
});

// 3. Database — Aurora PostgreSQL
const databaseStack = new VoteCapsuleDatabaseStack(app, 'VoteCapsuleDatabaseStack', {
  ...commonProps,
  description: 'Vote Capsule™ — Aurora PostgreSQL cluster',
  vpc: networkStack.vpc,
});
databaseStack.addDependency(networkStack);

// 4. Storage — S3 with Object Lock (WORM for evidence vault)
const storageStack = new VoteCapsuleStorageStack(app, 'VoteCapsuleStorageStack', {
  ...commonProps,
  description: 'Vote Capsule™ — S3 buckets with Object Lock for evidence vault',
});

// 5. QLDB — Trust Ledger (DEPLOY THIS EARLY — needed for Phase 3)
const qldbStack = new VoteCapsuleQldbStack(app, 'VoteCapsuleQldbStack', {
  ...commonProps,
  description: 'Vote Capsule™ — Amazon QLDB trust integrity ledger',
});

// 6. Cache — ElastiCache Redis
const cacheStack = new VoteCapsuleCacheStack(app, 'VoteCapsuleCacheStack', {
  ...commonProps,
  description: 'Vote Capsule™ — ElastiCache Redis cluster',
  vpc: networkStack.vpc,
});
cacheStack.addDependency(networkStack);

// 7. Compute — ECS Fargate
const computeStack = new VoteCapsuleComputeStack(app, 'VoteCapsuleComputeStack', {
  ...commonProps,
  description: 'Vote Capsule™ — ECS Fargate clusters for microservices',
  vpc: networkStack.vpc,
});
computeStack.addDependency(networkStack);
computeStack.addDependency(databaseStack);

// 8. API — API Gateway + CloudFront
const apiStack = new VoteCapsuleApiStack(app, 'VoteCapsuleApiStack', {
  ...commonProps,
  description: 'Vote Capsule™ — API Gateway and CloudFront distribution',
});
apiStack.addDependency(computeStack);

// 9. Hosting — votecapsule.yna.co.ke (S3 + CloudFront + ACM + Route 53)
// NOTE: ACM must be in us-east-1 — CloudFront requirement
// NOTE: Route 53 lookup will only work if yna.co.ke hosted zone is in this account.
//       If not, comment out the Route 53 section in hosting.stack.ts and
//       manually add the CNAME using the stack outputs.
const hostingStack = new VoteCapsuleHostingStack(app, 'VoteCapsuleHostingStack', {
  ...commonProps,
  env: { ...commonProps.env, region: 'us-east-1' }, // ACM must be us-east-1 for CloudFront
  description: 'Vote Capsule™ — CloudFront + S3 hosting for votecapsule.yna.co.ke',
});
hostingStack.addDependency(storageStack);

// Tags applied to all resources
cdk.Tags.of(app).add('Project', 'VoteCapsule');
cdk.Tags.of(app).add('ManagedBy', 'CDK');
cdk.Tags.of(app).add('Environment', process.env['ENVIRONMENT'] ?? 'development');

app.synth();
