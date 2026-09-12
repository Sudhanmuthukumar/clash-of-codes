const { prisma } = require('../db/database');

async function allocateQuestions(teamId, eventId) {
    const existing = await prisma.teamQuestionAllocation.findMany({
        where: { teamId },
        select: { questionId: true }
    });

    if (existing.length > 0) {
        return existing.map(e => e.questionId);
    }

    const event = await prisma.event.findUnique({
        where: { id: eventId }
    });
    if (!event) throw new Error('Event not found');

    const activeQuestions = await prisma.question.findMany({
        where: { eventId, isActive: 1 },
        select: { id: true }
    });

    // Fisher-Yates shuffle
    const shuffled = [...activeQuestions];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const selected = shuffled.slice(0, event.questionsPerTeam);

    await prisma.$transaction(async (tx) => {
        // Double check inside transaction to prevent race conditions
        const recheck = await tx.teamQuestionAllocation.findMany({
            where: { teamId },
            select: { questionId: true }
        });
        if (recheck.length > 0) return;

        for (const q of selected) {
            await tx.teamQuestionAllocation.create({
                data: {
                    teamId,
                    questionId: q.id
                }
            });
        }
    });

    const finalAllocations = await prisma.teamQuestionAllocation.findMany({
        where: { teamId },
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
