/**
 * Fix Phase 7 task defs — these use container names vc-{service} (not {service}-service)
 * and load balancer container refs must match.
 */
const { execSync } = require('child_process');
const fs = require('fs');

const ACCOUNT = '683541453923';
const REGION = 'us-east-1';
const CLUSTER = 'vote-capsule-services';
const ECR = `${ACCOUNT}.dkr.ecr.${REGION}.amazonaws.com`;
const EXEC_ROLE = `arn:aws:iam::${ACCOUNT}:role/vote-capsule-ecs-task-execution-role`;
const ALB = 'http://vote-capsule-services-alb-181601180.us-east-1.elb.amazonaws.com';
const DB_SECRET  = `arn:aws:secretsmanager:us-east-1:${ACCOUNT}:secret:vote-capsule/database/credentials-zTDMLX`;
const JWT_SECRET = `arn:aws:secretsmanager:us-east-1:${ACCOUNT}:secret:vote-capsule/jwt/secret-bB2dDP`;
const FIREBASE_SECRET = `arn:aws:secretsmanager:us-east-1:${ACCOUNT}:secret:vote-capsule/firebase/service-account-RioPSx`;
const DB_REF  = `${DB_SECRET}:password::`;
const JWT_REF = `${JWT_SECRET}:secret::`;

// Phase 7 services use container name = "vc-{service}" (CloudFormation naming convention)
const PHASE7 = [
  {
    svcName: 'vc-notification', family: 'vc-notification', port: 3008,
    containerName: 'vc-notification',
    env: [
      {name:'PORT',value:'3008'},{name:'NODE_ENV',value:'production'},
      {name:'DB_HOST',value:'vote-capsule-db.cluster-c43i6c8ow71c.us-east-1.rds.amazonaws.com'},
      {name:'DB_PORT',value:'5432'},{name:'DB_NAME',value:'votecapsule'},{name:'DB_USER',value:'vcadmin'},
      {name:'DB_SSL',value:'true'},{name:'AWS_REGION',value:'us-east-1'},
      {name:'SES_FROM_ADDRESS',value:'noreply@votecapsule.co.ke'},
      {name:'IDENTITY_SERVICE_URL',value:`${ALB}/api/v1/identity`},
    ],
    secrets: [
      {name:'DB_PASSWORD',valueFrom:DB_REF},{name:'JWT_SECRET',valueFrom:JWT_REF},
      {name:'FIREBASE_SERVICE_ACCOUNT_JSON',valueFrom:FIREBASE_SECRET},
    ],
    tgArn: `arn:aws:elasticloadbalancing:us-east-1:${ACCOUNT}:targetgroup/vc-notification-tg/00fcb326e4a5313f`,
  },
  {
    svcName: 'vc-candidate', family: 'vc-candidate', port: 3009,
    containerName: 'vc-candidate',
    env: [
      {name:'PORT',value:'3009'},{name:'NODE_ENV',value:'production'},
      {name:'DB_HOST',value:'vote-capsule-db.cluster-c43i6c8ow71c.us-east-1.rds.amazonaws.com'},
      {name:'DB_PORT',value:'5432'},{name:'DB_NAME',value:'votecapsule'},{name:'DB_USER',value:'vcadmin'},
      {name:'DB_SSL',value:'true'},{name:'AWS_REGION',value:'us-east-1'},
      {name:'ALLOWED_ORIGINS',value:'https://votecapsule.yna.co.ke,https://party.votecapsule.yna.co.ke'},
    ],
    secrets: [{name:'DB_PASSWORD',valueFrom:DB_REF},{name:'JWT_SECRET',valueFrom:JWT_REF}],
    tgArn: `arn:aws:elasticloadbalancing:us-east-1:${ACCOUNT}:targetgroup/vc-candidate-tg/77a1234d977aa162`,
  },
  {
    svcName: 'vc-reporting', family: 'vc-reporting', port: 3010,
    containerName: 'vc-reporting',
    env: [
      {name:'PORT',value:'3010'},{name:'NODE_ENV',value:'production'},
      {name:'DB_HOST',value:'vote-capsule-db.cluster-c43i6c8ow71c.us-east-1.rds.amazonaws.com'},
      {name:'DB_PORT',value:'5432'},{name:'DB_NAME',value:'votecapsule'},{name:'DB_USER',value:'vcadmin'},
      {name:'DB_SSL',value:'true'},{name:'AWS_REGION',value:'us-east-1'},
      {name:'OPENSEARCH_ENDPOINT',value:'https://vpc-vote-capsule-search-2roaf6oxwjanzrtfdfra4ppcbu.us-east-1.es.amazonaws.com'},
      {name:'OPENSEARCH_REGION',value:'us-east-1'},
    ],
    secrets: [{name:'DB_PASSWORD',valueFrom:DB_REF},{name:'JWT_SECRET',valueFrom:JWT_REF}],
    tgArn: `arn:aws:elasticloadbalancing:us-east-1:${ACCOUNT}:targetgroup/vc-reporting-tg/22c4480fd47c20d3`,
  },
  {
    svcName: 'vc-election', family: 'vc-election', port: 3011,
    containerName: 'vc-election',
    env: [
      {name:'PORT',value:'3011'},{name:'NODE_ENV',value:'production'},
      {name:'DB_HOST',value:'vote-capsule-db.cluster-c43i6c8ow71c.us-east-1.rds.amazonaws.com'},
      {name:'DB_PORT',value:'5432'},{name:'DB_NAME',value:'votecapsule'},{name:'DB_USER',value:'vcadmin'},
      {name:'DB_SSL',value:'true'},{name:'AWS_REGION',value:'us-east-1'},
      {name:'CANDIDATE_SERVICE_URL',value:`${ALB}/api/v1/candidate`},
      {name:'GEOGRAPHY_SERVICE_URL',value:`${ALB}/api/v1/geography`},
      {name:'ALLOWED_ORIGINS',value:'https://votecapsule.yna.co.ke,https://authority.votecapsule.yna.co.ke'},
    ],
    secrets: [{name:'DB_PASSWORD',valueFrom:DB_REF},{name:'JWT_SECRET',valueFrom:JWT_REF}],
    tgArn: `arn:aws:elasticloadbalancing:us-east-1:${ACCOUNT}:targetgroup/vc-election-tg/10b863b800d18ae4`,
  },
];

function cli(cmd) {
  try {
    return JSON.parse(execSync(cmd, { encoding: 'utf8', maxBuffer: 10*1024*1024 }));
  } catch(e) {
    console.error('  ERR:', (e.message||'').slice(0,200));
    return null;
  }
}

async function main() {
  console.log('=== Fixing Phase 7 ECS task definitions ===\n');
  for (const svc of PHASE7) {
    console.log(`\n--- ${svc.svcName} ---`);
    const td = {
      family: svc.family, cpu: '512', memory: '1024',
      networkMode: 'awsvpc', requiresCompatibilities: ['FARGATE'],
      executionRoleArn: EXEC_ROLE, taskRoleArn: EXEC_ROLE,
      containerDefinitions: [{
        name: svc.containerName,  // ← must match what LoadBalancer registered
        image: `${ECR}/vote-capsule/${svc.svcName.replace('vc-','')}-service:latest`,
        portMappings: [{containerPort: svc.port, protocol: 'tcp'}],
        essential: true,
        environment: svc.env,
        secrets: svc.secrets,
        logConfiguration: {
          logDriver: 'awslogs',
          options: {
            'awslogs-group': `/vote-capsule/${svc.svcName.replace('vc-','')}-service`,
            'awslogs-region': REGION,
            'awslogs-stream-prefix': svc.svcName.replace('vc-',''),
            'awslogs-create-group': 'true',
          },
        },
        healthCheck: {
          command: ['CMD-SHELL', `curl -f http://localhost:${svc.port}/api/v1/${svc.svcName.replace('vc-','')}/health || exit 1`],
          interval: 30, timeout: 10, retries: 5, startPeriod: 120,
        },
      }],
    };
    const tdFile = `D:/Votecapsule/vote-capsule/infrastructure/scripts/td-p7-${svc.svcName}.json`;
    fs.writeFileSync(tdFile, JSON.stringify(td, null, 2));
    const reg = cli(`aws ecs register-task-definition --cli-input-json "file://${tdFile}" --region ${REGION} --output json`);
    if (!reg) continue;
    const rev = reg.taskDefinition.revision;
    console.log(`  TD: ${svc.family}:${rev}`);
    const upd = cli(`aws ecs update-service --cluster ${CLUSTER} --service ${svc.svcName} --task-definition ${svc.family}:${rev} --force-new-deployment --region ${REGION} --output json`);
    console.log(upd ? `  ✅ Updated → :${rev}` : `  ❌ Failed`);
  }
  console.log('\nDone.');
}
main().catch(console.error);
