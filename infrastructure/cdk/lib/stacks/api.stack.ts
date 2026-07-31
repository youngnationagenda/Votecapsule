/**
 * Vote Capsule™ — API Stack (Scaffold)
 * API Gateway + CloudFront distribution
 */

import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class VoteCapsuleApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props);

    // TODO: Phase 2 — API Gateway HTTP API + CloudFront
    // Implement after ECS Fargate services are deployed

    new cdk.CfnOutput(this, 'ApiStackNote', {
      value: 'API Gateway + CloudFront — implement after ECS services are deployed',
    });
  }
}
