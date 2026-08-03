/**
 * VoteCapsule™ — Phase 10 Force Deploy Script
 *
 * Force-redeploys all 13 ECS services after CodeBuild pushes fresh images.
 * Run this after CodeBuild completes to pick up the tsc-fixed Docker images.
 *
 * Usage: node force-deploy-phase10.js
 */

const { execSync } = require('child_process');

const CLUSTER = 'vote-capsule-services';
const REGION = 'us-east-1';

const SERVICES = [
  // Core services (had dist/main issue — fixed in a239242)
  { name: 'vc-geography',  taskDef: null },
  { name: 'vc-tenant',     taskDef: null },
  { name: 'vc-trust',      taskDef: null },
  { name: 'vc-workflow',   taskDef: null },
  // Updated to v2 evidence bucket
  { name: 'vc-evidence',   taskDef: 'vc-evidence:10' },
  { name: 'vc-ai',         taskDef: 'vc-ai:10' },
  // Phase 8 services (new images from a239242)
  { name: 'vc-audit',      taskDef: null },
  { name: 'vc-billing',    taskDef: null },
  // Already running — force new deployment to pick up latest image
  { name: 'vc-identity',   taskDef: null },
  { name: 'vc-notification', taskDef: null },
  { name: 'vc-candidate',  taskDef: null },
  { name: 'vc-reporting',  taskDef: null },
  { name: 'vc-election',   taskDef: null },
];

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║  VoteCapsule™ — Phase 10 Force Deploy All 13 Services        ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');
console.log(`Cluster: ${CLUSTER}`);
console.log(`Region:  ${REGION}`);
console.log(`Services: ${SERVICES.length}\n`);

function run(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', maxBuffer: 2 * 1024 * 1024 }).trim();
  } catch (e) {
    return `ERROR: ${e.message.slice(0, 200)}`;
  }
}

// Check CodeBuild status first
console.log('【0】 Checking CodeBuild status...');
const builds = run(`aws codebuild list-builds-for-project --project-name vote-capsule-docker-build --sort-order DESCENDING --region ${REGION} --output json --query "ids[0]"`);
const buildId = JSON.parse(builds);
const buildInfo = JSON.parse(run(`aws codebuild batch-get-builds --ids "${buildId}" --region ${REGION} --output json --query "builds[0].{status:buildStatus,phase:currentPhase}"`));

console.log(`  Build: ${buildId}`);
console.log(`  Status: ${buildInfo.status} — Phase: ${buildInfo.phase}`);

if (buildInfo.status === 'IN_PROGRESS') {
  console.log('\n⚠️  CodeBuild still running. Wait for it to complete before deploying.');
  console.log('   Re-run this script after the build finishes.\n');
  console.log('   Monitor: https://console.aws.amazon.com/codesuite/codebuild/projects/vote-capsule-docker-build/build');
  process.exit(0);
}

if (buildInfo.status !== 'SUCCEEDED') {
  console.log(`\n❌ CodeBuild ${buildInfo.status}. Check logs before deploying.`);
  process.exit(1);
}

console.log('  ✅ CodeBuild SUCCEEDED — proceeding with force deploy\n');

// Force deploy all services
console.log('【1】 Force-redeploying all 13 ECS services...\n');

let success = 0;
let failed = 0;

for (const svc of SERVICES) {
  let cmd = `aws ecs update-service --cluster ${CLUSTER} --service ${svc.name} --force-new-deployment --region ${REGION} --output json --query "service.{name:serviceName,taskDef:taskDefinition}"`;
  if (svc.taskDef) {
    cmd = `aws ecs update-service --cluster ${CLUSTER} --service ${svc.name} --task-definition ${svc.taskDef} --force-new-deployment --region ${REGION} --output json --query "service.{name:serviceName,taskDef:taskDefinition}"`;
  }

  const result = run(cmd);
  if (result.startsWith('ERROR')) {
    console.log(`  ❌ ${svc.name}: ${result}`);
    failed++;
  } else {
    const parsed = JSON.parse(result);
    console.log(`  ✅ ${parsed.name} — taskDef: ${parsed.taskDef.split('/').pop()}`);
    success++;
  }
}

console.log(`\n  Deployed: ${success}/${SERVICES.length} services`);
if (failed > 0) console.log(`  Failed:   ${failed} services`);

// Wait a moment then check status
console.log('\n【2】 Waiting 30s then checking running counts...\n');
setTimeout(() => {
  const serviceNames = SERVICES.map(s => s.name).join(' ');
  const status = JSON.parse(run(
    `aws ecs describe-services --cluster ${CLUSTER} --services ${serviceNames} --region ${REGION} --output json --query "services[*].{name:serviceName,running:runningCount,desired:desiredCount}"`
  ));

  let allRunning = true;
  status.forEach(s => {
    const ok = s.running === s.desired;
    console.log(`  ${ok ? '✅' : '⏳'} ${s.name}: ${s.running}/${s.desired}`);
    if (!ok) allRunning = false;
  });

  if (allRunning) {
    console.log('\n🎉 All services are running! Run smoke test:');
    console.log('   node D:\\Votecapsule\\vote-capsule\\infrastructure\\scripts\\smoke-test.js');
  } else {
    console.log('\n⏳ Some services still starting. Wait 60-90s and check again.');
    console.log('   Or run: node force-deploy-phase10.js (will re-check build status)');
  }
}, 30000);
