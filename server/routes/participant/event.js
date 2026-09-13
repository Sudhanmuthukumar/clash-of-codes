const express = require('express');
const router = express.Router();
const { prisma } = require('../../db/database');
const { requireParticipant, authenticateToken } = require('../../middleware/auth');
const { submissionLimiter } = require('../../middleware/rateLimiter');
const { getValidArrangements, isArrangementValid } = require('../../utils/scrambleValidator');

router.use(authenticateToken, requireParticipant);

// Helper to finalize and grade all allocated Code Scramble questions for a team
async function finalizeCodeScrambleForTeam(teamId) {
    const allocations = await prisma.teamQuestionAllocation.findMany({
        where: { teamId },
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

router.get('/status', async (req, res) => {
    try {
        const team = await prisma.team.findUnique({
            where: { id: req.user.teamId },
            include: { event: true }
        });
        if (!team) return res.status(404).json({ error: 'Team not found' });
        const event = team.event;
        if (!event) return res.status(404).json({ error: 'Event not found' });

        let remaining_seconds = 0;
        const server_time = new Date();
        
        let pauseDuration = event.pauseDurationSeconds || 0;
        if (event.status === 'paused' && event.pauseStartTime) {
            pauseDuration += Math.floor((server_time - new Date(event.pauseStartTime)) / 1000);
        }

        if (event.status === 'live' && team.eventStartedAt) {
            const elapsed = Math.floor((server_time - new Date(team.eventStartedAt)) / 1000);
            const totalAllowed = (event.timeLimitMinutes * 60) + pauseDuration;
            remaining_seconds = Math.max(0, totalAllowed - elapsed);

            // Auto-expire team if remaining time reached 0
            if (remaining_seconds === 0 && team.status === 'active') {
                await prisma.team.update({
                    where: { id: team.id },
                    data: {
                        status: 'time_expired',
                        eventSubmittedAt: server_time
                    }
                });
                team.status = 'time_expired';

                // Automatically finalize and grade 2nd Year Code Scramble arrangements on expiry
                if (team.year === '2nd Year') {
                    await finalizeCodeScrambleForTeam(team.id);
                }
            }
        }

        res.json({
            status: event.status,
            team_status: team.status,
            server_time: server_time.toISOString(),
            start_time: team.eventStartedAt ? team.eventStartedAt.toISOString() : null,
            time_limit_minutes: event.timeLimitMinutes,
            remaining_seconds,
            pause_duration_seconds: pauseDuration,
            is_expired: team.status === 'time_expired' || (event.status === 'live' && remaining_seconds === 0)
        });
    } catch (err) {
        console.error('Participant event status error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/submit', submissionLimiter, async (req, res) => {
    try {
        const team = await prisma.team.findUnique({
            where: { id: req.user.teamId }
        });
        if (!team) return res.status(404).json({ error: 'Team not found' });

        // If Code Scramble (2nd Year), finalize and grade all allocated questions
        if (team.year === '2nd Year') {
            await finalizeCodeScrambleForTeam(team.id);
        }

        await prisma.team.update({
            where: { id: req.user.teamId },
            data: {
                status: 'completed',
                eventSubmittedAt: new Date()
            }
        });
        res.json({ submitted: true, message: 'Your submission has been recorded successfully.' });
    } catch (err) {
        console.error('Participant event submit error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
