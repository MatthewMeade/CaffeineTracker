import { Decimal } from "@prisma/client/runtime/library";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getEffectiveDailyLimit } from "~/server/utils/user-limits";
import type { PrismaClient } from "@prisma/client";

// Create a mock database client
const mockFindFirst = vi.fn();
const mockDb = {
    userDailyLimit: {
        findFirst: mockFindFirst,
    },
} as unknown as PrismaClient;

// Mock the db client
vi.mock("~/server/db", () => ({
    db: mockDb,
}));

describe("getEffectiveDailyLimit", () => {
    const mockUserId = "test-user-id";
    const mockDate = new Date("2024-03-15T12:00:00Z");

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should return null when no limits exist", async () => {
        mockFindFirst.mockResolvedValue(null);

        const result = await getEffectiveDailyLimit(mockDb, mockUserId, mockDate);

        expect(result).toBeNull();
        expect(mockFindFirst).toHaveBeenCalledWith({
            where: {
                userId: mockUserId,
                effectiveFrom: {
                    lte: new Date("2024-03-15T00:00:00Z"),
                },
            },
            orderBy: {
                effectiveFrom: "desc",
            },
        });
    });

    it("should return the limit when one exists before the given date", async () => {
        mockFindFirst.mockResolvedValue({
            id: "limit-1",
            userId: mockUserId,
            limitMg: new Decimal(400),
            effectiveFrom: new Date("2024-03-01T00:00:00Z"),
            createdAt: new Date(),
        });

        const result = await getEffectiveDailyLimit(mockDb, mockUserId, mockDate);

        expect(result).toBe(400);
    });

    it("should return the limit when one exists on the given date", async () => {
        mockFindFirst.mockResolvedValue({
            id: "limit-1",
            userId: mockUserId,
            limitMg: new Decimal(400),
            effectiveFrom: new Date("2024-03-15T00:00:00Z"),
            createdAt: new Date(),
        });

        const result = await getEffectiveDailyLimit(mockDb, mockUserId, mockDate);

        expect(result).toBe(400);
    });

    it("should return null when the only limit is after the given date", async () => {
        mockFindFirst.mockResolvedValue(null);

        const result = await getEffectiveDailyLimit(mockDb, mockUserId, mockDate);

        expect(result).toBeNull();
    });

    it("should return the most recent limit when multiple limits exist", async () => {
        mockFindFirst.mockResolvedValue({
            id: "limit-2",
            userId: mockUserId,
            limitMg: new Decimal(300),
            effectiveFrom: new Date("2024-03-10T00:00:00Z"),
            createdAt: new Date(),
        });

        const result = await getEffectiveDailyLimit(mockDb, mockUserId, mockDate);

        expect(result).toBe(300);
    });

    it("should handle limits set on the same day", async () => {
        mockFindFirst.mockResolvedValue({
            id: "limit-1",
            userId: mockUserId,
            limitMg: new Decimal(400),
            effectiveFrom: new Date("2024-03-15T00:00:00Z"),
            createdAt: new Date(),
        });

        const result = await getEffectiveDailyLimit(mockDb, mockUserId, mockDate);

        expect(result).toBe(400);
    });
}); 