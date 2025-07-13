/// <reference types="vitest/globals" />
import { test, expect, describe, beforeEach } from "vitest";
import { favoritesRouter } from "~/server/trpc/routers/favorites";
import { type AppRouter } from "~/server/trpc/router";
import { type inferProcedureInput } from "@trpc/server";
import {
  testDb,
  testUsers,
  testFavorites,
} from "../../../test-utils";

const mockSession = {
  user: { id: "test-user-id", email: "test@example.com" },
  expires: new Date().toISOString(),
};

describe("favorites router", () => {
  beforeEach(async () => {
    // Create test users for each test
    await testUsers.createUser({
      id: "test-user-id",
      email: "test@example.com",
    });
  });

  test("add procedure creates a new favorite", async () => {
    const caller = favoritesRouter.createCaller({
      db: testDb,
      session: mockSession,
    });

    type Input = inferProcedureInput<AppRouter["favorites"]["add"]>;
    const input: Input = { name: "Test Coffee", caffeineMg: 100 };

    const result = await caller.add(input);

    expect(result.success).toBe(true);
    expect(result.favorite?.name).toBe("Test Coffee");
    expect(result.favorite?.caffeineMg).toBe(100);

    // Verify the favorite was actually created in the database
    const createdFavorite = await testDb.userFavorite.findUnique({
      where: { id: result.favorite?.id },
    });
    expect(createdFavorite).toBeTruthy();
    expect(createdFavorite?.name).toBe("Test Coffee");
    expect(Number(createdFavorite?.caffeineMg)).toBe(100);
    expect(createdFavorite?.userId).toBe("test-user-id");
  });

  test("add procedure throws error for duplicate favorite", async () => {
    // Create an existing favorite
    await testFavorites.createFavorite({
      userId: "test-user-id",
      name: "Duplicate Coffee",
      caffeineMg: 100,
    });

    const caller = favoritesRouter.createCaller({
      db: testDb,
      session: mockSession,
    });

    type Input = inferProcedureInput<AppRouter["favorites"]["add"]>;
    const input: Input = { name: "Duplicate Coffee", caffeineMg: 100 };

    await expect(caller.add(input)).rejects.toThrow("A favorite with this name and caffeine content already exists");
  });

  test("add procedure allows same name with different caffeine content", async () => {
    // Create an existing favorite
    await testFavorites.createFavorite({
      userId: "test-user-id",
      name: "Coffee",
      caffeineMg: 100,
    });

    const caller = favoritesRouter.createCaller({
      db: testDb,
      session: mockSession,
    });

    type Input = inferProcedureInput<AppRouter["favorites"]["add"]>;
    const input: Input = { name: "Coffee", caffeineMg: 150 };

    const result = await caller.add(input);

    expect(result.success).toBe(true);
    expect(result.favorite?.name).toBe("Coffee");
    expect(result.favorite?.caffeineMg).toBe(150);
  });

  test("remove procedure deletes an existing favorite", async () => {
    // Create a favorite to remove
    const favorite = await testFavorites.createFavorite({
      userId: "test-user-id",
      name: "Coffee to Remove",
      caffeineMg: 100,
    });

    const caller = favoritesRouter.createCaller({
      db: testDb,
      session: mockSession,
    });

    type Input = inferProcedureInput<AppRouter["favorites"]["remove"]>;
    const input: Input = { name: "Coffee to Remove", caffeineMg: 100 };

    const result = await caller.remove(input);

    expect(result.success).toBe(true);

    // Verify the favorite was actually deleted
    const deletedFavorite = await testDb.userFavorite.findUnique({
      where: { id: favorite.id },
    });
    expect(deletedFavorite).toBeNull();
  });

  test("remove procedure throws error for non-existent favorite", async () => {
    const caller = favoritesRouter.createCaller({
      db: testDb,
      session: mockSession,
    });

    type Input = inferProcedureInput<AppRouter["favorites"]["remove"]>;
    const input: Input = { name: "Non-existent Coffee", caffeineMg: 100 };

    await expect(caller.remove(input)).rejects.toThrow("Favorite not found");
  });

  test("remove procedure only removes favorites for the current user", async () => {
    // Create the other user first
    await testUsers.createUser({
      id: "other-user-id",
      email: "other@example.com",
    });

    // Create favorites for different users
    await testFavorites.createFavorite({
      userId: "test-user-id",
      name: "My Coffee",
      caffeineMg: 100,
    });
    await testFavorites.createFavorite({
      userId: "other-user-id",
      name: "My Coffee",
      caffeineMg: 100,
    });

    const caller = favoritesRouter.createCaller({
      db: testDb,
      session: mockSession,
    });

    type Input = inferProcedureInput<AppRouter["favorites"]["remove"]>;
    const input: Input = { name: "My Coffee", caffeineMg: 100 };

    const result = await caller.remove(input);

    expect(result.success).toBe(true);

    // Verify only the current user's favorite was deleted
    const remainingFavorites = await testDb.userFavorite.findMany({
      where: { name: "My Coffee", caffeineMg: 100 },
    });
    expect(remainingFavorites).toHaveLength(1);
    expect(remainingFavorites[0]?.userId).toBe("other-user-id");
  });
});
