import { PrismaClient } from '@prisma/client';
import { beforeAll, afterAll, beforeEach } from 'vitest';

// Create a new PrismaClient instance for testing
const prisma = new PrismaClient({
    datasourceUrl: process.env.TEST_DATABASE_URL || 'file:./test.db',
});

// Setup before all tests
beforeAll(async () => {
    // Ensure the database is clean before running tests
    await prisma.$connect();
    await cleanDatabase();
});

// Cleanup after all tests
afterAll(async () => {
    await cleanDatabase();
    await prisma.$disconnect();
});

// Clean database before each test
beforeEach(async () => {
    await cleanDatabase();
});

// Helper function to clean the database
async function cleanDatabase() {
    const tables = [
        'caffeine_entries',
        'drinks',
        'user_daily_limits',
        'users',
        'Account',
        'Session',
        'VerificationToken',
    ];

    for (const table of tables) {
        await prisma.$executeRawUnsafe(`DELETE FROM "${table}";`);
    }
}

export { prisma }; 