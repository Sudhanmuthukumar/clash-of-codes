const jwt = require('jsonwebtoken');
const { prisma } = require('../db/database');

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token == null) return res.status(401).json({ error: 'Token required' });

    jwt.verify(token, process.env.JWT_SECRET || 'tech-arena-dev-secret-2026', (err, user) => {
        if (err) return res.status(401).json({ error: 'Invalid or expired token' });
        req.user = user;
        next();
    });
}

function requireAdmin(req, res, next) {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
}

function requireParticipant(req, res, next) {
    if (req.user.role !== 'participant') {
        return res.status(403).json({ error: 'Participant access required' });
    }
    next();
}

async function requireEventActive(req, res, next) {
    if (req.user.role !== 'participant') return next();
    
    try {
        const team = await prisma.team.findUnique({
            where: { id: req.user.teamId },
            include: { event: true }
        });

        if (!team) return res.status(404).json({ error: 'Team not found' });
        
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

        // Server-Authoritative Timer Expiry Check
        if (team.eventStartedAt) {
            const now = new Date();
            const startTime = new Date(team.eventStartedAt);
            let pauseDuration = event.pauseDurationSeconds || 0;
            if (event.pauseStartTime) {
                pauseDuration += Math.floor((now - new Date(event.pauseStartTime)) / 1000);
            }
            const elapsed = Math.floor((now - startTime) / 1000);
            const totalAllowed = (event.timeLimitMinutes * 60) + pauseDuration;
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
