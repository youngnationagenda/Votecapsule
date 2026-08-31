#!/usr/bin/env node
/**
 * VoteCapsule™ — Poll RDS Export Task + Sync to Local When Complete
 * Run this script to monitor the Aug-31 export and auto-download when done.
 *
 * Usage: node monitor-rds-export.js
 * It will poll every 60s and sync to local when the export reaches COMPLETE.
 */
'use strict';

const { execSync } = require('child_process');
const fs           = require('fs');
const path         = require('path');

const TASK_ID     = 'votecapsule-db-export-20260831';
const S3_PREFIX   = 'db-exports/20260831';
const S3_BUCKET   = 'vote-capsule-assets-683541453923';
const LOCAL_DIR   = 'D:/Votecapsule/Votecapsule backup/database/rds-export/20260831';
const OUT_DIR     = 'D:/Votecapsule/Votecapsule backup/database/rds-export';

function getTaskStatus() {
  try {
    const r = JSON.parse(execSync(
      `aws rds describe-export-tasks --export-task-identifier ${TASK_ID} --output json`,
      { encoding: 'utf8' }
    ));
    return r.ExportTasks?.[0] || null;
  } catch(e) {
    return null;
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log('VoteCapsule™ — RDS Export Monitor');
  console.log(`Task: ${TASK_ID}`);
  console.log(`S3:   s3://${S3_BUCKET}/${S3_PREFIX}/\n`);

  let attempt = 0;
  const maxAttempts = 60; // 60 minutes max

  while (attempt < maxAttempts) {
    attempt++;
    const task = getTaskStatus();

    if (!task) {
      console.log(`[${attempt}] Could not get task status`);
      await sleep(60000);
      continue;
    }

    const pct  = task.PercentProgress || 0;
    const size = task.TotalExtractedDataInGB || 0;
    console.log(`[${new Date().toLocaleTimeString()}] Status: ${task.Status} | Progress: ${pct}% | Size: ${size}GB`);

    // Save current status
    fs.writeFileSync(path.join(OUT_DIR, 'export-task-20260831.json'),
      JSON.stringify(task, null, 2));

    if (task.Status === 'COMPLETE') {
      console.log('\n✅ Export COMPLETE! Syncing from S3...');
      if (!fs.existsSync(LOCAL_DIR)) fs.mkdirSync(LOCAL_DIR, { recursive: true });
      try {
        execSync(
          `aws s3 sync "s3://${S3_BUCKET}/${S3_PREFIX}" "${LOCAL_DIR}" --no-progress`,
          { encoding: 'utf8', timeout: 600000, stdio: 'inherit' }
        );
        // Count files
        let count = 0;
        function walk(d) { for(const e of fs.readdirSync(d,{withFileTypes:true})) { if(e.isDirectory()) walk(path.join(d,e.name)); else count++; } }
        walk(LOCAL_DIR);
        console.log(`\n✅ Synced ${count} files → ${LOCAL_DIR}`);
        fs.writeFileSync(path.join(OUT_DIR, 'sync-complete-20260831.json'), JSON.stringify({
          taskId: TASK_ID, status: 'SYNCED', files: count,
          localPath: LOCAL_DIR,
          s3Uri: `s3://${S3_BUCKET}/${S3_PREFIX}`,
          completedAt: new Date().toISOString(),
          taskDetails: task,
        }, null, 2));
      } catch(e) {
        console.error('❌ Sync failed:', e.message);
      }
      break;
    }

    if (task.Status === 'FAILED' || task.Status === 'CANCELED') {
      console.log(`\n❌ Export ended with status: ${task.Status}`);
      if (task.FailureCause) console.log('Cause:', task.FailureCause);
      break;
    }

    // Still in progress — wait 60 seconds
    await sleep(60000);
  }

  console.log('\nMonitor complete.');
}

main().catch(e => { console.error('[FATAL]', e.message); process.exit(1); });
