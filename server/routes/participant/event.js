const express = require('express');
const router = express.Router();
const { prisma } = require('../../db/database');
const { requireParticipant, authenticateToken } = require('../../middleware/auth');
const { submissionLimiter } = require('../../middleware/rateLimiter');
const { getValidArrangements, isArrangementValid } = require('../../utils/scrambleValidator');

router.use(authenticateToken, requireParticipant);

// Helper to finalize and grade all allocated Code Scramble questions for a team
async function finalizeCodeScrambleForTeam(teamId, eventId) {
    const allocations = await prisma.teamQuestionAllocation.findMany({
        where: { 
            teamId,
            ...(eventId ? { question: { eventId } } : {})
        },
        include: {
            question: {
                include: { codeScrambleData: true }
            }
        }
    });

    for (const alloc of allocations) {
        const q = alloc.question;
        if (!q || !q.codeScrambleData) continue;

        const shuffledLines = q.codeScrambleData.shuffledCode.split('\n').filter(l => l !== undefined);
        const validArrangements = getValidArrangements(q.codeScrambleData);
        const defaultOrder = shuffledLines.map((_, i) => i);

        let attempt = await prisma.codeScrambleAttempt.findUnique({
            where: { teamId_questionId: { teamId, questionId: q.id } }
        });

        const lineOrder = attempt ? JSON.parse(attempt.lineOrder) : defaultOrder;
        const arrangedLines = lineOrder.map(i => shuffledLines[i]);

        const isCorrect = isArrangementValid(arrangedLines, validArrangements) ? 1 : 0;
        const remainingPoints = attempt ? attempt.currentPoints : (q.marks || 100);
        const marks = isCorrect ? remainingPoints : 0;

        await prisma.codeScrambleAttempt.upsert({
            where: { teamId_questionId: { teamId, questionId: q.id } },
            update: {
                lineOrder: JSON.stringify(lineOrder),
                isSubmitted: 1,
                isCorrect,
                marksAwarded: marks,
                submittedAt: new Date()
            },
            create: {
                teamId,
                questionId: q.id,
                lineOrder: JSON.stringify(lineOrder),
                swapsCount: 0,
                hintsCount: 0,
                currentPoints: remainingPoints,
                isSubmitted: 1,
                isCorrect,
                marksAwarded: marks,
                submittedAt: new Date()
            }
        });
    }
}

// 1. GET OR START 40-MINUTE TEST SESSION
router.post('/test-session/start', async (req, res) => {
    try {
        const teamId = req.user.teamId;
        const eventId = req.user.eventId;

        const team = await prisma.team.findUnique({
            where: { id: teamId },
            include: { event: true }
        });
        if (!team) return res.status(404).json({ error: 'Team not found' });
        const event = team.event;
        if (!event) return res.status(404).json({ error: 'Event not found' });

        if (event.status !== 'live') {
            return res.status(403).json({ error: 'Event is not live. Cannot start test.', event_status: event.status });
        }

        const now = new Date();

        // Atomic search or creation of TestSession
        let session = await prisma.testSession.findUnique({
            where: { teamId_eventId: { teamId, eventId } }
        });

        if (session) {
            // If already terminated
            if (session.status === 'TERMINATED') {
                return res.status(403).json({
                    error: 'Test terminated',
                    is_terminated: true,
                    reason: session.terminationReason,
                    violationCount: session.violationCount,
                    message: 'TEST TERMINATED: Maximum anti-cheat warnings exceeded.'
                });
            }

            // Check if 40-minute duration has expired
            if (now > new Date(session.expiresAt) || session.status === 'EXPIRED') {
                if (session.status !== 'EXPIRED') {
                    await prisma.testSession.update({
                        where: { id: session.id },
                        data: { status: 'EXPIRED' }
                    });
                }
                if (team.status === 'active') {
                    await prisma.team.update({
                        where: { id: teamId },
                        data: { status: 'time_expired', eventSubmittedAt: now }
                    });
                    if (team.year === '2nd Year') {
                        await finalizeCodeScrambleForTeam(teamId, eventId);
                    }
                }
                return res.status(403).json({
                    error: 'Time expired',
                    time_expired: true,
                    message: "TIME'S UP! The 40-minute test duration has expired."
                });
            }

            if (session.status === 'SUBMITTED' || team.status === 'completed') {
                return res.status(403).json({
                    error: 'Test already submitted',
                    is_completed: true,
                    message: 'Your clan has already submitted the test.'
                });
            }

            const remainingMs = Math.max(0, new Date(session.expiresAt).getTime() - now.getTime());
            return res.json({
                success: true,
                started: true,
                startedAt: session.startedAt.toISOString(),
                expiresAt: session.expiresAt.toISOString(),
                remaining_seconds: Math.floor(remainingMs / 1000),
                violationCount: session.violationCount,
                status: session.status,
                server_time: now.toISOString()
            });
        }

        // Fresh start: EXACTLY 40 MINUTES from server time
        const durationMinutes = 40;
        const expiresAt = new Date(now.getTime() + durationMinutes * 60 * 1000);

        session = await prisma.testSession.create({
            data: {
                teamId,
                eventId,
                startedAt: now,
                expiresAt,
                status: 'ACTIVE',
                violationCount: 0
            }
        });

        // Synchronize team.eventStartedAt
        if (!team.eventStartedAt) {
            await prisma.team.update({
                where: { id: teamId },
                data: { eventStartedAt: now }
            });
        }

        res.json({
            success: true,
            started: true,
            startedAt: session.startedAt.toISOString(),
            expiresAt: session.expiresAt.toISOString(),
            remaining_seconds: durationMinutes * 60,
            violationCount: 0,
            status: 'ACTIVE',
            server_time: now.toISOString()
        });
    } catch (err) {
        console.error('Test session start error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// 2. ANTI-CHEAT VIOLATION RECORDING (3-WARNING POLICY)
router.post('/violation', async (req, res) => {
    try {
        const teamId = req.user.teamId;
        const eventId = req.user.eventId;
        const now = new Date();

        const session = await prisma.testSession.findUnique({
            where: { teamId_eventId: { teamId, eventId } }
        });

        if (!session) {
            return res.status(404).json({ error: 'Active test session not found' });
        }

        if (session.status === 'TERMINATED') {
            return res.status(403).json({
                is_terminated: true,
                violationCount: session.violationCount,
                reason: session.terminationReason,
                message: 'Test has already been terminated due to anti-cheat policy violations.'
            });
        }

        if (session.status === 'SUBMITTED' || session.status === 'EXPIRED') {
            return res.status(403).json({ error: `Cannot record violation on a ${session.status.toLowerCase()} test.` });
        }

        const newCount = session.violationCount + 1;

        if (newCount >= 3) {
            // Terminate test immediately
            await prisma.$transaction([
                prisma.testSession.update({
                    where: { id: session.id },
                    data: {
                        violationCount: newCount,
                        status: 'TERMINATED',
                        terminationReason: 'Maximum anti-cheat warnings exceeded (3/3: Left fullscreen / switched tabs)'
                    }
                }),
                prisma.team.update({
                    where: { id: teamId },
                    data: {
                        status: 'time_expired',
                        eventSubmittedAt: now
                    }
                })
            ]);

            const team = await prisma.team.findUnique({ where: { id: teamId } });
            if (team && team.year === '2nd Year') {
                await finalizeCodeScrambleForTeam(teamId, eventId);
            }

            return res.json({
                success: true,
                terminated: true,
                violationCount: 3,
                message: 'TEST TERMINATED: You have committed 3 violations (leaving fullscreen or switching tabs). Your test has been locked and submitted.'
            });
        }

        // Record warning 1 or 2
        await prisma.testSession.update({
            where: { id: session.id },
            data: { violationCount: newCount }
        });

        res.json({
            success: true,
            terminated: false,
            violationCount: newCount,
            message: newCount === 1 
                ? 'WARNING 1 / 3: You have left fullscreen or switched away from the test. Return to the test immediately. 3 violations will terminate your test.'
                : 'WARNING 2 / 3: Warning 2 of 3. One more violation will terminate your test.'
        });
    } catch (err) {
        console.error('Violation recording error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/status', async (req, res) => {
    try {
        const team = await prisma.team.findUnique({
            where: { id: req.user.teamId },
            include: { 
                event: true,
                testSessions: {
                    where: { eventId: req.user.eventId }
                }
            }
        });
        if (!team) return res.status(404).json({ error: 'Team not found' });
        const event = team.event;
        if (!event) return res.status(404).json({ error: 'Event not found' });

        const server_time = new Date();
        const testSession = team.testSessions && team.testSessions.length > 0 ? team.testSessions[0] : null;

        let remaining_seconds = 0;
        let is_terminated = false;
        let is_expired = false;
        let violation_count = testSession ? testSession.violationCount : 0;
        let session_status = testSession ? testSession.status : 'NOT_STARTED';

        let pauseDuration = event.pauseDurationSeconds || 0;
        if (event.status === 'paused' && event.pauseStartTime) {
            pauseDuration += Math.floor((server_time - new Date(event.pauseStartTime)) / 1000);
        }

        if (testSession) {
            if (testSession.status === 'TERMINATED') {
                is_terminated = true;
                remaining_seconds = 0;
            } else if (testSession.status === 'EXPIRED' || server_time > new Date(testSession.expiresAt)) {
                is_expired = true;
                remaining_seconds = 0;
                if (testSession.status !== 'EXPIRED') {
                    await prisma.testSession.update({
                        where: { id: testSession.id },
                        data: { status: 'EXPIRED' }
                    });
                }
                if (team.status === 'active') {
                    await prisma.team.update({
                        where: { id: team.id },
                        data: { status: 'time_expired', eventSubmittedAt: server_time }
                    });
                    if (team.year === '2nd Year') {
                        await finalizeCodeScrambleForTeam(team.id, event.id);
                    }
                }
            } else if (testSession.status === 'ACTIVE') {
                const diffMs = new Date(testSession.expiresAt).getTime() - server_time.getTime();
                remaining_seconds = Math.max(0, Math.floor(diffMs / 1000));
            }
        } else if (event.status === 'live' && team.eventStartedAt) {
            // Fallback before testSession record
            const elapsed = Math.floor((server_time - new Date(team.eventStartedAt)) / 1000);
            const totalAllowed = (40 * 60) + pauseDuration;
            remaining_seconds = Math.max(0, totalAllowed - elapsed);

            if (remaining_seconds === 0 && team.status === 'active') {
                await prisma.team.update({
                    where: { id: team.id },
                    data: { status: 'time_expired', eventSubmittedAt: server_time }
                });
                team.status = 'time_expired';
                if (team.year === '2nd Year') {
                    await finalizeCodeScrambleForTeam(team.id, event.id);
                }
            }
        } else {
            remaining_seconds = 40 * 60;
        }

        res.json({
            status: event.status,
            team_status: team.status,
            server_time: server_time.toISOString(),
            start_time: testSession ? testSession.startedAt.toISOString() : (team.eventStartedAt ? team.eventStartedAt.toISOString() : null),
            expires_at: testSession ? testSession.expiresAt.toISOString() : null,
            time_limit_minutes: 40,
            remaining_seconds,
            pause_duration_seconds: pauseDuration,
            is_expired: is_expired || team.status === 'time_expired' || (event.status === 'live' && remaining_seconds === 0),
            is_terminated,
            violation_count,
            session_status
        });
    } catch (err) {
        console.error('Participant event status error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/submit', submissionLimiter, async (req, res) => {
    try {
        const teamId = req.user.teamId;
        const eventId = req.user.eventId;
        const now = new Date();

        const team = await prisma.team.findUnique({
            where: { id: teamId }
        });
        if (!team) return res.status(404).json({ error: 'Team not found' });

        // If Code Scramble (2nd Year), finalize and grade all allocated questions
        if (team.year === '2nd Year') {
            await finalizeCodeScrambleForTeam(team.id, eventId);
        }

        await prisma.team.update({
            where: { id: teamId },
            data: {
                status: 'completed',
                eventSubmittedAt: now
            }
        });

        // Update TestSession status to SUBMITTED if exists
        await prisma.testSession.updateMany({
            where: { teamId, eventId },
            data: { status: 'SUBMITTED' }
        });

        res.json({ submitted: true, message: 'Your submission has been recorded successfully.' });
    } catch (err) {
        console.error('Participant event submit error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
