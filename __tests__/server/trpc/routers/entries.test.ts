/// <reference types="vitest/globals" />
import { test, expect, describe, beforeEach } from "vitest";
import { entriesRouter } from "~/server/trpc/routers/entries";
import { type AppRouter } from "~/server/trpc/router";
import { type inferProcedureInput } from "@trpc/server";
import {
  testDb,
  testUsers,
  testFavorites,
  testEntries,
  testLimits,
  generateTestId,
} from "../../../test-utils";

const mockSession = {
  user: { id: "test-user-id", email: "test@example.com" },
  expires: new Date().toISOString(),
};

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
  });

  test("list procedure returns user's entries", async () => {
    // Create some test entries
    await testEntries.createEntry({
      userId: "test-user-id",
      consumedAt: new Date("2024-01-01T10:00:00Z"),
      name: "Morning Coffee",
      caffeineMg: 100,
    });
    await testEntries.createEntry({
      userId: "test-user-id",
      consumedAt: new Date("2024-01-01T14:00:00Z"),
      name: "Afternoon Tea",
      caffeineMg: 50,
    });

    // Create an entry for another user (should not appear)
    await testEntries.createEntry({
      userId: "other-user-id",
      consumedAt: new Date("2024-01-01T12:00:00Z"),
      name: "Other User's Coffee",
      caffeineMg: 80,
    });

    const caller = entriesRouter.createCaller({
      db: testDb,
      session: mockSession,
    });

    type Input = inferProcedureInput<AppRouter["entries"]["list"]>;
    const input: Input = {
      start_date: "2024-01-01T00:00:00Z",
      end_date: "2024-01-01T23:59:59Z",
    };

    const result = await caller.list(input);

    expect(result.entries).toHaveLength(2);
    expect(result.entries[0]?.name).toBe("Afternoon Tea"); // Most recent first
    expect(result.entries[1]?.name).toBe("Morning Coffee");
    expect(result.total).toBe(2);
  });

  test("list procedure returns empty result when no entries exist", async () => {
    const caller = entriesRouter.createCaller({
      db: testDb,
      session: mockSession,
    });

    type Input = inferProcedureInput<AppRouter["entries"]["list"]>;
    const input: Input = {
      start_date: "2024-01-01T00:00:00Z",
      end_date: "2024-01-01T23:59:59Z",
    };

    const result = await caller.list(input);

    expect(result.entries).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  test("getDaily procedure returns today's entries", async () => {
    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

    // Create entries for today and yesterday
    await testEntries.createEntry({
      userId: "test-user-id",
      consumedAt: today,
      name: "Today's Coffee",
      caffeineMg: 100,
    });
    await testEntries.createEntry({
      userId: "test-user-id",
      consumedAt: yesterday,
      name: "Yesterday's Coffee",
      caffeineMg: 80,
    });

    const caller = entriesRouter.createCaller({
      db: testDb,
      session: mockSession,
    });

    type Input = inferProcedureInput<AppRouter["entries"]["getDaily"]>;
    const input: Input = {
      date: today.toISOString().split('T')[0] // YYYY-MM-DD format
    };

    const result = await caller.getDaily(input);

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]?.name).toBe("Today's Coffee");
    expect(result.daily_total_mg).toBe(100);
  });

  test("update procedure updates an existing entry", async () => {
    // Create an entry to update
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
      consumedAt: new Date().toISOString(),
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
    // Create an entry to delete
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
