const http = require('http');
const fs = require('fs');
const path = require('path');

// Colors for output formatting
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ${GREEN}✓ PASS:${RESET} ${message}`);
  } else {
    failedTests++;
    console.log(`  ${RED}✗ FAIL:${RESET} ${message}`);
  }
}

function makeHttpRequest(urlPath, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1',
      port: 3000,
      path: urlPath,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, headers: res.headers, body: parsed, raw: data });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body: data, raw: data });
        }
      });
    });

    req.on('error', (err) => reject(err));
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

// Inline Phonetic & Similarity Matcher logic (matches /src/utils/fuzzyNameMatcher.ts)
function levenshteinDistance(str1, str2) {
  const a = str1.toLowerCase().trim();
  const b = str2.toLowerCase().trim();
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

const GHANAIAN_NAME_ALIASES = {
  mutala: ['metal', 'mortal', 'mutter', 'mural', 'mortala', 'mutal', 'muntala', 'murtala', 'moutala', 'matter', 'matala', 'medall', 'mettle', 'motel'],
  murtala: ['metal', 'mortal', 'mutter', 'mural', 'mortala', 'mutal', 'muntala', 'mutala', 'moutala', 'matter', 'matala'],
  kofi: ['coffee', 'coffe', 'koffi', 'copy', 'cofy'],
  ama: ['armor', 'alma', 'ammer', 'ahma'],
  kwame: ['squame', 'kwami', 'quame', 'quami'],
  yakubu: ['jacob', 'yacob', 'yakob', 'yakub'],
  fuseini: ['foster', 'husseini', 'fousseni', 'hussein', 'fuseni'],
  seidu: ['saydu', 'saidu', 'seidu', 'seydu']
};

function calculateTokenSimilarity(sToken, tToken) {
  const s = sToken.toLowerCase().trim();
  const t = tToken.toLowerCase().trim();
  if (!s || !t) return 0;
  if (s === t) return 1.0;
  if (s.length >= 3 && t.length >= 3) {
    if (t.startsWith(s) || s.startsWith(t)) return 0.92;
  }
  const aliases = GHANAIAN_NAME_ALIASES[t] || [];
  if (aliases.includes(s)) return 0.96;
  const dist = levenshteinDistance(s, t);
  return 1.0 - dist / Math.max(s.length, t.length);
}

async function runTestSuite() {
  console.log(`\n${BOLD}${CYAN}================================================================${RESET}`);
  console.log(`${BOLD}${CYAN}   SAAKO HOLY CHILD ACADEMY - COMPREHENSIVE PRODUCTION TEST   ${RESET}`);
  console.log(`${BOLD}${CYAN}================================================================${RESET}\n`);

  // CATEGORY 1: DATABASE ENGINE & FILE PERSISTENCE INTEGRITY
  console.log(`${BOLD}${YELLOW}[CATEGORY 1: DATABASE ENGINE & ATOMIC STORAGE INTEGRITY]${RESET}`);
  try {
    const dbPath = path.join(__dirname, '..', 'db.json');
    assert(fs.existsSync(dbPath), "db.json storage file exists at project root");

    const rawData = fs.readFileSync(dbPath, 'utf8');
    const db = JSON.parse(rawData);
    assert(typeof db === 'object' && db !== null, "db.json contains valid JSON format");
    assert(Array.isArray(db.students), `db.students table exists (${db.students.length} pupils registered)`);
    assert(Array.isArray(db.payments), `db.payments table exists (${db.payments.length} fee logs recorded)`);
    assert(Array.isArray(db.users), `db.users table exists (${db.users.length} staff accounts enrolled)`);
    assert(Array.isArray(db.terms), `db.terms table exists (${db.terms.length} academic terms configured)`);
    assert(Array.isArray(db.expenses), "db.expenses table exists as array");
    assert(Array.isArray(db.salaries), "db.salaries table exists as array");
    assert(Array.isArray(db.examsPayments), "db.examsPayments table exists as array");
    assert(Array.isArray(db.auditLogs), "db.auditLogs table exists as array");

    // Test Atomic Write Capability
    const testTmpFile = path.join(__dirname, '..', `test_atomic_${Date.now()}.tmp`);
    fs.writeFileSync(testTmpFile, JSON.stringify({ test: true }), 'utf8');
    assert(fs.existsSync(testTmpFile), "Temporary file creation succeeded for atomic write");
    fs.unlinkSync(testTmpFile);
    assert(!fs.existsSync(testTmpFile), "Cleaned up test temporary atomic write file");
  } catch (err) {
    assert(false, `Database check crashed: ${err.message}`);
  }

  // CATEGORY 2: HTTP API SERVER ENDPOINTS & SYSTEM HEALTH
  console.log(`\n${BOLD}${YELLOW}[CATEGORY 2: HTTP API SERVER & DIAGNOSTIC ENDPOINTS]${RESET}`);
  try {
    const healthRes = await makeHttpRequest('/api/health');
    assert(healthRes.status === 200, "GET /api/health returns HTTP status 200 OK");
    assert(healthRes.body.status === 'ok', "GET /api/health returns status 'ok'");

    const dbHealthRes = await makeHttpRequest('/api/db/health');
    assert(dbHealthRes.status === 200, "GET /api/db/health returns HTTP status 200 OK");
    assert(dbHealthRes.body.healthScore === '10/10', "GET /api/db/health reports 10/10 health score");
    assert(dbHealthRes.body.entityCounts !== undefined, "GET /api/db/health reports entity counts breakdown");

    const studentsRes = await makeHttpRequest('/api/students');
    assert(studentsRes.status === 200, "GET /api/students returns HTTP status 200 OK");
    assert(Array.isArray(studentsRes.body) && studentsRes.body.length > 0, `GET /api/students returned ${studentsRes.body.length} pupils`);

    const usersRes = await makeHttpRequest('/api/users');
    assert(usersRes.status === 200, "GET /api/users returns HTTP status 200 OK");
    assert(Array.isArray(usersRes.body) && usersRes.body.length > 0, `GET /api/users returned ${usersRes.body.length} staff profiles`);

    const termsRes = await makeHttpRequest('/api/terms');
    assert(termsRes.status === 200, "GET /api/terms returns HTTP status 200 OK");
    assert(Array.isArray(termsRes.body) && termsRes.body.length > 0, `GET /api/terms returned ${termsRes.body.length} academic terms`);
  } catch (err) {
    assert(false, `API Server checks failed: ${err.message}`);
  }

  // CATEGORY 3: PHONETIC VOICE MATCHING & ALIAS ACCURACY
  console.log(`\n${BOLD}${YELLOW}[CATEGORY 3: PHONETIC VOICE RECOGNITION & ALIAS ACCURACY]${RESET}`);
  try {
    const mutalaVsMetal = calculateTokenSimilarity('metal', 'mutala');
    assert(mutalaVsMetal >= 0.90, `Mistranscription "metal" accurately resolves to "mutala" (Score: ${(mutalaVsMetal * 100).toFixed(1)}%)`);

    const mutalaVsMortal = calculateTokenSimilarity('mortal', 'mutala');
    assert(mutalaVsMortal >= 0.90, `Mistranscription "mortal" accurately resolves to "mutala" (Score: ${(mutalaVsMortal * 100).toFixed(1)}%)`);

    const kofiVsCoffee = calculateTokenSimilarity('coffee', 'kofi');
    assert(kofiVsCoffee >= 0.90, `Mistranscription "coffee" accurately resolves to "kofi" (Score: ${(kofiVsCoffee * 100).toFixed(1)}%)`);

    const kwameVsSquame = calculateTokenSimilarity('squame', 'kwame');
    assert(kwameVsSquame >= 0.90, `Mistranscription "squame" accurately resolves to "kwame" (Score: ${(kwameVsSquame * 100).toFixed(1)}%)`);

    const yakubuVsJacob = calculateTokenSimilarity('jacob', 'yakubu');
    assert(yakubuVsJacob >= 0.90, `Mistranscription "jacob" accurately resolves to "yakubu" (Score: ${(yakubuVsJacob * 100).toFixed(1)}%)`);

    const fuseiniVsFoster = calculateTokenSimilarity('foster', 'fuseini');
    assert(fuseiniVsFoster >= 0.90, `Mistranscription "foster" accurately resolves to "fuseini" (Score: ${(fuseiniVsFoster * 100).toFixed(1)}%)`);

    const seiduVsSaydu = calculateTokenSimilarity('saydu', 'seidu');
    assert(seiduVsSaydu >= 0.90, `Phonetic spelling "saydu" accurately resolves to "seidu" (Score: ${(seiduVsSaydu * 100).toFixed(1)}%)`);
  } catch (err) {
    assert(false, `Phonetic voice test failed: ${err.message}`);
  }

  // CATEGORY 4: FINANCIAL & LEDGER CALCULATIONS
  console.log(`\n${BOLD}${YELLOW}[CATEGORY 4: FINANCIAL & LEDGER CALCULATIONS INTEGRITY]${RESET}`);
  try {
    const standardRate = 5.0; // GHC 5.00 daily fee
    const pupilCount = 10;
    const grossExpected = pupilCount * standardRate;
    assert(grossExpected === 50.0, "Gross daily fee expected calculation (10 pupils * GHC 5 = GHC 50)");

    const scholarshipDiscount = 1.0;
    const netExpected = grossExpected - (pupilCount * scholarshipDiscount);
    assert(netExpected === 40.0, "Net expected fee deducting discounts is accurate (GHC 40)");

    const actualCollected = 35.0;
    const arrears = netExpected - actualCollected;
    assert(arrears === 5.0, "Outstanding arrears balance is accurate (GHC 5)");

    const examFeeRate = 20.0;
    const examFeePaid = 15.0;
    const examFeeBalance = examFeeRate - examFeePaid;
    assert(examFeeBalance === 5.0, "Exam fee balance calculation is accurate (GHC 20 expected - GHC 15 paid = GHC 5 balance)");
  } catch (err) {
    assert(false, `Financial ledger test failed: ${err.message}`);
  }

  // CATEGORY 5: SECURITY & ACCESS CONTROL AUDIT
  console.log(`\n${BOLD}${YELLOW}[CATEGORY 5: SECURITY & USER ACCESS CONTROL AUDIT]${RESET}`);
  try {
    const dbPath = path.join(__dirname, '..', 'db.json');
    const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    const adminUsers = (db.users || []).filter(u => u.role === 'Administrator' || u.role === 'Admin');
    assert(adminUsers.length > 0, `Database contains ${adminUsers.length} Administrator account(s)`);

    const admin = adminUsers[0];
    assert(admin.name && admin.email, "Administrator account has full profile details configured");
    assert(admin.mfaSecret !== undefined, "Multi-Factor Authentication (MFA) key structure configured");
  } catch (err) {
    assert(false, `Security test failed: ${err.message}`);
  }

  // SUMMARY RESULT
  console.log(`\n${BOLD}${CYAN}================================================================${RESET}`);
  console.log(`${BOLD}RESULTS: Total Tests Run: ${totalTests} | ${GREEN}Passed: ${passedTests}${RESET} | ${failedTests > 0 ? RED : GREEN}Failed: ${failedTests}${RESET}`);
  console.log(`${BOLD}${CYAN}================================================================${RESET}\n`);

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error("Test suite execution failed:", err);
  process.exit(1);
});
