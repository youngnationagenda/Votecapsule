/**
 * Vote Capsule™ — Hosting Stack
 *
 * Provisions the public-facing website at https://votecapsule.yna.co.ke
 *
 * Architecture:
 *   S3 Bucket (private) → CloudFront (HTTPS) → votecapsule.yna.co.ke
 *
 * ACM Certificate must be in us-east-1 (CloudFront requirement).
 * Route 53 A record (ALIAS) points to the CloudFront distribution.
 *
 * If yna.co.ke hosted zone is NOT in this AWS account, the stack outputs
 * the CNAME validation record and the CloudFront domain for manual DNS setup.
 *
 * Deploy:
 *   pnpm cdk deploy VoteCapsuleHostingStack
 */

import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53targets from 'aws-cdk-lib/aws-route53-targets';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';

export class VoteCapsuleHostingStack extends cdk.Stack {
  public readonly distribution: cloudfront.Distribution;
  public readonly bucket: s3.Bucket;
  public readonly certificate: acm.Certificate;

  constructor(scope: Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props);

    // ── S3 Bucket for static site assets ─────────────────────────────────
    // Block all public access — served ONLY through CloudFront (OAC)
    this.bucket = new s3.Bucket(this, 'PublicWebBucket', {
      bucketName: `vote-capsule-public-web-${this.account}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      versioned: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // ── ACM Certificate (must be in us-east-1 for CloudFront) ────────────
    // DNS validation — add the CNAME to yna.co.ke DNS if not in Route 53
    this.certificate = new acm.Certificate(this, 'VoteCapsuleCertificate', {
      domainName: 'votecapsule.yna.co.ke',
      subjectAlternativeNames: [
        'admin.votecapsule.yna.co.ke', // Super Admin Portal subdomain
        'api.votecapsule.yna.co.ke',   // API Gateway subdomain (Task 6)
      ],
      validation: acm.CertificateValidation.fromDns(), // Outputs CNAME records for manual DNS entry
    });

    // ── CloudFront Distribution ───────────────────────────────────────────
    // OAC (Origin Access Control) — modern replacement for OAI
    const oac = new cloudfront.S3OriginAccessControl(this, 'S3OAC', {
      description: 'Vote Capsule Public Web OAC',
      signing: cloudfront.Signing.SIGV4_NO_OVERRIDE,
    });

    this.distribution = new cloudfront.Distribution(this, 'PublicWebDistribution', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(this.bucket, {
          originAccessControl: oac,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        compress: true,
      },
      additionalBehaviors: {
        // Never cache index.html — must always be fresh for React Router SPA
        '/index.html': {
          origin: origins.S3BucketOrigin.withOriginAccessControl(this.bucket, {
            originAccessControl: oac,
          }),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        },
      },
      // React Router SPA: all paths serve index.html with 200 (not 403/404)
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.seconds(0),
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.seconds(0),
        },
      ],
      certificate: this.certificate,
      domainNames: ['votecapsule.yna.co.ke'],
      defaultRootObject: 'index.html',
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100, // US, EU, Asia (covers Kenya via Singapore/Mumbai PoPs)
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      comment: 'Vote Capsule™ Public Web — votecapsule.yna.co.ke',
    });

    // Grant CloudFront OAC access to the S3 bucket
    this.bucket.addToResourcePolicy(
      new cdk.aws_iam.PolicyStatement({
        principals: [new cdk.aws_iam.ServicePrincipal('cloudfront.amazonaws.com')],
        actions: ['s3:GetObject'],
        resources: [this.bucket.arnForObjects('*')],
        conditions: {
          StringEquals: {
            'AWS:SourceArn': `arn:aws:cloudfront::${this.account}:distribution/${this.distribution.distributionId}`,
          },
        },
      }),
    );

    // ── Route 53 (only if yna.co.ke hosted zone exists in this account) ──
    // Comment this out if yna.co.ke is managed externally — use the CNAME outputs instead
    const hostedZone = route53.HostedZone.fromLookup(this, 'YnaHostedZone', {
      domainName: 'yna.co.ke',
    });

    new route53.ARecord(this, 'VoteCapsuleARecord', {
      zone: hostedZone,
      recordName: 'votecapsule',
      target: route53.RecordTarget.fromAlias(
        new route53targets.CloudFrontTarget(this.distribution),
      ),
    });

    // ── Outputs ───────────────────────────────────────────────────────────
    new cdk.CfnOutput(this, 'CloudFrontDistributionId', {
      value: this.distribution.distributionId,
      description: 'CloudFront Distribution ID — needed for cache invalidation in CI/CD',
      exportName: 'VoteCapsule-CloudFrontDistributionId',
    });

    new cdk.CfnOutput(this, 'CloudFrontDomainName', {
      value: this.distribution.distributionDomainName,
      description: 'CloudFront *.cloudfront.net domain — for debugging',
      exportName: 'VoteCapsule-CloudFrontDomain',
    });

    new cdk.CfnOutput(this, 'S3BucketName', {
      value: this.bucket.bucketName,
      description: 'S3 bucket for public web static assets — used by CI/CD deploy step',
      exportName: 'VoteCapsule-PublicWebBucket',
    });

    new cdk.CfnOutput(this, 'CertificateArn', {
      value: this.certificate.certificateArn,
      description: 'ACM Certificate ARN for votecapsule.yna.co.ke',
      exportName: 'VoteCapsule-CertificateArn',
    });

    new cdk.CfnOutput(this, 'PublicUrl', {
      value: 'https://votecapsule.yna.co.ke',
      description: 'Public URL of the Vote Capsule platform',
    });

    // ── DNS Manual Setup Notice ───────────────────────────────────────────
    // If Route 53 lookup above fails (zone not in this account):
    // 1. Comment out the hostedZone + ARecord blocks above
    // 2. In your DNS provider for yna.co.ke, add:
    //    Type: CNAME
    //    Name: votecapsule
    //    Value: <CloudFrontDomainName output>
    // 3. For ACM certificate validation, the stack will output CNAME records to add
  }
}
