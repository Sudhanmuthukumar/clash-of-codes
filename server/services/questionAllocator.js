const { prisma } = require('../db/database');

async function allocateQuestions(teamId, eventId) {
    const existing = await prisma.teamQuestionAllocation.findMany({
        where: { 
            teamId,
            question: { eventId }
        },
        orderBy: { displayOrder: 'asc' },
        select: { questionId: true }
    });

    const event = await prisma.event.findUnique({
        where: { id: eventId }
    });
    if (!event) throw new Error('Event not found');

    const expectedCount = event.year === '2nd Year' ? 10 : 5;

    // If existing has expected count, return persisted order
    if (existing.length >= expectedCount) {
        return existing.map(e => e.questionId);
    }

    const activeQuestions = await prisma.question.findMany({
        where: { eventId, isActive: 1 },
        select: { id: true }
    });

    if (existing.length > 0 && event.year === '2nd Year') {
        // Backfill remaining questions for 2nd Year team
        const existingQIds = new Set(existing.map(e => e.questionId));
        const missingQs = activeQuestions.filter(q => !existingQIds.has(q.id));
        
        // Shuffle missing questions
        const shuffledMissing = [...missingQs];
        for (let i = shuffledMissing.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledMissing[i], shuffledMissing[j]] = [shuffledMissing[j], shuffledMissing[i]];
        }

        let nextOrder = existing.length + 1;
        for (const q of shuffledMissing) {
            await prisma.teamQuestionAllocation.create({
                data: {
                    teamId,
                    questionId: q.id,
                    displayOrder: nextOrder++
                }
            });
        }

        const updatedAllocations = await prisma.teamQuestionAllocation.findMany({
            where: { 
                teamId,
                question: { eventId }
            },
            orderBy: { displayOrder: 'asc' },
            select: { questionId: true }
        });
        return updatedAllocations.map(a => a.questionId);
    } else if (existing.length > 0) {
        return existing.map(e => e.questionId);
    }

    // Fresh allocation: Fisher-Yates shuffle
    const shuffled = [...activeQuestions];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const selectedCount = event.year === '2nd Year' ? Math.min(10, shuffled.length) : Math.min(5, shuffled.length);
    const selected = shuffled.slice(0, selectedCount);

    await prisma.$transaction(async (tx) => {
        // Double check inside transaction to prevent race conditions
        const recheck = await tx.teamQuestionAllocation.findMany({
            where: { 
                teamId,
                question: { eventId }
            },
            select: { questionId: true }
        });
        if (recheck.length > 0) return;

        for (let idx = 0; idx < selected.length; idx++) {
            await tx.teamQuestionAllocation.create({
                data: {
                    teamId,
                    questionId: selected[idx].id,
                    displayOrder: idx + 1
                }
            });
        }
    });

    const finalAllocations = await prisma.teamQuestionAllocation.findMany({
        where: { 
            teamId,
            question: { eventId }
        },
        orderBy: { displayOrder: 'asc' },
        select: { questionId: true }
    });

    return finalAllocations.map(a => a.questionId);
}

async function getTeamQuestions(teamId) {
    return prisma.question.findMany({
        where: {
            allocations: {
                some: { teamId }
            }
        },
        orderBy: {
            displayOrder: 'asc'
        }
    });
}

async function isQuestionAllocated(teamId, questionId) {
    const count = await prisma.teamQuestionAllocation.count({
        where: { teamId, questionId }
    });
    return count > 0;
}

async function regenerateAllocation(teamId, eventId) {
    await prisma.$transaction(async (tx) => {
        await tx.teamQuestionAllocation.deleteMany({
            where: { teamId }
        });
    });
    return allocateQuestions(teamId, eventId);
}

async function regenerateEventAllocations(eventId) {
    const teams = await prisma.team.findMany({
        where: { eventId, status: 'active' },
        select: { id: true }
    });

    await prisma.$transaction(async (tx) => {
        await tx.teamQuestionAllocation.deleteMany({
            where: {
                team: { eventId }
            }
        });
    });

    for (const team of teams) {
        await allocateQuestions(team.id, eventId);
    }
}

module.exports = {
    allocateQuestions,
    getTeamQuestions,
    isQuestionAllocated,
    regenerateAllocation,
    regenerateEventAllocations
};
