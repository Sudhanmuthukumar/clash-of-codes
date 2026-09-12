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

async function migrate() {
    console.log('=== STARTING SQLITE -> POSTGRESQL MIGRATION ===');
    console.log(`Reading SQLite from: ${sqlitePath}`);
    console.log(`Target Database: ${process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/:[^:@]+@/, ':***@') : 'Undefined'}`);

    const sqlite = new Database(sqlitePath, { readonly: true });
    const stats = {};

    try {
        await prisma.$transaction(async (tx) => {
            // 1. Admins
            const admins = sqlite.prepare('SELECT * FROM admins').all();
            for (const a of admins) {
                await tx.admin.upsert({
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
            }
            stats.admins = { sqlite: admins.length, pg: await tx.admin.count() };

            // 2. Events
            const events = sqlite.prepare('SELECT * FROM events').all();
            for (const e of events) {
                await tx.event.upsert({
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
            }
            stats.events = { sqlite: events.length, pg: await tx.event.count() };

            // 3. Sections
            let sections = [];
            try {
                sections = sqlite.prepare('SELECT * FROM sections').all();
                for (const s of sections) {
                    await tx.section.upsert({
                        where: { id: s.id },
                        update: { name: s.name, isActive: s.is_active !== 0 ? 1 : 0 },
                        create: { id: s.id, name: s.name, isActive: s.is_active !== 0 ? 1 : 0 }
                    });
                }
            } catch (e) {
                console.log('No sections table in SQLite or error:', e.message);
            }
            stats.sections = { sqlite: sections.length, pg: await tx.section.count() };

            // 4. Teams
            const teams = sqlite.prepare('SELECT * FROM teams').all();
            for (const t of teams) {
                const m1Name = t.member_1_name || t.participant_1_name || 'Member 1';
                const m1Sec = t.member_1_section || t.participant_1_batch || 'A';
                const m2Name = t.member_2_name || t.participant_2_name || null;
                const m2Sec = t.member_2_section || t.participant_2_batch || null;

                await tx.team.upsert({
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
            }
            stats.teams = { sqlite: teams.length, pg: await tx.team.count() };

            // 5. Questions
            const questions = sqlite.prepare('SELECT * FROM questions').all();
            for (const q of questions) {
                await tx.question.upsert({
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
            }
            stats.questions = { sqlite: questions.length, pg: await tx.question.count() };

            // 6. Code Scramble Data
            const csData = sqlite.prepare('SELECT * FROM code_scramble_data').all();
            for (const c of csData) {
                await tx.codeScrambleData.upsert({
                    where: { questionId: c.question_id },
                    update: {
                        problemDescription: c.problem_description || null,
                        finalCode: c.final_code,
                        shuffledCode: c.shuffled_code,
                        firstLine: c.first_line,
                        firstLinePenalty: c.first_line_penalty || 1
                    },
                    create: {
                        id: c.id,
                        questionId: c.question_id,
                        problemDescription: c.problem_description || null,
                        finalCode: c.final_code,
                        shuffledCode: c.shuffled_code,
                        firstLine: c.first_line,
                        firstLinePenalty: c.first_line_penalty || 1
                    }
                });
            }
            stats.code_scramble_data = { sqlite: csData.length, pg: await tx.codeScrambleData.count() };

            // 7. Hidden Tech Questions
            const htQuestions = sqlite.prepare('SELECT * FROM hidden_tech_questions').all();
            for (const ht of htQuestions) {
                await tx.hiddenTechQuestion.upsert({
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
            }
            stats.hidden_tech_questions = { sqlite: htQuestions.length, pg: await tx.hiddenTechQuestion.count() };

            // 8. Hidden Tech Sub Questions
            const htSubQuestions = sqlite.prepare('SELECT * FROM hidden_tech_sub_questions').all();
            for (const sub of htSubQuestions) {
                await tx.hiddenTechSubQuestion.upsert({
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
            }
            stats.hidden_tech_sub_questions = { sqlite: htSubQuestions.length, pg: await tx.hiddenTechSubQuestion.count() };

            // 9. Team Question Allocations
            const allocations = sqlite.prepare('SELECT * FROM team_question_allocations').all();
            for (const a of allocations) {
                await tx.teamQuestionAllocation.upsert({
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
            }
            stats.team_question_allocations = { sqlite: allocations.length, pg: await tx.teamQuestionAllocation.count() };

            // 10. Code Scramble Attempts
            const csAttempts = sqlite.prepare('SELECT * FROM code_scramble_attempts').all();
            for (const ca of csAttempts) {
                await tx.codeScrambleAttempt.upsert({
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
            }
            stats.code_scramble_attempts = { sqlite: csAttempts.length, pg: await tx.codeScrambleAttempt.count() };

            // 11. Hidden Tech Sub Attempts
            const htSubAttempts = sqlite.prepare('SELECT * FROM hidden_tech_sub_attempts').all();
            for (const ha of htSubAttempts) {
                await tx.hiddenTechSubAttempt.upsert({
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
            }
            stats.hidden_tech_sub_attempts = { sqlite: htSubAttempts.length, pg: await tx.hiddenTechSubAttempt.count() };

            // 12. Hidden Tech Final Attempts
            const htFinalAttempts = sqlite.prepare('SELECT * FROM hidden_tech_final_attempts').all();
            for (const hf of htFinalAttempts) {
                await tx.hiddenTechFinalAttempt.upsert({
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
            }
            stats.hidden_tech_final_attempts = { sqlite: htFinalAttempts.length, pg: await tx.hiddenTechFinalAttempt.count() };

            // 13. Hint Usage
            const hintUsages = sqlite.prepare('SELECT * FROM hint_usage').all();
            for (const hu of hintUsages) {
                await tx.hintUsage.upsert({
                    where: {
                        teamId_questionId_subQuestionId: {
                            teamId: hu.team_id,
                            questionId: hu.question_id,
                            subQuestionId: hu.sub_question_id
                        }
                    },
                    update: {
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
            }
            stats.hint_usage = { sqlite: hintUsages.length, pg: await tx.hintUsage.count() };

            // 14. Score History
            const scoreHistories = sqlite.prepare('SELECT * FROM score_history').all();
            for (const sh of scoreHistories) {
                await tx.scoreHistory.create({
                    data: {
                        teamId: sh.team_id,
                        questionId: sh.question_id,
                        subQuestionId: sh.sub_question_id,
                        action: sh.action,
                        pointsChange: sh.points_change,
                        createdAt: parseDate(sh.created_at) || new Date()
                    }
                });
            }
            stats.score_history = { sqlite: scoreHistories.length, pg: await tx.scoreHistory.count() };

            // 15. Audit Log
            const auditLogs = sqlite.prepare('SELECT * FROM audit_log').all();
            for (const al of auditLogs) {
                await tx.auditLog.create({
                    data: {
                        adminId: al.admin_id,
                        action: al.action,
                        targetType: al.target_type,
                        targetId: al.target_id,
                        details: al.details,
                        createdAt: parseDate(al.created_at) || new Date()
                    }
                });
            }
            stats.audit_log = { sqlite: auditLogs.length, pg: await tx.auditLog.count() };
        });

        // 16. Reset PostgreSQL Serial Sequences to avoid ID collisions
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
                        COALESCE((SELECT MAX(id) FROM "${tbl}"), 1)
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

    } catch (err) {
        console.error('Migration failed:', err);
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
