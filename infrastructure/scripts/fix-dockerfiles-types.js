/**
 * Fix all 13 Dockerfiles — add pnpm virtual store types fix
 * after the existing COPY types/dist lines.
 */
const fs = require('fs');
const path = require('path');

const SERVICES_DIR = 'D:/Votecapsule/vote-capsule/services';
const SERVICES = ['identity','tenant','trust','geography','evidence','ai','workflow',
                  'notification','candidate','reporting','election','audit','billing'];

const PNPM_FIX = `# Fix pnpm virtual store path for @vote-capsule/types
RUN find ./node_modules/.pnpm -path "*vote-capsule+types*/node_modules/@vote-capsule/types" -type d 2>/dev/null | xargs -I{} cp -r ./node_modules/@vote-capsule/types/dist {}/dist 2>/dev/null || true`;

for (const svc of SERVICES) {
  const dockerfilePath = path.join(SERVICES_DIR, svc, 'Dockerfile');
  if (!fs.existsSync(dockerfilePath)) continue;
  
  let content = fs.readFileSync(dockerfilePath, 'utf8');
  
  // If fix already applied, skip
  if (content.includes('pnpm virtual store path')) {
    console.log(`⏭ ${svc}: already fixed`);
    continue;
  }
  
  // Insert fix BEFORE the EXPOSE line
  const exposeIdx = content.indexOf('\nEXPOSE $SERVICE_PORT');
  if (exposeIdx === -1) {
    console.log(`⚠️  ${svc}: EXPOSE not found`);
    continue;
  }
  
  content = content.slice(0, exposeIdx) + '\n' + PNPM_FIX + content.slice(exposeIdx);
  fs.writeFileSync(dockerfilePath, content);
  console.log(`✅ ${svc}: pnpm types fix injected`);
}

console.log('\nDone.');
