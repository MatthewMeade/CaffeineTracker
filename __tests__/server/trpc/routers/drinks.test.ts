/// <reference types="vitest/globals" />
import { test, expect, vi } from 'vitest';
import { drinksRouter } from '~/server/trpc/routers/drinks';
import { type AppRouter } from '~/server/trpc/router';
import { type inferProcedureInput } from '@trpc/server';
import { type PrismaClient } from '@prisma/client';

type MockDb = {
    drink: {
        create: typeof vi.fn,
        findMany: typeof vi.fn,
        count: typeof vi.fn,
    },
};

const mockSession = {
    user: { id: 'test-user-id', email: 'test@example.com' },
    expires: new Date().toISOString(),
};

test('create procedure creates a new drink', async () => {
    const newDrink = { id: 'new-drink-id', name: 'Test Coffee', caffeineMg: 100, sizeMl: 250, createdByUserId: 'test-user-id' };
    const mockDb: MockDb = {
        drink: {
            create: vi.fn().mockResolvedValue(newDrink),
            findMany: vi.fn(),
            count: vi.fn(),
        },
    };

    const caller = drinksRouter.createCaller({
        db: mockDb as unknown as PrismaClient,
        session: mockSession,
    });

    type Input = inferProcedureInput<AppRouter['drinks']['create']>;
    const input: Input = { name: 'Test Coffee', caffeine_mg: 100, size_ml: 250 };

    const result = await caller.create(input);

    expect(result.success).toBe(true);
    expect(result.drink?.name).toBe('Test Coffee');
    expect(mockDb.drink.create).toHaveBeenCalledWith({
        data: {
            name: 'Test Coffee',
            caffeineMg: 100,
            sizeMl: 250,
            createdByUserId: 'test-user-id',
        },
    });
});

test('search procedure returns drinks', async () => {
    const mockDrinks = [{ id: 'drink-1', name: 'Coffee', caffeineMg: 100, sizeMl: 250, createdByUserId: 'test-user-id' }];
    const mockDb: MockDb = {
        drink: {
            create: vi.fn(),
            findMany: vi.fn().mockResolvedValue(mockDrinks),
            count: vi.fn().mockResolvedValue(1),
        },
    };

    const caller = drinksRouter.createCaller({
        db: mockDb as unknown as PrismaClient,
        session: mockSession,
    });

    type Input = inferProcedureInput<AppRouter['drinks']['search']>;
    const input: Input = { q: 'Coffee' };

    const result = await caller.search(input);

    expect(result.drinks).toHaveLength(1);
    expect(result.drinks[0]?.name).toBe('Coffee');
    expect(mockDb.drink.findMany).toHaveBeenCalled();
}); 