const Database = require('better-sqlite3');
const { PrismaClient } = require('@prisma/client');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const prisma = new PrismaClient();
const sqlitePath = path.join(__dirname, '..', 'db', 'techarena.db');

function parseDate(val) {
    if (!val) return null;
    try {
        const d = new Date(val.includes('T') ? val : val + 'Z');
        return isNaN(d.getTime()) ? new Date() : d;
    } catch {
        return new Date();
    }
}

async function withRetry(fn, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (err) {
            if (attempt === maxRetries) throw err;
            await new Promise((resolve) => setTimeout(resolve, 200 * attempt));
        }
    }
}

async function batchProcess(items, batchSize, fn) {
    for (let i = 0; i < items.length; i += batchSize) {
        const chunk = items.slice(i, i + batchSize);
        await Promise.all(chunk.map((item) => withRetry(() => fn(item))));
    }
}

async function migrate() {
    console.log('=== STARTING ROBUST SQLITE -> POSTGRESQL MIGRATION ===');
    console.log(`Source SQLite Path: ${sqlitePath}`);
    const maskedUrl = process.env.DATABASE_URL 
        ? process.env.DATABASE_URL.replace(/:[^:@]+@/, ':***@').split('?')[0] 
        : 'Undefined';
    console.log(`Target PostgreSQL Host/DB: ${maskedUrl}`);

    const sqlite = new Database(sqlitePath, { readonly: true });
    const stats = {};

    try {
        // --- LEVEL 1: ROOT INDEPENDENT TABLES ---

        // 1. Admins
        const admins = sqlite.prepare('SELECT * FROM admins').all();
        console.log(`Migrating Admins (${admins.length} records)...`);
        await batchProcess(admins, 5, async (a) => {
            await prisma.admin.upsert({
                where: { id: a.id },
                update: {
                    userId: a.user_id,
                    passwordHash: a.password_hash,
                    createdAt: parseDate(a.created_at) || new Date()
                },
                create: {
                    id: a.id,
                    userId: a.user_id,
                    passwordHash: a.password_hash,
                    createdAt: parseDate(a.created_at) || new Date()
                }
            });
        });
        stats.admins = { sqlite: admins.length, pg: await prisma.admin.count() };

        // 2. Events
        const events = sqlite.prepare('SELECT * FROM events').all();
        console.log(`Migrating Events (${events.length} records)...`);
        await batchProcess(events, 5, async (e) => {
            await prisma.event.upsert({
                where: { id: e.id },
                update: {
                    name: e.name,
                    year: e.year,
                    description: e.description,
                    timeLimitMinutes: e.time_limit_minutes || 45,
                    questionsPerTeam: e.questions_per_team || 5,
                    status: e.status || 'not_started',
                    startTime: parseDate(e.start_time),
                    endTime: parseDate(e.end_time),
                    pauseDurationSeconds: e.pause_duration_seconds || 0,
                    pauseStartTime: null,
                    createdAt: parseDate(e.created_at) || new Date(),
                    updatedAt: parseDate(e.updated_at) || new Date()
                },
                create: {
                    id: e.id,
                    name: e.name,
                    year: e.year,
                    description: e.description,
                    timeLimitMinutes: e.time_limit_minutes || 45,
                    questionsPerTeam: e.questions_per_team || 5,
                    status: e.status || 'not_started',
                    startTime: parseDate(e.start_time),
                    endTime: parseDate(e.end_time),
                    pauseDurationSeconds: e.pause_duration_seconds || 0,
                    pauseStartTime: null,
                    createdAt: parseDate(e.created_at) || new Date(),
                    updatedAt: parseDate(e.updated_at) || new Date()
                }
            });
        });
        stats.events = { sqlite: events.length, pg: await prisma.event.count() };

        // 3. Sections
        let sections = [];
        try {
            sections = sqlite.prepare('SELECT * FROM sections').all();
            console.log(`Migrating Sections (${sections.length} records)...`);
            await batchProcess(sections, 5, async (s) => {
                await prisma.section.upsert({
                    where: { id: s.id },
                    update: { name: s.name, isActive: s.is_active !== 0 ? 1 : 0 },
                    create: { id: s.id, name: s.name, isActive: s.is_active !== 0 ? 1 : 0 }
                });
            });
        } catch (e) {
            console.log('Note: sections table skipped or empty:', e.message);
        }
        stats.sections = { sqlite: sections.length, pg: await prisma.section.count() };

        // --- LEVEL 2: TABLES DEPENDENT ON EVENTS ---

        // 4. Teams
        const teams = sqlite.prepare('SELECT * FROM teams').all();
        console.log(`Migrating Teams (${teams.length} records)...`);
        await batchProcess(teams, 10, async (t) => {
            const m1Name = t.member_1_name || t.participant_1_name || 'Member 1';
            const m1Sec = t.member_1_section || t.participant_1_batch || 'A';
            const m2Name = t.member_2_name || t.participant_2_name || null;
            const m2Sec = t.member_2_section || t.participant_2_batch || null;

            await prisma.team.upsert({
                where: { id: t.id },
                update: {
                    year: t.year,
                    teamName: t.team_name,
                    member1Name: m1Name,
                    member1Section: m1Sec,
                    participant1Name: m1Name,
                    participant1Batch: m1Sec,
                    member2Name: m2Name,
                    member2Section: m2Sec,
                    participant2Name: m2Name,
                    participant2Batch: m2Sec,
                    email: t.email,
                    passwordHash: t.password_hash,
                    eventId: t.event_id,
                    status: t.status || 'active',
                    eventStartedAt: parseDate(t.event_started_at),
                    eventSubmittedAt: parseDate(t.event_submitted_at),
                    createdAt: parseDate(t.created_at) || new Date(),
                    updatedAt: parseDate(t.updated_at) || new Date()
                },
                create: {
                    id: t.id,
                    year: t.year,
                    teamName: t.team_name,
                    member1Name: m1Name,
                    member1Section: m1Sec,
                    participant1Name: m1Name,
                    participant1Batch: m1Sec,
                    member2Name: m2Name,
                    member2Section: m2Sec,
                    participant2Name: m2Name,
                    participant2Batch: m2Sec,
                    email: t.email,
                    passwordHash: t.password_hash,
                    eventId: t.event_id,
                    status: t.status || 'active',
                    eventStartedAt: parseDate(t.event_started_at),
                    eventSubmittedAt: parseDate(t.event_submitted_at),
                    createdAt: parseDate(t.created_at) || new Date(),
                    updatedAt: parseDate(t.updated_at) || new Date()
                }
            });
        });
        stats.teams = { sqlite: teams.length, pg: await prisma.team.count() };

        // 5. Questions
        const questions = sqlite.prepare('SELECT * FROM questions').all();
        console.log(`Migrating Questions (${questions.length} records)...`);
        await batchProcess(questions, 10, async (q) => {
            await prisma.question.upsert({
                where: { id: q.id },
                update: {
                    eventId: q.event_id,
                    questionNumber: q.question_number,
                    title: q.title,
                    marks: q.marks || 10,
                    hint: q.hint,
                    hintPenalty: q.hint_penalty || 0,
                    isActive: q.is_active !== 0 ? 1 : 0,
                    displayOrder: q.display_order || q.question_number,
                    createdAt: parseDate(q.created_at) || new Date(),
                    updatedAt: parseDate(q.updated_at) || new Date()
                },
                create: {
                    id: q.id,
                    eventId: q.event_id,
                    questionNumber: q.question_number,
                    title: q.title,
                    marks: q.marks || 10,
                    hint: q.hint,
                    hintPenalty: q.hint_penalty || 0,
                    isActive: q.is_active !== 0 ? 1 : 0,
                    displayOrder: q.display_order || q.question_number,
                    createdAt: parseDate(q.created_at) || new Date(),
                    updatedAt: parseDate(q.updated_at) || new Date()
                }
            });
        });
        stats.questions = { sqlite: questions.length, pg: await prisma.question.count() };

        // --- LEVEL 3: QUESTION DETAILS & ALLOCATIONS ---

        // 6. Code Scramble Data
        const csData = sqlite.prepare('SELECT * FROM code_scramble_data').all();
        console.log(`Migrating Code Scramble Data (${csData.length} records)...`);
        const defaultDescriptions = {
            1: 'Write a Python program that initializes two variables a and b with values 10 and 20 respectively, calculates their sum in a variable named total, and prints the result.',
            2: 'Create a list of numbers from 1 to 5, initialize an accumulator total to 0, iterate through the list using a for loop to sum all numbers, and print the accumulated total.',
            3: 'Define a recursive function factorial(n) with base case n == 0 returning 1 and recursive step returning n * factorial(n - 1). Call factorial(5) and print the result.',
            4: 'Initialize a string variable text with "hello", reverse the string using Python slice notation text[::-1], store it in reversed_text, and print the reversed string.',
            5: 'Generate numbers 1 through 10 using range, initialize an empty list evens, loop through numbers and append even numbers (n % 2 == 0), then print the evens list.',
            6: 'Define a function is_palindrome(word) that checks if word equals word[::-1]. Call the function with "radar" and print the boolean outcome.',
            7: 'Find the maximum value in a list of integers [45, 12, 89, 33, 71] without using the built-in max function, by iterating and updating a max_val variable, then print max_val.',
            8: 'Create a dictionary person with keys "name" and "age", retrieve the age value, increment it by 1, update the dictionary, and print the updated dictionary.',
            9: 'Initialize an empty list squares, loop through numbers from 1 to 5, calculate the square of each number, append it to squares, and print the resulting list.',
            10: 'Count the frequency of each character in the string "banana" using a dictionary counter, iterate through each character, increment its count, and print the dictionary.'
        };

        await batchProcess(csData, 5, async (c) => {
            const existingCS = await prisma.codeScrambleData.findUnique({ where: { questionId: c.question_id } });
            const probDesc = c.problem_description || existingCS?.problemDescription || defaultDescriptions[c.question_id] || 'Rearrange the scrambled Python code lines into the correct executable program logic.';

            await prisma.codeScrambleData.upsert({
                where: { questionId: c.question_id },
                update: {
                    problemDescription: probDesc,
                    finalCode: c.final_code,
                    shuffledCode: c.shuffled_code,
                    firstLine: c.first_line,
                    firstLinePenalty: c.first_line_penalty || 1
                },
                create: {
                    id: c.id,
                    questionId: c.question_id,
                    problemDescription: probDesc,
                    finalCode: c.final_code,
                    shuffledCode: c.shuffled_code,
                    firstLine: c.first_line,
                    firstLinePenalty: c.first_line_penalty || 1
                }
            });
        });
        stats.code_scramble_data = { sqlite: csData.length, pg: await prisma.codeScrambleData.count() };

        // 7. Hidden Tech Questions
        const htQuestions = sqlite.prepare('SELECT * FROM hidden_tech_questions').all();
        console.log(`Migrating Hidden Tech Questions (${htQuestions.length} records)...`);
        await batchProcess(htQuestions, 5, async (ht) => {
            await prisma.hiddenTechQuestion.upsert({
                where: { questionId: ht.question_id },
                update: {
                    finalOutput: ht.final_output,
                    finalOutputMarks: ht.final_output_marks || 5
                },
                create: {
                    id: ht.id,
                    questionId: ht.question_id,
                    finalOutput: ht.final_output,
                    finalOutputMarks: ht.final_output_marks || 5
                }
            });
        });
        stats.hidden_tech_questions = { sqlite: htQuestions.length, pg: await prisma.hiddenTechQuestion.count() };

        // 8. Hidden Tech Sub Questions
        const htSubQuestions = sqlite.prepare('SELECT * FROM hidden_tech_sub_questions').all();
        console.log(`Migrating Hidden Tech Sub Questions (${htSubQuestions.length} records)...`);
        await batchProcess(htSubQuestions, 10, async (sub) => {
            await prisma.hiddenTechSubQuestion.upsert({
                where: { id: sub.id },
                update: {
                    mainQuestionId: sub.main_question_id,
                    subQuestionNumber: sub.sub_question_number,
                    domain: sub.domain,
                    questionText: sub.question_text,
                    correctAnswer: sub.correct_answer,
                    revealedCharacter: sub.revealed_character,
                    marks: sub.marks || 5,
                    hint: sub.hint,
                    hintPenalty: sub.hint_penalty || 0,
                    displayOrder: sub.display_order || sub.sub_question_number
                },
                create: {
                    id: sub.id,
                    mainQuestionId: sub.main_question_id,
                    subQuestionNumber: sub.sub_question_number,
                    domain: sub.domain,
                    questionText: sub.question_text,
                    correctAnswer: sub.correct_answer,
                    revealedCharacter: sub.revealed_character,
                    marks: sub.marks || 5,
                    hint: sub.hint,
                    hintPenalty: sub.hint_penalty || 0,
                    displayOrder: sub.display_order || sub.sub_question_number
                }
            });
        });
        stats.hidden_tech_sub_questions = { sqlite: htSubQuestions.length, pg: await prisma.hiddenTechSubQuestion.count() };

        // 9. Team Question Allocations
        const allocations = sqlite.prepare('SELECT * FROM team_question_allocations').all();
        console.log(`Migrating Team Question Allocations (${allocations.length} records)...`);
        await batchProcess(allocations, 15, async (a) => {
            await prisma.teamQuestionAllocation.upsert({
                where: {
                    teamId_questionId: {
                        teamId: a.team_id,
                        questionId: a.question_id
                    }
                },
                update: {
                    assignedAt: parseDate(a.assigned_at) || new Date()
                },
                create: {
                    id: a.id,
                    teamId: a.team_id,
                    questionId: a.question_id,
                    assignedAt: parseDate(a.assigned_at) || new Date()
                }
            });
        });
        stats.team_question_allocations = { sqlite: allocations.length, pg: await prisma.teamQuestionAllocation.count() };

        // --- LEVEL 4: ATTEMPTS, SUBMISSIONS & LOGS ---

        // 10. Code Scramble Attempts
        const csAttempts = sqlite.prepare('SELECT * FROM code_scramble_attempts').all();
        console.log(`Migrating Code Scramble Attempts (${csAttempts.length} records)...`);
        await batchProcess(csAttempts, 10, async (ca) => {
            await prisma.codeScrambleAttempt.upsert({
                where: {
                    teamId_questionId: {
                        teamId: ca.team_id,
                        questionId: ca.question_id
                    }
                },
                update: {
                    lineOrder: ca.line_order,
                    firstLineCorrect: ca.first_line_correct || 0,
                    firstLinePenaltyApplied: ca.first_line_penalty_applied || 0,
                    swapsCount: ca.swaps_count || 0,
                    hintsCount: ca.hints_count || 0,
                    currentPoints: ca.current_points ?? 100,
                    isSubmitted: ca.is_submitted || 0,
                    isCorrect: ca.is_correct || 0,
                    marksAwarded: ca.marks_awarded || 0,
                    submittedAt: parseDate(ca.submitted_at) || new Date()
                },
                create: {
                    id: ca.id,
                    teamId: ca.team_id,
                    questionId: ca.question_id,
                    lineOrder: ca.line_order,
                    firstLineCorrect: ca.first_line_correct || 0,
                    firstLinePenaltyApplied: ca.first_line_penalty_applied || 0,
                    swapsCount: ca.swaps_count || 0,
                    hintsCount: ca.hints_count || 0,
                    currentPoints: ca.current_points ?? 100,
                    isSubmitted: ca.is_submitted || 0,
                    isCorrect: ca.is_correct || 0,
                    marksAwarded: ca.marks_awarded || 0,
                    submittedAt: parseDate(ca.submitted_at) || new Date()
                }
            });
        });
        stats.code_scramble_attempts = { sqlite: csAttempts.length, pg: await prisma.codeScrambleAttempt.count() };

        // 11. Hidden Tech Sub Attempts
        const htSubAttempts = sqlite.prepare('SELECT * FROM hidden_tech_sub_attempts').all();
        console.log(`Migrating Hidden Tech Sub Attempts (${htSubAttempts.length} records)...`);
        await batchProcess(htSubAttempts, 10, async (ha) => {
            await prisma.hiddenTechSubAttempt.upsert({
                where: {
                    teamId_subQuestionId: {
                        teamId: ha.team_id,
                        subQuestionId: ha.sub_question_id
                    }
                },
                update: {
                    answer: ha.answer,
                    isCorrect: ha.is_correct || 0,
                    marksAwarded: ha.marks_awarded || 0,
                    submittedAt: parseDate(ha.submitted_at) || new Date()
                },
                create: {
                    id: ha.id,
                    teamId: ha.team_id,
                    subQuestionId: ha.sub_question_id,
                    answer: ha.answer,
                    isCorrect: ha.is_correct || 0,
                    marksAwarded: ha.marks_awarded || 0,
                    submittedAt: parseDate(ha.submitted_at) || new Date()
                }
            });
        });
        stats.hidden_tech_sub_attempts = { sqlite: htSubAttempts.length, pg: await prisma.hiddenTechSubAttempt.count() };

        // 12. Hidden Tech Final Attempts
        const htFinalAttempts = sqlite.prepare('SELECT * FROM hidden_tech_final_attempts').all();
        console.log(`Migrating Hidden Tech Final Attempts (${htFinalAttempts.length} records)...`);
        await batchProcess(htFinalAttempts, 5, async (hf) => {
            await prisma.hiddenTechFinalAttempt.upsert({
                where: {
                    teamId_questionId: {
                        teamId: hf.team_id,
                        questionId: hf.question_id
                    }
                },
                update: {
                    finalOutput: hf.final_output,
                    isCorrect: hf.is_correct || 0,
                    marksAwarded: hf.marks_awarded || 0,
                    submittedAt: parseDate(hf.submitted_at) || new Date()
                },
                create: {
                    id: hf.id,
                    teamId: hf.team_id,
                    questionId: hf.question_id,
                    finalOutput: hf.final_output,
                    isCorrect: hf.is_correct || 0,
                    marksAwarded: hf.marks_awarded || 0,
                    submittedAt: parseDate(hf.submitted_at) || new Date()
                }
            });
        });
        stats.hidden_tech_final_attempts = { sqlite: htFinalAttempts.length, pg: await prisma.hiddenTechFinalAttempt.count() };

        // 13. Hint Usage
        const hintUsages = sqlite.prepare('SELECT * FROM hint_usage').all();
        console.log(`Migrating Hint Usage (${hintUsages.length} records)...`);
        await batchProcess(hintUsages, 10, async (hu) => {
            await prisma.hintUsage.upsert({
                where: { id: hu.id },
                update: {
                    teamId: hu.team_id,
                    questionId: hu.question_id,
                    subQuestionId: hu.sub_question_id,
                    penalty: hu.penalty,
                    usedAt: parseDate(hu.used_at) || new Date()
                },
                create: {
                    id: hu.id,
                    teamId: hu.team_id,
                    questionId: hu.question_id,
                    subQuestionId: hu.sub_question_id,
                    penalty: hu.penalty,
                    usedAt: parseDate(hu.used_at) || new Date()
                }
            });
        });
        stats.hint_usage = { sqlite: hintUsages.length, pg: await prisma.hintUsage.count() };

        // 14. Score History
        const scoreHistories = sqlite.prepare('SELECT * FROM score_history').all();
        console.log(`Migrating Score History (${scoreHistories.length} records)...`);
        await batchProcess(scoreHistories, 15, async (sh) => {
            await prisma.scoreHistory.upsert({
                where: { id: sh.id },
                update: {
                    teamId: sh.team_id,
                    questionId: sh.question_id,
                    subQuestionId: sh.sub_question_id,
                    action: sh.action,
                    pointsChange: sh.points_change,
                    createdAt: parseDate(sh.created_at) || new Date()
                },
                create: {
                    id: sh.id,
                    teamId: sh.team_id,
                    questionId: sh.question_id,
                    subQuestionId: sh.sub_question_id,
                    action: sh.action,
                    pointsChange: sh.points_change,
                    createdAt: parseDate(sh.created_at) || new Date()
                }
            });
        });
        stats.score_history = { sqlite: scoreHistories.length, pg: await prisma.scoreHistory.count() };

        // 15. Audit Log
        const auditLogs = sqlite.prepare('SELECT * FROM audit_log').all();
        console.log(`Migrating Audit Log (${auditLogs.length} records)...`);
        await batchProcess(auditLogs, 15, async (al) => {
            await prisma.auditLog.upsert({
                where: { id: al.id },
                update: {
                    adminId: al.admin_id,
                    action: al.action,
                    targetType: al.target_type,
                    targetId: al.target_id,
                    details: al.details,
                    createdAt: parseDate(al.created_at) || new Date()
                },
                create: {
                    id: al.id,
                    adminId: al.admin_id,
                    action: al.action,
                    targetType: al.target_type,
                    targetId: al.target_id,
                    details: al.details,
                    createdAt: parseDate(al.created_at) || new Date()
                }
            });
        });
        stats.audit_log = { sqlite: auditLogs.length, pg: await prisma.auditLog.count() };

        // --- LEVEL 5: RESET POSTGRESQL SERIAL SEQUENCES ---
        console.log('\nResetting PostgreSQL serial sequences...');
        const tablesWithSequences = [
            'admins', 'events', 'sections', 'teams', 'questions',
            'code_scramble_data', 'hidden_tech_questions', 'hidden_tech_sub_questions',
            'team_question_allocations', 'code_scramble_attempts', 'hidden_tech_sub_attempts',
            'hidden_tech_final_attempts', 'hint_usage', 'score_history', 'audit_log'
        ];

        for (const tbl of tablesWithSequences) {
            try {
                await prisma.$executeRawUnsafe(`
                    SELECT setval(
                        pg_get_serial_sequence('"${tbl}"', 'id'),
                        COALESCE((SELECT MAX(id) FROM "${tbl}"), 1),
                        (SELECT MAX(id) IS NOT NULL FROM "${tbl}")
                    );
                `);
            } catch (err) {
                console.warn(`Could not reset sequence for ${tbl}:`, err.message);
            }
        }

        console.log('\n================ MIGRATION REPORT ================');
        console.log('Table                       | SQLite | PostgreSQL | Status');
        console.log('------------------------------------------------------------');
        let allMatched = true;
        for (const [table, counts] of Object.entries(stats)) {
            const status = counts.sqlite === counts.pg ? '✓ MATCHED' : '✗ MISMATCH';
            if (counts.sqlite !== counts.pg) allMatched = false;
            console.log(`${table.padEnd(27)} | ${String(counts.sqlite).padStart(6)} | ${String(counts.pg).padStart(10)} | ${status}`);
        }
        console.log('====================================================\n');

        if (allMatched) {
            console.log('🎉 ALL DATA MIGRATED WITH 100% FIDELITY!');
        } else {
            console.warn('⚠️ Some record counts differed. Please inspect the report above.');
        }

        return { success: allMatched, stats };

    } catch (err) {
        console.error('Migration failed:', err.message);
        throw err;
    } finally {
        sqlite.close();
        await prisma.$disconnect();
    }
}

if (require.main === module) {
    migrate().catch((e) => {
        console.error(e);
        process.exit(1);
    });
}

module.exports = { migrate };
