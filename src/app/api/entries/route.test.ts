import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from './route';
import { auth } from '~/lib/auth';
import { prisma } from '~/lib/prisma';
import { getEffectiveDailyLimit } from '~/lib/limits';
import { Decimal } from '@prisma/client/runtime/library';
import type { Session } from 'next-auth';

// Mock dependencies
vi.mock('~/lib/auth', () => ({
    auth: vi.fn()
}));
vi.mock('~/lib/prisma');
vi.mock('~/lib/limits');

describe('POST /api/entries', () => {
    const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        emailVerified: null,
        image: null,
    };

    const mockSession: Session = {
        user: {
            id: mockUser.id,
            email: mockUser.email,
            name: mockUser.name,
            image: mockUser.image
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    };

    const mockDrink = {
        id: '22222222-2222-2222-2222-222222222222', // valid UUID
        name: 'Coffee',
        caffeineMg: new Decimal(100),
        sizeMl: new Decimal(240),
        createdByUserId: mockUser.id,
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    const mockEntry = {
        id: 'entry-123',
        userId: mockUser.id,
        drinkId: mockDrink.id,
        quantity: 1,
        consumedAt: new Date('2024-03-15T12:00:00Z'),
        createdAt: new Date('2024-03-15T12:00:00Z'),
        drink: mockDrink,
    };

    let userFindUniqueSpy: any;
    let caffeineEntryCreateSpy: any;
    let caffeineEntryFindManySpy: any;
    let drinkFindUniqueSpy: any;

    beforeEach(() => {
        vi.clearAllMocks();
        (auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockSession);
        userFindUniqueSpy = vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser);
        caffeineEntryCreateSpy = vi.spyOn(prisma.caffeineEntry, 'create').mockResolvedValue(mockEntry);
        caffeineEntryFindManySpy = vi.spyOn(prisma.caffeineEntry, 'findMany').mockResolvedValue([mockEntry]);
        drinkFindUniqueSpy = vi.spyOn(prisma.drink, 'findUnique').mockResolvedValue(mockDrink);
        vi.mocked(getEffectiveDailyLimit).mockResolvedValue(400);
    });

    afterEach(() => {
        userFindUniqueSpy.mockRestore();
        caffeineEntryCreateSpy.mockRestore();
        caffeineEntryFindManySpy.mockRestore();
        drinkFindUniqueSpy.mockRestore();
    });

    it('should return 401 for unauthenticated requests', async () => {
        (auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);

        const response = await POST(new Request('http://localhost:3000/api/entries', {
            method: 'POST',
            body: JSON.stringify({
                caffeine_mg: 100,
                consumed_at: '2024-03-15T12:00:00Z',
            }),
        }));

        expect(response.status).toBe(401);
        const data = await response.json();
        expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 404 if user not found', async () => {
        userFindUniqueSpy.mockResolvedValueOnce(null);

        const response = await POST(new Request('http://localhost:3000/api/entries', {
            method: 'POST',
            body: JSON.stringify({
                caffeine_mg: 100,
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
                caffeine_mg: -100, // Invalid: negative value
                consumed_at: '2024-03-15T12:00:00Z',
            }),
        }));

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error.code).toBe('INVALID_REQUEST');
    });

    it('should create entry with calculated caffeine_mg from drink', async () => {
        const mockEntryWithDrink = {
            ...mockEntry,
            drinkId: mockDrink.id,
            drink: mockDrink,
            quantity: 2,
        };
        caffeineEntryCreateSpy.mockResolvedValueOnce(mockEntryWithDrink);

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
        expect(data.entry.drink_id).toBe(mockDrink.id);
        expect(data.entry.quantity).toBe(2);
    });

    it('should return 404 if drink not found', async () => {
        drinkFindUniqueSpy.mockResolvedValueOnce(null);

        const response = await POST(new Request('http://localhost:3000/api/entries', {
            method: 'POST',
            body: JSON.stringify({
                drink_id: '11111111-1111-1111-1111-111111111111', // valid UUID
                quantity: 2,
                consumed_at: '2024-03-15T12:00:00Z',
            }),
        }));

        expect(response.status).toBe(404);
        const data = await response.json();
        expect(data.error.code).toBe('DRINK_NOT_FOUND');
    });

    it('should calculate over_limit and remaining_mg correctly', async () => {
        // Mock multiple entries for the day
        const mockEntries = [
            { ...mockEntry, id: 'entry-1', quantity: 2 },
            { ...mockEntry, id: 'entry-2', quantity: 1 },
            { ...mockEntry, id: 'entry-3', quantity: 1 },
        ];
        caffeineEntryFindManySpy.mockResolvedValueOnce(mockEntries);
        vi.mocked(getEffectiveDailyLimit).mockResolvedValue(3);

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