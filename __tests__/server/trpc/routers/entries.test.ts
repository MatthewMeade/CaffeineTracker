/// <reference types="vitest/globals" />
import { test, expect, vi } from 'vitest';
import { entriesRouter } from '~/server/trpc/routers/entries';
import { type AppRouter } from '~/server/trpc/router';
import { type inferProcedureInput } from '@trpc/server';
import { type PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

vi.mock('~/lib/limits', () => ({
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
};

const mockSession = {
    user: { id: uuidv4(), email: 'test@example.com' },
    expires: new Date().toISOString(),
};

const drinkId = uuidv4();
const mockDrink = { id: drinkId, name: 'Coffee', caffeineMg: 100, sizeMl: 250 };

test('create procedure creates a new entry', async () => {
    const entryId = uuidv4();
    const newEntry = { id: entryId, userId: mockSession.user.id, drinkId, quantity: 1, consumedAt: new Date(), createdAt: new Date(), drink: mockDrink };
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
    };

    const caller = entriesRouter.createCaller({
        db: mockDb as unknown as PrismaClient,
        session: mockSession,
    });

    type Input = inferProcedureInput<AppRouter['entries']['create']>;
    const input: Input = { drink_id: drinkId, quantity: 1, consumed_at: new Date().toISOString() };

    const result = await caller.create(input);

    expect(result.success).toBe(true);
    expect(result.entry?.drink_name).toBe('Coffee');
    expect(mockDb.caffeineEntry.create).toHaveBeenCalled();
});

test('list procedure returns entries', async () => {
    const entryId = uuidv4();
    const mockEntries = [{ id: entryId, drink: mockDrink, quantity: 1, consumedAt: new Date() }];
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
    };

    const caller = entriesRouter.createCaller({
        db: mockDb as unknown as PrismaClient,
        session: mockSession,
    });

    type Input = inferProcedureInput<AppRouter['entries']['list']>;
    const input: Input = {};

    const result = await caller.list(input);

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]?.drink.name).toBe('Coffee');
    expect(mockDb.caffeineEntry.findMany).toHaveBeenCalled();
});

test('getDaily procedure returns daily entries', async () => {
    const entryId = uuidv4();
    const mockEntries = [{ id: entryId, drink: mockDrink, quantity: 1, consumedAt: new Date() }];
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
    const entryId = uuidv4();
    const testDate = new Date('2023-01-01T12:00:00.000Z');
    const mockEntries = [{ id: entryId, drink: mockDrink, quantity: 1, consumedAt: testDate, createdAt: new Date() }];
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
    };

    const caller = entriesRouter.createCaller({
        db: mockDb as unknown as PrismaClient,
        session: mockSession,
    });

    type Input = inferProcedureInput<AppRouter['entries']['getGraphData']>;
    const input: Input = { start_date: '2023-01-01', end_date: '2023-01-01' };

    const result = await caller.getGraphData(input);

    expect(result.data).toHaveLength(1);
    expect(result.data[0]?.total_mg).toBe(100);
    expect(mockDb.caffeineEntry.findMany).toHaveBeenCalled();
});

test('update procedure updates an entry', async () => {
    const entryId = uuidv4();
    const existingEntry = { id: entryId, userId: mockSession.user.id, drinkId: drinkId, quantity: 1, consumedAt: new Date(), drink: mockDrink };
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
    };

    const caller = entriesRouter.createCaller({
        db: mockDb as unknown as PrismaClient,
        session: mockSession,
    });

    type Input = inferProcedureInput<AppRouter['entries']['update']>;
    const input: Input = { id: entryId, consumed_at: new Date('2023-01-02').toISOString() };

    const result = await caller.update(input);

    expect(result.success).toBe(true);
    expect(result.entry?.consumed_at).toEqual(new Date('2023-01-02'));
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