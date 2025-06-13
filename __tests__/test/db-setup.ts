import { PrismaClient } from '@prisma/client';
import { beforeEach, afterAll } from 'vitest';
import { v4 as uuidv4 } from 'uuid';

export const testDb = new PrismaClient({
    datasources: {
        db: {
            url: process.env.DATABASE_URL ?? 'file:./test.db'
        }
    }
});

export async function cleanDatabase() {
    const tablenames = await testDb.$queryRaw<Array<{ name: string }>>`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma_migrations';`;

    await testDb.$executeRawUnsafe(`PRAGMA foreign_keys = OFF;`);
    for (const { name } of tablenames) {
        await testDb.$executeRawUnsafe(`DELETE from "${name}";`);
    }
    await testDb.$executeRawUnsafe(`PRAGMA foreign_keys = ON;`);
}

export function setupTestDatabase() {
    beforeEach(async () => {
        await cleanDatabase();
    });

    afterAll(async () => {
        await cleanDatabase();
        await testDb.$disconnect();
    });
}

// Test data factories
export const testUsers = {
    createUser: async (data: { id?: string; email: string; name?: string } = { email: 'test@example.com' }) => {
        return await testDb.user.create({
            data: {
                id: data.id ?? generateTestId(),
                email: data.email,
                name: data.name ?? 'Test User',
            }
        });
    },

    createOtherUser: async (data: { id?: string; email: string; name?: string } = { email: 'other@example.com' }) => {
        return await testDb.user.create({
            data: {
                id: data.id ?? generateTestId(),
                email: data.email,
                name: data.name ?? 'Other User',
            }
        });
    }
};

export const testDrinks = {
    createDrink: async (data: { 
        id?: string; 
        name: string; 
        caffeineMg: number; 
        sizeMl: number; 
        createdByUserId: string 
    }) => {
        return await testDb.drink.create({
            data: {
                id: data.id ?? generateTestId(),
                name: data.name,
                caffeineMg: data.caffeineMg,
                sizeMl: data.sizeMl,
                createdByUserId: data.createdByUserId,
            }
        });
    }
};

export const testEntries = {
    createEntry: async (data: {
        id?: string;
        userId: string;
        consumedAt: Date;
        name: string;
        caffeineMg: number;
        drinkId?: string;
    }) => {
        return await testDb.caffeineEntry.create({
            data: {
                id: data.id ?? generateTestId(),
                userId: data.userId,
                consumedAt: data.consumedAt,
                name: data.name,
                caffeineMg: data.caffeineMg,
                drinkId: data.drinkId,
            }
        });
    }
};

export const testLimits = {
    createLimit: async (data: {
        id?: string;
        userId: string;
        limitMg: number;
        effectiveFrom?: Date;
    }) => {
        return await testDb.userDailyLimit.create({
            data: {
                id: data.id ?? generateTestId(),
                userId: data.userId,
                limitMg: data.limitMg,
                effectiveFrom: data.effectiveFrom ?? new Date(),
            }
        });
    }
};

// Utility to generate valid UUIDs for tests
export const generateTestId = () => uuidv4();

describe.skip('db-setup helper file', () => {
    it('noop', () => { /* no-op test to satisfy Vitest */ });
}); 