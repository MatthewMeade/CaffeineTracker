/// <reference types="vitest/globals" />
import { test, expect, vi } from 'vitest';
import { calculateDailyTotals } from '~/server/utils/daily-totals';
import { type PrismaClient, type Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

vi.mock('~/server/utils/user-limits', () => ({
    getEffectiveDailyLimit: vi.fn().mockResolvedValue(500),
}));

type MockDb = {
    caffeineEntry: {
        findMany: typeof vi.fn,
    },
};

test('calculateDailyTotals returns correct totals and limits', async () => {
    const userId = uuidv4();
    const testDate = new Date('2023-01-01T12:00:00Z');
    
    const mockEntries = [
        {
            id: uuidv4(),
            userId,
            name: 'Coffee',
            caffeineMg: 100 as unknown as Prisma.Decimal,
            consumedAt: testDate,
        },
        {
            id: uuidv4(),
            userId,
            name: 'Tea',
            caffeineMg: 50 as unknown as Prisma.Decimal,
            consumedAt: testDate,
        },
    ];

    const mockDb: MockDb = {
        caffeineEntry: {
            findMany: vi.fn().mockResolvedValue(mockEntries),
        },
    };

    const result = await calculateDailyTotals(mockDb as unknown as PrismaClient, userId, testDate);

    expect(result.dailyTotalMg).toBe(150);
    expect(result.dailyLimitMg).toBe(500);
    expect(result.overLimit).toBe(false);
    expect(result.remainingMg).toBe(350);

    // Verify that findMany was called with correct date range
    expect(mockDb.caffeineEntry.findMany).toHaveBeenCalledWith({
        where: {
            userId,
            consumedAt: {
                gte: new Date(Date.UTC(2023, 0, 1, 0, 0, 0, 0)),
                lte: new Date(Date.UTC(2023, 0, 1, 23, 59, 59, 999)),
            },
        },
    });
});

test('calculateDailyTotals handles over-limit case', async () => {
    const userId = uuidv4();
    const testDate = new Date('2023-01-01T12:00:00Z');
    
    const mockEntries = [
        {
            id: uuidv4(),
            userId,
            name: 'Strong Coffee',
            caffeineMg: 300 as unknown as Prisma.Decimal,
            consumedAt: testDate,
        },
        {
            id: uuidv4(),
            userId,
            name: 'Energy Drink',
            caffeineMg: 250 as unknown as Prisma.Decimal,
            consumedAt: testDate,
        },
    ];

    const mockDb: MockDb = {
        caffeineEntry: {
            findMany: vi.fn().mockResolvedValue(mockEntries),
        },
    };

    const result = await calculateDailyTotals(mockDb as unknown as PrismaClient, userId, testDate);

    expect(result.dailyTotalMg).toBe(550);
    expect(result.dailyLimitMg).toBe(500);
    expect(result.overLimit).toBe(true);
    expect(result.remainingMg).toBe(-50);
});

test('calculateDailyTotals handles empty entries', async () => {
    const userId = uuidv4();
    const testDate = new Date('2023-01-01T12:00:00Z');
    
    const mockDb: MockDb = {
        caffeineEntry: {
            findMany: vi.fn().mockResolvedValue([]),
        },
    };

    const result = await calculateDailyTotals(mockDb as unknown as PrismaClient, userId, testDate);

    expect(result.dailyTotalMg).toBe(0);
    expect(result.dailyLimitMg).toBe(500);
    expect(result.overLimit).toBe(false);
    expect(result.remainingMg).toBe(500);
}); 