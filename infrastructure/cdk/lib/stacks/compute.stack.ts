/**
 * Vote Capsule™ — Compute Stack (Scaffold)
 * ECS Fargate clusters for microservices
 */

import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import { Construct } from 'constructs';

interface ComputeStackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
}

export class VoteCapsuleComputeStack extends cdk.Stack {
  public readonly cluster: ecs.Cluster;

  constructor(scope: Construct, id: string, props: ComputeStackProps) {
    super(scope, id, props);

    // ECS Cluster
    this.cluster = new ecs.Cluster(this, 'VoteCapsuleCluster', {
      clusterName: 'vote-capsule-services',
      vpc: props.vpc,
      containerInsights: true,
    });

    // TODO: Add task definitions and services in Phase 2
    // Each microservice gets its own Fargate task definition

    new cdk.CfnOutput(this, 'ClusterArn', {
      value: this.cluster.clusterArn,
      exportName: 'VoteCapsule-EcsClusterArn',
    });
  }
}
