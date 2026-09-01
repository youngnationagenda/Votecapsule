#!/usr/bin/env node
'use strict';
const fs   = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');

function readApi(portal) {
  return fs.readFileSync(path.join(ROOT, `apps/${portal}/src/api/campaignApi.ts`), 'utf8');
}

// All API calls made by the two compliance pages
const REQUIRED_CANDIDATE = [
  // compliance namespace
  'compliance.getStatus',
  'compliance.getAuthorizedPersons',
  'compliance.registerPerson',
  'compliance.removePerson',
  'compliance.getBankAccount',
  'compliance.registerBank',
  'compliance.getReports',
  'compliance.submitReport',
  'compliance.getCertificate',
  // budget namespace
  'budget.listContribs',
  'budget.listExpenses',
  'budget.get',
  'budget.getIEBCGazetteLimit',
  'budget.iebc',
];

const REQUIRED_PARTY = [
  // compliance namespace
  'compliance.getStatus',
  'compliance.getAuthorizedPersons',
  'compliance.registerPerson',
  'compliance.removePerson',
  'compliance.getSupportingOrgs',
  'compliance.registerSupportingOrg',
  'compliance.getCandidateCompliance',
  'compliance.getBankAccount',
  'compliance.getReports',
  'compliance.submitReport',
  'compliance.getCertificate',
  // budget namespace
  'budget.listContribs',
  'budget.listExpenses',
  'budget.get',
];

const candidateApi = readApi('candidate-web');
const partyApi     = readApi('party-web');

console.log('=== Compliance API Audit ===\n');

console.log('-- Candidate Portal --');
REQUIRED_CANDIDATE.forEach(call => {
  const [ns, method] = call.split('.');
  // Look for both 'method:' and 'method (' patterns
  const found = candidateApi.includes(`${method}:`) || candidateApi.includes(`${method} :`);
  console.log(`  ${found ? '✅' : '❌'} campaignApi.${call}`);
});

console.log('\n-- Party Portal --');
REQUIRED_PARTY.forEach(call => {
  const [ns, method] = call.split('.');
  const found = partyApi.includes(`${method}:`) || partyApi.includes(`${method} :`);
  console.log(`  ${found ? '✅' : '❌'} campaignApi.${call}`);
});

// Check backend compliance service
console.log('\n-- Backend --');
const compDir = path.join(ROOT, 'services/campaign/src/compliance');
console.log(`  ${fs.existsSync(compDir) ? '✅' : '❌'} compliance service directory`);

// Check if election service has iebc-limits
const elecController = path.join(ROOT, 'services/election/src/election.controller.ts');
if (fs.existsSync(elecController)) {
  const ctrl = fs.readFileSync(elecController, 'utf8');
  console.log(`  ${ctrl.includes('iebc-limits') ? '✅' : '❌'} election service has /iebc-limits endpoint`);
} else {
  console.log('  ❌ election controller not found');
}

// Check budget page for listContribs
const budgetPage = path.join(ROOT, 'apps/candidate-web/src/pages/MyBudgetPage.tsx');
if (fs.existsSync(budgetPage)) {
  const bp = fs.readFileSync(budgetPage, 'utf8');
  console.log(`  ${bp.includes('listContribs') ? '✅' : '❌'} MyBudgetPage uses listContribs`);
}

process.exit(0);
