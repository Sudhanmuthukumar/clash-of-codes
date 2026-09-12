const express = require('express');
const router = express.Router();
const { prisma } = require('../../db/database');
const { requireParticipant, authenticateToken } = require('../../middleware/auth');
const { submissionLimiter } = require('../../middleware/rateLimiter');

router.use(authenticateToken, requireParticipant);

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
