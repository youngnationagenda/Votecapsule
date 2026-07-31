/**
 * Vote Capsule™ — Network Stack
 * VPC, subnets, security groups, NAT Gateway
 */

import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export class VoteCapsuleNetworkStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;
  public readonly dbSecurityGroup: ec2.SecurityGroup;
  public readonly serviceSecurityGroup: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props);

    // VPC — 3 AZs for production resilience
    this.vpc = new ec2.Vpc(this, 'VoteCapsuleVpc', {
      vpcName: 'vote-capsule-vpc',
      maxAzs: 3,
      natGateways: 1, // Cost-optimized for dev — increase to 3 for production
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'private-services',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        {
          cidrMask: 28,
          name: 'private-database',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
    });

    // Database security group
    this.dbSecurityGroup = new ec2.SecurityGroup(this, 'DatabaseSg', {
      vpc: this.vpc,
      securityGroupName: 'vote-capsule-database-sg',
      description: 'Security group for Aurora PostgreSQL',
    });

    // Service security group
    this.serviceSecurityGroup = new ec2.SecurityGroup(this, 'ServiceSg', {
      vpc: this.vpc,
      securityGroupName: 'vote-capsule-service-sg',
      description: 'Security group for ECS Fargate services',
    });

    // Allow services to connect to database
    this.dbSecurityGroup.addIngressRule(
      this.serviceSecurityGroup,
      ec2.Port.tcp(5432),
      'Allow services to connect to Aurora PostgreSQL',
    );

    new cdk.CfnOutput(this, 'VpcId', {
      value: this.vpc.vpcId,
      exportName: 'VoteCapsule-VpcId',
    });
  }
}
