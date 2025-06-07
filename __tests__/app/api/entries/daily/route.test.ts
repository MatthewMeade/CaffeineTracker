import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET } from '~/app/api/entries/daily/route';
import { auth } from '~/lib/auth';
import { prisma } from '~/lib/prisma';
import { getEffectiveDailyLimit } from '~/lib/limits';
import { Decimal } from '@prisma/client/runtime/library';
import type { Session } from 'next-auth';
import type { User, CaffeineEntry } from '@prisma/client';
import type { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('~/lib/auth', () => ({
    auth: vi.fn() as any
}));

vi.mock('~/lib/prisma', () => ({
    prisma: {
        user: {
            findUnique: vi.fn()
        },
        caffeineEntry: {
            findMany: vi.fn()
        }
    }
}));

vi.mock('~/lib/limits', () => ({
    getEffectiveDailyLimit: vi.fn()
}));

describe('GET /api/entries/daily', () => {
    const mockUser: User = {
        id: 'user-123',
        email: 'test@example.com',
        name: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        emailVerified: null,
        image: null,
    };

    const mockEntry: CaffeineEntry & { drink: { id: string; name: string } | null } = {
        id: 'entry-123',
        userId: mockUser.id,
        consumedAt: new Date('2024-03-15T12:00:00Z'),
        createdAt: new Date(),
        drinkId: 'drink-123',
        drink: {
            id: 'drink-123',
            name: 'Coffee',
        },
        quantity: 1,
    };

    beforeEach(() => {
        vi.clearAllMocks();
        // Mock Date.now() to return a fixed date
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2024-03-15'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should return 401 for unauthenticated requests', async () => {
        (auth as any).mockResolvedValue(null);

        const request = new Request('http://localhost:3000/api/entries/daily');
        const response = await GET(request as NextRequest);

        expect(response.status).toBe(401);
        const data = await response.json();
        expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 404 if user not found', async () => {
        const mockSession = {
            user: { id: mockUser.id, email: mockUser.email },
            expires: new Date().toISOString(),
        };
        (auth as any).mockResolvedValue(mockSession);
        vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

        const request = new Request('http://localhost:3000/api/entries/daily');
        const response = await GET(request as NextRequest);

        expect(response.status).toBe(404);
        const data = await response.json();
        expect(data.error.code).toBe('USER_NOT_FOUND');
    });

    it('should return 400 for invalid date format', async () => {
        const mockSession = {
            user: { id: mockUser.id, email: mockUser.email },
            expires: new Date().toISOString(),
        };
        (auth as any).mockResolvedValue(mockSession);
        vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);

        const request = new Request('http://localhost:3000/api/entries/daily?date=invalid');
        const response = await GET(request as NextRequest);

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error.code).toBe('INVALID_QUERY');
    });

    it('should return empty entries array when no entries exist for the day', async () => {
        const mockSession = {
            user: { id: mockUser.id, email: mockUser.email },
            expires: new Date().toISOString(),
        };
        (auth as any).mockResolvedValue(mockSession);
        vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
        vi.mocked(prisma.caffeineEntry.findMany).mockResolvedValue([]);
        vi.mocked(getEffectiveDailyLimit).mockResolvedValue(400);

        const request = new Request('http://localhost:3000/api/entries/daily');
        const response = await GET(request as NextRequest);

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.entries).toEqual([]);
        expect(data.daily_total_mg).toBe(0);
        expect(data.over_limit).toBe(false);
        expect(data.daily_limit_mg).toBe(400);
    });

    it('should return entries with correct totals and limit status', async () => {
        const mockEntries = [
            { ...mockEntry, id: 'entry-1', caffeineMg: new Decimal(200) },
            { ...mockEntry, id: 'entry-2', caffeineMg: new Decimal(150) },
            { ...mockEntry, id: 'entry-3', caffeineMg: new Decimal(100) },
        ];

        const mockSession = {
            user: { id: mockUser.id, email: mockUser.email },
            expires: new Date().toISOString(),
        };
        (auth as any).mockResolvedValue(mockSession);
        vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
        vi.mocked(prisma.caffeineEntry.findMany).mockResolvedValue(mockEntries);
        vi.mocked(getEffectiveDailyLimit).mockResolvedValue(400);

        const request = new Request('http://localhost:3000/api/entries/daily');
        const response = await GET(request as NextRequest);

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.entries).toHaveLength(3);
        expect(data.daily_total_mg).toBe(450); // 200 + 150 + 100
        expect(data.over_limit).toBe(true); // 450 > 400
        expect(data.daily_limit_mg).toBe(400);
    });

    it('should handle entries without associated drinks', async () => {
        const mockEntryWithoutDrink = {
            ...mockEntry,
            drink: null,
        };

        const mockSession = {
            user: { id: mockUser.id, email: mockUser.email },
            expires: new Date().toISOString(),
        };
        (auth as any).mockResolvedValue(mockSession);
        vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
        vi.mocked(prisma.caffeineEntry.findMany).mockResolvedValue([mockEntryWithoutDrink]);
        vi.mocked(getEffectiveDailyLimit).mockResolvedValue(400);

        const request = new Request('http://localhost:3000/api/entries/daily');
        const response = await GET(request as NextRequest);

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.entries[0].drink_name).toBeNull();
    });

    it('should handle case when no daily limit is set', async () => {
        const mockSession = {
            user: { id: mockUser.id, email: mockUser.email },
            expires: new Date().toISOString(),
        };
        (auth as any).mockResolvedValue(mockSession);
        vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
        vi.mocked(prisma.caffeineEntry.findMany).mockResolvedValue([mockEntry]);
        vi.mocked(getEffectiveDailyLimit).mockResolvedValue(null);

        const request = new Request('http://localhost:3000/api/entries/daily');
        const response = await GET(request as NextRequest);

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.daily_limit_mg).toBeNull();
        expect(data.over_limit).toBe(false);
    });

    it('should use provided date parameter', async () => {
        const testDate = '2024-03-14';
        const expectedStartOfDay = new Date(Date.UTC(2024, 2, 14, 0, 0, 0, 0));
        const expectedEndOfDay = new Date(Date.UTC(2024, 2, 14, 23, 59, 59, 999));

        const mockSession = {
            user: { id: mockUser.id, email: mockUser.email },
            expires: new Date().toISOString(),
        };
        (auth as any).mockResolvedValue(mockSession);
        vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
        vi.mocked(prisma.caffeineEntry.findMany).mockResolvedValue([]);
        vi.mocked(getEffectiveDailyLimit).mockResolvedValue(400);

        const request = new Request(`http://localhost:3000/api/entries/daily?date=${testDate}`);
        await GET(request as NextRequest);

        expect(prisma.caffeineEntry.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    consumedAt: {
                        gte: expectedStartOfDay,
                        lte: expectedEndOfDay,
                    },
                }),
            })
        );
    });
}); 