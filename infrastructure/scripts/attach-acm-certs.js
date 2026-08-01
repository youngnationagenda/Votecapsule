/**
 * Attach *.votecapsule.yna.co.ke ACM wildcard cert to all 5 portal CloudFront distributions
 * and configure custom domain aliases.
 *
 * Cert ARN: arn:aws:acm:us-east-1:683541453923:certificate/001faf94-50d2-4fed-a635-dedfb497baba
 * (covers *.votecapsule.yna.co.ke + votecapsule.yna.co.ke)
 *
 * Admin portal (E2J8YA2BP1UC1H) already has its own cert — leave it
 */
const { execSync } = require('child_process');

const CERT_ARN = 'arn:aws:acm:us-east-1:683541453923:certificate/001faf94-50d2-4fed-a635-dedfb497baba';
const REGION = 'us-east-1';

const DISTRIBUTIONS = [
  { id: 'E18OX8YUDVZA5V', alias: 'transparency.votecapsule.yna.co.ke', name: 'Transparency Portal' },
  { id: 'E1Z32G6YW54GHT', alias: 'authority.votecapsule.yna.co.ke',    name: 'Authority Portal' },
  { id: 'E2K6MDXEZZ7UYS', alias: 'party.votecapsule.yna.co.ke',        name: 'Party Portal' },
  { id: 'E1O4XZRM79VCJ1', alias: 'candidate.votecapsule.yna.co.ke',    name: 'Candidate Portal' },
  { id: 'EZEXQ23EU9E55',  alias: 'observer.votecapsule.yna.co.ke',      name: 'Observer Portal' },
];

function cli(cmd) {
  try {
    return JSON.parse(execSync(cmd, { encoding: 'utf8', maxBuffer: 5*1024*1024 }));
  } catch(e) {
    console.error('  ERR:', (e.message||'').slice(0,300));
    return null;
  }
}

async function attachCert(dist) {
  console.log(`\n--- ${dist.name} (${dist.id}) → ${dist.alias} ---`);

  // Get full distribution config + ETag
  const resp = cli(`aws cloudfront get-distribution-config --id ${dist.id} --region ${REGION} --output json`);
  if (!resp) return;
  const etag = resp.ETag;
  const config = resp.DistributionConfig;

  // Set alias
  config.Aliases = { Quantity: 1, Items: [dist.alias] };

  // Set ACM cert — SNI only, TLS 1.2
  config.ViewerCertificate = {
    ACMCertificateArn: CERT_ARN,
    SSLSupportMethod: 'sni-only',
    MinimumProtocolVersion: 'TLSv1.2_2021',
    CertificateSource: 'acm',
    CloudFrontDefaultCertificate: false,
  };

  // Remove read-only fields that CloudFront rejects on update
  delete config.ViewerCertificate.Certificate;

  const fs = require('fs');
  const tmpFile = `D:/Votecapsule/vote-capsule/infrastructure/scripts/cf-config-${dist.id}.json`;
  fs.writeFileSync(tmpFile, JSON.stringify(config));

  const updateResult = cli(
    `aws cloudfront update-distribution --id ${dist.id} --distribution-config "file://${tmpFile}" --if-match ${etag} --region ${REGION} --output json`
  );
  if (updateResult) {
    console.log(`  ✅ ${dist.alias} → cert attached, distribution updating`);
    console.log(`     Status: ${updateResult.Distribution?.Status}`);
  } else {
    console.log(`  ❌ Failed`);
  }
}

async function main() {
  console.log('=== Attaching *.votecapsule.yna.co.ke cert to 5 CloudFront distributions ===');
  for (const dist of DISTRIBUTIONS) {
    await attachCert(dist);
  }
  console.log('\n=== Done — distributions are updating (InProgress, ~5 min to deploy) ===');
}

main().catch(console.error);
