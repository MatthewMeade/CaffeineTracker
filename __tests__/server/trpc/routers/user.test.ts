/// <reference types="vitest/globals" />
import { test, expect, describe, beforeEach } from "vitest";
import { userRouter } from "~/server/trpc/routers/user";
import { type AppRouter } from "~/server/trpc/router";
import { type inferProcedureInput } from "@trpc/server";
import { setupTestDatabase, testDb, testUsers } from "../../../test/db-setup";

const mockSession = {
  user: { id: "test-user-id", email: "test@example.com" },
  expires: new Date().toISOString(),
};

setupTestDatabase();

describe("user router", () => {
  beforeEach(async () => {
    // Create test users for each test
    await testUsers.createUser({
      id: "test-user-id",
      email: "test@example.com",
    });
  });

  test("me procedure returns user data for authenticated user", async () => {
    const caller = userRouter.createCaller({
      db: testDb,
      session: mockSession,
    });

    type Input = inferProcedureInput<AppRouter["user"]["me"]>;
    const input: Input = undefined;

    const result = await caller.me(input);

    expect(result.id).toBe("test-user-id");
    expect(result.email).toBe("test@example.com");
    expect(result.createdAt).toBeDefined();
  });

  test("me procedure throws NOT_FOUND error when user does not exist", async () => {
    // Use a session with a non-existent user ID
    const nonExistentUserSession = {
      user: { id: "non-existent-user-id", email: "nonexistent@example.com" },
      expires: new Date().toISOString(),
    };

    const caller = userRouter.createCaller({
      db: testDb,
      session: nonExistentUserSession,
    });

    await expect(caller.me()).rejects.toThrow("User not found");
  });

  test("me procedure only returns selected fields", async () => {
    const caller = userRouter.createCaller({
      db: testDb,
      session: mockSession,
    });

    const result = await caller.me();

    // Should only contain the selected fields (id, email, createdAt)
    const expectedKeys = ["id", "email", "createdAt"];
    const actualKeys = Object.keys(result);

    expect(actualKeys.sort()).toEqual(expectedKeys.sort());

    // Verify it doesn't include other user fields that might exist
    expect(result).not.toHaveProperty("name");
    expect(result).not.toHaveProperty("image");
    expect(result).not.toHaveProperty("emailVerified");
  });

  test("me procedure returns correct user data when multiple users exist", async () => {
    // Create another user
    await testUsers.createOtherUser({
      id: "other-user-id",
      email: "other@example.com",
    });

    const caller = userRouter.createCaller({
      db: testDb,
      session: mockSession,
    });

    const result = await caller.me();

    // Should return the correct user (not the other one)
    expect(result.id).toBe("test-user-id");
    expect(result.email).toBe("test@example.com");
    expect(result.email).not.toBe("other@example.com");
  });
});
