/// <reference types="vitest/globals" />
import { test, expect, vi } from 'vitest';
import { entriesRouter } from '~/server/trpc/routers/entries';
import { type AppRouter } from '~/server/trpc/router';
import { type inferProcedureInput } from '@trpc/server';
import { type PrismaClient, type Prisma } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import { v4 as uuidv4 } from 'uuid';

vi.mock('~/server/utils/user-limits', () => ({
    getEffectiveDailyLimit: vi.fn().mockResolvedValue(500),
}));

type MockDb = {
    caffeineEntry: {
        create: typeof vi.fn,
        findMany: typeof vi.fn,
        count: typeof vi.fn,
        findUnique: typeof vi.fn,
        update: typeof vi.fn,
        delete: typeof vi.fn,
    },
    drink: {
        findUnique: typeof vi.fn,
    },
    $queryRaw: typeof vi.fn,
};

const mockSession = {
    user: { id: uuidv4(), email: 'test@example.com' },
    expires: new Date().toISOString(),
};

const drinkId = uuidv4();
const mockDrink = { id: drinkId, name: 'Coffee', caffeineMg: 100 as unknown as Prisma.Decimal, sizeMl: 250 as unknown as Prisma.Decimal };

test('create procedure for preset drink creates a new entry', async () => {
    const entryId = uuidv4();
    const newEntry = {
        id: entryId,
        userId: mockSession.user.id,
        drinkId,
        consumedAt: new Date(),
        createdAt: new Date(),
        name: mockDrink.name,
        caffeineMg: mockDrink.caffeineMg
    };
    const mockDb: MockDb = {
        caffeineEntry: {
            create: vi.fn().mockResolvedValue(newEntry),
            findMany: vi.fn().mockResolvedValue([]),
            count: vi.fn(),
            findUnique: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        },
        drink: {
            findUnique: vi.fn().mockResolvedValue(mockDrink),
        },
        $queryRaw: vi.fn(),
    };

    const caller = entriesRouter.createCaller({
        db: mockDb as unknown as PrismaClient,
        session: mockSession,
    });

    type Input = inferProcedureInput<AppRouter['entries']['create']>;
    const input: Input = { type: 'preset', drinkId: drinkId, consumedAt: new Date().toISOString() };

    const result = await caller.create(input);

    expect(result.success).toBe(true);
    expect(result.entry?.name).toBe('Coffee');
    expect(mockDb.caffeineEntry.create).toHaveBeenCalled();
});


test('create procedure for manual entry creates a new entry', async () => {
    const entryId = uuidv4();
    const manualEntryData = {
        name: 'Manual Espresso',
        caffeineMg: 65,
    };
    const newEntry = {
        id: entryId,
        userId: mockSession.user.id,
        drinkId: null,
        consumedAt: new Date(),
        createdAt: new Date(),
        name: manualEntryData.name,
        caffeineMg: manualEntryData.caffeineMg as unknown as Prisma.Decimal,
    };
    const mockDb: MockDb = {
        caffeineEntry: {
            create: vi.fn().mockResolvedValue(newEntry),
            findMany: vi.fn().mockResolvedValue([]),
            count: vi.fn(),
            findUnique: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        },
        drink: {
            findUnique: vi.fn(), // Should not be called
        },
        $queryRaw: vi.fn(),
    };

    const caller = entriesRouter.createCaller({
        db: mockDb as unknown as PrismaClient,
        session: mockSession,
    });

    type Input = inferProcedureInput<AppRouter['entries']['create']>;
    const input: Input = { type: 'manual', ...manualEntryData, consumedAt: new Date().toISOString() };

    const result = await caller.create(input);

    expect(result.success).toBe(true);
    expect(result.entry?.name).toBe(manualEntryData.name);
    expect(result.entry?.caffeine_mg).toBe(manualEntryData.caffeineMg);
    expect(mockDb.caffeineEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
            data: expect.objectContaining({
                name: manualEntryData.name,
                caffeineMg: manualEntryData.caffeineMg,
            })
        })
    );
    expect(mockDb.drink.findUnique).not.toHaveBeenCalled();
});


test('list procedure returns entries', async () => {
    const entryId = uuidv4();
    const mockEntries = [{
        id: entryId,
        consumedAt: new Date(),
        name: 'Coffee',
        caffeineMg: 100 as unknown as Prisma.Decimal,
        drinkId: mockDrink.id
    }];
    const mockDb: MockDb = {
        caffeineEntry: {
            create: vi.fn(),
            findMany: vi.fn().mockResolvedValue(mockEntries),
            count: vi.fn().mockResolvedValue(1),
            findUnique: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        },
        drink: {
            findUnique: vi.fn(),
        },
        $queryRaw: vi.fn(),
    };

    const caller = entriesRouter.createCaller({
        db: mockDb as unknown as PrismaClient,
        session: mockSession,
    });

    type Input = inferProcedureInput<AppRouter['entries']['list']>;
    const input: Input = {};

    const result = await caller.list(input);

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]?.name).toBe('Coffee');
    expect(mockDb.caffeineEntry.findMany).toHaveBeenCalled();
});

test('getDaily procedure returns daily entries', async () => {
    const entryId = uuidv4();
    const mockEntries = [{
        id: entryId,
        consumedAt: new Date(),
        name: 'Coffee',
        caffeineMg: 100 as unknown as Prisma.Decimal,
        drinkId: mockDrink.id
    }];
    const mockDb: MockDb = {
        caffeineEntry: {
            create: vi.fn(),
            findMany: vi.fn().mockResolvedValue(mockEntries),
            count: vi.fn(),
            findUnique: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        },
        drink: {
            findUnique: vi.fn(),
        },
        $queryRaw: vi.fn(),
    };

    const caller = entriesRouter.createCaller({
        db: mockDb as unknown as PrismaClient,
        session: mockSession,
    });

    type Input = inferProcedureInput<AppRouter['entries']['getDaily']>;
    const input: Input = { date: null };

    const result = await caller.getDaily(input);

    expect(result.entries).toHaveLength(1);
    expect(result.daily_total_mg).toBe(100);
    expect(mockDb.caffeineEntry.findMany).toHaveBeenCalled();
});

test('getGraphData procedure returns graph data', async () => {
    const testDate = '2023-01-01';
    const mockAggregatedData = [{
        date: testDate,
        total_mg: 100
    }];

    const mockDb: MockDb = {
        caffeineEntry: {
            create: vi.fn(),
            findMany: vi.fn(),
            count: vi.fn(),
            findUnique: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        },
        drink: {
            findUnique: vi.fn(),
        },
        $queryRaw: vi.fn().mockResolvedValue(mockAggregatedData),
    };

    const caller = entriesRouter.createCaller({
        db: mockDb as unknown as PrismaClient,
        session: mockSession,
    });

    type Input = inferProcedureInput<AppRouter['entries']['getGraphData']>;
    const input: Input = { start_date: testDate, end_date: testDate };

    const result = await caller.getGraphData(input);

    expect(result.data).toHaveLength(1);
    expect(result.data[0]?.total_mg).toBe(100);
    expect(result.data[0]?.date).toBe(testDate);
    expect(result.data[0]?.limit_mg).toBe(500);
    expect(result.data[0]?.limit_exceeded).toBe(false);
    expect(mockDb.$queryRaw).toHaveBeenCalled();
});

test('getGraphData procedure throws BAD_REQUEST error for invalid date range', async () => {
    const mockDb: MockDb = {
        caffeineEntry: {
            create: vi.fn(),
            findMany: vi.fn(),
            count: vi.fn(),
            findUnique: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        },
        drink: {
            findUnique: vi.fn(),
        },
        $queryRaw: vi.fn(),
    };

    const caller = entriesRouter.createCaller({
        db: mockDb as unknown as PrismaClient,
        session: mockSession,
    });

    type Input = inferProcedureInput<AppRouter['entries']['getGraphData']>;
    const input: Input = { start_date: '2023-01-02', end_date: '2023-01-01' };

    await expect(caller.getGraphData(input)).rejects.toThrow('Start date cannot be after the end date');
});

test('update procedure updates an entry', async () => {
    const entryId = uuidv4();
    const existingEntry = {
        id: entryId,
        userId: mockSession.user.id,
        drinkId: drinkId,
        consumedAt: new Date(),
        name: 'Coffee',
        caffeineMg: 100 as unknown as Prisma.Decimal
    };
    const updatedEntry = { ...existingEntry, consumedAt: new Date('2023-01-02') };
    const mockDb: MockDb = {
        caffeineEntry: {
            create: vi.fn(),
            findMany: vi.fn().mockResolvedValue([]),
            count: vi.fn(),
            findUnique: vi.fn().mockResolvedValue(existingEntry),
            update: vi.fn().mockResolvedValue(updatedEntry),
            delete: vi.fn(),
        },
        drink: {
            findUnique: vi.fn(),
        },
        $queryRaw: vi.fn(),
    };

    const caller = entriesRouter.createCaller({
        db: mockDb as unknown as PrismaClient,
        session: mockSession,
    });

    type Input = inferProcedureInput<AppRouter['entries']['update']>;
    const input: Input = { id: entryId, consumedAt: new Date('2023-01-02').toISOString() };

    const result = await caller.update(input);

    expect(result.success).toBe(true);
    expect(result.entry?.consumed_at).toBe('2023-01-02T00:00:00.000Z');
    expect(result.entry?.name).toBe('Coffee');
    expect(mockDb.caffeineEntry.update).toHaveBeenCalled();
});

test('delete procedure deletes an entry', async () => {
    const entryId = uuidv4();
    const existingEntry = { id: entryId, userId: mockSession.user.id };
    const mockDb: MockDb = {
        caffeineEntry: {
            create: vi.fn(),
            findMany: vi.fn(),
            count: vi.fn(),
            findUnique: vi.fn().mockResolvedValue(existingEntry),
            update: vi.fn(),
            delete: vi.fn().mockResolvedValue({}),
        },
        drink: {
            findUnique: vi.fn(),
        },
        $queryRaw: vi.fn(),
    };

    const caller = entriesRouter.createCaller({
        db: mockDb as unknown as PrismaClient,
        session: mockSession,
    });

    type Input = inferProcedureInput<AppRouter['entries']['delete']>;
    const input: Input = { id: entryId };

    const result = await caller.delete(input);

    expect(result.success).toBe(true);
    expect(mockDb.caffeineEntry.delete).toHaveBeenCalledWith({ where: { id: entryId } });
});

test('delete procedure throws NOT_FOUND error for non-existent entry', async () => {
    const entryId = uuidv4();
    const mockDb: MockDb = {
        caffeineEntry: {
            create: vi.fn(),
            findMany: vi.fn(),
            count: vi.fn(),
            findUnique: vi.fn().mockResolvedValue(null),
            update: vi.fn(),
            delete: vi.fn(),
        },
        drink: {
            findUnique: vi.fn(),
        },
        $queryRaw: vi.fn(),
    };

    const caller = entriesRouter.createCaller({
        db: mockDb as unknown as PrismaClient,
        session: mockSession,
    });

    type Input = inferProcedureInput<AppRouter['entries']['delete']>;
    const input: Input = { id: entryId };

    await expect(caller.delete(input)).rejects.toThrow('Entry not found or you do not have permission to delete it');
});

test('create procedure handles drink.findUnique failure for preset drink', async () => {
    const mockDb: MockDb = {
        caffeineEntry: {
            create: vi.fn(),
            findMany: vi.fn(),
            count: vi.fn(),
            findUnique: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        },
        drink: {
            findUnique: vi.fn().mockRejectedValue(new Error('Database error')),
        },
        $queryRaw: vi.fn(),
    };

    const caller = entriesRouter.createCaller({
        db: mockDb as unknown as PrismaClient,
        session: mockSession,
    });

    type Input = inferProcedureInput<AppRouter['entries']['create']>;
    const input: Input = { type: 'preset', drinkId: drinkId, consumedAt: new Date().toISOString() };

    await expect(caller.create(input)).rejects.toThrow('Failed to fetch drink');
});

test('create procedure handles caffeineEntry.create failure for preset drink', async () => {
    const mockDb: MockDb = {
        caffeineEntry: {
            create: vi.fn().mockRejectedValue(new Error('Database error')),
            findMany: vi.fn(),
            count: vi.fn(),
            findUnique: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        },
        drink: {
            findUnique: vi.fn().mockResolvedValue(mockDrink),
        },
        $queryRaw: vi.fn(),
    };

    const caller = entriesRouter.createCaller({
        db: mockDb as unknown as PrismaClient,
        session: mockSession,
    });

    type Input = inferProcedureInput<AppRouter['entries']['create']>;
    const input: Input = { type: 'preset', drinkId: drinkId, consumedAt: new Date().toISOString() };

    await expect(caller.create(input)).rejects.toThrow('Failed to create entry');
});

test('create procedure handles caffeineEntry.create failure for manual entry', async () => {
    const mockDb: MockDb = {
        caffeineEntry: {
            create: vi.fn().mockRejectedValue(new Error('Database error')),
            findMany: vi.fn(),
            count: vi.fn(),
            findUnique: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        },
        drink: {
            findUnique: vi.fn(),
        },
        $queryRaw: vi.fn(),
    };

    const caller = entriesRouter.createCaller({
        db: mockDb as unknown as PrismaClient,
        session: mockSession,
    });

    type Input = inferProcedureInput<AppRouter['entries']['create']>;
    const input: Input = { 
        type: 'manual', 
        name: 'Manual Coffee', 
        caffeineMg: 100, 
        consumedAt: new Date().toISOString() 
    };

    await expect(caller.create(input)).rejects.toThrow('Failed to create entry');
});

test('create procedure handles calculateDailyTotals failure', async () => {
    const entryId = uuidv4();
    const newEntry = {
        id: entryId,
        userId: mockSession.user.id,
        drinkId: null,
        consumedAt: new Date(),
        name: 'Manual Coffee',
        caffeineMg: 100 as unknown as Prisma.Decimal,
    };

    const mockDb: MockDb = {
        caffeineEntry: {
            create: vi.fn().mockResolvedValue(newEntry),
            findMany: vi.fn().mockRejectedValue(new Error('Database error')), // This will cause calculateDailyTotals to fail
            count: vi.fn(),
            findUnique: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        },
        drink: {
            findUnique: vi.fn(),
        },
        $queryRaw: vi.fn(),
    };

    const caller = entriesRouter.createCaller({
        db: mockDb as unknown as PrismaClient,
        session: mockSession,
    });

    type Input = inferProcedureInput<AppRouter['entries']['create']>;
    const input: Input = { 
        type: 'manual', 
        name: 'Manual Coffee', 
        caffeineMg: 100, 
        consumedAt: new Date().toISOString() 
    };

    await expect(caller.create(input)).rejects.toThrow('Failed to calculate daily totals');
});

test('list procedure handles count failure', async () => {
    const mockDb: MockDb = {
        caffeineEntry: {
            create: vi.fn(),
            findMany: vi.fn().mockResolvedValue([]),
            count: vi.fn().mockRejectedValue(new Error('Database error')),
            findUnique: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        },
        drink: {
            findUnique: vi.fn(),
        },
        $queryRaw: vi.fn(),
    };

    const caller = entriesRouter.createCaller({
        db: mockDb as unknown as PrismaClient,
        session: mockSession,
    });

    type Input = inferProcedureInput<AppRouter['entries']['list']>;
    const input: Input = {};

    await expect(caller.list(input)).rejects.toThrow('Failed to fetch entries count');
});

test('list procedure handles findMany failure', async () => {
    const mockDb: MockDb = {
        caffeineEntry: {
            create: vi.fn(),
            findMany: vi.fn().mockRejectedValue(new Error('Database error')),
            count: vi.fn().mockResolvedValue(1),
            findUnique: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        },
        drink: {
            findUnique: vi.fn(),
        },
        $queryRaw: vi.fn(),
    };

    const caller = entriesRouter.createCaller({
        db: mockDb as unknown as PrismaClient,
        session: mockSession,
    });

    type Input = inferProcedureInput<AppRouter['entries']['list']>;
    const input: Input = {};

    await expect(caller.list(input)).rejects.toThrow('Failed to fetch entries');
});

test('getDaily procedure handles findMany failure', async () => {
    const mockDb: MockDb = {
        caffeineEntry: {
            create: vi.fn(),
            findMany: vi.fn().mockRejectedValue(new Error('Database error')),
            count: vi.fn(),
            findUnique: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        },
        drink: {
            findUnique: vi.fn(),
        },
        $queryRaw: vi.fn(),
    };

    const caller = entriesRouter.createCaller({
        db: mockDb as unknown as PrismaClient,
        session: mockSession,
    });

    type Input = inferProcedureInput<AppRouter['entries']['getDaily']>;
    const input: Input = { date: null };

    await expect(caller.getDaily(input)).rejects.toThrow('Failed to fetch daily entries');
});

test('getDaily procedure handles calculateDailyTotals failure', async () => {
    const mockDb: MockDb = {
        caffeineEntry: {
            create: vi.fn(),
            findMany: vi.fn()
                .mockResolvedValueOnce([])
                .mockRejectedValueOnce(new Error('Database error')),
            count: vi.fn(),
            findUnique: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        },
        drink: {
            findUnique: vi.fn(),
        },
        $queryRaw: vi.fn(),
    };

    const caller = entriesRouter.createCaller({
        db: mockDb as unknown as PrismaClient,
        session: mockSession,
    });

    type Input = inferProcedureInput<AppRouter['entries']['getDaily']>;
    const input: Input = { date: null };

    await expect(caller.getDaily(input)).rejects.toThrow('Failed to calculate daily totals');
});

test('getGraphData procedure handles $queryRaw failure', async () => {
    const mockDb: MockDb = {
        caffeineEntry: {
            create: vi.fn(),
            findMany: vi.fn(),
            count: vi.fn(),
            findUnique: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        },
        drink: {
            findUnique: vi.fn(),
        },
        $queryRaw: vi.fn().mockRejectedValue(new Error('Database error')),
    };

    const caller = entriesRouter.createCaller({
        db: mockDb as unknown as PrismaClient,
        session: mockSession,
    });

    type Input = inferProcedureInput<AppRouter['entries']['getGraphData']>;
    const input: Input = { start_date: '2023-01-01', end_date: '2023-01-01' };

    await expect(caller.getGraphData(input)).rejects.toThrow('Failed to fetch graph data');
});

test('update procedure handles findUnique failure', async () => {
    const entryId = uuidv4();
    const mockDb: MockDb = {
        caffeineEntry: {
            create: vi.fn(),
            findMany: vi.fn(),
            count: vi.fn(),
            findUnique: vi.fn().mockRejectedValue(new Error('Database error')),
            update: vi.fn(),
            delete: vi.fn(),
        },
        drink: {
            findUnique: vi.fn(),
        },
        $queryRaw: vi.fn(),
    };

    const caller = entriesRouter.createCaller({
        db: mockDb as unknown as PrismaClient,
        session: mockSession,
    });

    type Input = inferProcedureInput<AppRouter['entries']['update']>;
    const input: Input = { id: entryId, name: 'Updated Coffee' };

    await expect(caller.update(input)).rejects.toThrow('Failed to fetch entry');
});

test('update procedure handles update failure', async () => {
    const entryId = uuidv4();
    const existingEntry = {
        id: entryId,
        userId: mockSession.user.id,
        drinkId: drinkId,
        consumedAt: new Date(),
        name: 'Coffee',
        caffeineMg: 100 as unknown as Prisma.Decimal
    };
    const mockDb: MockDb = {
        caffeineEntry: {
            create: vi.fn(),
            findMany: vi.fn(),
            count: vi.fn(),
            findUnique: vi.fn().mockResolvedValue(existingEntry),
            update: vi.fn().mockRejectedValue(new Error('Database error')),
            delete: vi.fn(),
        },
        drink: {
            findUnique: vi.fn(),
        },
        $queryRaw: vi.fn(),
    };

    const caller = entriesRouter.createCaller({
        db: mockDb as unknown as PrismaClient,
        session: mockSession,
    });

    type Input = inferProcedureInput<AppRouter['entries']['update']>;
    const input: Input = { id: entryId, name: 'Updated Coffee' };

    await expect(caller.update(input)).rejects.toThrow('Failed to update entry');
});

test('update procedure handles calculateDailyTotals failure', async () => {
    const entryId = uuidv4();
    const existingEntry = {
        id: entryId,
        userId: mockSession.user.id,
        drinkId: drinkId,
        consumedAt: new Date(),
        name: 'Coffee',
        caffeineMg: 100 as unknown as Prisma.Decimal
    };
    const updatedEntry = { ...existingEntry, name: 'Updated Coffee' };
    const mockDb: MockDb = {
        caffeineEntry: {
            create: vi.fn(),
            findMany: vi.fn().mockRejectedValue(new Error('Database error')),
            count: vi.fn(),
            findUnique: vi.fn().mockResolvedValue(existingEntry),
            update: vi.fn().mockResolvedValue(updatedEntry),
            delete: vi.fn(),
        },
        drink: {
            findUnique: vi.fn(),
        },
        $queryRaw: vi.fn(),
    };

    const caller = entriesRouter.createCaller({
        db: mockDb as unknown as PrismaClient,
        session: mockSession,
    });

    type Input = inferProcedureInput<AppRouter['entries']['update']>;
    const input: Input = { id: entryId, name: 'Updated Coffee' };

    await expect(caller.update(input)).rejects.toThrow('Failed to calculate daily totals');
});

test('delete procedure handles findUnique failure', async () => {
    const entryId = uuidv4();
    const mockDb: MockDb = {
        caffeineEntry: {
            create: vi.fn(),
            findMany: vi.fn(),
            count: vi.fn(),
            findUnique: vi.fn().mockRejectedValue(new Error('Database error')),
            update: vi.fn(),
            delete: vi.fn(),
        },
        drink: {
            findUnique: vi.fn(),
        },
        $queryRaw: vi.fn(),
    };

    const caller = entriesRouter.createCaller({
        db: mockDb as unknown as PrismaClient,
        session: mockSession,
    });

    type Input = inferProcedureInput<AppRouter['entries']['delete']>;
    const input: Input = { id: entryId };

    await expect(caller.delete(input)).rejects.toThrow('Failed to fetch entry');
});

test('delete procedure handles delete failure', async () => {
    const entryId = uuidv4();
    const existingEntry = { id: entryId, userId: mockSession.user.id };
    const mockDb: MockDb = {
        caffeineEntry: {
            create: vi.fn(),
            findMany: vi.fn(),
            count: vi.fn(),
            findUnique: vi.fn().mockResolvedValue(existingEntry),
            update: vi.fn(),
            delete: vi.fn().mockRejectedValue(new Error('Database error')),
        },
        drink: {
            findUnique: vi.fn(),
        },
        $queryRaw: vi.fn(),
    };

    const caller = entriesRouter.createCaller({
        db: mockDb as unknown as PrismaClient,
        session: mockSession,
    });

    type Input = inferProcedureInput<AppRouter['entries']['delete']>;
    const input: Input = { id: entryId };

    await expect(caller.delete(input)).rejects.toThrow('Failed to delete entry');
}); 