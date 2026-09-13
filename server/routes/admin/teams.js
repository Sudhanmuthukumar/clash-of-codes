const express = require('express');
const router = express.Router();
const { prisma } = require('../../db/database');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { requireAdmin, authenticateToken } = require('../../middleware/auth');

router.use(authenticateToken, requireAdmin);

// Sections management for admin
router.get('/sections', async (req, res) => {
    try {
        const sections = await prisma.section.findMany({
            orderBy: { name: 'asc' }
        });
        res.json(sections);
    } catch (err) {
        console.error('Admin get sections error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/sections', async (req, res) => {
    try {
        const { name } = req.body;
        if (!name || !name.trim()) return res.status(400).json({ error: 'Section name required' });
        const cleanName = name.trim().toUpperCase();
        
        await prisma.section.upsert({
            where: { name: cleanName },
            update: { isActive: 1 },
            create: { name: cleanName, isActive: 1 }
        });

        await prisma.auditLog.create({
            data: {
                adminId: req.user.id,
                action: 'CREATE_SECTION',
                targetType: 'sections',
                details: `Added section ${cleanName}`
            }
        });
        
        res.json({ message: 'Section added successfully', name: cleanName });
    } catch (err) {
        console.error('Admin add section error:', err);
        res.status(400).json({ error: err.message });
    }
});

router.delete('/sections/:name', async (req, res) => {
    try {
        const name = req.params.name.toUpperCase();
        await prisma.section.deleteMany({
            where: { name }
        });

        await prisma.auditLog.create({
            data: {
                adminId: req.user.id,
                action: 'DELETE_SECTION',
                targetType: 'sections',
                details: `Removed section ${name}`
            }
        });
        res.json({ message: 'Section removed successfully' });
    } catch (err) {
        console.error('Admin delete section error:', err);
        res.status(400).json({ error: err.message });
    }
});

router.get('/', async (req, res) => {
    try {
        const { search, year, event_id, status } = req.query;

        const where = {};
        if (search) {
            where.OR = [
                { teamName: { contains: search, mode: 'insensitive' } },
                { member1Name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } }
            ];
        }
        if (year) where.year = year;
        if (event_id) where.eventId = parseInt(event_id);
        if (status) where.status = status;

        const teams = await prisma.team.findMany({
            where,
            include: { event: true },
            orderBy: { createdAt: 'desc' }
        });

        const formatted = teams.map(t => {
            const m1Name = t.member1Name || t.participant1Name;
            const m1Sec = t.member1Section || t.participant1Batch;
            const m2Name = t.member2Name || t.participant2Name;
            const m2Sec = t.member2Section || t.participant2Batch;

            return {
                id: t.id,
                year: t.year,
                team_name: t.teamName,
                email: t.email,
                event_id: t.eventId,
                event_name: t.event ? t.event.name : null,
                status: t.status,
                event_started_at: t.eventStartedAt ? t.eventStartedAt.toISOString() : null,
                event_submitted_at: t.eventSubmittedAt ? t.eventSubmittedAt.toISOString() : null,
                created_at: t.createdAt.toISOString(),
                updated_at: t.updatedAt.toISOString(),
                member_1_name: m1Name,
                member_1_section: m1Sec,
                member_2_name: m2Name,
                member_2_section: m2Sec,
                participant_1_name: m1Name,
                participant_1_batch: m1Sec,
                participant_2_name: m2Name,
                participant_2_batch: m2Sec,
                p1_name: m1Name,
                p1_batch: m1Sec,
                p2_name: m2Name,
                p2_batch: m2Sec,
                registration_time: t.createdAt.toISOString()
            };
        });

        res.json(formatted);
    } catch (err) {
        console.error('Admin get teams error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/', async (req, res) => {
    try {
        const { year, team_name, email } = req.body;
        const m1_name = (req.body.member_1_name || req.body.participant_1_name || req.body.p1_name || '').trim();
        const m1_section = (req.body.member_1_section || req.body.participant_1_batch || req.body.p1_batch || '').trim();
        const rawM2Name = req.body.member_2_name !== undefined ? req.body.member_2_name : (req.body.participant_2_name || req.body.p2_name);
        const rawM2Sec = req.body.member_2_section !== undefined ? req.body.member_2_section : (req.body.participant_2_batch || req.body.p2_batch);

        const m2_name = (rawM2Name && rawM2Name.trim()) ? rawM2Name.trim() : null;
        const m2_section = (rawM2Sec && rawM2Sec.trim()) ? rawM2Sec.trim() : null;

        if (!year || !team_name || !m1_name || !m1_section || !email) {
            return res.status(400).json({ error: 'Missing required fields (Year, Team Name, Member 1 Name, Member 1 Section, Email)' });
        }

        const cleanTeamName = team_name.trim();

        // Case-insensitive team name uniqueness check
        const existing = await prisma.team.findFirst({
            where: {
                teamName: {
                    equals: cleanTeamName,
                    mode: 'insensitive'
                }
            }
        });
        if (existing) {
            return res.status(400).json({ error: `Team name "${cleanTeamName}" already exists.` });
        }

        let event = null;
        if (req.body.event_id) {
            event = await prisma.event.findUnique({ where: { id: parseInt(req.body.event_id) } });
        } else {
            event = await prisma.event.findFirst({ where: { year } });
        }
        if (!event) return res.status(400).json({ error: 'No event found for this selection' });

        const pwd = crypto.randomBytes(4).toString('hex');
        const hash = bcrypt.hashSync(pwd, 12);

        const newTeam = await prisma.team.create({
            data: {
                year,
                teamName: cleanTeamName,
                member1Name: m1_name,
                member1Section: m1_section,
                participant1Name: m1_name,
                participant1Batch: m1_section,
                member2Name: m2_name,
                member2Section: m2_section,
                participant2Name: m2_name,
                participant2Batch: m2_section,
                email: email.trim(),
                passwordHash: hash,
                eventId: event.id,
                status: 'active'
            }
        });

        await prisma.auditLog.create({
            data: {
                adminId: req.user.id,
                action: 'CREATE_TEAM',
                targetType: 'teams',
                targetId: newTeam.id,
                details: 'Created team ' + cleanTeamName
            }
        });

        res.json({
            message: 'Team created successfully',
            teamId: newTeam.id,
            password: pwd,
            team_name: cleanTeamName
        });
    } catch (err) {
        console.error('Admin create team error:', err);
        res.status(400).json({ error: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const teamId = parseInt(req.params.id);
        const team = await prisma.team.findUnique({
            where: { id: teamId },
            include: {
                event: true,
                allocations: {
                    select: { questionId: true }
                }
            }
        });

        if (!team) return res.status(404).json({ error: 'Team not found' });

        const m1Name = team.member1Name || team.participant1Name;
        const m1Sec = team.member1Section || team.participant1Batch;
        const m2Name = team.member2Name || team.participant2Name;
        const m2Sec = team.member2Section || team.participant2Batch;

        const formatted = {
            id: team.id,
            year: team.year,
            team_name: team.teamName,
            email: team.email,
            event_id: team.eventId,
            event_name: team.event ? team.event.name : null,
            status: team.status,
            event_started_at: team.eventStartedAt ? team.eventStartedAt.toISOString() : null,
            event_submitted_at: team.eventSubmittedAt ? team.eventSubmittedAt.toISOString() : null,
            created_at: team.createdAt.toISOString(),
            updated_at: team.updatedAt.toISOString(),
            member_1_name: m1Name,
            member_1_section: m1Sec,
            member_2_name: m2Name,
            member_2_section: m2Sec,
            participant_1_name: m1Name,
            participant_1_batch: m1Sec,
            participant_2_name: m2Name,
            participant_2_batch: m2Sec,
            allocated_questions: team.allocations.map(a => a.questionId)
        };

        res.json(formatted);
    } catch (err) {
        console.error('Admin get team detail error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const teamId = parseInt(req.params.id);
        const { team_name, email } = req.body;
        const m1_name = req.body.member_1_name || req.body.participant_1_name || req.body.p1_name;
        const m1_section = req.body.member_1_section || req.body.participant_1_batch || req.body.p1_batch;
        const m2_name = req.body.member_2_name !== undefined ? req.body.member_2_name : (req.body.participant_2_name || req.body.p2_name);
        const m2_section = req.body.member_2_section !== undefined ? req.body.member_2_section : (req.body.participant_2_batch || req.body.p2_batch);

        const current = await prisma.team.findUnique({ where: { id: teamId } });
        if (!current) return res.status(404).json({ error: 'Team not found' });

        if (team_name && team_name.trim().toLowerCase() !== current.teamName.toLowerCase()) {
            const existing = await prisma.team.findFirst({
                where: {
                    teamName: { equals: team_name.trim(), mode: 'insensitive' },
                    id: { not: teamId }
                }
            });
            if (existing) return res.status(400).json({ error: 'Team name already exists' });
        }

        const updateData = {};
        if (team_name) updateData.teamName = team_name.trim();
        if (email) updateData.email = email.trim();
        if (m1_name) {
            updateData.member1Name = m1_name.trim();
            updateData.participant1Name = m1_name.trim();
        }
        if (m1_section) {
            updateData.member1Section = m1_section.trim();
            updateData.participant1Batch = m1_section.trim();
        }
        if (m2_name !== undefined) {
            updateData.member2Name = m2_name ? m2_name.trim() : null;
            updateData.participant2Name = m2_name ? m2_name.trim() : null;
        }
        if (m2_section !== undefined) {
            updateData.member2Section = m2_section ? m2_section.trim() : null;
            updateData.participant2Batch = m2_section ? m2_section.trim() : null;
        }
        if (req.body.event_id) {
            updateData.eventId = parseInt(req.body.event_id);
        }

        await prisma.team.update({
            where: { id: teamId },
            data: updateData
        });

        await prisma.auditLog.create({
            data: {
                adminId: req.user.id,
                action: 'UPDATE_TEAM',
                targetType: 'teams',
                targetId: teamId,
                details: 'Updated team ' + (team_name || current.teamName)
            }
        });

        res.json({ message: 'Team updated successfully' });
    } catch (err) {
        console.error('Admin update team error:', err);
        res.status(400).json({ error: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const teamId = parseInt(req.params.id);
        const team = await prisma.team.findUnique({ where: { id: teamId } });
        if (!team) return res.status(404).json({ error: 'Team not found' });

        await prisma.team.delete({ where: { id: teamId } });

        await prisma.auditLog.create({
            data: {
                adminId: req.user.id,
                action: 'DELETE_TEAM',
                targetType: 'teams',
                targetId: teamId,
                details: 'Deleted team ' + team.teamName
            }
        });

        res.json({ message: 'Team deleted successfully' });
    } catch (err) {
        console.error('Admin delete team error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/:id/reset-password', async (req, res) => {
    try {
        const teamId = parseInt(req.params.id);
        const team = await prisma.team.findUnique({ where: { id: teamId } });
        if (!team) return res.status(404).json({ error: 'Team not found' });

        const pwd = crypto.randomBytes(4).toString('hex');
        const hash = bcrypt.hashSync(pwd, 12);
        await prisma.team.update({
            where: { id: teamId },
            data: { passwordHash: hash }
        });

        await prisma.auditLog.create({
            data: {
                adminId: req.user.id,
                action: 'RESET_PASSWORD',
                targetType: 'teams',
                targetId: teamId,
                details: 'Reset password for ' + team.teamName
            }
        });

        res.json({ message: 'Password reset successfully', new_password: pwd });
    } catch (err) {
        console.error('Admin reset password error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.put('/:id/status', async (req, res) => {
    try {
        const teamId = parseInt(req.params.id);
        const { status } = req.body;
        if (!['active', 'disabled'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status. Use active or disabled.' });
        }

        const team = await prisma.team.findUnique({ where: { id: teamId } });
        if (!team) return res.status(404).json({ error: 'Team not found' });

        await prisma.team.update({
            where: { id: teamId },
            data: { status }
        });

        await prisma.auditLog.create({
            data: {
                adminId: req.user.id,
                action: 'UPDATE_STATUS',
                targetType: 'teams',
                targetId: teamId,
                details: `${team.teamName} status changed to ${status}`
            }
        });

        res.json({ message: 'Status updated to ' + status });
    } catch (err) {
        console.error('Admin update team status error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
