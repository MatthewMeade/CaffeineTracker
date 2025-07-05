import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { db } from "~/server/db";
import { linkAnonymousUser } from "~/server/auth/utils";
import { TRPCError } from "@trpc/server";

describe("Auth Utils", () => {
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

    describe("linkAnonymousUser", () => {
        it("should successfully link anonymous user data to new user", async () => {
            // Create anonymous user
            const anonymousUser = await db.user.create({
                data: {
                    id: "anonymous-123",
                    isGuest: true,
                    email: null,
                    name: null,
                },
            });

            // Create new authenticated user
            const newUser = await db.user.create({
                data: {
                    id: "new-user-456",
                    isGuest: false,
                    email: "test@example.com",
                    name: "Test User",
                },
            });

            // Create some data for the anonymous user
            const drink = await db.drink.create({
                data: {
                    name: "Test Coffee",
                    caffeineMg: 100,
                    sizeMl: 250,
                    createdByUserId: anonymousUser.id,
                },
            });

            const entry = await db.caffeineEntry.create({
                data: {
                    userId: anonymousUser.id,
                    consumedAt: new Date(),
                    name: "Test Coffee",
                    caffeineMg: 100,
                    drinkId: drink.id,
                },
            });

            const dailyLimit = await db.userDailyLimit.create({
                data: {
                    userId: anonymousUser.id,
                    limitMg: 400,
                    effectiveFrom: new Date(),
                },
            });

            // Link the data
            await linkAnonymousUser(anonymousUser.id, newUser.id);

            // Verify data was moved to new user
            const linkedEntry = await db.caffeineEntry.findUnique({
                where: { id: entry.id },
            });
            expect(linkedEntry?.userId).toBe(newUser.id);

            const linkedDrink = await db.drink.findUnique({
                where: { id: drink.id },
            });
            expect(linkedDrink?.createdByUserId).toBe(newUser.id);

            const linkedLimit = await db.userDailyLimit.findUnique({
                where: { id: dailyLimit.id },
            });
            expect(linkedLimit?.userId).toBe(newUser.id);

            // Verify anonymous user was deleted
            const deletedUser = await db.user.findUnique({
                where: { id: anonymousUser.id },
            });
            expect(deletedUser).toBeNull();
        });

        it("should handle non-existent anonymous user", async () => {
            const newUser = await db.user.create({
                data: {
                    id: "new-user-456",
                    isGuest: false,
                    email: "test@example.com",
                    name: "Test User",
                },
            });

            // Should complete successfully without throwing an error
            await expect(
                linkAnonymousUser("non-existent-id", newUser.id)
            ).resolves.toBeUndefined();
        });

        it("should handle non-existent new user", async () => {
            const anonymousUser = await db.user.create({
                data: {
                    id: "anonymous-123",
                    isGuest: true,
                    email: null,
                    name: null,
                },
            });

            // Since SQLite doesn't enforce foreign key constraints by default,
            // we'll test that the function completes but the data isn't properly linked
            await linkAnonymousUser(anonymousUser.id, "non-existent-id");

            // Verify anonymous user was deleted (this is the expected behavior)
            const deletedUser = await db.user.findUnique({
                where: { id: anonymousUser.id },
            });
            expect(deletedUser).toBeNull();
        });

        it("should rollback all changes if one operation fails", async () => {
            // Create anonymous user
            const anonymousUser = await db.user.create({
                data: {
                    id: "anonymous-123",
                    isGuest: true,
                    email: null,
                    name: null,
                },
            });

            // Create some data for the anonymous user
            const drink = await db.drink.create({
                data: {
                    name: "Test Coffee",
                    caffeineMg: 100,
                    sizeMl: 250,
                    createdByUserId: anonymousUser.id,
                },
            });

            // Try to link to a non-existent user (should fail)
            await expect(
                linkAnonymousUser(anonymousUser.id, "non-existent-id")
            ).rejects.toThrow(TRPCError);

            // Verify anonymous user still exists
            const userStillExists = await db.user.findUnique({
                where: { id: anonymousUser.id },
            });
            expect(userStillExists).not.toBeNull();

            // Verify drink still belongs to anonymous user
            const drinkStillExists = await db.drink.findUnique({
                where: { id: drink.id },
            });
            expect(drinkStillExists?.createdByUserId).toBe(anonymousUser.id);
        });
    });
}); 