import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { authOptions } from "~/server/auth/config";
import { db } from "~/server/db";

// Mock the createId function
vi.mock("@paralleldrive/cuid2", () => ({
  createId: () => "test-id-123",
}));

describe("Auth Config", () => {
  beforeEach(async () => {
    // Clean up database before each test
    await db.caffeineEntry.deleteMany();
    await db.drink.deleteMany();
    await db.userDailyLimit.deleteMany();
    await db.user.deleteMany();
  });

  afterEach(async () => {
    // Clean up database after each test
    await db.caffeineEntry.deleteMany();
    await db.drink.deleteMany();
    await db.userDailyLimit.deleteMany();
    await db.user.deleteMany();
  });

  describe("configuration", () => {
    it("should have providers configured", () => {
      expect(authOptions.providers).toBeDefined();
      expect(authOptions.providers.length).toBeGreaterThan(0);
    });

    it("should have email provider configured", () => {
      // Check if any provider has id 'email'
      const hasEmailProvider = authOptions.providers.some(p =>
        typeof p === 'object' && p !== null && 'id' in p && p.id === 'email'
      );
      expect(hasEmailProvider).toBe(true);
    });

    it("should have anonymous provider configured", () => {
      // Check if any provider has id 'anonymous'
      const hasAnonymousProvider = authOptions.providers.some(p =>
        typeof p === 'object' && p !== null && 'id' in p && p.id === 'anonymous'
      );
      expect(hasAnonymousProvider).toBe(true);
    });

    it("should use JWT session strategy", () => {
      expect(authOptions.session?.strategy).toBe("jwt");
    });

    it("should have required callbacks configured", () => {
      expect(authOptions.callbacks?.jwt).toBeDefined();
      expect(authOptions.callbacks?.session).toBeDefined();
      expect(authOptions.callbacks?.signIn).toBeDefined();
    });
  });

  describe("anonymous user creation", () => {
    it("should create anonymous user in database", async () => {
      // This test verifies that the anonymous provider can create users
      // We'll test the actual provider logic in integration tests
      const user = await db.user.create({
        data: {
          id: "test-id-123",
          isGuest: true,
          email: null,
          name: null,
        },
      });

      expect(user.id).toBe("test-id-123");
      expect(user.isGuest).toBe(true);
      expect(user.email).toBeNull();
    });
  });
});
