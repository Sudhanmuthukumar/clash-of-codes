const express = require('express');
const router = express.Router();
const { prisma } = require('../../db/database');
const { requireAdmin, authenticateToken } = require('../../middleware/auth');

router.use(authenticateToken, requireAdmin);

router.get('/stats', async (req, res) => {
    try {
        const totalTeams = await prisma.team.count();
        const activeTeams = await prisma.team.count({ where: { status: 'active' } });
        const completedTeams = await prisma.team.count({ where: { status: 'completed' } });
        
        const yearGroups = await prisma.team.groupBy({
            by: ['year'],
            _count: { id: true }
        });
        const teamsByYear = yearGroups.map(g => ({ year: g.year, c: g._count.id }));

        const eventsList = await prisma.event.findMany({
            include: {
                _count: {
                    select: {
                        teams: true,
                        questions: { where: { isActive: 1 } }
                    }
                },
                questions: {
                    where: { isActive: 1 },
                    select: { marks: true }
                }
            }
        });

        const events = eventsList.map(e => ({
            id: e.id,
            name: e.name,
            year: e.year,
            description: e.description,
            time_limit_minutes: e.timeLimitMinutes,
            questions_per_team: e.questionsPerTeam,
            status: e.status,
            teamsCount: e._count.teams,
            questionCount: e._count.questions,
            totalMarks: e.questions.reduce((sum, q) => sum + (q.marks || 0), 0)
        }));

        const recentAudit = await prisma.auditLog.findMany({
            take: 10,
            orderBy: { createdAt: 'desc' }
        });

        res.json({ totalTeams, activeTeams, completedTeams, teamsByYear, events, recentAudit });
    } catch (err) {
        console.error('Admin dashboard stats error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/live', async (req, res) => {
    try {
        const teams = await prisma.team.findMany({
            where: {
                status: { in: ['active', 'completed', 'time_expired'] }
            },
            include: {
                event: true,
                csAttempts: {
                    where: { isSubmitted: 1 },
                    select: { id: true }
                },
                htFinalAttempts: {
                    select: { questionId: true }
                }
            }
        });

        const formatted = teams.map(t => {
            const csCount = t.csAttempts.length;
            const htCount = t.htFinalAttempts.length;
            const questions_attempted = csCount + htCount;

            let time_elapsed = 0;
            let time_remaining = t.event ? t.event.timeLimitMinutes * 60 : 0;

            if (t.eventStartedAt && t.event) {
                time_elapsed = Math.round((Date.now() - new Date(t.eventStartedAt).getTime()) / 1000);
                const pauseDuration = t.event.pauseDurationSeconds || 0;
                time_remaining = Math.max(0, (t.event.timeLimitMinutes * 60) + pauseDuration - time_elapsed);
            }

            return {
                id: t.id,
                team_name: t.teamName,
                year: t.year,
                event_name: t.event ? t.event.name : null,
                status: t.status,
                event_started_at: t.eventStartedAt ? t.eventStartedAt.toISOString() : null,
                total_allocated: t.event ? t.event.questionsPerTeam : 5,
                time_limit_minutes: t.event ? t.event.timeLimitMinutes : 45,
                questions_attempted,
                time_elapsed,
                time_remaining
            };
        });

        res.json(formatted);
    } catch (err) {
        console.error('Admin live dashboard error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
