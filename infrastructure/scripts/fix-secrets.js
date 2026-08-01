/**
 * Fix all ECS task definitions to use correct Secrets Manager key names:
 * JWT secret key: "secret" (not "jwt_secret")
 * DB key: "password" (already correct)
 * Then update all running services to use new task def revisions.
 */
const { execSync } = require('child_process');

const ACCOUNT = '683541453923';
const REGION = 'us-east-1';
const CLUSTER = 'vote-capsule-services';
const DB_SECRET = `arn:aws:secretsmanager:us-east-1:${ACCOUNT}:secret:vote-capsule/database/credentials-zTDMLX`;
const JWT_SECRET = `arn:aws:secretsmanager:us-east-1:${ACCOUNT}:secret:vote-capsule/jwt/secret-bB2dDP`;
const HEDERA_SECRET = `arn:aws:secretsmanager:us-east-1:${ACCOUNT}:secret:vote-capsule/hedera/credentials-gB1zWE`;
const ECR = `${ACCOUNT}.dkr.ecr.${REGION}.amazonaws.com`;
const EXEC_ROLE = `arn:aws:iam::${ACCOUNT}:role/vote-capsule-ecs-task-execution-role`;
const SUBNETS = ["subnet-0aa1a58541c87ae2a","subnet-0171d821c5d5ae868","subnet-09604eb63697ac228","subnet-0be09dbd825b75c07"];
const SG = "sg-0713d2f11c539eb84";

// JWT secret key in Secrets Manager is "secret"
const JWT_VALUEFORM = `${JWT_SECRET}:secret::`;
const DB_VALUEFORM = `${DB_SECRET}:password::`;

const SERVICES = [
  {
    name: 'identity', port: 3001,
    tgArn: `arn:aws:elasticloadbalancing:us-east-1:${ACCOUNT}:targetgroup/vc-identity-tg/e340b82137ded4b3`,
    env: [
      {name:"PORT",value:"3001"},{name:"NODE_ENV",value:"production"},
      {name:"DB_HOST",value:"vote-capsule-db.cluster-c43i6c8ow71c.us-east-1.rds.amazonaws.com"},
      {name:"DB_PORT",value:"5432"},{name:"DB_NAME",value:"votecapsule"},{name:"DB_USER",value:"vcadmin"},
      {name:"DB_SSL",value:"true"},{name:"DB_LOGGING",value:"false"},{name:"JWT_EXPIRES_IN",value:"1h"},
      {name:"AWS_REGION",value:"us-east-1"},{name:"COGNITO_CLIENT_ID",value:"3hi86ci06546ki038k6msmik0s"},
      {name:"REDIS_HOST",value:"vote-capsule-redis.1n5h3m.ng.0001.use1.cache.amazonaws.com"},
      {name:"REDIS_PORT",value:"6379"},
      {name:"ALLOWED_ORIGINS",value:"https://votecapsule.yna.co.ke,https://authority.votecapsule.yna.co.ke"}
    ],
    secrets: [{name:"DB_PASSWORD",valueFrom:DB_VALUEFORM},{name:"JWT_SECRET",valueFrom:JWT_VALUEFORM}],
  },
  {
    name: 'tenant', port: 3002,
    tgArn: `arn:aws:elasticloadbalancing:us-east-1:${ACCOUNT}:targetgroup/vc-tenant-tg/8c7179e11b86f1a6`,
    env: [
      {name:"PORT",value:"3002"},{name:"NODE_ENV",value:"production"},
      {name:"DB_HOST",value:"vote-capsule-db.cluster-c43i6c8ow71c.us-east-1.rds.amazonaws.com"},
      {name:"DB_PORT",value:"5432"},{name:"DB_NAME",value:"votecapsule"},{name:"DB_USER",value:"vcadmin"},
      {name:"DB_SSL",value:"true"},{name:"AWS_REGION",value:"us-east-1"},
      {name:"ALLOWED_ORIGINS",value:"https://votecapsule.yna.co.ke"}
    ],
    secrets: [{name:"DB_PASSWORD",valueFrom:DB_VALUEFORM},{name:"JWT_SECRET",valueFrom:JWT_VALUEFORM}],
  },
  {
    name: 'trust', port: 3003,
    tgArn: `arn:aws:elasticloadbalancing:us-east-1:${ACCOUNT}:targetgroup/vc-trust-tg/1aa6b54af3060c64`,
    env: [
      {name:"PORT",value:"3003"},{name:"NODE_ENV",value:"production"},
      {name:"DB_HOST",value:"vote-capsule-db.cluster-c43i6c8ow71c.us-east-1.rds.amazonaws.com"},
      {name:"DB_PORT",value:"5432"},{name:"DB_NAME",value:"votecapsule"},{name:"DB_USER",value:"vcadmin"},
      {name:"DB_SSL",value:"true"},{name:"AWS_REGION",value:"us-east-1"},
      {name:"HEDERA_NETWORK",value:"testnet"},{name:"TSA_URL",value:"https://freetsa.org/tsr"},
      {name:"MERKLE_BATCH_INTERVAL_MS",value:"60000"},
      {name:"S3_EVIDENCE_BUCKET",value:`vote-capsule-evidence-vault-${ACCOUNT}`}
    ],
    secrets: [
      {name:"DB_PASSWORD",valueFrom:DB_VALUEFORM},{name:"JWT_SECRET",valueFrom:JWT_VALUEFORM},
      {name:"HEDERA_OPERATOR_ID",valueFrom:`${HEDERA_SECRET}:accountId::`},
      {name:"HEDERA_OPERATOR_KEY",valueFrom:`${HEDERA_SECRET}:privateKey::`},
    ],
  },
  {
    name: 'geography', port: 3004,
    tgArn: `arn:aws:elasticloadbalancing:us-east-1:${ACCOUNT}:targetgroup/vc-geography-tg/5d4b9d9e74550e58`,
    env: [
      {name:"PORT",value:"3004"},{name:"NODE_ENV",value:"production"},
      {name:"DB_HOST",value:"vote-capsule-db.cluster-c43i6c8ow71c.us-east-1.rds.amazonaws.com"},
      {name:"DB_PORT",value:"5432"},{name:"DB_NAME",value:"votecapsule"},{name:"DB_USER",value:"vcadmin"},
      {name:"DB_SSL",value:"true"},{name:"AWS_REGION",value:"us-east-1"},{name:"ALLOWED_ORIGINS",value:"*"}
    ],
    secrets: [{name:"DB_PASSWORD",valueFrom:DB_VALUEFORM}],
  },
  {
    name: 'evidence', port: 3005,
    tgArn: `arn:aws:elasticloadbalancing:us-east-1:${ACCOUNT}:targetgroup/vc-evidence-tg/6fa01f7fd3e0aad5`,
    env: [
      {name:"PORT",value:"3005"},{name:"NODE_ENV",value:"production"},
      {name:"DB_HOST",value:"vote-capsule-db.cluster-c43i6c8ow71c.us-east-1.rds.amazonaws.com"},
      {name:"DB_PORT",value:"5432"},{name:"DB_NAME",value:"votecapsule"},{name:"DB_USER",value:"vcadmin"},
      {name:"DB_SSL",value:"true"},{name:"AWS_REGION",value:"us-east-1"},
      {name:"S3_EVIDENCE_BUCKET",value:`vote-capsule-evidence-vault-${ACCOUNT}`},
      {name:"SQS_VALIDATION_URL",value:`https://sqs.us-east-1.amazonaws.com/${ACCOUNT}/votecapsule-validation`},
      {name:"REDIS_HOST",value:"vote-capsule-redis.1n5h3m.ng.0001.use1.cache.amazonaws.com"},{name:"REDIS_PORT",value:"6379"}
    ],
    secrets: [{name:"DB_PASSWORD",valueFrom:DB_VALUEFORM},{name:"JWT_SECRET",valueFrom:JWT_VALUEFORM}],
  },
  {
    name: 'ai', port: 3006,
    tgArn: `arn:aws:elasticloadbalancing:us-east-1:${ACCOUNT}:targetgroup/vc-ai-tg/c1099a2c8a2c9279`,
    env: [
      {name:"PORT",value:"3006"},{name:"NODE_ENV",value:"production"},
      {name:"DB_HOST",value:"vote-capsule-db.cluster-c43i6c8ow71c.us-east-1.rds.amazonaws.com"},
      {name:"DB_PORT",value:"5432"},{name:"DB_NAME",value:"votecapsule"},{name:"DB_USER",value:"vcadmin"},
      {name:"DB_SSL",value:"true"},{name:"AWS_REGION",value:"us-east-1"},
      {name:"S3_EVIDENCE_BUCKET",value:`vote-capsule-evidence-vault-${ACCOUNT}`},
      {name:"SQS_VALIDATION_URL",value:`https://sqs.us-east-1.amazonaws.com/${ACCOUNT}/votecapsule-validation`}
    ],
    secrets: [{name:"DB_PASSWORD",valueFrom:DB_VALUEFORM},{name:"JWT_SECRET",valueFrom:JWT_VALUEFORM}],
  },
  {
    name: 'workflow', port: 3007,
    tgArn: `arn:aws:elasticloadbalancing:us-east-1:${ACCOUNT}:targetgroup/vc-workflow-tg/89d936a88cfa4716`,
    env: [
      {name:"PORT",value:"3007"},{name:"NODE_ENV",value:"production"},
      {name:"DB_HOST",value:"vote-capsule-db.cluster-c43i6c8ow71c.us-east-1.rds.amazonaws.com"},
      {name:"DB_PORT",value:"5432"},{name:"DB_NAME",value:"votecapsule"},{name:"DB_USER",value:"vcadmin"},
      {name:"DB_SSL",value:"true"},{name:"AWS_REGION",value:"us-east-1"},
      {name:"EVENTBRIDGE_BUS",value:"votecapsule-events"}
    ],
    secrets: [{name:"DB_PASSWORD",valueFrom:DB_VALUEFORM},{name:"JWT_SECRET",valueFrom:JWT_VALUEFORM}],
  },
];

function cli(cmd) {
  try {
    return JSON.parse(execSync(cmd, { encoding: 'utf8', maxBuffer: 10*1024*1024 }));
  } catch(e) {
    console.error('CMD failed:', e.message.slice(0, 200));
    return null;
  }
}

async function main() {
  for (const svc of SERVICES) {
    console.log(`\n=== ${svc.name} ===`);
    const td = {
      family: `vc-${svc.name}`,
      cpu: "512", memory: "1024",
      networkMode: "awsvpc",
      requiresCompatibilities: ["FARGATE"],
      executionRoleArn: EXEC_ROLE,
      taskRoleArn: EXEC_ROLE,
      containerDefinitions: [{
        name: `${svc.name}-service`,
        image: `${ECR}/vote-capsule/${svc.name}-service:latest`,
        portMappings: [{containerPort: svc.port, protocol: "tcp"}],
        essential: true,
        environment: svc.env,
        secrets: svc.secrets,
        logConfiguration: {
          logDriver: "awslogs",
          options: {
            "awslogs-group": `/vote-capsule/${svc.name}-service`,
            "awslogs-region": REGION,
            "awslogs-stream-prefix": svc.name,
            "awslogs-create-group": "true"
          }
        },
        healthCheck: {
          command: ["CMD-SHELL", `curl -f http://localhost:${svc.port}/api/v1/${svc.name}/health || exit 1`],
          interval: 30, timeout: 5, retries: 3, startPeriod: 90
        }
      }]
    };

    // Write TD to temp file
    const tdFile = `D:/Votecapsule/vote-capsule/infrastructure/scripts/td-fixed-${svc.name}.json`;
    require('fs').writeFileSync(tdFile, JSON.stringify(td));

    const reg = cli(`aws ecs register-task-definition --cli-input-json "file://${tdFile}" --region ${REGION} --output json`);
    if (!reg) { console.error(`Failed to register TD for ${svc.name}`); continue; }
    const tdArn = reg.taskDefinition.taskDefinitionArn;
    const rev = reg.taskDefinition.revision;
    console.log(`  TD registered: vc-${svc.name}:${rev}`);

    // Update service
    const upd = cli(`aws ecs update-service --cluster ${CLUSTER} --service vc-${svc.name} --task-definition vc-${svc.name}:${rev} --force-new-deployment --region ${REGION} --output json`);
    if (upd) {
      console.log(`  ✅ Service vc-${svc.name} updated → task def :${rev}`);
    } else {
      console.error(`  ❌ Failed to update service vc-${svc.name}`);
    }
  }
  console.log('\nDone! Services are deploying new task revisions.');
}

main().catch(console.error);
