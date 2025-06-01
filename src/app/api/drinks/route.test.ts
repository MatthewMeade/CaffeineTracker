import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { POST } from './route';
import { prisma } from '../../../test/setup';
import { auth } from '~/lib/auth';
import { vi } from 'vitest';
import { type Session } from 'next-auth';

// Mock the auth module
vi.mock('~/lib/auth', () => ({
    auth: vi.fn(),
}));

describe('POST /api/drinks', () => {
    let testUser: { id: string; email: string };

    beforeEach(async () => {
        // Create a test user
        testUser = await prisma.user.create({
            data: {
                email: `test-${Date.now()}@example.com`,
                name: 'Test User',
            },
        });

        // Mock authenticated session
        vi.mocked(auth).mockResolvedValue({
            user: { id: testUser.id, email: testUser.email },
            expires: new Date().toISOString(),
        } as Session);
    });

    afterEach(async () => {
        // Clean up test data
        await prisma.drink.deleteMany({
            where: { createdByUserId: testUser.id },
        });
        await prisma.user.delete({
            where: { id: testUser.id },
        });
    });

    it('should create a new drink when authenticated', async () => {
        const response = await POST(new Request('http://localhost:3000/api/drinks', {
            method: 'POST',
            body: JSON.stringify({
                name: 'Test Drink',
                caffeineMg: 100,
                sizeMl: 250,
            }),
        }));

        expect(response.status).toBe(201);
        const data = await response.json();
        expect(data).toMatchObject({
            success: true,
            drink: {
                id: expect.any(String),
                name: 'Test Drink',
                caffeineMgPerMl: expect.any(Object), // Decimal type
                baseSizeMl: expect.any(Object), // Decimal type
                createdByUserId: testUser.id,
                createdAt: expect.any(String),
                updatedAt: expect.any(String),
            },
        });
    });

    it('should return 401 when not authenticated', async () => {
        vi.mocked(auth).mockResolvedValue(null);

        const response = await POST(new Request('http://localhost:3000/api/drinks', {
            method: 'POST',
            body: JSON.stringify({
                name: 'Test Drink',
                caffeineMg: 100,
                sizeMl: 250,
            }),
        }));

        expect(response.status).toBe(401);
        const data = await response.json();
        expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 400 for invalid request body', async () => {
        const response = await POST(new Request('http://localhost:3000/api/drinks', {
            method: 'POST',
            body: JSON.stringify({
                name: '', // Invalid: empty name
                caffeineMg: -100, // Invalid: negative value
                sizeMl: 0, // Invalid: zero value
            }),
        }));

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error.code).toBe('INVALID_REQUEST');
    });

    it('should return 500 when database operation fails', async () => {
        // Simulate database error by using an invalid user ID
        vi.mocked(auth).mockResolvedValue({
            user: { id: 'non-existent-user-id', email: 'test@example.com' },
            expires: new Date().toISOString(),
        } as Session);

        const response = await POST(new Request('http://localhost:3000/api/drinks', {
            method: 'POST',
            body: JSON.stringify({
                name: 'Test Drink',
                caffeineMg: 100,
                sizeMl: 250,
            }),
        }));

        expect(response.status).toBe(500);
        const data = await response.json();
        expect(data.error.code).toBe('INTERNAL_SERVER_ERROR');
    });
}); 
