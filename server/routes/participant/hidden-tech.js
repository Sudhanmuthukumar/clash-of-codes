const express = require('express');
const router = express.Router();
const { prisma } = require('../../db/database');
const { requireParticipant, requireEventActive, authenticateToken } = require('../../middleware/auth');
const { isQuestionAllocated, allocateQuestions } = require('../../services/questionAllocator');
const { submissionLimiter, actionLimiter } = require('../../middleware/rateLimiter');

router.use(authenticateToken, requireParticipant, requireEventActive);

router.get('/questions', async (req, res) => {
    try {
        const teamId = req.user.teamId;
        const eventId = req.user.eventId;
        const allocations = await prisma.teamQuestionAllocation.findMany({
            where: { 
                teamId,
                question: eventId ? { eventId } : undefined
            },
            select: { questionId: true }
        });
        let qIds = allocations.map(a => a.questionId);
        if (!qIds.length && eventId) {
            qIds = await allocateQuestions(teamId, eventId);
        }
        if (!qIds.length) return res.json([]);

        const questions = await prisma.question.findMany({
            where: {
                id: { in: qIds },
                hiddenTechQuestion: { isNot: null }
            },
            include: {
                hiddenTechQuestion: {
                    include: {
                        subQuestions: {
                            select: { id: true }
                        }
                    }
                }
            },
            orderBy: {
                displayOrder: 'asc'
            }
        });

        const subAttempts = await prisma.hiddenTechSubAttempt.findMany({
            where: { teamId },
            select: { subQuestionId: true }
        });
        const attemptedSubIds = new Set(subAttempts.map(a => a.subQuestionId));

        const result = questions.map(q => {
            const subs = q.hiddenTechQuestion ? q.hiddenTechQuestion.subQuestions : [];
            const subCount = subs.length;
            const attCount = subs.filter(s => attemptedSubIds.has(s.id)).length;
            return {
                id: q.id,
                question_number: q.questionNumber,
                title: q.title,
                display_order: q.displayOrder,
                sub_question_count: subCount,
                attempted_count: attCount
            };
        });

        res.json(result);
    } catch (err) {
        console.error('Hidden tech /questions error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/questions/:id', async (req, res) => {
    try {
        const teamId = req.user.teamId;
        const qId = parseInt(req.params.id);
        const allocated = await isQuestionAllocated(teamId, qId);
        if (!allocated) return res.status(403).json({ error: 'Not allocated' });

        const q = await prisma.question.findUnique({
            where: { id: qId },
            include: {
                hiddenTechQuestion: {
                    include: {
                        subQuestions: {
                            select: {
                                id: true,
                                subQuestionNumber: true,
                                domain: true,
                                questionText: true,
                                displayOrder: true
                            },
                            orderBy: { displayOrder: 'asc' }
                        }
                    }
                }
            }
        });
        if (!q || !q.hiddenTechQuestion) return res.status(404).json({ error: 'Question not found' });

        const subIds = q.hiddenTechQuestion.subQuestions.map(s => s.id);
        const attempts = await prisma.hiddenTechSubAttempt.findMany({
            where: {
                teamId,
                subQuestionId: { in: subIds }
            },
            select: { subQuestionId: true }
        });
        const attemptedMap = new Set(attempts.map(a => a.subQuestionId));

        const subs = q.hiddenTechQuestion.subQuestions.map(s => ({
            id: s.id,
            sub_question_number: s.subQuestionNumber,
            domain: s.domain,
            question_text: s.questionText,
            is_attempted: attemptedMap.has(s.id)
        }));

        const allAttempted = subs.length > 0 && subs.every(s => s.is_attempted);
        const finalAtt = await prisma.hiddenTechFinalAttempt.findUnique({
            where: { teamId_questionId: { teamId, questionId: qId } }
        });

        // Security: NEVER expose correct answers, revealed characters, or final password!
        res.json({
            id: q.id,
            question_number: q.questionNumber,
            title: q.title,
            sub_questions: subs,
            all_attempted: allAttempted,
            has_final_output: !!finalAtt
        });
    } catch (err) {
        console.error('Hidden tech /questions/:id error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/questions/:id/sub/:subId/submit', submissionLimiter, async (req, res) => {
    try {
        const teamId = req.user.teamId;
        const qId = parseInt(req.params.id);
        const subId = parseInt(req.params.subId);

        const allocated = await isQuestionAllocated(teamId, qId);
        if (!allocated) return res.status(403).json({ error: 'Not allocated' });

        const subQ = await prisma.hiddenTechSubQuestion.findFirst({
            where: {
                id: subId,
                mainQuestion: { questionId: qId }
            }
        });
        if (!subQ) return res.status(400).json({ error: 'Invalid sub question' });

        const { answer } = req.body;
        const isCorrect = (answer || '').trim().toLowerCase() === subQ.correctAnswer.toLowerCase() ? 1 : 0;
        let marks = isCorrect ? subQ.marks : 0;

        if (isCorrect) {
            const hintUsages = await prisma.hintUsage.findMany({
                where: { teamId, questionId: qId, subQuestionId: subId },
                select: { penalty: true }
            });
            const hintPenalty = hintUsages.reduce((sum, h) => sum + h.penalty, 0);
            marks = Math.max(0, marks - hintPenalty);
        }

        await prisma.hiddenTechSubAttempt.upsert({
            where: {
                teamId_subQuestionId: { teamId, subQuestionId: subId }
            },
            update: {
                answer: answer || '',
                isCorrect,
                marksAwarded: marks,
                submittedAt: new Date()
            },
            create: {
                teamId,
                subQuestionId: subId,
                answer: answer || '',
                isCorrect,
                marksAwarded: marks,
                submittedAt: new Date()
            }
        });

        // Security: Return ONLY submission status — never correct/wrong, character, or marks
        res.json({ submitted: true, is_attempted: true });
    } catch (err) {
        console.error('Hidden tech sub submit error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/questions/:id/final-output', submissionLimiter, async (req, res) => {
    try {
        const teamId = req.user.teamId;
        const qId = parseInt(req.params.id);

        const allocated = await isQuestionAllocated(teamId, qId);
        if (!allocated) return res.status(403).json({ error: 'Not allocated' });

        const { final_output } = req.body;
        const ht = await prisma.hiddenTechQuestion.findUnique({
            where: { questionId: qId }
        });
        if (!ht) return res.status(404).json({ error: 'Question not found' });

        const isCorrect = (final_output || '').trim().toLowerCase() === ht.finalOutput.toLowerCase() ? 1 : 0;
        const marks = isCorrect ? ht.finalOutputMarks : 0;

        await prisma.hiddenTechFinalAttempt.upsert({
            where: { teamId_questionId: { teamId, questionId: qId } },
            update: {
                finalOutput: final_output || '',
                isCorrect,
                marksAwarded: marks,
                submittedAt: new Date()
            },
            create: {
                teamId,
                questionId: qId,
                finalOutput: final_output || '',
                isCorrect,
                marksAwarded: marks,
                submittedAt: new Date()
            }
        });

        // Security: Return ONLY submitted: true — never reveal correct/wrong
        res.json({ submitted: true });
    } catch (err) {
        console.error('Hidden tech final-output submit error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/questions/:id/sub/:subId/hint', actionLimiter, async (req, res) => {
    try {
        const teamId = req.user.teamId;
        const qId = parseInt(req.params.id);
        const subId = parseInt(req.params.subId);

        const allocated = await isQuestionAllocated(teamId, qId);
        if (!allocated) return res.status(403).json({ error: 'Not allocated' });

        const subQ = await prisma.hiddenTechSubQuestion.findUnique({
            where: { id: subId }
        });
        if (!subQ || !subQ.hint) return res.json({ error: 'No hint available' });

        const existing = await prisma.hintUsage.findUnique({
            where: {
                teamId_questionId_subQuestionId: {
                    teamId,
                    questionId: qId,
                    subQuestionId: subId
                }
            }
        });
        if (existing) return res.json({ hint: subQ.hint, already_used: true });

        await prisma.hintUsage.create({
            data: {
                teamId,
                questionId: qId,
                subQuestionId: subId,
                penalty: subQ.hintPenalty
            }
        });

        res.json({ hint: subQ.hint, used: true });
    } catch (err) {
        console.error('Hidden tech hint error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
