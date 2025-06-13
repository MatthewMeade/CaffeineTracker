import { Decimal } from '@prisma/client/runtime/library';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getEffectiveDailyLimit } from '~/server/utils/user-limits';
import { prisma } from '~/lib/prisma';

// Mock the prisma client
vi.mock('~/lib/prisma', () => ({
    prisma: {
        userDailyLimit: {
            findFirst: vi.fn()
        }
    }
}));

describe('getEffectiveDailyLimit', () => {
    const mockUserId = 'test-user-id';
    const mockDate = new Date('2024-03-15T12:00:00Z');

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should return null when no limits exist', async () => {
        vi.mocked(prisma.userDailyLimit.findFirst).mockResolvedValue(null);

        const result = await getEffectiveDailyLimit(mockUserId, mockDate);

        expect(result).toBeNull();
        expect(prisma.userDailyLimit.findFirst).toHaveBeenCalledWith({
            where: {
                userId: mockUserId,
                effectiveFrom: {
                    lte: new Date('2024-03-15T00:00:00Z')
                }
            },
            orderBy: {
                effectiveFrom: 'desc'
            }
        });
    });

    it('should return the limit when one exists before the given date', async () => {
        const mockLimit = {
            id: 'limit-1',
            userId: mockUserId,
            limitMg: new Decimal(400),
            effectiveFrom: new Date('2024-03-01T00:00:00Z'),
            createdAt: new Date()
        };

        vi.mocked(prisma.userDailyLimit.findFirst).mockResolvedValue(mockLimit);

        const result = await getEffectiveDailyLimit(mockUserId, mockDate);

        expect(result).toBe(400);
    });

    it('should return the limit when one exists on the given date', async () => {
        const mockLimit = {
            id: 'limit-1',
            userId: mockUserId,
            limitMg: new Decimal(400),
            effectiveFrom: new Date('2024-03-15T00:00:00Z'),
            createdAt: new Date()
        };

        vi.mocked(prisma.userDailyLimit.findFirst).mockResolvedValue(mockLimit);

        const result = await getEffectiveDailyLimit(mockUserId, mockDate);

        expect(result).toBe(400);
    });

    it('should return null when the only limit is after the given date', async () => {
        const mockLimit = {
            id: 'limit-1',
            userId: mockUserId,
            limitMg: new Decimal(400),
            effectiveFrom: new Date('2024-03-16T00:00:00Z'),
            createdAt: new Date()
        };

        vi.mocked(prisma.userDailyLimit.findFirst).mockResolvedValue(null);

        const result = await getEffectiveDailyLimit(mockUserId, mockDate);

        expect(result).toBeNull();
    });

    it('should return the most recent limit when multiple limits exist', async () => {
        const mockLimit = {
            id: 'limit-2',
            userId: mockUserId,
            limitMg: new Decimal(300),
            effectiveFrom: new Date('2024-03-10T00:00:00Z'),
            createdAt: new Date()
        };

        vi.mocked(prisma.userDailyLimit.findFirst).mockResolvedValue(mockLimit);

        const result = await getEffectiveDailyLimit(mockUserId, mockDate);

        expect(result).toBe(300);
    });

    it('should handle limits set on the same day', async () => {
        const mockLimit = {
            id: 'limit-1',
            userId: mockUserId,
            limitMg: new Decimal(400),
            effectiveFrom: new Date('2024-03-15T00:00:00Z'),
            createdAt: new Date()
        };

        vi.mocked(prisma.userDailyLimit.findFirst).mockResolvedValue(mockLimit);

        const result = await getEffectiveDailyLimit(mockUserId, mockDate);

        expect(result).toBe(400);
    });
}); 