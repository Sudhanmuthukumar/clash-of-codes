const express = require('express');
const router = express.Router();
const { prisma } = require('../../db/database');
const { requireAdmin, authenticateToken } = require('../../middleware/auth');
const { Parser } = require('json2csv');

router.use(authenticateToken, requireAdmin);

async function calculateTeamResults(teamId, eventId) {
    const team = await prisma.team.findUnique({
        where: { id: teamId },
        include: {
            event: true,
            allocations: {
                where: eventId ? { question: { eventId } } : undefined,
                include: {
                    question: {
                        include: {
                            codeScrambleData: true,
                            hiddenTechQuestion: {
                                include: {
                                    subQuestions: {
                                        orderBy: { displayOrder: 'asc' }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            csAttempts: true,
            htSubAttempts: true,
            htFinalAttempts: true,
            hints: true,
            testSessions: {
                // Load ALL sessions for this team; we pick the matching one below.
                // Previously filtering by eventId caused finalized sessions to be missed
                // when the team's TestSession.eventId differed from the query eventId.
                include: { event: true },
                orderBy: { createdAt: 'desc' }
            }
        }
    });
    if (!team) return null;

    let totalMarks = 0;
    let totalPossible = 0;
    let hintsUsed = 0;
    let hintPenalty = 0;
    let attempted = 0;
    let correct = 0;
    const questionDetails = [];

    const csAttemptMap = new Map(team.csAttempts.map(a => [a.questionId, a]));
    const htSubAttemptMap = new Map(team.htSubAttempts.map(a => [a.subQuestionId, a]));
    const htFinalAttemptMap = new Map(team.htFinalAttempts.map(a => [a.questionId, a]));

    for (const alloc of team.allocations) {
        const q = alloc.question;
        if (!q) continue;

        totalPossible += q.marks;

        // Code Scramble
        if (q.codeScrambleData) {
            const attempt = csAttemptMap.get(q.id);
            const hints = team.hints.filter(h => h.questionId === q.id && !h.subQuestionId);
            const qHintPenalty = hints.reduce((sum, h) => sum + h.penalty, 0);

            // Attempted if submitted, or has swaps/hints, or is correctly solved
            const isAtt = attempt ? (attempt.isSubmitted === 1 || attempt.swapsCount > 0 || attempt.hintsCount > 0 || attempt.isCorrect === 1) : false;
            const isCor = attempt ? attempt.isCorrect === 1 : false;
            const marksAwarded = attempt ? attempt.marksAwarded : 0;

            questionDetails.push({
                question_id: q.id,
                question_number: q.questionNumber,
                title: q.title,
                type: 'code_scramble',
                max_marks: q.marks,
                starting_points: q.marks,
                swaps_count: attempt ? attempt.swapsCount : 0,
                hints_count: attempt ? attempt.hintsCount : hints.length,
                points_remaining: attempt ? attempt.currentPoints : q.marks,
                marks_awarded: marksAwarded,
                is_submitted: attempt ? (attempt.isSubmitted === 1 || isAtt) : false,
                is_correct: isCor,
                hint_penalty: qHintPenalty,
                hints_used: attempt ? attempt.hintsCount : hints.length
            });

            if (isAtt || isCor || attempt?.isSubmitted === 1) {
                attempted++;
            }
            if (isCor) {
                correct++;
                totalMarks += marksAwarded;
            }
            hintsUsed += hints.length;
            hintPenalty += qHintPenalty;
            continue;
        }

        // Hidden Tech
        if (q.hiddenTechQuestion) {
            const ht = q.hiddenTechQuestion;
            totalPossible += ht.finalOutputMarks;
            const subs = ht.subQuestions || [];
            let subMarks = 0;
            let subAttempted = 0;
            let subCorrect = 0;
            let subHints = 0;
            let subHintPenalty = 0;
            const subDetails = [];

            for (const sub of subs) {
                totalPossible += sub.marks;
                const subAttempt = htSubAttemptMap.get(sub.id);
                const subHint = team.hints.find(h => h.questionId === q.id && h.subQuestionId === sub.id);

                const isAtt = !!subAttempt;
                const isCor = subAttempt ? subAttempt.isCorrect === 1 : false;
                const sMarks = subAttempt ? subAttempt.marksAwarded : 0;

                subDetails.push({
                    sub_id: sub.id,
                    number: sub.subQuestionNumber,
                    domain: sub.domain,
                    is_attempted: isAtt,
                    is_correct: isCor,
                    marks_awarded: sMarks,
                    max_marks: sub.marks,
                    answer_given: subAttempt ? subAttempt.answer : null,
                    correct_answer: sub.correctAnswer,
                    revealed_character: sub.revealedCharacter,
                    hint_used: !!subHint,
                    hint_penalty: subHint ? subHint.penalty : 0
                });

                if (isAtt) {
                    subAttempted++;
                    if (isCor) {
                        subCorrect++;
                        subMarks += sMarks;
                    }
                }
                if (subHint) {
                    subHints++;
                    subHintPenalty += subHint.penalty;
                    hintPenalty += subHint.penalty;
                }
            }

            const finalAttempt = htFinalAttemptMap.get(q.id);
            const finalCorrect = finalAttempt ? finalAttempt.isCorrect === 1 : false;
            const finalMarks = finalAttempt ? finalAttempt.marksAwarded : 0;

            questionDetails.push({
                question_id: q.id,
                question_number: q.questionNumber,
                title: q.title,
                type: 'hidden_tech',
                max_marks: q.marks + ht.finalOutputMarks,
                sub_questions: subDetails,
                sub_attempted: subAttempted,
                sub_total: subs.length,
                sub_correct: subCorrect,
                sub_marks: subMarks,
                final_output_expected: ht.finalOutput,
                final_output_given: finalAttempt ? finalAttempt.finalOutput : null,
                final_output_correct: finalCorrect,
                final_output_marks: finalMarks,
                // Explicit 3-way status for admin display
                final_output_status: finalAttempt
                    ? (finalCorrect ? 'Submitted — Correct' : 'Submitted — Wrong')
                    : 'Not Submitted',
                hint_penalty: subHintPenalty,
                hints_used: subHints
            });

            totalMarks += subMarks;
            if (finalAttempt) {
                totalMarks += finalMarks;
                attempted++;
                if (finalCorrect) correct++;
            }
            hintsUsed += subHints;
        }
    }

    let timeTaken = null;
    // Pick the session for the specific eventId being queried.
    // If eventId is provided, ONLY pick the session for that eventId (do NOT leak other round sessions).
    const session = team.testSessions && team.testSessions.length > 0
        ? (eventId
            ? (team.testSessions.find(s => s.eventId === eventId) || null)
            : team.testSessions[0])
        : null;
    const sessionLimit = session?.event?.timeLimitMinutes;
    const maxAllowedSeconds = (sessionLimit || team.event?.timeLimitMinutes || 40) * 60;

    const isSessionExpired = session && (session.status === 'EXPIRED' || new Date() > new Date(session.expiresAt));
    // Only finalized teams (SUBMITTED, EXPIRED, TERMINATED, or team.status completed/time_expired) have finalized completion time
    const isFinalized = (session && ['SUBMITTED', 'EXPIRED', 'TERMINATED'].includes(session.status)) ||
                        isSessionExpired ||
                        team.status === 'completed' ||
                        team.status === 'time_expired';

    if (isFinalized) {
        if (session) {
            const startMs = new Date(session.startedAt).getTime();
            if (session.status === 'EXPIRED' || isSessionExpired) {
                // For EXPIRY: timeUsedSeconds = testSession.expiresAt - testSession.startedAt
                timeTaken = Math.round((new Date(session.expiresAt).getTime() - startMs) / 1000);
            } else if (session.status === 'SUBMITTED' || session.status === 'TERMINATED') {
                // For FINAL SUBMIT: timeUsedSeconds = finalSubmittedAt - testSession.startedAt
                const endMs = team.eventSubmittedAt ? new Date(team.eventSubmittedAt).getTime() : new Date(session.updatedAt || session.expiresAt).getTime();
                timeTaken = Math.round((endMs - startMs) / 1000);
            } else {
                // Fallback for session
                const endMs = team.eventSubmittedAt ? new Date(team.eventSubmittedAt).getTime() : new Date(session.expiresAt).getTime();
                timeTaken = Math.round((endMs - startMs) / 1000);
            }
        } else if (team.eventStartedAt) {
            const startMs = new Date(team.eventStartedAt).getTime();
            const endMs = team.eventSubmittedAt ? new Date(team.eventSubmittedAt).getTime() : startMs + (maxAllowedSeconds * 1000);
            timeTaken = Math.round((endMs - startMs) / 1000);
        }

        // Sanity check: timeUsedSeconds must never exceed event.timeLimitMinutes * 60 and never be negative
        if (timeTaken !== null) {
            timeTaken = Math.max(0, Math.min(timeTaken, maxAllowedSeconds));
        }
    }

    const m1Name = team.member1Name || team.participant1Name;
    const m1Sec = team.member1Section || team.participant1Batch;
    const m2Name = team.member2Name || team.participant2Name;
    const m2Sec = team.member2Section || team.participant2Batch;

    const effectiveSessionStatus = session ? (isSessionExpired && session.status === 'ACTIVE' ? 'EXPIRED' : session.status) : 'NOT_STARTED';
    const effectiveTeamStatus = effectiveSessionStatus === 'TERMINATED' ? 'terminated' : (effectiveSessionStatus === 'SUBMITTED' ? 'completed' : (effectiveSessionStatus === 'EXPIRED' ? 'time_expired' : team.status));

    return {
        team_id: team.id,
        team_name: team.teamName,
        year: team.year,
        p1_name: m1Name,
        p1_batch: m1Sec,
        p2_name: m2Name,
        p2_batch: m2Sec,
        member_1_name: m1Name,
        member_1_section: m1Sec,
        member_2_name: m2Name,
        member_2_section: m2Sec,
        email: team.email,
        event: team.event ? team.event.name : null,
        status: effectiveTeamStatus,
        test_status: effectiveSessionStatus,
        total_marks: Math.max(0, totalMarks),
        total_possible: totalPossible,
        questions_attempted: attempted,
        questions_allocated: team.allocations.length,
        correct_count: correct,
        hints_used: hintsUsed,
        hint_penalty: hintPenalty,
        time_taken: timeTaken,
        question_details: questionDetails
    };
}

async function getEventResults(eventId) {
    let targetEvent = null;
    if (eventId) {
        targetEvent = await prisma.event.findUnique({ where: { id: eventId } });
    }

    const teams = await prisma.team.findMany({
        where: targetEvent ? {
            OR: [
                { year: targetEvent.year },
                { eventId },
                { allocations: { some: { question: { eventId } } } }
            ]
        } : (eventId ? { eventId } : undefined),
        select: { id: true }
    });

    const results = [];
    for (const t of teams) {
        const res = await calculateTeamResults(t.id, eventId);
        if (res) results.push(res);
    }

    // Sort: marks DESC, time ASC (only for finalized results with valid time_taken)
    results.sort((a, b) => {
        if (b.total_marks !== a.total_marks) return b.total_marks - a.total_marks;
        const aTime = a.time_taken != null ? a.time_taken : Infinity;
        const bTime = b.time_taken != null ? b.time_taken : Infinity;
        return aTime - bTime;
    });

    results.forEach((r, i) => r.rank = i + 1);
    return results;
}

router.get('/', async (req, res) => {
    try {
        const { event_id } = req.query;
        const eventId = event_id ? parseInt(event_id) : undefined;
        const results = await getEventResults(eventId);
        res.json(results);
    } catch (err) {
        console.error('Admin results error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/export/csv', async (req, res) => {
    try {
        const { event_id } = req.query;
        const eventId = event_id ? parseInt(event_id) : undefined;
        const results = await getEventResults(eventId);
        const csvData = results.map(r => ({
            Rank: r.rank,
            'Team Name': r.team_name,
            Year: r.year,
            'Participant 1': r.p1_name,
            'P1 Batch': r.p1_batch,
            'Participant 2': r.p2_name || '—',
            'P2 Batch': r.p2_batch || '—',
            Email: r.email,
            Event: r.event,
            'Total Marks': r.total_marks,
            'Total Possible': r.total_possible,
            'Questions Attempted': r.questions_attempted,
            'Correct Answers': r.correct_count,
            'Hints Used': r.hints_used,
            'Time Taken (s)': r.time_taken != null ? r.time_taken : 'N/A',
            Status: r.status
        }));

        const fields = Object.keys(csvData[0] || {});
        const parser = new Parser({ fields });
        const csv = parser.parse(csvData);

        res.header('Content-Type', 'text/csv');
        res.attachment(`clash_of_codes_results_${event_id || 'all'}.csv`);
        res.send(csv);
    } catch (err) {
        console.error('Admin CSV export error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/:teamId', async (req, res) => {
    try {
        const teamId = parseInt(req.params.teamId);
        const result = await calculateTeamResults(teamId);
        if (!result) return res.status(404).json({ error: 'Team not found' });
        res.json(result);
    } catch (err) {
        console.error('Admin team results error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
