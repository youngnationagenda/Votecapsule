/**
 * Deploy core ECS services using AWS SDK directly (no CloudFormation size limit)
 * Deploys: identity, tenant, trust, geography, evidence, ai, workflow
 */
const { ECSClient, RegisterTaskDefinitionCommand, CreateServiceCommand, DescribeServicesCommand } = require('@aws-sdk/client-ecs');
const { ElasticLoadBalancingV2Client, CreateTargetGroupCommand, CreateRuleCommand, DescribeListenersCommand } = require('@aws-sdk/client-elastic-load-balancing-v2');
const { EC2Client, CreateSecurityGroupCommand, AuthorizeSecurityGroupIngressCommand } = require('@aws-sdk/client-ec2');

const REGION = 'us-east-1';
const ACCOUNT = '683541453923';
const CLUSTER = 'vote-capsule-services';
const VPC_ID = 'vpc-0ae6f8630af9fbfdc';
const SUBNETS = ['subnet-0aa1a58541c87ae2a','subnet-0171d821c5d5ae868','subnet-09604eb63697ac228','subnet-0be09dbd825b75c07'];
const EXECUTION_ROLE = `arn:aws:iam::${ACCOUNT}:role/vote-capsule-ecs-task-execution-role`;
const LISTENER_ARN = `arn:aws:elasticloadbalancing:us-east-1:${ACCOUNT}:listener/app/vote-capsule-services-alb/aef21c0dc2379121/8cfcb22850289df4`;
const DB_SECRET_ARN = `arn:aws:secretsmanager:us-east-1:${ACCOUNT}:secret:vote-capsule/database/credentials-zTDMLX`;
const JWT_SECRET_ARN = `arn:aws:secretsmanager:us-east-1:${ACCOUNT}:secret:vote-capsule/jwt/secret-bB2dDP`;
const HEDERA_SECRET_ARN = `arn:aws:secretsmanager:us-east-1:${ACCOUNT}:secret:vote-capsule/hedera/credentials-gB1zWE`;

const ecs = new ECSClient({ region: REGION });
const elbv2 = new ElasticLoadBalancingV2Client({ region: REGION });
const ec2 = new EC2Client({ region: REGION });

const SERVICES = [
  {
    name: 'identity',
    port: 3001,
    path: '/api/v1/identity/*',
    priority: 10,
    env: [
      { name: 'PORT', value: '3001' },
      { name: 'NODE_ENV', value: 'production' },
      { name: 'DB_HOST', value: 'vote-capsule-db.cluster-c43i6c8ow71c.us-east-1.rds.amazonaws.com' },
      { name: 'DB_PORT', value: '5432' }, { name: 'DB_NAME', value: 'votecapsule' },
      { name: 'DB_USER', value: 'vcadmin' }, { name: 'DB_SSL', value: 'true' },
      { name: 'DB_LOGGING', value: 'false' }, { name: 'JWT_EXPIRES_IN', value: '1h' },
      { name: 'AWS_REGION', value: 'us-east-1' },
      { name: 'COGNITO_CLIENT_ID', value: '3hi86ci06546ki038k6msmik0s' },
      { name: 'REDIS_HOST', value: 'vote-capsule-redis.1n5h3m.ng.0001.use1.cache.amazonaws.com' },
      { name: 'REDIS_PORT', value: '6379' },
      { name: 'ALLOWED_ORIGINS', value: 'https://votecapsule.yna.co.ke,https://authority.votecapsule.yna.co.ke' },
    ],
    secrets: [
      { name: 'DB_PASSWORD', valueFrom: `${DB_SECRET_ARN}:password::` },
      { name: 'JWT_SECRET', valueFrom: `${JWT_SECRET_ARN}:jwt_secret::` },
    ],
  },
  {
    name: 'tenant',
    port: 3002,
    path: '/api/v1/tenant/*',
    priority: 20,
    env: [
      { name: 'PORT', value: '3002' }, { name: 'NODE_ENV', value: 'production' },
      { name: 'DB_HOST', value: 'vote-capsule-db.cluster-c43i6c8ow71c.us-east-1.rds.amazonaws.com' },
      { name: 'DB_PORT', value: '5432' }, { name: 'DB_NAME', value: 'votecapsule' },
      { name: 'DB_USER', value: 'vcadmin' }, { name: 'DB_SSL', value: 'true' },
      { name: 'AWS_REGION', value: 'us-east-1' },
      { name: 'ALLOWED_ORIGINS', value: 'https://votecapsule.yna.co.ke' },
    ],
    secrets: [
      { name: 'DB_PASSWORD', valueFrom: `${DB_SECRET_ARN}:password::` },
      { name: 'JWT_SECRET', valueFrom: `${JWT_SECRET_ARN}:jwt_secret::` },
    ],
  },
  {
    name: 'trust',
    port: 3003,
    path: '/api/v1/trust/*',
    priority: 30,
    env: [
      { name: 'PORT', value: '3003' }, { name: 'NODE_ENV', value: 'production' },
      { name: 'DB_HOST', value: 'vote-capsule-db.cluster-c43i6c8ow71c.us-east-1.rds.amazonaws.com' },
      { name: 'DB_PORT', value: '5432' }, { name: 'DB_NAME', value: 'votecapsule' },
      { name: 'DB_USER', value: 'vcadmin' }, { name: 'DB_SSL', value: 'true' },
      { name: 'AWS_REGION', value: 'us-east-1' },
      { name: 'HEDERA_NETWORK', value: 'testnet' },
      { name: 'TSA_URL', value: 'https://freetsa.org/tsr' },
      { name: 'MERKLE_BATCH_INTERVAL_MS', value: '60000' },
      { name: 'S3_EVIDENCE_BUCKET', value: `vote-capsule-evidence-vault-${ACCOUNT}` },
    ],
    secrets: [
      { name: 'DB_PASSWORD', valueFrom: `${DB_SECRET_ARN}:password::` },
      { name: 'JWT_SECRET', valueFrom: `${JWT_SECRET_ARN}:jwt_secret::` },
      { name: 'HEDERA_OPERATOR_ID', valueFrom: `${HEDERA_SECRET_ARN}:accountId::` },
      { name: 'HEDERA_OPERATOR_KEY', valueFrom: `${HEDERA_SECRET_ARN}:privateKey::` },
    ],
  },
  {
    name: 'geography',
    port: 3004,
    path: '/api/v1/geography/*',
    priority: 40,
    env: [
      { name: 'PORT', value: '3004' }, { name: 'NODE_ENV', value: 'production' },
      { name: 'DB_HOST', value: 'vote-capsule-db.cluster-c43i6c8ow71c.us-east-1.rds.amazonaws.com' },
      { name: 'DB_PORT', value: '5432' }, { name: 'DB_NAME', value: 'votecapsule' },
      { name: 'DB_USER', value: 'vcadmin' }, { name: 'DB_SSL', value: 'true' },
      { name: 'AWS_REGION', value: 'us-east-1' },
      { name: 'ALLOWED_ORIGINS', value: '*' },
    ],
    secrets: [
      { name: 'DB_PASSWORD', valueFrom: `${DB_SECRET_ARN}:password::` },
    ],
  },
  {
    name: 'evidence',
    port: 3005,
    path: '/api/v1/evidence/*',
    priority: 50,
    env: [
      { name: 'PORT', value: '3005' }, { name: 'NODE_ENV', value: 'production' },
      { name: 'DB_HOST', value: 'vote-capsule-db.cluster-c43i6c8ow71c.us-east-1.rds.amazonaws.com' },
      { name: 'DB_PORT', value: '5432' }, { name: 'DB_NAME', value: 'votecapsule' },
      { name: 'DB_USER', value: 'vcadmin' }, { name: 'DB_SSL', value: 'true' },
      { name: 'AWS_REGION', value: 'us-east-1' },
      { name: 'S3_EVIDENCE_BUCKET', value: `vote-capsule-evidence-vault-${ACCOUNT}` },
      { name: 'SQS_VALIDATION_URL', value: `https://sqs.us-east-1.amazonaws.com/${ACCOUNT}/votecapsule-validation` },
      { name: 'REDIS_HOST', value: 'vote-capsule-redis.1n5h3m.ng.0001.use1.cache.amazonaws.com' },
      { name: 'REDIS_PORT', value: '6379' },
    ],
    secrets: [
      { name: 'DB_PASSWORD', valueFrom: `${DB_SECRET_ARN}:password::` },
      { name: 'JWT_SECRET', valueFrom: `${JWT_SECRET_ARN}:jwt_secret::` },
    ],
  },
  {
    name: 'ai',
    port: 3006,
    path: '/api/v1/ai/*',
    priority: 60,
    env: [
      { name: 'PORT', value: '3006' }, { name: 'NODE_ENV', value: 'production' },
      { name: 'DB_HOST', value: 'vote-capsule-db.cluster-c43i6c8ow71c.us-east-1.rds.amazonaws.com' },
      { name: 'DB_PORT', value: '5432' }, { name: 'DB_NAME', value: 'votecapsule' },
      { name: 'DB_USER', value: 'vcadmin' }, { name: 'DB_SSL', value: 'true' },
      { name: 'AWS_REGION', value: 'us-east-1' },
      { name: 'S3_EVIDENCE_BUCKET', value: `vote-capsule-evidence-vault-${ACCOUNT}` },
      { name: 'SQS_VALIDATION_URL', value: `https://sqs.us-east-1.amazonaws.com/${ACCOUNT}/votecapsule-validation` },
    ],
    secrets: [
      { name: 'DB_PASSWORD', valueFrom: `${DB_SECRET_ARN}:password::` },
      { name: 'JWT_SECRET', valueFrom: `${JWT_SECRET_ARN}:jwt_secret::` },
    ],
  },
  {
    name: 'workflow',
    port: 3007,
    path: '/api/v1/workflow/*',
    priority: 70,
    env: [
      { name: 'PORT', value: '3007' }, { name: 'NODE_ENV', value: 'production' },
      { name: 'DB_HOST', value: 'vote-capsule-db.cluster-c43i6c8ow71c.us-east-1.rds.amazonaws.com' },
      { name: 'DB_PORT', value: '5432' }, { name: 'DB_NAME', value: 'votecapsule' },
      { name: 'DB_USER', value: 'vcadmin' }, { name: 'DB_SSL', value: 'true' },
      { name: 'AWS_REGION', value: 'us-east-1' },
      { name: 'EVENTBRIDGE_BUS', value: 'votecapsule-events' },
    ],
    secrets: [
      { name: 'DB_PASSWORD', valueFrom: `${DB_SECRET_ARN}:password::` },
      { name: 'JWT_SECRET', valueFrom: `${JWT_SECRET_ARN}:jwt_secret::` },
    ],
  },
];

async function createSG(name, port) {
  console.log(`  Creating SG for ${name}...`);
  try {
    const sg = await ec2.send(new CreateSecurityGroupCommand({
      GroupName: `vc-${name}-sg`,
      Description: `VoteCapsule ${name} service`,
      VpcId: VPC_ID,
    }));
    const sgId = sg.GroupId;
    await ec2.send(new AuthorizeSecurityGroupIngressCommand({
      GroupId: sgId,
      IpPermissions: [{ IpProtocol: 'tcp', FromPort: port, ToPort: port, IpRanges: [{ CidrIp: '0.0.0.0/0' }] }],
    }));
    return sgId;
  } catch (e) {
    if (e.message && e.message.includes('already exists')) {
      console.log(`  SG vc-${name}-sg already exists, looking up...`);
      const { EC2Client: EC2C, DescribeSecurityGroupsCommand } = require('@aws-sdk/client-ec2');
      const ec2b = new EC2C({ region: REGION });
      const r = await ec2b.send(new DescribeSecurityGroupsCommand({ Filters: [{ Name: 'group-name', Values: [`vc-${name}-sg`] }, { Name: 'vpc-id', Values: [VPC_ID] }] }));
      return r.SecurityGroups[0].GroupId;
    }
    throw e;
  }
}

async function createTG(name, port) {
  console.log(`  Creating Target Group for ${name}...`);
  const r = await elbv2.send(new CreateTargetGroupCommand({
    Name: `vc-${name}-tg`,
    Protocol: 'HTTP',
    Port: port,
    VpcId: VPC_ID,
    TargetType: 'ip',
    HealthCheckPath: `/api/v1/${name}/health`,
    HealthCheckIntervalSeconds: 30,
    HealthCheckTimeoutSeconds: 5,
    HealthyThresholdCount: 2,
    UnhealthyThresholdCount: 3,
    Matcher: { HttpCode: '200,404' },
  }));
  return r.TargetGroups[0].TargetGroupArn;
}

async function createALBRule(tgArn, path, priority) {
  console.log(`  Creating ALB rule priority ${priority} for ${path}...`);
  try {
    await elbv2.send(new CreateRuleCommand({
      ListenerArn: LISTENER_ARN,
      Priority: priority,
      Conditions: [{ Field: 'path-pattern', Values: [path] }],
      Actions: [{ Type: 'forward', TargetGroupArn: tgArn }],
    }));
  } catch (e) {
    if (e.message && (e.message.includes('already exists') || e.message.includes('PriorityInUse'))) {
      console.log(`  Rule at priority ${priority} already exists — skipping`);
    } else throw e;
  }
}

async function registerTaskDef(svc, logGroupName) {
  console.log(`  Registering task definition for ${svc.name}...`);
  const r = await ecs.send(new RegisterTaskDefinitionCommand({
    family: `vc-${svc.name}`,
    cpu: '512',
    memory: '1024',
    networkMode: 'awsvpc',
    requiresCompatibilities: ['FARGATE'],
    executionRoleArn: EXECUTION_ROLE,
    taskRoleArn: EXECUTION_ROLE,
    containerDefinitions: [{
      name: `${svc.name}-service`,
      image: `${ACCOUNT}.dkr.ecr.${REGION}.amazonaws.com/vote-capsule/${svc.name}-service:latest`,
      portMappings: [{ containerPort: svc.port, protocol: 'tcp' }],
      essential: true,
      environment: svc.env,
      secrets: svc.secrets,
      logConfiguration: {
        logDriver: 'awslogs',
        options: {
          'awslogs-group': logGroupName,
          'awslogs-region': REGION,
          'awslogs-stream-prefix': svc.name,
          'awslogs-create-group': 'true',
        },
      },
      healthCheck: {
        command: ['CMD-SHELL', `curl -f http://localhost:${svc.port}/api/v1/${svc.name}/health || exit 1`],
        interval: 30, timeout: 5, retries: 3, startPeriod: 90,
      },
    }],
  }));
  return r.taskDefinition.taskDefinitionArn;
}

async function createOrUpdateService(svc, tdArn, tgArn, sgId) {
  console.log(`  Creating ECS service for ${svc.name}...`);
  // Check if service exists
  try {
    const existing = await ecs.send(new DescribeServicesCommand({ cluster: CLUSTER, services: [`vc-${svc.name}`] }));
    if (existing.services && existing.services[0] && existing.services[0].status !== 'INACTIVE') {
      console.log(`  Service vc-${svc.name} already exists — updating task def...`);
      const { ECSClient: ECSC, UpdateServiceCommand } = require('@aws-sdk/client-ecs');
      const ecsb = new ECSC({ region: REGION });
      await ecsb.send(new UpdateServiceCommand({ cluster: CLUSTER, service: `vc-${svc.name}`, taskDefinition: tdArn, desiredCount: 1 }));
      return;
    }
  } catch (_) {}
  
  await ecs.send(new CreateServiceCommand({
    cluster: CLUSTER,
    serviceName: `vc-${svc.name}`,
    taskDefinition: tdArn,
    desiredCount: 1,
    launchType: 'FARGATE',
    networkConfiguration: {
      awsvpcConfiguration: { subnets: SUBNETS, securityGroups: [sgId], assignPublicIp: 'ENABLED' },
    },
    loadBalancers: [{ containerName: `${svc.name}-service`, containerPort: svc.port, targetGroupArn: tgArn }],
    deploymentConfiguration: { minimumHealthyPercent: 50, maximumPercent: 200 },
    healthCheckGracePeriodSeconds: 120,
  }));
}

async function main() {
  console.log('Deploying VoteCapsule core ECS services...\n');
  
  for (const svc of SERVICES) {
    console.log(`\n=== ${svc.name.toUpperCase()} (port ${svc.port}) ===`);
    try {
      const sgId = await createSG(svc.name, svc.port);
      console.log(`  SG: ${sgId}`);
      
      const tgArn = await createTG(svc.name, svc.port);
      console.log(`  TG: ${tgArn}`);
      
      await createALBRule(tgArn, svc.path, svc.priority);
      
      const tdArn = await registerTaskDef(svc, `/vote-capsule/${svc.name}-service`);
      console.log(`  TD: ${tdArn}`);
      
      await createOrUpdateService(svc, tdArn, tgArn, sgId);
      console.log(`  ✅ ${svc.name} service deployed`);
    } catch (e) {
      console.error(`  ❌ ${svc.name} FAILED: ${e.message}`);
    }
  }
  
  console.log('\nDone!');
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
