#!/usr/bin/env node
'use strict';
const fs   = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', '..', '..', 'td-campaign-8-raw.json');
const raw  = JSON.parse(fs.readFileSync(src, 'utf8'));
const td   = raw.taskDefinition;
const env  = td.containerDefinitions[0].environment;

// Fix PUBLIC_ASSETS_BASE_URL to the real domain now that DNS + CF are live
const updates = {
  PUBLIC_ASSETS_BASE_URL: 'https://assets.votecapsule.yna.co.ke',
  // Keep the others correct
  PUBLIC_ASSETS_BUCKET:       'votecapsule-public-assets',
  CAMPAIGN_ASSETS_BASE_URL:   'https://d1campaign.votecapsule.yna.co.ke',
};

Object.entries(updates).forEach(([name, value]) => {
  const existing = env.find(e => e.name === name);
  if (existing) existing.value = value;
  else env.push({ name, value });
});

const payload = {
  family:                  td.family,
  taskRoleArn:             td.taskRoleArn,
  executionRoleArn:        td.executionRoleArn,
  networkMode:             td.networkMode,
  containerDefinitions:    td.containerDefinitions,
  requiresCompatibilities: td.requiresCompatibilities,
  cpu:                     td.cpu,
  memory:                  td.memory,
};

const out = path.join(__dirname, 'td-campaign-9.json');
fs.writeFileSync(out, JSON.stringify(payload, null, 2));
console.log('✅ Written', out);
console.log('   family:', payload.family, '| env count:', env.length);
const pub = env.find(e => e.name === 'PUBLIC_ASSETS_BASE_URL');
console.log('   PUBLIC_ASSETS_BASE_URL =', pub ? pub.value : 'NOT FOUND');
