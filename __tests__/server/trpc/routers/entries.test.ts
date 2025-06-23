/// <reference types="vitest/globals" />
import { test, expect, describe, beforeEach, vi } from 'vitest';
import { entriesRouter } from '~/server/trpc/routers/entries';
import { type AppRouter } from '~/server/trpc/router';
import { type inferProcedureInput } from '@trpc/server';
import { setupTestDatabase, testDb, testUsers, testDrinks, testEntries, testLimits, generateTestId } from '../../../test/db-setup';

const mockSession = {
    user: { id: 'test-user-id', email: 'test@example.com' },
    expires: new Date().toISOString(),
};

setupTestDatabase();

describe('entries router', () => {
    beforeEach(async () => {
        // Create test users for each test
        await testUsers.createUser({ id: 'test-user-id', email: 'test@example.com' });
        await testUsers.createOtherUser({ id: 'other-user-id', email: 'other@example.com' });
    });

    test('create procedure for preset drink creates a new entry', async () => {
        // Seed a drink
        const drink = await testDrinks.createDrink({
            name: 'Coffee',
            caffeineMg: 100,
            sizeMl: 250,
            createdByUserId: 'test-user-id'
        });

        const caller = entriesRouter.createCaller({
            db: testDb,
            session: mockSession,
        });

        type Input = inferProcedureInput<AppRouter['entries']['create']>;
        const input: Input = {
            type: 'preset',
            drinkId: drink.id,
            consumedAt: new Date().toISOString()
        };

        const result = await caller.create(input);

        expect(result.success).toBe(true);
        expect(result.entry?.name).toBe('Coffee');
        expect(result.entry?.caffeine_mg).toBe(100);
        expect(result.entry?.drink_id).toBe(drink.id);

        // Verify the entry was actually created in the database
        const createdEntry = await testDb.caffeineEntry.findUnique({
            where: { id: result.entry?.id }
        });
        expect(createdEntry).toBeTruthy();
        expect(createdEntry?.name).toBe('Coffee');
        expect(Number(createdEntry?.caffeineMg)).toBe(100);
    });

    test('create procedure for manual entry creates a new entry', async () => {
        const caller = entriesRouter.createCaller({
            db: testDb,
            session: mockSession,
        });

        type Input = inferProcedureInput<AppRouter['entries']['create']>;
        const input: Input = {
            type: 'manual',
            name: 'Manual Espresso',
            caffeineMg: 65,
            consumedAt: new Date().toISOString()
        };

        const result = await caller.create(input);

        expect(result.success).toBe(true);
        expect(result.entry?.name).toBe('Manual Espresso');
        expect(result.entry?.caffeine_mg).toBe(65);
        expect(result.entry?.drink_id).toBeNull();

        // Verify the entry was actually created in the database
        const createdEntry = await testDb.caffeineEntry.findUnique({
            where: { id: result.entry?.id }
        });
        expect(createdEntry).toBeTruthy();
        expect(createdEntry?.name).toBe('Manual Espresso');
        expect(Number(createdEntry?.caffeineMg)).toBe(65);
    });

    test('create procedure handles over limit scenario', async () => {
        // Set a daily limit
        await testLimits.createLimit({
            userId: 'test-user-id',
            limitMg: 100,
            effectiveFrom: new Date('2000-01-01T00:00:00Z'),
        });

        // Create an entry that would put us over the limit
        await testEntries.createEntry({
            userId: 'test-user-id',
            consumedAt: new Date(),
            name: 'Previous Coffee',
            caffeineMg: 80
        });

        const caller = entriesRouter.createCaller({
            db: testDb,
            session: mockSession,
        });

        type Input = inferProcedureInput<AppRouter['entries']['create']>;
        const input: Input = {
            type: 'manual',
            name: 'Additional Coffee',
            caffeineMg: 50,
            consumedAt: new Date().toISOString()
        };

        const result = await caller.create(input);

        expect(result.success).toBe(true);
        expect(result.over_limit).toBe(true);
        expect(result.remaining_mg).toBe(-30);
    });

    test('list procedure returns entries with pagination', async () => {
        // Seed multiple entries
        const entries = [];
        for (let i = 0; i < 5; i++) {
            entries.push(await testEntries.createEntry({
                userId: 'test-user-id',
                consumedAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000), // Different days
                name: `Coffee ${i}`,
                caffeineMg: 100 + i * 10
            }));
        }

        const caller = entriesRouter.createCaller({
            db: testDb,
            session: mockSession,
        });

        type Input = inferProcedureInput<AppRouter['entries']['list']>;
        const input: Input = { limit: 3, offset: 0 };

        const result = await caller.list(input);

        expect(result.entries).toHaveLength(3);
        expect(result.has_more).toBe(true);
        expect(result.total).toBe(5);

        // Entries should be sorted by consumedAt desc (most recent first)
        expect(result.entries[0]?.name).toBe('Coffee 0');
        expect(result.entries[1]?.name).toBe('Coffee 1');
        expect(result.entries[2]?.name).toBe('Coffee 2');
    });

    test('list procedure filters by date range', async () => {
        const now = new Date();
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

        // Seed entries on different days
        await testEntries.createEntry({
            userId: 'test-user-id',
            consumedAt: yesterday,
            name: 'Yesterday Coffee',
            caffeineMg: 100
        });
        await testEntries.createEntry({
            userId: 'test-user-id',
            consumedAt: now,
            name: 'Today Coffee',
            caffeineMg: 100
        });
        await testEntries.createEntry({
            userId: 'test-user-id',
            consumedAt: tomorrow,
            name: 'Tomorrow Coffee',
            caffeineMg: 100
        });

        const caller = entriesRouter.createCaller({
            db: testDb,
            session: mockSession,
        });

        type Input = inferProcedureInput<AppRouter['entries']['list']>;
        const input: Input = {
            start_date: now.toISOString(),
            end_date: tomorrow.toISOString()
        };

        const result = await caller.list(input);

        expect(result.entries).toHaveLength(2);
        expect(result.entries.some(e => e.name === 'Today Coffee')).toBe(true);
        expect(result.entries.some(e => e.name === 'Tomorrow Coffee')).toBe(true);
        expect(result.entries.some(e => e.name === 'Yesterday Coffee')).toBe(false);
    });

    test('getDaily procedure returns daily entries and totals', async () => {
        const targetDate = new Date('2024-01-15');

        // Seed entries for the target date
        await testEntries.createEntry({
            userId: 'test-user-id',
            consumedAt: new Date('2024-01-15T08:00:00Z'),
            name: 'Morning Coffee',
            caffeineMg: 100
        });
        await testEntries.createEntry({
            userId: 'test-user-id',
            consumedAt: new Date('2024-01-15T14:00:00Z'),
            name: 'Afternoon Tea',
            caffeineMg: 50
        });

        // Entry on different date (should not be included)
        await testEntries.createEntry({
            userId: 'test-user-id',
            consumedAt: new Date('2024-01-14T08:00:00Z'),
            name: 'Previous Day Coffee',
            caffeineMg: 100
        });

        const caller = entriesRouter.createCaller({
            db: testDb,
            session: mockSession,
        });

        type Input = inferProcedureInput<AppRouter['entries']['getDaily']>;
        const input: Input = { date: '2024-01-15' };

        const result = await caller.getDaily(input);

        expect(result.entries).toHaveLength(2);
        expect(result.daily_total_mg).toBe(150);
        expect(result.entries[0]?.name).toBe('Morning Coffee'); // Sorted by time ascending
        expect(result.entries[1]?.name).toBe('Afternoon Tea');
    });

    test('getGraphData procedure returns aggregated data', async () => {
        // Seed entries across multiple days
        await testEntries.createEntry({
            userId: 'test-user-id',
            consumedAt: new Date('2024-01-01T08:00:00Z'),
            name: 'Day 1 Coffee',
            caffeineMg: 100
        });
        await testEntries.createEntry({
            userId: 'test-user-id',
            consumedAt: new Date('2024-01-01T14:00:00Z'),
            name: 'Day 1 Tea',
            caffeineMg: 50
        });
        await testEntries.createEntry({
            userId: 'test-user-id',
            consumedAt: new Date('2024-01-02T08:00:00Z'),
            name: 'Day 2 Coffee',
            caffeineMg: 120
        });
        await testLimits.createLimit({
            userId: 'test-user-id',
            limitMg: 200,
            effectiveFrom: new Date('2024-01-01T00:00:00Z'),
        });

        const caller = entriesRouter.createCaller({
            db: testDb,
            session: mockSession,
        });

        type Input = inferProcedureInput<AppRouter['entries']['getGraphData']>;
        const input: Input = { start_date: '2024-01-01', end_date: '2024-01-03' };

        const result = await caller.getGraphData(input);

        expect(result.data).toHaveLength(3);
        expect(result.data[0]?.date).toBe('2024-01-01');
        expect(result.data[0]?.total_mg).toBe(150);
        expect(result.data[0]?.limit_exceeded).toBe(false);
        expect(result.data[0]?.limit_mg).toBe(200);
        expect(result.data[1]?.date).toBe('2024-01-02');
        expect(result.data[1]?.total_mg).toBe(120);
        expect(result.data[1]?.limit_exceeded).toBe(false);
        expect(result.data[1]?.limit_mg).toBe(200);
        expect(result.data[2]?.date).toBe('2024-01-03');
        expect(result.data[2]?.total_mg).toBe(0); // No entries
        expect(result.data[2]?.limit_exceeded).toBe(false);
        expect(result.data[2]?.limit_mg).toBe(200);
    });

    test('getGraphData procedure handles multiple limits correctly', async () => {
        // Seed entries across multiple days
        await testEntries.createEntry({
            userId: 'test-user-id',
            consumedAt: new Date('2024-01-01T08:00:00Z'),
            name: 'Day 1 Coffee',
            caffeineMg: 150
        });
        await testEntries.createEntry({
            userId: 'test-user-id',
            consumedAt: new Date('2024-01-03T08:00:00Z'),
            name: 'Day 3 Coffee',
            caffeineMg: 250
        });
        await testEntries.createEntry({
            userId: 'test-user-id',
            consumedAt: new Date('2024-01-05T08:00:00Z'),
            name: 'Day 5 Coffee',
            caffeineMg: 180
        });

        // Create multiple limits with different effective dates
        await testLimits.createLimit({
            userId: 'test-user-id',
            limitMg: 200,
            effectiveFrom: new Date('2024-01-01T00:00:00Z'),
        });
        await testLimits.createLimit({
            userId: 'test-user-id',
            limitMg: 300,
            effectiveFrom: new Date('2024-01-03T00:00:00Z'),
        });
        await testLimits.createLimit({
            userId: 'test-user-id',
            limitMg: 150,
            effectiveFrom: new Date('2024-01-05T00:00:00Z'),
        });

        const caller = entriesRouter.createCaller({
            db: testDb,
            session: mockSession,
        });

        type Input = inferProcedureInput<AppRouter['entries']['getGraphData']>;
        const input: Input = { start_date: '2024-01-01', end_date: '2024-01-05' };

        const result = await caller.getGraphData(input);

        expect(result.data).toHaveLength(5);

        // Day 1: limit 200, consumption 150, not exceeded
        expect(result.data[0]?.date).toBe('2024-01-01');
        expect(result.data[0]?.total_mg).toBe(150);
        expect(result.data[0]?.limit_mg).toBe(200);
        expect(result.data[0]?.limit_exceeded).toBe(false);

        // Day 2: limit 200 (still effective), consumption 0, not exceeded
        expect(result.data[1]?.date).toBe('2024-01-02');
        expect(result.data[1]?.total_mg).toBe(0);
        expect(result.data[1]?.limit_mg).toBe(200);
        expect(result.data[1]?.limit_exceeded).toBe(false);

        // Day 3: limit 300 (new limit effective), consumption 250, not exceeded
        expect(result.data[2]?.date).toBe('2024-01-03');
        expect(result.data[2]?.total_mg).toBe(250);
        expect(result.data[2]?.limit_mg).toBe(300);
        expect(result.data[2]?.limit_exceeded).toBe(false);

        // Day 4: limit 300 (still effective), consumption 0, not exceeded
        expect(result.data[3]?.date).toBe('2024-01-04');
        expect(result.data[3]?.total_mg).toBe(0);
        expect(result.data[3]?.limit_mg).toBe(300);
        expect(result.data[3]?.limit_exceeded).toBe(false);

        // Day 5: limit 150 (newest limit effective), consumption 180, exceeded
        expect(result.data[4]?.date).toBe('2024-01-05');
        expect(result.data[4]?.total_mg).toBe(180);
        expect(result.data[4]?.limit_mg).toBe(150);
        expect(result.data[4]?.limit_exceeded).toBe(true);
    });

    test('getGraphData procedure handles no limits correctly', async () => {
        // Seed entries but no limits
        await testEntries.createEntry({
            userId: 'test-user-id',
            consumedAt: new Date('2024-01-01T08:00:00Z'),
            name: 'Day 1 Coffee',
            caffeineMg: 150
        });

        const caller = entriesRouter.createCaller({
            db: testDb,
            session: mockSession,
        });

        type Input = inferProcedureInput<AppRouter['entries']['getGraphData']>;
        const input: Input = { start_date: '2024-01-01', end_date: '2024-01-02' };

        const result = await caller.getGraphData(input);

        expect(result.data).toHaveLength(2);

        // Day 1: no limit, consumption 150, not exceeded
        expect(result.data[0]?.date).toBe('2024-01-01');
        expect(result.data[0]?.total_mg).toBe(150);
        expect(result.data[0]?.limit_mg).toBeNull();
        expect(result.data[0]?.limit_exceeded).toBe(false);

        // Day 2: no limit, consumption 0, not exceeded
        expect(result.data[1]?.date).toBe('2024-01-02');
        expect(result.data[1]?.total_mg).toBe(0);
        expect(result.data[1]?.limit_mg).toBeNull();
        expect(result.data[1]?.limit_exceeded).toBe(false);
    });

    test('getGraphData procedure handles limits with future effective dates', async () => {
        // Seed entries
        await testEntries.createEntry({
            userId: 'test-user-id',
            consumedAt: new Date('2024-01-01T08:00:00Z'),
            name: 'Day 1 Coffee',
            caffeineMg: 150
        });
        await testEntries.createEntry({
            userId: 'test-user-id',
            consumedAt: new Date('2024-01-03T08:00:00Z'),
            name: 'Day 3 Coffee',
            caffeineMg: 250
        });

        // Create a limit that only becomes effective on day 2
        await testLimits.createLimit({
            userId: 'test-user-id',
            limitMg: 200,
            effectiveFrom: new Date('2024-01-02T00:00:00Z'),
        });

        const caller = entriesRouter.createCaller({
            db: testDb,
            session: mockSession,
        });

        type Input = inferProcedureInput<AppRouter['entries']['getGraphData']>;
        const input: Input = { start_date: '2024-01-01', end_date: '2024-01-03' };

        const result = await caller.getGraphData(input);

        expect(result.data).toHaveLength(3);

        // Day 1: no limit yet (effective from day 2), consumption 150, not exceeded
        expect(result.data[0]?.date).toBe('2024-01-01');
        expect(result.data[0]?.total_mg).toBe(150);
        expect(result.data[0]?.limit_mg).toBeNull();
        expect(result.data[0]?.limit_exceeded).toBe(false);

        // Day 2: limit 200 now effective, consumption 0, not exceeded
        expect(result.data[1]?.date).toBe('2024-01-02');
        expect(result.data[1]?.total_mg).toBe(0);
        expect(result.data[1]?.limit_mg).toBe(200);
        expect(result.data[1]?.limit_exceeded).toBe(false);

        // Day 3: limit 200 still effective, consumption 250, exceeded
        expect(result.data[2]?.date).toBe('2024-01-03');
        expect(result.data[2]?.total_mg).toBe(250);
        expect(result.data[2]?.limit_mg).toBe(200);
        expect(result.data[2]?.limit_exceeded).toBe(true);
    });

    test('update procedure updates an entry', async () => {
        // Create an entry to update
        const entry = await testEntries.createEntry({
            userId: 'test-user-id',
            consumedAt: new Date('2024-01-15T08:00:00Z'),
            name: 'Original Coffee',
            caffeineMg: 100
        });

        const caller = entriesRouter.createCaller({
            db: testDb,
            session: mockSession,
        });

        type Input = inferProcedureInput<AppRouter['entries']['update']>;
        const input: Input = {
            id: entry.id,
            name: 'Updated Coffee',
            caffeineMg: 150
        };

        const result = await caller.update(input);

        expect(result.success).toBe(true);
        expect(result.entry?.name).toBe('Updated Coffee');
        expect(result.entry?.caffeine_mg).toBe(150);

        // Verify the entry was actually updated in the database
        const updatedEntry = await testDb.caffeineEntry.findUnique({
            where: { id: entry.id }
        });
        expect(updatedEntry?.name).toBe('Updated Coffee');
        expect(Number(updatedEntry?.caffeineMg)).toBe(150);
    });

    test('update procedure throws NOT_FOUND for non-existent entry', async () => {
        const caller = entriesRouter.createCaller({
            db: testDb,
            session: mockSession,
        });

        type Input = inferProcedureInput<AppRouter['entries']['update']>;
        const input: Input = {
            id: generateTestId(),
            name: 'Updated Coffee'
        };

        await expect(caller.update(input)).rejects.toThrow('Entry not found');
    });

    test('delete procedure deletes an entry', async () => {
        // Create an entry to delete
        const entry = await testEntries.createEntry({
            userId: 'test-user-id',
            consumedAt: new Date(),
            name: 'Coffee to Delete',
            caffeineMg: 100,
        });

        const caller = entriesRouter.createCaller({
            db: testDb,
            session: mockSession,
        });

        type Input = inferProcedureInput<AppRouter['entries']['delete']>;
        const input: Input = { id: entry.id };

        const result = await caller.delete(input);

        expect(result.success).toBe(true);

        // Verify the entry was actually deleted from the database
        const deletedEntry = await testDb.caffeineEntry.findUnique({
            where: { id: entry.id }
        });
        expect(deletedEntry).toBeNull();
    });

    test('delete procedure throws NOT_FOUND for non-existent entry', async () => {
        const caller = entriesRouter.createCaller({
            db: testDb,
            session: mockSession,
        });

        type Input = inferProcedureInput<AppRouter['entries']['delete']>;
        const input: Input = { id: generateTestId() };

        await expect(caller.delete(input)).rejects.toThrow('Entry not found');
    });

    test('getGraphData procedure throws BAD_REQUEST for invalid date range', async () => {
        const caller = entriesRouter.createCaller({
            db: testDb,
            session: mockSession,
        });

        type Input = inferProcedureInput<AppRouter['entries']['getGraphData']>;
        const input: Input = { start_date: '2024-01-02', end_date: '2024-01-01' };

        await expect(caller.getGraphData(input)).rejects.toThrow('Start date cannot be after the end date');
    });

    test('create procedure throws NOT_FOUND for non-existent drink', async () => {
        const caller = entriesRouter.createCaller({
            db: testDb,
            session: mockSession,
        });

        type Input = inferProcedureInput<AppRouter['entries']['create']>;
        const input: Input = {
            type: 'preset',
            drinkId: generateTestId(),
            consumedAt: new Date().toISOString()
        };

        await expect(caller.create(input)).rejects.toThrow('Drink not found');
    });
}); 