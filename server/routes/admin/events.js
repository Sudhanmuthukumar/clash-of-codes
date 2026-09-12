const express = require('express');
const router = express.Router();
const { prisma } = require('../../db/database');
const { requireAdmin, authenticateToken } = require('../../middleware/auth');
const { regenerateEventAllocations } = require('../../services/questionAllocator');

router.use(authenticateToken, requireAdmin);

router.get('/', async (req, res) => {
    try {
        const events = await prisma.event.findMany({
            include: {
                _count: {
                    select: {
                        teams: true,
                        questions: {
                            where: { isActive: 1 }
                        }
                    }
                },
                questions: {
                    where: { isActive: 1 },
                    select: { marks: true }
                }
            }
        });

        const formatted = events.map(e => {
            const totalMarks = e.questions.reduce((sum, q) => sum + (q.marks || 0), 0);
            return {
                id: e.id,
                name: e.name,
                year: e.year,
                description: e.description,
                time_limit_minutes: e.timeLimitMinutes,
                questions_per_team: e.questionsPerTeam,
                status: e.status,
                start_time: e.startTime ? e.startTime.toISOString() : null,
                end_time: e.endTime ? e.endTime.toISOString() : null,
                pause_duration_seconds: e.pauseDurationSeconds,
                created_at: e.createdAt ? e.createdAt.toISOString() : null,
                updated_at: e.updatedAt ? e.updatedAt.toISOString() : null,
                team_count: e._count.teams,
                question_count: e._count.questions,
                total_marks: totalMarks
            };
        });

        res.json(formatted);
    } catch (err) {
        console.error('Admin get events error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const eventId = parseInt(req.params.id);
        const { name, description, time_limit_minutes, questions_per_team } = req.body;
        const event = await prisma.event.findUnique({ where: { id: eventId } });
        if (!event) return res.status(404).json({ error: 'Event not found' });

        await prisma.event.update({
            where: { id: eventId },
            data: {
                name: name || event.name,
                description: description !== undefined ? description : event.description,
                timeLimitMinutes: time_limit_minutes ? parseInt(time_limit_minutes) : event.timeLimitMinutes,
                questionsPerTeam: questions_per_team ? parseInt(questions_per_team) : event.questionsPerTeam
            }
        });

        await prisma.auditLog.create({
            data: {
                adminId: req.user.id,
                action: 'UPDATE_EVENT',
                targetType: 'events',
                targetId: eventId,
                details: JSON.stringify({ name, time_limit_minutes, questions_per_team })
            }
        });

        res.json({ message: 'Event updated' });
    } catch (err) {
        console.error('Admin update event error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/:id/start', async (req, res) => {
    try {
        const eventId = parseInt(req.params.id);
        const qCount = await prisma.question.count({
            where: { eventId, isActive: 1 }
        });
        if (qCount === 0) return res.status(400).json({ error: 'No active questions for this event' });

        const event = await prisma.event.findUnique({ where: { id: eventId } });
        if (!event) return res.status(404).json({ error: 'Event not found' });
        if (event.status === 'live') return res.json({ message: 'Event is already live' });

        await prisma.event.update({
            where: { id: eventId },
            data: {
                status: 'live',
                startTime: new Date(),
                pauseDurationSeconds: 0,
                pauseStartTime: null
            }
        });

        await prisma.auditLog.create({
            data: {
                adminId: req.user.id,
                action: 'START_EVENT',
                targetType: 'events',
                targetId: eventId,
                details: 'Started event'
            }
        });

        res.json({ message: 'Event started' });
    } catch (err) {
        console.error('Admin start event error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/:id/pause', async (req, res) => {
    try {
        const eventId = parseInt(req.params.id);
        const event = await prisma.event.findUnique({ where: { id: eventId } });
        if (!event || event.status !== 'live') return res.status(400).json({ error: 'Event is not live' });

        await prisma.event.update({
            where: { id: eventId },
            data: {
                status: 'paused',
                pauseStartTime: new Date()
            }
        });

        await prisma.auditLog.create({
            data: {
                adminId: req.user.id,
                action: 'PAUSE_EVENT',
                targetType: 'events',
                targetId: eventId,
                details: 'Paused event'
            }
        });

        res.json({ message: 'Event paused' });
    } catch (err) {
        console.error('Admin pause event error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/:id/resume', async (req, res) => {
    try {
        const eventId = parseInt(req.params.id);
        const event = await prisma.event.findUnique({ where: { id: eventId } });
        if (!event || event.status !== 'paused') return res.status(400).json({ error: 'Event is not paused' });

        let addedPause = 0;
        if (event.pauseStartTime) {
            addedPause = Math.floor((new Date() - new Date(event.pauseStartTime)) / 1000);
        }

        await prisma.event.update({
            where: { id: eventId },
            data: {
                status: 'live',
                pauseDurationSeconds: (event.pauseDurationSeconds || 0) + addedPause,
                pauseStartTime: null
            }
        });

        await prisma.auditLog.create({
            data: {
                adminId: req.user.id,
                action: 'RESUME_EVENT',
                targetType: 'events',
                targetId: eventId,
                details: 'Resumed event'
            }
        });

        res.json({ message: 'Event resumed' });
    } catch (err) {
        console.error('Admin resume event error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/:id/end', async (req, res) => {
    try {
        const eventId = parseInt(req.params.id);
        const now = new Date();

        await prisma.$transaction([
            prisma.event.update({
                where: { id: eventId },
                data: {
                    status: 'ended',
                    endTime: now
                }
            }),
            prisma.team.updateMany({
                where: { eventId, status: 'active' },
                data: {
                    status: 'time_expired',
                    eventSubmittedAt: now
                }
            }),
            prisma.auditLog.create({
                data: {
                    adminId: req.user.id,
                    action: 'END_EVENT',
                    targetType: 'events',
                    targetId: eventId,
                    details: 'Ended event'
                }
            })
        ]);

        res.json({ message: 'Event ended' });
    } catch (err) {
        console.error('Admin end event error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// RESET: Clears attempts/progress but KEEPS question allocations
router.post('/:id/reset', async (req, res) => {
    try {
        const eventId = parseInt(req.params.id);

        await prisma.$transaction(async (tx) => {
            await tx.event.update({
                where: { id: eventId },
                data: {
                    status: 'not_started',
                    startTime: null,
                    endTime: null,
                    pauseDurationSeconds: 0,
                    pauseStartTime: null
                }
            });

            await tx.team.updateMany({
                where: { eventId },
                data: {
                    status: 'active',
                    eventStartedAt: null,
                    eventSubmittedAt: null
                }
            });

            const teams = await tx.team.findMany({
                where: { eventId },
                select: { id: true }
            });
            const teamIds = teams.map(t => t.id);

            if (teamIds.length > 0) {
                await tx.codeScrambleAttempt.deleteMany({ where: { teamId: { in: teamIds } } });
                await tx.hiddenTechSubAttempt.deleteMany({ where: { teamId: { in: teamIds } } });
                await tx.hiddenTechFinalAttempt.deleteMany({ where: { teamId: { in: teamIds } } });
                await tx.hintUsage.deleteMany({ where: { teamId: { in: teamIds } } });
                await tx.scoreHistory.deleteMany({ where: { teamId: { in: teamIds } } });
            }
            // NOTE: team_question_allocations are NOT deleted
        });

        await prisma.auditLog.create({
            data: {
                adminId: req.user.id,
                action: 'RESET_EVENT',
                targetType: 'events',
                targetId: eventId,
                details: 'Reset event state and cleared attempts (allocations preserved)'
            }
        });

        res.json({ message: 'Event reset successfully. Question allocations preserved.' });
    } catch (err) {
        console.error('Admin reset event error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// REGENERATE ALLOCATIONS: Separate action — deletes and reassigns questions
router.post('/:id/regenerate-allocations', async (req, res) => {
    try {
        const eventId = parseInt(req.params.id);
        await regenerateEventAllocations(eventId);

        await prisma.auditLog.create({
            data: {
                adminId: req.user.id,
                action: 'REGENERATE_ALLOCATIONS',
                targetType: 'events',
                targetId: eventId,
                details: 'Regenerated all team question allocations'
            }
        });

        res.json({ message: 'Question allocations regenerated for all teams' });
    } catch (err) {
        console.error('Admin regenerate allocations error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
