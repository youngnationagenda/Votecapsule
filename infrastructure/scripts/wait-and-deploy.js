/**
 * Wait for CodeBuild cb2b960 to finish, then force-redeploy
 * vc-evidence and vc-workflow with the new images.
 */
const { execSync } = require('child_process');

const BUILD_ID = 'vote-capsule-docker-build:fb2ad871-63c4-41e9-9c8f-afe793a69d2f';
const SERVICES = ['vc-evidence', 'vc-workflow'];
const CLUSTER  = 'vote-capsule-services';
const REGION   = 'us-east-1';

function awsCli(cmd) {
  try {
    return JSON.parse(execSync(`aws ${cmd} --region ${REGION} --output json`, { encoding: 'utf8' }));
  } catch (e) {
    return null;
  }
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function waitForBuild() {
  console.log(`Polling CodeBuild: ${BUILD_ID}`);
  let attempts = 0;
  while (attempts < 40) {
    const result = awsCli(`codebuild batch-get-builds --ids "${BUILD_ID}"`);
    const build  = result?.builds?.[0];
    const status = build?.buildStatus;
    const phase  = build?.currentPhase;
    console.log(`  [${new Date().toISOString()}] Status: ${status} | Phase: ${phase}`);

    if (status === 'SUCCEEDED') {
      console.log('✅ Build SUCCEEDED');
      return true;
    }
    if (status === 'FAILED' || status === 'FAULT' || status === 'STOPPED' || status === 'TIMED_OUT') {
      console.error(`❌ Build ${status}`);
      return false;
    }
    await sleep(30_000); // poll every 30 seconds
    attempts++;
  }
  console.error('❌ Timed out waiting for build');
  return false;
}

async function forceRedeploy() {
  console.log('\nForce-redeploying services with new images...');
  for (const svc of SERVICES) {
    console.log(`  Redeploying ${svc}...`);
    const result = awsCli(
      `ecs update-service --cluster ${CLUSTER} --service ${svc} --force-new-deployment`
    );
    const desired = result?.service?.desiredCount;
    const running = result?.service?.runningCount;
    console.log(`  ✅ ${svc} — desired: ${desired}, running: ${running}`);
  }
}

async function waitForStable() {
  console.log('\nWaiting for services to stabilize...');
  let attempts = 0;
  while (attempts < 20) {
    await sleep(30_000);
    const result = awsCli(
      `ecs describe-services --cluster ${CLUSTER} --services ${SERVICES.join(' ')}`
    );
    const services = result?.services ?? [];
    const allStable = services.every(s => s.runningCount === s.desiredCount && s.deployments?.length === 1);
    services.forEach(s => console.log(`  ${s.serviceName}: ${s.runningCount}/${s.desiredCount} | deployments: ${s.deployments?.length}`));

    if (allStable) {
      console.log('✅ All services stable');
      return;
    }
    attempts++;
  }
  console.warn('⚠️  Services still stabilizing — check ECS console');
}

async function verifyEndpoints() {
  console.log('\nVerifying live endpoints...');
  const http = require('http');
  const ALB  = 'vote-capsule-services-alb-181601180.us-east-1.elb.amazonaws.com';

  const checks = [
    { method: 'POST', path: '/api/v1/workflow/sla-check',   expected: 200, label: 'Workflow /sla-check (dash)' },
    { method: 'POST', path: '/api/v1/workflow/sla/check',   expected: 200, label: 'Workflow /sla/check (slash)' },
    { method: 'GET',  path: '/api/v1/evidence/health',      expected: 200, label: 'Evidence health' },
    { method: 'GET',  path: '/api/v1/evidence/reconciliation/form-b?electionId=00000000-0000-0000-0000-000000000000', expected: 400, label: 'Reconciliation /form-b (400 = bad UUID = service responding)' },
  ];

  for (const { method, path, expected, label } of checks) {
    const result = await new Promise(resolve => {
      const opts = { host: ALB, path, method, timeout: 8000 };
      if (method === 'POST') { opts.headers = { 'Content-Type': 'application/json', 'Content-Length': 2 }; }
      const req = http.request(opts, res => {
        res.resume();
        resolve(res.statusCode);
      });
      req.on('timeout', () => { req.destroy(); resolve('TIMEOUT'); });
      req.on('error', e => resolve('ERR:' + e.message.slice(0,30)));
      if (method === 'POST') req.write('{}');
      req.end();
    });
    const ok = result === expected;
    console.log(`  ${ok ? '✅' : '❌'} ${label}: HTTP ${result}${ok ? '' : ` (expected ${expected})`}`);
  }
}

async function main() {
  console.log('=== VoteCapsule™ — Wait & Deploy (cb2b960) ===\n');
  const ok = await waitForBuild();
  if (!ok) {
    console.error('Build failed — not deploying');
    process.exit(1);
  }

  // Give ECR a few seconds for the :latest tag to propagate
  await sleep(5000);

  await forceRedeploy();
  await waitForStable();
  await verifyEndpoints();
  console.log('\n=== Done ===');
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
