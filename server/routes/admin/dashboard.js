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
            orderBy: { id: 'asc' },
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
                },
                testSessions: {
                    orderBy: { createdAt: 'desc' },
                    take: 1
                }
            }
        });

        const formatted = teams.map(t => {
            const csCount = t.csAttempts.length;
            const htCount = t.htFinalAttempts.length;
            const questions_attempted = csCount + htCount;

            const session = t.testSessions && t.testSessions.length > 0 ? t.testSessions[0] : null;
            const eventDuration = (t.event?.timeLimitMinutes || 40) * 60;
            let time_elapsed = 0;
            let time_remaining = eventDuration;

            if (session) {
                const now = Date.now();
                time_elapsed = Math.round((now - new Date(session.startedAt).getTime()) / 1000);
                if (session.status === 'ACTIVE') {
                    time_remaining = Math.max(0, Math.round((new Date(session.expiresAt).getTime() - now) / 1000));
                } else {
                    time_remaining = 0;
                }
            } else if (t.eventStartedAt) {
                time_elapsed = Math.round((Date.now() - new Date(t.eventStartedAt).getTime()) / 1000);
                time_remaining = Math.max(0, eventDuration - time_elapsed);
            }

            return {
                id: t.id,
                team_name: t.teamName,
                year: t.year,
                event_name: t.event ? t.event.name : null,
                status: session && session.status === 'TERMINATED' ? 'terminated' : t.status,
                event_started_at: session ? session.startedAt.toISOString() : (t.eventStartedAt ? t.eventStartedAt.toISOString() : null),
                total_allocated: t.event ? t.event.questionsPerTeam : 5,
                time_limit_minutes: t.event?.timeLimitMinutes || 40,
                questions_attempted,
                time_elapsed,
                time_remaining,
                violation_count: session ? session.violationCount : 0,
                termination_reason: session ? session.terminationReason : null,
                test_status: session ? session.status : 'NOT_STARTED'
            };
        });

        res.json(formatted);
    } catch (err) {
        console.error('Admin live dashboard error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
