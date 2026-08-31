#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', '..', '..', 'td-campaign-7.json');
if (!fs.existsSync(src)) {
  console.error('ERROR: td-campaign-7.json not found at', src);
  process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(src, 'utf8'));
const td = raw.taskDefinition;
const env = td.containerDefinitions[0].environment;

const toAdd = [
  { name: 'PUBLIC_ASSETS_BUCKET',      value: 'votecapsule-public-assets' },
  { name: 'PUBLIC_ASSETS_BASE_URL',    value: 'https://assets.votecapsule.co.ke' },
  { name: 'CAMPAIGN_ASSETS_BASE_URL',  value: 'https://d1campaign.votecapsule.yna.co.ke' },
];
toAdd.forEach(v => { if (!env.find(e => e.name === v.name)) env.push(v); });

const payload = {
  family:                   td.family,
  taskRoleArn:              td.taskRoleArn,
  executionRoleArn:         td.executionRoleArn,
  networkMode:              td.networkMode,
  containerDefinitions:     td.containerDefinitions,
  requiresCompatibilities:  td.requiresCompatibilities,
  cpu:                      td.cpu,
  memory:                   td.memory,
};

const out = path.join(__dirname, 'td-campaign-8.json');
fs.writeFileSync(out, JSON.stringify(payload, null, 2));
console.log('✅ Written', out);
console.log('   family:', payload.family, '| env count:', env.length);
