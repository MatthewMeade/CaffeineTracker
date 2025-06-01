import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PUT } from './route';
import { auth } from '~/lib/auth';
import { prisma } from '~/lib/prisma';
import { getEffectiveDailyLimit } from '~/lib/limits';
import { Decimal } from '@prisma/client/runtime/library';
import type { Session } from 'next-auth';
import type { User, CaffeineEntry } from '@prisma/client';

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
            findUnique: vi.fn(),
            update: vi.fn(),
            findMany: vi.fn()
        }
    }
}));

vi.mock('~/lib/limits', () => ({
    getEffectiveDailyLimit: vi.fn()
}));

describe('PUT /api/entries/[id]', () => {
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
        drinkId: 'drink-123',
        caffeineMg: new Decimal(100),
        consumedAt: new Date('2024-03-15T12:00:00Z'),
        createdAt: new Date('2024-03-15T12:00:00Z'),
        drink: {
            id: 'drink-123',
            name: 'Coffee',
        },
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

    beforeEach(() => {
        vi.clearAllMocks();
        (auth as any).mockResolvedValue(mockSession);
        vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
        vi.mocked(prisma.caffeineEntry.findUnique).mockResolvedValue(mockEntry);
        vi.mocked(prisma.caffeineEntry.update).mockResolvedValue(mockEntry);
        vi.mocked(prisma.caffeineEntry.findMany).mockResolvedValue([mockEntry]);
        vi.mocked(getEffectiveDailyLimit).mockResolvedValue(400);
    });

    it('should return 401 for unauthenticated requests', async () => {
        (auth as any).mockResolvedValue(null);

        const request = new Request('http://localhost:3000/api/entries/entry-123', {
            method: 'PUT',
            body: JSON.stringify({
                caffeine_mg: 150,
            }),
        });

        const response = await PUT(request, { params: { id: 'entry-123' } });
        expect(response.status).toBe(401);
        const data = await response.json();
        expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 404 if user not found', async () => {
        vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

        const request = new Request('http://localhost:3000/api/entries/entry-123', {
            method: 'PUT',
            body: JSON.stringify({
                caffeine_mg: 150,
            }),
        });

        const response = await PUT(request, { params: { id: 'entry-123' } });
        expect(response.status).toBe(404);
        const data = await response.json();
        expect(data.error.code).toBe('USER_NOT_FOUND');
    });

    it('should return 404 if entry not found', async () => {
        vi.mocked(prisma.caffeineEntry.findUnique).mockResolvedValue(null);

        const request = new Request('http://localhost:3000/api/entries/non-existent', {
            method: 'PUT',
            body: JSON.stringify({
                caffeine_mg: 150,
            }),
        });

        const response = await PUT(request, { params: { id: 'non-existent' } });
        expect(response.status).toBe(404);
        const data = await response.json();
        expect(data.error.code).toBe('ENTRY_NOT_FOUND');
    });

    it('should return 403 if user does not own the entry', async () => {
        const otherUserEntry = {
            ...mockEntry,
            userId: 'other-user-123',
        };
        vi.mocked(prisma.caffeineEntry.findUnique).mockResolvedValue(otherUserEntry);

        const request = new Request('http://localhost:3000/api/entries/entry-123', {
            method: 'PUT',
            body: JSON.stringify({
                caffeine_mg: 150,
            }),
        });

        const response = await PUT(request, { params: { id: 'entry-123' } });
        expect(response.status).toBe(403);
        const data = await response.json();
        expect(data.error.code).toBe('FORBIDDEN');
    });

    it('should return 400 for invalid request body', async () => {
        const request = new Request('http://localhost:3000/api/entries/entry-123', {
            method: 'PUT',
            body: JSON.stringify({
                caffeine_mg: -100, // Invalid: negative value
            }),
        });

        const response = await PUT(request, { params: { id: 'entry-123' } });
        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error.code).toBe('INVALID_REQUEST');
    });

    it('should return 400 if no update fields provided', async () => {
        const request = new Request('http://localhost:3000/api/entries/entry-123', {
            method: 'PUT',
            body: JSON.stringify({}),
        });

        const response = await PUT(request, { params: { id: 'entry-123' } });
        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error.code).toBe('INVALID_REQUEST');
    });

    it('should successfully update caffeine_mg', async () => {
        const updatedEntry = {
            ...mockEntry,
            caffeineMg: new Decimal(150),
        };
        vi.mocked(prisma.caffeineEntry.update).mockResolvedValue(updatedEntry);

        const request = new Request('http://localhost:3000/api/entries/entry-123', {
            method: 'PUT',
            body: JSON.stringify({
                caffeine_mg: 150,
            }),
        });

        const response = await PUT(request, { params: { id: 'entry-123' } });
        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(Number(data.entry.caffeine_mg)).toBe(150);
    });

    it('should successfully update consumed_at', async () => {
        const newDate = '2024-03-16T12:00:00Z';
        const updatedEntry = {
            ...mockEntry,
            consumedAt: new Date(newDate),
        };
        vi.mocked(prisma.caffeineEntry.update).mockResolvedValue(updatedEntry);

        const request = new Request('http://localhost:3000/api/entries/entry-123', {
            method: 'PUT',
            body: JSON.stringify({
                consumed_at: newDate,
            }),
        });

        const response = await PUT(request, { params: { id: 'entry-123' } });
        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(new Date(data.entry.consumed_at).toISOString()).toBe(new Date(newDate).toISOString());
    });

    it('should calculate over_limit and remaining_mg correctly', async () => {
        const mockEntries = [
            { ...mockEntry, id: 'entry-1', caffeineMg: new Decimal(200) },
            { ...mockEntry, id: 'entry-2', caffeineMg: new Decimal(150) },
            { ...mockEntry, id: 'entry-3', caffeineMg: new Decimal(100) },
        ];
        vi.mocked(prisma.caffeineEntry.findMany).mockResolvedValue(mockEntries);
        vi.mocked(getEffectiveDailyLimit).mockResolvedValue(300);

        const request = new Request('http://localhost:3000/api/entries/entry-123', {
            method: 'PUT',
            body: JSON.stringify({
                caffeine_mg: 100,
            }),
        });

        const response = await PUT(request, { params: { id: 'entry-123' } });
        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.over_limit).toBe(true); // 200 + 150 + 100 > 300
        expect(data.remaining_mg).toBe(-150); // 300 - (200 + 150 + 100)
    });

    it('should handle case when no daily limit is set', async () => {
        vi.mocked(getEffectiveDailyLimit).mockResolvedValue(null);

        const request = new Request('http://localhost:3000/api/entries/entry-123', {
            method: 'PUT',
            body: JSON.stringify({
                caffeine_mg: 100,
            }),
        });

        const response = await PUT(request, { params: { id: 'entry-123' } });
        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.over_limit).toBe(false);
        expect(data.remaining_mg).toBeNull();
    });
}); 