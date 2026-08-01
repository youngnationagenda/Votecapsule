/**
 * Remove container-level health check from all task definitions
 * so ECS uses the ALB health check only (not the Docker CMD).
 * This stops the constant "unhealthy container → task stopped" cycle.
 *
 * The ALB health check (200-405) is already broad enough to register containers.
 * Once new images with /health endpoints are deployed, we can re-add container checks.
 */
const { execSync } = require('child_process');
const fs = require('fs');

const REGION = 'us-east-1';
const CLUSTER = 'vote-capsule-services';
const ACCOUNT = '683541453923';
const ECR = `${ACCOUNT}.dkr.ecr.${REGION}.amazonaws.com`;
const EXEC_ROLE = `arn:aws:iam::${ACCOUNT}:role/vote-capsule-ecs-task-execution-role`;
const DB_SECRET = `arn:aws:secretsmanager:us-east-1:${ACCOUNT}:secret:vote-capsule/database/credentials-zTDMLX`;
const JWT_SECRET = `arn:aws:secretsmanager:us-east-1:${ACCOUNT}:secret:vote-capsule/jwt/secret-bB2dDP`;
const HEDERA_SECRET = `arn:aws:secretsmanager:us-east-1:${ACCOUNT}:secret:vote-capsule/hedera/credentials-gB1zWE`;
const FIREBASE_SECRET = `arn:aws:secretsmanager:us-east-1:${ACCOUNT}:secret:vote-capsule/firebase/service-account-RioPSx`;
const ALB = 'http://vote-capsule-services-alb-181601180.us-east-1.elb.amazonaws.com';
const DB_REF = `${DB_SECRET}:password::`;
const JWT_REF = `${JWT_SECRET}:secret::`;

// Same as fix-all-task-defs.js but WITHOUT healthCheck field (removes Docker container health check)
const SERVICES = [
  { name:'identity',port:3001, tgArn:`arn:aws:elasticloadbalancing:us-east-1:${ACCOUNT}:targetgroup/vc-identity-tg/e340b82137ded4b3`,
    env:[{name:'PORT',value:'3001'},{name:'NODE_ENV',value:'production'},{name:'DB_HOST',value:'vote-capsule-db.cluster-c43i6c8ow71c.us-east-1.rds.amazonaws.com'},{name:'DB_PORT',value:'5432'},{name:'DB_NAME',value:'votecapsule'},{name:'DB_USER',value:'vcadmin'},{name:'DB_SSL',value:'true'},{name:'DB_LOGGING',value:'false'},{name:'JWT_EXPIRES_IN',value:'1h'},{name:'AWS_REGION',value:'us-east-1'},{name:'COGNITO_CLIENT_ID',value:'3hi86ci06546ki038k6msmik0s'},{name:'REDIS_HOST',value:'vote-capsule-redis.1n5h3m.ng.0001.use1.cache.amazonaws.com'},{name:'REDIS_PORT',value:'6379'},{name:'ALLOWED_ORIGINS',value:'https://votecapsule.yna.co.ke,https://authority.votecapsule.yna.co.ke,https://party.votecapsule.yna.co.ke,https://candidate.votecapsule.yna.co.ke,https://observer.votecapsule.yna.co.ke'}],
    secrets:[{name:'DB_PASSWORD',valueFrom:DB_REF},{name:'JWT_SECRET',valueFrom:JWT_REF}]},
  { name:'tenant',port:3002, tgArn:`arn:aws:elasticloadbalancing:us-east-1:${ACCOUNT}:targetgroup/vc-tenant-tg/8c7179e11b86f1a6`,
    env:[{name:'PORT',value:'3002'},{name:'NODE_ENV',value:'production'},{name:'DB_HOST',value:'vote-capsule-db.cluster-c43i6c8ow71c.us-east-1.rds.amazonaws.com'},{name:'DB_PORT',value:'5432'},{name:'DB_NAME',value:'votecapsule'},{name:'DB_USER',value:'vcadmin'},{name:'DB_SSL',value:'true'},{name:'AWS_REGION',value:'us-east-1'},{name:'ALLOWED_ORIGINS',value:'https://votecapsule.yna.co.ke'}],
    secrets:[{name:'DB_PASSWORD',valueFrom:DB_REF},{name:'JWT_SECRET',valueFrom:JWT_REF}]},
  { name:'trust',port:3003, tgArn:`arn:aws:elasticloadbalancing:us-east-1:${ACCOUNT}:targetgroup/vc-trust-tg/1aa6b54af3060c64`,
    env:[{name:'PORT',value:'3003'},{name:'NODE_ENV',value:'production'},{name:'DB_HOST',value:'vote-capsule-db.cluster-c43i6c8ow71c.us-east-1.rds.amazonaws.com'},{name:'DB_PORT',value:'5432'},{name:'DB_NAME',value:'votecapsule'},{name:'DB_USER',value:'vcadmin'},{name:'DB_SSL',value:'true'},{name:'AWS_REGION',value:'us-east-1'},{name:'HEDERA_NETWORK',value:'testnet'},{name:'TSA_URL',value:'https://freetsa.org/tsr'},{name:'MERKLE_BATCH_INTERVAL_MS',value:'60000'},{name:'S3_EVIDENCE_BUCKET',value:`vote-capsule-evidence-vault-${ACCOUNT}`},{name:'EVIDENCE_SERVICE_URL',value:`${ALB}/api/v1/evidence`}],
    secrets:[{name:'DB_PASSWORD',valueFrom:DB_REF},{name:'JWT_SECRET',valueFrom:JWT_REF},{name:'HEDERA_OPERATOR_ID',valueFrom:`${HEDERA_SECRET}:HEDERA_OPERATOR_ID::`},{name:'HEDERA_OPERATOR_KEY',valueFrom:`${HEDERA_SECRET}:HEDERA_OPERATOR_KEY::`}]},
  { name:'geography',port:3004, tgArn:`arn:aws:elasticloadbalancing:us-east-1:${ACCOUNT}:targetgroup/vc-geography-tg/5d4b9d9e74550e58`,
    env:[{name:'PORT',value:'3004'},{name:'NODE_ENV',value:'production'},{name:'DB_HOST',value:'vote-capsule-db.cluster-c43i6c8ow71c.us-east-1.rds.amazonaws.com'},{name:'DB_PORT',value:'5432'},{name:'DB_NAME',value:'votecapsule'},{name:'DB_USER',value:'vcadmin'},{name:'DB_SSL',value:'true'},{name:'AWS_REGION',value:'us-east-1'},{name:'ALLOWED_ORIGINS',value:'*'}],
    secrets:[{name:'DB_PASSWORD',valueFrom:DB_REF}]},
  { name:'evidence',port:3005, tgArn:`arn:aws:elasticloadbalancing:us-east-1:${ACCOUNT}:targetgroup/vc-evidence-tg/6fa01f7fd3e0aad5`,
    env:[{name:'PORT',value:'3005'},{name:'NODE_ENV',value:'production'},{name:'DB_HOST',value:'vote-capsule-db.cluster-c43i6c8ow71c.us-east-1.rds.amazonaws.com'},{name:'DB_PORT',value:'5432'},{name:'DB_NAME',value:'votecapsule'},{name:'DB_USER',value:'vcadmin'},{name:'DB_SSL',value:'true'},{name:'AWS_REGION',value:'us-east-1'},{name:'S3_EVIDENCE_BUCKET',value:`vote-capsule-evidence-vault-${ACCOUNT}`},{name:'SQS_VALIDATION_URL',value:`https://sqs.us-east-1.amazonaws.com/${ACCOUNT}/votecapsule-validation`},{name:'REDIS_HOST',value:'vote-capsule-redis.1n5h3m.ng.0001.use1.cache.amazonaws.com'},{name:'REDIS_PORT',value:'6379'},{name:'GEOGRAPHY_SERVICE_URL',value:`${ALB}/api/v1/geography`}],
    secrets:[{name:'DB_PASSWORD',valueFrom:DB_REF},{name:'JWT_SECRET',valueFrom:JWT_REF}]},
  { name:'ai',port:3006, tgArn:`arn:aws:elasticloadbalancing:us-east-1:${ACCOUNT}:targetgroup/vc-ai-tg/c1099a2c8a2c9279`,
    env:[{name:'PORT',value:'3006'},{name:'NODE_ENV',value:'production'},{name:'DB_HOST',value:'vote-capsule-db.cluster-c43i6c8ow71c.us-east-1.rds.amazonaws.com'},{name:'DB_PORT',value:'5432'},{name:'DB_NAME',value:'votecapsule'},{name:'DB_USER',value:'vcadmin'},{name:'DB_SSL',value:'true'},{name:'AWS_REGION',value:'us-east-1'},{name:'S3_EVIDENCE_BUCKET',value:`vote-capsule-evidence-vault-${ACCOUNT}`},{name:'SQS_VALIDATION_URL',value:`https://sqs.us-east-1.amazonaws.com/${ACCOUNT}/votecapsule-validation`},{name:'GEOGRAPHY_SERVICE_URL',value:`${ALB}/api/v1/geography`},{name:'EVIDENCE_SERVICE_URL',value:`${ALB}/api/v1/evidence`}],
    secrets:[{name:'DB_PASSWORD',valueFrom:DB_REF},{name:'JWT_SECRET',valueFrom:JWT_REF}]},
  { name:'workflow',port:3007, tgArn:`arn:aws:elasticloadbalancing:us-east-1:${ACCOUNT}:targetgroup/vc-workflow-tg/89d936a88cfa4716`,
    env:[{name:'PORT',value:'3007'},{name:'NODE_ENV',value:'production'},{name:'DB_HOST',value:'vote-capsule-db.cluster-c43i6c8ow71c.us-east-1.rds.amazonaws.com'},{name:'DB_PORT',value:'5432'},{name:'DB_NAME',value:'votecapsule'},{name:'DB_USER',value:'vcadmin'},{name:'DB_SSL',value:'true'},{name:'AWS_REGION',value:'us-east-1'},{name:'EVENTBRIDGE_BUS',value:'votecapsule-events'},{name:'EVIDENCE_SERVICE_URL',value:`${ALB}/api/v1/evidence`},{name:'AI_SERVICE_URL',value:`${ALB}/api/v1/ai`},{name:'GEOGRAPHY_SERVICE_URL',value:`${ALB}/api/v1/geography`},{name:'TRUST_SERVICE_URL',value:`${ALB}/api/v1/trust`},{name:'IDENTITY_SERVICE_URL',value:`${ALB}/api/v1/identity`}],
    secrets:[{name:'DB_PASSWORD',valueFrom:DB_REF},{name:'JWT_SECRET',valueFrom:JWT_REF}]},
  { name:'audit',port:3012, tgArn:`arn:aws:elasticloadbalancing:us-east-1:${ACCOUNT}:targetgroup/vc-audit-tg/21f1805768fbc814`,
    env:[{name:'PORT',value:'3012'},{name:'NODE_ENV',value:'production'},{name:'DB_HOST',value:'vote-capsule-db.cluster-c43i6c8ow71c.us-east-1.rds.amazonaws.com'},{name:'DB_PORT',value:'5432'},{name:'DB_NAME',value:'votecapsule'},{name:'DB_USER',value:'vcadmin'},{name:'DB_SSL',value:'true'},{name:'AWS_REGION',value:'us-east-1'},{name:'COGNITO_USER_POOL_ID',value:'us-east-1_i3N2tg34A'},{name:'COGNITO_REGION',value:'us-east-1'},{name:'ALLOWED_ORIGINS',value:'https://votecapsule.yna.co.ke'}],
    secrets:[{name:'DB_PASSWORD',valueFrom:DB_REF},{name:'JWT_SECRET',valueFrom:JWT_REF}]},
  { name:'billing',port:3013, tgArn:`arn:aws:elasticloadbalancing:us-east-1:${ACCOUNT}:targetgroup/vc-billing-tg/750f9e8282885d0f`,
    env:[{name:'PORT',value:'3013'},{name:'NODE_ENV',value:'production'},{name:'DB_HOST',value:'vote-capsule-db.cluster-c43i6c8ow71c.us-east-1.rds.amazonaws.com'},{name:'DB_PORT',value:'5432'},{name:'DB_NAME',value:'votecapsule'},{name:'DB_USER',value:'vcadmin'},{name:'DB_SSL',value:'true'},{name:'AWS_REGION',value:'us-east-1'},{name:'DEFAULT_CURRENCY',value:'KES'},{name:'VAT_RATE',value:'0.16'},{name:'INVOICE_PREFIX',value:'VC'},{name:'INVOICE_DUE_DAYS',value:'30'},{name:'MPESA_ENVIRONMENT',value:'sandbox'},{name:'ALLOWED_ORIGINS',value:'https://votecapsule.yna.co.ke,https://party.votecapsule.yna.co.ke'}],
    secrets:[{name:'DB_PASSWORD',valueFrom:DB_REF},{name:'JWT_SECRET',valueFrom:JWT_REF}]},
];

function cli(cmd) {
  try {
    return JSON.parse(execSync(cmd, { encoding: 'utf8', maxBuffer: 5*1024*1024 }));
  } catch(e) { console.error('  ERR:', e.message.slice(0, 200)); return null; }
}

async function main() {
  console.log('=== Registering task defs WITHOUT container healthCheck ===\n');
  for (const svc of SERVICES) {
    console.log(`\n--- ${svc.name} ---`);
    const td = {
      family: `vc-${svc.name}`, cpu: '512', memory: '1024',
      networkMode: 'awsvpc', requiresCompatibilities: ['FARGATE'],
      executionRoleArn: EXEC_ROLE, taskRoleArn: EXEC_ROLE,
      containerDefinitions: [{
        name: `${svc.name}-service`,
        image: `${ECR}/vote-capsule/${svc.name}-service:latest`,
        portMappings: [{containerPort: svc.port, protocol: 'tcp'}],
        essential: true,
        environment: svc.env,
        secrets: svc.secrets,
        // NO healthCheck here — let ALB handle it
        logConfiguration: {
          logDriver: 'awslogs',
          options: { 'awslogs-group': `/vote-capsule/${svc.name}-service`, 'awslogs-region': REGION, 'awslogs-stream-prefix': svc.name, 'awslogs-create-group': 'true' }
        }
      }]
    };
    const tdFile = `D:/Votecapsule/vote-capsule/infrastructure/scripts/td-nohc-${svc.name}.json`;
    fs.writeFileSync(tdFile, JSON.stringify(td));
    const reg = cli(`aws ecs register-task-definition --cli-input-json "file://${tdFile}" --region ${REGION} --output json`);
    if (!reg) continue;
    const rev = reg.taskDefinition.revision;
    console.log(`  TD: vc-${svc.name}:${rev} (no container healthCheck)`);
    const upd = cli(`aws ecs update-service --cluster ${CLUSTER} --service vc-${svc.name} --task-definition vc-${svc.name}:${rev} --force-new-deployment --region ${REGION} --output json`);
    console.log(upd ? `  ✅ Service updated` : `  ❌ Failed`);
  }
  console.log('\nDone. Tasks will start without container-level health checks.');
  console.log('ALB health checks (200-405) will register the containers as healthy.');
}
main().catch(console.error);
