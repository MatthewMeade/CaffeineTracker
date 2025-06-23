import { PrismaClient } from '@prisma/client';
import { beforeEach, afterAll, beforeAll } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

const dbName = `test-${process.env.VITEST_POOL_ID ?? 1}.sqlite`;
const testDbUrl = `file:${dbName}?mode=memory`;

async function applyMigrations(db: PrismaClient) {
    const migrationsDir = path.resolve(process.cwd(), 'prisma/migrations');
    if (!fs.existsSync(migrationsDir)) {
        return;
    }

    const migrationFolders = fs.readdirSync(migrationsDir).filter(file =>
        fs.statSync(path.join(migrationsDir, file)).isDirectory()
    );

    migrationFolders.sort();

    for (const folder of migrationFolders) {
        const sqlPath = path.join(migrationsDir, folder, 'migration.sql');
        if (fs.existsSync(sqlPath)) {
            const sql = fs.readFileSync(sqlPath, 'utf-8');
            const statements = sql.split(';').filter(s => s.trim().length > 0);
            for (const statement of statements) {
                await db.$executeRawUnsafe(statement);
            }
        }
    }
}

export const testDb = new PrismaClient({
    datasources: {
        db: {
            url: testDbUrl,
        }
    }
});

export async function cleanTableData() {
    // Delete in batches to respect foreign key dependencies while maximizing parallelism

    // Batch 1: Independent tables (no foreign key dependencies)
    const independentTables = ['users', 'VerificationToken'];

    // Batch 2: Tables that only depend on users
    const userDependentTables = ['Session', 'Account', 'drinks', 'user_daily_limits'];

    // Batch 3: Tables that depend on multiple tables
    const multiDependentTables = ['caffeine_entries']; // depends on users AND drinks

    // Helper function to delete from a batch of tables in parallel
    const deleteBatch = async (tables: string[], batchName: string) => {
        await Promise.allSettled(
            tables.map(async (tableName) => {
                try {
                    await testDb.$executeRawUnsafe(`DELETE FROM "${tableName}";`);
                } catch (error) {
                    console.warn(`Warning: Could not clean table ${tableName} in ${batchName}:`, error);
                }
            })
        );
    };

    // Execute batches sequentially, but tables within each batch in parallel
    await deleteBatch(multiDependentTables, 'batch 3 (multi-dependent)');
    await deleteBatch(userDependentTables, 'batch 2 (user-dependent)');
    await deleteBatch(independentTables, 'batch 1 (independent)');
}

async function resetDatabase() {
    const tablenames = await testDb.$queryRaw<Array<{ name: string }>>`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma_migrations';`;
    await testDb.$executeRawUnsafe(`PRAGMA foreign_keys = OFF;`);
    for (const { name } of tablenames) {
        await testDb.$executeRawUnsafe(`DROP TABLE IF EXISTS "${name}";`);
    }
    await testDb.$executeRawUnsafe(`PRAGMA foreign_keys = ON;`);
}

export function setupTestDatabase() {
    beforeAll(async () => {
        await resetDatabase();
        await applyMigrations(testDb);
    });

    beforeEach(async () => {
        await cleanTableData();
    });

    afterAll(async () => {
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