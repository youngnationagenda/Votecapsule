/**
 * Vote Capsule™ — Cache Stack (Scaffold)
 * ElastiCache Redis cluster
 */

import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import { Construct } from 'constructs';

interface CacheStackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
}

export class VoteCapsuleCacheStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: CacheStackProps) {
    super(scope, id, props);

    const subnetGroup = new elasticache.CfnSubnetGroup(this, 'RedisSubnetGroup', {
      description: 'Vote Capsule Redis subnet group',
      subnetIds: props.vpc.privateSubnets.map((s) => s.subnetId),
      cacheSubnetGroupName: 'vote-capsule-redis-subnets',
    });

    // Redis cluster — single node for dev, cluster mode for production
    new elasticache.CfnReplicationGroup(this, 'RedisCluster', {
      replicationGroupDescription: 'Vote Capsule Redis Cache',
      replicationGroupId: 'vote-capsule-cache',
      cacheNodeType: 'cache.t3.micro',
      engine: 'redis',
      engineVersion: '7.1',
      numCacheClusters: 1,
      atRestEncryptionEnabled: true,
      transitEncryptionEnabled: true,
      cacheSubnetGroupName: subnetGroup.ref,
    });
  }
}
