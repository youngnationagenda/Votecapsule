/**
 * Fix ALL ECS task definitions — correct JWT secret key (:secret:: not :jwt_secret::)
 * and force new deployment on ALL 13 services.
 * Run once after CI has pushed new images.
 */
const { execSync } = require('child_process');
const fs = require('fs');

const ACCOUNT = '683541453923';
const REGION = 'us-east-1';
const CLUSTER = 'vote-capsule-services';
const ECR = `${ACCOUNT}.dkr.ecr.${REGION}.amazonaws.com`;
const EXEC_ROLE = `arn:aws:iam::${ACCOUNT}:role/vote-capsule-ecs-task-execution-role`;
const SUBNETS = ['subnet-0aa1a58541c87ae2a','subnet-0171d821c5d5ae868','subnet-09604eb63697ac228','subnet-0be09dbd825b75c07'];

const DB_SECRET  = `arn:aws:secretsmanager:us-east-1:${ACCOUNT}:secret:vote-capsule/database/credentials-zTDMLX`;
const JWT_SECRET = `arn:aws:secretsmanager:us-east-1:${ACCOUNT}:secret:vote-capsule/jwt/secret-bB2dDP`;
const HEDERA_SECRET = `arn:aws:secretsmanager:us-east-1:${ACCOUNT}:secret:vote-capsule/hedera/credentials-gB1zWE`;
const FIREBASE_SECRET = `arn:aws:secretsmanager:us-east-1:${ACCOUNT}:secret:vote-capsule/firebase/service-account-RioPSx`;

const ALB = 'http://vote-capsule-services-alb-181601180.us-east-1.elb.amazonaws.com';

// Correct key refs
const DB_REF  = `${DB_SECRET}:password::`;
const JWT_REF = `${JWT_SECRET}:secret::`;  // ← CORRECT key is "secret" not "jwt_secret"

const ALL_SERVICES = [
  {
    name: 'identity', port: 3001,
    env: [
      {name:'PORT',value:'3001'},{name:'NODE_ENV',value:'production'},
      {name:'DB_HOST',value:'vote-capsule-db.cluster-c43i6c8ow71c.us-east-1.rds.amazonaws.com'},
      {name:'DB_PORT',value:'5432'},{name:'DB_NAME',value:'votecapsule'},{name:'DB_USER',value:'vcadmin'},
      {name:'DB_SSL',value:'true'},{name:'DB_LOGGING',value:'false'},{name:'JWT_EXPIRES_IN',value:'1h'},
      {name:'AWS_REGION',value:'us-east-1'},{name:'COGNITO_CLIENT_ID',value:'3hi86ci06546ki038k6msmik0s'},
      {name:'REDIS_HOST',value:'vote-capsule-redis.1n5h3m.ng.0001.use1.cache.amazonaws.com'},{name:'REDIS_PORT',value:'6379'},
      {name:'ALLOWED_ORIGINS',value:'https://votecapsule.yna.co.ke,https://authority.votecapsule.yna.co.ke,https://party.votecapsule.yna.co.ke,https://candidate.votecapsule.yna.co.ke,https://observer.votecapsule.yna.co.ke'},
    ],
    secrets: [{name:'DB_PASSWORD',valueFrom:DB_REF},{name:'JWT_SECRET',valueFrom:JWT_REF}],
  },
  {
    name: 'tenant', port: 3002,
    env: [
      {name:'PORT',value:'3002'},{name:'NODE_ENV',value:'production'},
      {name:'DB_HOST',value:'vote-capsule-db.cluster-c43i6c8ow71c.us-east-1.rds.amazonaws.com'},
      {name:'DB_PORT',value:'5432'},{name:'DB_NAME',value:'votecapsule'},{name:'DB_USER',value:'vcadmin'},
      {name:'DB_SSL',value:'true'},{name:'AWS_REGION',value:'us-east-1'},
      {name:'ALLOWED_ORIGINS',value:'https://votecapsule.yna.co.ke'},
    ],
    secrets: [{name:'DB_PASSWORD',valueFrom:DB_REF},{name:'JWT_SECRET',valueFrom:JWT_REF}],
  },
  {
    name: 'trust', port: 3003,
    env: [
      {name:'PORT',value:'3003'},{name:'NODE_ENV',value:'production'},
      {name:'DB_HOST',value:'vote-capsule-db.cluster-c43i6c8ow71c.us-east-1.rds.amazonaws.com'},
      {name:'DB_PORT',value:'5432'},{name:'DB_NAME',value:'votecapsule'},{name:'DB_USER',value:'vcadmin'},
      {name:'DB_SSL',value:'true'},{name:'AWS_REGION',value:'us-east-1'},
      {name:'HEDERA_NETWORK',value:'testnet'},{name:'TSA_URL',value:'https://freetsa.org/tsr'},
      {name:'MERKLE_BATCH_INTERVAL_MS',value:'60000'},
      {name:'S3_EVIDENCE_BUCKET',value:`vote-capsule-evidence-vault-${ACCOUNT}`},
      {name:'EVIDENCE_SERVICE_URL',value:`${ALB}/api/v1/evidence`},
    ],
    secrets: [
      {name:'DB_PASSWORD',valueFrom:DB_REF},{name:'JWT_SECRET',valueFrom:JWT_REF},
      {name:'HEDERA_OPERATOR_ID',valueFrom:`${HEDERA_SECRET}:accountId::`},
      {name:'HEDERA_OPERATOR_KEY',valueFrom:`${HEDERA_SECRET}:privateKey::`},
    ],
  },
  {
    name: 'geography', port: 3004,
    env: [
      {name:'PORT',value:'3004'},{name:'NODE_ENV',value:'production'},
      {name:'DB_HOST',value:'vote-capsule-db.cluster-c43i6c8ow71c.us-east-1.rds.amazonaws.com'},
      {name:'DB_PORT',value:'5432'},{name:'DB_NAME',value:'votecapsule'},{name:'DB_USER',value:'vcadmin'},
      {name:'DB_SSL',value:'true'},{name:'AWS_REGION',value:'us-east-1'},{name:'ALLOWED_ORIGINS',value:'*'},
    ],
    secrets: [{name:'DB_PASSWORD',valueFrom:DB_REF}],
  },
  {
    name: 'evidence', port: 3005,
    env: [
      {name:'PORT',value:'3005'},{name:'NODE_ENV',value:'production'},
      {name:'DB_HOST',value:'vote-capsule-db.cluster-c43i6c8ow71c.us-east-1.rds.amazonaws.com'},
      {name:'DB_PORT',value:'5432'},{name:'DB_NAME',value:'votecapsule'},{name:'DB_USER',value:'vcadmin'},
      {name:'DB_SSL',value:'true'},{name:'AWS_REGION',value:'us-east-1'},
      {name:'S3_EVIDENCE_BUCKET',value:`vote-capsule-evidence-vault-${ACCOUNT}`},
      {name:'SQS_VALIDATION_URL',value:`https://sqs.us-east-1.amazonaws.com/${ACCOUNT}/votecapsule-validation`},
      {name:'REDIS_HOST',value:'vote-capsule-redis.1n5h3m.ng.0001.use1.cache.amazonaws.com'},{name:'REDIS_PORT',value:'6379'},
      {name:'GEOGRAPHY_SERVICE_URL',value:`${ALB}/api/v1/geography`},
    ],
    secrets: [{name:'DB_PASSWORD',valueFrom:DB_REF},{name:'JWT_SECRET',valueFrom:JWT_REF}],
  },
  {
    name: 'ai', port: 3006,
    env: [
      {name:'PORT',value:'3006'},{name:'NODE_ENV',value:'production'},
      {name:'DB_HOST',value:'vote-capsule-db.cluster-c43i6c8ow71c.us-east-1.rds.amazonaws.com'},
      {name:'DB_PORT',value:'5432'},{name:'DB_NAME',value:'votecapsule'},{name:'DB_USER',value:'vcadmin'},
      {name:'DB_SSL',value:'true'},{name:'AWS_REGION',value:'us-east-1'},
      {name:'S3_EVIDENCE_BUCKET',value:`vote-capsule-evidence-vault-${ACCOUNT}`},
      {name:'SQS_VALIDATION_URL',value:`https://sqs.us-east-1.amazonaws.com/${ACCOUNT}/votecapsule-validation`},
      {name:'GEOGRAPHY_SERVICE_URL',value:`${ALB}/api/v1/geography`},
      {name:'EVIDENCE_SERVICE_URL',value:`${ALB}/api/v1/evidence`},
    ],
    secrets: [{name:'DB_PASSWORD',valueFrom:DB_REF},{name:'JWT_SECRET',valueFrom:JWT_REF}],
  },
  {
    name: 'workflow', port: 3007,
    env: [
      {name:'PORT',value:'3007'},{name:'NODE_ENV',value:'production'},
      {name:'DB_HOST',value:'vote-capsule-db.cluster-c43i6c8ow71c.us-east-1.rds.amazonaws.com'},
      {name:'DB_PORT',value:'5432'},{name:'DB_NAME',value:'votecapsule'},{name:'DB_USER',value:'vcadmin'},
      {name:'DB_SSL',value:'true'},{name:'AWS_REGION',value:'us-east-1'},
      {name:'EVENTBRIDGE_BUS',value:'votecapsule-events'},
      {name:'EVIDENCE_SERVICE_URL',value:`${ALB}/api/v1/evidence`},
      {name:'AI_SERVICE_URL',value:`${ALB}/api/v1/ai`},
      {name:'GEOGRAPHY_SERVICE_URL',value:`${ALB}/api/v1/geography`},
      {name:'TRUST_SERVICE_URL',value:`${ALB}/api/v1/trust`},
      {name:'IDENTITY_SERVICE_URL',value:`${ALB}/api/v1/identity`},
    ],
    secrets: [{name:'DB_PASSWORD',valueFrom:DB_REF},{name:'JWT_SECRET',valueFrom:JWT_REF}],
  },
  {
    name: 'notification', port: 3008,
    env: [
      {name:'PORT',value:'3008'},{name:'NODE_ENV',value:'production'},
      {name:'DB_HOST',value:'vote-capsule-db.cluster-c43i6c8ow71c.us-east-1.rds.amazonaws.com'},
      {name:'DB_PORT',value:'5432'},{name:'DB_NAME',value:'votecapsule'},{name:'DB_USER',value:'vcadmin'},
      {name:'DB_SSL',value:'true'},{name:'AWS_REGION',value:'us-east-1'},
      {name:'SES_FROM_ADDRESS',value:'noreply@votecapsule.co.ke'},
      {name:'SNS_REGION',value:'us-east-1'},
      {name:'IDENTITY_SERVICE_URL',value:`${ALB}/api/v1/identity`},
    ],
    secrets: [
      {name:'DB_PASSWORD',valueFrom:DB_REF},{name:'JWT_SECRET',valueFrom:JWT_REF},
      {name:'FIREBASE_SERVICE_ACCOUNT_JSON',valueFrom:`${FIREBASE_SECRET}`},
    ],
  },
  {
    name: 'candidate', port: 3009,
    env: [
      {name:'PORT',value:'3009'},{name:'NODE_ENV',value:'production'},
      {name:'DB_HOST',value:'vote-capsule-db.cluster-c43i6c8ow71c.us-east-1.rds.amazonaws.com'},
      {name:'DB_PORT',value:'5432'},{name:'DB_NAME',value:'votecapsule'},{name:'DB_USER',value:'vcadmin'},
      {name:'DB_SSL',value:'true'},{name:'AWS_REGION',value:'us-east-1'},
      {name:'ALLOWED_ORIGINS',value:'https://votecapsule.yna.co.ke,https://party.votecapsule.yna.co.ke,https://candidate.votecapsule.yna.co.ke'},
    ],
    secrets: [{name:'DB_PASSWORD',valueFrom:DB_REF},{name:'JWT_SECRET',valueFrom:JWT_REF}],
  },
  {
    name: 'reporting', port: 3010,
    env: [
      {name:'PORT',value:'3010'},{name:'NODE_ENV',value:'production'},
      {name:'DB_HOST',value:'vote-capsule-db.cluster-c43i6c8ow71c.us-east-1.rds.amazonaws.com'},
      {name:'DB_PORT',value:'5432'},{name:'DB_NAME',value:'votecapsule'},{name:'DB_USER',value:'vcadmin'},
      {name:'DB_SSL',value:'true'},{name:'AWS_REGION',value:'us-east-1'},
      {name:'OPENSEARCH_ENDPOINT',value:'https://vpc-vote-capsule-search-2roaf6oxwjanzrtfdfra4ppcbu.us-east-1.es.amazonaws.com'},
      {name:'OPENSEARCH_REGION',value:'us-east-1'},
    ],
    secrets: [{name:'DB_PASSWORD',valueFrom:DB_REF},{name:'JWT_SECRET',valueFrom:JWT_REF}],
  },
  {
    name: 'election', port: 3011,
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
  },
  {
    name: 'audit', port: 3012,
    env: [
      {name:'PORT',value:'3012'},{name:'NODE_ENV',value:'production'},
      {name:'DB_HOST',value:'vote-capsule-db.cluster-c43i6c8ow71c.us-east-1.rds.amazonaws.com'},
      {name:'DB_PORT',value:'5432'},{name:'DB_NAME',value:'votecapsule'},{name:'DB_USER',value:'vcadmin'},
      {name:'DB_SSL',value:'true'},{name:'AWS_REGION',value:'us-east-1'},
      {name:'COGNITO_USER_POOL_ID',value:'us-east-1_i3N2tg34A'},{name:'COGNITO_REGION',value:'us-east-1'},
      {name:'ALLOWED_ORIGINS',value:'https://votecapsule.yna.co.ke,https://authority.votecapsule.yna.co.ke'},
    ],
    secrets: [{name:'DB_PASSWORD',valueFrom:DB_REF},{name:'JWT_SECRET',valueFrom:JWT_REF}],
  },
  {
    name: 'billing', port: 3013,
    env: [
      {name:'PORT',value:'3013'},{name:'NODE_ENV',value:'production'},
      {name:'DB_HOST',value:'vote-capsule-db.cluster-c43i6c8ow71c.us-east-1.rds.amazonaws.com'},
      {name:'DB_PORT',value:'5432'},{name:'DB_NAME',value:'votecapsule'},{name:'DB_USER',value:'vcadmin'},
      {name:'DB_SSL',value:'true'},{name:'AWS_REGION',value:'us-east-1'},
      {name:'DEFAULT_CURRENCY',value:'KES'},{name:'VAT_RATE',value:'0.16'},
      {name:'INVOICE_PREFIX',value:'VC'},{name:'INVOICE_DUE_DAYS',value:'30'},
      {name:'MPESA_ENVIRONMENT',value:'sandbox'},
      {name:'ALLOWED_ORIGINS',value:'https://votecapsule.yna.co.ke,https://party.votecapsule.yna.co.ke,https://candidate.votecapsule.yna.co.ke'},
    ],
    secrets: [{name:'DB_PASSWORD',valueFrom:DB_REF},{name:'JWT_SECRET',valueFrom:JWT_REF}],
  },
];

function cli(cmd) {
  try {
    const out = execSync(cmd, { encoding: 'utf8', maxBuffer: 10*1024*1024 });
    return JSON.parse(out);
  } catch(e) {
    const msg = e.message || '';
    if (!msg.includes('service not found') && !msg.includes('does not exist')) {
      console.error('  ERR:', msg.slice(0, 200));
    }
    return null;
  }
}

async function main() {
  console.log('=== Fixing ALL 13 ECS task definitions (correct :secret:: JWT key) ===\n');

  for (const svc of ALL_SERVICES) {
    console.log(`\n--- ${svc.name} (port ${svc.port}) ---`);

    const td = {
      family: `vc-${svc.name}`,
      cpu: '512', memory: '1024',
      networkMode: 'awsvpc',
      requiresCompatibilities: ['FARGATE'],
      executionRoleArn: EXEC_ROLE,
      taskRoleArn: EXEC_ROLE,
      containerDefinitions: [{
        name: `${svc.name}-service`,
        image: `${ECR}/vote-capsule/${svc.name}-service:latest`,
        portMappings: [{containerPort: svc.port, protocol: 'tcp'}],
        essential: true,
        environment: svc.env,
        secrets: svc.secrets,
        logConfiguration: {
          logDriver: 'awslogs',
          options: {
            'awslogs-group': `/vote-capsule/${svc.name}-service`,
            'awslogs-region': REGION,
            'awslogs-stream-prefix': svc.name,
            'awslogs-create-group': 'true',
          },
        },
        healthCheck: {
          command: ['CMD-SHELL', `curl -f http://localhost:${svc.port}/api/v1/${svc.name}/health || exit 1`],
          interval: 30, timeout: 10, retries: 5, startPeriod: 120,
        },
      }],
    };

    const tdFile = `D:/Votecapsule/vote-capsule/infrastructure/scripts/td-final-${svc.name}.json`;
    fs.writeFileSync(tdFile, JSON.stringify(td, null, 2));

    const reg = cli(`aws ecs register-task-definition --cli-input-json "file://${tdFile}" --region ${REGION} --output json`);
    if (!reg) { console.error(`  SKIP: failed to register TD`); continue; }
    const rev = reg.taskDefinition.revision;
    console.log(`  TD: vc-${svc.name}:${rev} registered`);

    // Check if service exists — update if so, create if not
    const existing = cli(`aws ecs describe-services --cluster ${CLUSTER} --services vc-${svc.name} --region ${REGION} --output json`);
    const svcExists = existing?.services?.[0]?.status && existing.services[0].status !== 'INACTIVE';

    if (svcExists) {
      const upd = cli(`aws ecs update-service --cluster ${CLUSTER} --service vc-${svc.name} --task-definition vc-${svc.name}:${rev} --force-new-deployment --region ${REGION} --output json`);
      console.log(upd ? `  ✅ Service updated → vc-${svc.name}:${rev}` : `  ❌ Failed to update service`);
    } else {
      console.log(`  ⚠️  Service vc-${svc.name} does not exist — skipping (run after CI creates it)`);
    }
  }

  console.log('\n=== All task definitions updated with correct :secret:: JWT key reference ===');
  console.log('Services will pull new images when CI pushes them. Forcing redeployment now.');
}

main().catch(console.error);
