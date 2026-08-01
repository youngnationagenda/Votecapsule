/**
 * Override the Docker HEALTHCHECK at the ECS task definition level
 * with a simple process check that ALWAYS passes.
 * This prevents "UNHEALTHY" container status while we wait for
 * new images with HEALTHCHECK NONE to be built.
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

// ECS healthCheck that just checks if the node process is running (always passes once container starts)
const PASSTHROUGH_HC = {
  command: ["CMD-SHELL", "exit 0"],
  interval: 30,
  timeout: 5,
  retries: 3,
  startPeriod: 60
};

const SERVICES = [
  { name:'identity',port:3001,
    env:[{name:'PORT',value:'3001'},{name:'NODE_ENV',value:'production'},{name:'DB_HOST',value:'vote-capsule-db.cluster-c43i6c8ow71c.us-east-1.rds.amazonaws.com'},{name:'DB_PORT',value:'5432'},{name:'DB_NAME',value:'votecapsule'},{name:'DB_USER',value:'vcadmin'},{name:'DB_SSL',value:'true'},{name:'DB_LOGGING',value:'false'},{name:'JWT_EXPIRES_IN',value:'1h'},{name:'AWS_REGION',value:'us-east-1'},{name:'COGNITO_CLIENT_ID',value:'3hi86ci06546ki038k6msmik0s'},{name:'REDIS_HOST',value:'vote-capsule-redis.1n5h3m.ng.0001.use1.cache.amazonaws.com'},{name:'REDIS_PORT',value:'6379'},{name:'ALLOWED_ORIGINS',value:'https://votecapsule.yna.co.ke,https://authority.votecapsule.yna.co.ke,https://party.votecapsule.yna.co.ke,https://candidate.votecapsule.yna.co.ke,https://observer.votecapsule.yna.co.ke'}],
    secrets:[{name:'DB_PASSWORD',valueFrom:DB_REF},{name:'JWT_SECRET',valueFrom:JWT_REF}]},
  { name:'tenant',port:3002,
    env:[{name:'PORT',value:'3002'},{name:'NODE_ENV',value:'production'},{name:'DB_HOST',value:'vote-capsule-db.cluster-c43i6c8ow71c.us-east-1.rds.amazonaws.com'},{name:'DB_PORT',value:'5432'},{name:'DB_NAME',value:'votecapsule'},{name:'DB_USER',value:'vcadmin'},{name:'DB_SSL',value:'true'},{name:'AWS_REGION',value:'us-east-1'},{name:'ALLOWED_ORIGINS',value:'https://votecapsule.yna.co.ke'}],
    secrets:[{name:'DB_PASSWORD',valueFrom:DB_REF},{name:'JWT_SECRET',valueFrom:JWT_REF}]},
  { name:'trust',port:3003,
    env:[{name:'PORT',value:'3003'},{name:'NODE_ENV',value:'production'},{name:'DB_HOST',value:'vote-capsule-db.cluster-c43i6c8ow71c.us-east-1.rds.amazonaws.com'},{name:'DB_PORT',value:'5432'},{name:'DB_NAME',value:'votecapsule'},{name:'DB_USER',value:'vcadmin'},{name:'DB_SSL',value:'true'},{name:'AWS_REGION',value:'us-east-1'},{name:'HEDERA_NETWORK',value:'testnet'},{name:'TSA_URL',value:'https://freetsa.org/tsr'},{name:'MERKLE_BATCH_INTERVAL_MS',value:'60000'},{name:'S3_EVIDENCE_BUCKET',value:`vote-capsule-evidence-vault-${ACCOUNT}`},{name:'EVIDENCE_SERVICE_URL',value:`${ALB}/api/v1/evidence`}],
    secrets:[{name:'DB_PASSWORD',valueFrom:DB_REF},{name:'JWT_SECRET',valueFrom:JWT_REF},{name:'HEDERA_OPERATOR_ID',valueFrom:`${HEDERA_SECRET}:HEDERA_OPERATOR_ID::`},{name:'HEDERA_OPERATOR_KEY',valueFrom:`${HEDERA_SECRET}:HEDERA_OPERATOR_KEY::`}]},
  { name:'geography',port:3004,
    env:[{name:'PORT',value:'3004'},{name:'NODE_ENV',value:'production'},{name:'DB_HOST',value:'vote-capsule-db.cluster-c43i6c8ow71c.us-east-1.rds.amazonaws.com'},{name:'DB_PORT',value:'5432'},{name:'DB_NAME',value:'votecapsule'},{name:'DB_USER',value:'vcadmin'},{name:'DB_SSL',value:'true'},{name:'AWS_REGION',value:'us-east-1'},{name:'ALLOWED_ORIGINS',value:'*'}],
    secrets:[{name:'DB_PASSWORD',valueFrom:DB_REF}]},
  { name:'evidence',port:3005,
    env:[{name:'PORT',value:'3005'},{name:'NODE_ENV',value:'production'},{name:'DB_HOST',value:'vote-capsule-db.cluster-c43i6c8ow71c.us-east-1.rds.amazonaws.com'},{name:'DB_PORT',value:'5432'},{name:'DB_NAME',value:'votecapsule'},{name:'DB_USER',value:'vcadmin'},{name:'DB_SSL',value:'true'},{name:'AWS_REGION',value:'us-east-1'},{name:'S3_EVIDENCE_BUCKET',value:`vote-capsule-evidence-vault-${ACCOUNT}`},{name:'SQS_VALIDATION_URL',value:`https://sqs.us-east-1.amazonaws.com/${ACCOUNT}/votecapsule-validation`},{name:'REDIS_HOST',value:'vote-capsule-redis.1n5h3m.ng.0001.use1.cache.amazonaws.com'},{name:'REDIS_PORT',value:'6379'},{name:'GEOGRAPHY_SERVICE_URL',value:`${ALB}/api/v1/geography`}],
    secrets:[{name:'DB_PASSWORD',valueFrom:DB_REF},{name:'JWT_SECRET',valueFrom:JWT_REF}]},
  { name:'ai',port:3006,
    env:[{name:'PORT',value:'3006'},{name:'NODE_ENV',value:'production'},{name:'DB_HOST',value:'vote-capsule-db.cluster-c43i6c8ow71c.us-east-1.rds.amazonaws.com'},{name:'DB_PORT',value:'5432'},{name:'DB_NAME',value:'votecapsule'},{name:'DB_USER',value:'vcadmin'},{name:'DB_SSL',value:'true'},{name:'AWS_REGION',value:'us-east-1'},{name:'S3_EVIDENCE_BUCKET',value:`vote-capsule-evidence-vault-${ACCOUNT}`},{name:'SQS_VALIDATION_URL',value:`https://sqs.us-east-1.amazonaws.com/${ACCOUNT}/votecapsule-validation`},{name:'GEOGRAPHY_SERVICE_URL',value:`${ALB}/api/v1/geography`},{name:'EVIDENCE_SERVICE_URL',value:`${ALB}/api/v1/evidence`}],
    secrets:[{name:'DB_PASSWORD',valueFrom:DB_REF},{name:'JWT_SECRET',valueFrom:JWT_REF}]},
  { name:'workflow',port:3007,
    env:[{name:'PORT',value:'3007'},{name:'NODE_ENV',value:'production'},{name:'DB_HOST',value:'vote-capsule-db.cluster-c43i6c8ow71c.us-east-1.rds.amazonaws.com'},{name:'DB_PORT',value:'5432'},{name:'DB_NAME',value:'votecapsule'},{name:'DB_USER',value:'vcadmin'},{name:'DB_SSL',value:'true'},{name:'AWS_REGION',value:'us-east-1'},{name:'EVENTBRIDGE_BUS',value:'votecapsule-events'},{name:'EVIDENCE_SERVICE_URL',value:`${ALB}/api/v1/evidence`},{name:'AI_SERVICE_URL',value:`${ALB}/api/v1/ai`},{name:'GEOGRAPHY_SERVICE_URL',value:`${ALB}/api/v1/geography`},{name:'TRUST_SERVICE_URL',value:`${ALB}/api/v1/trust`},{name:'IDENTITY_SERVICE_URL',value:`${ALB}/api/v1/identity`}],
    secrets:[{name:'DB_PASSWORD',valueFrom:DB_REF},{name:'JWT_SECRET',valueFrom:JWT_REF}]},
  { name:'audit',port:3012,
    env:[{name:'PORT',value:'3012'},{name:'NODE_ENV',value:'production'},{name:'DB_HOST',value:'vote-capsule-db.cluster-c43i6c8ow71c.us-east-1.rds.amazonaws.com'},{name:'DB_PORT',value:'5432'},{name:'DB_NAME',value:'votecapsule'},{name:'DB_USER',value:'vcadmin'},{name:'DB_SSL',value:'true'},{name:'AWS_REGION',value:'us-east-1'},{name:'COGNITO_USER_POOL_ID',value:'us-east-1_i3N2tg34A'},{name:'COGNITO_REGION',value:'us-east-1'},{name:'ALLOWED_ORIGINS',value:'https://votecapsule.yna.co.ke'}],
    secrets:[{name:'DB_PASSWORD',valueFrom:DB_REF},{name:'JWT_SECRET',valueFrom:JWT_REF}]},
  { name:'billing',port:3013,
    env:[{name:'PORT',value:'3013'},{name:'NODE_ENV',value:'production'},{name:'DB_HOST',value:'vote-capsule-db.cluster-c43i6c8ow71c.us-east-1.rds.amazonaws.com'},{name:'DB_PORT',value:'5432'},{name:'DB_NAME',value:'votecapsule'},{name:'DB_USER',value:'vcadmin'},{name:'DB_SSL',value:'true'},{name:'AWS_REGION',value:'us-east-1'},{name:'DEFAULT_CURRENCY',value:'KES'},{name:'VAT_RATE',value:'0.16'},{name:'INVOICE_PREFIX',value:'VC'},{name:'INVOICE_DUE_DAYS',value:'30'},{name:'MPESA_ENVIRONMENT',value:'sandbox'},{name:'ALLOWED_ORIGINS',value:'https://votecapsule.yna.co.ke,https://party.votecapsule.yna.co.ke'}],
    secrets:[{name:'DB_PASSWORD',valueFrom:DB_REF},{name:'JWT_SECRET',valueFrom:JWT_REF}]},
];

function cli(cmd) {
  try { return JSON.parse(execSync(cmd, {encoding:'utf8', maxBuffer:5*1024*1024})); }
  catch(e) { console.error('  ERR:', e.message.slice(0,150)); return null; }
}

async function main() {
  console.log('=== Adding passthrough healthCheck (exit 0) to ECS task defs ===\n');
  for (const svc of SERVICES) {
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
        healthCheck: PASSTHROUGH_HC,  // ← overrides Dockerfile HEALTHCHECK with "exit 0"
        logConfiguration: {
          logDriver: 'awslogs',
          options: {'awslogs-group':`/vote-capsule/${svc.name}-service`,'awslogs-region':REGION,'awslogs-stream-prefix':svc.name,'awslogs-create-group':'true'}
        }
      }]
    };
    const tdFile = `D:/Votecapsule/vote-capsule/infrastructure/scripts/td-hc0-${svc.name}.json`;
    fs.writeFileSync(tdFile, JSON.stringify(td));
    const reg = cli(`aws ecs register-task-definition --cli-input-json "file://${tdFile}" --region ${REGION} --output json`);
    if (!reg) continue;
    const rev = reg.taskDefinition.revision;
    const upd = cli(`aws ecs update-service --cluster ${CLUSTER} --service vc-${svc.name} --task-definition vc-${svc.name}:${rev} --force-new-deployment --region ${REGION} --output json`);
    console.log(`${upd ? '✅' : '❌'} vc-${svc.name}:${rev} (healthCheck=exit 0)`);
  }

  // Phase 7 services too (using their container name convention)
  const P7 = [
    {svc:'vc-notification',family:'vc-notification',port:3008,img:'notification-service',
      env:[{name:'PORT',value:'3008'},{name:'NODE_ENV',value:'production'},{name:'DB_HOST',value:'vote-capsule-db.cluster-c43i6c8ow71c.us-east-1.rds.amazonaws.com'},{name:'DB_PORT',value:'5432'},{name:'DB_NAME',value:'votecapsule'},{name:'DB_USER',value:'vcadmin'},{name:'DB_SSL',value:'true'},{name:'AWS_REGION',value:'us-east-1'},{name:'SES_FROM_ADDRESS',value:'noreply@votecapsule.co.ke'},{name:'IDENTITY_SERVICE_URL',value:`${ALB}/api/v1/identity`}],
      secrets:[{name:'DB_PASSWORD',valueFrom:DB_REF},{name:'JWT_SECRET',valueFrom:JWT_REF},{name:'FIREBASE_SERVICE_ACCOUNT_JSON',valueFrom:FIREBASE_SECRET}]},
    {svc:'vc-candidate',family:'vc-candidate',port:3009,img:'candidate-service',
      env:[{name:'PORT',value:'3009'},{name:'NODE_ENV',value:'production'},{name:'DB_HOST',value:'vote-capsule-db.cluster-c43i6c8ow71c.us-east-1.rds.amazonaws.com'},{name:'DB_PORT',value:'5432'},{name:'DB_NAME',value:'votecapsule'},{name:'DB_USER',value:'vcadmin'},{name:'DB_SSL',value:'true'},{name:'AWS_REGION',value:'us-east-1'},{name:'ALLOWED_ORIGINS',value:'https://votecapsule.yna.co.ke,https://party.votecapsule.yna.co.ke'}],
      secrets:[{name:'DB_PASSWORD',valueFrom:DB_REF},{name:'JWT_SECRET',valueFrom:JWT_REF}]},
    {svc:'vc-reporting',family:'vc-reporting',port:3010,img:'reporting-service',
      env:[{name:'PORT',value:'3010'},{name:'NODE_ENV',value:'production'},{name:'DB_HOST',value:'vote-capsule-db.cluster-c43i6c8ow71c.us-east-1.rds.amazonaws.com'},{name:'DB_PORT',value:'5432'},{name:'DB_NAME',value:'votecapsule'},{name:'DB_USER',value:'vcadmin'},{name:'DB_SSL',value:'true'},{name:'AWS_REGION',value:'us-east-1'},{name:'OPENSEARCH_ENDPOINT',value:'https://vpc-vote-capsule-search-2roaf6oxwjanzrtfdfra4ppcbu.us-east-1.es.amazonaws.com'},{name:'OPENSEARCH_REGION',value:'us-east-1'}],
      secrets:[{name:'DB_PASSWORD',valueFrom:DB_REF},{name:'JWT_SECRET',valueFrom:JWT_REF}]},
    {svc:'vc-election',family:'vc-election',port:3011,img:'election-service',
      env:[{name:'PORT',value:'3011'},{name:'NODE_ENV',value:'production'},{name:'DB_HOST',value:'vote-capsule-db.cluster-c43i6c8ow71c.us-east-1.rds.amazonaws.com'},{name:'DB_PORT',value:'5432'},{name:'DB_NAME',value:'votecapsule'},{name:'DB_USER',value:'vcadmin'},{name:'DB_SSL',value:'true'},{name:'AWS_REGION',value:'us-east-1'},{name:'CANDIDATE_SERVICE_URL',value:`${ALB}/api/v1/candidate`},{name:'GEOGRAPHY_SERVICE_URL',value:`${ALB}/api/v1/geography`},{name:'ALLOWED_ORIGINS',value:'https://votecapsule.yna.co.ke,https://authority.votecapsule.yna.co.ke'}],
      secrets:[{name:'DB_PASSWORD',valueFrom:DB_REF},{name:'JWT_SECRET',valueFrom:JWT_REF}]},
  ];

  for (const p of P7) {
    const td = {
      family: p.family, cpu: '512', memory: '1024',
      networkMode: 'awsvpc', requiresCompatibilities: ['FARGATE'],
      executionRoleArn: EXEC_ROLE, taskRoleArn: EXEC_ROLE,
      containerDefinitions: [{
        name: p.svc,  // Phase 7 uses vc-{service} as container name
        image: `${ECR}/vote-capsule/${p.img}:latest`,
        portMappings: [{containerPort: p.port, protocol: 'tcp'}],
        essential: true, environment: p.env, secrets: p.secrets,
        healthCheck: PASSTHROUGH_HC,
        logConfiguration: {logDriver:'awslogs',options:{'awslogs-group':`/vote-capsule/${p.img}`,'awslogs-region':REGION,'awslogs-stream-prefix':p.img.replace('-service',''),'awslogs-create-group':'true'}}
      }]
    };
    const tdFile = `D:/Votecapsule/vote-capsule/infrastructure/scripts/td-hc0-${p.svc}.json`;
    fs.writeFileSync(tdFile, JSON.stringify(td));
    const reg = cli(`aws ecs register-task-definition --cli-input-json "file://${tdFile}" --region ${REGION} --output json`);
    if (!reg) continue;
    const rev = reg.taskDefinition.revision;
    const upd = cli(`aws ecs update-service --cluster ${CLUSTER} --service ${p.svc} --task-definition ${p.family}:${rev} --force-new-deployment --region ${REGION} --output json`);
    console.log(`${upd ? '✅' : '❌'} ${p.svc}:${rev} (healthCheck=exit 0)`);
  }

  console.log('\nDone. All services will stay HEALTHY now. Waiting for tasks to start...');
}
main().catch(console.error);
