#!/usr/bin/env node
/**
 * VoteCapsule™ — Fix Dockerfile base image references
 *
 * Problem: public.ecr.aws/docker/library/ returns 429 Too Many Requests
 *          when CodeBuild pulls the same base image for 14+ services in
 *          one build run (rate limit per account on ECR Public Gallery).
 *
 * Solution: Use our private ECR Pull Through Cache, which routes
 *           683541453923.dkr.ecr.us-east-1.amazonaws.com/ecr-public/...
 *           → public.ecr.aws/...  and caches the result in our own ECR.
 *           First pull fetches from upstream; all subsequent pulls are
 *           served from our private ECR — no rate limits.
 *
 * Pull-through cache rule created:
 *   prefix:   ecr-public
 *   upstream: public.ecr.aws
 *
 * Usage: node scripts/fix-dockerfiles-ecr-mirror.js
 */
'use strict';

const fs   = require('fs');
const path = require('path');

const ACCOUNT  = '683541453923';
const REGION   = 'us-east-1';
const REGISTRY = `${ACCOUNT}.dkr.ecr.${REGION}.amazonaws.com`;

// Mapping: old public prefix → new private pull-through cache prefix
const REPLACEMENTS = [
  {
    from: 'public.ecr.aws/docker/library/node:22-alpine',
    to:   `${REGISTRY}/ecr-public/docker/library/node:22-alpine`,
  },
  {
    from: 'public.ecr.aws/docker/library/node:22-slim',
    to:   `${REGISTRY}/ecr-public/docker/library/node:22-slim`,
  },
  {
    from: 'public.ecr.aws/docker/library/nginx:alpine',
    to:   `${REGISTRY}/ecr-public/docker/library/nginx:alpine`,
  },
];

// All Dockerfiles to patch
const DOCKERFILES = [
  // Services
  'services/ai/Dockerfile',
  'services/audit/Dockerfile',
  'services/billing/Dockerfile',
  'services/campaign/Dockerfile',
  'services/candidate/Dockerfile',
  'services/election/Dockerfile',
  'services/evidence/Dockerfile',
  'services/geography/Dockerfile',
  'services/identity/Dockerfile',
  'services/notification/Dockerfile',
  'services/reporting/Dockerfile',
  'services/tenant/Dockerfile',
  'services/trust/Dockerfile',
  'services/workflow/Dockerfile',
  // Apps
  'apps/admin-web/Dockerfile',
];

const ROOT = path.resolve(__dirname, '..');

let totalPatched = 0;
let totalSkipped = 0;

for (const rel of DOCKERFILES) {
  const filePath = path.join(ROOT, rel);
  if (!fs.existsSync(filePath)) {
    console.log(`  SKIP  ${rel} (file not found)`);
    totalSkipped++;
    continue;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let changed  = false;

  for (const { from, to } of REPLACEMENTS) {
    if (content.includes(from)) {
      content = content.split(from).join(to);
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  OK    ${rel}`);
    totalPatched++;
  } else {
    // Already patched or uses a different base image
    const alreadyMirrored = content.includes(`${REGISTRY}/ecr-public/`);
    console.log(`  ${alreadyMirrored ? 'DONE ' : 'SKIP '} ${rel} ${alreadyMirrored ? '(already uses ECR mirror)' : '(no matching FROM found)'}`);
    totalSkipped++;
  }
}

console.log(`\nResult: ${totalPatched} patched, ${totalSkipped} skipped/already-done`);
