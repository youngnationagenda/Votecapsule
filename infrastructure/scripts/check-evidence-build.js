/**
 * Check what happened to evidence-service in the latest CodeBuild
 * and force-push a fresh image if needed.
 */
const { execSync } = require('child_process');

function aws(cmd) {
  return JSON.parse(execSync(`aws ${cmd} --region us-east-1 --output json`, { encoding: 'utf8', env: { ...process.env, PYTHONIOENCODING: 'utf-8' } }));
}

async function main() {
  // Check latest ECR image for evidence
  const ecr = aws('ecr describe-images --repository-name vote-capsule/evidence-service --query "reverse(sort_by(imageDetails,&imagePushedAt))[0:3].{tag:imageTags[0],pushed:imagePushedAt,digest:imageDigest}"');
  console.log('Latest evidence-service ECR images:');
  ecr.forEach(i => console.log(`  ${i.tag} — ${i.pushed}`));

  // The build pushed at 01:48 — that's from commit efc7ec4, not cb2b960
  // Check if cb2b960 tag exists
  const cbTag = aws('ecr describe-images --repository-name vote-capsule/evidence-service --query "imageDetails[?contains(imageTags,\'cb2b960a\')].{tag:imageTags[0],pushed:imagePushedAt}"');
  console.log('\ncb2b960a tag exists for evidence-service:', cbTag.length > 0 ? 'YES' : 'NO');

  // Check GitHub Actions build for evidence (different workflow)
  // The build-and-push-services.yml triggers on changes to services/**
  // cb2b960 DID change evidence/src — so GH Actions should have run
  const ghRuns = aws('codebuild list-builds-for-project --project-name vote-capsule-docker-build --sort-order DESCENDING --query "ids[:3]"');
  console.log('\nLatest CodeBuild runs:', ghRuns);

  for (const runId of ghRuns) {
    const b = aws(`codebuild batch-get-builds --ids "${runId}" --query "builds[0].{id:id,status:buildStatus,commit:resolvedSourceVersion,endTime:endTime}"`);
    console.log(`  ${b.id?.slice(-8)} | ${b.status} | commit: ${b.commit?.slice(0,8)} | ended: ${b.endTime}`);
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });
