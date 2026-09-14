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
        const queryEventId = req.query.event_id ? parseInt(req.query.event_id) : undefined;
        
        let targetEvent = null;
        if (queryEventId) {
            targetEvent = await prisma.event.findUnique({ where: { id: queryEventId } });
        }

        const teams = await prisma.team.findMany({
            where: {
                status: { in: ['active', 'completed', 'time_expired'] },
                ...(targetEvent ? {
                    OR: [
                        { year: targetEvent.year },
                        { eventId: queryEventId },
                        { allocations: { some: { question: { eventId: queryEventId } } } }
                    ]
                } : {})
            },
            include: {
                event: true,
                csAttempts: {
                    where: { isSubmitted: 1 },
                    select: { id: true, marksAwarded: true }
                },
                htSubAttempts: {
                    select: { id: true, marksAwarded: true, isCorrect: true }
                },
                htFinalAttempts: {
                    select: { questionId: true, marksAwarded: true, isCorrect: true }
                },
                hints: {
                    select: { penalty: true }
                },
                testSessions: {
                    where: queryEventId ? { eventId: queryEventId } : undefined,
                    include: { event: true },
                    orderBy: { createdAt: 'desc' }
                }
            }
        });

        const formatted = teams.map(t => {
            const csCount = t.csAttempts.length;
            const htCount = t.htFinalAttempts.length;
            const questions_attempted = csCount + htCount;

            // Compute current score
            let current_score = 0;
            if (t.year === '2nd Year') {
                current_score = t.csAttempts.reduce((sum, a) => sum + (a.marksAwarded || 0), 0);
            } else {
                const subMarks = t.htSubAttempts.filter(a => a.isCorrect === 1).reduce((sum, a) => sum + (a.marksAwarded || 0), 0);
                const finalMarks = t.htFinalAttempts.filter(a => a.isCorrect === 1).reduce((sum, a) => sum + (a.marksAwarded || 0), 0);
                const hintPenalty = t.hints.reduce((sum, h) => sum + (h.penalty || 0), 0);
                current_score = Math.max(0, subMarks + finalMarks - hintPenalty);
            }

            // Strictly pick the session matching queryEventId if queried, else first/most recent
            const session = t.testSessions && t.testSessions.length > 0
                ? (queryEventId ? (t.testSessions.find(s => s.eventId === queryEventId) || null) : t.testSessions[0])
                : null;
            const activeEvent = session?.event || targetEvent || t.event;
            const eventDuration = (activeEvent?.timeLimitMinutes || 40) * 60;
            
            let time_used = 0;
            let time_remaining = eventDuration;
            const startMs = session ? new Date(session.startedAt).getTime() : (t.eventStartedAt ? new Date(t.eventStartedAt).getTime() : null);

            if (session && startMs) {
                const isFinalized = ['SUBMITTED', 'EXPIRED', 'TERMINATED'].includes(session.status) ||
                                    t.status === 'completed' ||
                                    t.status === 'time_expired';

                if (isFinalized) {
                    if (session.status === 'EXPIRED') {
                        // For expiry: expiresAt - startedAt
                        time_used = Math.round((new Date(session.expiresAt).getTime() - startMs) / 1000);
                    } else if (session.status === 'SUBMITTED' || session.status === 'TERMINATED') {
                        // For overall submit: finalSubmittedAt - startedAt
                        const endMs = t.eventSubmittedAt 
                            ? new Date(t.eventSubmittedAt).getTime() 
                            : new Date(session.updatedAt || session.expiresAt).getTime();
                        time_used = Math.round((endMs - startMs) / 1000);
                    } else {
                        const endMs = t.eventSubmittedAt ? new Date(t.eventSubmittedAt).getTime() : new Date(session.expiresAt).getTime();
                        time_used = Math.round((endMs - startMs) / 1000);
                    }
                    time_remaining = 0;
                } else {
                    // Active session: ticks with server clock
                    const now = Date.now();
                    time_used = Math.round((now - startMs) / 1000);
                    time_remaining = Math.max(0, Math.round((new Date(session.expiresAt).getTime() - now) / 1000));
                }
            } else if (t.eventStartedAt && startMs) {
                const isFinalized = t.status === 'completed' || t.status === 'time_expired';
                if (isFinalized) {
                    const endMs = t.eventSubmittedAt ? new Date(t.eventSubmittedAt).getTime() : startMs + (eventDuration * 1000);
                    time_used = Math.round((endMs - startMs) / 1000);
                    time_remaining = 0;
                } else {
                    const now = Date.now();
                    time_used = Math.round((now - startMs) / 1000);
                    time_remaining = Math.max(0, eventDuration - time_used);
                }
            }

            // Bound time_used to 0 <= time_used <= eventDuration
            if (time_used !== null && time_used !== undefined && !isNaN(time_used)) {
                time_used = Math.max(0, Math.min(time_used, eventDuration));
            } else {
                time_used = 0;
            }

            return {
                id: t.id,
                team_name: t.teamName,
                year: t.year,
                event_name: activeEvent ? activeEvent.name : null,
                event_id: activeEvent ? activeEvent.id : null,
                status: session && session.status === 'TERMINATED' ? 'terminated' : (session && session.status === 'SUBMITTED' ? 'completed' : (session && session.status === 'EXPIRED' ? 'time_expired' : t.status)),
                event_started_at: session ? session.startedAt.toISOString() : (t.eventStartedAt ? t.eventStartedAt.toISOString() : null),
                event_submitted_at: t.eventSubmittedAt ? t.eventSubmittedAt.toISOString() : null,
                total_allocated: activeEvent ? activeEvent.questionsPerTeam : 5,
                time_limit_minutes: activeEvent?.timeLimitMinutes || 40,
                questions_attempted,
                current_score,
                time_used,
                timeUsed: time_used,
                time_consumed: time_used,
                time_elapsed: time_used,
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
