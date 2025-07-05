/// <reference types="vitest/globals" />
import { test, expect, describe, beforeEach } from "vitest";
import { settingsRouter } from "~/server/trpc/routers/settings";
import { type AppRouter } from "~/server/trpc/router";
import { type inferProcedureInput } from "@trpc/server";
import {
  setupTestDatabase,
  testDb,
  testUsers,
  testLimits,
} from "../../../test/db-setup";

const mockSession = {
  user: { id: "test-user-id", email: "test@example.com" },
  expires: new Date().toISOString(),
};

setupTestDatabase();

describe("settings router", () => {
  beforeEach(async () => {
    // Create test users for each test
    await testUsers.createUser({
      id: "test-user-id",
      email: "test@example.com",
    });
  });

  test("getLimit procedure returns current limit and history", async () => {
    // Seed limits with different effective dates
    await testLimits.createLimit({
      userId: "test-user-id",
      limitMg: 400,
      effectiveFrom: new Date("2022-01-01"),
    });
    await testLimits.createLimit({
      userId: "test-user-id",
      limitMg: 500,
      effectiveFrom: new Date(),
    });

    const caller = settingsRouter.createCaller({
      db: testDb,
      session: mockSession,
    });

    const result = await caller.getLimit();

    expect(Number(result.current_limit_mg)).toBe(500);
    expect(result.history).toHaveLength(2);

    // History should be sorted by effectiveFrom desc (most recent first)
    expect(Number(result.history[0]?.limit_mg)).toBe(500);
    expect(Number(result.history[1]?.limit_mg)).toBe(400);
  });

  test("getLimit procedure returns null when no limits exist", async () => {
    const caller = settingsRouter.createCaller({
      db: testDb,
      session: mockSession,
    });

    const result = await caller.getLimit();

    expect(result.current_limit_mg).toBeNull();
    expect(result.history).toHaveLength(0);
  });

  test("getLimit procedure returns correct current limit when multiple limits exist", async () => {
    const now = new Date();
    const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Tomorrow
    const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // Yesterday

    // Seed limits with different effective dates
    await testLimits.createLimit({
      userId: "test-user-id",
      limitMg: 300,
      effectiveFrom: pastDate,
    });
    await testLimits.createLimit({
      userId: "test-user-id",
      limitMg: 400,
      effectiveFrom: now,
    });
    await testLimits.createLimit({
      userId: "test-user-id",
      limitMg: 500,
      effectiveFrom: futureDate,
    });

    const caller = settingsRouter.createCaller({
      db: testDb,
      session: mockSession,
    });

    const result = await caller.getLimit();

    // Should return the most recent limit that's effective now (not future limits)
    expect(Number(result.current_limit_mg)).toBe(400);
    expect(result.history).toHaveLength(3);
  });

  test("setLimit procedure creates a new limit", async () => {
    const caller = settingsRouter.createCaller({
      db: testDb,
      session: mockSession,
    });

    type Input = inferProcedureInput<AppRouter["settings"]["setLimit"]>;
    const input: Input = { limit_mg: 300 };

    const result = await caller.setLimit(input);

    expect(result.success).toBe(true);
    expect(Number(result.new_limit?.limit_mg)).toBe(300);
    expect(result.new_limit?.user_id).toBe("test-user-id");

    // Verify the limit was actually created in the database
    const createdLimit = await testDb.userDailyLimit.findUnique({
      where: { id: result.new_limit?.id },
    });
    expect(createdLimit).toBeTruthy();
    expect(Number(createdLimit?.limitMg)).toBe(300);
    expect(createdLimit?.userId).toBe("test-user-id");
  });

  test("setLimit procedure creates multiple limits with different effective dates", async () => {
    const caller = settingsRouter.createCaller({
      db: testDb,
      session: mockSession,
    });

    // Set first limit
    type Input = inferProcedureInput<AppRouter["settings"]["setLimit"]>;
    const input1: Input = { limit_mg: 200 };
    const result1 = await caller.setLimit(input1);

    // Set second limit
    const input2: Input = { limit_mg: 300 };
    const result2 = await caller.setLimit(input2);

    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);

    // Verify both limits exist in database
    const limits = await testDb.userDailyLimit.findMany({
      where: { userId: "test-user-id" },
      orderBy: { effectiveFrom: "desc" },
    });

    expect(limits).toHaveLength(2);
    expect(Number(limits[0]?.limitMg)).toBe(300);
    expect(Number(limits[1]?.limitMg)).toBe(200);
  });

  test("setLimit procedure accepts zero as a valid limit", async () => {
    const caller = settingsRouter.createCaller({
      db: testDb,
      session: mockSession,
    });

    type Input = inferProcedureInput<AppRouter["settings"]["setLimit"]>;
    const input: Input = { limit_mg: 0 };

    const result = await caller.setLimit(input);

    expect(result.success).toBe(true);
    expect(Number(result.new_limit?.limit_mg)).toBe(0);

    // Verify the zero limit was created
    const createdLimit = await testDb.userDailyLimit.findUnique({
      where: { id: result.new_limit?.id },
    });
    expect(Number(createdLimit?.limitMg)).toBe(0);
  });

  test("getLimit procedure only returns limits for the current user", async () => {
    // Create another user and their limits
    await testUsers.createOtherUser({
      id: "other-user-id",
      email: "other@example.com",
    });
    await testLimits.createLimit({
      userId: "other-user-id",
      limitMg: 999,
      effectiveFrom: new Date(),
    });

    // Create limits for current user
    await testLimits.createLimit({
      userId: "test-user-id",
      limitMg: 400,
      effectiveFrom: new Date(),
    });

    const caller = settingsRouter.createCaller({
      db: testDb,
      session: mockSession,
    });

    const result = await caller.getLimit();

    expect(Number(result.current_limit_mg)).toBe(400);
    expect(result.history).toHaveLength(1);
    // Should not include the other user's limit
    expect(
      result.history.every((limit) => Number(limit.limit_mg) !== 999),
    ).toBe(true);
  });
});
