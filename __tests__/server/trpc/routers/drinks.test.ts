/// <reference types="vitest/globals" />
import { test, expect, describe, beforeEach } from 'vitest';
import { drinksRouter } from '~/server/trpc/routers/drinks';
import { type AppRouter } from '~/server/trpc/router';
import { type inferProcedureInput } from '@trpc/server';
import { setupTestDatabase, testDb, testUsers, testDrinks } from '../../../test/db-setup';

const mockSession = {
    user: { id: 'test-user-id', email: 'test@example.com' },
    expires: new Date().toISOString(),
};

const otherUserSession = {
    user: { id: 'other-user-id', email: 'other@example.com' },
    expires: new Date().toISOString(),
};

setupTestDatabase();

describe('drinks router', () => {
    beforeEach(async () => {
        // Create test users for each test
        await testUsers.createUser({ id: 'test-user-id', email: 'test@example.com' });
        await testUsers.createOtherUser({ id: 'other-user-id', email: 'other@example.com' });
    });

    test('create procedure creates a new drink', async () => {
        const caller = drinksRouter.createCaller({
            db: testDb,
            session: mockSession,
        });

        type Input = inferProcedureInput<AppRouter['drinks']['create']>;
        const input: Input = { name: 'Test Coffee', caffeine_mg: 100, size_ml: 250 };

        const result = await caller.create(input);

        expect(result.success).toBe(true);
        expect(result.drink?.name).toBe('Test Coffee');
        expect(Number(result.drink?.caffeine_mg)).toBe(100);
        expect(Number(result.drink?.size_ml)).toBe(250);
        expect(result.drink?.created_by_user_id).toBe('test-user-id');

        // Verify the drink was actually created in the database
        const createdDrink = await testDb.drink.findUnique({
            where: { id: result.drink?.id }
        });
        expect(createdDrink).toBeTruthy();
        expect(createdDrink?.name).toBe('Test Coffee');
    });

    test('create procedure throws CONFLICT error for duplicate drink names', async () => {
        // Seed a drink
        await testDrinks.createDrink({
            name: 'Duplicate Coffee',
            caffeineMg: 100,
            sizeMl: 250,
            createdByUserId: 'test-user-id'
        });

        const caller = drinksRouter.createCaller({
            db: testDb,
            session: mockSession,
        });

        type Input = inferProcedureInput<AppRouter['drinks']['create']>;
        const input: Input = { name: 'Duplicate Coffee', caffeine_mg: 100, size_ml: 250 };

        await expect(caller.create(input)).rejects.toThrow('A drink with this name already exists');
    });

    test('search procedure returns only user drinks and default drinks', async () => {
        // Seed drinks from different users
        await testDrinks.createDrink({
            name: 'Apple Juice',
            caffeineMg: 0,
            sizeMl: 300,
            createdByUserId: 'other-user-id'
        });
        await testDrinks.createDrink({
            name: 'Zen Tea',
            caffeineMg: 40,
            sizeMl: 250,
            createdByUserId: 'test-user-id'
        });
        await testDrinks.createDrink({
            name: 'Cola',
            caffeineMg: 35,
            sizeMl: 355,
            createdByUserId: 'other-user-id'
        });

        const caller = drinksRouter.createCaller({
            db: testDb,
            session: mockSession,
        });

        type Input = inferProcedureInput<AppRouter['drinks']['search']>;
        const input: Input = { sort_by: 'name', sort_order: 'asc' };

        const result = await caller.search(input);

        // Should only return the current user's drinks and default drinks
        expect(result.drinks).toHaveLength(1);
        expect(result.drinks[0]?.name).toBe('Zen Tea');
        expect(result.drinks[0]?.created_by_user_id).toBe('test-user-id');
    });

    test('search procedure filters by query string', async () => {
        // Seed drinks with different names
        await testDrinks.createDrink({
            name: 'Coffee Americano',
            caffeineMg: 95,
            sizeMl: 240,
            createdByUserId: 'test-user-id'
        });
        await testDrinks.createDrink({
            name: 'Green Tea',
            caffeineMg: 25,
            sizeMl: 200,
            createdByUserId: 'test-user-id'
        });
        await testDrinks.createDrink({
            name: 'Coffee Latte',
            caffeineMg: 75,
            sizeMl: 300,
            createdByUserId: 'other-user-id'
        });

        const caller = drinksRouter.createCaller({
            db: testDb,
            session: mockSession,
        });

        type Input = inferProcedureInput<AppRouter['drinks']['search']>;
        const input: Input = { q: 'Coffee' };

        const result = await caller.search(input);

        // Should only return drinks with "Coffee" in the name that belong to the current user
        expect(result.drinks).toHaveLength(1);
        expect(result.drinks[0]?.name).toBe('Coffee Americano');
        expect(result.drinks[0]?.created_by_user_id).toBe('test-user-id');
        expect(Number(result.drinks[0]?.caffeine_mg)).toBe(95);
    });

    test('search procedure sorts by caffeine content', async () => {
        // Seed drinks with different caffeine content
        await testDrinks.createDrink({
            name: 'Weak Coffee',
            caffeineMg: 50,
            sizeMl: 250,
            createdByUserId: 'test-user-id'
        });
        await testDrinks.createDrink({
            name: 'Strong Coffee',
            caffeineMg: 200,
            sizeMl: 250,
            createdByUserId: 'test-user-id'
        });
        await testDrinks.createDrink({
            name: 'Medium Coffee',
            caffeineMg: 100,
            sizeMl: 250,
            createdByUserId: 'other-user-id'
        });
        await testDrinks.createDrink({
            name: 'Extra Strong Coffee',
            caffeineMg: 300,
            sizeMl: 250,
            createdByUserId: 'other-user-id'
        });

        const caller = drinksRouter.createCaller({
            db: testDb,
            session: mockSession,
        });

        type Input = inferProcedureInput<AppRouter['drinks']['search']>;
        const input: Input = { sort_by: 'caffeineMg', sort_order: 'desc' };

        const result = await caller.search(input);

        expect(result.drinks).toHaveLength(2);

        // Only the current user's drinks should be returned, sorted by caffeine content in descending order
        expect(result.drinks[0]?.name).toBe('Strong Coffee');
        expect(Number(result.drinks[0]?.caffeine_mg)).toBe(200);
        expect(result.drinks[1]?.name).toBe('Weak Coffee');
        expect(Number(result.drinks[1]?.caffeine_mg)).toBe(50);
    });

    test('search procedure handles pagination', async () => {
        // Seed multiple drinks
        const drinkNames = ['Drink A', 'Drink B', 'Drink C', 'Drink D', 'Drink E'];
        for (const name of drinkNames) {
            await testDrinks.createDrink({
                name,
                caffeineMg: 100,
                sizeMl: 250,
                createdByUserId: 'test-user-id'
            });
        }

        const caller = drinksRouter.createCaller({
            db: testDb,
            session: mockSession,
        });

        type Input = inferProcedureInput<AppRouter['drinks']['search']>;
        const input: Input = { limit: 2, page: 1 };

        const result = await caller.search(input);

        expect(result.drinks).toHaveLength(2);
        expect(result.pagination.total).toBe(5);
        expect(result.pagination.page).toBe(1);
        expect(result.pagination.limit).toBe(2);
        expect(result.pagination.total_pages).toBe(3);
    });

    test('search procedure returns empty result when no drinks match', async () => {
        const caller = drinksRouter.createCaller({
            db: testDb,
            session: mockSession,
        });

        type Input = inferProcedureInput<AppRouter['drinks']['search']>;
        const input: Input = { q: 'NonExistentDrink' };

        const result = await caller.search(input);

        expect(result.drinks).toHaveLength(0);
        expect(result.pagination.total).toBe(0);
    });

    test('search procedure includes default drinks (null createdByUserId)', async () => {
        // Create a default drink (null createdByUserId)
        await testDrinks.createDrink({
            name: 'Default Coffee',
            caffeineMg: 95,
            sizeMl: 240,
            createdByUserId: null
        });

        // Create a user-specific drink
        await testDrinks.createDrink({
            name: 'User Tea',
            caffeineMg: 25,
            sizeMl: 200,
            createdByUserId: 'test-user-id'
        });

        const caller = drinksRouter.createCaller({
            db: testDb,
            session: mockSession,
        });

        type Input = inferProcedureInput<AppRouter['drinks']['search']>;
        const input: Input = { sort_by: 'name', sort_order: 'asc' };

        const result = await caller.search(input);

        // Should return both default drinks and user drinks
        expect(result.drinks).toHaveLength(2);

        // Check that we have both types
        const defaultDrink = result.drinks.find(d => d.created_by_user_id === null);
        const userDrink = result.drinks.find(d => d.created_by_user_id === 'test-user-id');

        expect(defaultDrink).toBeTruthy();
        expect(defaultDrink?.name).toBe('Default Coffee');
        expect(userDrink).toBeTruthy();
        expect(userDrink?.name).toBe('User Tea');
    });
}); 