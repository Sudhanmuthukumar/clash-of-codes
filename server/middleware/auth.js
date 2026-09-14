const jwt = require('jsonwebtoken');
const { prisma } = require('../db/database');

// Extract token from cookie (clash_auth_token) or Authorization header (Bearer <token>)
function extractToken(req) {
    // 1. Check HttpOnly cookie first
    if (req.headers.cookie) {
        const cookies = req.headers.cookie.split(';');
        for (const c of cookies) {
            const trimmed = c.trim();
            if (trimmed.startsWith('clash_auth_token=')) {
                const val = trimmed.substring('clash_auth_token='.length);
                if (val) return decodeURIComponent(val);
            }
        }
    }
    // 2. Fallback to Authorization: Bearer <token>
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.split(' ')[1];
    }
    return null;
}

function authenticateToken(req, res, next) {
    const token = extractToken(req);
    
    if (!token) {
        return res.status(401).json({ error: 'Authentication required. No valid session found.' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'tech-arena-dev-secret-2026', async (err, user) => {
        if (err) {
            return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
        }
        
        let eventId = user.eventId;
        
        // For participants: strictly server-authoritative round resolution.
        // Resolve the currently LIVE event for the team's academic year.
        // If a round is requested via header/query/body, ONLY honor it if that event is actually 'live'.
        // Participants cannot spoof or access inactive rounds.
        if (user.role === 'participant' && user.teamId) {
            try {
                const team = await prisma.team.findUnique({
                    where: { id: user.teamId },
                    select: { year: true, eventId: true }
                });
                if (team) {
                    const requestedEventId = parseInt(req.headers['x-event-id'] || req.query.event_id || req.body?.eventId);
                    if (requestedEventId && !isNaN(requestedEventId)) {
                        const targetEvent = await prisma.event.findUnique({
                            where: { id: requestedEventId },
                            select: { id: true, year: true, status: true }
                        });
                        // Only allow client requested round if it belongs to their year AND is live!
                        if (targetEvent && targetEvent.year === team.year && targetEvent.status === 'live') {
                            eventId = targetEvent.id;
                        }
                    }
                    
                    // If eventId is not set to a live event, resolve the live event for this year
                    const currentEvent = await prisma.event.findUnique({
                        where: { id: eventId },
                        select: { id: true, status: true, year: true }
                    });
                    if (!currentEvent || currentEvent.status !== 'live' || currentEvent.year !== team.year) {
                        const liveEvent = await prisma.event.findFirst({
                            where: { year: team.year, status: 'live' },
                            orderBy: { id: 'asc' }
                        });
                        if (liveEvent) {
                            eventId = liveEvent.id;
                        }
                    }
                }
            } catch (e) {
                console.error('Error resolving authoritative active event:', e);
            }
        }

        // Server authoritative user context (prevent client spoofing)
        req.user = {
            id: user.id,
            role: user.role,
            userId: user.userId,
            teamId: user.teamId,
            eventId: eventId
        };
        next();
    });
}

function requireAdmin(req, res, next) {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required. Access denied.' });
    }
    next();
}

function requireParticipant(req, res, next) {
    if (!req.user || req.user.role !== 'participant' || !req.user.teamId) {
        return res.status(403).json({ error: 'Participant access required. Access denied.' });
    }
    next();
}

async function requireEventActive(req, res, next) {
    if (req.user.role !== 'participant') return next();
    
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
        if (team.status === 'disabled') {
            return res.status(403).json({ error: 'Team is disabled' });
        }

        // Target event for this round
        const event = await prisma.event.findUnique({
            where: { id: req.user.eventId }
        }) || team.event;

        if (!event) return res.status(404).json({ error: 'Event not found' });
        if (event.status !== 'live') {
            return res.status(403).json({ error: 'Event is not currently live' });
        }

        // 1. Check Anti-Cheat TestSession Status for THIS round
        const testSession = team.testSessions && team.testSessions.length > 0 ? team.testSessions[0] : null;
        const now = new Date();

        if (testSession) {
            if (testSession.status === 'TERMINATED') {
                return res.status(403).json({
                    error: 'Test terminated',
                    is_terminated: true,
                    reason: testSession.terminationReason || 'Anti-cheat policy violation. Maximum warnings exceeded.',
                    message: 'TEST TERMINATED: You have exceeded the maximum allowed anti-cheat warnings.'
                });
            }
            if (testSession.status === 'EXPIRED' || now > new Date(testSession.expiresAt)) {
                if (testSession.status !== 'EXPIRED') {
                    await prisma.testSession.update({
                        where: { id: testSession.id },
                        data: { status: 'EXPIRED' }
                    });
                }
                return res.status(403).json({
                    error: 'Time expired',
                    time_expired: true,
                    message: "TIME'S UP! The 40-minute test duration has expired."
                });
            }
            if (testSession.status === 'SUBMITTED') {
                return res.status(403).json({
                    error: 'Event already submitted',
                    is_completed: true,
                    message: 'Your clan has already finalized and submitted this battle.'
                });
            }
        }

        // Server-Authoritative Fallback Timer Check (if testSession not yet created)
        if (team.eventStartedAt && !testSession) {
            const startTime = new Date(team.eventStartedAt);
            let pauseDuration = event.pauseDurationSeconds || 0;
            if (event.pauseStartTime) {
                pauseDuration += Math.floor((now - new Date(event.pauseStartTime)) / 1000);
            }
            const elapsed = Math.floor((now - startTime) / 1000);
            const totalAllowed = ((event.timeLimitMinutes || 40) * 60) + pauseDuration;
            const remainingSeconds = totalAllowed - elapsed;

            if (remainingSeconds <= 0) {
                return res.status(403).json({
                    error: 'Time expired',
                    time_expired: true,
                    message: "TIME'S UP! The event time has expired."
                });
            }
        }

        next();
    } catch (err) {
        console.error('requireEventActive error:', err);
        return res.status(500).json({ error: 'Server error' });
    }
}

module.exports = {
    authenticateToken,
    requireAdmin,
    requireParticipant,
    requireEventActive
};
