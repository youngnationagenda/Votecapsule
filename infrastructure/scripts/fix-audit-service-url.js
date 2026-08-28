#!/usr/bin/env node
/**
 * VoteCapsule — Fix AUDIT_SERVICE_URL in all ECS task definitions
 *
 * Problem: All services have AuditInterceptor that falls back to
 * localhost:3012 when AUDIT_SERVICE_URL env var is not set.
 * This causes ECONNREFUSED on every request (fire-and-forget so
 * it doesn't break responses, but fills logs with noise).
 *
 * Fix: Add AUDIT_SERVICE_URL and SERVICE_NAME to every task def.
 */

const { execSync } = require('child_process');
const fs = require('fs');

const ALB = 'http://vote-capsule-services-alb-181601180.us-east-1.elb.amazonaws.com';
const AUDIT_URL = `${ALB}/api/v1/audit`;

// service name → [ecs service name, service name string, service port]
const SERVICES = [
  { ecs: 'vc-identity',     family: 'vc-identity',     name: 'identity-service',     port: 3001 },
  { ecs: 'vc-campaign',     family: 'vc-campaign',     name: 'campaign-service',     port: 3016 },
  { ecs: 'vc-election',     family: 'vc-election',     name: 'election-service',     port: 3011 },
  { ecs: 'vc-candidate',    family: 'vc-candidate',    name: 'candidate-service',    port: 3009 },
  { ecs: 'vc-evidence',     family: 'vc-evidence',     name: 'evidence-service',     port: 3002 },
  { ecs: 'vc-notification', family: 'vc-notification', name: 'notification-service', port: 3007 },
  { ecs: 'vc-geography',    family: 'vc-geography',    name: 'geography-service',    port: 3004 },
  { ecs: 'vc-reporting',    family: 'vc-reporting',    name: 'reporting-service',    port: 3008 },
  { ecs: 'vc-workflow',     family: 'vc-workflow',     name: 'workflow-service',     port: 3009 },
  { ecs: 'vc-trust',        family: 'vc-trust',        name: 'trust-service',        port: 3003 },
  // vc-audit excluded — interceptor skips itself when SERVICE_NAME=audit-service
  { ecs: 'vc-billing',      family: 'vc-billing',      name: 'billing-service',      port: 3013 },
  { ecs: 'vc-ai',           family: 'vc-ai',           name: 'ai-service',           port: 3006 },
  { ecs: 'vc-tenant',       family: 'vc-tenant',       name: 'tenant-service',       port: 3002 },
];

function aws(cmd) {
  return JSON.parse(execSync(`aws ${cmd} --output json 2>&1`, {
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  }));
}

function addOrUpdateEnvVar(envList, name, value) {
  const existing = envList.find(e => e.name === name);
  if (existing) {
    existing.value = value;
  } else {
    envList.push({ name, value });
  }
}

async function fixService(svc) {
  console.log(`\n--- Fixing ${svc.ecs} ---`);

  // Get current task definition
  const tdData = aws(`ecs describe-task-definition --task-definition ${svc.family}`);
  const td = tdData.taskDefinition;
  console.log(`  Current: ${td.taskDefinitionArn.split('/').pop()}`);

  // Check if already set
  const currentEnv = td.containerDefinitions[0].environment || [];
  const hasAuditUrl  = currentEnv.some(e => e.name === 'AUDIT_SERVICE_URL');
  const hasServiceName = currentEnv.some(e => e.name === 'SERVICE_NAME');

  if (hasAuditUrl && hasServiceName) {
    const existingUrl = currentEnv.find(e => e.name === 'AUDIT_SERVICE_URL')?.value;
    if (!existingUrl?.includes('localhost')) {
      console.log(`  SKIP — already has AUDIT_SERVICE_URL=${existingUrl}`);
      return { svc: svc.ecs, skipped: true };
    }
  }

  // Build updated container definitions
  const updatedContainerDefs = td.containerDefinitions.map(cd => {
    const env = [...(cd.environment || [])];
    addOrUpdateEnvVar(env, 'AUDIT_SERVICE_URL', AUDIT_URL);
    addOrUpdateEnvVar(env, 'SERVICE_NAME', svc.name);
    return { ...cd, environment: env };
  });

  // Build new task definition (strip read-only fields)
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

  // Remove null/undefined/empty tags
  Object.keys(newTd).forEach(k => {
    if (newTd[k] === null || newTd[k] === undefined) delete newTd[k];
    if (Array.isArray(newTd[k]) && newTd[k].length === 0 && k === 'tags') delete newTd[k];
  });

  const tmpFile = `tmp_audit_fix_${svc.ecs}.json`;
  fs.writeFileSync(tmpFile, JSON.stringify(newTd, null, 2));

  // Register new revision
  const regResult = aws(`ecs register-task-definition --cli-input-json file://${tmpFile}`);
  const newRevArn = regResult.taskDefinition.taskDefinitionArn;
  const newRev = newRevArn.split('/').pop();
  console.log(`  Registered: ${newRev}`);

  // Force-deploy
  const updateResult = aws(
    `ecs update-service --cluster vote-capsule-services --service ${svc.ecs} ` +
    `--task-definition ${newRevArn} --force-new-deployment`
  );
  const s = updateResult.service;
  console.log(`  Deployed: run=${s.runningCount}/${s.desiredCount} deps=${s.deployments.length}`);

  // Cleanup
  try { fs.unlinkSync(tmpFile); } catch (_) {}

  return { svc: svc.ecs, newRev, ok: true };
}

async function main() {
  console.log('VoteCapsule — Fix AUDIT_SERVICE_URL across all services');
  console.log(`Setting: AUDIT_SERVICE_URL=${AUDIT_URL}`);
  console.log('='.repeat(65));

  const results = [];
  for (const svc of SERVICES) {
    try {
      const r = await fixService(svc);
      results.push(r);
    } catch (e) {
      console.error(`  ERROR: ${e.message.slice(0, 150)}`);
      results.push({ svc: svc.ecs, ok: false, error: e.message });
    }
  }

  console.log('\n' + '='.repeat(65));
  console.log('RESULTS:');
  results.forEach(r => {
    if (r.skipped) {
      console.log(`  [SKIP] ${r.svc.padEnd(20)} already configured`);
    } else if (r.ok) {
      console.log(`  [OK  ] ${r.svc.padEnd(20)} ${r.newRev}`);
    } else {
      console.log(`  [FAIL] ${r.svc.padEnd(20)} ${(r.error || '').slice(0, 60)}`);
    }
  });

  const failed = results.filter(r => !r.ok && !r.skipped);
  if (failed.length) {
    console.log(`\nWARN: ${failed.length} failed`);
  } else {
    console.log(`\nAll ${results.length} services updated. ECONNREFUSED errors will stop after rolling restart.`);
  }
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
