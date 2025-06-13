/// <reference types="vitest/globals" />
import { test, expect, vi } from 'vitest';
import { settingsRouter } from '~/server/trpc/routers/settings';
import { type AppRouter } from '~/server/trpc/router';
import { type inferProcedureInput } from '@trpc/server';
import { type PrismaClient } from '@prisma/client';
import { TRPCError } from '@trpc/server';

type MockDb = {
    userDailyLimit: {
        findMany: typeof vi.fn,
        create: typeof vi.fn,
    },
};

const mockSession = {
    user: { id: 'test-user-id', email: 'test@example.com' },
    expires: new Date().toISOString(),
};

test('getLimit procedure returns current limit and history', async () => {
    const mockLimits = [
        { limitMg: 500, effectiveFrom: new Date() },
        { limitMg: 400, effectiveFrom: new Date('2022-01-01') },
    ];
    const mockDb: MockDb = {
        userDailyLimit: {
            findMany: vi.fn().mockResolvedValue(mockLimits),
            create: vi.fn(),
        },
    };

    const caller = settingsRouter.createCaller({
        db: mockDb as unknown as PrismaClient,
        session: mockSession,
    });

    const result = await caller.getLimit();

    expect(result.current_limit_mg).toBe(500);
    expect(result.history).toHaveLength(2);
    expect(mockDb.userDailyLimit.findMany).toHaveBeenCalledWith({
        where: { userId: 'test-user-id' },
        orderBy: { effectiveFrom: 'desc' },
    });
});

test('setLimit procedure creates a new limit', async () => {
    const newLimit = { id: 'new-limit-id', userId: 'test-user-id', limitMg: 300, effectiveFrom: new Date() };
    const mockDb: MockDb = {
        userDailyLimit: {
            findMany: vi.fn(),
            create: vi.fn().mockResolvedValue(newLimit),
        },
    };

    const caller = settingsRouter.createCaller({
        db: mockDb as unknown as PrismaClient,
        session: mockSession,
    });

    type Input = inferProcedureInput<AppRouter['settings']['setLimit']>;
    const input: Input = { limit_mg: 300 };

    const result = await caller.setLimit(input);

    expect(result.success).toBe(true);
    expect(result.new_limit?.limit_mg).toBe(300);
    expect(mockDb.userDailyLimit.create).toHaveBeenCalledWith({
        data: {
            userId: 'test-user-id',
            limitMg: 300,
        },
    });
});

test('getLimit procedure handles database errors gracefully', async () => {
    const mockDb: MockDb = {
        userDailyLimit: {
            findMany: vi.fn().mockRejectedValue(new Error('Database error')),
            create: vi.fn(),
        },
    };

    const caller = settingsRouter.createCaller({
        db: mockDb as unknown as PrismaClient,
        session: mockSession,
    });

    await expect(caller.getLimit()).rejects.toThrow(TRPCError);
    await expect(caller.getLimit()).rejects.toThrow('Failed to fetch daily limits');
    expect(mockDb.userDailyLimit.findMany).toHaveBeenCalledWith({
        where: { userId: 'test-user-id' },
        orderBy: { effectiveFrom: 'desc' },
    });
});

test('setLimit procedure handles database errors gracefully', async () => {
    const mockDb: MockDb = {
        userDailyLimit: {
            findMany: vi.fn(),
            create: vi.fn().mockRejectedValue(new Error('Database error')),
        },
    };

    const caller = settingsRouter.createCaller({
        db: mockDb as unknown as PrismaClient,
        session: mockSession,
    });

    type Input = inferProcedureInput<AppRouter['settings']['setLimit']>;
    const input: Input = { limit_mg: 500 };

    await expect(caller.setLimit(input)).rejects.toThrow(TRPCError);
    await expect(caller.setLimit(input)).rejects.toThrow('Failed to set daily limit');
    expect(mockDb.userDailyLimit.create).toHaveBeenCalledWith({
        data: {
            userId: 'test-user-id',
            limitMg: 500,
        },
    });
}); 