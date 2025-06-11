/// <reference types="vitest/globals" />
import { test, expect, vi } from 'vitest';
import { userRouter } from '~/server/trpc/routers/user';
import { type AppRouter } from '~/server/trpc/router';
import { type inferProcedureInput } from '@trpc/server';
import { type PrismaClient } from '@prisma/client';

type MockDb = {
    user: {
        findUnique: typeof vi.fn,
    },
};

test('me procedure returns user data for authenticated user', async () => {
    const mockUser = { id: 'test-user-id', email: 'test@example.com', createdAt: new Date() };
    const mockDb: MockDb = {
        user: {
            findUnique: vi.fn().mockResolvedValue(mockUser),
        },
    };

    const caller = userRouter.createCaller({
        db: mockDb as unknown as PrismaClient,
        session: {
            user: { id: 'test-user-id', email: 'test@example.com' },
            expires: new Date().toISOString(),
        }
    });

    type Input = inferProcedureInput<AppRouter['user']['me']>;
    const input: Input = undefined;

    const result = await caller.me(input);

    expect(result).toEqual(mockUser);
    expect(mockDb.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'test-user-id' },
        select: {
            id: true,
            email: true,
            createdAt: true,
        },
    });
}); 