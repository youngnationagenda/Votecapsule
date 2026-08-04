/**
 * VoteCapsule™ — Hedera Mainnet Migration Script
 *
 * Migrates Trust Service from testnet (0.0.4426239) to mainnet.
 *
 * PREREQUISITES:
 *   1. Purchase HBAR on an exchange (Binance, Coinbase, etc.)
 *   2. Create mainnet account at https://portal.hedera.com
 *      - Use existing public key: 302a300506032b6570032100f1c89833ca84f7412ba3c9bd6f0a85af1d919ed53e72cccdfc11cb69f8027d30
 *      - Fund with minimum 10 HBAR
 *   3. Set env vars:
 *      MAINNET_ACCOUNT_ID=0.0.XXXXXX
 *      MAINNET_PRIVATE_KEY=302e020100300506032b6570042204...
 *
 * USAGE:
 *   MAINNET_ACCOUNT_ID=0.0.XXX MAINNET_PRIVATE_KEY=... node hedera-mainnet-migration.js
 */

const { execSync } = require('child_process');

const ACCOUNT_ID   = process.env.MAINNET_ACCOUNT_ID;
const PRIVATE_KEY  = process.env.MAINNET_PRIVATE_KEY;
const REGION       = 'us-east-1';
const SECRET_ARN   = 'arn:aws:secretsmanager:us-east-1:683541453923:secret:vote-capsule/hedera/credentials-gB1zWE';
const PUBLIC_KEY   = '302a300506032b6570032100f1c89833ca84f7412ba3c9bd6f0a85af1d919ed53e72cccdfc11cb69f8027d30';

if (!ACCOUNT_ID || !PRIVATE_KEY) {
  console.error('❌ Missing required env vars: MAINNET_ACCOUNT_ID, MAINNET_PRIVATE_KEY');
  console.error('');
  console.error('Steps to get these:');
  console.error('  1. Go to https://portal.hedera.com');
  console.error('  2. Create Mainnet account using public key:');
  console.error('     ' + PUBLIC_KEY);
  console.error('  3. Fund with at least 10 HBAR');
  console.error('  4. Copy Account ID (format: 0.0.XXXXXX) and Private Key');
  console.error('');
  console.error('Then run:');
  console.error('  MAINNET_ACCOUNT_ID=0.0.XXX MAINNET_PRIVATE_KEY=302e... node infrastructure/scripts/hedera-mainnet-migration.js');
  process.exit(1);
}

console.log('VoteCapsule™ — Hedera Mainnet Migration');
console.log('Account ID:', ACCOUNT_ID);
console.log('Network:    mainnet');
console.log('');

// Step 1: Update Secrets Manager
console.log('Step 1: Updating Secrets Manager...');
const secretValue = JSON.stringify({
  operatorId:   ACCOUNT_ID,
  operatorKey:  PRIVATE_KEY,
  publicKey:    PUBLIC_KEY,
  network:      'mainnet',
  topicId:      'CREATE_ON_FIRST_RUN',
});

execSync(
  `aws secretsmanager update-secret --secret-id "${SECRET_ARN}" --secret-string '${secretValue}' --region ${REGION}`,
  { stdio: 'inherit' }
);
console.log('✅ Secrets Manager updated with mainnet credentials\n');

// Step 2: Update Trust ECS task definition
console.log('Step 2: Getting current Trust task definition...');
const tdRaw = execSync(
  `aws ecs describe-task-definition --task-definition vc-trust --region ${REGION} --output json`,
  { encoding: 'utf8' }
);
const td = JSON.parse(tdRaw).taskDefinition;

// Update HEDERA_NETWORK env var from testnet to mainnet
td.containerDefinitions[0].environment = td.containerDefinitions[0].environment.map(env => {
  if (env.name === 'HEDERA_NETWORK') return { name: 'HEDERA_NETWORK', value: 'mainnet' };
  return env;
});

// Remove read-only fields
['taskDefinitionArn','revision','status','requiresAttributes','compatibilities',
 'registeredAt','registeredBy','deregisteredAt'].forEach(k => delete td[k]);

const tdFile = `${__dirname}/td-trust-mainnet.json`;
require('fs').writeFileSync(tdFile, JSON.stringify(td, null, 2));

console.log('Step 3: Registering new task definition...');
const regOut = execSync(
  `aws ecs register-task-definition --cli-input-json file://${tdFile} --region ${REGION} --query "taskDefinition.{arn:taskDefinitionArn,rev:revision}" --output json`,
  { encoding: 'utf8' }
);
const newTd = JSON.parse(regOut);
console.log('✅ New task definition:', newTd.arn, 'revision:', newTd.rev);

// Step 4: Force redeploy
console.log('\nStep 4: Force-deploying Trust service with mainnet config...');
execSync(
  `aws ecs update-service --cluster vote-capsule-services --service vc-trust --task-definition vc-trust:${newTd.rev} --force-new-deployment --region ${REGION} --output json > nul`,
  { stdio: 'inherit' }
);
console.log('✅ Trust service redeploying...\n');

console.log('Step 5: Watching for startup...');
console.log('  Run this to monitor:');
console.log('  aws logs tail /vote-capsule/trust-service --follow --region us-east-1');
console.log('');
console.log('  Then capture the new mainnet Topic ID:');
console.log('  aws logs tail /vote-capsule/trust-service --region us-east-1 | grep -i "topic"');
console.log('');
console.log('  Then run: node infrastructure/scripts/pin-hedera-topic.js --topic 0.0.XXXXXX --network mainnet');
console.log('');
console.log('✅ Hedera mainnet migration initiated successfully!');
console.log('   Note: First transaction on mainnet will cost ~0.14 HBAR to create the topic.');
