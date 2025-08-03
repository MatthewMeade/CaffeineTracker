/**
 * Test utilities and data factories
 * This file is not a test - it provides utilities for other tests
 */

import { v4 as uuidv4 } from "uuid";
import { testDb } from "../vitest.setup";

// Re-export testDb for convenience
export { testDb };

// Test data factories
export const testUsers = {
    createUser: async (
        data: { id?: string; email: string; name?: string } = {
            email: "test@example.com",
        },
    ) => {
        return await testDb.user.create({
            data: {
                id: data.id ?? generateTestId(),
                email: data.email,
                name: data.name ?? "Test User",
            },
        });
    },

    createOtherUser: async (
        data: { id?: string; email: string; name?: string } = {
            email: "other@example.com",
        },
    ) => {
        return await testDb.user.create({
            data: {
                id: data.id ?? generateTestId(),
                email: data.email,
                name: data.name ?? "Other User",
            },
        });
    },
};

export const testFavorites = {
    createFavorite: async (data: {
        id?: string;
        userId: string;
        name: string;
        icon?: string;
        caffeineMg: number;
    }) => {
        return await testDb.userFavorite.create({
            data: {
                id: data.id ?? generateTestId(),
                userId: data.userId,
                name: data.name,
                icon: data.icon ?? "☕",
                caffeineMg: data.caffeineMg,
            },
        });
    },
};

export const testEntries = {
    createEntry: async (data: {
        id?: string;
        userId: string;
        consumedAt: Date;
        name: string;
        caffeineMg: number;
    }) => {
        return await testDb.caffeineEntry.create({
            data: {
                id: data.id ?? generateTestId(),
                userId: data.userId,
                consumedAt: data.consumedAt,
                name: data.name,
                caffeineMg: data.caffeineMg,
            },
        });
    },
};

export const testLimits = {
    createLimit: async (data: {
        id?: string;
        userId: string;
        limitMg: number;
        effectiveFrom?: Date;
    }) => {
        return await testDb.userDailyLimit.create({
            data: {
                id: data.id ?? generateTestId(),
                userId: data.userId,
                limitMg: data.limitMg,
                effectiveFrom: data.effectiveFrom ?? new Date(),
            },
        });
    },
};

// Utility to generate valid UUIDs for tests
export const generateTestId = () => uuidv4(); 