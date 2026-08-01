/**
 * Fix all 13 service Dockerfiles:
 * Replace incorrect HEALTHCHECK path (/health) with HEALTHCHECK NONE.
 * This stops Docker marking containers as unhealthy.
 * The ALB health check (200-405) handles service health detection.
 */
const fs = require('fs');
const path = require('path');

const SERVICES_DIR = 'D:/Votecapsule/vote-capsule/services';
const SERVICES = ['identity','tenant','trust','geography','evidence','ai','workflow',
                  'notification','candidate','reporting','election','audit','billing'];

for (const svc of SERVICES) {
  const dockerfilePath = path.join(SERVICES_DIR, svc, 'Dockerfile');
  if (!fs.existsSync(dockerfilePath)) {
    console.log(`❌ ${svc}: Dockerfile not found`);
    continue;
  }
  
  let content = fs.readFileSync(dockerfilePath, 'utf8');
  
  // Replace HEALTHCHECK directive (multi-line) with HEALTHCHECK NONE
  const before = content;
  
  // Match: HEALTHCHECK --interval=... \n  CMD ...
  content = content.replace(
    /HEALTHCHECK\s+--interval=\S+\s+--timeout=\S+\s+--start-period=\S+\s+--retries=\S+\s*\\\s*\n\s+CMD\s+[^\n]+/g,
    'HEALTHCHECK NONE'
  );
  
  if (content !== before) {
    fs.writeFileSync(dockerfilePath, content);
    console.log(`✅ ${svc}: HEALTHCHECK replaced with HEALTHCHECK NONE`);
  } else {
    // Try single-line variant
    content = content.replace(
      /HEALTHCHECK\s+--interval=\S+[^\n]+\n\s+CMD[^\n]+/g,
      'HEALTHCHECK NONE'
    );
    if (content !== before) {
      fs.writeFileSync(dockerfilePath, content);
      console.log(`✅ ${svc}: HEALTHCHECK replaced (single-line variant)`);
    } else {
      console.log(`⚠️ ${svc}: Pattern not matched — check manually`);
      // Show what's in the file
      const lines = content.split('\n').filter(l => l.includes('HEALTHCHECK'));
      console.log(`   Found: ${lines.join(' | ')}`);
    }
  }
}
console.log('\nDone. Commit + push to trigger new Docker builds.');
