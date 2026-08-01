/**
 * Force new deployment on all 13 ECS services
 * so they re-pull :latest images and re-register with updated health checks.
 */
const { execSync } = require('child_process');
const REGION = 'us-east-1';
const CLUSTER = 'vote-capsule-services';

const SERVICES = [
  'vc-identity','vc-tenant','vc-trust','vc-geography','vc-evidence',
  'vc-ai','vc-workflow','vc-notification','vc-candidate','vc-reporting',
  'vc-election','vc-audit','vc-billing'
];

function cli(cmd) {
  try {
    const out = execSync(cmd, { encoding: 'utf8', maxBuffer: 2*1024*1024 });
    return JSON.parse(out);
  } catch(e) {
    console.error('  ERR:', e.message.slice(0, 150));
    return null;
  }
}

async function main() {
  console.log('=== Force-deploying all 13 ECS services ===\n');
  for (const svc of SERVICES) {
    const r = cli(`aws ecs update-service --cluster ${CLUSTER} --service ${svc} --force-new-deployment --region ${REGION} --output json`);
    if (r) {
      const s = r.service;
      console.log(`✅ ${svc} → running:${s.runningCount} pending:${s.pendingCount} desired:${s.desiredCount}`);
    } else {
      console.log(`❌ ${svc} — failed`);
    }
  }
  console.log('\nAll deployments triggered. New tasks will start with updated health checks.');
  console.log('Services will become healthy once they register at the updated health check paths.');
}

main().catch(console.error);
