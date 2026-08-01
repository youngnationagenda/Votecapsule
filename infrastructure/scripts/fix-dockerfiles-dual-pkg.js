/**
 * Update Dockerfiles to copy @vote-capsule/types dist/cjs
 * (the CJS build that Node.js backends can consume)
 * replacing the old flat dist/ copy.
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

  // Replace: COPY .../packages/types/dist → COPY .../packages/types/dist/cjs
  content = content.replace(
    /COPY --from=builder \/app\/packages\/types\/dist .\/node_modules\/@vote-capsule\/types\/dist\b/g,
    'COPY --from=builder /app/packages/types/dist/cjs ./node_modules/@vote-capsule/types/dist/cjs\nCOPY --from=builder /app/packages/types/dist/esm ./node_modules/@vote-capsule/types/dist/esm'
  );

  fs.writeFileSync(dockerfilePath, content);
  console.log(`✅ ${svc}: Dockerfile updated for dual package (cjs + esm)`);
}

console.log('\nDone. Backend services will use dist/cjs; Vite will use dist/esm via exports field.');
