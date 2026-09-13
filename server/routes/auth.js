const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { prisma } = require('../db/database');
const { loginLimiter } = require('../middleware/rateLimiter');
const { authenticateToken } = require('../middleware/auth');

// Available sections
router.get('/sections', async (req, res) => {
    try {
        const sections = await prisma.section.findMany({
            where: { isActive: 1 },
            orderBy: { name: 'asc' }
        });
        res.json(sections.map(s => s.name));
    } catch (err) {
        console.error(err);
        res.json(['A', 'B', 'C']);
    }
});

router.post('/admin/login', loginLimiter, async (req, res) => {
    try {
        const { user_id, password } = req.body;
        if (!user_id || !password) {
            return res.status(400).json({ error: 'User ID and Password are required.' });
        }

        const admin = await prisma.admin.findUnique({
            where: { userId: user_id }
        });
        
        if (!admin || !bcrypt.compareSync(password, admin.passwordHash)) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const token = jwt.sign(
            { id: admin.id, role: 'admin', userId: admin.userId },
            process.env.JWT_SECRET || 'tech-arena-dev-secret-2026',
            { expiresIn: '90m' }
        );

        // Secure HttpOnly session cookie (90 minutes max lifetime)
        const isProd = process.env.NODE_ENV === 'production';
        res.cookie('clash_auth_token', token, {
            httpOnly: true,
            secure: isProd,
            sameSite: isProd ? 'none' : 'lax',
            maxAge: 90 * 60 * 1000 // 90 minutes
        });

        res.json({
            token,
            role: 'admin',
            user: { id: admin.id, role: 'admin', userId: admin.userId }
        });
    } catch (err) {
        console.error('Admin login error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// PARTICIPANT SELF-REGISTRATION
router.post('/participant/register', loginLimiter, async (req, res) => {
    try {
        const {
            team_name,
            year,
            member_1_name,
            member_1_section,
            member_2_name,
            member_2_section,
            email,
            password,
            confirm_password
        } = req.body;

        // Security check: Ignore / reject any privilege escalation attempt
        if (req.body.role && req.body.role !== 'participant') {
            return res.status(403).json({ error: 'Cannot specify role. Only participant registration is permitted.' });
        }

        // 1. Required fields validation
        if (!team_name || !team_name.trim()) {
            return res.status(400).json({ error: 'Team name is required.' });
        }
        if (!year || !['2nd Year', '3rd Year'].includes(year)) {
            return res.status(400).json({ error: 'Please select a valid academic year (2nd Year or 3rd Year).' });
        }
        if (!member_1_name || !member_1_name.trim()) {
            return res.status(400).json({ error: 'Member 1 name is required.' });
        }
        if (!member_1_section || !member_1_section.trim()) {
            return res.status(400).json({ error: 'Member 1 section is required.' });
        }
        if (!email || !email.trim()) {
            return res.status(400).json({ error: 'Email ID is required.' });
        }

        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            return res.status(400).json({ error: 'Please provide a valid email address.' });
        }

        // Password validation
        if (!password || password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
        }
        if (password !== confirm_password) {
            return res.status(400).json({ error: 'Passwords do not match.' });
        }

        // Member 2 validation (Optional, but if either name or section is provided, both are required)
        const hasM2Name = member_2_name && member_2_name.trim().length > 0;
        const hasM2Sec = member_2_section && member_2_section.trim().length > 0;
        if (hasM2Name && !hasM2Sec) {
            return res.status(400).json({ error: 'Member 2 section is required when Member 2 is added.' });
        }
        if (!hasM2Name && hasM2Sec) {
            return res.status(400).json({ error: 'Member 2 name is required when Member 2 section is selected.' });
        }

        const cleanM1Name = member_1_name.trim();
        const cleanM1Sec = member_1_section.trim();
        const cleanM2Name = hasM2Name ? member_2_name.trim() : null;
        const cleanM2Sec = hasM2Sec ? member_2_section.trim() : null;
        const cleanTeamName = team_name.trim();
        const cleanEmail = email.trim();

        // 2. Case-insensitive Team Name Uniqueness Check
        const existingTeam = await prisma.team.findFirst({
            where: {
                teamName: {
                    equals: cleanTeamName,
                    mode: 'insensitive'
                }
            }
        });
        if (existingTeam) {
            return res.status(400).json({ error: `Team name "${cleanTeamName}" is already registered. Please pick another name.` });
        }

        // 3. Event Determination based on Year and optional Round
        let event = null;
        if (req.body.event_id) {
            event = await prisma.event.findUnique({ where: { id: parseInt(req.body.event_id) } });
        } else if (req.body.round) {
            const roundTerm = req.body.round.includes('2') ? 'Round 2' : 'Round 1';
            event = await prisma.event.findFirst({
                where: {
                    year,
                    name: { contains: roundTerm, mode: 'insensitive' }
                }
            });
        }
        if (!event) {
            event = await prisma.event.findFirst({
                where: { year },
                orderBy: { id: 'asc' }
            });
        }
        if (!event) {
            return res.status(400).json({ error: `No active event configured for ${year}.` });
        }

        // 4. Secure Password Hashing
        const passwordHash = bcrypt.hashSync(password, 12);

        // 5. Database Insertion
        const newTeam = await prisma.team.create({
            data: {
                year,
                teamName: cleanTeamName,
                member1Name: cleanM1Name,
                member1Section: cleanM1Sec,
                participant1Name: cleanM1Name,
                participant1Batch: cleanM1Sec,
                member2Name: cleanM2Name,
                member2Section: cleanM2Sec,
                participant2Name: cleanM2Name,
                participant2Batch: cleanM2Sec,
                email: cleanEmail,
                passwordHash,
                eventId: event.id,
                status: 'active'
            }
        });

        // Audit Log
        await prisma.auditLog.create({
            data: {
                action: 'REGISTER_TEAM',
                targetType: 'teams',
                targetId: newTeam.id,
                details: `Self-registered team ${cleanTeamName} (${year})`
            }
        });

        res.status(201).json({
            success: true,
            message: 'Team registered successfully.',
            team: {
                team_name: cleanTeamName,
                year,
                event_name: event.name,
                member_1_name: cleanM1Name,
                member_1_section: cleanM1Sec,
                member_2_name: cleanM2Name,
                member_2_section: cleanM2Sec
            }
        });
    } catch (err) {
        console.error('Registration error:', err);
        if (err.code === 'P2002' || (err.message && err.message.includes('Unique constraint'))) {
            return res.status(400).json({ error: 'Team name already exists. Please choose a different name.' });
        }
        res.status(500).json({ error: 'Failed to register team. Please try again later.' });
    }
});

router.post('/participant/login', loginLimiter, async (req, res) => {
    try {
        const { year, team_name, password } = req.body;
        if (!team_name || !year || !password) {
            return res.status(400).json({ error: 'Year, Team Name, and Password are required.' });
        }

        // Case-insensitive team name lookup
        const whereClause = {
            teamName: { equals: team_name.trim(), mode: 'insensitive' },
            year
        };
        if (req.body.event_id) {
            whereClause.eventId = parseInt(req.body.event_id);
        }

        const team = await prisma.team.findFirst({
            where: whereClause,
            include: { event: true }
        });
        
        if (!team || team.status === 'disabled' || !bcrypt.compareSync(password, team.passwordHash)) {
            return res.status(401).json({ error: 'Invalid credentials or team disabled' });
        }
        
        const token = jwt.sign(
            { id: team.id, role: 'participant', teamId: team.id, eventId: team.eventId },
            process.env.JWT_SECRET || 'tech-arena-dev-secret-2026',
            { expiresIn: '90m' }
        );

        // Secure HttpOnly session cookie (90 minutes max lifetime)
        const isProd = process.env.NODE_ENV === 'production';
        res.cookie('clash_auth_token', token, {
            httpOnly: true,
            secure: isProd,
            sameSite: isProd ? 'none' : 'lax',
            maxAge: 90 * 60 * 1000 // 90 minutes
        });

        const m1Name = team.member1Name || team.participant1Name;
        const m1Sec = team.member1Section || team.participant1Batch;
        const m2Name = team.member2Name || team.participant2Name;
        const m2Sec = team.member2Section || team.participant2Batch;

        res.json({
            token,
            role: 'participant',
            user: {
                id: team.id,
                role: 'participant',
                teamId: team.id,
                team_name: team.teamName,
                year: team.year,
                eventId: team.eventId,
                event: team.event ? team.event.name : null,
                member_1_name: m1Name,
                member_1_section: m1Sec,
                member_2_name: m2Name,
                member_2_section: m2Sec,
                participant1: m1Name,
                participant2: m2Name
            }
        });
    } catch (err) {
        console.error('Participant login error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// LOGOUT ENDPOINT (clears HttpOnly cookie)
router.post('/logout', (req, res) => {
    const isProd = process.env.NODE_ENV === 'production';
    res.clearCookie('clash_auth_token', {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax'
    });
    res.json({ success: true, message: 'Logged out successfully' });
});

router.get('/me', authenticateToken, async (req, res) => {
    try {
        if (req.user.role === 'admin') {
            const userData = { id: req.user.id, role: 'admin', userId: req.user.userId };
            res.json({ role: 'admin', userId: req.user.userId, user: userData });
        } else if (req.user.role === 'participant') {
            const team = await prisma.team.findUnique({
                where: { id: req.user.teamId },
                include: { event: true }
            });
            if (!team) return res.status(404).json({ error: 'Team not found' });
            
            const m1Name = team.member1Name || team.participant1Name;
            const m1Sec = team.member1Section || team.participant1Batch;
            const m2Name = team.member2Name || team.participant2Name;
            const m2Sec = team.member2Section || team.participant2Batch;

            const userData = {
                id: team.id,
                role: 'participant',
                teamId: team.id,
                team_name: team.teamName,
                year: team.year,
                member_1_name: m1Name,
                member_1_section: m1Sec,
                member_2_name: m2Name,
                member_2_section: m2Sec,
                participant1: m1Name,
                participant2: m2Name,
                event: team.event ? team.event.name : null,
                eventId: team.eventId
            };
            res.json({
                ...userData,
                user: userData
            });
        } else {
            res.status(400).json({ error: 'Unknown role' });
        }
    } catch (err) {
        console.error('/me error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
