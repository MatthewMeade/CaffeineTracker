import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { auth } from "~/auth";
import { db } from "~/server/db";
import { type Session } from "next-auth";
import { Decimal } from "@prisma/client/runtime/library";

// Mock auth and db
vi.mock("~/auth", () => ({
    auth: vi.fn(),
}));

vi.mock("~/server/db", () => ({
    db: {
        caffeineEntry: {
            findMany: vi.fn(),
        },
    },
}));

describe("GET /api/entries/history", () => {
    const mockUser = { id: "user-1", email: "test@example.com" };
    const mockSession = {
        user: mockUser,
        expires: new Date().toISOString(),
    } as Session;

    const mockEntries = [
        {
            id: "entry-1",
            userId: "user-1",
            drinkId: "drink-1",
            caffeineMg: new Decimal(100),
            consumedAt: new Date("2024-03-20T10:00:00Z"),
            createdAt: new Date("2024-03-20T10:00:00Z"),
            drink: { name: "Coffee" },
        },
        {
            id: "entry-2",
            userId: "user-1",
            drinkId: "drink-2",
            caffeineMg: new Decimal(50),
            consumedAt: new Date("2024-03-20T14:00:00Z"),
            createdAt: new Date("2024-03-20T14:00:00Z"),
            drink: { name: "Tea" },
        },
        {
            id: "entry-3",
            userId: "user-1",
            drinkId: "drink-1",
            caffeineMg: new Decimal(100),
            consumedAt: new Date("2024-03-19T09:00:00Z"),
            createdAt: new Date("2024-03-19T09:00:00Z"),
            drink: { name: "Coffee" },
        },
        {
            id: "entry-4",
            userId: "user-1",
            drinkId: "drink-3",
            caffeineMg: new Decimal(80),
            consumedAt: new Date("2024-03-18T08:00:00Z"),
            createdAt: new Date("2024-03-18T08:00:00Z"),
            drink: { name: "Latte" },
        },
    ];

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should return 401 if user is not authenticated", async () => {
        vi.mocked(auth as any).mockResolvedValue(null);

        const request = new Request("http://localhost/api/entries/history");
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data).toEqual({
            error: { message: "Unauthorized", code: "UNAUTHORIZED" },
        });
    });

    it("should return 400 for invalid query parameters", async () => {
        vi.mocked(auth as any).mockResolvedValue(mockSession);

        const request = new Request(
            "http://localhost/api/entries/history?offset=-1&limit=0"
        );
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error.code).toBe("INVALID_QUERY");
    });

    it("should return empty entries when no data exists", async () => {
        vi.mocked(auth as any).mockResolvedValue(mockSession);
        vi.mocked(db.caffeineEntry.findMany).mockResolvedValue([]);

        const request = new Request("http://localhost/api/entries/history?limit=10");
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toEqual({
            entries_by_day: {},
            has_more: false,
        });
    });

    it("should return paginated entries grouped by day", async () => {
        vi.mocked(auth as any).mockResolvedValue(mockSession);
        vi.mocked(db.caffeineEntry.findMany).mockResolvedValue(mockEntries);

        const request = new Request("http://localhost/api/entries/history?limit=3");
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.has_more).toBe(true);
        expect(Object.keys(data.entries_by_day)).toHaveLength(2);
        expect(data.entries_by_day["2024-03-20"]).toHaveLength(2);
        expect(data.entries_by_day["2024-03-19"]).toHaveLength(1);
    });

    it("should return last page with has_more=false", async () => {
        vi.mocked(auth as any).mockResolvedValue(mockSession);
        vi.mocked(db.caffeineEntry.findMany).mockResolvedValue([mockEntries[2]!]);

        const request = new Request("http://localhost/api/entries/history?offset=2&limit=1");
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.has_more).toBe(false);
        expect(Object.keys(data.entries_by_day)).toHaveLength(1);
        expect(data.entries_by_day["2024-03-19"]).toHaveLength(1);
    });

    it("should maintain chronological order within each day", async () => {
        vi.mocked(auth as any).mockResolvedValue(mockSession);
        vi.mocked(db.caffeineEntry.findMany).mockResolvedValue(mockEntries);

        const request = new Request("http://localhost/api/entries/history?limit=10");
        const response = await GET(request);
        const data = await response.json();

        const dayEntries = data.entries_by_day["2024-03-20"];
        expect(dayEntries[0].consumedAt).toBe("2024-03-20T14:00:00.000Z");
        expect(dayEntries[1].consumedAt).toBe("2024-03-20T10:00:00.000Z");
    });
}); 