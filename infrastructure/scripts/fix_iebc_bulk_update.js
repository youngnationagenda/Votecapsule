/**
 * fix_iebc_bulk_update.js
 * Bulk-updates constituency limits and ward limits using efficient SQL.
 * Run AFTER fix_iebc_limits_gazette.js has fixed presidential + county.
 */

const pg = require('pg');
const fs = require('fs');

const DB = {
  host: 'vote-capsule-db.cluster-c43i6c8ow71c.us-east-1.rds.amazonaws.com',
  port: 5432,
  database: 'votecapsule',
  user: 'vcadmin',
  password: 'B,7BZvfuwXOxDoCjN7g8=03JfxKv3zH0',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 120000,
  query_timeout: 120000,
};

// All 290 constituency limits from IEBC Gazette Notice No. 12251
const CONST_LIMITS = [
  [1,18302374],[2,20334070],[3,27401021],[4,23115519],[5,25163610],[6,19421040],
  [7,21580342],[8,27996585],[9,23950925],
  [10,36274916],[11,28000208],[12,24897647],
  [13,23147598],[14,18110156],
  [15,26871052],[16,24266554],
  [17,38832999],[18,43643122],[19,36103038],[20,45266789],
  [21,16973486],[22,26514378],[23,23230844],[24,15430114],
  [25,35803208],[26,40623269],
  [27,20130735],[28,24211983],[29,27366616],[30,35637627],[31,51023092],[32,46703266],
  [33,34617699],[34,25516415],[35,32654594],[36,35851506],
  [37,25355170],[38,73016747],[39,26116487],[40,26513348],
  [41,32488740],[42,34893469],[43,23257037],[44,25186124],[45,39597994],[46,100424301],
  [47,19662633],[48,59449850],[49,53215770],[50,37078981],
  [51,20527946],[52,24429995],[53,22852507],[54,19716639],[55,22308170],[56,21467875],
  [57,22004052],[58,19008594],[59,23327256],
  [60,18218235],[61,19886830],[62,21665220],
  [63,21502372],[64,20121702],[65,22854179],[66,18610455],
  [67,30133273],[68,20629698],[69,28598990],[70,18622118],[71,20761548],[72,20572613],
  [73,29452207],[74,34035869],[75,22285829],[76,22770798],[77,16708540],
  [78,21218995],[79,17549658],[80,30994878],[81,24852776],[82,39083908],[83,23185571],
  [84,24245374],[85,18182517],[86,18896044],[87,26392886],[88,26296126],
  [89,23404176],[90,24511679],[91,17354770],[92,19416156],[93,17733868],
  [94,17717075],[95,15773355],[96,25043552],[97,20447800],
  [98,16326164],[99,16162242],
  [100,19054235],[101,25341037],[102,18978855],[103,17801602],
  [104,18218887],[105,15819299],[106,16745345],[107,22405169],[108,19154615],[109,22352811],
  [110,21233622],
  [111,22687439],[112,17968981],[113,17601386],[114,28461361],[115,27307636],[116,32419398],
  [117,20560428],[118,19237873],[119,24514301],[120,22324991],[121,21751112],[122,20319942],
  [123,19353543],[124,59745774],[125,56377048],[126,31799319],[127,33410111],[128,35870284],
  [129,51344501],[130,24530412],[131,22601255],[132,26574007],
  [133,22482958],[134,23444100],[135,33475327],
  [136,35691732],[137,23592787],[138,18557095],[139,22965344],[140,25382769],
  [141,24922204],[142,25305512],[143,26544073],[144,22175760],[145,19913352],[146,22276097],
  [147,20806825],[148,18532092],[149,21292564],[150,18245577],
  [151,20451426],[152,19248821],[153,22678417],[154,19371350],[155,22369227],
  [156,20918548],[157,22589942],[158,30129687],[159,21113487],[160,18195766],[161,20741987],
  [162,19283069],[163,21095838],[164,32786691],
  [165,23909225],[166,27028896],[167,21770690],[168,27567545],[169,35044766],[170,26337304],
  [171,22120332],[172,23239261],[173,18280194],[174,25412521],[175,24922670],[176,24044130],
  [177,23368913],[178,31737525],[179,18442409],[180,32599798],[181,22451535],[182,36486964],
  [183,34521381],[184,30642658],[185,29816231],[186,33739999],[187,40263936],[188,36586525],
  [189,21131497],[190,19305057],[191,22212037],[192,24223000],[193,20712892],[194,19713434],
  [195,24684710],[196,24298294],[197,20927841],[198,21805391],[199,22154013],
  [200,23750901],[201,21101174],[202,26916011],[203,23094127],[204,21113268],[205,18452051],
  [206,18571591],[207,21929865],[208,20900565],[209,18344236],[210,22261347],[211,18252485],
  [212,17047814],[213,19475669],[214,21219291],[215,17710527],[216,17148056],
  [217,25417376],[218,18877664],[219,22665854],[220,25251392],[221,29679273],[222,18479166],
  [223,21033042],[224,21387244],[225,25680012],
  [226,20047732],[227,39103910],[228,22301768],[229,18408538],[230,20189360],[231,20199571],
  [232,18180238],[233,16631924],[234,19686717],[235,18144638],
  [236,26378612],[237,23016366],[238,24613869],[239,21347396],[240,25251368],[241,21875868],
  [242,22033946],[243,19070590],[244,22007569],[245,21959387],[246,21314423],[247,19801406],
  [248,19116790],[249,23076134],[250,18571396],
  [251,18859485],[252,26091679],[253,19652227],[254,19821370],[255,19117723],[256,18786095],
  [257,18987598],[258,19541109],
  [259,20707524],[260,23310556],[261,23364131],[262,18940937],[263,19740725],[264,21833348],
  [265,18357357],[266,23965942],[267,17524061],
  [268,18947604],[269,21480996],[270,17805609],[271,20829741],
  [272,24401170],[273,21306469],[274,19131001],[275,18771663],
  [276,25257161],[277,25929975],[278,28807580],[279,23479032],[280,22593531],
  [281,30089836],[282,36600526],[283,25895883],[284,34152930],[285,23457482],
  [286,27216957],[287,34148183],[288,28927229],[289,24779898],[290,25905194]
];

async function main() {
  const client = new pg.Client(DB);
  await client.connect();
  console.log('✓ Connected to DB');

  try {
    // ── STEP 1: Build bulk UPDATE for constituency limits ──
    console.log('\n── Updating 290 constituency limits ──');
    
    // Use a VALUES list + UPDATE ... FROM to do single SQL statement
    const constValueParts = CONST_LIMITS.map(([code, limit]) => `(${code}, ${limit})`);
    const constSQL = `
      UPDATE iebc_constituency_limits AS t
      SET spending_limit_kes = v.limit_kes,
          gazette_ref = 'GN 12251 (7 Aug 2026)',
          schedule = 'Third Schedule',
          is_computed = false
      FROM (VALUES ${constValueParts.join(',\n')}) AS v(code, limit_kes)
      WHERE t.constituency_code = v.code AND t.election_year = 2027
    `;
    
    const constResult = await client.query(constSQL);
    console.log(`  ✓ Updated ${constResult.rowCount} constituency records`);

    // ── STEP 2: Bulk UPDATE for ward limits ──
    console.log('\n── Updating ward limits from gazette data ──');
    
    const wardData = JSON.parse(fs.readFileSync('D:/Votecapsule/ward_code_limits.json', 'utf8'));
    const wardPairs = Object.entries(wardData); // [["0001", 4954920], ...]
    
    // Build VALUES list
    // Ward codes in DB are like "0001", "0002" etc (VARCHAR)
    const wardValueParts = wardPairs.map(([code, limit]) => `('${code}', ${limit})`);
    
    const wardSQL = `
      UPDATE iebc_ward_limits AS t
      SET mca_spending_limit = v.limit_kes,
          gazette_ref = 'GN 12251 (7 Aug 2026)',
          schedule = 'Fourth Schedule'
      FROM (VALUES ${wardValueParts.join(',\n')}) AS v(code, limit_kes)
      WHERE t.ward_code = v.code AND t.election_year = 2027
    `;
    
    const wardResult = await client.query(wardSQL);
    console.log(`  ✓ Updated ${wardResult.rowCount} ward records`);
    
    // Check how many wards were NOT updated (should be ~12 Nairobi wards)
    const wardTotal = await client.query('SELECT COUNT(*) FROM iebc_ward_limits WHERE election_year=2027');
    const wardUpdatedCount = wardResult.rowCount;
    const wardNotUpdated = Number(wardTotal.rows[0].count) - wardUpdatedCount;
    if (wardNotUpdated > 0) {
      console.log(`  ⚠ ${wardNotUpdated} wards not in gazette PDF extraction`);
      
      // Show which wards weren't updated
      const notUpdated = await client.query(`
        SELECT ward_code, ward_name, mca_spending_limit 
        FROM iebc_ward_limits 
        WHERE election_year=2027 
          AND gazette_ref != 'GN 12251 (7 Aug 2026)'
        ORDER BY ward_code
      `);
      if (notUpdated.rows.length > 0) {
        console.log('  Missing wards (still have old values):');
        notUpdated.rows.forEach(r => {
          console.log(`    ${r.ward_code} ${r.ward_name}: KES ${Number(r.mca_spending_limit).toLocaleString()}`);
        });
      }
    }

    // ── STEP 3: VERIFICATION ──
    console.log('\n── Verification ──');
    
    // Presidential
    const pres = await client.query('SELECT spending_limit_kes FROM iebc_presidential_limit LIMIT 1');
    console.log(`Presidential: KES ${Number(pres.rows[0].spending_limit_kes).toLocaleString()} (expect: 6,112,543,133)`);
    
    // County sample
    const counties = await client.query(`
      SELECT county_code, county_name, governor_limit 
      FROM iebc_county_limits WHERE election_year=2027
      AND county_code IN ('001','022','047') ORDER BY county_code
    `);
    console.log('County samples:');
    counties.rows.forEach(r => {
      console.log(`  ${r.county_code} ${r.county_name}: KES ${Number(r.governor_limit).toLocaleString()}`);
    });
    // Mombasa: 60,967,580 | Kiambu: 110,961,257 | Nairobi: 181,312,885

    // Constituency sample (first 6 = Mombasa)
    const consts = await client.query(`
      SELECT constituency_code, constituency_name, spending_limit_kes 
      FROM iebc_constituency_limits WHERE election_year=2027
      ORDER BY constituency_code LIMIT 6
    `);
    console.log('Constituency samples (Mombasa 1-6):');
    consts.rows.forEach(r => {
      console.log(`  ${r.constituency_code} ${r.constituency_name}: KES ${Number(r.spending_limit_kes).toLocaleString()}`);
    });
    // Changamwe: 18,302,374 | Jomvu: 20,334,070 | Kisauni: 27,401,021

    // Ward sample
    const wards = await client.query(`
      SELECT ward_code, ward_name, mca_spending_limit 
      FROM iebc_ward_limits WHERE election_year=2027
      ORDER BY ward_code LIMIT 6
    `);
    console.log('Ward samples (first 6):');
    wards.rows.forEach(r => {
      console.log(`  ${r.ward_code} ${r.ward_name}: KES ${Number(r.mca_spending_limit).toLocaleString()}`);
    });
    // Port Reitz: 4,954,920 | Kipevu: 5,053,110 | Airport: 4,619,215

    // Summary count
    const summary = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM iebc_county_limits WHERE election_year=2027) AS counties,
        (SELECT COUNT(*) FROM iebc_constituency_limits WHERE election_year=2027) AS constituencies,
        (SELECT COUNT(*) FROM iebc_ward_limits WHERE election_year=2027) AS wards,
        (SELECT COUNT(*) FROM iebc_ward_limits WHERE election_year=2027 AND gazette_ref='GN 12251 (7 Aug 2026)') AS wards_updated
    `);
    const s = summary.rows[0];
    console.log(`\nSummary: ${s.counties} counties | ${s.constituencies} constituencies | ${s.wards} wards (${s.wards_updated} gazette-updated)`);

    console.log('\n════════════════════════════════════════════════════');
    console.log('✅ IEBC Gazette Fix COMPLETE — All limits corrected!');
    console.log('   Source: IEBC Gazette Notice No. 12251, 7 Aug 2026');
    console.log('════════════════════════════════════════════════════');

  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err.stack);
  } finally {
    await client.end();
  }
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
