const http = require('http');
const assert = require('assert');

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        let parsed = null;
        try { parsed = JSON.parse(body); } catch (e) { parsed = body; }
        resolve({ status: res.statusCode, headers: res.headers, data: parsed });
      });
    });
    req.on('error', reject);
    if (data) {
      const payload = typeof data === 'string' ? data : JSON.stringify(data);
      req.setHeader('Content-Type', 'application/json');
      req.setHeader('Content-Length', Buffer.byteLength(payload));
      req.write(payload);
    }
    req.end();
  });
}

async function runProductionReadinessTests() {
  console.log('=== RUNNING PRODUCTION READINESS & POSTGRESQL INTEGRATION TESTS ===\n');
  let passed = 0;

  // 1. Healthcheck Endpoint
  console.log('--- Test 1: Healthcheck Endpoint ---');
  const healthRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/health',
    method: 'GET'
  });
  assert.strictEqual(healthRes.status, 200, 'Health endpoint should return 200');
  assert(healthRes.data.status === 'ok' || healthRes.data.status === 'healthy', 'Status should be ok or healthy');
  assert.strictEqual(healthRes.data.database, 'connected', 'Database should be connected');
  assert(healthRes.data.server_time || healthRes.data.timestamp, 'Server time should be present');
  console.log('  ✓ PASS: /api/health reports healthy/ok and database connected');
  passed++;

  // 2. Admin login to inspect/setup
  const adminLogin = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/admin/login',
    method: 'POST'
  }, {
    user_id: 'admin',
    password: 'TechArena@2026'
  });
  const adminToken = adminLogin.data.token;
  assert(adminToken, 'Admin token acquired');

  // 3. Problem Description Security & Strict Privacy Audit in Participant Code Scramble
  console.log('\n--- Test 2: Problem Description Available without final_code or Score Leakage ---');
  const teamLogin = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/participant/login',
    method: 'POST'
  }, {
    year: '2nd Year',
    team_name: 'Team Alpha',
    password: 'team123'
  });
  const participantToken = teamLogin.data.token;
  const participantHeaders = { Authorization: `Bearer ${participantToken}` };

  // Fetch allocated questions
  const qsRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/participant/code-scramble/questions',
    method: 'GET',
    headers: participantHeaders
  });
  const questionsList = Array.isArray(qsRes.data) ? qsRes.data : qsRes.data.questions;
  assert(questionsList && questionsList.length > 0, 'Allocated questions returned');
  const targetQ = questionsList.find(q => !q.is_attempted) || questionsList[0];
  const targetQId = targetQ.id;

  // Fetch question detail
  const qDetail = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/participant/code-scramble/questions/${targetQId}`,
    method: 'GET',
    headers: participantHeaders
  });
  assert.strictEqual(qDetail.status, 200);
  assert.strictEqual(qDetail.data.final_code, undefined, 'final_code MUST NEVER be exposed in participant API');
  assert.strictEqual(qDetail.data.current_points, undefined, 'current_points MUST NEVER be exposed in participant API');
  assert.strictEqual(qDetail.data.starting_points, undefined, 'starting_points MUST NEVER be exposed in participant API');
  assert.strictEqual(qDetail.data.marks, undefined, 'marks MUST NEVER be exposed in participant API');
  assert.strictEqual(qDetail.data.marks_awarded, undefined, 'marks_awarded MUST NEVER be exposed in participant API');
  assert.strictEqual(qDetail.data.penalty, undefined, 'penalty MUST NEVER be exposed in participant API');
  assert.strictEqual(qDetail.data.swap_penalty, undefined, 'swap_penalty MUST NEVER be exposed in participant API');
  assert.strictEqual(qDetail.data.hint_penalty, undefined, 'hint_penalty MUST NEVER be exposed in participant API');
  assert(qDetail.data.problem_description !== undefined, 'problem_description should be present');
  assert(typeof qDetail.data.problem_description === 'string', 'problem_description should be a string');
  assert(qDetail.data.problem_description.length > 0, 'problem_description should not be empty');
  console.log(`  ✓ PASS: Participant received problem_description without final_code or score leakage`);
  passed++;

  // 4. Test Save and Clue Endpoints strictly DO NOT leak points
  console.log('\n--- Test 3: Save and Clue Endpoints Do NOT Leak Score to Participant ---');
  const saveCheck = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/participant/code-scramble/questions/${targetQId}/save`,
    method: 'POST',
    headers: participantHeaders
  }, {
    line_order: qDetail.data.current_arrangement
  });
  assert.strictEqual(saveCheck.status, 200);
  assert.strictEqual(saveCheck.data.current_points, undefined, 'Save endpoint MUST NEVER return current_points');
  assert.strictEqual(saveCheck.data.marks, undefined, 'Save endpoint MUST NEVER return marks');

  const clueCheck = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/participant/code-scramble/questions/${targetQId}/hint`,
    method: 'POST',
    headers: participantHeaders
  }, {});
  assert.strictEqual(clueCheck.status, 200);
  assert.strictEqual(clueCheck.data.current_points, undefined, 'Clue endpoint MUST NEVER return current_points');
  assert.strictEqual(clueCheck.data.marks, undefined, 'Clue endpoint MUST NEVER return marks');
  console.log('  ✓ PASS: Save and clue responses strictly withhold all score/points/marks information');
  passed++;

  // 5. Server-Authoritative Timer & Expiry Enforcement
  console.log('\n--- Test 4: Server-Authoritative Timer & Expiry Locking ---');
  const tempTeamName = `TimerTestTeam_${Date.now()}`;
  const regRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/participant/register',
    method: 'POST'
  }, {
    year: '2nd Year',
    team_name: tempTeamName,
    member_1_section: 'A',
    member_1_name: 'Timer Tester',
    email: `timertest_${Date.now()}@example.com`,
    password: 'password123',
    confirm_password: 'password123'
  });
  assert.strictEqual(regRes.status, 201, 'Temp team registered');

  const tempLogin = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/participant/login',
    method: 'POST'
  }, {
    year: '2nd Year',
    team_name: tempTeamName,
    password: 'password123'
  });
  const tempToken = tempLogin.data.token;
  const tempHeaders = { Authorization: `Bearer ${tempToken}` };

  // Access dashboard to initialize allocation and start_time
  const dashRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/participant/dashboard',
    method: 'GET',
    headers: tempHeaders
  });
  assert(dashRes.data.remaining_seconds !== undefined, 'remaining_seconds present on dashboard');
  assert(dashRes.data.remaining_seconds > 0, 'Initial remaining seconds > 0');

  // Verify timer status endpoint
  const statusRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/participant/event/status',
    method: 'GET',
    headers: tempHeaders
  });
  assert.strictEqual(statusRes.status, 200);
  assert.strictEqual(statusRes.data.status, 'live');
  console.log('  ✓ PASS: Server-authoritative timer calculates live remaining seconds');
  passed++;

  // Get question for this team BEFORE expiring time
  const tempQs = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/participant/code-scramble/questions',
    method: 'GET',
    headers: tempHeaders
  });
  const tempQList = Array.isArray(tempQs.data) ? tempQs.data : tempQs.data.questions;
  assert(tempQList && tempQList.length > 0, 'Allocated question found');
  const testQId = tempQList[0].id;

  // Now simulate an expired team by updating eventStartedAt far in the past via prisma
  console.log('\n--- Test 5: Expiry Lock Rejects Swaps and Hints with 403 ---');
  const { prisma } = require('./server/db/database');
  await prisma.team.update({
    where: { teamName: tempTeamName },
    data: {
      eventStartedAt: new Date(Date.now() - 100 * 60 * 1000) // 100 minutes ago (limit is 45)
    }
  });

  // Try to swap lines on expired team
  const swapRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/participant/code-scramble/questions/${testQId}/swap`,
    method: 'POST',
    headers: tempHeaders
  }, {
    indexA: 0,
    indexB: 1
  });
  assert.strictEqual(swapRes.status, 403, 'Expired team swap rejected with 403');
  assert.strictEqual(swapRes.data.time_expired, true, 'time_expired flag returned');
  console.log('  ✓ PASS: Swap rejected with 403 when time expired');
  passed++;

  // Try to request clue on expired team
  const clueRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/participant/code-scramble/questions/${testQId}/clue`,
    method: 'POST',
    headers: tempHeaders
  }, {});
  assert.strictEqual(clueRes.status, 403, 'Expired team clue rejected with 403');
  assert.strictEqual(clueRes.data.time_expired, true, 'time_expired flag returned');
  console.log('  ✓ PASS: Clue request rejected with 403 when time expired');
  passed++;

  // Try to submit question on expired team
  const subRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/participant/code-scramble/questions/${testQId}/submit`,
    method: 'POST',
    headers: tempHeaders
  }, {
    line_order: [0, 1, 2, 3]
  });
  assert.strictEqual(subRes.status, 403, 'Expired team submit rejected with 403');
  assert.strictEqual(subRes.data.time_expired, true, 'time_expired flag returned');
  console.log('  ✓ PASS: Question submission rejected with 403 when time expired');
  passed++;

  // 6. Admin Scoring Verification: Admin can see all scores and deductions
  console.log('\n--- Test 6: Admin Scoring Verification (Admin can see all scores, points & deductions) ---');
  const adminResults = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/admin/results/1',
    method: 'GET',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert.strictEqual(adminResults.status, 200, 'Admin results fetched');
  assert(adminResults.data.team_name || adminResults.data.team_id, 'Team info returned to admin');
  assert(adminResults.data.total_marks !== undefined, 'Admin sees total_marks');
  assert(adminResults.data.total_possible !== undefined, 'Admin sees total_possible');
  assert(Array.isArray(adminResults.data.question_details), 'Admin sees question details');
  const csQuestionInAdmin = adminResults.data.question_details.find(qd => qd.type === 'code_scramble');
  assert(csQuestionInAdmin, 'Code Scramble question present in admin results');
  assert(csQuestionInAdmin.starting_points !== undefined, 'Admin sees starting_points');
  assert(csQuestionInAdmin.points_remaining !== undefined, 'Admin sees points_remaining');
  assert(csQuestionInAdmin.swaps_count !== undefined, 'Admin sees swaps_count');
  assert(csQuestionInAdmin.hints_used !== undefined, 'Admin sees hints_used');
  assert(csQuestionInAdmin.marks_awarded !== undefined, 'Admin sees marks_awarded');
  console.log('  ✓ PASS: Admin retains full access to starting_points, points_remaining, swaps_count, hints_used, and marks');
  passed++;

  // Clean up temp team
  await prisma.team.delete({ where: { teamName: tempTeamName } });
  await prisma.$disconnect();
  console.log('  ✓ PASS: Temp test team cleaned up');

  console.log(`\n=== ALL ${passed} PRODUCTION READINESS TESTS PASSED ===\n`);
  process.exit(0);
}

runProductionReadinessTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
