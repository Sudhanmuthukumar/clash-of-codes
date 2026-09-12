const express = require('express');
const router = express.Router();
const { prisma } = require('../../db/database');
const { requireAdmin, authenticateToken } = require('../../middleware/auth');

router.use(authenticateToken, requireAdmin);

router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;
        
        const logs = await prisma.auditLog.findMany({
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
                admin: {
                    select: { userId: true }
                }
            }
        });

        const formatted = logs.map(l => ({
            id: l.id,
            admin_id: l.adminId,
            action: l.action,
            target_type: l.targetType,
            target_id: l.targetId,
            details: l.details,
            created_at: l.createdAt.toISOString(),
            admin_user_id: l.admin ? l.admin.userId : null
        }));

        res.json(formatted);
    } catch (err) {
        console.error('Admin get audit error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
