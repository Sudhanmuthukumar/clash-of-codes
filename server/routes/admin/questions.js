const express = require('express');
const router = express.Router();
const { prisma } = require('../../db/database');
const { requireAdmin, authenticateToken } = require('../../middleware/auth');

router.use(authenticateToken, requireAdmin);

router.get('/', async (req, res) => {
    try {
        const event_id = req.query.event_id ? parseInt(req.query.event_id) : undefined;
        const questions = await prisma.question.findMany({
            where: event_id ? { eventId: event_id } : undefined,
            include: {
                codeScrambleData: true,
                hiddenTechQuestion: {
                    include: {
                        subQuestions: {
                            orderBy: { displayOrder: 'asc' }
                        }
                    }
                }
            },
            orderBy: { displayOrder: 'asc' }
        });

        const formatted = questions.map(q => {
            const resQ = {
                id: q.id,
                event_id: q.eventId,
                question_number: q.questionNumber,
                title: q.title,
                marks: q.marks,
                hint: q.hint,
                hint_penalty: q.hintPenalty,
                is_active: q.isActive,
                display_order: q.displayOrder,
                created_at: q.createdAt,
                updated_at: q.updatedAt
            };

            if (q.codeScrambleData) {
                resQ.type = 'code_scramble';
                resQ.code_scramble_data = {
                    id: q.codeScrambleData.id,
                    question_id: q.codeScrambleData.questionId,
                    problem_description: q.codeScrambleData.problemDescription,
                    final_code: q.codeScrambleData.finalCode,
                    shuffled_code: q.codeScrambleData.shuffledCode,
                    first_line: q.codeScrambleData.firstLine,
                    first_line_penalty: q.codeScrambleData.firstLinePenalty
                };
            } else if (q.hiddenTechQuestion) {
                resQ.type = 'hidden_tech';
                resQ.hidden_tech_data = {
                    id: q.hiddenTechQuestion.id,
                    question_id: q.hiddenTechQuestion.questionId,
                    final_output: q.hiddenTechQuestion.finalOutput,
                    final_output_marks: q.hiddenTechQuestion.finalOutputMarks,
                    sub_questions: q.hiddenTechQuestion.subQuestions.map(s => ({
                        id: s.id,
                        main_question_id: s.mainQuestionId,
                        sub_question_number: s.subQuestionNumber,
                        domain: s.domain,
                        question_text: s.questionText,
                        correct_answer: s.correctAnswer,
                        revealed_character: s.revealedCharacter,
                        marks: s.marks,
                        hint: s.hint,
                        hint_penalty: s.hintPenalty,
                        display_order: s.displayOrder
                    }))
                };
            }

            return resQ;
        });

        res.json(formatted);
    } catch (err) {
        console.error('Admin get questions error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/code-scramble', async (req, res) => {
    try {
        const { event_id, question_number, title, marks, final_code, shuffled_code, hint, hint_penalty, first_line_penalty, problem_description } = req.body;

        if (!event_id || !final_code || !shuffled_code) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const eventId = parseInt(event_id);
        const first_line = final_code.split('\n').find(l => l.trim() !== '') || '';

        const result = await prisma.$transaction(async (tx) => {
            const maxOrderAgg = await tx.question.aggregate({
                where: { eventId },
                _max: { displayOrder: true, questionNumber: true }
            });
            const maxOrder = maxOrderAgg._max.displayOrder || 0;
            const maxNum = maxOrderAgg._max.questionNumber || 0;
            const qNum = question_number ? parseInt(question_number) : (maxNum + 1);

            const q = await tx.question.create({
                data: {
                    eventId,
                    questionNumber: qNum,
                    title: title || `Question ${qNum}`,
                    marks: marks ? parseInt(marks) : 100,
                    hint: hint || null,
                    hintPenalty: hint_penalty ? parseInt(hint_penalty) : 0,
                    displayOrder: maxOrder + 1,
                    codeScrambleData: {
                        create: {
                            problemDescription: problem_description || null,
                            finalCode: final_code,
                            shuffledCode: shuffled_code,
                            firstLine: first_line,
                            firstLinePenalty: first_line_penalty ? parseInt(first_line_penalty) : 1
                        }
                    }
                }
            });

            await tx.auditLog.create({
                data: {
                    adminId: req.user.id,
                    action: 'CREATE_CS_QUESTION',
                    targetType: 'questions',
                    targetId: q.id,
                    details: title || `CS Q${qNum}`
                }
            });

            return q;
        });

        res.json({ message: 'Code Scramble question created', id: result.id });
    } catch (err) {
        console.error('Admin create CS question error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/hidden-tech', async (req, res) => {
    try {
        const { event_id, question_number, title, marks, final_output, final_output_marks, sub_questions } = req.body;

        if (!event_id || !final_output || !sub_questions || sub_questions.length === 0) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const eventId = parseInt(event_id);

        const result = await prisma.$transaction(async (tx) => {
            const maxOrderAgg = await tx.question.aggregate({
                where: { eventId },
                _max: { displayOrder: true, questionNumber: true }
            });
            const maxOrder = maxOrderAgg._max.displayOrder || 0;
            const maxNum = maxOrderAgg._max.questionNumber || 0;
            const qNum = question_number ? parseInt(question_number) : (maxNum + 1);

            const q = await tx.question.create({
                data: {
                    eventId,
                    questionNumber: qNum,
                    title: title || `Question ${qNum}`,
                    marks: marks ? parseInt(marks) : 10,
                    displayOrder: maxOrder + 1,
                    hiddenTechQuestion: {
                        create: {
                            finalOutput: final_output,
                            finalOutputMarks: final_output_marks ? parseInt(final_output_marks) : 5,
                            subQuestions: {
                                create: sub_questions.map((sq, idx) => ({
                                    subQuestionNumber: sq.sub_question_number || idx + 1,
                                    domain: sq.domain || 'General CS',
                                    questionText: sq.question_text,
                                    correctAnswer: sq.correct_answer,
                                    revealedCharacter: sq.revealed_character || '?',
                                    marks: sq.marks ? parseInt(sq.marks) : 5,
                                    hint: sq.hint || null,
                                    hintPenalty: sq.hint_penalty ? parseInt(sq.hint_penalty) : 0,
                                    displayOrder: idx + 1
                                }))
                            }
                        }
                    }
                }
            });

            await tx.auditLog.create({
                data: {
                    adminId: req.user.id,
                    action: 'CREATE_HT_QUESTION',
                    targetType: 'questions',
                    targetId: q.id,
                    details: title || `HT Q${qNum}`
                }
            });

            return q;
        });

        res.json({ message: 'Hidden Tech question created', id: result.id });
    } catch (err) {
        console.error('Admin create HT question error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const qId = parseInt(req.params.id);
        const q = await prisma.question.findUnique({
            where: { id: qId },
            include: {
                codeScrambleData: true,
                hiddenTechQuestion: {
                    include: {
                        subQuestions: {
                            orderBy: { displayOrder: 'asc' }
                        }
                    }
                }
            }
        });
        if (!q) return res.status(404).json({ error: 'Question not found' });

        const resQ = {
            id: q.id,
            event_id: q.eventId,
            question_number: q.questionNumber,
            title: q.title,
            marks: q.marks,
            hint: q.hint,
            hint_penalty: q.hintPenalty,
            is_active: q.isActive,
            display_order: q.displayOrder,
            created_at: q.createdAt,
            updated_at: q.updatedAt
        };

        if (q.codeScrambleData) {
            resQ.type = 'code_scramble';
            resQ.code_scramble_data = {
                id: q.codeScrambleData.id,
                question_id: q.codeScrambleData.questionId,
                problem_description: q.codeScrambleData.problemDescription,
                final_code: q.codeScrambleData.finalCode,
                shuffled_code: q.codeScrambleData.shuffledCode,
                first_line: q.codeScrambleData.firstLine,
                first_line_penalty: q.codeScrambleData.firstLinePenalty
            };
        } else if (q.hiddenTechQuestion) {
            resQ.type = 'hidden_tech';
            resQ.hidden_tech_data = {
                id: q.hiddenTechQuestion.id,
                question_id: q.hiddenTechQuestion.questionId,
                final_output: q.hiddenTechQuestion.finalOutput,
                final_output_marks: q.hiddenTechQuestion.finalOutputMarks,
                sub_questions: q.hiddenTechQuestion.subQuestions.map(s => ({
                    id: s.id,
                    main_question_id: s.mainQuestionId,
                    sub_question_number: s.subQuestionNumber,
                    domain: s.domain,
                    question_text: s.questionText,
                    correct_answer: s.correctAnswer,
                    revealed_character: s.revealedCharacter,
                    marks: s.marks,
                    hint: s.hint,
                    hint_penalty: s.hintPenalty,
                    display_order: s.displayOrder
                }))
            };
        }

        res.json(resQ);
    } catch (err) {
        console.error('Admin get question detail error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const qId = parseInt(req.params.id);
        const q = await prisma.question.findUnique({
            where: { id: qId },
            include: { codeScrambleData: true, hiddenTechQuestion: true }
        });
        if (!q) return res.status(404).json({ error: 'Question not found' });

        const { title, marks, hint, hint_penalty, question_number, problem_description } = req.body;

        await prisma.$transaction(async (tx) => {
            await tx.question.update({
                where: { id: qId },
                data: {
                    title: title || q.title,
                    marks: marks ? parseInt(marks) : q.marks,
                    hint: hint !== undefined ? hint : q.hint,
                    hintPenalty: hint_penalty !== undefined ? parseInt(hint_penalty) : q.hintPenalty,
                    questionNumber: question_number ? parseInt(question_number) : q.questionNumber
                }
            });

            if (q.codeScrambleData) {
                const updateCS = {};
                if (problem_description !== undefined) updateCS.problemDescription = problem_description;
                if (req.body.final_code) {
                    updateCS.finalCode = req.body.final_code;
                    updateCS.firstLine = req.body.final_code.split('\n').find(l => l.trim() !== '') || '';
                }
                if (req.body.shuffled_code) updateCS.shuffledCode = req.body.shuffled_code;
                if (req.body.first_line_penalty !== undefined) updateCS.firstLinePenalty = parseInt(req.body.first_line_penalty);

                if (Object.keys(updateCS).length > 0) {
                    await tx.codeScrambleData.update({
                        where: { questionId: qId },
                        data: updateCS
                    });
                }
            }

            if (q.hiddenTechQuestion) {
                const htId = q.hiddenTechQuestion.id;
                if (req.body.final_output || req.body.final_output_marks !== undefined) {
                    await tx.hiddenTechQuestion.update({
                        where: { questionId: qId },
                        data: {
                            finalOutput: req.body.final_output || q.hiddenTechQuestion.finalOutput,
                            finalOutputMarks: req.body.final_output_marks ? parseInt(req.body.final_output_marks) : q.hiddenTechQuestion.finalOutputMarks
                        }
                    });
                }

                if (req.body.sub_questions && Array.isArray(req.body.sub_questions)) {
                    await tx.hiddenTechSubQuestion.deleteMany({
                        where: { mainQuestionId: htId }
                    });
                    for (let idx = 0; idx < req.body.sub_questions.length; idx++) {
                        const sq = req.body.sub_questions[idx];
                        await tx.hiddenTechSubQuestion.create({
                            data: {
                                mainQuestionId: htId,
                                subQuestionNumber: sq.sub_question_number || idx + 1,
                                domain: sq.domain || 'General CS',
                                questionText: sq.question_text,
                                correctAnswer: sq.correct_answer,
                                revealedCharacter: sq.revealed_character || '?',
                                marks: sq.marks ? parseInt(sq.marks) : 5,
                                hint: sq.hint || null,
                                hintPenalty: sq.hint_penalty ? parseInt(sq.hint_penalty) : 0,
                                displayOrder: idx + 1
                            }
                        });
                    }
                }
            }

            await tx.auditLog.create({
                data: {
                    adminId: req.user.id,
                    action: 'UPDATE_QUESTION',
                    targetType: 'questions',
                    targetId: qId,
                    details: `Updated question ${qId}`
                }
            });
        });

        res.json({ message: 'Question updated' });
    } catch (err) {
        console.error('Admin update question error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const qId = parseInt(req.params.id);
        await prisma.question.delete({ where: { id: qId } });
        await prisma.auditLog.create({
            data: {
                adminId: req.user.id,
                action: 'DELETE_QUESTION',
                targetType: 'questions',
                targetId: qId,
                details: 'Deleted question'
            }
        });
        res.json({ message: 'Question deleted' });
    } catch (err) {
        console.error('Admin delete question error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.put('/:id/toggle', async (req, res) => {
    try {
        const qId = parseInt(req.params.id);
        const q = await prisma.question.findUnique({ where: { id: qId } });
        if (!q) return res.status(404).json({ error: 'Question not found' });

        const newActive = q.isActive === 1 ? 0 : 1;
        await prisma.question.update({
            where: { id: qId },
            data: { isActive: newActive }
        });

        await prisma.auditLog.create({
            data: {
                adminId: req.user.id,
                action: 'TOGGLE_QUESTION',
                targetType: 'questions',
                targetId: qId,
                details: `Toggled question active status to ${newActive}`
            }
        });

        res.json({ message: 'Question toggled' });
    } catch (err) {
        console.error('Admin toggle question error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.put('/reorder', async (req, res) => {
    try {
        const { questionIds } = req.body;
        if (!Array.isArray(questionIds)) return res.status(400).json({ error: 'Invalid questionIds' });

        await prisma.$transaction(
            questionIds.map((id, idx) =>
                prisma.question.update({
                    where: { id: parseInt(id) },
                    data: { displayOrder: idx + 1 }
                })
            )
        );

        res.json({ message: 'Questions reordered' });
    } catch (err) {
        console.error('Admin reorder questions error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/:id/duplicate', async (req, res) => {
    try {
        const qId = parseInt(req.params.id);
        const q = await prisma.question.findUnique({
            where: { id: qId },
            include: {
                codeScrambleData: true,
                hiddenTechQuestion: {
                    include: { subQuestions: true }
                }
            }
        });
        if (!q) return res.status(404).json({ error: 'Question not found' });

        const result = await prisma.$transaction(async (tx) => {
            const maxOrderAgg = await tx.question.aggregate({
                where: { eventId: q.eventId },
                _max: { displayOrder: true, questionNumber: true }
            });
            const maxOrder = maxOrderAgg._max.displayOrder || 0;
            const maxNum = maxOrderAgg._max.questionNumber || 0;

            const newQ = await tx.question.create({
                data: {
                    eventId: q.eventId,
                    questionNumber: maxNum + 1,
                    title: `${q.title} (Copy)`,
                    marks: q.marks,
                    hint: q.hint,
                    hintPenalty: q.hintPenalty,
                    displayOrder: maxOrder + 1
                }
            });

            if (q.codeScrambleData) {
                await tx.codeScrambleData.create({
                    data: {
                        questionId: newQ.id,
                        problemDescription: q.codeScrambleData.problemDescription,
                        finalCode: q.codeScrambleData.finalCode,
                        shuffledCode: q.codeScrambleData.shuffledCode,
                        firstLine: q.codeScrambleData.firstLine,
                        firstLinePenalty: q.codeScrambleData.firstLinePenalty
                    }
                });
            } else if (q.hiddenTechQuestion) {
                const newHt = await tx.hiddenTechQuestion.create({
                    data: {
                        questionId: newQ.id,
                        finalOutput: q.hiddenTechQuestion.finalOutput,
                        finalOutputMarks: q.hiddenTechQuestion.finalOutputMarks
                    }
                });

                for (const sq of q.hiddenTechQuestion.subQuestions) {
                    await tx.hiddenTechSubQuestion.create({
                        data: {
                            mainQuestionId: newHt.id,
                            subQuestionNumber: sq.subQuestionNumber,
                            domain: sq.domain,
                            questionText: sq.questionText,
                            correctAnswer: sq.correctAnswer,
                            revealedCharacter: sq.revealedCharacter,
                            marks: sq.marks,
                            hint: sq.hint,
                            hintPenalty: sq.hintPenalty,
                            displayOrder: sq.displayOrder
                        }
                    });
                }
            }

            await tx.auditLog.create({
                data: {
                    adminId: req.user.id,
                    action: 'DUPLICATE_QUESTION',
                    targetType: 'questions',
                    targetId: newQ.id,
                    details: `Duplicated from question ${q.id}`
                }
            });

            return newQ;
        });

        res.json({ message: 'Question duplicated', id: result.id });
    } catch (err) {
        console.error('Admin duplicate question error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
