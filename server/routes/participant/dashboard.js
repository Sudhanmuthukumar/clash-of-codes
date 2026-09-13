const express = require('express');
const router = express.Router();
const { prisma } = require('../../db/database');
const { requireParticipant, authenticateToken } = require('../../middleware/auth');
const { allocateQuestions } = require('../../services/questionAllocator');

router.use(authenticateToken, requireParticipant);

router.get('/', async (req, res) => {
    try {
        const team = await prisma.team.findUnique({
            where: { id: req.user.teamId },
            include: { event: true }
        });
        if (!team) return res.status(404).json({ error: 'Team not found' });
        const event = team.event;
        if (!event) return res.status(404).json({ error: 'Event not found' });

        let allocatedCount = 0;
        let attemptedCount = 0;
        let questionsList = [];

        const existingAllocations = await prisma.teamQuestionAllocation.findMany({
            where: { 
                teamId: team.id,
                question: { eventId: event.id }
            },
            select: { questionId: true }
        });

        // Query TestSession for active 40-minute test status
        const testSession = await prisma.testSession.findUnique({
            where: { teamId_eventId: { teamId: team.id, eventId: event.id } }
        });

        if (existingAllocations.length > 0 || event.status !== 'not_started') {
            const allocatedIds = await allocateQuestions(team.id, event.id);
            allocatedCount = allocatedIds.length;

            if (allocatedIds.length > 0) {
                const rawQs = await prisma.question.findMany({
                    where: { id: { in: allocatedIds } },
                    select: {
                        id: true,
                        questionNumber: true,
                        title: true,
                        displayOrder: true
                    },
                    orderBy: { displayOrder: 'asc' }
                });

                let csAttempts = [];
                let htFinalAttempts = [];
                if (team.year === '2nd Year') {
                    csAttempts = await prisma.codeScrambleAttempt.findMany({
                        where: { teamId: team.id, questionId: { in: allocatedIds } },
                        select: { questionId: true, isSubmitted: true }
                    });
                } else {
                    htFinalAttempts = await prisma.hiddenTechFinalAttempt.findMany({
                        where: { teamId: team.id, questionId: { in: allocatedIds } },
                        select: { questionId: true }
                    });
                }

                const csMap = new Map(csAttempts.map(a => [a.questionId, a.isSubmitted === 1]));
                const htMap = new Set(htFinalAttempts.map(a => a.questionId));

                questionsList = rawQs.map(q => {
                    const isAttempted = team.year === '2nd Year' ? !!csMap.get(q.id) : htMap.has(q.id);
                    return {
                        id: q.id,
                        question_number: q.questionNumber,
                        title: q.title,
                        attempted: isAttempted
                    };
                });
            }
            attemptedCount = questionsList.filter(q => q.attempted).length;
        }

        const server_time = new Date();
        let remaining_seconds = 0;
        let pauseDuration = event.pauseDurationSeconds || 0;
        if (event.status === 'paused' && event.pauseStartTime) {
            pauseDuration += Math.floor((server_time - new Date(event.pauseStartTime)) / 1000);
        }

        if (testSession) {
            if (testSession.status === 'ACTIVE') {
                const diffMs = new Date(testSession.expiresAt).getTime() - server_time.getTime();
                remaining_seconds = Math.max(0, Math.floor(diffMs / 1000));
            } else {
                remaining_seconds = 0;
            }
        } else if (team.eventStartedAt && event.status === 'live') {
            const elapsed = Math.floor((server_time - new Date(team.eventStartedAt)) / 1000);
            const totalAllowed = (40 * 60) + pauseDuration;
            remaining_seconds = Math.max(0, totalAllowed - elapsed);
        } else {
            remaining_seconds = 40 * 60;
        }

        const m1Name = team.member1Name || team.participant1Name;
        const m1Sec = team.member1Section || team.participant1Batch;
        const m2Name = team.member2Name || team.participant2Name;
        const m2Sec = team.member2Section || team.participant2Batch;

        res.json({
            team_name: team.teamName,
            year: team.year,
            p1: m1Name,
            p2: m2Name,
            member_1_name: m1Name,
            member_1_section: m1Sec,
            member_2_name: m2Name,
            member_2_section: m2Sec,
            team: {
                team_name: team.teamName,
                year: team.year,
                member_1_name: m1Name,
                member_1_section: m1Sec,
                member_2_name: m2Name,
                member_2_section: m2Sec,
                p1_name: m1Name,
                p1_batch: m1Sec,
                p2_name: m2Name,
                p2_batch: m2Sec,
                email: team.email,
                status: team.status
            },
            event_name: event.name,
            event_status: event.status,
            allocated_count: allocatedCount,
            attempted_count: attemptedCount,
            questions: questionsList,
            start_time: testSession ? testSession.startedAt.toISOString() : (team.eventStartedAt ? team.eventStartedAt.toISOString() : null),
            expires_at: testSession ? testSession.expiresAt.toISOString() : null,
            time_limit: 40,
            time_limit_minutes: 40,
            server_time: server_time.toISOString(),
            remaining_seconds,
            pause_duration: pauseDuration,
            test_session_status: testSession ? testSession.status : 'NOT_STARTED',
            violation_count: testSession ? testSession.violationCount : 0
        });
    } catch (err) {
        console.error('Participant dashboard error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
