import { describe, it, expect, beforeEach } from "vitest";
import { testDb } from "../../test-utils";
import { linkAnonymousUser } from "~/server/auth/utils";
import { TRPCError } from "@trpc/server";

describe("Auth Utils", () => {
  beforeEach(async () => {
    // Clean up database before each test
    await testDb.caffeineEntry.deleteMany();
    await testDb.userFavorite.deleteMany();
    await testDb.userDailyLimit.deleteMany();
    await testDb.user.deleteMany();
  });

  describe("linkAnonymousUser", () => {
    it("should successfully link anonymous user data to new user", async () => {
      // Create anonymous user
      const anonymousUser = await testDb.user.create({
        data: {
          id: "anonymous-123",
          isGuest: true,
          email: null,
          name: null,
        },
      });

      // Create new authenticated user
      const newUser = await testDb.user.create({
        data: {
          id: "new-user-456",
          isGuest: false,
          email: "test@example.com",
          name: "Test User",
        },
      });

      // Create some data for the anonymous user
      const favorite = await testDb.userFavorite.create({
        data: {
          userId: anonymousUser.id,
          name: "Test Coffee",
          caffeineMg: 100,
        },
      });

      const entry = await testDb.caffeineEntry.create({
        data: {
          userId: anonymousUser.id,
          consumedAt: new Date(),
          name: "Test Coffee",
          caffeineMg: 100,
        },
      });

      const dailyLimit = await testDb.userDailyLimit.create({
        data: {
          userId: anonymousUser.id,
          limitMg: 400,
          effectiveFrom: new Date(),
        },
      });

      // Link the data
      await linkAnonymousUser(anonymousUser.id, newUser.id);

      // Verify data was moved to new user
      const linkedEntry = await testDb.caffeineEntry.findUnique({
        where: { id: entry.id },
      });
      expect(linkedEntry?.userId).toBe(newUser.id);

      const linkedFavorite = await testDb.userFavorite.findUnique({
        where: { id: favorite.id },
      });
      expect(linkedFavorite?.userId).toBe(newUser.id);

      const linkedLimit = await testDb.userDailyLimit.findUnique({
        where: { id: dailyLimit.id },
      });
      expect(linkedLimit?.userId).toBe(newUser.id);

      // Verify anonymous user was deleted
      const deletedUser = await testDb.user.findUnique({
        where: { id: anonymousUser.id },
      });
      expect(deletedUser).toBeNull();
    });

    it("should handle non-existent anonymous user", async () => {
      const newUser = await testDb.user.create({
        data: {
          id: "new-user-456",
          isGuest: false,
          email: "test@example.com",
          name: "Test User",
        },
      });

      // Should complete successfully without throwing an error
      await expect(
        linkAnonymousUser("non-existent-id", newUser.id),
      ).resolves.toBeUndefined();
    });

    it("should handle non-existent new user", async () => {
      const anonymousUser = await testDb.user.create({
        data: {
          id: "anonymous-123",
          isGuest: true,
          email: null,
          name: null,
        },
      });

      // Should throw an error when the new user doesn't exist
      await expect(
        linkAnonymousUser(anonymousUser.id, "non-existent-id"),
      ).rejects.toThrow("New user does not exist");

      // Verify anonymous user still exists (should not be deleted)
      const userStillExists = await testDb.user.findUnique({
        where: { id: anonymousUser.id },
      });
      expect(userStillExists).not.toBeNull();
    });

    it("should rollback all changes if one operation fails", async () => {
      // Create anonymous user
      const anonymousUser = await testDb.user.create({
        data: {
          id: "anonymous-123",
          isGuest: true,
          email: null,
          name: null,
        },
      });

      // Create some data for the anonymous user
      const favorite = await testDb.userFavorite.create({
        data: {
          userId: anonymousUser.id,
          name: "Test Coffee",
          caffeineMg: 100,
        },
      });

      // Try to link to a non-existent user (should fail due to validation)
      await expect(
        linkAnonymousUser(anonymousUser.id, "non-existent-id"),
      ).rejects.toThrow("New user does not exist");

      // Verify anonymous user still exists (transaction should be rolled back)
      const userStillExists = await testDb.user.findUnique({
        where: { id: anonymousUser.id },
      });
      expect(userStillExists).not.toBeNull();

      // Verify favorite still belongs to anonymous user (transaction should be rolled back)
      const favoriteStillExists = await testDb.userFavorite.findUnique({
        where: { id: favorite.id },
      });
      expect(favoriteStillExists?.userId).toBe(anonymousUser.id);
    });
  });
});
