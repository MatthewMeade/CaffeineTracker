import { PrismaClient } from '@prisma/client';
import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import path from 'path';

// Create a new PrismaClient instance for testing
const prisma = new PrismaClient({
    datasourceUrl: process.env.TEST_DATABASE_URL || 'file:./test.db',
});

// Setup before all tests
beforeAll(async () => {
    try {
        // Ensure the database is clean and schema is up to date
        await prisma.$connect();

        // Run migrations on the test database
        const testDbPath = path.resolve(process.cwd(), 'prisma/test.db');
        process.env.DATABASE_URL = `file:${testDbPath}`;
        execSync('npx prisma migrate deploy', { stdio: 'inherit' });

        await cleanDatabase();
    } catch (error) {
        console.error('Failed to setup test database:', error);
        throw error;
    }
});

// Cleanup after all tests
afterAll(async () => {
    try {
        await cleanDatabase();
        await prisma.$disconnect();
    } catch (error) {
        console.error('Failed to cleanup test database:', error);
        throw error;
    }
});

// Clean database before each test
beforeEach(async () => {
    try {
        await cleanDatabase();
    } catch (error) {
        console.error('Failed to clean database before test:', error);
        throw error;
    }
});

// Clean database after each test
afterEach(async () => {
    try {
        await cleanDatabase();
    } catch (error) {
        console.error('Failed to clean database after test:', error);
        throw error;
    }
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

    // Disable foreign key checks temporarily
    await prisma.$executeRawUnsafe('PRAGMA foreign_keys = OFF;');

    try {
        // Check if tables exist before trying to delete from them
        for (const table of tables) {
            const tableExists = await prisma.$queryRawUnsafe(
                `SELECT name FROM sqlite_master WHERE type='table' AND name='${table}';`
            );

            if (Array.isArray(tableExists) && tableExists.length > 0) {
                await prisma.$executeRawUnsafe(`DELETE FROM "${table}";`);
            }
        }
    } finally {
        // Re-enable foreign key checks
        await prisma.$executeRawUnsafe('PRAGMA foreign_keys = ON;');
    }
}

export { prisma }; 