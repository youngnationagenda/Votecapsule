const { execSync } = require('child_process');
const REGION = 'us-east-1';
const SVCS = ['identity','tenant','trust','geography','evidence','ai','workflow','notification','candidate','reporting','election','audit','billing','admin-web'];
console.log('=== ECR Image Status ===\n');
for (const s of SVCS) {
  const repo = s === 'admin-web' ? `vote-capsule/${s}` : `vote-capsule/${s}-service`;
  try {
    const out = JSON.parse(execSync(`aws ecr describe-images --repository-name ${repo} --region ${REGION} --output json --query "reverse(sort_by(imageDetails,&imagePushedAt))[:1]"`, {encoding:'utf8'}));
    if (out && out[0]) {
      const tags = (out[0].imageTags||[]).join(',') || 'untagged';
      const pushed = out[0].imagePushedAt;
      const isNew = pushed > '2026-08-01T10:00:00';
      console.log(`${isNew ? '✅' : '⚠️'} ${s.padEnd(12)} tags:[${tags}] pushed:${pushed}`);
    } else {
      console.log(`❌ ${s.padEnd(12)} — NO IMAGE`);
    }
  } catch(e) {
    console.log(`❌ ${s.padEnd(12)} — ${e.message.slice(0,60)}`);
  }
}
