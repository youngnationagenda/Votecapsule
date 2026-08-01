/**
 * Simplify Dockerfiles — remove the pnpm virtual store workaround.
 * Now that @vote-capsule/types uses CommonJS (not ESM), the module
 * resolution doesn't require explicit .js extensions and the
 * COPY to flat ./node_modules/@vote-capsule/types/dist is sufficient.
 */
const fs = require('fs');
const path = require('path');

const SERVICES_DIR = 'D:/Votecapsule/vote-capsule/services';
const SERVICES = ['identity','tenant','trust','geography','evidence','ai','workflow',
                  'notification','candidate','reporting','election','audit','billing'];

for (const svc of SERVICES) {
  const dockerfilePath = path.join(SERVICES_DIR, svc, 'Dockerfile');
  if (!fs.existsSync(dockerfilePath)) continue;
  
  let content = fs.readFileSync(dockerfilePath, 'utf8');
  
  // Remove the complex pnpm virtual store workaround
  content = content
    .replace(/\n# Also copy to pnpm virtual store path \(handles hoisted modules\)\nRUN find[^\n]+\n/g, '\n')
    .replace(/\n# Fix pnpm virtual store path for @vote-capsule\/types\nRUN find[^\n]+\n/g, '\n');
  
  fs.writeFileSync(dockerfilePath, content);
  console.log(`✅ ${svc}: simplified Dockerfile`);
}

console.log('\nDone. @vote-capsule/types now uses CommonJS — no pnpm virtual store workaround needed.');
