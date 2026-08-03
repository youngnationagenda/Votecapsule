/**
 * Poll EAS build status until complete or failed.
 * Run: node poll-build.js
 */
const { execFileSync } = require('child_process');
const BUILD_ID = '73d0e1cd-e27e-4cfa-add9-a098cd4b8bcb';
const CWD      = __dirname;
const INTERVAL = 45 * 1000; // 45 seconds
const MAX_WAIT = 20 * 60 * 1000; // 20 minutes max

let elapsed = 0;

function poll() {
  try {
    const out = execFileSync(
      'eas',
      ['build:view', BUILD_ID, '--json'],
      { cwd: CWD, encoding: 'utf8', shell: true, timeout: 30000 }
    );

    // Strip any non-JSON preamble (powershell warnings etc.)
    const jsonStart = out.indexOf('{');
    if (jsonStart === -1) {
      console.log('[' + new Date().toLocaleTimeString() + '] Raw output:', out.slice(0, 200));
      return;
    }

    const build = JSON.parse(out.slice(jsonStart));
    const status = build.status || 'unknown';
    const ts     = new Date().toLocaleTimeString();

    console.log('[' + ts + '] Status: ' + status.toUpperCase() +
      (build.completedAt ? ' | Finished: ' + build.completedAt : '') +
      (build.expirationDate ? '' : '')
    );

    if (status === 'finished') {
      console.log('\n=== BUILD FINISHED ===');
      console.log('APK download URL:');
      console.log(build.artifacts && build.artifacts.buildUrl || build.applicationArchiveUrl || '(see EAS dashboard)');
      console.log('\nDashboard: https://expo.dev/accounts/ynakenya/projects/votecapsule-agent/builds/' + BUILD_ID);
      process.exit(0);
    }

    if (status === 'errored' || status === 'canceled') {
      console.log('\n=== BUILD ' + status.toUpperCase() + ' ===');
      console.log('Check logs: https://expo.dev/accounts/ynakenya/projects/votecapsule-agent/builds/' + BUILD_ID);
      process.exit(1);
    }

  } catch(e) {
    console.log('[' + new Date().toLocaleTimeString() + '] Poll error:', e.message.slice(0, 120));
  }

  elapsed += INTERVAL;
  if (elapsed >= MAX_WAIT) {
    console.log('Max wait time reached. Check build manually:');
    console.log('https://expo.dev/accounts/ynakenya/projects/votecapsule-agent/builds/' + BUILD_ID);
    process.exit(0);
  }
  setTimeout(poll, INTERVAL);
}

console.log('Polling EAS build ' + BUILD_ID + ' every 45s...');
console.log('Dashboard: https://expo.dev/accounts/ynakenya/projects/votecapsule-agent/builds/' + BUILD_ID);
poll();
