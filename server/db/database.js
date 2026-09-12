const { PrismaClient } = require('@prisma/client');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

let prismaInstance;

function getPrismaClient() {
    if (!prismaInstance) {
        prismaInstance = new PrismaClient({
            log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error']
        });
    }
    return prismaInstance;
}

const prisma = getPrismaClient();

async function initializeDatabase() {
    try {
        await prisma.$queryRaw`SELECT 1 as healthy`;
        console.log('✓ PostgreSQL connected successfully via Prisma');
    } catch (err) {
        console.error('✗ PostgreSQL connection error:', err.message);
        // Do not crash immediately so health checks can report status
    }
    return prisma;
}

module.exports = {
    prisma,
    db: prisma,
    initializeDatabase
};
