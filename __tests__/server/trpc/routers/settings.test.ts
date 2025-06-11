/// <reference types="vitest/globals" />
import { test, expect, vi } from 'vitest';
import { settingsRouter } from '~/server/trpc/routers/settings';
import { type AppRouter } from '~/server/trpc/router';
import { type inferProcedureInput } from '@trpc/server';
import { type PrismaClient } from '@prisma/client';

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