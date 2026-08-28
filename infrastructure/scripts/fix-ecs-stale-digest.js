#!/usr/bin/env node
/**
 * VoteCapsule — Fix ECS Stale Image Digest
 *
 * Problem: ECS Fargate cached old ECR image digests. When CodeBuild pushed
 * new :latest tags, ECS kept trying to pull the old digest (now deleted)
 * which causes CannotPullContainerError.
 *
 * Fix: Re-register each failing task definition (forces ECS to re-resolve
 * :latest to the current digest), then force-new-deployment.
 *
 * Affected services: vc-candidate, vc-trust, vc-reporting, vc-audit,
 *                    vc-evidence (1/2), vc-geography (1/2)
 */
const { execSync } = require('child_process');

function aws(cmd) {
  return JSON.parse(execSync(`aws ${cmd} --output json 2>&1`, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }));
}

function awsRaw(cmd) {
  return execSync(`aws ${cmd} 2>&1`, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
}

// Services to fix: [serviceName, currentTaskDef]
const FAILING = [
  { service: 'vc-ai', taskFamily: 'vc-ai' },
];

async function fixService({ service, taskFamily }) {
  console.log('\n--- Fixing ' + service + ' ---');

  // 1. Get current task definition (latest active revision)
  const tdData = aws(`ecs describe-task-definition --task-definition ${taskFamily}`);
  const td = tdData.taskDefinition;

  console.log('  Current task def: ' + td.taskDefinitionArn.split('/').pop());
  console.log('  Image: ' + td.containerDefinitions[0].image);

  // 2. Build new task definition — strip read-only fields, keep everything else
  const newTd = {
    family: td.family,
    taskRoleArn: td.taskRoleArn,
    executionRoleArn: td.executionRoleArn,
    networkMode: td.networkMode,
    containerDefinitions: td.containerDefinitions,
    volumes: td.volumes || [],
    placementConstraints: td.placementConstraints || [],
    requiresCompatibilities: td.requiresCompatibilities || ['FARGATE'],
    cpu: td.cpu,
    memory: td.memory,
    tags: td.tags || [],
  };

  // Remove null/undefined fields and empty arrays that cause API errors
  Object.keys(newTd).forEach(k => {
    if (newTd[k] === null || newTd[k] === undefined) delete newTd[k];
    if (Array.isArray(newTd[k]) && newTd[k].length === 0 && k === 'tags') delete newTd[k];
  });

  // Write to temp file to avoid shell escaping issues
  const tmpFile = `tmp_td_${service}.json`;
  require('fs').writeFileSync(tmpFile, JSON.stringify(newTd, null, 2));

  // 3. Register new revision
  const regResult = aws(`ecs register-task-definition --cli-input-json file://${tmpFile}`);
  const newRevArn = regResult.taskDefinition.taskDefinitionArn;
  const newRev = newRevArn.split('/').pop();
  console.log('  Registered new task def: ' + newRev);

  // 4. Update service to use new revision + force-new-deployment
  const updateResult = aws(
    `ecs update-service --cluster vote-capsule-services --service ${service} ` +
    `--task-definition ${newRevArn} --force-new-deployment`
  );
  const svc = updateResult.service;
  console.log('  Service updated: ' + svc.status + ' run=' + svc.runningCount + '/' + svc.desiredCount);
  console.log('  Deployments: ' + svc.deployments.length + ' (PRIMARY: ' +
    (svc.deployments[0] ? svc.deployments[0].status : 'none') + ')');

  // Cleanup temp file
  try { require('fs').unlinkSync(tmpFile); } catch (_) {}

  return { service, newRev, status: svc.status };
}

async function main() {
  console.log('VoteCapsule ECS Stale Digest Fix');
  console.log('Fixing ' + FAILING.length + ' services...');

  const results = [];
  for (const svc of FAILING) {
    try {
      const r = await fixService(svc);
      results.push({ ...r, ok: true });
    } catch (e) {
      console.error('  ERROR: ' + e.message.slice(0, 200));
      results.push({ service: svc.service, ok: false, error: e.message });
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('RESULTS:');
  results.forEach(r => {
    const tag = r.ok ? 'OK  ' : 'FAIL';
    console.log(`  [${tag}] ${r.service.padEnd(20)} ${r.ok ? r.newRev : r.error.slice(0, 60)}`);
  });

  const failed = results.filter(r => !r.ok);
  if (failed.length) {
    console.log('\nWARN: ' + failed.length + ' services failed to update');
    process.exit(1);
  } else {
    console.log('\nAll ' + results.length + ' services re-registered and deploying.');
    console.log('ECS will re-pull :latest from ECR with correct digest.');
    console.log('Run check-ecs-health.js in ~2 minutes to verify.');
  }
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(2); });
