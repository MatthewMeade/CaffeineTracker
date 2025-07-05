/// <reference types="vitest/globals" />
import { test, expect, describe, beforeEach } from "vitest";
import { entriesRouter } from "~/server/trpc/routers/entries";
import { type AppRouter } from "~/server/trpc/router";
import { type inferProcedureInput } from "@trpc/server";
import {
  setupTestDatabase,
  testDb,
  testUsers,
  testFavorites,
  testEntries,
  testLimits,
  generateTestId,
} from "../../../test/db-setup";

const mockSession = {
  user: { id: "test-user-id", email: "test@example.com" },
  expires: new Date().toISOString(),
};

setupTestDatabase();

describe("entries router", () => {
  beforeEach(async () => {
    // Create test users for each test
    await testUsers.createUser({
      id: "test-user-id",
      email: "test@example.com",
    });
    await testUsers.createOtherUser({
      id: "other-user-id",
      email: "other@example.com",
    });
  });

  test("create procedure creates a new entry", async () => {
    const caller = entriesRouter.createCaller({
      db: testDb,
      session: mockSession,
    });

    type Input = inferProcedureInput<AppRouter["entries"]["create"]>;
    const input: Input = {
      name: "Test Coffee",
      caffeineMg: 100,
      consumedAt: new Date().toISOString(),
    };

    const result = await caller.create(input);

    expect(result.success).toBe(true);
    expect(result.entry?.name).toBe("Test Coffee");
    expect(result.entry?.caffeine_mg).toBe(100);
    expect(result.entry?.drink_id).toBeNull();

    // Verify the entry was actually created in the database
    const createdEntry = await testDb.caffeineEntry.findUnique({
      where: { id: result.entry?.id },
    });
    expect(createdEntry).toBeTruthy();
    expect(createdEntry?.name).toBe("Test Coffee");
    expect(Number(createdEntry?.caffeineMg)).toBe(100);
  });

  test("create procedure handles over limit scenario", async () => {
    // Set a daily limit
    await testLimits.createLimit({
      userId: "test-user-id",
      limitMg: 100,
      effectiveFrom: new Date("2000-01-01T00:00:00Z"),
    });

    // Create an entry that would put us over the limit
    await testEntries.createEntry({
      userId: "test-user-id",
      consumedAt: new Date(),
      name: "Previous Coffee",
      caffeineMg: 80,
    });

    const caller = entriesRouter.createCaller({
      db: testDb,
      session: mockSession,
    });

    type Input = inferProcedureInput<AppRouter["entries"]["create"]>;
    const input: Input = {
      name: "Additional Coffee",
      caffeineMg: 50,
      consumedAt: new Date().toISOString(),
    };

    const result = await caller.create(input);

    expect(result.success).toBe(true);
    expect(result.over_limit).toBe(true);
    expect(result.remaining_mg).toBe(-30);
  });

  test("getSuggestions returns only default suggestions for new user", async () => {
    const caller = entriesRouter.createCaller({
      db: testDb,
      session: mockSession,
    });

    const result = await caller.getSuggestions();

    // Should return default suggestions
    expect(result).toHaveLength(6);
    expect(
      result.some((s) => s.name === "Espresso" && s.caffeineMg === 63),
    ).toBe(true);
    expect(result.some((s) => s.name === "Coffee" && s.caffeineMg === 95)).toBe(
      true,
    );
    expect(
      result.some((s) => s.name === "Green Tea" && s.caffeineMg === 28),
    ).toBe(true);
    expect(
      result.some((s) => s.name === "Black Tea" && s.caffeineMg === 47),
    ).toBe(true);
    expect(
      result.some((s) => s.name === "Energy Drink" && s.caffeineMg === 80),
    ).toBe(true);
    expect(result.some((s) => s.name === "Cola" && s.caffeineMg === 34)).toBe(
      true,
    );
  });

  test("getSuggestions prioritizes favorites over history and defaults", async () => {
    // Create a favorite
    await testFavorites.createFavorite({
      userId: "test-user-id",
      name: "My Favorite Coffee",
      caffeineMg: 120,
    });

    // Create some history entries
    await testEntries.createEntry({
      userId: "test-user-id",
      consumedAt: new Date(),
      name: "History Coffee",
      caffeineMg: 90,
    });
    await testEntries.createEntry({
      userId: "test-user-id",
      consumedAt: new Date(),
      name: "History Coffee",
      caffeineMg: 90,
    }); // Create it twice to make it frequent

    const caller = entriesRouter.createCaller({
      db: testDb,
      session: mockSession,
    });

    const result = await caller.getSuggestions();

    // Favorite should be first
    expect(result[0]?.name).toBe("My Favorite Coffee");
    expect(result[0]?.caffeineMg).toBe(120);

    // History should appear after favorites
    const historyIndex = result.findIndex(
      (s) => s.name === "History Coffee" && s.caffeineMg === 90,
    );
    expect(historyIndex).toBeGreaterThan(0);

    // Defaults should still be included
    expect(
      result.some((s) => s.name === "Espresso" && s.caffeineMg === 63),
    ).toBe(true);
  });

  test("getSuggestions deduplicates entries correctly", async () => {
    // Create a favorite that matches a default
    await testFavorites.createFavorite({
      userId: "test-user-id",
      name: "Coffee",
      caffeineMg: 95,
    });

    // Create history entries that match the favorite
    await testEntries.createEntry({
      userId: "test-user-id",
      consumedAt: new Date(),
      name: "Coffee",
      caffeineMg: 95,
    });

    const caller = entriesRouter.createCaller({
      db: testDb,
      session: mockSession,
    });

    const result = await caller.getSuggestions();

    // Should only appear once (as a favorite)
    const coffeeEntries = result.filter(
      (s) => s.name === "Coffee" && s.caffeineMg === 95,
    );
    expect(coffeeEntries).toHaveLength(1);

    // Should be in the favorites section (first)
    expect(result[0]?.name).toBe("Coffee");
    expect(result[0]?.caffeineMg).toBe(95);
  });

  test("getSuggestions includes history entries for user with no favorites", async () => {
    // Create some history entries
    await testEntries.createEntry({
      userId: "test-user-id",
      consumedAt: new Date(),
      name: "History Coffee",
      caffeineMg: 90,
    });
    await testEntries.createEntry({
      userId: "test-user-id",
      consumedAt: new Date(),
      name: "History Coffee",
      caffeineMg: 90,
    }); // Create it twice to make it frequent

    await testEntries.createEntry({
      userId: "test-user-id",
      consumedAt: new Date(),
      name: "Single Entry",
      caffeineMg: 50,
    });

    const caller = entriesRouter.createCaller({
      db: testDb,
      session: mockSession,
    });

    const result = await caller.getSuggestions();

    // Should include history entries
    expect(
      result.some((s) => s.name === "History Coffee" && s.caffeineMg === 90),
    ).toBe(true);
    expect(
      result.some((s) => s.name === "Single Entry" && s.caffeineMg === 50),
    ).toBe(true);

    // Should still include defaults
    expect(
      result.some((s) => s.name === "Espresso" && s.caffeineMg === 63),
    ).toBe(true);
  });

  test("list procedure returns entries with pagination", async () => {
    // Seed multiple entries
    const entries = [];
    for (let i = 0; i < 5; i++) {
      entries.push(
        await testEntries.createEntry({
          userId: "test-user-id",
          consumedAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000), // Different days
          name: `Coffee ${i}`,
          caffeineMg: 100 + i * 10,
        }),
      );
    }

    const caller = entriesRouter.createCaller({
      db: testDb,
      session: mockSession,
    });

    type Input = inferProcedureInput<AppRouter["entries"]["list"]>;
    const input: Input = { limit: 3, offset: 0 };

    const result = await caller.list(input);

    expect(result.entries).toHaveLength(3);
    expect(result.has_more).toBe(true);
    expect(result.total).toBe(5);

    // Entries should be sorted by consumedAt desc (most recent first)
    expect(result.entries[0]?.name).toBe("Coffee 0");
    expect(result.entries[1]?.name).toBe("Coffee 1");
    expect(result.entries[2]?.name).toBe("Coffee 2");
  });

  test("list procedure filters by date range", async () => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Seed entries on different days
    await testEntries.createEntry({
      userId: "test-user-id",
      consumedAt: yesterday,
      name: "Yesterday Coffee",
      caffeineMg: 100,
    });
    await testEntries.createEntry({
      userId: "test-user-id",
      consumedAt: now,
      name: "Today Coffee",
      caffeineMg: 100,
    });
    await testEntries.createEntry({
      userId: "test-user-id",
      consumedAt: tomorrow,
      name: "Tomorrow Coffee",
      caffeineMg: 100,
    });

    const caller = entriesRouter.createCaller({
      db: testDb,
      session: mockSession,
    });

    type Input = inferProcedureInput<AppRouter["entries"]["list"]>;
    const input: Input = {
      start_date: now.toISOString(),
      end_date: tomorrow.toISOString(),
    };

    const result = await caller.list(input);

    expect(result.entries).toHaveLength(2);
    expect(result.entries.some((e) => e.name === "Today Coffee")).toBe(true);
    expect(result.entries.some((e) => e.name === "Tomorrow Coffee")).toBe(true);
    expect(result.entries.some((e) => e.name === "Yesterday Coffee")).toBe(
      false,
    );
  });

  test("getDaily procedure returns daily entries and totals", async () => {
    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

    // Create entries for different days
    await testEntries.createEntry({
      userId: "test-user-id",
      consumedAt: yesterday,
      name: "Yesterday Coffee",
      caffeineMg: 100,
    });
    await testEntries.createEntry({
      userId: "test-user-id",
      consumedAt: today,
      name: "Today Coffee 1",
      caffeineMg: 80,
    });
    await testEntries.createEntry({
      userId: "test-user-id",
      consumedAt: today,
      name: "Today Coffee 2",
      caffeineMg: 120,
    });

    const caller = entriesRouter.createCaller({
      db: testDb,
      session: mockSession,
    });

    type Input = inferProcedureInput<AppRouter["entries"]["getDaily"]>;
    const input: Input = { date: today.toISOString().split("T")[0] };

    const result = await caller.getDaily(input);

    expect(result.entries).toHaveLength(2);
    expect(result.daily_total_mg).toBe(200);
    expect(result.entries.some((e) => e.name === "Today Coffee 1")).toBe(true);
    expect(result.entries.some((e) => e.name === "Today Coffee 2")).toBe(true);
    expect(result.entries.some((e) => e.name === "Yesterday Coffee")).toBe(
      false,
    );
  });

  test("update procedure updates an existing entry", async () => {
    const entry = await testEntries.createEntry({
      userId: "test-user-id",
      consumedAt: new Date(),
      name: "Original Coffee",
      caffeineMg: 100,
    });

    const caller = entriesRouter.createCaller({
      db: testDb,
      session: mockSession,
    });

    type Input = inferProcedureInput<AppRouter["entries"]["update"]>;
    const input: Input = {
      id: entry.id,
      name: "Updated Coffee",
      caffeineMg: 150,
    };

    const result = await caller.update(input);

    expect(result.success).toBe(true);
    expect(result.entry?.name).toBe("Updated Coffee");
    expect(result.entry?.caffeine_mg).toBe(150);

    // Verify the entry was actually updated in the database
    const updatedEntry = await testDb.caffeineEntry.findUnique({
      where: { id: entry.id },
    });
    expect(updatedEntry?.name).toBe("Updated Coffee");
    expect(Number(updatedEntry?.caffeineMg)).toBe(150);
  });

  test("delete procedure deletes an existing entry", async () => {
    const entry = await testEntries.createEntry({
      userId: "test-user-id",
      consumedAt: new Date(),
      name: "Coffee to Delete",
      caffeineMg: 100,
    });

    const caller = entriesRouter.createCaller({
      db: testDb,
      session: mockSession,
    });

    type Input = inferProcedureInput<AppRouter["entries"]["delete"]>;
    const input: Input = { id: entry.id };

    const result = await caller.delete(input);

    expect(result.success).toBe(true);

    // Verify the entry was actually deleted
    const deletedEntry = await testDb.caffeineEntry.findUnique({
      where: { id: entry.id },
    });
    expect(deletedEntry).toBeNull();
  });

  test("delete procedure throws error for non-existent entry", async () => {
    const caller = entriesRouter.createCaller({
      db: testDb,
      session: mockSession,
    });

    type Input = inferProcedureInput<AppRouter["entries"]["delete"]>;
    const input: Input = { id: generateTestId() };

    await expect(caller.delete(input)).rejects.toThrow("Entry not found");
  });
});
