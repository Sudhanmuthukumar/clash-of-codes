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

    jwt.verify(token, process.env.JWT_SECRET || 'tech-arena-dev-secret-2026', (err, user) => {
        if (err) {
            return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
        }
        // Server authoritative user context (prevent client spoofing)
        req.user = {
            id: user.id,
            role: user.role,
            userId: user.userId,
            teamId: user.teamId,
            eventId: user.eventId
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

        // 1. Check Anti-Cheat TestSession Status if exists
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
                if (team.status === 'active') {
                    await prisma.team.update({
                        where: { id: team.id },
                        data: { status: 'time_expired', eventSubmittedAt: now }
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
                    message: 'Your clan has already finalized and submitted the test.'
                });
            }
        }
        
        if (team.status === 'time_expired') {
            return res.status(403).json({ error: 'Time expired', time_expired: true, message: "TIME'S UP! The event time has expired." });
        }
        if (team.status === 'completed') {
            return res.status(403).json({ error: 'Event already submitted', is_completed: true });
        }
        if (team.status !== 'active') {
            return res.status(403).json({ error: 'Team is not active' });
        }

        const event = team.event;
        if (!event) return res.status(404).json({ error: 'Event not found' });

        if (event.status !== 'live') {
            return res.status(403).json({ error: 'Event is not currently live' });
        }

        // Server-Authoritative Fallback Timer Check (if testSession not yet created)
        if (team.eventStartedAt && !testSession) {
            const startTime = new Date(team.eventStartedAt);
            let pauseDuration = event.pauseDurationSeconds || 0;
            if (event.pauseStartTime) {
                pauseDuration += Math.floor((now - new Date(event.pauseStartTime)) / 1000);
            }
            const elapsed = Math.floor((now - startTime) / 1000);
            const totalAllowed = (40 * 60) + pauseDuration; // 40-minute test limit
            const remainingSeconds = totalAllowed - elapsed;

            if (remainingSeconds <= 0) {
                await prisma.team.update({
                    where: { id: team.id },
                    data: {
                        status: 'time_expired',
                        eventSubmittedAt: now
                    }
                });
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
