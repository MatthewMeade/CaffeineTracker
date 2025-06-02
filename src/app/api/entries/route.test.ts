import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET, POST } from './route';
import { auth } from '~/lib/auth';
import { prisma } from '~/lib/prisma';
import { getEffectiveDailyLimit } from '~/lib/limits';
import { Decimal } from '@prisma/client/runtime/library';
import type { Session } from 'next-auth';

// Mock dependencies
vi.mock('~/lib/auth', () => ({
    auth: vi.fn()
}));

vi.mock('~/lib/prisma', () => ({
    prisma: {
        user: {
            findUnique: vi.fn()
        },
        caffeineEntry: {
            findMany: vi.fn(),
            count: vi.fn(),
            create: vi.fn()
        },
        drink: {
            findUnique: vi.fn()
        }
    }
}));

vi.mock('~/lib/limits', () => ({
    getEffectiveDailyLimit: vi.fn()
}));

// Mock data with valid UUIDs
const mockValidDrinkId = '123e4567-e89b-12d3-a456-426614174000'; // Valid UUID format
const mockValidUserId = '123e4567-e89b-12d3-a456-426614174001'; // Valid UUID format
const mockValidEntryId = '123e4567-e89b-12d3-a456-426614174002'; // Valid UUID format

const mockUser = {
    id: mockValidUserId,
    email: 'test@example.com',
    name: 'Test User',
    emailVerified: new Date(),
    image: null,
    createdAt: new Date(),
    updatedAt: new Date(),
};

const mockDrink = {
    id: mockValidDrinkId,
    name: 'Test Coffee',
    caffeineMg: new Decimal(100),
    sizeMl: new Decimal(250),
    createdByUserId: mockValidUserId,
    createdAt: new Date(),
    updatedAt: new Date(),
};

const mockEntry = {
    id: mockValidEntryId,
    userId: mockValidUserId,
    drinkId: mockValidDrinkId,
    quantity: 1,
    consumedAt: new Date('2024-03-15T12:00:00Z'),
    createdAt: new Date(),
};
const mockEntryWithDrink = { ...mockEntry, drink: mockDrink };

describe('GET /api/entries', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (auth as any).mockResolvedValue({ user: { email: mockUser.email } });
        vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
    });

    it('should return 401 for unauthenticated requests', async () => {
        (auth as any).mockResolvedValue(null);

        const request = new Request('http://localhost:3000/api/entries');
        const response = await GET(request);

        expect(response.status).toBe(401);
        const data = await response.json();
        expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 404 if user not found', async () => {
        vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

        const request = new Request('http://localhost:3000/api/entries');
        const response = await GET(request);

        expect(response.status).toBe(404);
        const data = await response.json();
        expect(data.error.code).toBe('USER_NOT_FOUND');
    });

    it('should return 400 for invalid query parameters', async () => {
        const request = new Request('http://localhost:3000/api/entries?offset=-1');
        const response = await GET(request);

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error.code).toBe('INVALID_QUERY');
    });

    it('should return entries with pagination', async () => {
        const mockEntries = [
            { ...mockEntry, id: 'entry-1', consumedAt: new Date('2024-03-15T12:00:00Z'), drink: mockDrink } as any,
            { ...mockEntry, id: 'entry-2', consumedAt: new Date('2024-03-15T13:00:00Z'), drink: mockDrink } as any,
            { ...mockEntry, id: 'entry-3', consumedAt: new Date('2024-03-15T14:00:00Z'), drink: mockDrink } as any,
        ];

        vi.mocked(prisma.caffeineEntry.count).mockResolvedValue(3);
        vi.mocked(prisma.caffeineEntry.findMany).mockResolvedValue(mockEntries);

        const request = new Request('http://localhost:3000/api/entries?limit=2&offset=0');
        const response = await GET(request);

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.entries).toHaveLength(2);
        expect(data.has_more).toBe(true);
        expect(data.total).toBe(3);
        expect(data.entries[0].drink).toEqual({
            id: mockDrink.id,
            name: mockDrink.name,
            caffeine_mg: 100,
            size_ml: 250,
        });
        expect(typeof data.entries[0].consumed_at).toBe('string');
    });

    it('should filter entries by date range', async () => {
        const mockEntries = [
            { ...mockEntry, id: 'entry-1', consumedAt: new Date('2024-03-15T12:00:00Z'), drink: mockDrink } as any,
            { ...mockEntry, id: 'entry-2', consumedAt: new Date('2024-03-15T13:00:00Z'), drink: mockDrink } as any,
        ];

        vi.mocked(prisma.caffeineEntry.count).mockResolvedValue(2);
        vi.mocked(prisma.caffeineEntry.findMany).mockResolvedValue(mockEntries);

        const request = new Request(
            'http://localhost:3000/api/entries?start_date=2024-03-15T00:00:00Z&end_date=2024-03-15T23:59:59Z&limit=20&offset=0'
        );
        const response = await GET(request);

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.entries).toHaveLength(2);
        expect(data.total).toBe(2);
        expect(prisma.caffeineEntry.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    consumedAt: expect.objectContaining({
                        gte: new Date('2024-03-15T00:00:00Z'),
                        lte: new Date('2024-03-15T23:59:59Z'),
                    }),
                }),
            })
        );
    });

    it('should return entries with full drink information', async () => {
        const mockEntries = [{ ...mockEntry, consumedAt: new Date('2024-03-15T12:00:00Z'), drink: mockDrink } as any];
        vi.mocked(prisma.caffeineEntry.count).mockResolvedValue(1);
        vi.mocked(prisma.caffeineEntry.findMany).mockResolvedValue(mockEntries);

        const request = new Request('http://localhost:3000/api/entries?limit=20&offset=0');
        const response = await GET(request);

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.entries[0].drink).toEqual({
            id: mockDrink.id,
            name: mockDrink.name,
            caffeine_mg: 100,
            size_ml: 250,
        });
        expect(typeof data.entries[0].consumed_at).toBe('string');
    });

    it('should handle empty results', async () => {
        vi.mocked(prisma.caffeineEntry.count).mockResolvedValue(0);
        vi.mocked(prisma.caffeineEntry.findMany).mockResolvedValue([]);

        const request = new Request('http://localhost:3000/api/entries?limit=20&offset=0');
        const response = await GET(request);

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.entries).toHaveLength(0);
        expect(data.has_more).toBe(false);
        expect(data.total).toBe(0);
    });
});

describe('POST /api/entries', () => {
    const mockSession: Session = {
        user: {
            id: mockUser.id,
            email: mockUser.email,
            name: mockUser.name,
            image: mockUser.image
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    };

    beforeEach(() => {
        vi.clearAllMocks();
        (auth as any).mockResolvedValue(mockSession);
        vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
        vi.mocked(prisma.drink.findUnique).mockResolvedValue(mockDrink);
        vi.mocked(prisma.caffeineEntry.create).mockResolvedValue({ ...mockEntry, consumedAt: new Date('2024-03-15T12:00:00Z'), drink: mockDrink } as any);
        vi.mocked(prisma.caffeineEntry.findMany).mockResolvedValue([{ ...mockEntry, consumedAt: new Date('2024-03-15T12:00:00Z'), drink: mockDrink } as any]);
        vi.mocked(getEffectiveDailyLimit).mockResolvedValue(400);
    });

    it('should return 401 for unauthenticated requests', async () => {
        (auth as any).mockResolvedValue(null);

        const response = await POST(new Request('http://localhost:3000/api/entries', {
            method: 'POST',
            body: JSON.stringify({
                drink_id: mockDrink.id,
                quantity: 1,
                consumed_at: '2024-03-15T12:00:00Z',
            }),
        }));

        expect(response.status).toBe(401);
        const data = await response.json();
        expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 404 if user not found', async () => {
        vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

        const response = await POST(new Request('http://localhost:3000/api/entries', {
            method: 'POST',
            body: JSON.stringify({
                drink_id: mockDrink.id,
                quantity: 1,
                consumed_at: '2024-03-15T12:00:00Z',
            }),
        }));

        expect(response.status).toBe(404);
        const data = await response.json();
        expect(data.error.code).toBe('USER_NOT_FOUND');
    });

    it('should return 400 for invalid request body', async () => {
        const response = await POST(new Request('http://localhost:3000/api/entries', {
            method: 'POST',
            body: JSON.stringify({
                drink_id: 'invalid-uuid',
                quantity: -1,
                consumed_at: 'invalid-date',
            }),
        }));

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error.code).toBe('INVALID_REQUEST');
    });

    it('should create entry with calculated caffeine_mg from drink', async () => {
        const mockEntryWithDrink2 = {
            ...mockEntry,
            drinkId: mockDrink.id,
            quantity: 2,
            consumedAt: new Date('2024-03-15T12:00:00Z'),
            drink: mockDrink,
        } as any;
        vi.mocked(prisma.caffeineEntry.create).mockResolvedValue(mockEntryWithDrink2);

        const response = await POST(new Request('http://localhost:3000/api/entries', {
            method: 'POST',
            body: JSON.stringify({
                drink_id: mockDrink.id,
                quantity: 2,
                consumed_at: '2024-03-15T12:00:00Z',
            }),
        }));

        expect(response.status).toBe(201);
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.entry.drink_name).toBe(mockDrink.name);
        expect(data.entry.quantity).toBe(2);
        expect(typeof data.entry.consumed_at).toBe('string');
    });

    it('should return 404 if drink not found', async () => {
        vi.mocked(prisma.drink.findUnique).mockResolvedValue(null);

        const response = await POST(new Request('http://localhost:3000/api/entries', {
            method: 'POST',
            body: JSON.stringify({
                drink_id: '11111111-1111-1111-1111-111111111111',
                quantity: 2,
                consumed_at: '2024-03-15T12:00:00Z',
            }),
        }));

        expect(response.status).toBe(404);
        const data = await response.json();
        expect(data.error.code).toBe('DRINK_NOT_FOUND');
    });

    it('should calculate over_limit and remaining_mg correctly', async () => {
        const mockEntries = [
            { ...mockEntry, id: 'entry-1', quantity: 2, consumedAt: new Date('2024-03-15T12:00:00Z'), drink: mockDrink } as any,
            { ...mockEntry, id: 'entry-2', quantity: 1, consumedAt: new Date('2024-03-15T13:00:00Z'), drink: mockDrink } as any,
            { ...mockEntry, id: 'entry-3', quantity: 1, consumedAt: new Date('2024-03-15T14:00:00Z'), drink: mockDrink } as any,
        ];
        vi.mocked(prisma.caffeineEntry.findMany).mockResolvedValue(mockEntries);
        vi.mocked(getEffectiveDailyLimit).mockResolvedValue(300);

        const response = await POST(new Request('http://localhost:3000/api/entries', {
            method: 'POST',
            body: JSON.stringify({
                drink_id: mockDrink.id,
                quantity: 1,
                consumed_at: '2024-03-15T12:00:00Z',
            }),
        }));

        expect(response.status).toBe(201);
        const data = await response.json();
        expect(data.over_limit).toBe(true);
        expect(data.remaining_mg).toBeLessThan(0);
    });
}); 