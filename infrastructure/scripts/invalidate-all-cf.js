const { execSync } = require('child_process');
const DISTS = ['E2J8YA2BP1UC1H','E18OX8YUDVZA5V','E1Z32G6YW54GHT','E2K6MDXEZZ7UYS','E1O4XZRM79VCJ1','EZEXQ23EU9E55'];
const NAMES = ['Admin','Transparency','Authority','Party','Candidate','Observer'];
for (let i = 0; i < DISTS.length; i++) {
  try {
    const r = JSON.parse(execSync(`aws cloudfront create-invalidation --distribution-id ${DISTS[i]} --paths "/*" --region us-east-1 --output json`, {encoding:'utf8'}));
    console.log(`✅ ${NAMES[i]} (${DISTS[i]}): ${r.Invalidation.Status}`);
  } catch(e) { console.error(`❌ ${NAMES[i]}: ${e.message.slice(0,100)}`); }
}
