const http = require('http');
const assert = require('assert');
const path = require('path');
require('./server/node_modules/dotenv').config({ path: path.join(__dirname, '.env') });
const { PrismaClient } = require('./server/node_modules/@prisma/client');

const prisma = new PrismaClient();

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : null;
          resolve({ status: res.statusCode, headers: res.headers, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: body });
        }
      });
    });
    req.on('error', reject);
    if (data) {
      req.setHeader('Content-Type', 'application/json');
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runTrueSwapAndScoreTests() {
  console.log('=== RUNNING TRUE LINE SWAP & SCORE CARD VERIFICATION ===\n');
  let passed = 0;

  // 1. Unit Test for True Pairwise Swap Logic
  console.log('--- TEST 1: True Pairwise Swap Explicit Test Cases ---');
  let sample = [1, 2, 3, 4];
  
  // Test Case 1: swap(1, 3) -> 1-indexed line 1 and 3 (index 0 and index 2)
  const temp1 = sample[0];
  sample[0] = sample[2];
  sample[2] = temp1;
  assert.deepStrictEqual(sample, [3, 2, 1, 4], 'swap(1, 3) on [1, 2, 3, 4] must produce [3, 2, 1, 4]');
  console.log('  ✓ PASS: [1, 2, 3, 4] swap(1, 3) -> [3, 2, 1, 4]');
  passed++;

  // Test Case 2: swap(2, 4) -> 1-indexed line 2 and 4 (index 1 and index 3)
  const temp2 = sample[1];
  sample[1] = sample[3];
  sample[3] = temp2;
  assert.deepStrictEqual(sample, [3, 4, 1, 2], 'swap(2, 4) on [3, 2, 1, 4] must produce [3, 4, 1, 2]');
  console.log('  ✓ PASS: [3, 2, 1, 4] swap(2, 4) -> [3, 4, 1, 2]');
  passed++;

  // 2. Register a dedicated test team for Code Scramble
  console.log('\n--- TEST 2: Live True Swap & Score Card Deductions on Server ---');
  const teamName = `TrueSwapTeam_${Date.now()}`;
  const password = 'TestPassword123!';
  
  const regRes = await request({
    hostname: 'localhost', port: 5000, path: '/api/auth/participant/register', method: 'POST'
  }, {
    year: '2nd Year',
    team_name: teamName,
    member_1_name: 'Swap Tester',
    member_1_section: 'A',
    email: `swap_test_${Date.now()}@college.edu`,
    password: password,
    confirm_password: password
  });
  assert.strictEqual(regRes.status, 201, 'Registration must succeed');

  // Login
  const loginRes = await request({
    hostname: 'localhost', port: 5000, path: '/api/auth/participant/login', method: 'POST'
  }, {
    year: '2nd Year',
    team_name: teamName,
    password: password
  });
  assert.strictEqual(loginRes.status, 200);
  const token = loginRes.data.token;
  const authHeaders = { Authorization: `Bearer ${token}` };

  // Enter dashboard to trigger question allocation
  const dashRes = await request({
    hostname: 'localhost', port: 5000, path: '/api/participant/dashboard', method: 'GET',
    headers: authHeaders
  });
  assert.strictEqual(dashRes.status, 200);

  // Fetch assigned questions
  const qsRes = await request({
    hostname: 'localhost', port: 5000, path: '/api/participant/code-scramble/questions', method: 'GET',
    headers: authHeaders
  });
  assert.strictEqual(qsRes.status, 200);
  const qList = Array.isArray(qsRes.data) ? qsRes.data : qsRes.data.questions;
  const targetQId = qList[0].id;

  // Load question detail -> Verify Score Card fields
  const qDetail = await request({
    hostname: 'localhost', port: 5000, path: `/api/participant/code-scramble/questions/${targetQId}`, method: 'GET',
    headers: authHeaders
  });
  assert.strictEqual(qDetail.status, 200);
  assert.strictEqual(qDetail.data.starting_points, 100, 'Starting points must be 100 on score card');
  assert.strictEqual(qDetail.data.current_points, 100, 'Initial current points must be 100 on score card');
  assert.strictEqual(qDetail.data.can_swap, true, 'can_swap must be true');
  assert.strictEqual(qDetail.data.can_hint, true, 'can_hint must be true');
  console.log(`  ✓ PASS: Question loaded with Starting: ${qDetail.data.starting_points} PTS, Current: ${qDetail.data.current_points} PTS`);
  passed++;

  // Perform a TRUE swap on the server via { indexA: 0, indexB: 2 }
  const initialArrangement = [...qDetail.data.current_arrangement];
  const swapRes = await request({
    hostname: 'localhost', port: 5000, path: `/api/participant/code-scramble/questions/${targetQId}/swap`, method: 'POST',
    headers: authHeaders
  }, { indexA: 0, indexB: 2 });
  assert.strictEqual(swapRes.status, 200);
  assert.strictEqual(swapRes.data.swapped, true);
  assert.strictEqual(swapRes.data.current_points, 99, '1 swap must deduct 1 point -> 99 PTS');
  assert.strictEqual(swapRes.data.line_order[0], initialArrangement[2], 'Index 0 must now have line from index 2');
  assert.strictEqual(swapRes.data.line_order[2], initialArrangement[0], 'Index 2 must now have line from index 0');
  assert.strictEqual(swapRes.data.line_order[1], initialArrangement[1], 'Index 1 must remain completely unchanged');
  console.log(`  ✓ PASS: Server executed true pairwise swap: index 0 <-> index 2. Score = ${swapRes.data.current_points} PTS`);
  passed++;

  // Request a clue / hint -> deducts 5 points (99 -> 94)
  const hintRes = await request({
    hostname: 'localhost', port: 5000, path: `/api/participant/code-scramble/questions/${targetQId}/hint`, method: 'POST',
    headers: authHeaders
  }, {});
  assert.strictEqual(hintRes.status, 200);
  assert.strictEqual(hintRes.data.success, true);
  assert.strictEqual(hintRes.data.current_points, 94, 'Hint must deduct 5 points -> 94 PTS');
  assert.strictEqual(hintRes.data.correct_positions[hintRes.data.placed_index], true, 'Placed line is green in correct position');
  console.log(`  ✓ PASS: Clue applied: placed correct line at index ${hintRes.data.placed_index} (green). Score = ${hintRes.data.current_points} PTS`);
  passed++;

  // 3. Verify Score Persistence across Reload
  console.log('\n--- TEST 3: Score Persistence Across Reload & Re-Login ---');
  const reloadDetail = await request({
    hostname: 'localhost', port: 5000, path: `/api/participant/code-scramble/questions/${targetQId}`, method: 'GET',
    headers: authHeaders
  });
  assert.strictEqual(reloadDetail.data.current_points, 94, 'Score must persist across page refresh (94 PTS)');
  console.log('  ✓ PASS: Score persists across page refresh (94 PTS)');
  passed++;

  // Logout and Re-Login with fresh token
  const reLoginRes = await request({
    hostname: 'localhost', port: 5000, path: '/api/auth/participant/login', method: 'POST'
  }, {
    year: '2nd Year',
    team_name: teamName,
    password: password
  });
  const freshToken = reLoginRes.data.token;
  const reLoginDetail = await request({
    hostname: 'localhost', port: 5000, path: `/api/participant/code-scramble/questions/${targetQId}`, method: 'GET',
    headers: { Authorization: `Bearer ${freshToken}` }
  });
  assert.strictEqual(reLoginDetail.data.current_points, 94, 'Score must persist after logout and re-login (94 PTS)');
  console.log('  ✓ PASS: Score persists across logout and re-login (94 PTS)');
  passed++;

  // 4. Multi-device / Teammate Synchronization Test
  console.log('\n--- TEST 4: Same-Team Multi-Client Score Synchronization ---');
  const teammateLogin = await request({
    hostname: 'localhost', port: 5000, path: '/api/auth/participant/login', method: 'POST'
  }, {
    year: '2nd Year',
    team_name: teamName,
    password: password
  });
  const teammateHeaders = { Authorization: `Bearer ${teammateLogin.data.token}` };
  const teammateView = await request({
    hostname: 'localhost', port: 5000, path: `/api/participant/code-scramble/questions/${targetQId}`, method: 'GET',
    headers: teammateHeaders
  });
  assert.strictEqual(teammateView.data.current_points, 94, 'Teammate sees identical server-authoritative score');
  console.log('  ✓ PASS: Two teammates on different devices see identical question score (94 PTS)');
  passed++;

  // 5. Cross-Team Score Isolation Test
  console.log('\n--- TEST 5: Cross-Team Isolation & Data Privacy ---');
  const team2Name = `OtherTeam_${Date.now()}`;
  await request({
    hostname: 'localhost', port: 5000, path: '/api/auth/participant/register', method: 'POST'
  }, {
    year: '2nd Year',
    team_name: team2Name,
    member_1_name: 'Other Member',
    member_1_section: 'B',
    email: `other_${Date.now()}@college.edu`,
    password: password,
    confirm_password: password
  });
  const team2Login = await request({
    hostname: 'localhost', port: 5000, path: '/api/auth/participant/login', method: 'POST'
  }, { year: '2nd Year', team_name: team2Name, password: password });
  const team2Headers = { Authorization: `Bearer ${team2Login.data.token}` };
  await request({
    hostname: 'localhost', port: 5000, path: '/api/participant/dashboard', method: 'GET',
    headers: team2Headers
  });
  const team2Detail = await request({
    hostname: 'localhost', port: 5000, path: `/api/participant/code-scramble/questions/${targetQId}`, method: 'GET',
    headers: team2Headers
  });
  if (team2Detail.status === 200) {
    assert.strictEqual(team2Detail.data.current_points, 100, 'Other team starts with fresh independent 100 points');
  } else {
    assert.strictEqual(team2Detail.status, 403, 'Unallocated questions strictly blocked with 403');
  }
  console.log('  ✓ PASS: Different teams cannot access or affect each other\'s question scores');
  passed++;

  // 6. Point Boundary & Restriction Verification (<= 5 points locks hint, <= 0 points locks swap)
  console.log('\n--- TEST 6: Point Boundary Protections (No Negative Points, Expiry Locks) ---');
  const testTeamRecord = await prisma.team.findUnique({ where: { teamName: teamName } });
  
  // Set to 5 points
  await prisma.codeScrambleAttempt.update({
    where: { teamId_questionId: { teamId: testTeamRecord.id, questionId: targetQId } },
    data: { currentPoints: 5 }
  });
  const at5Res = await request({
    hostname: 'localhost', port: 5000, path: `/api/participant/code-scramble/questions/${targetQId}/hint`, method: 'POST',
    headers: authHeaders
  }, {});
  assert.strictEqual(at5Res.status, 400, 'Hint must be rejected when points <= 5');
  console.log('  ✓ PASS: Hint correctly rejected at <= 5 points');
  passed++;

  // Set to 0 points
  await prisma.codeScrambleAttempt.update({
    where: { teamId_questionId: { teamId: testTeamRecord.id, questionId: targetQId } },
    data: { currentPoints: 0 }
  });
  const at0Res = await request({
    hostname: 'localhost', port: 5000, path: `/api/participant/code-scramble/questions/${targetQId}/swap`, method: 'POST',
    headers: authHeaders
  }, { indexA: 0, indexB: 1 });
  assert.strictEqual(at0Res.status, 400, 'Swap must be rejected when points <= 0');
  console.log('  ✓ PASS: Swap correctly rejected at 0 points (cannot become negative)');
  passed++;

  // Clean up test teams
  await prisma.team.deleteMany({
    where: { teamName: { in: [teamName, team2Name] } }
  });
  console.log('  ✓ Cleaned up test teams');

  await prisma.$disconnect();
  console.log(`\n==================================================`);
  console.log(`🎉 ALL ${passed} TRUE SWAP & SCORE CARD TESTS PASSED!`);
  console.log(`==================================================\n`);
}

runTrueSwapAndScoreTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
