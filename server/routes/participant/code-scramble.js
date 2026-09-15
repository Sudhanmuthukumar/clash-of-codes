const express = require('express');
const router = express.Router();
const { prisma } = require('../../db/database');
const { requireParticipant, requireEventActive, authenticateToken } = require('../../middleware/auth');
const { isQuestionAllocated, allocateQuestions } = require('../../services/questionAllocator');
const { actionLimiter, submissionLimiter } = require('../../middleware/rateLimiter');
const {
    getValidArrangements,
    isArrangementValid,
    computeCorrectPositions,
    resolveClue
} = require('../../utils/scrambleValidator');

router.use(authenticateToken, requireParticipant, requireEventActive);

router.get('/questions', async (req, res) => {
    try {
        const teamId = req.user.teamId;
        const eventId = req.user.eventId;
        let allocations = await prisma.teamQuestionAllocation.findMany({
            where: { 
                teamId,
                question: eventId ? { eventId } : undefined
            },
            orderBy: { displayOrder: 'asc' },
            select: { questionId: true, displayOrder: true }
        });
        
        let qIds = allocations.map(a => a.questionId);
        if ((!qIds.length || qIds.length < 10) && eventId) {
            qIds = await allocateQuestions(teamId, eventId);
            allocations = await prisma.teamQuestionAllocation.findMany({
                where: { 
                    teamId,
                    question: eventId ? { eventId } : undefined
                },
                orderBy: { displayOrder: 'asc' },
                select: { questionId: true, displayOrder: true }
            });
            qIds = allocations.map(a => a.questionId);
        }
        if (!qIds.length) return res.json([]);

        const questions = await prisma.question.findMany({
            where: {
                id: { in: qIds },
                ...(eventId ? { eventId } : {}),
                codeScrambleData: { isNot: null }
            },
            select: {
                id: true,
                questionNumber: true,
                title: true,
                displayOrder: true
            }
        });

        const qMap = new Map(questions.map(q => [q.id, q]));

        const attempts = await prisma.codeScrambleAttempt.findMany({
            where: {
                teamId,
                questionId: { in: qIds }
            }
        });

        const attemptMap = new Map(attempts.map(a => [a.questionId, a]));

        // Order strictly according to the team's persisted allocation displayOrder
        const result = allocations
            .map((alloc, idx) => {
                const q = qMap.get(alloc.questionId);
                if (!q) return null;
                const attempt = attemptMap.get(q.id);
                return {
                    id: q.id,
                    question_number: idx + 1,
                    original_question_number: q.questionNumber,
                    title: q.title,
                    display_order: alloc.displayOrder || idx + 1,
                    is_saved: !!attempt,
                    is_attempted: attempt ? (attempt.isSubmitted === 1 || attempt.swapsCount > 0 || attempt.hintsCount > 0 || attempt.isCorrect === 1) : false
                };
            })
            .filter(Boolean);

        res.json(result);
    } catch (err) {
        console.error('Code scramble /questions error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/questions/:id', async (req, res) => {
    try {
        const teamId = req.user.teamId;
        const qId = parseInt(req.params.id);
        const allocated = await isQuestionAllocated(teamId, qId);
        if (!allocated) {
            return res.status(403).json({ error: 'Not allocated to this team' });
        }

        const q = await prisma.question.findUnique({
            where: { id: qId },
            include: { codeScrambleData: true }
        });
        if (!q || !q.codeScrambleData) return res.status(404).json({ error: 'Question not found' });

        const startingPoints = q.marks || 100;
        const shuffledLines = q.codeScrambleData.shuffledCode.split('\n').filter(l => l !== undefined);
        const validArrangements = getValidArrangements(q.codeScrambleData);
        
        let attempt = await prisma.codeScrambleAttempt.findUnique({
            where: {
                teamId_questionId: { teamId, questionId: qId }
            }
        });

        const defaultOrder = shuffledLines.map((_, i) => i);
        let lineOrder = attempt ? JSON.parse(attempt.lineOrder) : defaultOrder;
        let currentPoints = attempt ? attempt.currentPoints : startingPoints;
        let swapsCount = attempt ? attempt.swapsCount : 0;
        let hintsCount = attempt ? attempt.hintsCount : 0;

        // If no attempt record yet, initialize it
        if (!attempt) {
            try {
                attempt = await prisma.codeScrambleAttempt.create({
                    data: {
                        teamId,
                        questionId: qId,
                        lineOrder: JSON.stringify(defaultOrder),
                        swapsCount: 0,
                        hintsCount: 0,
                        currentPoints: startingPoints
                    }
                });
            } catch (createErr) {
                // If parallel request already created it
                attempt = await prisma.codeScrambleAttempt.findUnique({
                    where: { teamId_questionId: { teamId, questionId: qId } }
                });
            }
        }

        const correctPositions = computeCorrectPositions(lineOrder, shuffledLines, validArrangements);
        const allCorrect = isArrangementValid(lineOrder.map(i => shuffledLines[i]), validArrangements);

        const isSubmitted = attempt ? attempt.isSubmitted === 1 : false;
        const canSwap = currentPoints > 0 && !isSubmitted;
        const canHint = currentPoints > 5 && !isSubmitted && !allCorrect;

        // Expose problem details and authoritative question points to participant
        res.json({
            id: q.id,
            question_number: q.questionNumber,
            title: q.title,
            problem_description: q.codeScrambleData.problemDescription || null,
            shuffled_lines: shuffledLines,
            current_arrangement: lineOrder,
            correct_positions: correctPositions,
            starting_points: startingPoints,
            current_points: currentPoints,
            swaps_count: swapsCount,
            hints_count: hintsCount,
            can_swap: canSwap,
            can_hint: canHint,
            is_submitted: isSubmitted
        });
    } catch (err) {
        console.error('Code scramble /questions/:id error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/questions/:id/save', actionLimiter, async (req, res) => {
    try {
        const teamId = req.user.teamId;
        const qId = parseInt(req.params.id);
        const allocated = await isQuestionAllocated(teamId, qId);
        if (!allocated) {
            return res.status(403).json({ error: 'Not allocated' });
        }

        const q = await prisma.question.findUnique({
            where: { id: qId },
            include: { codeScrambleData: true }
        });
        if (!q || !q.codeScrambleData) return res.status(404).json({ error: 'Question not found' });

        const { line_order } = req.body;
        if (!Array.isArray(line_order)) {
            return res.status(400).json({ error: 'Invalid line_order' });
        }

        const startingPoints = q.marks || 100;
        const shuffledLines = q.codeScrambleData.shuffledCode.split('\n').filter(l => l !== undefined);
        const validArrangements = getValidArrangements(q.codeScrambleData);

        const result = await prisma.$transaction(async (tx) => {
            let attempt = await tx.codeScrambleAttempt.findUnique({
                where: { teamId_questionId: { teamId, questionId: qId } }
            });

            if (attempt && attempt.isSubmitted === 1) {
                throw new Error('Question already submitted');
            }

            let swapsCount = attempt ? attempt.swapsCount : 0;
            let hintsCount = attempt ? attempt.hintsCount : 0;
            let currentPoints = attempt ? attempt.currentPoints : startingPoints;
            const prevOrder = attempt ? JSON.parse(attempt.lineOrder) : [];

            const hasChanged = prevOrder.length !== line_order.length || prevOrder.some((val, idx) => val !== line_order[idx]);

            if (hasChanged) {
                if (currentPoints <= 0) {
                    const err = new Error('Point pool exhausted (0 points). Further reordering locked.');
                    err.statusCode = 400;
                    throw err;
                }
                swapsCount += 1;
                currentPoints = Math.max(0, currentPoints - 1);

                await tx.scoreHistory.create({
                    data: {
                        teamId,
                        questionId: qId,
                        action: 'SWAP_PENALTY',
                        pointsChange: -1
                    }
                });
            }

            const correctPositions = computeCorrectPositions(line_order, shuffledLines, validArrangements);
            const allCorrect = isArrangementValid(line_order.map(i => shuffledLines[i]), validArrangements);
            const isCorrect = allCorrect ? 1 : 0;
            const marks = isCorrect ? currentPoints : 0;

            await tx.codeScrambleAttempt.upsert({
                where: { teamId_questionId: { teamId, questionId: qId } },
                update: {
                    lineOrder: JSON.stringify(line_order),
                    swapsCount,
                    hintsCount,
                    currentPoints,
                    isCorrect,
                    marksAwarded: marks
                },
                create: {
                    teamId,
                    questionId: qId,
                    lineOrder: JSON.stringify(line_order),
                    swapsCount,
                    hintsCount,
                    currentPoints,
                    isCorrect,
                    marksAwarded: marks
                }
            });

            return {
                saved: true,
                line_order: line_order,
                correct_positions: correctPositions,
                starting_points: startingPoints,
                current_points: currentPoints,
                swaps_count: swapsCount,
                hints_count: hintsCount,
                can_swap: currentPoints > 0,
                can_hint: currentPoints > 5 && !allCorrect
            };
        });

        res.json(result);
    } catch (err) {
        if (err.statusCode) {
            return res.status(err.statusCode).json({ error: err.message });
        }
        if (err.message === 'Question already submitted') {
            return res.status(400).json({ error: err.message });
        }
        console.error('Code scramble save error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Alias for explicit swap action
router.post('/questions/:id/swap', actionLimiter, async (req, res) => {
    try {
        const teamId = req.user.teamId;
        const qId = parseInt(req.params.id);
        const allocated = await isQuestionAllocated(teamId, qId);
        if (!allocated) {
            return res.status(403).json({ error: 'Not allocated' });
        }

        const q = await prisma.question.findUnique({
            where: { id: qId },
            include: { codeScrambleData: true }
        });
        if (!q || !q.codeScrambleData) return res.status(404).json({ error: 'Question not found' });

        const startingPoints = q.marks || 100;
        const shuffledLines = q.codeScrambleData.shuffledCode.split('\n').filter(l => l !== undefined);
        const validArrangements = getValidArrangements(q.codeScrambleData);

        let attempt = await prisma.codeScrambleAttempt.findUnique({
            where: { teamId_questionId: { teamId, questionId: qId } }
        });

        if (attempt && attempt.isSubmitted === 1) {
            return res.status(400).json({ error: 'Question already submitted' });
        }

        const defaultOrder = shuffledLines.map((_, i) => i);
        let lineOrder = attempt ? JSON.parse(attempt.lineOrder) : defaultOrder;
        const { indexA, indexB, line_order } = req.body;

        if (typeof indexA === 'number' && typeof indexB === 'number' && indexA >= 0 && indexB >= 0 && indexA < lineOrder.length && indexB < lineOrder.length) {
            if (indexA === indexB) {
                const correctPositions = computeCorrectPositions(lineOrder, shuffledLines, validArrangements);
                const allCorrect = isArrangementValid(lineOrder.map(i => shuffledLines[i]), validArrangements);
                return res.json({
                    swapped: false,
                    line_order: lineOrder,
                    correct_positions: correctPositions,
                    starting_points: startingPoints,
                    current_points: attempt ? attempt.currentPoints : startingPoints,
                    swaps_count: attempt ? attempt.swapsCount : 0,
                    hints_count: attempt ? attempt.hintsCount : 0,
                    can_swap: (attempt ? attempt.currentPoints : startingPoints) > 0,
                    can_hint: (attempt ? attempt.currentPoints : startingPoints) > 5 && !allCorrect
                });
            }
            // True pairwise swap: only lineOrder[indexA] and lineOrder[indexB] exchange positions
            const temp = lineOrder[indexA];
            lineOrder[indexA] = lineOrder[indexB];
            lineOrder[indexB] = temp;
        } else if (Array.isArray(line_order) && line_order.length === defaultOrder.length) {
            lineOrder = line_order;
        } else {
            return res.status(400).json({ error: 'Invalid swap indices or line_order' });
        }

        const result = await prisma.$transaction(async (tx) => {
            let currentAttempt = await tx.codeScrambleAttempt.findUnique({
                where: { teamId_questionId: { teamId, questionId: qId } }
            });

            let swapsCount = currentAttempt ? currentAttempt.swapsCount : 0;
            let hintsCount = currentAttempt ? currentAttempt.hintsCount : 0;
            let currentPoints = currentAttempt ? currentAttempt.currentPoints : startingPoints;

            if (currentPoints <= 0) {
                const err = new Error('Point pool exhausted (0 points). Further swaps locked.');
                err.statusCode = 400;
                throw err;
            }

            swapsCount += 1;
            currentPoints = Math.max(0, currentPoints - 1);

            await tx.scoreHistory.create({
                data: {
                    teamId,
                    questionId: qId,
                    action: 'SWAP_PENALTY',
                    pointsChange: -1
                }
            });

            const correctPositions = computeCorrectPositions(lineOrder, shuffledLines, validArrangements);
            const allCorrect = isArrangementValid(lineOrder.map(i => shuffledLines[i]), validArrangements);
            const isCorrect = allCorrect ? 1 : 0;
            const marks = isCorrect ? currentPoints : 0;

            await tx.codeScrambleAttempt.upsert({
                where: { teamId_questionId: { teamId, questionId: qId } },
                update: {
                    lineOrder: JSON.stringify(lineOrder),
                    swapsCount,
                    hintsCount,
                    currentPoints,
                    isCorrect,
                    marksAwarded: marks
                },
                create: {
                    teamId,
                    questionId: qId,
                    lineOrder: JSON.stringify(lineOrder),
                    swapsCount,
                    hintsCount,
                    currentPoints,
                    isCorrect,
                    marksAwarded: marks
                }
            });

            return {
                swapped: true,
                line_order: lineOrder,
                correct_positions: correctPositions,
                starting_points: startingPoints,
                current_points: currentPoints,
                swaps_count: swapsCount,
                hints_count: hintsCount,
                can_swap: currentPoints > 0,
                can_hint: currentPoints > 5 && !allCorrect
            };
        });

        res.json(result);
    } catch (err) {
        if (err.statusCode) {
            return res.status(err.statusCode).json({ error: err.message });
        }
        console.error('Code scramble swap error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/questions/:id/hint', actionLimiter, async (req, res) => {
    try {
        const teamId = req.user.teamId;
        const qId = parseInt(req.params.id);
        const allocated = await isQuestionAllocated(teamId, qId);
        if (!allocated) {
            return res.status(403).json({ error: 'Not allocated' });
        }

        const q = await prisma.question.findUnique({
            where: { id: qId },
            include: { codeScrambleData: true }
        });
        if (!q || !q.codeScrambleData) return res.status(404).json({ error: 'Question not found' });

        const startingPoints = q.marks || 100;
        const shuffledLines = q.codeScrambleData.shuffledCode.split('\n').filter(l => l !== undefined);
        const validArrangements = getValidArrangements(q.codeScrambleData);

        const result = await prisma.$transaction(async (tx) => {
            let attempt = await tx.codeScrambleAttempt.findUnique({
                where: { teamId_questionId: { teamId, questionId: qId } }
            });

            if (attempt && attempt.isSubmitted === 1) {
                const err = new Error('Question already submitted');
                err.statusCode = 400;
                throw err;
            }

            let currentPoints = attempt ? attempt.currentPoints : startingPoints;
            let swapsCount = attempt ? attempt.swapsCount : 0;
            let hintsCount = attempt ? attempt.hintsCount : 0;

            if (currentPoints <= 5) {
                const err = new Error('Hint unavailable: insufficient points (5 or fewer points remaining).');
                err.statusCode = 400;
                throw err;
            }

            const defaultOrder = shuffledLines.map((_, i) => i);
            let lineOrder = attempt ? JSON.parse(attempt.lineOrder) : defaultOrder;

            const clueRes = resolveClue(lineOrder, shuffledLines, validArrangements);
            if (clueRes.allAligned) {
                return {
                    message: 'All lines are already in correct position!',
                    correct_positions: lineOrder.map(() => true),
                    can_swap: currentPoints > 0,
                    can_hint: false
                };
            }

            if (clueRes.sourceIdx !== -1 && clueRes.targetIdx !== -1) {
                const temp = lineOrder[clueRes.targetIdx];
                lineOrder[clueRes.targetIdx] = lineOrder[clueRes.sourceIdx];
                lineOrder[clueRes.sourceIdx] = temp;
            }

            currentPoints = Math.max(0, currentPoints - 5);
            hintsCount += 1;

            await tx.scoreHistory.create({
                data: {
                    teamId,
                    questionId: qId,
                    action: 'HINT_DEDUCTION',
                    pointsChange: -5
                }
            });

            await tx.hintUsage.create({
                data: {
                    teamId,
                    questionId: qId,
                    penalty: 5
                }
            });

            const correctPositions = computeCorrectPositions(lineOrder, shuffledLines, validArrangements);
            const allCorrect = isArrangementValid(lineOrder.map(i => shuffledLines[i]), validArrangements);
            const isCorrect = allCorrect ? 1 : 0;
            const marks = isCorrect ? currentPoints : 0;

            await tx.codeScrambleAttempt.upsert({
                where: { teamId_questionId: { teamId, questionId: qId } },
                update: {
                    lineOrder: JSON.stringify(lineOrder),
                    swapsCount,
                    hintsCount,
                    currentPoints,
                    isCorrect,
                    marksAwarded: marks
                },
                create: {
                    teamId,
                    questionId: qId,
                    lineOrder: JSON.stringify(lineOrder),
                    swapsCount,
                    hintsCount,
                    currentPoints,
                    isCorrect,
                    marksAwarded: marks
                }
            });

            return {
                success: true,
                line_order: lineOrder,
                correct_positions: correctPositions,
                placed_index: clueRes.targetIdx,
                starting_points: startingPoints,
                current_points: currentPoints,
                swaps_count: swapsCount,
                hints_count: hintsCount,
                can_swap: currentPoints > 0,
                can_hint: currentPoints > 5 && !allCorrect
            };
        });

        res.json(result);
    } catch (err) {
        if (err.statusCode) {
            return res.status(err.statusCode).json({ error: err.message });
        }
        console.error('Code scramble hint error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/questions/:id/submit', submissionLimiter, async (req, res) => {
    try {
        const teamId = req.user.teamId;
        const qId = parseInt(req.params.id);
        const allocated = await isQuestionAllocated(teamId, qId);
        if (!allocated) {
            return res.status(403).json({ error: 'Not allocated' });
        }

        const existing = await prisma.codeScrambleAttempt.findUnique({
            where: { teamId_questionId: { teamId, questionId: qId } }
        });
        if (existing && existing.isSubmitted === 1) {
            return res.status(400).json({ error: 'Already submitted' });
        }

        const { line_order } = req.body;
        if (!Array.isArray(line_order)) {
            return res.status(400).json({ error: 'Invalid line_order' });
        }

        const q = await prisma.question.findUnique({
            where: { id: qId },
            include: { codeScrambleData: true }
        });
        if (!q || !q.codeScrambleData) return res.status(404).json({ error: 'Question not found' });

        const shuffledLines = q.codeScrambleData.shuffledCode.split('\n').filter(l => l !== undefined);
        const validArrangements = getValidArrangements(q.codeScrambleData);
        const arrangedLines = line_order.map(i => shuffledLines[i]);

        const isCorrect = isArrangementValid(arrangedLines, validArrangements) ? 1 : 0;
        const remainingPoints = existing ? existing.currentPoints : (q.marks || 100);
        const marks = isCorrect ? remainingPoints : 0;

        await prisma.$transaction(async (tx) => {
            await tx.codeScrambleAttempt.upsert({
                where: { teamId_questionId: { teamId, questionId: qId } },
                update: {
                    lineOrder: JSON.stringify(line_order),
                    isSubmitted: 1,
                    isCorrect,
                    marksAwarded: marks,
                    submittedAt: new Date()
                },
                create: {
                    teamId,
                    questionId: qId,
                    lineOrder: JSON.stringify(line_order),
                    isSubmitted: 1,
                    isCorrect,
                    marksAwarded: marks,
                    submittedAt: new Date()
                }
            });

            await tx.scoreHistory.create({
                data: {
                    teamId,
                    questionId: qId,
                    action: 'SUBMIT_CS',
                    pointsChange: marks
                }
            });
        });

        // Security: Return ONLY submission status — never marks, correct/wrong
        res.json({ submitted: true });
    } catch (err) {
        console.error('Code scramble submit error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
