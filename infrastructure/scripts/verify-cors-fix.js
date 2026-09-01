const https = require('https');
function fetch(url, headers={}) {
  return new Promise(resolve => {
    const u = new URL(url);
    const req = https.request({
      hostname:u.hostname, path:u.pathname,
      headers:{'User-Agent':'VC-VerifyFix/1.0',...headers},
      timeout: 10000,
    }, res => {
      let b=''; res.on('data',d=>b+=d);
      res.on('end',()=>resolve({s:res.statusCode,h:res.headers,b:b.slice(0,80)}));
    });
    req.on('error',e=>resolve({s:0,e:e.message}));
    req.on('timeout',()=>{req.destroy();resolve({s:0,e:'TIMEOUT'});});
    req.end();
  });
}

const ORIGIN = 'https://party.votecapsule.yna.co.ke';
const URLS = [
  'https://d1campaign.votecapsule.yna.co.ke/catalogue/BILLBOARD_MEDIUM.jpg',
  'https://d1campaign.votecapsule.yna.co.ke/catalogue/BUSINESS_CARD.jpg',
  'https://d1campaign.votecapsule.yna.co.ke/suppliers/me-advertising/images/content_calendar.svg',
  'https://d1campaign.votecapsule.yna.co.ke/suppliers/me-advertising/images/facebook_ads.svg',
  'https://d1campaign.votecapsule.yna.co.ke/catalogue/CAP_BASEBALL.jpg',
];

async function main() {
  console.log('=== CORS FIX VERIFICATION (E149XY0JAVY7G) ===\n');

  for (const url of URLS) {
    const shortUrl = url.replace('https://d1campaign.votecapsule.yna.co.ke', '');

    // Test WITHOUT Origin
    const r1 = await fetch(url);
    const acao1 = r1.h['access-control-allow-origin'] ?? 'MISSING';

    // Test WITH Origin
    const r2 = await fetch(url, { Origin: ORIGIN });
    const acao2 = r2.h['access-control-allow-origin'] ?? 'MISSING';

    const ok1 = acao1 !== 'MISSING';
    const ok2 = acao2 !== 'MISSING';

    console.log(`${shortUrl}`);
    console.log(`  No Origin:   HTTP ${r1.s} | ACAO: ${acao1} | cache: ${r1.h['x-cache']??'?'} ${ok1?'✅':'❌'}`);
    console.log(`  With Origin: HTTP ${r2.s} | ACAO: ${acao2} | cache: ${r2.h['x-cache']??'?'} ${ok2?'✅':'❌'}`);
  }

  console.log('\n=== WHAT THE BROWSER SEES ===');
  console.log('Browser always sends Origin header → should always get ACAO ✅');
  console.log('Server-side requests (no Origin) → ACAO may be missing but that\'s OK');
  console.log('(Server-side requests don\'t need CORS headers)');
}

main().catch(e => console.error('ERR:', e.message));
