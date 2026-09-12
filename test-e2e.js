const http = require('http');

async function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        let parsed = null;
        try { parsed = JSON.parse(body); } catch (e) { parsed = body; }
        resolve({ status: res.statusCode, headers: res.headers, body: parsed });
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

async function runTests() {
  console.log('=== RUNNING COMPREHENSIVE ACCEPTANCE TESTS FOR TECH ARENA ===\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 1. Admin Authentication
    console.log('--- TEST GROUP 1: Admin Authentication ---');
    const adminLoginRes = await request({
      hostname: 'localhost', port: 5000, path: '/api/auth/admin/login', method: 'POST'
    }, { user_id: 'admin', password: 'TechArena@2026' });

    assert(adminLoginRes.status === 200, 'Admin login returns 200 OK');
    assert(adminLoginRes.body.token && adminLoginRes.body.role === 'admin', 'Admin token and role provided');
    const adminToken = adminLoginRes.body.token;

    // Reset events to ensure pristine state for repeatability
    await request({
      hostname: 'localhost', port: 5000, path: '/api/admin/events/1/reset', method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    await request({
      hostname: 'localhost', port: 5000, path: '/api/admin/events/2/reset', method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    // Bad admin password
    const badAdminRes = await request({
      hostname: 'localhost', port: 5000, path: '/api/auth/admin/login', method: 'POST'
    }, { user_id: 'admin', password: 'wrongPassword' });
    assert(badAdminRes.status === 401, 'Invalid admin password rejected with 401');

    // 2. Participant Authentication
    console.log('\n--- TEST GROUP 2: Participant Authentication ---');
    const pLoginRes = await request({
      hostname: 'localhost', port: 5000, path: '/api/auth/participant/login', method: 'POST'
    }, { year: '2nd Year', team_name: 'Team Alpha', password: 'team123' });

    assert(pLoginRes.status === 200, '2nd Year team login returns 200 OK');
    assert(pLoginRes.body.token && pLoginRes.body.role === 'participant', 'Participant token and role provided');
    const pToken = pLoginRes.body.token;

    // Year mismatch check (e.g. trying 3rd year with Team Alpha)
    const yearMismatchRes = await request({
      hostname: 'localhost', port: 5000, path: '/api/auth/participant/login', method: 'POST'
    }, { year: '3rd Year', team_name: 'Team Alpha', password: 'team123' });
    assert(yearMismatchRes.status === 401, 'Participant login with wrong year rejected with 401');

    // 3. Security: Role-based Authorization
    console.log('\n--- TEST GROUP 3: Authorization & Route Protection ---');
    const unauthorizedAdminCall = await request({
      hostname: 'localhost', port: 5000, path: '/api/admin/dashboard/stats', method: 'GET',
      headers: { Authorization: `Bearer ${pToken}` }
    });
    assert(unauthorizedAdminCall.status === 403, 'Participant blocked from admin API with 403 Forbidden');

    const anonymousCall = await request({
      hostname: 'localhost', port: 5000, path: '/api/admin/teams', method: 'GET'
    });
    assert(anonymousCall.status === 401, 'Anonymous request rejected with 401 Unauthorized');

    // 4. Admin Event Lifecycle Management
    console.log('\n--- TEST GROUP 4: Event Lifecycle & Controls ---');
    // Start Code Scramble (Event 1)
    const startEvent1 = await request({
      hostname: 'localhost', port: 5000, path: '/api/admin/events/1/start', method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(startEvent1.status === 200, 'Admin can start Code Scramble event');

    // Start Hidden Tech (Event 2)
    const startEvent2 = await request({
      hostname: 'localhost', port: 5000, path: '/api/admin/events/2/start', method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(startEvent2.status === 200, 'Admin can start Hidden Tech event');

    // Verify events list
    const eventsRes = await request({
      hostname: 'localhost', port: 5000, path: '/api/admin/events', method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(eventsRes.status === 200 && eventsRes.body.length >= 2, 'Admin can fetch event details');
    const liveEv1 = eventsRes.body.find(e => e.id === 1);
    assert(liveEv1.status === 'live', 'Code Scramble event status is LIVE');

    // 5. Persistent Random Question Allocation
    console.log('\n--- TEST GROUP 5: Persistent Random Question Allocation ---');
    // Team Alpha accesses dashboard
    const dashRes1 = await request({
      hostname: 'localhost', port: 5000, path: '/api/participant/dashboard', method: 'GET',
      headers: { Authorization: `Bearer ${pToken}` }
    });
    assert(dashRes1.status === 200, 'Participant can access dashboard');
    assert(dashRes1.body.allocated_count === 5, 'Exactly 5 questions allocated to team from pool of 10');
    assert(dashRes1.body.questions && dashRes1.body.questions.length === 5, 'Allocated questions list returned');
    const initialQuestionIds = dashRes1.body.questions.map(q => q.id);

    // Call dashboard a second time (simulate page refresh / re-login)
    const dashRes2 = await request({
      hostname: 'localhost', port: 5000, path: '/api/participant/dashboard', method: 'GET',
      headers: { Authorization: `Bearer ${pToken}` }
    });
    const refreshedQuestionIds = dashRes2.body.questions.map(q => q.id);
    const arraysEqual = JSON.stringify(initialQuestionIds) === JSON.stringify(refreshedQuestionIds);
    assert(arraysEqual, 'Random question allocation is PERSISTENT and does NOT change on refresh');

    // Verify participant score privacy on dashboard
    assert(dashRes1.body.score === undefined && dashRes1.body.marks === undefined, 'Score/marks NEVER exposed on participant dashboard');

    // 6. Allocation Security (Accessing an unallocated question returns 403)
    console.log('\n--- TEST GROUP 6: Allocation Security ---');
    // Find an unallocated question ID
    let unallocatedId = null;
    for (let id = 1; id <= 10; id++) {
      if (!initialQuestionIds.includes(id)) {
        unallocatedId = id;
        break;
      }
    }
    if (unallocatedId) {
      const forbiddenQ = await request({
        hostname: 'localhost', port: 5000, path: `/api/participant/code-scramble/questions/${unallocatedId}`, method: 'GET',
        headers: { Authorization: `Bearer ${pToken}` }
      });
      assert(forbiddenQ.status === 403, `Accessing unallocated Question #${unallocatedId} returns 403 Forbidden`);
    }

    // 7. Code Scramble Mechanics & Scoring Overhaul
    console.log('\n--- TEST GROUP 7: Code Scramble Scoring Overhaul & Mechanics ---');
    const targetQId = initialQuestionIds[0];
    const qDetail = await request({
      hostname: 'localhost', port: 5000, path: `/api/participant/code-scramble/questions/${targetQId}`, method: 'GET',
      headers: { Authorization: `Bearer ${pToken}` }
    });
    assert(qDetail.status === 200, 'Participant can fetch assigned question details');
    assert(qDetail.body.final_code === undefined, 'Security: final_code reference is NEVER exposed to participant');
    assert(typeof qDetail.body.current_points === 'number', 'Score card: current_points is visible on Code Scramble');
    assert(typeof qDetail.body.starting_points === 'number', 'Score card: starting_points is visible on Code Scramble');

    // Test: Saving with same order doesn't decrement points / swaps
    const initialArrangement = qDetail.body.current_arrangement;
    const saveNoChange = await request({
      hostname: 'localhost', port: 5000, path: `/api/participant/code-scramble/questions/${targetQId}/save`, method: 'POST',
      headers: { Authorization: `Bearer ${pToken}` }
    }, { line_order: initialArrangement });
    assert(saveNoChange.status === 200 && saveNoChange.body.saved === true, 'Saving identical order succeeds without swap penalty');

    // Test: Swap two lines (-1 point penalty)
    const swappedArrangement = [...initialArrangement];
    const tmp = swappedArrangement[0];
    swappedArrangement[0] = swappedArrangement[1];
    swappedArrangement[1] = tmp;

    const swapRes1 = await request({
      hostname: 'localhost', port: 5000, path: `/api/participant/code-scramble/questions/${targetQId}/save`, method: 'POST',
      headers: { Authorization: `Bearer ${pToken}` }
    }, { line_order: swappedArrangement });
    assert(swapRes1.status === 200 && Array.isArray(swapRes1.body.correct_positions), 'Valid swap accepted and returns updated line-by-line correct_positions');

    // Test: Clue / Hint (-5 points and auto-places next correct line)
    const hintRes = await request({
      hostname: 'localhost', port: 5000, path: `/api/participant/code-scramble/questions/${targetQId}/hint`, method: 'POST',
      headers: { Authorization: `Bearer ${pToken}` }
    });
    assert(hintRes.status === 200 && hintRes.body.success === true, 'Clue request accepted');
    assert(typeof hintRes.body.placed_index === 'number', 'Clue automatically places next unresolved line');
    assert(hintRes.body.correct_positions[hintRes.body.placed_index] === true, 'Auto-placed line is verified in correct position (turns green)');

    // Test: Apply clues until all lines are correctly ordered, verifying hint auto-placement
    let currentOrder = hintRes.body.line_order;
    let currentPositions = hintRes.body.correct_positions;
    
    // Request additional clues if needed to get 100% correct placement
    while (!currentPositions.every(Boolean)) {
      const nextHint = await request({
        hostname: 'localhost', port: 5000, path: `/api/participant/code-scramble/questions/${targetQId}/hint`, method: 'POST',
        headers: { Authorization: `Bearer ${pToken}` }
      });
      if (nextHint.status === 200 && nextHint.body.line_order) {
        currentOrder = nextHint.body.line_order;
        currentPositions = nextHint.body.correct_positions;
      } else {
        break;
      }
    }

    // Test: Check admin view to verify swaps_count and hints_count tracked on server
    const adminCheckTeam = await request({
      hostname: 'localhost', port: 5000, path: `/api/admin/results/1`, method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const qDetailsInAdmin = adminCheckTeam.body?.question_details?.find(qd => qd.question_id === targetQId);
    assert(qDetailsInAdmin && qDetailsInAdmin.swaps_count >= 1, 'Admin results correctly tracks team swap count');
    assert(qDetailsInAdmin && qDetailsInAdmin.hints_used >= 1, 'Admin results correctly tracks team clues used count');
    assert(qDetailsInAdmin && qDetailsInAdmin.points_remaining < qDetailsInAdmin.starting_points, 'Points deducted server-side for swap and clue');

    // Test: Submit code scramble arrangement with all correct lines
    const submitCS = await request({
      hostname: 'localhost', port: 5000, path: `/api/participant/code-scramble/questions/${targetQId}/submit`, method: 'POST',
      headers: { Authorization: `Bearer ${pToken}` }
    }, { line_order: currentOrder });

    assert(submitCS.status === 200 && submitCS.body.submitted === true, 'Code scramble arrangement submitted successfully');
    assert(submitCS.body.marks === undefined && submitCS.body.is_correct === undefined, 'Submission response NEVER exposes marks or correctness to participant');

    // 8. Hidden Tech 3rd Year Flow
    console.log('\n--- TEST GROUP 8: Hidden Tech Flow & Password Unlocking ---');
    const p3Login = await request({
      hostname: 'localhost', port: 5000, path: '/api/auth/participant/login', method: 'POST'
    }, { year: '3rd Year', team_name: 'Team Gamma', password: 'team123' });

    assert(p3Login.status === 200, '3rd Year Team Gamma login returns 200 OK');
    const p3Token = p3Login.body.token;

    // Get assigned questions for Team Gamma
    const htDash = await request({
      hostname: 'localhost', port: 5000, path: '/api/participant/dashboard', method: 'GET',
      headers: { Authorization: `Bearer ${p3Token}` }
    });
    assert(htDash.status === 200 && htDash.body.allocated_count > 0, 'Hidden Tech questions allocated to 3rd year team');
    const htQList = await request({
      hostname: 'localhost', port: 5000, path: '/api/participant/hidden-tech/questions', method: 'GET',
      headers: { Authorization: `Bearer ${p3Token}` }
    });
    const htQ1 = htQList.body[0];
    assert(htQ1 !== undefined, 'Hidden Tech main question available');

    // Fetch details of Question 1
    const htDetail = await request({
      hostname: 'localhost', port: 5000, path: `/api/participant/hidden-tech/questions/${htQ1.id}`, method: 'GET',
      headers: { Authorization: `Bearer ${p3Token}` }
    });
    assert(htDetail.status === 200, 'Main question detail fetched');
    assert(htDetail.body.sub_questions && htDetail.body.sub_questions.length > 0, 'Sub-questions across domains retrieved');
    // Ensure characters and correct answers are NOT exposed
    const firstSub = htDetail.body.sub_questions[0];
    assert(firstSub.revealed_character === undefined && firstSub.correct_answer === undefined, 'Character mapping and correct answers NEVER exposed in participant API');

    // Answer each sub-question
    for (const sub of htDetail.body.sub_questions) {
      const ansRes = await request({
        hostname: 'localhost', port: 5000, path: `/api/participant/hidden-tech/questions/${htQ1.id}/sub/${sub.id}/submit`, method: 'POST',
        headers: { Authorization: `Bearer ${p3Token}` }
      }, { answer: 'TEST_ANSWER' });
      assert(ansRes.status === 200 && ansRes.body.is_attempted === true, `Sub-question ${sub.sub_question_number} submitted and marked ATTEMPTED`);
      assert(ansRes.body.is_correct === undefined && ansRes.body.revealed_character === undefined, 'Correctness and character NOT revealed on sub-answer submission');
    }

    // Now check if all_attempted is true so final output unlocked
    const htDetailAfter = await request({
      hostname: 'localhost', port: 5000, path: `/api/participant/hidden-tech/questions/${htQ1.id}`, method: 'GET',
      headers: { Authorization: `Bearer ${p3Token}` }
    });
    assert(htDetailAfter.body.all_attempted === true, 'Final Output box is UNLOCKED after all sub-questions attempted');

    // Submit final output
    const finalSubmitRes = await request({
      hostname: 'localhost', port: 5000, path: `/api/participant/hidden-tech/questions/${htQ1.id}/final-output`, method: 'POST',
      headers: { Authorization: `Bearer ${p3Token}` }
    }, { final_output: 'DERIVED_PASSWORD' });
    assert(finalSubmitRes.status === 200 && finalSubmitRes.body.submitted === true, 'Final output submitted successfully');

    // 9. Admin Results & Leaderboard Verification
    console.log('\n--- TEST GROUP 9: Admin Results, Ranking & CSV Export ---');
    const resultsCS = await request({
      hostname: 'localhost', port: 5000, path: '/api/admin/results?event_id=1', method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(resultsCS.status === 200 && resultsCS.body.length > 0, 'Admin can view ranked Code Scramble results');
    const topTeam = resultsCS.body[0];
    assert(topTeam.rank === 1 && topTeam.total_marks > 0, 'Top team has Rank 1 and positive computed marks');

    // CSV Export
    const csvRes = await request({
      hostname: 'localhost', port: 5000, path: '/api/admin/results/export/csv?event_id=1', method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(csvRes.status === 200 && typeof csvRes.body === 'string' && csvRes.body.includes('Team Name') && csvRes.body.includes('Participant 1'), 'Admin CSV export generates valid CSV header and records');

    // 10. Team Creation with Optional Participant 2
    console.log('\n--- TEST GROUP 10: Team Creation (P2 Optional) ---');
    const testTeamName = 'Binary Beasts ' + Date.now();
    const newTeamRes = await request({
      hostname: 'localhost', port: 5000, path: '/api/admin/teams', method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    }, {
      year: '2nd Year',
      team_name: testTeamName,
      participant_1_name: 'Gordon Freeman',
      participant_1_batch: 'CSE-B-99',
      email: 'gordon@blackmesa.edu'
      // p2 omitted entirely
    });
    assert(newTeamRes.status === 200 && newTeamRes.body.password, 'Admin can create team with only 1 participant (P2 omitted) and receive generated password');

    // Duplicate team name check
    const dupTeamRes = await request({
      hostname: 'localhost', port: 5000, path: '/api/admin/teams', method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    }, {
      year: '2nd Year',
      team_name: testTeamName,
      participant_1_name: 'Alyx Vance',
      participant_1_batch: 'CSE-B-100',
      email: 'alyx@blackmesa.edu'
    });
    assert(dupTeamRes.status === 400, 'Duplicate team name is rejected with 400 Bad Request');

    // 12. Participant Self-Registration & Security
    console.log('\n--- TEST GROUP 12: Participant Self-Registration & Security ---');

    // Available sections endpoint
    const sectionsRes = await request({
      hostname: 'localhost', port: 5000, path: '/api/auth/sections', method: 'GET'
    });
    assert(sectionsRes.status === 200 && Array.isArray(sectionsRes.body) && sectionsRes.body.includes('A'), 'Sections endpoint returns active sections array');

    // Registration validation: Missing required fields
    const missingFieldRes = await request({
      hostname: 'localhost', port: 5000, path: '/api/auth/participant/register', method: 'POST'
    }, {
      team_name: 'Test Team',
      year: '2nd Year',
      // member_1_name missing
      member_1_section: 'A',
      email: 'test@college.edu',
      password: 'password123',
      confirm_password: 'password123'
    });
    assert(missingFieldRes.status === 400, 'Registration rejected when required Member 1 Name is missing');

    // Registration validation: Invalid email
    const badEmailRes = await request({
      hostname: 'localhost', port: 5000, path: '/api/auth/participant/register', method: 'POST'
    }, {
      team_name: 'Test Team',
      year: '2nd Year',
      member_1_name: 'John Doe',
      member_1_section: 'A',
      email: 'not-an-email',
      password: 'password123',
      confirm_password: 'password123'
    });
    assert(badEmailRes.status === 400, 'Registration rejected for invalid email format');

    // Registration validation: Password mismatch
    const pwdMismatchRes = await request({
      hostname: 'localhost', port: 5000, path: '/api/auth/participant/register', method: 'POST'
    }, {
      team_name: 'Test Team',
      year: '2nd Year',
      member_1_name: 'John Doe',
      member_1_section: 'A',
      email: 'test@college.edu',
      password: 'password123',
      confirm_password: 'differentPassword'
    });
    assert(pwdMismatchRes.status === 400, 'Registration rejected on password mismatch');

    // Registration validation: Short password (< 6 chars)
    const shortPwdRes = await request({
      hostname: 'localhost', port: 5000, path: '/api/auth/participant/register', method: 'POST'
    }, {
      team_name: 'Test Team',
      year: '2nd Year',
      member_1_name: 'John Doe',
      member_1_section: 'A',
      email: 'test@college.edu',
      password: '123',
      confirm_password: '123'
    });
    assert(shortPwdRes.status === 400, 'Registration rejected for weak/short password (< 6 chars)');

    // Registration validation: Member 2 name provided without section
    const partialM2Res = await request({
      hostname: 'localhost', port: 5000, path: '/api/auth/participant/register', method: 'POST'
    }, {
      team_name: 'Test Team',
      year: '2nd Year',
      member_1_name: 'John Doe',
      member_1_section: 'A',
      member_2_name: 'Jane Doe',
      member_2_section: '', // Missing
      email: 'test@college.edu',
      password: 'password123',
      confirm_password: 'password123'
    });
    assert(partialM2Res.status === 400, 'Registration rejected if Member 2 name is provided without section');

    // Successful registration of single-member team (2nd Year -> Code Scramble)
    const timestamp = Date.now();
    const singleTeamName = `Code Warriors ${timestamp}`;
    const singleRegRes = await request({
      hostname: 'localhost', port: 5000, path: '/api/auth/participant/register', method: 'POST'
    }, {
      team_name: singleTeamName,
      year: '2nd Year',
      member_1_name: 'Arun Kumar',
      member_1_section: 'A',
      email: 'arun@college.edu',
      password: 'password123',
      confirm_password: 'password123'
    });
    assert(singleRegRes.status === 201, 'Single-member team self-registration returns 201 Created');
    assert(singleRegRes.body.team && singleRegRes.body.team.event_name === 'Code Scramble', '2nd Year registration automatically assigns Code Scramble event');
    assert(singleRegRes.body.team.member_2_name === null, 'Single-member team has null Member 2');

    // Case-insensitive duplicate check: lowercase
    const dupLowerRes = await request({
      hostname: 'localhost', port: 5000, path: '/api/auth/participant/register', method: 'POST'
    }, {
      team_name: singleTeamName.toLowerCase(),
      year: '2nd Year',
      member_1_name: 'Different Person',
      member_1_section: 'B',
      email: 'diff@college.edu',
      password: 'password123',
      confirm_password: 'password123'
    });
    assert(dupLowerRes.status === 400, 'Duplicate team name check is CASE-INSENSITIVE (lowercase duplicate rejected with 400)');

    // Case-insensitive duplicate check: UPPERCASE
    const dupUpperRes = await request({
      hostname: 'localhost', port: 5000, path: '/api/auth/participant/register', method: 'POST'
    }, {
      team_name: singleTeamName.toUpperCase(),
      year: '3rd Year',
      member_1_name: 'Another Person',
      member_1_section: 'C',
      email: 'another@college.edu',
      password: 'password123',
      confirm_password: 'password123'
    });
    assert(dupUpperRes.status === 400, 'Duplicate team name check is CASE-INSENSITIVE (uppercase duplicate rejected with 400)');

    // Successful registration of two-member team (3rd Year -> Hidden Tech)
    const twoMemberTeamName = `Tech Hunters ${timestamp}`;
    const twoMemberRegRes = await request({
      hostname: 'localhost', port: 5000, path: '/api/auth/participant/register', method: 'POST'
    }, {
      team_name: twoMemberTeamName,
      year: '3rd Year',
      member_1_name: 'Arun Kumar',
      member_1_section: 'A',
      member_2_name: 'Priya S',
      member_2_section: 'B',
      email: 'priya@college.edu',
      password: 'password123',
      confirm_password: 'password123'
    });
    assert(twoMemberRegRes.status === 201, 'Two-member team registration returns 201 Created');
    assert(twoMemberRegRes.body.team && twoMemberRegRes.body.team.event_name === 'Hidden Tech', '3rd Year registration automatically assigns Hidden Tech event');
    assert(twoMemberRegRes.body.team.member_2_name === 'Priya S' && twoMemberRegRes.body.team.member_2_section === 'B', 'Member 2 details recorded properly');

    // Security check: Privilege escalation attempt rejected
    const roleEscalationRes = await request({
      hostname: 'localhost', port: 5000, path: '/api/auth/participant/register', method: 'POST'
    }, {
      team_name: `Hacker Team ${timestamp}`,
      year: '2nd Year',
      member_1_name: 'Eve',
      member_1_section: 'A',
      email: 'eve@blackhat.com',
      password: 'password123',
      confirm_password: 'password123',
      role: 'admin' // Attempted role escalation
    });
    assert(roleEscalationRes.status === 403, 'Role escalation attempt (role: admin) is rejected with 403 Forbidden');

    // Admin registration remains completely disabled
    const adminRegRes = await request({
      hostname: 'localhost', port: 5000, path: '/api/auth/admin/register', method: 'POST'
    }, {
      user_id: 'newadmin',
      password: 'newadminpassword'
    });
    assert(adminRegRes.status === 404, 'Admin registration remains completely disabled (POST /api/auth/admin/register returns 404)');

    // Login with the newly registered team
    const newTeamLogin = await request({
      hostname: 'localhost', port: 5000, path: '/api/auth/participant/login', method: 'POST'
    }, {
      year: '2nd Year',
      team_name: singleTeamName,
      password: 'password123'
    });
    assert(newTeamLogin.status === 200 && newTeamLogin.body.token, 'Newly registered team can successfully log in');
    const newTeamToken = newTeamLogin.body.token;

    // Enter dashboard with newly registered team -> allocates questions
    const newTeamDash = await request({
      hostname: 'localhost', port: 5000, path: '/api/participant/dashboard', method: 'GET',
      headers: { Authorization: `Bearer ${newTeamToken}` }
    });
    assert(newTeamDash.status === 200 && newTeamDash.body.allocated_count === 5, 'Newly registered team receives persistent random question allocation upon entering dashboard');
    assert(newTeamDash.body.member_1_name === 'Arun Kumar' && newTeamDash.body.member_1_section === 'A', 'Participant dashboard returns member 1 name and section');

    // Admin teams list shows the newly registered teams with sections
    const adminTeamsList = await request({
      hostname: 'localhost', port: 5000, path: '/api/admin/teams', method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const foundSingle = adminTeamsList.body.find(t => t.team_name === singleTeamName);
    assert(foundSingle !== undefined, 'Newly registered team appears in admin teams list');
    assert(foundSingle.member_1_name === 'Arun Kumar' && foundSingle.member_1_section === 'A', 'Admin can view Member 1 Name and Section');
    assert(foundSingle.member_2_name === null, 'Single-member team displays null Member 2 for admin');

    console.log(`\n=== TEST SUMMARY ===`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    if (failed === 0) {
      console.log('🌟 ALL ACCEPTANCE TESTS PASSED PERFECTLY!\n');
    } else {
      console.log('⚠️ Some tests failed. Please review the failures above.\n');
    }
  } catch (err) {
    console.error('Fatal test execution error:', err);
  }
}

runTests();
