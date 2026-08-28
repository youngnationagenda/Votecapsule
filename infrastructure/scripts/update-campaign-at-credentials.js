#!/usr/bin/env node
/**
 * VoteCapsule — Update campaign ECS task def with AT credentials
 *
 * AT credentials come from Secrets Manager: vote-capsule/africas-talking/credentials
 * ECS will inject them as environment variables at runtime.
 *
 * To set real AT credentials:
 *   aws secretsmanager update-secret \
 *     --secret-id vote-capsule/africas-talking/credentials \
 *     --secret-string '{"apiKey":"YOUR_AT_API_KEY","username":"votecapsule","senderId":"VOTECAP","webhookSecret":"YOUR_WEBHOOK_SECRET"}'
 *
 * Then re-run this script to pick up the new values.
 */
const { execSync } = require('child_process');
const fs = require('fs');

const AT_SECRET_ARN = 'arn:aws:secretsmanager:us-east-1:683541453923:secret:vote-capsule/africas-talking/credentials-fIUewg';

function aws(cmd) {
  return JSON.parse(execSync(`aws ${cmd} --output json 2>&1`, {
    encoding: 'utf8', maxBuffer: 10 * 1024 * 1024,
  }));
}

async function main() {
  console.log('Updating vc-campaign task definition with AT credentials...');

  // 1. Get current task def
  const tdData = aws('ecs describe-task-definition --task-definition vc-campaign');
  const td = tdData.taskDefinition;
  console.log('Current:', td.taskDefinitionArn.split('/').pop());

  // 2. Read AT credentials from Secrets Manager
  const secretData = aws(`secretsmanager get-secret-value --secret-id "${AT_SECRET_ARN}"`);
  const atCreds = JSON.parse(secretData.SecretString);
  console.log('AT credentials loaded:');
  console.log('  username:', atCreds.username);
  console.log('  senderId:', atCreds.senderId);
  console.log('  apiKey:  ', atCreds.apiKey ? 'SET (' + atCreds.apiKey.slice(0, 6) + '...)' : 'EMPTY (sandbox mode)');

  // 3. Build updated container definitions
  const updatedContainerDefs = td.containerDefinitions.map(cd => {
    const env = [...(cd.environment || [])];

    // Update AT env vars
    const atVars = {
      'AT_API_KEY':        atCreds.apiKey      ?? '',
      'AT_USERNAME':       atCreds.username    ?? 'sandbox',
      'AT_SENDER_ID':      atCreds.senderId    ?? 'VOTECAP',
      'AT_WEBHOOK_SECRET': atCreds.webhookSecret ?? '',
    };

    for (const [name, value] of Object.entries(atVars)) {
      const existing = env.find(e => e.name === name);
      if (existing) {
        existing.value = value;
      } else {
        env.push({ name, value });
      }
    }

    return { ...cd, environment: env };
  });

  // 4. Register new revision
  const newTd = {
    family:                  td.family,
    taskRoleArn:             td.taskRoleArn,
    executionRoleArn:        td.executionRoleArn,
    networkMode:             td.networkMode,
    containerDefinitions:    updatedContainerDefs,
    volumes:                 td.volumes || [],
    placementConstraints:    td.placementConstraints || [],
    requiresCompatibilities: td.requiresCompatibilities || ['FARGATE'],
    cpu:                     td.cpu,
    memory:                  td.memory,
  };

  Object.keys(newTd).forEach(k => {
    if (newTd[k] === null || newTd[k] === undefined) delete newTd[k];
    if (Array.isArray(newTd[k]) && newTd[k].length === 0 && k === 'tags') delete newTd[k];
  });

  const tmpFile = 'tmp_campaign_at_td.json';
  fs.writeFileSync(tmpFile, JSON.stringify(newTd, null, 2));

  const regResult = aws(`ecs register-task-definition --cli-input-json file://${tmpFile}`);
  const newRev = regResult.taskDefinition.taskDefinitionArn.split('/').pop();
  console.log('Registered:', newRev);

  // 5. Force-deploy
  const updateResult = aws(
    `ecs update-service --cluster vote-capsule-services --service vc-campaign ` +
    `--task-definition ${regResult.taskDefinition.taskDefinitionArn} --force-new-deployment`
  );
  const svc = updateResult.service;
  console.log(`Deploying: run=${svc.runningCount}/${svc.desiredCount}`);

  try { fs.unlinkSync(tmpFile); } catch (_) {}

  console.log('\nDone.');
  if (!atCreds.apiKey) {
    console.log('\nNOTE: AT_API_KEY is empty — SMS will run in MOCK mode (logged but not sent).');
    console.log('To enable real SMS, run:');
    console.log(`  aws secretsmanager update-secret \\`);
    console.log(`    --secret-id vote-capsule/africas-talking/credentials \\`);
    console.log(`    --secret-string '{"apiKey":"YOUR_KEY","username":"YOUR_AT_USERNAME","senderId":"VOTECAP","webhookSecret":"YOUR_SECRET"}'`);
    console.log(`  node update-campaign-at-credentials.js`);
  } else {
    console.log('\nAT credentials are SET — real SMS delivery is active.');
  }
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
