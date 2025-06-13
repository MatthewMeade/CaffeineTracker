/// <reference types="vitest/globals" />
import { test, expect, vi } from 'vitest';
import { drinksRouter } from '~/server/trpc/routers/drinks';
import { type AppRouter } from '~/server/trpc/router';
import { type inferProcedureInput } from '@trpc/server';
import { type PrismaClient, Prisma } from '@prisma/client';
import { TRPCError } from '@trpc/server';

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
    const mockUserDrinks = [{ id: 'drink-1', name: 'Coffee', caffeineMg: 100, sizeMl: 250, createdByUserId: 'test-user-id' }];
    const mockDb: MockDb = {
        drink: {
            create: vi.fn(),
            findMany: vi.fn()
                .mockResolvedValueOnce(mockUserDrinks) // User's drinks
                .mockResolvedValueOnce([]), // Other users' drinks (empty)
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
    expect(mockDb.drink.findMany).toHaveBeenCalledTimes(2);
});

test('search procedure prioritizes user drinks with correct alphabetical sorting', async () => {
    const currentUserId = 'test-user-id'; // matches mockSession
    const otherUserId = 'other-user-id';

    const mockDrinks = [
        { id: 'drink-1', name: 'Apple Juice', caffeineMg: 0, sizeMl: 300, createdByUserId: otherUserId },
        { id: 'drink-2', name: 'Zen Tea', caffeineMg: 40, sizeMl: 250, createdByUserId: currentUserId },
        { id: 'drink-3', name: 'Cola', caffeineMg: 35, sizeMl: 355, createdByUserId: otherUserId },
    ];

    const mockDb: MockDb = {
        drink: {
            create: vi.fn(),
            findMany: vi.fn()
                // First call returns user's drinks (Zen Tea)
                .mockResolvedValueOnce(mockDrinks.filter(d => d.createdByUserId === currentUserId))
                // Second call returns other users' drinks (Apple Juice, Cola)
                .mockResolvedValueOnce(mockDrinks.filter(d => d.createdByUserId !== currentUserId)),
            count: vi.fn(),
        },
    };

    const caller = drinksRouter.createCaller({
        db: mockDb as unknown as PrismaClient,
        session: mockSession,
    });

    type Input = inferProcedureInput<AppRouter['drinks']['search']>;
    const input: Input = { sort_by: 'name', sort_order: 'asc' };

    const result = await caller.search(input);

    // Verify that user's drink (Zen Tea) appears first, even though Apple Juice is first alphabetically
    expect(result.drinks).toHaveLength(3);
    expect(result.drinks[0]?.name).toBe('Zen Tea');
    expect(result.drinks[1]?.name).toBe('Apple Juice');
    expect(result.drinks[2]?.name).toBe('Cola');

    // Verify the correct queries were made
    expect(mockDb.drink.findMany).toHaveBeenCalledTimes(2);

    // Verify first query was for user's drinks
    expect(mockDb.drink.findMany).toHaveBeenNthCalledWith(1, expect.objectContaining({
        where: expect.objectContaining({
            createdByUserId: currentUserId
        }),
        orderBy: [{ name: 'asc' }]
    }));

    // Verify second query was for other users' drinks
    expect(mockDb.drink.findMany).toHaveBeenNthCalledWith(2, expect.objectContaining({
        where: expect.objectContaining({
            createdByUserId: { not: currentUserId }
        }),
        orderBy: [{ name: 'asc' }]
    }));
});

test('search procedure maintains sort order within each group', async () => {
    const currentUserId = 'test-user-id';
    const otherUserId = 'other-user-id';

    // Create mock data where sorting by caffeine content would produce a different order
    const userDrinks = [
        { id: 'drink-1', name: 'Strong Coffee', caffeineMg: 200, sizeMl: 250, createdByUserId: currentUserId },
        { id: 'drink-2', name: 'Weak Coffee', caffeineMg: 50, sizeMl: 250, createdByUserId: currentUserId },
    ].sort((a, b) => b.caffeineMg - a.caffeineMg); // Sort by caffeine descending

    const otherDrinks = [
        { id: 'drink-3', name: 'Medium Coffee', caffeineMg: 100, sizeMl: 250, createdByUserId: otherUserId },
        { id: 'drink-4', name: 'Extra Strong Coffee', caffeineMg: 300, sizeMl: 250, createdByUserId: otherUserId },
    ].sort((a, b) => b.caffeineMg - a.caffeineMg); // Sort by caffeine descending

    const mockDb: MockDb = {
        drink: {
            create: vi.fn(),
            findMany: vi.fn()
                .mockResolvedValueOnce(userDrinks)
                .mockResolvedValueOnce(otherDrinks),
            count: vi.fn(),
        },
    };

    const caller = drinksRouter.createCaller({
        db: mockDb as unknown as PrismaClient,
        session: mockSession,
    });

    type Input = inferProcedureInput<AppRouter['drinks']['search']>;
    const input: Input = { sort_by: 'caffeineMg', sort_order: 'desc' };

    const result = await caller.search(input);

    // Verify that within each group (user's drinks and other drinks), 
    // the items are sorted by caffeine content in descending order
    expect(result.drinks).toHaveLength(4);
    
    // User's drinks should come first, sorted by caffeine
    expect(result.drinks[0]?.name).toBe('Strong Coffee');
    expect(result.drinks[1]?.name).toBe('Weak Coffee');
    
    // Other users' drinks should come second, also sorted by caffeine
    expect(result.drinks[2]?.name).toBe('Extra Strong Coffee');
    expect(result.drinks[3]?.name).toBe('Medium Coffee');

    // Verify correct sort parameters were passed
    expect(mockDb.drink.findMany).toHaveBeenNthCalledWith(1, expect.objectContaining({
        orderBy: [{ caffeineMg: 'desc' }]
    }));
    expect(mockDb.drink.findMany).toHaveBeenNthCalledWith(2, expect.objectContaining({
        orderBy: [{ caffeineMg: 'desc' }]
    }));
});

test('create procedure throws CONFLICT error for duplicate drink names', async () => {
    const mockDb = {
        drink: {
            create: vi.fn().mockRejectedValue(
                new Prisma.PrismaClientKnownRequestError('Unique constraint failed on the fields: (`name`)', {
                    code: 'P2002',
                    clientVersion: '5.0.0',
                    meta: { target: ['name'] }
                })
            ),
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

    await expect(caller.create(input)).rejects.toThrow('A drink with this name already exists');
});

test('search procedure handles findMany failure for user drinks', async () => {
    const mockDb: MockDb = {
        drink: {
            create: vi.fn(),
            findMany: vi.fn()
                .mockRejectedValueOnce(new Error('Database error'))
                .mockResolvedValueOnce([]), // Second call for other users' drinks
            count: vi.fn(),
        },
    };

    const caller = drinksRouter.createCaller({
        db: mockDb as unknown as PrismaClient,
        session: mockSession,
    });

    type Input = inferProcedureInput<AppRouter['drinks']['search']>;
    const input: Input = { q: 'Coffee' };

    await expect(caller.search(input)).rejects.toThrow('Failed to fetch user drinks');
    expect(mockDb.drink.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
            where: expect.objectContaining({
                createdByUserId: mockSession.user.id,
            }),
        })
    );
});

test('search procedure handles findMany failure for other users drinks', async () => {
    const mockDb: MockDb = {
        drink: {
            create: vi.fn(),
            findMany: vi.fn()
                .mockResolvedValueOnce([]) // First call for user's drinks
                .mockRejectedValueOnce(new Error('Database error')), // Second call for other users' drinks
            count: vi.fn(),
        },
    };

    const caller = drinksRouter.createCaller({
        db: mockDb as unknown as PrismaClient,
        session: mockSession,
    });

    type Input = inferProcedureInput<AppRouter['drinks']['search']>;
    const input: Input = { q: 'Coffee' };

    await expect(caller.search(input)).rejects.toThrow('Failed to fetch other users drinks');
    expect(mockDb.drink.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
            where: expect.objectContaining({
                createdByUserId: { not: mockSession.user.id },
            }),
        })
    );
}); 