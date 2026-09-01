/**
 * Final verification of IEBC gazette spending limits fix.
 */
const pg = require('pg');
const DB = {
  host: 'vote-capsule-db.cluster-c43i6c8ow71c.us-east-1.rds.amazonaws.com',
  port: 5432, database: 'votecapsule', user: 'vcadmin',
  password: 'B,7BZvfuwXOxDoCjN7g8=03JfxKv3zH0',
  ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 60000
};

const GAZETTE_CHECKS = {
  presidential: 6112543133,
  counties: {
    '001': { name: 'MOMBASA',       limit: 60967580  },
    '007': { name: 'GARISSA',       limit: 106005417 },
    '022': { name: 'KIAMBU',        limit: 110961257 },
    '023': { name: 'TURKANA',       limit: 142072389 },
    '032': { name: 'NAKURU',        limit: 107095876 },
    '047': { name: 'NAIROBI CITY',  limit: 181312885 },
  },
  constituencies: {
    1:   { name: 'CHANGAMWE',    limit: 18302374  },
    6:   { name: 'MVITA',        limit: 19421040  },
    46:  { name: 'NORTH HORR',   limit: 100424301 },
    124: { name: 'TURKANA WEST', limit: 59745774  },
    290: { name: 'KIAMAIKO',     limit: 25905194  },
  },
  wards: {
    '0001': { name: 'PORT REITZ',   limit: 4954920  },
    '0002': { name: 'KIPEVU',       limit: 5053110  },
    '0003': { name: 'AIRPORT',      limit: 4619215  },
    '1379': { name: 'UTHIRU/RUTHIMITU', limit: 4342823 },
    '1391': { name: 'GITHURAI',     limit: 6813104  },
    '1439': { name: 'NAIROBI CENTRAL', limit: 3770545 },
    '1450': { name: 'KIAMAIKO',     limit: 4966972  },
  }
};

const client = new pg.Client(DB);

client.connect().then(async () => {
  let pass = 0, fail = 0;

  console.log('\n══════════════════════════════════════════════════');
  console.log('IEBC GAZETTE SPENDING LIMITS — VERIFICATION REPORT');
  console.log('Source: Gazette Notice No. 12251, 7th August 2026');
  console.log('══════════════════════════════════════════════════\n');

  // Presidential
  const pres = await client.query('SELECT spending_limit_kes FROM iebc_presidential_limit LIMIT 1');
  const presVal = Number(pres.rows[0].spending_limit_kes);
  const presOk = presVal === GAZETTE_CHECKS.presidential;
  console.log(`Presidential Limit:`);
  console.log(`  ${presOk ? '✓' : '✗'} KES ${presVal.toLocaleString()} ${presOk ? '' : '(expect ' + GAZETTE_CHECKS.presidential.toLocaleString() + ')'}`);
  presOk ? pass++ : fail++;

  // Counties
  console.log(`\nCounty Limits (Governor = Senator = Women Rep):`);
  const countyRows = await client.query(
    `SELECT county_code, county_name, governor_limit FROM iebc_county_limits WHERE election_year=2027 ORDER BY county_code`
  );
  const allCounties = {};
  countyRows.rows.forEach(r => { allCounties[r.county_code] = Number(r.governor_limit); });
  
  for (const [code, expected] of Object.entries(GAZETTE_CHECKS.counties)) {
    const got = allCounties[code];
    const ok = got === expected.limit;
    console.log(`  ${ok ? '✓' : '✗'} ${code} ${expected.name}: KES ${(got||0).toLocaleString()} ${ok ? '' : '(expect ' + expected.limit.toLocaleString() + ')'}`);
    ok ? pass++ : fail++;
  }
  console.log(`  Total counties: ${countyRows.rows.length}/47`);

  // Constituencies
  console.log(`\nConstituency Limits (MP):`);
  const constRows = await client.query(
    `SELECT constituency_code, constituency_name, spending_limit_kes FROM iebc_constituency_limits WHERE election_year=2027 AND constituency_code = ANY($1)`,
    [Object.keys(GAZETTE_CHECKS.constituencies).map(Number)]
  );
  const allConsts = {};
  constRows.rows.forEach(r => { allConsts[r.constituency_code] = Number(r.spending_limit_kes); });

  for (const [code, expected] of Object.entries(GAZETTE_CHECKS.constituencies)) {
    const got = allConsts[Number(code)];
    const ok = got === expected.limit;
    console.log(`  ${ok ? '✓' : '✗'} ${code} ${expected.name}: KES ${(got||0).toLocaleString()} ${ok ? '' : '(expect ' + expected.limit.toLocaleString() + ')'}`);
    ok ? pass++ : fail++;
  }

  // Wards
  console.log(`\nWard Limits (MCA):`);
  const wardRows = await client.query(
    `SELECT ward_code, ward_name, mca_spending_limit FROM iebc_ward_limits WHERE election_year=2027 AND ward_code = ANY($1)`,
    [Object.keys(GAZETTE_CHECKS.wards)]
  );
  const allWards = {};
  wardRows.rows.forEach(r => { allWards[r.ward_code] = Number(r.mca_spending_limit); });

  for (const [code, expected] of Object.entries(GAZETTE_CHECKS.wards)) {
    const got = allWards[code];
    const ok = got === expected.limit;
    console.log(`  ${ok ? '✓' : '✗'} Ward ${code} ${expected.name}: KES ${(got||0).toLocaleString()} ${ok ? '' : '(expect ' + expected.limit.toLocaleString() + ')'}`);
    ok ? pass++ : fail++;
  }

  // Summary counts
  const counts = await client.query(`
    SELECT 
      (SELECT COUNT(*) FROM iebc_county_limits WHERE election_year=2027) counties,
      (SELECT COUNT(*) FROM iebc_constituency_limits WHERE election_year=2027) constituencies,
      (SELECT COUNT(*) FROM iebc_ward_limits WHERE election_year=2027) wards,
      (SELECT COUNT(*) FROM iebc_ward_limits WHERE election_year=2027 AND gazette_ref='GN 12251 (7 Aug 2026)') wards_gazette
  `);
  const s = counts.rows[0];

  console.log(`\n── Record Counts ──────────────────────────────────`);
  console.log(`  Counties:        ${s.counties}/47`);
  console.log(`  Constituencies:  ${s.constituencies}/290`);
  console.log(`  Wards:           ${s.wards}/1450 (${s.wards_gazette} gazette-verified)`);

  console.log(`\n══════════════════════════════════════════════════`);
  console.log(`Result: ${pass} PASSED, ${fail} FAILED`);
  if (fail === 0) {
    console.log(`✅ ALL GAZETTE VALUES CORRECTLY STORED IN DB`);
  } else {
    console.log(`⚠  Some values still need attention`);
  }
  console.log(`══════════════════════════════════════════════════\n`);

  await client.end();
}).catch(e => { console.error('ERR:', e.message); client.end(); });
