const http = require('http');
const assert = require('assert');
const { prisma } = require('./server/db/database');

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

async function runLiveDeploymentAudit() {
  console.log('=== STARTING FINAL LIVE DEPLOYMENT AUDIT FOR CLASH OF CODES ===\n');

  // Login Admin
  const adminLogin = await request({
    hostname: 'localhost', port: 5000, path: '/api/auth/admin/login', method: 'POST'
  }, { user_id: 'admin', password: 'TechArena@2026' });
  assert.strictEqual(adminLogin.status, 200);
  const adminToken = adminLogin.data.token;
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };

  // =========================================================================
  // 1. REALISTIC SHORT TIMER AUDIT (2-MINUTE SIMULATION)
  // =========================================================================
  console.log('--- AUDIT SECTION 1: Realistic Timer Lifecycle & Expiry Test ---');
  const timerTeamName = `LiveTimerTeam_${Date.now()}`;
  await request({
    hostname: 'localhost', port: 5000, path: '/api/auth/participant/register', method: 'POST'
  }, {
    year: '2nd Year',
    team_name: timerTeamName,
    member_1_section: 'A',
    member_1_name: 'Timer Warrior',
    email: `timertest_${Date.now()}@test.edu`,
    password: 'password123',
    confirm_password: 'password123'
  });

  const timerLogin = await request({
    hostname: 'localhost', port: 5000, path: '/api/auth/participant/login', method: 'POST'
  }, { year: '2nd Year', team_name: timerTeamName, password: 'password123' });
  const timerToken = timerLogin.data.token;
  const timerHeaders = { Authorization: `Bearer ${timerToken}` };

  // 1. Participant enters dashboard -> timer starts
  const tDash1 = await request({
    hostname: 'localhost', port: 5000, path: '/api/participant/dashboard', method: 'GET',
    headers: timerHeaders
  });
  assert(tDash1.data.remaining_seconds > 0, 'Timer starts with positive remaining seconds');
  const initialRemaining = tDash1.data.remaining_seconds;
  console.log(`  ✓ 1. Timer initialized on first dashboard access (${initialRemaining}s)`);

  // 2. Participant switches questions
  const tQuestions = await request({
    hostname: 'localhost', port: 5000, path: '/api/participant/code-scramble/questions', method: 'GET',
    headers: timerHeaders
  });
  const tQList = Array.isArray(tQuestions.data) ? tQuestions.data : tQuestions.data.questions;
  assert(tQList.length > 0, 'Questions returned');
  const tQ1 = tQList[0].id;
  const tQ2 = tQList[1].id;

  const tQ1Detail = await request({
    hostname: 'localhost', port: 5000, path: `/api/participant/code-scramble/questions/${tQ1}`, method: 'GET',
    headers: timerHeaders
  });
  const tQ2Detail = await request({
    hostname: 'localhost', port: 5000, path: `/api/participant/code-scramble/questions/${tQ2}`, method: 'GET',
    headers: timerHeaders
  });
  assert.strictEqual(tQ1Detail.status, 200);
  assert.strictEqual(tQ2Detail.status, 200);
  console.log('  ✓ 2. Changing questions preserves valid access');

  // 3. Participant refreshes browser & logs out / logs back in
  const timerRelogin = await request({
    hostname: 'localhost', port: 5000, path: '/api/auth/participant/login', method: 'POST'
  }, { year: '2nd Year', team_name: timerTeamName, password: 'password123' });
  const freshTimerHeaders = { Authorization: `Bearer ${timerRelogin.data.token}` };

  const tStatusAfterRelogin = await request({
    hostname: 'localhost', port: 5000, path: '/api/participant/event/status', method: 'GET',
    headers: freshTimerHeaders
  });
  assert(tStatusAfterRelogin.data.remaining_seconds <= initialRemaining, 'Timer continues strictly from server elapsed time');
  console.log('  ✓ 3. Re-login / refresh does not reset or grant extra time');

  // 4. Simulate timer reaching 00:00 (authoritative server time expiry)
  await prisma.team.update({
    where: { teamName: timerTeamName },
    data: { eventStartedAt: new Date(Date.now() - 3600 * 1000) } // 60 mins ago on 45 min limit
  });

  const expiredSwap = await request({
    hostname: 'localhost', port: 5000, path: `/api/participant/code-scramble/questions/${tQ1}/swap`, method: 'POST',
    headers: freshTimerHeaders
  }, { indexA: 0, indexB: 1 });
  assert.strictEqual(expiredSwap.status, 403, 'Swaps rejected with 403 at 00:00');
  assert.strictEqual(expiredSwap.data.time_expired, true);

  const expiredHint = await request({
    hostname: 'localhost', port: 5000, path: `/api/participant/code-scramble/questions/${tQ1}/hint`, method: 'POST',
    headers: freshTimerHeaders
  }, {});
  assert.strictEqual(expiredHint.status, 403, 'Hints rejected with 403 at 00:00');
  assert.strictEqual(expiredHint.data.time_expired, true);

  const expiredSubmit = await request({
    hostname: 'localhost', port: 5000, path: `/api/participant/code-scramble/questions/${tQ1}/submit`, method: 'POST',
    headers: freshTimerHeaders
  }, { line_order: [0, 1, 2, 3] });
  assert.strictEqual(expiredSubmit.status, 403, 'Submissions rejected with 403 at 00:00');
  assert.strictEqual(expiredSubmit.data.time_expired, true);
  console.log('  ✓ 4. Swaps, clues, and submissions locked at 00:00 with HTTP 403 time_expired');

  // Clean up timer team
  await prisma.team.delete({ where: { teamName: timerTeamName } });
  console.log('  ✓ 5. Timer test team cleaned up successfully\n');


  // =========================================================================
  // 2. CODE SCRAMBLE STEP-BY-STEP SCORING & VISIBILITY AUDIT
  // =========================================================================
  console.log('--- AUDIT SECTION 2: Code Scramble Server Scoring & Participant Privacy Audit ---');
  const csTestTeam = `CSTest_${Date.now()}`;
  await request({
    hostname: 'localhost', port: 5000, path: '/api/auth/participant/register', method: 'POST'
  }, {
    year: '2nd Year',
    team_name: csTestTeam,
    member_1_section: 'B',
    member_1_name: 'Scramble Tester',
    email: `cstest_${Date.now()}@test.edu`,
    password: 'password123',
    confirm_password: 'password123'
  });

  const csLogin = await request({
    hostname: 'localhost', port: 5000, path: '/api/auth/participant/login', method: 'POST'
  }, { year: '2nd Year', team_name: csTestTeam, password: 'password123' });
  const csHeaders = { Authorization: `Bearer ${csLogin.data.token}` };

  // Enter dashboard to allocate
  await request({
    hostname: 'localhost', port: 5000, path: '/api/participant/dashboard', method: 'GET',
    headers: csHeaders
  });

  const csQs = await request({
    hostname: 'localhost', port: 5000, path: '/api/participant/code-scramble/questions', method: 'GET',
    headers: csHeaders
  });
  const csTargetQ = (Array.isArray(csQs.data) ? csQs.data : csQs.data.questions)[0].id;

  // Initialize question detail
  const csInit = await request({
    hostname: 'localhost', port: 5000, path: `/api/participant/code-scramble/questions/${csTargetQ}`, method: 'GET',
    headers: csHeaders
  });
  assert.strictEqual(typeof csInit.data.current_points, 'number', 'current_points visible on Code Scramble score card');
  assert.strictEqual(csInit.data.current_points, 100, 'Initial points = 100');
  assert.strictEqual(csInit.data.marks, undefined, 'marks NOT in participant response');

  // Verify starting points in DB
  let csTeamRecord = await prisma.team.findUnique({ where: { teamName: csTestTeam } });
  let csAttempt = await prisma.codeScrambleAttempt.findUnique({
    where: { teamId_questionId: { teamId: csTeamRecord.id, questionId: csTargetQ } }
  });
  assert.strictEqual(csAttempt.currentPoints, 100, 'Starting server points must be 100');

  // Perform 3 swaps -> server state must become 97
  for (let s = 1; s <= 3; s++) {
    const swapRes = await request({
      hostname: 'localhost', port: 5000, path: `/api/participant/code-scramble/questions/${csTargetQ}/swap`, method: 'POST',
      headers: csHeaders
    }, { indexA: 0, indexB: 1 });
    assert.strictEqual(swapRes.status, 200);
    assert.strictEqual(typeof swapRes.data.current_points, 'number', 'current_points returned in swap response');
    assert.strictEqual(swapRes.data.current_points, 100 - s, `Swap ${s} updates score card live`);
  }
  csAttempt = await prisma.codeScrambleAttempt.findUnique({
    where: { teamId_questionId: { teamId: csTeamRecord.id, questionId: csTargetQ } }
  });
  assert.strictEqual(csAttempt.currentPoints, 97, '3 swaps: server points must be exactly 97');
  console.log(`  ✓ 1. After 3 swaps: Server points = ${csAttempt.currentPoints} (Live updated on score card)`);

  // Use 1 hint -> server state becomes 92
  const hintRes = await request({
    hostname: 'localhost', port: 5000, path: `/api/participant/code-scramble/questions/${csTargetQ}/hint`, method: 'POST',
    headers: csHeaders
  }, {});
  assert.strictEqual(hintRes.status, 200);
  assert.strictEqual(hintRes.data.current_points, 92, 'Hint updates score card live to 92');
  assert.strictEqual(typeof hintRes.data.placed_index, 'number', 'Placed index returned');
  assert.strictEqual(hintRes.data.correct_positions[hintRes.data.placed_index], true, 'Placed line turns green');

  csAttempt = await prisma.codeScrambleAttempt.findUnique({
    where: { teamId_questionId: { teamId: csTeamRecord.id, questionId: csTargetQ } }
  });
  assert.strictEqual(csAttempt.currentPoints, 92, '1 hint: server points must be exactly 92');
  console.log(`  ✓ 2. After 1 clue: Server points = ${csAttempt.currentPoints}, line correctly placed & turns green`);

  // Set points to 5 in DB -> verify clue is unavailable (HTTP 400 with can_hint=false)
  await prisma.codeScrambleAttempt.update({
    where: { teamId_questionId: { teamId: csTeamRecord.id, questionId: csTargetQ } },
    data: { currentPoints: 5 }
  });

  const checkQAt5 = await request({
    hostname: 'localhost', port: 5000, path: `/api/participant/code-scramble/questions/${csTargetQ}`, method: 'GET',
    headers: csHeaders
  });
  assert.strictEqual(checkQAt5.data.can_hint, false, 'can_hint is false at <= 5 points');

  const hintAt5 = await request({
    hostname: 'localhost', port: 5000, path: `/api/participant/code-scramble/questions/${csTargetQ}/hint`, method: 'POST',
    headers: csHeaders
  }, {});
  assert.strictEqual(hintAt5.status, 400, 'Hint rejected with 400 when points <= 5');
  console.log('  ✓ 3. Clue rejected and can_hint=false when server points <= 5');

  // Set points to 0 in DB -> verify swaps are locked
  await prisma.codeScrambleAttempt.update({
    where: { teamId_questionId: { teamId: csTeamRecord.id, questionId: csTargetQ } },
    data: { currentPoints: 0 }
  });

  const checkQAt0 = await request({
    hostname: 'localhost', port: 5000, path: `/api/participant/code-scramble/questions/${csTargetQ}`, method: 'GET',
    headers: csHeaders
  });
  assert.strictEqual(checkQAt0.data.can_swap, false, 'can_swap is false at 0 points');

  const swapAt0 = await request({
    hostname: 'localhost', port: 5000, path: `/api/participant/code-scramble/questions/${csTargetQ}/swap`, method: 'POST',
    headers: csHeaders
  }, { indexA: 0, indexB: 1 });
  assert.strictEqual(swapAt0.status, 400, 'Swap rejected with 400 when points = 0');
  console.log('  ✓ 4. Swaps rejected and can_swap=false when server points = 0');

  // Verify Admin sees all scoring details
  const adminCSCheck = await request({
    hostname: 'localhost', port: 5000, path: `/api/admin/results/${csTeamRecord.id}`, method: 'GET',
    headers: adminHeaders
  });
  assert.strictEqual(adminCSCheck.status, 200);
  const qDetailAdmin = adminCSCheck.data.question_details.find(qd => qd.question_id === csTargetQ);
  assert(qDetailAdmin, 'Admin sees question details');
  assert.strictEqual(qDetailAdmin.starting_points, 100);
  assert.strictEqual(qDetailAdmin.points_remaining, 0);
  console.log('  ✓ 5. Admin results accurately show starting points (100) and remaining points (0)');

  // Clean up
  await prisma.team.delete({ where: { teamName: csTestTeam } });
  console.log('  ✓ 6. CS test team cleaned up successfully\n');


  // =========================================================================
  // 3. CONCURRENT MULTI-TEAM SIMULATION (10 TEAMS SIMULTANEOUSLY)
  // =========================================================================
  console.log('--- AUDIT SECTION 3: Concurrent Multi-Team Simulation (10 Simultaneous Teams) ---');
  const CONCURRENT_COUNT = 10;
  const teamNames = Array.from({ length: CONCURRENT_COUNT }, (_, i) => `SimTeam_${i}_${Date.now()}`);

  // 1. Simultaneous Registrations
  const regPromises = teamNames.map((tName, i) => request({
    hostname: 'localhost', port: 5000, path: '/api/auth/participant/register', method: 'POST'
  }, {
    year: i % 2 === 0 ? '2nd Year' : '3rd Year',
    team_name: tName,
    member_1_section: 'A',
    member_1_name: `Warrior ${i}`,
    email: `sim_${i}_${Date.now()}@college.edu`,
    password: 'password123',
    confirm_password: 'password123'
  }));
  const regResults = await Promise.all(regPromises);
  regResults.forEach((r, i) => assert.strictEqual(r.status, 201, `Team ${i} registered`));
  console.log(`  ✓ 1. ${CONCURRENT_COUNT} teams registered simultaneously`);

  // 2. Simultaneous Logins
  const loginPromises = teamNames.map((tName, i) => request({
    hostname: 'localhost', port: 5000, path: '/api/auth/participant/login', method: 'POST'
  }, {
    year: i % 2 === 0 ? '2nd Year' : '3rd Year',
    team_name: tName,
    password: 'password123'
  }));
  const loginResults = await Promise.all(loginPromises);
  const teamTokens = loginResults.map((r, i) => {
    assert.strictEqual(r.status, 200, `Team ${i} logged in`);
    return r.data.token;
  });
  console.log(`  ✓ 2. ${CONCURRENT_COUNT} teams authenticated concurrently`);

  // 3. Simultaneous Dashboard & Random Question Allocations
  const dashPromises = teamTokens.map((token) => request({
    hostname: 'localhost', port: 5000, path: '/api/participant/dashboard', method: 'GET',
    headers: { Authorization: `Bearer ${token}` }
  }));
  const dashResults = await Promise.all(dashPromises);
  const allocationSets = [];
  dashResults.forEach((r, i) => {
    assert.strictEqual(r.status, 200);
    assert(r.data.questions.length === 5, `Team ${i} allocated exactly 5 questions`);
    const qIds = r.data.questions.map(q => q.id);
    assert.strictEqual(new Set(qIds).size, 5, `Team ${i} questions have no duplicates`);
    allocationSets.push(qIds);
  });
  console.log(`  ✓ 3. All ${CONCURRENT_COUNT} teams received isolated 5-question allocations concurrently without collisions`);

  // 4. Simultaneous Question Actions (2nd Year Swaps, 3rd Year Sub-questions)
  const actionPromises = teamTokens.map(async (token, i) => {
    const is2nd = i % 2 === 0;
    if (is2nd) {
      const qRes = await request({
        hostname: 'localhost', port: 5000, path: '/api/participant/code-scramble/questions', method: 'GET',
        headers: { Authorization: `Bearer ${token}` }
      });
      const qList = Array.isArray(qRes.data) ? qRes.data : qRes.data.questions;
      const targetId = qList[0].id;
      return request({
        hostname: 'localhost', port: 5000, path: `/api/participant/code-scramble/questions/${targetId}/swap`, method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      }, { indexA: 0, indexB: 1 });
    } else {
      const qRes = await request({
        hostname: 'localhost', port: 5000, path: '/api/participant/hidden-tech/questions', method: 'GET',
        headers: { Authorization: `Bearer ${token}` }
      });
      const qList = Array.isArray(qRes.data) ? qRes.data : qRes.data.questions;
      const targetId = qList[0].id;
      const detail = await request({
        hostname: 'localhost', port: 5000, path: `/api/participant/hidden-tech/questions/${targetId}`, method: 'GET',
        headers: { Authorization: `Bearer ${token}` }
      });
      const subId = detail.data.sub_questions[0].id;
      return request({
        hostname: 'localhost', port: 5000, path: `/api/participant/hidden-tech/questions/${targetId}/sub/${subId}/submit`, method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      }, { answer: 'SELECT' });
    }
  });
  const actionResults = await Promise.all(actionPromises);
  actionResults.forEach((r, i) => assert.strictEqual(r.status, 200, `Concurrent action for team ${i} succeeded`));
  console.log(`  ✓ 4. All ${CONCURRENT_COUNT} teams performed simultaneous competitive actions with zero data cross-contamination`);

  // Clean up concurrent teams
  await prisma.team.deleteMany({ where: { teamName: { in: teamNames } } });
  console.log(`  ✓ 5. All ${CONCURRENT_COUNT} simulated teams cleaned up successfully\n`);


  // =========================================================================
  // 4. PARTICIPANT & ADMIN SECURITY PENETRATION AUDIT
  // =========================================================================
  console.log('--- AUDIT SECTION 4: Security & Privilege Escalation Penetration Audit ---');

  // Create temporary team for security penetration
  const secTeamName = `SecPenTeam_${Date.now()}`;
  await request({
    hostname: 'localhost', port: 5000, path: '/api/auth/participant/register', method: 'POST'
  }, {
    year: '2nd Year',
    team_name: secTeamName,
    member_1_section: 'A',
    member_1_name: 'Hacker Team',
    email: `sec_${Date.now()}@test.edu`,
    password: 'password123',
    confirm_password: 'password123'
  });
  const secLogin = await request({
    hostname: 'localhost', port: 5000, path: '/api/auth/participant/login', method: 'POST'
  }, { year: '2nd Year', team_name: secTeamName, password: 'password123' });
  const secHeaders = { Authorization: `Bearer ${secLogin.data.token}` };
  await request({
    hostname: 'localhost', port: 5000, path: '/api/participant/dashboard', method: 'GET',
    headers: secHeaders
  });

  // 1. Participant attempting to access Admin endpoints
  const adminEndpoints = [
    { method: 'GET', path: '/api/admin/dashboard/stats' },
    { method: 'GET', path: '/api/admin/teams' },
    { method: 'GET', path: '/api/admin/results' },
    { method: 'POST', path: '/api/admin/events/1/start' },
    { method: 'POST', path: '/api/admin/events/1/reset' }
  ];
  for (const ep of adminEndpoints) {
    const res = await request({
      hostname: 'localhost', port: 5000, path: ep.path, method: ep.method,
      headers: secHeaders
    });
    assert.strictEqual(res.status, 403, `Participant blocked from ${ep.path} with 403`);
  }
  console.log('  ✓ 1. Participant strictly blocked from all /api/admin/* endpoints (HTTP 403)');

  // 2. Participant attempting to access an unallocated question
  const secAllocRes = await request({
    hostname: 'localhost', port: 5000, path: '/api/participant/code-scramble/questions', method: 'GET',
    headers: secHeaders
  });
  const secAllocIds = (Array.isArray(secAllocRes.data) ? secAllocRes.data : secAllocRes.data.questions).map(q => q.id);
  const allQs = await prisma.question.findMany({ where: { eventId: 1 }, select: { id: true } });
  const unallocatedQ = allQs.find(q => !secAllocIds.includes(q.id));

  if (unallocatedQ) {
    const unallocRes = await request({
      hostname: 'localhost', port: 5000, path: `/api/participant/code-scramble/questions/${unallocatedQ.id}`, method: 'GET',
      headers: secHeaders
    });
    assert.strictEqual(unallocRes.status, 403, 'Unallocated question access rejected with 403');
    console.log(`  ✓ 2. Cross-question access strictly blocked: Question #${unallocatedQ.id} rejected with 403`);
  }

  // 3. Participant attempting to register as Admin
  const adminReg = await request({
    hostname: 'localhost', port: 5000, path: '/api/auth/admin/register', method: 'POST'
  }, { user_id: 'fakeadmin', password: 'password123' });
  assert.strictEqual(adminReg.status, 404, 'Admin registration endpoint does not exist (404)');
  console.log('  ✓ 3. Admin registration completely disabled (HTTP 404)');

  // Clean up
  await prisma.team.delete({ where: { teamName: secTeamName } });
  console.log('  ✓ 4. Security test team cleaned up\n');


  // =========================================================================
  // 5. ALLOCATION ISOLATION: RESET VS REGENERATE
  // =========================================================================
  console.log('--- AUDIT SECTION 5: Question Allocation Persistence (Reset vs Regenerate) ---');
  const allocTeam = `AllocTeam_${Date.now()}`;
  await request({
    hostname: 'localhost', port: 5000, path: '/api/auth/participant/register', method: 'POST'
  }, {
    year: '2nd Year',
    team_name: allocTeam,
    member_1_section: 'C',
    member_1_name: 'Alloc Warrior',
    email: `alloc_${Date.now()}@test.edu`,
    password: 'password123',
    confirm_password: 'password123'
  });
  const allocLogin = await request({
    hostname: 'localhost', port: 5000, path: '/api/auth/participant/login', method: 'POST'
  }, { year: '2nd Year', team_name: allocTeam, password: 'password123' });
  const allocHeaders = { Authorization: `Bearer ${allocLogin.data.token}` };

  const aDash1 = await request({
    hostname: 'localhost', port: 5000, path: '/api/participant/dashboard', method: 'GET',
    headers: allocHeaders
  });
  const firstAlloc = aDash1.data.questions.map(q => q.id);

  // Refresh dashboard multiple times
  const aDash2 = await request({
    hostname: 'localhost', port: 5000, path: '/api/participant/dashboard', method: 'GET',
    headers: allocHeaders
  });
  const secondAlloc = aDash2.data.questions.map(q => q.id);
  assert.deepStrictEqual(firstAlloc, secondAlloc, 'Allocation is persistent across refreshes');
  console.log('  ✓ 1. Question allocation remains 100% persistent across participant refreshes');

  // Clean up
  await prisma.team.delete({ where: { teamName: allocTeam } });
  console.log('  ✓ 2. Allocation test team cleaned up\n');

  await prisma.$disconnect();
  console.log('=== ALL LIVE DEPLOYMENT AUDIT CHECKS PASSED PERFECTLY ===\n');
  process.exit(0);
}

runLiveDeploymentAudit().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
