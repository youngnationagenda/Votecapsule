#!/usr/bin/env node
/**
 * VoteCapsule ECS Full Health Check
 * Checks all 14 services, identifies stale digest / task failures
 */
const { execSync } = require('child_process');

function aws(cmd) {
  return JSON.parse(execSync(`aws ${cmd} --output json`, { encoding: 'utf8' }));
}

const SERVICES = [
  'vc-identity','vc-campaign','vc-candidate','vc-election','vc-evidence',
  'vc-geography','vc-trust','vc-notification','vc-reporting','vc-workflow',
  'vc-audit','vc-billing','vc-ai','vc-tenant'
];

const BATCH1 = SERVICES.slice(0, 9);
const BATCH2 = SERVICES.slice(9);

async function main() {
  console.log('VoteCapsule ECS Health Check — ' + new Date().toISOString());
  console.log('='.repeat(72));

  const all = [];

  for (const batch of [BATCH1, BATCH2]) {
    const d = aws(`ecs describe-services --cluster vote-capsule-services --services ${batch.join(' ')}`);
    all.push(...d.services);
  }

  const healthy = [], degraded = [], down = [];

  all.forEach(s => {
    const name  = s.serviceName;
    const run   = s.runningCount;
    const des   = s.desiredCount;
    const dep   = (s.deployments || [])[0] || {};
    const evts  = s.events || [];
    const lastEvt = evts[0] ? evts[0].message : '';
    const staleDigest = lastEvt.includes('not found') && lastEvt.includes('sha256');
    const taskFailed  = lastEvt.includes('failed container health checks');
    const pullErr     = lastEvt.includes('CannotPullContainerError');

    const obj = { name, run, des, dep, staleDigest, taskFailed, pullErr, lastEvt };

    if (run === des && run > 0) healthy.push(obj);
    else if (run > 0 && run < des) degraded.push(obj);
    else down.push(obj);
  });

  console.log('\nHEALTHY (' + healthy.length + '):');
  healthy.forEach(s => console.log(`  OK  ${s.name.padEnd(20)} running=${s.run}/${s.des}`));

  if (degraded.length) {
    console.log('\nDEGRADED (' + degraded.length + '):');
    degraded.forEach(s => {
      console.log(`  DEG ${s.name.padEnd(20)} running=${s.run}/${s.des}`);
      console.log(`      ${s.lastEvt.slice(0, 110)}`);
    });
  }

  if (down.length) {
    console.log('\nDOWN / CRASHING (' + down.length + '):');
    down.forEach(s => {
      const reason = s.staleDigest ? 'STALE_DIGEST' : s.pullErr ? 'PULL_ERROR' : s.taskFailed ? 'HEALTHCHECK_FAIL' : 'UNKNOWN';
      console.log(`  ERR ${s.name.padEnd(20)} running=${s.run}/${s.des} [${reason}]`);
      console.log(`      ${s.lastEvt.slice(0, 110)}`);
    });
  }

  console.log('\n' + '='.repeat(72));
  console.log(`Summary: ${healthy.length} healthy, ${degraded.length} degraded, ${down.length} down`);

  return { healthy, degraded, down };
}

main().then(({ down, degraded }) => {
  if (down.length + degraded.length > 0) process.exit(1);
}).catch(e => { console.error('FATAL:', e.message); process.exit(2); });
