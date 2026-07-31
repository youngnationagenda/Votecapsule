# Vote Capsule™ AWS CDK Infrastructure

All AWS infrastructure defined as TypeScript CDK code.

## Stacks

| Stack | Description | Status |
|-------|-------------|--------|
| `VoteCapsuleNetworkStack` | VPC, subnets, security groups | 📋 Ready to deploy |
| `VoteCapsuleDatabaseStack` | Aurora PostgreSQL Serverless v2 | 📋 Ready to deploy |
| `VoteCapsuleStorageStack` | S3 buckets + Object Lock (evidence vault) | 📋 Ready to deploy |
| `VoteCapsuleQldbStack` | **DEPRECATED** — replaced by Hedera + RFC 3161 Hybrid Anchor | ❌ Do not deploy |
| `VoteCapsuleAuthStack` | Cognito User Pool (no self-signup, TOTP MFA) | 📋 Ready to deploy |
| `VoteCapsuleApiStack` | API Gateway + CloudFront (Phase 2) | 📋 Scaffold |
| `VoteCapsuleComputeStack` | ECS Fargate cluster | 📋 Ready to deploy |
| `VoteCapsuleCacheStack` | ElastiCache Redis | 📋 Ready to deploy |
| `VoteCapsuleHostingStack` | S3 + CloudFront + ACM for `votecapsule.yna.co.ke` | 📋 Ready to deploy |

## Foundation Stack — LIVE

The `VoteCapsuleFoundationStack` is already deployed:
- IAM Roles: `vote-capsule-trust-service-role`, `vote-capsule-identity-service-role`, `vote-capsule-tenant-service-role`
- CloudWatch Log Groups: `/vote-capsule/services/trust`, `/vote-capsule/services/identity`, `/vote-capsule/services/tenant`, `/vote-capsule/apps/admin-web`

## Domain Assignment

| Domain | Purpose | Stack |
|--------|---------|-------|
| `votecapsule.yna.co.ke` | Primary public portal + API root | `VoteCapsuleHostingStack` |
| `admin.votecapsule.yna.co.ke` | Super Admin Portal (subdomain) | `VoteCapsuleHostingStack` |
| `api.votecapsule.yna.co.ke` | API Gateway (Phase 2) | `VoteCapsuleApiStack` |

## Deploying

```bash
cd infrastructure/cdk
pnpm install

# Deploy in recommended order
pnpm cdk deploy VoteCapsuleNetworkStack
pnpm cdk deploy VoteCapsuleAuthStack
pnpm cdk deploy VoteCapsuleDatabaseStack
# VoteCapsuleQldbStack — DEPRECATED (trust now uses Hedera + RFC 3161, no AWS infra needed)
pnpm cdk deploy VoteCapsuleStorageStack
pnpm cdk deploy VoteCapsuleCacheStack
pnpm cdk deploy VoteCapsuleComputeStack
pnpm cdk deploy VoteCapsuleHostingStack       # ← votecapsule.yna.co.ke

# Or deploy everything at once
pnpm cdk deploy --all
```

## Domain DNS Setup (if yna.co.ke is NOT in Route 53)

If the `yna.co.ke` hosted zone is not in this AWS account:

1. Comment out the Route 53 section in `hosting.stack.ts`
2. Deploy `VoteCapsuleHostingStack` without Route 53
3. Get the CloudFront domain from stack output: `CloudFrontDomainName`
4. At your domain registrar (or external DNS), add:
   ```
   Type:  CNAME
   Name:  votecapsule
   Value: <CloudFrontDomainName output>  (e.g. abc123.cloudfront.net)
   ```
5. For ACM certificate validation, the console will show the CNAME records to add

## GitHub Secrets Required (for CI/CD)

| Secret | Value |
|--------|-------|
| `AWS_DEPLOY_ROLE_ARN` | IAM role for deployments |
| `AWS_CDK_ROLE_ARN` | IAM role for CDK |
| `S3_PUBLIC_WEB_BUCKET` | From `VoteCapsule-PublicWebBucket` output |
| `CLOUDFRONT_DISTRIBUTION_ID` | From `VoteCapsule-CloudFrontDistributionId` output |
| `VITE_IDENTITY_API_URL` | `https://api.votecapsule.yna.co.ke/v1/identity` |
| `VITE_TENANT_API_URL` | `https://api.votecapsule.yna.co.ke/v1/tenant` |
| `VITE_GEOGRAPHY_API_URL` | `https://api.votecapsule.yna.co.ke/v1/geography` |
| `VITE_TRUST_API_URL` | `https://api.votecapsule.yna.co.ke/v1/trust` |
| `VITE_EVIDENCE_API_URL` | `https://api.votecapsule.yna.co.ke/v1/evidence` |
