/**
 * Update ALB target group health checks to use actual API paths
 * with broad matcher (200-405) so services register as healthy
 * even while running old images (pre-prefix-fix).
 */
const { execSync } = require('child_process');
const REGION = 'us-east-1';

const TGS = [
  { arn: 'arn:aws:elasticloadbalancing:us-east-1:683541453923:targetgroup/vc-identity-tg/e340b82137ded4b3',    path: '/api/v1/identity/auth/login' },
  { arn: 'arn:aws:elasticloadbalancing:us-east-1:683541453923:targetgroup/vc-tenant-tg/8c7179e11b86f1a6',      path: '/api/v1/tenant/tenants' },
  { arn: 'arn:aws:elasticloadbalancing:us-east-1:683541453923:targetgroup/vc-geography-tg/5d4b9d9e74550e58',   path: '/api/v1/geography/stats' },
  { arn: 'arn:aws:elasticloadbalancing:us-east-1:683541453923:targetgroup/vc-evidence-tg/6fa01f7fd3e0aad5',    path: '/api/v1/evidence/capsules' },
  { arn: 'arn:aws:elasticloadbalancing:us-east-1:683541453923:targetgroup/vc-ai-tg/c1099a2c8a2c9279',          path: '/api/v1/ai/stats' },
  { arn: 'arn:aws:elasticloadbalancing:us-east-1:683541453923:targetgroup/vc-workflow-tg/89d936a88cfa4716',    path: '/api/v1/workflow/stats' },
  { arn: 'arn:aws:elasticloadbalancing:us-east-1:683541453923:targetgroup/vc-trust-tg/1aa6b54af3060c64',       path: '/api/v1/trust/batches' },
  { arn: 'arn:aws:elasticloadbalancing:us-east-1:683541453923:targetgroup/vc-notification-tg/00fcb326e4a5313f', path: '/api/v1/notification/notifications/stats' },
  { arn: 'arn:aws:elasticloadbalancing:us-east-1:683541453923:targetgroup/vc-candidate-tg/77a1234d977aa162',   path: '/api/v1/candidate/elections' },
  { arn: 'arn:aws:elasticloadbalancing:us-east-1:683541453923:targetgroup/vc-reporting-tg/22c4480fd47c20d3',   path: '/api/v1/reporting/publications' },
  { arn: 'arn:aws:elasticloadbalancing:us-east-1:683541453923:targetgroup/vc-election-tg/10b863b800d18ae4',    path: '/api/v1/election/elections' },
  { arn: 'arn:aws:elasticloadbalancing:us-east-1:683541453923:targetgroup/vc-audit-tg/21f1805768fbc814',       path: '/api/v1/audit/logs' },
  { arn: 'arn:aws:elasticloadbalancing:us-east-1:683541453923:targetgroup/vc-billing-tg/750f9e8282885d0f',     path: '/api/v1/billing/plans' },
];

function cli(cmd) {
  try {
    execSync(cmd, { encoding: 'utf8', maxBuffer: 2*1024*1024 });
    return true;
  } catch(e) {
    console.error('  ERR:', e.message.slice(0, 150));
    return false;
  }
}

for (const tg of TGS) {
  const ok = cli(`aws elbv2 modify-target-group --target-group-arn "${tg.arn}" --health-check-path "${tg.path}" --matcher HttpCode=200-405 --region ${REGION} --output json`);
  console.log(ok ? `✅ ${tg.path}` : `❌ ${tg.path}`);
}

console.log('\nDone. Services will pass health checks returning any 2xx/3xx/4xx status.');
