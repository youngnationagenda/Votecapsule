/**
 * VoteCapsule™ — Cognito User Pool Backup Script
 *
 * Exports all Cognito users to S3 as JSON backup.
 * Run weekly via cron or AWS EventBridge Scheduler.
 *
 * Usage: node backup-cognito-users.js
 *
 * Required env vars (or uses defaults for the VoteCapsule platform):
 *   USER_POOL_ID  — Cognito User Pool ID
 *   BACKUP_BUCKET — S3 bucket to store backup
 *   AWS_REGION    — AWS region
 */

const { execSync } = require('child_process');

const USER_POOL_ID = process.env.USER_POOL_ID || 'us-east-1_i3N2tg34A';
const BACKUP_BUCKET = process.env.BACKUP_BUCKET || 'vote-capsule-assets-683541453923';
const REGION = process.env.AWS_REGION || 'us-east-1';
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupKey = `cognito-backups/users-${timestamp}.json`;

console.log('╔══════════════════════════════════════════════════════╗');
console.log('║    VoteCapsule™ — Cognito User Pool Backup           ║');
console.log('╚══════════════════════════════════════════════════════╝\n');
console.log(`Pool:   ${USER_POOL_ID}`);
console.log(`Bucket: s3://${BACKUP_BUCKET}/${backupKey}`);
console.log(`Region: ${REGION}\n`);

let paginationToken = null;
const allUsers = [];

try {
  // Paginate through all users
  do {
    let cmd = `aws cognito-idp list-users --user-pool-id ${USER_POOL_ID} --limit 60 --region ${REGION} --output json`;
    if (paginationToken) {
      cmd += ` --pagination-token "${paginationToken}"`;
    }

    const output = execSync(cmd, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
    const data = JSON.parse(output);
    allUsers.push(...data.Users);
    paginationToken = data.PaginationToken || null;
    process.stdout.write(`  Fetched ${allUsers.length} users...\r`);
  } while (paginationToken);

  console.log(`\n✅ Total users exported: ${allUsers.length}`);

  // Build backup payload
  const backup = {
    exportedAt: new Date().toISOString(),
    userPoolId: USER_POOL_ID,
    region: REGION,
    totalUsers: allUsers.length,
    users: allUsers.map(u => ({
      username: u.Username,
      status: u.UserStatus,
      enabled: u.Enabled,
      created: u.UserCreateDate,
      modified: u.UserLastModifiedDate,
      attributes: u.Attributes.reduce((acc, a) => { acc[a.Name] = a.Value; return acc; }, {}),
    })),
  };

  // Write to temp file
  const fs = require('fs');
  const tmpFile = `/tmp/cognito-backup-${timestamp}.json`;
  const winTmpFile = `${process.env.TEMP || 'C:\\Windows\\Temp'}\\cognito-backup-${timestamp}.json`;
  const outFile = process.platform === 'win32' ? winTmpFile : tmpFile;
  fs.writeFileSync(outFile, JSON.stringify(backup, null, 2));

  // Upload to S3
  execSync(`aws s3 cp "${outFile}" s3://${BACKUP_BUCKET}/${backupKey} --region ${REGION}`, { encoding: 'utf8' });
  console.log(`✅ Backup uploaded: s3://${BACKUP_BUCKET}/${backupKey}`);

  // Cleanup temp file
  fs.unlinkSync(outFile);

  console.log('\n📋 Backup Summary:');
  console.log(`   Users: ${backup.totalUsers}`);
  console.log(`   Location: s3://${BACKUP_BUCKET}/${backupKey}`);
  console.log(`   Timestamp: ${backup.exportedAt}`);
  console.log('\n✅ Cognito backup complete!');

} catch (err) {
  console.error('❌ Backup failed:', err.message);
  process.exit(1);
}
