// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { GET, POST } from './route';
import { auth } from '~/lib/auth';
import { prisma } from '~/lib/prisma';
import { type Session } from 'next-auth';
import { Prisma } from '@prisma/client';

// Mock auth and prisma
vi.mock('~/lib/auth', () => ({
    auth: vi.fn(),
}));

vi.mock('~/lib/prisma', () => ({
    prisma: {
        user: {
            findUnique: vi.fn(),
        },
        $queryRaw: vi.fn(),
        drink: {
            create: vi.fn(),
        },
    },
}));

describe('GET /api/drinks/search', () => {
    const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
    };

    const mockSession: Session = {
        user: {
            id: 'user-123',
            email: mockUser.email
        },
        expires: new Date().toISOString(),
    };

    it('should return 401 if not authenticated', async () => {
        // Mock auth to return null (not authenticated)
        (auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);

        // Don't mock prisma.user.findUnique since we should return 401 before that

        const request = new Request('http://localhost:3000/api/drinks/search?q=coffee');
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 400 if search query is too short', async () => {
        // Mock auth to return authenticated session
        (auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockSession);
        vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

        const request = new Request('http://localhost:3000/api/drinks/search?q=a');
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error.code).toBe('INVALID_QUERY');
    });

    it('should return empty array if no drinks found', async () => {
        (auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockSession);
        vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
        vi.mocked(prisma.$queryRaw).mockResolvedValue([]);

        const request = new Request('http://localhost:3000/api/drinks/search?q=nonexistent');
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.drinks).toEqual([]);
    });

    it('should return drinks with user-created drinks prioritized', async () => {
        (auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockSession);
        vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

        const mockDrinks = [
            {
                id: 'drink-1',
                name: 'Coffee',
                caffeineMgPerMl: 0.1,
                baseSizeMl: 250,
                createdByUserId: 'user-123',
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                id: 'drink-2',
                name: 'Tea',
                caffeineMgPerMl: 0.05,
                baseSizeMl: 250,
                createdByUserId: 'other-user',
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        ];

        vi.mocked(prisma.$queryRaw).mockResolvedValue(mockDrinks);

        const request = new Request('http://localhost:3000/api/drinks/search?q=coffee');
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.drinks).toHaveLength(2);
        expect(data.drinks[0].created_by_user_id).toBe('user-123');
        expect(data.drinks[1].created_by_user_id).toBe('other-user');
    });

    it('should handle server errors gracefully', async () => {
        (auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockSession);
        vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

        // Mock console.error to prevent error output in tests
        const originalConsoleError = console.error;
        console.error = vi.fn();

        try {
            vi.mocked(prisma.$queryRaw).mockRejectedValue(new Error('Database error'));

            const request = new Request('http://localhost:3000/api/drinks/search?q=coffee');
            const response = await GET(request);
            const data = await response.json();

            expect(response.status).toBe(500);
            expect(data.error.code).toBe('INTERNAL_SERVER_ERROR');
        } finally {
            // Restore console.error
            console.error = originalConsoleError;
        }
    });
});

describe('POST /api/drinks', () => {
    const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
    };

    const mockSession: Session = {
        user: {
            id: 'user-123',
            email: mockUser.email
        },
        expires: new Date().toISOString(),
    };

    it('should create a new drink when authenticated', async () => {
        (auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockSession);
        vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

        const uniqueDrinkName = `Test Drink ${Date.now()}`;
        const req = new Request('http://localhost:3000/api/drinks', {
            method: 'POST',
            body: JSON.stringify({
                name: uniqueDrinkName,
                caffeine_mg: 100,
                size_ml: 250,
            }),
            headers: { 'Content-Type': 'application/json' },
        });

        const mockCreatedDrink = {
            id: 'drink-1',
            name: uniqueDrinkName,
            caffeineMg: 100,
            sizeMl: 250,
            createdByUserId: mockUser.id,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        vi.mocked(prisma.drink.create).mockResolvedValue(mockCreatedDrink as any);

        // Import POST dynamically to avoid hoisting issues
        const { POST } = await import('./route');
        const response = await POST(req);
        const data = await response.json();
        expect(response.status).toBe(201);
        expect(data.success).toBe(true);
        expect(data.drink).toMatchObject({
            name: uniqueDrinkName,
            caffeine_mg: 100,
            size_ml: 250,
            created_by_user_id: mockUser.id,
        });
    });

    it('should return 401 when not authenticated', async () => {
        (auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);

        const req = new Request('http://localhost:3000/api/drinks', {
            method: 'POST',
            body: JSON.stringify({
                name: `Test Drink ${Date.now()}`,
                caffeine_mg: 100,
                size_ml: 250,
            }),
            headers: { 'Content-Type': 'application/json' },
        });

        // Import POST dynamically to avoid hoisting issues
        const { POST } = await import('./route');
        const response = await POST(req);
        const data = await response.json();
        expect(response.status).toBe(401);
        expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 400 for invalid request body', async () => {
        (auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockSession);
        vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

        const req = new Request('http://localhost:3000/api/drinks', {
            method: 'POST',
            body: JSON.stringify({
                name: `Test Drink ${Date.now()}`,
                caffeine_mg: 'invalid', // Invalid type
                size_ml: 250,
            }),
            headers: { 'Content-Type': 'application/json' },
        });

        // Import POST dynamically to avoid hoisting issues
        const { POST } = await import('./route');
        const response = await POST(req);
        const data = await response.json();
        expect(response.status).toBe(400);
        expect(data.error.code).toBe('INVALID_REQUEST');
    });
}); 