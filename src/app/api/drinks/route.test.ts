// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { POST } from './route';
import { auth } from '~/lib/auth';
import { type User, type PrismaClient } from '@prisma/client';
import { type Session } from 'next-auth';

vi.mock('~/lib/auth', () => ({
    auth: vi.fn(),
}));

describe('POST /api/drinks', () => {
    let testUser: User;
    let prisma: PrismaClient;
    let createdDrinkIds: string[] = [];

    beforeEach(async () => {
        const { PrismaClient } = await import('@prisma/client');
        prisma = new PrismaClient();
        testUser = await prisma.user.create({
            data: {
                email: `test-drink-${Date.now()}@example.com`,
                name: 'Test User',
            },
        });
        createdDrinkIds = [];
    });

    afterEach(async () => {
        for (const id of createdDrinkIds) {
            await prisma.drink.delete({ where: { id } }).catch(() => { });
        }
        await prisma.user.delete({ where: { id: testUser.id } }).catch(() => { });
    });

    it('should create a new drink when authenticated', async () => {
        vi.mocked(auth).mockResolvedValue({
            user: { id: testUser.id, email: testUser.email },
            expires: new Date().toISOString(),
        } as Session);
        const uniqueDrinkName = `Test Drink ${Date.now()}`;
        const req = new Request('http://localhost:3000/api/drinks', {
            method: 'POST',
            body: JSON.stringify({
                name: uniqueDrinkName,
                caffeine_mg: 100,
                base_size_ml: 250,
            }),
            headers: { 'Content-Type': 'application/json' },
        });
        const response = await POST(req);
        const data = await response.json();
        expect(response.status).toBe(201);
        expect(data.success).toBe(true);
        expect(data.drink).toMatchObject({
            name: uniqueDrinkName,
            base_size_ml: '250',
            created_by_user_id: testUser.id,
        });
        createdDrinkIds.push(data.drink.id);
    });

    it('should return 401 when not authenticated', async () => {
        vi.mocked(auth).mockResolvedValue(null);
        const req = new Request('http://localhost:3000/api/drinks', {
            method: 'POST',
            body: JSON.stringify({
                name: `Test Drink ${Date.now()}`,
                caffeine_mg: 100,
                base_size_ml: 250,
            }),
            headers: { 'Content-Type': 'application/json' },
        });
        const response = await POST(req);
        const data = await response.json();
        expect(response.status).toBe(401);
        expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 400 for invalid request body', async () => {
        vi.mocked(auth).mockResolvedValue({
            user: { id: testUser.id, email: testUser.email },
            expires: new Date().toISOString(),
        } as Session);
        const req = new Request('http://localhost:3000/api/drinks', {
            method: 'POST',
            body: JSON.stringify({
                name: '', // Invalid: empty name
                caffeine_mg: -100, // Invalid: negative value
                base_size_ml: 0, // Invalid: zero value
            }),
            headers: { 'Content-Type': 'application/json' },
        });
        const response = await POST(req);
        const data = await response.json();
        expect(response.status).toBe(400);
        expect(data.error.code).toBe('INVALID_REQUEST');
    });

    it('should return 409 for duplicate drink', async () => {
        vi.mocked(auth).mockResolvedValue({
            user: { id: testUser.id, email: testUser.email },
            expires: new Date().toISOString(),
        } as Session);
        const drinkData = {
            name: `Duplicate Drink ${Date.now()}`,
            caffeine_mg: 100,
            base_size_ml: 250,
        };
        // First creation
        const req1 = new Request('http://localhost:3000/api/drinks', {
            method: 'POST',
            body: JSON.stringify(drinkData),
            headers: { 'Content-Type': 'application/json' },
        });
        const res1 = await POST(req1);
        const data1 = await res1.json();
        expect(res1.status).toBe(201);
        createdDrinkIds.push(data1.drink.id);
        // Duplicate creation
        const req2 = new Request('http://localhost:3000/api/drinks', {
            method: 'POST',
            body: JSON.stringify(drinkData),
            headers: { 'Content-Type': 'application/json' },
        });
        const res2 = await POST(req2);
        const data2 = await res2.json();
        expect(res2.status).toBe(409);
        expect(data2.error.code).toBe('DUPLICATE_DRINK');
    });
}); 
