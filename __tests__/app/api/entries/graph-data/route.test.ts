import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from "~/app/api/entries/graph-data/route";
import { auth } from '~/auth';
import { db } from '~/server/db';
import { getEffectiveDailyLimit } from '~/lib/utils/limits';

// Mock next/server
vi.mock('next/server', () => {
    class MockNextRequest {
        url: string;
        cookies: any = {};
        nextUrl: any = {};
        page: any = {};
        ua: any = {};
        geo: any = {};
        ip: string = '';
        headers: any = {};
        body: any;
        method: string = 'GET';
        [key: string]: any;
        constructor(url: string) {
            this.url = url;
        }
        clone() {
            return new MockNextRequest(this.url);
        }
        arrayBuffer() {
            return Promise.resolve(new ArrayBuffer(0));
        }
        blob() {
            return Promise.resolve(new Blob());
        }
        formData() {
            return Promise.resolve(new FormData());
        }
        json() {
            return Promise.resolve({});
        }
        text() {
            return Promise.resolve('');
        }
    }

    return {
        NextRequest: MockNextRequest,
        NextResponse: {
            json: vi.fn((data, init) => ({
                json: async () => data,
                status: init?.status || 200,
            })),
        },
    };
});

// Mock dependencies
vi.mock('~/auth', () => ({
    auth: vi.fn(),
}));

vi.mock('~/server/db', () => ({
    db: {
        user: {
            findUnique: vi.fn(),
        },
        caffeineEntry: {
            findMany: vi.fn(),
        },
    },
}));

vi.mock('~/lib/utils/limits', () => ({
    getEffectiveDailyLimit: vi.fn(),
}));

describe('GET /api/entries/graph-data', () => {
    const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
    };

    const mockEntries = [
        {
            id: 'entry-1',
            userId: 'user-1',
            drinkId: 'drink-1',
            quantity: 1,
            consumedAt: new Date('2024-01-01T10:00:00Z'),
            drink: {
                id: 'drink-1',
                name: 'Coffee',
                caffeineMg: 100,
                sizeMl: 250,
            },
        },
        {
            id: 'entry-2',
            userId: 'user-1',
            drinkId: 'drink-2',
            quantity: 1,
            consumedAt: new Date('2024-01-01T14:00:00Z'),
            drink: {
                id: 'drink-2',
                name: 'Tea',
                caffeineMg: 150,
                sizeMl: 300,
            },
        },
        {
            id: 'entry-3',
            userId: 'user-1',
            drinkId: 'drink-3',
            quantity: 1,
            consumedAt: new Date('2024-01-02T09:00:00Z'),
            drink: {
                id: 'drink-3',
                name: 'Energy Drink',
                caffeineMg: 200,
                sizeMl: 500,
            },
        },
    ];

    const mockLimit = {
        limit_mg: 300,
        effective_from: new Date('2024-01-01T00:00:00Z'),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        (auth as any).mockResolvedValue({ user: { email: mockUser.email } });
        (db.user.findUnique as any).mockResolvedValue(mockUser);
        (db.caffeineEntry.findMany as any).mockResolvedValue(mockEntries);
        (getEffectiveDailyLimit as any).mockResolvedValue(mockLimit);
    });

    const createMockRequest = (url: string) => {
        const { NextRequest } = require('next/server');
        return new NextRequest(url);
    };

    it('should return 401 if not authenticated', async () => {
        (auth as any).mockResolvedValue(null);

        const request = createMockRequest('http://localhost/api/entries/graph-data?start_date=2024-01-01&end_date=2024-01-02');
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 400 for invalid date parameters', async () => {
        const request = createMockRequest('http://localhost/api/entries/graph-data?start_date=invalid&end_date=2024-01-02');
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error.code).toBe('INVALID_PARAMS');
    });

    it('should return 400 if start date is after end date', async () => {
        const request = createMockRequest('http://localhost/api/entries/graph-data?start_date=2024-01-02&end_date=2024-01-01');
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error.code).toBe('INVALID_DATE_RANGE');
    });

    it('should return 404 if user not found', async () => {
        (db.user.findUnique as any).mockResolvedValue(null);

        const request = createMockRequest('http://localhost/api/entries/graph-data?start_date=2024-01-01&end_date=2024-01-02');
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(404);
        expect(data.error.code).toBe('USER_NOT_FOUND');
    });

    it('should return correct data for date range with entries', async () => {
        const request = createMockRequest('http://localhost/api/entries/graph-data?start_date=2024-01-01&end_date=2024-01-02');
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.data).toHaveLength(2);
        expect(data.data[0]).toEqual({
            date: '2024-01-01',
            total_mg: 250, // 100 + 150
            limit_exceeded: false,
            limit_mg: 300,
        });
        expect(data.data[1]).toEqual({
            date: '2024-01-02',
            total_mg: 200,
            limit_exceeded: false,
            limit_mg: 300,
        });
    });

    it('should handle date range with no entries', async () => {
        (db.caffeineEntry.findMany as any).mockResolvedValue([]);

        const request = createMockRequest('http://localhost/api/entries/graph-data?start_date=2024-01-01&end_date=2024-01-02');
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.data).toHaveLength(2);
        expect(data.data[0]).toEqual({
            date: '2024-01-01',
            total_mg: 0,
            limit_exceeded: false,
            limit_mg: 300,
        });
        expect(data.data[1]).toEqual({
            date: '2024-01-02',
            total_mg: 0,
            limit_exceeded: false,
            limit_mg: 300,
        });
    });

    it('should correctly identify when limit is exceeded', async () => {
        const entriesWithHighAmount = [
            {
                id: 'entry-1',
                userId: 'user-1',
                drinkId: 'drink-1',
                quantity: 1,
                consumedAt: new Date('2024-01-01T10:00:00Z'),
                drink: {
                    id: 'drink-1',
                    name: 'Strong Coffee',
                    caffeineMg: 400, // Exceeds 300mg limit
                    sizeMl: 500,
                },
            },
        ];
        (db.caffeineEntry.findMany as any).mockResolvedValue(entriesWithHighAmount);

        const request = createMockRequest('http://localhost/api/entries/graph-data?start_date=2024-01-01&end_date=2024-01-01');
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.data).toHaveLength(1);
        expect(data.data[0]).toEqual({
            date: '2024-01-01',
            total_mg: 400,
            limit_exceeded: true,
            limit_mg: 300,
        });
    });
}); 