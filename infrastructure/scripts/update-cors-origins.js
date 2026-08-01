/**
 * Update ALLOWED_ORIGINS in all 13 ECS task definitions to include all portal domains.
 */
const { execSync } = require('child_process');
const fs = require('fs');

const CLUSTER = 'vote-capsule-services';
const REGION = 'us-east-1';
const ALL_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://votecapsule.yna.co.ke',
  'https://transparency.votecapsule.yna.co.ke',
  'https://authority.votecapsule.yna.co.ke',
  'https://party.votecapsule.yna.co.ke',
  'https://candidate.votecapsule.yna.co.ke',
  'https://observer.votecapsule.yna.co.ke',
].join(',');

const SVCS = ['vc-identity','vc-tenant','vc-trust','vc-geography','vc-evidence',
              'vc-ai','vc-workflow','vc-notification','vc-candidate','vc-reporting',
              'vc-election','vc-audit','vc-billing'];

const READ_ONLY = ['taskDefinitionArn','revision','status','requiresAttributes',
                   'compatibilities','registeredAt','registeredBy','deregisteredAt'];

function cli(cmd) {
  try { return JSON.parse(execSync(cmd, { encoding:'utf8', maxBuffer:5*1024*1024 })); }
  catch(e) { console.error('  ERR:', e.message.slice(0,200)); return null; }
}

async function main() {
  console.log('=== Updating ALLOWED_ORIGINS for all 13 services ===\n');
  
  for (const svc of SVCS) {
    console.log(`--- ${svc} ---`);
    const result = cli(`aws ecs describe-task-definition --task-definition ${svc} --region ${REGION} --output json`);
    if (!result) continue;
    
    const td = result.taskDefinition;
    const container = td.containerDefinitions[0];
    
    // Update ALLOWED_ORIGINS
    const idx = container.environment.findIndex(e => e.name === 'ALLOWED_ORIGINS');
    if (idx >= 0) {
      container.environment[idx].value = ALL_ORIGINS;
    } else {
      container.environment.push({ name: 'ALLOWED_ORIGINS', value: ALL_ORIGINS });
    }
    
    // Remove AWS read-only fields
    READ_ONLY.forEach(k => delete td[k]);
    
    const tmpFile = `D:/Votecapsule/vote-capsule/infrastructure/scripts/td-cors-${svc}.json`;
    fs.writeFileSync(tmpFile, JSON.stringify(td));
    
    const reg = cli(`aws ecs register-task-definition --cli-input-json "file://${tmpFile}" --region ${REGION} --output json`);
    if (!reg) { fs.unlinkSync(tmpFile); continue; }
    
    const rev = reg.taskDefinition.revision;
    const upd = cli(`aws ecs update-service --cluster ${CLUSTER} --service ${svc} --task-definition ${svc.replace('vc-','vc-')}:${rev} --force-new-deployment --region ${REGION} --output json`);
    
    console.log(`  ${upd ? '✅' : '❌'} ${svc}:${rev} — ALLOWED_ORIGINS updated`);
    fs.unlinkSync(tmpFile);
  }
  
  console.log('\nDone. All services will restart with updated CORS origins.');
}

main().catch(console.error);
