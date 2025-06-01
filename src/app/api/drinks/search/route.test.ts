import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import type { Session } from 'next-auth';
import { auth } from '~/auth';

// Mock next/server
vi.mock('next/server', () => ({
    NextRequest: class {
        url: string;
        constructor(url: string) {
            this.url = url;
        }
        get nextUrl() {
            return new URL(this.url);
        }
    },
    NextResponse: {
        json: (body: any, init?: any) => {
            return {
                status: init?.status ?? 200,
                json: async () => body,
            };
        },
    },
}));

// Mock auth first (before any variable declarations)
vi.mock('~/auth', () => ({
    auth: vi.fn().mockImplementation(() => Promise.resolve(null))
}));

// Create shared mock functions
const mockFindUnique = vi.fn();
const mockFindMany = vi.fn();

// Mock PrismaClient so all handler instances use the same mocks
vi.mock('@prisma/client', () => {
    return {
        PrismaClient: class {
            user = { findUnique: mockFindUnique };
            drink = { findMany: mockFindMany };
        },
        Prisma: {
            Decimal: class {
                value: number;
                constructor(val: number) { this.value = val; }
                toNumber() { return this.value; }
                toString() { return String(this.value); }
            }
        }
    };
});

// Define mock data
const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    createdAt: new Date(),
    updatedAt: new Date(),
    name: 'Test User',
    emailVerified: null,
    image: null,
};

const mockSession = {
    user: {
        id: 'user-1',
        email: mockUser.email,
    },
    expires: new Date().toISOString(),
};

let Prisma: typeof import('@prisma/client').Prisma;
let GET: (request: NextRequest) => Promise<Response>;

describe('GET /api/drinks/search', () => {
    beforeAll(async () => {
        // Import after mocks are set up
        ({ Prisma } = await import('@prisma/client'));
        ({ GET } = await import('./route'));
    });

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should return 401 if not authenticated', async () => {
        auth.mockResolvedValue(null);
        mockFindUnique.mockResolvedValue(mockUser);
        mockFindMany.mockResolvedValue([]);

        const request = new NextRequest('http://localhost:3000/api/drinks/search?q=coffee');
        const response = await GET(request);

        expect(response.status).toBe(401);
        expect(await response.json()).toEqual({
            error: { message: 'Unauthorized', code: 'UNAUTHORIZED' },
        });
    });

    it('should return empty list for short query', async () => {
        auth.mockResolvedValue(mockSession);
        mockFindUnique.mockResolvedValue(mockUser);
        mockFindMany.mockResolvedValue([]);

        const request = new NextRequest('http://localhost:3000/api/drinks/search?q=c');
        const response = await GET(request);

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ drinks: [] });
    });

    it('should return empty list for empty query', async () => {
        auth.mockResolvedValue(mockSession);
        mockFindUnique.mockResolvedValue(mockUser);
        mockFindMany.mockResolvedValue([]);

        const request = new NextRequest('http://localhost:3000/api/drinks/search?q=');
        const response = await GET(request);

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ drinks: [] });
    });

    it('should return drinks with user-created drinks prioritized', async () => {
        auth.mockResolvedValue(mockSession);
        mockFindUnique.mockResolvedValue(mockUser);
        mockFindMany.mockResolvedValue([
            {
                id: 'drink-1',
                name: 'Coffee',
                caffeineMgPerMl: new Prisma.Decimal(0.5),
                baseSizeMl: new Prisma.Decimal(250),
                createdByUserId: 'user-1',
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                id: 'drink-2',
                name: 'Tea',
                caffeineMgPerMl: new Prisma.Decimal(0.2),
                baseSizeMl: new Prisma.Decimal(250),
                createdByUserId: 'user-2',
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        ]);

        const request = new NextRequest('http://localhost:3000/api/drinks/search?q=coffee');
        const response = await GET(request);

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.drinks).toHaveLength(2);
        expect(data.drinks[0].createdByUserId).toBe('user-1');
        expect(data.drinks[1].createdByUserId).toBe('user-2');
    });

    it('should handle database errors gracefully', async () => {
        auth.mockResolvedValue(mockSession);
        mockFindUnique.mockResolvedValue(mockUser);
        mockFindMany.mockRejectedValue(new Error('Database error'));

        const request = new NextRequest('http://localhost:3000/api/drinks/search?q=coffee');
        const response = await GET(request);

        expect(response.status).toBe(500);
        expect(await response.json()).toEqual({
            error: { message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' },
        });
    });
}); 