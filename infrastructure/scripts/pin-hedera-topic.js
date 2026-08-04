/**
 * VoteCapsule™ — Pin Hedera Topic ID
 *
 * After Trust Service creates a topic on first mainnet run,
 * use this script to pin the Topic ID in Secrets Manager
 * and update the Trust task definition.
 *
 * Usage:
 *   node infrastructure/scripts/pin-hedera-topic.js --topic 0.0.XXXXXX --network mainnet
 *   node infrastructure/scripts/pin-hedera-topic.js --topic 0.0.9871113 --network testnet
 */

const { execSync } = require('child_process');

const args   = process.argv.slice(2);
const topic  = args[args.indexOf('--topic')   + 1];
const network = args[args.indexOf('--network') + 1] || 'testnet';

if (!topic) {
  console.error('Usage: node pin-hedera-topic.js --topic 0.0.XXXXXX [--network mainnet|testnet]');
  process.exit(1);
}

const SECRET_ARN = 'arn:aws:secretsmanager:us-east-1:683541453923:secret:vote-capsule/hedera/credentials-gB1zWE';
const REGION     = 'us-east-1';

console.log(`Pinning Hedera topic ${topic} on ${network}...`);

// 1. Get current secret
const currentRaw = execSync(
  `aws secretsmanager get-secret-value --secret-id "${SECRET_ARN}" --region ${REGION} --query SecretString --output text`,
  { encoding: 'utf8' }
);
const current = JSON.parse(currentRaw);
current.topicId = topic;
current.network = network;

// 2. Update secret
execSync(
  `aws secretsmanager update-secret --secret-id "${SECRET_ARN}" --secret-string '${JSON.stringify(current)}' --region ${REGION}`,
  { stdio: 'inherit' }
);
console.log('✅ Secrets Manager updated with topic ID:', topic);

// 3. Update Trust task definition HEDERA_TOPIC_ID env var
const tdRaw = execSync(
  `aws ecs describe-task-definition --task-definition vc-trust --region ${REGION} --output json`,
  { encoding: 'utf8' }
);
const td = JSON.parse(tdRaw).taskDefinition;

td.containerDefinitions[0].environment = td.containerDefinitions[0].environment.map(env => {
  if (env.name === 'HEDERA_NETWORK') return { name: 'HEDERA_NETWORK', value: network };
  return env;
});

// The topic is sourced from Secrets Manager — no need to add as plaintext env var
// But update network
['taskDefinitionArn','revision','status','requiresAttributes','compatibilities',
 'registeredAt','registeredBy','deregisteredAt'].forEach(k => delete td[k]);

const tdFile = `${__dirname}/td-trust-pinned-topic.json`;
require('fs').writeFileSync(tdFile, JSON.stringify(td, null, 2));

const regOut = execSync(
  `aws ecs register-task-definition --cli-input-json file://${tdFile} --region ${REGION} --query "taskDefinition.{rev:revision}" --output json`,
  { encoding: 'utf8' }
);
const rev = JSON.parse(regOut).rev;

execSync(
  `aws ecs update-service --cluster vote-capsule-services --service vc-trust --task-definition vc-trust:${rev} --force-new-deployment --region ${REGION} --output json > nul`,
  { stdio: 'inherit' }
);

console.log(`✅ Trust service redeployed with pinned topic ${topic} on ${network}`);
console.log('   HashScan: https://hashscan.io/' + network + '/topic/' + topic);
